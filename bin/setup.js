#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const rootDir = path.resolve(__dirname, '..');

// Helper to parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    adminUser: '',
    adminPass: '',
    adminEmail: '',
    skipAdmin: false,
    resetAdmin: false,
    json: false,
    silent: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--admin-user' || arg === '-u') options.adminUser = args[++i];
    else if (arg === '--admin-pass' || arg === '-p') options.adminPass = args[++i];
    else if (arg === '--admin-email' || arg === '-e') options.adminEmail = args[++i];
    else if (arg === '--skip-admin') options.skipAdmin = true;
    else if (arg === '--reset-admin') options.resetAdmin = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--silent') options.silent = true;
  }
  return options;
}

async function main() {
  const options = parseArgs();
  const log = (...msg) => {
    if (!options.silent && !options.json) {
      console.log(...msg);
    }
  };

  log('⚡ Initializing Mpanel Automated Setup...');

  // 1. Ensure required runtime directories exist
  const dirs = [
    path.join(rootDir, 'data'),
    path.join(rootDir, 'mpanel/servers'),
    path.join(rootDir, 'mpanel/backups'),
    path.join(rootDir, 'public/uploads/branding'),
    path.join(rootDir, 'public/assets')
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`📁 Created directory: ${path.relative(rootDir, dir)}`);
    }
  }

  // 2. Setup .env configuration if not present
  const envPath = path.join(rootDir, '.env');
  let envCreated = false;
  if (!fs.existsSync(envPath)) {
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    const envContent = `# Mpanel Configuration Environment
PANEL_NAME=Mpanel
NODE_ENV=production
PORT_WEB=3001
PORT_API=3003
PORT_SFTP=3004
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=7d
CURSEFORGE_API_KEY=$2a$10$2LouREiMl.mx0kVBK.RlK.nloje4XS3oF8uSw809VZr07O.0A5cLq
CURSEFORGE_BASE_URL=https://api.curseforge.com/v1

# Database Configuration (Panel DB - MariaDB)
DB_HOST=127.0.0.1
DB_PORT=3002
DB_USER=panel
DB_PASSWORD=PanelPass123!
DB_NAME=panel

# Server Database Host Configuration (Server DB - MySQL 8.4)
SERVER_DB_HOST=127.0.0.1
SERVER_DB_PORT=3005
SERVER_DB_USER=root
SERVER_DB_PASSWORD=YourStrongPassword
SERVER_DB_DATABASE=mydatabase
`;
    fs.writeFileSync(envPath, envContent, 'utf8');
    log('🔐 Generated secure .env configuration file.');
    envCreated = true;
  }

  // 3. Initialize MariaDB database schema
  const { initDatabase, query } = require('../src/database/db');
  await initDatabase();
  log('📦 MariaDB schema initialized.');

  // 4. Seed initial data (settings, location, node, port allocations)
  const { seedDatabase } = require('../src/database/seed');
  await seedDatabase();
  log('🌱 Database seeded with default settings, node and allocations.');

  // 5. Handle Admin Credentials
  let adminDetails = null;

  if (options.adminUser && options.adminPass) {
    const username = options.adminUser.trim();
    const password = options.adminPass.trim();
    const email = options.adminEmail ? options.adminEmail.trim() : `${username}@mpanel.local`;
    const passwordHash = await bcrypt.hash(password, 10);
    const uuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

    const existing = await query.get('SELECT id, uuid FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing) {
      await query.run(
        'UPDATE users SET password_hash = ?, role = \'admin\', updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [passwordHash, existing.id]
      );
      adminDetails = { id: existing.id, username, email, password, role: 'admin', updated: true };
      log(`👑 Admin user "${username}" password updated.`);
    } else {
      const res = await query.run(
        'INSERT INTO users (uuid, username, email, password_hash, role) VALUES (?, ?, ?, ?, \'admin\')',
        [uuid, username, email, passwordHash]
      );
      adminDetails = { id: res.lastID, username, email, password, role: 'admin', created: true };
      log(`👑 Admin user "${username}" created.`);
    }
  } else if (options.resetAdmin) {
    const existingAdmin = await query.get('SELECT id, username, email FROM users WHERE role = \'admin\' ORDER BY id ASC LIMIT 1');
    if (existingAdmin) {
      const newPassword = crypto.randomBytes(6).toString('hex'); // 12-char secure password
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await query.run(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [passwordHash, existingAdmin.id]
      );
      adminDetails = { id: existingAdmin.id, username: existingAdmin.username, email: existingAdmin.email, password: newPassword, role: 'admin', reset: true };
      log(`🔑 Admin password for "${existingAdmin.username}" has been reset to: ${newPassword}`);
    }
  } else if (!options.skipAdmin) {
    const existingAdmin = await query.get('SELECT id, username, email FROM users WHERE role = \'admin\' ORDER BY id ASC LIMIT 1');
    if (existingAdmin) {
      adminDetails = { id: existingAdmin.id, username: existingAdmin.username, email: existingAdmin.email, role: 'admin' };
    }
  }

  if (options.json) {
    console.log(JSON.stringify({
      success: true,
      envCreated,
      admin: adminDetails
    }));
  } else {
    log('✅ Mpanel automated setup completed successfully!');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Mpanel setup error:', err);
  process.exit(1);
});

