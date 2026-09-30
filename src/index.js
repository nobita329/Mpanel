const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const config = require('./config/config');
const { initDatabase } = require('./database/db');
const { seedDatabase } = require('./database/seed');
const { setupWebSocket } = require('./websocket/consoleWs');
const scheduleService = require('./services/scheduleService');
const autoSuspensionService = require('./services/autoSuspensionService');
const sftpServer = require('./sftp/sftpServer');
const { createDaemonServer } = require('./api/daemonServer');

// Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminSettingsRoutes = require('./routes/adminSettingsRoutes');
const userRoutes = require('./routes/userRoutes');
const nodeRoutes = require('./routes/nodeRoutes');
const locationRoutes = require('./routes/locationRoutes');
const apiKeyRoutes = require('./routes/apiKeyRoutes');
const serverRoutes = require('./routes/serverRoutes');
const serverFilesRoutes = require('./routes/serverFilesRoutes');
const serverBackupRoutes = require('./routes/serverBackupRoutes');
const serverScheduleRoutes = require('./routes/serverScheduleRoutes');
const serverSubuserRoutes = require('./routes/serverSubuserRoutes');
const mcjarsRoutes = require('./routes/mcjarsRoutes');
const activityRoutes = require('./routes/activityRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const serverPlayerRoutes = require('./routes/serverPlayerRoutes');
const serverWorldRoutes = require('./routes/serverWorldRoutes');
const serverImporterRoutes = require('./routes/serverImporterRoutes');
const serverPropertiesRoutes = require('./routes/serverPropertiesRoutes');
const serverSplitterRoutes = require('./routes/serverSplitterRoutes');
const autoBackupRoutes = require('./routes/autoBackupRoutes');
const autoBackupService = require('./services/autoBackupService');
const socialLoginRoutes = require('./routes/socialLoginRoutes');
const adminUpdateRoutes = require('./routes/adminUpdateRoutes');
const developerProfileRoutes = require('./routes/developerProfileRoutes');
const adminAddonsRoutes = require('./routes/adminAddonsRoutes');
const serverAddonRoutes = require('./routes/serverAddonRoutes');


async function bootstrap() {
  console.log('🚀 Initializing Mpanel Core Engine...');

  // Initialize DB & Seed
  await initDatabase();
  await seedDatabase();
  await scheduleService.initSchedules();
  await autoBackupService.initAutoBackupCron();
  autoSuspensionService.init();

  // 1. Web UI & API App (Port 3001)
  const app = express();
  const server = http.createServer(app);

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Static Assets
  app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: 0,
    etag: false,
    setHeaders: (res) => {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }));
  app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

  // REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin/updates', adminUpdateRoutes);
  app.use('/api/admin/settings', adminSettingsRoutes);
  app.use('/api/admin/users', userRoutes);
  app.use('/api/admin/nodes', nodeRoutes);
  app.use('/api/admin/locations', locationRoutes);
  app.use('/api/admin/api-keys', apiKeyRoutes);
  app.use('/api/admin/extensions/autobackups', autoBackupRoutes);
  app.use('/api/admin/autobackups', autoBackupRoutes);
  app.use('/api/admin/addons', adminAddonsRoutes);
  app.use('/api/admin/domain', adminAddonsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/addons', serverAddonRoutes);
  app.use('/api/servers/:serverId/addons', serverAddonRoutes);
  app.use('/api/client/extensions/autobackups', autoBackupRoutes);
  app.use('/api', socialLoginRoutes);
  app.use('/api/servers', serverRoutes);
  app.use('/api/servers/:serverId/files', serverFilesRoutes);
  app.use('/api/servers/:serverId/backups', serverBackupRoutes);
  app.use('/api/servers/:serverId/schedules', serverScheduleRoutes);
  app.use('/api/servers/:serverId/subusers', serverSubuserRoutes);
  app.use('/api/servers/:serverId/players', serverPlayerRoutes);
  app.use('/api/servers/:serverId/worlds', serverWorldRoutes);
  app.use('/api/servers/:serverId/importer', serverImporterRoutes);
  app.use('/api/servers/:serverId/properties', serverPropertiesRoutes);
  app.use('/api/servers/:serverId/splitter', serverSplitterRoutes);
  app.use('/api/autobackups', autoBackupRoutes);
  app.use('/api', autoBackupRoutes);
  app.use('/api/mcjars', mcjarsRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/marketplace', marketplaceRoutes);
  app.use('/api/servers/:serverId/marketplace', marketplaceRoutes);
  app.use('/api/public', developerProfileRoutes);
  app.use('/api/developer', developerProfileRoutes);

  // Fallback to index.html for SPA routing
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/ws')) {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    }
  });

  // WebSocket Server for Console & Live Metrics
  const wss = new WebSocketServer({ server });
  setupWebSocket(wss);

  server.listen(config.PORT_WEB, '0.0.0.0', () => {
    console.log(`🌐 [Web Panel UI]    listening on http://0.0.0.0:${config.PORT_WEB}`);
  });

  // 2. Daemon API Server (Port 3003)
  const daemonApp = createDaemonServer();
  daemonApp.listen(config.PORT_API, '0.0.0.0', () => {
    console.log(`⚡ [Daemon/Panel API] listening on http://0.0.0.0:${config.PORT_API}`);
  });

  // 3. Embedded SFTP Server (Port 3004)
  sftpServer.start();

  console.log(`
╔══════════════════════════════════════════════════════╗
║               🎮 MPANEL READY TO USE                 ║
╠══════════════════════════════════════════════════════╣
║  • Web Panel UI:    http://localhost:${config.PORT_WEB}            ║
║  • Daemon/API Port: http://localhost:${config.PORT_API}            ║
║  • SFTP Port:       sftp://localhost:${config.PORT_SFTP}            ║
║                                                      ║
║  Default Admin Credentials:                          ║
║  Username: admin                                     ║
║  Password: admin                                     ║
╚══════════════════════════════════════════════════════╝
  `);
}

bootstrap().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});

