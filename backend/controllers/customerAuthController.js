const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { sendCustomerVerificationEmail } = require('../utils/emailService');
const { sendWhatsAppOtp } = require('../utils/whatsappService');
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

    // Generate email verification OTP (15 min validity). The phone code is
    // sent via WhatsApp only when the customer asks for it (see resendOtp).
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

// Code lifetime and attempt counter per channel. WhatsApp codes are
// short-lived (and each message is billed), email codes last longer.
const OTP_CHANNELS = {
  email: {
    codeField: 'emailOtp',
    expiryField: 'emailOtpExpiry',
    attemptsField: 'otpAttempts',
    verifiedField: 'emailVerified',
    ttlMs: 15 * 60 * 1000
  },
  phone: {
    codeField: 'phoneOtp',
    expiryField: 'phoneOtpExpiry',
    attemptsField: 'phoneOtpAttempts',
    verifiedField: 'phoneVerified',
    ttlMs: 10 * 60 * 1000
  }
};
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

/**
 * Verify Phone Code (sent via WhatsApp, see resendOtp)
 *
 * Mirrors verifyEmail: expiry first, then an atomic attempt reservation,
 * then a constant-time compare. Uses its own attempt counter so email and
 * phone verification can't reset each other's lockout.
 */
const verifyPhone = async (req, res) => {
  try {
    const { code } = req.body;
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

    if (customer.phoneVerified) {
      return res.json({ message: 'Phone number is already verified', phoneVerified: true });
    }

    if (!customer.phoneOtp || (customer.phoneOtpExpiry && new Date() > customer.phoneOtpExpiry)) {
      return res.status(400).json({ error: 'Der Verifizierungscode ist abgelaufen. Bitte fordern Sie einen neuen an / Verification code has expired. Please request a new one.' });
    }

    const reserved = await prisma.customer.updateMany({
      where: { id: customer.id, phoneOtpAttempts: { lt: MAX_OTP_ATTEMPTS } },
      data: { phoneOtpAttempts: { increment: 1 } }
    });
    if (reserved.count === 0) {
      return res.status(429).json({ error: 'Zu viele fehlerhafte Versuche. Bitte fordern Sie einen neuen Code an / Too many incorrect attempts. Please request a new code.' });
    }

    if (!secureCompare(customer.phoneOtp, String(code).trim())) {
      const lockedOut = customer.phoneOtpAttempts + 1 >= MAX_OTP_ATTEMPTS;
      if (lockedOut) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { phoneOtp: null, phoneOtpExpiry: null }
        });
      }
      return res.status(lockedOut ? 429 : 400).json({
        error: lockedOut
          ? 'Zu viele fehlerhafte Versuche. Bitte fordern Sie einen neuen Code an / Too many incorrect attempts. Please request a new code.'
          : 'Ungültiger Bestätigungscode / Invalid phone verification code'
      });
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        phoneVerified: true,
        phoneOtp: null,
        phoneOtpExpiry: null,
        phoneOtpAttempts: 0
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
 * Send / Resend a verification code
 *
 * type 'email' emails the code; type 'phone' sends it to the account's
 * phone number via WhatsApp. The phone code is only sent on request (not
 * at registration) since every WhatsApp message is billed.
 */
const resendOtp = async (req, res) => {
  try {
    const { type } = req.body;
    // #5 & #13 fix: require authenticated customer session; ignore client-supplied customerId
    const targetId = req.customer?.customerId;

    if (!targetId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const channel = OTP_CHANNELS[type];
    if (!channel) {
      return res.status(400).json({ error: 'Unsupported verification type' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: targetId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (customer[channel.verifiedField]) {
      return res.status(400).json({ error: type === 'email' ? 'Email is already verified' : 'Phone number is already verified' });
    }

    // Rate-limit resend: the previous code must be at least 60s old
    // (it was issued at expiry - ttl).
    const previousExpiry = customer[channel.expiryField];
    if (previousExpiry && previousExpiry.getTime() - channel.ttlMs + OTP_RESEND_COOLDOWN_MS > Date.now()) {
      return res.status(429).json({ error: 'Please wait at least 60 seconds before requesting a new code.' });
    }

    const newCode = generateOTP();
    const expiry = new Date(Date.now() + channel.ttlMs);

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        [channel.codeField]: newCode,
        [channel.expiryField]: expiry,
        [channel.attemptsField]: 0
      }
    });

    if (type === 'email') {
      const customerEmail = decrypt(customer.email);
      await sendCustomerVerificationEmail(customerEmail, customer.name, newCode, customer.preferredLanguage);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`✉️ RESENT Email OTP for ${customerEmail}: [ ${newCode} ]`);
      }
      return res.json({ message: 'New email verification code sent' });
    }

    const customerPhone = decrypt(customer.phone);
    try {
      await sendWhatsAppOtp(customerPhone, newCode, customer.preferredLanguage);
    } catch (err) {
      console.error('WhatsApp OTP send failed:', err.message);
      // Clear the unsent code so the 60s cooldown doesn't block a retry.
      await prisma.customer.update({
        where: { id: customer.id },
        data: { phoneOtp: null, phoneOtpExpiry: null }
      });
      return res.status(502).json({
        error: 'WhatsApp-Nachricht konnte nicht gesendet werden. Bitte prüfen Sie, ob die Nummer WhatsApp nutzt, und versuchen Sie es erneut / Could not send the WhatsApp message. Please check that the number uses WhatsApp and try again.'
      });
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📱 WhatsApp OTP for ${customerPhone}: [ ${newCode} ]`);
    }
    return res.json({ message: 'New phone verification code sent via WhatsApp' });
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
