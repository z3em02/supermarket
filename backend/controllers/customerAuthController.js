const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { sendCustomerVerificationEmail } = require('../utils/emailService');
const { JWT_SECRET } = require('../lib/config');

// Helper to generate 6-digit numeric OTP code
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

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

    const trimmedEmail = email.toLowerCase().trim();
    const trimmedPhone = phone.trim();

    // Check existing email
    const existingEmail = await prisma.customer.findUnique({
      where: { email: trimmedEmail }
    });
    if (existingEmail) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Check existing phone
    const existingPhone = await prisma.customer.findUnique({
      where: { phone: trimmedPhone }
    });
    if (existingPhone) {
      return res.status(400).json({ error: 'An account with this phone number already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate verification OTPs (15 min validity)
    const emailOtp = generateOTP();
    const phoneOtp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        email: trimmedEmail,
        emailVerified: false,
        emailOtp,
        emailOtpExpiry: otpExpiry,
        phone: trimmedPhone,
        phoneVerified: false,
        phoneOtp,
        phoneOtpExpiry: otpExpiry,
        password: hashedPassword,
        street: street.trim(),
        houseNumber: houseNumber.trim(),
        postalCode: postalCode.trim(),
        city: city.trim(),
        floorApartment: floorApartment.trim(),
        deliveryNotes: deliveryNotes.trim(),
        preferredLanguage
      }
    });

    // Send email verification
    try {
      await sendCustomerVerificationEmail(customer.email, customer.name, emailOtp, preferredLanguage);
    } catch (err) {
      console.error('Failed to send verification email on register:', err.message);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n==============================================`);
      console.log(`📱 NEW CUSTOMER REGISTERED: ${customer.name}`);
      console.log(`✉️ Email OTP for ${customer.email}: [ ${emailOtp} ]`);
      console.log(`📲 Phone OTP for ${customer.phone}: [ ${phoneOtp} ]`);
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
        email: customer.email,
        emailVerified: customer.emailVerified,
        phone: customer.phone,
        phoneVerified: customer.phoneVerified,
        street: customer.street,
        houseNumber: customer.houseNumber,
        postalCode: customer.postalCode,
        city: customer.city,
        floorApartment: customer.floorApartment,
        deliveryNotes: customer.deliveryNotes,
        preferredLanguage: customer.preferredLanguage
      },
      // Expose OTP in non-production environments only
      ...(process.env.NODE_ENV !== 'production' ? {
        devOtp: {
          emailOtp,
          phoneOtp
        }
      } : {})
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
      where: targetId ? { id: targetId } : { email: email?.toLowerCase()?.trim() }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.emailVerified) {
      return res.json({ message: 'Email is already verified', emailVerified: true });
    }

    if (customer.emailOtp !== code.trim()) {
      return res.status(400).json({ error: 'Invalid email verification code' });
    }

    if (customer.emailOtpExpiry && new Date() > customer.emailOtpExpiry) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        emailVerified: true,
        emailOtp: null,
        emailOtpExpiry: null
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
 * Verify Phone Code
 */
const verifyPhone = async (req, res) => {
  try {
    const { customerId, phone, code } = req.body;
    const targetId = customerId || req.customer?.customerId;

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const customer = await prisma.customer.findFirst({
      where: targetId ? { id: targetId } : { phone: phone?.trim() }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer.phoneVerified) {
      return res.json({ message: 'Phone number is already verified', phoneVerified: true });
    }

    if (customer.phoneOtp !== code.trim()) {
      return res.status(400).json({ error: 'Invalid phone verification code' });
    }

    if (customer.phoneOtpExpiry && new Date() > customer.phoneOtpExpiry) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
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
 * Resend OTP Code for Email or Phone
 */
const resendOtp = async (req, res) => {
  try {
    const { customerId, email, phone, type } = req.body; // type: 'email' | 'phone'
    const targetId = customerId || req.customer?.customerId;

    const customer = await prisma.customer.findFirst({
      where: targetId
        ? { id: targetId }
        : email
        ? { email: email.toLowerCase().trim() }
        : { phone: phone?.trim() }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const newCode = generateOTP();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    if (type === 'email') {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          emailOtp: newCode,
          emailOtpExpiry: expiry
        }
      });
      await sendCustomerVerificationEmail(customer.email, customer.name, newCode, customer.preferredLanguage);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`✉️ RESENT Email OTP for ${customer.email}: [ ${newCode} ]`);
      }
      return res.json({ 
        message: 'New email verification code sent', 
        ...(process.env.NODE_ENV !== 'production' ? { devOtp: newCode } : {}) 
      });
    } else {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          phoneOtp: newCode,
          phoneOtpExpiry: expiry
        }
      });
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📲 RESENT Phone OTP for ${customer.phone}: [ ${newCode} ]`);
      }
      return res.json({ 
        message: 'New phone verification code sent', 
        ...(process.env.NODE_ENV !== 'production' ? { devOtp: newCode } : {}) 
      });
    }
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

    // Match either email or phone
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: trimmed.toLowerCase() },
          { phone: trimmed }
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

    res.json({
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        emailVerified: customer.emailVerified,
        phone: customer.phone,
        phoneVerified: customer.phoneVerified,
        street: customer.street,
        houseNumber: customer.houseNumber,
        postalCode: customer.postalCode,
        city: customer.city,
        floorApartment: customer.floorApartment,
        deliveryNotes: customer.deliveryNotes,
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

    res.json(customer);
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

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (street !== undefined) updateData.street = street.trim();
    if (houseNumber !== undefined) updateData.houseNumber = houseNumber.trim();
    if (postalCode !== undefined) updateData.postalCode = postalCode.trim();
    if (city !== undefined) updateData.city = city.trim();
    if (floorApartment !== undefined) updateData.floorApartment = floorApartment.trim();
    if (deliveryNotes !== undefined) updateData.deliveryNotes = deliveryNotes.trim();
    if (preferredLanguage !== undefined) updateData.preferredLanguage = preferredLanguage;

    // Check if email changed
    if (email && email.toLowerCase().trim() !== existing.email) {
      const emailTaken = await prisma.customer.findUnique({
        where: { email: email.toLowerCase().trim() }
      });
      if (emailTaken) {
        return res.status(400).json({ error: 'This email is already in use by another account' });
      }
      updateData.email = email.toLowerCase().trim();
      updateData.emailVerified = false;
      updateData.emailOtp = generateOTP();
      updateData.emailOtpExpiry = new Date(Date.now() + 15 * 60 * 1000);

      // Send new code
      try {
        await sendCustomerVerificationEmail(updateData.email, existing.name, updateData.emailOtp, existing.preferredLanguage);
      } catch (err) {}
    }

    // Check if phone changed
    if (phone && phone.trim() !== existing.phone) {
      const phoneTaken = await prisma.customer.findUnique({
        where: { phone: phone.trim() }
      });
      if (phoneTaken) {
        return res.status(400).json({ error: 'This phone number is already in use by another account' });
      }
      updateData.phone = phone.trim();
      updateData.phoneVerified = false;
      updateData.phoneOtp = generateOTP();
      updateData.phoneOtpExpiry = new Date(Date.now() + 15 * 60 * 1000);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📲 NEW Phone OTP for ${updateData.phone}: [ ${updateData.phoneOtp} ]`);
      }
    }

    // Password change
    if (password && password.length >= 6) {
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
      customer: updated,
      reverifyEmail: updateData.email !== undefined,
      reverifyPhone: updateData.phone !== undefined,
      ...(process.env.NODE_ENV !== 'production' ? {
        devOtp: {
          emailOtp: updateData.emailOtp,
          phoneOtp: updateData.phoneOtp
        }
      } : {})
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
        ...c,
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

module.exports = {
  register,
  verifyEmail,
  verifyPhone,
  resendOtp,
  login,
  getProfile,
  updateProfile,
  listCustomers,
  deleteCustomer
};
