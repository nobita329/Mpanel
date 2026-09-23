// Mpanel Minecraft Version Changer Module
class VersionChanger {
  constructor() {
    this.currentServerId = null;
    this.serverData = null;
    this.types = [];
    this.selectedType = 'paper';
    this.selectedVersion = '1.21.4';
    this.selectedCategory = 'all';
    this.searchQuery = '';
    this.versionFilter = '';
    this.sortOrder = 'desc'; // 'desc' (latest) or 'asc' (A to Z)
    this.availableVersions = [];
    this.isLoadingVersions = false;
    this.isInstalling = false;

    this.javaImages = [
      { label: 'Java 26 (ghcr.io/pterodactyl/yolks:java_26)', value: 'ghcr.io/pterodactyl/yolks:java_26' },
      { label: 'Java 25 (Next-Gen / Experimental)', value: 'ghcr.io/pterodactyl/yolks:java_25' },
      { label: 'Java 21 (Recommended for MC 1.20.5+ / 1.21.x)', value: 'ghcr.io/pterodactyl/yolks:java_21' },
      { label: 'Java 17 (Recommended for MC 1.18 - 1.20.4)', value: 'ghcr.io/pterodactyl/yolks:java_17' },
      { label: 'Java 8 (Recommended for MC 1.7.10 - 1.16.5)', value: 'ghcr.io/pterodactyl/yolks:java_8' },
      { label: 'Java 16 (Recommended for MC 1.17)', value: 'ghcr.io/pterodactyl/yolks:java_16' },
      { label: 'Java 11 (Legacy LTS)', value: 'ghcr.io/pterodactyl/yolks:java_11' }
    ];
  }

  /**
   * Main entry point to render the Version Changer tab
   */
  async renderVersionChangerTab(container, serverId, serverData) {
    this.currentServerId = serverId;
    this.serverData = serverData || {};
    this.selectedType = this.serverData.jar_type || 'paper';
    this.selectedVersion = this.serverData.jar_version || '1.21.4';

    container.innerHTML = `
      <div class="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <!-- Top Title & Overview Banner -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <span class="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <i data-lucide="refresh-cw" class="w-5 h-5"></i>
              </span>
              Minecraft Version & Engine Changer
            </h3>
            <p class="text-xs text-slate-400 mt-1">
              Switch server software engines (Paper, Purpur, Fabric, Forge, Spigot...) and versions with 1 click. Java runtimes are matched automatically.
            </p>
          </div>

          <!-- Current Server Runtime Info Badge -->
          <div class="glass-panel px-4 py-2.5 rounded-2xl border border-white/10 flex items-center gap-3 self-start md:self-auto">
            <div class="text-right">
              <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Active Engine</div>
              <div class="text-xs font-bold text-cyan-300 font-mono flex items-center gap-1.5 justify-end">
                <span class="w-2 h-2 rounded-full ${this.serverData.status === 'running' ? 'bg-emerald-400 pulse-green' : 'bg-rose-400'}"></span>
                ${(this.serverData.jar_type || 'paper').toUpperCase()} ${this.serverData.jar_version || '1.21.4'}
              </div>
            </div>
            <div class="h-8 w-px bg-white/10"></div>
            <div>
              <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Java Runtime</div>
              <div class="text-xs font-semibold text-emerald-400 font-mono">
                ${this.formatJavaLabel(this.serverData.docker_image)}
              </div>
            </div>
          </div>
        </div>

        <!-- Non-Minecraft Server Notice (if applicable) -->
        ${this.serverData.server_type && this.serverData.server_type !== 'minecraft' ? `
          <div class="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-center gap-3">
            <i data-lucide="alert-triangle" class="w-5 h-5 shrink-0"></i>
            <div>
              <span class="font-bold">Notice:</span> This server is configured as <strong>${this.serverData.server_type}</strong>. Version Changer is specifically designed for Minecraft servers. To adjust Node.js or Python runtime variables, use the Startup tab.
            </div>
          </div>
        ` : ''}

        <!-- Main Configuration Box (Version Selection + Options) -->
        <div id="vc-installer-card" class="glass-panel p-6 rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 via-slate-900/60 to-slate-900/90 shadow-2xl relative overflow-hidden">
          <div class="absolute -top-24 -right-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
            <!-- Left Side: Version & Options Form -->
            <div class="lg:col-span-8 space-y-5">
              <div class="flex items-center justify-between border-b border-white/10 pb-3">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Step 1:</span>
                  <h4 class="text-sm font-bold text-white flex items-center gap-2">
                    Select Target Version & Environment
                  </h4>
                </div>
                <div id="vc-engine-selected-badge" class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 capitalize">
                  Selected: ${this.selectedType}
                </div>
              </div>

              <!-- Quick Version Select Buttons (Dynamic A to Z Auto) -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-400"></i> Quick Select Minecraft Version (A to Z Auto):
                  </label>
                  <div class="flex items-center gap-2">
                    <input type="text" id="vc-ver-filter" placeholder="Filter A-Z..." oninput="versionChanger.filterQuickVersions(this.value)" class="glass-input px-2.5 py-1 rounded-lg text-[11px] w-28">
                    <button type="button" onclick="versionChanger.toggleSortOrder()" id="vc-sort-btn" class="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300 border border-white/5 flex items-center gap-1 transition">
                      <i data-lucide="arrow-down-up" class="w-3 h-3"></i> A-Z
                    </button>
                  </div>
                </div>
                <div id="vc-quick-versions-container" class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  <!-- Populated dynamically with all versions from A to Z -->
                </div>
              </div>

              <!-- Version Dropdown & Java Environment in 2 columns -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Minecraft Version</span>
                    <span id="vc-version-count" class="text-[10px] text-slate-400">Loading...</span>
                  </label>
                  <div class="relative">
                    <select id="vc-version-select" onchange="versionChanger.onVersionSelectChange(this.value)" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono text-cyan-300 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 cursor-pointer">
                      <option value="${this.selectedVersion}">${this.selectedVersion}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Java Docker Runtime</span>
                    <span id="vc-java-auto-tag" class="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <i data-lucide="check" class="w-3 h-3"></i> Auto-Matched
                    </span>
                  </label>
                  <select id="vc-java-select" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono text-emerald-300 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 cursor-pointer">
                    ${this.javaImages.map(img => `
                      <option value="${img.value}">${img.label}</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <!-- Safety Options & Checkboxes -->
              <div class="pt-2 border-t border-white/10 space-y-3">
                <label class="flex items-start gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" id="vc-clean-cache" class="mt-0.5 rounded border-white/20 bg-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0">
                  <div>
                    <div class="text-xs font-semibold text-slate-200">Clean old server jar & build cache</div>
                    <p class="text-[11px] text-slate-400">Recommended when switching between different engines (e.g., Paper to Fabric) to remove leftover libraries. Worlds and player data are kept safe.</p>
                  </div>
                </label>
              </div>
            </div>

            <!-- Right Side: Confirmation Action Box -->
            <div class="lg:col-span-4 flex flex-col justify-between p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
              <div>
                <h5 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Installation Summary</h5>
                <div class="space-y-2 text-xs">
                  <div class="flex justify-between py-1 border-b border-white/5">
                    <span class="text-slate-400">Target Engine:</span>
                    <span id="summary-engine" class="font-bold text-white capitalize">${this.selectedType}</span>
                  </div>
                  <div class="flex justify-between py-1 border-b border-white/5">
                    <span class="text-slate-400">Target Version:</span>
                    <span id="summary-version" class="font-mono font-bold text-cyan-400">${this.selectedVersion}</span>
                  </div>
                  <div class="flex justify-between py-1 border-b border-white/5">
                    <span class="text-slate-400">Java Environment:</span>
                    <span id="summary-java" class="font-mono font-bold text-emerald-400">Java 21</span>
                  </div>
                  <div class="flex justify-between py-1">
                    <span class="text-slate-400">Preserve Data:</span>
                    <span class="font-bold text-emerald-400">Yes (Safe)</span>
                  </div>
                </div>

                ${this.serverData.status === 'running' ? `
                  <div class="mt-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] flex items-center gap-2">
                    <i data-lucide="info" class="w-4 h-4 shrink-0"></i>
                    <span>Server is currently running and will be stopped before installation.</span>
                  </div>
                ` : ''}
              </div>

              <div>
                <button type="button" id="vc-install-btn" onclick="versionChanger.executeVersionChange()" class="w-full btn-cyber py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 group">
                  <i data-lucide="download-cloud" class="w-4 h-4 group-hover:animate-bounce"></i>
                  <span>Install & Switch Version</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Software Engine Directory Browser -->
        <div class="space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Step 2:</span>
              <h4 class="text-base font-bold text-white flex items-center gap-2">
                Choose Software Engine / Fork
              </h4>
            </div>

            <!-- Search Engines Input -->
            <div class="relative w-full sm:w-64">
              <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input type="text" id="vc-engine-search" placeholder="Search engines (e.g. Paper, Fabric)..." oninput="versionChanger.onSearchEngines(this.value)" class="w-full glass-input pl-9 pr-3 py-1.5 rounded-xl text-xs">
            </div>
          </div>

          <!-- Category Filter Tabs -->
          <div class="flex flex-wrap gap-2 border-b border-white/10 pb-3">
            <button onclick="versionChanger.filterCategory('all')" id="vc-cat-all" class="vc-cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition">
              All Platforms
            </button>
            <button onclick="versionChanger.filterCategory('server')" id="vc-cat-server" class="vc-cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition">
              Optimized Server (Paper / Purpur / Folia)
            </button>
            <button onclick="versionChanger.filterCategory('modded')" id="vc-cat-modded" class="vc-cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition">
              Modded (Fabric / Forge / NeoForge)
            </button>
            <button onclick="versionChanger.filterCategory('hybrid')" id="vc-cat-hybrid" class="vc-cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition">
              Hybrid (Mods + Plugins)
            </button>
            <button onclick="versionChanger.filterCategory('proxy')" id="vc-cat-proxy" class="vc-cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition">
              Proxies (Velocity / BungeeCord)
            </button>
          </div>

          <!-- Engine Cards Grid -->
          <div id="vc-engines-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <!-- Populated dynamically -->
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Fetch supported types and version list
    await this.loadEngineTypes();
    await this.loadVersionsForType(this.selectedType);
    this.updateSummary();
  }

  /**
   * Fetch all supported Minecraft engine types from server
   */
  async loadEngineTypes() {
    try {
      const data = await app.api('/api/mcjars/types');
      if (data && data.types) {
        this.types = data.types;
        this.renderEnginesGrid();
      }
    } catch (e) {
      console.error('Failed to load jar types:', e);
      // Fallback
      this.types = [
        { id: 'paper', name: 'Paper', category: 'server', tag: 'Recommended', description: 'High-performance Spigot fork aimed at fixing gameplay inconsistencies.', icon: 'zap' },
        { id: 'purpur', name: 'Purpur', category: 'server', tag: 'Popular', description: 'Drop-in replacement for Paper with maximum configurability.', icon: 'layers' },
        { id: 'fabric', name: 'Fabric', category: 'modded', tag: 'Fast Modding', description: 'Lightweight, modular modding toolchain for Minecraft.', icon: 'box' },
        { id: 'forge', name: 'Forge', category: 'modded', tag: 'Classic Mods', description: 'The traditional and most popular Minecraft modding platform.', icon: 'tool' },
        { id: 'neoforge', name: 'NeoForge', category: 'modded', tag: 'Next-Gen', description: 'Community-driven fork of Minecraft Forge.', icon: 'flame' },
        { id: 'vanilla', name: 'Vanilla', category: 'server', tag: 'Official', description: 'Official unmodified Minecraft server jar by Mojang.', icon: 'compass' },
        { id: 'spigot', name: 'Spigot', category: 'server', tag: 'Standard', description: 'Classic modified server supporting Bukkit plugins.', icon: 'cpu' },
        { id: 'velocity', name: 'Velocity', category: 'proxy', tag: 'Next-Gen Proxy', description: 'Modern, ultra-fast proxy server powered by PaperMC.', icon: 'shuffle' }
      ];
      this.renderEnginesGrid();
    }
  }

  /**
   * Render engine selection cards
   */
  renderEnginesGrid() {
    const grid = document.getElementById('vc-engines-grid');
    if (!grid) return;

    let filtered = this.types;
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === this.selectedCategory);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(q) || 
        t.id.toLowerCase().includes(q) || 
        (t.tag && t.tag.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-10 text-slate-400 glass-panel rounded-2xl border border-white/5">
          <i data-lucide="search-x" class="w-8 h-8 mx-auto mb-2 text-slate-500"></i>
          <p class="text-sm font-semibold">No engines found matching "${this.searchQuery}"</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    grid.innerHTML = filtered.map(t => {
      const isSelected = this.selectedType === t.id;
      return `
        <div onclick="versionChanger.selectEngine('${t.id}')" class="group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${isSelected ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400' : 'glass-panel border-white/10 hover:border-cyan-500/50 hover:bg-white/5'}">
          ${isSelected ? `
            <span class="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500 text-black flex items-center gap-1">
              <i data-lucide="check" class="w-3 h-3"></i> ACTIVE
            </span>
          ` : (t.tag ? `
            <span class="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-white/10 text-slate-300 border border-white/10">
              ${t.tag}
            </span>
          ` : '')}

          <div class="flex items-center gap-3 mb-2.5">
            <div class="p-2.5 rounded-xl ${isSelected ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-800 text-slate-300 group-hover:text-cyan-400 group-hover:bg-slate-700'} transition">
              <i data-lucide="${t.icon || 'box'}" class="w-5 h-5"></i>
            </div>
            <div>
              <h5 class="text-sm font-bold text-white group-hover:text-cyan-300 transition">${t.name}</h5>
              <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${t.category || 'server'}</span>
            </div>
          </div>

          <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
            ${t.description || 'Minecraft server software implementation.'}
          </p>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  /**
   * User selects an engine card
   */
  async selectEngine(typeId) {
    if (this.selectedType === typeId && this.availableVersions.length > 0) return;
    this.selectedType = typeId;
    this.renderEnginesGrid();

    const badge = document.getElementById('vc-engine-selected-badge');
    if (badge) badge.innerText = `Selected: ${typeId.toUpperCase()}`;

    // Scroll smoothly to installer card
    const card = document.getElementById('vc-installer-card');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    await this.loadVersionsForType(typeId);
    this.updateSummary();
  }

  /**
   * Fetch all available Minecraft versions for the selected engine
   */
  async loadVersionsForType(typeId) {
    const versionSelect = document.getElementById('vc-version-select');
    const countTag = document.getElementById('vc-version-count');
    if (!versionSelect) return;

    if (countTag) countTag.innerText = 'Fetching builds...';
    versionSelect.disabled = true;

    try {
      const res = await app.api(`/api/mcjars/types/${typeId}/versions`);
      if (res && res.versions && res.versions.length > 0) {
        this.availableVersions = res.versions;
        if (countTag) countTag.innerText = `${this.availableVersions.length} versions`;

        // Check if current selectedVersion exists in list, otherwise default to first/latest
        const hasCurrent = this.availableVersions.some(v => v.version === this.selectedVersion);
        if (!hasCurrent) {
          this.selectedVersion = this.availableVersions[0].version;
        }

        versionSelect.innerHTML = this.availableVersions.map(v => `
          <option value="${v.version}" ${v.version === this.selectedVersion ? 'selected' : ''}>
            ${v.version} ${v.version === '1.21.4' ? '(Latest Stable)' : ''}
          </option>
        `).join('');

        // Auto-match Java runtime based on selected version
        const chosen = this.availableVersions.find(v => v.version === this.selectedVersion);
        if (chosen && chosen.recommendedJava) {
          this.matchJavaRuntime(chosen.recommendedJava);
        } else {
          this.autoDetectJavaForVersion(this.selectedVersion);
        }
        this.renderQuickVersionPills();
      }
    } catch (e) {
      console.error('Error fetching versions for', typeId, e);
      if (countTag) countTag.innerText = 'Default versions';
      const fallbacks = ['1.21.4', '1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.7.10'];
      versionSelect.innerHTML = fallbacks.map(v => `
        <option value="${v}" ${v === this.selectedVersion ? 'selected' : ''}>${v}</option>
      `).join('');
      this.availableVersions = fallbacks.map(v => ({ version: v }));
      this.autoDetectJavaForVersion(this.selectedVersion);
      this.renderQuickVersionPills();
    } finally {
      versionSelect.disabled = false;
    }
  }

  /**
   * Render dynamic Quick Version select pills from A to Z automatically
   */
  renderQuickVersionPills() {
    const container = document.getElementById('vc-quick-versions-container');
    if (!container) return;

    let list = this.availableVersions.map(v => typeof v === 'object' ? v.version : v);
    if (list.length === 0) {
      list = ['1.21.4', '1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.7.10'];
    }

    if (this.versionFilter) {
      const q = this.versionFilter.toLowerCase();
      list = list.filter(v => v.toLowerCase().includes(q));
    }

    if (this.sortOrder === 'asc') {
      list = [...list].reverse();
    }

    if (list.length === 0) {
      container.innerHTML = `<span class="text-[11px] text-slate-500 py-1">No versions matching "${this.versionFilter}"</span>`;
      return;
    }

    container.innerHTML = list.map(v => {
      const isSelected = this.selectedVersion === v;
      return `
        <button type="button" onclick="versionChanger.quickPickVersion('${v}')" data-ver="${v}" class="vc-ver-pill px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition ${isSelected ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-300' : 'bg-slate-800/80 hover:bg-slate-700 hover:text-cyan-300 text-slate-300 border border-white/5'}">
          ${v}
        </button>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  filterQuickVersions(query) {
    this.versionFilter = query.trim();
    this.renderQuickVersionPills();
  }

  toggleSortOrder() {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    const btn = document.getElementById('vc-sort-btn');
    if (btn) {
      btn.innerHTML = `<i data-lucide="arrow-down-up" class="w-3 h-3"></i> ${this.sortOrder === 'asc' ? 'A-Z' : 'Latest'}`;
      if (window.lucide) lucide.createIcons();
    }
    this.renderQuickVersionPills();
  }

  /**
   * User picks a quick-select pill
   */
  quickPickVersion(ver) {
    this.selectedVersion = ver;
    const versionSelect = document.getElementById('vc-version-select');
    if (versionSelect) {
      let exists = false;
      for (let i = 0; i < versionSelect.options.length; i++) {
        if (versionSelect.options[i].value === ver) {
          versionSelect.selectedIndex = i;
          exists = true;
          break;
        }
      }
      if (!exists) {
        const opt = document.createElement('option');
        opt.value = ver;
        opt.innerText = ver;
        opt.selected = true;
        versionSelect.appendChild(opt);
      }
    }
    this.onVersionSelectChange(ver);
  }

  /**
   * When version changes in dropdown
   */
  onVersionSelectChange(newVersion) {
    this.selectedVersion = newVersion;
    this.autoDetectJavaForVersion(newVersion);
    this.updateSummary();
    this.renderQuickVersionPills();
  }

  /**
   * Auto-select appropriate Java Docker image
   */
  autoDetectJavaForVersion(ver) {
    if (!ver) return;
    const match = ver.match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
    let targetJava = 'ghcr.io/pterodactyl/yolks:java_21';

    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      const patch = parseInt(match[3] || '0', 10);

      if (major === 1) {
        if (minor >= 21) {
          targetJava = 'ghcr.io/pterodactyl/yolks:java_21';
        } else if (minor === 20 && patch >= 5) {
          targetJava = 'ghcr.io/pterodactyl/yolks:java_21';
        } else if (minor >= 18) {
          targetJava = 'ghcr.io/pterodactyl/yolks:java_17';
        } else if (minor === 17) {
          targetJava = 'ghcr.io/pterodactyl/yolks:java_17';
        } else {
          targetJava = 'ghcr.io/pterodactyl/yolks:java_8';
        }
      } else if (major >= 26) {
        targetJava = 'ghcr.io/pterodactyl/yolks:java_26';
      } else if (major >= 25) {
        targetJava = 'ghcr.io/pterodactyl/yolks:java_25';
      }
    }

    this.matchJavaRuntime(targetJava);
  }

  /**
   * Set Java selector value and update indicator
   */
  matchJavaRuntime(javaImage) {
    const javaSelect = document.getElementById('vc-java-select');
    const autoTag = document.getElementById('vc-java-auto-tag');

    if (javaSelect) {
      javaSelect.value = javaImage;
    }
    if (autoTag) {
      const label = this.formatJavaLabel(javaImage);
      autoTag.innerHTML = `<i data-lucide="check" class="w-3 h-3"></i> Auto: ${label}`;
      if (window.lucide) lucide.createIcons();
    }
    this.updateSummary();
  }

  /**
   * Format docker image string to friendly Java title
   */
  formatJavaLabel(img) {
    if (!img) return 'Java 21';
    if (img.includes('java_26')) return 'Java 26';
    if (img.includes('java_25')) return 'Java 25';
    if (img.includes('java_21')) return 'Java 21';
    if (img.includes('java_17')) return 'Java 17';
    if (img.includes('java_16')) return 'Java 16';
    if (img.includes('java_11')) return 'Java 11';
    if (img.includes('java_8')) return 'Java 8';
    return img.split(':').pop() || 'Java 21';
  }

  /**
   * Category filter button click
   */
  filterCategory(cat) {
    this.selectedCategory = cat;
    document.querySelectorAll('.vc-cat-btn').forEach(b => {
      b.className = 'vc-cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition';
    });
    const active = document.getElementById(`vc-cat-${cat}`);
    if (active) {
      active.className = 'vc-cat-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition';
    }
    this.renderEnginesGrid();
  }

  /**
   * Live search filter for engines
   */
  onSearchEngines(val) {
    this.searchQuery = val.trim();
    this.renderEnginesGrid();
  }

  /**
   * Update installation summary card on the right
   */
  updateSummary() {
    const engineEl = document.getElementById('summary-engine');
    const versionEl = document.getElementById('summary-version');
    const javaEl = document.getElementById('summary-java');
    const javaSelect = document.getElementById('vc-java-select');

    if (engineEl) engineEl.innerText = this.selectedType.toUpperCase();
    if (versionEl) versionEl.innerText = this.selectedVersion;
    if (javaEl && javaSelect) {
      javaEl.innerText = this.formatJavaLabel(javaSelect.value);
    }
  }

  /**
   * Execute 1-Click Version Change and Installation
   */
  async executeVersionChange() {
    if (this.isInstalling) return;

    const btn = document.getElementById('vc-install-btn');
    const javaSelect = document.getElementById('vc-java-select');
    const cleanCache = document.getElementById('vc-clean-cache')?.checked || false;
    const dockerImage = javaSelect ? javaSelect.value : null;

    const engineName = this.selectedType.toUpperCase();
    const ver = this.selectedVersion;

    const isRunning = this.serverData.status === 'running';
    const confirmMsg = isRunning
      ? `Switch server #${this.currentServerId} to ${engineName} (${ver})?\n\n⚠️ The server is currently running and will be stopped before applying the new version.`
      : `Switch server #${this.currentServerId} to ${engineName} (${ver})?`;

    if (!confirm(confirmMsg)) return;

    this.isInstalling = true;
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Downloading ${engineName} ${ver}...</span>
      `;
    }

    app.toast(`Downloading & installing ${engineName} (${ver})... This may take 10-30 seconds.`, 'info');

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/change-version`, {
        method: 'POST',
        body: JSON.stringify({
          jar_type: this.selectedType,
          jar_version: this.selectedVersion,
          jar_build: 'latest',
          docker_image: dockerImage,
          delete_old_files: cleanCache
        })
      });

      if (res && res.success) {
        app.toast(`🎉 Server successfully updated to ${engineName} ${ver}!`, 'success');

        // Refresh server header in console
        if (window.serverConsole) {
          await serverConsole.loadServerHeader(this.currentServerId);
          this.serverData = serverConsole.serverData || this.serverData;
        }

        // Re-render tab to show newly active configuration
        const area = document.getElementById('marketplace-view-content') || document.getElementById('subtab-content-area');
        if (area) {
          await this.renderVersionChangerTab(area, this.currentServerId, this.serverData);
        }
      } else {
        throw new Error(res.error || 'Failed to change server version');
      }
    } catch (err) {
      console.error('Version change error:', err);
      app.toast(err.message || 'Failed to install server version.', 'error');
    } finally {
      this.isInstalling = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `
          <i data-lucide="download-cloud" class="w-4 h-4"></i>
          <span>Install & Switch Version</span>
        `;
        if (window.lucide) lucide.createIcons();
      }
    }
  }
}

// Global instance
window.versionChanger = new VersionChanger();

