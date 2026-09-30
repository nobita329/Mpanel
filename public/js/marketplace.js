// Mpanel Marketplace Module - Modrinth, CurseForge & SpigotMC Store + Properties UI & Tools
class MarketplaceController {
  constructor() {
    this.currentServerId = null;
    this.serverData = null;
    this.activeTab = 'plugin'; // 'plugin' | 'mod' | 'datapack' | 'resourcepack' | 'modpack' | 'world' | 'properties' | 'tools' | 'installed'
    this.activeProvider = 'modrinth'; // 'modrinth' | 'curseforge' | 'spigotmc'
    this.propertiesViewMode = 'visual'; // 'visual' | 'raw'
    this.currentProperties = {};
    this.propertyDefinitions = [];
    this.rawProperties = '';
    this.activePropertiesCategory = 'all'; // 'all' | 'general' | 'gameplay' | 'world' | 'performance' | 'security'
    this.propertiesSearchTerm = '';
    this.searchQuery = '';
    this.selectedLoader = '';
    this.selectedGameVersion = '';
    this.serverGameVersion = '';
    this.sortBy = 'downloads';
    this.currentPage = 0;
    this.limit = 24;
    this.totalHits = 0;
    this.debounceTimer = null;
    this.projectMap = new Map();
    this.installedAddons = [];
    
    // World Management A to Z state
    this.activeWorldSubTab = 'roster'; // 'roster' | 'curseforge' | 'modrinth' | 'curated' | 'direct'
    this.serverWorlds = [];
    this.activeWorldName = 'world';
    this.worldProperties = {};
    this.curseforgeWorldSearch = '';
    this.curseforgeWorldVersion = '';
    this.curseforgeWorldSort = 'relevancy'; // 'relevancy', 'total_downloads', 'latest_updated', 'name', 'featured'
    this.curseforgeWorldCategory = ''; // '' | 248 | 253 | 251 | 249 | 250 | 252 | 4464
    this.curseforgeWorldPage = 1; // 1-indexed page
    this.curseforgeWorldPageSize = 20; // 20 per page as in CurseForge search
    this.curseforgeWorldHits = 0;
    this.curseforgeWorldProjects = [];
    this.curseforgeWorldLoading = false;

    // Comprehensive Minecraft Versions (A to Z from 1.21 down to 1.5.2)
    this.versionGroups = [
      {
        group: 'Minecraft 1.21 (Tricky Trials)',
        versions: ['1.21.4', '1.21.3', '1.21.2', '1.21.1', '1.21']
      },
      {
        group: 'Minecraft 1.20 (Trails & Tales)',
        versions: ['1.20.6', '1.20.5', '1.20.4', '1.20.3', '1.20.2', '1.20.1', '1.20']
      },
      {
        group: 'Minecraft 1.19 (The Wild Update)',
        versions: ['1.19.4', '1.19.3', '1.19.2', '1.19.1', '1.19']
      },
      {
        group: 'Minecraft 1.18 (Caves & Cliffs Part II)',
        versions: ['1.18.2', '1.18.1', '1.18']
      },
      {
        group: 'Minecraft 1.17 (Caves & Cliffs Part I)',
        versions: ['1.17.1', '1.17']
      },
      {
        group: 'Minecraft 1.16 (Nether Update)',
        versions: ['1.16.5', '1.16.4', '1.16.3', '1.16.2', '1.16.1', '1.16']
      },
      {
        group: 'Minecraft 1.15 (Buzzy Bees)',
        versions: ['1.15.2', '1.15.1', '1.15']
      },
      {
        group: 'Minecraft 1.14 (Village & Pillage)',
        versions: ['1.14.4', '1.14.3', '1.14.2', '1.14.1', '1.14']
      },
      {
        group: 'Minecraft 1.13 (Update Aquatic)',
        versions: ['1.13.2', '1.13.1', '1.13']
      },
      {
        group: 'Minecraft 1.12 (World of Color)',
        versions: ['1.12.2', '1.12.1', '1.12']
      },
      {
        group: 'Minecraft 1.11 (Exploration Update)',
        versions: ['1.11.2', '1.11.1', '1.11']
      },
      {
        group: 'Minecraft 1.10 (Frostburn Update)',
        versions: ['1.10.2', '1.10.1', '1.10']
      },
      {
        group: 'Minecraft 1.9 (Combat Update)',
        versions: ['1.9.4', '1.9.2', '1.9']
      },
      {
        group: 'Minecraft 1.8 (Bountiful Update)',
        versions: ['1.8.9', '1.8.8', '1.8']
      },
      {
        group: 'Minecraft 1.7 (World Change)',
        versions: ['1.7.10', '1.7.9', '1.7.5', '1.7.2']
      },
      {
        group: 'Legacy & Classic (1.6 - 1.5)',
        versions: ['1.6.4', '1.6.2', '1.5.2']
      }
    ];
    this.allGameVersions = this.versionGroups.flatMap(g => g.versions);

    this.allSoftwareTypes = [
      { id: '', name: 'All Software / Loaders' },
      { id: 'paper', name: 'Paper' },
      { id: 'purpur', name: 'Purpur' },
      { id: 'spigot', name: 'Spigot' },
      { id: 'bukkit', name: 'CraftBukkit' },
      { id: 'folia', name: 'Folia' },
      { id: 'fabric', name: 'Fabric' },
      { id: 'forge', name: 'Forge' },
      { id: 'neoforge', name: 'NeoForge' },
      { id: 'quilt', name: 'Quilt' },
      { id: 'velocity', name: 'Velocity' },
      { id: 'bungeecord', name: 'BungeeCord' },
      { id: 'waterfall', name: 'Waterfall' },
      { id: 'sponge', name: 'Sponge' },
      { id: 'geyser', name: 'Geyser' },
      { id: 'vanilla', name: 'Vanilla / Datapack' }
    ];
  }

  extractSemver(str) {
    if (!str) return '';
    const match = String(str).match(/\b(1\.\d+(?:\.\d+)?)\b/);
    return match ? match[1] : String(str).trim();
  }

  renderVersionOptions(selectedValue = '') {
    let html = `<option value="" ${!selectedValue ? 'selected' : ''}>🎮 All Minecraft Versions (A to Z)</option>`;
    
    // Prominently include the auto-detected server version
    if (this.serverGameVersion) {
      html += `<option value="${this.serverGameVersion}" ${this.serverGameVersion === selectedValue ? 'selected' : ''}>🎯 Auto-Detected Server (${this.serverGameVersion})</option>`;
    }

    // Include custom version if provided and not in the standard list
    if (selectedValue && selectedValue !== this.serverGameVersion && !this.allGameVersions.includes(selectedValue)) {
      html += `<option value="${selectedValue}" selected>⚡ Custom Version (${selectedValue})</option>`;
    }

    for (const group of this.versionGroups) {
      html += `<optgroup label="── ${group.group} ──">`;
      for (const ver of group.versions) {
        html += `<option value="${ver}" ${ver === selectedValue ? 'selected' : ''}>Minecraft ${ver}</option>`;
      }
      html += `</optgroup>`;
    }
    return html;
  }

  renderVersionQuickPills(activeVer = '') {
    const current = activeVer || this.selectedGameVersion || '';
    const quickVersions = [
      { id: '', label: '🌐 All' },
      ...(this.serverGameVersion ? [{ id: this.serverGameVersion, label: `🎯 Server (${this.serverGameVersion})` }] : []),
      { id: '1.21.4', label: '1.21.4' },
      { id: '1.21.1', label: '1.21.1' },
      { id: '1.20.4', label: '1.20.4' },
      { id: '1.20.1', label: '1.20.1' },
      { id: '1.19.4', label: '1.19.4' },
      { id: '1.18.2', label: '1.18.2' },
      { id: '1.16.5', label: '1.16.5' },
      { id: '1.12.2', label: '1.12.2' },
      { id: '1.8.9', label: '1.8.9' }
    ];

    const seen = new Set();
    const unique = quickVersions.filter(q => {
      if (seen.has(q.id)) return false;
      seen.add(q.id);
      return true;
    });

    return `
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
        <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <i data-lucide="layers" class="w-3.5 h-3.5 text-cyan-400"></i> Version:
        </span>
        ${unique.map(qv => {
          const active = current === qv.id;
          const cls = active
            ? 'mc-version-pill px-2.5 py-1 rounded-xl text-xs font-bold transition shrink-0 bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
            : 'mc-version-pill px-2.5 py-1 rounded-xl text-xs font-medium transition shrink-0 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10';
          return `<button type="button" data-mc-version="${qv.id}" onclick="marketplace.setGameVersion('${qv.id}')" class="${cls}">${qv.label}</button>`;
        }).join('')}
      </div>
    `;
  }

  setGameVersion(val) {
    this.selectedGameVersion = val || '';
    this.curseforgeWorldVersion = val || '';
    this.currentPage = 0;
    this.curseforgeWorldPage = 1;

    // Synchronize all version dropdown selects in the DOM
    ['mp-version-select', 'cf-world-version-select', 'mr-world-version-select'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = this.selectedGameVersion;
    });

    // Synchronize all quick version pills in the DOM
    document.querySelectorAll('.mc-version-pill').forEach(btn => {
      const v = btn.getAttribute('data-mc-version') || '';
      const match = v === this.selectedGameVersion;
      if (match) {
        btn.className = 'mc-version-pill px-2.5 py-1 rounded-xl text-xs font-bold transition shrink-0 bg-cyan-500 text-white shadow-md shadow-cyan-500/20';
      } else {
        btn.className = 'mc-version-pill px-2.5 py-1 rounded-xl text-xs font-medium transition shrink-0 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10';
      }
    });

    // Trigger auto-refetch for the active category / subtab
    if (this.activeTab === 'world') {
      if (this.activeWorldSubTab === 'curseforge') {
        this.fetchCurseforgeWorlds();
      } else if (this.activeWorldSubTab === 'modrinth') {
        this.fetchModrinthWorlds();
      }
    } else {
      this.fetchAndRenderProjects();
    }
  }

  formatDownloads(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return `${num}`;
  }

  detectServerDefaults(server) {
    if (!server) return;
    const jarType = (server.jar_type || '').toLowerCase();
    
    // Auto-detect default category and loader
    if (['fabric', 'quilt'].includes(jarType)) {
      this.activeTab = 'mod';
      this.selectedLoader = 'fabric';
    } else if (['forge'].includes(jarType)) {
      this.activeTab = 'mod';
      this.selectedLoader = 'forge';
    } else if (['neoforge'].includes(jarType)) {
      this.activeTab = 'mod';
      this.selectedLoader = 'neoforge';
    } else if (['velocity'].includes(jarType)) {
      this.activeTab = 'plugin';
      this.selectedLoader = 'velocity';
    } else if (['bungeecord', 'waterfall'].includes(jarType)) {
      this.activeTab = 'plugin';
      this.selectedLoader = 'bungeecord';
    } else {
      // Paper, Purpur, Spigot, Vanilla, Leaf, Leaves, Folia, DivineMC
      this.activeTab = 'plugin';
      this.selectedLoader = 'paper';
    }

    const detected = this.extractSemver(server.jar_version || server.minecraft_version || server.version || '');
    if (detected) {
      this.serverGameVersion = detected;
      // Auto-set the game version filter if not explicitly overridden by user
      if (!this.selectedGameVersion) {
        this.selectedGameVersion = detected;
      }
      this.curseforgeWorldVersion = this.selectedGameVersion;
    }
  }

  // Render Marketplace Tab inside Server Management Suite
  async renderServerMarketplaceTab(container, serverId, serverData, initialCategory = null) {
    this.currentServerId = serverId;

    // Ensure serverData has complete information
    if (!serverData || !serverData.jar_version) {
      try {
        const sRes = await app.api(`/api/servers/${serverId}`);
        if (sRes?.server) {
          serverData = sRes.server;
        }
      } catch (_) {}
    }

    this.serverData = serverData;
    if (initialCategory) {
      this.activeTab = initialCategory;
    } else if (!this.activeTab) {
      this.detectServerDefaults(serverData);
    }

    const gameVersion = serverData?.jar_version || this.serverGameVersion || '';
    const jarType = serverData?.jar_type || 'Paper';

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Top Banner Header -->
        <div class="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                <i data-lucide="shopping-bag" class="w-3 h-3 inline mr-1"></i> Addon Marketplace
              </span>
              <span class="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-white/5">
                Target: <strong class="text-white">${jarType}</strong> ${gameVersion ? `(${gameVersion})` : ''}
              </span>
            </div>
            <h3 class="text-2xl font-black text-white flex items-center gap-2">
              Addon Marketplace
            </h3>
            <p class="text-xs text-slate-300">
              Browse and install 50,000+ Plugins, Mods, Datapacks, Resource Packs, and Modpacks with 1-click downloads.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="marketplace.switchCategory('installed')" class="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 shadow transition flex items-center gap-2">
              <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i> Installed Addons
              <span id="mp-installed-badge" class="bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full font-mono">0</span>
            </button>
          </div>
        </div>

        <!-- Dedicated Category Tabs ("sab alg alg") -->
        <div class="glass-panel p-2 rounded-2xl border border-white/10 flex flex-wrap gap-2">
          <button onclick="marketplace.switchCategory('plugin')" id="cat-btn-plugin" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'plugin' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="puzzle" class="w-4 h-4 text-cyan-400"></i> Plugins
          </button>
          <button onclick="marketplace.switchCategory('mod')" id="cat-btn-mod" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'mod' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="box" class="w-4 h-4 text-purple-400"></i> Mods
          </button>
          <button onclick="marketplace.switchCategory('properties')" id="cat-btn-properties" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'properties' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="sliders" class="w-4 h-4 text-blue-400"></i> Properties
          </button>
          <button onclick="marketplace.switchCategory('players')" id="cat-btn-players" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'players' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="users" class="w-4 h-4 text-emerald-400"></i> Players
          </button>
          <button onclick="marketplace.switchCategory('importer')" id="cat-btn-importer" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'importer' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="download-cloud" class="w-4 h-4 text-amber-400"></i> Importer
          </button>
          <button onclick="marketplace.switchCategory('splitter')" id="cat-btn-splitter" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'splitter' ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="git-fork" class="w-4 h-4 text-violet-400"></i> Splitter
          </button>
          <button onclick="marketplace.switchCategory('version-changer')" id="cat-btn-version-changer" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'version-changer' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="refresh-cw" class="w-4 h-4 text-cyan-400"></i> Versions
          </button>
          <button onclick="marketplace.switchCategory('world')" id="cat-btn-world" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'world' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="globe" class="w-4 h-4 text-teal-400"></i> Worlds
          </button>
          <button onclick="marketplace.switchCategory('modpack')" id="cat-btn-modpack" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'modpack' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="archive" class="w-4 h-4 text-rose-400"></i> Modpacks
          </button>
          <button onclick="marketplace.switchCategory('datapack')" id="cat-btn-datapack" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'datapack' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="database" class="w-4 h-4 text-emerald-400"></i> Datapacks
          </button>
          <button onclick="marketplace.switchCategory('resourcepack')" id="cat-btn-resourcepack" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'resourcepack' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="palette" class="w-4 h-4 text-amber-400"></i> Resource Packs
          </button>
          <button onclick="marketplace.switchCategory('tools')" id="cat-btn-tools" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'tools' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="wrench" class="w-4 h-4 text-indigo-400"></i> Server Tools
          </button>
          <button onclick="marketplace.switchCategory('mctools')" id="cat-btn-mctools" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'mctools' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="sparkles" class="w-4 h-4 text-purple-400"></i> McTools
          </button>
        </div>

        <!-- Dynamic Content Area -->
        <div id="marketplace-view-content"></div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.renderCurrentView();
    this.refreshInstalledBadge();
  }

  async switchCategory(category) {
    if (category === 'plugins') category = 'plugin';
    if (category === 'mods') category = 'mod';
    if (category === 'worlds') category = 'world';
    if (category === 'player') category = 'players';
    if (category === 'version') category = 'version-changer';
    if (category === 'property' || category === 'config') category = 'properties';
    if (category === 'import') category = 'importer';
    if (category === 'split') category = 'splitter';

    // Stop live auto sync on player manager if leaving players
    if (this.activeTab === 'players' && category !== 'players' && window.playerManager) {
      playerManager.stopLiveAutoSync();
    }

    this.activeTab = category;
    this.currentPage = 0;

    // If switching from SpigotMC to a non-plugin category, reset provider to Modrinth
    if (this.activeProvider === 'spigotmc' && category !== 'plugin') {
      this.activeProvider = 'modrinth';
    }

    // Update Category Pills
    document.querySelectorAll('.cat-pill').forEach(btn => {
      btn.className = 'cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition bg-slate-800/60 text-slate-300 hover:bg-white/10';
    });

    const activeBtn = document.getElementById(`cat-btn-${category}`);
    if (activeBtn) {
      const colors = {
        'version-changer': 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20',
        players: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20',
        properties: 'bg-blue-600 text-white shadow-lg shadow-blue-500/20',
        importer: 'bg-amber-600 text-white shadow-lg shadow-amber-600/20',
        splitter: 'bg-violet-600 text-white shadow-lg shadow-violet-600/20',
        world: 'bg-teal-500 text-white shadow-lg shadow-teal-500/20',
        plugin: 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20',
        mod: 'bg-purple-600 text-white shadow-lg shadow-purple-500/20',
        datapack: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
        resourcepack: 'bg-amber-600 text-white shadow-lg shadow-amber-500/20',
        modpack: 'bg-rose-600 text-white shadow-lg shadow-rose-500/20',
        tools: 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20',
        mctools: 'bg-purple-600 text-white shadow-lg shadow-purple-500/20',
        playit: 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
      };
      activeBtn.className = `cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${colors[category] || 'bg-cyan-500 text-white'}`;
    }

    await this.renderCurrentView();
    if (window.lucide) lucide.createIcons();
  }

  async ensureActiveServerId() {
    if (window.serverConsole && serverConsole.serverId) {
      this.currentServerId = serverConsole.serverId;
      if (serverConsole.serverData && serverConsole.serverData.name) {
        this.serverData = serverConsole.serverData;
      }
    }

    try {
      const sRes = await app.api('/api/servers');
      const servers = sRes.servers || [];
      if (servers.length > 0) {
        const found = this.currentServerId ? servers.find(s => s.id == this.currentServerId) : null;
        if (found) {
          this.currentServerId = found.id;
          this.serverData = found;
        } else {
          this.currentServerId = servers[0].id;
          this.serverData = servers[0];
        }
        if (this.serverData) this.detectServerDefaults(this.serverData);
        if (window.worldManager) {
          worldManager.currentServerId = this.currentServerId;
          worldManager.serverData = this.serverData;
        }
      } else {
        this.currentServerId = null;
        this.serverData = null;
      }
    } catch (e) {
      console.error('Failed to ensure active server id:', e);
    }
  }

  async renderVersionChangerView() {
    const container = document.getElementById('marketplace-view-content');
    if (!container) return;

    await this.ensureActiveServerId();

    if (!this.currentServerId) {
      container.innerHTML = `
        <div class="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-4 max-w-lg mx-auto">
          <div class="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/30">
            <i data-lucide="refresh-cw" class="w-7 h-7"></i>
          </div>
          <div>
            <h3 class="text-xl font-black text-white">Version Changer</h3>
            <p class="text-xs text-slate-400 mt-1">Please select or deploy a Minecraft server to change software and versions.</p>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    if (window.versionChanger) {
      await versionChanger.renderVersionChangerTab(container, this.currentServerId, this.serverData);
    }
  }

  async renderPlayerManagerView() {
    const container = document.getElementById('marketplace-view-content');
    if (!container) return;

    await this.ensureActiveServerId();

    if (!this.currentServerId) {
      container.innerHTML = `
        <div class="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-4 max-w-lg mx-auto">
          <div class="w-14 h-14 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/30">
            <i data-lucide="users" class="w-7 h-7"></i>
          </div>
          <div>
            <h3 class="text-xl font-black text-white">Minecraft Player Manager</h3>
            <p class="text-xs text-slate-400 mt-1">Please select or deploy a Minecraft server to manage players.</p>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    const pm = window.playerManager || (typeof playerManager !== 'undefined' ? playerManager : null);
    if (pm) {
      await pm.renderPlayerManagerTab(container, this.currentServerId, this.serverData);
    } else {
      container.innerHTML = `
        <div class="glass-panel p-12 rounded-3xl border border-rose-500/20 text-center space-y-3 max-w-lg mx-auto">
          <p class="text-sm font-bold text-rose-400">Player Manager module could not be initialized.</p>
          <button onclick="marketplace.renderPlayerManagerView()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold">Retry</button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  }

  async renderImporterView() {
    const container = document.getElementById('marketplace-view-content');
    if (!container) return;

    await this.ensureActiveServerId();

    if (!this.currentServerId) {
      container.innerHTML = `
        <div class="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-4 max-w-lg mx-auto">
          <div class="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
            <i data-lucide="download-cloud" class="w-7 h-7"></i>
          </div>
          <div>
            <h3 class="text-xl font-black text-white">Server Importer</h3>
            <p class="text-xs text-slate-400 mt-1">Please select or deploy a server to import archives or external files.</p>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    const imp = window.serverImporter || (typeof serverImporter !== 'undefined' ? serverImporter : null);
    if (imp) {
      await imp.renderImporterTab(container, this.currentServerId);
    } else {
      container.innerHTML = `
        <div class="glass-panel p-12 rounded-3xl border border-rose-500/20 text-center space-y-3 max-w-lg mx-auto">
          <p class="text-sm font-bold text-rose-400">Server Importer module could not be initialized.</p>
          <button onclick="marketplace.renderImporterView()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold">Retry</button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  }

  async renderSplitterView() {
    const container = document.getElementById('marketplace-view-content');
    if (!container) return;

    await this.ensureActiveServerId();

    if (!this.currentServerId) {
      container.innerHTML = `
        <div class="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-4 max-w-lg mx-auto">
          <div class="w-14 h-14 rounded-2xl bg-violet-500/20 text-violet-400 flex items-center justify-center mx-auto border border-violet-500/30">
            <i data-lucide="git-fork" class="w-7 h-7"></i>
          </div>
          <div>
            <h3 class="text-xl font-black text-white">Server Splitter</h3>
            <p class="text-xs text-slate-400 mt-1">Please select or deploy a server to split memory and cores into sub-instances.</p>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    const split = window.serverSplitter || (typeof serverSplitter !== 'undefined' ? serverSplitter : null);
    if (split) {
      await split.renderSplitterTab(container, this.currentServerId);
    } else {
      container.innerHTML = `
        <div class="glass-panel p-12 rounded-3xl border border-rose-500/20 text-center space-y-3 max-w-lg mx-auto">
          <p class="text-sm font-bold text-rose-400">Server Splitter module could not be initialized.</p>
          <button onclick="marketplace.renderSplitterView()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold">Retry</button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  }

  async renderCurrentView() {
    if (this.activeTab === 'installed') {
      await this.renderInstalledView();
    } else if (this.activeTab === 'version-changer') {
      await this.renderVersionChangerView();
    } else if (this.activeTab === 'players') {
      await this.renderPlayerManagerView();
    } else if (this.activeTab === 'importer') {
      await this.renderImporterView();
    } else if (this.activeTab === 'splitter') {
      await this.renderSplitterView();
    } else if (this.activeTab === 'world') {
      await this.renderWorldsMarketplaceView();
    } else if (this.activeTab === 'properties') {
      await this.renderPropertiesView();
    } else if (this.activeTab === 'tools' || this.activeTab === 'playit') {
      await this.renderToolsView();
    } else if (this.activeTab === 'mctools') {
      await this.renderMcToolsView();
    } else {
      await this.renderBrowseView();
    }
  }

  async renderBrowseView() {
    const container = document.getElementById('marketplace-view-content');
    if (!container) return;

    const catLabels = {
      plugin: 'Plugins (Paper / Spigot / Bukkit / Folia / Velocity)',
      mod: 'Mods (Fabric / Forge / NeoForge / Quilt)',
      datapack: 'Datapacks',
      resourcepack: 'Resource Packs (Textures & Models)',
      modpack: 'Modpacks'
    };

    const currentLabel = catLabels[this.activeTab] || 'Addons';

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Playit.gg Featured Hero Banner -->
        <div class="glass-panel p-5 rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3.5">
            <div class="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg shadow-indigo-500/20">
              <i data-lucide="network" class="w-6 h-6"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[9px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-500/30">Free Port Forwarding</span>
                <span class="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono font-semibold">Official Plugin</span>
                <span class="text-[10px] text-slate-400 font-mono">playit.gg</span>
              </div>
              <h4 class="text-sm font-bold text-white mt-0.5">Playit.gg — Global Minecraft Server Tunnel</h4>
              <p class="text-[11px] text-slate-300">Allow players to join without port forwarding or static public IP. Free .joinmc.link domain.</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button onclick="marketplace.switchCategory('playit')" class="btn-cyber-purple w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/20">
              <i data-lucide="zap" class="w-3.5 h-3.5"></i> Playit Tunnel Manager
            </button>
          </div>
        </div>

        <!-- Search & Filter Controls Toolbar -->
        <div class="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
          <!-- Web Source Provider Switcher ("use web a to z") -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <i data-lucide="globe" class="w-3.5 h-3.5 text-cyan-400"></i> Web Source:
              </span>
              <button onclick="marketplace.switchProvider('modrinth')" id="provider-btn-modrinth" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${this.activeProvider === 'modrinth' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'}">
                <span class="w-2 h-2 rounded-full ${this.activeProvider === 'modrinth' ? 'bg-white' : 'bg-emerald-400'}"></span>
                <span>Modrinth</span>
                <span class="text-[9px] opacity-70 font-mono">modrinth.com</span>
              </button>
              <button onclick="marketplace.switchProvider('curseforge')" id="provider-btn-curseforge" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${this.activeProvider === 'curseforge' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'}">
                <span class="w-2 h-2 rounded-full ${this.activeProvider === 'curseforge' ? 'bg-white' : 'bg-amber-400'}"></span>
                <span>CurseForge</span>
                <span class="text-[9px] opacity-70 font-mono">curseforge.com</span>
              </button>
              <button onclick="marketplace.switchProvider('spigotmc')" id="provider-btn-spigotmc" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${this.activeProvider === 'spigotmc' ? 'bg-yellow-500 text-slate-950 font-black shadow-lg shadow-yellow-500/30' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'}">
                <span class="w-2 h-2 rounded-full ${this.activeProvider === 'spigotmc' ? 'bg-slate-950' : 'bg-yellow-400'}"></span>
                <span>SpigotMC</span>
                <span class="text-[9px] opacity-70 font-mono">spigotmc.org</span>
              </button>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-400 font-mono">Source: 
                <a href="${this.activeProvider === 'spigotmc' ? 'https://www.spigotmc.org' : (this.activeProvider === 'curseforge' ? 'https://www.curseforge.com' : 'https://modrinth.com')}" target="_blank" class="text-cyan-400 hover:underline">
                  ${this.activeProvider === 'spigotmc' ? 'spigotmc.org' : (this.activeProvider === 'curseforge' ? 'curseforge.com' : 'modrinth.com')}
                </a>
              </span>
              <button onclick="marketplace.resetFilters()" class="text-[11px] text-slate-400 hover:text-cyan-400 flex items-center gap-1 transition ml-2">
                <i data-lucide="rotate-ccw" class="w-3 h-3"></i> Reset
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
            <!-- 1. Search Query Input (4 cols) -->
            <div class="md:col-span-4 relative">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
              <input type="text" id="mp-search-input" value="${this.searchQuery}" oninput="marketplace.onSearchInput(this.value)" placeholder="Search ${this.activeTab}s by name or keyword..." class="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-xs">
              ${this.searchQuery ? `
                <button onclick="marketplace.clearSearch()" class="absolute right-3 top-2.5 text-slate-400 hover:text-white">
                  <i data-lucide="x" class="w-4 h-4"></i>
                </button>
              ` : ''}
            </div>

            <!-- 2. Software Type Dropdown (3 cols) -->
            <div class="md:col-span-3">
              <select id="mp-loader-select" onchange="marketplace.onLoaderChange(this.value)" class="w-full glass-input px-3 py-2.5 rounded-xl text-xs font-medium">
                ${this.allSoftwareTypes.map(st => `
                  <option value="${st.id}" ${st.id === this.selectedLoader ? 'selected' : ''}>⚙️ ${st.name}</option>
                `).join('')}
              </select>
            </div>

            <!-- 3. Minecraft Version Dropdown (All A to Z) (3 cols) -->
            <div class="md:col-span-3">
              <select id="mp-version-select" onchange="marketplace.onVersionChange(this.value)" class="w-full glass-input px-3 py-2.5 rounded-xl text-xs font-medium">
                ${this.renderVersionOptions(this.selectedGameVersion)}
              </select>
            </div>

            <!-- 4. Sort By Dropdown (2 cols) -->
            <div class="md:col-span-2">
              <select id="mp-sort-select" onchange="marketplace.onSortChange(this.value)" class="w-full glass-input px-3 py-2.5 rounded-xl text-xs font-medium">
                <option value="downloads" ${this.sortBy === 'downloads' ? 'selected' : ''}>🔥 Downloads</option>
                <option value="updated" ${this.sortBy === 'updated' ? 'selected' : ''}>⏱️ Updated</option>
                <option value="relevance" ${this.sortBy === 'relevance' ? 'selected' : ''}>🎯 Match</option>
                <option value="newest" ${this.sortBy === 'newest' ? 'selected' : ''}>✨ Newest</option>
              </select>
            </div>
          </div>

          <!-- Quick Version Filter Pills Bar ("Minecraft Version - a to z auto list filtar") -->
          ${this.renderVersionQuickPills(this.selectedGameVersion)}
        </div>

        <!-- Project Cards Grid Container -->
        <div id="mp-projects-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[300px]">
          <div class="col-span-full py-16 text-center text-slate-400">
            <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-2"></i>
            <p>Loading ${this.activeTab}s from Modrinth repository...</p>
          </div>
        </div>

        <!-- Pagination Bar -->
        <div id="mp-pagination-bar" class="flex justify-between items-center text-xs text-slate-400 pt-2 hidden">
          <button id="mp-prev-btn" onclick="marketplace.prevPage()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed">
            <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i> Previous
          </button>
          <span id="mp-page-info" class="font-mono">Showing 1-24</span>
          <button id="mp-next-btn" onclick="marketplace.nextPage()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed">
            Next <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.fetchAndRenderProjects();
  }

  async switchProvider(provider) {
    this.activeProvider = provider;
    this.currentPage = 0;
    if (provider === 'spigotmc' && this.activeTab !== 'plugin') {
      this.activeTab = 'plugin';
      document.querySelectorAll('.cat-pill').forEach(btn => {
        btn.className = 'cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition bg-slate-800/60 text-slate-300 hover:bg-white/10';
      });
      const activeBtn = document.getElementById('cat-btn-plugin');
      if (activeBtn) activeBtn.className = 'cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition bg-cyan-500 text-white shadow-lg shadow-cyan-500/20';
    }
    await this.renderBrowseView();
  }

  getCurseforgeClassId() {
    const map = {
      plugin: 5,
      mod: 6,
      resourcepack: 12,
      world: 17,
      modpack: 4471,
      datapack: 6945
    };
    return map[this.activeTab] || 5;
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedLoader = '';
    this.selectedGameVersion = this.serverGameVersion || '';
    this.curseforgeWorldVersion = this.serverGameVersion || '';
    this.sortBy = 'downloads';
    this.currentPage = 0;
    this.renderBrowseView();
  }

  onSearchInput(val) {
    this.searchQuery = val;
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.currentPage = 0;
      this.fetchAndRenderProjects();
    }, 350);
  }

  clearSearch() {
    this.searchQuery = '';
    const inp = document.getElementById('mp-search-input');
    if (inp) inp.value = '';
    this.currentPage = 0;
    this.fetchAndRenderProjects();
  }

  onLoaderChange(val) {
    this.selectedLoader = val;
    this.currentPage = 0;
    this.fetchAndRenderProjects();
  }

  onVersionChange(val) {
    this.setGameVersion(val);
  }

  onSortChange(val) {
    this.sortBy = val;
    this.currentPage = 0;
    this.fetchAndRenderProjects();
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.fetchAndRenderProjects();
      const mc = document.getElementById('main-content');
      if (mc) mc.scrollTo({ top: 0, behavior: 'smooth' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage() {
    if ((this.currentPage + 1) * this.limit < this.totalHits) {
      this.currentPage++;
      this.fetchAndRenderProjects();
      const mc = document.getElementById('main-content');
      if (mc) mc.scrollTo({ top: 0, behavior: 'smooth' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async fetchAndRenderProjects() {
    const grid = document.getElementById('mp-projects-grid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400">
        <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-2"></i>
        <p>Loading ${this.activeTab}s from ${this.activeProvider.toUpperCase()}...</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      let projects = [];
      this.totalHits = 0;

      if (this.activeProvider === 'spigotmc') {
        const params = new URLSearchParams({
          query: this.searchQuery,
          page: this.currentPage,
          size: this.limit,
          sort: this.sortBy === 'downloads' ? '-downloads' : '-releaseDate'
        });
        if (this.selectedGameVersion) {
          params.append('gameVersion', this.selectedGameVersion);
        }
        const res = await app.api(`/api/marketplace/spigot/search?${params.toString()}`);
        if (!res.success && res.error) throw new Error(res.error);
        projects = res.projects || [];
        this.totalHits = res.totalHits || projects.length;
      } else if (this.activeProvider === 'curseforge') {
        const classId = this.getCurseforgeClassId();
        const params = new URLSearchParams({
          classId: classId,
          query: this.searchQuery,
          pageSize: this.limit,
          index: this.currentPage * this.limit
        });
        if (this.selectedGameVersion) {
          params.append('gameVersion', this.selectedGameVersion);
        }
        const res = await app.api(`/api/marketplace/curseforge/search?${params.toString()}`);
        if (!res.success && res.error) throw new Error(res.error);
        const rawItems = res.items || [];
        this.totalHits = res.totalHits || rawItems.length;
        projects = rawItems.map(item => ({
          id: item.id,
          slug: `cf-${item.id}`,
          title: item.name,
          description: item.summary,
          downloads: item.downloadCount || 0,
          follows: item.thumbsUpCount || 0,
          iconUrl: item.logoUrl || '/assets/favicon.svg',
          author: item.authors || 'CurseForge Author',
          projectType: this.activeTab,
          displayCategories: (item.categories || []).map(c => c.name),
          websiteUrl: item.websiteUrl || `https://www.curseforge.com/minecraft/mc-mods/${item.slug}`,
          source: 'curseforge',
          rawItem: item
        }));
      } else {
        // Modrinth
        const params = new URLSearchParams({
          query: this.searchQuery,
          projectType: this.activeTab,
          loader: this.selectedLoader,
          gameVersion: this.selectedGameVersion,
          sort: this.sortBy,
          limit: this.limit,
          offset: this.currentPage * this.limit
        });
        const res = await app.api(`/api/marketplace/search?${params.toString()}`);
        if (!res.success) throw new Error(res.error);
        projects = (res.projects || []).map(p => ({ ...p, source: 'modrinth' }));
        this.totalHits = res.totalHits || 0;
      }

      // Cache projects in Map to prevent quote-escaping issues
      this.projectMap.clear();
      projects.forEach(p => this.projectMap.set(p.slug, p));

      if (projects.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full py-16 text-center text-slate-400 space-y-3">
            <i data-lucide="package-search" class="w-12 h-12 mx-auto text-slate-500"></i>
            <p class="text-base font-semibold text-slate-300">No ${this.activeTab}s found on ${this.activeProvider.toUpperCase()}</p>
            <p class="text-xs text-slate-500 max-w-sm mx-auto">Try clearing search filters or switching web sources.</p>
            <button onclick="marketplace.resetFilters()" class="btn-cyber px-4 py-2 rounded-xl text-xs mt-2">Reset Filters</button>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      grid.innerHTML = projects.map(p => this.renderProjectCard(p)).join('');

      // Update pagination bar
      const pBar = document.getElementById('mp-pagination-bar');
      if (pBar) {
        pBar.classList.remove('hidden');
        const start = this.currentPage * this.limit + 1;
        const end = Math.min((this.currentPage + 1) * this.limit, this.totalHits);
        const pageInfoEl = document.getElementById('mp-page-info');
        if (pageInfoEl) pageInfoEl.innerText = `Showing ${start}-${end} of ${this.totalHits}`;
        const prevBtn = document.getElementById('mp-prev-btn');
        const nextBtn = document.getElementById('mp-next-btn');
        if (prevBtn) prevBtn.disabled = (this.currentPage === 0);
        if (nextBtn) nextBtn.disabled = (end >= this.totalHits);
      }
    } catch (err) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center text-rose-400 space-y-2">
          <i data-lucide="alert-triangle" class="w-10 h-10 mx-auto text-rose-500"></i>
          <p class="font-bold">Error loading marketplace</p>
          <p class="text-xs text-slate-400">${err.message}</p>
          <button onclick="marketplace.fetchAndRenderProjects()" class="btn-cyber px-4 py-2 rounded-xl text-xs mt-2">Retry</button>
        </div>
      `;
    }

    if (window.lucide) lucide.createIcons();
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  renderProjectCard(p) {
    const typeBadges = {
      plugin: { label: 'Plugin', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
      mod: { label: 'Mod', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
      datapack: { label: 'Datapack', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
      resourcepack: { label: 'Resource Pack', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
      modpack: { label: 'Modpack', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
    };

    const providerBadges = {
      spigotmc: { label: 'SpigotMC', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
      curseforge: { label: 'CurseForge', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
      modrinth: { label: 'Modrinth', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
    };

    const badge = typeBadges[p.projectType] || { label: p.projectType || 'Addon', color: 'bg-slate-700 text-slate-200 border-white/10' };
    const provBadge = providerBadges[p.source] || providerBadges.modrinth;
    const iconUrl = p.iconUrl || '/assets/favicon.svg';
    const escapedTitle = this.escapeHtml(p.title);
    const escapedDesc = this.escapeHtml(p.description);

    return `
      <div class="glass-card p-4 rounded-2xl border border-white/10 hover:border-cyan-500/40 transition flex flex-col justify-between space-y-3 group">
        <div>
          <!-- Card Header: Icon, Name, Provider & Type -->
          <div class="flex items-start gap-3">
            <img src="${iconUrl}" onerror="this.src='/assets/favicon.svg'" alt="${escapedTitle}" class="w-12 h-12 rounded-xl object-contain bg-slate-900/60 p-1 border border-white/10 flex-shrink-0 group-hover:scale-105 transition-transform">
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-1">
                <h4 class="font-bold text-sm text-white truncate hover:text-cyan-400 cursor-pointer" onclick="marketplace.showProjectModal('${p.slug}')" title="${escapedTitle}">${escapedTitle}</h4>
                <div class="flex items-center gap-1 shrink-0">
                  <span class="text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-full border ${provBadge.color}">${provBadge.label}</span>
                  <span class="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${badge.color}">${badge.label}</span>
                </div>
              </div>
              <p class="text-[11px] text-slate-400 truncate">by <span class="text-slate-200">${this.escapeHtml(p.author || 'Author')}</span></p>
            </div>
          </div>

          <!-- Description -->
          <p class="text-xs text-slate-300 line-clamp-2 mt-2 leading-relaxed h-8">
            ${escapedDesc || 'No description provided.'}
          </p>

          <!-- Badges & Tags -->
          <div class="flex flex-wrap items-center gap-2 mt-3 text-[10px] text-slate-400">
            <span class="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md border border-white/5">
              <i data-lucide="download" class="w-3 h-3 text-cyan-400"></i> ${this.formatDownloads(p.downloads)}
            </span>
            ${p.source === 'spigotmc' && p.rating ? `
              <span class="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md border border-white/5 text-amber-300">
                <i data-lucide="star" class="w-3 h-3 fill-amber-400 text-amber-400"></i> ${p.rating}
              </span>
            ` : `
              <span class="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md border border-white/5">
                <i data-lucide="heart" class="w-3 h-3 text-rose-400"></i> ${this.formatDownloads(p.follows)}
              </span>
            `}
            ${(p.displayCategories || []).slice(0, 2).map(c => `
              <span class="bg-white/5 px-2 py-0.5 rounded-md text-slate-400 truncate max-w-[90px]">${this.escapeHtml(c)}</span>
            `).join('')}
            ${p.testedVersions?.length ? `
              <span class="bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-500/20 font-mono text-[10px]">MC: ${p.testedVersions.slice(-2).join(', ')}</span>
            ` : ''}
            ${p.rawItem?.latestFile?.gameVersions?.length ? `
              <span class="bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/20 font-mono text-[10px]">MC: ${p.rawItem.latestFile.gameVersions.slice(0, 2).join(', ')}</span>
            ` : ''}
            ${p.versions?.length ? `
              <span class="bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/20 font-mono text-[10px]">MC: ${p.versions.slice(0, 2).join(', ')}</span>
            ` : ''}
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="pt-2 border-t border-white/5 flex items-center gap-2">
          ${p.websiteUrl ? `
            <a href="${p.websiteUrl}" target="_blank" class="px-2.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition flex items-center justify-center gap-1" title="View on ${provBadge.label}">
              <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
            </a>
          ` : ''}
          <button onclick="marketplace.showProjectModal('${p.slug}')" class="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition flex items-center justify-center gap-1.5">
            <i data-lucide="info" class="w-3.5 h-3.5"></i> Details
          </button>
          <button id="quick-install-btn-${p.slug}" onclick="marketplace.quickInstall('${p.slug}')" class="flex-1 btn-cyber px-3 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-1.5">
            <i data-lucide="download-cloud" class="w-3.5 h-3.5"></i> Install
          </button>
        </div>
      </div>
    `;
  }

  // Quick 1-Click Install to Server
  async quickInstall(projectSlug) {
    if (!this.currentServerId) {
      app.toast('Please select a target server first.', 'error');
      return;
    }

    const project = this.projectMap.get(projectSlug);
    const projectTitle = project?.title || projectSlug;
    
    let projectType = this.activeTab;
    if (!projectType || projectType === 'installed') {
      projectType = project?.projectType || 'plugin';
    }
    const serverEngine = (this.serverData?.jar_type || '').toLowerCase();
    const isPluginServer = ['paper', 'purpur', 'spigot', 'bukkit', 'craftbukkit', 'folia', 'pufferfish', 'leaf', 'leaves', 'divinemc', 'velocity', 'bungeecord', 'waterfall'].includes(serverEngine);
    const isModServer = ['fabric', 'forge', 'neoforge', 'quilt'].includes(serverEngine);
    if (isPluginServer && (projectType === 'mod' || projectType === 'plugin')) {
      projectType = 'plugin';
    } else if (isModServer && (projectType === 'plugin' || projectType === 'mod')) {
      projectType = 'mod';
    }

    const btn = document.getElementById(`quick-install-btn-${projectSlug}`);
    const originalText = btn ? btn.innerHTML : null;

    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Installing...`;
        if (window.lucide) lucide.createIcons();
      }

      // Handle SpigotMC Install
      if (project?.source === 'spigotmc') {
        app.toast(`Installing "${projectTitle}" from SpigotMC...`, 'info');
        const installRes = await app.api('/api/marketplace/spigot/install', {
          method: 'POST',
          body: JSON.stringify({
            serverId: this.currentServerId,
            resourceId: project.id
          })
        });
        if (!installRes.success) throw new Error(installRes.error);
        app.toast(`✅ Successfully installed ${installRes.fileName} to plugins/!`, 'success');
        this.refreshInstalledBadge();
        return;
      }

      // Handle CurseForge Install
      if (project?.source === 'curseforge') {
        app.toast(`Installing "${projectTitle}" from CurseForge...`, 'info');
        const installRes = await app.api('/api/marketplace/curseforge/install-addon', {
          method: 'POST',
          body: JSON.stringify({
            serverId: this.currentServerId,
            modId: project.id,
            targetType: projectType,
            projectName: projectTitle
          })
        });
        if (!installRes.success) throw new Error(installRes.error);
        app.toast(`✅ Successfully installed ${installRes.fileName} to ${installRes.directory}/!`, 'success');
        this.refreshInstalledBadge();
        return;
      }

      // Default Modrinth Install
      app.toast(`Finding latest compatible build for ${projectTitle}...`, 'info');

      const gameVersion = this.selectedGameVersion || this.serverData?.jar_version || null;
      const loader = this.selectedLoader || null;

      const params = new URLSearchParams();
      if (gameVersion) params.append('gameVersion', gameVersion);
      if (loader) params.append('loader', loader);

      const verRes = await app.api(`/api/marketplace/project/${projectSlug}/versions?${params.toString()}`);
      if (!verRes.success || !verRes.versions || verRes.versions.length === 0) {
        // Try fallback without constraints
        const fallbackRes = await app.api(`/api/marketplace/project/${projectSlug}/versions`);
        if (!fallbackRes.success || !fallbackRes.versions || fallbackRes.versions.length === 0) {
          throw new Error('No downloadable build found for this project.');
        }
        verRes.versions = fallbackRes.versions;
      }

      const targetVersion = verRes.versions[0];
      const file = targetVersion.file;
      if (!file || !file.url) {
        throw new Error('Download link missing in release file.');
      }

      app.toast(`Downloading ${file.filename}...`, 'info');

      const installRes = await app.api(`/api/servers/${this.currentServerId}/marketplace/install`, {
        method: 'POST',
        body: JSON.stringify({
          downloadUrl: file.url,
          fileName: file.filename,
          targetType: projectType,
          projectName: projectTitle
        })
      });

      if (!installRes.success) throw new Error(installRes.error);

      app.toast(`✅ Successfully installed ${file.filename} to ${installRes.directory}/!`, 'success');
      this.refreshInstalledBadge();
    } catch (err) {
      console.error(err);
      app.toast(`Failed to install: ${err.message}`, 'error');
    } finally {
      if (btn && originalText) {
        btn.disabled = false;
        btn.innerHTML = originalText;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  // Render Installed Addons Manager View
  async renderInstalledView() {
    const container = document.getElementById('marketplace-view-content');
    if (!container) return;

    container.innerHTML = `
      <div class="space-y-4">
        <div class="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h4 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i> Installed Server Addons
            </h4>
            <p class="text-xs text-slate-400">Manage all plugins, mods, datapacks, and resourcepacks installed on this server.</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="marketplace.switchCategory('plugin')" class="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5">
              <i data-lucide="shopping-bag" class="w-3.5 h-3.5"></i> Browse Store
            </button>
            <button onclick="marketplace.renderInstalledView()" class="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition flex items-center gap-1.5">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh
            </button>
          </div>
        </div>

        <div id="mp-installed-table-card" class="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <div class="p-8 text-center text-slate-400">
            <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-2"></i>
            <p>Scanning server directories...</p>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/marketplace/installed`);
      if (!res.success) throw new Error(res.error);

      this.installedAddons = res.installed || [];
      this.updateInstalledBadgeCount(this.installedAddons.length);

      const tableCard = document.getElementById('mp-installed-table-card');
      if (!tableCard) return;

      if (this.installedAddons.length === 0) {
        tableCard.innerHTML = `
          <div class="py-16 text-center text-slate-400 space-y-4">
            <i data-lucide="folder-x" class="w-12 h-12 mx-auto text-slate-500"></i>
            <p class="text-base font-semibold text-slate-200">No addons installed yet</p>
            <p class="text-xs text-slate-400 max-w-md mx-auto">Explore the marketplace categories above to search and install Plugins, Mods, Datapacks, Resource Packs, or Modpacks.</p>
            <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button onclick="marketplace.switchCategory('plugin')" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <i data-lucide="puzzle" class="w-4 h-4"></i> Browse Plugins
              </button>
              <button onclick="marketplace.switchCategory('mod')" class="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow transition flex items-center gap-1.5">
                <i data-lucide="box" class="w-4 h-4"></i> Browse Mods
              </button>
              <button onclick="marketplace.switchCategory('datapack')" class="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition flex items-center gap-1.5">
                <i data-lucide="database" class="w-4 h-4"></i> Browse Datapacks
              </button>
            </div>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      tableCard.innerHTML = `
        <table class="w-full text-left text-xs text-slate-300">
          <thead class="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
            <tr>
              <th class="px-5 py-3.5">Addon / File</th>
              <th class="px-5 py-3.5">Directory</th>
              <th class="px-5 py-3.5">Size</th>
              <th class="px-5 py-3.5">Modified Date</th>
              <th class="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            ${this.installedAddons.map(item => `
              <tr class="hover:bg-white/5 transition">
                <td class="px-5 py-3.5">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-slate-800/80 border border-white/10 flex items-center justify-center text-cyan-400">
                      <i data-lucide="${item.type === 'mod' ? 'box' : (item.type === 'datapack' ? 'database' : (item.type === 'resourcepack' ? 'palette' : 'puzzle'))}" class="w-4 h-4"></i>
                    </div>
                    <div>
                      <p class="font-semibold text-white font-mono">${this.escapeHtml(item.fileName)}</p>
                      <span class="text-[10px] text-slate-400 uppercase tracking-wider">${item.type}</span>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-3.5 font-mono text-cyan-400">${item.directory}/</td>
                <td class="px-5 py-3.5 font-mono text-slate-400">${item.sizeFormatted}</td>
                <td class="px-5 py-3.5 text-slate-400">${new Date(item.modifiedAt).toLocaleDateString()}</td>
                <td class="px-5 py-3.5 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button onclick="marketplace.openInFileManager('${item.directory}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition flex items-center gap-1.5">
                      <i data-lucide="folder-open" class="w-3.5 h-3.5"></i> Open Folder
                    </button>
                    <button onclick="marketplace.uninstallAddon('${this.escapeHtml(item.fileName)}', '${item.directory}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition flex items-center gap-1.5">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Uninstall
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      const tableCard = document.getElementById('mp-installed-table-card');
      if (tableCard) {
        tableCard.innerHTML = `
          <div class="p-8 text-center text-rose-400">
            <p class="font-bold">Failed to list installed addons</p>
            <p class="text-xs text-slate-400">${err.message}</p>
          </div>
        `;
      }
    }

    if (window.lucide) lucide.createIcons();
  }

  async uninstallAddon(fileName, directory) {
    const ok = await app.confirm({
      tag: 'UNINSTALL ADDON',
      tagIcon: 'trash-2',
      title: 'Uninstall Addon',
      badge: window.location.host,
      message: `Are you sure you want to uninstall and delete "${fileName}"?`,
      subtext: 'This addon file and its associated data will be removed from your server.',
      icon: 'trash-2',
      confirmIcon: 'trash-2',
      confirmText: 'Uninstall',
      type: 'danger'
    });
    if (!ok) return;

    try {
      app.toast(`Uninstalling ${fileName}...`, 'info');
      const res = await app.api(`/api/servers/${this.currentServerId}/marketplace/uninstall`, {
        method: 'POST',
        body: JSON.stringify({ fileName, directory })
      });

      if (!res.success) throw new Error(res.error);

      app.toast(`✅ Successfully removed ${fileName}`, 'success');
      await this.renderInstalledView();
      this.refreshInstalledBadge();
    } catch (err) {
      app.toast(`Uninstall failed: ${err.message}`, 'error');
    }
  }

  openInFileManager(directory) {
    if (window.serverConsole && this.currentServerId) {
      serverConsole.switchSubTab('files');
      if (window.fileManager) {
        fileManager.navigateTo(directory || '');
      }
    }
  }

  async refreshInstalledBadge() {
    if (!this.currentServerId) return;
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/marketplace/installed`);
      if (res.success && res.installed) {
        this.updateInstalledBadgeCount(res.installed.length);
      }
    } catch (e) {}
  }

  updateInstalledBadgeCount(count) {
    const badge = document.getElementById('mp-installed-badge');
    if (badge) badge.innerText = `${count}`;
  }

  // Show Detailed Project Information & Versions Modal
  async showProjectModal(slugOrId) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-panel w-full max-w-2xl rounded-3xl border border-white/10 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">Project Details</span>
            <button onclick="document.getElementById('modal-container').innerHTML = ''" class="text-slate-400 hover:text-white p-1">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div id="mp-modal-details-area" class="py-8 text-center text-slate-400">
            <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-cyan-400 mb-2"></i>
            <p>Loading project details...</p>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      const [projRes, verRes] = await Promise.all([
        app.api(`/api/marketplace/project/${slugOrId}`),
        app.api(`/api/marketplace/project/${slugOrId}/versions`)
      ]);

      const p = projRes.project;
      const versions = verRes.versions || [];
      const area = document.getElementById('mp-modal-details-area');
      if (!area) return;

      this.currentModalProject = p;
      this.currentModalVersions = versions;

      area.className = 'space-y-6 text-left';
      area.innerHTML = `
        <!-- Header Info -->
        <div class="flex items-start gap-4 pb-4 border-b border-white/10">
          <img src="${p.icon_url || '/assets/favicon.svg'}" onerror="this.src='/assets/favicon.svg'" alt="${this.escapeHtml(p.title)}" class="w-16 h-16 rounded-2xl object-contain bg-slate-900/60 p-1.5 border border-white/10 shadow-lg">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-xl font-bold text-white">${this.escapeHtml(p.title)}</h3>
              <span class="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">${p.project_type}</span>
            </div>
            <p class="text-xs text-slate-300 mt-1 leading-relaxed">${this.escapeHtml(p.description)}</p>
            <div class="flex items-center gap-4 mt-3 text-xs text-slate-400">
              <span><i data-lucide="download" class="w-3.5 h-3.5 inline text-cyan-400 mr-1"></i> ${this.formatDownloads(p.downloads)} downloads</span>
              <span><i data-lucide="heart" class="w-3.5 h-3.5 inline text-rose-400 mr-1"></i> ${this.formatDownloads(p.followers)} followers</span>
              <a href="https://modrinth.com/${p.project_type}/${p.slug}" target="_blank" class="text-cyan-400 hover:underline flex items-center gap-1">
                Modrinth <i data-lucide="external-link" class="w-3 h-3"></i>
              </a>
            </div>
          </div>
        </div>

        <!-- Versions List -->
        <div class="space-y-3">
          <h4 class="text-sm font-bold text-white flex items-center justify-between">
            <span>Available Release Builds</span>
            <span class="text-xs text-slate-400 font-normal">${versions.length} release builds</span>
          </h4>

          <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
            ${versions.length === 0 ? `
              <p class="text-xs text-slate-500 text-center py-4">No download files available for this project.</p>
            ` : versions.map((v, idx) => `
              <div class="glass-card p-3 rounded-xl border border-white/10 flex items-center justify-between gap-3 hover:border-white/20 transition">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-bold text-white text-xs font-mono">${this.escapeHtml(v.versionNumber || v.name)}</span>
                    <span class="text-[10px] text-slate-400">${new Date(v.datePublished).toLocaleDateString()}</span>
                  </div>
                  <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-1 flex-wrap">
                    <span>File: <strong class="text-slate-300">${this.escapeHtml(v.file.filename)}</strong></span>
                    <span>•</span>
                    <span>${v.file.sizeFormatted}</span>
                    <span>•</span>
                    <span>MC: ${(v.gameVersions || []).slice(0, 4).join(', ')}${v.gameVersions.length > 4 ? '...' : ''}</span>
                  </div>
                </div>

                <button onclick="marketplace.installModalVersionByIndex(${idx})" class="btn-cyber px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow">
                  <i data-lucide="download" class="w-3.5 h-3.5"></i> Install
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (err) {
      const area = document.getElementById('mp-modal-details-area');
      if (area) {
        area.innerHTML = `<p class="text-rose-400 text-center">${err.message}</p>`;
      }
    }

    if (window.lucide) lucide.createIcons();
  }

  async installModalVersionByIndex(index) {
    if (!this.currentServerId) {
      app.toast('Please open a server first.', 'error');
      return;
    }

    const version = this.currentModalVersions ? this.currentModalVersions[index] : null;
    const project = this.currentModalProject;
    if (!version || !version.file) {
      app.toast('Invalid version selected.', 'error');
      return;
    }

    let modalTargetType = this.activeTab;
    if (!modalTargetType || modalTargetType === 'installed') {
      modalTargetType = project?.project_type || 'plugin';
    }
    const serverEngine = (this.serverData?.jar_type || '').toLowerCase();
    const isPluginServer = ['paper', 'purpur', 'spigot', 'bukkit', 'craftbukkit', 'folia', 'pufferfish', 'leaf', 'leaves', 'divinemc', 'velocity', 'bungeecord', 'waterfall'].includes(serverEngine);
    const isModServer = ['fabric', 'forge', 'neoforge', 'quilt'].includes(serverEngine);
    if (isPluginServer && (modalTargetType === 'mod' || modalTargetType === 'plugin')) {
      modalTargetType = 'plugin';
    } else if (isModServer && (modalTargetType === 'plugin' || modalTargetType === 'mod')) {
      modalTargetType = 'mod';
    }

    try {
      app.toast(`Downloading ${version.file.filename}...`, 'info');
      const res = await app.api(`/api/servers/${this.currentServerId}/marketplace/install`, {
        method: 'POST',
        body: JSON.stringify({
          downloadUrl: version.file.url,
          fileName: version.file.filename,
          targetType: modalTargetType,
          projectName: project?.title || version.file.filename
        })
      });

      if (!res.success) throw new Error(res.error);

      app.toast(`✅ Successfully installed ${version.file.filename} to ${res.directory}/!`, 'success');
      document.getElementById('modal-container').innerHTML = '';
      this.refreshInstalledBadge();
    } catch (err) {
      app.toast(`Install failed: ${err.message}`, 'error');
    }
  }

  // Render Global Marketplace from Sidebar
  async renderGlobalMarketplaceView() {
    const container = document.getElementById('view-container');
    if (!container) return;

    // Fetch user's servers so they can pick which server to install to
    let servers = [];
    try {
      const sRes = await app.api('/api/servers');
      servers = sRes.servers || [];
    } catch (e) {}

    // Verify currentServerId exists in servers; if not, default to first server
    if (servers.length > 0) {
      const found = this.currentServerId ? servers.find(s => s.id == this.currentServerId) : null;
      if (found) {
        this.currentServerId = found.id;
        this.serverData = found;
      } else {
        this.currentServerId = servers[0].id;
        this.serverData = servers[0];
      }
      this.detectServerDefaults(this.serverData);
      if (window.worldManager) {
        worldManager.currentServerId = this.currentServerId;
        worldManager.serverData = this.serverData;
      }
    } else {
      this.currentServerId = null;
      this.serverData = null;
    }

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
              <i data-lucide="shopping-bag" class="w-3.5 h-3.5 inline mr-1"></i> Global Marketplace
            </span>
            <h2 class="text-2xl font-black text-white">Addon Marketplace</h2>
            <p class="text-xs text-slate-300">Browse 50,000+ Plugins, Mods, Datapacks, Resource Packs & Modpacks and deploy directly to your servers.</p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <!-- Server Picker Dropdown -->
            ${servers.length > 0 ? `
              <div class="glass-panel p-2 rounded-2xl border border-white/10 flex items-center gap-2">
                <span class="text-xs text-slate-400 pl-2">Deploy to:</span>
                <select id="global-target-server-select" onchange="marketplace.onGlobalServerChange(this.value)" class="glass-input px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-400">
                  ${servers.map(s => `
                    <option value="${s.id}" ${s.id == this.currentServerId ? 'selected' : ''}>${s.name} (${s.server_type.toUpperCase()})</option>
                  `).join('')}
                </select>
              </div>
            ` : `
              <div class="text-xs text-amber-400 bg-amber-500/10 px-3 py-2 rounded-xl border border-amber-500/20">
                ⚠️ No servers created yet. Create a server first to install plugins.
              </div>
            `}

            <button onclick="marketplace.switchCategory('installed')" class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 shadow transition flex items-center gap-2">
              <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400"></i> Installed <span id="mp-installed-badge" class="bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full font-mono">0</span>
            </button>
          </div>
        </div>

        <!-- Category Tabs ("sab alg alg") -->
        <div class="glass-panel p-2 rounded-2xl border border-white/10 flex flex-wrap gap-2">
          <button onclick="marketplace.switchCategory('version-changer')" id="cat-btn-version-changer" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'version-changer' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="refresh-cw" class="w-4 h-4 text-cyan-400"></i> Version Changer
          </button>
          <button onclick="marketplace.switchCategory('players')" id="cat-btn-players" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'players' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="users" class="w-4 h-4 text-emerald-400"></i> Player Manager
          </button>
          <button onclick="marketplace.switchCategory('world')" id="cat-btn-world" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'world' ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="globe" class="w-4 h-4 text-teal-400"></i> World Manager
          </button>
          <button onclick="marketplace.switchCategory('plugin')" id="cat-btn-plugin" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'plugin' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="puzzle" class="w-4 h-4 text-cyan-400"></i> Plugins
          </button>
          <button onclick="marketplace.switchCategory('mod')" id="cat-btn-mod" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'mod' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="box" class="w-4 h-4 text-purple-400"></i> Mods
          </button>
          <button onclick="marketplace.switchCategory('datapack')" id="cat-btn-datapack" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'datapack' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="database" class="w-4 h-4 text-emerald-400"></i> Datapacks
          </button>
          <button onclick="marketplace.switchCategory('resourcepack')" id="cat-btn-resourcepack" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'resourcepack' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="palette" class="w-4 h-4 text-amber-400"></i> Resource Packs
          </button>
          <button onclick="marketplace.switchCategory('modpack')" id="cat-btn-modpack" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'modpack' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="archive" class="w-4 h-4 text-rose-400"></i> Modpacks
          </button>
          <button onclick="marketplace.switchCategory('properties')" id="cat-btn-properties" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'properties' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="sliders" class="w-4 h-4 text-blue-400"></i> Config Editor
          </button>
          <button onclick="marketplace.switchCategory('tools')" id="cat-btn-tools" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'tools' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="wrench" class="w-4 h-4 text-indigo-400"></i> Server Tools
          </button>
          <button onclick="marketplace.switchCategory('mctools')" id="cat-btn-mctools" class="cat-pill flex-1 min-w-[110px] px-3.5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeTab === 'mctools' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="sparkles" class="w-4 h-4 text-purple-400"></i> McTools
          </button>
        </div>

        <!-- Inner Content -->
        <div id="marketplace-view-content"></div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.renderCurrentView();
    this.refreshInstalledBadge();
  }

  // ===========================================================================
  // ADDON MARKETPLACE WORLD MANAGEMENT A TO Z
  // ===========================================================================

  async renderWorldsMarketplaceView() {
    const container = document.getElementById('marketplace-view-content');
    if (!container) return;

    await this.ensureActiveServerId();

    if (!this.currentServerId) {
      container.innerHTML = `
        <div class="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-4 max-w-lg mx-auto">
          <div class="w-14 h-14 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto border border-teal-500/30">
            <i data-lucide="globe" class="w-7 h-7"></i>
          </div>
          <div>
            <h3 class="text-xl font-black text-white">World Management & Maps Store</h3>
            <p class="text-xs text-slate-400 mt-1">Please select or deploy a Minecraft server to manage worlds and install maps.</p>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <!-- Top Hero Panel -->
        <div class="glass-panel p-6 rounded-3xl border border-teal-500/30 bg-gradient-to-r from-teal-950/40 via-slate-900/60 to-cyan-950/40 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black uppercase tracking-wider text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20 flex items-center gap-1">
                <i data-lucide="globe" class="w-3.5 h-3.5 inline"></i> World Management A to Z
              </span>
              <span class="text-[10px] text-slate-400 font-mono">CurseForge • Modrinth • Server Worlds</span>
            </div>
            <h3 class="text-2xl font-black text-white">Minecraft World Management & Maps Center</h3>
            <p class="text-xs text-slate-300">
              Manage active server worlds, create custom dimensions, download CurseForge & Modrinth maps, or deploy instant templates.
            </p>
          </div>

          <!-- Quick Actions -->
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="marketplace.openCreateWorldModal()" class="btn-cyber px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
              <i data-lucide="plus-circle" class="w-4 h-4"></i> Create World
            </button>
            <button onclick="marketplace.openUploadWorldModal()" class="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow transition flex items-center gap-2">
              <i data-lucide="upload-cloud" class="w-4 h-4 text-cyan-400"></i> Upload ZIP
            </button>
            <button onclick="marketplace.refreshWorldView()" title="Refresh Worlds" class="p-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-white/10 text-slate-300 border border-white/10 transition">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- Sub-Navigation Switcher Bar -->
        <div class="glass-panel p-2 rounded-2xl border border-white/10 flex flex-wrap gap-2">
          <button onclick="marketplace.switchWorldSubTab('roster')" id="world-subtab-roster" class="world-subtab-pill flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeWorldSubTab === 'roster' ? 'bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/25' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="server" class="w-4 h-4"></i> Server Worlds (${this.serverWorlds.length || '0'})
          </button>
          <button onclick="marketplace.switchWorldSubTab('curseforge')" id="world-subtab-curseforge" class="world-subtab-pill flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeWorldSubTab === 'curseforge' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/25' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="flame" class="w-4 h-4 text-amber-300"></i> CurseForge Worlds
          </button>
          <button onclick="marketplace.switchWorldSubTab('modrinth')" id="world-subtab-modrinth" class="world-subtab-pill flex-1 min-w-[130px] px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeWorldSubTab === 'modrinth' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="compass" class="w-4 h-4 text-emerald-300"></i> Modrinth Maps
          </button>
          <button onclick="marketplace.switchWorldSubTab('curated')" id="world-subtab-curated" class="world-subtab-pill flex-1 min-w-[130px] px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeWorldSubTab === 'curated' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="sparkles" class="w-4 h-4 text-cyan-300"></i> Curated Fast Maps
          </button>
          <button onclick="marketplace.switchWorldSubTab('direct')" id="world-subtab-direct" class="world-subtab-pill flex-1 min-w-[130px] px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${this.activeWorldSubTab === 'direct' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25' : 'bg-slate-800/60 text-slate-300 hover:bg-white/10'}">
            <i data-lucide="link" class="w-4 h-4 text-indigo-300"></i> Direct URL (.zip)
          </button>
        </div>

        <!-- Dynamic World SubTab Container -->
        <div id="world-subtab-container"></div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.switchWorldSubTab(this.activeWorldSubTab);
  }

  async switchWorldSubTab(subTab) {
    this.activeWorldSubTab = subTab;

    // Update pill buttons styling
    document.querySelectorAll('.world-subtab-pill').forEach(btn => {
      btn.className = 'world-subtab-pill flex-1 min-w-[130px] px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition bg-slate-800/60 text-slate-300 hover:bg-white/10';
    });

    const activeBtn = document.getElementById(`world-subtab-${subTab}`);
    if (activeBtn) {
      const styles = {
        roster: 'bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/25',
        curseforge: 'bg-amber-600 text-white shadow-lg shadow-amber-600/25',
        modrinth: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25',
        curated: 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/25',
        direct: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
      };
      activeBtn.className = `world-subtab-pill flex-1 min-w-[130px] px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${styles[subTab] || 'bg-teal-500 text-white'}`;
    }

    const container = document.getElementById('world-subtab-container');
    if (!container) return;

    if (subTab === 'roster') {
      await this.renderWorldRosterSubTab(container);
    } else if (subTab === 'curseforge') {
      await this.renderWorldCurseForgeSubTab(container);
    } else if (subTab === 'modrinth') {
      await this.renderWorldModrinthSubTab(container);
    } else if (subTab === 'curated') {
      await this.renderWorldCuratedSubTab(container);
    } else if (subTab === 'direct') {
      await this.renderWorldDirectSubTab(container);
    }
    if (window.lucide) lucide.createIcons();
  }

  async refreshWorldView() {
    await this.ensureActiveServerId();
    await this.switchWorldSubTab(this.activeWorldSubTab);
  }

  // --- 1. SERVER WORLDS ROSTER SUB-TAB ---
  async renderWorldRosterSubTab(container) {
    container.innerHTML = `
      <div class="glass-panel p-10 rounded-3xl border border-white/10 text-center space-y-3">
        <div class="animate-spin inline-block w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
        <p class="text-sm font-semibold text-slate-300">Reading server.properties & inspecting world saves...</p>
      </div>
    `;

    try {
      await this.ensureActiveServerId();
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds`);
      this.serverWorlds = res.worlds || [];
      this.activeWorldName = res.activeWorld || 'world';
      this.worldProperties = res.properties || {};

      // Update count badge in button
      const rosterBtn = document.getElementById('world-subtab-roster');
      if (rosterBtn) {
        rosterBtn.innerHTML = `<i data-lucide="server" class="w-4 h-4"></i> Server Worlds (${this.serverWorlds.length})`;
      }

      const activeWorld = this.serverWorlds.find(w => w.isActive) || {
        name: this.activeWorldName,
        sizeFormatted: 'Unknown',
        gameMode: this.worldProperties.gamemode || 'Survival',
        difficulty: this.worldProperties.difficulty || 'Easy',
        seed: this.worldProperties['level-seed'] || 'Random',
        dimensions: ['Overworld', 'Nether', 'The End']
      };
      const standbyWorlds = this.serverWorlds.filter(w => !w.isActive);

      container.innerHTML = `
        <div class="space-y-6">
          <!-- Active World Primary Spotlight Card -->
          <div class="glass-panel p-6 rounded-3xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-900/90 shadow-2xl space-y-4">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/10">
              <div class="flex items-center gap-3.5">
                <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20 shrink-0">
                  🌍
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Active World
                    </span>
                    <span class="text-[10px] text-slate-400 font-mono">level-name: ${this.escapeHtml(activeWorld.name)}</span>
                  </div>
                  <h4 class="text-xl font-black text-white mt-1">${this.escapeHtml(activeWorld.name)}</h4>
                </div>
              </div>

              <!-- Active World Quick Actions -->
              <div class="flex flex-wrap items-center gap-2">
                <button onclick="marketplace.downloadServerWorld('${this.escapeHtml(activeWorld.name)}')" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition flex items-center gap-1.5 shadow">
                  <i data-lucide="download" class="w-3.5 h-3.5 text-cyan-400"></i> Backup (.zip)
                </button>
                <button onclick="marketplace.openCloneWorldModal('${this.escapeHtml(activeWorld.name)}')" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition flex items-center gap-1.5 shadow">
                  <i data-lucide="copy" class="w-3.5 h-3.5 text-purple-400"></i> Clone
                </button>
                <button onclick="marketplace.resetServerWorld('${this.escapeHtml(activeWorld.name)}')" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition flex items-center gap-1.5">
                  <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-rose-400"></i> Reset
                </button>
              </div>
            </div>

            <!-- Active World Details Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div class="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-0.5">
                <span class="text-[10px] text-slate-400 uppercase font-mono">Disk Size</span>
                <p class="font-bold text-white font-mono text-sm">${activeWorld.sizeFormatted || 'Calculated on scan'}</p>
              </div>
              <div class="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-0.5">
                <span class="text-[10px] text-slate-400 uppercase font-mono">Gamemode / Difficulty</span>
                <p class="font-bold text-white">${this.escapeHtml(activeWorld.gameMode || 'Survival')} • ${this.escapeHtml(activeWorld.difficulty || 'Easy')}</p>
              </div>
              <div class="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-0.5">
                <span class="text-[10px] text-slate-400 uppercase font-mono">World Seed</span>
                <p class="font-bold text-slate-200 font-mono truncate" title="${this.escapeHtml(activeWorld.seed || 'Random')}">${this.escapeHtml(activeWorld.seed || 'Random')}</p>
              </div>
              <div class="bg-black/30 p-3 rounded-2xl border border-white/5 space-y-0.5">
                <span class="text-[10px] text-slate-400 uppercase font-mono">Dimensions</span>
                <div class="flex gap-1 pt-0.5">
                  <span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">Overworld</span>
                  <span class="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">Nether</span>
                  <span class="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">End</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Standby Worlds Section -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <h4 class="text-base font-black text-white flex items-center gap-2">
                  <i data-lucide="layers" class="w-4 h-4 text-cyan-400"></i> Standby Worlds
                </h4>
                <span class="text-xs bg-slate-800 px-2.5 py-0.5 rounded-full text-slate-300 font-mono font-bold">${standbyWorlds.length}</span>
              </div>
              <span class="text-xs text-slate-400">Switch active world anytime; takes effect on next server boot.</span>
            </div>

            ${standbyWorlds.length === 0 ? `
              <div class="glass-panel p-8 rounded-3xl border border-white/10 text-center space-y-2">
                <p class="text-sm font-semibold text-slate-300">No standby worlds found</p>
                <p class="text-xs text-slate-500">Create a new world or install a map from CurseForge / Modrinth below.</p>
                <div class="pt-2 flex justify-center gap-2">
                  <button onclick="marketplace.openCreateWorldModal()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold shadow">
                    <i data-lucide="plus" class="w-3.5 h-3.5 mr-1"></i> Create World
                  </button>
                  <button onclick="marketplace.switchWorldSubTab('curseforge')" class="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 text-white shadow">
                    <i data-lucide="flame" class="w-3.5 h-3.5 mr-1"></i> Browse CurseForge Maps
                  </button>
                </div>
              </div>
            ` : `
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${standbyWorlds.map(w => `
                  <div class="glass-card p-4 rounded-2xl border border-white/10 hover:border-teal-500/30 transition flex flex-col justify-between space-y-3 group">
                    <div class="space-y-2">
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-2.5">
                          <div class="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 border border-white/10 flex items-center justify-center text-xl shrink-0">
                            🗺️
                          </div>
                          <div>
                            <h5 class="font-bold text-sm text-white truncate max-w-[180px]" title="${this.escapeHtml(w.name)}">${this.escapeHtml(w.name)}</h5>
                            <span class="text-[10px] text-slate-400 font-mono">${w.sizeFormatted || 'Standby save'}</span>
                          </div>
                        </div>
                        <span class="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5">Standby</span>
                      </div>

                      <div class="flex gap-1 text-[9px] font-mono text-slate-400">
                        <span class="bg-black/30 px-1.5 py-0.5 rounded border border-white/5">Overworld</span>
                        ${w.hasNether ? '<span class="bg-rose-500/10 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/20">Nether</span>' : ''}
                        ${w.hasTheEnd ? '<span class="bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20">End</span>' : ''}
                      </div>
                    </div>

                    <div class="pt-3 border-t border-white/10 flex items-center gap-1.5 flex-wrap">
                      <button onclick="marketplace.activateServerWorld('${this.escapeHtml(w.name)}')" class="btn-cyber flex-1 px-3 py-1.5 rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1">
                        <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-300"></i> Set Active
                      </button>
                      <button onclick="marketplace.downloadServerWorld('${this.escapeHtml(w.name)}')" title="Download Backup (.zip)" class="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">
                        <i data-lucide="download" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="marketplace.openCloneWorldModal('${this.escapeHtml(w.name)}')" title="Clone World" class="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-purple-300 border border-white/5 transition">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="marketplace.resetServerWorld('${this.escapeHtml(w.name)}')" title="Reset / Wipe" class="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-rose-300 border border-white/5 transition">
                        <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="marketplace.deleteServerWorld('${this.escapeHtml(w.name)}')" title="Delete World" class="p-2 rounded-xl bg-white/5 hover:bg-rose-600/30 text-rose-400 border border-white/5 transition">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="glass-panel p-10 rounded-3xl border border-rose-500/20 text-center space-y-3">
          <p class="text-base font-bold text-white">Error loading server worlds</p>
          <p class="text-xs text-rose-300">${this.escapeHtml(err.message)}</p>
          <button onclick="marketplace.refreshWorldView()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold mt-2">Retry</button>
        </div>
      `;
    }
  }

  // --- 2. CURSEFORGE WORLDS SUB-TAB ---
  async renderWorldCurseForgeSubTab(container) {
    const categories = [
      { id: '', label: '🌐 All Worlds' },
      { id: '248', label: '🗺️ Adventure' },
      { id: '253', label: '🏕️ Survival' },
      { id: '251', label: '🏃 Parkour' },
      { id: '249', label: '🏰 Creation & Cities' },
      { id: '250', label: '🎮 Game Map / Minigames' },
      { id: '252', label: '🧩 Puzzle' },
      { id: '4464', label: '⚙️ Modded World' }
    ];

    container.innerHTML = `
      <div class="space-y-5">
        <!-- Search, Categories & Version Controls Toolbar -->
        <div class="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-slate-900/80 space-y-3.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <i data-lucide="flame" class="w-4 h-4 text-amber-400"></i>
              <span class="text-xs font-black uppercase tracking-wider text-white">CurseForge Worlds & Maps Store (curseforge.com)</span>
              <span class="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-mono hidden sm:inline-block">class=worlds&pageSize=20&sortBy=relevancy</span>
            </div>
            <a href="https://www.curseforge.com/minecraft/search?class=worlds&page=1&pageSize=20&sortBy=relevancy" target="_blank" class="text-[10px] text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1 transition">
              <span>curseforge.com/minecraft/search</span>
              <i data-lucide="external-link" class="w-3 h-3"></i>
            </a>
          </div>

          <!-- Filter Controls Grid -->
          <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div class="md:col-span-5 relative">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
              <input type="text" id="cf-world-search-input" value="${this.curseforgeWorldSearch}" oninput="marketplace.onCurseforgeWorldSearch(this.value)" placeholder="Search CurseForge maps (Skyblock, Parkour, Bedwars, City, RPG)..." class="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-xs">
            </div>

            <!-- Minecraft Version Filter A to Z -->
            <div class="md:col-span-4">
              <select id="cf-world-version-select" onchange="marketplace.onCurseforgeWorldVersion(this.value)" class="w-full glass-input px-3 py-2.5 rounded-xl text-xs font-medium">
                ${this.renderVersionOptions(this.curseforgeWorldVersion || this.selectedGameVersion)}
              </select>
            </div>

            <!-- Sort By Selector -->
            <div class="md:col-span-3">
              <select id="cf-world-sort-select" onchange="marketplace.onCurseforgeWorldSort(this.value)" class="w-full glass-input px-3 py-2.5 rounded-xl text-xs font-medium">
                <option value="relevancy" ${this.curseforgeWorldSort === 'relevancy' || this.curseforgeWorldSort == 2 ? 'selected' : ''}>🔥 Relevancy / Popularity</option>
                <option value="total_downloads" ${this.curseforgeWorldSort === 'total_downloads' || this.curseforgeWorldSort == 5 ? 'selected' : ''}>📥 Total Downloads</option>
                <option value="latest_updated" ${this.curseforgeWorldSort === 'latest_updated' || this.curseforgeWorldSort == 3 ? 'selected' : ''}>⏱️ Recently Updated</option>
                <option value="name" ${this.curseforgeWorldSort === 'name' || this.curseforgeWorldSort == 4 ? 'selected' : ''}>🔤 Map Name (A-Z)</option>
                <option value="featured" ${this.curseforgeWorldSort === 'featured' || this.curseforgeWorldSort == 1 ? 'selected' : ''}>⭐ Featured</option>
              </select>
            </div>
          </div>

          <!-- Quick Version Filter Pills Bar ("Minecraft Version - a to z auto list filtar") -->
          ${this.renderVersionQuickPills(this.selectedGameVersion)}

          <!-- Category Filter Pills Bar -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
            <span class="text-[11px] text-slate-400 font-semibold uppercase tracking-wider shrink-0 mr-1">Categories:</span>
            ${categories.map(c => {
              const active = String(this.curseforgeWorldCategory || '') === String(c.id);
              const cls = active
                ? 'cf-category-btn px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'cf-category-btn px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10';
              return `<button type="button" data-cat-id="${c.id}" onclick="marketplace.onCurseforgeWorldCategory('${c.id}')" class="${cls}">${c.label}</button>`;
            }).join('')}
          </div>
        </div>

        <!-- Maps Grid -->
        <div id="cf-worlds-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div class="col-span-full py-12 text-center text-slate-400 space-y-2">
            <div class="animate-spin inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
            <p class="text-xs">Fetching maps from CurseForge API v1...</p>
          </div>
        </div>

        <!-- CurseForge Worlds Pagination Bar -->
        <div id="cf-world-pagination-bar" class="flex justify-between items-center text-xs text-slate-400 pt-2 hidden">
          <button id="cf-prev-btn" onclick="marketplace.prevCurseforgeWorldPage()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed">
            <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i> Previous
          </button>
          <span id="cf-page-info" class="font-mono text-slate-300">Page 1</span>
          <button id="cf-next-btn" onclick="marketplace.nextCurseforgeWorldPage()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed">
            Next <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.fetchCurseforgeWorlds();
  }

  async fetchCurseforgeWorlds() {
    const grid = document.getElementById('cf-worlds-grid');
    if (!grid) return;

    try {
      const ver = this.selectedGameVersion || this.curseforgeWorldVersion || '';
      const params = new URLSearchParams({
        class: 'worlds',
        pageSize: 20,
        page: this.curseforgeWorldPage || 1,
        sortBy: this.curseforgeWorldSort || 'relevancy'
      });
      if (this.curseforgeWorldCategory) {
        params.append('categoryId', this.curseforgeWorldCategory);
      }
      if (this.curseforgeWorldSearch && this.curseforgeWorldSearch.trim()) {
        params.append('query', this.curseforgeWorldSearch.trim());
      }
      if (ver) {
        params.append('gameVersion', ver);
      }

      const res = await app.api(`/api/marketplace/curseforge/search?${params.toString()}`);
      const items = res.items || [];
      this.curseforgeWorldHits = res.totalHits || items.length;

      if (items.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full py-16 text-center text-slate-400 space-y-2">
            <i data-lucide="package-search" class="w-10 h-10 mx-auto text-slate-500"></i>
            <p class="font-bold text-white">No CurseForge worlds found</p>
            <p class="text-xs text-slate-500">Try changing your category, search terms, or selecting "All Minecraft Versions".</p>
          </div>
        `;
        const pBar = document.getElementById('cf-world-pagination-bar');
        if (pBar) pBar.classList.add('hidden');
        if (window.lucide) lucide.createIcons();
        return;
      }

      grid.innerHTML = items.map(m => `
        <div class="glass-card p-5 rounded-3xl border border-white/10 hover:border-amber-500/40 transition flex flex-col justify-between space-y-3 group shadow-lg">
          <div class="space-y-2.5">
            <div class="flex items-start gap-3">
              <img src="${m.logoUrl || '/assets/favicon.svg'}" onerror="this.src='/assets/favicon.svg'" alt="${this.escapeHtml(m.name)}" class="w-12 h-12 rounded-2xl object-cover bg-slate-900 border border-white/10 shrink-0 group-hover:scale-105 transition-transform">
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-1">
                  <h5 class="font-bold text-sm text-white truncate group-hover:text-amber-300 transition-colors" title="${this.escapeHtml(m.name)}">
                    ${this.escapeHtml(m.name)}
                  </h5>
                  <span class="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">CurseForge</span>
                </div>
                <p class="text-[11px] text-slate-400 truncate">By ${this.escapeHtml(m.authors || 'Community')}</p>
              </div>
            </div>

            <p class="text-xs text-slate-300 line-clamp-2 leading-relaxed h-8">
              ${this.escapeHtml(m.summary || 'Minecraft custom adventure, survival, or minigame map.')}
            </p>

            <div class="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 pt-1">
              <span class="bg-black/40 px-2 py-0.5 rounded-md border border-white/5 flex items-center gap-1">
                <i data-lucide="download" class="w-3 h-3 text-amber-400"></i> ${this.formatDownloads(m.downloadCount)}
              </span>
              ${m.latestFile?.gameVersions ? `
                <span class="bg-black/40 px-2 py-0.5 rounded-md border border-white/5 font-mono text-slate-300">
                  MC: ${m.latestFile.gameVersions.slice(0, 3).join(', ')}
                </span>
              ` : ''}
              ${(m.categories || []).slice(0, 2).map(c => `
                <span class="bg-white/5 px-2 py-0.5 rounded-md text-slate-400">${this.escapeHtml(c.name)}</span>
              `).join('')}
            </div>
          </div>

          <div class="pt-3 border-t border-white/10 flex items-center gap-2">
            ${m.websiteUrl ? `
              <a href="${m.websiteUrl}" target="_blank" class="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition" title="View on CurseForge">
                <i data-lucide="external-link" class="w-4 h-4"></i>
              </a>
            ` : ''}
            <button onclick="marketplace.openCurseForgeWorldInstallModal('${m.id}', '${this.escapeHtml(m.name)}')" class="btn-cyber flex-1 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow">
              <i data-lucide="download" class="w-4 h-4"></i> 1-Click Install
            </button>
          </div>
        </div>
      `).join('');

      // Update pagination bar
      const pBar = document.getElementById('cf-world-pagination-bar');
      const pInfo = document.getElementById('cf-page-info');
      const prevBtn = document.getElementById('cf-prev-btn');
      const nextBtn = document.getElementById('cf-next-btn');

      if (pBar && pInfo) {
        pBar.classList.remove('hidden');
        const total = this.curseforgeWorldHits;
        const page = this.curseforgeWorldPage || 1;
        const start = total > 0 ? (page - 1) * 20 + 1 : 0;
        const end = Math.min(page * 20, total);
        const totalPages = Math.max(1, Math.ceil(total / 20));
        pInfo.innerHTML = `Page <span class="text-amber-400 font-bold">${page}</span> of <span class="font-bold text-white">${totalPages}</span> <span class="text-slate-500">(${start}-${end} of ${total} maps)</span>`;
        if (prevBtn) prevBtn.disabled = page <= 1;
        if (nextBtn) nextBtn.disabled = page >= totalPages || items.length < 20;
      }

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      grid.innerHTML = `
        <div class="col-span-full py-12 text-center text-rose-400 space-y-2">
          <p class="font-bold">Error loading CurseForge maps</p>
          <p class="text-xs text-slate-400">${err.message}</p>
        </div>
      `;
    }
  }

  onCurseforgeWorldCategory(catId) {
    this.curseforgeWorldCategory = catId;
    this.curseforgeWorldPage = 1;
    const catBtns = document.querySelectorAll('.cf-category-btn');
    catBtns.forEach(btn => {
      const match = btn.getAttribute('data-cat-id') === String(catId);
      if (match) {
        btn.className = 'cf-category-btn px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 bg-amber-500 text-black shadow-md shadow-amber-500/20';
      } else {
        btn.className = 'cf-category-btn px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10';
      }
    });
    this.fetchCurseforgeWorlds();
  }

  prevCurseforgeWorldPage() {
    if (this.curseforgeWorldPage > 1) {
      this.curseforgeWorldPage--;
      this.fetchCurseforgeWorlds();
      const el = document.getElementById('cf-worlds-grid');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  nextCurseforgeWorldPage() {
    this.curseforgeWorldPage++;
    this.fetchCurseforgeWorlds();
    const el = document.getElementById('cf-worlds-grid');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  onCurseforgeWorldSearch(val) {
    this.curseforgeWorldSearch = val;
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.curseforgeWorldPage = 1;
      this.fetchCurseforgeWorlds();
    }, 350);
  }

  onCurseforgeWorldVersion(val) {
    this.setGameVersion(val);
  }

  onCurseforgeWorldSort(val) {
    this.curseforgeWorldSort = val;
    this.curseforgeWorldPage = 1;
    this.fetchCurseforgeWorlds();
  }

  // --- 3. MODRINTH WORLDS SUB-TAB ---
  async renderWorldModrinthSubTab(container) {
    container.innerHTML = `
      <div class="space-y-5">
        <div class="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-slate-900/80 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <i data-lucide="compass" class="w-4 h-4 text-emerald-400"></i>
              <span class="text-xs font-black uppercase tracking-wider text-white">Modrinth Adventure & World Maps (modrinth.com)</span>
            </div>
            <span class="text-[10px] text-emerald-300 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-mono">Modrinth API v2</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div class="md:col-span-8 relative">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
              <input type="text" id="mr-world-search-input" value="${this.modrinthWorldSearch || ''}" oninput="marketplace.onModrinthWorldSearch(this.value)" placeholder="Search Modrinth world and adventure projects..." class="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-xs">
            </div>
            <div class="md:col-span-4">
              <select id="mr-world-version-select" onchange="marketplace.onModrinthWorldVersion(this.value)" class="w-full glass-input px-3 py-2.5 rounded-xl text-xs font-medium">
                ${this.renderVersionOptions(this.selectedGameVersion)}
              </select>
            </div>
          </div>

          <!-- Quick Version Filter Pills Bar ("Minecraft Version - a to z auto list filtar") -->
          ${this.renderVersionQuickPills(this.selectedGameVersion)}
        </div>

        <div id="mr-worlds-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div class="col-span-full py-12 text-center text-slate-400 space-y-2">
            <div class="animate-spin inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            <p class="text-xs">Fetching world projects from Modrinth...</p>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.fetchModrinthWorlds();
  }

  async fetchModrinthWorlds() {
    const grid = document.getElementById('mr-worlds-grid');
    if (!grid) return;

    try {
      const ver = this.selectedGameVersion || '';
      const params = new URLSearchParams({
        query: this.modrinthWorldSearch || 'map',
        projectType: 'datapack',
        limit: 18,
        offset: 0
      });
      if (ver) params.append('gameVersion', ver);

      const res = await app.api(`/api/marketplace/search?${params.toString()}`);
      const projects = res.projects || [];

      if (projects.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full py-16 text-center text-slate-400 space-y-2">
            <i data-lucide="package-search" class="w-10 h-10 mx-auto text-slate-500"></i>
            <p class="font-bold text-white">No Modrinth world projects found</p>
            <p class="text-xs text-slate-500">Try switching to CurseForge Worlds or Curated Maps.</p>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      grid.innerHTML = projects.map(p => `
        <div class="glass-card p-5 rounded-3xl border border-white/10 hover:border-emerald-500/40 transition flex flex-col justify-between space-y-3 group shadow-lg">
          <div class="space-y-2.5">
            <div class="flex items-start gap-3">
              <img src="${p.iconUrl || '/assets/favicon.svg'}" onerror="this.src='/assets/favicon.svg'" alt="${this.escapeHtml(p.title)}" class="w-12 h-12 rounded-2xl object-cover bg-slate-900 border border-white/10 shrink-0 group-hover:scale-105 transition-transform">
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-1">
                  <h5 class="font-bold text-sm text-white truncate group-hover:text-emerald-300 transition-colors" title="${this.escapeHtml(p.title)}">
                    ${this.escapeHtml(p.title)}
                  </h5>
                  <span class="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">Modrinth</span>
                </div>
                <p class="text-[11px] text-slate-400 truncate">By ${this.escapeHtml(p.author || 'Creator')}</p>
              </div>
            </div>

            <p class="text-xs text-slate-300 line-clamp-2 leading-relaxed h-8">
              ${this.escapeHtml(p.description || '')}
            </p>

            <div class="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
              <span class="bg-black/40 px-2 py-0.5 rounded-md border border-white/5 flex items-center gap-1">
                <i data-lucide="download" class="w-3 h-3 text-emerald-400"></i> ${this.formatDownloads(p.downloads)}
              </span>
              <span class="bg-black/40 px-2 py-0.5 rounded-md border border-white/5 flex items-center gap-1">
                <i data-lucide="heart" class="w-3 h-3 text-rose-400"></i> ${this.formatDownloads(p.follows)}
              </span>
            </div>
          </div>

          <div class="pt-3 border-t border-white/10 flex items-center gap-2">
            <button onclick="marketplace.quickInstall('${p.slug}')" class="btn-cyber flex-1 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow">
              <i data-lucide="download" class="w-4 h-4"></i> 1-Click Install
            </button>
          </div>
        </div>
      `).join('');

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      grid.innerHTML = `<p class="col-span-full py-12 text-center text-rose-400">${err.message}</p>`;
    }
  }

  onModrinthWorldSearch(val) {
    this.modrinthWorldSearch = val;
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.fetchModrinthWorlds();
    }, 350);
  }

  onModrinthWorldVersion(val) {
    this.setGameVersion(val);
  }

  // --- 4. CURATED FAST MAPS SUB-TAB ---
  async renderWorldCuratedSubTab(container) {
    container.innerHTML = `
      <div class="glass-panel p-10 rounded-3xl border border-white/10 text-center space-y-3">
        <div class="animate-spin inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full"></div>
        <p class="text-sm font-semibold text-slate-300">Loading Curated World Maps & Utilities...</p>
      </div>
    `;

    try {
      const res = await app.api('/api/marketplace/maps');
      const maps = res.maps || [];

      container.innerHTML = `
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-base font-black text-white flex items-center gap-2">
                <i data-lucide="sparkles" class="w-4 h-4 text-cyan-400"></i> Popular Curated Maps & Templates
              </h4>
              <p class="text-xs text-slate-400">Battle-tested Minecraft world saves ready to extract and play with 1 click.</p>
            </div>
            <span class="text-xs bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full font-mono font-bold">${maps.length}</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${maps.map(m => `
              <div class="glass-panel p-5 rounded-3xl border border-white/10 bg-gradient-to-b ${m.bannerColor || 'from-slate-800/40 to-slate-900/60'} hover:border-cyan-500/40 transition flex flex-col justify-between gap-4 shadow-lg group">
                <div class="space-y-3">
                  <div class="flex items-start justify-between gap-2">
                    <div class="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                      ${m.icon || '🗺️'}
                    </div>
                    <div class="flex flex-col items-end gap-1">
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/40 text-cyan-300 border border-white/10">
                        ${this.escapeHtml(m.tag || 'Map')}
                      </span>
                      <span class="text-[10px] text-slate-400 font-mono">${m.sizeFormatted || ''}</span>
                    </div>
                  </div>

                  <div>
                    <h5 class="font-bold text-base text-white group-hover:text-cyan-300 transition-colors">
                      ${this.escapeHtml(m.title)}
                    </h5>
                    <p class="text-[11px] text-slate-400 font-medium">By ${this.escapeHtml(m.author || 'Community')}</p>
                  </div>

                  <p class="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    ${this.escapeHtml(m.description)}
                  </p>

                  <div class="pt-1 flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <span class="bg-black/30 px-2 py-0.5 rounded border border-white/5">
                      Minecraft: <strong class="text-slate-200">${m.version || '1.20+'}</strong>
                    </span>
                  </div>
                </div>

                <div class="pt-3 border-t border-white/10 flex items-center gap-2">
                  <button onclick="marketplace.openMapInstallModal('${m.id}', '${this.escapeHtml(m.title)}', '${m.sizeFormatted || ''}')" class="btn-cyber flex-1 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg">
                    <i data-lucide="download" class="w-4 h-4"></i> 1-Click Install
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<p class="text-rose-400 text-center py-10">${err.message}</p>`;
    }
  }

  // --- 5. DIRECT URL (.ZIP) INSTALLER SUB-TAB ---
  async renderWorldDirectSubTab(container) {
    container.innerHTML = `
      <div class="glass-panel p-6 rounded-3xl border border-indigo-500/30 bg-slate-900/90 shadow-xl space-y-6 max-w-2xl mx-auto">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <i data-lucide="link" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-base font-bold text-white">Direct URL (.zip) World Installer</h4>
            <p class="text-xs text-slate-400">Download and extract any world archive from Mediafire, Planet Minecraft, GitHub, or direct server links.</p>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">Direct Download Link (.zip) *</label>
            <input type="url" id="mp-direct-world-url" placeholder="https://example.com/downloads/epic_adventure_world.zip" required class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono">
            <p class="text-[11px] text-slate-400 mt-1">Must be a direct link ending in .zip or returning an application/zip stream.</p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">Custom World Name (Optional)</label>
            <input type="text" id="mp-direct-world-name" placeholder="epic_adventure" class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono">
            <p class="text-[11px] text-slate-400 mt-1">Directory name on the server. Leave blank to derive from URL.</p>
          </div>

          <div class="pt-1">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="mp-direct-set-active" checked class="rounded bg-slate-800 border-white/20 text-indigo-500 focus:ring-0">
              <span class="text-xs text-indigo-300 font-semibold">Automatically set as Active World (level-name) in server.properties</span>
            </label>
          </div>

          <div class="pt-2">
            <button onclick="marketplace.installFromDirectUrl()" id="mp-direct-url-btn" class="btn-cyber w-full py-3 rounded-xl text-xs font-bold shadow-lg flex items-center justify-center gap-2">
              <i data-lucide="download" class="w-4 h-4"></i> Download & Install World
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // --- WORLD MANAGEMENT ACTIONS & MODALS ---

  // Set Active World
  async activateServerWorld(worldName) {
    if (!this.currentServerId) return;
    try {
      app.toast(`Setting "${worldName}" as active world...`, 'info');
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds/activate`, {
        method: 'POST',
        body: JSON.stringify({ worldName })
      });
      if (!res.success) throw new Error(res.error);
      app.toast(`✅ Active world set to "${worldName}"! Restart server to load it.`, 'success');
      await this.refreshWorldView();
      if (window.worldManager && worldManager.currentServerId == this.currentServerId) {
        await worldManager.loadWorlds();
      }
    } catch (err) {
      app.toast(`Failed to activate world: ${err.message}`, 'error');
    }
  }

  // Download World Backup (.zip)
  downloadServerWorld(worldName) {
    if (!this.currentServerId) return;
    const token = app.token || '';
    const url = `/api/servers/${this.currentServerId}/worlds/${encodeURIComponent(worldName)}/download?token=${encodeURIComponent(token)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${worldName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    app.toast(`Preparing world archive for "${worldName}"... Download will begin shortly.`, 'info');
  }

  // Delete World
  async deleteServerWorld(worldName) {
    if (!this.currentServerId) return;
    const ok = await app.confirm({
      tag: 'DELETE WORLD',
      tagIcon: 'globe',
      title: 'Delete World',
      badge: window.location.host,
      message: `Are you sure you want to permanently DELETE world "${worldName}"?`,
      subtext: 'This action CANNOT be undone! All region files, structures and player data will be erased.',
      icon: 'trash-2',
      confirmIcon: 'trash-2',
      confirmText: 'Delete World',
      type: 'danger'
    });
    if (!ok) return;

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds/delete`, {
        method: 'POST',
        body: JSON.stringify({ worldName })
      });
      if (!res.success) throw new Error(res.error);
      app.toast(`🗑️ World "${worldName}" deleted.`, 'success');
      await this.refreshWorldView();
      if (window.worldManager && worldManager.currentServerId == this.currentServerId) {
        await worldManager.loadWorlds();
      }
    } catch (err) {
      app.toast(`Failed to delete world: ${err.message}`, 'error');
    }
  }

  // Reset / Regenerate World
  async resetServerWorld(worldName) {
    if (!this.currentServerId) return;
    const ok = await app.confirm({
      tag: 'RESET WORLD',
      tagIcon: 'refresh-cw',
      title: 'Reset World',
      badge: window.location.host,
      message: `Are you sure you want to RESET world "${worldName}"?`,
      subtext: 'All chunk modifications, buildings, and region files will be deleted and regenerated afresh.',
      icon: 'refresh-cw',
      confirmIcon: 'refresh-cw',
      confirmText: 'Reset World',
      type: 'warning'
    });
    if (!ok) return;

    try {
      app.toast(`Resetting world "${worldName}"...`, 'info');
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds/reset`, {
        method: 'POST',
        body: JSON.stringify({ worldName })
      });
      if (!res.success) throw new Error(res.error);
      app.toast(`🔄 World "${worldName}" reset successfully!`, 'success');
      await this.refreshWorldView();
      if (window.worldManager && worldManager.currentServerId == this.currentServerId) {
        await worldManager.loadWorlds();
      }
    } catch (err) {
      app.toast(`Failed to reset world: ${err.message}`, 'error');
    }
  }

  // Open Create World Modal
  async openCreateWorldModal() {
    if (!this.currentServerId) await this.ensureActiveServerId();
    if (!this.currentServerId) {
      app.toast('Please select a target server first.', 'warning');
      return;
    }

    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div id="mp-create-world-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="glass-panel w-full max-w-lg rounded-3xl border border-teal-500/30 p-6 space-y-5 shadow-2xl bg-slate-900/95 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <i data-lucide="plus-circle" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-base font-black text-white">Create New Minecraft World</h3>
                <p class="text-[11px] text-slate-400">Generate a brand new world save with custom seeds & generators.</p>
              </div>
            </div>
            <button onclick="marketplace.closeModal('mp-create-world-modal')" class="text-slate-400 hover:text-white transition">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form onsubmit="marketplace.handleCreateWorld(event)" class="space-y-4 text-xs">
            <div>
              <label class="block font-semibold text-slate-300 mb-1.5">World Folder Name *</label>
              <input type="text" id="create-world-name" placeholder="smp_world" required class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono" pattern="[a-zA-Z0-9_\\-]+" title="Letters, numbers, underscores and hyphens only">
              <p class="text-[10px] text-slate-500 mt-1">Directory name for the new world save.</p>
            </div>

            <div>
              <label class="block font-semibold text-slate-300 mb-1.5">World Generation Seed (Optional)</label>
              <input type="text" id="create-world-seed" placeholder="Leave empty for random seed" class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-slate-300 mb-1.5">Generator Preset</label>
                <select id="create-world-type" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-medium">
                  <option value="minecraft:normal">Default Normal</option>
                  <option value="minecraft:flat">Superflat</option>
                  <option value="minecraft:large_biomes">Large Biomes</option>
                  <option value="minecraft:amplified">Amplified</option>
                  <option value="buffet">Buffet</option>
                </select>
              </div>

              <div>
                <label class="block font-semibold text-slate-300 mb-1.5">Default Gamemode</label>
                <select id="create-world-gamemode" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-medium">
                  <option value="survival">Survival</option>
                  <option value="creative">Creative</option>
                  <option value="adventure">Adventure</option>
                  <option value="spectator">Spectator</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-slate-300 mb-1.5">Difficulty</label>
                <select id="create-world-difficulty" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-medium">
                  <option value="easy">Easy</option>
                  <option value="normal" selected>Normal</option>
                  <option value="hard">Hard</option>
                  <option value="peaceful">Peaceful</option>
                </select>
              </div>

              <div class="pt-6">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="create-world-structures" checked class="rounded bg-slate-800 border-white/20 text-teal-500">
                  <span class="text-xs text-slate-300">Generate Structures</span>
                </label>
              </div>
            </div>

            <div class="pt-2 border-t border-white/10 space-y-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="create-world-set-active" checked class="rounded bg-slate-800 border-white/20 text-teal-500">
                <span class="text-xs text-teal-300 font-semibold">Set as Active World in server.properties</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="create-world-hardcore" class="rounded bg-slate-800 border-white/20 text-rose-500">
                <span class="text-xs text-rose-300 font-semibold">Hardcore Mode (Permadeath)</span>
              </label>
            </div>

            <div class="pt-3 border-t border-white/10 flex justify-end gap-2">
              <button type="button" onclick="marketplace.closeModal('mp-create-world-modal')" class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition">
                Cancel
              </button>
              <button type="submit" id="create-world-submit-btn" class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
                <i data-lucide="check" class="w-4 h-4"></i> Create & Initialize World
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  async handleCreateWorld(e) {
    e.preventDefault();
    const btn = document.getElementById('create-world-submit-btn');
    const name = document.getElementById('create-world-name')?.value?.trim();
    const seed = document.getElementById('create-world-seed')?.value?.trim() || '';
    const levelType = document.getElementById('create-world-type')?.value || 'minecraft:normal';
    const gameMode = document.getElementById('create-world-gamemode')?.value || 'survival';
    const difficulty = document.getElementById('create-world-difficulty')?.value || 'normal';
    const generateStructures = document.getElementById('create-world-structures')?.checked !== false;
    const setActive = document.getElementById('create-world-set-active')?.checked !== false;
    const hardcore = document.getElementById('create-world-hardcore')?.checked === true;

    if (!name) {
      app.toast('World name is required.', 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1.5"></span> Creating World...`;
    }

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds/create`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          seed,
          levelType,
          gameMode,
          difficulty,
          generateStructures,
          setActive,
          hardcore
        })
      });

      if (!res.success) throw new Error(res.error);
      app.toast(`✅ World "${name}" created successfully!`, 'success');
      this.closeModal('mp-create-world-modal');
      await this.refreshWorldView();
      if (window.worldManager && worldManager.currentServerId == this.currentServerId) {
        await worldManager.loadWorlds();
      }
    } catch (err) {
      app.toast(`World creation failed: ${err.message}`, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // Open Clone World Modal
  openCloneWorldModal(sourceWorld) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div id="mp-clone-world-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="glass-panel w-full max-w-md rounded-3xl border border-purple-500/30 p-6 space-y-5 shadow-2xl bg-slate-900/95">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <i data-lucide="copy" class="w-5 h-5"></i>
              </div>
              <h3 class="text-base font-bold text-white">Duplicate / Clone World</h3>
            </div>
            <button onclick="marketplace.closeModal('mp-clone-world-modal')" class="text-slate-400 hover:text-white transition">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form onsubmit="marketplace.handleCloneWorld(event, '${this.escapeHtml(sourceWorld)}')" class="space-y-4 text-xs">
            <div class="glass-panel p-3 rounded-xl border border-white/5 bg-slate-950/40">
              <span class="text-[10px] uppercase font-bold text-slate-400 block">Source World Save</span>
              <p class="font-bold text-white text-sm font-mono mt-0.5">${this.escapeHtml(sourceWorld)}</p>
            </div>

            <div>
              <label class="block font-semibold text-slate-300 mb-1.5">New Target World Name *</label>
              <input type="text" id="clone-target-name" value="${this.escapeHtml(sourceWorld)}_copy" required class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono" pattern="[a-zA-Z0-9_\\-]+">
            </div>

            <div class="pt-3 border-t border-white/10 flex justify-end gap-2">
              <button type="button" onclick="marketplace.closeModal('mp-clone-world-modal')" class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition">
                Cancel
              </button>
              <button type="submit" id="clone-world-submit-btn" class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
                <i data-lucide="check" class="w-4 h-4"></i> Duplicate World
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  async handleCloneWorld(e, sourceWorld) {
    e.preventDefault();
    const btn = document.getElementById('clone-world-submit-btn');
    const targetWorld = document.getElementById('clone-target-name')?.value?.trim();

    if (!targetWorld) return;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1.5"></span> Copying Chunks...`;
    }

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds/clone`, {
        method: 'POST',
        body: JSON.stringify({ sourceWorld, targetWorld })
      });
      if (!res.success) throw new Error(res.error);
      app.toast(`✅ World "${sourceWorld}" cloned as "${targetWorld}"!`, 'success');
      this.closeModal('mp-clone-world-modal');
      await this.refreshWorldView();
      if (window.worldManager && worldManager.currentServerId == this.currentServerId) {
        await worldManager.loadWorlds();
      }
    } catch (err) {
      app.toast(`Clone failed: ${err.message}`, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // Open Upload World Modal
  async openUploadWorldModal() {
    if (!this.currentServerId) await this.ensureActiveServerId();
    if (!this.currentServerId) {
      app.toast('Please select a target server first.', 'warning');
      return;
    }
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div id="mp-upload-world-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="glass-panel w-full max-w-md rounded-3xl border border-cyan-500/30 p-6 space-y-5 shadow-2xl bg-slate-900/95">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <i data-lucide="upload-cloud" class="w-5 h-5"></i>
              </div>
              <h3 class="text-base font-bold text-white">Import World (.zip)</h3>
            </div>
            <button onclick="marketplace.closeModal('mp-upload-world-modal')" class="text-slate-400 hover:text-white transition">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form onsubmit="marketplace.handleUploadWorld(event)" class="space-y-4 text-xs">
            <div>
              <label class="block font-semibold text-slate-300 mb-1.5">Select World ZIP Archive *</label>
              <input type="file" id="upload-world-file" accept=".zip" required class="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30">
              <p class="text-[10px] text-slate-500 mt-1">Accepts standard Minecraft world saves containing level.dat and region folders.</p>
            </div>

            <div>
              <label class="block font-semibold text-slate-300 mb-1.5">World Name (Optional)</label>
              <input type="text" id="upload-world-name" placeholder="Leave empty to use zip name" class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono">
            </div>

            <div class="pt-1">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="upload-world-set-active" checked class="rounded bg-slate-800 border-white/20 text-cyan-500">
                <span class="text-xs text-cyan-300 font-semibold">Set as Active World in server.properties</span>
              </label>
            </div>

            <div class="pt-3 border-t border-white/10 flex justify-end gap-2">
              <button type="button" onclick="marketplace.closeModal('mp-upload-world-modal')" class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition">
                Cancel
              </button>
              <button type="submit" id="upload-world-submit-btn" class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
                <i data-lucide="upload" class="w-4 h-4"></i> Upload & Extract World
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  async handleUploadWorld(e) {
    e.preventDefault();
    const btn = document.getElementById('upload-world-submit-btn');
    const fileInput = document.getElementById('upload-world-file');
    const nameInput = document.getElementById('upload-world-name');
    const activeInput = document.getElementById('upload-world-set-active');

    const file = fileInput?.files?.[0];
    if (!file) {
      app.toast('Please select a .zip world archive.', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (nameInput?.value?.trim()) formData.append('worldName', nameInput.value.trim());
    formData.append('setActive', activeInput?.checked !== false ? 'true' : 'false');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1.5"></span> Uploading & Unpacking...`;
    }

    try {
      const res = await fetch(`/api/servers/${this.currentServerId}/worlds/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${app.token || ''}`
        },
        body: formData
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      app.toast(`✅ World uploaded and extracted successfully!`, 'success');
      this.closeModal('mp-upload-world-modal');
      await this.refreshWorldView();
      if (window.worldManager && worldManager.currentServerId == this.currentServerId) {
        await worldManager.loadWorlds();
      }
    } catch (err) {
      app.toast(`Upload failed: ${err.message}`, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // Open CurseForge World Install Modal
  async openCurseForgeWorldInstallModal(modId, modTitle) {
    if (!this.currentServerId) await this.ensureActiveServerId();
    if (!this.currentServerId) {
      app.toast('Please select a target server first.', 'warning');
      return;
    }

    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div id="mp-cf-world-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="glass-panel w-full max-w-md rounded-3xl border border-amber-500/30 p-6 space-y-5 shadow-2xl bg-slate-900/95">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <i data-lucide="flame" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">Install CurseForge Map</h3>
                <span class="text-[10px] text-amber-300 font-mono">1-Click Direct Download</span>
              </div>
            </div>
            <button onclick="marketplace.closeModal('mp-cf-world-modal')" class="text-slate-400 hover:text-white transition">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form onsubmit="marketplace.handleInstallCurseForgeWorld(event, '${modId}')" class="space-y-4 text-xs">
            <div class="glass-panel p-3.5 rounded-2xl border border-white/10 bg-slate-950/40">
              <span class="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">CurseForge Map</span>
              <p class="font-bold text-white text-sm mt-0.5">${this.escapeHtml(modTitle)}</p>
            </div>

            <div>
              <label class="block font-semibold text-slate-300 mb-1.5">World Folder Name *</label>
              <input type="text" id="cf-world-folder-name" value="${modTitle.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 24)}" required class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono" pattern="[a-zA-Z0-9_\\-]+">
              <p class="text-[10px] text-slate-500 mt-1">Directory where world will be saved.</p>
            </div>

            <div class="pt-1">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="cf-world-set-active" checked class="rounded bg-slate-800 border-white/20 text-amber-500">
                <span class="text-xs text-amber-300 font-semibold">Set as Active World in server.properties</span>
              </label>
            </div>

            <div class="pt-3 border-t border-white/10 flex justify-end gap-2">
              <button type="button" onclick="marketplace.closeModal('mp-cf-world-modal')" class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition">
                Cancel
              </button>
              <button type="submit" id="cf-world-submit-btn" class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
                <i data-lucide="download" class="w-4 h-4"></i> Download & Deploy Map
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  async handleInstallCurseForgeWorld(e, modId) {
    e.preventDefault();
    const btn = document.getElementById('cf-world-submit-btn');
    const folderInput = document.getElementById('cf-world-folder-name');
    const activeInput = document.getElementById('cf-world-set-active');

    const customName = folderInput?.value?.trim() || '';
    const setActive = activeInput?.checked !== false;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1.5"></span> Fetching from CurseForge...`;
    }

    try {
      const res = await app.api('/api/marketplace/curseforge/install', {
        method: 'POST',
        body: JSON.stringify({
          serverId: this.currentServerId,
          modId,
          customName,
          setActive
        })
      });

      if (!res.success) throw new Error(res.error);
      app.toast(`✅ CurseForge world installed as "${res.worldName || customName}"!`, 'success');
      this.closeModal('mp-cf-world-modal');
      await this.refreshWorldView();
      if (window.worldManager && worldManager.currentServerId == this.currentServerId) {
        await worldManager.loadWorlds();
      }
    } catch (err) {
      app.toast(`CurseForge map install failed: ${err.message}`, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // Open Curated Map Install Modal
  async openMapInstallModal(mapId, mapTitle, mapSize) {
    if (!this.currentServerId) await this.ensureActiveServerId();
    if (!this.currentServerId) {
      app.toast('Please select or open a server first to install maps.', 'warning');
      return;
    }

    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div id="map-install-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="glass-panel w-full max-w-md rounded-3xl border border-teal-500/30 p-6 space-y-5 shadow-2xl bg-slate-900/95">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <i data-lucide="download" class="w-5 h-5"></i>
              </div>
              <h3 class="text-lg font-bold text-white">Install World Map</h3>
            </div>
            <button onclick="marketplace.closeModal('map-install-modal')" class="text-slate-400 hover:text-white transition">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form onsubmit="marketplace.handleInstallMap(event, '${mapId}')" class="space-y-4">
            <div class="glass-panel p-3.5 rounded-2xl border border-white/10 bg-slate-950/40 space-y-1">
              <span class="text-[10px] uppercase font-bold text-teal-400 block tracking-wider">Target Map</span>
              <p class="font-bold text-white text-sm">${this.escapeHtml(mapTitle)}</p>
              ${mapSize ? `<span class="text-[11px] text-slate-400 font-mono">Download Size: ${mapSize}</span>` : ''}
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">World Folder Name *</label>
              <input type="text" id="install-map-folder-name" value="${mapId.replace(/[^a-zA-Z0-9_]/g, '_')}" required class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono" pattern="[a-zA-Z0-9_\\-]+" title="Only letters, numbers, underscores, and hyphens">
              <p class="text-[11px] text-slate-400 mt-1">Directory where map will be extracted.</p>
            </div>

            <div class="pt-1">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="install-map-set-active" checked class="rounded bg-slate-800 border-white/20 text-teal-500 focus:ring-0">
                <span class="text-xs text-teal-300 font-semibold">Set as Active World (level-name) in server.properties</span>
              </label>
            </div>

            <div class="pt-3 border-t border-white/10 flex justify-end gap-2">
              <button type="button" onclick="marketplace.closeModal('map-install-modal')" class="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/10 transition">
                Cancel
              </button>
              <button type="submit" id="install-map-submit-btn" class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
                <i data-lucide="check" class="w-4 h-4"></i> Deploy Map to Server
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  async handleInstallMap(e, mapId) {
    e.preventDefault();
    const btn = document.getElementById('install-map-submit-btn');
    const folderInput = document.getElementById('install-map-folder-name');
    const activeInput = document.getElementById('install-map-set-active');

    const customName = folderInput?.value?.trim() || mapId;
    const setActive = activeInput?.checked !== false;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span> Deploying Map...`;
    }

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds/install-map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapId, customName, setActive })
      });

      app.toast(res.message || 'World map installed successfully!', 'success');
      this.closeModal('map-install-modal');
      await this.refreshWorldView();
      if (window.worldManager && worldManager.currentServerId == this.currentServerId) {
        await worldManager.loadWorlds();
      }
    } catch (err) {
      app.toast(`Map install failed: ${err.message}`, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async installFromDirectUrl() {
    if (!this.currentServerId) await this.ensureActiveServerId();
    if (!this.currentServerId) {
      app.toast('Please select or open a server first.', 'warning');
      return;
    }

    const urlInput = document.getElementById('mp-direct-world-url');
    const nameInput = document.getElementById('mp-direct-world-name');
    const activeInput = document.getElementById('mp-direct-set-active');
    const btn = document.getElementById('mp-direct-url-btn');

    const downloadUrl = urlInput?.value?.trim();
    const customName = nameInput?.value?.trim() || '';
    const setActive = activeInput ? activeInput.checked !== false : true;

    if (!downloadUrl) {
      app.toast('Please paste a direct download URL (.zip).', 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full mr-1.5"></span> Downloading World...`;
    }

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds/install-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadUrl, customName, setActive })
      });

      app.toast(res.message || 'World downloaded & installed successfully!', 'success');
      if (urlInput) urlInput.value = '';
      if (nameInput) nameInput.value = '';

      await this.refreshWorldView();
      if (window.worldManager && worldManager.currentServerId == this.currentServerId) {
        await worldManager.loadWorlds();
      }
    } catch (err) {
      app.toast(`Direct install error: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="download" class="w-4 h-4"></i> Download & Install World`;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  // Render Playit.gg Zero-Port Tunnel Manager View
  async renderPlayitView() {
    const container = document.getElementById('marketplace-view-content');
    if (!container) return;

    if (!this.currentServerId) {
      container.innerHTML = `
        <div class="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-4 max-w-lg mx-auto">
          <div class="w-16 h-16 rounded-3xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 shadow-xl shadow-indigo-500/20">
            <i data-lucide="network" class="w-8 h-8"></i>
          </div>
          <h3 class="text-xl font-bold text-white">Select a Target Server</h3>
          <p class="text-xs text-slate-300">
            Please select a Minecraft server from the selector above to manage its Playit.gg tunnel.
          </p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = `
      <div class="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-3">
        <div class="animate-spin inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        <p class="text-sm font-semibold text-slate-300">Detecting Playit.gg Tunnel & Status...</p>
      </div>
    `;

    try {
      const res = await app.api(`/api/marketplace/playit/status?serverId=${this.currentServerId}`);
      if (!res.success || !res.status) {
        throw new Error(res.error || 'Failed to retrieve Playit tunnel status');
      }
      this.renderPlayitContent(container, res.status);
    } catch (err) {
      container.innerHTML = `
        <div class="glass-panel p-10 rounded-3xl border border-rose-500/30 text-center space-y-4 max-w-xl mx-auto">
          <div class="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <i data-lucide="alert-circle" class="w-7 h-7"></i>
          </div>
          <h4 class="text-lg font-bold text-white">Failed to Load Playit Tunnel Status</h4>
          <p class="text-xs text-rose-300">${this.escapeHtml(err.message)}</p>
          <button onclick="marketplace.renderPlayitView()" class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-bold">
            <i data-lucide="rotate-ccw" class="w-4 h-4 inline mr-1"></i> Try Again
          </button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  }

  // Render Playit Details, Connection Domain, Claim Link, & Settings
  renderPlayitContent(container, status) {
    const isInstalled = Boolean(status.installed);
    const hasSecretKey = Boolean(status.hasSecretKey);
    const statusType = status.status; // 'active' | 'needs_claim' | 'installed' | 'not_installed'
    const tunnelDomain = status.tunnelDomain;
    const claimUrl = status.claimUrl;
    const jar = status.jar;

    let statusBadge = '';
    if (statusType === 'active') {
      statusBadge = `
        <span class="px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-lg shadow-emerald-500/10">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Tunnel Online & Active
        </span>
      `;
    } else if (statusType === 'needs_claim') {
      statusBadge = `
        <span class="px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-lg shadow-amber-500/10">
          <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> Claim Required
        </span>
      `;
    } else if (isInstalled) {
      statusBadge = `
        <span class="px-3.5 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5">
          <i data-lucide="info" class="w-3.5 h-3.5"></i> Installed (Waiting for Server Start)
        </span>
      `;
    } else {
      statusBadge = `
        <span class="px-3.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-white/10 flex items-center gap-1.5">
          <i data-lucide="circle" class="w-3.5 h-3.5"></i> Not Installed
        </span>
      `;
    }

    const defaultTargetType = (this.serverData?.jar_type && ['fabric', 'forge', 'neoforge', 'quilt'].includes(this.serverData.jar_type.toLowerCase())) ? 'mod' : 'plugin';

    container.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <!-- Hero Header Card -->
        <div class="glass-panel p-6 rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/70 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div class="flex items-start gap-4">
            <div class="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-xl shadow-indigo-500/20">
              <i data-lucide="network" class="w-7 h-7"></i>
            </div>
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-[10px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-3 py-0.5 rounded-full border border-indigo-500/30">
                  Zero Port Forwarding
                </span>
                <span class="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Official Latest Release
                </span>
                ${statusBadge}
              </div>
              <h3 class="text-2xl font-black text-white flex items-center gap-2">
                Playit.gg Tunnel Manager
              </h3>
              <p class="text-xs text-slate-300 max-w-xl">
                Allow anyone in the world to join your Minecraft server without port forwarding, static IPs, router access, or VPNs.
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
            <button onclick="marketplace.renderPlayitView()" class="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 shadow transition flex items-center gap-1.5">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh Status
            </button>
            ${isInstalled ? `
              <button onclick="marketplace.uninstallPlayit()" class="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition flex items-center gap-1.5">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Uninstall
              </button>
            ` : ''}
          </div>
        </div>

        ${tunnelDomain ? `
          <!-- Active Public Domain Banner (No Port Forwarding Address) -->
          <div class="glass-panel p-6 rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-indigo-950/30 shadow-2xl space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                <span class="text-xs font-black uppercase tracking-wider text-emerald-400">Public Player Connection Address</span>
              </div>
              <span class="text-[11px] text-slate-300 font-mono">Ready for Minecraft Java / Bedrock</span>
            </div>

            <div class="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-950/80 p-4 rounded-2xl border border-emerald-500/20">
              <div class="space-y-0.5 text-center md:text-left">
                <div class="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Direct Join Domain</div>
                <div class="text-xl sm:text-2xl font-mono font-black tracking-wide select-all text-emerald-300">
                  ${this.escapeHtml(tunnelDomain)}
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <button onclick="marketplace.copyAddress('${this.escapeHtml(tunnelDomain)}')" class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                  <i data-lucide="copy" class="w-4 h-4"></i> Copy IP Address
                </button>
              </div>
            </div>

            <p class="text-xs text-slate-300 flex items-center gap-1.5">
              <i data-lucide="check-circle" class="w-4 h-4 text-emerald-400 shrink-0"></i>
              Share this domain with your players! They can paste it directly into their Minecraft client server address bar.
            </p>
          </div>
        ` : ''}

        ${claimUrl ? `
          <!-- Claim Required Alert Card -->
          <div class="glass-panel p-6 rounded-3xl border border-amber-500/50 bg-gradient-to-r from-amber-950/50 via-slate-900/90 to-amber-950/20 shadow-2xl space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <i data-lucide="alert-triangle" class="w-5 h-5"></i>
              </div>
              <div>
                <h4 class="text-base font-bold text-white">Playit Account Claim Required</h4>
                <p class="text-xs text-amber-200/90">
                  Your server generated a claim URL. Link this tunnel to your free Playit.gg account to unlock your public address.
                </p>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <a href="${claimUrl}" target="_blank" rel="noopener noreferrer" class="btn-cyber-purple px-6 py-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20">
                <i data-lucide="external-link" class="w-4 h-4"></i> Click Here to Claim Tunnel on Playit.gg
              </a>
              <button onclick="marketplace.renderPlayitView()" class="px-4 py-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition flex items-center justify-center gap-2">
                <i data-lucide="refresh-cw" class="w-4 h-4"></i> Check Status After Claiming
              </button>
            </div>
            <p class="text-[11px] text-slate-400 font-mono">
              Claim URL: <a href="${claimUrl}" target="_blank" class="text-indigo-400 underline break-all">${this.escapeHtml(claimUrl)}</a>
            </p>
          </div>
        ` : ''}

        <!-- Main Configuration & Setup Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Left Column: Installation & Status Card (7 cols) -->
          <div class="lg:col-span-7 glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
            <div class="flex items-center justify-between border-b border-white/5 pb-3">
              <div class="flex items-center gap-2">
                <i data-lucide="box" class="w-4 h-4 text-indigo-400"></i>
                <h4 class="text-sm font-bold text-white uppercase tracking-wider">Plugin Installation & State</h4>
              </div>
              <span class="text-[11px] font-mono text-slate-400">Target Server #${this.currentServerId}</span>
            </div>

            ${isInstalled && jar ? `
              <!-- Installed Jar Details -->
              <div class="bg-slate-900/70 p-4 rounded-2xl border border-white/10 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <i data-lucide="check-circle-2" class="w-5 h-5"></i>
                    </div>
                    <div>
                      <h5 class="text-xs font-bold text-white font-mono">${this.escapeHtml(jar.fileName)}</h5>
                      <p class="text-[11px] text-slate-400 font-mono">Located in /${this.escapeHtml(jar.directory)} (${(jar.size / (1024 * 1024)).toFixed(2)} MB)</p>
                    </div>
                  </div>
                  <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Installed</span>
                </div>

                <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                  <button onclick="marketplace.installPlayit()" id="playit-install-btn" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Reinstall / Update Plugin
                  </button>
                  <button onclick="marketplace.uninstallPlayit()" class="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition flex items-center gap-1.5">
                    <i data-lucide="trash" class="w-3.5 h-3.5"></i> Remove Plugin
                  </button>
                </div>
              </div>
            ` : `
              <!-- Install Option Box -->
              <div class="bg-slate-900/70 p-5 rounded-2xl border border-indigo-500/20 space-y-4">
                <div>
                  <h5 class="text-sm font-bold text-white">1-Click Official Playit.gg Installation</h5>
                  <p class="text-xs text-slate-300 mt-1">
                    Downloads the official <code>playit-minecraft-plugin.jar</code> (Latest Release) directly into your server directory.
                  </p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Target Directory</label>
                    <select id="playit-target-type" class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs">
                      <option value="plugin" ${defaultTargetType === 'plugin' ? 'selected' : ''}>plugins/ (Paper, Purpur, Spigot, Velocity)</option>
                      <option value="mod" ${defaultTargetType === 'mod' ? 'selected' : ''}>mods/ (Fabric, Forge, NeoForge)</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Optional Secret Key</label>
                    <input type="text" id="playit-install-secret" placeholder="Paste playit secret key (optional)" class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono">
                  </div>
                </div>

                <button onclick="marketplace.installPlayit()" id="playit-install-btn" class="btn-cyber-purple w-full py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20">
                  <i data-lucide="download" class="w-4 h-4"></i> Install Playit.gg Plugin
                </button>
              </div>
            `}

            <!-- Server Startup Reminder Notice -->
            <div class="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 flex items-start gap-3">
              <i data-lucide="lightbulb" class="w-5 h-5 text-indigo-400 shrink-0 mt-0.5"></i>
              <div class="text-xs text-slate-300 space-y-1">
                <p class="font-bold text-white">Important: Restart or Start Server to Activate</p>
                <p class="text-[11px] text-slate-400">
                  After installing the plugin or updating your secret key, restart your Minecraft server from the Server Console. The plugin initializes its tunnel during startup.
                </p>
              </div>
            </div>
          </div>

          <!-- Right Column: Secret Key Configuration & Account Linking (5 cols) -->
          <div class="lg:col-span-5 glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
            <div class="flex items-center justify-between border-b border-white/5 pb-3">
              <div class="flex items-center gap-2">
                <i data-lucide="key" class="w-4 h-4 text-cyan-400"></i>
                <h4 class="text-sm font-bold text-white uppercase tracking-wider">Secret Key Configuration</h4>
              </div>
              ${hasSecretKey ? `
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Configured</span>
              ` : `
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/10">Unset</span>
              `}
            </div>

            <div class="space-y-3">
              <p class="text-xs text-slate-300 leading-relaxed">
                If you manage your tunnels through a Playit.gg account, copy your <strong>Secret Key</strong> from <a href="https://playit.gg/manage" target="_blank" class="text-indigo-400 underline font-semibold">playit.gg/manage</a> and paste it below.
              </p>

              ${hasSecretKey ? `
                <div class="bg-slate-900/80 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                  <div class="space-y-0.5">
                    <span class="text-[10px] font-bold uppercase text-slate-400">Current Saved Key:</span>
                    <p class="text-xs font-mono text-emerald-300">${this.escapeHtml(status.secretKey)}</p>
                  </div>
                  <i data-lucide="lock" class="w-4 h-4 text-emerald-400"></i>
                </div>
              ` : ''}

              <div>
                <label class="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Enter Secret Key</label>
                <div class="relative">
                  <input type="password" id="playit-secret-input" placeholder="Paste playit secret key..." class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono pr-10">
                  <button type="button" onclick="const i=document.getElementById('playit-secret-input'); i.type = i.type === 'password' ? 'text' : 'password';" class="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs">
                    <i data-lucide="eye" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>

              <button onclick="marketplace.configurePlayit()" id="playit-save-secret-btn" class="btn-cyber w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow">
                <i data-lucide="save" class="w-4 h-4"></i> Save & Bind Key to playit.toml
              </button>
            </div>

            <!-- Quick Info / Links -->
            <div class="pt-3 border-t border-white/5 space-y-2">
              <a href="https://playit.gg/manage" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition text-xs text-slate-200">
                <span class="flex items-center gap-2">
                  <i data-lucide="external-link" class="w-3.5 h-3.5 text-indigo-400"></i> Open Playit Dashboard
                </span>
                <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-400"></i>
              </a>
              <a href="https://playit.gg/support" target="_blank" rel="noopener noreferrer" class="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition text-xs text-slate-200">
                <span class="flex items-center gap-2">
                  <i data-lucide="help-circle" class="w-3.5 h-3.5 text-cyan-400"></i> Playit Help & Docs
                </span>
                <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-400"></i>
              </a>
            </div>
          </div>
        </div>

        <!-- 3-Step Setup Guide & Features Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div class="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">1</div>
            <h5 class="text-xs font-bold text-white">1-Click Install</h5>
            <p class="text-[11px] text-slate-400 leading-relaxed">
              Mpanel installs the official Playit plugin into your server plugins or mods directory automatically.
            </p>
          </div>

          <div class="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">2</div>
            <h5 class="text-xs font-bold text-white">Start Your Server</h5>
            <p class="text-[11px] text-slate-400 leading-relaxed">
              Launch your server. The plugin boots and automatically builds an encrypted tunnel with Playit's global network.
            </p>
          </div>

          <div class="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
            <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">3</div>
            <h5 class="text-xs font-bold text-white">Connect & Play</h5>
            <p class="text-[11px] text-slate-400 leading-relaxed">
              Get your custom <code class="text-emerald-300">*.joinmc.link</code> domain above and share it with your friends!
            </p>
          </div>
        </div>

        <!-- Native Linux System CLI (playit package) Box -->
        <div class="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <i data-lucide="terminal" class="w-4 h-4"></i>
              </div>
              <div>
                <h5 class="text-xs font-bold text-white uppercase tracking-wider">Native Linux System Tunnel (playit CLI)</h5>
                <p class="text-[11px] text-slate-400">Run Playit directly as a background Linux system daemon (ideal for VPS, Bedrock, and non-plugin servers)</p>
              </div>
            </div>

            ${status.systemCli && status.systemCli.installed ? `
              <span class="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shrink-0">
                <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> CLI Installed (${status.systemCli.version || 'Active'})
              </span>
            ` : `
              <span class="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-white/10 flex items-center gap-1.5 shrink-0">
                <i data-lucide="circle" class="w-3.5 h-3.5"></i> CLI Not Installed
              </span>
            `}
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between text-[11px]">
              <span class="font-bold text-slate-300">Ubuntu / Debian One-Liner Install Command:</span>
              <button onclick="marketplace.copyAddress('curl -SsL https://packages.playit.gg/keys/playit.gpg | gpg --dearmor | sudo tee /usr/share/keyrings/playit.gpg >/dev/null && sudo chmod 0644 /usr/share/keyrings/playit.gpg && sudo curl -fsSL -o /etc/apt/sources.list.d/playit.list https://packages.playit.gg/repo-files/playit-debian.list && sudo apt update && sudo apt install -y playit')" class="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold transition">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copy Commands
              </button>
            </div>
            <pre class="bg-slate-950/90 p-3.5 rounded-xl border border-white/10 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed select-all">curl -SsL https://packages.playit.gg/keys/playit.gpg | gpg --dearmor | sudo tee /usr/share/keyrings/playit.gpg >/dev/null
sudo chmod 0644 /usr/share/keyrings/playit.gpg
sudo curl -fsSL -o /etc/apt/sources.list.d/playit.list https://packages.playit.gg/repo-files/playit-debian.list
sudo apt update
sudo apt install -y playit</pre>
            <p class="text-[10px] text-slate-400">
              💡 You can also install it anytime via Mpanel CLI: <code>./menu.sh playit</code> or <code>bash menu.sh</code> (Option 8).
            </p>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  async installPlayit() {
    if (!this.currentServerId) {
      app.toast('Please select a server first.', 'warning');
      return;
    }

    const targetSelect = document.getElementById('playit-target-type');
    const secretInput = document.getElementById('playit-install-secret');
    const targetType = targetSelect ? targetSelect.value : (this.activeTab === 'mod' ? 'mod' : 'plugin');
    const secretKey = secretInput ? secretInput.value.trim() : '';

    const btn = document.getElementById('playit-install-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full mr-1.5"></span> Installing Playit Plugin...`;
    }

    try {
      const res = await app.api('/api/marketplace/playit/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: this.currentServerId,
          targetType,
          secretKey: secretKey || undefined
        })
      });

      app.toast(res.message || 'Playit.gg plugin installed successfully! Start/restart your server to launch the tunnel.', 'success');
      await this.renderPlayitView();
    } catch (err) {
      app.toast(`Installation failed: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="download" class="w-4 h-4"></i> Install Playit.gg Plugin`;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  async configurePlayit() {
    if (!this.currentServerId) {
      app.toast('Please select a server first.', 'warning');
      return;
    }

    const input = document.getElementById('playit-secret-input');
    const secretKey = input ? input.value.trim() : '';
    if (!secretKey) {
      app.toast('Please enter your Playit secret key.', 'warning');
      return;
    }

    const btn = document.getElementById('playit-save-secret-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full mr-1.5"></span> Saving...`;
    }

    try {
      const res = await app.api('/api/marketplace/playit/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: this.currentServerId,
          secretKey
        })
      });

      app.toast(res.message || 'Secret key configured successfully!', 'success');
      if (input) input.value = '';
      await this.renderPlayitView();
    } catch (err) {
      app.toast(`Failed to save secret key: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="save" class="w-4 h-4"></i> Save & Bind Key to playit.toml`;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  async uninstallPlayit() {
    if (!this.currentServerId) return;
    const ok = await app.confirm({
      tag: 'UNINSTALL PLAYIT',
      tagIcon: 'unlink',
      title: 'Uninstall Playit',
      badge: window.location.host,
      message: 'Are you sure you want to uninstall Playit.gg and remove its plugin & config from this server?',
      subtext: 'External tunneling tunnels and routing through Playit will be disconnected.',
      icon: 'unlink',
      confirmIcon: 'unlink',
      confirmText: 'Uninstall Playit',
      type: 'danger'
    });
    if (!ok) return;

    try {
      const res = await app.api('/api/marketplace/playit/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId: this.currentServerId })
      });

      app.toast(res.message || 'Playit.gg uninstalled successfully.', 'success');
      await this.renderPlayitView();
    } catch (err) {
      app.toast(`Uninstall failed: ${err.message}`, 'error');
    }
  }

  copyAddress(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        app.toast(`Copied address: ${text}`, 'success');
      }).catch(() => {
        this.copyAddressFallback(text);
      });
    } else {
      this.copyAddressFallback(text);
    }
  }

  copyAddressFallback(text) {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    try {
      document.execCommand('copy');
      app.toast(`Copied address: ${text}`, 'success');
    } catch (e) {
      app.toast(`Could not copy address: ${text}`, 'error');
    }
    document.body.removeChild(el);
  }

  // ---------------------------------------------------------------------------
  // PROPERTIES UI - VISUAL SERVER.PROPERTIES EDITOR
  // ---------------------------------------------------------------------------

  parseMinecraftColors(text) {
    if (!text && text !== '') return '<span style="color:#94a3b8; font-style:italic;">A Minecraft Server</span>';

    // Normalize newlines: handle literal '\n', '\r\n', or actual newlines
    const raw = String(text).replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');

    const colorMap = {
      '0': '#000000', // Black
      '1': '#0000AA', // Dark Blue
      '2': '#00AA00', // Dark Green
      '3': '#00AAAA', // Dark Aqua
      '4': '#AA0000', // Dark Red
      '5': '#AA00AA', // Dark Purple
      '6': '#FFAA00', // Gold
      '7': '#AAAAAA', // Gray
      '8': '#555555', // Dark Gray
      '9': '#5555FF', // Blue
      'a': '#55FF55', // Green
      'b': '#55FFFF', // Aqua
      'c': '#FF5555', // Red
      'd': '#FF55FF', // Light Purple
      'e': '#FFFF55', // Yellow
      'f': '#FFFFFF'  // White
    };

    let currentColor = '#FFFFFF';
    let isBold = false;
    let isItalic = false;
    let isUnderline = false;
    let isStrikethrough = false;
    let isObfuscated = false;

    const lines = raw.split('\n');
    const renderedLines = lines.map(line => {
      let result = '';
      const regex = /(?:§|&)([0-9a-fk-or])/gi;
      let lastIndex = 0;
      let match;

      const appendSpan = (content) => {
        if (!content) return;
        const escaped = this.escapeHtml(content);
        const styles = [];
        if (currentColor) styles.push(`color: ${currentColor}`);
        if (isBold) styles.push('font-weight: bold');
        if (isItalic) styles.push('font-style: italic');

        const decos = [];
        if (isUnderline) decos.push('underline');
        if (isStrikethrough) decos.push('line-through');
        if (decos.length > 0) styles.push(`text-decoration: ${decos.join(' ')}`);

        if (isObfuscated) {
          styles.push('letter-spacing: 0.5px');
          result += `<span class="motd-obfuscated opacity-80" style="${styles.join('; ')}">${escaped}</span>`;
        } else {
          result += `<span style="${styles.join('; ')}">${escaped}</span>`;
        }
      };

      while ((match = regex.exec(line)) !== null) {
        const textBefore = line.substring(lastIndex, match.index);
        appendSpan(textBefore);

        const code = match[1].toLowerCase();
        if (colorMap[code] !== undefined) {
          currentColor = colorMap[code];
          // Standard Minecraft color code resets all formatting
          isBold = false;
          isItalic = false;
          isUnderline = false;
          isStrikethrough = false;
          isObfuscated = false;
        } else if (code === 'k') {
          isObfuscated = true;
        } else if (code === 'l') {
          isBold = true;
        } else if (code === 'm') {
          isStrikethrough = true;
        } else if (code === 'n') {
          isUnderline = true;
        } else if (code === 'o') {
          isItalic = true;
        } else if (code === 'r') {
          currentColor = '#FFFFFF';
          isBold = false;
          isItalic = false;
          isUnderline = false;
          isStrikethrough = false;
          isObfuscated = false;
        }

        lastIndex = regex.lastIndex;
      }

      const remaining = line.substring(lastIndex);
      appendSpan(remaining);

      return result || '&nbsp;';
    });

    return renderedLines.join('<br>');
  }

  updateMotdPreview(val) {
    const previewEl = document.getElementById('motd-live-text');
    if (previewEl) {
      previewEl.innerHTML = this.parseMinecraftColors(val);
    }
  }

  updateMotdPlayerCount(val) {
    const el = document.getElementById('motd-player-count');
    if (el) el.textContent = `0/${val || '20'}`;
  }

  updateMotdServerTitle(val) {
    const el = document.getElementById('motd-server-title');
    if (el) el.textContent = `${val || 'world'} Server`;
  }

  onMotdInput(val) {
    this.currentProperties['motd'] = val;
    this.updateMotdPreview(val);
  }

  onLevelNameInput(val) {
    this.currentProperties['level-name'] = val;
    this.updateMotdServerTitle(val);
  }

  onMaxPlayersInput(val) {
    this.currentProperties['max-players'] = val;
    this.updateMotdPlayerCount(val);
  }

  insertMotdColor(code) {
    const input = document.getElementById('prop-motd');
    if (!input) return;
    const start = input.selectionStart !== undefined ? input.selectionStart : input.value.length;
    const end = input.selectionEnd !== undefined ? input.selectionEnd : input.value.length;
    const text = input.value;
    input.value = text.substring(0, start) + code + text.substring(end);
    input.focus();
    input.selectionStart = input.selectionEnd = start + code.length;
    this.currentProperties['motd'] = input.value;
    this.updateMotdPreview(input.value);
  }

  applyMotdPreset(presetType) {
    const input = document.getElementById('prop-motd');
    if (!input) return;
    const presets = {
      survival: '&a&lMINECRAFT SURVIVAL &7» &f[1.21.x]\\n&e&oSurvive, Build, Trade & Explore with Friends!',
      pvp: '&4&lHARDCORE FACTIONS &8[v2.0]\\n&c&lPvP &7• &c&lCustom Raids &7• &eNo Rules!',
      skyblock: '&b&lSKYBLOCK &3&lREALMS &7[1.8 - 1.21.x]\\n&aCustom Islands, Minions, Spawners & Economy',
      maintenance: '&c&lSERVER UNDER MAINTENANCE\\n&7We will be right back online soon! Check Discord.'
    };
    if (presets[presetType]) {
      input.value = presets[presetType];
      this.currentProperties['motd'] = input.value;
      this.updateMotdPreview(input.value);
    }
  }

  clearMotd() {
    const input = document.getElementById('prop-motd');
    if (!input) return;
    input.value = '';
    this.currentProperties['motd'] = '';
    this.updateMotdPreview('');
    input.focus();
  }

  collectVisualInputsToState() {
    const motdInput = document.getElementById('prop-motd');
    if (motdInput) {
      this.currentProperties['motd'] = motdInput.value;
    }
    for (const def of (this.propertyDefinitions || [])) {
      if (def.key === 'motd') continue;
      const input = document.getElementById(`prop-${def.key}`);
      if (!input) continue;
      if (def.type === 'boolean') {
        if (input.type === 'checkbox') {
          this.currentProperties[def.key] = input.checked ? 'true' : 'false';
        } else {
          this.currentProperties[def.key] = String(input.value).toLowerCase() === 'true' ? 'true' : 'false';
        }
      } else {
        this.currentProperties[def.key] = input.value;
      }
    }
  }

  syncPropertiesToRaw() {
    let raw = this.rawProperties || `# Minecraft server properties generated by Mpanel\n# ${(new Date()).toISOString()}\n`;
    for (const [key, val] of Object.entries(this.currentProperties)) {
      if (val === undefined || val === null) continue;
      let strVal = String(val).trim();
      if (key === 'motd') {
        strVal = strVal.replace(/\r?\n/g, '\\n');
      }
      const regex = new RegExp(`^${key}\\s*=.*$`, 'm');
      const newLine = `${key}=${strVal}`;
      if (regex.test(raw)) {
        raw = raw.replace(regex, newLine);
      } else {
        raw = (raw.trimEnd() ? raw.trimEnd() + '\n' : '') + `${newLine}\n`;
      }
    }
    this.rawProperties = raw;
  }

  syncRawToProperties(rawText) {
    if (!rawText) return;
    const lines = rawText.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const k = trimmed.substring(0, eqIdx).trim();
        const v = trimmed.substring(eqIdx + 1).trim();
        this.currentProperties[k] = v;
      }
    }
  }

  switchPropertiesMode(mode) {
    if (this.propertiesViewMode === mode) return;

    if (this.propertiesViewMode === 'visual') {
      this.collectVisualInputsToState();
      this.syncPropertiesToRaw();
    } else if (this.propertiesViewMode === 'raw') {
      const rawEditor = document.getElementById('props-raw-editor');
      if (rawEditor) {
        this.rawProperties = rawEditor.value;
        this.syncRawToProperties(this.rawProperties);
      }
    }

    this.propertiesViewMode = mode;
    this.renderPropertiesView(false);
  }

  copyRawProperties() {
    const rawEditor = document.getElementById('props-raw-editor');
    const text = rawEditor ? rawEditor.value : this.rawProperties;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        app.toast('Copied server.properties to clipboard!', 'info');
      }).catch(() => {
        app.toast('Could not copy to clipboard', 'error');
      });
    }
  }

  async onPropertiesServerChange(sId) {
    this.currentServerId = sId;
    try {
      const res = await app.api(`/api/servers/${sId}`);
      this.serverData = res.server;
      if (this.detectServerDefaults) this.detectServerDefaults(this.serverData);
    } catch (e) {}
    this.currentProperties = {};
    this.rawProperties = '';
    await this.renderPropertiesView(true);
  }

  filterPropertiesList(term) {
    this.propertiesSearchTerm = (term || '').trim().toLowerCase();
    this.applyPropertiesFilterDOM();
  }

  filterPropertiesCategory(category) {
    this.activePropertiesCategory = category;
    document.querySelectorAll('.props-cat-btn').forEach(b => {
      b.className = 'props-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 bg-slate-800/80 text-slate-400 hover:text-white border border-white/5';
    });
    const active = document.getElementById(`props-cat-${category}`);
    if (active) {
      const colors = {
        all: 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 border-blue-400/40',
        general: 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20 border-cyan-400/40',
        gameplay: 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 border-emerald-400/40',
        world: 'bg-amber-600 text-white shadow-lg shadow-amber-500/20 border-amber-400/40',
        performance: 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 border-purple-400/40',
        security: 'bg-rose-600 text-white shadow-lg shadow-rose-500/20 border-rose-400/40'
      };
      active.className = `props-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${colors[category] || 'bg-blue-600 text-white'}`;
    }
    this.applyPropertiesFilterDOM();
  }

  applyPropertiesFilterDOM() {
    const term = this.propertiesSearchTerm;
    const cat = this.activePropertiesCategory;

    let visibleCount = 0;
    const cards = document.querySelectorAll('.property-card-item');
    cards.forEach(card => {
      const cardKey = (card.getAttribute('data-prop-key') || '').toLowerCase();
      const cardCat = (card.getAttribute('data-prop-cat') || '').toLowerCase();
      const cardLabel = (card.getAttribute('data-prop-label') || '').toLowerCase();
      const cardDesc = (card.getAttribute('data-prop-desc') || '').toLowerCase();

      const matchesCat = (cat === 'all' || cardCat === cat);
      const matchesSearch = !term ||
        cardKey.includes(term) ||
        cardLabel.includes(term) ||
        cardDesc.includes(term);

      if (matchesCat && matchesSearch) {
        card.style.display = '';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    document.querySelectorAll('.property-category-section').forEach(sec => {
      const secCat = sec.getAttribute('data-category-id');
      if (cat !== 'all' && secCat !== cat) {
        sec.style.display = 'none';
        return;
      }
      const visibleChildCards = sec.querySelectorAll('.property-card-item:not([style*="display: none"])');
      if (visibleChildCards.length === 0) {
        sec.style.display = 'none';
      } else {
        sec.style.display = '';
      }
    });

    const noMatchesEl = document.getElementById('props-no-matches');
    if (noMatchesEl) {
      noMatchesEl.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }

  async renderPropertiesView(forceReload = false) {
    const container = document.getElementById('marketplace-view-content');
    if (!container) return;

    // Auto-resolve currentServerId if missing
    if (!this.currentServerId) {
      if (window.serverConsole && window.serverConsole.serverId) {
        this.currentServerId = window.serverConsole.serverId;
        this.serverData = window.serverConsole.serverData;
      } else if (window.serverConsole && window.serverConsole.server && window.serverConsole.server.id) {
        this.currentServerId = window.serverConsole.server.id;
        this.serverData = window.serverConsole.server;
      } else {
        try {
          const sRes = await app.api('/api/servers');
          const servers = sRes.servers || [];
          if (servers.length > 0) {
            this.currentServerId = servers[0].id;
            this.serverData = servers[0];
            if (this.detectServerDefaults) this.detectServerDefaults(this.serverData);
          }
        } catch (e) {}
      }
    }

    if (!this.currentServerId) {
      container.innerHTML = `
        <div class="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-3">
          <i data-lucide="alert-circle" class="w-10 h-10 text-amber-400 mx-auto"></i>
          <h4 class="text-base font-bold text-white">No Server Selected</h4>
          <p class="text-sm font-semibold text-slate-300">Please create or select an active server to configure its settings.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Modern Universal Config Editor Blueprint Engine
    if (window.configEditor) {
      await window.configEditor.render(container, this.currentServerId, 'server.properties');
      return;
    }

    let serversList = [];
    try {
      const sRes = await app.api('/api/servers');
      serversList = sRes.servers || [];
    } catch (e) {}

    // Only fetch from network if forcing reload or properties are not loaded yet
    if (forceReload || Object.keys(this.currentProperties).length === 0) {
      container.innerHTML = `
        <div class="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-3">
          <div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p class="text-sm font-semibold text-slate-300">Loading server.properties configuration...</p>
        </div>
      `;

      try {
        const res = await app.api(`/api/marketplace/properties?serverId=${this.currentServerId}`);
        if (!res.success) throw new Error(res.error);

        this.currentProperties = res.properties || {};
        this.propertyDefinitions = res.definitions || [];
        this.rawProperties = res.raw || '';
      } catch (err) {
        container.innerHTML = `
          <div class="glass-panel p-12 rounded-3xl border border-rose-500/30 text-center space-y-3">
            <i data-lucide="alert-triangle" class="w-10 h-10 text-rose-400 mx-auto"></i>
            <h4 class="text-base font-bold text-white">Could not load server.properties</h4>
            <p class="text-xs text-slate-400">${err.message}</p>
            <button onclick="marketplace.renderPropertiesView(true)" class="btn-cyber px-4 py-2 rounded-xl text-xs mt-2">Retry</button>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }
    }

    const motd = this.currentProperties['motd'] || 'A Minecraft Server';
    const maxPlayers = this.currentProperties['max-players'] || '20';
    const levelName = this.currentProperties['level-name'] || 'world';

    const colorCodes = [
      { code: '&0', name: 'Black', bg: '#000000', text: '#fff' },
      { code: '&1', name: 'Dark Blue', bg: '#0000AA', text: '#fff' },
      { code: '&2', name: 'Dark Green', bg: '#00AA00', text: '#fff' },
      { code: '&3', name: 'Dark Aqua', bg: '#00AAAA', text: '#fff' },
      { code: '&4', name: 'Dark Red', bg: '#AA0000', text: '#fff' },
      { code: '&5', name: 'Dark Purple', bg: '#AA00AA', text: '#fff' },
      { code: '&6', name: 'Gold', bg: '#FFAA00', text: '#000' },
      { code: '&7', name: 'Gray', bg: '#AAAAAA', text: '#000' },
      { code: '&8', name: 'Dark Gray', bg: '#555555', text: '#fff' },
      { code: '&9', name: 'Blue', bg: '#5555FF', text: '#fff' },
      { code: '&a', name: 'Green', bg: '#55FF55', text: '#000' },
      { code: '&b', name: 'Aqua', bg: '#55FFFF', text: '#000' },
      { code: '&c', name: 'Red', bg: '#FF5555', text: '#fff' },
      { code: '&d', name: 'Light Purple', bg: '#FF55FF', text: '#000' },
      { code: '&e', name: 'Yellow', bg: '#FFFF55', text: '#000' },
      { code: '&f', name: 'White', bg: '#FFFFFF', text: '#000' }
    ];

    container.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <!-- Properties Top Action Bar -->
        <div class="glass-panel p-6 rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-indigo-950/40 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                <i data-lucide="sliders" class="w-3.5 h-3.5 inline mr-1"></i> Properties UI
              </span>
              <span class="text-[10px] text-slate-400 font-mono">server.properties</span>
            </div>
            <h3 class="text-2xl font-black text-white">Visual Server Properties Editor</h3>
            <p class="text-xs text-slate-300">Easily configure your server's gameplay rules, MOTD, world seed, online mode, max players, and network settings.</p>
          </div>

          <div class="flex flex-wrap items-center gap-2 shrink-0">
            ${serversList.length > 1 ? `
              <div class="p-1 bg-black/40 rounded-xl border border-white/10 flex items-center gap-1.5 px-2.5">
                <span class="text-[11px] text-slate-400 font-medium">Server:</span>
                <select onchange="marketplace.onPropertiesServerChange(this.value)" class="glass-input px-2 py-1 rounded-lg text-xs font-semibold text-blue-400 bg-transparent border-0">
                  ${serversList.map(s => `
                    <option value="${s.id}" ${s.id == this.currentServerId ? 'selected' : ''} class="bg-slate-900 text-white">${this.escapeHtml(s.name)}</option>
                  `).join('')}
                </select>
              </div>
            ` : ''}

            <!-- Mode Switcher -->
            <div class="p-1 bg-black/40 rounded-xl border border-white/10 flex items-center gap-1">
              <button onclick="marketplace.switchPropertiesMode('visual')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${this.propertiesViewMode === 'visual' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}">
                <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i> Visual Form
              </button>
              <button onclick="marketplace.switchPropertiesMode('raw')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${this.propertiesViewMode === 'raw' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}">
                <i data-lucide="code" class="w-3.5 h-3.5"></i> Raw File
              </button>
            </div>

            <!-- Refresh Button -->
            <button onclick="marketplace.renderPropertiesView(true)" title="Reload fresh from disk" class="p-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 border border-white/10 transition">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>

            <!-- Save Button -->
            <button id="props-save-btn" onclick="marketplace.saveProperties()" class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2">
              <i data-lucide="save" class="w-4 h-4"></i> Save & Apply
            </button>

            <!-- Restart Server to Apply Button -->
            <button onclick="marketplace.restartCurrentServer()" title="Restart server to apply saved properties" class="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 transition flex items-center gap-1.5 shadow">
              <i data-lucide="power" class="w-4 h-4 text-amber-400"></i> Restart to Apply
            </button>
          </div>
        </div>

        ${this.propertiesViewMode === 'raw' ? `
          <!-- Raw Editor Mode -->
          <div class="glass-panel p-5 rounded-3xl border border-white/10 space-y-3 shadow-xl">
            <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
              <div class="flex items-center gap-2">
                <i data-lucide="file-text" class="w-4 h-4 text-blue-400"></i>
                <span class="text-xs font-bold text-slate-200 uppercase tracking-wider">server.properties Direct Raw Editor</span>
                <span class="text-[10px] text-slate-400 font-mono">Lines: ${this.rawProperties.split('\n').length}</span>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="marketplace.copyRawProperties()" class="px-3 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 border border-white/10 hover:border-white/20 transition flex items-center gap-1.5">
                  <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copy Content
                </button>
              </div>
            </div>
            <textarea id="props-raw-editor" rows="22" class="w-full glass-input p-4 rounded-2xl text-xs font-mono leading-relaxed resize-y border border-white/10 bg-slate-950/90 text-slate-200 focus:border-blue-500 shadow-inner">${this.escapeHtml(this.rawProperties)}</textarea>
            <p class="text-[11px] text-slate-400 font-mono">Tip: You can edit or add properties directly in standard <code class="text-blue-300">key=value</code> syntax. Click "Save & Apply" to write directly to server.properties.</p>
          </div>
        ` : `
          <!-- Visual Form Mode -->
          <!-- Realistic Minecraft Server List MOTD Preview Card & Dedicated MOTD Studio -->
          <div class="glass-panel p-6 rounded-3xl border border-blue-500/20 bg-slate-950/80 space-y-4 shadow-xl">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <i data-lucide="monitor" class="w-4 h-4 text-blue-400"></i> Multiplayer Server List In-Game Preview
                </span>
                <span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-mono">Real-time MOTD Live Preview</span>
              </div>
              <div class="text-[11px] text-slate-400 font-mono">
                Supports standard <span class="text-cyan-300">&0-f</span> colors and formatting codes
              </div>
            </div>

            <!-- In-game Style Minecraft Server Item Card -->
            <div class="p-4 rounded-2xl bg-[#090c15] border border-white/10 flex items-start gap-4 font-mono shadow-2xl relative overflow-hidden">
              <div class="w-16 h-16 rounded-xl bg-slate-900 border border-white/10 p-1 flex items-center justify-center shrink-0 shadow-inner">
                <img src="/api/servers/${this.currentServerId}/files/content?path=server-icon.png" onerror="this.onerror=null; this.src='/assets/favicon.svg'" alt="Server Icon" class="w-12 h-12 object-contain rounded">
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <h4 id="motd-server-title" class="text-sm font-bold text-white tracking-wide truncate">${this.escapeHtml(levelName)} Server</h4>
                  <div class="flex items-center gap-2.5">
                    <span id="motd-player-count" class="text-xs text-slate-300 font-mono font-semibold">0/${this.escapeHtml(String(maxPlayers))}</span>
                    <div class="flex items-end gap-0.5 h-3.5" title="4 ms (Optimal Connection)">
                      <span class="w-1 h-1 bg-emerald-400 rounded-xs"></span>
                      <span class="w-1 h-1.5 bg-emerald-400 rounded-xs"></span>
                      <span class="w-1 h-2 bg-emerald-400 rounded-xs"></span>
                      <span class="w-1 h-2.5 bg-emerald-400 rounded-xs"></span>
                      <span class="w-1 h-3.5 bg-emerald-400 rounded-xs"></span>
                    </div>
                  </div>
                </div>
                <div id="motd-live-text" class="text-xs text-slate-200 mt-2 leading-relaxed break-words font-mono bg-black/60 p-3 rounded-xl border border-white/10 min-h-[46px] select-text">
                  ${this.parseMinecraftColors(motd)}
                </div>
              </div>
            </div>

            <!-- Integrated MOTD Editor Input & Palette Controls -->
            <div class="space-y-3 pt-1">
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <label for="prop-motd" class="text-xs font-bold text-white flex items-center gap-1.5">
                  <i data-lucide="edit-3" class="w-3.5 h-3.5 text-cyan-400"></i> Server Message of the Day (MOTD):
                </label>
                <!-- Quick Presets -->
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-[10px] text-slate-400 font-bold mr-1">Presets:</span>
                  <button type="button" onclick="marketplace.applyMotdPreset('survival')" class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition">🌟 Survival</button>
                  <button type="button" onclick="marketplace.applyMotdPreset('pvp')" class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition">⚔️ Hardcore</button>
                  <button type="button" onclick="marketplace.applyMotdPreset('skyblock')" class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition">✨ SkyBlock</button>
                  <button type="button" onclick="marketplace.applyMotdPreset('maintenance')" class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition">🚧 Maintenance</button>
                  <button type="button" onclick="marketplace.clearMotd()" class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition">Clear</button>
                </div>
              </div>

              <!-- MOTD Textarea -->
              <div class="relative">
                <textarea id="prop-motd" rows="2" oninput="marketplace.onMotdInput(this.value)" class="w-full glass-input p-3.5 rounded-xl text-xs font-mono resize-y border border-white/10 bg-slate-900/90 focus:border-blue-500 leading-relaxed" placeholder="e.g. &a&lMy Server &7| &bv1.21.4\\n&eJoin our friendly multiplayer world!">${this.escapeHtml(motd)}</textarea>
              </div>

              <!-- Interactive Color & Formatting Palette -->
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[10px] text-slate-400 font-bold mr-1">Colors:</span>
                ${colorCodes.map(c => `
                  <button type="button" onclick="marketplace.insertMotdColor('${c.code}')" class="px-2 py-1 rounded-md text-[10px] font-mono font-bold transition hover:scale-110 shadow-sm border border-white/15" style="background-color: ${c.bg}; color: ${c.text};" title="${c.name} (${c.code})">
                    ${c.code}
                  </button>
                `).join('')}
                <div class="h-4 w-px bg-white/20 mx-1"></div>
                <span class="text-[10px] text-slate-400 font-bold mr-1">Formats:</span>
                <button type="button" onclick="marketplace.insertMotdColor('&l')" class="px-2 py-1 rounded-md text-[10px] font-mono font-bold transition hover:scale-110 bg-slate-800 text-white border border-white/20" title="Bold (&l)"><b>&l Bold</b></button>
                <button type="button" onclick="marketplace.insertMotdColor('&o')" class="px-2 py-1 rounded-md text-[10px] font-mono font-bold transition hover:scale-110 bg-slate-800 text-white border border-white/20" title="Italic (&o)"><i>&o Italic</i></button>
                <button type="button" onclick="marketplace.insertMotdColor('&n')" class="px-2 py-1 rounded-md text-[10px] font-mono font-bold transition hover:scale-110 bg-slate-800 text-white border border-white/20" title="Underline (&n)"><ins>&n Underline</ins></button>
                <button type="button" onclick="marketplace.insertMotdColor('&m')" class="px-2 py-1 rounded-md text-[10px] font-mono font-bold transition hover:scale-110 bg-slate-800 text-white border border-white/20" title="Strikethrough (&m)"><del>&m Strike</del></button>
                <button type="button" onclick="marketplace.insertMotdColor('&k')" class="px-2 py-1 rounded-md text-[10px] font-mono font-bold transition hover:scale-110 bg-purple-900/60 text-purple-200 border border-purple-500/30" title="Magic/Obfuscated (&k)">&k Magic</button>
                <button type="button" onclick="marketplace.insertMotdColor('&r')" class="px-2 py-1 rounded-md text-[10px] font-mono font-bold transition hover:scale-110 bg-slate-700 text-white border border-white/20" title="Reset (&r)">&r Reset</button>
                <button type="button" onclick="marketplace.insertMotdColor('\\\\n')" class="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition hover:scale-110 bg-blue-600/30 text-blue-300 border border-blue-500/40" title="Insert Newline (\\n)">↵ Newline</button>
              </div>
            </div>
          </div>

          <!-- Property Filter Bar: Category Tabs & Search Bar -->
          <div class="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
            <!-- Category Filter Pills -->
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button onclick="marketplace.filterPropertiesCategory('all')" id="props-cat-all" class="props-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${this.activePropertiesCategory === 'all' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 border-blue-400/40' : 'bg-slate-800/80 text-slate-400 hover:text-white border border-white/5'}">
                All Properties (${this.propertyDefinitions.filter(d => d.key !== 'motd').length})
              </button>
              <button onclick="marketplace.filterPropertiesCategory('general')" id="props-cat-general" class="props-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${this.activePropertiesCategory === 'general' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20 border-cyan-400/40' : 'bg-slate-800/80 text-slate-400 hover:text-white border border-white/5'}">
                <i data-lucide="server" class="w-3.5 h-3.5 inline mr-1 text-cyan-400"></i> General
              </button>
              <button onclick="marketplace.filterPropertiesCategory('gameplay')" id="props-cat-gameplay" class="props-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${this.activePropertiesCategory === 'gameplay' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 border-emerald-400/40' : 'bg-slate-800/80 text-slate-400 hover:text-white border border-white/5'}">
                <i data-lucide="gamepad-2" class="w-3.5 h-3.5 inline mr-1 text-emerald-400"></i> Gameplay
              </button>
              <button onclick="marketplace.filterPropertiesCategory('world')" id="props-cat-world" class="props-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${this.activePropertiesCategory === 'world' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20 border-amber-400/40' : 'bg-slate-800/80 text-slate-400 hover:text-white border border-white/5'}">
                <i data-lucide="globe" class="w-3.5 h-3.5 inline mr-1 text-amber-400"></i> World
              </button>
              <button onclick="marketplace.filterPropertiesCategory('performance')" id="props-cat-performance" class="props-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${this.activePropertiesCategory === 'performance' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 border-purple-400/40' : 'bg-slate-800/80 text-slate-400 hover:text-white border border-white/5'}">
                <i data-lucide="zap" class="w-3.5 h-3.5 inline mr-1 text-purple-400"></i> Performance
              </button>
              <button onclick="marketplace.filterPropertiesCategory('security')" id="props-cat-security" class="props-cat-btn px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${this.activePropertiesCategory === 'security' ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20 border-rose-400/40' : 'bg-slate-800/80 text-slate-400 hover:text-white border border-white/5'}">
                <i data-lucide="shield" class="w-3.5 h-3.5 inline mr-1 text-rose-400"></i> Security
              </button>
            </div>

            <!-- Search Filter Input -->
            <div class="relative min-w-[240px]">
              <i data-lucide="search" class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="text" id="props-search-input" value="${this.escapeHtml(this.propertiesSearchTerm || '')}" oninput="marketplace.filterPropertiesList(this.value)" placeholder="Search settings (pvp, seed, port)..." class="w-full glass-input pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-900/80 border border-white/10 text-white">
            </div>
          </div>

          <!-- Visual Form by Categories -->
          <div class="space-y-6">
            ${this.renderPropertiesCategorySections()}
            <div id="props-no-matches" style="display: none;" class="glass-panel p-10 rounded-2xl border border-white/10 text-center space-y-2">
              <i data-lucide="search-x" class="w-8 h-8 text-slate-400 mx-auto"></i>
              <p class="text-sm font-semibold text-slate-300">No properties match your filter</p>
              <p class="text-xs text-slate-400">Try searching for a different setting or clear your search term.</p>
            </div>
          </div>
        `}
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    if (this.propertiesViewMode === 'visual') {
      this.applyPropertiesFilterDOM();
    }
  }

  renderPropertiesCategorySections() {
    const categories = [
      { id: 'general', name: 'General & Server Info', icon: 'server', color: 'text-cyan-400' },
      { id: 'gameplay', name: 'Gameplay & Rules', icon: 'gamepad-2', color: 'text-emerald-400' },
      { id: 'world', name: 'World Generation & Spawning', icon: 'globe', color: 'text-amber-400' },
      { id: 'performance', name: 'Performance & Networking', icon: 'zap', color: 'text-purple-400' },
      { id: 'security', name: 'Security & RCON Console', icon: 'shield', color: 'text-rose-400' }
    ];

    return categories.map(cat => {
      // Exclude motd from general since it is already in the dedicated MOTD Studio at the top
      const items = (this.propertyDefinitions || []).filter(d => d.category === cat.id && d.key !== 'motd');
      if (items.length === 0) return '';

      return `
        <div class="glass-panel p-5 rounded-2xl border border-white/10 space-y-4 property-category-section shadow-lg" data-category-id="${cat.id}">
          <div class="flex items-center gap-2 pb-2 border-b border-white/5">
            <i data-lucide="${cat.icon}" class="w-4 h-4 ${cat.color}"></i>
            <h4 class="text-sm font-bold text-white">${cat.name}</h4>
            <span class="text-[10px] text-slate-400 font-mono">(${items.length})</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${items.map(item => this.renderPropertyInput(item)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  setBooleanProperty(key, boolVal) {
    const strVal = boolVal ? 'true' : 'false';
    this.currentProperties[key] = strVal;

    const hiddenInput = document.getElementById(`prop-${key}`);
    if (hiddenInput) hiddenInput.value = strVal;

    const btnOn = document.getElementById(`btn-on-${key}`);
    const btnOff = document.getElementById(`btn-off-${key}`);

    if (btnOn && btnOff) {
      if (boolVal) {
        btnOn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-emerald-600 text-white shadow-md shadow-emerald-500/30 font-black';
        btnOn.innerHTML = '<span class="w-2 h-2 rounded-full bg-white pulse-green"></span> ON';
        btnOff.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-white/5';
        btnOff.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-600"></span> OFF';
      } else {
        btnOn.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-white/5';
        btnOn.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-600"></span> ON';
        btnOff.className = 'px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-rose-600 text-white shadow-md shadow-rose-500/30 font-black';
        btnOff.innerHTML = '<span class="w-2 h-2 rounded-full bg-white"></span> OFF';
      }
    }
  }

  toggleBooleanProperty(key) {
    const cur = String(this.currentProperties[key]).toLowerCase() === 'true';
    this.setBooleanProperty(key, !cur);
  }

  async restartCurrentServer() {
    if (!this.currentServerId) {
      app.toast('Please select an active server first.', 'error');
      return;
    }
    try {
      app.toast('Restarting server to apply new properties...', 'info');
      await app.api(`/api/servers/${this.currentServerId}/power`, {
        method: 'POST',
        body: JSON.stringify({ action: 'restart' })
      });
      app.toast('✅ Server restart initiated! Configuration is being applied.', 'success');
    } catch (e) {
      app.toast(e.message || 'Failed to restart server', 'error');
    }
  }

  togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    const btn = input.nextElementSibling;
    if (btn) {
      btn.innerHTML = `<i data-lucide="${isPass ? 'eye-off' : 'eye'}" class="w-4 h-4"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  renderPropertyInput(item) {
    const val = this.currentProperties[item.key] !== undefined ? this.currentProperties[item.key] : item.default;
    const isChecked = String(val).toLowerCase() === 'true';

    if (item.type === 'boolean') {
      return `
        <div class="p-4 rounded-2xl bg-slate-900/70 border border-white/10 hover:border-blue-500/30 transition shadow-md flex items-center justify-between gap-3 property-card-item min-h-[105px]" data-prop-key="${item.key}" data-prop-cat="${item.category}" data-prop-label="${this.escapeHtml(item.label)}" data-prop-desc="${this.escapeHtml(item.description)}">
          <div class="space-y-1 pr-2 flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <label onclick="marketplace.toggleBooleanProperty('${item.key}')" class="text-xs font-bold text-white cursor-pointer hover:text-blue-300 transition select-none">${this.escapeHtml(item.label)}</label>
              <span class="text-[9px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-white/5 shrink-0">${item.key}</span>
            </div>
            <p class="text-[11px] text-slate-300 leading-snug">${this.escapeHtml(item.description)}</p>
          </div>

          <!-- Dedicated ON / OFF Segmented Switcher -->
          <div class="inline-flex items-center p-1 rounded-xl bg-slate-950 border border-white/10 shadow-inner shrink-0">
            <button type="button" onclick="marketplace.setBooleanProperty('${item.key}', true)" id="btn-on-${item.key}" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${isChecked ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 font-black' : 'text-slate-400 hover:text-white hover:bg-white/5'}">
              <span class="w-2 h-2 rounded-full ${isChecked ? 'bg-white pulse-green' : 'bg-slate-600'}"></span>
              ON
            </button>
            <button type="button" onclick="marketplace.setBooleanProperty('${item.key}', false)" id="btn-off-${item.key}" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${!isChecked ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30 font-black' : 'text-slate-400 hover:text-white hover:bg-white/5'}">
              <span class="w-2 h-2 rounded-full ${!isChecked ? 'bg-white' : 'bg-slate-600'}"></span>
              OFF
            </button>
            <input type="hidden" id="prop-${item.key}" value="${isChecked ? 'true' : 'false'}">
          </div>
        </div>
      `;
    }

    if (item.type === 'select') {
      return `
        <div class="p-4 rounded-2xl bg-slate-900/70 border border-white/10 hover:border-blue-500/30 transition shadow-md flex flex-col justify-between property-card-item min-h-[105px]" data-prop-key="${item.key}" data-prop-cat="${item.category}" data-prop-label="${this.escapeHtml(item.label)}" data-prop-desc="${this.escapeHtml(item.description)}">
          <div class="space-y-1">
            <div class="flex items-center justify-between gap-2">
              <label for="prop-${item.key}" class="text-xs font-bold text-white block">${this.escapeHtml(item.label)}</label>
              <span class="text-[9px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-white/5 shrink-0">${item.key}</span>
            </div>
            <p class="text-[11px] text-slate-300 leading-snug">${this.escapeHtml(item.description)}</p>
          </div>
          <div class="pt-1">
            <select id="prop-${item.key}" onchange="marketplace.currentProperties['${item.key}'] = this.value" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-semibold text-cyan-300 bg-slate-900">
              ${(item.options || []).map(opt => `
                <option value="${opt.value}" ${String(val).toLowerCase() === opt.value.toLowerCase() ? 'selected' : ''} class="bg-slate-900 text-white">${opt.label}</option>
              `).join('')}
            </select>
          </div>
        </div>
      `;
    }

    if (item.type === 'slider') {
      const min = item.min || 3;
      const max = item.max || 32;
      return `
        <div class="p-4 rounded-2xl bg-slate-900/70 border border-white/10 hover:border-blue-500/30 transition shadow-md flex flex-col justify-between property-card-item min-h-[105px]" data-prop-key="${item.key}" data-prop-cat="${item.category}" data-prop-label="${this.escapeHtml(item.label)}" data-prop-desc="${this.escapeHtml(item.description)}">
          <div class="space-y-1">
            <div class="flex items-center justify-between gap-2">
              <label for="prop-${item.key}" class="text-xs font-bold text-white">${this.escapeHtml(item.label)}</label>
              <div class="flex items-center gap-2">
                <span class="text-[9px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-white/5 shrink-0">${item.key}</span>
                <span id="slider-val-${item.key}" class="text-xs font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">${val} chunks</span>
              </div>
            </div>
            <p class="text-[11px] text-slate-300 leading-snug">${this.escapeHtml(item.description)}</p>
          </div>
          <div class="pt-1">
            <input type="range" id="prop-${item.key}" min="${min}" max="${max}" value="${val}" oninput="document.getElementById('slider-val-${item.key}').innerText = this.value + ' chunks'; marketplace.currentProperties['${item.key}'] = this.value;" class="w-full accent-blue-500 cursor-pointer">
          </div>
        </div>
      `;
    }

    const isLevelName = item.key === 'level-name';
    const isMaxPlayers = item.key === 'max-players';
    const isPassword = item.key === 'rcon.password';

    let onInputAttr = `marketplace.currentProperties['${item.key}'] = this.value;`;
    if (isLevelName) {
      onInputAttr = `marketplace.onLevelNameInput(this.value);`;
    } else if (isMaxPlayers) {
      onInputAttr = `marketplace.onMaxPlayersInput(this.value);`;
    }

    return `
      <div class="p-4 rounded-2xl bg-slate-900/70 border border-white/10 hover:border-blue-500/30 transition shadow-md flex flex-col justify-between property-card-item min-h-[105px]" data-prop-key="${item.key}" data-prop-cat="${item.category}" data-prop-label="${this.escapeHtml(item.label)}" data-prop-desc="${this.escapeHtml(item.description)}">
        <div class="space-y-1">
          <div class="flex items-center justify-between gap-2">
            <label for="prop-${item.key}" class="text-xs font-bold text-white block">${this.escapeHtml(item.label)}</label>
            <span class="text-[9px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-white/5 shrink-0">${item.key}</span>
          </div>
          <p class="text-[11px] text-slate-300 leading-snug">${this.escapeHtml(item.description)}</p>
        </div>
        <div class="pt-1">
          ${isPassword ? `
            <div class="relative">
              <input type="password" id="prop-${item.key}" value="${this.escapeHtml(String(val !== undefined && val !== null ? val : ''))}" oninput="${onInputAttr}" class="w-full glass-input pl-3.5 pr-10 py-2 rounded-xl text-xs font-mono text-white" placeholder="Enter RCON password...">
              <button type="button" onclick="marketplace.togglePasswordVisibility('prop-${item.key}')" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition" title="Show/Hide Password">
                <i data-lucide="eye" class="w-4 h-4"></i>
              </button>
            </div>
          ` : `
            <input type="${item.type === 'number' ? 'number' : 'text'}" id="prop-${item.key}" value="${this.escapeHtml(String(val !== undefined && val !== null ? val : ''))}" placeholder="${this.escapeHtml(String(item.default !== undefined && item.default !== null ? item.default : ''))}" oninput="${onInputAttr}" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono text-slate-100">
          `}
        </div>
      </div>
    `;
  }

  async saveProperties() {
    if (!this.currentServerId) {
      app.toast('Please select an active server first.', 'error');
      return;
    }
    const saveBtn = document.getElementById('props-save-btn');
    const origHtml = saveBtn ? saveBtn.innerHTML : null;

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-1"></i> Saving...`;
        if (window.lucide) lucide.createIcons();
      }

      let payload = {};
      if (this.propertiesViewMode === 'raw') {
        const rawEditor = document.getElementById('props-raw-editor');
        this.rawProperties = rawEditor ? rawEditor.value : this.rawProperties;
        this.syncRawToProperties(this.rawProperties);
        payload = {
          raw: this.rawProperties,
          serverId: this.currentServerId
        };
      } else {
        this.collectVisualInputsToState();
        this.syncPropertiesToRaw();
        payload = {
          updates: { ...this.currentProperties },
          serverId: this.currentServerId
        };
      }

      const res = await app.api(`/api/marketplace/properties?serverId=${this.currentServerId}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (!res.success) throw new Error(res.error || 'Failed to save server.properties');

      app.toast('✅ server.properties configuration saved successfully!', 'success');
      this.currentProperties = res.properties || this.currentProperties;
      this.rawProperties = res.raw || this.rawProperties;

      // Update live preview in place if in visual mode
      if (this.propertiesViewMode === 'visual') {
        const motd = this.currentProperties['motd'] || '';
        this.updateMotdPreview(motd);
        this.updateMotdPlayerCount(this.currentProperties['max-players']);
        this.updateMotdServerTitle(this.currentProperties['level-name']);
      }
    } catch (err) {
      app.toast(`Failed to save properties: ${err.message}`, 'error');
    } finally {
      if (saveBtn && origHtml) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = origHtml;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // MCTOOLS BLUEPRINT EXTENSION SUITE
  // ---------------------------------------------------------------------------

  async renderMcToolsView() {
    const container = document.getElementById('marketplace-view-content');
    if (!container) return;
    if (window.mctools) {
      window.mctools.renderView(container);
    } else {
      container.innerHTML = `
        <div class="glass-panel p-8 text-center rounded-3xl border border-white/10 space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-2xl mx-auto">🛠️</div>
          <h3 class="text-xl font-bold text-white">McTools Extension</h3>
          <p class="text-xs text-slate-400">Loading Minecraft tools...</p>
        </div>
      `;
    }
  }

  // ---------------------------------------------------------------------------
  // SERVER TOOLS & OPTIMIZATION SUITE
  // ---------------------------------------------------------------------------

  async renderToolsView() {
    const container = document.getElementById('marketplace-view-content');
    if (!container) return;

    container.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <!-- Tools Top Hero Strip -->
        <div class="glass-panel p-6 rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                <i data-lucide="wrench" class="w-3.5 h-3.5 inline mr-1"></i> Server Tools Suite
              </span>
              <span class="text-[10px] text-slate-400 font-mono">1-Click Utilities & Tuning</span>
            </div>
            <h3 class="text-2xl font-black text-white">Essential Minecraft Server Tools</h3>
            <p class="text-xs text-slate-300">Boost performance, crossplay Bedrock & Java, manage port forwarding, and run maintenance cleanup with 1 click.</p>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button onclick="marketplace.cleanServerLogs()" id="clean-logs-btn" class="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700 text-rose-300 border border-rose-500/30 transition flex items-center gap-2 shadow">
              <i data-lucide="trash-2" class="w-4 h-4 text-rose-400"></i> Clean Logs & Crash Dumps
            </button>
          </div>
        </div>

        <!-- Featured Blueprint Extension: McTools -->
        <div class="glass-panel p-5 rounded-3xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900/80 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                ⭐ Featured Blueprint Extension
              </span>
              <span class="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">v1.0.1</span>
              <span class="text-[10px] text-slate-400 font-mono">by towsifkafi • nobita329</span>
            </div>
            <h4 class="text-xl font-black text-white flex items-center gap-2">
              🛠️ McTools Server Utilities Suite
            </h4>
            <p class="text-xs text-slate-300 max-w-2xl">
              Ported from <code>nobita329/Nobita-Cloud (mctools.blueprint)</code>. Includes real-time MOTD colored text builder, 1,200+ Minecraft IDs catalog, color picker, small caps fonts, and inventory slot guides.
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="marketplace.switchCategory('mctools')" class="btn-cyber px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95">
              <i data-lucide="wrench" class="w-4 h-4"></i> Open McTools Suite
            </button>
            <a href="/downloads/mctools.blueprint" download="mctools.blueprint" class="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center gap-1.5 transition" title="Download mctools.blueprint">
              <i data-lucide="download" class="w-4 h-4"></i> .blueprint
            </a>
          </div>
        </div>

        <!-- Featured Blueprint Extension: Server Splitter -->
        <div class="glass-panel p-5 rounded-3xl border border-purple-500/40 bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-slate-900/80 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <img src="/assets/serversplitter_icon.jpg" alt="Server Splitter" class="w-16 h-16 rounded-2xl object-cover border border-purple-500/30 shadow-lg shrink-0">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black uppercase tracking-wider text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                  ⚡ Core Extension
                </span>
                <span class="text-[10px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full">v1.1.4</span>
                <span class="text-[10px] text-slate-400 font-mono">by 0x7d8 • nobita329</span>
              </div>
              <h4 class="text-xl font-black text-white flex items-center gap-2">
                Server Splitter
              </h4>
              <p class="text-xs text-slate-300 max-w-2xl">
                Ported from <code>nobita329/Nobita-Cloud (serversplitter.blueprint)</code>. Easily partition your server RAM, CPU cores, and Disk into independent Minecraft, Node.js, Python, or VM sub-servers with dedicated ports and live resizing.
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="app.navigate('server-manage/' + (marketplace.currentServerId || 1) + '/splitter')" class="btn-cyber px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95">
              <i data-lucide="git-fork" class="w-4 h-4"></i> Open Server Splitter
            </button>
          </div>
        </div>

        <!-- Featured Blueprint Extension: AutoBackups -->
        <div class="glass-panel p-5 rounded-3xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-blue-950/50 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shrink-0">
              <i data-lucide="clock" class="w-8 h-8"></i>
            </div>
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-500/20 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                  ⚡ Core Extension
                </span>
                <span class="text-[10px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full">v1.0</span>
                <span class="text-[10px] text-slate-400 font-mono">by makkmarci13</span>
              </div>
              <h4 class="text-xl font-black text-white flex items-center gap-2">
                AutoBackups
              </h4>
              <p class="text-xs text-slate-300 max-w-2xl">
                Ported from <code>nobita329/Nobita-Cloud (autobackups.blueprint)</code>. Automatically generate daily server snapshots, schedule execution times, configure tiered retention policies (Days / Weeks / Months), and exclude nodes.
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="app.navigate('admin-autobackups')" class="btn-cyber px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95">
              <i data-lucide="settings" class="w-4 h-4"></i> Manage Auto Backup
            </button>
          </div>
        </div>

        <!-- Featured Blueprint Extension: Custom Server Sort -->
        <div class="glass-panel p-5 rounded-3xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-cyan-950/50 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <img src="/assets/customserversort_icon.png" alt="Custom Server Sort" class="w-16 h-16 rounded-2xl object-cover border border-indigo-500/30 shadow-lg shrink-0">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                  ⚡ UI Extension
                </span>
                <span class="text-[10px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-full">v1.0.3</span>
                <span class="text-[10px] text-slate-400 font-mono">by kiip</span>
              </div>
              <h4 class="text-xl font-black text-white flex items-center gap-2">
                Custom Server Sort
              </h4>
              <p class="text-xs text-slate-300 max-w-2xl">
                Ported from <code>nobita329/Nobita-Cloud (customserversort.blueprint)</code>. Reorder your server list with interactive drag-and-drop handles, sort by name (A-Z, Z-A), online status, server ID, or RAM allocation, with seamless multi-device cloud synchronization.
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="app.navigate('servers')" class="btn-cyber px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95">
              <i data-lucide="arrow-up-down" class="w-4 h-4"></i> Try Server Sort
            </button>
          </div>
        </div>

        <!-- Section 1: 1-Click Essential Plugins -->
        <div class="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-white/5">
            <span class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <i data-lucide="sparkles" class="w-4 h-4 text-indigo-400"></i> 1-Click Essential Server Addons
            </span>
            <span class="text-[11px] text-slate-400">Official, trusted production plugins</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- ViaVersion -->
            <div class="glass-card p-4 rounded-xl border border-white/10 flex flex-col justify-between space-y-3">
              <div>
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-white flex items-center gap-2">
                    <i data-lucide="arrow-up-right" class="w-4 h-4 text-cyan-400"></i> ViaVersion
                  </span>
                  <span class="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">Version Bridge</span>
                </div>
                <p class="text-xs text-slate-300 mt-2">Allows newer Minecraft client versions to connect to your server without needing to update server jar.</p>
              </div>
              <button onclick="marketplace.installToolPreset('viaversion')" id="tool-btn-viaversion" class="w-full btn-cyber px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                <i data-lucide="download" class="w-3.5 h-3.5"></i> Install ViaVersion
              </button>
            </div>

            <!-- ViaBackwards -->
            <div class="glass-card p-4 rounded-xl border border-white/10 flex flex-col justify-between space-y-3">
              <div>
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-white flex items-center gap-2">
                    <i data-lucide="arrow-down-left" class="w-4 h-4 text-cyan-400"></i> ViaBackwards
                  </span>
                  <span class="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">Legacy Bridge</span>
                </div>
                <p class="text-xs text-slate-300 mt-2">Allows older Minecraft client versions to connect to your newer server version.</p>
              </div>
              <button onclick="marketplace.installToolPreset('viabackwards')" id="tool-btn-viabackwards" class="w-full btn-cyber px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                <i data-lucide="download" class="w-3.5 h-3.5"></i> Install ViaBackwards
              </button>
            </div>

            <!-- Spark Profiler -->
            <div class="glass-card p-4 rounded-xl border border-white/10 flex flex-col justify-between space-y-3">
              <div>
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-white flex items-center gap-2">
                    <i data-lucide="gauge" class="w-4 h-4 text-emerald-400"></i> Spark Profiler
                  </span>
                  <span class="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Performance</span>
                </div>
                <p class="text-xs text-slate-300 mt-2">World-class performance profiler for tracking server TPS, CPU usage, memory leaks, and laggy entities.</p>
              </div>
              <button onclick="marketplace.installToolPreset('spark')" id="tool-btn-spark" class="w-full btn-cyber px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                <i data-lucide="download" class="w-3.5 h-3.5"></i> Install Spark
              </button>
            </div>

            <!-- Chunky Pre-generator -->
            <div class="glass-card p-4 rounded-xl border border-white/10 flex flex-col justify-between space-y-3">
              <div>
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-white flex items-center gap-2">
                    <i data-lucide="map" class="w-4 h-4 text-amber-400"></i> Chunky Generator
                  </span>
                  <span class="text-[9px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Anti-Lag</span>
                </div>
                <p class="text-xs text-slate-300 mt-2">Asynchronously pre-generate your world chunks to completely eliminate exploration lag.</p>
              </div>
              <button onclick="marketplace.installToolPreset('chunky')" id="tool-btn-chunky" class="w-full btn-cyber px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                <i data-lucide="download" class="w-3.5 h-3.5"></i> Install Chunky
              </button>
            </div>

            <!-- LuckPerms -->
            <div class="glass-card p-4 rounded-xl border border-white/10 flex flex-col justify-between space-y-3">
              <div>
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-white flex items-center gap-2">
                    <i data-lucide="shield-check" class="w-4 h-4 text-purple-400"></i> LuckPerms
                  </span>
                  <span class="text-[9px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">Permissions</span>
                </div>
                <p class="text-xs text-slate-300 mt-2">The gold standard permissions management plugin with rich web editor, groups, and ranks.</p>
              </div>
              <button onclick="marketplace.installToolPreset('luckperms')" id="tool-btn-luckperms" class="w-full btn-cyber px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                <i data-lucide="download" class="w-3.5 h-3.5"></i> Install LuckPerms
              </button>
            </div>

            <!-- SkinsRestorer -->
            <div class="glass-card p-4 rounded-xl border border-white/10 flex flex-col justify-between space-y-3">
              <div>
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-white flex items-center gap-2">
                    <i data-lucide="user-check" class="w-4 h-4 text-yellow-400"></i> SkinsRestorer
                  </span>
                  <span class="text-[9px] font-mono text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">Skins</span>
                </div>
                <p class="text-xs text-slate-300 mt-2">Restores player skins for offline/cracked servers, proxy setups, and custom skin commands.</p>
              </div>
              <button onclick="marketplace.installToolPreset('skinsrestorer')" id="tool-btn-skinsrestorer" class="w-full btn-cyber px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                <i data-lucide="download" class="w-3.5 h-3.5"></i> Install SkinsRestorer
              </button>
            </div>
          </div>
        </div>

        <!-- Section 2: Performance Optimizer Presets & Aikar's Flags -->
        <div class="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-white/5">
            <span class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <i data-lucide="activity" class="w-4 h-4 text-emerald-400"></i> Server Performance Optimizer
            </span>
            <button onclick="marketplace.optimizeServerProperties()" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow">
              <i data-lucide="zap" class="w-3.5 h-3.5"></i> 1-Click Optimize Properties
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <h5 class="text-xs font-bold text-white flex items-center gap-2">
                <i data-lucide="check" class="w-4 h-4 text-emerald-400"></i> Recommended TPS Optimization
              </h5>
              <ul class="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                <li>Sets <strong>view-distance=8</strong> (reduces chunk load by ~35%)</li>
                <li>Sets <strong>simulation-distance=6</strong> (reduces mob ticking)</li>
                <li>Disables <strong>sync-chunk-writes=false</strong> (huge SSD boost)</li>
                <li>Sets <strong>network-compression-threshold=256</strong></li>
              </ul>
            </div>

            <div class="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <div class="flex items-center justify-between">
                <h5 class="text-xs font-bold text-white flex items-center gap-2">
                  <i data-lucide="terminal" class="w-4 h-4 text-cyan-400"></i> Aikar's Recommended JVM Flags
                </h5>
                <button onclick="marketplace.copyAddress('-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1')" class="text-[10px] text-cyan-400 hover:underline">Copy Flags</button>
              </div>
              <p class="text-[10px] text-slate-400 font-mono bg-black/40 p-2 rounded border border-white/5 break-all">
                -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch
              </p>
            </div>
          </div>
        </div>

        <!-- Section 3: Embedded Playit.gg Tunnel Manager -->
        <div class="glass-panel p-5 rounded-2xl border border-indigo-500/30 bg-slate-950/70 space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-white/5">
            <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <i data-lucide="network" class="w-4 h-4 text-indigo-400"></i> Playit.gg Zero-Port Tunnel Manager
            </span>
            <button onclick="marketplace.renderPlayitView()" class="btn-cyber-purple px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
              Open Full Playit Console <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
          <p class="text-xs text-slate-300">Deploy a high-speed Anycast tunnel so friends can join your Minecraft server from anywhere without opening router ports.</p>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  async installToolPreset(presetId) {
    if (!this.currentServerId) return;
    const btn = document.getElementById(`tool-btn-${presetId}`);
    const origHtml = btn ? btn.innerHTML : null;

    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Installing...`;
        if (window.lucide) lucide.createIcons();
      }

      app.toast(`Installing tool preset...`, 'info');
      const res = await app.api('/api/marketplace/tools/install-preset', {
        method: 'POST',
        body: JSON.stringify({
          serverId: this.currentServerId,
          presetId
        })
      });

      if (!res.success) throw new Error(res.error);
      app.toast(`✅ Successfully installed ${res.toolName || presetId}!`, 'success');
      this.refreshInstalledBadge();
    } catch (err) {
      app.toast(`Failed to install tool: ${err.message}`, 'error');
    } finally {
      if (btn && origHtml) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  async optimizeServerProperties() {
    if (!this.currentServerId) return;
    const ok = await app.confirm({
      tag: 'OPTIMIZE PRESET',
      tagIcon: 'sliders',
      title: 'Apply Preset',
      badge: window.location.host,
      message: 'Apply high-performance server.properties preset (View Distance 8, Simulation 6, Sync Chunks False)?',
      subtext: 'Key performance flags will be updated for optimized TPS and lower RAM usage.',
      icon: 'sliders',
      confirmIcon: 'check',
      confirmText: 'Apply Preset',
      type: 'info'
    });
    if (!ok) return;

    try {
      app.toast('Applying performance optimizations...', 'info');
      const res = await app.api(`/api/marketplace/properties?serverId=${this.currentServerId}`, {
        method: 'POST',
        body: JSON.stringify({
          updates: {
            'view-distance': '8',
            'simulation-distance': '6',
            'sync-chunk-writes': 'false',
            'network-compression-threshold': '256'
          }
        })
      });

      if (!res.success) throw new Error(res.error);
      app.toast('⚡ server.properties optimized for high TPS!', 'success');
    } catch (err) {
      app.toast(`Optimization failed: ${err.message}`, 'error');
    }
  }

  async cleanServerLogs() {
    if (!this.currentServerId) return;
    const ok = await app.confirm({
      tag: 'CLEAN LOGS',
      tagIcon: 'trash-2',
      title: 'Clean Logs',
      badge: window.location.host,
      message: 'Delete old archived logs (*.log.gz) and crash dumps to free up server disk space?',
      subtext: 'Archived historical log files will be purged. Current console logs will not be affected.',
      icon: 'trash-2',
      confirmIcon: 'trash-2',
      confirmText: 'Clean Logs',
      type: 'warning'
    });
    if (!ok) return;

    const btn = document.getElementById('clean-logs-btn');
    const origHtml = btn ? btn.innerHTML : null;

    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Cleaning...`;
        if (window.lucide) lucide.createIcons();
      }

      const res = await app.api('/api/marketplace/tools/clean-logs', {
        method: 'POST',
        body: JSON.stringify({ serverId: this.currentServerId })
      });

      if (!res.success) throw new Error(res.error);
      app.toast(res.message || 'Server logs cleaned successfully.', 'success');
    } catch (err) {
      app.toast(`Cleanup failed: ${err.message}`, 'error');
    } finally {
      if (btn && origHtml) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.remove();
  }

  async onGlobalServerChange(sId) {
    this.currentServerId = sId;
    try {
      const res = await app.api(`/api/servers/${sId}`);
      this.serverData = res.server;
      this.detectServerDefaults(this.serverData);
    } catch (e) {}
    await this.renderCurrentView();
  }
}

window.marketplace = new MarketplaceController();
