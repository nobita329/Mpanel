const path = require('path');
require('dotenv').config();

module.exports = {
  // Ports
  PORT_WEB: parseInt(process.env.PORT_WEB || '3001', 10),
  PORT_API: parseInt(process.env.PORT_API || '3003', 10),
  PORT_SFTP: parseInt(process.env.PORT_SFTP || '3004', 10),

  // Secrets & JWT
  JWT_SECRET: process.env.JWT_SECRET || 'mpanel_super_secure_jwt_secret_key_2026_x892!',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CURSEFORGE_API_KEY: process.env.CURSEFORGE_API_KEY || '$2a$10$2LouREiMl.mx0kVBK.RlK.nloje4XS3oF8uSw809VZr07O.0A5cLq',
  CURSEFORGE_BASE_URL: process.env.CURSEFORGE_BASE_URL || 'https://api.curseforge.com/v1',

  // Storage Paths
  BASE_DIR: path.resolve(__dirname, '../../'),
  DATA_DIR: path.resolve(__dirname, '../../data'),
  SERVERS_DIR: path.resolve(__dirname, '../../mpanel/servers'),
  BACKUPS_DIR: path.resolve(__dirname, '../../mpanel/backups'),
  UPLOADS_DIR: path.resolve(__dirname, '../../public/uploads'),

  // Database Configuration (Panel DB - MariaDB)
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: parseInt(process.env.DB_PORT || '3002', 10),
  DB_USER: process.env.DB_USER || 'panel',
  DB_PASSWORD: process.env.DB_PASSWORD || 'PanelPass123!',
  DB_NAME: process.env.DB_NAME || 'panel',

  // Server Database Configuration (Game Servers DB - MySQL 8.4)
  SERVER_DB_HOST: process.env.SERVER_DB_HOST || '127.0.0.1',
  SERVER_DB_PORT: parseInt(process.env.SERVER_DB_PORT || '3005', 10),
  SERVER_DB_USER: process.env.SERVER_DB_USER || 'root',
  SERVER_DB_PASSWORD: process.env.SERVER_DB_PASSWORD || 'YourStrongPassword',
  SERVER_DB_DATABASE: process.env.SERVER_DB_DATABASE || 'mydatabase',

  // Panel Defaults
  DEFAULT_PANEL_NAME: process.env.PANEL_NAME || 'Mpanel',
  DEFAULT_THEME: {
    transparency: 18, // 0 - 100%
    blur: 16,        // 0 - 40px
    wallpaper: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=3840&q=90', // Full pitch black minimalist OLED
    wallpaperCategory: 'black-dark',
    logo: '/assets/logo.png',
    favicon: '/images/meta/Logo.png',
    themeMode: 'dark',
    musicUrl: '',
    musicTitle: 'Default Chill Synth',
    musicEnabled: false,
    musicVolume: 30
  }
};

