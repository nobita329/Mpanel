/**
 * Mpanel - Server Splitter Module
 * Ported from serversplitter.blueprint (v1.1.4 by 0x7d8 / nobita329)
 * Allows splitting master server resources (RAM, CPU, Disk) into independent sub-servers.
 */

class ServerSplitter {
  constructor() {
    this.currentServerId = null;
    this.data = null;
    this.templates = [];
    this.displayUnit = 'gb'; // 'gb' | 'mb'
    this.isLoading = false;
    this.isSubmitting = false;

    // Form inputs state
    this.createForm = {
      name: '',
      description: '',
      server_type: 'minecraft',
      cpu: 50,
      memory: 1024,
      disk: 2048,
      sync_subusers: true,
      mc_jar_type: 'paper',
      mc_jar_version: '1.21.4'
    };

    this.resizeTarget = null;
    this.resizeForm = {
      cpu: 50,
      memory: 1024,
      disk: 2048
    };
  }

  formatSize(mb) {
    const num = parseInt(mb, 10) || 0;
    if (this.displayUnit === 'gb') {
      const gb = (num / 1024).toFixed(1).replace(/\.0$/, '');
      return `${gb} GB`;
    }
    return `${num} MB`;
  }

  toggleUnit() {
    this.displayUnit = this.displayUnit === 'gb' ? 'mb' : 'gb';
    this.render();
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

  async renderSplitterTab(container, serverId) {
    if (!container) return;
    this.container = container;
    this.currentServerId = serverId;
    this.isLoading = true;

    container.innerHTML = `
      <div class="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-3">
        <div class="animate-spin inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
        <p class="text-sm font-semibold text-slate-300">Loading Server Splitter allocations...</p>
      </div>
    `;

    try {
      await this.fetchData();
      await this.fetchTemplates();
      this.render();
    } catch (err) {
      container.innerHTML = `
        <div class="glass-panel p-12 rounded-3xl border border-rose-500/30 text-center space-y-3">
          <i data-lucide="alert-triangle" class="w-10 h-10 text-rose-400 mx-auto"></i>
          <h4 class="text-base font-bold text-white">Could not load Server Splitter</h4>
          <p class="text-xs text-slate-400">${err.message}</p>
          <button onclick="serverSplitter.renderSplitterTab(serverSplitter.container, serverSplitter.currentServerId)" class="btn-cyber px-4 py-2 rounded-xl text-xs mt-2">Retry</button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    } finally {
      this.isLoading = false;
    }
  }

  async fetchData() {
    const res = await app.api(`/api/servers/${this.currentServerId}/splitter`);
    if (!res.success) throw new Error(res.error || 'Failed to fetch splitter data');
    this.data = res;

    // Set initial form defaults based on available pool
    if (this.data && this.data.resources && this.data.resources.remaining) {
      const rem = this.data.resources.remaining;
      this.createForm.memory = Math.min(Math.max(128, Math.floor(rem.memory / 2)), rem.memory || 1024);
      this.createForm.cpu = Math.min(Math.max(10, Math.floor(rem.cpu / 2)), rem.cpu || 50);
      this.createForm.disk = Math.min(Math.max(256, Math.floor(rem.disk / 2)), rem.disk || 2048);
    }
  }

  async fetchTemplates() {
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/splitter/templates`);
      if (res.success && res.templates) {
        this.templates = res.templates;
      }
    } catch (e) {
      console.warn('Could not load templates:', e);
    }
  }

  render() {
    if (!this.container || !this.data) return;
    const { master, current_server, is_split, resources, servers } = this.data;
    const { total, used, remaining, reserved } = resources;

    const memPct = total.memory > 0 ? Math.min(100, Math.round(((used.memory + reserved.memory) / total.memory) * 100)) : 0;
    const cpuPct = total.cpu > 0 ? Math.min(100, Math.round(((used.cpu + reserved.cpu) / total.cpu) * 100)) : 0;
    const diskPct = total.disk > 0 ? Math.min(100, Math.round(((used.disk + reserved.disk) / total.disk) * 100)) : 0;
    const slotsPct = total.splits > 0 ? Math.min(100, Math.round((used.splits / total.splits) * 100)) : 0;

    const canCreate = remaining.splits > 0 && remaining.memory >= 128 && remaining.cpu >= 5;

    this.container.innerHTML = `
      <div id="splitter-root" class="space-y-6 animate-fade-in">
        <!-- 1. Header Hero Card -->
        <div class="glass-panel p-6 rounded-3xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-indigo-950/40 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 flex items-center gap-1.5">
                <i data-lucide="git-fork" class="w-3.5 h-3.5"></i> Server Splitter
              </span>
              <span class="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800/80 text-cyan-300 border border-white/10 uppercase">
                v1.1.4 Blueprint
              </span>
              <span class="text-[10px] text-slate-400 font-mono">by 0x7d8</span>
            </div>
            <h3 class="text-2xl font-black text-white flex items-center gap-2">
              Server Resource Splitter
            </h3>
            <p class="text-xs text-slate-300 max-w-2xl">
              Partition your server's RAM, CPU, and Disk allocations into independent sub-servers with isolated environments and dedicated ports.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <!-- GB / MB Unit Toggle -->
            <button type="button" onclick="serverSplitter.toggleUnit()" title="Toggle display units (MB / GB)" class="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/10 transition flex items-center gap-1.5 shadow">
              <i data-lucide="arrow-left-right" class="w-3.5 h-3.5 text-purple-400"></i>
              <span>Units: <b>${this.displayUnit.toUpperCase()}</b></span>
            </button>

            <!-- Refresh Button -->
            <button type="button" onclick="serverSplitter.renderSplitterTab(serverSplitter.container, serverSplitter.currentServerId)" title="Reload resource pool status" class="p-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 border border-white/10 transition">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>

            <!-- Create Split Button -->
            <button type="button" onclick="serverSplitter.openCreateModal()" ${!canCreate ? 'disabled' : ''} class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20 flex items-center gap-2 ${!canCreate ? 'opacity-50 cursor-not-allowed' : ''}">
              <i data-lucide="plus-circle" class="w-4 h-4"></i> Split Server
            </button>
          </div>
        </div>

        <!-- 2. Child Split Server Notice Banner (if currently inside a split server) -->
        ${is_split ? `
          <div class="glass-panel p-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                <i data-lucide="git-branch" class="w-5 h-5"></i>
              </div>
              <div>
                <h5 class="text-xs font-bold text-white">Child Split Server</h5>
                <p class="text-[11px] text-slate-300">
                  This server (${this.escapeHtml(current_server.name)}) is running on resources carved out of master server <b>${this.escapeHtml(master.name)}</b>.
                </p>
              </div>
            </div>
            <button type="button" onclick="app.navigate('server-manage/${master.id}/splitter')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 transition shrink-0 flex items-center gap-1.5">
              <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i> Manage Master Pool
            </button>
          </div>
        ` : ''}

        <!-- 3. Resource Pool Overview Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Memory Pool -->
          <div class="glass-card p-4 rounded-2xl border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <i data-lucide="cpu" class="w-4 h-4 text-purple-400"></i> Memory (RAM)
              </span>
              <span class="text-xs font-mono font-bold ${remaining.memory > 0 ? 'text-purple-300' : 'text-rose-400'}">${memPct}%</span>
            </div>
            <div>
              <div class="text-xl font-black text-white font-mono">
                ${this.formatSize(remaining.memory)} <span class="text-xs font-normal text-slate-400">free</span>
              </div>
              <p class="text-[10px] text-slate-400 font-mono mt-0.5">
                Used: ${this.formatSize(used.memory)} / Pool: ${this.formatSize(total.memory)}
              </p>
            </div>
            <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div class="h-2 rounded-full transition-all duration-500 ${memPct > 85 ? 'bg-rose-500' : memPct > 65 ? 'bg-amber-400' : 'bg-purple-500'}" style="width: ${memPct}%"></div>
            </div>
            <div class="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5 font-mono">
              <span>Reserved: ${this.formatSize(reserved.memory)}</span>
              <span>Splits: ${this.formatSize(used.memory)}</span>
            </div>
          </div>

          <!-- CPU Pool -->
          <div class="glass-card p-4 rounded-2xl border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <i data-lucide="zap" class="w-4 h-4 text-cyan-400"></i> CPU Capacity
              </span>
              <span class="text-xs font-mono font-bold ${remaining.cpu > 0 ? 'text-cyan-300' : 'text-rose-400'}">${cpuPct}%</span>
            </div>
            <div>
              <div class="text-xl font-black text-white font-mono">
                ${remaining.cpu}% <span class="text-xs font-normal text-slate-400">free</span>
              </div>
              <p class="text-[10px] text-slate-400 font-mono mt-0.5">
                Used: ${used.cpu}% / Pool: ${total.cpu}%
              </p>
            </div>
            <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div class="h-2 rounded-full transition-all duration-500 ${cpuPct > 85 ? 'bg-rose-500' : cpuPct > 65 ? 'bg-amber-400' : 'bg-cyan-500'}" style="width: ${cpuPct}%"></div>
            </div>
            <div class="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5 font-mono">
              <span>Reserved: ${reserved.cpu}%</span>
              <span>Splits: ${used.cpu}%</span>
            </div>
          </div>

          <!-- Disk Pool -->
          <div class="glass-card p-4 rounded-2xl border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <i data-lucide="hard-drive" class="w-4 h-4 text-emerald-400"></i> Disk Storage
              </span>
              <span class="text-xs font-mono font-bold ${remaining.disk > 0 ? 'text-emerald-300' : 'text-rose-400'}">${diskPct}%</span>
            </div>
            <div>
              <div class="text-xl font-black text-white font-mono">
                ${this.formatSize(remaining.disk)} <span class="text-xs font-normal text-slate-400">free</span>
              </div>
              <p class="text-[10px] text-slate-400 font-mono mt-0.5">
                Used: ${this.formatSize(used.disk)} / Pool: ${this.formatSize(total.disk)}
              </p>
            </div>
            <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div class="h-2 rounded-full transition-all duration-500 ${diskPct > 85 ? 'bg-rose-500' : diskPct > 65 ? 'bg-amber-400' : 'bg-emerald-500'}" style="width: ${diskPct}%"></div>
            </div>
            <div class="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5 font-mono">
              <span>Reserved: ${this.formatSize(reserved.disk)}</span>
              <span>Splits: ${this.formatSize(used.disk)}</span>
            </div>
          </div>

          <!-- Split Slots -->
          <div class="glass-card p-4 rounded-2xl border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <i data-lucide="layers" class="w-4 h-4 text-amber-400"></i> Split Slots
              </span>
              <span class="text-xs font-mono font-bold ${remaining.splits > 0 ? 'text-amber-300' : 'text-rose-400'}">
                ${used.splits} / ${total.splits}
              </span>
            </div>
            <div>
              <div class="text-xl font-black text-white font-mono">
                ${remaining.splits} <span class="text-xs font-normal text-slate-400">slots left</span>
              </div>
              <p class="text-[10px] text-slate-400 font-mono mt-0.5">
                Limit: ${total.splits} servers total
              </p>
            </div>
            <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div class="h-2 rounded-full transition-all duration-500 bg-amber-500" style="width: ${slotsPct}%"></div>
            </div>
            <div class="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5 font-mono">
              <span>Active Splits: ${used.splits}</span>
              <span>Available: ${remaining.splits}</span>
            </div>
          </div>
        </div>

        <!-- 4. Active Split Servers Section -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-base font-bold text-white flex items-center gap-2">
                <i data-lucide="server" class="w-4 h-4 text-purple-400"></i> Split Servers
                <span class="text-xs font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                  ${servers.length}
                </span>
              </h4>
              <p class="text-xs text-slate-400">Manage all sub-servers running on resources split from ${this.escapeHtml(master.name)}.</p>
            </div>

            ${canCreate ? `
              <button type="button" onclick="serverSplitter.openCreateModal()" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i> New Split
              </button>
            ` : ''}
          </div>

          ${servers.length === 0 ? `
            <div class="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-3 shadow-lg">
              <div class="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto">
                <i data-lucide="git-fork" class="w-7 h-7"></i>
              </div>
              <h4 class="text-base font-bold text-white">No Split Servers Yet</h4>
              <p class="text-xs text-slate-400 max-w-md mx-auto">
                You haven't split this master server yet. Click below to allocate unused RAM and CPU to launch an independent sub-server.
              </p>
              <button type="button" onclick="serverSplitter.openCreateModal()" ${!canCreate ? 'disabled' : ''} class="btn-cyber px-5 py-2 rounded-xl text-xs font-bold mt-2">
                <i data-lucide="plus-circle" class="w-4 h-4 inline mr-1"></i> Create Your First Split Server
              </button>
            </div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${servers.map(s => this.renderSplitServerCard(s)).join('')}
            </div>
          `}
        </div>

        <!-- 5. Modals Container -->
        <div id="splitter-modal-container"></div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  renderSplitServerCard(s) {
    const isRunning = s.status === 'running';
    const isStarting = s.status === 'starting';

    let statusBadge = '';
    if (isRunning) {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>Online</span>`;
    } else if (isStarting) {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-spin"></span>Starting</span>`;
    } else {
      statusBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20"><span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Offline</span>`;
    }

    const typeIcons = {
      minecraft: 'box',
      nodejs: 'code',
      python: 'terminal',
      lumenvm: 'cpu',
      vm: 'cpu'
    };
    const icon = typeIcons[s.server_type] || 'server';

    return `
      <div class="glass-panel p-5 rounded-2xl border border-white/10 space-y-4 hover:border-purple-500/30 transition shadow-lg relative group">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <i data-lucide="${icon}" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h5 class="text-sm font-bold text-white hover:text-purple-300 transition cursor-pointer" onclick="app.navigate('server-manage/${s.id}/console')">
                  ${this.escapeHtml(s.name)}
                </h5>
                ${statusBadge}
              </div>
              <p class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                ${this.escapeHtml(s.description || 'Split sub-server')}
              </p>
            </div>
          </div>

          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-white/10">
            :${s.assigned_port || '25565'}
          </span>
        </div>

        <!-- Resource Pills -->
        <div class="grid grid-cols-3 gap-2 text-center pt-2 border-t border-white/5">
          <div class="p-2 rounded-xl bg-slate-900/60 border border-white/5">
            <span class="text-[10px] text-slate-400 block font-medium">Memory</span>
            <span class="text-xs font-mono font-bold text-purple-300">${this.formatSize(s.memory_mb)}</span>
          </div>
          <div class="p-2 rounded-xl bg-slate-900/60 border border-white/5">
            <span class="text-[10px] text-slate-400 block font-medium">CPU</span>
            <span class="text-xs font-mono font-bold text-cyan-300">${s.cpu_limit}%</span>
          </div>
          <div class="p-2 rounded-xl bg-slate-900/60 border border-white/5">
            <span class="text-[10px] text-slate-400 block font-medium">Disk</span>
            <span class="text-xs font-mono font-bold text-emerald-300">${this.formatSize(s.disk_mb)}</span>
          </div>
        </div>

        <!-- Actions Toolbar -->
        <div class="flex items-center justify-between pt-3 border-t border-white/5 gap-2">
          <button type="button" onclick="app.navigate('server-manage/${s.id}/console')" class="btn-cyber flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow">
            <i data-lucide="terminal" class="w-3.5 h-3.5"></i> Console
          </button>

          <button type="button" onclick="serverSplitter.openResizeModal(${s.id})" title="Resize RAM, CPU, or Disk" class="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition">
            <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
          </button>

          <button type="button" onclick="serverSplitter.syncSubusers(${s.id})" title="Sync subusers from master server" class="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition">
            <i data-lucide="users" class="w-3.5 h-3.5"></i>
          </button>

          <button type="button" onclick="serverSplitter.confirmDeleteSplit(${s.id}, '${this.escapeHtml(s.name)}')" title="Delete split and refund resources" class="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-rose-500/30 transition">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Modals (Create, Resize, Delete)
  // ---------------------------------------------------------------------------

  openCreateModal() {
    const modalContainer = document.getElementById('splitter-modal-container');
    if (!modalContainer || !this.data) return;

    const remaining = this.data.resources.remaining;

    modalContainer.innerHTML = `
      <div id="create-split-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
        <div class="glass-panel w-full max-w-xl p-6 rounded-3xl border border-purple-500/30 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <!-- Modal Header -->
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <i data-lucide="git-fork" class="w-5 h-5"></i>
              </div>
              <div>
                <h4 class="text-base font-bold text-white">Create Split Server</h4>
                <p class="text-[11px] text-slate-400">Allocate resources from ${this.escapeHtml(this.data.master.name)}.</p>
              </div>
            </div>
            <button onclick="serverSplitter.closeModal()" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Form Fields -->
          <form onsubmit="serverSplitter.handleCreateSplit(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Server Name *</label>
              <input type="text" id="split-name" required placeholder="e.g. Survival SMP or Lobby Proxy" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs text-white" value="${this.escapeHtml(this.createForm.name)}">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Description (Optional)</label>
              <input type="text" id="split-desc" placeholder="Brief note about this split sub-server" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs text-white" value="${this.escapeHtml(this.createForm.description)}">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Server Template / Type</label>
              <select id="split-type" onchange="serverSplitter.onTypeChange(this.value)" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900 text-white">
                <option value="minecraft" selected>Minecraft: Java Edition (Paper / Purpur / Spigot)</option>
                <option value="nodejs">Node.js Bot / Web API</option>
                <option value="python">Python Application / Bot</option>
                <option value="lumenvm">LumenVM (Linux Virtual Machine)</option>
              </select>
            </div>

            <!-- Minecraft Specific Options -->
            <div id="split-mc-options" class="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 mb-1">Engine / Core</label>
                  <select id="split-mc-jar" class="w-full glass-input px-2.5 py-1.5 rounded-lg text-xs bg-slate-900 text-white">
                    <option value="paper" selected>Paper (Recommended)</option>
                    <option value="purpur">Purpur (Custom Gameplay)</option>
                    <option value="spigot">Spigot</option>
                    <option value="vanilla">Vanilla Mojang</option>
                    <option value="velocity">Velocity Proxy</option>
                    <option value="bungeecord">BungeeCord</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-400 mb-1">Version</label>
                  <input type="text" id="split-mc-version" value="1.21.4" class="w-full glass-input px-2.5 py-1.5 rounded-lg text-xs font-mono text-white">
                </div>
              </div>
            </div>

            <!-- Resource Allocation Sliders -->
            <div class="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-purple-300 uppercase tracking-wider">Resource Allocations</span>
                <span class="text-[10px] text-slate-400">Available: ${this.formatSize(remaining.memory)} RAM, ${remaining.cpu}% CPU</span>
              </div>

              <!-- Memory -->
              <div class="space-y-1.5">
                <div class="flex justify-between text-xs">
                  <span class="font-semibold text-slate-300">Memory (RAM):</span>
                  <span id="split-mem-val" class="font-mono font-bold text-purple-400">${this.formatSize(this.createForm.memory)}</span>
                </div>
                <input type="range" id="split-mem-slider" min="128" max="${remaining.memory}" step="128" value="${this.createForm.memory}" oninput="serverSplitter.onMemoryInput(this.value)" class="w-full accent-purple-500 cursor-pointer">
              </div>

              <!-- CPU Limit -->
              <div class="space-y-1.5">
                <div class="flex justify-between text-xs">
                  <span class="font-semibold text-slate-300">CPU Limit:</span>
                  <span id="split-cpu-val" class="font-mono font-bold text-cyan-400">${this.createForm.cpu}%</span>
                </div>
                <input type="range" id="split-cpu-slider" min="5" max="${remaining.cpu}" step="5" value="${this.createForm.cpu}" oninput="serverSplitter.onCpuInput(this.value)" class="w-full accent-cyan-500 cursor-pointer">
              </div>

              <!-- Disk -->
              <div class="space-y-1.5">
                <div class="flex justify-between text-xs">
                  <span class="font-semibold text-slate-300">Disk Storage:</span>
                  <span id="split-disk-val" class="font-mono font-bold text-emerald-400">${this.formatSize(this.createForm.disk)}</span>
                </div>
                <input type="range" id="split-disk-slider" min="256" max="${remaining.disk}" step="256" value="${this.createForm.disk}" oninput="serverSplitter.onDiskInput(this.value)" class="w-full accent-emerald-500 cursor-pointer">
              </div>
            </div>

            <!-- Sync Subusers switch -->
            <label class="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5 cursor-pointer">
              <div>
                <span class="text-xs font-bold text-white block">Sync Subusers Access</span>
                <span class="text-[10px] text-slate-400">Copy current user permissions from master server to this new split</span>
              </div>
              <input type="checkbox" id="split-sync-subusers" checked class="w-4 h-4 accent-purple-500 rounded">
            </label>

            <!-- Submit & Cancel Buttons -->
            <div class="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button type="button" onclick="serverSplitter.closeModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 transition">Cancel</button>
              <button type="submit" id="btn-submit-split" class="btn-cyber px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <i data-lucide="git-fork" class="w-4 h-4"></i> Create Split Server
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  onTypeChange(val) {
    const mcOpts = document.getElementById('split-mc-options');
    if (mcOpts) {
      if (val === 'minecraft') {
        mcOpts.classList.remove('hidden');
      } else {
        mcOpts.classList.add('hidden');
      }
    }
  }

  onMemoryInput(val) {
    this.createForm.memory = parseInt(val, 10);
    const label = document.getElementById('split-mem-val');
    if (label) label.textContent = this.formatSize(this.createForm.memory);
  }

  onCpuInput(val) {
    this.createForm.cpu = parseInt(val, 10);
    const label = document.getElementById('split-cpu-val');
    if (label) label.textContent = `${this.createForm.cpu}%`;
  }

  onDiskInput(val) {
    this.createForm.disk = parseInt(val, 10);
    const label = document.getElementById('split-disk-val');
    if (label) label.textContent = this.formatSize(this.createForm.disk);
  }

  closeModal() {
    const modalContainer = document.getElementById('splitter-modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
  }

  async handleCreateSplit(e) {
    e.preventDefault();
    if (this.isSubmitting) return;

    const btn = document.getElementById('btn-submit-split');
    const nameEl = document.getElementById('split-name');
    const descEl = document.getElementById('split-desc');
    const typeEl = document.getElementById('split-type');
    const jarEl = document.getElementById('split-mc-jar');
    const verEl = document.getElementById('split-mc-version');
    const syncEl = document.getElementById('split-sync-subusers');

    const payload = {
      name: nameEl ? nameEl.value.trim() : '',
      description: descEl ? descEl.value.trim() : '',
      server_type: typeEl ? typeEl.value : 'minecraft',
      memory_mb: this.createForm.memory,
      cpu_limit: this.createForm.cpu,
      disk_mb: this.createForm.disk,
      sync_subusers: syncEl ? syncEl.checked : true,
      mc_jar_type: jarEl ? jarEl.value : 'paper',
      mc_jar_version: verEl ? verEl.value.trim() : '1.21.4'
    };

    if (!payload.name) {
      app.toast('Server name is required', 'error');
      return;
    }

    try {
      this.isSubmitting = true;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full mr-1.5"></span> Splitting...`;
      }

      const res = await app.api(`/api/servers/${this.currentServerId}/splitter`, {
        method: 'POST',
        body: payload
      });
      if (!res.success) throw new Error(res.error || 'Failed to create split');

      app.toast(res.message || 'Split server created successfully!', 'success');
      this.closeModal();
      await this.renderSplitterTab(this.container, this.currentServerId);
    } catch (err) {
      app.toast(err.message, 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="git-fork" class="w-4 h-4"></i> Create Split Server`;
        if (window.lucide) lucide.createIcons();
      }
    } finally {
      this.isSubmitting = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Resize Modal
  // ---------------------------------------------------------------------------

  openResizeModal(splitId) {
    const modalContainer = document.getElementById('splitter-modal-container');
    if (!modalContainer || !this.data) return;

    const split = (this.data.servers || []).find(s => s.id === splitId);
    if (!split) return;

    this.resizeTarget = split;
    this.resizeForm = {
      memory: split.memory_mb || 1024,
      cpu: split.cpu_limit || 50,
      disk: split.disk_mb || 2048
    };

    const remaining = this.data.resources.remaining;
    const maxMem = (split.memory_mb || 0) + (remaining.memory || 0);
    const maxCpu = (split.cpu_limit || 0) + (remaining.cpu || 0);
    const maxDisk = (split.disk_mb || 0) + (remaining.disk || 0);

    modalContainer.innerHTML = `
      <div id="resize-split-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div class="glass-panel w-full max-w-lg p-6 rounded-3xl border border-purple-500/30 shadow-2xl space-y-5">
          <div class="flex items-center justify-between pb-3 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <i data-lucide="sliders" class="w-5 h-5"></i>
              </div>
              <div>
                <h4 class="text-base font-bold text-white">Resize Split Server</h4>
                <p class="text-[11px] text-slate-400">${this.escapeHtml(split.name)}</p>
              </div>
            </div>
            <button onclick="serverSplitter.closeModal()" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <form onsubmit="serverSplitter.handleResizeSubmit(event)" class="space-y-4">
            <div class="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-4">
              <!-- Memory -->
              <div class="space-y-1.5">
                <div class="flex justify-between text-xs">
                  <span class="font-semibold text-slate-300">Memory (RAM):</span>
                  <span id="resize-mem-val" class="font-mono font-bold text-purple-400">${this.formatSize(this.resizeForm.memory)}</span>
                </div>
                <input type="range" id="resize-mem-slider" min="128" max="${maxMem}" step="128" value="${this.resizeForm.memory}" oninput="serverSplitter.onResizeMemory(this.value)" class="w-full accent-purple-500 cursor-pointer">
                <div class="flex justify-between text-[10px] text-slate-400"><span>128 MB</span><span>Max: ${this.formatSize(maxMem)}</span></div>
              </div>

              <!-- CPU -->
              <div class="space-y-1.5">
                <div class="flex justify-between text-xs">
                  <span class="font-semibold text-slate-300">CPU Limit:</span>
                  <span id="resize-cpu-val" class="font-mono font-bold text-cyan-400">${this.resizeForm.cpu}%</span>
                </div>
                <input type="range" id="resize-cpu-slider" min="5" max="${maxCpu}" step="5" value="${this.resizeForm.cpu}" oninput="serverSplitter.onResizeCpu(this.value)" class="w-full accent-cyan-500 cursor-pointer">
                <div class="flex justify-between text-[10px] text-slate-400"><span>5%</span><span>Max: ${maxCpu}%</span></div>
              </div>

              <!-- Disk -->
              <div class="space-y-1.5">
                <div class="flex justify-between text-xs">
                  <span class="font-semibold text-slate-300">Disk Storage:</span>
                  <span id="resize-disk-val" class="font-mono font-bold text-emerald-400">${this.formatSize(this.resizeForm.disk)}</span>
                </div>
                <input type="range" id="resize-disk-slider" min="256" max="${maxDisk}" step="256" value="${this.resizeForm.disk}" oninput="serverSplitter.onResizeDisk(this.value)" class="w-full accent-emerald-500 cursor-pointer">
                <div class="flex justify-between text-[10px] text-slate-400"><span>256 MB</span><span>Max: ${this.formatSize(maxDisk)}</span></div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <button type="button" onclick="serverSplitter.closeModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 transition">Cancel</button>
              <button type="submit" id="btn-submit-resize" class="btn-cyber px-5 py-2 rounded-xl text-xs font-bold">Apply Resize</button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  onResizeMemory(val) {
    this.resizeForm.memory = parseInt(val, 10);
    const label = document.getElementById('resize-mem-val');
    if (label) label.textContent = this.formatSize(this.resizeForm.memory);
  }

  onResizeCpu(val) {
    this.resizeForm.cpu = parseInt(val, 10);
    const label = document.getElementById('resize-cpu-val');
    if (label) label.textContent = `${this.resizeForm.cpu}%`;
  }

  onResizeDisk(val) {
    this.resizeForm.disk = parseInt(val, 10);
    const label = document.getElementById('resize-disk-val');
    if (label) label.textContent = this.formatSize(this.resizeForm.disk);
  }

  async handleResizeSubmit(e) {
    e.preventDefault();
    if (!this.resizeTarget) return;

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/splitter/${this.resizeTarget.id}`, {
        method: 'PUT',
        body: {
          memory_mb: this.resizeForm.memory,
          cpu_limit: this.resizeForm.cpu,
          disk_mb: this.resizeForm.disk
        }
      });

      if (!res.success) throw new Error(res.error || 'Failed to resize');
      app.toast('Server split resized successfully!', 'success');
      this.closeModal();
      await this.renderSplitterTab(this.container, this.currentServerId);
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Sync Subusers
  // ---------------------------------------------------------------------------

  async syncSubusers(splitId) {
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/splitter/${splitId}/sync-subusers`, {
        method: 'POST'
      });
      if (!res.success) throw new Error(res.error || 'Failed to sync subusers');
      app.toast(res.message || 'Subusers synced successfully!', 'success');
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Delete Split Server
  // ---------------------------------------------------------------------------

  async confirmDeleteSplit(splitId, splitName) {
    const ok = await app.confirm({
      tag: 'DELETE SPLIT SERVER',
      tagIcon: 'alert-triangle',
      title: 'Delete Split Server',
      badge: window.location.host,
      message: `Are you sure you want to delete split server "${splitName}"?`,
      subtext: 'This will permanently delete the server files and return all allocated RAM, CPU, and Disk back to your master server pool.',
      icon: 'trash-2',
      confirmIcon: 'trash-2',
      confirmText: 'Delete Split',
      type: 'danger'
    });
    if (!ok) return;
    this.deleteSplit(splitId);
  }

  async deleteSplit(splitId) {
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/splitter/${splitId}`, {
        method: 'DELETE'
      });
      if (!res.success) throw new Error(res.error || 'Failed to delete split');
      app.toast(res.message || 'Split server deleted and resources refunded.', 'success');
      await this.renderSplitterTab(this.container, this.currentServerId);
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }
}

window.serverSplitter = new ServerSplitter();
