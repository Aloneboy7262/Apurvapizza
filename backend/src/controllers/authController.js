const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const {
  loginLimiterInstance,
  verifyOtpLimiterInstance,
  passwordResetLimiterInstance
} = require('../middleware/rateLimiter');
const { getStaffCredentials } = require('../config/staffConfig');
const { sendOtpSms } = require('../services/smsService');

// In-Memory store for phone OTP verification sessions

const otpStore = new Map();

// Periodic cleanup of expired OTPs (every 2 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of otpStore.entries()) {
    if (now > val.expiresAt) {
      otpStore.delete(key);
    }
  }
}, 2 * 60 * 1000);

// Helper to sign JWT token
const generateToken = (id) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECURITY CONFIG ERROR: JWT_SECRET environment variable must be configured in production!');
    }
  }
  return jwt.sign(
    { id },
    secret || 'temporary_dev_jwt_secret_not_for_production',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

// Helper to sign phone verification token (valid for 15 minutes)
const generateVerificationToken = (phone, reason = 'general') => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('SECURITY CONFIG ERROR: JWT_SECRET environment variable must be configured in production!');
  }
  return jwt.sign(
    { phone, verified: true, reason },
    secret || 'temporary_dev_jwt_secret_not_for_production',
    { expiresIn: '15m' }
  );
};

// Strong password validation helper
const validateStrongPassword = (password, name) => {
  const p = (password || '').trim();
  if (p.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long.' };
  }

  const lower = p.toLowerCase();
  const trivial = [
    '123456', '1234567', '12345678', '123456789', '654321', '012345',
    'password', 'password123', 'qwerty', 'admin123', 'letmein', 'welcome'
  ];

  if (trivial.includes(lower)) {
    return { valid: false, message: 'Password is too simple. Please choose a stronger password (avoid 123456, sequential numbers, or common words).' };
  }

  // Check for all identical characters e.g. "111111", "aaaaaa"
  if (/^(.)\1+$/.test(p)) {
    return { valid: false, message: 'Password cannot consist of the same repeated character (e.g. 111111).' };
  }

  // Check if password equals user name or name parts
  if (name && typeof name === 'string') {
    const nameParts = name.trim().toLowerCase().split(/\s+/).filter((part) => part.length >= 3);
    for (const part of nameParts) {
      if (lower === part || lower === `${part}123` || lower === `${part}1234`) {
        return { valid: false, message: 'Password cannot be your name or a simple variation of it. Please choose a stronger password.' };
      }
    }
  }

  return { valid: true };
};

// @desc    Send 6-digit OTP for Registration or Forgot Password ONLY
// @route   POST /api/auth/send-otp
// @access  Public (Rate limited by otpLimiter)
const sendOtp = async (req, res, next) => {
  try {
    const { phone, reason } = req.body;

    if (typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit mobile number.'
      });
    }

    const cleanPhone = phone.trim();
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number. Please enter a valid 10-digit Indian phone number.'
      });
    }

    const cleanReason = reason === 'forgot_password' ? 'forgot_password' : 'register';

    // Verify account existence based on reason
    const existingUser = await User.findOne({ phone: cleanPhone });

    if (cleanReason === 'register' && existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A customer account with this mobile number already exists. Please sign in directly using your password.',
        userExists: true
      });
    }

    if (cleanReason === 'forgot_password' && !existingUser) {
      return res.status(404).json({
        success: false,
        message: 'No registered customer account found with this phone number. Please create an account first.'
      });
    }

    // Generate cryptographically secure 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();

    // Store in memory with 5-minute expiry
    otpStore.set(cleanPhone, {
      code: otpCode,
      reason: cleanReason,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0
    });

    // Dispatch SMS via telecom gateway (Fast2SMS / Twilio)
    const smsResult = await sendOtpSms(cleanPhone, otpCode, cleanReason);

    const hasLiveGateway = Boolean(process.env.FAST2SMS_API_KEY || (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN));
    const isDev = process.env.NODE_ENV !== 'production';
    const allowDevOtp = process.env.ALLOW_DEV_OTP !== 'false';

    // If telecom gateway succeeded
    let responseMessage = `Verification code sent to +91 ${cleanPhone}. Please check your phone SMS.`;
    let devOtpValue = undefined;

    if (!smsResult || smsResult.success === false) {
      if (isDev || allowDevOtp) {
        devOtpValue = otpCode;
        responseMessage = `SMS Gateway: ${smsResult?.message || 'Gateway dispatch pending'}. (Fallback OTP: ${otpCode})`;
      } else {
        return res.status(502).json({
          success: false,
          message: smsResult?.message || 'Failed to dispatch SMS through telecom gateway. Please try again later.'
        });
      }
    }

    const responseData = {
      success: true,
      message: responseMessage,
      phone: cleanPhone,
      reason: cleanReason,
      devOtp: devOtpValue
    };

    if (isDev) {
      console.log(`[OTP DISPATCH] Generated code for +91 ${cleanPhone} (${cleanReason}): [${otpCode}] (SMS Gateway Success: ${smsResult?.success ?? false})`);
    }

    res.status(200).json(responseData);

  } catch (error) {
    next(error);

  }
};

// @desc    Verify 6-digit OTP code or Firebase Auth verification
// @route   POST /api/auth/verify-otp
// @access  Public (Rate limited by verifyOtpLimiter)
const verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp, firebaseToken, reason } = req.body;

    if (typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required.'
      });
    }

    const cleanPhone = phone.trim();

    // Direct 6-digit cryptographic OTP code verification (strict validation)

    // Check direct 6-digit OTP code
    if (!otp || typeof otp !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please enter the 6-digit OTP code received on your phone.'
      });
    }

    const cleanOtp = otp.trim();
    const stored = otpStore.get(cleanPhone);

    if (!stored) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired or was not requested. Please request a new OTP code.'
      });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a fresh OTP code.'
      });
    }

    if (stored.attempts >= 5) {
      otpStore.delete(cleanPhone);
      return res.status(429).json({
        success: false,
        message: 'Brute Force Defense: Too many incorrect OTP attempts. Please wait and request a new OTP.'
      });
    }

    if (stored.code !== cleanOtp) {
      stored.attempts += 1;
      return res.status(400).json({
        success: false,
        message: `Incorrect OTP code. ${5 - stored.attempts} attempts remaining.`
      });
    }

    // OTP matches! Clear from store and issue verification token
    otpStore.delete(cleanPhone);

    const clientIp = req.ip || req.connection?.remoteAddress || 'ip';
    verifyOtpLimiterInstance.reset(`verify_otp_${clientIp}_${cleanPhone}`);

    const verificationToken = generateVerificationToken(cleanPhone, stored.reason);

    res.status(200).json({
      success: true,
      message: 'Mobile number verified successfully.',
      verificationToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    One-Step OTP Login & Auto-Registration for Customers
// @route   POST /api/auth/login-otp
// @access  Public (Rate limited by verifyOtpLimiter)
const loginWithOtp = async (req, res, next) => {
  try {
    const { phone, otp, name } = req.body;

    if (typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required.'
      });
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Please provide a 10-digit mobile number.'
      });
    }

    if (!otp || typeof otp !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please enter the 6-digit OTP code.'
      });
    }

    const cleanOtp = otp.trim();
    const stored = otpStore.get(cleanPhone);

    if (!stored) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired or was not requested. Please request a fresh OTP code.'
      });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a fresh OTP code.'
      });
    }

    if (stored.attempts >= 5) {
      otpStore.delete(cleanPhone);
      return res.status(429).json({
        success: false,
        message: 'Brute Force Defense: Too many incorrect OTP attempts. Please wait and request a new OTP.'
      });
    }

    if (stored.code !== cleanOtp) {
      stored.attempts += 1;
      return res.status(400).json({
        success: false,
        message: `Incorrect OTP code. ${5 - stored.attempts} attempts remaining.`
      });
    }

    // OTP matches! Clear from store
    otpStore.delete(cleanPhone);

    const clientIp = req.ip || req.connection?.remoteAddress || 'ip';
    verifyOtpLimiterInstance.reset(`verify_otp_${clientIp}_${cleanPhone}`);

    // Find existing user or auto-register customer
    let user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString('hex') + 'Aa1!';
      const customerName =
        name && typeof name === 'string' && name.trim()
          ? name.trim()
          : `Customer ${cleanPhone.slice(-4)}`;

      user = await User.create({
        name: customerName,
        phone: cleanPhone,
        password: randomPassword,
        role: 'customer',
        isEmailVerified: true
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully via OTP.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        addresses: user.addresses || [],
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password after OTP verification (Forgot Password flow)
// @route   POST /api/auth/reset-password
// @access  Public (Rate limited by passwordResetLimiter)
const resetPassword = async (req, res, next) => {
  try {
    const { phone, newPassword, verificationToken } = req.body;

    if (typeof phone !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Phone number and new password are required.'
      });
    }

    const cleanPhone = phone.trim();
    const cleanPassword = newPassword.trim();

    if (cleanPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    // Validate verification token
    if (!verificationToken || typeof verificationToken !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Security Verification Required: Please verify your phone number with OTP first.'
      });
    }

    const secret = process.env.JWT_SECRET || 'apurva_pizza_hub_jwt_secret_key_2026';
    let decoded = null;
    try {
      decoded = jwt.verify(verificationToken, secret);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Verification session has expired or is invalid. Please request a new OTP.'
      });
    }

    if (!decoded.verified || decoded.phone !== cleanPhone) {
      return res.status(403).json({
        success: false,
        message: 'Security mismatch: Verification token does not match this phone number.'
      });
    }

    // Find user by phone
    const user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No registered customer account found with this phone number.'
      });
    }

    // Password strength check
    const passwordCheck = validateStrongPassword(cleanPassword, user.name);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        success: false,
        message: passwordCheck.message
      });
    }

    // Update password (pre-save hook will hash it with bcrypt)
    user.password = cleanPassword;
    await user.save();

    // Reset rate limiter bucket for password reset & login
    const clientIp = req.ip || req.connection?.remoteAddress || 'ip';
    passwordResetLimiterInstance.reset(`reset_pass_${clientIp}_${cleanPhone}`);
    loginLimiterInstance.reset(`login_${clientIp}_${cleanPhone}`);

    res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully! You can now log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, address, role } = req.body;

    // Strict Type Checking to prevent NoSQL object injection
    if (typeof name !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid input format. Name and password must be valid text.'
      });
    }

    const cleanName = name.trim();
    const cleanPassword = password.trim();
    const cleanPhone = typeof phone === 'string' ? phone.trim() : '';
    const cleanEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : '';

    if (!cleanName || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your name and a password.'
      });
    }

    if (!cleanPhone && !cleanEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a valid email address or phone number.'
      });
    }

    // Email format validation if email is provided
    if (cleanEmail) {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address (e.g. user@gmail.com).'
        });
      }

      const existingEmail = await User.findOne({ email: cleanEmail });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }
    }

    // Phone format validation if phone is provided
    if (cleanPhone) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid 10-digit mobile number.'
        });
      }

      const existingPhone = await User.findOne({ phone: cleanPhone });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'An account with this phone number already exists.'
        });
      }
    }

    // Password strength check
    const passwordCheck = validateStrongPassword(cleanPassword, cleanName);
    if (!passwordCheck.valid) {
      return res.status(400).json({
        success: false,
        message: passwordCheck.message
      });
    }

    // Privilege Escalation Defense: Only allow customer registration by default.
    // Elevated roles (admin/kitchen) require an explicitly configured, non-default environment ADMIN_SECRET_KEY.
    let userRole = 'customer';
    if (role === 'admin' || role === 'kitchen') {
      const configuredSecret = process.env.ADMIN_SECRET_KEY;
      const adminSecret = req.headers['x-admin-key'] || req.body.adminSecret;

      if (
        configuredSecret &&
        configuredSecret.length >= 16 &&
        configuredSecret !== 'apurva_secure_admin_key_2026' &&
        adminSecret &&
        typeof adminSecret === 'string'
      ) {
        const bufA = Buffer.from(adminSecret);
        const bufB = Buffer.from(configuredSecret);
        if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
          userRole = role;
        }
      }
    }

    const user = await User.create({
      name: cleanName,
      email: cleanEmail || undefined,
      phone: cleanPhone || undefined,
      password: cleanPassword,
      address: typeof address === 'string' ? address.trim() : '',
      role: userRole,
      isEmailVerified: false
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        addresses: user.addresses || [],
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const rawIdentifier = req.body.username || req.body.phone || req.body.email || req.body.identifier || '';
    const rawPassword = req.body.password || '';

    // Strict Type Checking against NoSQL Injection payloads
    if (typeof rawIdentifier !== 'string' || typeof rawPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid username/phone number or password format.'
      });
    }

    const identifier = rawIdentifier.trim();
    const cleanPassword = rawPassword.trim();

    if (!identifier || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username/phone number and password.'
      });
    }

    const lowerId = identifier.toLowerCase();
    const clientIp = req.ip || req.connection?.remoteAddress || 'ip';

    // 1. Authenticate against database user first (honors updated usernames and passwords)
    let user = await User.findOne({
      $or: [{ username: lowerId }, { phone: identifier }, { email: lowerId }]
    }).select('+password');

    if (user) {
      const isMatch = await user.comparePassword(cleanPassword);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please check your username/phone and password.'
        });
      }

      const token = generateToken(user._id);
      loginLimiterInstance.reset(`login_${clientIp}_${identifier}`);

      return res.status(200).json({
        success: true,
        message: 'Logged in successfully.',
        token,
        user: {
          _id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: user.role,
          address: user.address,
          addresses: user.addresses || [],
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt
        }
      });
    }

    // 2. Fallback: Check configured default staff credentials ONLY if user does not exist in DB yet
    const staff = getStaffCredentials();
    let staffMatch = null;
    if (
      (staff.admin.username && lowerId === staff.admin.username) ||
      (staff.admin.phone && lowerId === staff.admin.phone.toLowerCase())
    ) {
      staffMatch = staff.admin;
    } else if (
      (staff.kitchen.username && lowerId === staff.kitchen.username) ||
      (staff.kitchen.phone && lowerId === staff.kitchen.phone.toLowerCase())
    ) {
      staffMatch = staff.kitchen;
    } else if (
      staff.driver &&
      ((staff.driver.username && lowerId === staff.driver.username) ||
        (staff.driver.phone && lowerId === staff.driver.phone.toLowerCase()))
    ) {
      staffMatch = staff.driver;
    }

    if (staffMatch && staffMatch.password && cleanPassword === staffMatch.password) {
      const existingRoleUser = await User.findOne({
        $or: [{ username: staffMatch.username }, { phone: staffMatch.phone }]
      });
      if (!existingRoleUser) {
        user = await User.create({
          name: staffMatch.name,
          username: staffMatch.username,
          phone: staffMatch.phone,
          password: staffMatch.password,
          role: staffMatch.role,
          address: staffMatch.role === 'admin'
            ? 'Main Road Pathardewa, Deoria'
            : (staffMatch.role === 'kitchen' ? 'Kitchen Counter, Apurva Pizza Hub' : 'Delivery Fleet, Pathardewa, Deoria')
        });

        const token = generateToken(user._id);
        loginLimiterInstance.reset(`login_${clientIp}_${identifier}`);

        return res.status(200).json({
          success: true,
          message: 'Logged in successfully.',
          token,
          user: {
            _id: user._id,
            name: user.name,
            username: user.username,
            phone: user.phone,
            role: user.role,
            address: user.address,
            addresses: user.addresses || [],
            createdAt: user.createdAt
          }
        });
      }
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid username, phone number or password.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile (name, address)
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, address, addresses } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (name) user.name = name;
    if (address !== undefined) user.address = address;
    if (Array.isArray(addresses)) user.addresses = addresses;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
        addresses: user.addresses || [],
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change username and/or password with mandatory old password verification
// @route   PUT /api/auth/change-credentials
// @access  Private (All roles: Customer, Admin, Kitchen)
const changeCredentials = async (req, res, next) => {
  try {
    const { oldPassword, currentPassword, newUsername, newPassword, confirmPassword } = req.body;
    const providedOldPassword = (oldPassword || currentPassword || '').trim();

    if (!providedOldPassword) {
      return res.status(400).json({
        success: false,
        message: 'Security Verification Required: Please enter your current (old) password.'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    // Verify current password
    let isPasswordCorrect = await user.comparePassword(providedOldPassword);

    // Fallback check against default staff credentials if user is staff and DB password not yet customized
    if (!isPasswordCorrect && (user.role === 'admin' || user.role === 'kitchen')) {
      const staff = getStaffCredentials();
      const roleStaff = staff[user.role];
      if (roleStaff && providedOldPassword === roleStaff.password) {
        isPasswordCorrect = true;
      }
    }

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect current password. Please enter your existing password to authorize changes.'
      });
    }

    let usernameUpdated = false;
    let passwordUpdated = false;
    let cleanNewPassword = '';

    // 1. Process new username if provided
    if (newUsername !== undefined && typeof newUsername === 'string' && newUsername.trim()) {
      const cleanUsername = newUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

      if (cleanUsername !== user.username) {
        if (cleanUsername.length < 3 || cleanUsername.length > 30) {
          return res.status(400).json({
            success: false,
            message: 'Username must be between 3 and 30 characters long (letters, numbers, underscore).'
          });
        }

        // Check if username is already taken by another user
        const existingUser = await User.findOne({
          username: cleanUsername,
          _id: { $ne: user._id }
        });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: `Username '@${cleanUsername}' is already taken. Please choose another username.`
          });
        }

        if (user.phone === user.username) {
          user.phone = cleanUsername;
        }

        user.username = cleanUsername;
        usernameUpdated = true;
      }
    }

    // 2. Process new password if provided
    if (newPassword && typeof newPassword === 'string' && newPassword.trim()) {
      cleanNewPassword = newPassword.trim();

      if (cleanNewPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long.'
        });
      }

      if (confirmPassword && typeof confirmPassword === 'string' && confirmPassword.trim() !== cleanNewPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password and confirmation password do not match.'
        });
      }

      // Strong password validation
      const pwdValidation = validateStrongPassword(cleanNewPassword, user.name || user.username);
      if (!pwdValidation.valid) {
        return res.status(400).json({
          success: false,
          message: pwdValidation.message
        });
      }

      // Cannot be same as current password
      if (cleanNewPassword === providedOldPassword) {
        return res.status(400).json({
          success: false,
          message: 'New password must be different from your current password.'
        });
      }

      user.password = cleanNewPassword;
      passwordUpdated = true;
    }

    if (!usernameUpdated && !passwordUpdated) {
      return res.status(400).json({
        success: false,
        message: 'No changes provided. Please enter a new username or new password to update.'
      });
    }

    await user.save();

    // Generate fresh JWT token
    const token = generateToken(user._id);

    const changes = [];
    if (usernameUpdated) changes.push(`username updated to '@${user.username}'`);
    if (passwordUpdated) changes.push('password updated successfully');

    res.status(200).json({
      success: true,
      message: `Security credentials updated: ${changes.join(' and ')}.`,
      token,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address,
        addresses: user.addresses || [],
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a new address to user profile
// @route   POST /api/auth/addresses
// @access  Private
const addAddress = async (req, res, next) => {
  try {
    const {
      tag,
      label,
      houseNo,
      area,
      landmark,
      city,
      state,
      pincode,
      formattedAddress,
      latitude,
      longitude,
      isDefault
    } = req.body;

    if (!formattedAddress || typeof formattedAddress !== 'string' || !formattedAddress.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid formatted address is required.'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (!user.addresses) {
      user.addresses = [];
    }

    const shouldBeDefault = isDefault === true || user.addresses.length === 0;

    if (shouldBeDefault) {
      user.addresses.forEach((addr) => {
        addr.isDefault = false;
      });
      user.address = formattedAddress.trim();
    }

    const newAddress = {
      tag: ['Home', 'Work', 'Other'].includes(tag) ? tag : 'Home',
      label: typeof label === 'string' ? label.trim() : '',
      houseNo: typeof houseNo === 'string' ? houseNo.trim() : '',
      area: typeof area === 'string' ? area.trim() : '',
      landmark: typeof landmark === 'string' ? landmark.trim() : '',
      city: typeof city === 'string' && city.trim() ? city.trim() : 'Pathardewa',
      state: typeof state === 'string' && state.trim() ? state.trim() : 'Uttar Pradesh',
      pincode: typeof pincode === 'string' ? pincode.trim() : '',
      formattedAddress: formattedAddress.trim(),
      latitude: typeof latitude === 'number' ? latitude : (latitude ? parseFloat(latitude) : null),
      longitude: typeof longitude === 'number' ? longitude : (longitude ? parseFloat(longitude) : null),
      isDefault: shouldBeDefault
    };

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Address added successfully.',
      addresses: user.addresses,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
        addresses: user.addresses
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing address
// @route   PUT /api/auth/addresses/:addressId
// @access  Private
const updateAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    const {
      tag,
      label,
      houseNo,
      area,
      landmark,
      city,
      state,
      pincode,
      formattedAddress,
      latitude,
      longitude,
      isDefault
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const addr = user.addresses.id(addressId);
    if (!addr) {
      return res.status(404).json({
        success: false,
        message: 'Address not found.'
      });
    }

    if (tag && ['Home', 'Work', 'Other'].includes(tag)) addr.tag = tag;
    if (label !== undefined) addr.label = label.trim();
    if (houseNo !== undefined) addr.houseNo = houseNo.trim();
    if (area !== undefined) addr.area = area.trim();
    if (landmark !== undefined) addr.landmark = landmark.trim();
    if (city !== undefined) addr.city = city.trim();
    if (state !== undefined) addr.state = state.trim();
    if (pincode !== undefined) addr.pincode = pincode.trim();
    if (formattedAddress && typeof formattedAddress === 'string') addr.formattedAddress = formattedAddress.trim();
    if (latitude !== undefined) addr.latitude = latitude !== null ? parseFloat(latitude) : null;
    if (longitude !== undefined) addr.longitude = longitude !== null ? parseFloat(longitude) : null;

    if (isDefault === true) {
      user.addresses.forEach((a) => {
        a.isDefault = false;
      });
      addr.isDefault = true;
      user.address = addr.formattedAddress;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address updated successfully.',
      addresses: user.addresses,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
        addresses: user.addresses
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an address
// @route   DELETE /api/auth/addresses/:addressId
// @access  Private
const deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const addr = user.addresses.id(addressId);
    if (!addr) {
      return res.status(404).json({
        success: false,
        message: 'Address not found.'
      });
    }

    const wasDefault = addr.isDefault;
    user.addresses.pull(addressId);

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
      user.address = user.addresses[0].formattedAddress;
    } else if (user.addresses.length === 0) {
      user.address = '';
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Address removed successfully.',
      addresses: user.addresses,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
        addresses: user.addresses
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set default delivery address
// @route   PATCH /api/auth/addresses/:addressId/default
// @access  Private
const setDefaultAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const addr = user.addresses.id(addressId);
    if (!addr) {
      return res.status(404).json({
        success: false,
        message: 'Address not found.'
      });
    }

    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
    addr.isDefault = true;
    user.address = addr.formattedAddress;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Default address updated.',
      addresses: user.addresses,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address,
        addresses: user.addresses
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if mobile phone is registered (Existing vs New user)
// @route   POST /api/auth/check-phone
// @access  Public
const checkPhone = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (typeof phone !== 'string' || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a 10-digit mobile number.'
      });
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit Indian mobile number.'
      });
    }

    // Check configured staff credentials dynamically
    const staff = getStaffCredentials();
    const isStaff = Boolean(
      (staff.admin?.phone && cleanPhone === staff.admin.phone) ||
      (staff.kitchen?.phone && cleanPhone === staff.kitchen.phone) ||
      (staff.driver?.phone && cleanPhone === staff.driver.phone)
    );

    const existingUser = await User.findOne({ phone: cleanPhone });

    if (existingUser || isStaff) {
      return res.status(200).json({
        success: true,
        exists: true,
        name: existingUser?.name || (isStaff ? 'Staff' : 'Customer'),
        message: 'Account already registered. Please enter your password to log in.'
      });
    }

    return res.status(200).json({
      success: true,
      exists: false,
      message: 'New user. Please verify mobile number with OTP.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users and customer leads with order analytics (Admin only)
// @route   GET /api/auth/users
// @access  Private (Admin)
const getAllUsers = async (req, res, next) => {
  try {
    const Order = require('../models/Order');

    // Retrieve all users sorted by most recently created
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch aggregate order metrics for all users
    let orderAggregates = [];
    try {
      orderAggregates = await Order.aggregate([
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: '$user',
            orderCount: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' },
            lastOrderDate: { $max: '$createdAt' },
            lastDeliveryAddress: { $last: '$deliveryAddress' },
            lastDeliveryLocation: { $last: '$deliveryLocationName' }
          }
        }
      ]);
    } catch (aggErr) {
      console.warn('[getAllUsers] Order aggregation warning:', aggErr.message);
    }

    const orderStatsMap = new Map();
    for (const stat of orderAggregates) {
      if (stat._id) {
        orderStatsMap.set(String(stat._id), stat);
      }
    }

    const enhancedUsers = users.map((u) => {
      const stats = orderStatsMap.get(String(u._id)) || {
        orderCount: 0,
        totalSpent: 0,
        lastOrderDate: null,
        lastDeliveryAddress: '',
        lastDeliveryLocation: ''
      };

      // Get primary or default address if available
      let primaryAddress = (u.address || '').trim();
      if (!primaryAddress && Array.isArray(u.addresses) && u.addresses.length > 0) {
        const defaultAddr = u.addresses.find((a) => a.isDefault) || u.addresses[0];
        if (defaultAddr?.formattedAddress) {
          primaryAddress = defaultAddr.formattedAddress.trim();
        } else {
          const parts = [defaultAddr?.houseNo, defaultAddr?.area, defaultAddr?.landmark, defaultAddr?.city].filter(Boolean);
          if (parts.length > 0) {
            primaryAddress = parts.join(', ');
          }
        }
      }

      // If user profile has no saved address, fallback to last order delivery address or location
      if (!primaryAddress) {
        primaryAddress = (stats.lastDeliveryAddress || stats.lastDeliveryLocation || '').trim();
      }

      // Mask phone number for customer leads to protect user privacy while keeping name visible
      const isStaffUser = ['admin', 'kitchen', 'driver'].includes(u.role);
      let formattedPhone = (u.phone || '').trim();
      let isPhoneMasked = false;
      if (!isStaffUser && formattedPhone) {
        const cleanDigits = formattedPhone.replace(/\D/g, '');
        if (cleanDigits.length >= 10) {
          formattedPhone = `${cleanDigits.slice(0, 2)}••••••${cleanDigits.slice(-2)}`;
          isPhoneMasked = true;
        } else if (cleanDigits.length > 4) {
          formattedPhone = `${cleanDigits.slice(0, 1)}••••${cleanDigits.slice(-2)}`;
          isPhoneMasked = true;
        } else {
          formattedPhone = '••••••';
          isPhoneMasked = true;
        }
      }

      return {
        _id: u._id,
        name: u.name || 'Customer',
        username: u.username || '',
        phone: formattedPhone,
        isPhoneMasked,
        email: u.email || '',
        role: u.role || 'customer',
        address: primaryAddress,
        addresses: u.addresses || [],
        orderCount: stats.orderCount || 0,
        totalSpent: Math.round((stats.totalSpent || 0) * 100) / 100,
        lastOrderDate: stats.lastOrderDate,
        createdAt: u.createdAt
      };
    });

    res.status(200).json({
      success: true,
      count: enhancedUsers.length,
      data: enhancedUsers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new Staff account (Kitchen KDS or Admin) - Admin Only
// @route   POST /api/auth/staff-users
// @access  Private (Admin)
const createStaffUser = async (req, res, next) => {
  try {
    const { name, username, phone, email, password, role } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Staff member full name is required.'
      });
    }

    const cleanRole = String(role || '').trim().toLowerCase();
    if (!['kitchen', 'admin', 'driver'].includes(cleanRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff role. Role must be either "kitchen" (Kitchen KDS Display), "admin" (Administrator), or "driver" (Delivery Partner).'
      });
    }

    if (!password || typeof password !== 'string' || password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const cleanName = name.trim();
    const cleanPassword = password.trim();

    // Validate strong password
    const pwdCheck = validateStrongPassword(cleanPassword, cleanName);
    if (!pwdCheck.valid) {
      return res.status(400).json({
        success: false,
        message: pwdCheck.message
      });
    }

    let cleanUsername = typeof username === 'string' ? username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') : '';
    let cleanPhone = typeof phone === 'string' ? phone.trim().replace(/\D/g, '') : '';
    let cleanEmail = typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : undefined;

    if (!cleanUsername && !cleanPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a staff username or a 10-digit mobile number for login.'
      });
    }

    if (cleanPhone && cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number must be a valid 10-digit number.'
      });
    }

    // Check duplicate username
    if (cleanUsername) {
      const existingUsername = await User.findOne({ username: cleanUsername });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: `Username '${cleanUsername}' is already taken. Please choose another username.`
        });
      }
    }

    // Check duplicate phone
    if (cleanPhone) {
      const existingPhone = await User.findOne({ phone: cleanPhone });
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: `Phone number '${cleanPhone}' is already registered to another account.`
        });
      }
    }

    // Check duplicate email
    if (cleanEmail) {
      const existingEmail = await User.findOne({ email: cleanEmail });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: `Email address '${cleanEmail}' is already registered.`
        });
      }
    }

    // Create staff user in database
    const newStaff = await User.create({
      name: cleanName,
      username: cleanUsername || undefined,
      phone: cleanPhone || undefined,
      email: cleanEmail,
      password: cleanPassword,
      role: cleanRole,
      address: cleanRole === 'admin'
        ? 'Administrative Office, Apurva Pizza Hub'
        : (cleanRole === 'kitchen' ? 'Kitchen KDS Counter, Apurva Pizza Hub' : 'Delivery Fleet, Apurva Pizza Hub')
    });

    res.status(201).json({
      success: true,
      message: `${cleanRole === 'driver' ? 'Delivery Driver' : (cleanRole === 'kitchen' ? 'Kitchen KDS' : 'Administrator')} account created successfully for ${cleanName}.`,
      data: {
        _id: newStaff._id,
        name: newStaff.name,
        username: newStaff.username,
        phone: newStaff.phone,
        email: newStaff.email,
        role: newStaff.role,
        address: newStaff.address,
        createdAt: newStaff.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/Revoke Staff account - Admin Only
// @route   DELETE /api/auth/staff-users/:id
// @access  Private (Admin)
const deleteStaffUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff user ID format.'
      });
    }

    // Prevent self-deletion
    if (req.user && req.user._id && req.user._id.toString() === id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Security Defense: You cannot delete your own active administrator account.'
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Staff user not found.'
      });
    }

    // Prevent deleting the root default staff credentials
    const staff = getStaffCredentials();
    if (
      targetUser.username === staff.admin?.username ||
      targetUser.phone === staff.admin?.phone ||
      targetUser.username === 'admin' ||
      targetUser.username === 'kitchen'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Default root staff accounts cannot be deleted.'
      });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Staff account '${targetUser.name}' (${targetUser.role}) has been removed.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active drivers for rider assignment
// @route   GET /api/auth/drivers
// @access  Private (Admin / Kitchen)
const getDrivers = async (req, res, next) => {
  try {
    const drivers = await User.find({ role: 'driver' }).select('name phone username address');
    res.status(200).json({
      success: true,
      count: drivers.length,
      data: drivers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update / Assign any user role (admin, kitchen, driver, customer) - Admin Only
// @route   PATCH /api/auth/users/:id/role
// @access  Private (Admin)
const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format.'
      });
    }

    const cleanRole = String(role || '').trim().toLowerCase();
    if (!['customer', 'kitchen', 'admin', 'driver'].includes(cleanRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified. Role must be "customer", "kitchen", "driver", or "admin".'
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Target user account not found.'
      });
    }

    // Root default admin safeguard
    if (targetUser.username === 'admin' && cleanRole !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Root administrator account role cannot be changed.'
      });
    }

    // Prevent admin from demoting themselves
    if (req.user?._id && req.user._id.toString() === id.toString() && cleanRole !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Security Defense: You cannot demote your own active administrator account.'
      });
    }

    const oldRole = targetUser.role;
    targetUser.role = cleanRole;

    // Set appropriate default station address if transitioning to staff and empty
    if (!targetUser.address || targetUser.address.includes('Apurva Pizza Hub')) {
      if (cleanRole === 'admin') {
        targetUser.address = 'Administrative Office, Apurva Pizza Hub';
      } else if (cleanRole === 'kitchen') {
        targetUser.address = 'Kitchen KDS Counter, Apurva Pizza Hub';
      } else if (cleanRole === 'driver') {
        targetUser.address = 'Delivery Fleet, Apurva Pizza Hub';
      } else if (cleanRole === 'customer') {
        targetUser.address = targetUser.address?.includes('Apurva Pizza Hub') ? '' : targetUser.address;
      }
    }

    await targetUser.save();

    res.status(200).json({
      success: true,
      message: `User '${targetUser.name}' role successfully updated from ${oldRole} to ${cleanRole}.`,
      data: {
        _id: targetUser._id,
        name: targetUser.name,
        username: targetUser.username,
        phone: targetUser.phone,
        email: targetUser.email,
        role: targetUser.role,
        address: targetUser.address,
        createdAt: targetUser.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkPhone,
  register,
  login,
  loginWithOtp,
  sendOtp,
  verifyOtp,
  resetPassword,
  getMe,
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getAllUsers,
  createStaffUser,
  deleteStaffUser,
  updateUserRole,
  changeCredentials,
  getDrivers
};


