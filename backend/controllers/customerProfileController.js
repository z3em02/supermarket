const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { sendCustomerVerificationEmail } = require('../utils/emailService');
const { JWT_SECRET, SECURE_COOKIES } = require('../lib/config');
const { isValidEmail, isValidPhone, isValidPostalCode, normalizeAustrianPhone, isStrongPassword, STRONG_PASSWORD_HINT } = require('../utils/validation');
const { encrypt, hashLookup, decryptCustomerPII } = require('../utils/piiCrypto');
const { generateCsrfToken, setCsrfCookie } = require('../middleware/csrf');
const { generateOTP } = require('./customerAuthController');

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
      password,
      currentPassword
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

    if (password && !isStrongPassword(password)) {
      return res.status(400).json({ error: STRONG_PASSWORD_HINT });
    }

    const trimmedNewEmail = email ? email.toLowerCase().trim() : null;
    const newEmailHash = trimmedNewEmail ? hashLookup(trimmedNewEmail) : null;
    const isEmailChanging = Boolean(newEmailHash && newEmailHash !== existing.emailHash);

    const normalizedPhone = phone ? normalizeAustrianPhone(phone) : null;
    const newPhoneHash = normalizedPhone ? hashLookup(normalizedPhone) : null;
    const isPhoneChanging = Boolean(newPhoneHash && newPhoneHash !== existing.phoneHash);

    const isPasswordChanging = Boolean(password && String(password).trim().length > 0);

    // Finding 4.3 fix: Require re-authentication with current password before updating credentials
    if (isEmailChanging || isPhoneChanging || isPasswordChanging) {
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Zur Änderung von Passwort, E-Mail-Adresse oder Telefonnummer ist Ihr aktuelles Passwort erforderlich / Current password is required to change password, email, or phone number.'
        });
      }
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, existing.password);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          error: 'Das aktuelle Passwort ist nicht korrekt / Current password is incorrect.'
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (street !== undefined) updateData.street = encrypt(street.trim());
    if (houseNumber !== undefined) updateData.houseNumber = encrypt(houseNumber.trim());
    if (postalCode !== undefined) updateData.postalCode = encrypt(postalCode.trim());
    if (city !== undefined) updateData.city = encrypt(city.trim());
    if (floorApartment !== undefined) updateData.floorApartment = encrypt(floorApartment.trim());
    if (deliveryNotes !== undefined) updateData.deliveryNotes = encrypt(deliveryNotes.trim());
    if (preferredLanguage !== undefined) {
      updateData.preferredLanguage = ['de', 'ar', 'en'].includes(preferredLanguage) ? preferredLanguage : 'de';
    }

    // Check if email changed
    if (isEmailChanging) {
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
    if (isPhoneChanging) {
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
      updateData.phoneOtpAttempts = 0;
    }

    // Password change (already validated to be >= 8 chars above, if provided)
    // #23 fix: increment tokenVersion to revoke all active sessions across all devices
    if (isPasswordChanging) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
      updateData.tokenVersion = { increment: 1 };
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
        tokenVersion: true,
        createdAt: true,
        updatedAt: true
      }
    });

    let freshToken = null;
    if (isPasswordChanging) {
      freshToken = jwt.sign(
        { customerId: updated.id, role: 'customer', tokenVersion: updated.tokenVersion },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      res.cookie('customer_token', freshToken, {
        httpOnly: true,
        secure: SECURE_COOKIES,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      // #4 fix: the old CSRF token must not survive a password/email/phone change.
      setCsrfCookie(res, generateCsrfToken(), 7 * 24 * 60 * 60 * 1000);
    }

    res.json({
      message: 'Profile updated successfully',
      customer: decryptCustomerPII(updated),
      token: freshToken || undefined,
      reverifyEmail: updateData.email !== undefined,
      reverifyPhone: updateData.phone !== undefined
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update customer profile' });
  }
};

module.exports = {
  getProfile,
  updateProfile
};
