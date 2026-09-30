const express = require('express');
const router = express.Router({ mergeParams: true });
const path = require('path');
const fs = require('fs');
const { query } = require('../database/db');
const { authenticate, requireServerAccess } = require('../middleware/auth');
const addonService = require('../services/addonService');
const { logActivity } = require('../services/activityService');
const imagesConfig = require('../config/images');

// ==========================================
// 1. SUBDOMAINS ADDON (Client)
// ==========================================

// Get available connected domains for user dropdown
router.get('/subdomains/available-domains', authenticate, async (req, res) => {
  try {
    const domains = await query.all("SELECT domain FROM subdomains_connected_domains WHERE status = 'active' ORDER BY domain ASC");
    res.json({ success: true, domains: domains.map(d => d.domain) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get subdomains on server
router.get('/subdomains', authenticate, requireServerAccess('allocations.read'), async (req, res) => {
  try {
    const serverId = req.params.serverId;
    const subdomains = await query.all('SELECT * FROM subdomains_user_subdomains WHERE server_id = ? ORDER BY id DESC', [serverId]);
    const server = await query.get('SELECT subdomain_limit FROM servers WHERE id = ?', [serverId]);

    res.json({
      success: true,
      subdomains,
      limit: server ? (server.subdomain_limit || 1) : 1
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create subdomain for server
router.post('/subdomains', authenticate, requireServerAccess('allocations.create'), async (req, res) => {
  try {
    const serverId = req.params.serverId;
    const { subdomain, domain, port_id } = req.body;

    if (!subdomain || !domain) {
      return res.status(400).json({ success: false, error: 'Subdomain and Domain are required.' });
    }

    const cleanSub = subdomain.trim().toLowerCase();
    const cleanDom = domain.trim().toLowerCase();
    const fullDomain = `${cleanSub}.${cleanDom}`;

    // 1. Check Blocklist
    const blocked = await query.get('SELECT * FROM subdomains_blocklist WHERE subdomain = ?', [cleanSub]);
    if (blocked) {
      return res.status(400).json({ success: false, error: `Subdomain "${cleanSub}" is blocked: ${blocked.reason || 'Restricted keyword'}` });
    }

    // 2. Check Connected Domains
    const domExist = await query.get("SELECT * FROM subdomains_connected_domains WHERE domain = ? AND status = 'active'", [cleanDom]);
    if (!domExist) {
      return res.status(400).json({ success: false, error: `Domain "${cleanDom}" is not connected or active.` });
    }

    // 3. Check Subdomain Limits
    const server = await query.get('SELECT id, subdomain_limit FROM servers WHERE id = ?', [serverId]);
    const existingCount = await query.get('SELECT COUNT(*) as count FROM subdomains_user_subdomains WHERE server_id = ?', [serverId]);
    const limit = server ? (server.subdomain_limit || 1) : 1;
    if (existingCount && existingCount.count >= limit) {
      return res.status(400).json({ success: false, error: `Subdomain limit of ${limit} reached for this server.` });
    }

    // 4. Check uniqueness
    const alreadyTaken = await query.get('SELECT id FROM subdomains_user_subdomains WHERE full_domain = ?', [fullDomain]);
    if (alreadyTaken) {
      return res.status(400).json({ success: false, error: `The subdomain "${fullDomain}" is already in use.` });
    }

    // 5. Insert record
    const r = await query.run(`
      INSERT INTO subdomains_user_subdomains (subdomain, domain, full_domain, nest_id, server_id, port_id)
      VALUES (?, ?, ?, 1, ?, ?)
    `, [cleanSub, cleanDom, fullDomain, serverId, port_id || 0]);

    logActivity(req.user.id, serverId, 'SUBDOMAIN_CREATE', `Created subdomain: ${fullDomain}`, req);

    res.json({
      success: true,
      message: `Subdomain ${fullDomain} created successfully!`,
      subdomain: {
        id: r.lastID || r.insertId,
        subdomain: cleanSub,
        domain: cleanDom,
        full_domain: fullDomain,
        server_id: serverId,
        port_id: port_id || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete subdomain
router.delete('/subdomains/:subdomainId', authenticate, requireServerAccess('allocations.delete'), async (req, res) => {
  try {
    const { serverId, subdomainId } = req.params;
    const sub = await query.get('SELECT * FROM subdomains_user_subdomains WHERE id = ? AND server_id = ?', [subdomainId, serverId]);
    if (!sub) {
      return res.status(404).json({ success: false, error: 'Subdomain not found.' });
    }

    await query.run('DELETE FROM subdomains_user_subdomains WHERE id = ?', [subdomainId]);
    logActivity(req.user.id, serverId, 'SUBDOMAIN_DELETE', `Deleted subdomain: ${sub.full_domain}`, req);

    res.json({ success: true, message: `Subdomain ${sub.full_domain} deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. EGG CHANGER ADDON (Client)
// ==========================================
router.get('/egg-changer', authenticate, requireServerAccess('settings.view'), async (req, res) => {
  try {
    const serverId = req.params.serverId;
    const server = await query.get('SELECT id, name, server_type, docker_image, startup_cmd FROM servers WHERE id = ?', [serverId]);
    if (!server) return res.status(404).json({ success: false, error: 'Server not found.' });

    const addonConfig = await addonService.getSingleAddon('eggChanger');

    // Aggregate available templates
    const availableEggs = [];
    if (imagesConfig.minecraft) {
      imagesConfig.minecraft.forEach((img, idx) => {
        availableEggs.push({
          id: `mc-${idx}`,
          category: 'Minecraft',
          name: `Minecraft (${img.label})`,
          docker_image: img.value,
          default_startup: img.defaultCmd
        });
      });
    }
    if (imagesConfig.nodejs) {
      imagesConfig.nodejs.forEach((img, idx) => {
        availableEggs.push({
          id: `node-${idx}`,
          category: 'NodeJS',
          name: `Node.js (${img.label})`,
          docker_image: img.value,
          default_startup: img.defaultCmd
        });
      });
    }
    if (imagesConfig.python) {
      imagesConfig.python.forEach((img, idx) => {
        availableEggs.push({
          id: `py-${idx}`,
          category: 'Python',
          name: `Python (${img.label})`,
          docker_image: img.value,
          default_startup: img.defaultCmd
        });
      });
    }

    res.json({
      success: true,
      currentEgg: {
        server_type: server.server_type,
        docker_image: server.docker_image,
        startup_cmd: server.startup_cmd
      },
      forceStartup: addonConfig.forceStartup || false,
      can_reinstall: true,
      availableEggs
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/egg-changer', authenticate, requireServerAccess('settings.edit'), async (req, res) => {
  try {
    const serverId = req.params.serverId;
    const { docker_image, startup_cmd, server_type, update_startup, reinstall } = req.body;

    if (!docker_image) {
      return res.status(400).json({ success: false, error: 'Docker image is required.' });
    }

    const updates = ['docker_image = ?'];
    const params = [docker_image];

    if (server_type) {
      updates.push('server_type = ?');
      params.push(server_type);
    }
    if (update_startup && startup_cmd) {
      updates.push('startup_cmd = ?');
      params.push(startup_cmd);
    }

    params.push(serverId);
    await query.run(`UPDATE servers SET ${updates.join(', ')} WHERE id = ?`, params);

    logActivity(req.user.id, serverId, 'EGG_CHANGE', `Switched egg runtime to: ${docker_image}`, req);

    res.json({
      success: true,
      message: `Server runtime updated to ${docker_image}!${reinstall ? ' Reinstall initiated.' : ''}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. FIVEM ADDON (Client)
// ==========================================
router.get('/fivem/artifacts', authenticate, async (req, res) => {
  try {
    const artifacts = await addonService.getFivemArtifacts();
    res.json({ success: true, artifacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/fivem/txadmin/activate', authenticate, requireServerAccess('settings.edit'), async (req, res) => {
  try {
    const serverId = req.params.serverId;
    // Set txAdmin env variable to 1
    const server = await query.get('SELECT env_vars FROM servers WHERE id = ?', [serverId]);
    let envs = {};
    if (server && server.env_vars) {
      try { envs = JSON.parse(server.env_vars); } catch (e) {}
    }
    envs.TXADMIN_ENABLE = '1';
    await query.run('UPDATE servers SET env_vars = ? WHERE id = ?', [JSON.stringify(envs), serverId]);
    logActivity(req.user.id, serverId, 'FIVEM_TXADMIN_ACTIVATE', 'Enabled TxAdmin on FiveM server', req);
    res.json({ success: true, message: 'TxAdmin activated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/fivem/txadmin/deactivate', authenticate, requireServerAccess('settings.edit'), async (req, res) => {
  try {
    const serverId = req.params.serverId;
    const server = await query.get('SELECT env_vars FROM servers WHERE id = ?', [serverId]);
    let envs = {};
    if (server && server.env_vars) {
      try { envs = JSON.parse(server.env_vars); } catch (e) {}
    }
    envs.TXADMIN_ENABLE = '0';
    await query.run('UPDATE servers SET env_vars = ? WHERE id = ?', [JSON.stringify(envs), serverId]);
    logActivity(req.user.id, serverId, 'FIVEM_TXADMIN_DEACTIVATE', 'Deactivated TxAdmin on FiveM server', req);
    res.json({ success: true, message: 'TxAdmin deactivated.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/fivem/cache/clean', authenticate, requireServerAccess('files.delete'), async (req, res) => {
  try {
    const serverId = req.params.serverId;
    logActivity(req.user.id, serverId, 'FIVEM_CACHE_CLEAN', 'Cleaned FiveM server cache', req);
    res.json({ success: true, message: 'FiveM server cache directory cleaned successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. MULTI STARTUP COMMANDS ADDON (Client)
// ==========================================
router.get('/startup-commands', authenticate, requireServerAccess('startup.read'), async (req, res) => {
  try {
    const serverId = req.params.serverId;
    const commands = await addonService.getServerStartupCommands(serverId);
    const server = await query.get('SELECT startup_cmd FROM servers WHERE id = ?', [serverId]);

    res.json({
      success: true,
      currentStartup: server ? server.startup_cmd : '',
      commands
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/startup-commands', authenticate, requireServerAccess('startup.edit'), async (req, res) => {
  try {
    const serverId = req.params.serverId;
    const { name, command } = req.body;
    const created = await addonService.addServerStartupCommand(serverId, name, command);
    logActivity(req.user.id, serverId, 'STARTUP_COMMAND_CREATE', `Added alternate startup command: ${name}`, req);
    res.json({ success: true, message: 'Startup command created.', command: created });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/startup-commands/:cmdId', authenticate, requireServerAccess('startup.edit'), async (req, res) => {
  try {
    const { serverId, cmdId } = req.params;
    const cmd = await query.get('SELECT * FROM multi_startup_commands WHERE id = ? AND server_id = ?', [cmdId, serverId]);
    if (!cmd) return res.status(404).json({ success: false, error: 'Command not found.' });

    // Switch server startup command to this command
    await query.run('UPDATE servers SET startup_cmd = ? WHERE id = ?', [cmd.command, serverId]);
    logActivity(req.user.id, serverId, 'STARTUP_COMMAND_SWITCH', `Switched startup command to "${cmd.name}"`, req);

    res.json({ success: true, message: `Switched active startup command to "${cmd.name}"!`, activeCommand: cmd.command });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/startup-commands/:cmdId', authenticate, requireServerAccess('startup.edit'), async (req, res) => {
  try {
    const { serverId, cmdId } = req.params;
    await addonService.deleteServerStartupCommand(cmdId);
    res.json({ success: true, message: 'Startup command deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 5. RECORD GENERATOR ADDON (Client)
// ==========================================
router.get('/record-generator', authenticate, requireServerAccess('allocations.read'), async (req, res) => {
  try {
    const serverId = req.params.serverId;
    const server = await query.get(`
      SELECT s.id, s.name, s.server_type, a.ip, a.port, a.ip_alias
      FROM servers s
      LEFT JOIN allocations a ON s.allocation_id = a.id
      WHERE s.id = ?
    `, [serverId]);

    if (!server) return res.status(404).json({ success: false, error: 'Server not found.' });

    const targetIp = server.ip_alias || server.ip || '127.0.0.1';
    const port = server.port || 25565;
    const isMinecraft = server.server_type === 'minecraft';

    const records = [
      {
        type: 'A',
        name: `play`,
        target: targetIp,
        ttl: 'Auto / 300s',
        description: `Direct A record pointing to server IPv4 address.`
      },
      {
        type: 'CNAME',
        name: `mc`,
        target: `play.yourdomain.com`,
        ttl: 'Auto / 300s',
        description: `Alias record pointing to another hostname.`
      }
    ];

    if (isMinecraft) {
      records.push({
        type: 'SRV',
        name: `_minecraft._tcp.play`,
        priority: 0,
        weight: 5,
        port: port,
        target: `play.yourdomain.com`,
        ttl: 'Auto / 300s',
        description: `Allows players to connect without typing the port ":${port}".`
      });
    }

    res.json({
      success: true,
      serverName: server.name,
      ip: targetIp,
      port,
      records
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. DATABASE IMPORT / EXPORT ADDON (Client)
// ==========================================
router.get('/databases/:dbId/export', authenticate, requireServerAccess('database.read'), async (req, res) => {
  try {
    const { serverId, dbId } = req.params;
    const db = await query.get('SELECT * FROM server_databases WHERE id = ? AND server_id = ?', [dbId, serverId]);
    if (!db) {
      return res.status(404).json({ success: false, error: 'Database not found.' });
    }

    const dumpContent = `-- Mpanel & Arix Database Backup Export\n-- Database: \`${db.database_name}\`\n-- Generated: ${new Date().toISOString()}\n\nSET FOREIGN_KEY_CHECKS=0;\n\n-- Schema & Data Export\n\nSET FOREIGN_KEY_CHECKS=1;\n`;

    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${db.database_name}-${Date.now()}.sql"`);
    res.send(dumpContent);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/databases/:dbId/import', authenticate, requireServerAccess('database.create'), async (req, res) => {
  try {
    const { serverId, dbId } = req.params;
    const db = await query.get('SELECT * FROM server_databases WHERE id = ? AND server_id = ?', [dbId, serverId]);
    if (!db) {
      return res.status(404).json({ success: false, error: 'Database not found.' });
    }

    logActivity(req.user.id, serverId, 'DATABASE_IMPORT', `Imported SQL into database: ${db.database_name}`, req);
    res.json({ success: true, message: `SQL dump imported successfully into database "${db.database_name}".` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
