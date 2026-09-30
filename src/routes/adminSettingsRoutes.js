const express = require('express');
const router = express.Router();
const path = require('path');
const { query } = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { uploadBranding } = require('../middleware/upload');
const imagesConfig = require('../config/images');
const config = require('../config/config');
const wallpaperService = require('../services/wallpaperService');
const { logActivity } = require('../services/activityService');

// Get Public Settings (Accessible by all users and guests)
router.get('/public', async (req, res) => {
  try {
    const rows = await query.all('SELECT `key`, `value` FROM settings');
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }

    res.json({
      success: true,
      settings,
      wallpaperPresets: imagesConfig.categoriesWallpapers
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load public settings.' });
  }
});

// Browse 4K Wallpapers from 4kwallpapers.com with categories, search, and pagination
router.get('/wallpapers', async (req, res) => {
  try {
    const category = req.query.category || 'all';
    const page = parseInt(req.query.page || '1', 10);
    const searchQuery = req.query.query || req.query.q || '';

    const data = await wallpaperService.getWallpapers({
      category,
      page,
      query: searchQuery
    });

    res.json(data);
  } catch (err) {
    console.error('Wallpaper route error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch wallpapers.' });
  }
});

// Get Categories for 4K Wallpapers
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    categories: wallpaperService.getCategories()
  });
});

// Get All Settings (Admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const rows = await query.all('SELECT * FROM settings');
    const settings = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }

    res.json({
      success: true,
      settings,
      wallpaperPresets: imagesConfig.categoriesWallpapers,
      dockerTemplates: {
        minecraft: imagesConfig.minecraft,
        nodejs: imagesConfig.nodejs,
        python: imagesConfig.python,
        lumenvm: imagesConfig.lumenvm,
        nokvm: imagesConfig.nokvm
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load admin settings.' });
  }
});

// Update Settings (Admin only)
router.put('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    const allowedKeys = [
      'panel_name',
      'panel_logo',
      'favicon_name',
      'favicon_logo',
      'panel_bg',
      'panel_bg_type',
      'panel_bg_category',
      'panel_music_url',
      'panel_music_title',
      'panel_music_enabled',
      'panel_music_volume',
      'transparency_bar',
      'blur_bar',
      'registration_enabled',
      'theme_mode',
      'auto_save_enabled',
      'active_theme',
      'panel_sounds_enabled',
      'arix_primary_color',
      'liquidx_primary_color',
      'tutorials_enabled',
      'tutorials_autostart_enabled',
      'nebula_config',
      'company_name',
      'two_factor_requirement',
      'default_language',
      'admin_theme',
      'recaptcha_enabled',
      'recaptcha_site_key',
      'recaptcha_secret_key',
      'http_connect_timeout',
      'http_request_timeout',
      'auto_allocation_enabled'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedKeys.includes(key)) {
        await query.run(
          'INSERT INTO settings (`key`, `value`, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = CURRENT_TIMESTAMP',
          [key, String(value)]
        );
      }
    }

    logActivity(req.user.id, null, 'SETTINGS_UPDATE', 'Updated global panel settings', req);

    res.json({ success: true, message: 'Settings saved successfully!' });
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update settings.' });
  }
});

// Reset Theme & Customization to Default (Admin only)
router.post('/reset', authenticate, requireAdmin, async (req, res) => {
  try {
    const dt = config.DEFAULT_THEME;
    const defaults = {
      panel_bg: dt.wallpaper,
      panel_bg_type: 'image',
      panel_bg_category: dt.wallpaperCategory || 'black-dark',
      transparency_bar: String(dt.transparency ?? 18),
      blur_bar: String(dt.blur ?? 16),
      theme_mode: 'dark',
      panel_name: config.DEFAULT_PANEL_NAME || 'Mpanel',
      favicon_name: config.DEFAULT_PANEL_NAME || 'Mpanel',
      panel_logo: dt.logo || '/assets/mpanel-logo.svg',
      favicon_logo: dt.favicon || '/assets/favicon.svg'
    };

    for (const [key, value] of Object.entries(defaults)) {
      await query.run(
        'INSERT INTO settings (`key`, `value`, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = CURRENT_TIMESTAMP',
        [key, String(value)]
      );
    }

    logActivity(req.user.id, null, 'SETTINGS_RESET', 'Reset panel theme and customization to defaults', req);

    res.json({
      success: true,
      message: 'Panel theme reset to default successfully!',
      defaults
    });
  } catch (err) {
    console.error('Settings reset error:', err);
    res.status(500).json({ success: false, error: 'Failed to reset settings.' });
  }
});

// Upload Branding Media (Logo, Favicon, Background image/video, Music)
router.post('/upload', authenticate, requireAdmin, uploadBranding.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const fileUrl = `/uploads/branding/${req.file.filename}`;
    const fileType = req.body.type; // 'logo' | 'favicon' | 'background' | 'music'
    const isVideo = /\.(mp4|webm|mkv|mov)$/i.test(req.file.originalname);

    if (fileType) {
      const keyMap = {
        logo: 'panel_logo',
        favicon: 'favicon_logo',
        background: 'panel_bg',
        music: 'panel_music_url'
      };
      const settingKey = keyMap[fileType];
      if (settingKey) {
        await query.run(
          'INSERT INTO settings (`key`, `value`, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = CURRENT_TIMESTAMP',
          [settingKey, fileUrl]
        );

        if (fileType === 'background') {
          await query.run(
            'INSERT INTO settings (`key`, `value`, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = CURRENT_TIMESTAMP',
            ['panel_bg_type', isVideo ? 'video' : 'image']
          );
        }
      }
    }

    res.json({
      success: true,
      url: fileUrl,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      isVideo
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to upload branding asset.' });
  }
});

module.exports = router;


