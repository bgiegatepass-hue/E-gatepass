const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');
const User = require('../models/User');
const { recordAudit } = require('../services/auditService');
const { uploadBufferToCloudinary } = require('../services/fileUploadService');
const { sendOtpEmail } = require('../services/emailService');

function generateResetOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/v1/auth/login
// No public self-registration — every account is created by Admin via /admin/members.
const login = asyncHandler(async (req, res) => {
  const { email, password, role, campus } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL?.toLowerCase().trim();
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  const defaultAdminCampus = process.env.DEFAULT_ADMIN_CAMPUS || 'BIST';

  let user = await User.findOne({ email: normalizedEmail });

  const isDefaultAdminLogin =
    normalizedEmail === defaultAdminEmail &&
    defaultAdminPassword &&
    password === defaultAdminPassword;

  if (!user && isDefaultAdminLogin) {
    const existingAdmin = await User.findOne({ role: 'ADMIN', email: normalizedEmail });
    if (existingAdmin) {
      existingAdmin.name = process.env.DEFAULT_ADMIN_NAME || existingAdmin.name || 'Super Admin';
      existingAdmin.password = defaultAdminPassword;
      existingAdmin.campus = defaultAdminCampus;
      existingAdmin.isActive = true;
      existingAdmin.isEmailVerified = true;
      user = await existingAdmin.save();
    } else {
      user = await User.create({
        name: process.env.DEFAULT_ADMIN_NAME || 'Super Admin',
        email: normalizedEmail,
        password: defaultAdminPassword,
        role: 'ADMIN',
        campus: defaultAdminCampus,
        isActive: true,
        isEmailVerified: true,
      });
    }
  }

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  if (role && user.role !== role) {
    return res.status(401).json({ success: false, message: `No ${role} account found for this email` });
  }
  if (campus && user.campus !== campus) {
    return res.status(401).json({ success: false, message: `This account is not registered under the ${campus} campus` });
  }
  const match = await user.comparePassword(password);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (!user.isActive) {
    if (user.role === 'STUDENT') {
      user.isActive = true;
      await user.save();
    } else {
      return res.status(403).json({ success: false, message: 'Account is inactive. Contact admin.' });
    }
  }

  const token = generateToken({ id: user._id.toString(), role: user.role });
  await recordAudit(req, { action: 'USER_LOGIN', entityType: 'User', entityId: user._id });

  res.json({ success: true, data: { token, user: user.toJSON() } });
});

// GET /api/v1/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user.toJSON() });
});

// PUT /api/v1/auth/fcm-token
const updateFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;
  if (!fcmToken) return res.status(400).json({ success: false, message: 'fcmToken is required' });

  req.user.fcmToken = fcmToken;
  await req.user.save();
  res.json({ success: true, message: 'FCM token updated' });
});

// PUT /api/v1/auth/profile-photo  (multipart, field "photo")
const updateProfilePhoto = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'photo file is required' });

  const destPath = `profiles/user_${req.user._id}_${Date.now()}`;
  const url = await uploadBufferToCloudinary(req.file.buffer, destPath, 'epass', req.file.mimetype || 'image/jpeg');

  req.user.profileImageUrl = url;
  await req.user.save();
  await recordAudit(req, { action: 'PROFILE_PHOTO_UPDATED', entityType: 'User', entityId: req.user._id });

  res.json({ success: true, data: { profileImageUrl: url } });
});

// PUT /api/v1/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
  }

  const match = await req.user.comparePassword(currentPassword);
  if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

  req.user.password = newPassword; // pre('save') hook re-hashes it
  await req.user.save();
  await recordAudit(req, { action: 'PASSWORD_CHANGED', entityType: 'User', entityId: req.user._id });

  res.json({ success: true, message: 'Password updated successfully' });
});

// PUT /api/v1/auth/me — update current user's profile fields
const updateMe = asyncHandler(async (req, res) => {
  const editableFields = [
    'name', 'phone', 'department', 'college', 'campus', 'employeeId',
    'designation', 'branch', 'rollNumber', 'semester', 'assignedGate', 'alternatePhone', 'officeRoom'
  ];
  editableFields.forEach((f) => {
    if (req.body[f] !== undefined) req.user[f] = req.body[f];
  });
  await req.user.save();
  await recordAudit(req, { action: 'PROFILE_UPDATED', entityType: 'User', entityId: req.user._id, details: req.body });
  res.json({ success: true, data: req.user.toJSON() });
});

// POST /api/v1/auth/forgot-password
// Flow:
// 1) { email } -> send OTP to the user's email
// 2) { email, otp } -> verify the OTP
// 3) { email, otp, password } -> reset password and allow immediate login
const forgotPassword = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;
  const normalizedEmail = (email || '').toLowerCase().trim();

  if (!normalizedEmail) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(404).json({ success: false, message: 'No account found with this email address' });
  }

  if (!otp && !password) {
    const resetOtp = generateResetOtp();
    user.resetOtp = resetOtp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const emailSent = await sendOtpEmail({
      toEmail: normalizedEmail,
      toName: user.name || 'User',
      otp: resetOtp,
      expiryMinutes: 10,
    });

    return res.json({
      success: true,
      message: emailSent
        ? 'OTP sent to your Gmail address.'
        : 'OTP generated successfully. Please check your email configuration to receive the reset code.',
      data: {
        email: normalizedEmail,
      },
    });
  }

  const providedOtp = String(otp || '').trim();
  if (!providedOtp) {
    return res.status(400).json({ success: false, message: 'OTP is required' });
  }

  if (!user.resetOtp || user.resetOtp !== providedOtp) {
    return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
  }

  if (!user.resetOtpExpiry || Date.now() > new Date(user.resetOtpExpiry).getTime()) {
    user.resetOtp = '';
    user.resetOtpExpiry = null;
    await user.save();
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
  }

  if (!password) {
    return res.json({ success: true, message: 'OTP verified successfully.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
  }

  user.password = password;
  user.resetOtp = '';
  user.resetOtpExpiry = null;
  await user.save();

  return res.json({
    success: true,
    message: 'Password updated successfully. You can now login with your new password.',
    data: { email: normalizedEmail },
  });
});

module.exports = { login, getMe, updateFcmToken, updateProfilePhoto, changePassword, updateMe, forgotPassword };