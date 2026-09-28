const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { sendCustomerVerificationEmail } = require('../utils/emailService');
const { verifyFirebaseIdToken } = require('../utils/firebaseAdmin');
const { JWT_SECRET, SECURE_COOKIES } = require('../lib/config');
const { isValidEmail, isValidPhone, isValidPostalCode, normalizeAustrianPhone, isStrongPassword, STRONG_PASSWORD_HINT, secureCompare } = require('../utils/validation');
const { encrypt, decrypt, hashLookup, decryptCustomerPII } = require('../utils/piiCrypto');
const { generateCsrfToken, setCsrfCookie } = require('../middleware/csrf');

// Helper to generate 6-digit numeric OTP code
const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

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

    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: STRONG_PASSWORD_HINT });
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

    const cleanLang = ['de', 'ar', 'en'].includes(preferredLanguage) ? preferredLanguage : 'de';

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
        preferredLanguage: cleanLang
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

    // Create a temporary JWT for immediate verification flow (7d expiry, includes tokenVersion)
    const token = jwt.sign(
      { customerId: customer.id, role: 'customer', tokenVersion: customer.tokenVersion || 0 },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // #38 fix: set HttpOnly cookie alongside token in JSON response
    res.cookie('customer_token', token, {
      httpOnly: true,
      secure: SECURE_COOKIES,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    // #4 fix: issue the CSRF cookie alongside the session cookie.
    setCsrfCookie(res, generateCsrfToken(), 7 * 24 * 60 * 60 * 1000);

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
    const { code } = req.body;
    // #5 fix: always derive targetId from the authenticated customer JWT.
    const targetId = req.customer?.customerId;

    if (!targetId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: targetId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.emailVerified) {
      return res.json({ message: 'Email is already verified', emailVerified: true });
    }

    // #12 & #24 fix: check expiry BEFORE checking code match or attempt limits
    if (customer.emailOtpExpiry && new Date() > customer.emailOtpExpiry) {
      return res.status(400).json({ error: 'Der Verifizierungscode ist abgelaufen. Bitte fordern Sie einen neuen an / Verification code has expired. Please request a new one.' });
    }

    // Count this attempt before comparing, in one conditional UPDATE — parallel
    // guesses can't all read "fewer than 5 so far" and slip past the limit.
    const reserved = await prisma.customer.updateMany({
      where: { id: customer.id, otpAttempts: { lt: 5 } },
      data: { otpAttempts: { increment: 1 } }
    });
    if (reserved.count === 0) {
      return res.status(429).json({ error: 'Zu viele fehlerhafte Versuche. Bitte fordern Sie einen neuen Code an / Too many incorrect attempts. Please request a new code.' });
    }

    if (!secureCompare(customer.emailOtp, String(code).trim())) {
      const lockedOut = customer.otpAttempts + 1 >= 5;
      if (lockedOut) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { emailOtp: null, emailOtpExpiry: null }
        });
      }
      return res.status(lockedOut ? 429 : 400).json({
        error: lockedOut
          ? 'Zu viele fehlerhafte Versuche. Bitte fordern Sie einen neuen Code an / Too many incorrect attempts. Please request a new code.'
          : 'Ungültiger Bestätigungscode / Invalid email verification code'
      });
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
    const { type } = req.body; // type: 'email'
    // #5 & #13 fix: require authenticated customer session; ignore client-supplied customerId
    const targetId = req.customer?.customerId;

    if (!targetId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (type !== 'email') {
      return res.status(400).json({ error: 'Unsupported verification type' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: targetId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Rate-limit resend: minimum 60s cooldown between OTP generations
    if (customer.emailOtpExpiry) {
      const msLeft = customer.emailOtpExpiry.getTime() - Date.now();
      // OTP expiry is 15 minutes = 900s. If msLeft > 14 minutes (840s), less than 60s has passed
      if (msLeft > 14 * 60 * 1000) {
        return res.status(429).json({ error: 'Please wait at least 60 seconds before requesting a new code.' });
      }
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
      { customerId: customer.id, role: 'customer', tokenVersion: customer.tokenVersion || 0 },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const decrypted = decryptCustomerPII(customer);

    // #38 fix: set HttpOnly cookie alongside token in JSON response
    res.cookie('customer_token', token, {
      httpOnly: true,
      secure: SECURE_COOKIES,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    // #4 fix: issue the CSRF cookie alongside the session cookie.
    setCsrfCookie(res, generateCsrfToken(), 7 * 24 * 60 * 60 * 1000);

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

module.exports = {
  register,
  verifyEmail,
  verifyPhone,
  resendOtp,
  login,
  generateOTP
};
