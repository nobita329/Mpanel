const express = require('express');
const router = express.Router();
const os = require('os');
const fs = require('fs');
const { query, pool } = require('../database/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const runnerService = require('../services/runnerService');
const dockerService = require('../services/dockerService');
const { logActivity } = require('../services/activityService');
const path = require('path');
const config = require('../config/config');
const updateService = require('../services/updateService');
const autoSuspensionService = require('../services/autoSuspensionService');

let lastNet = { rx: 0, tx: 0, time: Date.now() };

function getNetworkBytes() {
  try {
    const data = fs.readFileSync('/proc/net/dev', 'utf8');
    const lines = data.split('\n');
    let rx = 0, tx = 0;
    for (const line of lines) {
      if (line.includes(':') && !line.includes('lo:')) {
        const parts = line.split(':')[1].trim().split(/\s+/);
        rx += parseInt(parts[0], 10) || 0;
        tx += parseInt(parts[8], 10) || 0;
      }
    }
    return { rx, tx };
  } catch (e) {
    return { rx: 0, tx: 0 };
  }
}

// Global System Overview with Live Health and Telemetry
router.get('/overview', authenticate, requireAdmin, async (req, res) => {
  try {
    // 1. Host OS / System Metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = Math.max(0, totalMem - freeMem);
    const memPercent = Math.min(100, Math.max(1, Math.round((usedMem / totalMem) * 100)));

    const cpus = os.cpus() || [];
    let totalTick = 0;
    let idleTick = 0;
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      idleTick += cpu.times.idle;
    });
    const rawCpu = totalTick > 0 ? Math.round((1 - idleTick / totalTick) * 100) : 5;
    const cpuPercent = Math.min(100, Math.max(0, rawCpu));
    const loadAvg = os.loadavg();

    let diskTotalBytes = 100 * 1024 * 1024 * 1024;
    let diskUsedBytes = 25 * 1024 * 1024 * 1024;
    let diskPercent = 25;
    try {
      const stat = fs.statfsSync(config.DATA_DIR || '/');
      diskTotalBytes = stat.blocks * stat.bsize;
      const diskFreeBytes = stat.bfree * stat.bsize;
      diskUsedBytes = Math.max(0, diskTotalBytes - diskFreeBytes);
      diskPercent = Math.min(100, Math.max(1, Math.round((diskUsedBytes / diskTotalBytes) * 100)));
    } catch (e) {
      // Fallback
    }

    // Network delta
    const bytes = getNetworkBytes();
    const now = Date.now();
    const timeDelta = Math.max(0.5, (now - lastNet.time) / 1000);
    const rxDelta = Math.max(0, (bytes.rx - lastNet.rx) / timeDelta);
    const txDelta = Math.max(0, (bytes.tx - lastNet.tx) / timeDelta);
    lastNet = { rx: bytes.rx, tx: bytes.tx, time: now };

    // 2. MariaDB Health Check & Version
    let mariaDbStatus = 'connected';
    let mariaDbVersion = 'Unknown';
    let mariaDbLatencyMs = 0;
    let mariaDbThreads = 1;
    try {
      const startPing = Date.now();
      const [verRows] = await pool.query('SELECT VERSION() as v');
      mariaDbLatencyMs = Date.now() - startPing;
      if (verRows && verRows[0]) mariaDbVersion = verRows[0].v;
      const [threadRows] = await pool.query("SHOW STATUS LIKE 'Threads_connected'");
      if (threadRows && threadRows[0]) mariaDbThreads = parseInt(threadRows[0].Value, 10) || 1;
    } catch (dbErr) {
      mariaDbStatus = 'error: ' + dbErr.message;
    }

    // 3. Docker Health Check
    let dockerHealth = {
      available: dockerService.isAvailable,
      containers_total: 0,
      containers_running: 0,
      containers_stopped: 0,
      images_count: 0
    };
    if (dockerService.isAvailable && dockerService.docker) {
      try {
        const containers = await dockerService.docker.listContainers({ all: true });
        dockerHealth.containers_total = containers.length;
        dockerHealth.containers_running = containers.filter(c => c.State === 'running').length;
        dockerHealth.containers_stopped = dockerHealth.containers_total - dockerHealth.containers_running;
        const images = await dockerService.docker.listImages();
        dockerHealth.images_count = images.length;
      } catch (dockErr) {
        dockerHealth.error = dockErr.message;
      }
    }

    // 4. Panel & Database Counts
    const [
      servers,
      userCount,
      adminCount,
      allocationsTotal,
      allocationsAssigned,
      backupsTotal,
      databasesTotal,
      nodesTotal
    ] = await Promise.all([
      query.all('SELECT id, is_suspended, status FROM servers'),
      query.get('SELECT COUNT(id) as c FROM users WHERE suspended = 0'),
      query.get("SELECT COUNT(id) as c FROM users WHERE role = 'admin'"),
      query.get('SELECT COUNT(id) as c FROM allocations'),
      query.get('SELECT COUNT(id) as c FROM allocations WHERE assigned = 1'),
      query.get('SELECT COUNT(id) as c, COALESCE(SUM(file_size), 0) as total_size FROM backups'),
      query.get('SELECT COUNT(id) as c FROM server_databases'),
      query.get('SELECT COUNT(id) as c FROM nodes')
    ]);

    let runningServers = 0;
    let startingServers = 0;
    let offlineServers = 0;
    let suspendedServers = 0;

    for (const s of servers) {
      if (s.is_suspended) {
        suspendedServers++;
      } else if (runnerService.isServerRunning(s.id)) {
        if (s.status === 'starting') startingServers++;
        else runningServers++;
      } else {
        offlineServers++;
      }
    }

    let updateInfo = null;
    let gitInfo = { isGit: false, branch: 'main', commit: 'none' };
    try {
      gitInfo = await updateService.getGitInfo();
      updateInfo = await updateService.checkUpdates(false);
    } catch (e) {
      // Ignore background check failure
    }

    res.json({
      success: true,
      timestamp: Date.now(),
      system: {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime_seconds: Math.floor(os.uptime()),
        node_version: process.version,
        process_uptime_seconds: Math.floor(process.uptime()),
        panel_version: updateService.getCurrentVersion(),
        panel_branch: gitInfo.branch,
        panel_commit: gitInfo.commit,
        update_info: updateInfo,
        memory: {
          total_bytes: totalMem,
          used_bytes: usedMem,
          free_bytes: freeMem,
          percent: memPercent
        },
        cpu: {
          cores: cpus.length,
          model: cpus[0] ? cpus[0].model : 'CPU',
          percent: cpuPercent,
          load_avg: loadAvg
        },
        disk: {
          total_bytes: diskTotalBytes,
          used_bytes: diskUsedBytes,
          percent: diskPercent
        },
        network: {
          rx_bytes_sec: rxDelta,
          tx_bytes_sec: txDelta,
          total_rx: bytes.rx,
          total_tx: bytes.tx
        }
      },
      mariadb: {
        status: mariaDbStatus,
        version: mariaDbVersion,
        latency_ms: mariaDbLatencyMs,
        threads_connected: mariaDbThreads,
        host: config.DB_HOST,
        port: config.DB_PORT,
        database: config.DB_NAME
      },
      docker: dockerHealth,
      metrics: {
        servers: {
          total: servers.length,
          running: runningServers,
          starting: startingServers,
          offline: offlineServers,
          suspended: suspendedServers
        },
        users: {
          total: userCount ? userCount.c : 0,
          admins: adminCount ? adminCount.c : 0
        },
        allocations: {
          total: allocationsTotal ? allocationsTotal.c : 0,
          assigned: allocationsAssigned ? allocationsAssigned.c : 0,
          free: (allocationsTotal ? allocationsTotal.c : 0) - (allocationsAssigned ? allocationsAssigned.c : 0)
        },
        backups: {
          total: backupsTotal ? backupsTotal.c : 0,
          total_bytes: backupsTotal ? backupsTotal.total_size : 0
        },
        databases: {
          total: databasesTotal ? databasesTotal.c : 0
        },
        nodes: {
          total: nodesTotal ? nodesTotal.c : 0
        }
      }
    });
  } catch (err) {
    console.error('Admin overview telemetry error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate overview metrics: ' + err.message });
  }
});

// ==========================================
// ADMIN DATABASES MANAGEMENT
// ==========================================

// List all database hosts and created databases
router.get('/databases', authenticate, requireAdmin, async (req, res) => {
  try {
    const hosts = await query.all(`
      SELECT h.*, COUNT(d.id) as database_count, n.name as node_name
      FROM database_hosts h
      LEFT JOIN server_databases d ON h.id = d.database_host_id
      LEFT JOIN nodes n ON h.node_id = n.id
      GROUP BY h.id
      ORDER BY h.id ASC
    `);

    const databases = await query.all(`
      SELECT d.*, s.name as server_name, s.uuid as server_uuid, h.name as host_name, h.host as host_address, h.port as host_port
      FROM server_databases d
      LEFT JOIN servers s ON d.server_id = s.id
      LEFT JOIN database_hosts h ON d.database_host_id = h.id
      ORDER BY d.id DESC
    `);

    res.json({ success: true, hosts, databases });
  } catch (err) {
    console.error('Admin databases error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add new database host
router.post('/databases/hosts', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, host, port, username, password, node_id } = req.body;
    if (!name || !host || !username) {
      return res.status(400).json({ success: false, error: 'Name, Host, and Username are required.' });
    }

    const hostPort = parseInt(port || 3306, 10);
    const resRun = await query.run(`
      INSERT INTO database_hosts (name, host, port, username, password, node_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, host, hostPort, username, password || '', node_id || 1]);

    logActivity(req.user.id, null, 'DATABASE_HOST_CREATE', `Added database host ${name} (${host}:${hostPort})`, req);

    res.json({ success: true, hostId: resRun.lastID, message: 'Database host added successfully.' });
  } catch (err) {
    console.error('Add database host error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete database host
router.delete('/databases/hosts/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const hostId = req.params.id;
    const dbCount = await query.get('SELECT COUNT(id) as c FROM server_databases WHERE database_host_id = ?', [hostId]);
    if (dbCount && dbCount.c > 0) {
      return res.status(400).json({ success: false, error: `Cannot delete host: ${dbCount.c} active server database(s) are bound to it.` });
    }

    await query.run('DELETE FROM database_hosts WHERE id = ?', [hostId]);
    logActivity(req.user.id, null, 'DATABASE_HOST_DELETE', `Deleted database host ID ${hostId}`, req);

    res.json({ success: true, message: 'Database host deleted.' });
  } catch (err) {
    console.error('Delete database host error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ADMIN BACKUPS MANAGEMENT
// ==========================================

// List all server backups across entire panel
router.get('/backups', authenticate, requireAdmin, async (req, res) => {
  try {
    const backups = await query.all(`
      SELECT b.*, s.name as server_name, s.uuid as server_uuid, u.username as owner_username
      FROM backups b
      LEFT JOIN servers s ON b.server_id = s.id
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY b.id DESC
    `);

    const summary = await query.get(`
      SELECT COUNT(id) as count, COALESCE(SUM(file_size), 0) as total_size FROM backups
    `);

    res.json({ success: true, backups, summary: summary || { count: 0, total_size: 0 } });
  } catch (err) {
    console.error('Admin backups error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ADMIN NETWORK ALLOCATIONS MANAGEMENT
// ==========================================

// List all network allocations across all nodes
router.get('/network', authenticate, requireAdmin, async (req, res) => {
  try {
    const allocations = await query.all(`
      SELECT a.*, n.name as node_name, n.fqdn as node_fqdn, s.name as server_name, s.uuid as server_uuid
      FROM allocations a
      LEFT JOIN nodes n ON a.node_id = n.id
      LEFT JOIN servers s ON a.server_id = s.id
      ORDER BY a.node_id ASC, a.port ASC
    `);

    const nodes = await query.all(`
      SELECT n.id, n.name, n.fqdn,
        (SELECT COUNT(id) FROM allocations WHERE node_id = n.id) as total_ports,
        (SELECT COUNT(id) FROM allocations WHERE node_id = n.id AND assigned = 1) as assigned_ports
      FROM nodes n
      ORDER BY n.id ASC
    `);

    res.json({ success: true, allocations, nodes });
  } catch (err) {
    console.error('Admin network allocations error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ADMIN SERVERS MASS ACTIONS & MANAGEMENT (servers.zip)
// ==========================================

// Bulk Suspend Servers
router.post('/servers/bulk-suspend', authenticate, requireAdmin, async (req, res) => {
  try {
    const { server_ids } = req.body;
    if (!Array.isArray(server_ids) || server_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No servers selected.' });
    }
    let count = 0;
    for (const sid of server_ids) {
      try {
        await autoSuspensionService.suspendServer(sid, 'Bulk suspension by administrator');
        count++;
      } catch (e) {
        console.warn(`Bulk suspend failed for server ${sid}:`, e.message);
      }
    }
    logActivity(req.user.id, null, 'SERVER_BULK_SUSPEND', `Suspended ${count} servers`, req);
    res.json({ success: true, count, message: `Successfully suspended ${count} server(s).` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk Unsuspend Servers
router.post('/servers/bulk-unsuspend', authenticate, requireAdmin, async (req, res) => {
  try {
    const { server_ids } = req.body;
    if (!Array.isArray(server_ids) || server_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No servers selected.' });
    }
    let count = 0;
    for (const sid of server_ids) {
      try {
        await autoSuspensionService.unsuspendServer(sid);
        count++;
      } catch (e) {
        console.warn(`Bulk unsuspend failed for server ${sid}:`, e.message);
      }
    }
    logActivity(req.user.id, null, 'SERVER_BULK_UNSUSPEND', `Unsuspended ${count} servers`, req);
    res.json({ success: true, count, message: `Successfully unsuspended ${count} server(s).` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk Delete Servers
router.post('/servers/bulk-delete', authenticate, requireAdmin, async (req, res) => {
  try {
    const { server_ids, force } = req.body;
    if (!Array.isArray(server_ids) || server_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No servers selected.' });
    }
    let count = 0;
    for (const sid of server_ids) {
      try {
        const s = await query.get('SELECT * FROM servers WHERE id = ?', [sid]);
        if (!s) continue;
        try {
          if (typeof runnerService.stopStatsMonitoring === 'function') runnerService.stopStatsMonitoring(Number(sid));
          if (runnerService.isServerRunning(sid)) await runnerService.killServer(sid);
        } catch (e) {}
        try {
          if (dockerService.isAvailable && dockerService.docker) {
            await dockerService.removeContainer(sid, s.uuid);
          }
        } catch (e) {}
        try {
          await query.run('UPDATE allocations SET server_id = NULL, assigned = 0 WHERE server_id = ? OR id = ?', [sid, s.allocation_id || 0]);
        } catch (e) {}
        const serverDir = path.join(config.SERVERS_DIR, `server${sid}`);
        if (fs.existsSync(serverDir)) {
          try { fs.rmSync(serverDir, { recursive: true, force: true }); } catch (e) {}
        }
        await query.run('DELETE FROM servers WHERE id = ?', [sid]);
        count++;
      } catch (e) {
        console.warn(`Bulk delete failed for server ${sid}:`, e.message);
      }
    }
    logActivity(req.user.id, null, 'SERVER_BULK_DELETE', `Deleted ${count} servers${force ? ' (force)' : ''}`, req);
    res.json({ success: true, count, message: `Successfully deleted ${count} server(s).` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk Transfer Servers to a Destination Node
router.post('/servers/bulk-transfer', authenticate, requireAdmin, async (req, res) => {
  try {
    const { server_ids, node_id, include_backups } = req.body;
    if (!Array.isArray(server_ids) || server_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No servers selected.' });
    }
    if (!node_id) {
      return res.status(400).json({ success: false, error: 'Destination node is required.' });
    }
    const targetNode = await query.get('SELECT id, name FROM nodes WHERE id = ?', [node_id]);
    if (!targetNode) {
      return res.status(404).json({ success: false, error: 'Destination node not found.' });
    }
    let count = 0;
    for (const sid of server_ids) {
      try {
        await query.run('UPDATE servers SET node_id = ? WHERE id = ?', [node_id, sid]);
        count++;
      } catch (e) {
        console.warn(`Bulk transfer failed for server ${sid}:`, e.message);
      }
    }
    logActivity(req.user.id, null, 'SERVER_BULK_TRANSFER', `Transferred ${count} servers to node ${targetNode.name}`, req);
    res.json({ success: true, count, message: `Successfully transferred ${count} server(s) to ${targetNode.name}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Toggle Install Status (Admin)
router.post('/servers/:id/toggle-install', authenticate, requireAdmin, async (req, res) => {
  try {
    const serverId = req.params.id;
    const server = await query.get('SELECT id, name, status FROM servers WHERE id = ?', [serverId]);
    if (!server) return res.status(404).json({ success: false, error: 'Server not found.' });

    const newStatus = server.status === 'installing' ? 'offline' : 'installing';
    await query.run('UPDATE servers SET status = ? WHERE id = ?', [newStatus, serverId]);
    logActivity(req.user.id, serverId, 'SERVER_TOGGLE_INSTALL', `Toggled install status to ${newStatus}`, req);

    res.json({ success: true, status: newStatus, message: `Server install status set to ${newStatus}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single Server Transfer (Admin)
router.post('/servers/:id/transfer', authenticate, requireAdmin, async (req, res) => {
  try {
    const serverId = req.params.id;
    const { node_id, include_backups } = req.body;
    if (!node_id) return res.status(400).json({ success: false, error: 'Target node is required.' });

    const node = await query.get('SELECT id, name FROM nodes WHERE id = ?', [node_id]);
    if (!node) return res.status(404).json({ success: false, error: 'Target node not found.' });

    await query.run('UPDATE servers SET node_id = ? WHERE id = ?', [node_id, serverId]);
    logActivity(req.user.id, serverId, 'SERVER_TRANSFER', `Transferred server to ${node.name}`, req);

    res.json({ success: true, message: `Server successfully transferred to ${node.name}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

