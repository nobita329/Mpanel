// ============================================================================
// SAGA Minecraft Player Manager v1.4 (Authentic Mpanel Edition)
// Compatible with SAGA Player Manager v1.4 from BuiltByBit / add-thame.git
// ============================================================================

class SagaPlayerManager {
  constructor() {
    this.currentServerId = null;
    this.serverData = null;
    this.selectedCategory = 'online'; // 'online', 'all', 'banned', 'whitelisted', 'ops', 'banned_ips'
    this.selectedPlayer = null;
    this.selectedWorld = 'world';
    this.worlds = [{ name: 'world', has_player_data: true }];
    this.searchQuery = '';
    this.sortOrder = 'asc'; // 'asc' | 'desc'
    this.activeDetailTab = 'inventory'; // 'inventory', 'stats', 'advancements'
    this.inventorySubTab = 'player'; // 'player' or 'ender'
    this.statsSubCategory = 'mined'; // 'mined', 'killed', 'crafted', 'custom'

    this.fastQueryData = null;
    this.playerDetails = null;
    this.isLoading = false;
    this.isDetailsLoading = false;
    this.liveAutoSync = true;
    this.syncInterval = null;
    this.isModalOpen = false;

    // Item texture cache
    this.itemIconCache = new Map();
  }

  // 1. Entry Point called when switching to 'players' tab
  async renderPlayerManagerTab(container, serverId, serverData) {
    this.currentServerId = serverId;
    this.serverData = serverData || {};

    container.innerHTML = `
      <div id="saga-player-manager-root" class="space-y-6">
        <!-- Top Title & Live Sync Controls -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-0.5 rounded-full border border-emerald-500/20">SAGA Player Manager</span>
              <span class="text-[10px] font-mono text-slate-400">v1.4</span>
            </div>
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <i data-lucide="gamepad-2" class="w-5 h-5 text-emerald-400"></i> Minecraft Player Manager
            </h2>
            <p class="text-xs text-slate-400">Real-time player monitoring, NBT inventories, Ender Chests, stats, advancements, and operator actions.</p>
          </div>

          <div class="flex items-center gap-2">
            <span id="saga-live-badge" class="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-mono">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> LIVE SYNC
            </span>
            <button id="saga-live-toggle-btn" onclick="playerManager.toggleLiveAutoSync()" class="px-3 py-1.5 rounded-xl text-xs font-semibold glass-btn text-slate-300 hover:text-white flex items-center gap-1.5 transition">
              <i data-lucide="pause" class="w-3.5 h-3.5 text-amber-400" id="saga-live-toggle-icon"></i>
              <span id="saga-live-toggle-text">Pause</span>
            </button>
            <button onclick="playerManager.handleManualRefresh()" class="px-3 py-1.5 rounded-xl text-xs font-semibold glass-btn text-slate-300 hover:text-white flex items-center gap-1.5 transition">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh
            </button>
          </div>
        </div>

        <!-- Main SAGA 2-Column Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- Left Column: Server Overview & Players List (Col 1-4) -->
          <div class="lg:col-span-4 space-y-4">
            <!-- Server Overview Box -->
            <div id="saga-server-overview-box" class="glass-panel p-5 rounded-3xl border border-white/10 space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-white/10">
                <span class="text-xs font-bold text-white flex items-center gap-1.5">
                  <i data-lucide="server" class="w-4 h-4 text-cyan-400"></i> Server Overview
                </span>
                <span id="saga-srv-status-indicator" class="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <span class="w-2 h-2 rounded-full bg-slate-500"></span> Checking...
                </span>
              </div>

              <!-- IP Box with copy -->
              <div onclick="playerManager.copyServerAddress()" class="p-2.5 rounded-xl bg-slate-900/80 border border-white/5 flex items-center justify-between cursor-pointer hover:border-cyan-500/40 transition">
                <div class="flex items-center gap-2 overflow-hidden">
                  <i data-lucide="network" class="w-3.5 h-3.5 text-slate-400 flex-shrink-0"></i>
                  <span id="saga-srv-address" class="text-xs font-mono text-slate-200 truncate">127.0.0.1:25565</span>
                </div>
                <i data-lucide="copy" class="w-3.5 h-3.5 text-slate-400 hover:text-white flex-shrink-0"></i>
              </div>

              <!-- MOTD -->
              <div id="saga-srv-motd" class="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-slate-300 font-mono text-center truncate">
                Loading server MOTD...
              </div>

              <!-- Stats Grid -->
              <div class="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <span class="text-[10px] text-slate-400 block mb-0.5">Players</span>
                  <span id="saga-stat-players-count" class="font-bold text-white text-sm">0 / 20</span>
                </div>
                <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                  <span class="text-[10px] text-slate-400 block mb-0.5">Version</span>
                  <span id="saga-stat-version-name" class="font-bold text-cyan-400 text-sm truncate">Paper 1.21</span>
                </div>
              </div>
            </div>

            <!-- Categories Tabs Box -->
            <div class="glass-panel p-4 rounded-3xl border border-white/10 space-y-3">
              <div class="grid grid-cols-2 gap-1.5" id="saga-categories-grid">
                <!-- Injected dynamically -->
              </div>

              <!-- Search and Sort bar -->
              <div class="flex items-center gap-2 pt-2 border-t border-white/5">
                <div class="relative flex-1">
                  <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5"></i>
                  <input type="text" id="saga-player-search" oninput="playerManager.handleSearch(this.value)" placeholder="Search players..." class="w-full glass-input pl-8 pr-3 py-1.5 rounded-xl text-xs">
                </div>
                <button onclick="playerManager.toggleSortOrder()" title="Toggle Sort Order" class="p-2 rounded-xl glass-btn text-slate-300 hover:text-white flex items-center justify-center">
                  <i data-lucide="arrow-down-up" class="w-3.5 h-3.5" id="saga-sort-icon"></i>
                </button>
              </div>

              <!-- Player Cards Scrollable Container -->
              <div id="saga-players-list-scroll" class="space-y-1.5 max-h-[440px] overflow-y-auto pr-1">
                <div class="text-center py-8 text-slate-500 text-xs">Loading players...</div>
              </div>
            </div>
          </div>

          <!-- Right Column: Player Details & Inspector (Col 5-12) -->
          <div class="lg:col-span-8 space-y-4" id="saga-player-details-container">
            <!-- Empty state placeholder by default -->
            <div class="glass-panel p-16 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center space-y-3 min-h-[500px]">
              <div class="w-16 h-16 rounded-2xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-slate-500 shadow-xl">
                <i data-lucide="gamepad-2" class="w-8 h-8"></i>
              </div>
              <h3 class="text-base font-bold text-slate-200">Select a player to view details</h3>
              <p class="text-xs text-slate-400 max-w-sm">Choose an online, whitelisted, operator, or banned player from the list on the left to inspect their inventory, stats, and run operator actions.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    await this.loadWorlds();
    await this.loadFastQueryData();
    this.startLiveAutoSync();
  }

  // 2. Worlds discovery
  async loadWorlds() {
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/players/detected-worlds`);
      if (res.success && res.worlds && res.worlds.length > 0) {
        this.worlds = res.worlds;
        const withData = this.worlds.find(w => w.has_player_data);
        if (withData) this.selectedWorld = withData.name;
        else this.selectedWorld = this.worlds[0].name;
      }
    } catch (e) {
      this.worlds = [{ name: 'world', has_player_data: true }];
    }
  }

  // 3. Fast Query: get online, all, banned, whitelist, ops, banned-ips
  async loadFastQueryData() {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const data = await app.api(`/api/servers/${this.currentServerId}/players`);
      if (data.success) {
        this.fastQueryData = data;
        this.renderServerOverview();
        this.renderCategories();
        this.renderPlayersList();

        // If a player is currently selected, refresh their details
        if (this.selectedPlayer) {
          this.loadPlayerDetails(this.selectedPlayer.name || this.selectedPlayer.uuid, false);
        }
      }
    } catch (err) {
      console.error('[SagaPlayerManager] loadFastQueryData error:', err);
    } finally {
      this.isLoading = false;
    }
  }

  // 4. Render Server Overview Box
  renderServerOverview() {
    if (!this.fastQueryData) return;
    const info = this.fastQueryData.info || {};
    const players = this.fastQueryData.players || {};
    const isOnline = !!this.fastQueryData.serverRunning;

    const statusEl = document.getElementById('saga-srv-status-indicator');
    if (statusEl) {
      statusEl.innerHTML = isOnline
        ? `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> <span class="text-emerald-400 font-bold">ONLINE</span>`
        : `<span class="w-2 h-2 rounded-full bg-rose-400"></span> <span class="text-rose-400 font-bold">OFFLINE</span>`;
    }

    const addrEl = document.getElementById('saga-srv-address');
    if (addrEl) {
      addrEl.textContent = `${info.ip || '127.0.0.1'}:${info.port || 25565}`;
    }

    const motdEl = document.getElementById('saga-srv-motd');
    if (motdEl) {
      motdEl.textContent = info.motd?.formatted || 'A Minecraft Server Powered by Mpanel';
    }

    const countEl = document.getElementById('saga-stat-players-count');
    if (countEl) {
      countEl.textContent = `${players.online?.length || 0} / ${info.maxplayers || 20}`;
    }

    const verEl = document.getElementById('saga-stat-version-name');
    if (verEl) {
      verEl.textContent = info.version?.name || 'Minecraft 1.21';
    }
  }

  copyServerAddress() {
    const addrEl = document.getElementById('saga-srv-address');
    if (addrEl) {
      app.copyToClipboard(addrEl.textContent.trim());
    }
  }

  // 5. Render Categories Grid
  renderCategories() {
    const container = document.getElementById('saga-categories-grid');
    if (!container || !this.fastQueryData) return;

    const counts = this.fastQueryData.players?.counts || {
      online: this.fastQueryData.players?.online?.length || 0,
      all: 0,
      banned: 0,
      whitelisted: 0,
      ops: 0,
      banned_ips: 0
    };

    const onlineCount = this.fastQueryData.players?.online?.length || 0;

    const categories = [
      { id: 'online', name: 'Online', icon: 'users', count: onlineCount, color: 'text-emerald-400' },
      { id: 'all', name: 'All Players', icon: 'list', count: counts.all, color: 'text-purple-400' },
      { id: 'banned', name: 'Banned', icon: 'ban', count: counts.banned, color: 'text-rose-400' },
      { id: 'whitelisted', name: 'Whitelist', icon: 'check-circle-2', count: counts.whitelisted, color: 'text-cyan-400' },
      { id: 'ops', name: 'Operators', icon: 'shield', count: counts.ops, color: 'text-amber-400' },
      { id: 'banned_ips', name: 'Banned IPs', icon: 'slash', count: counts.banned_ips, color: 'text-rose-500' }
    ];

    container.innerHTML = categories.map(cat => {
      const active = this.selectedCategory === cat.id;
      return `
        <button type="button" onclick="playerManager.handleCategorySelect('${cat.id}')" class="flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all border ${
          active
            ? 'bg-purple-600/30 border-purple-500/40 text-white shadow-md'
            : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
        }">
          <span class="flex items-center gap-1.5 truncate">
            <i data-lucide="${cat.icon}" class="w-3.5 h-3.5 ${cat.color} flex-shrink-0"></i>
            <span class="truncate">${cat.name}</span>
          </span>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${active ? 'bg-purple-500/30 text-purple-200' : 'bg-white/5 text-slate-400'}">
            ${cat.count}
          </span>
        </button>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  handleCategorySelect(catId) {
    this.selectedCategory = catId;
    this.renderCategories();
    this.renderPlayersList();
  }

  handleSearch(val) {
    this.searchQuery = (val || '').toLowerCase().trim();
    this.renderPlayersList();
  }

  toggleSortOrder() {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.renderPlayersList();
  }

  // 6. Render Players List in Sidebar
  renderPlayersList() {
    const listContainer = document.getElementById('saga-players-list-scroll');
    if (!listContainer || !this.fastQueryData) return;

    const listKey = this.selectedCategory;
    let players = [];

    if (listKey === 'banned_ips') {
      players = this.fastQueryData.players?.banned_ips || [];
    } else {
      players = this.fastQueryData.players?.[listKey] || [];
    }

    // Filter by search query
    let filtered = players.filter(p => {
      if (!this.searchQuery) return true;
      if (p.ip) return p.ip.toLowerCase().includes(this.searchQuery);
      return (p.name || '').toLowerCase().includes(this.searchQuery);
    });

    // Sort
    filtered.sort((a, b) => {
      const nameA = (a.name || a.ip || '').toLowerCase();
      const nameB = (b.name || b.ip || '').toLowerCase();
      return this.sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-8 text-slate-500 text-xs">
          No entries found in "${this.selectedCategory}".
        </div>
      `;
      return;
    }

    // Handle Banned IPs special rendering
    if (listKey === 'banned_ips') {
      listContainer.innerHTML = filtered.map(ipObj => `
        <div class="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/20 flex items-center justify-between gap-2 hover:border-rose-500/40 transition">
          <div class="flex items-center gap-2 overflow-hidden">
            <div class="w-8 h-8 rounded-lg bg-rose-900/40 flex items-center justify-center text-rose-400 border border-rose-500/20 flex-shrink-0">
              <i data-lucide="ban" class="w-4 h-4"></i>
            </div>
            <div class="truncate">
              <p class="text-xs font-mono font-bold text-rose-300 truncate">${ipObj.ip}</p>
              <p class="text-[10px] text-slate-400 truncate">${ipObj.reason || 'Banned IP'}</p>
            </div>
          </div>
          <button onclick="playerManager.handleUnbanIp('${ipObj.ip}')" class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-600/30 text-rose-300 border border-rose-500/30 hover:bg-rose-600/50 transition">
            Unban
          </button>
        </div>
      `).join('');
      if (window.lucide) lucide.createIcons();
      return;
    }

    // Standard Player Card rendering
    listContainer.innerHTML = filtered.map(p => {
      const isSelected = this.selectedPlayer && (this.selectedPlayer.uuid === p.uuid || this.selectedPlayer.name === p.name);
      const isOnline = (this.fastQueryData.players?.online || []).some(x => x.name === p.name || (p.uuid && x.uuid === p.uuid));
      const isOp = (this.fastQueryData.players?.ops || []).some(x => x.name === p.name || (p.uuid && x.uuid === p.uuid));
      const isBanned = (this.fastQueryData.players?.banned || []).some(x => x.name === p.name || (p.uuid && x.uuid === p.uuid));
      const isWhitelisted = (this.fastQueryData.players?.whitelisted || []).some(x => x.name === p.name || (p.uuid && x.uuid === p.uuid));

      let statusBadge = isOnline
        ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ONLINE</span>`
        : isBanned
        ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">BANNED</span>`
        : isOp
        ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">OP</span>`
        : isWhitelisted
        ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">WL</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-400 border border-white/5">OFFLINE</span>`;

      const avatarUrl = p.uuid
        ? `https://crafatar.com/avatars/${p.uuid}?overlay&size=40`
        : `https://mc-heads.net/avatar/${p.name}/40`;

      return `
        <div onclick="playerManager.handleSelectPlayer('${p.name}', '${p.uuid || ''}')" class="p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
          isSelected
            ? 'bg-purple-600/25 border-purple-500/50 shadow-lg shadow-purple-600/10'
            : 'bg-slate-900/60 border-white/5 hover:border-purple-500/30 hover:bg-slate-900'
        }">
          <div class="flex items-center gap-2.5 overflow-hidden">
            <img src="${avatarUrl}" onerror="this.src='https://mc-heads.net/avatar/${p.name}/40'" class="w-9 h-9 rounded-xl border border-white/10 flex-shrink-0 bg-black/40" alt="${p.name}">
            <div class="truncate">
              <h4 class="text-xs font-bold text-white truncate">${p.name}</h4>
              <p class="text-[10px] font-mono text-slate-400 truncate">${p.uuid ? p.uuid.slice(0, 13) + '...' : 'Offline UUID'}</p>
            </div>
          </div>
          <div class="flex-shrink-0">
            ${statusBadge}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  // 7. Select Player & Load Full Details
  async handleSelectPlayer(name, uuid) {
    this.selectedPlayer = { name, uuid };
    this.renderPlayersList();
    await this.loadPlayerDetails(name, true);
  }

  async loadPlayerDetails(name, showLoading = true) {
    const detailsContainer = document.getElementById('saga-player-details-container');
    if (!detailsContainer) return;

    if (showLoading) {
      detailsContainer.innerHTML = `
        <div class="glass-panel p-12 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center space-y-3 min-h-[400px]">
          <div class="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <p class="text-xs text-slate-300 font-mono">Loading player profile for ${name}...</p>
        </div>
      `;
    }

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/players/${encodeURIComponent(name)}/details?world=${encodeURIComponent(this.selectedWorld)}`);
      if (res.success) {
        this.playerDetails = res;
        this.renderPlayerDetailsView();
      } else {
        throw new Error(res.error || 'Failed to load player details.');
      }
    } catch (err) {
      detailsContainer.innerHTML = `
        <div class="glass-panel p-12 rounded-3xl border border-rose-500/30 text-center space-y-3">
          <i data-lucide="alert-triangle" class="w-10 h-10 text-rose-400 mx-auto"></i>
          <h3 class="text-base font-bold text-white">Failed to load ${name}</h3>
          <p class="text-xs text-slate-400">${err.message}</p>
          <button onclick="playerManager.loadPlayerDetails('${name}', true)" class="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold">Try Again</button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  }

  // 8. Render Right Column: Full SAGA Player Details View
  renderPlayerDetailsView() {
    const container = document.getElementById('saga-player-details-container');
    if (!container || !this.playerDetails) return;

    const p = this.playerDetails;
    const inv = p.inventory || {};
    const stats = p.statistics || {};
    const adv = p.advancements || {};
    const username = p.username || this.selectedPlayer.name;
    const uuid = p.uuid || this.selectedPlayer.uuid || 'Offline';

    const isOnline = !!p.isOnline;
    const isOp = (this.fastQueryData?.players?.ops || []).some(x => x.name === username);
    const isBanned = (this.fastQueryData?.players?.banned || []).some(x => x.name === username);
    const isWhitelisted = (this.fastQueryData?.players?.whitelisted || []).some(x => x.name === username);

    const bustUrl = `https://mc-heads.net/body/${username}/right`;
    const avatarUrl = `https://mc-heads.net/avatar/${username}/64`;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Player Profile Hero Banner -->
        <div class="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden space-y-5">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div class="flex items-center gap-4">
              <img src="${bustUrl}" onerror="this.src='${avatarUrl}'" class="h-20 w-auto max-w-[80px] object-contain drop-shadow-2xl" alt="${username}">
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-2xl font-black text-white">${username}</h3>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-white/5'
                  }">${isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                  ${isOp ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">OPERATOR</span>' : ''}
                  ${isBanned ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">BANNED</span>' : ''}
                </div>
                <div class="flex items-center gap-2 text-xs font-mono text-slate-400 mt-1">
                  <span>UUID: <span class="text-slate-200">${uuid}</span></span>
                  <button onclick="app.copyToClipboard('${uuid}')" title="Copy UUID" class="hover:text-white"><i data-lucide="copy" class="w-3.5 h-3.5"></i></button>
                </div>
              </div>
            </div>

            <!-- World Selector -->
            <div class="flex items-center gap-2">
              <label class="text-xs text-slate-400 font-semibold">World:</label>
              <select onchange="playerManager.handleWorldChange(this.value)" class="glass-input px-3 py-1.5 rounded-xl text-xs font-mono text-slate-200">
                ${this.worlds.map(w => `<option value="${w.name}" ${w.name === this.selectedWorld ? 'selected' : ''}>${w.name}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Live Attributes Bar -->
          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs font-mono">
            <div class="p-3 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
              <span class="text-[10px] text-slate-400 flex items-center gap-1">❤️ Health</span>
              <p class="font-bold text-rose-400 text-sm">${inv.health || 20} / ${inv.maxHealth || 20}</p>
            </div>
            <div class="p-3 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
              <span class="text-[10px] text-slate-400 flex items-center gap-1">🍖 Food</span>
              <p class="font-bold text-amber-400 text-sm">${inv.foodLevel || 20} / 20</p>
            </div>
            <div class="p-3 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
              <span class="text-[10px] text-slate-400 flex items-center gap-1">⭐ Level</span>
              <p class="font-bold text-emerald-400 text-sm">Lvl ${inv.xpLevel || 0}</p>
            </div>
            <div class="p-3 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
              <span class="text-[10px] text-slate-400 flex items-center gap-1">🎮 Mode</span>
              <p class="font-bold text-cyan-400 text-sm capitalize">${inv.gameType || 'Survival'}</p>
            </div>
            <div class="p-3 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
              <span class="text-[10px] text-slate-400 flex items-center gap-1">⏱️ Play Time</span>
              <p class="font-bold text-purple-300 text-sm">${stats.play_time || '0h 0m'}</p>
            </div>
            <div class="p-3 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
              <span class="text-[10px] text-slate-400 flex items-center gap-1">💀 K/D</span>
              <p class="font-bold text-white text-sm">${stats.kills || 0} / ${stats.deaths || 0}</p>
            </div>
          </div>

          <!-- Operator Quick Actions Toolbar -->
          <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
            <!-- Kick -->
            <button onclick="playerManager.showKickModal('${username}')" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 flex items-center gap-1.5 transition">
              <i data-lucide="log-out" class="w-3.5 h-3.5"></i> Kick
            </button>

            <!-- Ban / Unban -->
            ${isBanned
              ? `<button onclick="playerManager.handleAction('unban', { username: '${username}' })" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 flex items-center gap-1.5 transition">
                   <i data-lucide="unlock" class="w-3.5 h-3.5"></i> Unban
                 </button>`
              : `<button onclick="playerManager.showBanModal('${username}')" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 flex items-center gap-1.5 transition">
                   <i data-lucide="ban" class="w-3.5 h-3.5"></i> Ban
                 </button>`
            }

            <!-- OP / De-OP -->
            <button onclick="playerManager.handleAction('${isOp ? 'deop' : 'op'}', { username: '${username}' })" class="px-3 py-1.5 rounded-xl text-xs font-bold ${isOp ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-300 border border-white/10 hover:text-white'} flex items-center gap-1.5 transition">
              <i data-lucide="shield" class="w-3.5 h-3.5 text-amber-400"></i> ${isOp ? 'De-OP' : 'Make OP'}
            </button>

            <!-- Whitelist Toggle -->
            <button onclick="playerManager.handleAction('${isWhitelisted ? 'whitelist-remove' : 'whitelist-add'}', { username: '${username}' })" class="px-3 py-1.5 rounded-xl text-xs font-bold ${isWhitelisted ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-300 border border-white/10 hover:text-white'} flex items-center gap-1.5 transition">
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-cyan-400"></i> ${isWhitelisted ? 'Remove Whitelist' : 'Whitelist'}
            </button>

            <!-- Kill -->
            <button onclick="playerManager.handleKillPlayer('${username}')" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-950/40 text-rose-400 border border-rose-500/30 hover:bg-rose-900/50 flex items-center gap-1.5 transition">
              <i data-lucide="skull" class="w-3.5 h-3.5"></i> Kill
            </button>

            <!-- Teleport -->
            <button onclick="playerManager.showTeleportModal('${username}')" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-white/10 hover:text-white flex items-center gap-1.5 transition">
              <i data-lucide="navigation" class="w-3.5 h-3.5 text-cyan-400"></i> Teleport
            </button>

            <!-- Whisper -->
            <button onclick="playerManager.showWhisperModal('${username}')" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-white/10 hover:text-white flex items-center gap-1.5 transition">
              <i data-lucide="message-square" class="w-3.5 h-3.5 text-purple-400"></i> Message
            </button>

            <!-- Give Item -->
            <button onclick="playerManager.showGiveItemModal('${username}')" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 flex items-center gap-1.5 transition">
              <i data-lucide="gift" class="w-3.5 h-3.5"></i> Give Item
            </button>

            <!-- Gamemode Switcher -->
            <div class="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-xs font-mono">
              <button onclick="playerManager.handleGamemodeChange('${username}', 'survival')" class="px-2 py-1 rounded-lg ${inv.gameType === 'survival' ? 'bg-cyan-500/30 text-cyan-300 font-bold' : 'text-slate-400'}">S</button>
              <button onclick="playerManager.handleGamemodeChange('${username}', 'creative')" class="px-2 py-1 rounded-lg ${inv.gameType === 'creative' ? 'bg-cyan-500/30 text-cyan-300 font-bold' : 'text-slate-400'}">C</button>
              <button onclick="playerManager.handleGamemodeChange('${username}', 'adventure')" class="px-2 py-1 rounded-lg ${inv.gameType === 'adventure' ? 'bg-cyan-500/30 text-cyan-300 font-bold' : 'text-slate-400'}">A</button>
              <button onclick="playerManager.handleGamemodeChange('${username}', 'spectator')" class="px-2 py-1 rounded-lg ${inv.gameType === 'spectator' ? 'bg-cyan-500/30 text-cyan-300 font-bold' : 'text-slate-400'}">Sp</button>
            </div>
          </div>
        </div>

        <!-- Details Tabs Navigation (Inventory / Statistics / Advancements) -->
        <div class="glass-panel p-6 rounded-3xl border border-white/10 space-y-6">
          <div class="flex border-b border-white/10 pb-3 gap-3">
            <button onclick="playerManager.switchDetailTab('inventory')" class="px-4 py-2 rounded-xl text-xs font-bold transition ${
              this.activeDetailTab === 'inventory' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white glass-btn'
            }">
              <i data-lucide="package" class="w-4 h-4 inline mr-1.5"></i> Inventory & Ender Chest
            </button>

            <button onclick="playerManager.switchDetailTab('stats')" class="px-4 py-2 rounded-xl text-xs font-bold transition ${
              this.activeDetailTab === 'stats' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white glass-btn'
            }">
              <i data-lucide="bar-chart-2" class="w-4 h-4 inline mr-1.5"></i> Statistics
            </button>

            <button onclick="playerManager.switchDetailTab('advancements')" class="px-4 py-2 rounded-xl text-xs font-bold transition ${
              this.activeDetailTab === 'advancements' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white glass-btn'
            }">
              <i data-lucide="award" class="w-4 h-4 inline mr-1.5"></i> Advancements
            </button>
          </div>

          <!-- Dynamic Tab Content Area -->
          <div id="saga-detail-tab-content">
            ${this.renderActiveTabContent(username, inv, stats, adv)}
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  handleWorldChange(world) {
    this.selectedWorld = world;
    if (this.selectedPlayer) {
      this.loadPlayerDetails(this.selectedPlayer.name, true);
    }
  }

  switchDetailTab(tab) {
    this.activeDetailTab = tab;
    this.renderPlayerDetailsView();
  }

  // 9. Render Content of the Active Subtab
  renderActiveTabContent(username, inv, stats, adv) {
    if (this.activeDetailTab === 'inventory') {
      return this.renderInventoryView(username, inv);
    } else if (this.activeDetailTab === 'stats') {
      return this.renderStatisticsView(stats);
    } else if (this.activeDetailTab === 'advancements') {
      return this.renderAdvancementsView(adv);
    }
    return '';
  }

  // 10. Minecraft Inventory & Ender Chest Visual Renderer
  renderInventoryView(username, inv) {
    const isEnder = this.inventorySubTab === 'ender';
    const mainSlots = inv.main || Array(27).fill(null);
    const hotbarSlots = inv.hotbar || Array(9).fill(null);
    const enderSlots = inv.enderChest || Array(27).fill(null);
    const armor = inv.armor || { helmet: null, chestplate: null, leggings: null, boots: null };
    const offhand = inv.offhand || null;

    return `
      <div class="space-y-6">
        <!-- Sub-selector: Player Inventory vs Ender Chest -->
        <div class="flex items-center justify-between">
          <div class="flex p-1 bg-black/40 rounded-xl border border-white/5">
            <button onclick="playerManager.switchInventorySubTab('player')" class="px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              !isEnder ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white'
            }">Player Inventory</button>
            <button onclick="playerManager.switchInventorySubTab('ender')" class="px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              isEnder ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30' : 'text-slate-400 hover:text-white'
            }">Ender Chest</button>
          </div>

          <button onclick="playerManager.handleClearInventory('${username}')" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-950/40 text-rose-400 border border-rose-500/20 hover:bg-rose-900/50 flex items-center gap-1.5 transition">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Clear Inventory
          </button>
        </div>

        ${!isEnder ? `
          <!-- Player Inventory Layout -->
          <div class="space-y-4">
            <!-- Armor & Offhand Row -->
            <div class="p-4 rounded-2xl bg-slate-900/80 border border-white/5">
              <span class="text-xs font-bold text-slate-300 block mb-3">Armor & Offhand</span>
              <div class="flex items-center gap-3">
                ${this.renderSlot(armor.helmet, 'Helmet')}
                ${this.renderSlot(armor.chestplate, 'Chestplate')}
                ${this.renderSlot(armor.leggings, 'Leggings')}
                ${this.renderSlot(armor.boots, 'Boots')}
                <div class="w-px h-10 bg-white/10 mx-2"></div>
                ${this.renderSlot(offhand, 'Offhand Shield/Item')}
              </div>
            </div>

            <!-- Main 27-slot Inventory (3 rows x 9 columns) -->
            <div class="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
              <span class="text-xs font-bold text-slate-300 block mb-2">Main Inventory (27 Slots)</span>
              <div class="grid grid-cols-9 gap-2 max-w-xl">
                ${mainSlots.map((item, idx) => this.renderSlot(item, `Slot ${idx + 9}`)).join('')}
              </div>
            </div>

            <!-- Hotbar 9-slot Row -->
            <div class="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/20 space-y-2">
              <span class="text-xs font-bold text-purple-300 block mb-2">Active Hotbar (9 Slots)</span>
              <div class="grid grid-cols-9 gap-2 max-w-xl">
                ${hotbarSlots.map((item, idx) => this.renderSlot(item, `Hotbar ${idx + 1}`)).join('')}
              </div>
            </div>
          </div>
        ` : `
          <!-- Ender Chest Layout (27 slots) -->
          <div class="p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/20 space-y-3">
            <span class="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <i data-lucide="box" class="w-4 h-4"></i> Ender Chest Storage (27 Slots)
            </span>
            <div class="grid grid-cols-9 gap-2 max-w-xl">
              ${enderSlots.map((item, idx) => this.renderSlot(item, `Ender Slot ${idx + 1}`)).join('')}
            </div>
          </div>
        `}
      </div>
    `;
  }

  switchInventorySubTab(sub) {
    this.inventorySubTab = sub;
    this.renderPlayerDetailsView();
  }

  renderSlot(item, label) {
    if (!item || !item.id) {
      return `
        <div title="${label}: Empty" class="w-12 h-12 rounded-xl bg-black/60 border border-white/5 flex items-center justify-center text-slate-700 hover:border-white/20 transition">
          <span class="w-1.5 h-1.5 rounded-full bg-white/5"></span>
        </div>
      `;
    }

    const cleanId = item.id.replace('minecraft:', '');
    const countBadge = item.count > 1 ? `<span class="absolute bottom-1 right-1 px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-black/80 text-white border border-white/20 leading-none">${item.count}</span>` : '';
    const imgUrl = `https://mc.nerothe.com/img/1.21.8/minecraft_${cleanId}.png`;

    return `
      <div title="${cleanId} (x${item.count})" class="w-12 h-12 rounded-xl bg-slate-800/80 border border-white/10 hover:border-cyan-400 p-1 flex items-center justify-center relative group transition cursor-pointer shadow-md">
        <img src="${imgUrl}" onerror="this.src='https://assets.mcasset.cloud/1.21/assets/minecraft/textures/item/${cleanId}.png'" class="w-8 h-8 object-contain pixelated" alt="${cleanId}">
        ${countBadge}
      </div>
    `;
  }

  // 11. Statistics View
  renderStatisticsView(stats) {
    const raw = stats.raw || {};
    const mined = raw['minecraft:mined'] || {};
    const killed = raw['minecraft:killed'] || {};
    const crafted = raw['minecraft:crafted'] || {};
    const custom = raw['minecraft:custom'] || {};

    return `
      <div class="space-y-4">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-mono">
          <div class="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5">
            <span class="text-[10px] text-slate-400 block mb-1">Mined Blocks</span>
            <span class="font-bold text-purple-400 text-lg">${Object.values(mined).reduce((a, b) => a + b, 0)}</span>
          </div>
          <div class="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5">
            <span class="text-[10px] text-slate-400 block mb-1">Mobs Killed</span>
            <span class="font-bold text-rose-400 text-lg">${Object.values(killed).reduce((a, b) => a + b, 0)}</span>
          </div>
          <div class="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5">
            <span class="text-[10px] text-slate-400 block mb-1">Items Crafted</span>
            <span class="font-bold text-amber-400 text-lg">${Object.values(crafted).reduce((a, b) => a + b, 0)}</span>
          </div>
          <div class="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5">
            <span class="text-[10px] text-slate-400 block mb-1">Jumps</span>
            <span class="font-bold text-cyan-400 text-lg">${custom['minecraft:jump'] || 0}</span>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900/40 border border-white/5 space-y-3">
          <h4 class="text-xs font-bold text-white">Top Mined Blocks</h4>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
            ${Object.entries(mined).slice(0, 9).map(([key, val]) => `
              <div class="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                <span class="truncate text-slate-300">${key.replace('minecraft:', '')}</span>
                <span class="text-purple-400 font-bold ml-2">${val}</span>
              </div>
            `).join('') || '<div class="col-span-full text-center py-4 text-slate-500 text-xs">No blocks recorded.</div>'}
          </div>
        </div>
      </div>
    `;
  }

  // 12. Advancements View
  renderAdvancementsView(adv) {
    const list = adv.advancements || [];
    if (list.length === 0) {
      return `
        <div class="text-center py-12 text-slate-500 text-xs">
          No advancements completed yet for this player.
        </div>
      `;
    }

    return `
      <div class="space-y-3 max-h-[450px] overflow-y-auto pr-1">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${list.map(a => `
            <div class="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <i data-lucide="award" class="w-4 h-4"></i>
                </div>
                <div>
                  <h5 class="text-xs font-bold text-white capitalize">${(a.id || a.key || '').replace(/minecraft:[a-z]+\//, '').replace(/_/g, ' ')}</h5>
                  <p class="text-[10px] text-slate-400 font-mono">${a.done ? 'Completed' : 'In progress'}</p>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${a.done ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}">
                ${a.done ? 'DONE' : 'PENDING'}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 13. Operator Action Dispatcher
  async handleAction(action, payload = {}) {
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/players/action`, {
        method: 'POST',
        body: JSON.stringify({ action, ...payload })
      });
      if (res.success) {
        app.toast(res.message || 'Action executed successfully!', 'success');
        await this.loadFastQueryData();
      } else {
        app.toast(res.error || 'Action failed.', 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  // 14. Action Modals (Kick, Ban, Teleport, Whisper, Give Item)
  showKickModal(username) {
    const m = document.getElementById('modal-container');
    m.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-amber-500/30 shadow-2xl space-y-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="log-out" class="w-5 h-5 text-amber-400"></i> Kick Player: ${username}
          </h3>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Reason (Optional)</label>
            <input type="text" id="kick-reason" placeholder="Kicked by administrator" value="Kicked by administrator" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs">
          </div>
          <div class="flex gap-2 pt-2">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="flex-1 py-2 rounded-xl text-xs bg-slate-700 text-slate-300">Cancel</button>
            <button onclick="playerManager.submitKick('${username}')" class="btn-cyber flex-1 py-2 rounded-xl text-xs font-semibold">Confirm Kick</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  submitKick(username) {
    const reason = document.getElementById('kick-reason').value.trim();
    document.getElementById('modal-container').innerHTML = '';
    this.handleAction('kick', { username, reason });
  }

  showBanModal(username) {
    const m = document.getElementById('modal-container');
    m.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-rose-500/30 shadow-2xl space-y-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="ban" class="w-5 h-5 text-rose-400"></i> Ban Player: ${username}
          </h3>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Ban Reason</label>
            <input type="text" id="ban-reason" placeholder="Banned for violating server rules" value="Banned by administrator" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs">
          </div>
          <div class="flex gap-2 pt-2">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="flex-1 py-2 rounded-xl text-xs bg-slate-700 text-slate-300">Cancel</button>
            <button onclick="playerManager.submitBan('${username}')" class="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex-1">Confirm Ban</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  submitBan(username) {
    const reason = document.getElementById('ban-reason').value.trim();
    document.getElementById('modal-container').innerHTML = '';
    this.handleAction('ban', { username, reason });
  }

  async handleUnbanIp(ip) {
    const ok = await app.confirm({
      tag: 'UNBAN IP',
      tagIcon: 'shield',
      title: 'Unban Network IP',
      badge: window.location.host,
      message: `Are you sure you want to unban IP: ${ip}?`,
      subtext: 'This client address will be permitted to reconnect to the server.',
      icon: 'shield',
      confirmIcon: 'check',
      confirmText: 'Unban IP',
      type: 'info'
    });
    if (!ok) return;
    this.handleAction('unban-ip', { ip });
  }

  async handleKillPlayer(username) {
    const ok = await app.confirm({
      tag: 'KILL PLAYER',
      tagIcon: 'alert-triangle',
      title: 'Kill Player',
      badge: window.location.host,
      message: `Are you sure you want to kill ${username}?`,
      subtext: 'The in-game entity will be instantly eliminated on the live server.',
      icon: 'alert-triangle',
      confirmIcon: 'trash-2',
      confirmText: 'Kill Player',
      type: 'danger'
    });
    if (!ok) return;
    this.handleAction('kill', { username });
  }

  async handleClearInventory(username) {
    const ok = await app.confirm({
      tag: 'CLEAR INVENTORY',
      tagIcon: 'trash-2',
      title: 'Clear Inventory',
      badge: window.location.host,
      message: `WARNING: Are you sure you want to clear the entire inventory of ${username}?`,
      subtext: 'All armor, tools, and inventory slots will be purged without recovery.',
      icon: 'trash-2',
      confirmIcon: 'trash-2',
      confirmText: 'Wipe Inventory',
      type: 'danger'
    });
    if (!ok) return;
    this.handleAction('clear-inventory', { username });
  }

  showTeleportModal(username) {
    const m = document.getElementById('modal-container');
    const onlineOthers = (this.fastQueryData?.players?.online || []).filter(x => x.name !== username);

    m.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-cyan-500/30 shadow-2xl space-y-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="navigation" class="w-5 h-5 text-cyan-400"></i> Teleport: ${username}
          </h3>

          <!-- Option 1: To coordinates -->
          <div class="space-y-2">
            <label class="block text-xs font-semibold text-slate-300">Option A: Coordinates (X, Y, Z)</label>
            <div class="grid grid-cols-3 gap-2">
              <input type="number" id="tp-x" placeholder="X" value="0" class="glass-input px-3 py-1.5 rounded-xl text-xs font-mono">
              <input type="number" id="tp-y" placeholder="Y" value="80" class="glass-input px-3 py-1.5 rounded-xl text-xs font-mono">
              <input type="number" id="tp-z" placeholder="Z" value="0" class="glass-input px-3 py-1.5 rounded-xl text-xs font-mono">
            </div>
            <button onclick="playerManager.submitTpCoords('${username}')" class="w-full btn-cyber py-1.5 rounded-xl text-xs font-semibold">Teleport to Coordinates</button>
          </div>

          <div class="border-t border-white/10 pt-3 space-y-2">
            <label class="block text-xs font-semibold text-slate-300">Option B: To Another Player</label>
            <select id="tp-target-player" class="w-full glass-input px-3 py-2 rounded-xl text-xs">
              ${onlineOthers.length > 0
                ? onlineOthers.map(o => `<option value="${o.name}">${o.name}</option>`).join('')
                : '<option value="">No other online players</option>'
              }
            </select>
            <button onclick="playerManager.submitTpPlayer('${username}')" ${onlineOthers.length === 0 ? 'disabled' : ''} class="w-full btn-cyber-purple py-1.5 rounded-xl text-xs font-semibold">Teleport to Player</button>
          </div>

          <div class="pt-2 flex justify-end">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="px-4 py-1.5 rounded-xl text-xs bg-slate-700 text-slate-300">Cancel</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  submitTpCoords(username) {
    const x = document.getElementById('tp-x').value;
    const y = document.getElementById('tp-y').value;
    const z = document.getElementById('tp-z').value;
    document.getElementById('modal-container').innerHTML = '';
    this.handleAction('teleport', { username, target: `${x} ${y} ${z}` });
  }

  submitTpPlayer(username) {
    const target = document.getElementById('tp-target-player').value;
    if (!target) return;
    document.getElementById('modal-container').innerHTML = '';
    this.handleAction('teleport', { username, target });
  }

  showWhisperModal(username) {
    const m = document.getElementById('modal-container');
    m.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-purple-500/30 shadow-2xl space-y-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="message-square" class="w-5 h-5 text-purple-400"></i> Whisper to: ${username}
          </h3>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Message</label>
            <input type="text" id="whisper-msg" placeholder="Hello from server admin!" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs">
          </div>
          <div class="flex gap-2 pt-2">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="flex-1 py-2 rounded-xl text-xs bg-slate-700 text-slate-300">Cancel</button>
            <button onclick="playerManager.submitWhisper('${username}')" class="btn-cyber flex-1 py-2 rounded-xl text-xs font-semibold">Send Message</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  submitWhisper(username) {
    const message = document.getElementById('whisper-msg').value.trim();
    if (!message) return;
    document.getElementById('modal-container').innerHTML = '';
    this.handleAction('message', { username, message });
  }

  showGiveItemModal(username) {
    const m = document.getElementById('modal-container');
    m.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-purple-500/30 shadow-2xl space-y-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="gift" class="w-5 h-5 text-purple-400"></i> Give Item to: ${username}
          </h3>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Item ID</label>
              <input type="text" id="give-item-id" value="diamond_sword" placeholder="e.g. diamond, golden_apple" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Amount</label>
              <input type="number" id="give-item-count" value="1" min="1" max="64" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono">
            </div>
          </div>
          <div class="flex gap-2 pt-2">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="flex-1 py-2 rounded-xl text-xs bg-slate-700 text-slate-300">Cancel</button>
            <button onclick="playerManager.submitGiveItem('${username}')" class="btn-cyber flex-1 py-2 rounded-xl text-xs font-semibold">Give Item</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  submitGiveItem(username) {
    const item = document.getElementById('give-item-id').value.trim();
    const amount = document.getElementById('give-item-count').value;
    if (!item) return;
    document.getElementById('modal-container').innerHTML = '';
    this.handleAction('give', { username, item, amount });
  }

  handleGamemodeChange(username, gamemode) {
    this.handleAction('gamemode', { username, gamemode });
  }

  // 15. Live Sync Timer Management
  startLiveAutoSync() {
    this.stopLiveAutoSync();
    if (!this.liveAutoSync) return;
    this.syncInterval = setInterval(() => {
      if (!this.isModalOpen) {
        this.loadFastQueryData();
      }
    }, 3000);
  }

  stopLiveAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  toggleLiveAutoSync() {
    this.liveAutoSync = !this.liveAutoSync;
    const badge = document.getElementById('saga-live-badge');
    const icon = document.getElementById('saga-live-toggle-icon');
    const text = document.getElementById('saga-live-toggle-text');

    if (this.liveAutoSync) {
      this.startLiveAutoSync();
      if (badge) badge.className = 'px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-mono';
      if (text) text.textContent = 'Pause';
      if (icon) icon.setAttribute('data-lucide', 'pause');
      app.toast('Live sync enabled.', 'info');
    } else {
      this.stopLiveAutoSync();
      if (badge) badge.className = 'px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-800 text-slate-400 border border-white/5 flex items-center gap-1.5 font-mono';
      if (text) text.textContent = 'Resume';
      if (icon) icon.setAttribute('data-lucide', 'play');
      app.toast('Live sync paused.', 'info');
    }
    if (window.lucide) lucide.createIcons();
  }

  async handleManualRefresh() {
    app.toast('Refreshing player manager data...', 'info');
    await this.loadFastQueryData();
    app.toast('Player data synchronized.', 'success');
  }
}

// Instantiate global playerManager instance
window.playerManager = new SagaPlayerManager();
