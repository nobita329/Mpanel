const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { query } = require('../database/db');
const imagesConfig = require('../config/images');

// Default Arix Addon Pack v2.0.2 Definitions & Configurations
const DEFAULT_ADDONS = {
  minecraftModpackInstaller: { enabled: true, eggs: [], nests: [1] },
  minecraftPluginInstaller: { enabled: true, eggs: [], nests: [1] },
  versionChanger: { enabled: true, eggs: [], nests: [1] },
  iconChanger: { enabled: true, eggs: [], nests: [1] },
  minecraftModInstaller: { enabled: true, eggs: [], nests: [1] },
  minecraftWorldInstaller: { enabled: true, eggs: [], nests: [1] },
  hytaleModsInstaller: { enabled: false, eggs: [], nests: [] },
  subdomainManager: { enabled: true, eggs: [], nests: [] },
  ratelimit: { enabled: true, multiplier: 1 },
  propertiesEditor: { enabled: true, eggs: [], nests: [1] },
  variableManager: { enabled: true, eggs: [], nests: [] },
  startupChanger: { enabled: false, eggs: [], nests: [] },
  eggChanger: { enabled: false, eggs: [], nests: [], forceStartup: false, restriction: 'none', eggMap: {} },
  eggImporter: { enabled: true },
  autoSuspend: { enabled: false },
  fivemUtils: { enabled: false, txAdminLogin: true, txAdminSetup: true, cacheDelete: true, eggs: [], nests: [] },
  fivemArtifactChanger: { enabled: false, eggs: [], nests: [] },
  databaseImportExport: { enabled: false, eggs: [], nests: [] },
  recordGenerator: { enabled: true }
};

const ADDON_META = [
  {
    key: 'minecraftModpackInstaller',
    name: 'Modpack Installer',
    game: 'Minecraft',
    category: 'minecraft',
    icon: 'package',
    description: 'Easily install modpacks on servers with a single click (CurseForge, Modrinth, FTB).',
    beta: true
  },
  {
    key: 'minecraftPluginInstaller',
    name: 'Plugin Installer',
    game: 'Minecraft',
    category: 'minecraft',
    icon: 'puzzle',
    description: 'Easily install plugins on servers with a single click (SpigotMC, PaperMC, Bukkit).'
  },
  {
    key: 'versionChanger',
    name: 'Version Changer',
    game: 'Minecraft',
    category: 'minecraft',
    icon: 'git-branch',
    description: 'Easily change the server software version (Paper, Purpur, Fabric, Forge, NeoForge, Folia, Velocity, Waterfall, Spigot, Vanilla).'
  },
  {
    key: 'iconChanger',
    name: 'Icon Changer',
    game: 'Minecraft',
    category: 'minecraft',
    icon: 'image',
    description: 'Easily change the server icon / favicon with a single click or custom upload.'
  },
  {
    key: 'minecraftModInstaller',
    name: 'Mod Installer',
    game: 'Minecraft',
    category: 'minecraft',
    icon: 'cpu',
    description: 'Easily browse and install mods on servers with dependencies handled automatically.'
  },
  {
    key: 'minecraftWorldInstaller',
    name: 'World Installer',
    game: 'Minecraft',
    category: 'minecraft',
    icon: 'globe',
    description: 'Easily install custom worlds, maps, and templates on servers with a single click.'
  },
  {
    key: 'hytaleModsInstaller',
    name: 'Mod Installer',
    game: 'Hytale',
    category: 'hytale',
    icon: 'box',
    description: 'Easily install mods on Hytale servers with a single click.',
    beta: true
  },
  {
    key: 'subdomainManager',
    name: 'Subdomain Manager',
    game: 'All Games',
    category: 'network',
    icon: 'at-sign',
    description: 'Easily create and manage subdomains for game servers with Cloudflare automated DNS & SRV records.'
  },
  {
    key: 'ratelimit',
    name: 'Ratelimit Editor',
    game: 'All Games',
    category: 'utility',
    icon: 'shield-alert',
    description: 'Easily adjust the API ratelimits to prevent abuse and ensure high panel performance.'
  },
  {
    key: 'propertiesEditor',
    name: 'Properties Editor',
    game: 'Minecraft',
    category: 'minecraft',
    icon: 'file-text',
    description: 'Easily edit the server.properties file for Minecraft servers with visual categories and raw editor.'
  },
  {
    key: 'variableManager',
    name: 'Variables Editor',
    game: 'All Games',
    category: 'utility',
    icon: 'sliders',
    description: 'Easily edit the environment variables and container runtime settings of servers.'
  },
  {
    key: 'startupChanger',
    name: 'Startup Editor',
    game: 'All Games',
    category: 'utility',
    icon: 'terminal',
    description: 'Easily edit startup parameters and select alternate startup commands for servers.'
  },
  {
    key: 'eggChanger',
    name: 'Egg Changer',
    game: 'All Games',
    category: 'utility',
    icon: 'shuffle',
    description: 'Easily switch server egg and runtime with optional reinstall and startup synchronization.',
    beta: true
  },
  {
    key: 'eggImporter',
    name: 'Egg Importer',
    game: 'All Games',
    category: 'utility',
    icon: 'download-cloud',
    description: 'Easily import eggs into the panel with a single click from official Pterodactyl GitHub repositories (Game, Application, Generic).',
    beta: true
  },
  {
    key: 'autoSuspend',
    name: 'Auto Suspend',
    game: 'All Games',
    category: 'utility',
    icon: 'clock',
    description: 'Automatically suspend servers after expiration date passes to enforce renewals.'
  },
  {
    key: 'fivemUtils',
    name: 'FiveM Utils',
    game: 'FiveM',
    category: 'fivem',
    icon: 'tool',
    description: 'Easily manage FiveM servers with TxAdmin auto-login, automated setup, and server cache cleaning.'
  },
  {
    key: 'fivemArtifactChanger',
    name: 'FiveM Artifacts Changer',
    game: 'FiveM',
    category: 'fivem',
    icon: 'layers',
    description: 'Easily change and update the FiveM FXServer artifact version for servers.'
  },
  {
    key: 'databaseImportExport',
    name: 'Database Import/Export',
    game: 'All Games',
    category: 'database',
    icon: 'database',
    description: 'Allow users to import SQL files and export full database backups directly from the web panel.'
  },
  {
    key: 'recordGenerator',
    name: 'Record Generator',
    game: 'All Games',
    category: 'network',
    icon: 'network',
    description: 'Let users generate custom DNS records (A, CNAME, SRV) for their game servers.'
  }
];

class AddonService {
  constructor() {
    this.eggRepoCache = new Map();
    this.eggRepoCacheTTL = 6 * 3600 * 1000; // 6 hours
  }

  // Get all addons settings merged with defaults
  async getAddonSettings() {
    try {
      const row = await query.get("SELECT `value` FROM settings WHERE `key` = 'arix_addons_config'");
      let custom = {};
      if (row && row.value) {
        try {
          custom = JSON.parse(row.value);
        } catch (e) {
          custom = {};
        }
      }

      const merged = {};
      for (const [key, defaultVal] of Object.entries(DEFAULT_ADDONS)) {
        merged[key] = {
          ...defaultVal,
          ...(custom[key] || {})
        };
      }

      return merged;
    } catch (err) {
      console.error('Error reading addon settings:', err.message);
      return DEFAULT_ADDONS;
    }
  }

  // Get single addon settings
  async getSingleAddon(key) {
    const all = await this.getAddonSettings();
    return all[key] || DEFAULT_ADDONS[key] || null;
  }

  // Update single addon settings
  async updateSingleAddon(key, payload) {
    if (!DEFAULT_ADDONS[key]) {
      throw new Error(`Unknown addon key: ${key}`);
    }

    const current = await this.getAddonSettings();
    current[key] = {
      ...current[key],
      ...payload
    };

    await query.run(
      'INSERT INTO settings (`key`, `value`, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = CURRENT_TIMESTAMP',
      ['arix_addons_config', JSON.stringify(current)]
    );

    return current[key];
  }

  // Reset addons to defaults
  async resetAddons() {
    await query.run(
      'INSERT INTO settings (`key`, `value`, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = CURRENT_TIMESTAMP',
      ['arix_addons_config', JSON.stringify(DEFAULT_ADDONS)]
    );
    return DEFAULT_ADDONS;
  }

  getAddonMetadata() {
    return ADDON_META;
  }

  // Cloudflare configuration for Subdomain Addon
  async getCloudflareConfig() {
    let config = await query.get('SELECT * FROM subdomains_cloudflare_config ORDER BY id DESC LIMIT 1');
    if (!config) {
      config = {
        email: '',
        api_key: '',
        proxy_records: 0,
        use_alias: 0,
        use_domain_alias: 0
      };
    }
    return config;
  }

  async saveCloudflareConfig({ email, api_key, proxy_records, use_alias, use_domain_alias }) {
    const existing = await query.get('SELECT id FROM subdomains_cloudflare_config LIMIT 1');
    if (existing) {
      await query.run(
        'UPDATE subdomains_cloudflare_config SET email = ?, api_key = ?, proxy_records = ?, use_alias = ?, use_domain_alias = ? WHERE id = ?',
        [email || '', api_key || '', proxy_records ? 1 : 0, use_alias ? 1 : 0, use_domain_alias ? 1 : 0, existing.id]
      );
    } else {
      await query.run(
        'INSERT INTO subdomains_cloudflare_config (email, api_key, proxy_records, use_alias, use_domain_alias) VALUES (?, ?, ?, ?, ?)',
        [email || '', api_key || '', proxy_records ? 1 : 0, use_alias ? 1 : 0, use_domain_alias ? 1 : 0]
      );
    }
    return this.getCloudflareConfig();
  }

  // Connected Domains
  async getConnectedDomains() {
    const domains = await query.all('SELECT * FROM subdomains_connected_domains ORDER BY domain ASC');
    for (const d of domains) {
      const cnt = await query.get('SELECT COUNT(*) as count FROM subdomains_user_subdomains WHERE domain = ?', [d.domain]);
      d.serverCount = cnt ? cnt.count : 0;
    }
    return domains;
  }

  async connectDomain(domain, zoneId) {
    if (!domain || !domain.trim()) throw new Error('Domain name is required.');
    const d = domain.trim().toLowerCase();
    await query.run(
      'INSERT INTO subdomains_connected_domains (domain, zone_id, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE zone_id = VALUES(zone_id), status = "active"',
      [d, zoneId || null, 'active']
    );
    return { success: true, domain: d };
  }

  async disconnectDomain(domain) {
    if (!domain) throw new Error('Domain name is required.');
    await query.run('DELETE FROM subdomains_user_subdomains WHERE domain = ?', [domain]);
    await query.run('DELETE FROM subdomains_connected_domains WHERE domain = ?', [domain]);
    return { success: true, domain };
  }

  // Blocklist
  async getBlocklist() {
    return query.all('SELECT * FROM subdomains_blocklist ORDER BY id DESC');
  }

  async addBlocklistEntry(subdomain, reason) {
    if (!subdomain || !subdomain.trim()) throw new Error('Subdomain string is required.');
    const sub = subdomain.trim().toLowerCase();
    await query.run(
      'INSERT INTO subdomains_blocklist (subdomain, reason) VALUES (?, ?)',
      [sub, reason || '']
    );
    return query.get('SELECT * FROM subdomains_blocklist WHERE subdomain = ?', [sub]);
  }

  async removeBlocklistEntry(id) {
    await query.run('DELETE FROM subdomains_blocklist WHERE id = ?', [id]);
    return { success: true };
  }

  // Egg Importer (Pterodactyl GitHub repositories)
  async getEggRepository(type = 'game') {
    const repos = {
      application: 'application-eggs',
      game: 'game-eggs',
      generic: 'generic-eggs'
    };

    const repoName = repos[type] || 'game-eggs';
    const now = Date.now();
    const cached = this.eggRepoCache.get(repoName);
    if (cached && (now - cached.time < this.eggRepoCacheTTL)) {
      return cached.data;
    }

    try {
      const url = `https://api.github.com/repos/pterodactyl/${repoName}/git/trees/main?recursive=1`;
      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mpanel-ArixAddonPack/2.0.2',
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 10000
      });

      const tree = res.data && res.data.tree ? res.data.tree : [];
      const eggs = tree
        .filter(item => {
          const p = item.path || '';
          return item.type === 'blob' &&
            p.endsWith('.json') &&
            path.basename(p).toLowerCase().startsWith('egg');
        })
        .map(item => {
          const filename = path.basename(item.path);
          const segments = item.path.split('/');
          segments.pop(); // remove filename
          const cleanName = filename.replace(/\.json$/, '').replace(/^egg-/, '').replace(/-/g, ' ');
          const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

          return {
            id: filename.replace(/\.json$/, ''),
            name: formattedName,
            raw_filename: filename,
            path: item.path,
            category: segments.join(' / ') || repoName,
            raw_url: `https://raw.githubusercontent.com/pterodactyl/${repoName}/main/${item.path}`,
            source_repo: repoName
          };
        });

      this.eggRepoCache.set(repoName, { time: now, data: eggs });
      return eggs;
    } catch (err) {
      console.warn(`Could not fetch GitHub egg repo for ${repoName}:`, err.message);
      // Fallback predefined eggs list so UI always works gracefully
      return this.getFallbackEggs(type);
    }
  }

  getFallbackEggs(type) {
    if (type === 'game') {
      return [
        { id: 'egg-minecraft-paper', name: 'Minecraft Paper', category: 'Minecraft / Java', raw_url: 'https://raw.githubusercontent.com/pterodactyl/game-eggs/main/minecraft/java/egg-paper.json' },
        { id: 'egg-minecraft-purpur', name: 'Minecraft Purpur', category: 'Minecraft / Java', raw_url: 'https://raw.githubusercontent.com/pterodactyl/game-eggs/main/minecraft/java/egg-purpur.json' },
        { id: 'egg-minecraft-forge', name: 'Minecraft Forge', category: 'Minecraft / Forge', raw_url: 'https://raw.githubusercontent.com/pterodactyl/game-eggs/main/minecraft/forge/egg-forge.json' },
        { id: 'egg-minecraft-fabric', name: 'Minecraft Fabric', category: 'Minecraft / Fabric', raw_url: 'https://raw.githubusercontent.com/pterodactyl/game-eggs/main/minecraft/fabric/egg-fabric.json' },
        { id: 'egg-fivem', name: 'FiveM FXServer', category: 'GTA / FiveM', raw_url: 'https://raw.githubusercontent.com/pterodactyl/game-eggs/main/gta/fivem/egg-fivem.json' },
        { id: 'egg-terraria', name: 'Terraria TShock', category: 'Terraria', raw_url: 'https://raw.githubusercontent.com/pterodactyl/game-eggs/main/terraria/egg-tshock.json' },
        { id: 'egg-palworld', name: 'Palworld Server', category: 'Palworld', raw_url: 'https://raw.githubusercontent.com/pterodactyl/game-eggs/main/palworld/egg-palworld.json' },
        { id: 'egg-rust', name: 'Rust Server', category: 'Rust', raw_url: 'https://raw.githubusercontent.com/pterodactyl/game-eggs/main/rust/egg-rust.json' },
        { id: 'egg-ark', name: 'ARK Survival Evolved', category: 'ARK', raw_url: 'https://raw.githubusercontent.com/pterodactyl/game-eggs/main/ark/egg-ark.json' }
      ];
    } else if (type === 'application') {
      return [
        { id: 'egg-nodejs', name: 'Node.js Generic Application', category: 'NodeJS', raw_url: 'https://raw.githubusercontent.com/pterodactyl/application-eggs/main/nodejs/egg-nodejs.json' },
        { id: 'egg-python', name: 'Python Generic Application', category: 'Python', raw_url: 'https://raw.githubusercontent.com/pterodactyl/application-eggs/main/python/egg-python.json' },
        { id: 'egg-lavalink', name: 'Lavalink Audio Node', category: 'Music Bots', raw_url: 'https://raw.githubusercontent.com/pterodactyl/application-eggs/main/lavalink/egg-lavalink.json' },
        { id: 'egg-discord-bot', name: 'Discord.js Bot Host', category: 'Discord', raw_url: 'https://raw.githubusercontent.com/pterodactyl/application-eggs/main/discord/egg-discordjs.json' }
      ];
    } else {
      return [
        { id: 'egg-generic-voice', name: 'TeamSpeak 3 Server', category: 'Voice', raw_url: 'https://raw.githubusercontent.com/pterodactyl/generic-eggs/main/voice/teamspeak/egg-teamspeak.json' },
        { id: 'egg-generic-redis', name: 'Redis Database', category: 'Database', raw_url: 'https://raw.githubusercontent.com/pterodactyl/generic-eggs/main/database/redis/egg-redis.json' }
      ];
    }
  }

  // Import egg directly into templates
  async importEgg({ name, raw_url, egg_json, category }) {
    let eggData = null;
    if (egg_json) {
      eggData = typeof egg_json === 'string' ? JSON.parse(egg_json) : egg_json;
    } else if (raw_url) {
      const res = await axios.get(raw_url, { timeout: 10000 });
      eggData = res.data;
    }

    if (!eggData) throw new Error('No egg data or URL provided.');

    const eggName = name || eggData.name || 'Imported Egg';
    const dockerImage = (eggData.image || eggData.docker_images?.[0] || 'ghcr.io/pterodactyl/yolks:java_17');
    const startupCmd = eggData.startup || 'bash start.sh';

    return {
      success: true,
      message: `Egg "${eggName}" imported successfully.`,
      egg: {
        name: eggName,
        dockerImage,
        startupCmd,
        author: eggData.author || 'Pterodactyl Community',
        description: eggData.description || 'Custom imported egg template'
      }
    };
  }

  // Multi Startup Commands
  async getServerStartupCommands(serverId) {
    return query.all('SELECT * FROM multi_startup_commands WHERE server_id = ? ORDER BY id ASC', [serverId]);
  }

  async addServerStartupCommand(serverId, name, command) {
    if (!name || !command) throw new Error('Command name and command string are required.');
    const r = await query.run(
      'INSERT INTO multi_startup_commands (server_id, name, command) VALUES (?, ?, ?)',
      [serverId, name, command]
    );
    const insertId = r.lastID || r.insertId;
    return await query.get('SELECT * FROM multi_startup_commands WHERE id = ?', [insertId]);
  }

  async updateServerStartupCommand(id, name, command) {
    await query.run('UPDATE multi_startup_commands SET name = ?, command = ? WHERE id = ?', [name, command, id]);
    return query.get('SELECT * FROM multi_startup_commands WHERE id = ?', [id]);
  }

  async deleteServerStartupCommand(id) {
    await query.run('DELETE FROM multi_startup_commands WHERE id = ?', [id]);
    return { success: true };
  }

  // FiveM Artifacts
  async getFivemArtifacts() {
    try {
      const res = await axios.get('https://runtime.fivem.net/artifacts/fivem/build_proot_linux/master/', { timeout: 8000 });
      const html = res.data || '';
      const regex = /href="([0-9]+-[a-f0-9]+)\/fx\.tar\.xz"/g;
      let match;
      const versions = [];
      while ((match = regex.exec(html)) !== null && versions.length < 20) {
        versions.push({
          version: match[1],
          url: `https://runtime.fivem.net/artifacts/fivem/build_proot_linux/master/${match[1]}/fx.tar.xz`,
          recommended: versions.length === 0
        });
      }
      return versions;
    } catch (e) {
      // Fallback latest popular builds
      return [
        { version: '13363-fbbd63f03b22cf3fa19b0aa2610196ce2bb71603', recommended: true },
        { version: '13304-4dfcfbc8732101140026e95267b146e279a78601', recommended: false },
        { version: '13264-585bb047f3bcfd7568c859c25bb090cb3b44b82c', recommended: false },
        { version: '13217-1f4a9b6c003d775191db311910efc3545167f671', recommended: false }
      ];
    }
  }
}

module.exports = new AddonService();
