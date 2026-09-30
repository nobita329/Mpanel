const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('crypto').randomUUID ? { v4: require('crypto').randomUUID } : { v4: () => Math.random().toString(36).substring(2, 15) };
const config = require('../config/config');
const { query } = require('../database/db');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../services/activityService');

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password, twoFactorCode } = req.body;
    const identifier = (username || '').toString().trim();
    const userPass = (password || '').toString();

    if (!identifier || !userPass) {
      return res.status(400).json({ success: false, error: 'Username/email and password are required.' });
    }

    const user = await query.get(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
      [identifier, identifier]
    );
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    if (user.suspended) {
      return res.status(403).json({ success: false, error: 'This account has been suspended by an administrator.' });
    }

    const isMatch = await bcrypt.compare(userPass, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    // Check 2FA
    if (user.two_factor_enabled) {
      if (!twoFactorCode) {
        return res.json({ success: true, requires2FA: true, userId: user.id });
      }

      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({ success: false, error: 'Invalid 2FA authentication code.' });
      }
    }

    // Issue JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    // Record last login time and IP
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '';
    try {
      await query.run('UPDATE users SET last_login_at = CURRENT_TIMESTAMP, last_login_ip = ? WHERE id = ?', [String(clientIp).substring(0, 64), user.id]);
    } catch (e) {}

    logActivity(user.id, null, 'USER_LOGIN', 'Successful login', req);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        email: user.email,
        role: user.role,
        two_factor_enabled: Boolean(user.two_factor_enabled),
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Server error during login.' });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const regSetting = await query.get('SELECT `value` FROM settings WHERE `key` = ?', ['registration_enabled']);
    if (regSetting && regSetting.value === '0') {
      return res.status(403).json({ success: false, error: 'Public registration is currently disabled.' });
    }

    const cleanUsername = (username || '').toString().trim();
    const cleanEmail = (email || '').toString().trim();
    const cleanPassword = (password || '').toString();

    if (!cleanUsername || !cleanEmail || !cleanPassword) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

    if (cleanUsername.length < 3) {
      return res.status(400).json({ success: false, error: 'Username must be at least 3 characters.' });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
    }

    // Check existing
    const existing = await query.get(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
      [cleanUsername, cleanEmail]
    );
    if (existing) {
      return res.status(400).json({ success: false, error: 'Username or Email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const userUuid = uuidv4();

    const result = await query.run(
      'INSERT INTO users (uuid, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [userUuid, cleanUsername, cleanEmail, passwordHash, 'user']
    );

    const token = jwt.sign(
      { id: result.lastID, username, role: 'user' },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    logActivity(result.lastID, null, 'USER_REGISTER', 'User account registered', req);

    res.json({
      success: true,
      token,
      user: {
        id: result.lastID,
        uuid: userUuid,
        username,
        email,
        role: 'user',
        two_factor_enabled: false
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'Server error during registration.' });
  }
});

// Setup 2FA
router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `Mpanel (${req.user.username})`,
      length: 20
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    // Temporarily save secret
    await query.run('UPDATE users SET two_factor_secret = ? WHERE id = ?', [secret.base32, req.user.id]);

    res.json({
      success: true,
      secret: secret.base32,
      qrCodeUrl
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate 2FA secret.' });
  }
});

// Verify & Enable 2FA
router.post('/2fa/verify', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await query.get('SELECT two_factor_secret FROM users WHERE id = ?', [req.user.id]);

    if (!user || !user.two_factor_secret) {
      return res.status(400).json({ success: false, error: 'Please initiate 2FA setup first.' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ success: false, error: 'Invalid verification code.' });
    }

    await query.run('UPDATE users SET two_factor_enabled = 1 WHERE id = ?', [req.user.id]);
    logActivity(req.user.id, null, '2FA_ENABLED', 'Enabled two-factor authentication', req);

    res.json({ success: true, message: 'Two-Factor Authentication enabled successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to verify 2FA.' });
  }
});

// Disable 2FA
router.post('/2fa/disable', authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    const user = await query.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Incorrect password.' });
    }

    await query.run('UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?', [req.user.id]);
    logActivity(req.user.id, null, '2FA_DISABLED', 'Disabled two-factor authentication', req);

    res.json({ success: true, message: 'Two-Factor Authentication disabled.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to disable 2FA.' });
  }
});

// Get Current User (/me)
router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// Update Profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword, avatar } = req.body;
    const user = await query.get('SELECT * FROM users WHERE id = ?', [req.user.id]);

    let newHash = user.password_hash;
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, error: 'Current password is required to set a new password.' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, error: 'Current password does not match.' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
      }
      newHash = await bcrypt.hash(newPassword, 10);
    }

    await query.run(
      'UPDATE users SET username = ?, email = ?, password_hash = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [username || user.username, email || user.email, newHash, avatar !== undefined ? avatar : user.avatar, req.user.id]
    );

    logActivity(req.user.id, null, 'PROFILE_UPDATE', 'Updated user profile info', req);

    const updated = await query.get('SELECT id, uuid, username, email, role, two_factor_enabled, avatar FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
});

// Get User Custom Server Order (Custom Server Sort extension)
router.get('/server-order', authenticate, async (req, res) => {
  try {
    const row = await query.get('SELECT server_order FROM users WHERE id = ?', [req.user.id]);
    let parsed = null;
    if (row && row.server_order) {
      try {
        parsed = JSON.parse(row.server_order);
      } catch (e) {
        parsed = row.server_order;
      }
    }
    res.json({ success: true, server_order: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update User Custom Server Order (Custom Server Sort extension)
router.put('/server-order', authenticate, async (req, res) => {
  try {
    const { server_order } = req.body;
    let orderStr = null;
    if (server_order !== null && server_order !== undefined) {
      if (Array.isArray(server_order)) {
        orderStr = JSON.stringify(server_order.map(Number).filter(n => !isNaN(n) && n > 0));
      } else if (typeof server_order === 'string' && server_order.trim() !== '' && server_order !== 'null') {
        orderStr = server_order.trim();
      }
    }
    await query.run('UPDATE users SET server_order = ? WHERE id = ?', [orderStr, req.user.id]);
    res.json({ success: true, message: 'Server order updated successfully.', server_order: orderStr ? JSON.parse(orderStr) : null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

