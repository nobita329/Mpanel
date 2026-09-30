module.exports = {
  apps: [
    {
      name: 'mpanel',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PANEL_NAME: 'Mpanel',
        PORT_WEB: 3001,
        PORT_API: 3003,
        PORT_SFTP: 3004,
        DB_HOST: '127.0.0.1',
        DB_PORT: 3002,
        DB_USER: 'panel',
        DB_PASSWORD: 'PanelPass123!',
        DB_NAME: 'panel',
        SERVER_DB_HOST: '127.0.0.1',
        SERVER_DB_PORT: 3005,
        SERVER_DB_USER: 'root',
        SERVER_DB_PASSWORD: 'YourStrongPassword',
        CURSEFORGE_API_KEY: '$2a$10$2LouREiMl.mx0kVBK.RlK.nloje4XS3oF8uSw809VZr07O.0A5cLq',
        CURSEFORGE_BASE_URL: 'https://api.curseforge.com/v1',
        VM_KVM_MODE: 'auto'
      }
    }
  ]
};
