

// Admin Portal Management Suite
class AdminManager {
  // 1. Admin Overview
  stopOverviewPolling() {
    if (this.overviewInterval) {
      clearInterval(this.overviewInterval);
      this.overviewInterval = null;
    }
  }

  formatServerStatus(rawStatus, isSuspended = false, expBadge = '') {
    if (isSuspended) {
      return `<div class="flex items-center gap-1.5"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>SUSPENDED</span>${expBadge}</div>`;
    }
    const s = String(rawStatus || 'offline').toLowerCase().trim();
    if (s === 'running' || s === 'online' || s === 'started') {
      return `<div class="flex items-center gap-1.5"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>🟢 ONLINE</span>${expBadge}</div>`;
    }
    if (s === 'starting') {
      return `<div class="flex items-center gap-1.5"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30"><span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>🔵 STARTING</span>${expBadge}</div>`;
    }
    if (s === 'restarting') {
      return `<div class="flex items-center gap-1.5"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>🟡 RESTARTING</span>${expBadge}</div>`;
    }
    if (s === 'stopping') {
      return `<div class="flex items-center gap-1.5"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30"><span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></span>⚫ STOPPING</span>${expBadge}</div>`;
    }
    return `<div class="flex items-center gap-1.5"><span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/5"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>🔴 OFFLINE</span>${expBadge}</div>`;
  }

  async renderAdminOverview() {
    this.stopOverviewPolling();
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="space-y-6 pb-12">
        <!-- Top Titlebar with Live Telemetry Badge -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span class="text-xs font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">Admin Portal</span>
            <h2 class="text-2xl font-black text-white mt-2 flex items-center gap-2">
              <i data-lucide="gauge" class="w-6 h-6 text-purple-400"></i> Global System Overview
            </h2>
            <p class="text-xs text-slate-400">Cluster resources, MariaDB latency, container engines, and live hardware telemetry</p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Version Badge & Update Indicator -->
            <a href="#admin-updates" onclick="app.navigate('admin-updates')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 shadow-sm hover:bg-purple-500/20 transition cursor-pointer" title="View Version & System Updates">
              <i data-lucide="tag" class="w-3.5 h-3.5 text-purple-400"></i>
              <span id="adm-overview-version">v2.4.0</span>
            </a>
            <a href="#admin-updates" onclick="app.navigate('admin-updates')" id="adm-overview-update-pill" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm hover:bg-emerald-500/20 transition cursor-pointer" title="Click to view update details">
              <span class="w-2 h-2 rounded-full bg-emerald-400" id="adm-overview-update-dot"></span>
              <span id="adm-overview-update-text">Up-to-Date</span>
            </a>

            <span id="adm-live-badge" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>LIVE TELEMETRY (2s)</span>
            </span>
            <button onclick="admin.fetchOverviewTelemetry()" title="Refresh Telemetry Now" class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 transition">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- Mpanel System Version & Auto-Detect Update Banner -->
        <div class="glass-card p-4 rounded-2xl border border-white/10 relative overflow-hidden bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-cyan-950/30 shadow-lg">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div class="flex items-center gap-3.5">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 shrink-0">
                <i data-lucide="sparkles" class="w-6 h-6"></i>
              </div>
              <div class="space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-black text-white flex items-center gap-1.5">
                    Mpanel Server Engine <span class="font-mono text-purple-300" id="adm-banner-version">v2.4.0</span>
                  </span>
                  <span id="adm-banner-status-tag" class="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" id="adm-banner-status-dot"></span>
                    <span id="adm-banner-status-tag-text">Up-to-Date</span>
                  </span>
                </div>
                <p class="text-xs text-slate-400" id="adm-banner-status-desc">
                  Auto-checking updates from <span class="text-cyan-400 font-mono">github.com/nobita329/Mpanel/releases</span> &bull; Commit <span class="font-mono text-slate-300" id="adm-banner-commit">main</span>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-wrap self-end md:self-center">
              <button onclick="admin.checkOverviewUpdates()" id="btn-overview-check-updates" class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 flex items-center gap-1.5 transition active:scale-95">
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-cyan-400" id="icon-overview-check-spin"></i>
                <span>Check Update</span>
              </button>
              <a href="#admin-updates" onclick="app.navigate('admin-updates')" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-cyan-500/20">
                <i data-lucide="terminal" class="w-4 h-4"></i>
                <span>Open Update Terminal</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Row 1: Global Cluster Counts (5 Cards) -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div class="glass-card p-4 rounded-2xl border border-white/10 space-y-2">
            <div class="flex items-center justify-between text-purple-400">
              <span class="text-[11px] uppercase font-semibold text-slate-400">Servers</span>
              <i data-lucide="server" class="w-4 h-4"></i>
            </div>
            <h3 id="adm-stat-servers" class="text-2xl font-black text-white">0</h3>
            <p id="adm-stat-servers-sub" class="text-[10px] font-mono text-slate-400">0 Running &bull; 0 Offline</p>
          </div>

          <div class="glass-card p-4 rounded-2xl border border-white/10 space-y-2">
            <div class="flex items-center justify-between text-cyan-400">
              <span class="text-[11px] uppercase font-semibold text-slate-400">Users</span>
              <i data-lucide="users" class="w-4 h-4"></i>
            </div>
            <h3 id="adm-stat-users" class="text-2xl font-black text-cyan-400">0</h3>
            <p id="adm-stat-users-sub" class="text-[10px] font-mono text-slate-400">0 Admins</p>
          </div>

          <div class="glass-card p-4 rounded-2xl border border-white/10 space-y-2">
            <div class="flex items-center justify-between text-emerald-400">
              <span class="text-[11px] uppercase font-semibold text-slate-400">Databases</span>
              <i data-lucide="database" class="w-4 h-4"></i>
            </div>
            <h3 id="adm-stat-databases" class="text-2xl font-black text-emerald-400">0</h3>
            <p id="adm-stat-databases-sub" class="text-[10px] font-mono text-slate-400">MariaDB / MySQL</p>
          </div>

          <div class="glass-card p-4 rounded-2xl border border-white/10 space-y-2">
            <div class="flex items-center justify-between text-amber-400">
              <span class="text-[11px] uppercase font-semibold text-slate-400">Allocations</span>
              <i data-lucide="radio" class="w-4 h-4"></i>
            </div>
            <h3 id="adm-stat-allocs" class="text-2xl font-black text-amber-400">0</h3>
            <p id="adm-stat-allocs-sub" class="text-[10px] font-mono text-slate-400">0 Assigned</p>
          </div>

          <div class="glass-card p-4 rounded-2xl border border-white/10 space-y-2 col-span-2 sm:col-span-1">
            <div class="flex items-center justify-between text-indigo-400">
              <span class="text-[11px] uppercase font-semibold text-slate-400">Backups</span>
              <i data-lucide="archive" class="w-4 h-4"></i>
            </div>
            <h3 id="adm-stat-backups" class="text-2xl font-black text-indigo-400">0</h3>
            <p id="adm-stat-backups-sub" class="text-[10px] font-mono text-slate-400">0 MB Total</p>
          </div>
        </div>

        <!-- Row 2: Real-time Host Resource Gauges (4 Live Monitors) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- CPU Monitor -->
          <div class="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <i data-lucide="cpu" class="w-4 h-4 text-purple-400"></i> Host CPU Load
              </span>
              <span id="adm-cpu-percent" class="text-sm font-black font-mono text-purple-400">0%</span>
            </div>
            <div class="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
              <div id="adm-cpu-bar" class="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500" style="width: 0%"></div>
            </div>
            <div class="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
              <span id="adm-cpu-cores">0 Cores</span>
              <span id="adm-cpu-load">Load: 0.00</span>
            </div>
          </div>

          <!-- Memory Monitor -->
          <div class="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <i data-lucide="activity" class="w-4 h-4 text-cyan-400"></i> Memory (RAM)
              </span>
              <span id="adm-mem-percent" class="text-sm font-black font-mono text-cyan-400">0%</span>
            </div>
            <div class="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
              <div id="adm-mem-bar" class="bg-gradient-to-r from-cyan-500 to-blue-500 h-2.5 rounded-full transition-all duration-500" style="width: 0%"></div>
            </div>
            <div class="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
              <span id="adm-mem-used">0 GB Used</span>
              <span id="adm-mem-total">/ 0 GB Total</span>
            </div>
          </div>

          <!-- Disk Monitor -->
          <div class="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <i data-lucide="hard-drive" class="w-4 h-4 text-emerald-400"></i> Storage (SSD)
              </span>
              <span id="adm-disk-percent" class="text-sm font-black font-mono text-emerald-400">0%</span>
            </div>
            <div class="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
              <div id="adm-disk-bar" class="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-500" style="width: 0%"></div>
            </div>
            <div class="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
              <span id="adm-disk-used">0 GB Used</span>
              <span id="adm-disk-total">/ 0 GB Total</span>
            </div>
          </div>

          <!-- Network Monitor -->
          <div class="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <i data-lucide="wifi" class="w-4 h-4 text-amber-400"></i> Network Traffic
              </span>
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div class="space-y-1 pt-1 font-mono text-[11px]">
              <div class="flex justify-between items-center text-slate-300">
                <span class="flex items-center gap-1 text-slate-400"><i data-lucide="arrow-down" class="w-3 h-3 text-cyan-400"></i> Inbound:</span>
                <span id="adm-net-rx" class="font-bold text-cyan-400">0 KB/s</span>
              </div>
              <div class="flex justify-between items-center text-slate-300">
                <span class="flex items-center gap-1 text-slate-400"><i data-lucide="arrow-up" class="w-3 h-3 text-amber-400"></i> Outbound:</span>
                <span id="adm-net-tx" class="font-bold text-amber-400">0 KB/s</span>
              </div>
            </div>
            <div class="text-[10px] text-slate-500 font-mono flex justify-between border-t border-white/5 pt-1">
              <span id="adm-net-total-rx">RX: 0 MB</span>
              <span id="adm-net-total-tx">TX: 0 MB</span>
            </div>
          </div>
        </div>

        <!-- Row 3: Engines Health (MariaDB, Docker, Services) & Quick Shortcuts -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="glass-panel p-6 rounded-3xl border border-white/10 lg:col-span-2 space-y-4">
            <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-white/10 pb-3">
              <i data-lucide="layers" class="w-4 h-4 text-cyan-400"></i> Engines, Databases & Daemons
            </h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
              <!-- MariaDB 11 Health -->
              <div class="bg-slate-900/70 p-3 rounded-xl border border-white/5 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-slate-400 uppercase">MariaDB 11</span>
                  <span id="adm-mariadb-badge" class="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <p id="adm-mariadb-version" class="text-xs font-bold text-emerald-400 truncate">Connecting...</p>
                <p id="adm-mariadb-latency" class="text-[10px] text-slate-400">Latency: -- ms</p>
              </div>

              <!-- Docker Engine -->
              <div class="bg-slate-900/70 p-3 rounded-xl border border-white/5 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-slate-400 uppercase">Docker Engine</span>
                  <span id="adm-docker-badge" class="w-2 h-2 rounded-full bg-cyan-400"></span>
                </div>
                <p id="adm-docker-status" class="text-xs font-bold text-cyan-400">Active</p>
                <p id="adm-docker-counts" class="text-[10px] text-slate-400">0 Running Containers</p>
              </div>

              <!-- Panel Daemon API -->
              <div class="bg-slate-900/70 p-3 rounded-xl border border-white/5 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-slate-400 uppercase">Daemon API</span>
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <p class="text-xs font-bold text-white">Port 3003</p>
                <p class="text-[10px] text-slate-400">HTTP REST & WS</p>
              </div>

              <!-- SFTP Server -->
              <div class="bg-slate-900/70 p-3 rounded-xl border border-white/5 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] text-slate-400 uppercase">Embedded SFTP</span>
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <p class="text-xs font-bold text-white">Port 3004</p>
                <p class="text-[10px] text-slate-400">SSH File Transfer</p>
              </div>

              <!-- Host Platform & OS -->
              <div class="bg-slate-900/70 p-3 rounded-xl border border-white/5 space-y-1">
                <span class="text-[10px] text-slate-400 uppercase">Host OS</span>
                <p id="adm-os-info" class="text-xs font-bold text-slate-200 truncate">Linux</p>
                <p id="adm-os-uptime" class="text-[10px] text-slate-400">Uptime: --</p>
              </div>

              <!-- Node Runtime -->
              <div class="bg-slate-900/70 p-3 rounded-xl border border-white/5 space-y-1">
                <span class="text-[10px] text-slate-400 uppercase">Node.js Engine</span>
                <p id="adm-node-ver" class="text-xs font-bold text-purple-400">v20+</p>
                <p id="adm-process-uptime" class="text-[10px] text-slate-400">Process: --</p>
              </div>
            </div>
          </div>

          <!-- Fast Quick Actions -->
          <div class="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 flex flex-col justify-between">
            <div>
              <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-white/10 pb-3">
                <i data-lucide="zap" class="w-4 h-4 text-amber-400"></i> Quick Actions
              </h3>
              <p class="text-xs text-slate-400 mt-2">Manage clusters and resources directly</p>
            </div>
            <div class="space-y-2">
              <button onclick="admin.showCreateServerModal()" class="btn-cyber w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                <i data-lucide="plus-circle" class="w-4 h-4"></i> Deploy Server
              </button>
              <button onclick="admin.showCreateUserModal()" class="btn-cyber-purple w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                <i data-lucide="user-plus" class="w-4 h-4"></i> Add User
              </button>
              <button onclick="app.navigate('admin-databases')" class="w-full py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 flex items-center justify-center gap-2 transition">
                <i data-lucide="database" class="w-4 h-4 text-emerald-400"></i> Manage Databases
              </button>
              <button onclick="app.navigate('admin-network')" class="w-full py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 flex items-center justify-center gap-2 transition">
                <i data-lucide="radio" class="w-4 h-4 text-amber-400"></i> Manage Network & Ports
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    await this.fetchOverviewTelemetry();
    this.overviewInterval = setInterval(() => {
      this.fetchOverviewTelemetry(true);
    }, 2000);
  }

  async fetchOverviewTelemetry(isSilent = false) {
    try {
      const data = await app.api('/api/admin/overview');
      if (!data || !data.success) return;

      const m = data.metrics || {};
      const sys = data.system || {};
      const db = data.mariadb || {};
      const docker = data.docker || {};

      // Helper formatters
      const formatBytes = (b) => {
        if (!b || b === 0) return '0 B';
        const k = 1024;
        const dm = 1;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return parseFloat((b / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
      };

      const formatSpeed = (b) => {
        if (b >= 1024 * 1024) return (b / (1024 * 1024)).toFixed(2) + ' MB/s';
        if (b >= 1024) return (b / 1024).toFixed(1) + ' KB/s';
        return Math.round(b) + ' B/s';
      };

      const formatSecs = (s) => {
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const min = Math.floor((s % 3600) / 60);
        if (d > 0) return `${d}d ${h}h`;
        if (h > 0) return `${h}h ${min}m`;
        return `${min}m ${Math.floor(s % 60)}s`;
      };

      // 1. Metric Counts
      const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
      setEl('adm-stat-servers', m.servers?.total || 0);
      setEl('adm-stat-servers-sub', `${m.servers?.running || 0} Running • ${m.servers?.offline || 0} Offline`);
      setEl('adm-stat-users', m.users?.total || 0);
      setEl('adm-stat-users-sub', `${m.users?.admins || 0} Admins`);
      setEl('adm-stat-databases', m.databases?.total || 0);
      setEl('adm-stat-databases-sub', `${db.threads_connected || 1} Connected Clients`);
      setEl('adm-stat-allocs', m.allocations?.total || 0);
      setEl('adm-stat-allocs-sub', `${m.allocations?.assigned || 0} Assigned (${m.allocations?.free || 0} Free)`);
      setEl('adm-stat-backups', m.backups?.total || 0);
      setEl('adm-stat-backups-sub', `${formatBytes(m.backups?.total_bytes || 0)} Total`);

      // 2. Hardware Live Gauges
      setEl('adm-cpu-percent', `${sys.cpu?.percent || 0}%`);
      const cpuBar = document.getElementById('adm-cpu-bar');
      if (cpuBar) cpuBar.style.width = `${sys.cpu?.percent || 0}%`;
      setEl('adm-cpu-cores', `${sys.cpu?.cores || 1} Cores`);
      setEl('adm-cpu-load', `Load: ${(sys.cpu?.load_avg?.[0] || 0).toFixed(2)}`);

      setEl('adm-mem-percent', `${sys.memory?.percent || 0}%`);
      const memBar = document.getElementById('adm-mem-bar');
      if (memBar) memBar.style.width = `${sys.memory?.percent || 0}%`;
      setEl('adm-mem-used', `${formatBytes(sys.memory?.used_bytes)} Used`);
      setEl('adm-mem-total', `/ ${formatBytes(sys.memory?.total_bytes)}`);

      setEl('adm-disk-percent', `${sys.disk?.percent || 0}%`);
      const diskBar = document.getElementById('adm-disk-bar');
      if (diskBar) diskBar.style.width = `${sys.disk?.percent || 0}%`;
      setEl('adm-disk-used', `${formatBytes(sys.disk?.used_bytes)} Used`);
      setEl('adm-disk-total', `/ ${formatBytes(sys.disk?.total_bytes)}`);

      // 3. Network Speeds
      setEl('adm-net-rx', formatSpeed(sys.network?.rx_bytes_sec || 0));
      setEl('adm-net-tx', formatSpeed(sys.network?.tx_bytes_sec || 0));
      setEl('adm-net-total-rx', `RX: ${formatBytes(sys.network?.total_rx || 0)}`);
      setEl('adm-net-total-tx', `TX: ${formatBytes(sys.network?.total_tx || 0)}`);

      // 4. Engine Health
      setEl('adm-mariadb-version', db.version ? `MariaDB ${db.version.split('-')[0]}` : 'Connected');
      setEl('adm-mariadb-latency', `Latency: ${db.latency_ms || 0} ms • Port ${db.port || 27017}`);

      const dockStatusEl = document.getElementById('adm-docker-status');
      if (dockStatusEl) {
        dockStatusEl.innerText = docker.available ? 'Active (Dockerode)' : 'Unavailable';
      }
      setEl('adm-docker-counts', `${docker.containers_running || 0} Running / ${docker.containers_total || 0} Total`);

      setEl('adm-os-info', `${sys.platform || 'Linux'} (${sys.arch || 'x64'})`);
      setEl('adm-os-uptime', `Uptime: ${formatSecs(sys.uptime_seconds || 0)}`);
      setEl('adm-node-ver', `${sys.node_version || 'Node.js'}`);
      setEl('adm-process-uptime', `Process: ${formatSecs(sys.process_uptime_seconds || 0)}`);

      // 5. Version & System Updates Status
      const panelVer = sys.panel_version ? `v${sys.panel_version}` : 'v2.4.0';
      setEl('adm-overview-version', panelVer);
      setEl('adm-banner-version', panelVer);
      setEl('adm-banner-commit', sys.panel_commit || 'main');

      const upd = sys.update_info;
      const updatePill = document.getElementById('adm-overview-update-pill');
      const updateText = document.getElementById('adm-overview-update-text');
      const updateDot = document.getElementById('adm-overview-update-dot');
      const bannerTag = document.getElementById('adm-banner-status-tag');
      const bannerTagText = document.getElementById('adm-banner-status-tag-text');
      const bannerDesc = document.getElementById('adm-banner-status-desc');
      const navBadge = document.getElementById('nav-update-badge');

      if (upd && upd.has_update) {
        if (updatePill) updatePill.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm hover:bg-amber-500/25 transition cursor-pointer animate-pulse';
        if (updateDot) updateDot.className = 'w-2 h-2 rounded-full bg-amber-400';
        if (updateText) updateText.innerText = `Update: ${upd.latest_version}`;

        if (bannerTag) bannerTag.className = 'text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 animate-pulse';
        if (bannerTagText) bannerTagText.innerText = `Update Available: ${upd.latest_version}`;
        if (bannerDesc) bannerDesc.innerHTML = `New version <b class="text-amber-300 font-mono">${upd.latest_version}</b> detected on GitHub! Click Open Update Terminal to install.`;
        if (navBadge) {
          navBadge.classList.remove('hidden');
          navBadge.innerText = 'UPDATE';
        }
      } else {
        if (updatePill) updatePill.className = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm hover:bg-emerald-500/20 transition cursor-pointer';
        if (updateDot) updateDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
        if (updateText) updateText.innerText = `Up-to-Date (${upd?.latest_version || panelVer})`;

        if (bannerTag) bannerTag.className = 'text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1';
        if (bannerTagText) bannerTagText.innerText = 'Up-to-Date';
        if (bannerDesc) bannerDesc.innerHTML = `Running official release <b class="text-cyan-400 font-mono">${upd?.latest_version || panelVer}</b> &bull; Commit <span class="font-mono text-slate-300">${sys.panel_commit || 'main'}</span>`;
      }
    } catch (err) {
      if (!isSilent) console.error('Overview telemetry fetch error:', err);
    }
  }

  async checkOverviewUpdates() {
    const icon = document.getElementById('icon-overview-check-spin');
    if (icon) icon.classList.add('animate-spin');
    try {
      const res = await app.api('/api/admin/updates/status?force=true');
      if (res) {
        if (res.has_update) {
          app.toast(`New version ${res.latest_version} available!`, 'info');
        } else {
          app.toast(`Mpanel is up to date (${res.latest_version || 'v2.4.0'}).`, 'success');
        }
        await this.fetchOverviewTelemetry(true);
      }
    } catch (e) {
      app.toast('Failed to check updates: ' + e.message, 'error');
    } finally {
      if (icon) icon.classList.remove('animate-spin');
    }
  }

  renderUpdatesView() {
    if (window.updatesManager) {
      window.updatesManager.render();
    }
  }

  // 2. Server Management View
  setServerViewMode(mode) {
    this.serverViewMode = mode;
    localStorage.setItem('mpanel_server_view_mode', mode);
    this.renderServersView();
  }

  // 2. SERVERS & SERVER ACCOUNTS MONITOR
  async renderServersView() {
    this.serverViewMode = this.serverViewMode || localStorage.getItem('mpanel_server_view_mode') || 'card';
    const isCard = this.serverViewMode === 'card';
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="space-y-8 pb-12">
        <!-- Top Header Bar -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5">
          <div>
            <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span class="bg-gradient-to-r from-cyan-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">SERVERS</span>
            </h1>
            <p class="text-xs text-slate-400 mt-1 font-medium">Manage and monitor all your servers</p>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <!-- Custom Server Sort Toolbar Slot -->
            <div id="adm-servers-sort-toolbar-slot"></div>

            <!-- Card / List segmented switcher (Default: card) -->
            <div class="flex items-center bg-slate-900/90 p-1 rounded-xl border border-white/10 shadow-inner">
              <button onclick="admin.setServerViewMode('card')" class="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${isCard ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'}">
                <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i> Cards
              </button>
              <button onclick="admin.setServerViewMode('list')" class="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${!isCard ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'}">
                <i data-lucide="list" class="w-3.5 h-3.5"></i> List
              </button>
            </div>

            <button onclick="admin.renderServersView()" class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 transition" title="Refresh">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>
            <button onclick="admin.showCreateUserModal()" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 flex items-center gap-1.5 transition shadow-sm">
              <i data-lucide="user-plus" class="w-4 h-4 text-purple-400"></i> + Add User
            </button>
            <button onclick="admin.showCreateServerModal()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg">
              <i data-lucide="plus-circle" class="w-4 h-4"></i> + Deploy New
            </button>
          </div>
        </div>

        <!-- ──────────────────────────────────────── -->
        <!-- 1. Server Section -->
        <!-- ──────────────────────────────────────── -->
        <div class="space-y-3">
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <i data-lucide="${isCard ? 'layout-grid' : 'server'}" class="w-4 h-4"></i>
              </div>
              <h3 class="text-base font-bold text-white tracking-wide">Server</h3>
              <span id="adm-servers-count-badge" class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Loading...</span>
            </div>
            <span class="text-[11px] font-mono text-slate-500">View: <strong class="text-cyan-400 uppercase">${isCard ? 'Card' : 'List'}</strong></span>
          </div>

          <!-- Server Target Container -->
          <div id="adm-servers-view-target">
            <div class="glass-panel p-12 rounded-2xl border border-white/10 text-center text-slate-500">
              <i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400"></i>
              <span>Loading servers...</span>
            </div>
          </div>
        </div>

        <!-- ──────────────────────────────────────── -->
        <!-- 2. User Account Section -->
        <!-- ──────────────────────────────────────── -->
        <div class="space-y-3">
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <i data-lucide="users" class="w-4 h-4"></i>
              </div>
              <h3 class="text-base font-bold text-white tracking-wide">User Account</h3>
              <span id="adm-users-count-badge" class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">Loading...</span>
            </div>
          </div>

          <div class="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-300">
                <thead class="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                  <tr>
                    <th class="px-4 py-3">Username</th>
                    <th class="px-4 py-3">Email</th>
                    <th class="px-4 py-3">Server Access</th>
                    <th class="px-4 py-3">Permissions</th>
                    <th class="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody id="adm-users-tbody" class="divide-y divide-white/5">
                  <tr><td colspan="5" class="text-center py-10 text-slate-500"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto mb-2 text-purple-400"></i>Loading user accounts...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    try {
      const [serversRes, usersRes] = await Promise.all([
        app.api('/api/servers'),
        app.api('/api/admin/users')
      ]);

      let servers = serversRes.servers || [];
      const users = usersRes.users || [];

      // Custom Server Sort Extension (customserversort.blueprint)
      if (window.customServerSort) {
        const slot = document.getElementById('adm-servers-sort-toolbar-slot');
        if (slot) slot.innerHTML = customServerSort.renderToolbarHTML('admin', 'admin.handleServerSortChange');
        servers = customServerSort.sortServers(servers, 'admin');
      }

      // Build quick users map
      const usersMap = {};
      users.forEach(u => {
        usersMap[u.id] = u;
      });

      // Update count badges
      const srvBadge = document.getElementById('adm-servers-count-badge');
      if (srvBadge) srvBadge.innerText = `${servers.length} ${servers.length === 1 ? 'Server' : 'Servers'}`;
      const usrBadge = document.getElementById('adm-users-count-badge');
      if (usrBadge) usrBadge.innerText = `${users.length} ${users.length === 1 ? 'Account' : 'Accounts'}`;

      // Build user-to-servers map
      const userServersMap = {};
      servers.forEach(s => {
        const uid = s.user_id;
        if (!userServersMap[uid]) userServersMap[uid] = [];
        userServersMap[uid].push(s);
      });

      // ----------------------------------------------------------------------
      // Populate Server Section (Card or List)
      // ----------------------------------------------------------------------
      const srvTarget = document.getElementById('adm-servers-view-target');
      if (srvTarget) {
        if (servers.length === 0) {
          srvTarget.innerHTML = `
            <div class="glass-panel rounded-2xl border border-white/10 p-12 text-center text-slate-500">
              <i data-lucide="server-off" class="w-10 h-10 mx-auto mb-3 opacity-40 text-cyan-400"></i>
              <p class="text-sm font-semibold text-slate-300">No servers deployed yet</p>
              <p class="text-xs text-slate-500 mt-1">Get started by creating and configuring your first server instance.</p>
              <button onclick="admin.showCreateServerModal()" class="btn-cyber px-4 py-2 rounded-xl text-xs mt-4 font-bold">+ Deploy New Server</button>
            </div>
          `;
        } else if (isCard) {
          // ================= CARD VIEW (DEFAULT) =================
          srvTarget.innerHTML = `
            <div id="adm-servers-grid" class="grid grid-cols-1 xl:grid-cols-2 gap-5">
              ${servers.map(s => {
                const owner = usersMap[s.user_id] || {
                  id: s.user_id,
                  username: s.owner_username || 'Admin',
                  email: s.owner_email || '',
                  role: s.owner_role || 'admin',
                  suspended: s.owner_suspended || 0
                };
                const isOwnerAdmin = owner.role === 'admin';
                const isOwnerSuspended = !!owner.suspended;

                const isSuspended = !!s.is_suspended || s.status === 'suspended';
                const isRunning = !isSuspended && s.status === 'running';

                let expBadge = '';
                if (s.expiration_date) {
                  const expDate = new Date(s.expiration_date);
                  const diffDays = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 3600 * 24));
                  if (diffDays <= 0) {
                    expBadge = '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">Expired</span>';
                  } else if (diffDays <= 3) {
                    expBadge = `<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">${diffDays}d left</span>`;
                  } else {
                    expBadge = `<span class="px-1.5 py-0.2 rounded text-[9px] font-mono text-slate-400 border border-white/5">${diffDays}d left</span>`;
                  }
                }

                const statusHTML = this.formatServerStatus(s.status, isSuspended, expBadge);

                const fullAddr = `${s.ip || '127.0.0.1'}:${s.port || 25565}`;
                const ramFmt = s.memory_mb >= 1024 ? (s.memory_mb / 1024).toFixed(1) + ' GiB' : (s.memory_mb || 1024) + ' MB';
                const diskFmt = s.disk_mb >= 1024 ? (s.disk_mb / 1024).toFixed(1) + ' GiB' : (s.disk_mb || 5120) + ' MB';

                return `
                  <div data-server-id="${s.id}" class="glass-panel p-5 rounded-3xl border border-white/10 hover:border-cyan-500/30 transition shadow-xl space-y-4 flex flex-col justify-between relative">
                    <div class="space-y-3.5">
                      <!-- 1. Server Name & Status -->
                      <div class="flex items-start justify-between gap-3">
                        <div class="flex items-start gap-3 min-w-0">
                          ${window.customServerSort ? customServerSort.renderDragHandleHTML() : ''}
                          <div class="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold shrink-0 mt-0.5 shadow-inner">
                            <i data-lucide="${s.server_type === 'minecraft' ? 'box' : (s.server_type === 'nodejs' ? 'file-code-2' : (s.server_type === 'lumenvm' || s.server_type === 'vm' || s.server_type === 'nokvm' || s.server_type === 'lumenvm_nokvm' ? 'server' : 'terminal'))}" class="w-5 h-5"></i>
                          </div>
                          <div class="min-w-0">
                            <div class="flex items-center gap-2">
                              <h4 class="font-bold text-white hover:text-cyan-300 cursor-pointer text-sm truncate transition" onclick="app.navigate('server-manage/${s.id}/console')" title="Open Server Console">
                                ${app.escapeHtml(s.name)}
                              </h4>
                              <span class="text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">#${s.id}</span>
                            </div>
                            <div class="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-1">
                              <span class="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 uppercase font-bold text-[9px] border border-cyan-500/20">${app.escapeHtml(s.server_type)}</span>
                              <span>•</span>
                              <span class="text-slate-500 truncate max-w-[100px]" title="${s.uuid}">${s.uuid.substring(0, 8)}...</span>
                            </div>
                          </div>
                        </div>
                        <div class="shrink-0 text-right">
                          ${statusHTML}
                        </div>
                      </div>

                      <!-- 2. IP Address -->
                      <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between font-mono text-xs">
                        <div class="flex items-center gap-2 min-w-0">
                          <i data-lucide="network" class="w-3.5 h-3.5 text-cyan-400 shrink-0"></i>
                          <span class="text-slate-400 text-[11px] shrink-0">IP Address:</span>
                          <span class="text-cyan-300 font-bold truncate">${fullAddr}</span>
                        </div>
                        <button onclick="navigator.clipboard.writeText('${fullAddr}'); app.playSound('copy'); app.toast('Copied address: ${fullAddr}', 'info');" class="px-2 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 transition text-[10px] flex items-center gap-1 font-bold shrink-0">
                          <i data-lucide="copy" class="w-3 h-3"></i> Copy
                        </button>
                      </div>

                      <!-- 3. User Section (Create User, User delete, Edit User, Suspended User, User Access) -->
                      <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-500/20 space-y-2.5">
                        <div class="flex items-center justify-between">
                          <span class="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                            <i data-lucide="user" class="w-3 h-3"></i> User (Owner)
                          </span>
                          <div class="flex items-center gap-1.5">
                            <span class="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${isOwnerAdmin ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-800 text-slate-400 border border-white/5'}">
                              ${isOwnerAdmin ? 'ADMIN' : 'CLIENT'}
                            </span>
                            ${isOwnerSuspended ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">SUSPENDED</span>' : '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400">ACTIVE</span>'}
                          </div>
                        </div>
                        <div class="flex items-center gap-2.5 min-w-0">
                          <div class="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-300 uppercase shrink-0">
                            ${(owner.username || 'A').substring(0, 1)}
                          </div>
                          <div class="min-w-0">
                            <span class="font-bold text-white text-xs block truncate">${app.escapeHtml(owner.username || 'Admin')}</span>
                            <span class="text-[10px] text-slate-400 block truncate font-mono">${app.escapeHtml(owner.email || 'No email')}</span>
                          </div>
                        </div>
                        <!-- User Actions: Create User, User delete, Edit User, Suspended User, User Access -->
                        <div class="pt-2 border-t border-white/5 flex flex-wrap items-center gap-1.5">
                          <button onclick="admin.showCreateUserModal()" class="px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition flex items-center gap-1" title="Create New User">
                            <i data-lucide="user-plus" class="w-3 h-3"></i> Create User
                          </button>
                          <button onclick="admin.showEditUserModal(${owner.id})" class="px-2 py-1 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition flex items-center gap-1" title="Edit User Account">
                            <i data-lucide="user-cog" class="w-3 h-3 text-purple-400"></i> Edit User
                          </button>
                          <button onclick="admin.showServerOwnerModal(${s.id}, '${app.escapeHtml(s.name)}', ${owner.id}, '${app.escapeHtml(owner.username)}')" class="px-2 py-1 rounded-lg text-[10px] font-bold bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1" title="Server Access & Transfer Ownership">
                            <i data-lucide="shield-check" class="w-3 h-3"></i> User Access
                          </button>
                          <button onclick="admin.toggleSuspendUser(${owner.id})" class="px-2 py-1 rounded-lg text-[10px] font-bold ${isOwnerSuspended ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/20 hover:bg-amber-500/30'} transition flex items-center gap-1" title="Toggle User Suspension">
                            <i data-lucide="${isOwnerSuspended ? 'unlock' : 'slash'}" class="w-3 h-3"></i> ${isOwnerSuspended ? 'Unsuspend' : 'Suspended User'}
                          </button>
                          <button onclick="admin.deleteUser(${owner.id}, '${app.escapeHtml(owner.username)}')" class="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/20 transition flex items-center gap-1" title="Delete User Account">
                            <i data-lucide="user-x" class="w-3 h-3"></i> User delete
                          </button>
                        </div>
                      </div>

                      <!-- 4. Resources Section (Create, delete, Edit, Suspended) -->
                      <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-cyan-500/20 space-y-2.5">
                        <div class="flex items-center justify-between">
                          <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                            <i data-lucide="cpu" class="w-3 h-3"></i> Resources
                          </span>
                          <span class="text-[10px] font-mono text-cyan-300 font-bold">${ramFmt} RAM</span>
                        </div>
                        <div class="grid grid-cols-3 gap-2 font-mono text-center">
                          <div class="p-2 rounded-xl bg-slate-800/60 border border-white/5">
                            <div class="text-[9px] text-slate-400 uppercase">Memory</div>
                            <div class="text-xs font-bold text-cyan-300 mt-0.5">${ramFmt}</div>
                          </div>
                          <div class="p-2 rounded-xl bg-slate-800/60 border border-white/5">
                            <div class="text-[9px] text-slate-400 uppercase">CPU Limit</div>
                            <div class="text-xs font-bold text-purple-300 mt-0.5">${s.cpu_limit || 100}%</div>
                          </div>
                          <div class="p-2 rounded-xl bg-slate-800/60 border border-white/5">
                            <div class="text-[9px] text-slate-400 uppercase">Disk</div>
                            <div class="text-xs font-bold text-indigo-300 mt-0.5">${diskFmt}</div>
                          </div>
                        </div>
                        <!-- Resource Actions: Create, delete, Edit, Suspended -->
                        <div class="pt-2 border-t border-white/5 flex flex-wrap items-center gap-1.5">
                          <button onclick="admin.showAddResourcePresetModal(${s.id}, '${app.escapeHtml(s.name)}', ${s.memory_mb || 1024}, ${s.cpu_limit || 100}, ${s.disk_mb || 5120})" class="px-2 py-1 rounded-lg text-[10px] font-bold bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1" title="Add / Allocate Resources">
                            <i data-lucide="plus" class="w-3 h-3"></i> Create
                          </button>
                          <button onclick="admin.showEditServerModal(${s.id})" class="px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition flex items-center gap-1" title="Edit Server Configuration">
                            <i data-lucide="sliders" class="w-3 h-3"></i> Edit
                          </button>
                          <button onclick="admin.toggleServerSuspension(${s.id})" class="px-2 py-1 rounded-lg text-[10px] font-bold ${isSuspended ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/20 hover:bg-amber-500/30'} transition flex items-center gap-1" title="Toggle Auto-Suspension">
                            <i data-lucide="${isSuspended ? 'unlock' : 'pause-circle'}" class="w-3 h-3"></i> ${isSuspended ? 'Unsuspend' : 'Suspended'}
                          </button>
                          <button onclick="admin.resetServerResources(${s.id}, '${app.escapeHtml(s.name)}')" class="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/20 transition flex items-center gap-1" title="Reset Custom Resources">
                            <i data-lucide="rotate-ccw" class="w-3 h-3"></i> delete
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- 5. Actions Footer -->
                    <div class="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      <div class="flex items-center gap-1.5">
                        <button onclick="admin.sendServerPower(${s.id}, 'start')" class="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 transition" title="Start Server">
                          <i data-lucide="play" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="admin.sendServerPower(${s.id}, 'restart')" class="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-500/20 transition" title="Restart Server">
                          <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="admin.sendServerPower(${s.id}, 'stop')" class="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20 transition" title="Stop Server">
                          <i data-lucide="square" class="w-3.5 h-3.5"></i>
                        </button>
                      </div>
                      <div class="flex items-center gap-2">
                        <button onclick="admin.deleteServer(${s.id}, '${app.escapeHtml(s.name)}')" class="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20 transition" title="Delete Server">
                          <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                        <button onclick="app.navigate('server-manage/${s.id}/console')" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md">
                          <i data-lucide="terminal" class="w-4 h-4"></i> Manage
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        } else {
          // ================= LIST VIEW (TABLE) =================
          srvTarget.innerHTML = `
            <div class="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-300">
                  <thead class="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                    <tr>
                      <th class="px-4 py-3">Server Name</th>
                      <th class="px-4 py-3">IP Address</th>
                      <th class="px-4 py-3">User</th>
                      <th class="px-4 py-3">Status</th>
                      <th class="px-4 py-3">Resources</th>
                      <th class="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="adm-servers-tbody" class="divide-y divide-white/5">
                    ${servers.map(s => {
                      const owner = usersMap[s.user_id] || {
                        id: s.user_id,
                        username: s.owner_username || 'Admin',
                        email: s.owner_email || '',
                        role: s.owner_role || 'admin',
                        suspended: s.owner_suspended || 0
                      };
                      const isOwnerAdmin = owner.role === 'admin';
                      const isOwnerSuspended = !!owner.suspended;

                      const isSuspended = !!s.is_suspended || s.status === 'suspended';
                      const isRunning = !isSuspended && s.status === 'running';

                      let expBadge = '';
                      if (s.expiration_date) {
                        const expDate = new Date(s.expiration_date);
                        const diffDays = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 3600 * 24));
                        if (diffDays <= 0) {
                          expBadge = '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">Expired</span>';
                        } else if (diffDays <= 3) {
                          expBadge = `<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">${diffDays}d left</span>`;
                        } else {
                          expBadge = `<span class="px-1.5 py-0.2 rounded text-[9px] font-mono text-slate-400 border border-white/5">${diffDays}d left</span>`;
                        }
                      }

                      const statusHTML = this.formatServerStatus(s.status, isSuspended, expBadge);

                      const fullAddr = `${s.ip || '127.0.0.1'}:${s.port || 25565}`;
                      const ramFmt = s.memory_mb >= 1024 ? (s.memory_mb / 1024).toFixed(1) + ' GiB' : (s.memory_mb || 1024) + ' MB';
                      const diskFmt = s.disk_mb >= 1024 ? (s.disk_mb / 1024).toFixed(1) + ' GiB' : (s.disk_mb || 5120) + ' MB';

                      return `
                        <tr data-server-id="${s.id}" class="hover:bg-white/5 transition-colors">
                          <!-- Server Name -->
                          <td class="px-4 py-3">
                            <div class="flex items-center gap-2.5">
                              ${window.customServerSort ? customServerSort.renderDragHandleHTML() : ''}
                              <div class="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold shrink-0">
                                <i data-lucide="${s.server_type === 'minecraft' ? 'box' : (s.server_type === 'nodejs' ? 'file-code-2' : (s.server_type === 'lumenvm' || s.server_type === 'vm' || s.server_type === 'nokvm' || s.server_type === 'lumenvm_nokvm' ? 'server' : 'terminal'))}" class="w-4 h-4"></i>
                              </div>
                              <div class="min-w-0">
                                <div class="font-bold text-white hover:text-cyan-300 cursor-pointer truncate max-w-xs transition text-xs" onclick="app.navigate('server-manage/${s.id}/console')">
                                  ${app.escapeHtml(s.name)}
                                </div>
                                <div class="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mt-0.5">
                                  <span class="text-slate-500">#${s.id}</span>
                                  <span>•</span>
                                  <span class="px-1 rounded bg-white/5 text-[9px] uppercase font-bold">${app.escapeHtml(s.server_type)}</span>
                                  <span>•</span>
                                  <span class="text-slate-500 truncate max-w-[90px]">${s.uuid.substring(0, 8)}...</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <!-- IP Address -->
                          <td class="px-4 py-3 font-mono">
                            <div class="flex items-center gap-1.5">
                              <span class="text-cyan-300 font-semibold text-xs">${fullAddr}</span>
                              <button onclick="navigator.clipboard.writeText('${fullAddr}'); app.playSound('copy'); app.toast('Copied address: ${fullAddr}', 'info');" class="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-cyan-400 transition" title="Copy Address">
                                <i data-lucide="copy" class="w-3 h-3"></i>
                              </button>
                            </div>
                          </td>

                          <!-- User (Create User, User delete, Edit User, Suspended User, User Access) -->
                          <td class="px-4 py-3">
                            <div class="space-y-1.5">
                              <div class="flex items-center gap-2">
                                <div class="w-6 h-6 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-[10px] font-bold text-purple-300 uppercase shrink-0">
                                  ${(owner.username || 'A').substring(0, 1)}
                                </div>
                                <div class="min-w-0">
                                  <span class="font-semibold text-slate-200 block text-xs truncate">${app.escapeHtml(owner.username || 'Admin')}</span>
                                  ${owner.email ? `<span class="text-[10px] text-slate-500 block truncate font-mono">${app.escapeHtml(owner.email)}</span>` : ''}
                                </div>
                                <span class="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${isOwnerAdmin ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-400'}">
                                  ${isOwnerAdmin ? 'ADMIN' : 'USER'}
                                </span>
                              </div>
                              <div class="flex flex-wrap items-center gap-1">
                                <button onclick="admin.showCreateUserModal()" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border border-purple-500/20 transition" title="Create User">+ User</button>
                                <button onclick="admin.showEditUserModal(${owner.id})" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition" title="Edit User">Edit</button>
                                <button onclick="admin.showServerOwnerModal(${s.id}, '${app.escapeHtml(s.name)}', ${owner.id}, '${app.escapeHtml(owner.username)}')" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/20 transition" title="User Access & Transfer">Access</button>
                                <button onclick="admin.toggleSuspendUser(${owner.id})" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${isOwnerSuspended ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/20'} transition" title="Suspended User">${isOwnerSuspended ? 'Unsuspend' : 'Suspend'}</button>
                                <button onclick="admin.deleteUser(${owner.id}, '${app.escapeHtml(owner.username)}')" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/20 transition" title="User delete">Delete</button>
                              </div>
                            </div>
                          </td>

                          <!-- Status -->
                          <td class="px-4 py-3">
                            ${statusHTML}
                          </td>

                          <!-- Resources (Create, delete, Edit, Suspended) -->
                          <td class="px-4 py-3 font-mono">
                            <div class="space-y-1.5">
                              <div class="text-[11px]">
                                <span class="text-cyan-300 font-bold">${ramFmt} RAM</span>
                                <span class="text-slate-400 text-[10px] ml-1">• ${s.cpu_limit || 100}% CPU • ${diskFmt} Disk</span>
                              </div>
                              <div class="flex flex-wrap items-center gap-1">
                                <button onclick="admin.showAddResourcePresetModal(${s.id}, '${app.escapeHtml(s.name)}', ${s.memory_mb || 1024}, ${s.cpu_limit || 100}, ${s.disk_mb || 5120})" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/20 transition" title="Create / Add Resources">+ Create</button>
                                <button onclick="admin.showEditServerModal(${s.id})" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border border-purple-500/20 transition" title="Edit Configuration">Edit</button>
                                <button onclick="admin.toggleServerSuspension(${s.id})" class="px-1.5 py-0.5 rounded text-[9px] font-bold ${isSuspended ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/20'} transition" title="Toggle Auto-Suspension">${isSuspended ? 'Unsuspend' : 'Suspended'}</button>
                                <button onclick="admin.resetServerResources(${s.id}, '${app.escapeHtml(s.name)}')" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/20 transition" title="Delete Custom Resources">delete</button>
                              </div>
                            </div>
                          </td>

                          <!-- Actions -->
                          <td class="px-4 py-3 text-right whitespace-nowrap">
                            <div class="flex items-center justify-end gap-1.5">
                              <button onclick="admin.sendServerPower(${s.id}, 'start')" class="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 transition" title="Start">
                                <i data-lucide="play" class="w-3.5 h-3.5"></i>
                              </button>
                              <button onclick="admin.sendServerPower(${s.id}, 'restart')" class="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-500/20 transition" title="Restart">
                                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                              </button>
                              <button onclick="admin.sendServerPower(${s.id}, 'stop')" class="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20 transition" title="Stop">
                                <i data-lucide="square" class="w-3.5 h-3.5"></i>
                              </button>
                              <button onclick="app.navigate('server-manage/${s.id}/console')" class="btn-cyber px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shadow-sm" title="Manage Console">
                                <i data-lucide="terminal" class="w-3 h-3"></i> Manage
                              </button>
                              <button onclick="admin.deleteServer(${s.id}, '${app.escapeHtml(s.name)}')" title="Delete Server" class="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20 transition">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }
      }

      // ----------------------------------------------------------------------
      // Populate User Account Table
      // ----------------------------------------------------------------------
      const usrTbody = document.getElementById('adm-users-tbody');
      if (usrTbody) {
        if (users.length === 0) {
          usrTbody.innerHTML = `
            <tr>
              <td colspan="5" class="text-center py-12 text-slate-500">
                <i data-lucide="users" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
                <p class="text-sm font-semibold text-slate-300">No user accounts found</p>
                <button onclick="admin.showCreateUserModal()" class="px-3 py-1.5 rounded-xl text-xs mt-3 font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">+ Add User Account</button>
              </td>
            </tr>
          `;
        } else {
          usrTbody.innerHTML = users.map(u => {
            const userServers = userServersMap[u.id] || [];
            const isAdm = u.role === 'admin';
            const isSuspended = !!u.suspended;

            let serverAccessHTML = '';
            if (userServers.length === 0) {
              serverAccessHTML = `<span class="text-slate-500 font-mono text-[11px]">0 Servers</span>`;
            } else {
              serverAccessHTML = `
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    ${userServers.length} ${userServers.length === 1 ? 'Server' : 'Servers'}
                  </span>
                  ${userServers.map(srv => `
                    <button onclick="app.navigate('server-manage/${srv.id}/console')" class="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition inline-flex items-center gap-1">
                      <i data-lucide="hard-drive" class="w-2.5 h-2.5 text-cyan-400"></i> ${app.escapeHtml(srv.name)}
                    </button>
                  `).join('')}
                </div>
              `;
            }

            return `
              <tr class="hover:bg-white/5 transition-colors">
                <!-- Username -->
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-full ${isAdm ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'} flex items-center justify-center font-bold text-xs uppercase shrink-0">
                      ${(u.username || 'U').substring(0, 1)}
                    </div>
                    <div class="min-w-0">
                      <span class="font-bold text-white block text-xs truncate">${app.escapeHtml(u.username)}</span>
                      <span class="text-[10px] font-mono text-slate-500">UID #${u.id}</span>
                    </div>
                  </div>
                </td>

                <!-- Email -->
                <td class="px-4 py-3 font-mono">
                  <div class="flex items-center gap-1.5">
                    <span class="text-slate-300 text-xs truncate max-w-xs">${app.escapeHtml(u.email)}</span>
                    <button onclick="navigator.clipboard.writeText('${app.escapeHtml(u.email)}'); app.toast('Copied email: ${app.escapeHtml(u.email)}', 'info');" class="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300 transition" title="Copy Email">
                      <i data-lucide="copy" class="w-3 h-3"></i>
                    </button>
                  </div>
                </td>

                <!-- Server Access -->
                <td class="px-4 py-3">
                  ${serverAccessHTML}
                </td>

                <!-- Permissions -->
                <td class="px-4 py-3">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono ${isAdm ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-800 text-slate-300 border border-white/10'}">
                      ${isAdm ? 'ADMINISTRATOR' : 'CLIENT USER'}
                    </span>
                    ${u.two_factor_enabled
                      ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">2FA Active</span>'
                      : '<span class="px-1.5 py-0.2 rounded text-[9px] font-mono text-slate-500 border border-white/5">No 2FA</span>'}
                    ${isSuspended
                      ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">SUSPENDED</span>'
                      : '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400">ACTIVE</span>'}
                  </div>
                </td>

                <!-- Actions -->
                <td class="px-4 py-3 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1.5">
                    <button onclick="admin.toggleSuspendUser(${u.id})" class="p-1.5 rounded-lg border transition ${isSuspended ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30' : 'bg-slate-800 hover:bg-amber-950 text-slate-400 hover:text-amber-400 border-white/10'}" title="${isSuspended ? 'Unsuspend Account' : 'Suspend Account'}">
                      <i data-lucide="${isSuspended ? 'check' : 'slash'}" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="admin.showResetPasswordModal(${u.id}, '${app.escapeHtml(u.username)}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-white/10 transition" title="Reset Password">
                      <i data-lucide="key" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="admin.deleteUser(${u.id})" class="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20 transition" title="Delete Account">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `;
          }).join('');
        }
      }

      // Custom Server Sort Extension (customserversort.blueprint)
      if (window.customServerSort) {
        const sortContainer = isCard ? document.getElementById('adm-servers-grid') : document.getElementById('adm-servers-tbody');
        if (sortContainer) {
          customServerSort.attachSortable(sortContainer, 'admin');
        }
      }
    } catch (err) {
      console.error('Error rendering servers & accounts view:', err);
      app.toast('Failed to load server and account data: ' + err.message, 'error');
    }

    if (window.lucide) lucide.createIcons();
  }

  handleServerSortChange(newMode) {
    if (window.customServerSort) {
      customServerSort.setSortMode('admin', newMode);
      this.renderServersView();
    }
  }

  async sendServerPower(serverId, action) {
    try {
      app.toast(`Sending ${action.toUpperCase()} command...`, 'info');
      await app.api(`/api/servers/${serverId}/power`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      app.toast(`Server power action "${action}" dispatched!`, 'success');
      setTimeout(() => this.renderServersView(), 1200);
    } catch (err) {
      app.toast('Power action failed: ' + err.message, 'error');
    }
  }

  async showServerOwnerModal(serverId, serverName, currentUserId, currentUsername) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <div class="flex justify-between items-center border-b border-white/10 pb-3">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="shield-check" class="w-5 h-5 text-cyan-400"></i> User Access & Ownership
            </h3>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
          <p class="text-xs text-slate-400">Manage owner and user access for <strong>${app.escapeHtml(serverName)}</strong> (ID #${serverId}).</p>

          <div class="p-3 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-between text-xs">
            <div>
              <span class="text-slate-400 block text-[10px] uppercase font-bold">Current Owner</span>
              <span class="text-cyan-300 font-bold text-sm">${app.escapeHtml(currentUsername || 'Admin')}</span>
            </div>
            ${currentUserId ? `
              <button type="button" onclick="admin.showUserServerAccessModal(${currentUserId}, '${app.escapeHtml(currentUsername || 'Admin')}')" class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 transition">
                View All User Servers
              </button>
            ` : ''}
          </div>

          <form onsubmit="admin.handleServerOwnerChange(event, ${serverId})" class="space-y-4 pt-1">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Transfer Ownership to User</label>
              <select id="transfer-srv-user-id" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required>
                <option value="">Loading users...</option>
              </select>
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-white/10">
              <button type="button" onclick="admin.showCreateUserModal()" class="text-xs font-bold text-purple-400 hover:underline flex items-center gap-1">
                <i data-lucide="user-plus" class="w-3.5 h-3.5"></i> + Create New User
              </button>
              <div class="flex items-center gap-2">
                <button type="button" onclick="document.getElementById('modal-container').innerHTML=''" class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold">Transfer Server</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    try {
      const res = await app.api('/api/admin/users');
      const users = res.users || [];
      const select = document.getElementById('transfer-srv-user-id');
      if (select) {
        select.innerHTML = users.map(u => `
          <option value="${u.id}" ${u.id === currentUserId ? 'selected' : ''}>
            ${app.escapeHtml(u.username)} (${app.escapeHtml(u.email || 'No email')}) - ${u.role.toUpperCase()}
          </option>
        `).join('');
      }
    } catch (e) {
      app.toast('Failed to load users: ' + e.message, 'error');
    }
  }

  async handleServerOwnerChange(e, serverId) {
    e.preventDefault();
    const select = document.getElementById('transfer-srv-user-id');
    if (!select) return;
    const newUserId = parseInt(select.value, 10);
    try {
      const res = await app.api(`/api/servers/${serverId}`, {
        method: 'PUT',
        body: JSON.stringify({ user_id: newUserId })
      });
      if (res.success) {
        app.toast(`Server #${serverId} owner updated successfully!`, 'success');
        document.getElementById('modal-container').innerHTML = '';
        this.renderServersView();
      }
    } catch (err) {
      app.toast(err.message || 'Failed to change server owner', 'error');
    }
  }

  showAddResourcePresetModal(serverId, serverName, curRam, curCpu, curDisk) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <div class="flex justify-between items-center border-b border-white/10 pb-3">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="plus-circle" class="w-5 h-5 text-cyan-400"></i> Add Resources: ${app.escapeHtml(serverName)}
            </h3>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
          <p class="text-xs text-slate-400">Quickly allocate additional resources or apply a boost preset to this server.</p>

          <div class="grid grid-cols-3 gap-2 font-mono text-center text-xs p-3 rounded-2xl bg-slate-900/60 border border-white/10">
            <div>
              <span class="text-[10px] text-slate-400 block uppercase">Current RAM</span>
              <span class="text-cyan-300 font-bold">${curRam >= 1024 ? (curRam / 1024).toFixed(1) + ' GB' : curRam + ' MB'}</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block uppercase">Current CPU</span>
              <span class="text-purple-300 font-bold">${curCpu}%</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block uppercase">Current Disk</span>
              <span class="text-indigo-300 font-bold">${curDisk >= 1024 ? (curDisk / 1024).toFixed(1) + ' GB' : curDisk + ' MB'}</span>
            </div>
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-semibold text-slate-300">Quick Boost Presets:</label>
            <div class="grid grid-cols-2 gap-2">
              <button type="button" onclick="admin.applyResourcePreset(${serverId}, ${curRam + 1024}, ${curCpu}, ${curDisk})" class="px-3 py-2 rounded-xl text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 transition text-left flex items-center gap-1.5">
                <i data-lucide="zap" class="w-3.5 h-3.5"></i> +1 GB RAM
              </button>
              <button type="button" onclick="admin.applyResourcePreset(${serverId}, ${curRam + 2048}, ${curCpu}, ${curDisk})" class="px-3 py-2 rounded-xl text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 transition text-left flex items-center gap-1.5">
                <i data-lucide="zap" class="w-3.5 h-3.5"></i> +2 GB RAM
              </button>
              <button type="button" onclick="admin.applyResourcePreset(${serverId}, ${curRam}, ${curCpu + 50}, ${curDisk})" class="px-3 py-2 rounded-xl text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition text-left flex items-center gap-1.5">
                <i data-lucide="cpu" class="w-3.5 h-3.5"></i> +50% CPU
              </button>
              <button type="button" onclick="admin.applyResourcePreset(${serverId}, ${curRam}, ${curCpu}, ${curDisk + 5120})" class="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition text-left flex items-center gap-1.5">
                <i data-lucide="hard-drive" class="w-3.5 h-3.5"></i> +5 GB Disk
              </button>
            </div>
          </div>

          <form onsubmit="admin.handleCustomResourceBoost(event, ${serverId}, ${curRam}, ${curCpu}, ${curDisk})" class="space-y-3 pt-2 border-t border-white/10">
            <label class="block text-xs font-semibold text-slate-300">Or Add Custom Amount:</label>
            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Add RAM (MB)</label>
                <input type="number" id="add-res-ram" value="1024" step="any" min="0" class="w-full glass-input px-2.5 py-1.5 rounded-xl text-xs font-mono text-cyan-300">
              </div>
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Add CPU (%)</label>
                <input type="number" id="add-res-cpu" value="25" step="any" min="0" class="w-full glass-input px-2.5 py-1.5 rounded-xl text-xs font-mono text-purple-300">
              </div>
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Add Disk (MB)</label>
                <input type="number" id="add-res-disk" value="2048" step="any" min="0" class="w-full glass-input px-2.5 py-1.5 rounded-xl text-xs font-mono text-indigo-300">
              </div>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" onclick="document.getElementById('modal-container').innerHTML=''" class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300">Cancel</button>
              <button type="submit" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold">Apply Resources</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async applyResourcePreset(serverId, newRam, newCpu, newDisk) {
    try {
      const res = await app.api(`/api/servers/${serverId}`, {
        method: 'PUT',
        body: JSON.stringify({
          memory_mb: newRam,
          cpu_limit: newCpu,
          disk_mb: newDisk
        })
      });
      if (res.success) {
        app.toast('Resources updated successfully!', 'success');
        document.getElementById('modal-container').innerHTML = '';
        this.renderServersView();
      }
    } catch (err) {
      app.toast(err.message || 'Failed to update resources', 'error');
    }
  }

  async handleCustomResourceBoost(e, serverId, curRam, curCpu, curDisk) {
    e.preventDefault();
    const addRam = parseFloat(document.getElementById('add-res-ram').value) || 0;
    const addCpu = parseFloat(document.getElementById('add-res-cpu').value) || 0;
    const addDisk = parseFloat(document.getElementById('add-res-disk').value) || 0;

    const newRam = Math.round(curRam + addRam);
    const newCpu = Math.round(curCpu + addCpu);
    const newDisk = Math.round(curDisk + addDisk);

    await this.applyResourcePreset(serverId, newRam, newCpu, newDisk);
  }

  async resetServerResources(serverId, serverName) {
    if (!confirm(`Reset resources for server "${serverName}" back to baseline defaults (1024 MB RAM, 100% CPU, 5120 MB Disk)?`)) return;
    await this.applyResourcePreset(serverId, 1024, 100, 5120);
  }

  // Helper methods for auto-generated server naming & resource conversions
  generateServerName(type = 'minecraft') {
    const prefixes = ['Apex', 'Cyber', 'Vortex', 'Shadow', 'Titan', 'Nova', 'Pulse', 'Frost', 'Iron', 'Echo', 'Nebula', 'Quantum', 'Hyper', 'Blaze', 'Mythic', 'Obsidian', 'Arix'];
    const mcSuffixes = ['SMP', 'Craft', 'Realms', 'Node', 'Zone', 'Hub', 'Grid', 'World', 'Legends'];
    const nodeSuffixes = ['App', 'Bot', 'API', 'Worker', 'Service', 'Server'];
    const pySuffixes = ['Bot', 'AI', 'Script', 'Engine', 'Worker', 'Service'];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    let suffix = mcSuffixes[Math.floor(Math.random() * mcSuffixes.length)];
    if (type === 'nodejs') suffix = nodeSuffixes[Math.floor(Math.random() * nodeSuffixes.length)];
    if (type === 'python') suffix = pySuffixes[Math.floor(Math.random() * pySuffixes.length)];
    if (type === 'lumenvm' || type === 'vm' || type === 'nokvm' || type === 'lumenvm_nokvm') suffix = ['VM', 'VPS', 'Cloud', 'Box', 'Node', 'Linux', 'Host'][Math.floor(Math.random() * 7)];

    const num = Math.floor(10 + Math.random() * 90);
    return `${prefix}-${suffix}-${num}`;
  }

  generateServerDesc(type = 'minecraft', engine = 'Paper', ver = '1.21.4') {
    if (type === 'nodejs') return `Ultra-fast Node.js application container with automated process supervisor.`;
    if (type === 'python') return `Low-latency Python application container with automatic runtime environments.`;
    if (type === 'nokvm' || type === 'lumenvm_nokvm') return `VM - No-KVM Virtual Machine instance (Software Emulation - Runs on any VPS) with zero license requirement.`;
    if (type === 'lumenvm' || type === 'vm') return `VM - KVM hardware-accelerated Virtual Machine instance with zero license requirement.`;
    return `High-performance ${engine || 'Minecraft'} ${ver || '1.21.4'} server instance with auto-suspension telemetry.`;
  }

  regenerateDeployServerName() {
    const typeInput = document.querySelector('input[name="create_srv_type"]:checked');
    const type = typeInput ? typeInput.value : 'minecraft';
    const nameInput = document.getElementById('srv-create-name');
    const tag = document.getElementById('srv-name-mode-tag');
    if (nameInput) {
      nameInput.value = this.generateServerName(type);
      if (tag) tag.innerText = 'Default Auto';
    }
  }

  regenerateDeployServerDesc() {
    const typeInput = document.querySelector('input[name="create_srv_type"]:checked');
    const type = typeInput ? typeInput.value : 'minecraft';
    const engine = document.getElementById('mc-jar-type')?.value || 'Paper';
    const ver = document.getElementById('mc-jar-version')?.value || '1.21.4';
    const descInput = document.getElementById('srv-create-desc');
    const tag = document.getElementById('srv-desc-mode-tag');
    if (descInput) {
      descInput.value = this.generateServerDesc(type, engine, ver);
      if (tag) tag.innerText = 'Default Auto';
    }
  }

  onServerNameInput() {
    const tag = document.getElementById('srv-name-mode-tag');
    if (tag) tag.innerText = 'Custom';
  }

  onServerDescInput() {
    const tag = document.getElementById('srv-desc-mode-tag');
    if (tag) tag.innerText = 'Custom';
  }

  setDeployRamUnit(unit) {
    this.deployRamUnit = unit;
    const input = document.getElementById('srv-create-ram-val');
    const btnGb = document.getElementById('btn-ram-unit-gb');
    const btnMb = document.getElementById('btn-ram-unit-mb');
    const presets = document.getElementById('ram-presets-container');
    if (!input) return;

    let val = parseFloat(input.value) || 2;
    if (unit === 'GB') {
      if (val > 128) val = Math.max(0.5, Math.round(val / 1024 * 10) / 10);
      input.value = val;
      input.min = "0.25";
      input.max = "128";
      if (btnGb) btnGb.className = "px-2 py-0.5 rounded-md transition bg-cyan-500 text-black shadow font-bold";
      if (btnMb) btnMb.className = "px-2 py-0.5 rounded-md transition text-slate-400 hover:text-white";
      if (presets) {
        presets.innerHTML = `
          <button type="button" onclick="admin.setDeployRamValue(1)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">1 GB</button>
          <button type="button" onclick="admin.setDeployRamValue(2)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold transition">2 GB</button>
          <button type="button" onclick="admin.setDeployRamValue(4)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">4 GB</button>
          <button type="button" onclick="admin.setDeployRamValue(8)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">8 GB</button>
        `;
      }
    } else {
      if (val <= 128) val = Math.round(val * 1024);
      input.value = val;
      input.min = "256";
      input.max = "131072";
      if (btnMb) btnMb.className = "px-2 py-0.5 rounded-md transition bg-cyan-500 text-black shadow font-bold";
      if (btnGb) btnGb.className = "px-2 py-0.5 rounded-md transition text-slate-400 hover:text-white";
      if (presets) {
        presets.innerHTML = `
          <button type="button" onclick="admin.setDeployRamValue(1024)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">1024 MB</button>
          <button type="button" onclick="admin.setDeployRamValue(2048)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold transition">2048 MB</button>
          <button type="button" onclick="admin.setDeployRamValue(4096)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">4096 MB</button>
          <button type="button" onclick="admin.setDeployRamValue(8192)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">8192 MB</button>
        `;
      }
    }
    this.updateDeployResourceSummary();
  }

  setDeployRamValue(val) {
    const input = document.getElementById('srv-create-ram-val');
    if (input) {
      input.value = val;
      this.updateDeployResourceSummary();
    }
  }

  setDeployCpuUnit(unit) {
    this.deployCpuUnit = unit;
    const input = document.getElementById('srv-create-cpu-val');
    const btnPct = document.getElementById('btn-cpu-unit-pct');
    const btnCores = document.getElementById('btn-cpu-unit-cores');
    const presets = document.getElementById('cpu-presets-container');
    if (!input) return;

    let val = parseFloat(input.value) || 100;
    if (unit === '%') {
      if (val <= 32) val = Math.round(val * 100);
      input.value = val;
      input.min = "10";
      input.max = "1600";
      if (btnPct) btnPct.className = "px-2 py-0.5 rounded-md transition bg-purple-600 text-white shadow font-bold";
      if (btnCores) btnCores.className = "px-2 py-0.5 rounded-md transition text-slate-400 hover:text-white";
      if (presets) {
        presets.innerHTML = `
          <button type="button" onclick="admin.setDeployCpuValue(50)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">50%</button>
          <button type="button" onclick="admin.setDeployCpuValue(100)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold transition">100%</button>
          <button type="button" onclick="admin.setDeployCpuValue(200)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">200%</button>
          <button type="button" onclick="admin.setDeployCpuValue(400)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">400%</button>
        `;
      }
    } else {
      if (val > 32) val = Math.max(0.25, Math.round(val / 100 * 10) / 10);
      input.value = val;
      input.min = "0.25";
      input.max = "16";
      if (btnCores) btnCores.className = "px-2 py-0.5 rounded-md transition bg-purple-600 text-white shadow font-bold";
      if (btnPct) btnPct.className = "px-2 py-0.5 rounded-md transition text-slate-400 hover:text-white";
      if (presets) {
        presets.innerHTML = `
          <button type="button" onclick="admin.setDeployCpuValue(0.5)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">0.5 Core</button>
          <button type="button" onclick="admin.setDeployCpuValue(1)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold transition">1 Core</button>
          <button type="button" onclick="admin.setDeployCpuValue(2)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">2 Cores</button>
          <button type="button" onclick="admin.setDeployCpuValue(4)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">4 Cores</button>
        `;
      }
    }
    this.updateDeployResourceSummary();
  }

  setDeployCpuValue(val) {
    const input = document.getElementById('srv-create-cpu-val');
    if (input) {
      input.value = val;
      this.updateDeployResourceSummary();
    }
  }

  setDeployDiskUnit(unit) {
    this.deployDiskUnit = unit;
    const input = document.getElementById('srv-create-disk-val');
    const btnGb = document.getElementById('btn-disk-unit-gb');
    const btnMb = document.getElementById('btn-disk-unit-mb');
    const presets = document.getElementById('disk-presets-container');
    if (!input) return;

    let val = parseFloat(input.value) || 10;
    if (unit === 'GB') {
      if (val > 500) val = Math.max(1, Math.round(val / 1024 * 10) / 10);
      input.value = val;
      input.min = "0.5";
      input.max = "500";
      if (btnGb) btnGb.className = "px-2 py-0.5 rounded-md transition bg-indigo-600 text-white shadow font-bold";
      if (btnMb) btnMb.className = "px-2 py-0.5 rounded-md transition text-slate-400 hover:text-white";
      if (presets) {
        presets.innerHTML = `
          <button type="button" onclick="admin.setDeployDiskValue(5)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">5 GB</button>
          <button type="button" onclick="admin.setDeployDiskValue(10)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold transition">10 GB</button>
          <button type="button" onclick="admin.setDeployDiskValue(25)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">25 GB</button>
          <button type="button" onclick="admin.setDeployDiskValue(50)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">50 GB</button>
        `;
      }
    } else {
      if (val <= 500) val = Math.round(val * 1024);
      input.value = val;
      input.min = "512";
      input.max = "512000";
      if (btnMb) btnMb.className = "px-2 py-0.5 rounded-md transition bg-indigo-600 text-white shadow font-bold";
      if (btnGb) btnGb.className = "px-2 py-0.5 rounded-md transition text-slate-400 hover:text-white";
      if (presets) {
        presets.innerHTML = `
          <button type="button" onclick="admin.setDeployDiskValue(5120)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">5120 MB</button>
          <button type="button" onclick="admin.setDeployDiskValue(10240)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold transition">10240 MB</button>
          <button type="button" onclick="admin.setDeployDiskValue(25600)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">25600 MB</button>
          <button type="button" onclick="admin.setDeployDiskValue(51200)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">51200 MB</button>
        `;
      }
    }
    this.updateDeployResourceSummary();
  }

  setDeployDiskValue(val) {
    const input = document.getElementById('srv-create-disk-val');
    if (input) {
      input.value = val;
      this.updateDeployResourceSummary();
    }
  }

  updateDeployResourceSummary() {
    const ramInput = document.getElementById('srv-create-ram-val');
    const cpuInput = document.getElementById('srv-create-cpu-val');
    const diskInput = document.getElementById('srv-create-disk-val');

    const ramEquiv = document.getElementById('ram-equiv-tag');
    if (ramInput && ramEquiv) {
      const v = parseFloat(ramInput.value) || 0;
      if (this.deployRamUnit === 'GB') {
        ramEquiv.innerHTML = `<span>Allocation:</span><span class="text-cyan-400 font-bold">${Math.round(v * 1024)} MB</span>`;
      } else {
        ramEquiv.innerHTML = `<span>Allocation:</span><span class="text-cyan-400 font-bold">${(v / 1024).toFixed(1)} GB</span>`;
      }
    }

    const cpuEquiv = document.getElementById('cpu-equiv-tag');
    if (cpuInput && cpuEquiv) {
      const v = parseFloat(cpuInput.value) || 0;
      if (this.deployCpuUnit === '%') {
        cpuEquiv.innerHTML = `<span>Allocation:</span><span class="text-purple-400 font-bold">${(v / 100).toFixed(1)} Cores</span>`;
      } else {
        cpuEquiv.innerHTML = `<span>Allocation:</span><span class="text-purple-400 font-bold">${Math.round(v * 100)}%</span>`;
      }
    }

    const diskEquiv = document.getElementById('disk-equiv-tag');
    if (diskInput && diskEquiv) {
      const v = parseFloat(diskInput.value) || 0;
      if (this.deployDiskUnit === 'GB') {
        diskEquiv.innerHTML = `<span>Allocation:</span><span class="text-indigo-400 font-bold">${Math.round(v * 1024)} MB</span>`;
      } else {
        diskEquiv.innerHTML = `<span>Allocation:</span><span class="text-indigo-400 font-bold">${(v / 1024).toFixed(1)} GB</span>`;
      }
    }
  }

  // Show Server Creation Wizard (with MCJars integration & Docker templates - Admin Only)
  async showCreateServerModal() {
    if (!app.user || app.user.role !== 'admin') {
      app.toast('Only administrators can deploy new servers. Contact your administrator.', 'error');
      return;
    }

    const modalContainer = document.getElementById('modal-container');

    // Fetch registered users for User Access / Server Access assignment
    let users = [];
    if (app.user?.role === 'admin') {
      try {
        const uRes = await app.api('/api/admin/users');
        users = uRes.users || [];
      } catch (e) {
        console.warn('Could not load users for deploy modal:', e);
      }
    }

    this.deployRamUnit = 'GB';
    this.deployCpuUnit = '%';
    this.deployDiskUnit = 'GB';

    const initialName = this.generateServerName('minecraft');
    const initialDesc = this.generateServerDesc('minecraft', 'Paper', '1.21.4');

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-panel w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 rounded-3xl border border-white/15 shadow-2xl space-y-5">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center gap-3 flex-wrap">
              <h3 class="text-lg font-black text-white flex items-center gap-2">
                <i data-lucide="server" class="w-5 h-5 text-cyan-400"></i> Deploy New Server Instance
              </h3>
              <a href="/deploy.php" target="_blank" class="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 text-[10px] font-mono font-bold flex items-center gap-1 transition" title="Open Full Page PHP Deployment Portal">
                <i data-lucide="external-link" class="w-3 h-3"></i> Full Page PHP
              </a>
            </div>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <form onsubmit="admin.handleCreateServer(event)" class="space-y-4">
            <!-- 1. User Access / Server Access -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span class="flex items-center gap-1.5">
                  <i data-lucide="user-check" class="w-3.5 h-3.5 text-cyan-400"></i> User Access / Server Access
                </span>
                <span class="text-[10px] text-slate-400">Assign server ownership & client access</span>
              </label>
              ${app.user?.role === 'admin' && users.length > 0 ? `
                <select id="srv-create-user-id" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs">
                  ${users.map(u => `
                    <option value="${u.id}" ${u.id === (app.user?.id || 1) ? 'selected' : ''}>
                      ${app.escapeHtml(u.username)} (${app.escapeHtml(u.email)}) - UID #${u.id} [${u.role.toUpperCase()}]
                    </option>
                  `).join('')}
                </select>
              ` : `
                <input type="hidden" id="srv-create-user-id" value="${app.user?.id || 1}">
                <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-300 flex items-center justify-between">
                  <span class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span>Self Assigned: <strong>${app.escapeHtml(app.user?.username || 'Current User')}</strong></span>
                  </span>
                  <span class="text-[10px] font-mono text-slate-500">UID #${app.user?.id || 1}</span>
                </div>
              `}
            </div>

            <!-- 2. Server Type Selector -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-2">Supported Server Type</label>
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <label class="glass-card p-3 rounded-xl border border-white/10 flex flex-col items-center gap-2 cursor-pointer hover:border-cyan-400 transition">
                  <input type="radio" name="create_srv_type" value="minecraft" checked onchange="admin.onServerTypeChange('minecraft')" class="accent-cyan-400">
                  <i data-lucide="box" class="w-6 h-6 text-cyan-400"></i>
                  <span class="text-xs font-bold text-white">Minecraft</span>
                  <span class="text-[10px] text-slate-400 text-center">Paper, Purpur, Forge...</span>
                </label>
                <label class="glass-card p-3 rounded-xl border border-white/10 flex flex-col items-center gap-2 cursor-pointer hover:border-purple-400 transition">
                  <input type="radio" name="create_srv_type" value="nodejs" onchange="admin.onServerTypeChange('nodejs')" class="accent-purple-400">
                  <i data-lucide="cpu" class="w-6 h-6 text-purple-400"></i>
                  <span class="text-xs font-bold text-white">Node.js</span>
                  <span class="text-[10px] text-slate-400 text-center">v12 - v25 Apps & Bots</span>
                </label>
                <label class="glass-card p-3 rounded-xl border border-white/10 flex flex-col items-center gap-2 cursor-pointer hover:border-emerald-400 transition">
                  <input type="radio" name="create_srv_type" value="python" onchange="admin.onServerTypeChange('python')" class="accent-emerald-400">
                  <i data-lucide="layers" class="w-6 h-6 text-emerald-400"></i>
                  <span class="text-xs font-bold text-white">Python</span>
                  <span class="text-[10px] text-slate-400 text-center">v2.7, 3.7 - 3.13 Apps</span>
                </label>
                <label class="glass-card p-3 rounded-xl border border-white/10 flex flex-col items-center gap-2 cursor-pointer hover:border-amber-400 transition">
                  <input type="radio" name="create_srv_type" value="lumenvm" onchange="admin.onServerTypeChange('lumenvm')" class="accent-amber-400">
                  <i data-lucide="server" class="w-6 h-6 text-amber-400"></i>
                  <span class="text-xs font-bold text-white flex items-center gap-1">
                    <span>VM - KVM</span>
                    <span class="px-1 py-0.2 rounded text-[8px] bg-emerald-500/20 text-emerald-400 font-extrabold border border-emerald-500/30">Fast</span>
                  </span>
                  <span class="text-[10px] text-slate-400 text-center">Hardware Accelerated</span>
                </label>
                <label class="glass-card p-3 rounded-xl border border-white/10 flex flex-col items-center gap-2 cursor-pointer hover:border-blue-400 transition">
                  <input type="radio" name="create_srv_type" value="nokvm" onchange="admin.onServerTypeChange('nokvm')" class="accent-blue-400">
                  <i data-lucide="shield-check" class="w-6 h-6 text-blue-400"></i>
                  <span class="text-xs font-bold text-white flex items-center gap-1">
                    <span>VM - No-KVM</span>
                    <span class="px-1 py-0.2 rounded text-[8px] bg-blue-500/20 text-blue-300 font-extrabold border border-blue-500/30">Universal</span>
                  </span>
                  <span class="text-[10px] text-slate-400 text-center">Software Emulation (Any VPS)</span>
                </label>
              </div>
            </div>

            <!-- 3. Server Name & Description (Default auto generate or custom) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Server Name -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <span>Server Name</span>
                    <span class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" id="srv-name-mode-tag">Default Auto</span>
                  </label>
                  <button type="button" onclick="admin.regenerateDeployServerName()" class="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition" title="Auto Generate Name">
                    <i data-lucide="sparkles" class="w-3 h-3"></i> Auto Generate
                  </button>
                </div>
                <div class="relative">
                  <input type="text" id="srv-create-name" value="${initialName}" placeholder="Server name" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs pr-8 font-semibold text-white" required oninput="admin.onServerNameInput()">
                  <button type="button" onclick="admin.regenerateDeployServerName()" class="absolute right-2.5 top-2.5 text-slate-400 hover:text-cyan-400 transition" title="Reroll name">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>

              <!-- Server Description -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <span>Server Description</span>
                    <span class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30" id="srv-desc-mode-tag">Default Auto</span>
                  </label>
                  <button type="button" onclick="admin.regenerateDeployServerDesc()" class="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition" title="Auto Generate Description">
                    <i data-lucide="sparkles" class="w-3 h-3"></i> Auto Generate
                  </button>
                </div>
                <div class="relative">
                  <input type="text" id="srv-create-desc" value="${initialDesc}" placeholder="Server description" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs pr-8" oninput="admin.onServerDescInput()">
                  <button type="button" onclick="admin.regenerateDeployServerDesc()" class="absolute right-2.5 top-2.5 text-slate-400 hover:text-purple-400 transition" title="Reroll description">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Minecraft Version Changer & Software Selector with Icons -->
            <div id="mcjars-config-box" class="glass-card p-5 rounded-2xl border border-cyan-500/30 space-y-4 bg-gradient-to-br from-cyan-950/20 via-slate-900/40 to-slate-900/80">
              <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div class="flex items-center gap-2">
                  <span class="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                  </span>
                  <div>
                    <h4 class="text-xs font-bold text-white flex items-center gap-2">
                      Minecraft Version Changer & Software Selector
                    </h4>
                    <p class="text-[10px] text-slate-400">Choose your server engine and version with automatic Java runtime matching</p>
                  </div>
                </div>
                <a href="https://mcjars.app" target="_blank" class="text-[10px] font-mono text-cyan-400 hover:underline">mcjars.app</a>
              </div>

              <!-- Engine Cards with Icons -->
              <div>
                <label class="block text-[11px] font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span>Select Server Engine:</span>
                  <span class="text-[10px] text-slate-400">Click to select engine</span>
                </label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <!-- Paper -->
                  <div onclick="admin.selectDeployEngine('paper')" data-type="paper" class="deploy-engine-card group relative p-3 rounded-xl border border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400 cursor-pointer transition">
                    <span class="deploy-card-check absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-cyan-500 text-black flex items-center gap-0.5">
                      <i data-lucide="check" class="w-2.5 h-2.5"></i> ACTIVE
                    </span>
                    <div class="flex items-center gap-2 mb-1.5">
                      <div class="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                        <i data-lucide="zap" class="w-4 h-4"></i>
                      </div>
                      <div class="font-bold text-xs text-white">Paper</div>
                    </div>
                    <span class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-medium">Recommended</span>
                  </div>

                  <!-- Purpur -->
                  <div onclick="admin.selectDeployEngine('purpur')" data-type="purpur" class="deploy-engine-card group relative p-3 rounded-xl border border-white/10 glass-card hover:border-cyan-500/40 hover:bg-white/5 cursor-pointer transition">
                    <span class="deploy-card-check hidden absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-cyan-500 text-black flex items-center gap-0.5">
                      <i data-lucide="check" class="w-2.5 h-2.5"></i> ACTIVE
                    </span>
                    <div class="flex items-center gap-2 mb-1.5">
                      <div class="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
                        <i data-lucide="layers" class="w-4 h-4"></i>
                      </div>
                      <div class="font-bold text-xs text-white">Purpur</div>
                    </div>
                    <span class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-purple-300 font-medium">Popular</span>
                  </div>

                  <!-- Fabric -->
                  <div onclick="admin.selectDeployEngine('fabric')" data-type="fabric" class="deploy-engine-card group relative p-3 rounded-xl border border-white/10 glass-card hover:border-cyan-500/40 hover:bg-white/5 cursor-pointer transition">
                    <span class="deploy-card-check hidden absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-cyan-500 text-black flex items-center gap-0.5">
                      <i data-lucide="check" class="w-2.5 h-2.5"></i> ACTIVE
                    </span>
                    <div class="flex items-center gap-2 mb-1.5">
                      <div class="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                        <i data-lucide="box" class="w-4 h-4"></i>
                      </div>
                      <div class="font-bold text-xs text-white">Fabric</div>
                    </div>
                    <span class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-amber-300 font-medium">Fast Modding</span>
                  </div>

                  <!-- Forge -->
                  <div onclick="admin.selectDeployEngine('forge')" data-type="forge" class="deploy-engine-card group relative p-3 rounded-xl border border-white/10 glass-card hover:border-cyan-500/40 hover:bg-white/5 cursor-pointer transition">
                    <span class="deploy-card-check hidden absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-cyan-500 text-black flex items-center gap-0.5">
                      <i data-lucide="check" class="w-2.5 h-2.5"></i> ACTIVE
                    </span>
                    <div class="flex items-center gap-2 mb-1.5">
                      <div class="p-1.5 rounded-lg bg-orange-500/20 text-orange-300">
                        <i data-lucide="tool" class="w-4 h-4"></i>
                      </div>
                      <div class="font-bold text-xs text-white">Forge</div>
                    </div>
                    <span class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-orange-300 font-medium">Classic Mods</span>
                  </div>

                  <!-- NeoForge -->
                  <div onclick="admin.selectDeployEngine('neoforge')" data-type="neoforge" class="deploy-engine-card group relative p-3 rounded-xl border border-white/10 glass-card hover:border-cyan-500/40 hover:bg-white/5 cursor-pointer transition">
                    <span class="deploy-card-check hidden absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-cyan-500 text-black flex items-center gap-0.5">
                      <i data-lucide="check" class="w-2.5 h-2.5"></i> ACTIVE
                    </span>
                    <div class="flex items-center gap-2 mb-1.5">
                      <div class="p-1.5 rounded-lg bg-rose-500/20 text-rose-300">
                        <i data-lucide="flame" class="w-4 h-4"></i>
                      </div>
                      <div class="font-bold text-xs text-white">NeoForge</div>
                    </div>
                    <span class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-rose-300 font-medium">Next-Gen</span>
                  </div>

                  <!-- Vanilla -->
                  <div onclick="admin.selectDeployEngine('vanilla')" data-type="vanilla" class="deploy-engine-card group relative p-3 rounded-xl border border-white/10 glass-card hover:border-cyan-500/40 hover:bg-white/5 cursor-pointer transition">
                    <span class="deploy-card-check hidden absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-cyan-500 text-black flex items-center gap-0.5">
                      <i data-lucide="check" class="w-2.5 h-2.5"></i> ACTIVE
                    </span>
                    <div class="flex items-center gap-2 mb-1.5">
                      <div class="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                        <i data-lucide="compass" class="w-4 h-4"></i>
                      </div>
                      <div class="font-bold text-xs text-white">Vanilla</div>
                    </div>
                    <span class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 font-medium">Official</span>
                  </div>

                  <!-- Spigot -->
                  <div onclick="admin.selectDeployEngine('spigot')" data-type="spigot" class="deploy-engine-card group relative p-3 rounded-xl border border-white/10 glass-card hover:border-cyan-500/40 hover:bg-white/5 cursor-pointer transition">
                    <span class="deploy-card-check hidden absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-cyan-500 text-black flex items-center gap-0.5">
                      <i data-lucide="check" class="w-2.5 h-2.5"></i> ACTIVE
                    </span>
                    <div class="flex items-center gap-2 mb-1.5">
                      <div class="p-1.5 rounded-lg bg-blue-500/20 text-blue-300">
                        <i data-lucide="cpu" class="w-4 h-4"></i>
                      </div>
                      <div class="font-bold text-xs text-white">Spigot</div>
                    </div>
                    <span class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-blue-300 font-medium">Standard</span>
                  </div>

                  <!-- Folia -->
                  <div onclick="admin.selectDeployEngine('folia')" data-type="folia" class="deploy-engine-card group relative p-3 rounded-xl border border-white/10 glass-card hover:border-cyan-500/40 hover:bg-white/5 cursor-pointer transition">
                    <span class="deploy-card-check hidden absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-cyan-500 text-black flex items-center gap-0.5">
                      <i data-lucide="check" class="w-2.5 h-2.5"></i> ACTIVE
                    </span>
                    <div class="flex items-center gap-2 mb-1.5">
                      <div class="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                        <i data-lucide="grid" class="w-4 h-4"></i>
                      </div>
                      <div class="font-bold text-xs text-white">Folia</div>
                    </div>
                    <span class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-indigo-300 font-medium">Multi-Thread</span>
                  </div>
                </div>
              </div>

              <!-- More Engines Dropdown -->
              <div class="pt-1">
                <div class="flex items-center gap-2">
                  <span class="text-[11px] text-slate-400 whitespace-nowrap">Or choose other engine:</span>
                  <select id="mc-jar-type" onchange="admin.selectDeployEngine(this.value)" class="glass-input px-3 py-1.5 rounded-xl text-xs w-full">
                    <optgroup label="Server Forks (Optimized)">
                      <option value="paper" selected>Paper (Recommended)</option>
                      <option value="purpur">Purpur (Optimized & Features)</option>
                      <option value="pufferfish">Pufferfish (High-Performance)</option>
                      <option value="folia">Folia (Multi-threaded Regionized)</option>
                      <option value="leaves">Leaves (Vanilla Parity)</option>
                      <option value="leaf">Leaf (Balanced)</option>
                      <option value="divinemc">DivineMC (Optimized Purpur)</option>
                      <option value="spigot">Spigot (Classic)</option>
                      <option value="vanilla">Vanilla (Official Mojang)</option>
                      <option value="craftbukkit">CraftBukkit</option>
                    </optgroup>
                    <optgroup label="Modded Platforms">
                      <option value="fabric">Fabric (Fast Mod Loader)</option>
                      <option value="forge">Forge (Classic Modding)</option>
                      <option value="neoforge">NeoForge (Modern Forge)</option>
                      <option value="quilt">Quilt (Modular Mod Loader)</option>
                      <option value="legacyfabric">Legacy Fabric (Old MC)</option>
                    </optgroup>
                    <optgroup label="Hybrid (Mods + Plugins)">
                      <option value="mohist">Mohist (Forge + Plugins)</option>
                      <option value="arclight">Arclight (Forge/Fabric + Plugins)</option>
                      <option value="magma">Magma (Forge + Spigot)</option>
                      <option value="youer">Youer (NeoForge + Spigot)</option>
                    </optgroup>
                    <optgroup label="Proxies">
                      <option value="velocity">Velocity (Next-Gen Proxy)</option>
                      <option value="bungeecord">BungeeCord (Standard Proxy)</option>
                      <option value="waterfall">Waterfall (Paper Proxy)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <!-- Quick Pick Version Buttons (Dynamic A to Z Auto) -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <i data-lucide="zap" class="w-3 h-3 text-amber-400"></i> Quick Select Minecraft Version (A to Z Auto):
                  </label>
                  <div class="flex items-center gap-2">
                    <input type="text" id="deploy-ver-filter" placeholder="Filter A-Z..." oninput="admin.filterDeployQuickVersions(this.value)" class="glass-input px-2 py-0.5 rounded-lg text-[10px] w-24">
                    <button type="button" onclick="admin.toggleDeploySortOrder()" id="deploy-sort-btn" class="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300 border border-white/5 flex items-center gap-1 transition">
                      <i data-lucide="arrow-down-up" class="w-2.5 h-2.5"></i> A-Z
                    </button>
                  </div>
                </div>
                <div id="deploy-quick-versions-container" class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  <!-- Populated dynamically with all versions from A to Z -->
                </div>
              </div>

              <!-- Version Dropdown & Auto-matched Java indicator -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label class="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Minecraft Version</span>
                    <span id="deploy-version-count" class="text-[10px] text-slate-400">All available</span>
                  </label>
                  <select id="mc-jar-version" onchange="admin.onDeployVersionChange(this.value)" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono text-cyan-300">
                    <option value="1.21.4" selected>1.21.4 (Latest Stable)</option>
                    <option value="1.20.4">1.20.4</option>
                    <option value="1.19.4">1.19.4</option>
                    <option value="1.18.2">1.18.2</option>
                    <option value="1.16.5">1.16.5</option>
                    <option value="1.12.2">1.12.2</option>
                    <option value="1.8.8">1.8.8</option>
                    <option value="1.7.10">1.7.10</option>
                  </select>
                </div>
                <div class="flex flex-col justify-end">
                  <div class="glass-card p-2 rounded-xl border border-white/10 flex items-center gap-2">
                    <div id="deploy-java-tag" class="flex items-center gap-1.5 text-xs font-mono">
                      <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-400"></i>
                      <span class="text-emerald-400 font-semibold">Auto-matched Java 21</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- LumenVM / VPS Configuration Box -->
            <div id="lumenvm-config-box" class="hidden glass-card p-5 rounded-2xl border border-amber-500/30 space-y-4 bg-gradient-to-br from-amber-950/20 via-slate-900/40 to-slate-900/80">
              <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div class="flex items-center gap-2">
                  <span class="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <i data-lucide="server" class="w-4 h-4"></i>
                  </span>
                  <div>
                    <h4 class="text-xs font-bold text-white flex items-center gap-2">
                      VM - KVM / No-KVM Configuration
                      <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        ✓ No License Required (Unlocked)
                      </span>
                    </h4>
                    <p class="text-[10px] text-slate-400">Deploy pure Linux & Windows KVM Virtual Machines with zero license requirement</p>
                  </div>
                </div>
                <span class="text-[10px] font-mono text-amber-400 font-semibold flex items-center gap-1">
                  <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-400"></i> Free & Open Source
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <!-- Hostname -->
                <div>
                  <label class="block text-[11px] font-semibold text-slate-300 mb-1">VM Hostname</label>
                  <input type="text" id="vm-hostname" value="lumenvm" class="w-full glass-input px-3 py-1.5 rounded-xl text-xs font-mono" placeholder="lumenvm">
                </div>

                <!-- Root Password -->
                <div>
                  <label class="block text-[11px] font-semibold text-slate-300 mb-1">Root / VNC Password</label>
                  <input type="text" id="vm-password" value="admin123" class="w-full glass-input px-3 py-1.5 rounded-xl text-xs font-mono" placeholder="Password">
                </div>

                <!-- Display Mode -->
                <div>
                  <label class="block text-[11px] font-semibold text-slate-300 mb-1">Display & Access Mode</label>
                  <select id="vm-display-mode" class="w-full glass-input px-3 py-1.5 rounded-xl text-xs">
                    <option value="ssh" selected>SSH Terminal Console (Port 22)</option>
                    <option value="novnc">noVNC Web Desktop (GUI in Browser)</option>
                    <option value="vnc">Native VNC Client (Port 5900)</option>
                    <option value="spice">SPICE Client</option>
                    <option value="rdp">RDP (Windows Remote Desktop)</option>
                  </select>
                </div>

                <!-- KVM Acceleration (On / No-KVM Off / Auto) -->
                <div>
                  <label class="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>KVM Mode</span>
                    <span id="vm-kvm-badge" class="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">KVM ON</span>
                  </label>
                  <select id="vm-kvm-mode" class="w-full glass-input px-3 py-1.5 rounded-xl text-xs font-semibold" onchange="admin.onVmKvmModeChange(this.value)">
                    <option value="on" selected>⚡ KVM ON (Hardware Accelerated)</option>
                    <option value="off">🛡️ No-KVM / OFF (Software Emulation)</option>
                    <option value="auto">🔄 Auto (Detect Host Support)</option>
                  </select>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-slate-300">
                <div class="flex items-center gap-2">
                  <i data-lucide="cpu" class="w-4 h-4 text-cyan-400"></i>
                  <span id="vm-kvm-status-text">Hardware Virtualization: <strong class="text-emerald-400">KVM ON (Hardware Accelerated)</strong></span>
                </div>
                <div class="flex items-center gap-1.5 self-end sm:self-auto">
                  <button type="button" onclick="admin.setVmKvmMode('on')" id="btn-kvm-toggle-on" class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 bg-emerald-500 text-black shadow">
                    <i data-lucide="zap" class="w-3 h-3"></i> KVM ON
                  </button>
                  <button type="button" onclick="admin.setVmKvmMode('off')" id="btn-kvm-toggle-off" class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 text-slate-300 hover:text-white bg-white/5">
                    <i data-lucide="shield" class="w-3 h-3"></i> No-KVM (OFF)
                  </button>
                  <button type="button" onclick="admin.setVmKvmMode('auto')" id="btn-kvm-toggle-auto" class="px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 text-slate-400 hover:text-white bg-white/5">
                    Auto
                  </button>
                </div>
              </div>
            </div>

            <!-- Docker Image Selector -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Docker Image Environment</label>
              <select id="srv-docker-image" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono">
                <!-- Dynamically populated -->
              </select>
            </div>

            <!-- 4. Build Resources Limit (Memory, CPU, Disk) with Default Units & Step Fix -->
            <div class="space-y-3 pt-1">
              <label class="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span class="flex items-center gap-1.5">
                  <i data-lucide="sliders" class="w-3.5 h-3.5 text-cyan-400"></i> Resource Allocations & Limits
                </span>
                <span class="text-[10px] text-slate-400">Default or Custom Units</span>
              </label>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <!-- Memory (RAM) Card - Default GB -->
                <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5 shadow-sm">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-200 flex items-center gap-1">
                      <i data-lucide="cpu" class="w-3.5 h-3.5 text-cyan-400"></i> Memory
                    </span>
                    <!-- Unit Switcher: Default GB -->
                    <div class="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10 text-[10px] font-bold font-mono">
                      <button type="button" onclick="admin.setDeployRamUnit('GB')" id="btn-ram-unit-gb" class="px-2 py-0.5 rounded-md transition bg-cyan-500 text-black shadow font-bold">GB</button>
                      <button type="button" onclick="admin.setDeployRamUnit('MB')" id="btn-ram-unit-mb" class="px-2 py-0.5 rounded-md transition text-slate-400 hover:text-white">MB</button>
                    </div>
                  </div>

                  <div>
                    <input type="number" id="srv-create-ram-val" value="2" min="0.25" max="128" step="any" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono font-bold text-cyan-300" required oninput="admin.updateDeployResourceSummary()">
                  </div>

                  <!-- Quick Presets -->
                  <div id="ram-presets-container" class="flex flex-wrap gap-1">
                    <button type="button" onclick="admin.setDeployRamValue(1)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">1 GB</button>
                    <button type="button" onclick="admin.setDeployRamValue(2)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold transition">2 GB</button>
                    <button type="button" onclick="admin.setDeployRamValue(4)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">4 GB</button>
                    <button type="button" onclick="admin.setDeployRamValue(8)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">8 GB</button>
                  </div>
                  <div id="ram-equiv-tag" class="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-0.5">
                    <span>Allocation:</span>
                    <span class="text-cyan-400 font-bold">2048 MB</span>
                  </div>
                </div>

                <!-- CPU Limit Card - Default % -->
                <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5 shadow-sm">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-200 flex items-center gap-1">
                      <i data-lucide="activity" class="w-3.5 h-3.5 text-purple-400"></i> CPU Limit
                    </span>
                    <!-- Unit Switcher: Default % -->
                    <div class="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10 text-[10px] font-bold font-mono">
                      <button type="button" onclick="admin.setDeployCpuUnit('%')" id="btn-cpu-unit-pct" class="px-2 py-0.5 rounded-md transition bg-purple-600 text-white shadow font-bold">%</button>
                      <button type="button" onclick="admin.setDeployCpuUnit('cores')" id="btn-cpu-unit-cores" class="px-2 py-0.5 rounded-md transition text-slate-400 hover:text-white">Cores</button>
                    </div>
                  </div>

                  <div>
                    <input type="number" id="srv-create-cpu-val" value="100" min="10" max="1600" step="any" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono font-bold text-purple-300" required oninput="admin.updateDeployResourceSummary()">
                  </div>

                  <!-- Quick Presets -->
                  <div id="cpu-presets-container" class="flex flex-wrap gap-1">
                    <button type="button" onclick="admin.setDeployCpuValue(50)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">50%</button>
                    <button type="button" onclick="admin.setDeployCpuValue(100)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold transition">100%</button>
                    <button type="button" onclick="admin.setDeployCpuValue(200)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">200%</button>
                    <button type="button" onclick="admin.setDeployCpuValue(400)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">400%</button>
                  </div>
                  <div id="cpu-equiv-tag" class="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-0.5">
                    <span>Allocation:</span>
                    <span class="text-purple-400 font-bold">1.0 Core</span>
                  </div>
                </div>

                <!-- Disk Limit Card - Default GB -->
                <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-2.5 shadow-sm">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-200 flex items-center gap-1">
                      <i data-lucide="hard-drive" class="w-3.5 h-3.5 text-indigo-400"></i> Disk Limit
                    </span>
                    <!-- Unit Switcher: Default GB -->
                    <div class="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10 text-[10px] font-bold font-mono">
                      <button type="button" onclick="admin.setDeployDiskUnit('GB')" id="btn-disk-unit-gb" class="px-2 py-0.5 rounded-md transition bg-indigo-600 text-white shadow font-bold">GB</button>
                      <button type="button" onclick="admin.setDeployDiskUnit('MB')" id="btn-disk-unit-mb" class="px-2 py-0.5 rounded-md transition text-slate-400 hover:text-white">MB</button>
                    </div>
                  </div>

                  <div>
                    <input type="number" id="srv-create-disk-val" value="10" min="0.5" max="500" step="any" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono font-bold text-indigo-300" required oninput="admin.updateDeployResourceSummary()">
                  </div>

                  <!-- Quick Presets -->
                  <div id="disk-presets-container" class="flex flex-wrap gap-1">
                    <button type="button" onclick="admin.setDeployDiskValue(5)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">5 GB</button>
                    <button type="button" onclick="admin.setDeployDiskValue(10)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold transition">10 GB</button>
                    <button type="button" onclick="admin.setDeployDiskValue(25)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">25 GB</button>
                    <button type="button" onclick="admin.setDeployDiskValue(50)" class="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition">50 GB</button>
                  </div>
                  <div id="disk-equiv-tag" class="text-[10px] font-mono text-slate-400 flex items-center justify-between pt-0.5">
                    <span>Allocation:</span>
                    <span class="text-indigo-400 font-bold">10240 MB</span>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" class="btn-cyber w-full py-3 rounded-2xl text-xs font-bold shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-2">
              <i data-lucide="check" class="w-4 h-4"></i> Deploy Server
            </button>
          </form>
        </div>
      </div>
    `;

    this.populateDockerImages('minecraft');
    this.initDeployVersionChanger();
    if (window.lucide) lucide.createIcons();
  }

  initDeployVersionChanger() {
    this.deployVersions = [];
    this.deployVerFilter = '';
    this.deploySortOrder = 'desc';
    this.selectDeployEngine('paper', true);
  }

  async selectDeployEngine(typeId, fetchVersions = true) {
    const hiddenType = document.getElementById('mc-jar-type');
    if (hiddenType) hiddenType.value = typeId;

    document.querySelectorAll('.deploy-engine-card').forEach(card => {
      const isThis = card.getAttribute('data-type') === typeId;
      if (isThis) {
        card.className = 'deploy-engine-card group relative p-3 rounded-xl border border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400 cursor-pointer transition';
        const checkBadge = card.querySelector('.deploy-card-check');
        if (checkBadge) checkBadge.classList.remove('hidden');
      } else {
        card.className = 'deploy-engine-card group relative p-3 rounded-xl border border-white/10 glass-card hover:border-cyan-500/40 hover:bg-white/5 cursor-pointer transition';
        const checkBadge = card.querySelector('.deploy-card-check');
        if (checkBadge) checkBadge.classList.add('hidden');
      }
    });

    if (fetchVersions) {
      await this.onMcTypeChange(typeId);
    }
  }

  renderDeployQuickVersionPills() {
    const container = document.getElementById('deploy-quick-versions-container');
    if (!container) return;

    let list = (this.deployVersions || []).map(v => typeof v === 'object' ? v.version : v);
    if (list.length === 0) {
      list = ['1.21.4', '1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.7.10'];
    }

    if (this.deployVerFilter) {
      const q = this.deployVerFilter.toLowerCase();
      list = list.filter(v => v.toLowerCase().includes(q));
    }

    if (this.deploySortOrder === 'asc') {
      list = [...list].reverse();
    }

    if (list.length === 0) {
      container.innerHTML = `<span class="text-[11px] text-slate-500 py-1">No versions matching "${this.deployVerFilter}"</span>`;
      return;
    }

    const currentVer = document.getElementById('mc-jar-version')?.value || '1.21.4';

    container.innerHTML = list.map(v => {
      const isSelected = currentVer === v;
      return `
        <button type="button" onclick="admin.quickPickDeployVersion('${v}')" data-ver="${v}" class="deploy-ver-pill px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition ${isSelected ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/30 ring-1 ring-cyan-300' : 'bg-slate-800/80 hover:bg-slate-700 hover:text-cyan-300 text-slate-300 border border-white/5'}">
          ${v}
        </button>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  filterDeployQuickVersions(filter) {
    this.deployVerFilter = (filter || '').trim();
    this.renderDeployQuickVersionPills();
  }

  toggleDeploySortOrder() {
    this.deploySortOrder = this.deploySortOrder === 'desc' ? 'asc' : 'desc';
    const btn = document.getElementById('deploy-sort-btn');
    if (btn) {
      btn.innerHTML = `<i data-lucide="arrow-down-up" class="w-2.5 h-2.5"></i> ${this.deploySortOrder === 'asc' ? 'A-Z' : 'Latest'}`;
      if (window.lucide) lucide.createIcons();
    }
    this.renderDeployQuickVersionPills();
  }

  quickPickDeployVersion(ver) {
    const sel = document.getElementById('mc-jar-version');
    if (sel) {
      let found = false;
      for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === ver) {
          sel.selectedIndex = i;
          found = true;
          break;
        }
      }
      if (!found) {
        const opt = document.createElement('option');
        opt.value = ver;
        opt.innerText = ver;
        opt.selected = true;
        sel.appendChild(opt);
      }
      this.onDeployVersionChange(ver);
    }
    this.renderDeployQuickVersionPills();
  }

  onDeployVersionChange(version) {
    this.autoMatchDeployJava(version);
    this.renderDeployQuickVersionPills();
    // Update description if in auto mode
    const tag = document.getElementById('srv-desc-mode-tag');
    if (tag && tag.innerText === 'Default Auto') {
      const typeInput = document.querySelector('input[name="create_srv_type"]:checked');
      const type = typeInput ? typeInput.value : 'minecraft';
      const engine = document.getElementById('mc-jar-type')?.value || 'Paper';
      const descInput = document.getElementById('srv-create-desc');
      if (descInput) descInput.value = this.generateServerDesc(type, engine, version);
    }
  }

  autoMatchDeployJava(version) {
    if (!version) return;
    const match = version.match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
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

    const javaSelect = document.getElementById('srv-docker-image');
    if (javaSelect) {
      javaSelect.value = targetJava;
    }

    const tag = document.getElementById('deploy-java-tag');
    if (tag) {
      const label = targetJava.includes('java_26') ? 'Java 26' :
                    targetJava.includes('java_21') ? 'Java 21' :
                    targetJava.includes('java_17') ? 'Java 17' :
                    targetJava.includes('java_8')  ? 'Java 8'  :
                    targetJava.includes('java_25') ? 'Java 25' :
                    targetJava.includes('java_16') ? 'Java 16' : 'Java';
      tag.innerHTML = `<i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-400"></i> <span class="text-emerald-400 font-semibold">Auto-matched ${label}</span>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  async onMcTypeChange(type) {
    const sel = document.getElementById('mc-jar-version');
    const countTag = document.getElementById('deploy-version-count');
    if (countTag) countTag.innerText = 'Loading...';

    try {
      const data = await app.api(`/api/mcjars/types/${type}/versions`);
      if (sel && data.versions && data.versions.length > 0) {
        this.deployVersions = data.versions;
        if (countTag) countTag.innerText = `${data.versions.length} versions`;
        sel.innerHTML = data.versions.map(v => `<option value="${v.version}">${v.version} ${v.version === '1.21.4' ? '(Latest Stable)' : ''}</option>`).join('');
        const firstVer = data.versions[0].version;
        sel.value = firstVer;
        this.onDeployVersionChange(firstVer);
      }
    } catch (e) {
      if (countTag) countTag.innerText = 'Default versions';
      const fallbacks = ['1.21.4', '1.20.4', '1.19.4', '1.18.2', '1.16.5', '1.12.2', '1.8.8', '1.7.10'];
      this.deployVersions = fallbacks.map(v => ({ version: v }));
      if (sel) {
        sel.innerHTML = fallbacks.map(v => `<option value="${v}">${v}</option>`).join('');
        this.onDeployVersionChange('1.21.4');
      }
    }
    this.renderDeployQuickVersionPills();
  }

  populateDockerImages(type) {
    const select = document.getElementById('srv-docker-image');
    if (!select) return;

    const mcImages = [
      { label: 'Java 26 (ghcr.io/pterodactyl/yolks:java_26)', value: 'ghcr.io/pterodactyl/yolks:java_26' },
      { label: 'Java 25 (ghcr.io/pterodactyl/yolks:java_25)', value: 'ghcr.io/pterodactyl/yolks:java_25' },
      { label: 'Java 21 (ghcr.io/pterodactyl/yolks:java_21)', value: 'ghcr.io/pterodactyl/yolks:java_21' },
      { label: 'Java 17 (ghcr.io/pterodactyl/yolks:java_17)', value: 'ghcr.io/pterodactyl/yolks:java_17' },
      { label: 'Java 8 (ghcr.io/pterodactyl/yolks:java_8)', value: 'ghcr.io/pterodactyl/yolks:java_8' },
      { label: 'Java 16 (ghcr.io/pterodactyl/yolks:java_16)', value: 'ghcr.io/pterodactyl/yolks:java_16' },
      { label: 'Java 11 (ghcr.io/pterodactyl/yolks:java_11)', value: 'ghcr.io/pterodactyl/yolks:java_11' }
    ];

    const nodeImages = [
      { label: 'Nodejs 25 (ghcr.io/ptero-eggs/yolks:nodejs_25)', value: 'ghcr.io/ptero-eggs/yolks:nodejs_25' },
      { label: 'Nodejs 24 (ghcr.io/ptero-eggs/yolks:nodejs_24)', value: 'ghcr.io/ptero-eggs/yolks:nodejs_24' },
      { label: 'Nodejs 22 (ghcr.io/ptero-eggs/yolks:nodejs_22)', value: 'ghcr.io/ptero-eggs/yolks:nodejs_22' },
      { label: 'Nodejs 20 (ghcr.io/ptero-eggs/yolks:nodejs_20)', value: 'ghcr.io/ptero-eggs/yolks:nodejs_20' },
      { label: 'Nodejs 18 (ghcr.io/ptero-eggs/yolks:nodejs_18)', value: 'ghcr.io/ptero-eggs/yolks:nodejs_18' },
      { label: 'Nodejs 16 (ghcr.io/ptero-eggs/yolks:nodejs_16)', value: 'ghcr.io/ptero-eggs/yolks:nodejs_16' }
    ];

    const pyImages = [
      { label: 'Python 3.13 (ghcr.io/ptero-eggs/yolks:python_3.13)', value: 'ghcr.io/ptero-eggs/yolks:python_3.13' },
      { label: 'Python 3.12 (ghcr.io/ptero-eggs/yolks:python_3.12)', value: 'ghcr.io/ptero-eggs/yolks:python_3.12' },
      { label: 'Python 3.11 (ghcr.io/ptero-eggs/yolks:python_3.11)', value: 'ghcr.io/ptero-eggs/yolks:python_3.11' },
      { label: 'Python 3.10 (ghcr.io/ptero-eggs/yolks:python_3.10)', value: 'ghcr.io/ptero-eggs/yolks:python_3.10' },
      { label: 'Python 3.8 (ghcr.io/ptero-eggs/yolks:python_3.8)', value: 'ghcr.io/ptero-eggs/yolks:python_3.8' },
      { label: 'Python 2.7 (ghcr.io/ptero-eggs/yolks:python_2.7)', value: 'ghcr.io/ptero-eggs/yolks:python_2.7' }
    ];

    const vmImages = [
      { label: 'Debian 12 (Ready to use, Recommended)', value: 'ghcr.io/sosuku325/aerovm:guest-debian-12' },
      { label: 'Ubuntu 24.04 LTS (Ready to use)', value: 'ghcr.io/sosuku325/aerovm:guest-ubuntu-24.04' },
      { label: 'Ubuntu 22.04 LTS (Ready to use)', value: 'ghcr.io/sosuku325/aerovm:guest-ubuntu-22.04' },
      { label: 'Ubuntu 20.04 LTS (Ready to use)', value: 'ghcr.io/sosuku325/aerovm:guest-ubuntu-20.04' },
      { label: 'Debian 13 (Ready to use)', value: 'ghcr.io/sosuku325/aerovm:guest-debian-13' },
      { label: 'Debian 11 (Ready to use)', value: 'ghcr.io/sosuku325/aerovm:guest-debian-11' },
      { label: 'Debian 10 (Ready to use)', value: 'ghcr.io/sosuku325/aerovm:guest-debian-10' },
      { label: 'Kali Linux (Ready to use)', value: 'ghcr.io/sosuku325/aerovm:guest-kali' },
      { label: 'Fedora 40 (Ready to use)', value: 'ghcr.io/sosuku325/aerovm:guest-fedora' },
      { label: 'Arch Linux (Ready to use)', value: 'ghcr.io/sosuku325/aerovm:guest-arch' },
      { label: 'Rocky Linux (Ready to use)', value: 'ghcr.io/sosuku325/aerovm:guest-rockylinux' },
      { label: 'Alma Linux (Ready to use)', value: 'ghcr.io/sosuku325/aerovm:guest-almalinux' },
      { label: 'Debian 12 Desktop (GUI Preinstalled)', value: 'ghcr.io/sosuku325/aerovm:guest-debian-12-desktop' },
      { label: 'Ubuntu 24.04 Desktop (GUI Preinstalled)', value: 'ghcr.io/sosuku325/aerovm:guest-ubuntu-24.04-desktop' },
      { label: 'Alpine (Blank Disk / Custom ISO / Windows)', value: 'ghcr.io/sosuku325/aerovm:alpine' },
      { label: 'Shell (Debug / Rescue Mode)', value: 'ghcr.io/sosuku325/aerovm:shell' }
    ];

    const map = { minecraft: mcImages, nodejs: nodeImages, python: pyImages, lumenvm: vmImages, vm: vmImages, nokvm: vmImages, lumenvm_nokvm: vmImages };
    const list = map[type] || mcImages;

    select.innerHTML = list.map(item => `
      <option value="${item.value}">${item.label}</option>
    `).join('');
  }

  onServerTypeChange(type) {
    const mcBox = document.getElementById('mcjars-config-box');
    const vmBox = document.getElementById('lumenvm-config-box');
    if (mcBox) {
      if (type === 'minecraft') mcBox.classList.remove('hidden');
      else mcBox.classList.add('hidden');
    }
    if (vmBox) {
      if (type === 'lumenvm' || type === 'vm' || type === 'nokvm' || type === 'lumenvm_nokvm') {
        vmBox.classList.remove('hidden');
        if (type === 'nokvm' || type === 'lumenvm_nokvm') {
          this.setVmKvmMode('off');
        } else if (type === 'lumenvm' || type === 'vm') {
          this.setVmKvmMode('on');
        }
      } else {
        vmBox.classList.add('hidden');
      }
    }
    this.populateDockerImages(type);
    if (type === 'minecraft') {
      const verSel = document.getElementById('mc-jar-version');
      this.autoMatchDeployJava(verSel?.value || '1.21.4');
    }

    // If name and description are still in Auto mode, regenerate them
    const nameTag = document.getElementById('srv-name-mode-tag');
    if (nameTag && nameTag.innerText === 'Default Auto') {
      const nameInput = document.getElementById('srv-create-name');
      if (nameInput) nameInput.value = this.generateServerName(type);
    }
    const descTag = document.getElementById('srv-desc-mode-tag');
    if (descTag && descTag.innerText === 'Default Auto') {
      const descInput = document.getElementById('srv-create-desc');
      if (descInput) descInput.value = this.generateServerDesc(type);
    }
  }

  setVmKvmMode(val) {
    const select = document.getElementById('vm-kvm-mode');
    if (select) select.value = val;
    this.onVmKvmModeChange(val);
  }

  onVmKvmModeChange(val) {
    const badge = document.getElementById('vm-kvm-badge');
    const statusText = document.getElementById('vm-kvm-status-text');
    const btnOn = document.getElementById('btn-kvm-toggle-on');
    const btnOff = document.getElementById('btn-kvm-toggle-off');
    const btnAuto = document.getElementById('btn-kvm-toggle-auto');

    const resetBtn = (btn) => {
      if (!btn) return;
      btn.className = 'px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 text-slate-300 hover:text-white bg-white/5';
    };
    resetBtn(btnOn);
    resetBtn(btnOff);
    resetBtn(btnAuto);

    if (val === 'off') {
      if (badge) {
        badge.textContent = 'NO-KVM (OFF)';
        badge.className = 'text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
      }
      if (statusText) {
        statusText.innerHTML = 'Hardware Virtualization: <strong class="text-amber-400">No-KVM / OFF (Software Emulation - Runs anywhere)</strong>';
      }
      if (btnOff) {
        btnOff.className = 'px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 bg-amber-500 text-black shadow font-black';
      }
    } else if (val === 'auto') {
      if (badge) {
        badge.textContent = 'AUTO';
        badge.className = 'text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30';
      }
      if (statusText) {
        statusText.innerHTML = 'Hardware Virtualization: <strong class="text-blue-400">AUTO (Detects /dev/kvm support)</strong>';
      }
      if (btnAuto) {
        btnAuto.className = 'px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 bg-blue-500 text-white shadow font-black';
      }
    } else {
      if (badge) {
        badge.textContent = 'KVM ON';
        badge.className = 'text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      }
      if (statusText) {
        statusText.innerHTML = 'Hardware Virtualization: <strong class="text-emerald-400">KVM ON (Hardware Accelerated)</strong>';
      }
      if (btnOn) {
        btnOn.className = 'px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 bg-emerald-500 text-black shadow font-black';
      }
    }
    if (window.lucide) lucide.createIcons();
  }

  async handleCreateServer(e) {
    e.preventDefault();
    if (!app.user || app.user.role !== 'admin') {
      app.toast('Only administrators can deploy new servers.', 'error');
      return;
    }
    const typeInput = document.querySelector('input[name="create_srv_type"]:checked');
    const server_type = typeInput ? typeInput.value : 'minecraft';
    const name = document.getElementById('srv-create-name').value.trim();
    const description = document.getElementById('srv-create-desc').value.trim();
    const docker_image = document.getElementById('srv-docker-image').value;

    // Convert values based on active unit (Memory: default GB, CPU: default %, Disk: default GB)
    const ramVal = parseFloat(document.getElementById('srv-create-ram-val')?.value) || 2;
    const memory_mb = (this.deployRamUnit === 'GB') ? Math.round(ramVal * 1024) : Math.round(ramVal);

    const cpuVal = parseFloat(document.getElementById('srv-create-cpu-val')?.value) || 100;
    const cpu_limit = (this.deployCpuUnit === 'cores') ? Math.round(cpuVal * 100) : Math.round(cpuVal);

    const diskVal = parseFloat(document.getElementById('srv-create-disk-val')?.value) || 10;
    const disk_mb = (this.deployDiskUnit === 'GB') ? Math.round(diskVal * 1024) : Math.round(diskVal);

    // User Access / Server Access assignment
    const userSelect = document.getElementById('srv-create-user-id');
    const user_id = userSelect ? parseInt(userSelect.value, 10) : undefined;

    let mc_jar_type = null;
    let mc_jar_version = null;
    let env_vars = {};
    if (server_type === 'minecraft') {
      mc_jar_type = document.getElementById('mc-jar-type')?.value;
      mc_jar_version = document.getElementById('mc-jar-version')?.value;
    } else if (server_type === 'lumenvm' || server_type === 'vm' || server_type === 'nokvm' || server_type === 'lumenvm_nokvm') {
      const kvmVal = document.getElementById('vm-kvm-mode')?.value || (server_type.includes('nokvm') ? 'off' : 'on');
      const isNokvm = server_type.includes('nokvm') || kvmVal === 'off';
      env_vars = {
        OS_HOSTNAME: document.getElementById('vm-hostname')?.value.trim() || 'lumenvm',
        OS_PASSWORD: document.getElementById('vm-password')?.value || 'admin123',
        DISPLAY_MODE: document.getElementById('vm-display-mode')?.value || 'ssh',
        KVM: kvmVal,
        NOKVM: isNokvm ? '1' : '0',
        VM_RAM_MB: 'auto',
        VM_DISK_GB: 'auto',
        IPV4_MODE: 'open',
        PACKAGE_UPDATE: '0',
        UEFI: '0'
      };
    }

    try {
      app.toast('Deploying server container...', 'info');
      const data = await app.api('/api/servers', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          server_type,
          docker_image,
          memory_mb,
          cpu_limit,
          disk_mb,
          user_id,
          mc_jar_type,
          mc_jar_version,
          env_vars
        })
      });

      if (data.success) {
        document.getElementById('modal-container').innerHTML = '';
        app.toast('Server deployed successfully!', 'success');
        app.navigate(`server-manage/${data.serverId}/console`);
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  setUserViewMode(mode) {
    this.userViewMode = mode;
    localStorage.setItem('mpanel_user_view_mode', mode);
    this.renderUsersView();
  }

  // 3. User & Team Management View
  async renderUsersView() {
    this.userViewMode = this.userViewMode || localStorage.getItem('mpanel_user_view_mode') || 'card';
    const isCard = this.userViewMode === 'card';
    const container = document.getElementById('view-container');

    container.innerHTML = `
      <div class="space-y-6 pb-12">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5">
          <div>
            <span class="text-xs font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">Management</span>
            <h2 class="text-xl sm:text-2xl font-black text-white mt-2 flex items-center gap-2.5">
              <i data-lucide="users" class="w-6 h-6 text-purple-400"></i> User & Team Management
            </h2>
            <p class="text-xs text-slate-400 mt-1 font-medium">Manage user accounts, resource allocations, auto-suspension states, and server access</p>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <!-- Card / List segmented switcher (Default: card) -->
            <div class="flex items-center bg-slate-900/90 p-1 rounded-xl border border-white/10 shadow-inner">
              <button onclick="admin.setUserViewMode('card')" class="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${isCard ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}">
                <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i> Cards
              </button>
              <button onclick="admin.setUserViewMode('list')" class="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${!isCard ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}">
                <i data-lucide="list" class="w-3.5 h-3.5"></i> List
              </button>
            </div>

            <button onclick="admin.renderUsersView()" class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 transition" title="Refresh">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>
            <button onclick="admin.showCreateUserModal()" class="btn-cyber-purple px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg">
              <i data-lucide="user-plus" class="w-4 h-4"></i> + Create User
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between px-1">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <i data-lucide="${isCard ? 'layout-grid' : 'list'}" class="w-4 h-4"></i>
            </div>
            <h3 class="text-base font-bold text-white tracking-wide">Users & Accounts</h3>
            <span id="adm-users-mgmt-count-badge" class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">Loading...</span>
          </div>
        </div>

        <!-- View Content (Cards or List) -->
        <div id="adm-users-view-target">
          <div class="py-16 text-center text-slate-500">
            <i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400"></i>
            <span>Loading user profiles and resource metrics...</span>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    try {
      const [usersRes, serversRes] = await Promise.all([
        app.api('/api/admin/users'),
        app.api('/api/servers')
      ]);

      const users = usersRes.users || [];
      const servers = serversRes.servers || [];

      const countBadge = document.getElementById('adm-users-mgmt-count-badge');
      if (countBadge) countBadge.innerText = `${users.length} ${users.length === 1 ? 'User' : 'Users'}`;

      const userServersMap = {};
      servers.forEach(s => {
        const uid = s.user_id;
        if (!userServersMap[uid]) userServersMap[uid] = [];
        userServersMap[uid].push(s);
      });

      const target = document.getElementById('adm-users-view-target');
      if (!target) return;

      if (users.length === 0) {
        target.innerHTML = `
          <div class="glass-panel p-12 text-center rounded-3xl border border-white/10 max-w-md mx-auto space-y-3 shadow-xl">
            <i data-lucide="users" class="w-12 h-12 mx-auto text-purple-400/50"></i>
            <h3 class="text-base font-bold text-white">No Users Found</h3>
            <p class="text-xs text-slate-400">There are currently no additional user accounts registered in this panel.</p>
            <button onclick="admin.showCreateUserModal()" class="btn-cyber-purple px-4 py-2 rounded-xl text-xs font-bold">+ Create User</button>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      if (isCard) {
        // Render Card Grid View (Default)
        target.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            ${users.map(u => {
              const userServers = userServersMap[u.id] || [];
              const isAdm = u.role === 'admin';
              const isSuspended = !!u.suspended;
              const ramFmt = (u.total_memory_mb >= 1024 ? (u.total_memory_mb / 1024).toFixed(1) + ' GiB' : (u.total_memory_mb || 0) + ' MB');
              const diskFmt = (u.total_disk_mb >= 1024 ? (u.total_disk_mb / 1024).toFixed(1) + ' GiB' : (u.total_disk_mb || 0) + ' MB');
              const cpuFmt = (u.total_cpu_limit || 0) + '%';

              // Auto-suspend & Expiration status pill
              let autoSuspendStatusHTML = '';
              if (isSuspended) {
                autoSuspendStatusHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>ACCOUNT SUSPENDED</span>`;
              } else if (u.suspended_server_count > 0) {
                autoSuspendStatusHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>${u.suspended_server_count} Auto-Suspended</span>`;
              } else if (u.expiring_soon_count > 0) {
                autoSuspendStatusHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>${u.expiring_soon_count} Expiring Soon</span>`;
              } else {
                autoSuspendStatusHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Auto-Suspend Active</span>`;
              }

              return `
                <div class="glass-panel p-5 rounded-3xl border border-white/10 hover:border-purple-500/30 transition shadow-xl space-y-4 flex flex-col justify-between group">
                  <div class="space-y-4">
                    <!-- 1. User Profile Section -->
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="w-11 h-11 rounded-2xl ${isAdm ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'} flex items-center justify-center font-black text-base uppercase shrink-0 shadow-inner">
                          ${(u.username || 'U').substring(0, 1)}
                        </div>
                        <div class="min-w-0">
                          <h4 class="text-sm font-bold text-white truncate group-hover:text-purple-300 transition">${app.escapeHtml(u.username)}</h4>
                          <div class="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                            <span class="text-slate-500">UID #${u.id}</span>
                            <span>•</span>
                            <span class="truncate max-w-[130px]">${app.escapeHtml(u.email)}</span>
                            <button onclick="navigator.clipboard.writeText('${app.escapeHtml(u.email)}'); app.toast('Copied email', 'info');" class="text-slate-500 hover:text-purple-400" title="Copy Email">
                              <i data-lucide="copy" class="w-2.5 h-2.5"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono ${isAdm ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-800 text-slate-300 border border-white/10'} shrink-0">
                        ${isAdm ? 'ADMIN' : 'CLIENT'}
                      </span>
                    </div>

                    <!-- Permissions & State Badges -->
                    <div class="flex flex-wrap items-center gap-1.5 pt-1">
                      ${u.two_factor_enabled
                        ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">2FA Active</span>'
                        : '<span class="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-500 border border-white/5">No 2FA</span>'}
                      ${autoSuspendStatusHTML}
                    </div>

                    <!-- 2. Resources limit = me auto suspend Resources -->
                    <div class="p-3.5 rounded-2xl bg-slate-900/70 border border-white/5 space-y-2.5">
                      <div class="flex items-center justify-between text-[11px] font-semibold">
                        <span class="text-slate-400 flex items-center gap-1.5">
                          <i data-lucide="activity" class="w-3.5 h-3.5 text-purple-400"></i> Resources Limit
                        </span>
                        <span class="text-[10px] font-mono text-purple-300">${userServers.length} Servers</span>
                      </div>
                      <div class="grid grid-cols-3 gap-2 text-center">
                        <div class="p-2 rounded-xl bg-black/30 border border-white/5">
                          <span class="text-[9px] uppercase font-bold text-slate-500 block">RAM</span>
                          <span class="text-xs font-mono font-bold text-cyan-300">${ramFmt}</span>
                        </div>
                        <div class="p-2 rounded-xl bg-black/30 border border-white/5">
                          <span class="text-[9px] uppercase font-bold text-slate-500 block">CPU</span>
                          <span class="text-xs font-mono font-bold text-purple-300">${cpuFmt}</span>
                        </div>
                        <div class="p-2 rounded-xl bg-black/30 border border-white/5">
                          <span class="text-[9px] uppercase font-bold text-slate-500 block">DISK</span>
                          <span class="text-xs font-mono font-bold text-indigo-300">${diskFmt}</span>
                        </div>
                      </div>
                    </div>

                    <!-- 3. Server Access Section -->
                    <div class="space-y-1.5">
                      <div class="flex items-center justify-between text-[11px]">
                        <span class="font-bold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                          <i data-lucide="server" class="w-3 h-3 text-cyan-400"></i> Server Access
                        </span>
                        <button onclick="admin.showUserServerAccessModal(${u.id}, '${app.escapeHtml(u.username)}')" class="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition">
                          Manage Access &rarr;
                        </button>
                      </div>
                      ${userServers.length === 0 ? `
                        <div class="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-500 flex items-center justify-between">
                          <span>0 servers assigned</span>
                          <button onclick="admin.showUserServerAccessModal(${u.id}, '${app.escapeHtml(u.username)}')" class="text-[10px] font-semibold text-purple-400 hover:underline">+ Assign</button>
                        </div>
                      ` : `
                        <div class="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                          ${userServers.map(s => `
                            <button onclick="app.navigate('server-manage/${s.id}/console')" class="px-2 py-1 rounded-lg text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition inline-flex items-center gap-1.5" title="Open Console: ${app.escapeHtml(s.name)}">
                              <i data-lucide="box" class="w-2.5 h-2.5 text-cyan-400"></i>
                              <span class="truncate max-w-[120px]">${app.escapeHtml(s.name)}</span>
                            </button>
                          `).join('')}
                        </div>
                      `}
                    </div>
                  </div>

                  <!-- 4. Actions Toolbar (User List == Create User, User delete, Edit User, Suspended User, Server Access) -->
                  <div class="pt-3 border-t border-white/10 flex items-center justify-between gap-1.5">
                    <div class="flex items-center gap-1">
                      <button onclick="admin.showEditUserModal(${u.id})" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center gap-1 transition" title="Edit User">
                        <i data-lucide="edit-3" class="w-3 h-3 text-purple-400"></i> Edit User
                      </button>
                      <button onclick="admin.showUserServerAccessModal(${u.id}, '${app.escapeHtml(u.username)}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-white/10 transition" title="Server Access">
                        <i data-lucide="hard-drive" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="admin.showResetPasswordModal(${u.id}, '${app.escapeHtml(u.username)}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-white/10 transition" title="Reset Password">
                        <i data-lucide="key" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                    <div class="flex items-center gap-1">
                      <button onclick="admin.toggleSuspendUser(${u.id})" class="p-1.5 rounded-lg border transition ${isSuspended ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 hover:bg-amber-950 text-slate-400 hover:text-amber-400 border-white/10'}" title="${isSuspended ? 'Unsuspend User' : 'Suspend User'}">
                        <i data-lucide="${isSuspended ? 'check' : 'slash'}" class="w-3.5 h-3.5"></i>
                      </button>
                      <button onclick="admin.deleteUser(${u.id})" class="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20 transition" title="User Delete">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else {
        // Render List / Table View
        target.innerHTML = `
          <div class="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-300">
                <thead class="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                  <tr>
                    <th class="px-4 py-3">User Profile</th>
                    <th class="px-4 py-3">Resources Limit</th>
                    <th class="px-4 py-3">Server Access</th>
                    <th class="px-4 py-3">Permissions</th>
                    <th class="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  ${users.map(u => {
                    const userServers = userServersMap[u.id] || [];
                    const isAdm = u.role === 'admin';
                    const isSuspended = !!u.suspended;
                    const ramFmt = (u.total_memory_mb >= 1024 ? (u.total_memory_mb / 1024).toFixed(1) + ' GiB' : (u.total_memory_mb || 0) + ' MB');
                    const diskFmt = (u.total_disk_mb >= 1024 ? (u.total_disk_mb / 1024).toFixed(1) + ' GiB' : (u.total_disk_mb || 0) + ' MB');

                    return `
                      <tr class="hover:bg-white/5 transition-colors">
                        <!-- User Profile -->
                        <td class="px-4 py-3">
                          <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-full ${isAdm ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'} flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              ${(u.username || 'U').substring(0, 1)}
                            </div>
                            <div class="min-w-0">
                              <span class="font-bold text-white block text-xs truncate">${app.escapeHtml(u.username)}</span>
                              <div class="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                                <span>UID #${u.id}</span>
                                <span>•</span>
                                <span class="truncate max-w-[130px]">${app.escapeHtml(u.email)}</span>
                                <button onclick="navigator.clipboard.writeText('${app.escapeHtml(u.email)}'); app.toast('Copied email', 'info');" class="text-slate-500 hover:text-purple-400">
                                  <i data-lucide="copy" class="w-2.5 h-2.5"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        <!-- Resources Limit & Auto Suspend -->
                        <td class="px-4 py-3 font-mono">
                          <div class="space-y-0.5 text-[11px]">
                            <div class="text-cyan-300 font-bold">${ramFmt} RAM • ${u.total_cpu_limit || 0}% CPU</div>
                            <div class="text-[10px] text-slate-400 flex items-center gap-1.5">
                              <span>${diskFmt} Disk</span>
                              ${u.suspended_server_count > 0 ? `<span class="px-1 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold">${u.suspended_server_count} Suspended</span>` : ''}
                            </div>
                          </div>
                        </td>

                        <!-- Server Access -->
                        <td class="px-4 py-3">
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              ${userServers.length} Servers
                            </span>
                            <button onclick="admin.showUserServerAccessModal(${u.id}, '${app.escapeHtml(u.username)}')" class="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 transition">
                              Manage
                            </button>
                          </div>
                        </td>

                        <!-- Permissions -->
                        <td class="px-4 py-3">
                          <div class="flex flex-wrap items-center gap-1.5">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono ${isAdm ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-800 text-slate-300 border border-white/10'}">
                              ${isAdm ? 'ADMIN' : 'CLIENT'}
                            </span>
                            ${u.two_factor_enabled ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">2FA</span>' : ''}
                            ${isSuspended
                              ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">SUSPENDED</span>'
                              : '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400">ACTIVE</span>'}
                          </div>
                        </td>

                        <!-- Actions -->
                        <td class="px-4 py-3 text-right whitespace-nowrap">
                          <div class="flex items-center justify-end gap-1.5">
                            <button onclick="admin.showEditUserModal(${u.id})" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-400 border border-white/10 transition" title="Edit User">
                              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="admin.showUserServerAccessModal(${u.id}, '${app.escapeHtml(u.username)}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-white/10 transition" title="Server Access">
                              <i data-lucide="hard-drive" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="admin.toggleSuspendUser(${u.id})" class="p-1.5 rounded-lg border transition ${isSuspended ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 hover:bg-amber-950 text-slate-400 hover:text-amber-400 border-white/10'}" title="${isSuspended ? 'Unsuspend User' : 'Suspend User'}">
                              <i data-lucide="${isSuspended ? 'check' : 'slash'}" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="admin.showResetPasswordModal(${u.id}, '${app.escapeHtml(u.username)}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-white/10 transition" title="Reset Password">
                              <i data-lucide="key" class="w-3.5 h-3.5"></i>
                            </button>
                            <button onclick="admin.deleteUser(${u.id})" class="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20 transition" title="Delete User">
                              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
    } catch (e) {
      console.error('Error rendering users view:', e);
      app.toast('Failed to load user management: ' + e.message, 'error');
    }

    if (window.lucide) lucide.createIcons();
  }

  async showEditUserModal(userId) {
    const modalContainer = document.getElementById('modal-container');
    try {
      const data = await app.api(`/api/admin/users/${userId}`);
      const u = data.user;
      modalContainer.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div class="glass-panel w-full max-w-lg p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
            <div class="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <i data-lucide="edit-3" class="w-5 h-5 text-purple-400"></i> Edit User: ${app.escapeHtml(u.username)}
              </h3>
              <button onclick="document.getElementById('modal-container').innerHTML=''" class="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>

            <form onsubmit="admin.handleEditUser(event, ${u.id})" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                <input type="text" id="edit-user-name" value="${app.escapeHtml(u.username)}" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input type="email" id="edit-user-email" value="${app.escapeHtml(u.email)}" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Role Permissions</label>
                  <select id="edit-user-role" class="w-full glass-input px-3 py-2 rounded-xl text-xs">
                    <option value="user" ${u.role === 'user' ? 'selected' : ''}>Standard User</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrator</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Account State</label>
                  <select id="edit-user-suspended" class="w-full glass-input px-3 py-2 rounded-xl text-xs">
                    <option value="0" ${!u.suspended ? 'selected' : ''}>Active</option>
                    <option value="1" ${u.suspended ? 'selected' : ''}>Suspended</option>
                  </select>
                </div>
              </div>

              <div class="pt-2 border-t border-white/10">
                <label class="block text-xs font-semibold text-slate-300 mb-1">New Password (optional)</label>
                <input type="password" id="edit-user-pass" placeholder="Leave empty to keep current password" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs">
              </div>

              <div class="flex gap-2 pt-2">
                <button type="button" onclick="document.getElementById('modal-container').innerHTML=''" class="flex-1 py-2.5 rounded-xl text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold transition">Cancel</button>
                <button type="submit" class="btn-cyber-purple flex-1 py-2.5 rounded-xl text-xs font-bold shadow-md">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      app.toast(err.message || 'Failed to fetch user', 'error');
    }
  }

  async handleEditUser(e, userId) {
    e.preventDefault();
    const username = document.getElementById('edit-user-name').value.trim();
    const email = document.getElementById('edit-user-email').value.trim();
    const role = document.getElementById('edit-user-role').value;
    const suspended = parseInt(document.getElementById('edit-user-suspended').value, 10);
    const password = document.getElementById('edit-user-pass').value;

    const payload = { username, email, role, suspended };
    if (password && password.trim().length > 0) {
      payload.password = password.trim();
    }

    try {
      const res = await app.api(`/api/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (res.success) {
        document.getElementById('modal-container').innerHTML = '';
        app.toast('User updated successfully!', 'success');
        if (window.location.hash.includes('admin-servers')) {
          this.renderServersView();
        } else {
          this.renderUsersView();
        }
      }
    } catch (err) {
      app.toast(err.message || 'Failed to update user', 'error');
    }
  }

  async showUserServerAccessModal(userId, username) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-panel w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <div class="flex justify-between items-center border-b border-white/10 pb-3">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="hard-drive" class="w-5 h-5 text-cyan-400"></i> Server Access: ${app.escapeHtml(username)}
            </h3>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
          <p class="text-xs text-slate-400">Manage and assign server access and ownership for this user account.</p>
          <div id="user-server-access-list" class="space-y-3 py-4 text-center text-slate-500">
            <i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto text-cyan-400"></i>
            <span>Loading server assignments...</span>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      const srvRes = await app.api('/api/servers');
      const allServers = srvRes.servers || [];
      const assigned = allServers.filter(s => s.user_id === userId);
      const others = allServers.filter(s => s.user_id !== userId);

      const listContainer = document.getElementById('user-server-access-list');
      if (!listContainer) return;

      listContainer.className = "space-y-4";
      listContainer.innerHTML = `
        <!-- Assigned Servers Section -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Currently Assigned Servers (${assigned.length})
          </h4>
          ${assigned.length === 0 ? `
            <div class="p-4 rounded-xl bg-slate-900/60 border border-white/5 text-xs text-slate-500 text-center">
              No servers currently assigned to ${app.escapeHtml(username)}.
            </div>
          ` : `
            <div class="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden bg-slate-900/50">
              ${assigned.map(s => `
                <div class="p-3 flex items-center justify-between gap-3 hover:bg-white/5 transition">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <i data-lucide="box" class="w-3.5 h-3.5"></i>
                    </div>
                    <div class="min-w-0">
                      <div class="font-bold text-white text-xs truncate">${app.escapeHtml(s.name)}</div>
                      <div class="text-[10px] font-mono text-slate-400">${s.ip || '127.0.0.1'}:${s.port || 25565} • ${s.memory_mb} MB RAM</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <button onclick="app.navigate('server-manage/${s.id}/console'); document.getElementById('modal-container').innerHTML='';" class="btn-cyber px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1">
                      <i data-lucide="terminal" class="w-3 h-3"></i> Console
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Available to Assign Section -->
        ${others.length > 0 ? `
          <div class="space-y-2 pt-3 border-t border-white/10">
            <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-cyan-400"></span> Other Deployed Servers (${others.length})
            </h4>
            <div class="max-h-60 overflow-y-auto divide-y divide-white/5 border border-white/10 rounded-2xl bg-slate-900/50">
              ${others.map(s => `
                <div class="p-3 flex items-center justify-between gap-3 hover:bg-white/5 transition">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-7 h-7 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 shrink-0">
                      <i data-lucide="box" class="w-3.5 h-3.5"></i>
                    </div>
                    <div class="min-w-0">
                      <div class="font-bold text-slate-200 text-xs truncate">${app.escapeHtml(s.name)}</div>
                      <div class="text-[10px] font-mono text-slate-500">Owner: ${app.escapeHtml(s.owner_username || 'None')} • #${s.id}</div>
                    </div>
                  </div>
                  <button onclick="admin.handleTransferServer(${s.id}, ${userId}, '${app.escapeHtml(username)}')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition shrink-0">
                    + Assign to ${app.escapeHtml(username)}
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      `;
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      app.toast(err.message || 'Failed to load servers', 'error');
    }
  }

  async handleTransferServer(serverId, newUserId, username) {
    if (!confirm(`Assign server #${serverId} to user "${username}"?`)) return;
    try {
      const res = await app.api(`/api/servers/${serverId}`, {
        method: 'PUT',
        body: JSON.stringify({ user_id: newUserId })
      });
      if (res.success) {
        app.toast(`Server #${serverId} assigned to ${username}!`, 'success');
        this.showUserServerAccessModal(newUserId, username);
        this.renderUsersView();
      }
    } catch (err) {
      app.toast(err.message || 'Failed to reassign server', 'error');
    }
  }

  showCreateUserModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="user-plus" class="w-5 h-5 text-purple-400"></i> Create User Account
          </h3>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Username</label>
            <input type="text" id="adm-new-user-name" placeholder="shadow" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input type="email" id="adm-new-user-email" placeholder="user@example.com" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <input type="password" id="adm-new-user-pass" placeholder="••••••••" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required minlength="6">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Role</label>
            <select id="adm-new-user-role" class="w-full glass-input px-3 py-2 rounded-xl text-xs">
              <option value="user">Standard User</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div class="flex gap-2 pt-2">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="flex-1 py-2 rounded-xl text-xs bg-slate-700 text-slate-300">Cancel</button>
            <button onclick="admin.handleCreateUser()" class="btn-cyber-purple flex-1 py-2 rounded-xl text-xs font-semibold">Create User</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async handleCreateUser() {
    const username = document.getElementById('adm-new-user-name').value.trim();
    const email = document.getElementById('adm-new-user-email').value.trim();
    const password = document.getElementById('adm-new-user-pass').value;
    const role = document.getElementById('adm-new-user-role').value;

    try {
      const data = await app.api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, role })
      });
      if (data.success) {
        document.getElementById('modal-container').innerHTML = '';
        app.toast('User created successfully!', 'success');
        if (window.location.hash.includes('admin-servers')) {
          this.renderServersView();
        } else {
          this.renderUsersView();
        }
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async toggleSuspendUser(userId) {
    try {
      const data = await app.api(`/api/admin/users/${userId}/suspend`, { method: 'POST' });
      if (data.success) {
        app.toast(`User status updated.`, 'info');
        if (window.location.hash.includes('admin-servers')) {
          this.renderServersView();
        } else {
          this.renderUsersView();
        }
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? All their servers will be deleted as well.')) return;
    try {
      const data = await app.api(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (data.success) {
        app.toast('User deleted.', 'info');
        if (window.location.hash.includes('admin-servers')) {
          this.renderServersView();
        } else {
          this.renderUsersView();
        }
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  // 4. Nodes & Port Allocations View
  async renderNodesView() {
    if (this._nodesLiveTimer) {
      clearInterval(this._nodesLiveTimer);
      this._nodesLiveTimer = null;
    }

    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">Infrastructure</span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> AUTO LIVE REFRESH
              </span>
            </div>
            <h2 class="text-xl font-bold text-white mt-1 flex items-center gap-2">
              <i data-lucide="network" class="w-5 h-5 text-purple-400"></i> Nodes & Port Allocations
            </h2>
            <p class="text-xs text-slate-400">Real-time node performance metrics (RAM, CPU, SSD, Network) & port managers</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="admin.renderNodesView()" class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-all">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Refresh
            </button>
            <button onclick="admin.showCreateNodeModal()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
              <i data-lucide="plus-circle" class="w-4 h-4"></i> Create Node
            </button>
          </div>
        </div>

        <div id="nodes-card-list" class="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div class="col-span-full text-center py-8 text-slate-400">Loading nodes...</div>
        </div>
      </div>
    `;

    try {
      const data = await app.api('/api/admin/nodes');
      const nodes = data.nodes || [];
      const list = document.getElementById('nodes-card-list');

      if (!list) return;

      if (nodes.length === 0) {
        list.innerHTML = `<div class="glass-card p-8 rounded-2xl text-center col-span-full border border-dashed border-white/20 text-slate-400 text-xs">No nodes created yet.</div>`;
      } else {
        list.innerHTML = nodes.map(n => this._renderNodeCardHtml(n)).join('');
      }

      // Start automatic live status updater every 2 seconds
      this._nodesLiveTimer = setInterval(async () => {
        const cardList = document.getElementById('nodes-card-list');
        const modal = document.getElementById('modal-container');
        if (!cardList) {
          if (this._nodesLiveTimer) {
            clearInterval(this._nodesLiveTimer);
            this._nodesLiveTimer = null;
          }
          return;
        }
        if (modal && modal.children.length > 0) return;
        try {
          const freshData = await app.api('/api/admin/nodes');
          if (freshData && freshData.nodes) {
            freshData.nodes.forEach(node => {
              this._updateNodeCardStats(node);
            });
          }
        } catch (e) {}
      }, 2000);

    } catch (e) {
      console.error(e);
    }
    if (window.lucide) lucide.createIcons();
  }

  _renderNodeCardHtml(n) {
    const usage = n.usage || {
      cpu_percent: 0,
      ram_percent: 0,
      ram_used_mb: 0,
      ram_total_mb: 0,
      ssd_used_gb: 0,
      ssd_total_gb: 0,
      ssd_free_gb: 0,
      ssd_percent: 0,
      net_in_speed: '0.00 B/s',
      net_out_speed: '0.00 B/s',
      net_in_total: '0 MB',
      net_out_total: '0 MB',
      load_avg: '0.00',
      uptime_hours: 0,
      cores: 1
    };

    const cpuColor = usage.cpu_percent > 85 ? 'bg-rose-500' : (usage.cpu_percent > 65 ? 'bg-amber-500' : 'bg-purple-500');
    const ramColor = usage.ram_percent > 85 ? 'bg-rose-500' : (usage.ram_percent > 65 ? 'bg-amber-500' : 'bg-cyan-500');
    const ssdColor = usage.ssd_percent > 85 ? 'bg-rose-500' : (usage.ssd_percent > 65 ? 'bg-amber-500' : 'bg-emerald-500');

    return `
    <div id="node-card-${n.id}" class="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 hover:border-purple-500/30 transition-all shadow-xl">
      <div class="flex justify-between items-start">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">${n.location_name || 'Local'}</span>
          <h4 class="text-base font-bold text-white mt-1">${n.name}</h4>
          <p class="text-xs font-mono text-slate-400">${n.fqdn}</p>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE
          </span>
          <span class="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-white/5 border border-white/10 text-slate-300">
            ${usage.cores} CORES
          </span>
        </div>
      </div>

      <!-- Node Live Usage Status 5-Metric Box (CPU, RAM, SSD, Network Inbound, Network Outbound) -->
      <div class="p-4 rounded-2xl bg-slate-900/70 border border-white/5 space-y-3.5">
        <!-- CPU Metric -->
        <div class="space-y-1">
          <div class="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span class="flex items-center gap-1.5"><i data-lucide="cpu" class="w-3.5 h-3.5 text-purple-400"></i> CPU Usage</span>
            <span id="node-cpu-val-${n.id}" class="font-mono text-purple-300 font-bold">${usage.cpu_percent}%</span>
          </div>
          <div class="w-full bg-black/50 h-2 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div id="node-cpu-bar-${n.id}" class="${cpuColor} h-full rounded-full transition-all duration-500" style="width: ${Math.min(100, Math.max(2, usage.cpu_percent))}%"></div>
          </div>
        </div>

        <!-- RAM Metric -->
        <div class="space-y-1">
          <div class="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span class="flex items-center gap-1.5"><i data-lucide="database" class="w-3.5 h-3.5 text-cyan-400"></i> RAM Memory</span>
            <span id="node-ram-val-${n.id}" class="font-mono text-cyan-300 font-bold">${(usage.ram_used_mb / 1024).toFixed(1)} / ${(usage.ram_total_mb / 1024).toFixed(1)} GB (${usage.ram_percent}%)</span>
          </div>
          <div class="w-full bg-black/50 h-2 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div id="node-ram-bar-${n.id}" class="${ramColor} h-full rounded-full transition-all duration-500" style="width: ${Math.min(100, Math.max(2, usage.ram_percent))}%"></div>
          </div>
        </div>

        <!-- SSD / Disk Metric -->
        <div class="space-y-1">
          <div class="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span class="flex items-center gap-1.5"><i data-lucide="hard-drive" class="w-3.5 h-3.5 text-emerald-400"></i> SSD Storage</span>
            <span id="node-ssd-val-${n.id}" class="font-mono text-emerald-300 font-bold">${usage.ssd_used_gb} / ${usage.ssd_total_gb} GB (${usage.ssd_percent}%)</span>
          </div>
          <div class="w-full bg-black/50 h-2 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div id="node-ssd-bar-${n.id}" class="${ssdColor} h-full rounded-full transition-all duration-500" style="width: ${Math.min(100, Math.max(2, usage.ssd_percent))}%"></div>
          </div>
        </div>

        <!-- Network Inbound & Outbound Live Status -->
        <div class="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div class="p-2 rounded-xl bg-slate-950/50 border border-white/5 flex items-center justify-between">
            <span class="text-slate-400 flex items-center gap-1"><i data-lucide="arrow-down-left" class="w-3 h-3 text-emerald-400"></i> Inbound</span>
            <span id="node-netin-val-${n.id}" class="text-emerald-300 font-bold">${usage.net_in_speed}</span>
          </div>
          <div class="p-2 rounded-xl bg-slate-950/50 border border-white/5 flex items-center justify-between">
            <span class="text-slate-400 flex items-center gap-1"><i data-lucide="arrow-up-right" class="w-3 h-3 text-sky-400"></i> Outbound</span>
            <span id="node-netout-val-${n.id}" class="text-sky-300 font-bold">${usage.net_out_speed}</span>
          </div>
        </div>

        <div class="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-white/5 font-mono">
          <span>Load Avg: <strong id="node-load-${n.id}" class="text-slate-200">${usage.load_avg}</strong></span>
          <span>Host Uptime: <strong id="node-uptime-${n.id}" class="text-slate-200">${usage.uptime_hours}h</strong></span>
        </div>
      </div>

      <!-- Allocations & Server Count Summary -->
      <div class="grid grid-cols-3 gap-2 text-center text-xs py-2.5 bg-slate-900/40 rounded-xl border border-white/5 font-mono">
        <div>
          <p class="text-[10px] text-slate-400">Active Servers</p>
          <p class="font-bold text-white text-sm">${n.server_count || 0}</p>
        </div>
        <div>
          <p class="text-[10px] text-slate-400">Total Allocations</p>
          <p id="node-total-allocs-${n.id}" class="font-bold text-cyan-400 text-sm">${n.total_allocations || 0}</p>
        </div>
        <div>
          <p class="text-[10px] text-slate-400">Assigned Ports</p>
          <p id="node-assigned-allocs-${n.id}" class="font-bold text-amber-400 text-sm">${n.assigned_allocations || 0}</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-2 border-t border-white/10">
        <button onclick="admin.showAllocationsModal(${n.id}, '${n.name}', '${n.fqdn}')" class="btn-cyber w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all">
          <i data-lucide="radio" class="w-4 h-4"></i> Port Allocations
        </button>
      </div>
    </div>
    `;
  }

  _updateNodeCardStats(n) {
    const usage = n.usage;
    if (!usage) return;

    const cpuVal = document.getElementById(`node-cpu-val-${n.id}`);
    const cpuBar = document.getElementById(`node-cpu-bar-${n.id}`);
    const ramVal = document.getElementById(`node-ram-val-${n.id}`);
    const ramBar = document.getElementById(`node-ram-bar-${n.id}`);
    const ssdVal = document.getElementById(`node-ssd-val-${n.id}`);
    const ssdBar = document.getElementById(`node-ssd-bar-${n.id}`);
    const netIn = document.getElementById(`node-netin-val-${n.id}`);
    const netOut = document.getElementById(`node-netout-val-${n.id}`);
    const loadEl = document.getElementById(`node-load-${n.id}`);
    const uptimeEl = document.getElementById(`node-uptime-${n.id}`);

    if (cpuVal) cpuVal.textContent = `${usage.cpu_percent}%`;
    if (cpuBar) cpuBar.style.width = `${Math.min(100, Math.max(2, usage.cpu_percent))}%`;
    if (ramVal) ramVal.textContent = `${(usage.ram_used_mb / 1024).toFixed(1)} / ${(usage.ram_total_mb / 1024).toFixed(1)} GB (${usage.ram_percent}%)`;
    if (ramBar) ramBar.style.width = `${Math.min(100, Math.max(2, usage.ram_percent))}%`;
    if (ssdVal) ssdVal.textContent = `${usage.ssd_used_gb} / ${usage.ssd_total_gb} GB (${usage.ssd_percent}%)`;
    if (ssdBar) ssdBar.style.width = `${Math.min(100, Math.max(2, usage.ssd_percent))}%`;
    if (netIn) netIn.textContent = usage.net_in_speed;
    if (netOut) netOut.textContent = usage.net_out_speed;
    if (loadEl) loadEl.textContent = usage.load_avg;
    if (uptimeEl) uptimeEl.textContent = `${usage.uptime_hours}h`;

    const totalAllocEl = document.getElementById(`node-total-allocs-${n.id}`);
    const assignedAllocEl = document.getElementById(`node-assigned-allocs-${n.id}`);
    if (totalAllocEl && n.total_allocations !== undefined) totalAllocEl.textContent = n.total_allocations;
    if (assignedAllocEl && n.assigned_allocations !== undefined) assignedAllocEl.textContent = n.assigned_allocations;
  }

  showNodeUsageModal(nodeId, nodeName) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-panel w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl border border-purple-500/30 shadow-2xl space-y-5">
          <div class="flex justify-between items-center border-b border-white/10 pb-3">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <i data-lucide="activity" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">${nodeName} - Live Usage Status</h3>
                <p class="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Real-time Node Telemetry (RAM, CPU, SSD, Network)
                </p>
              </div>
            </div>
            <button onclick="admin.closeNodeUsageModal()" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="space-y-3.5">
            <!-- 1. CPU Processor Box -->
            <div class="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-2">
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold text-purple-300 flex items-center gap-1.5"><i data-lucide="cpu" class="w-4 h-4"></i> Processor Load (CPU)</span>
                <span id="live-node-cpu-val" class="font-mono font-bold text-white text-sm">--%</span>
              </div>
              <div class="w-full bg-black/40 h-2.5 rounded-full overflow-hidden p-0.5 border border-purple-500/20">
                <div id="live-node-cpu-bar" class="bg-gradient-to-r from-purple-500 to-indigo-400 h-full rounded-full transition-all duration-300" style="width: 0%"></div>
              </div>
              <div class="flex justify-between text-[10px] text-slate-400 font-mono">
                <span id="live-node-cpu-cores">Cores / Threads: --</span>
                <span id="live-node-load">Load Avg: --</span>
              </div>
            </div>

            <!-- 2. Memory (RAM) Box -->
            <div class="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 space-y-2">
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold text-cyan-300 flex items-center gap-1.5"><i data-lucide="database" class="w-4 h-4"></i> Memory (RAM) Allocation</span>
                <span id="live-node-ram-val" class="font-mono font-bold text-white text-sm">--%</span>
              </div>
              <div class="w-full bg-black/40 h-2.5 rounded-full overflow-hidden p-0.5 border border-cyan-500/20">
                <div id="live-node-ram-bar" class="bg-gradient-to-r from-cyan-500 to-blue-400 h-full rounded-full transition-all duration-300" style="width: 0%"></div>
              </div>
              <div class="flex justify-between text-[10px] text-slate-400 font-mono">
                <span id="live-node-ram-detail">Used: -- / -- GB</span>
                <span id="live-node-status" class="text-emerald-400 font-bold">OPTIMAL</span>
              </div>
            </div>

            <!-- 3. SSD / Disk Storage Box -->
            <div class="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
              <div class="flex justify-between items-center text-xs">
                <span class="font-bold text-emerald-300 flex items-center gap-1.5"><i data-lucide="hard-drive" class="w-4 h-4"></i> Solid State Drive (SSD)</span>
                <span id="live-node-ssd-val" class="font-mono font-bold text-white text-sm">--%</span>
              </div>
              <div class="w-full bg-black/40 h-2.5 rounded-full overflow-hidden p-0.5 border border-emerald-500/20">
                <div id="live-node-ssd-bar" class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300" style="width: 0%"></div>
              </div>
              <div class="flex justify-between text-[10px] text-slate-400 font-mono">
                <span id="live-node-ssd-detail">Disk: -- / -- GB</span>
                <span id="live-node-ssd-free">Free: -- GB</span>
              </div>
            </div>

            <!-- 4. Network Bandwidth (Inbound & Outbound) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="p-4 rounded-2xl bg-slate-900/70 border border-white/5 space-y-2">
                <div class="flex justify-between items-center text-xs">
                  <span class="font-bold text-emerald-300 flex items-center gap-1.5"><i data-lucide="arrow-down-left" class="w-4 h-4 text-emerald-400"></i> Network (Inbound)</span>
                </div>
                <div class="font-mono font-bold text-lg text-emerald-400" id="live-node-net-in">-- MB/s</div>
                <div class="text-[10px] text-slate-400 font-mono" id="live-node-net-in-total">Total Received: --</div>
              </div>

              <div class="p-4 rounded-2xl bg-slate-900/70 border border-white/5 space-y-2">
                <div class="flex justify-between items-center text-xs">
                  <span class="font-bold text-sky-300 flex items-center gap-1.5"><i data-lucide="arrow-up-right" class="w-4 h-4 text-sky-400"></i> Network (Outbound)</span>
                </div>
                <div class="font-mono font-bold text-lg text-sky-400" id="live-node-net-out">-- MB/s</div>
                <div class="text-[10px] text-slate-400 font-mono" id="live-node-net-out-total">Total Transmitted: --</div>
              </div>
            </div>

            <!-- Host Overview Summary -->
            <div class="grid grid-cols-2 gap-3 text-xs font-mono">
              <div class="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <span class="text-[10px] text-slate-400 block mb-1">Host Uptime</span>
                <span id="live-node-uptime" class="text-white font-bold">-- hrs</span>
              </div>
              <div class="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <span class="text-[10px] text-slate-400 block mb-1">Health Grade</span>
                <span id="live-node-grade" class="text-emerald-400 font-bold">Optimal</span>
              </div>
            </div>
          </div>

          <div class="pt-2 flex justify-end">
            <button onclick="admin.closeNodeUsageModal()" class="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700">Close</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    const updateStats = async () => {
      try {
        const res = await app.api(`/api/admin/nodes/${nodeId}/stats`);
        if (res.success && res.stats) {
          const s = res.stats;
          const cpuVal = document.getElementById('live-node-cpu-val');
          const cpuBar = document.getElementById('live-node-cpu-bar');
          const cpuCores = document.getElementById('live-node-cpu-cores');
          const loadEl = document.getElementById('live-node-load');

          const ramVal = document.getElementById('live-node-ram-val');
          const ramBar = document.getElementById('live-node-ram-bar');
          const ramDetail = document.getElementById('live-node-ram-detail');
          const statusEl = document.getElementById('live-node-status');

          const ssdVal = document.getElementById('live-node-ssd-val');
          const ssdBar = document.getElementById('live-node-ssd-bar');
          const ssdDetail = document.getElementById('live-node-ssd-detail');
          const ssdFree = document.getElementById('live-node-ssd-free');

          const netIn = document.getElementById('live-node-net-in');
          const netInTotal = document.getElementById('live-node-net-in-total');
          const netOut = document.getElementById('live-node-net-out');
          const netOutTotal = document.getElementById('live-node-net-out-total');

          const uptimeEl = document.getElementById('live-node-uptime');
          const gradeEl = document.getElementById('live-node-grade');

          if (cpuVal) cpuVal.textContent = `${s.cpu_percent}%`;
          if (cpuBar) cpuBar.style.width = `${Math.min(100, Math.max(2, s.cpu_percent))}%`;
          if (cpuCores) cpuCores.textContent = `Cores: ${s.cores}`;
          if (loadEl) loadEl.textContent = `Load: ${s.load_avg}`;

          if (ramVal) ramVal.textContent = `${s.ram_percent}%`;
          if (ramBar) ramBar.style.width = `${Math.min(100, Math.max(2, s.ram_percent))}%`;
          if (ramDetail) ramDetail.textContent = `Used: ${(s.ram_used_mb / 1024).toFixed(2)} / ${(s.ram_total_mb / 1024).toFixed(2)} GB`;
          if (statusEl) {
            statusEl.textContent = s.status === 'optimal' ? 'OPTIMAL' : 'HIGH LOAD';
            statusEl.className = s.status === 'optimal' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold';
          }

          if (ssdVal) ssdVal.textContent = `${s.ssd_percent}%`;
          if (ssdBar) ssdBar.style.width = `${Math.min(100, Math.max(2, s.ssd_percent))}%`;
          if (ssdDetail) ssdDetail.textContent = `Disk: ${s.ssd_used_gb} / ${s.ssd_total_gb} GB`;
          if (ssdFree) ssdFree.textContent = `Free: ${s.ssd_free_gb} GB`;

          if (netIn) netIn.textContent = s.net_in_speed;
          if (netInTotal) netInTotal.textContent = `Total Received: ${s.net_in_total}`;
          if (netOut) netOut.textContent = s.net_out_speed;
          if (netOutTotal) netOutTotal.textContent = `Total Sent: ${s.net_out_total}`;

          if (uptimeEl) uptimeEl.textContent = `${s.uptime_hours} hrs`;
          if (gradeEl) {
            gradeEl.textContent = s.status === 'optimal' ? 'Optimal' : 'High Load';
            gradeEl.className = s.status === 'optimal' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold';
          }
        }
      } catch (err) {
        console.error('Node usage live fetch error:', err);
      }
    };

    updateStats();
    if (this._nodeUsageTimer) clearInterval(this._nodeUsageTimer);
    this._nodeUsageTimer = setInterval(updateStats, 1500);
  }

  closeNodeUsageModal() {
    if (this._nodeUsageTimer) {
      clearInterval(this._nodeUsageTimer);
      this._nodeUsageTimer = null;
    }
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
  }

  showCreateNodeModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="network" class="w-5 h-5 text-cyan-400"></i> Create Node
          </h3>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Node Name</label>
            <input type="text" id="node-name" placeholder="EU Node 01" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">FQDN or Host IP</label>
            <input type="text" id="node-fqdn" placeholder="127.0.0.1" value="127.0.0.1" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono" required>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Daemon Port</label>
              <input type="number" id="node-daemon-port" value="3003" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">SFTP Port</label>
              <input type="number" id="node-sftp-port" value="3004" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono">
            </div>
          </div>
          <div class="flex gap-2 pt-2">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="flex-1 py-2 rounded-xl text-xs bg-slate-700 text-slate-300">Cancel</button>
            <button onclick="admin.handleCreateNode()" class="btn-cyber flex-1 py-2 rounded-xl text-xs font-semibold">Create Node</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async handleCreateNode() {
    const name = document.getElementById('node-name').value.trim();
    const fqdn = document.getElementById('node-fqdn').value.trim();
    const daemon_port = document.getElementById('node-daemon-port').value;
    const sftp_port = document.getElementById('node-sftp-port').value;

    try {
      const data = await app.api('/api/admin/nodes', {
        method: 'POST',
        body: JSON.stringify({ name, fqdn, daemon_port, sftp_port })
      });
      if (data.success) {
        document.getElementById('modal-container').innerHTML = '';
        app.toast('Node created successfully!', 'success');
        this.renderNodesView();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async showAllocationsModal(nodeId, nodeName = 'Node', nodeFqdn = '127.0.0.1') {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-panel w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl border border-white/15 shadow-2xl space-y-5">
          <!-- Header -->
          <div class="flex justify-between items-center border-b border-white/10 pb-3">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <i data-lucide="radio" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-white flex items-center gap-2">
                  Port Allocations Manager
                  <span class="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">${app.escapeHtml(nodeName)}</span>
                </h3>
                <p class="text-[10px] text-slate-400 font-mono">Manage port assignments and network bindings (${app.escapeHtml(nodeFqdn)})</p>
              </div>
            </div>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Add Ports Batch Generator & Presets -->
          <div class="bg-slate-900/60 p-4 rounded-2xl border border-white/5 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h4 class="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <i data-lucide="plus-circle" class="w-4 h-4"></i> Generate Port Range or Individual Ports
              </h4>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[10px] text-slate-400">Presets:</span>
                <button type="button" onclick="admin.setPortRangePreset(25565, 25575)" class="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all font-mono">Minecraft (25565-25575)</button>
                <button type="button" onclick="admin.setPortRangePreset(19132, 19142)" class="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all font-mono">Bedrock (19132-19142)</button>
                <button type="button" onclick="admin.setPortRangePreset(3000, 3010)" class="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all font-mono">Web/App (3000-3010)</button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Target IP / Host</label>
                <input type="text" id="alloc-target-ip" value="${app.escapeHtml(nodeFqdn || '127.0.0.1')}" placeholder="127.0.0.1" class="w-full glass-input px-3 py-1.5 rounded-xl text-xs font-mono">
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Start Port</label>
                <input type="number" id="alloc-start-port" placeholder="25565" class="w-full glass-input px-3 py-1.5 rounded-xl text-xs font-mono">
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">End Port</label>
                <input type="number" id="alloc-end-port" placeholder="25575" class="w-full glass-input px-3 py-1.5 rounded-xl text-xs font-mono">
              </div>
              <div class="flex items-end">
                <button id="alloc-add-btn" onclick="admin.handleBatchGeneratePorts(${nodeId})" class="btn-cyber w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Ports
                </button>
              </div>
            </div>
          </div>

          <!-- Port Stats Bar & Search/Filter Controls -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-white/5">
            <div class="flex items-center gap-2 text-xs font-mono">
              <span class="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 border border-white/5">Total: <strong id="alloc-stat-total" class="text-white">0</strong></span>
              <span class="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Free: <strong id="alloc-stat-free" class="text-emerald-400">0</strong></span>
              <span class="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20">Assigned: <strong id="alloc-stat-assigned" class="text-amber-400">0</strong></span>
            </div>

            <div class="flex items-center gap-2">
              <div class="relative flex-1 sm:w-48">
                <input type="text" id="alloc-filter-search" oninput="admin.filterAllocationsList()" placeholder="Filter port or server..." class="w-full glass-input pl-7 pr-3 py-1 rounded-xl text-xs font-mono">
                <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2"></i>
              </div>
              <select id="alloc-filter-status" onchange="admin.filterAllocationsList()" class="glass-input px-2.5 py-1 rounded-xl text-xs font-mono">
                <option value="all">All</option>
                <option value="free">Free Only</option>
                <option value="assigned">Assigned Only</option>
              </select>
              <button onclick="admin.clearUnassignedAllocations(${nodeId})" title="Delete all free ports on this node" class="px-3 py-1 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center gap-1 shrink-0">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Clear Free
              </button>
            </div>
          </div>

          <!-- Allocations List Container -->
          <div id="allocs-list-container" class="space-y-2">
            <p class="text-xs text-slate-400 text-center py-4">Loading existing allocations...</p>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    this.loadNodeAllocations(nodeId);
  }

  setPortRangePreset(start, end) {
    const startInput = document.getElementById('alloc-start-port');
    const endInput = document.getElementById('alloc-end-port');
    if (startInput) startInput.value = start;
    if (endInput) endInput.value = end;
  }

  async loadNodeAllocations(nodeId) {
    try {
      const data = await app.api(`/api/admin/nodes/${nodeId}`);
      this._currentNodeAllocations = data.allocations || [];
      this._currentNodeAllocationsNodeId = nodeId;
      this.filterAllocationsList();

      // Update node card badge in background if element exists
      const totalAllocEl = document.getElementById(`node-total-allocs-${nodeId}`);
      const assignedAllocEl = document.getElementById(`node-assigned-allocs-${nodeId}`);
      if (totalAllocEl) totalAllocEl.textContent = this._currentNodeAllocations.length;
      if (assignedAllocEl) assignedAllocEl.textContent = this._currentNodeAllocations.filter(a => a.assigned).length;
    } catch (e) {
      console.error(e);
      const container = document.getElementById('allocs-list-container');
      if (container) {
        container.innerHTML = `<p class="text-xs text-rose-400 text-center py-4">Failed to load allocations: ${app.escapeHtml(e.message)}</p>`;
      }
    }
  }

  filterAllocationsList() {
    const allocs = this._currentNodeAllocations || [];
    const nodeId = this._currentNodeAllocationsNodeId;
    const container = document.getElementById('allocs-list-container');
    if (!container) return;

    // Update summary counts
    const totalEl = document.getElementById('alloc-stat-total');
    const freeEl = document.getElementById('alloc-stat-free');
    const assignedEl = document.getElementById('alloc-stat-assigned');
    const assignedCount = allocs.filter(a => a.assigned).length;
    const freeCount = allocs.length - assignedCount;
    if (totalEl) totalEl.textContent = allocs.length;
    if (freeEl) freeEl.textContent = freeCount;
    if (assignedEl) assignedEl.textContent = assignedCount;

    const searchInput = document.getElementById('alloc-filter-search');
    const statusSelect = document.getElementById('alloc-filter-status');
    const q = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const statusFilter = statusSelect ? statusSelect.value : 'all';

    let filtered = allocs;
    if (statusFilter === 'free') {
      filtered = filtered.filter(a => !a.assigned);
    } else if (statusFilter === 'assigned') {
      filtered = filtered.filter(a => a.assigned);
    }

    if (q) {
      filtered = filtered.filter(a => {
        const portStr = String(a.port);
        const ipStr = String(a.ip || '');
        const sName = String(a.server_name || '').toLowerCase();
        return portStr.includes(q) || ipStr.includes(q) || sName.includes(q);
      });
    }

    if (allocs.length === 0) {
      container.innerHTML = '<p class="text-xs text-slate-500 text-center py-6">No port allocations configured on this node yet.</p>';
      return;
    }

    if (filtered.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-500 text-center py-6">No allocations match filter "${app.escapeHtml(q)}".</p>`;
      return;
    }

    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto p-1 pr-2">
        ${filtered.map(a => `
          <div class="glass-card p-3 rounded-xl border ${a.assigned ? 'border-amber-500/30 bg-amber-950/10' : 'border-white/5 bg-slate-900/40'} flex flex-col justify-between gap-1.5 transition-all">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="font-mono font-bold text-sm ${a.assigned ? 'text-amber-300' : 'text-cyan-300'}">${a.port}</span>
                <span class="text-[10px] text-slate-400 font-mono">${app.escapeHtml(a.ip || '0.0.0.0')}</span>
              </div>
              <div class="flex items-center gap-1">
                ${a.assigned
                  ? '<span class="text-[9px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">USED</span>'
                  : '<span class="text-[9px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">FREE</span>'
                }
                ${!a.assigned ? `
                  <button onclick="admin.deleteAllocation(${nodeId}, ${a.id})" title="Delete allocation" class="w-6 h-6 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center ml-1 transition-all">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>
                  </button>
                ` : ''}
              </div>
            </div>
            ${a.assigned ? `
              <div class="text-[10px] text-amber-200/80 font-mono flex items-center gap-1 truncate pt-1 border-t border-white/5">
                <i data-lucide="server" class="w-3 h-3 shrink-0 text-amber-400"></i>
                <span class="truncate font-semibold">${app.escapeHtml(a.server_name || 'Server #' + a.server_id)}</span>
              </div>
            ` : `
              <div class="text-[10px] text-slate-500 font-mono flex items-center gap-1 pt-1 border-t border-white/5">
                <i data-lucide="check-circle" class="w-3 h-3 text-emerald-500"></i>
                <span>Available for assignment</span>
              </div>
            `}
          </div>
        `).join('')}
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async handleBatchGeneratePorts(nodeId) {
    const ip = document.getElementById('alloc-target-ip')?.value?.trim() || '127.0.0.1';
    const startPort = document.getElementById('alloc-start-port')?.value?.trim();
    const endPort = document.getElementById('alloc-end-port')?.value?.trim();

    if (!startPort || !endPort) {
      app.toast('Please specify both start port and end port', 'warning');
      return;
    }

    const btn = document.getElementById('alloc-add-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="animate-spin mr-1">⏳</span> Adding...';
    }

    try {
      const data = await app.api(`/api/admin/nodes/${nodeId}/allocations`, {
        method: 'POST',
        body: JSON.stringify({ ip, startPort, endPort })
      });
      if (data.success) {
        app.toast(data.message, 'success');
        document.getElementById('alloc-start-port').value = '';
        document.getElementById('alloc-end-port').value = '';
        await this.loadNodeAllocations(nodeId);
      }
    } catch (err) {
      app.toast(err.message || 'Failed to generate ports', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Ports';
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  async deleteAllocation(nodeId, allocId) {
    if (!confirm('Are you sure you want to delete this port allocation?')) return;
    try {
      const data = await app.api(`/api/admin/nodes/${nodeId}/allocations/${allocId}`, { method: 'DELETE' });
      if (data.success) {
        app.toast('Port allocation deleted', 'success');
        if (document.getElementById('admin-network-tbody')) {
          this.renderNetworkView();
        } else {
          this.loadNodeAllocations(nodeId);
        }
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async clearUnassignedAllocations(nodeId) {
    if (!confirm('Are you sure you want to delete ALL free (unassigned) ports on this node?')) return;
    try {
      const data = await app.api(`/api/admin/nodes/${nodeId}/allocations-clear-unassigned`, { method: 'DELETE' });
      if (data.success) {
        app.toast(data.message || 'Unassigned ports cleared', 'success');
        this.loadNodeAllocations(nodeId);
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  // 5. Locations View
  async renderLocationsView() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <div>
            <span class="text-xs font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">Infrastructure</span>
            <h2 class="text-xl font-bold text-white mt-1 flex items-center gap-2">
              <i data-lucide="map-pin" class="w-5 h-5 text-purple-400"></i> Locations (Auto / Custom)
            </h2>
            <p class="text-xs text-slate-400">Organize node regions and data centers</p>
          </div>
          <button onclick="admin.showCreateLocationModal()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
            <i data-lucide="plus" class="w-4 h-4"></i> Add Location
          </button>
        </div>

        <div id="locations-list" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="col-span-full text-center py-8 text-slate-400">Loading locations...</div>
        </div>
      </div>
    `;

    try {
      const data = await app.api('/api/admin/locations');
      const locs = data.locations || [];
      const list = document.getElementById('locations-list');

      if (locs.length === 0) {
        list.innerHTML = `<div class="glass-card p-8 rounded-2xl text-center col-span-full border border-dashed border-white/20 text-slate-400 text-xs">No locations created yet.</div>`;
      } else {
        list.innerHTML = locs.map(l => `
          <div class="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
            <div class="flex justify-between items-start">
              <div>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400">${l.short_code}</span>
                <h4 class="text-sm font-bold text-white mt-1">${l.name}</h4>
                <p class="text-[11px] text-slate-400">${l.description || 'No description'}</p>
              </div>
              <button onclick="admin.deleteLocation(${l.id})" class="text-slate-500 hover:text-rose-400 text-xs">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
            <div class="pt-2 border-t border-white/10 text-[11px] text-slate-400 flex justify-between">
              <span>Nodes attached:</span>
              <span class="font-bold text-white">${l.node_count || 0}</span>
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
    if (window.lucide) lucide.createIcons();
  }

  showCreateLocationModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="map-pin" class="w-5 h-5 text-cyan-400"></i> Add New Location
          </h3>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Short Code (e.g. us-east)</label>
            <input type="text" id="loc-code" placeholder="us-east-1" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Location Name</label>
            <input type="text" id="loc-name" placeholder="North Virginia DC" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <input type="text" id="loc-desc" placeholder="Primary Datacenter" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs">
          </div>
          <div class="flex gap-2 pt-2">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="flex-1 py-2 rounded-xl text-xs bg-slate-700 text-slate-300">Cancel</button>
            <button onclick="admin.handleCreateLocation()" class="btn-cyber flex-1 py-2 rounded-xl text-xs font-semibold">Save Location</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async handleCreateLocation() {
    const short_code = document.getElementById('loc-code').value.trim();
    const name = document.getElementById('loc-name').value.trim();
    const description = document.getElementById('loc-desc').value.trim();

    try {
      const data = await app.api('/api/admin/locations', {
        method: 'POST',
        body: JSON.stringify({ short_code, name, description })
      });
      if (data.success) {
        document.getElementById('modal-container').innerHTML = '';
        app.toast('Location created!', 'success');
        this.renderLocationsView();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async deleteLocation(locId) {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      const data = await app.api(`/api/admin/locations/${locId}`, { method: 'DELETE' });
      if (data.success) {
        app.toast('Location deleted.', 'info');
        this.renderLocationsView();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  // 6. Panel API Keys View
  async renderApiKeysView() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <div>
            <span class="text-xs font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">Integrations</span>
            <h2 class="text-xl font-bold text-white mt-1 flex items-center gap-2">
              <i data-lucide="key" class="w-5 h-5 text-purple-400"></i> Panel API Keys (Port 3003)
            </h2>
            <p class="text-xs text-slate-400">Generate secure API tokens for WHMCS billing, Discord bots, and automated scripts</p>
          </div>
          <button onclick="admin.showCreateApiKeyModal()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
            <i data-lucide="plus" class="w-4 h-4"></i> Create API Key
          </button>
        </div>

        <div id="new-key-alert-box" class="hidden"></div>

        <div class="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th class="px-5 py-3">Description</th>
                <th class="px-5 py-3">Key Token</th>
                <th class="px-5 py-3">Last Used</th>
                <th class="px-5 py-3">Created</th>
                <th class="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="api-keys-tbody" class="divide-y divide-white/5">
              <tr><td colspan="5" class="text-center py-8 text-slate-500">Loading API keys...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    try {
      const data = await app.api('/api/admin/api-keys');
      const keys = data.keys || [];
      const tbody = document.getElementById('api-keys-tbody');

      if (keys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-500">No API keys generated yet.</td></tr>`;
      } else {
        tbody.innerHTML = keys.map(k => `
          <tr class="hover:bg-white/5 transition">
            <td class="px-5 py-3 font-semibold text-white">${k.description}</td>
            <td class="px-5 py-3 font-mono text-cyan-400">${k.key_token}</td>
            <td class="px-5 py-3 text-slate-400">${k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Never'}</td>
            <td class="px-5 py-3 text-slate-400">${new Date(k.created_at).toLocaleDateString()}</td>
            <td class="px-5 py-3 text-right">
              <button onclick="admin.deleteApiKey(${k.id})" class="px-2 py-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-xs">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </td>
          </tr>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
    if (window.lucide) lucide.createIcons();
  }

  showCreateApiKeyModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="key" class="w-5 h-5 text-cyan-400"></i> Generate Panel API Token
          </h3>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Description / Identifier</label>
            <input type="text" id="api-key-desc" placeholder="WHMCS Integration / Discord Bot" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required>
          </div>
          <div class="flex gap-2 pt-2">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="flex-1 py-2 rounded-xl text-xs bg-slate-700 text-slate-300">Cancel</button>
            <button onclick="admin.handleCreateApiKey()" class="btn-cyber flex-1 py-2 rounded-xl text-xs font-semibold">Generate Token</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async handleCreateApiKey() {
    const description = document.getElementById('api-key-desc').value.trim();
    if (!description) return;

    try {
      const data = await app.api('/api/admin/api-keys', {
        method: 'POST',
        body: JSON.stringify({ description })
      });

      if (data.success && data.key) {
        document.getElementById('modal-container').innerHTML = '';
        const alertBox = document.getElementById('new-key-alert-box');
        if (alertBox) {
          alertBox.classList.remove('hidden');
          alertBox.innerHTML = `
            <div class="bg-cyan-500/15 p-4 rounded-2xl border border-cyan-500/30 text-xs space-y-2">
              <p class="font-bold text-cyan-300">🔑 Copy your new API Token (it will not be displayed again):</p>
              <div class="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl font-mono text-white text-xs select-all">
                <span class="flex-1 truncate">${data.key.key_token}</span>
                <button onclick="app.copyToClipboard('${data.key.key_token}')" class="text-cyan-400 hover:text-white"><i data-lucide="copy" class="w-4 h-4"></i></button>
              </div>
            </div>
          `;
          if (window.lucide) lucide.createIcons();
        }
        app.toast('API Key generated successfully!', 'success');
        this.renderApiKeysView();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async deleteApiKey(keyId) {
    if (!confirm('Are you sure you want to revoke this API key?')) return;
    try {
      const data = await app.api(`/api/admin/api-keys/${keyId}`, { method: 'DELETE' });
      if (data.success) {
        app.toast('API Key revoked.', 'info');
        this.renderApiKeysView();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }
  async showEditServerModal(serverId) {
    const modalContainer = document.getElementById('modal-container');
    try {
      const data = await app.api(`/api/servers/${serverId}`);
      const s = data.server;

      modalContainer.innerHTML = `
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div class="glass-panel w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
            <div class="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <i data-lucide="sliders" class="w-5 h-5 text-purple-400"></i> Edit Build Configuration: ${s.name}
              </h3>
              <button onclick="document.getElementById('modal-container').innerHTML=''" class="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>

            <form onsubmit="admin.handleEditServer(event, ${s.id})" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Server Name</label>
                <input type="text" id="edit-srv-name" value="${s.name}" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Memory (MB)</label>
                  <input type="number" id="edit-srv-ram" value="${s.memory_mb || 1024}" min="128" step="any" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono" required>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">CPU Limit (%)</label>
                  <input type="number" id="edit-srv-cpu" value="${s.cpu_limit || 100}" min="10" step="any" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono" required>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Disk Limit (MB)</label>
                  <input type="number" id="edit-srv-disk" value="${s.disk_mb || 5120}" min="256" step="any" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono" required>
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Startup Command</label>
                <input type="text" id="edit-srv-cmd" value="${s.startup_cmd || ''}" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono">
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Docker Image</label>
                <input type="text" id="edit-srv-img" value="${s.docker_image || ''}" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono">
              </div>

              <!-- SAGA Auto Suspension v1 Panel -->
              <div class="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/20 space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <i data-lucide="clock" class="w-4 h-4 text-purple-400"></i>
                    <span class="text-xs font-bold text-white">SAGA Auto-Suspension & Expiration</span>
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${s.is_suspended ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}">
                    ${s.is_suspended ? 'SUSPENDED' : 'ACTIVE'}
                  </span>
                </div>

                <div>
                  <label class="block text-[11px] text-slate-400 mb-1">Expiration Timestamp</label>
                  <input type="datetime-local" id="edit-srv-expiration" value="${s.expiration_date ? new Date(s.expiration_date).toISOString().slice(0, 16) : ''}" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono text-slate-200">
                </div>

                <div class="flex flex-wrap items-center gap-2 pt-1">
                  <span class="text-[10px] text-slate-400 font-semibold">Quick Extend:</span>
                  <button type="button" onclick="admin.setModalExpirationDays(7)" class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-purple-600/30 text-purple-300 border border-purple-500/20">+7 Days</button>
                  <button type="button" onclick="admin.setModalExpirationDays(30)" class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-purple-600/30 text-purple-300 border border-purple-500/20">+30 Days</button>
                  <button type="button" onclick="admin.setModalExpirationDays(90)" class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-purple-600/30 text-purple-300 border border-purple-500/20">+90 Days</button>
                  <button type="button" onclick="admin.setModalExpirationDays(0)" class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 hover:bg-rose-600/30 text-rose-300 border border-rose-500/20">Never (Clear)</button>
                </div>

                <div class="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span class="text-xs text-slate-300">Force Server Suspension:</span>
                  <button type="button" onclick="admin.toggleServerSuspension(${s.id})" class="px-3 py-1.5 rounded-xl text-xs font-bold ${s.is_suspended ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30' : 'bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30'} flex items-center gap-1.5 transition">
                    <i data-lucide="${s.is_suspended ? 'unlock' : 'lock'}" class="w-3.5 h-3.5"></i>
                    ${s.is_suspended ? 'Unsuspend Server' : 'Suspend Server Now'}
                  </button>
                </div>
              </div>

              <div class="flex gap-2 pt-2">
                <button type="button" onclick="document.getElementById('modal-container').innerHTML=''" class="flex-1 py-2 rounded-xl text-xs bg-slate-700 text-slate-300">Cancel</button>
                <button type="submit" class="btn-cyber flex-1 py-2 rounded-xl text-xs font-semibold">Save Configuration</button>
              </div>
            </form>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  setModalExpirationDays(days) {
    const expInput = document.getElementById('edit-srv-expiration');
    if (!expInput) return;
    if (days === 0) {
      expInput.value = '';
    } else {
      const d = new Date();
      d.setDate(d.getDate() + days);
      expInput.value = d.toISOString().slice(0, 16);
    }
  }

  async toggleServerSuspension(serverId) {
    try {
      const res = await app.api(`/api/servers/${serverId}/suspend`, { method: 'POST' });
      if (res.success) {
        app.toast(res.message, 'success');
        const modal = document.getElementById('modal-container');
        if (modal && modal.innerHTML.trim() !== '') {
          this.showEditServerModal(serverId);
        }
        this.renderServersView();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async handleEditServer(e, serverId) {
    e.preventDefault();
    const name = document.getElementById('edit-srv-name').value.trim();
    const memory_mb = parseInt(document.getElementById('edit-srv-ram').value, 10);
    const cpu_limit = parseInt(document.getElementById('edit-srv-cpu').value, 10);
    const disk_mb = parseInt(document.getElementById('edit-srv-disk').value, 10);
    const startup_cmd = document.getElementById('edit-srv-cmd').value.trim();
    const docker_image = document.getElementById('edit-srv-img').value.trim();
    const expVal = document.getElementById('edit-srv-expiration').value;
    const expiration_date = expVal ? new Date(expVal).toISOString() : null;

    try {
      const data = await app.api(`/api/servers/${serverId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, memory_mb, cpu_limit, disk_mb, startup_cmd, docker_image, expiration_date })
      });
      if (data.success) {
        document.getElementById('modal-container').innerHTML = '';
        app.toast('Server configuration & expiration updated!', 'success');
        this.renderServersView();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async deleteServer(serverId, serverName = '') {
    if (!confirm(`⚠️ Are you sure you want to permanently delete server "${serverName || '#' + serverId}"? This action cannot be undone and will erase all container storage.`)) {
      return;
    }
    try {
      const res = await app.api(`/api/servers/${serverId}`, { method: 'DELETE' });
      if (res.success) {
        app.toast(`Server #${serverId} deleted successfully`, 'success');
        this.renderServersView();
      }
    } catch (err) {
      app.toast(err.message || 'Failed to delete server', 'error');
    }
  }

  showResetPasswordModal(userId, username) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="key" class="w-5 h-5 text-purple-400"></i> Reset Password
            </h3>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="text-slate-400 hover:text-white">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
          <p class="text-xs text-slate-300">Set a new password for user <span class="font-bold text-white font-mono">${app.escapeHtml(username)}</span>:</p>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
            <input type="password" id="reset-user-new-pass" placeholder="Min 6 characters" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono" required minlength="6">
          </div>
          <div class="flex gap-2 pt-2">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="flex-1 py-2 rounded-xl text-xs bg-slate-700 text-slate-300">Cancel</button>
            <button onclick="admin.handleResetPassword(${userId})" class="btn-cyber-purple flex-1 py-2 rounded-xl text-xs font-semibold">Save Password</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async handleResetPassword(userId) {
    const password = document.getElementById('reset-user-new-pass')?.value;
    if (!password || password.length < 6) {
      return app.toast('Password must be at least 6 characters.', 'warning');
    }
    try {
      const res = await app.api(`/api/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ password })
      });
      if (res.success) {
        document.getElementById('modal-container').innerHTML = '';
        app.toast('Password updated successfully!', 'success');
        this.renderServersView();
      }
    } catch (err) {
      app.toast(err.message || 'Failed to update password', 'error');
    }
  }

  // ==========================================
  // ADMIN DATABASES VIEW
  // ==========================================
  async renderDatabasesView() {
    this.stopOverviewPolling();
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="space-y-6 pb-12">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span class="text-xs font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">Admin Management</span>
            <h2 class="text-2xl font-black text-white mt-2 flex items-center gap-2">
              <i data-lucide="database" class="w-6 h-6 text-emerald-400"></i> Global Databases & Hosts
            </h2>
            <p class="text-xs text-slate-400">Configure MariaDB & MySQL server hosts and view all databases created across the cluster</p>
          </div>
          <button onclick="admin.showAddDatabaseHostModal()" class="btn-cyber flex items-center gap-2 text-xs">
            <i data-lucide="plus" class="w-4 h-4"></i> Add Database Host
          </button>
        </div>

        <!-- Section 1: Database Hosts Cards -->
        <div class="space-y-3">
          <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">
            <i data-lucide="server" class="w-4 h-4 text-emerald-400"></i> Database Hosts
          </h3>
          <div id="admin-db-hosts-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="col-span-full text-center py-6 text-slate-500">Loading database hosts...</div>
          </div>
        </div>

        <!-- Section 2: Global Server Databases Table -->
        <div class="space-y-3">
          <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">
            <i data-lucide="table" class="w-4 h-4 text-cyan-400"></i> All Provisioned Server Databases
          </h3>
          <div class="glass-panel rounded-2xl border border-white/10 overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300 min-w-[650px]">
              <thead class="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th class="px-5 py-3">Database Name</th>
                  <th class="px-5 py-3">Server</th>
                  <th class="px-5 py-3">Host Endpoint</th>
                  <th class="px-5 py-3">Username</th>
                  <th class="px-5 py-3">Remote Access</th>
                  <th class="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody id="admin-db-databases-tbody" class="divide-y divide-white/5">
                <tr><td colspan="6" class="text-center py-6 text-slate-500">Loading databases...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      const data = await app.api('/api/admin/databases');
      const hosts = data.hosts || [];
      const databases = data.databases || [];

      // Render Hosts
      const hostsEl = document.getElementById('admin-db-hosts-list');
      if (hostsEl) {
        if (hosts.length === 0) {
          hostsEl.innerHTML = `<div class="glass-card p-6 rounded-2xl text-center col-span-full border border-dashed border-white/20 text-slate-400 text-xs">No database hosts configured yet.</div>`;
        } else {
          hostsEl.innerHTML = hosts.map(h => `
            <div class="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                    <i data-lucide="database" class="w-5 h-5"></i>
                  </div>
                  <div>
                    <h4 class="text-sm font-bold text-white">${h.name}</h4>
                    <p class="text-[11px] font-mono text-slate-400">${h.host}:${h.port}</p>
                  </div>
                </div>
                ${h.id !== 1 ? `
                  <button onclick="admin.deleteDatabaseHost(${h.id})" title="Delete Host" class="text-slate-400 hover:text-rose-400 p-1">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                ` : '<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">DEFAULT</span>'}
              </div>
              <div class="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-white/5">
                <span>Active Databases: <b class="text-white font-mono">${h.database_count || 0}</b></span>
                <span>User: <b class="text-slate-300 font-mono">${h.username}</b></span>
              </div>
            </div>
          `).join('');
        }
      }

      // Render Databases Table
      const tbody = document.getElementById('admin-db-databases-tbody');
      if (tbody) {
        if (databases.length === 0) {
          tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">No server databases provisioned yet.</td></tr>`;
        } else {
          tbody.innerHTML = databases.map(d => `
            <tr class="hover:bg-white/5 transition">
              <td class="px-5 py-3 font-mono font-semibold text-emerald-400">${d.database_name}</td>
              <td class="px-5 py-3">
                ${d.server_name ? `
                  <a href="#server-manage/${d.server_id}/databases" class="text-cyan-400 hover:underline font-semibold flex items-center gap-1">
                    <i data-lucide="server" class="w-3.5 h-3.5"></i> ${d.server_name}
                  </a>
                ` : `<span class="text-slate-500">Server #${d.server_id}</span>`}
              </td>
              <td class="px-5 py-3 font-mono text-[11px] text-slate-300">${d.host_address || '127.0.0.1'}:${d.host_port || 27017}</td>
              <td class="px-5 py-3 font-mono text-[11px] text-slate-200">${d.username}</td>
              <td class="px-5 py-3 font-mono text-[11px] text-slate-400">${d.remote_connections || '%'}</td>
              <td class="px-5 py-3 text-slate-400">${new Date(d.created_at).toLocaleDateString()}</td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      console.error(err);
      app.toast('Failed to load databases: ' + err.message, 'error');
    }
    if (window.lucide) lucide.createIcons();
  }

  showAddDatabaseHostModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="database" class="w-5 h-5 text-emerald-400"></i> Add Database Host
            </h3>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="text-slate-400 hover:text-white">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <form onsubmit="admin.handleAddDatabaseHostSubmit(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Host Name / Label</label>
              <input type="text" id="db-host-name" placeholder="e.g. MariaDB 11 Local, MySQL 8 External" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="col-span-2">
                <label class="block text-xs font-semibold text-slate-300 mb-1">Host / IP</label>
                <input type="text" id="db-host-ip" placeholder="127.0.0.1" value="127.0.0.1" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono" required>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Port</label>
                <input type="number" id="db-host-port" placeholder="27017" value="27017" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono" required>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Admin / Root Username</label>
              <input type="text" id="db-host-user" placeholder="root" value="root" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono" required>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Admin / Root Password</label>
              <input type="password" id="db-host-pass" placeholder="RootPass123!" value="RootPass123!" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono" required>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" onclick="document.getElementById('modal-container').innerHTML=''" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/5">Cancel</button>
              <button type="submit" class="btn-cyber text-xs">Save Host</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async handleAddDatabaseHostSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('db-host-name').value.trim();
    const host = document.getElementById('db-host-ip').value.trim();
    const port = parseInt(document.getElementById('db-host-port').value, 10);
    const username = document.getElementById('db-host-user').value.trim();
    const password = document.getElementById('db-host-pass').value;

    try {
      await app.api('/api/admin/databases/hosts', {
        method: 'POST',
        body: JSON.stringify({ name, host, port, username, password })
      });
      document.getElementById('modal-container').innerHTML = '';
      app.toast('Database host added successfully!', 'success');
      this.renderDatabasesView();
    } catch (err) {
      app.toast('Failed to add host: ' + err.message, 'error');
    }
  }

  async deleteDatabaseHost(hostId) {
    if (!confirm('Are you sure you want to delete this database host?')) return;
    try {
      await app.api(`/api/admin/databases/hosts/${hostId}`, { method: 'DELETE' });
      app.toast('Database host deleted.', 'success');
      this.renderDatabasesView();
    } catch (err) {
      app.toast(err.message || 'Failed to delete host', 'error');
    }
  }

  // ==========================================
  // ADMIN BACKUPS VIEW
  // ==========================================
  async renderBackupsView() {
    this.stopOverviewPolling();
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="space-y-6 pb-12">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span class="text-xs font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">Admin Management</span>
            <h2 class="text-2xl font-black text-white mt-2 flex items-center gap-2">
              <i data-lucide="archive" class="w-6 h-6 text-indigo-400"></i> Cluster Backups Management
            </h2>
            <p class="text-xs text-slate-400">View and manage all server archives and snapshots across the entire platform</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="admin.renderBackupsView()" class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 transition" title="Refresh">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- Backups Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="glass-card p-4 rounded-2xl border border-white/10">
            <span class="text-[11px] uppercase font-semibold text-slate-400">Total Backups</span>
            <h3 id="adm-backups-total" class="text-2xl font-bold text-white mt-1">0</h3>
          </div>
          <div class="glass-card p-4 rounded-2xl border border-white/10">
            <span class="text-[11px] uppercase font-semibold text-slate-400">Total Archive Storage</span>
            <h3 id="adm-backups-size" class="text-2xl font-bold text-indigo-400 mt-1">0 MB</h3>
          </div>
          <div class="glass-card p-4 rounded-2xl border border-white/10">
            <span class="text-[11px] uppercase font-semibold text-slate-400">Storage Location</span>
            <h3 class="text-sm font-mono font-bold text-slate-200 mt-2 truncate">/backups</h3>
          </div>
        </div>

        <!-- Global Backups Table -->
        <div class="glass-panel rounded-2xl border border-white/10 overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300 min-w-[700px]">
            <thead class="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th class="px-5 py-3">Server</th>
                <th class="px-5 py-3">Backup Name</th>
                <th class="px-5 py-3">Archive File</th>
                <th class="px-5 py-3">Size</th>
                <th class="px-5 py-3">Status</th>
                <th class="px-5 py-3">Created</th>
                <th class="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="admin-backups-tbody" class="divide-y divide-white/5">
              <tr><td colspan="7" class="text-center py-6 text-slate-500">Loading backups...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      const data = await app.api('/api/admin/backups');
      const backups = data.backups || [];
      const summary = data.summary || { count: 0, total_size: 0 };

      const formatBytes = (b) => {
        if (!b || b === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return (b / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
      };

      const elTotal = document.getElementById('adm-backups-total');
      if (elTotal) elTotal.innerText = summary.count || 0;
      const elSize = document.getElementById('adm-backups-size');
      if (elSize) elSize.innerText = formatBytes(summary.total_size);

      const tbody = document.getElementById('admin-backups-tbody');
      if (tbody) {
        if (backups.length === 0) {
          tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500">No backups found across any servers.</td></tr>`;
        } else {
          tbody.innerHTML = backups.map(b => `
            <tr class="hover:bg-white/5 transition">
              <td class="px-5 py-3">
                <a href="#server-manage/${b.server_id}/backups" class="text-cyan-400 hover:underline font-semibold flex items-center gap-1">
                  <i data-lucide="server" class="w-3.5 h-3.5"></i> ${b.server_name || '#' + b.server_id}
                </a>
              </td>
              <td class="px-5 py-3 font-semibold text-white">${b.name}</td>
              <td class="px-5 py-3 font-mono text-[11px] text-slate-400 truncate max-w-xs">${b.file_name}</td>
              <td class="px-5 py-3 font-mono text-slate-200">${formatBytes(b.file_size)}</td>
              <td class="px-5 py-3">
                ${b.is_locked ? '<span class="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-semibold">Locked</span>' : '<span class="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400">Standard</span>'}
              </td>
              <td class="px-5 py-3 text-slate-400">${new Date(b.created_at).toLocaleString()}</td>
              <td class="px-5 py-3 text-right">
                <a href="/api/servers/${b.server_id}/backups/${b.id}/download" download title="Download Backup Archive" class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 inline-block mr-1">
                  <i data-lucide="download" class="w-3.5 h-3.5"></i>
                </a>
              </td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      console.error(err);
      app.toast('Failed to load backups: ' + err.message, 'error');
    }
    if (window.lucide) lucide.createIcons();
  }

  // ==========================================
  // ADMIN AUTO BACKUPS VIEW (autobackups.blueprint)
  // ==========================================
  async renderAutoBackupsView() {
    this.stopOverviewPolling();
    const container = document.getElementById('view-container');
    if (!container) return;

    container.innerHTML = `
      <div class="space-y-6 animate-fade-in pb-12">
        <!-- 1. Header Hero -->
        <div class="glass-panel p-6 rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-blue-950/40 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20 flex items-center gap-1.5">
                <i data-lucide="clock" class="w-3.5 h-3.5"></i> Auto Backup
              </span>
              <span class="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800/80 text-cyan-300 border border-white/10 uppercase">
                v1.0 Blueprint
              </span>
              <span class="text-[10px] text-slate-400 font-mono">by makkmarci13</span>
            </div>
            <h3 class="text-2xl font-black text-white flex items-center gap-2">
              Automatic Backup & Retention Engine
            </h3>
            <p class="text-xs text-slate-300 max-w-2xl">
              Configure daily scheduled snapshots, multi-tiered retention windows (Days / Weeks / Months), and node exclusions across all servers.
            </p>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button type="button" onclick="admin.triggerAutoBackupsRunNow()" id="btn-autobackup-run" class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2">
              <i data-lucide="play" class="w-4 h-4 fill-current"></i> Run Auto Backup Now
            </button>
          </div>
        </div>

        <!-- 2. Status Stats Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="glass-card p-4 rounded-2xl border border-white/10 space-y-2">
            <div class="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>Auto Backups</span>
              <i data-lucide="archive" class="w-4 h-4 text-cyan-400"></i>
            </div>
            <div id="adm-ab-total-backups" class="text-2xl font-black text-white font-mono">...</div>
            <p class="text-[10px] text-slate-400">Total automated snapshots</p>
          </div>

          <div class="glass-card p-4 rounded-2xl border border-white/10 space-y-2">
            <div class="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>Storage Consumed</span>
              <i data-lucide="hard-drive" class="w-4 h-4 text-purple-400"></i>
            </div>
            <div id="adm-ab-total-bytes" class="text-2xl font-black text-purple-400 font-mono">...</div>
            <p class="text-[10px] text-slate-400">Disk space used by auto backups</p>
          </div>

          <div class="glass-card p-4 rounded-2xl border border-white/10 space-y-2">
            <div class="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>Eligible Servers</span>
              <i data-lucide="server" class="w-4 h-4 text-emerald-400"></i>
            </div>
            <div id="adm-ab-servers-count" class="text-2xl font-black text-emerald-400 font-mono">...</div>
            <p class="text-[10px] text-slate-400">Servers targeted by scheduler</p>
          </div>

          <div class="glass-card p-4 rounded-2xl border border-white/10 space-y-2">
            <div class="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>Daily Schedule</span>
              <i data-lucide="clock" class="w-4 h-4 text-amber-400"></i>
            </div>
            <div id="adm-ab-run-time" class="text-2xl font-black text-amber-300 font-mono">...</div>
            <p id="adm-ab-last-run-sub" class="text-[10px] text-slate-400 truncate">Last run: None</p>
          </div>
        </div>

        <!-- 3. Two Column Form and Documentation Layout (Blueprint Layout) -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left: Settings Form (2 Cols) -->
          <div class="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
            <div class="flex items-center justify-between pb-3 border-b border-white/10">
              <h4 class="text-base font-bold text-white flex items-center gap-2">
                <i data-lucide="sliders" class="w-4 h-4 text-cyan-400"></i> Automatic Backup Settings
              </h4>
              <label class="flex items-center gap-2 cursor-pointer">
                <span class="text-xs font-bold text-slate-300">Enabled</span>
                <input type="checkbox" id="adm-ab-enabled" class="toggle-checkbox sr-only peer" checked>
                <div class="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            <form onsubmit="admin.saveAutoBackupsSettings(event)" class="space-y-4">
              <!-- Run At Every Day -->
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <i data-lucide="clock" class="w-3.5 h-3.5 text-cyan-400"></i> Run At Every Day
                </label>
                <input type="time" id="adm-ab-run-at" class="glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono w-full sm:w-64" required>
                <p class="text-[11px] text-slate-400 mt-1">Time of day to execute backup creation and retention cleanup.</p>
              </div>

              <div class="border-t border-white/5 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <!-- Days to Store -->
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1.5">Days to Store</label>
                  <div class="flex items-center gap-2">
                    <input type="number" min="0" max="365" id="adm-ab-days" class="glass-input px-3.5 py-2 rounded-xl text-xs font-mono w-full" required>
                    <span class="text-xs font-semibold text-slate-400 shrink-0">Day(s)</span>
                  </div>
                  <p class="text-[10px] text-slate-400 mt-1">Stores every backup in the last N days.</p>
                </div>

                <!-- Weeks to Store -->
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1.5">Weeks to Store</label>
                  <div class="flex items-center gap-2">
                    <input type="number" min="0" max="104" id="adm-ab-weeks" class="glass-input px-3.5 py-2 rounded-xl text-xs font-mono w-full" required>
                    <span class="text-xs font-semibold text-slate-400 shrink-0">Week(s)</span>
                  </div>
                  <p class="text-[10px] text-slate-400 mt-1">Stores 1st backup of week in last N weeks.</p>
                </div>

                <!-- Months to Store -->
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1.5">Months to Store</label>
                  <div class="flex items-center gap-2">
                    <input type="number" min="0" max="60" id="adm-ab-months" class="glass-input px-3.5 py-2 rounded-xl text-xs font-mono w-full" required>
                    <span class="text-xs font-semibold text-slate-400 shrink-0">Month(s)</span>
                  </div>
                  <p class="text-[10px] text-slate-400 mt-1">Stores 1st backup of month in last N months.</p>
                </div>
              </div>

              <div class="border-t border-white/5 pt-4 space-y-4">
                <!-- Backup Name Format -->
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <i data-lucide="tag" class="w-3.5 h-3.5 text-purple-400"></i> Backup Name Template
                  </label>
                  <input type="text" id="adm-ab-name" class="glass-input px-3.5 py-2 rounded-xl text-xs font-mono w-full" required>
                  <p class="text-[11px] text-slate-400 mt-1">
                    <code class="text-cyan-300 bg-white/5 px-1 rounded font-mono">[DATE]</code> will be dynamically replaced by the current date (e.g. <code>2026-09-17</code>).
                  </p>
                </div>

                <!-- Excluded Nodes -->
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <i data-lucide="network" class="w-3.5 h-3.5 text-amber-400"></i> Excluded Nodes
                  </label>
                  <div id="adm-ab-nodes-list" class="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl bg-black/30 border border-white/10 max-h-48 overflow-y-auto custom-scrollbar">
                    <span class="text-xs text-slate-500 italic">Loading nodes...</span>
                  </div>
                  <p class="text-[11px] text-slate-400 mt-1">Servers allocated on selected nodes will be skipped during auto backup execution.</p>
                </div>
              </div>

              <div class="pt-3 border-t border-white/10 flex justify-end">
                <button type="submit" id="btn-autobackup-save" class="btn-cyber px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2">
                  <i data-lucide="save" class="w-4 h-4"></i> Save Settings
                </button>
              </div>
            </form>
          </div>

          <!-- Right: Help & Policy Card (1 Col) -->
          <div class="space-y-4">
            <div class="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
              <div class="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-white/10 pb-3">
                <i data-lucide="help-circle" class="w-4 h-4"></i> Retention Policy Documentation
              </div>
              <div class="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p>
                  Backup <b class="text-white">creation</b> and <b class="text-white">deletion</b> will be processed automatically every day at the configured schedule time.
                </p>
                <div class="p-3 rounded-2xl bg-slate-900/90 border border-white/5 space-y-2 font-mono text-[11px]">
                  <div><span class="text-cyan-400 font-bold">Days:</span> Keeps every daily backup in the last N days.</div>
                  <div><span class="text-purple-400 font-bold">Weeks:</span> Keeps the 1st backup of the week in the last N weeks (counted before the days).</div>
                  <div><span class="text-amber-400 font-bold">Months:</span> Keeps the 1st backup of the month in the last N months (counted before the weeks).</div>
                </div>
                <div class="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-[11px] space-y-1">
                  <div class="font-bold flex items-center gap-1.5"><i data-lucide="shield-check" class="w-3.5 h-3.5 text-amber-400"></i> Locked Backups Exemption</div>
                  <p>All old automatic backups beyond the retention limits are permanently purged, <b>except locked backups</b>, which are never automatically deleted.</p>
                </div>
              </div>
            </div>

            <!-- Last Run Diagnostics Card -->
            <div class="glass-panel p-5 rounded-3xl border border-white/10 space-y-2">
              <div class="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <i data-lucide="activity" class="w-3.5 h-3.5 text-cyan-400"></i> Engine Status
              </div>
              <div id="adm-ab-last-status-box" class="text-xs font-mono text-slate-200 p-2.5 rounded-xl bg-black/40 border border-white/5">
                Idle
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadAutoBackupsSettings();
  }

  async loadAutoBackupsSettings() {
    try {
      const res = await app.api('/api/admin/extensions/autobackups');
      if (!res.success) throw new Error(res.error || 'Failed to fetch AutoBackups status');

      const { settings, stats, nodes, is_running } = res;

      // Stats
      const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
      setVal('adm-ab-total-backups', stats.total_backups || 0);
      setVal('adm-ab-total-bytes', formatBytes(stats.total_bytes || 0));
      setVal('adm-ab-servers-count', stats.eligible_servers || 0);
      setVal('adm-ab-run-time', settings.run_at || '02:00');

      const lastRunEl = document.getElementById('adm-ab-last-run-sub');
      if (lastRunEl) {
        lastRunEl.innerText = settings.last_run ? `Last run: ${new Date(settings.last_run).toLocaleString()}` : 'Last run: Never';
      }

      const statusBox = document.getElementById('adm-ab-last-status-box');
      if (statusBox) {
        statusBox.innerText = is_running ? 'Running automatic backups now...' : (settings.last_status || 'Idle');
      }

      // Populate form
      const elEnabled = document.getElementById('adm-ab-enabled');
      if (elEnabled) elEnabled.checked = settings.enabled !== false;

      const elRunAt = document.getElementById('adm-ab-run-at');
      if (elRunAt) elRunAt.value = settings.run_at || '02:00';

      const elDays = document.getElementById('adm-ab-days');
      if (elDays) elDays.value = settings.days !== undefined ? settings.days : 7;

      const elWeeks = document.getElementById('adm-ab-weeks');
      if (elWeeks) elWeeks.value = settings.weeks !== undefined ? settings.weeks : 4;

      const elMonths = document.getElementById('adm-ab-months');
      if (elMonths) elMonths.value = settings.months !== undefined ? settings.months : 3;

      const elName = document.getElementById('adm-ab-name');
      if (elName) elName.value = settings.name || 'Automatic Backup [DATE]';

      // Render Excluded Nodes checkboxes
      const nodesContainer = document.getElementById('adm-ab-nodes-list');
      if (nodesContainer) {
        if (!nodes || nodes.length === 0) {
          nodesContainer.innerHTML = `<span class="text-xs text-slate-500">No nodes registered.</span>`;
        } else {
          const excluded = settings.excluded_nodes || [];
          nodesContainer.innerHTML = nodes.map(n => `
            <label class="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 cursor-pointer text-xs text-slate-300">
              <input type="checkbox" name="excluded_node" value="${n.id}" ${excluded.includes(Number(n.id)) ? 'checked' : ''} class="rounded border-slate-700 text-cyan-500 focus:ring-0">
              <span class="font-semibold text-white">${admin.escapeHtml(n.name)}</span>
              <span class="text-[10px] font-mono text-slate-500 ml-auto">#${n.id}</span>
            </label>
          `).join('');
        }
      }
    } catch (err) {
      console.error(err);
      app.toast('Failed to load AutoBackups settings: ' + err.message, 'error');
    }
    if (window.lucide) lucide.createIcons();
  }

  async saveAutoBackupsSettings(e) {
    if (e) e.preventDefault();
    const saveBtn = document.getElementById('btn-autobackup-save');

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full mr-1.5"></span> Saving...`;
      }

      const excluded = [];
      document.querySelectorAll('input[name="excluded_node"]:checked').forEach(cb => {
        excluded.push(Number(cb.value));
      });

      const payload = {
        enabled: document.getElementById('adm-ab-enabled')?.checked,
        run_at: document.getElementById('adm-ab-run-at')?.value.trim() || '02:00',
        days: parseInt(document.getElementById('adm-ab-days')?.value || '7', 10),
        weeks: parseInt(document.getElementById('adm-ab-weeks')?.value || '4', 10),
        months: parseInt(document.getElementById('adm-ab-months')?.value || '3', 10),
        name: document.getElementById('adm-ab-name')?.value.trim() || 'Automatic Backup [DATE]',
        excluded_nodes: excluded
      };

      const res = await app.api('/api/admin/extensions/autobackups', {
        method: 'PUT',
        body: payload
      });

      if (!res.success) throw new Error(res.error || 'Failed to save settings');
      app.toast('AutoBackups settings saved successfully!', 'success');
      await this.loadAutoBackupsSettings();
    } catch (err) {
      app.toast(err.message, 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i data-lucide="save" class="w-4 h-4"></i> Save Settings`;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  async triggerAutoBackupsRunNow() {
    const runBtn = document.getElementById('btn-autobackup-run');
    if (!confirm('Are you sure you want to trigger the automatic backup and retention cycle now across all eligible servers?')) {
      return;
    }

    try {
      if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = `<span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full mr-1.5"></span> Running...`;
      }
      app.toast('Starting automated backup process across servers...', 'info');

      const res = await app.api('/api/admin/extensions/autobackups/run', { method: 'POST' });
      if (!res.success) throw new Error(res.error || 'Failed to run AutoBackups');

      app.toast(`AutoBackups completed! ${res.summary}`, 'success');
      await this.loadAutoBackupsSettings();
    } catch (err) {
      app.toast(err.message, 'error');
    } finally {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.innerHTML = `<i data-lucide="play" class="w-4 h-4 fill-current"></i> Run Auto Backup Now`;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  // ==========================================
  // ADMIN NETWORK VIEW
  // ==========================================
  async renderNetworkView() {
    this.stopOverviewPolling();
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="space-y-6 pb-12">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span class="text-xs font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">Admin Management</span>
            <h2 class="text-2xl font-black text-white mt-2 flex items-center gap-2">
              <i data-lucide="radio" class="w-6 h-6 text-amber-400"></i> Cluster Network & Port Allocations
            </h2>
            <p class="text-xs text-slate-400">Inspect port allocations across all nodes, view bound servers, and manage available ports</p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button onclick="admin.showAddAllocationsModal(1)" class="btn-cyber flex items-center gap-2 text-xs">
              <i data-lucide="plus" class="w-4 h-4"></i> Add Port Range
            </button>
            <button onclick="admin.renderNetworkView()" class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 transition" title="Refresh">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- Node Breakdown Cards -->
        <div id="admin-network-nodes-breakdown" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Populated by API -->
        </div>

        <!-- Filter bar -->
        <div class="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <input type="text" id="admin-network-search" placeholder="Search by IP, port, server..." oninput="admin.filterNetworkAllocations(this.value)" class="glass-input px-3 py-1.5 rounded-xl text-xs w-full sm:w-64">
          </div>
          <div class="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs">
            <button onclick="admin.filterNetworkStatus('all')" id="net-filter-all" class="px-2.5 py-1 rounded-lg font-semibold bg-cyan-500 text-black">All</button>
            <button onclick="admin.filterNetworkStatus('assigned')" id="net-filter-assigned" class="px-2.5 py-1 rounded-lg font-semibold text-slate-400 hover:text-white">Assigned</button>
            <button onclick="admin.filterNetworkStatus('free')" id="net-filter-free" class="px-2.5 py-1 rounded-lg font-semibold text-slate-400 hover:text-white">Free</button>
          </div>
        </div>

        <!-- Allocations Table -->
        <div class="glass-panel rounded-2xl border border-white/10 overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-300 min-w-[650px]">
            <thead class="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th class="px-5 py-3">Node</th>
                <th class="px-5 py-3">IP Address</th>
                <th class="px-5 py-3">Port</th>
                <th class="px-5 py-3">Status</th>
                <th class="px-5 py-3">Assigned Server</th>
                <th class="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="admin-network-tbody" class="divide-y divide-white/5">
              <tr><td colspan="6" class="text-center py-6 text-slate-500">Loading allocations...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      const data = await app.api('/api/admin/network');
      this.cachedAllocations = data.allocations || [];
      const nodes = data.nodes || [];

      // Render Nodes Breakdown
      const nodesEl = document.getElementById('admin-network-nodes-breakdown');
      if (nodesEl) {
        nodesEl.innerHTML = nodes.map(n => {
          const total = n.total_ports || 0;
          const assigned = n.assigned_ports || 0;
          const free = total - assigned;
          const pct = total > 0 ? Math.round((assigned / total) * 100) : 0;
          return `
            <div class="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
              <div class="flex justify-between items-center">
                <h4 class="text-sm font-bold text-white flex items-center gap-2">
                  <i data-lucide="network" class="w-4 h-4 text-cyan-400"></i> ${n.name}
                </h4>
                <span class="text-[11px] font-mono text-slate-400">${n.fqdn}</span>
              </div>
              <div class="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                <div class="bg-gradient-to-r from-cyan-500 to-amber-500 h-2 rounded-full" style="width: ${pct}%"></div>
              </div>
              <div class="flex justify-between text-xs text-slate-400 font-mono pt-1">
                <span>Assigned: <b class="text-amber-400">${assigned}</b></span>
                <span>Free: <b class="text-emerald-400">${free}</b></span>
                <span>Total: <b class="text-white">${total}</b></span>
              </div>
            </div>
          `;
        }).join('');
      }

      this.currentNetworkStatusFilter = 'all';
      this.currentNetworkSearchQuery = '';
      this.renderFilteredNetworkAllocations();
    } catch (err) {
      console.error(err);
      app.toast('Failed to load network allocations: ' + err.message, 'error');
    }
    if (window.lucide) lucide.createIcons();
  }

  filterNetworkStatus(status) {
    this.currentNetworkStatusFilter = status;
    ['all', 'assigned', 'free'].forEach(s => {
      const btn = document.getElementById(`net-filter-${s}`);
      if (btn) {
        if (s === status) {
          btn.className = 'px-2.5 py-1 rounded-lg font-semibold bg-cyan-500 text-black';
        } else {
          btn.className = 'px-2.5 py-1 rounded-lg font-semibold text-slate-400 hover:text-white';
        }
      }
    });
    this.renderFilteredNetworkAllocations();
  }

  filterNetworkAllocations(q) {
    this.currentNetworkSearchQuery = (q || '').toLowerCase();
    this.renderFilteredNetworkAllocations();
  }

  renderFilteredNetworkAllocations() {
    const list = this.cachedAllocations || [];
    const status = this.currentNetworkStatusFilter || 'all';
    const query = this.currentNetworkSearchQuery || '';

    const filtered = list.filter(a => {
      if (status === 'assigned' && !a.assigned) return false;
      if (status === 'free' && a.assigned) return false;
      if (query) {
        const str = `${a.ip} ${a.port} ${a.node_name || ''} ${a.server_name || ''}`.toLowerCase();
        if (!str.includes(query)) return false;
      }
      return true;
    });

    const tbody = document.getElementById('admin-network-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">No matching allocations found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(a => `
      <tr class="hover:bg-white/5 transition">
        <td class="px-5 py-3 font-semibold text-slate-200">${a.node_name || 'Node #' + a.node_id}</td>
        <td class="px-5 py-3 font-mono text-[11px] text-slate-300">${a.ip}</td>
        <td class="px-5 py-3 font-mono font-bold text-white">${a.port}</td>
        <td class="px-5 py-3">
          ${a.assigned ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">ASSIGNED</span>' : '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">AVAILABLE</span>'}
        </td>
        <td class="px-5 py-3">
          ${a.server_name ? `
            <a href="#server-manage/${a.server_id}/console" class="text-cyan-400 hover:underline font-semibold flex items-center gap-1">
              <i data-lucide="server" class="w-3.5 h-3.5"></i> ${a.server_name}
            </a>
          ` : '<span class="text-slate-500">None</span>'}
        </td>
        <td class="px-5 py-3 text-right">
          ${!a.assigned ? `
            <button onclick="admin.deleteAllocation(${a.node_id}, ${a.id})" title="Delete Allocation" class="p-1 rounded bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          ` : ''}
        </td>
      </tr>
    `).join('');
    if (window.lucide) lucide.createIcons();
  }

  showAddAllocationsModal(defaultNodeId = 1) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="radio" class="w-5 h-5 text-amber-400"></i> Add Port Allocations
            </h3>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="text-slate-400 hover:text-white">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <form onsubmit="admin.handleAddAllocationsModalSubmit(event)" class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Target IP Address</label>
              <input type="text" id="modal-alloc-ip" value="127.0.0.1" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono" required>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Start Port</label>
                <input type="number" id="modal-alloc-start" placeholder="25565" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono" required>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">End Port</label>
                <input type="number" id="modal-alloc-end" placeholder="25575" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono" required>
              </div>
            </div>
            <input type="hidden" id="modal-alloc-node-id" value="${defaultNodeId}">
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" onclick="document.getElementById('modal-container').innerHTML=''" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/5">Cancel</button>
              <button type="submit" class="btn-cyber text-xs">Create Ports</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async handleAddAllocationsModalSubmit(e) {
    e.preventDefault();
    const ip = document.getElementById('modal-alloc-ip').value.trim() || '127.0.0.1';
    const startPort = document.getElementById('modal-alloc-start').value.trim();
    const endPort = document.getElementById('modal-alloc-end').value.trim();
    const nodeId = document.getElementById('modal-alloc-node-id').value || 1;

    try {
      const data = await app.api(`/api/admin/nodes/${nodeId}/allocations`, {
        method: 'POST',
        body: JSON.stringify({ ip, startPort, endPort })
      });
      document.getElementById('modal-container').innerHTML = '';
      app.toast(data.message || 'Ports added successfully', 'success');
      this.renderNetworkView();
    } catch (err) {
      app.toast(err.message || 'Failed to add ports', 'error');
    }
  }

  // ==========================================
  // Social Login (Blueprint Extension v1.2.0 Port)
  // ==========================================
  async renderSocialLoginView() {
    this.stopOverviewPolling();
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="flex items-center justify-center py-20 text-slate-400">
        <i data-lucide="loader-2" class="w-8 h-8 animate-spin text-purple-400 mr-3"></i>
        <span>Loading Social Login Configuration...</span>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      const data = await app.api('/api/admin/sociallogin');
      const settings = data.settings || { allow_register: true, allow_connecting: true };
      const providers = data.providers || [];
      const supportedProviders = data.supported_providers || ['discord', 'google', 'github', 'microsoft', 'steam'];

      const currentOrigin = window.location.origin;
      const redirectUri = `${currentOrigin}/api/auth/social/callback`;

      container.innerHTML = `
        <div class="space-y-6 pb-12 max-w-7xl mx-auto">
          <!-- Top Titlebar -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">Blueprint Extension Port</span>
                <span class="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">v1.2.0</span>
              </div>
              <h2 class="text-2xl font-black text-white flex items-center gap-2">
                <i data-lucide="share-2" class="w-6 h-6 text-purple-400"></i> Social Authentication
              </h2>
              <p class="text-xs text-slate-400 mt-1">Configure OAuth2 single sign-on providers and account linking settings</p>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="admin.renderSocialLoginView()" class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-slate-300 transition flex items-center gap-2">
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
                <span>Refresh</span>
              </button>
              <button onclick="admin.openAddSocialProviderModal()" class="btn-cyber-purple px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20">
                <i data-lucide="plus" class="w-4 h-4"></i>
                <span>Add Provider</span>
              </button>
            </div>
          </div>

          <!-- OAuth Redirect URI Banner -->
          <div class="glass-panel p-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 to-purple-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <i data-lucide="link" class="w-4 h-4"></i>
              </div>
              <div>
                <h4 class="text-xs font-bold text-white">Universal OAuth Callback URL</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">Configure this exact Redirect URI in your OAuth app settings (Discord, Google, GitHub, etc.):</p>
                <code class="inline-block mt-1.5 px-2.5 py-1 rounded-lg bg-black/50 border border-white/10 text-xs font-mono text-cyan-300 select-all" id="oauth-redirect-uri-display">${redirectUri}</code>
              </div>
            </div>
            <button onclick="admin.copyRedirectUri('${redirectUri}')" class="shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/15 text-white transition flex items-center gap-1.5 shadow-sm">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              <span>Copy URL</span>
            </button>
          </div>

          <!-- Card 1: Social Settings -->
          <div class="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div class="px-5 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <i data-lucide="sliders" class="w-4 h-4 text-purple-400"></i>
                <h3 class="text-sm font-bold text-white">Social Settings</h3>
              </div>
              <span class="text-[11px] text-slate-400 font-mono">Registration & Connection Policy</span>
            </div>
            <div class="p-5 space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Allow Registrations -->
                <div class="p-4 rounded-xl bg-black/20 border border-white/5 space-y-2">
                  <label class="block text-xs font-bold text-slate-200">User Registrations</label>
                  <select id="setting-social-register" class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs">
                    <option value="1" ${settings.allow_register ? 'selected' : ''}>Allowed (Enabled)</option>
                    <option value="0" ${!settings.allow_register ? 'selected' : ''}>Disallowed (Disabled)</option>
                  </select>
                  <p class="text-[11px] text-slate-400 leading-relaxed">
                    If enabled, unknown users can register and automatically create an account on this panel with their OAuth provider.
                  </p>
                </div>

                <!-- Allow Connecting -->
                <div class="p-4 rounded-xl bg-black/20 border border-white/5 space-y-2">
                  <label class="block text-xs font-bold text-slate-200">Account Connecting</label>
                  <select id="setting-social-connect" class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs">
                    <option value="1" ${settings.allow_connecting ? 'selected' : ''}>Allowed (Enabled)</option>
                    <option value="0" ${!settings.allow_connecting ? 'selected' : ''}>Disallowed (Disabled)</option>
                  </select>
                  <p class="text-[11px] text-slate-400 leading-relaxed">
                    If enabled, users can directly connect their account from the login screen by matching their verified social email address.
                  </p>
                </div>
              </div>

              <div class="flex justify-end pt-2">
                <button onclick="admin.saveSocialSettings()" id="btn-save-social-settings" class="btn-cyber px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                  <i data-lucide="save" class="w-3.5 h-3.5"></i>
                  <span>Save Social Settings</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Card 2: Social Providers Table -->
          <div class="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div class="px-5 py-4 border-b border-white/10 bg-white/[0.02] flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div class="flex items-center gap-2.5">
                <i data-lucide="shield-check" class="w-4 h-4 text-cyan-400"></i>
                <h3 class="text-sm font-bold text-white">Configured Social Providers</h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-slate-300">${providers.length} installed</span>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="admin.openAddSocialProviderModal()" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1.5">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                  <span>Add New</span>
                </button>
                <button onclick="admin.saveSocialProviders()" id="btn-save-all-providers" class="btn-cyber px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md">
                  <i data-lucide="check" class="w-3.5 h-3.5"></i>
                  <span>Save All Changes</span>
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-300">
                <thead class="bg-black/40 text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                  <tr>
                    <th class="px-5 py-3">Provider</th>
                    <th class="px-4 py-3">Display Name</th>
                    <th class="px-4 py-3 text-center">Enabled</th>
                    <th class="px-4 py-3">Client ID</th>
                    <th class="px-4 py-3">
                      <div>Client Secret</div>
                      <div class="text-[10px] text-slate-400 font-normal lowercase">Leave blank to keep existing</div>
                    </th>
                    <th class="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody id="social-providers-tbody" class="divide-y divide-white/5">
                  ${providers.length === 0 ? `
                    <tr>
                      <td colspan="6" class="px-6 py-12 text-center text-slate-400">
                        <div class="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400 mb-3">
                          <i data-lucide="share-2" class="w-6 h-6"></i>
                        </div>
                        <p class="text-sm font-semibold text-slate-300">No social providers configured yet</p>
                        <p class="text-xs text-slate-400 mt-1">Click "Add Provider" above to add Discord, Google, GitHub, or Microsoft OAuth.</p>
                        <button onclick="admin.openAddSocialProviderModal()" class="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg transition">
                          Add First Provider
                        </button>
                      </td>
                    </tr>
                  ` : providers.map(p => {
                    const short = p.short_name.toLowerCase();
                    let iconName = 'share-2';
                    if (short === 'discord') iconName = 'disc';
                    else if (short === 'github') iconName = 'github';
                    else if (short === 'google') iconName = 'chrome';
                    else if (short === 'microsoft') iconName = 'layout-grid';
                    else if (short === 'steam') iconName = 'gamepad-2';
                    else if (short === 'twitch') iconName = 'tv';
                    else if (short === 'reddit') iconName = 'message-circle';
                    else if (short === 'gitlab') iconName = 'code-2';
                    else if (short === 'spotify') iconName = 'music';

                    return `
                      <tr class="hover:bg-white/[0.02] transition" data-provider-row="${p.short_name}">
                        <td class="px-5 py-3.5">
                          <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-200">
                              <i data-lucide="${iconName}" class="w-4 h-4"></i>
                            </div>
                            <div>
                              <span class="font-bold text-white capitalize">${p.short_name}</span>
                              <div class="text-[10px] text-slate-400 font-mono">${p.short_name}</div>
                            </div>
                          </div>
                        </td>
                        <td class="px-4 py-3.5">
                          <input type="text" class="prov-name-input glass-input px-3 py-1.5 rounded-lg text-xs w-36 font-semibold" value="${p.name || p.short_name}">
                        </td>
                        <td class="px-4 py-3.5 text-center">
                          <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="prov-enabled-toggle sr-only peer" ${p.enabled ? 'checked' : ''}>
                            <div class="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                          </label>
                        </td>
                        <td class="px-4 py-3.5">
                          <input type="text" class="prov-client-id-input glass-input px-3 py-1.5 rounded-lg text-xs font-mono w-48 sm:w-60 text-cyan-300" value="${p.client_id || ''}" placeholder="OAuth Client ID">
                        </td>
                        <td class="px-4 py-3.5">
                          <input type="password" class="prov-client-secret-input glass-input px-3 py-1.5 rounded-lg text-xs font-mono w-44 sm:w-56" placeholder="${p.has_secret ? '•••••••••••••••• (Saved)' : 'Enter Client Secret'}">
                        </td>
                        <td class="px-4 py-3.5 text-right">
                          <button onclick="admin.deleteSocialProvider('${p.short_name}', '${p.name || p.short_name}')" class="p-2 rounded-lg text-rose-400 hover:bg-rose-500/20 transition" title="Delete Provider">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div class="px-5 py-4 border-t border-white/10 bg-white/[0.01] flex justify-between items-center">
              <span class="text-[11px] text-slate-400">Remember to click <strong>Save All Changes</strong> after editing rows.</span>
              <div class="flex gap-2">
                <button onclick="admin.openAddSocialProviderModal()" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition flex items-center gap-1.5">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                  <span>Add New</span>
                </button>
                <button onclick="admin.saveSocialProviders()" class="btn-cyber px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md">
                  <i data-lucide="check" class="w-3.5 h-3.5"></i>
                  <span>Save All Changes</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Card 3: Setup Documentation & Guides -->
          <div class="glass-card rounded-2xl border border-white/10 p-5 space-y-4">
            <div class="flex items-center gap-2 text-slate-200">
              <i data-lucide="book-open" class="w-4 h-4 text-indigo-400"></i>
              <h3 class="text-sm font-bold text-white">OAuth Provider Setup Instructions</h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
              <!-- Discord -->
              <div class="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2">
                <div class="flex items-center gap-2 font-bold text-white">
                  <span class="w-2 h-2 rounded-full bg-[#5865F2]"></span>
                  <span>Discord</span>
                </div>
                <ol class="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400">
                  <li>Visit <a href="https://discord.com/developers/applications" target="_blank" class="text-cyan-400 underline">Discord Developer Portal</a></li>
                  <li>Create a <strong>New Application</strong></li>
                  <li>Go to <strong>OAuth2 &rarr; General</strong></li>
                  <li>Add Redirect: <code class="text-[10px] text-indigo-300 break-all">${redirectUri}</code></li>
                  <li>Copy <strong>Client ID</strong> and reset <strong>Client Secret</strong></li>
                </ol>
              </div>

              <!-- Google -->
              <div class="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2">
                <div class="flex items-center gap-2 font-bold text-white">
                  <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Google</span>
                </div>
                <ol class="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400">
                  <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" class="text-cyan-400 underline">Google Cloud Console</a></li>
                  <li>Click <strong>Create Credentials &rarr; OAuth client ID</strong></li>
                  <li>Select <strong>Web application</strong></li>
                  <li>Add Authorized Redirect URI: <code class="text-[10px] text-indigo-300 break-all">${redirectUri}</code></li>
                  <li>Paste generated Client ID and Client Secret</li>
                </ol>
              </div>

              <!-- GitHub -->
              <div class="p-4 rounded-xl bg-black/30 border border-white/5 space-y-2">
                <div class="flex items-center gap-2 font-bold text-white">
                  <span class="w-2 h-2 rounded-full bg-slate-200"></span>
                  <span>GitHub</span>
                </div>
                <ol class="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400">
                  <li>Go to <a href="https://github.com/settings/developers" target="_blank" class="text-cyan-400 underline">GitHub Developer Settings</a></li>
                  <li>Click <strong>OAuth Apps &rarr; New OAuth App</strong></li>
                  <li>Set Homepage URL to <code class="text-[10px] text-indigo-300">${currentOrigin}</code></li>
                  <li>Set Callback URL to <code class="text-[10px] text-indigo-300 break-all">${redirectUri}</code></li>
                  <li>Generate Client Secret and save both here</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      `;

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error('Error rendering social login view:', err);
      container.innerHTML = `
        <div class="p-8 text-center space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <i data-lucide="alert-circle" class="w-6 h-6"></i>
          </div>
          <h3 class="text-lg font-bold text-white">Failed to Load Social Login Configuration</h3>
          <p class="text-xs text-rose-400 max-w-md mx-auto">${err.message || 'An error occurred while connecting to the backend API.'}</p>
          <button onclick="admin.renderSocialLoginView()" class="btn-cyber text-xs px-4 py-2">Retry</button>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  }

  copyRedirectUri(uri) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(uri).then(() => {
        app.toast('Callback URL copied to clipboard!', 'success');
      }).catch(() => {
        prompt('Copy callback URL:', uri);
      });
    } else {
      prompt('Copy callback URL:', uri);
    }
  }

  async saveSocialSettings() {
    const regSelect = document.getElementById('setting-social-register');
    const connectSelect = document.getElementById('setting-social-connect');
    const btn = document.getElementById('btn-save-social-settings');

    if (btn) btn.disabled = true;

    try {
      const allow_register = regSelect ? regSelect.value === '1' : true;
      const allow_connecting = connectSelect ? connectSelect.value === '1' : true;

      const res = await app.api('/api/admin/sociallogin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ allow_register, allow_connecting })
      });

      app.toast(res.message || 'Social settings updated successfully.', 'success');
    } catch (err) {
      app.toast(err.message || 'Failed to save social settings', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async saveSocialProviders() {
    const rows = document.querySelectorAll('tr[data-provider-row]');
    if (!rows.length) {
      app.toast('No providers to update.', 'info');
      return;
    }

    const providers = [];
    rows.forEach(row => {
      const shortName = row.getAttribute('data-provider-row');
      const nameInput = row.querySelector('.prov-name-input');
      const enabledToggle = row.querySelector('.prov-enabled-toggle');
      const clientIdInput = row.querySelector('.prov-client-id-input');
      const clientSecretInput = row.querySelector('.prov-client-secret-input');

      providers.push({
        short_name: shortName,
        name: nameInput ? nameInput.value.trim() : shortName,
        enabled: enabledToggle ? enabledToggle.checked : false,
        client_id: clientIdInput ? clientIdInput.value.trim() : '',
        client_secret: clientSecretInput ? clientSecretInput.value.trim() : ''
      });
    });

    try {
      const res = await app.api('/api/admin/sociallogin/providers/bulk', {
        method: 'POST',
        body: JSON.stringify({ providers })
      });

      app.toast(res.message || 'Providers saved successfully.', 'success');
      this.renderSocialLoginView();
    } catch (err) {
      app.toast(err.message || 'Failed to save providers', 'error');
    }
  }

  openAddSocialProviderModal() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    const supportedList = [
      { id: 'discord', name: 'Discord' },
      { id: 'google', name: 'Google' },
      { id: 'github', name: 'GitHub' },
      { id: 'microsoft', name: 'Microsoft' },
      { id: 'steam', name: 'Steam' },
      { id: 'gitlab', name: 'GitLab' },
      { id: 'twitch', name: 'Twitch' },
      { id: 'reddit', name: 'Reddit' },
      { id: 'spotify', name: 'Spotify' },
      { id: 'apple', name: 'Apple' },
      { id: 'telegram', name: 'Telegram' },
      { id: 'twitter', name: 'Twitter / X' },
      { id: 'paypal', name: 'PayPal' },
      { id: 'dropbox', name: 'Dropbox' }
    ];

    const currentOrigin = window.location.origin;
    const redirectUri = `${currentOrigin}/api/auth/social/callback`;

    modalContainer.innerHTML = `
      <div id="add-social-provider-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <div class="glass-panel w-full max-w-lg p-6 rounded-3xl border border-white/15 shadow-2xl relative space-y-4">
          <div class="flex justify-between items-center border-b border-white/10 pb-3">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <i data-lucide="share-2" class="w-4 h-4"></i>
              </div>
              <h3 class="text-base font-bold text-white">Add New Social Provider</h3>
            </div>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="text-slate-400 hover:text-white transition">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <form onsubmit="admin.submitNewSocialProvider(event)" class="space-y-4 text-xs">
            <div>
              <label class="block font-semibold text-slate-300 mb-1">Provider Short Name</label>
              <select id="modal-prov-short-name" onchange="admin.handleProvSelectChange(this.value)" class="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs" required>
                ${supportedList.map(s => `<option value="${s.id}">${s.name} (${s.id})</option>`).join('')}
              </select>
              <p class="text-[10px] text-slate-400 mt-1">Select from supported Blueprint Socialite providers.</p>
            </div>

            <div>
              <label class="block font-semibold text-slate-300 mb-1">Display Name</label>
              <input type="text" id="modal-prov-name" value="Discord" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" placeholder="e.g. Discord" required>
            </div>

            <div>
              <label class="block font-semibold text-slate-300 mb-1">OAuth Client ID</label>
              <input type="text" id="modal-prov-client-id" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono" placeholder="Provided by the service developer portal" required>
            </div>

            <div>
              <label class="block font-semibold text-slate-300 mb-1">OAuth Client Secret</label>
              <input type="password" id="modal-prov-client-secret" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono" placeholder="Secret token" required>
            </div>

            <div class="flex items-center gap-2 pt-1">
              <input type="checkbox" id="modal-prov-enabled" checked class="rounded border-white/20 bg-slate-900 text-purple-500 focus:ring-0">
              <label for="modal-prov-enabled" class="text-slate-300 font-semibold cursor-pointer">Enable this provider immediately</label>
            </div>

            <div class="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300">
              Please ensure your OAuth application callback URL is set to:<br>
              <code class="font-mono text-[10px] text-cyan-300 select-all font-bold">${redirectUri}</code>
            </div>

            <div class="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button type="button" onclick="document.getElementById('modal-container').innerHTML=''" class="px-4 py-2 rounded-xl text-slate-400 hover:bg-white/5 font-semibold">Cancel</button>
              <button type="submit" class="btn-cyber-purple px-5 py-2 rounded-xl font-bold flex items-center gap-2">
                <i data-lucide="plus" class="w-4 h-4"></i>
                <span>Save Provider</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  handleProvSelectChange(val) {
    const nameInput = document.getElementById('modal-prov-name');
    if (!nameInput) return;
    const names = {
      discord: 'Discord',
      google: 'Google',
      github: 'GitHub',
      microsoft: 'Microsoft',
      steam: 'Steam',
      gitlab: 'GitLab',
      twitch: 'Twitch',
      reddit: 'Reddit',
      spotify: 'Spotify',
      apple: 'Apple',
      telegram: 'Telegram',
      twitter: 'Twitter / X',
      paypal: 'PayPal',
      dropbox: 'Dropbox'
    };
    nameInput.value = names[val] || (val.charAt(0).toUpperCase() + val.slice(1));
  }

  async submitNewSocialProvider(e) {
    e.preventDefault();
    const short_name = document.getElementById('modal-prov-short-name').value.trim();
    const name = document.getElementById('modal-prov-name').value.trim();
    const client_id = document.getElementById('modal-prov-client-id').value.trim();
    const client_secret = document.getElementById('modal-prov-client-secret').value.trim();
    const enabled = document.getElementById('modal-prov-enabled').checked;

    try {
      const res = await app.api('/api/admin/sociallogin/providers', {
        method: 'POST',
        body: JSON.stringify({ short_name, name, client_id, client_secret, enabled })
      });

      document.getElementById('modal-container').innerHTML = '';
      app.toast(res.message || `Provider ${name} added!`, 'success');
      this.renderSocialLoginView();
    } catch (err) {
      app.toast(err.message || 'Failed to add provider', 'error');
    }
  }

  async deleteSocialProvider(shortName, name) {
    if (!confirm(`Are you sure you want to delete the ${name} (${shortName}) provider?\nExisting user connections will also be removed.`)) {
      return;
    }

    try {
      const res = await app.api(`/api/admin/sociallogin/providers/${shortName}`, {
        method: 'DELETE'
      });
      app.toast(res.message || 'Provider deleted successfully.', 'success');
      this.renderSocialLoginView();
    } catch (err) {
      app.toast(err.message || 'Failed to delete provider', 'error');
    }
  }
}

window.admin = new AdminManager();

