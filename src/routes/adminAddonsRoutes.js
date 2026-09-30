const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const addonService = require('../services/addonService');
const { logActivity } = require('../services/activityService');

// 1. Get All Addons Configuration & Metadata
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const settings = await addonService.getAddonSettings();
    const meta = addonService.getAddonMetadata();
    res.json({
      success: true,
      settings,
      addons: meta.map(m => ({
        ...m,
        config: settings[m.key] || {}
      }))
    });
  } catch (err) {
    console.error('Error fetching addons:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Reset All Addons to Defaults
router.post('/reset', authenticate, requireAdmin, async (req, res) => {
  try {
    const defaults = await addonService.resetAddons();
    logActivity(req.user.id, null, 'ADDONS_RESET', 'Reset all Arix addons to default configuration', req);
    res.json({ success: true, message: 'All addons reset to default settings!', settings: defaults });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Egg Importer: Browse GitHub repositories
router.get('/eggs/repo/:type', authenticate, requireAdmin, async (req, res) => {
  try {
    const type = req.params.type || 'game';
    const eggs = await addonService.getEggRepository(type);
    res.json({ success: true, type, eggs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Egg Importer: Import Egg
router.post('/eggs/import', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await addonService.importEgg(req.body);
    logActivity(req.user.id, null, 'EGG_IMPORT', `Imported egg template: ${req.body.name || 'Custom Egg'}`, req);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Subdomain Addon: Cloudflare Config
router.get('/domains/cloudflare', authenticate, requireAdmin, async (req, res) => {
  try {
    const config = await addonService.getCloudflareConfig();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/domains/cloudflare', authenticate, requireAdmin, async (req, res) => {
  try {
    const config = await addonService.saveCloudflareConfig(req.body);
    logActivity(req.user.id, null, 'CLOUDFLARE_CONFIG', 'Updated Cloudflare Subdomains configuration', req);
    res.json({ success: true, message: 'Cloudflare configuration saved!', config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Subdomain Addon: Connected Domains
router.get('/domains/connected', authenticate, requireAdmin, async (req, res) => {
  try {
    const domains = await addonService.getConnectedDomains();
    res.json({ success: true, domains });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/domains/connect', authenticate, requireAdmin, async (req, res) => {
  try {
    const { domain, zoneId } = req.body;
    const result = await addonService.connectDomain(domain, zoneId);
    logActivity(req.user.id, null, 'DOMAIN_CONNECT', `Connected domain: ${domain}`, req);
    res.json({ success: true, message: `Domain ${domain} connected successfully!`, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/domains/disconnect/:domain', authenticate, requireAdmin, async (req, res) => {
  try {
    const domain = req.params.domain;
    await addonService.disconnectDomain(domain);
    logActivity(req.user.id, null, 'DOMAIN_DISCONNECT', `Disconnected domain: ${domain}`, req);
    res.json({ success: true, message: `Domain ${domain} disconnected successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Subdomain Addon: Blocklist
router.get('/domains/blocklist', authenticate, requireAdmin, async (req, res) => {
  try {
    const blocklist = await addonService.getBlocklist();
    res.json({ success: true, blocklist });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/domains/blocklist', authenticate, requireAdmin, async (req, res) => {
  try {
    const { subdomain, reason } = req.body;
    const entry = await addonService.addBlocklistEntry(subdomain, reason);
    res.json({ success: true, message: `Added "${subdomain}" to blocklist.`, entry });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/domains/blocklist/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await addonService.removeBlocklistEntry(req.params.id);
    res.json({ success: true, message: 'Blocklist entry removed.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/domains/blocklist/export', authenticate, requireAdmin, async (req, res) => {
  try {
    const list = await addonService.getBlocklist();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="subdomains_blocklist.json"');
    res.send(JSON.stringify(list, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/domains/blocklist/import', authenticate, requireAdmin, async (req, res) => {
  try {
    const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
    let count = 0;
    for (const e of entries) {
      if (e.subdomain) {
        try {
          await addonService.addBlocklistEntry(e.subdomain, e.reason || 'Imported');
          count++;
        } catch (ign) {}
      }
    }
    res.json({ success: true, message: `Successfully imported ${count} blocklist entries.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Get Single Addon Configuration
router.get('/:addon', authenticate, requireAdmin, async (req, res) => {
  try {
    const addon = req.params.addon;
    const config = await addonService.getSingleAddon(addon);
    if (!config) {
      return res.status(404).json({ success: false, error: `Addon "${addon}" not found.` });
    }
    res.json({ success: true, addon, config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Update Single Addon Configuration
router.post('/:addon', authenticate, requireAdmin, async (req, res) => {
  try {
    const addon = req.params.addon;
    const updated = await addonService.updateSingleAddon(addon, req.body);
    logActivity(req.user.id, null, 'ADDON_UPDATE', `Updated addon settings: ${addon}`, req);
    res.json({ success: true, message: `Addon "${addon}" settings saved successfully!`, config: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
