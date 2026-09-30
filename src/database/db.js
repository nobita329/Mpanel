const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// Ensure runtime directories exist
if (!fs.existsSync(config.DATA_DIR)) {
  fs.mkdirSync(config.DATA_DIR, { recursive: true });
}
if (!fs.existsSync(config.SERVERS_DIR)) {
  fs.mkdirSync(config.SERVERS_DIR, { recursive: true });
}
if (!fs.existsSync(config.BACKUPS_DIR)) {
  fs.mkdirSync(config.BACKUPS_DIR, { recursive: true });
}
if (!fs.existsSync(config.UPLOADS_DIR)) {
  fs.mkdirSync(config.UPLOADS_DIR, { recursive: true });
}

// MariaDB / MySQL Connection Pool
const pool = mysql.createPool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  multipleStatements: true,
  dateStrings: true
});

function sanitizeParams(params) {
  if (!Array.isArray(params)) return [];
  return params.map(p => (p === undefined ? null : p));
}

// Promisified helper methods matching the SQLite interface
const query = {
  get: async (sql, params = []) => {
    const [rows] = await pool.query(sql, sanitizeParams(params));
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : undefined;
  },
  all: async (sql, params = []) => {
    const [rows] = await pool.query(sql, sanitizeParams(params));
    return Array.isArray(rows) ? rows : [];
  },
  run: async (sql, params = []) => {
    const [result] = await pool.query(sql, sanitizeParams(params));
    return {
      lastID: result ? result.insertId : null,
      changes: result ? result.affectedRows : 0
    };
  },
  exec: async (sql) => {
    await pool.query(sql);
  }
};

async function waitForDatabase(maxRetries = 15, delayMs = 2000) {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const conn = await pool.getConnection();
      conn.release();
      console.log(`✅ Connected to MariaDB database [${config.DB_NAME}] on ${config.DB_HOST}:${config.DB_PORT}`);
      return;
    } catch (err) {
      console.warn(`⏳ Waiting for MariaDB connection (attempt ${i}/${maxRetries}): ${err.message}`);
      if (i === maxRetries) {
        console.error('❌ Failed to connect to MariaDB database after maximum retries:', err.message);
        throw err;
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

async function initDatabase() {
  // 1. Ensure connectivity
  await waitForDatabase();

  // 2. Execute table migrations
  const schema = `
    CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(191) PRIMARY KEY,
      \`value\` LONGTEXT,
      \`type\` VARCHAR(50) DEFAULT 'string',
      \`description\` TEXT,
      \`updated_at\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(64) NOT NULL,
      username VARCHAR(100) NOT NULL,
      email VARCHAR(191) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      two_factor_secret VARCHAR(255),
      two_factor_enabled TINYINT(1) DEFAULT 0,
      suspended TINYINT(1) DEFAULT 0,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_users_uuid (uuid),
      UNIQUE KEY uq_users_username (username),
      UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS locations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      short_code VARCHAR(50) NOT NULL,
      name VARCHAR(191) NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_locations_short_code (short_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS nodes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(191) NOT NULL,
      fqdn VARCHAR(191) NOT NULL,
      daemon_port INT DEFAULT 3003,
      sftp_port INT DEFAULT 3004,
      memory_mb INT DEFAULT 8192,
      disk_mb INT DEFAULT 51200,
      location_id INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_nodes_location (location_id),
      CONSTRAINT fk_nodes_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS allocations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      node_id INT NOT NULL,
      ip VARCHAR(64) NOT NULL,
      port INT NOT NULL,
      server_id INT,
      assigned TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_allocations_node (node_id),
      CONSTRAINT fk_allocations_node FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS servers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      uuid VARCHAR(64) NOT NULL,
      name VARCHAR(191) NOT NULL,
      description TEXT,
      user_id INT NOT NULL,
      node_id INT NOT NULL,
      allocation_id INT,
      server_type VARCHAR(50) NOT NULL,
      docker_image VARCHAR(255) NOT NULL,
      startup_cmd TEXT NOT NULL,
      memory_mb INT DEFAULT 1024,
      cpu_limit INT DEFAULT 100,
      disk_mb INT DEFAULT 5120,
      status VARCHAR(50) DEFAULT 'offline',
      env_vars LONGTEXT,
      jar_type VARCHAR(50),
      jar_version VARCHAR(50),
      jar_build VARCHAR(50),
      container_id VARCHAR(128),
      expiration_date DATETIME,
      is_suspended TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_servers_uuid (uuid),
      INDEX idx_servers_user (user_id),
      INDEX idx_servers_node (node_id),
      CONSTRAINT fk_servers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_servers_node FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS subusers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      server_id INT NOT NULL,
      user_id INT NOT NULL,
      permissions LONGTEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_subusers_server_user (server_id, user_id),
      INDEX idx_subusers_server (server_id),
      INDEX idx_subusers_user (user_id),
      CONSTRAINT fk_subusers_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
      CONSTRAINT fk_subusers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS backups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      server_id INT NOT NULL,
      name VARCHAR(191) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_size BIGINT DEFAULT 0,
      path VARCHAR(500) NOT NULL,
      is_locked TINYINT(1) DEFAULT 0,
      is_automatic TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_backups_server (server_id),
      INDEX idx_backups_auto (is_automatic),
      CONSTRAINT fk_backups_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS schedules (
      id INT AUTO_INCREMENT PRIMARY KEY,
      server_id INT NOT NULL,
      name VARCHAR(191) NOT NULL,
      cron_expression VARCHAR(100) NOT NULL,
      action_type VARCHAR(50) NOT NULL,
      payload LONGTEXT,
      is_active TINYINT(1) DEFAULT 1,
      last_run_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_schedules_server (server_id),
      CONSTRAINT fk_schedules_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS api_keys (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      key_token VARCHAR(191) NOT NULL,
      description TEXT,
      permissions LONGTEXT,
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_api_keys_token (key_token),
      INDEX idx_api_keys_user (user_id),
      CONSTRAINT fk_api_keys_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      server_id INT,
      action VARCHAR(100) NOT NULL,
      details LONGTEXT,
      ip_address VARCHAR(64),
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_activity_logs_user (user_id),
      INDEX idx_activity_logs_server (server_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS database_hosts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(191) NOT NULL,
      host VARCHAR(191) NOT NULL,
      port INT NOT NULL DEFAULT 27017,
      username VARCHAR(191) NOT NULL DEFAULT 'root',
      password VARCHAR(191) NOT NULL DEFAULT 'RootPass123!',
      node_id INT DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS server_databases (
      id INT AUTO_INCREMENT PRIMARY KEY,
      server_id INT NOT NULL,
      database_host_id INT DEFAULT 1,
      database_name VARCHAR(64) NOT NULL,
      username VARCHAR(64) NOT NULL,
      password VARCHAR(128) NOT NULL,
      remote_connections VARCHAR(64) DEFAULT '%',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sdb_server (server_id),
      CONSTRAINT fk_sdb_server FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS social_providers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      enabled TINYINT(1) DEFAULT 0,
      name VARCHAR(100) NOT NULL,
      short_name VARCHAR(50) NOT NULL,
      client_id TEXT,
      client_secret TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_social_providers_short_name (short_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

    CREATE TABLE IF NOT EXISTS social_connections (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      provider_id INT NOT NULL,
      auth_id VARCHAR(255) NOT NULL,
      auth_name VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_social_connections_user (user_id),
      INDEX idx_social_connections_provider (provider_id),
      CONSTRAINT fk_social_connections_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_social_connections_provider FOREIGN KEY (provider_id) REFERENCES social_providers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  await query.exec(schema);

  // Seed default database host if none exists
  try {
    const existingHost = await query.get('SELECT id FROM database_hosts LIMIT 1');
    if (!existingHost) {
      await query.run(
        'INSERT INTO database_hosts (name, host, port, username, password, node_id) VALUES (?, ?, ?, ?, ?, ?)',
        ['Local MariaDB 11', '127.0.0.1', 27017, 'root', 'RootPass123!', 1]
      );
    }
  } catch (e) {}

  // Seed default social login settings
  try {
    const regSetting = await query.get("SELECT `key` FROM settings WHERE `key` = 'sociallogin_allow_register'");
    if (!regSetting) {
      await query.run(
        "INSERT INTO settings (`key`, `value`, `type`, `description`) VALUES ('sociallogin_allow_register', '1', 'boolean', 'Allow user registration via social OAuth providers')"
      );
    }
    const connectSetting = await query.get("SELECT `key` FROM settings WHERE `key` = 'sociallogin_allow_connecting'");
    if (!connectSetting) {
      await query.run(
        "INSERT INTO settings (`key`, `value`, `type`, `description`) VALUES ('sociallogin_allow_connecting', '1', 'boolean', 'Allow connecting social account with existing email')"
      );
    }
    const tutSetting = await query.get("SELECT `key` FROM settings WHERE `key` = 'tutorials_enabled'");
    if (!tutSetting) {
      await query.run(
        "INSERT INTO settings (`key`, `value`, `type`, `description`) VALUES ('tutorials_enabled', '1', 'boolean', 'Enable or disable the interactive Tutorials page in client portal')"
      );
    }
    const autoTutSetting = await query.get("SELECT `key` FROM settings WHERE `key` = 'tutorials_autostart_enabled'");
    if (!autoTutSetting) {
      await query.run(
        "INSERT INTO settings (`key`, `value`, `type`, `description`) VALUES ('tutorials_autostart_enabled', '0', 'boolean', 'Automatically launch the interactive auto-tutorial for new users on their first login')"
      );
    }

    // Seed default Server Splitter blueprint settings
    const splitEnabled = await query.get("SELECT `key` FROM settings WHERE `key` = 'splitter_enabled'");
    if (!splitEnabled) {
      await query.run("INSERT INTO settings (`key`, `value`, `type`, `description`) VALUES ('splitter_enabled', '1', 'boolean', 'Enable or disable the Server Splitter extension')");
    }
    const splitCpu = await query.get("SELECT `key` FROM settings WHERE `key` = 'splitter_reserved_cpu'");
    if (!splitCpu) {
      await query.run("INSERT INTO settings (`key`, `value`, `type`, `description`) VALUES ('splitter_reserved_cpu', '10', 'number', 'Reserved/Minimum CPU (%) reserved for parent server')");
    }
    const splitMem = await query.get("SELECT `key` FROM settings WHERE `key` = 'splitter_reserved_memory'");
    if (!splitMem) {
      await query.run("INSERT INTO settings (`key`, `value`, `type`, `description`) VALUES ('splitter_reserved_memory', '256', 'number', 'Reserved/Minimum Memory (MB) reserved for parent server')");
    }
    const splitDisk = await query.get("SELECT `key` FROM settings WHERE `key` = 'splitter_reserved_disk'");
    if (!splitDisk) {
      await query.run("INSERT INTO settings (`key`, `value`, `type`, `description`) VALUES ('splitter_reserved_disk', '512', 'number', 'Reserved/Minimum Disk (MB) reserved for parent server')");
    }
    const splitLimit = await query.get("SELECT `key` FROM settings WHERE `key` = 'splitter_default_limit'");
    if (!splitLimit) {
      await query.run("INSERT INTO settings (`key`, `value`, `type`, `description`) VALUES ('splitter_default_limit', '3', 'number', 'Default maximum splits allowed per server')");
    }
  } catch (e) {}

  // Server Splitter schema migrations on servers table
  try {
    await pool.query('ALTER TABLE servers ADD COLUMN parent_id INT DEFAULT NULL');
  } catch (e) {}
  try {
    await pool.query('ALTER TABLE servers ADD COLUMN splitter_limit INT DEFAULT 3');
  } catch (e) {}
  try {
    await pool.query('ALTER TABLE servers ADD COLUMN is_split TINYINT(1) DEFAULT 0');
  } catch (e) {}
  try {
    await pool.query('CREATE INDEX idx_servers_parent ON servers(parent_id)');
  } catch (e) {}

  // AutoBackups schema migration on backups table
  try {
    await pool.query('ALTER TABLE backups ADD COLUMN is_automatic TINYINT(1) DEFAULT 0');
  } catch (e) {}
  try {
    await pool.query('CREATE INDEX idx_backups_auto ON backups(is_automatic)');
  } catch (e) {}

  // Seed default AutoBackups settings
  try {
    const autoSettings = [
      { key: 'autobackups_enabled', value: '1', type: 'boolean', desc: 'Enable daily automatic backups' },
      { key: 'autobackups_run_at', value: '02:00', type: 'string', desc: 'Daily time (HH:mm) to run automatic backups' },
      { key: 'autobackups_days', value: '7', type: 'number', desc: 'Days of daily backups to store' },
      { key: 'autobackups_weeks', value: '4', type: 'number', desc: 'Weeks of weekly backups to store' },
      { key: 'autobackups_months', value: '3', type: 'number', desc: 'Months of monthly backups to store' },
      { key: 'autobackups_name', value: 'Automatic Backup [DATE]', type: 'string', desc: 'Automatic backup name format template' },
      { key: 'autobackups_excluded_nodes', value: '[]', type: 'json', desc: 'JSON array of node IDs excluded from auto backups' },
      { key: 'autobackups_last_run', value: '', type: 'string', desc: 'Timestamp of last automatic backup execution' },
      { key: 'autobackups_last_status', value: 'Idle', type: 'string', desc: 'Status summary of last automatic backup run' }
    ];

    for (const s of autoSettings) {
      const exists = await query.get('SELECT `key` FROM settings WHERE `key` = ?', [s.key]);
      if (!exists) {
        await query.run('INSERT INTO settings (`key`, `value`, `type`, `description`) VALUES (?, ?, ?, ?)', [s.key, s.value, s.type, s.desc]);
      }
    }
  } catch (e) {}

  // Custom Server Sort schema migration on users table
  try {
    await pool.query('ALTER TABLE users ADD COLUMN server_order TEXT DEFAULT NULL');
  } catch (e) {}

  // Pterodactyl-aligned user status and profile fields
  try {
    await pool.query('ALTER TABLE users ADD COLUMN name_first VARCHAR(100) DEFAULT NULL');
  } catch (e) {}
  try {
    await pool.query('ALTER TABLE users ADD COLUMN name_last VARCHAR(100) DEFAULT NULL');
  } catch (e) {}
  try {
    await pool.query('ALTER TABLE users ADD COLUMN banned TINYINT(1) DEFAULT 0');
  } catch (e) {}
  try {
    await pool.query('ALTER TABLE users ADD COLUMN suspended_until DATETIME DEFAULT NULL');
  } catch (e) {}
  try {
    await pool.query('ALTER TABLE users ADD COLUMN suspension_reason TEXT DEFAULT NULL');
  } catch (e) {}
  try {
    await pool.query('ALTER TABLE users ADD COLUMN last_login_at DATETIME DEFAULT NULL');
  } catch (e) {}
  try {
    await pool.query('ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(64) DEFAULT NULL');
  } catch (e) {}

  // Node Firewall Rules table (nftables manager)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS node_firewall_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        node_id INT NOT NULL,
        port INT NOT NULL,
        protocol VARCHAR(10) DEFAULT 'tcp',
        action VARCHAR(20) DEFAULT 'allow',
        target_ip VARCHAR(64) DEFAULT 'any',
        description VARCHAR(191),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fw_node (node_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) {}

  // Seed default Admin Settings (from settings.zip: basic & advanced)
  try {
    const adminDefaults = [
      { key: 'company_name', value: 'Mpanel', type: 'string', desc: 'Panel company/organization name' },
      { key: 'two_factor_requirement', value: '0', type: 'string', desc: 'Require 2FA: 0=Not Required, 1=Admin Only, 2=All Users' },
      { key: 'default_language', value: 'en', type: 'string', desc: 'Default UI language' },
      { key: 'admin_theme', value: 'default', type: 'string', desc: 'Admin theme: default or hyperv1' },
      { key: 'recaptcha_enabled', value: 'false', type: 'boolean', desc: 'Enable reCAPTCHA on logins' },
      { key: 'recaptcha_site_key', value: '', type: 'string', desc: 'reCAPTCHA Site Key' },
      { key: 'recaptcha_secret_key', value: '', type: 'string', desc: 'reCAPTCHA Secret Key' },
      { key: 'http_connect_timeout', value: '30', type: 'number', desc: 'HTTP connect timeout in seconds' },
      { key: 'http_request_timeout', value: '60', type: 'number', desc: 'HTTP request timeout in seconds' },
      { key: 'auto_allocation_enabled', value: 'true', type: 'boolean', desc: 'Automatic allocation creation for users' }
    ];

    for (const item of adminDefaults) {
      const exists = await query.get('SELECT `key` FROM settings WHERE `key` = ?', [item.key]);
      if (!exists) {
        await query.run('INSERT INTO settings (`key`, `value`, `type`, `description`) VALUES (?, ?, ?, ?)', [item.key, item.value, item.type, item.desc]);
      }
    }
  } catch (e) {}

  console.log('✅ MariaDB Schema initialized successfully.');
}

module.exports = {
  db: pool,
  pool,
  query,
  initDatabase
};
