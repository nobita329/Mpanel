const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// Comprehensive Minecraft server jar software types from mcjars.app
const ALL_MC_TYPES = [
  // 1. Optimized Server Forks
  { id: 'paper', name: 'Paper', category: 'server', tag: 'Recommended', description: 'High-performance Spigot fork aimed at fixing gameplay and mechanics inconsistencies.', icon: 'zap' },
  { id: 'purpur', name: 'Purpur', category: 'server', tag: 'Popular', description: 'Drop-in replacement for Paper designed for configurability and new fun gameplay features.', icon: 'layers' },
  { id: 'pufferfish', name: 'Pufferfish', category: 'server', tag: 'High-Performance', description: 'Very high performance Paper fork designed for large servers with high player counts.', icon: 'cpu' },
  { id: 'folia', name: 'Folia', category: 'server', tag: 'Multi-Threaded', description: 'Next-generation Paper fork with regionized multi-threading support.', icon: 'grid' },
  { id: 'divinemc', name: 'DivineMC', category: 'server', tag: 'Optimized Purpur', description: 'Multi-functional fork of Purpur focusing on server flexibility and optimization.', icon: 'layers' },
  { id: 'leaves', name: 'Leaves', category: 'server', tag: 'Vanilla Parity', description: 'Minecraft game server based on Paper, aimed at repairing broken vanilla properties.', icon: 'leaf' },
  { id: 'leaf', name: 'Leaf', category: 'server', tag: 'Balanced', description: 'A Paper fork aimed to find balance between performance, vanilla and stability.', icon: 'leaf' },
  { id: 'vanilla', name: 'Vanilla', category: 'server', tag: 'Official', description: 'Official unmodified Minecraft server jar released directly by Mojang.', icon: 'compass' },
  { id: 'spigot', name: 'Spigot', category: 'server', tag: 'Standard', description: 'Classic modified Minecraft server providing plugin API and performance tweaks.', icon: 'cpu' },
  { id: 'craftbukkit', name: 'CraftBukkit', category: 'server', tag: 'Legacy', description: 'Original Bukkit implementation for Minecraft plugins.', icon: 'box' },

  // 2. Modded Platforms
  { id: 'fabric', name: 'Fabric', category: 'modded', tag: 'Fast Modding', description: 'Lightweight, modular modding toolchain for Minecraft.', icon: 'box' },
  { id: 'forge', name: 'Forge', category: 'modded', tag: 'Classic Mods', description: 'The traditional and most popular Minecraft modding platform.', icon: 'tool' },
  { id: 'neoforge', name: 'NeoForge', category: 'modded', tag: 'Next-Gen Forge', description: 'Modern community-driven fork of the Minecraft Forge mod loader.', icon: 'flame' },
  { id: 'quilt', name: 'Quilt', category: 'modded', tag: 'Modular', description: 'Community-first mod loader focused on speed, modularity, and open collaboration.', icon: 'shield' },
  { id: 'legacyfabric', name: 'Legacy Fabric', category: 'modded', tag: 'Older Versions', description: 'Fabric Project fork maintaining parity for older Minecraft versions.', icon: 'archive' },

  // 3. Hybrid (Plugins + Mods)
  { id: 'mohist', name: 'Mohist', category: 'hybrid', tag: 'Forge + Plugins', description: 'Hybrid server software supporting Forge mods and Bukkit/Spigot/Paper plugins.', icon: 'git-merge' },
  { id: 'arclight', name: 'Arclight', category: 'hybrid', tag: 'Forge/Fabric + Spigot', description: 'High-performance Bukkit server implementation on top of Forge and Fabric.', icon: 'shuffle' },
  { id: 'magma', name: 'Magma', category: 'hybrid', tag: 'Forge + Spigot', description: 'Powerful hybrid server supporting Spigot plugins and Forge mods seamlessly.', icon: 'database' },
  { id: 'youer', name: 'Youer', category: 'hybrid', tag: 'NeoForge + Spigot', description: 'NeoForge variation that allows loading Spigot plugins next to mods.', icon: 'cpu' },

  // 4. Proxies
  { id: 'velocity', name: 'Velocity', category: 'proxy', tag: 'Next-Gen Proxy', description: 'Modern, ultra-fast, and secure Minecraft proxy server powered by PaperMC.', icon: 'shuffle' },
  { id: 'bungeecord', name: 'BungeeCord', category: 'proxy', tag: 'Classic Proxy', description: 'The original Minecraft proxy software for linking multiple servers together.', icon: 'git-branch' },
  { id: 'waterfall', name: 'Waterfall', category: 'proxy', tag: 'Paper Proxy', description: 'PaperMC upgraded fork of BungeeCord with improved protocol support and latency.', icon: 'wind' }
];

const FALLBACK_VERSIONS = {
  paper: ['1.21.4', '1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.8.8'],
  purpur: ['1.21.4', '1.21.1', '1.20.4', '1.19.4', '1.18.2', '1.16.5'],
  fabric: ['1.21.4', '1.21.1', '1.20.4', '1.19.4', '1.18.2', '1.16.5'],
  forge: ['1.21.1', '1.20.1', '1.19.2', '1.18.2', '1.16.5', '1.12.2', '1.7.10'],
  vanilla: ['1.21.4', '1.21.1', '1.20.4', '1.19.4', '1.18.2', '1.16.5', '1.12.2'],
  spigot: ['1.21.4', '1.21.1', '1.20.4', '1.19.4', '1.18.2', '1.16.5', '1.12.2'],
  velocity: ['3.3.0', '3.2.0'],
  bungeecord: ['latest', '1.21', '1.20']
};

class McJarsService {
  /**
   * Get all supported Minecraft server jar types
   */
  async getTypes() {
    return ALL_MC_TYPES;
  }

  /**
   * Recommend appropriate Pterodactyl/Yolks Java Docker image based on Minecraft version
   */
  getRecommendedJavaImage(version) {
    if (!version || typeof version !== 'string') return 'ghcr.io/pterodactyl/yolks:java_21';
    const match = version.match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
    if (!match) return 'ghcr.io/pterodactyl/yolks:java_21';

    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = parseInt(match[3] || '0', 10);

    if (major === 1) {
      if (minor >= 21) {
        return 'ghcr.io/pterodactyl/yolks:java_21';
      } else if (minor === 20 && patch >= 5) {
        return 'ghcr.io/pterodactyl/yolks:java_21';
      } else if (minor >= 18) {
        return 'ghcr.io/pterodactyl/yolks:java_17';
      } else if (minor === 17) {
        return 'ghcr.io/pterodactyl/yolks:java_17';
      } else {
        return 'ghcr.io/pterodactyl/yolks:java_8';
      }
    } else if (major >= 26) {
      return 'ghcr.io/pterodactyl/yolks:java_26';
    } else if (major >= 25) {
      return 'ghcr.io/pterodactyl/yolks:java_25';
    }
    return 'ghcr.io/pterodactyl/yolks:java_21';
  }

  /**
   * Get all versions for a jar type from mcjars.app API
   */
  async getVersions(typeId) {
    const typeUpper = typeId.toUpperCase();
    try {
      const res = await axios.get(`https://mcjars.app/api/v2/builds/${typeUpper}`, { timeout: 4500 });
      if (res.data && res.data.builds) {
        const versionKeys = Object.keys(res.data.builds);
        // Filter and clean versions (sort latest first)
        const cleanVersions = versionKeys.filter(v => !v.includes('snapshot') && !v.includes('pre') && !v.includes('rc'));
        const list = cleanVersions.length > 0 ? cleanVersions : versionKeys;

        // Semver sort descending
        const parseVer = v => {
          const m = v.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
          return m ? [parseInt(m[1]||0), parseInt(m[2]||0), parseInt(m[3]||0)] : [0,0,0];
        };
        const sorted = [...list].sort((a, b) => {
          const pa = parseVer(a), pb = parseVer(b);
          if (pa[0] !== pb[0]) return pb[0] - pa[0];
          if (pa[1] !== pb[1]) return pb[1] - pa[1];
          if (pa[2] !== pb[2]) return pb[2] - pa[2];
          return b.localeCompare(a);
        });

        return sorted.map(v => ({
          version: v,
          builds: ['latest'],
          recommendedJava: this.getRecommendedJavaImage(v)
        }));
      }
    } catch (e) {
      // Fallback
    }

    const versions = FALLBACK_VERSIONS[typeId.toLowerCase()] || ['1.21.4', '1.20.4', '1.19.4', '1.18.2', '1.16.5', '1.12.2'];
    return versions.map(v => ({
      version: v,
      builds: ['latest'],
      recommendedJava: this.getRecommendedJavaImage(v)
    }));
  }

  /**
   * Get jar download URL using mcjars.app official API with direct fallbacks
   */
  async getDownloadUrl(typeId, version = '1.21.4', build = 'latest') {
    const norm = typeId.toLowerCase();
    const typeUpper = typeId.toUpperCase();

    // 1. Query mcjars.app builds API for the specific version
    try {
      const res = await axios.get(`https://mcjars.app/api/v2/builds/${typeUpper}/${encodeURIComponent(version)}`, { timeout: 4500 });
      if (res.data && res.data.builds && Array.isArray(res.data.builds) && res.data.builds.length > 0) {
        // Sort by buildNumber descending
        const sortedBuilds = [...res.data.builds].sort((a, b) => (b.buildNumber || 0) - (a.buildNumber || 0));
        const chosenBuild = (build === 'latest' || !build) ? sortedBuilds[0] : (sortedBuilds.find(b => `${b.buildNumber}` === `${build}`) || sortedBuilds[0]);
        if (chosenBuild && chosenBuild.jarUrl) {
          return chosenBuild.jarUrl;
        }
      }
    } catch (e) {}

    // 2. Query mcjars.app type overall builds API
    try {
      const res = await axios.get(`https://mcjars.app/api/v2/builds/${typeUpper}`, { timeout: 4500 });
      if (res.data && res.data.builds && res.data.builds[version]) {
        const verObj = res.data.builds[version];
        if (verObj.latest && verObj.latest.jarUrl) {
          return verObj.latest.jarUrl;
        }
      }
    } catch (e) {}

    // 3. Direct provider fallbacks:
    if (norm === 'purpur') {
      return `https://api.purpurmc.org/v2/purpur/${version}/latest/download`;
    }

    if (norm === 'fabric') {
      return `https://meta.fabricmc.net/v2/versions/loader/${version}/0.16.9/1.0.1/server/jar`;
    }

    if (norm === 'quilt') {
      return `https://meta.quiltmc.org/v3/versions/loader/${version}/0.26.1/server/jar`;
    }

    if (norm === 'bungeecord') {
      return 'https://ci.md-5.net/job/BungeeCord/lastSuccessfulBuild/artifact/bootstrap/target/BungeeCord.jar';
    }

    // Default high-speed Paper 1.21.4 direct mirror object
    return 'https://fill-data.papermc.io/v1/objects/05209ac5a423bf98136dd775a87d4324955d2c865f887b20edd6b43a59cb36c4/paper-1.21.4-1.jar';
  }

  /**
   * Download and install the jar safely into the server directory
   */
  async installJarToServer(serverId, typeId = 'paper', version = '1.21.4', build = 'latest') {
    const serverDir = path.join(config.SERVERS_DIR, `server${serverId}`);
    if (!fs.existsSync(serverDir)) {
      fs.mkdirSync(serverDir, { recursive: true });
    }

    const downloadUrl = await this.getDownloadUrl(typeId, version, build);
    const targetJarPath = path.join(serverDir, 'server.jar');
    const tempJarPath = path.join(serverDir, 'server.jar.tmp');

    console.log(`[MCJars] Downloading ${typeId} (${version}) from ${downloadUrl} to ${targetJarPath}...`);

    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mpanel-Server-Manager/1.0'
      }
    });

    const writer = fs.createWriteStream(tempJarPath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Verify temp file exists and has size > 100KB
    const stats = fs.statSync(tempJarPath);
    if (stats.size < 100000) {
      throw new Error(`Downloaded jar file appears to be invalid or incomplete (${stats.size} bytes).`);
    }

    // Atomic move temp jar to server.jar
    if (fs.existsSync(targetJarPath)) {
      try { fs.unlinkSync(targetJarPath); } catch (e) {}
    }
    fs.renameSync(tempJarPath, targetJarPath);

    // Automatically configure eula.txt and server.properties with the server's allocated port
    let targetPort = 25565;
    try {
      const { query } = require('../database/db');
      const sRow = await query.get(
        'SELECT a.port FROM servers s LEFT JOIN allocations a ON s.allocation_id = a.id WHERE s.id = ?',
        [serverId]
      );
      if (sRow && sRow.port) {
        targetPort = sRow.port;
      }
    } catch (e) {}

    const runnerService = require('./runnerService');
    runnerService.syncMinecraftProperties(serverDir, targetPort);

    console.log(`[MCJars] Successfully installed ${typeId} ${version} (${(stats.size / (1024*1024)).toFixed(2)} MB) to server ${serverId}`);
    return { success: true, jarPath: targetJarPath, type: typeId, version, size: stats.size, downloadUrl };
  }
}

module.exports = new McJarsService();
