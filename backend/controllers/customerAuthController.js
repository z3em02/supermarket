const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { sendCustomerVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');
const { verifyFirebaseIdToken } = require('../utils/firebaseAdmin');
const { JWT_SECRET } = require('../lib/config');
const { isValidEmail, isValidPhone, isValidPostalCode, normalizeAustrianPhone } = require('../utils/validation');
const { logAudit } = require('../lib/auditLog');
const { encrypt, decrypt, hashLookup, decryptCustomerPII } = require('../utils/piiCrypto');

// Helper to generate 6-digit numeric OTP code
const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

// Reset tokens are hashed before storage so a leaked DB row can't be used to reset a password
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

/**
 * Register a new customer
 */
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      street = '',
      houseNumber = '',
      postalCode = '',
      city = '',
      floorApartment = '',
      deliveryNotes = '',
      preferredLanguage = 'de'
    } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Name, email, phone number, and password are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({ error: 'Please provide a valid phone number' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    if (postalCode && !isValidPostalCode(postalCode)) {
      return res.status(400).json({ error: 'Postal code must contain digits only' });
    }

    const trimmedEmail = email.toLowerCase().trim();
    const trimmedPhone = normalizeAustrianPhone(phone);

    const emailHash = hashLookup(trimmedEmail);
    const phoneHash = hashLookup(trimmedPhone);

    // Check existing email
    const existingEmail = await prisma.customer.findUnique({
      where: { emailHash }
    });
    if (existingEmail) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Check existing phone
    const existingPhone = await prisma.customer.findUnique({
      where: { phoneHash }
    });
    if (existingPhone) {
      return res.status(400).json({ error: 'An account with this phone number already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate email verification OTP (15 min validity). Phone verification
    // is handled client-side via Firebase Phone Auth (see verifyPhone below),
    // not a server-generated code.
    const emailOtp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        email: encrypt(trimmedEmail),
        emailHash,
        emailVerified: false,
        emailOtp,
        emailOtpExpiry: otpExpiry,
        phone: encrypt(trimmedPhone),
        phoneHash,
        phoneVerified: false,
        password: hashedPassword,
        street: encrypt(street.trim()),
        houseNumber: encrypt(houseNumber.trim()),
        postalCode: encrypt(postalCode.trim()),
        city: encrypt(city.trim()),
        floorApartment: encrypt(floorApartment.trim()),
        deliveryNotes: encrypt(deliveryNotes.trim()),
        preferredLanguage
      }
    });

    // Send email verification
    try {
      await sendCustomerVerificationEmail(trimmedEmail, customer.name, emailOtp, preferredLanguage);
    } catch (err) {
      console.error('Failed to send verification email on register:', err.message);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n==============================================`);
      console.log(`📱 NEW CUSTOMER REGISTERED: ${customer.name}`);
      console.log(`✉️ Email OTP for ${trimmedEmail}: [ ${emailOtp} ]`);
      console.log(`==============================================\n`);
    }

    // Create a temporary JWT for immediate verification flow
    const token = jwt.sign(
      { customerId: customer.id, role: 'customer' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Registration successful. Verification codes have been generated.',
      token,
      customerId: customer.id,
      customer: {
        id: customer.id,
        name: customer.name,
        email: trimmedEmail,
        emailVerified: customer.emailVerified,
        phone: trimmedPhone,
        phoneVerified: customer.phoneVerified,
        street: street.trim(),
        houseNumber: houseNumber.trim(),
        postalCode: postalCode.trim(),
        city: city.trim(),
        floorApartment: floorApartment.trim(),
        deliveryNotes: deliveryNotes.trim(),
        preferredLanguage: customer.preferredLanguage
      }
    });
  } catch (error) {
    console.error('Customer register error:', error);
    res.status(500).json({ error: 'Failed to create customer account' });
  }
};

/**
 * Verify Email Code
 */
const verifyEmail = async (req, res) => {
  try {
    const { customerId, email, code } = req.body;
    const targetId = customerId || req.customer?.customerId;

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const customer = await prisma.customer.findFirst({
      where: targetId ? { id: targetId } : { emailHash: hashLookup(email) }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.emailVerified) {
      return res.json({ message: 'Email is already verified', emailVerified: true });
    }

    if (customer.otpAttempts >= 5) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }

    if (customer.emailOtp !== code.trim()) {
      const attempts = customer.otpAttempts + 1;
      const lockedOut = attempts >= 5;
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          otpAttempts: attempts,
          ...(lockedOut ? { emailOtp: null, emailOtpExpiry: null } : {})
        }
      });
      return res.status(lockedOut ? 429 : 400).json({
        error: lockedOut
          ? 'Too many incorrect attempts. Please request a new code.'
          : 'Invalid email verification code'
      });
    }

    if (customer.emailOtpExpiry && new Date() > customer.emailOtpExpiry) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        emailVerified: true,
        emailOtp: null,
        emailOtpExpiry: null,
        otpAttempts: 0
      }
    });

    res.json({
      message: 'Email verified successfully',
      emailVerified: true,
      phoneVerified: updated.phoneVerified
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
};

/**
 * Verify Phone via Firebase Phone Auth
 *
 * The client verifies possession of the phone number directly with Firebase
 * (SMS + reCAPTCHA) and hands us the resulting ID token. We verify that
 * token's signature with firebase-admin and check its `phone_number` claim
 * matches the phone number on this customer's account before marking it
 * verified — this endpoint never sees or trusts a client-supplied code.
 * Requires the customer's own JWT (customerAuthMiddleware) so a caller can't
 * verify their own phone possession against someone else's account.
 */
const verifyPhone = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Firebase ID token is required' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: req.customer.customerId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.phoneVerified) {
      return res.json({ message: 'Phone number is already verified', phoneVerified: true });
    }

    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(idToken);
    } catch (err) {
      console.error('Firebase phone token verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid or expired verification. Please try again.' });
    }

    const verifiedPhone = decoded.phone_number ? normalizeAustrianPhone(decoded.phone_number) : null;
    if (!verifiedPhone || verifiedPhone !== normalizeAustrianPhone(decrypt(customer.phone))) {
      return res.status(400).json({ error: 'The verified phone number does not match your account phone number.' });
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        phoneVerified: true,
        phoneOtp: null,
        phoneOtpExpiry: null
      }
    });

    res.json({
      message: 'Phone number verified successfully',
      emailVerified: updated.emailVerified,
      phoneVerified: true
    });
  } catch (error) {
    console.error('Verify phone error:', error);
    res.status(500).json({ error: 'Failed to verify phone number' });
  }
};

/**
 * Resend Email OTP
 *
 * Phone verification codes are sent by Firebase directly to the client
 * (SMS + reCAPTCHA), so there is nothing for the backend to resend for
 * type: 'phone' — the frontend re-triggers Firebase's own signInWithPhoneNumber
 * instead of calling this endpoint.
 */
const resendOtp = async (req, res) => {
  try {
    const { customerId, email, type } = req.body; // type: 'email'
    const targetId = customerId || req.customer?.customerId;

    if (type !== 'email') {
      return res.status(400).json({ error: 'Unsupported verification type' });
    }

    const customer = await prisma.customer.findFirst({
      where: targetId
        ? { id: targetId }
        : { emailHash: hashLookup(email) }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const newCode = generateOTP();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    const customerEmail = decrypt(customer.email);

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        emailOtp: newCode,
        emailOtpExpiry: expiry,
        otpAttempts: 0
      }
    });
    await sendCustomerVerificationEmail(customerEmail, customer.name, newCode, customer.preferredLanguage);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✉️ RESENT Email OTP for ${customerEmail}: [ ${newCode} ]`);
    }
    return res.json({ message: 'New email verification code sent' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Failed to resend code' });
  }
};

/**
 * Customer Login
 */
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email or phone number, and password are required' });
    }

    const trimmed = identifier.trim();

    // Match either email or phone (phones are stored normalized to E.164,
    // so normalize the login input the same way before comparing)
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { emailHash: hashLookup(trimmed.toLowerCase()) },
          { phoneHash: hashLookup(normalizeAustrianPhone(trimmed)) }
        ]
      }
    });

    if (!customer) {
      return res.status(401).json({ error: 'Invalid email/phone or password' });
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email/phone or password' });
    }

    const token = jwt.sign(
      { customerId: customer.id, role: 'customer' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const decrypted = decryptCustomerPII(customer);

    res.json({
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: decrypted.email,
        emailVerified: customer.emailVerified,
        phone: decrypted.phone,
        phoneVerified: customer.phoneVerified,
        street: decrypted.street,
        houseNumber: decrypted.houseNumber,
        postalCode: decrypted.postalCode,
        city: decrypted.city,
        floorApartment: decrypted.floorApartment,
        deliveryNotes: decrypted.deliveryNotes,
        preferredLanguage: customer.preferredLanguage
      }
    });
  } catch (error) {
    console.error('Customer login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

/**
 * Get Customer Profile
 */
const getProfile = async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.customer.customerId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        phone: true,
        phoneVerified: true,
        street: true,
        houseNumber: true,
        postalCode: true,
        city: true,
        floorApartment: true,
        deliveryNotes: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(decryptCustomerPII(customer));
  } catch (error) {
    console.error('Get customer profile error:', error);
    res.status(500).json({ error: 'Failed to fetch customer profile' });
  }
};

/**
 * Update Customer Profile
 */
const updateProfile = async (req, res) => {
  try {
    const customerId = req.customer.customerId;
    const {
      name,
      email,
      phone,
      street,
      houseNumber,
      postalCode,
      city,
      floorApartment,
      deliveryNotes,
      preferredLanguage,
      password
    } = req.body;

    const existing = await prisma.customer.findUnique({
      where: { id: customerId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (email !== undefined && email && !isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (phone !== undefined && phone && !isValidPhone(phone)) {
      return res.status(400).json({ error: 'Please provide a valid phone number' });
    }

    if (postalCode !== undefined && postalCode && !isValidPostalCode(postalCode)) {
      return res.status(400).json({ error: 'Postal code must contain digits only' });
    }

    if (password && password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (street !== undefined) updateData.street = encrypt(street.trim());
    if (houseNumber !== undefined) updateData.houseNumber = encrypt(houseNumber.trim());
    if (postalCode !== undefined) updateData.postalCode = encrypt(postalCode.trim());
    if (city !== undefined) updateData.city = encrypt(city.trim());
    if (floorApartment !== undefined) updateData.floorApartment = encrypt(floorApartment.trim());
    if (deliveryNotes !== undefined) updateData.deliveryNotes = encrypt(deliveryNotes.trim());
    if (preferredLanguage !== undefined) updateData.preferredLanguage = preferredLanguage;

    // Check if email changed
    const trimmedNewEmail = email ? email.toLowerCase().trim() : null;
    const newEmailHash = trimmedNewEmail ? hashLookup(trimmedNewEmail) : null;
    if (newEmailHash && newEmailHash !== existing.emailHash) {
      const emailTaken = await prisma.customer.findUnique({
        where: { emailHash: newEmailHash }
      });
      if (emailTaken) {
        return res.status(400).json({ error: 'This email is already in use by another account' });
      }
      updateData.email = encrypt(trimmedNewEmail);
      updateData.emailHash = newEmailHash;
      updateData.emailVerified = false;
      updateData.emailOtp = generateOTP();
      updateData.emailOtpExpiry = new Date(Date.now() + 15 * 60 * 1000);
      updateData.otpAttempts = 0;

      // Send new code
      try {
        await sendCustomerVerificationEmail(trimmedNewEmail, existing.name, updateData.emailOtp, existing.preferredLanguage);
      } catch (err) {}
    }

    // Check if phone changed
    const normalizedPhone = phone ? normalizeAustrianPhone(phone) : null;
    const newPhoneHash = normalizedPhone ? hashLookup(normalizedPhone) : null;
    if (newPhoneHash && newPhoneHash !== existing.phoneHash) {
      const phoneTaken = await prisma.customer.findUnique({
        where: { phoneHash: newPhoneHash }
      });
      if (phoneTaken) {
        return res.status(400).json({ error: 'This phone number is already in use by another account' });
      }
      updateData.phone = encrypt(normalizedPhone);
      updateData.phoneHash = newPhoneHash;
      updateData.phoneVerified = false;
      updateData.phoneOtp = null;
      updateData.phoneOtpExpiry = null;
    }

    // Password change (already validated to be >= 8 chars above, if provided)
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        phone: true,
        phoneVerified: true,
        street: true,
        houseNumber: true,
        postalCode: true,
        city: true,
        floorApartment: true,
        deliveryNotes: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Profile updated successfully',
      customer: decryptCustomerPII(updated),
      reverifyEmail: updateData.email !== undefined,
      reverifyPhone: updateData.phone !== undefined
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update customer profile' });
  }
};

/**
 * List all customers (Admin)
 */
const listCustomers = async (req, res) => {
  try {
    logAudit(req.admin?.email, 'VIEW_CUSTOMERS');
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        phone: true,
        phoneVerified: true,
        street: true,
        houseNumber: true,
        postalCode: true,
        city: true,
        floorApartment: true,
        deliveryNotes: true,
        preferredLanguage: true,
        createdAt: true,
        orders: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            paymentMethod: true,
            deliveryAddress: true,
            createdAt: true,
            orderItems: {
              select: {
                id: true,
                quantity: true,
                price: true,
                product: {
                  select: {
                    name: true,
                    nameDe: true,
                    nameAr: true,
                    imageUrl: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { orders: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enriched = customers.map(c => {
      const validOrders = (c.orders || []).filter(o => !['declined', 'rejected', 'canceled', 'cancelled'].includes(o.status?.toLowerCase()));
      const totalSpent = validOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      return {
        ...decryptCustomerPII(c),
        totalSpent,
        totalOrders: c._count?.orders || c.orders?.length || 0
      };
    });

    res.json(enriched);
  } catch (error) {
    console.error('List customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

/**
 * Delete a customer (Admin)
 */
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.customer.delete({
      where: { id }
    });
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};

/**
 * Request Password Reset
 * Always responds with the same message regardless of whether the account
 * exists, to avoid leaking which emails are registered.
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const customer = await prisma.customer.findUnique({
      where: { emailHash: hashLookup(email) }
    });

    if (customer) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          resetToken: hashResetToken(rawToken),
          resetTokenExpiry: expiry
        }
      });

      try {
        await sendPasswordResetEmail(decrypt(customer.email), customer.name, rawToken, customer.preferredLanguage);
      } catch (err) {
        console.error('Failed to send password reset email:', err.message);
      }
    }

    res.json({ message: 'If an account with this email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

/**
 * Reset Password using a token from the reset email
 */
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const customer = await prisma.customer.findFirst({
      where: {
        resetToken: hashResetToken(token),
        resetTokenExpiry: { gt: new Date() }
      }
    });

    if (!customer) {
      return res.status(400).json({ error: 'This password reset link is invalid or has expired. Please request a new one.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

module.exports = {
  register,
  verifyEmail,
  verifyPhone,
  resendOtp,
  login,
  getProfile,
  updateProfile,
  listCustomers,
  deleteCustomer,
  requestPasswordReset,
  resetPassword
};
