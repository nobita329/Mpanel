// Mpanel Minecraft World Manager Module
class WorldManagerController {
  constructor() {
    this.currentServerId = null;
    this.serverData = null;
    this.worlds = [];
    this.activeWorldName = null;
    this.properties = null;
    this.loading = false;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Main entry: Render World Manager inside Server Console Tabs
  async renderWorldManagerTab(container, serverId, serverData) {
    this.currentServerId = serverId;
    this.serverData = serverData;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Top Banner Header -->
        <div class="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <i data-lucide="globe" class="w-3 h-3 inline mr-1"></i> Minecraft World Manager
              </span>
              <span class="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-white/5">
                Engine: <strong class="text-white">${serverData?.jar_type || 'Minecraft'}</strong> ${serverData?.jar_version ? `(${serverData.jar_version})` : ''}
              </span>
            </div>
            <h3 class="text-2xl font-black text-white flex items-center gap-2">
              Minecraft World Manager
            </h3>
            <p class="text-xs text-slate-300">
              Manage, switch, import, export, clone, and reset worlds. Changes to the active world take effect on server reboot.
            </p>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="worldManager.openWorldInstallerModal()" class="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition">
              <i data-lucide="sparkles" class="w-4 h-4"></i> World Installer
            </button>
            <button onclick="worldManager.openCreateModal()" class="btn-cyber px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
              <i data-lucide="plus-circle" class="w-4 h-4"></i> Create World
            </button>
            <button onclick="worldManager.openImportModal()" class="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow transition flex items-center gap-2">
              <i data-lucide="upload-cloud" class="w-4 h-4 text-cyan-400"></i> Import (.zip)
            </button>
            <button onclick="serverConsole.switchSubTab('marketplace'); marketplace.switchCategory('world');" class="px-4 py-2.5 rounded-xl text-xs font-bold bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 transition flex items-center gap-2">
              <i data-lucide="shopping-bag" class="w-4 h-4 text-purple-400"></i> World Maps Store
            </button>
            <button onclick="worldManager.loadWorlds()" title="Refresh Worlds" class="p-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-white/10 text-slate-300 border border-white/10 transition">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- Dynamic Content Area -->
        <div id="world-manager-content">
          <div class="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-3">
            <div class="animate-spin inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            <p class="text-sm font-semibold text-slate-300">Scanning server worlds & reading level.dat...</p>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadWorlds();
  }

  // Fetch worlds list from API
  async loadWorlds() {
    this.loading = true;
    const content = document.getElementById('world-manager-content');
    if (!content) return;

    if (!this.currentServerId) {
      if (window.serverConsole && serverConsole.serverId) {
        this.currentServerId = serverConsole.serverId;
      } else if (window.marketplace && marketplace.currentServerId) {
        this.currentServerId = marketplace.currentServerId;
      }
    }

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds`);
      this.worlds = res.worlds || [];
      this.activeWorldName = res.activeWorld || 'world';
      this.properties = res.properties || {};

      this.renderWorldsView(content);
    } catch (err) {
      console.error('Failed to load worlds:', err);
      content.innerHTML = `
        <div class="glass-panel p-10 rounded-3xl border border-rose-500/20 text-center space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <i data-lucide="alert-circle" class="w-6 h-6"></i>
          </div>
          <p class="text-base font-bold text-white">Failed to load server worlds</p>
          <p class="text-xs text-rose-300/80 max-w-md mx-auto">${this.escapeHtml(err.message)}</p>
          <button onclick="worldManager.loadWorlds()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold mt-2">
            Retry Scan
          </button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    } finally {
      this.loading = false;
    }
  }

  // Render the full worlds dashboard
  renderWorldsView(container) {
    const activeWorldObj = this.worlds.find(w => w.isActive) || {
      name: this.activeWorldName,
      sizeFormatted: 'Unknown',
      gameMode: this.properties?.gamemode || 'Survival',
      difficulty: this.properties?.difficulty || 'Normal',
      hardcore: this.properties?.hardcore || false,
      seed: this.properties?.seed || 'Auto-Generated'
    };

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Active World Hero Card -->
        <div class="glass-panel p-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-cyan-950/30 shadow-xl relative overflow-hidden">
          <div class="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <i data-lucide="globe" class="w-64 h-64 text-emerald-400"></i>
          </div>

          <div class="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                  <span class="w-2 h-2 rounded-full bg-slate-950 animate-pulse"></span> Active World (Loaded)
                </span>
                <span class="text-xs text-slate-400 font-mono">level-name: <strong class="text-white">${this.escapeHtml(this.activeWorldName)}</strong></span>
              </div>
              <h2 class="text-3xl font-black text-white flex items-center gap-2">
                🌍 ${this.escapeHtml(activeWorldObj.name)}
              </h2>
              <p class="text-xs text-slate-300">
                This world is currently designated as the primary world in <code class="bg-black/40 px-1.5 py-0.5 rounded text-cyan-300">server.properties</code>.
              </p>
            </div>

            <!-- Stats Mini-Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
              <div class="glass-panel p-3 rounded-2xl border border-white/10 bg-slate-900/60 min-w-[110px]">
                <span class="text-[10px] uppercase font-bold text-slate-400 block">World Size</span>
                <span class="text-base font-black text-white font-mono">${activeWorldObj.sizeFormatted || '0 B'}</span>
              </div>
              <div class="glass-panel p-3 rounded-2xl border border-white/10 bg-slate-900/60 min-w-[110px]">
                <span class="text-[10px] uppercase font-bold text-slate-400 block">Game Mode</span>
                <span class="text-base font-bold text-cyan-400">${this.escapeHtml(activeWorldObj.gameMode || 'Survival')}</span>
              </div>
              <div class="glass-panel p-3 rounded-2xl border border-white/10 bg-slate-900/60 min-w-[110px]">
                <span class="text-[10px] uppercase font-bold text-slate-400 block">Difficulty</span>
                <span class="text-base font-bold ${activeWorldObj.difficulty === 'Hard' ? 'text-rose-400' : 'text-emerald-400'}">
                  ${this.escapeHtml(activeWorldObj.difficulty || 'Normal')}
                </span>
              </div>
              <div class="glass-panel p-3 rounded-2xl border border-white/10 bg-slate-900/60 min-w-[110px]">
                <span class="text-[10px] uppercase font-bold text-slate-400 block">Hardcore</span>
                <span class="text-base font-bold ${activeWorldObj.hardcore ? 'text-rose-500' : 'text-slate-300'}">
                  ${activeWorldObj.hardcore ? '🔥 Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          <!-- Additional Metadata Strip -->
          <div class="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
            <div class="flex flex-wrap items-center gap-4">
              <div>
                <span class="text-slate-400">World Seed:</span>
                <code class="font-mono text-cyan-300 bg-black/40 px-2 py-0.5 rounded text-[11px]">
                  ${this.escapeHtml(activeWorldObj.seed || this.properties?.seed || 'Random / Hidden')}
                </code>
              </div>
              ${activeWorldObj.spawn ? `
                <div>
                  <span class="text-slate-400">Spawn Coords:</span>
                  <span class="font-mono text-white text-[11px]">
                    X: ${activeWorldObj.spawn.x}, Y: ${activeWorldObj.spawn.y}, Z: ${activeWorldObj.spawn.z}
                  </span>
                </div>
              ` : ''}
              ${activeWorldObj.lastPlayed ? `
                <div>
                  <span class="text-slate-400">Last Played:</span>
                  <span class="text-slate-200">${new Date(activeWorldObj.lastPlayed).toLocaleDateString()} ${new Date(activeWorldObj.lastPlayed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ` : ''}
            </div>

            <div class="flex items-center gap-2">
              <button onclick="worldManager.downloadWorld('${this.escapeHtml(activeWorldObj.name)}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition flex items-center gap-1.5">
                <i data-lucide="download" class="w-3.5 h-3.5 text-cyan-400"></i> Backup (.zip)
              </button>
              <button onclick="worldManager.openCloneModal('${this.escapeHtml(activeWorldObj.name)}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition flex items-center gap-1.5">
                <i data-lucide="copy" class="w-3.5 h-3.5 text-purple-400"></i> Clone
              </button>
              <button onclick="worldManager.confirmResetWorld('${this.escapeHtml(activeWorldObj.name)}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition flex items-center gap-1.5">
                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Reset Terrain
              </button>
            </div>
          </div>
        </div>

        <!-- Section Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h4 class="text-lg font-bold text-white">All Detected Worlds</h4>
            <span class="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-mono font-bold">
              ${this.worlds.length}
            </span>
          </div>
          <span class="text-xs text-slate-400">
            Click <strong>Set as Active</strong> to switch worlds before starting the server.
          </span>
        </div>

        <!-- Worlds Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${this.worlds.map(w => this.renderWorldCard(w)).join('')}
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  // Render an individual world card
  renderWorldCard(world) {
    const isActive = world.isActive;
    return `
      <div class="glass-panel p-5 rounded-3xl border ${isActive ? 'border-emerald-500/40 bg-emerald-950/10 shadow-lg shadow-emerald-500/5' : 'border-white/10 bg-slate-900/50'} flex flex-col justify-between gap-4 transition hover:border-white/20">
        <div class="space-y-3">
          <!-- Card Header -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5 overflow-hidden">
              <div class="w-10 h-10 rounded-2xl ${isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-300 border border-white/5'} flex items-center justify-center text-lg shrink-0">
                ${isActive ? '🌍' : '🗺️'}
              </div>
              <div class="truncate">
                <h5 class="font-bold text-base text-white truncate" title="${this.escapeHtml(world.name)}">
                  ${this.escapeHtml(world.name)}
                </h5>
                <span class="text-[11px] text-slate-400 font-mono">${world.sizeFormatted || '0 B'}</span>
              </div>
            </div>

            ${isActive ? `
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Active
              </span>
            ` : `
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-white/5">
                Inactive
              </span>
            `}
          </div>

          <!-- Info Badges -->
          <div class="grid grid-cols-2 gap-2 text-[11px]">
            <div class="bg-black/30 p-2 rounded-xl border border-white/5">
              <span class="text-slate-400 block text-[9px] uppercase font-bold">Game Mode</span>
              <span class="font-semibold text-slate-200">${this.escapeHtml(world.gameMode || 'Survival')}</span>
            </div>
            <div class="bg-black/30 p-2 rounded-xl border border-white/5">
              <span class="text-slate-400 block text-[9px] uppercase font-bold">Difficulty</span>
              <span class="font-semibold text-slate-200">${this.escapeHtml(world.difficulty || 'Default')}</span>
            </div>
          </div>

          ${world.seed ? `
            <div class="text-[11px] text-slate-400 bg-black/20 px-2.5 py-1.5 rounded-xl flex items-center justify-between gap-1 overflow-hidden font-mono">
              <span class="text-[10px] text-slate-500">SEED:</span>
              <span class="text-cyan-300 truncate" title="${this.escapeHtml(world.seed)}">${this.escapeHtml(world.seed)}</span>
            </div>
          ` : ''}
        </div>

        <!-- Action Buttons Footer -->
        <div class="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
          ${!isActive ? `
            <button onclick="worldManager.activateWorld('${this.escapeHtml(world.name)}')" class="btn-cyber flex-1 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow">
              <i data-lucide="play" class="w-3.5 h-3.5"></i> Set as Active
            </button>
          ` : `
            <div class="flex-1 text-center py-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              Active World
            </div>
          `}

          <div class="flex items-center gap-1">
            <button onclick="worldManager.downloadWorld('${this.escapeHtml(world.name)}')" title="Download as .zip" class="p-2 rounded-xl text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition">
              <i data-lucide="download" class="w-4 h-4"></i>
            </button>
            <button onclick="worldManager.openCloneModal('${this.escapeHtml(world.name)}')" title="Clone World" class="p-2 rounded-xl text-slate-300 hover:text-purple-400 bg-white/5 hover:bg-white/10 border border-white/5 transition">
              <i data-lucide="copy" class="w-4 h-4"></i>
            </button>
            ${!isActive ? `
              <button onclick="worldManager.confirmDeleteWorld('${this.escapeHtml(world.name)}')" title="Delete World" class="p-2 rounded-xl text-slate-300 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 border border-white/5 transition">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            ` : `
              <button onclick="worldManager.confirmResetWorld('${this.escapeHtml(world.name)}')" title="Reset World Chunks" class="p-2 rounded-xl text-slate-300 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 border border-white/5 transition">
                <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // Activate World
  async activateWorld(worldName) {
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worldName })
      });

      app.toast(res.message || `Switched active world to ${worldName}`, 'success');
      await this.loadWorlds();
    } catch (err) {
      app.toast(`Failed to activate world: ${err.message}`, 'error');
    }
  }

  // Download World
  downloadWorld(worldName) {
    const token = localStorage.getItem('token');
    const url = `/api/servers/${this.currentServerId}/worlds/${encodeURIComponent(worldName)}/download?token=${encodeURIComponent(token)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${worldName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    app.toast(`Preparing world archive for "${worldName}"... Download will start shortly.`, 'info');
  }

  // Open Create World Modal
  openCreateModal() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div id="create-world-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="glass-panel w-full max-w-lg rounded-3xl border border-white/20 p-6 space-y-5 shadow-2xl bg-slate-900/95 max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <i data-lucide="plus-circle" class="w-5 h-5"></i>
              </div>
              <h3 class="text-lg font-bold text-white">Create New Minecraft World</h3>
            </div>
            <button onclick="worldManager.closeModal('create-world-modal')" class="text-slate-400 hover:text-white transition">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form onsubmit="worldManager.handleCreateWorld(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">World Folder Name *</label>
              <input type="text" id="new-world-name" placeholder="e.g. survival_s2, adventure_world" required class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs" pattern="[a-zA-Z0-9_\\-]+" title="Only alphanumeric, underscores, and hyphens">
              <p class="text-[11px] text-slate-400 mt-1">This will be the directory name in the server filesystem.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1.5">World Seed (Optional)</label>
                <input type="text" id="new-world-seed" placeholder="Leave blank for random" class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1.5">World Type</label>
                <select id="new-world-type" class="w-full glass-input px-3 py-2.5 rounded-xl text-xs">
                  <option value="minecraft:normal">Default / Normal</option>
                  <option value="minecraft:flat">Superflat</option>
                  <option value="minecraft:large_biomes">Large Biomes</option>
                  <option value="minecraft:amplified">Amplified</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1.5">Game Mode</label>
                <select id="new-world-gamemode" class="w-full glass-input px-3 py-2.5 rounded-xl text-xs">
                  <option value="survival">Survival</option>
                  <option value="creative">Creative</option>
                  <option value="adventure">Adventure</option>
                  <option value="spectator">Spectator</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1.5">Difficulty</label>
                <select id="new-world-difficulty" class="w-full glass-input px-3 py-2.5 rounded-xl text-xs">
                  <option value="peaceful">Peaceful</option>
                  <option value="easy">Easy</option>
                  <option value="normal" selected>Normal</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div class="space-y-2 pt-1">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="new-world-hardcore" class="rounded bg-slate-800 border-white/20 text-rose-500 focus:ring-0">
                <span class="text-xs text-slate-200">Hardcore Mode (Lock difficulty to Hard & ban on death)</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="new-world-structures" checked class="rounded bg-slate-800 border-white/20 text-emerald-500 focus:ring-0">
                <span class="text-xs text-slate-200">Generate Structures (Villages, Temples, Strongholds)</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="new-world-set-active" checked class="rounded bg-slate-800 border-white/20 text-cyan-500 focus:ring-0">
                <span class="text-xs text-cyan-300 font-semibold">Set as Active Server World immediately</span>
              </label>
            </div>

            <div class="pt-3 border-t border-white/10 flex justify-end gap-2">
              <button type="button" onclick="worldManager.closeModal('create-world-modal')" class="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/10 transition">
                Cancel
              </button>
              <button type="submit" id="create-world-submit-btn" class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
                <i data-lucide="check" class="w-4 h-4"></i> Create World
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
    if (btn) btn.disabled = true;

    const payload = {
      name: document.getElementById('new-world-name')?.value,
      seed: document.getElementById('new-world-seed')?.value,
      levelType: document.getElementById('new-world-type')?.value,
      gameMode: document.getElementById('new-world-gamemode')?.value,
      difficulty: document.getElementById('new-world-difficulty')?.value,
      hardcore: document.getElementById('new-world-hardcore')?.checked,
      generateStructures: document.getElementById('new-world-structures')?.checked,
      setActive: document.getElementById('new-world-set-active')?.checked
    };

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      app.toast(res.message || 'World created successfully!', 'success');
      this.closeModal('create-world-modal');
      await this.loadWorlds();
    } catch (err) {
      app.toast(`Failed to create world: ${err.message}`, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // Open Import World Modal (.zip upload)
  openImportModal() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div id="import-world-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="glass-panel w-full max-w-md rounded-3xl border border-white/20 p-6 space-y-5 shadow-2xl bg-slate-900/95">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <i data-lucide="upload-cloud" class="w-5 h-5"></i>
              </div>
              <h3 class="text-lg font-bold text-white">Import World Archive (.zip)</h3>
            </div>
            <button onclick="worldManager.closeModal('import-world-modal')" class="text-slate-400 hover:text-white transition">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form onsubmit="worldManager.handleImportWorld(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">World Archive File (.zip) *</label>
              <input type="file" id="import-world-file" accept=".zip" required class="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-500 file:text-slate-950 hover:file:bg-cyan-400 cursor-pointer glass-input p-2 rounded-xl">
              <p class="text-[11px] text-slate-400 mt-1">Must be a standard Minecraft world .zip containing level.dat.</p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">Destination World Name (Optional)</label>
              <input type="text" id="import-world-name" placeholder="Leave empty to use zip name" class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs" pattern="[a-zA-Z0-9_\\-]*">
            </div>

            <div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="import-world-set-active" checked class="rounded bg-slate-800 border-white/20 text-cyan-500 focus:ring-0">
                <span class="text-xs text-cyan-300 font-semibold">Set as Active World after import</span>
              </label>
            </div>

            <div class="pt-3 border-t border-white/10 flex justify-end gap-2">
              <button type="button" onclick="worldManager.closeModal('import-world-modal')" class="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/10 transition">
                Cancel
              </button>
              <button type="submit" id="import-world-submit-btn" class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
                <i data-lucide="upload" class="w-4 h-4"></i> Upload & Extract
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  async handleImportWorld(e) {
    e.preventDefault();
    const fileInput = document.getElementById('import-world-file');
    const nameInput = document.getElementById('import-world-name');
    const activeInput = document.getElementById('import-world-set-active');
    const btn = document.getElementById('import-world-submit-btn');

    if (!fileInput || !fileInput.files[0]) {
      app.toast('Please select a .zip world archive.', 'warning');
      return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);
    if (nameInput?.value) formData.append('worldName', nameInput.value.trim());
    formData.append('setActive', activeInput?.checked ? 'true' : 'false');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span> Uploading...`;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/servers/${this.currentServerId}/worlds/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const res = await response.json();
      if (!res.success) throw new Error(res.error || 'Failed to upload world.');

      app.toast(res.message || 'World imported successfully!', 'success');
      this.closeModal('import-world-modal');
      await this.loadWorlds();
    } catch (err) {
      app.toast(`Import failed: ${err.message}`, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // Open Clone World Modal
  openCloneModal(sourceWorld) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div id="clone-world-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="glass-panel w-full max-w-md rounded-3xl border border-white/20 p-6 space-y-5 shadow-2xl bg-slate-900/95">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <i data-lucide="copy" class="w-5 h-5"></i>
              </div>
              <h3 class="text-lg font-bold text-white">Clone World</h3>
            </div>
            <button onclick="worldManager.closeModal('clone-world-modal')" class="text-slate-400 hover:text-white transition">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form onsubmit="worldManager.handleCloneWorld(event, '${this.escapeHtml(sourceWorld)}')" class="space-y-4">
            <div>
              <span class="text-xs text-slate-400">Source World:</span>
              <p class="font-bold text-white text-sm font-mono mt-0.5">${this.escapeHtml(sourceWorld)}</p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">New Clone Name *</label>
              <input type="text" id="clone-target-name" value="${this.escapeHtml(sourceWorld)}_copy" required class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono" pattern="[a-zA-Z0-9_\\-]+" title="Only alphanumeric, underscores, and hyphens">
              <p class="text-[11px] text-slate-400 mt-1">A complete duplicate of the world will be saved under this folder name.</p>
            </div>

            <div class="pt-3 border-t border-white/10 flex justify-end gap-2">
              <button type="button" onclick="worldManager.closeModal('clone-world-modal')" class="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/10 transition">
                Cancel
              </button>
              <button type="submit" id="clone-world-submit-btn" class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
                <i data-lucide="copy" class="w-4 h-4"></i> Duplicate World
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
    const targetWorld = document.getElementById('clone-target-name')?.value?.trim();
    if (!targetWorld) return;

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceWorld, targetWorld })
      });

      app.toast(res.message || `Cloned ${sourceWorld} to ${targetWorld}`, 'success');
      this.closeModal('clone-world-modal');
      await this.loadWorlds();
    } catch (err) {
      app.toast(`Clone failed: ${err.message}`, 'error');
    }
  }

  // Confirm Reset World
  async confirmResetWorld(worldName) {
    const ok = await app.confirm({
      tag: 'RESET WORLD',
      tagIcon: 'refresh-cw',
      title: 'Reset World',
      badge: window.location.host,
      message: `Are you sure you want to RESET world "${worldName}"?`,
      subtext: 'This will permanently DELETE all chunk regions, player modifications, and entity data for this world.',
      icon: 'refresh-cw',
      confirmIcon: 'refresh-cw',
      confirmText: 'Reset World',
      type: 'warning'
    });
    if (!ok) return;

    this.executeResetWorld(worldName);
  }

  async executeResetWorld(worldName) {
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worldName })
      });

      app.toast(res.message || `World "${worldName}" has been reset.`, 'success');
      await this.loadWorlds();
    } catch (err) {
      app.toast(`Reset failed: ${err.message}`, 'error');
    }
  }

  // Confirm Delete World
  async confirmDeleteWorld(worldName) {
    const ok = await app.confirm({
      tag: 'DELETE WORLD',
      tagIcon: 'globe',
      title: 'Delete World',
      badge: window.location.host,
      message: `Are you sure you want to permanently delete world "${worldName}"?`,
      subtext: 'All dimension folders, region files, and level data will be removed. This action CANNOT be undone!',
      icon: 'trash-2',
      confirmIcon: 'trash-2',
      confirmText: 'Delete World',
      type: 'danger'
    });
    if (!ok) return;

    this.executeDeleteWorld(worldName);
  }

  async executeDeleteWorld(worldName) {
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worldName })
      });

      app.toast(res.message || `Deleted world "${worldName}"`, 'success');
      await this.loadWorlds();
    } catch (err) {
      app.toast(`Delete failed: ${err.message}`, 'error');
    }
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.remove();
  }

  // ==================== WORLD INSTALLER MODAL SUITE ====================

  openWorldInstallerModal(initialTab = 'catalog') {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div id="world-installer-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="glass-panel w-full max-w-4xl rounded-3xl border border-emerald-500/30 p-6 space-y-6 shadow-2xl bg-slate-900/95 max-h-[90vh] flex flex-col overflow-hidden">
          
          <!-- Modal Header -->
          <div class="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">
                <i data-lucide="sparkles" class="w-5 h-5"></i>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-lg font-black text-white">World Installer</h3>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">1-Click Deploy</span>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> CurseForge API Key Active
                  </span>
                </div>
                <p class="text-xs text-slate-400">Install pre-built maps, explore CurseForge worlds, download from direct URLs, or generate custom terrain.</p>
              </div>
            </div>
            <button onclick="worldManager.closeModal('world-installer-modal')" class="text-slate-400 hover:text-white transition">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <!-- Installer Subnav Pills -->
          <div class="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-950/60 border border-white/5 shrink-0">
            <button onclick="worldManager.switchInstallerTab('catalog')" id="inst-tab-catalog" class="inst-pill flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-emerald-500 text-slate-950 shadow-md">
              <i data-lucide="map" class="w-4 h-4"></i> Map Catalog
            </button>
            <button onclick="worldManager.switchInstallerTab('curseforge')" id="inst-tab-curseforge" class="inst-pill flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 text-slate-300 hover:bg-white/10">
              <i data-lucide="flame" class="w-4 h-4 text-amber-400"></i> CurseForge Worlds
            </button>
            <button onclick="worldManager.switchInstallerTab('url')" id="inst-tab-url" class="inst-pill flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 text-slate-300 hover:bg-white/10">
              <i data-lucide="link" class="w-4 h-4"></i> Direct URL (.zip)
            </button>
            <button onclick="worldManager.switchInstallerTab('generators')" id="inst-tab-generators" class="inst-pill flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 text-slate-300 hover:bg-white/10">
              <i data-lucide="cpu" class="w-4 h-4"></i> Custom Generators
            </button>
          </div>

          <!-- Dynamic Installer Tab Content -->
          <div id="world-installer-body" class="flex-1 overflow-y-auto space-y-4 pr-1">
            <!-- Injected via JS -->
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.switchInstallerTab(initialTab);
  }

  switchInstallerTab(tab) {
    document.querySelectorAll('.inst-pill').forEach(btn => {
      btn.className = 'inst-pill flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 text-slate-300 hover:bg-white/10';
    });

    const activeBtn = document.getElementById(`inst-tab-${tab}`);
    if (activeBtn) {
      activeBtn.className = 'inst-pill flex-1 min-w-[110px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-emerald-500 text-slate-950 shadow-md';
    }

    const body = document.getElementById('world-installer-body');
    if (!body) return;

    if (tab === 'catalog') {
      this.renderInstallerCatalog(body);
    } else if (tab === 'curseforge') {
      this.renderInstallerCurseForge(body);
    } else if (tab === 'url') {
      this.renderInstallerUrl(body);
    } else if (tab === 'generators') {
      this.renderInstallerGenerators(body);
    }

    if (window.lucide) lucide.createIcons();
  }

  // Render Map Catalog inside World Installer
  async renderInstallerCatalog(container) {
    container.innerHTML = `
      <div class="space-y-4">
        <!-- Search & Filter Strip -->
        <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div class="relative w-full sm:w-72">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-3"></i>
            <input type="text" id="installer-search-input" oninput="worldManager.filterInstallerMaps()" placeholder="Search maps by name or tag..." class="w-full glass-input pl-9 pr-3 py-2 rounded-xl text-xs">
          </div>

          <div class="flex flex-wrap gap-1.5 w-full sm:w-auto overflow-x-auto pb-1" id="installer-filter-pills">
            <button onclick="worldManager.filterByGenre('all')" class="genre-pill px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500 text-slate-950 transition" data-genre="all">All</button>
            <button onclick="worldManager.filterByGenre('skyblock')" class="genre-pill px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-300 hover:bg-white/10 transition" data-genre="skyblock">Skyblock</button>
            <button onclick="worldManager.filterByGenre('survival')" class="genre-pill px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-300 hover:bg-white/10 transition" data-genre="survival">Survival</button>
            <button onclick="worldManager.filterByGenre('parkour')" class="genre-pill px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-300 hover:bg-white/10 transition" data-genre="parkour">Parkour</button>
            <button onclick="worldManager.filterByGenre('pvp')" class="genre-pill px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-300 hover:bg-white/10 transition" data-genre="pvp">PvP & Arenas</button>
            <button onclick="worldManager.filterByGenre('spawn')" class="genre-pill px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-300 hover:bg-white/10 transition" data-genre="spawn">Spawns & Hubs</button>
            <button onclick="worldManager.filterByGenre('adventure')" class="genre-pill px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-300 hover:bg-white/10 transition" data-genre="adventure">Adventure</button>
          </div>
        </div>

        <!-- Maps Grid -->
        <div id="installer-maps-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div class="col-span-full py-12 text-center text-slate-400">
            <div class="animate-spin inline-block w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full mb-2"></div>
            <p class="text-xs">Fetching maps library...</p>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    try {
      const res = await app.api('/api/marketplace/maps');
      this.cachedMaps = res.maps || [];
      this.currentGenreFilter = 'all';
      this.renderFilteredMaps();
    } catch (e) {
      const grid = document.getElementById('installer-maps-grid');
      if (grid) grid.innerHTML = `<p class="col-span-full text-rose-400 text-xs text-center py-6">Failed to load catalog: ${e.message}</p>`;
    }
  }

  filterByGenre(genre) {
    this.currentGenreFilter = genre;
    document.querySelectorAll('.genre-pill').forEach(btn => {
      if (btn.dataset.genre === genre) {
        btn.className = 'genre-pill px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500 text-slate-950 transition';
      } else {
        btn.className = 'genre-pill px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-300 hover:bg-white/10 transition';
      }
    });
    this.renderFilteredMaps();
  }

  filterInstallerMaps() {
    this.renderFilteredMaps();
  }

  renderFilteredMaps() {
    const grid = document.getElementById('installer-maps-grid');
    if (!grid || !this.cachedMaps) return;

    const query = (document.getElementById('installer-search-input')?.value || '').toLowerCase().trim();
    const genre = this.currentGenreFilter || 'all';

    const filtered = this.cachedMaps.filter(m => {
      const matchesGenre = genre === 'all' || m.genre === genre;
      const matchesQuery = !query || 
        m.title.toLowerCase().includes(query) || 
        (m.tag || '').toLowerCase().includes(query) || 
        (m.description || '').toLowerCase().includes(query);
      return matchesGenre && matchesQuery;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-400">
          <p class="text-sm font-semibold">No world maps match your filter.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(m => `
      <div class="glass-panel p-4 rounded-2xl border border-white/10 bg-slate-900/60 hover:border-emerald-500/40 transition flex flex-col justify-between gap-3 shadow">
        <div class="space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-xl shrink-0">
              ${m.icon || '🗺️'}
            </div>
            <div class="text-right">
              <span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-black/40 text-emerald-300 border border-white/10">
                ${this.escapeHtml(m.tag || 'Map')}
              </span>
              <span class="text-[10px] text-slate-400 font-mono block mt-0.5">${m.sizeFormatted || ''}</span>
            </div>
          </div>

          <div>
            <h5 class="font-bold text-sm text-white truncate" title="${this.escapeHtml(m.title)}">
              ${this.escapeHtml(m.title)}
            </h5>
            <p class="text-[10px] text-slate-400">By ${this.escapeHtml(m.author || 'Community')}</p>
          </div>

          <p class="text-xs text-slate-300 line-clamp-2 leading-relaxed">
            ${this.escapeHtml(m.description)}
          </p>
        </div>

        <div class="pt-2 border-t border-white/5 flex items-center gap-2">
          <button id="inst-btn-${m.id}" onclick="worldManager.executeCuratedInstall('${m.id}', '${this.escapeHtml(m.title)}')" class="btn-cyber flex-1 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow">
            <i data-lucide="download" class="w-3.5 h-3.5"></i> 1-Click Install
          </button>
        </div>
      </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
  }

  async executeCuratedInstall(mapId, mapTitle) {
    const btn = document.getElementById(`inst-btn-${mapId}`);
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full mr-1"></span> Installing...`;
    }

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds/install-map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapId,
          customName: mapId.replace(/[^a-zA-Z0-9_]/g, '_'),
          setActive: true
        })
      });

      app.toast(res.message || `Successfully installed ${mapTitle}!`, 'success');
      this.closeModal('world-installer-modal');
      await this.loadWorlds();
    } catch (err) {
      app.toast(`Installation failed: ${err.message}`, 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="download" class="w-3.5 h-3.5"></i> 1-Click Install`;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  async installCurseForgeItem(modId, fileId, modName) {
    try {
      const defaultFolder = modName.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_');
      const customName = await app.prompt({
        tag: 'CURSEFORGE MAP',
        tagIcon: 'globe',
        title: 'Install World Map',
        message: `Enter world folder name for "${modName}":`,
        placeholder: defaultFolder,
        defaultValue: defaultFolder,
        confirmText: 'Install World',
        confirmIcon: 'download',
        type: 'fuchsia'
      });
      if (!customName || !customName.trim()) return;

      app.toast(`Downloading CurseForge map "${modName}"...`, 'info');
      const res = await app.api('/api/marketplace/curseforge/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: this.currentServerId,
          modId,
          fileId,
          customName,
          setActive: true
        })
      });

      app.toast(res.message || `Successfully installed ${modName}!`, 'success');
      this.closeModal('world-installer-modal');
      await this.loadWorlds();
    } catch (err) {
      app.toast(`CurseForge install error: ${err.message}`, 'error');
    }
  }

  // Render CurseForge Worlds Search inside World Installer
  async renderInstallerCurseForge(container) {
    const gameVersion = this.serverData?.jar_version || '';

    container.innerHTML = `
      <div class="space-y-4">
        <!-- CurseForge Header Banner -->
        <div class="glass-panel p-4 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-950/30 to-slate-900/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl shrink-0 font-black">
              🔥
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h5 class="font-bold text-white text-sm">CurseForge Worlds & Maps</h5>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">API Key Active</span>
              </div>
              <p class="text-xs text-slate-300">Browse official CurseForge Minecraft worlds, adventure maps, and survival creations.</p>
            </div>
          </div>
          <a href="https://www.curseforge.com/minecraft/worlds" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/30 transition flex items-center gap-1 shrink-0">
            <span>Browse on CurseForge</span>
            <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
          </a>
        </div>

        <!-- Search Bar -->
        <div class="flex flex-col sm:flex-row gap-2">
          <div class="relative flex-1">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
            <input type="text" id="cf-world-search-input" placeholder="Search CurseForge worlds (e.g. Parkour, Survival, Dropper, RLCraft)..." class="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-xs">
          </div>
          <button onclick="worldManager.executeCurseForgeSearch()" id="cf-search-btn" class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-bold shrink-0 flex items-center justify-center gap-2">
            <i data-lucide="search" class="w-4 h-4"></i> Search Worlds
          </button>
        </div>

        <!-- Results Container -->
        <div id="cf-worlds-results">
          <div class="glass-panel p-8 rounded-2xl border border-white/10 text-center space-y-2">
            <p class="text-sm font-bold text-white">CurseForge World Repository Ready</p>
            <p class="text-xs text-slate-400 max-w-md mx-auto">
              Your CurseForge API key is connected. Type a query above to search, or paste any CurseForge map URL directly into the <strong>Direct URL (.zip)</strong> tab.
            </p>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.executeCurseForgeSearch();
  }

  async executeCurseForgeSearch() {
    const query = document.getElementById('cf-world-search-input')?.value?.trim() || '';
    const container = document.getElementById('cf-worlds-results');
    const btn = document.getElementById('cf-search-btn');
    if (!container) return;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full mr-1.5"></span> Searching...`;
    }

    container.innerHTML = `
      <div class="py-10 text-center text-slate-400">
        <div class="animate-spin inline-block w-6 h-6 border-3 border-amber-500 border-t-transparent rounded-full mb-2"></div>
        <p class="text-xs">Querying CurseForge API...</p>
      </div>
    `;

    try {
      const res = await app.api(`/api/marketplace/curseforge/worlds?query=${encodeURIComponent(query)}`);
      
      if (res.items && res.items.length > 0) {
        container.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${res.items.map(item => `
              <div class="glass-panel p-4 rounded-2xl border border-white/10 bg-slate-900/60 hover:border-amber-500/40 transition flex flex-col justify-between gap-3 shadow">
                <div class="space-y-2.5">
                  <div class="flex items-start justify-between gap-2">
                    <img src="${item.logoUrl}" alt="${this.escapeHtml(item.name)}" class="w-11 h-11 rounded-xl object-cover border border-white/10 shrink-0" onerror="this.src='/assets/favicon.svg'">
                    <div class="text-right">
                      <span class="text-[10px] text-amber-300 font-mono font-bold block">
                        ${(item.downloadCount || 0).toLocaleString()} DLs
                      </span>
                    </div>
                  </div>

                  <div>
                    <h5 class="font-bold text-sm text-white truncate" title="${this.escapeHtml(item.name)}">
                      ${this.escapeHtml(item.name)}
                    </h5>
                    <p class="text-[10px] text-slate-400">By ${this.escapeHtml(item.authors || 'Unknown')}</p>
                  </div>

                  <p class="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    ${this.escapeHtml(item.summary || 'No summary available.')}
                  </p>
                </div>

                <div class="pt-2 border-t border-white/5 flex items-center gap-2">
                  ${item.latestFile?.downloadUrl ? `
                    <button onclick="worldManager.installCurseForgeItem('${item.id}', '${item.latestFile.id}', '${this.escapeHtml(item.name)}')" class="btn-cyber flex-1 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow">
                      <i data-lucide="download" class="w-3.5 h-3.5"></i> 1-Click Install
                    </button>
                  ` : `
                    <a href="${item.websiteUrl}" target="_blank" rel="noopener" class="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition flex items-center justify-center gap-1.5">
                      <i data-lucide="external-link" class="w-3.5 h-3.5"></i> View on CurseForge
                    </a>
                  `}
                </div>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        // Informative key activation state or empty
        container.innerHTML = `
          <div class="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-900/60 space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                ℹ️
              </div>
              <div>
                <h5 class="font-bold text-white text-sm">CurseForge Direct Map Installer Ready</h5>
                <p class="text-xs text-slate-300">
                  Your CurseForge API key has been registered. You can install any CurseForge map immediately by copying its download URL into the <strong>Direct URL (.zip)</strong> tab!
                </p>
              </div>
            </div>

            <div class="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
              <span class="text-[11px] font-bold uppercase text-amber-400 block tracking-wider">How to 1-Click install any CurseForge World:</span>
              <ol class="text-xs text-slate-300 list-decimal list-inside space-y-1">
                <li>Find any world on <a href="https://www.curseforge.com/minecraft/worlds" target="_blank" class="text-cyan-400 underline hover:text-white">curseforge.com/minecraft/worlds</a>.</li>
                <li>Right-click the file download button and select <strong>"Copy link address"</strong>.</li>
                <li>Switch to the <strong>Direct URL (.zip)</strong> tab, paste the link, and click <strong>Download & Install</strong>!</li>
              </ol>
            </div>
          </div>
        `;
      }
    } catch (err) {
      container.innerHTML = `
        <div class="glass-panel p-6 rounded-2xl border border-rose-500/20 text-center space-y-2">
          <p class="text-sm font-bold text-white">CurseForge Search</p>
          <p class="text-xs text-rose-300">${this.escapeHtml(err.message)}</p>
        </div>
      `;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="search" class="w-4 h-4"></i> Search Worlds`;
      }
      if (window.lucide) lucide.createIcons();
    }
  }

  // Render Direct URL Installer
  renderInstallerUrl(container) {
    container.innerHTML = `
      <div class="max-w-2xl mx-auto space-y-5 py-2">
        <div class="glass-panel p-5 rounded-3xl border border-white/10 bg-slate-950/40 space-y-2">
          <div class="flex items-center gap-2 text-cyan-400 font-bold text-xs">
            <i data-lucide="link-2" class="w-4 h-4"></i> Download & Install from Any URL
          </div>
          <p class="text-xs text-slate-300 leading-relaxed">
            Paste any direct HTTP or HTTPS link to a Minecraft world <code class="text-cyan-300 bg-black/40 px-1 py-0.5 rounded">.zip</code> archive (Planet Minecraft direct links, GitHub releases, Mediafire direct, Google Drive, Discord CDN, etc.).
          </p>
        </div>

        <form onsubmit="worldManager.handleUrlInstall(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">Direct World Download URL (.zip) *</label>
            <input type="url" id="inst-url-input" placeholder="https://example.com/downloads/awesome_map.zip" required class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono">
            <p class="text-[11px] text-slate-400 mt-1">Must point directly to a downloadable .zip archive containing world data or level.dat.</p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">World Folder Name *</label>
            <input type="text" id="inst-url-world-name" placeholder="e.g. custom_smp, adventure_island" required class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono" pattern="[a-zA-Z0-9_\\-]+" title="Only alphanumeric, underscores, and hyphens">
          </div>

          <div class="pt-1">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="inst-url-set-active" checked class="rounded bg-slate-800 border-white/20 text-emerald-500 focus:ring-0">
              <span class="text-xs text-emerald-300 font-semibold">Designate as Active Server World (level-name) immediately</span>
            </label>
          </div>

          <div class="pt-4 border-t border-white/10 flex justify-end gap-2">
            <button type="submit" id="inst-url-submit-btn" class="btn-cyber px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
              <i data-lucide="download-cloud" class="w-4 h-4"></i> Download & Install World
            </button>
          </div>
        </form>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  async handleUrlInstall(e) {
    e.preventDefault();
    const url = document.getElementById('inst-url-input')?.value?.trim();
    const customName = document.getElementById('inst-url-world-name')?.value?.trim();
    const setActive = document.getElementById('inst-url-set-active')?.checked !== false;
    const btn = document.getElementById('inst-url-submit-btn');

    if (!url) return;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full mr-2"></span> Downloading & Extracting...`;
    }

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds/install-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ downloadUrl: url, customName, setActive })
      });

      app.toast(res.message || 'World installed successfully!', 'success');
      this.closeModal('world-installer-modal');
      await this.loadWorlds();
    } catch (err) {
      app.toast(`Installation error: ${err.message}`, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // Render Custom Generators inside World Installer
  renderInstallerGenerators(container) {
    const generators = [
      {
        id: 'gen-void',
        title: 'Empty Void Dimension',
        desc: 'Generates an infinite empty void world with a single starting stone block at (0, 64, 0).',
        icon: '🌌',
        type: 'minecraft:flat',
        settings: '{"layers":[{"block":"minecraft:air","height":1}],"biome":"minecraft:the_void"}',
        structures: false,
        gamemode: 'survival',
        difficulty: 'normal'
      },
      {
        id: 'gen-superflat',
        title: 'Superflat Creative Builder',
        desc: 'Flat green plains world with peaceful difficulty and creative mode pre-set.',
        icon: '🟩',
        type: 'minecraft:flat',
        settings: '',
        structures: false,
        gamemode: 'creative',
        difficulty: 'peaceful'
      },
      {
        id: 'gen-amplified',
        title: 'Amplified Mountain Peaks',
        desc: 'Extreme mountainous terrain generator scaling all the way to cloud limits.',
        icon: '🏔️',
        type: 'minecraft:amplified',
        settings: '',
        structures: true,
        gamemode: 'survival',
        difficulty: 'hard'
      },
      {
        id: 'gen-large-biomes',
        title: 'Large Biomes SMP',
        desc: 'Standard Minecraft terrain with 16x larger biome scales for massive exploration.',
        icon: '🌲',
        type: 'minecraft:large_biomes',
        settings: '',
        structures: true,
        gamemode: 'survival',
        difficulty: 'normal'
      }
    ];

    container.innerHTML = `
      <div class="space-y-4">
        <p class="text-xs text-slate-400">Pick a specialized terrain generator profile to automatically configure your server.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${generators.map(g => `
            <div class="glass-panel p-5 rounded-2xl border border-white/10 bg-slate-900/60 hover:border-emerald-500/30 transition flex flex-col justify-between gap-4 shadow">
              <div class="space-y-2">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-2xl">
                    ${g.icon}
                  </div>
                  <div>
                    <h5 class="font-bold text-sm text-white">${this.escapeHtml(g.title)}</h5>
                    <span class="text-[10px] text-emerald-400 font-mono">${g.type}</span>
                  </div>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed">${this.escapeHtml(g.desc)}</p>
              </div>

              <div class="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                <button onclick="worldManager.executeGeneratorInstall('${g.id}', '${this.escapeHtml(g.title)}', '${g.type}', '${encodeURIComponent(g.settings)}', '${g.gamemode}', '${g.difficulty}', ${g.structures})" class="btn-cyber flex-1 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow">
                  <i data-lucide="cpu" class="w-3.5 h-3.5"></i> Generate & Set Active
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  async executeGeneratorInstall(id, title, levelType, encodedSettings, gameMode, difficulty, structures) {
    const defaultWorldName = `${id.replace('gen-', '')}_world`;
    const worldName = await app.prompt({
      tag: 'WORLD GENERATOR',
      tagIcon: 'globe',
      title: 'Generate World',
      message: `Enter world folder name for "${title}":`,
      placeholder: defaultWorldName,
      defaultValue: defaultWorldName,
      confirmText: 'Generate World',
      confirmIcon: 'cpu',
      type: 'fuchsia'
    });
    if (!worldName || !worldName.trim()) return;

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/worlds/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: worldName.trim(),
          levelType,
          gameMode,
          difficulty,
          generateStructures: structures,
          setActive: true
        })
      });

      app.toast(res.message || `World generator "${title}" initialized!`, 'success');
      this.closeModal('world-installer-modal');
      await this.loadWorlds();
    } catch (err) {
      app.toast(`Generator failed: ${err.message}`, 'error');
    }
  }
}

window.worldManager = new WorldManagerController();
