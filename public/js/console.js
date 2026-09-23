// Server Management Suite & Interactive Terminal Console (NookTheme Pterodactyl Edition)
class ServerConsole {
  constructor() {
    this.serverId = null;
    this.ws = null;
    this.term = null;
    this.fitAddon = null;
    this.cpuChart = null;
    this.memoryChart = null;
    this.networkChart = null;
    this.serverData = null;
    this.serverStatus = 'offline';
    this.currentUptime = 0;
    this.uptimeInterval = null;
    this.prevRx = null;
    this.prevTx = null;
  }

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatUptime(sec) {
    if (sec === undefined || sec === null || sec < 0) return 'Offline';
    if (sec === 0) return '0s';
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  async renderServerManagementSuite(serverId, subTab = 'console') {
    this.serverId = serverId;
    const container = document.getElementById('view-container');

    container.innerHTML = `
      <div class="space-y-4">
        <!-- NookTheme Server Header Bar -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div class="flex items-center gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2.5">
                <h2 id="srv-header-name" class="text-2xl font-bold text-white tracking-tight leading-tight">Server #${serverId}</h2>
                <div id="srv-header-status-badge" class="px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all shadow-sm bg-rose-500/15 text-rose-400 border-rose-500/30">
                  <span id="srv-header-status-dot" class="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span id="srv-header-status-text">🔴 Offline / Stopped</span>
                </div>
              </div>
              <p id="srv-header-desc" class="text-xs text-slate-400 mt-0.5 font-normal">Node.js Container Instance</p>
            </div>
          </div>

          <!-- Quick Power Action Controls (Start / Restart / Stop) -->
          <div class="flex items-center gap-2" id="srv-power-controls">
            <button id="btn-power-start" onclick="serverConsole.triggerPower(${serverId}, 'start')" class="btn-nook-start transition">
              <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i> Start
            </button>
            <button id="btn-power-restart" onclick="serverConsole.triggerPower(${serverId}, 'restart')" class="btn-nook-restart transition">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Restart
            </button>
            <button id="btn-power-stop" onclick="serverConsole.triggerPower(${serverId}, 'stop')" class="btn-nook-stop transition">
              <i data-lucide="square" class="w-3.5 h-3.5 fill-current"></i> Stop
            </button>
            <button id="btn-power-kill" onclick="serverConsole.triggerPower(${serverId}, 'kill')" title="Force Kill" class="p-2 rounded-lg text-xs font-bold bg-[#212121] hover:bg-rose-950 text-rose-400 border border-white/10 transition">
              <i data-lucide="zap-off" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

        <!-- SAGA Auto Suspension Alert Banner -->
        <div id="srv-suspension-banner" class="hidden p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i data-lucide="alert-triangle" class="w-4 h-4 text-rose-400"></i>
            <span id="srv-suspension-msg">This server has been suspended due to expiration. Power controls are locked.</span>
          </div>
          <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono">SUSPENDED</span>
        </div>

        <!-- Dynamic Subtab Container -->
        <div id="subtab-content-area"></div>
      </div>
    `;

    await this.loadServerHeader(serverId);
    this.switchSubTab(subTab);
    if (window.lucide) lucide.createIcons();
  }

  async loadServerHeader(serverId) {
    try {
      const data = await app.api(`/api/servers/${serverId}`);
      const s = data.server;
      this.serverData = s;

      const nameEl = document.getElementById('srv-header-name');
      if (nameEl) nameEl.innerText = s.name;

      const descEl = document.getElementById('srv-header-desc');
      if (descEl) descEl.innerText = s.description || `${s.server_type.toUpperCase()} Server Instance`;

      const subNameEl = document.getElementById('header-sub-name');
      if (subNameEl) subNameEl.innerText = `Server: ${s.name}`;

      const titleEl = document.getElementById('terminal-server-title');
      if (titleEl) titleEl.innerText = `Terminal - ${s.name}`;

      const addrEl = document.getElementById('stat-addr-val');
      if (addrEl) {
        const addrText = `${s.ip || '127.0.0.1'}:${s.port || 25565}`;
        addrEl.innerText = addrText;
        addrEl.title = addrText;
        addrEl.setAttribute('data-addr', addrText);
        if (addrText.length > 18) {
          addrEl.style.fontSize = '9px';
        } else if (addrText.length > 15) {
          addrEl.style.fontSize = '9.8px';
        } else {
          addrEl.style.fontSize = '10.5px';
        }
      }

      const cpuLimit = (s.cpu_limit !== undefined && s.cpu_limit !== null) ? parseInt(s.cpu_limit, 10) : 100;
      const maxCpuStr = (cpuLimit > 0) ? `${cpuLimit}%` : (cpuLimit === 0 ? '&infin;' : '100%');

      const maxCpuEl = document.getElementById('stat-cpu-max');
      if (maxCpuEl) {
        maxCpuEl.innerHTML = `/ ${maxCpuStr}`;
      }

      const chartCpuMaxEl = document.getElementById('chart-cpu-max');
      if (chartCpuMaxEl) {
        chartCpuMaxEl.innerHTML = `/ ${maxCpuStr}`;
      }

      const maxMemEl = document.getElementById('stat-mem-max');
      if (maxMemEl) {
        const memMb = s.memory_mb || 1024;
        maxMemEl.innerText = `/ ${memMb >= 1024 ? `${(memMb/1024).toFixed(1)} GiB` : `${memMb} MiB`}`;
      }

      const maxDiskEl = document.getElementById('stat-disk-max');
      if (maxDiskEl) {
        const diskMb = s.disk_mb || 5120;
        maxDiskEl.innerText = `/ ${diskMb >= 1024 ? `${(diskMb/1024).toFixed(1)} GiB` : `${diskMb} MiB`}`;
      }

      const banner = document.getElementById('srv-suspension-banner');
      const isSuspended = !!s.is_suspended || s.status === 'suspended';
      if (banner) {
        if (isSuspended) {
          banner.classList.remove('hidden');
          const msg = document.getElementById('srv-suspension-msg');
          if (msg) msg.innerText = `This server is suspended${s.expiration_date ? ' due to expiration on ' + new Date(s.expiration_date).toLocaleString() : ''}. Contact an administrator or renew to unlock.`;
        } else {
          banner.classList.add('hidden');
        }
      }

      this.updateStatusBadge(isSuspended ? 'suspended' : s.status);
    } catch (e) {
      console.error(e);
    }
  }

  getStatusConfig(rawStatus) {
    const s = String(rawStatus || 'offline').toLowerCase().trim();
    if (s === 'running' || s === 'online' || s === 'started') {
      return {
        key: 'running',
        label: '🟢 Online / Started',
        shortLabel: 'Online',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse',
        canStart: false,
        canRestart: true,
        canStop: true,
        canKill: true
      };
    }
    if (s === 'starting') {
      return {
        key: 'starting',
        label: '🔵 Starting',
        shortLabel: 'Starting',
        badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        dotClass: 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-ping',
        canStart: false,
        canRestart: false,
        canStop: true,
        canKill: true
      };
    }
    if (s === 'restarting') {
      return {
        key: 'restarting',
        label: '🟡 Restarting',
        shortLabel: 'Restarting',
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        dotClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse',
        canStart: false,
        canRestart: false,
        canStop: true,
        canKill: true
      };
    }
    if (s === 'stopping') {
      return {
        key: 'stopping',
        label: '⚫ Stopping',
        shortLabel: 'Stopping',
        badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
        dotClass: 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.6)] animate-pulse',
        canStart: false,
        canRestart: false,
        canStop: false,
        canKill: true
      };
    }
    if (s === 'suspended') {
      return {
        key: 'suspended',
        label: '🔒 Suspended',
        shortLabel: 'Suspended',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        dotClass: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
        canStart: false,
        canRestart: false,
        canStop: false,
        canKill: false
      };
    }
    return {
      key: 'offline',
      label: '🔴 Offline / Stopped',
      shortLabel: 'Offline',
      badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      dotClass: 'bg-rose-500',
      canStart: true,
      canRestart: false,
      canStop: false,
      canKill: false
    };
  }

  updateStatusBadge(status) {
    const prevStatus = this.serverStatus;
    this.serverStatus = status;

    const cfg = this.getStatusConfig(status);

    if (prevStatus && prevStatus !== status) {
      if (cfg.key === 'running') {
        app.playSound('online');
      } else if (cfg.key === 'offline') {
        app.playSound('offline');
      }
    }

    // 1. Update Header Status Badge
    const headerBadge = document.getElementById('srv-header-status-badge');
    const headerDot = document.getElementById('srv-header-status-dot');
    const headerText = document.getElementById('srv-header-status-text');
    if (headerBadge && headerDot && headerText) {
      headerBadge.className = `px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all shadow-sm ${cfg.badgeClass}`;
      headerDot.className = `w-2 h-2 rounded-full ${cfg.dotClass}`;
      headerText.innerText = cfg.label;
    }

    // 2. Update Terminal Titlebar Status Badge
    const termBadge = document.getElementById('term-status-badge');
    const termDot = document.getElementById('term-status-dot');
    const termText = document.getElementById('term-status-text');
    if (termBadge && termDot && termText) {
      termBadge.className = `ml-2 px-2.5 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1.5 font-sans transition-all ${cfg.badgeClass}`;
      termDot.className = `w-2 h-2 rounded-full ${cfg.dotClass}`;
      termText.innerText = cfg.label;
    }

    const uptimeIcon = document.getElementById('stat-uptime-icon');
    if (uptimeIcon) {
      uptimeIcon.className = `nook-stat-icon-mini nook-glow-mini-uptime ${cfg.key || ''}`;
    }

    // 3. Update Power Buttons Enable/Disable State
    const isSuspended = this.serverData && (this.serverData.is_suspended || this.serverData.status === 'suspended');
    const btnStart = document.getElementById('btn-power-start');
    const btnRestart = document.getElementById('btn-power-restart');
    const btnStop = document.getElementById('btn-power-stop');
    const btnKill = document.getElementById('btn-power-kill');

    if (btnStart) {
      btnStart.disabled = isSuspended || !cfg.canStart;
      btnStart.classList.toggle('opacity-40', btnStart.disabled);
      btnStart.classList.toggle('cursor-not-allowed', btnStart.disabled);
      btnStart.classList.toggle('pointer-events-none', btnStart.disabled);
    }
    if (btnRestart) {
      btnRestart.disabled = isSuspended || !cfg.canRestart;
      btnRestart.classList.toggle('opacity-40', btnRestart.disabled);
      btnRestart.classList.toggle('cursor-not-allowed', btnRestart.disabled);
      btnRestart.classList.toggle('pointer-events-none', btnRestart.disabled);
    }
    if (btnStop) {
      btnStop.disabled = isSuspended || !cfg.canStop;
      btnStop.classList.toggle('opacity-40', btnStop.disabled);
      btnStop.classList.toggle('cursor-not-allowed', btnStop.disabled);
      btnStop.classList.toggle('pointer-events-none', btnStop.disabled);
    }
    if (btnKill) {
      btnKill.disabled = isSuspended || !cfg.canKill;
      btnKill.classList.toggle('opacity-40', btnKill.disabled);
      btnKill.classList.toggle('cursor-not-allowed', btnKill.disabled);
      btnKill.classList.toggle('pointer-events-none', btnKill.disabled);
    }

    // 4. Update Uptime & Metrics Reset
    const uptimeEl = document.getElementById('stat-uptime-val');
    if (cfg.key === 'offline') {
      if (uptimeEl) uptimeEl.innerText = 'Offline';
      const cpuVal = document.getElementById('stat-cpu-val');
      if (cpuVal) cpuVal.innerText = '0.00%';
      const chartCpu = document.getElementById('chart-cpu-val');
      if (chartCpu) chartCpu.innerText = '0.00%';
      const memVal = document.getElementById('stat-mem-val');
      if (memVal) memVal.innerText = '0 MiB';
      const chartMem = document.getElementById('chart-mem-val');
      if (chartMem) chartMem.innerText = '0 MiB';
      const netInVal = document.getElementById('stat-net-in-val');
      if (netInVal) netInVal.innerText = '0 KiB';
      const netOutVal = document.getElementById('stat-net-out-val');
      if (netOutVal) netOutVal.innerText = '0 KiB';
      const chartNet = document.getElementById('chart-net-val');
      if (chartNet) chartNet.innerText = '0 B/s';

      const cpuPctEl = document.getElementById('stat-cpu-pct');
      if (cpuPctEl) cpuPctEl.innerText = '0.00%';
      const memPctEl = document.getElementById('stat-mem-pct');
      if (memPctEl) memPctEl.innerText = '0.00%';
      const diskPctEl = document.getElementById('stat-disk-pct');
      if (diskPctEl) diskPctEl.innerText = '0.00%';
      const netInPctEl = document.getElementById('stat-net-in-pct');
      if (netInPctEl) netInPctEl.innerText = '0.00%';
      const netOutPctEl = document.getElementById('stat-net-out-pct');
      if (netOutPctEl) netOutPctEl.innerText = '0.00%';

      const barCpu = document.getElementById('bar-cpu');
      if (barCpu) barCpu.style.width = '0%';
      const barMem = document.getElementById('bar-mem');
      if (barMem) barMem.style.width = '0%';
      const barDisk = document.getElementById('bar-disk');
      if (barDisk) barDisk.style.width = '0%';
      const barNetIn = document.getElementById('bar-net-in');
      if (barNetIn) barNetIn.style.width = '0%';
      const barNetOut = document.getElementById('bar-net-out');
      if (barNetOut) barNetOut.style.width = '0%';

      this.currentUptime = 0;
      if (this.uptimeInterval) {
        clearInterval(this.uptimeInterval);
        this.uptimeInterval = null;
      }
    } else if (cfg.key === 'running') {
      if (!this.uptimeInterval) {
        this.uptimeInterval = setInterval(() => {
          this.currentUptime += 1;
          const el = document.getElementById('stat-uptime-val');
          if (el && this.serverStatus === 'running') {
            el.innerText = this.formatUptime(this.currentUptime);
          }
        }, 1000);
      }
    }
  }

  async switchSubTab(tabName) {
    const directMarketplaceMap = {
      'plugins': 'plugin',
      'plugin': 'plugin',
      'mods': 'mod',
      'mod': 'mod',
      'version-changer': 'version-changer',
      'version': 'version-changer'
    };

    // Update left sidebar active tab
    document.querySelectorAll('#server-nav-links .nook-nav-item').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeSidebarLink = document.getElementById(`server-nav-${tabName}`);
    if (activeSidebarLink) {
      activeSidebarLink.classList.add('active');
    }

    if (tabName !== 'console') {
      this.destroyCharts();
    }

    if (directMarketplaceMap[tabName]) {
      const category = directMarketplaceMap[tabName];
      const area = document.getElementById('subtab-content-area');
      if (window.marketplace && area) {
        await marketplace.renderServerMarketplaceTab(area, this.serverId, this.serverData, category);
        await marketplace.switchCategory(category);
      }
      return;
    }

    const area = document.getElementById('subtab-content-area');

    if (tabName !== 'players' && window.playerManager) {
      playerManager.stopLiveAutoSync();
    }

    if (tabName === 'console') {
      this.renderConsoleTab(area);
    } else if (tabName === 'files') {
      fileManager.renderFileManagerTab(area, this.serverId);
    } else if (tabName === 'properties') {
      if (window.serverProperties) serverProperties.renderPropertiesTab(area, this.serverId);
    } else if (tabName === 'players') {
      if (window.playerManager) playerManager.renderPlayerManagerTab(area, this.serverId, this.serverData);
    } else if (tabName === 'importer') {
      if (window.serverImporter) serverImporter.renderImporterTab(area, this.serverId);
    } else if (tabName === 'splitter') {
      if (window.serverSplitter) serverSplitter.renderSplitterTab(area, this.serverId);
    } else if (tabName === 'worlds') {
      if (window.worldManager) worldManager.renderWorldManagerTab(area, this.serverId);
    } else if (tabName === 'marketplace') {
      this.renderMarketplaceTab(area);
    } else if (tabName === 'databases') {
      this.renderDatabasesTab(area);
    } else if (tabName === 'network') {
      this.renderNetworkTab(area);
    } else if (tabName === 'backups') {
      this.renderBackupsTab(area);
    } else if (tabName === 'schedules') {
      this.renderSchedulesTab(area);
    } else if (tabName === 'startup') {
      this.renderStartupTab(area);
    } else if (tabName === 'subusers') {
      this.renderSubusersTab(area);
    } else if (tabName === 'settings') {
      this.renderSettingsTab(area);
    } else if (tabName === 'activity') {
      this.renderActivityTab(area);
    }

    if (window.lucide) lucide.createIcons();
  }

  // Render NookTheme Console Tab
  renderConsoleTab(container) {
    const s = this.serverData || {};
    const maxMemStr = s.memory_mb ? (s.memory_mb >= 1024 ? `${(s.memory_mb/1024).toFixed(1)} GiB` : `${s.memory_mb} MiB`) : '1 GiB';
    const maxDiskStr = s.disk_mb ? (s.disk_mb >= 1024 ? `${(s.disk_mb/1024).toFixed(1)} GiB` : `${s.disk_mb} MiB`) : '5 GiB';
    const cpuLimit = (s.cpu_limit !== undefined && s.cpu_limit !== null) ? parseInt(s.cpu_limit, 10) : 100;
    const maxCpuStr = (cpuLimit > 0) ? `${cpuLimit}%` : (cpuLimit === 0 ? '&infin;' : '100%');

    container.innerHTML = `
      <div class="space-y-4">
        <!-- Top Row: Terminal (3 cols) + 7 Stat Cards (1 col) -->
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <!-- Terminal Window (Col 1-3) -->
          <div class="lg:col-span-3 flex flex-col">
            <div class="nook-terminal-box flex-1 flex flex-col min-h-[460px]">
              <!-- Terminal Titlebar with Auto Size & Font Controls -->
              <div class="px-4 py-2 bg-[#12141a] border-b border-white/5 flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span id="terminal-server-title" class="font-mono text-[11px] text-slate-400 ml-2 truncate max-w-[140px] sm:max-w-none">Terminal - ${s.name || 'server'}</span>
                  <div id="term-status-badge" class="ml-2 px-2.5 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1.5 font-sans transition-all bg-rose-500/15 text-rose-400 border-rose-500/30">
                    <span id="term-status-dot" class="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span id="term-status-text">🔴 Offline / Stopped</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                  <!-- Auto Fit button -->
                  <button type="button" onclick="serverConsole.autoFitTerminal()" title="Auto Fit Terminal to Container" class="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 hover:text-cyan-400 flex items-center gap-1 border border-white/5 transition">
                    <i data-lucide="maximize-2" class="w-3 h-3 text-cyan-400"></i>
                    <span class="hidden sm:inline font-medium">Auto Fit</span>
                  </button>
                  <!-- Text Size Controls (A- / Presets / A+) -->
                  <div class="flex items-center bg-black/40 rounded-lg border border-white/10 px-1 py-0.5 text-[11px]">
                    <button type="button" onclick="serverConsole.changeTerminalFontSize(-1)" title="Smaller text (A-)" class="px-1.5 py-0.5 text-slate-400 hover:text-white font-mono font-bold hover:bg-white/10 rounded transition">A-</button>
                    <select id="term-font-select" onchange="serverConsole.onFontSizeSelect(this.value)" class="bg-transparent text-slate-200 text-[11px] font-mono border-none focus:ring-0 cursor-pointer px-1.5 py-0.5">
                      <option value="10" class="bg-slate-900 text-white">10px</option>
                      <option value="11" class="bg-slate-900 text-white">11px</option>
                      <option value="12" class="bg-slate-900 text-white">12px (Default)</option>
                      <option value="13" class="bg-slate-900 text-white">13px</option>
                      <option value="14" class="bg-slate-900 text-white">14px</option>
                      <option value="16" class="bg-slate-900 text-white">16px</option>
                      <option value="18" class="bg-slate-900 text-white">18px</option>
                      <option value="custom" class="bg-slate-900 text-white">Custom...</option>
                    </select>
                    <button type="button" onclick="serverConsole.changeTerminalFontSize(1)" title="Larger text (A+)" class="px-1.5 py-0.5 text-slate-400 hover:text-white font-mono font-bold hover:bg-white/10 rounded transition">A+</button>
                  </div>
                  <!-- Clear Console -->
                  <button type="button" onclick="serverConsole.clearTerminal()" title="Clear Console Screen" class="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 border border-white/5 transition">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>
                    <span class="hidden sm:inline">Clear</span>
                  </button>
                </div>
              </div>

              <!-- xterm.js Container -->
              <div id="terminal-container" class="flex-1 p-2 bg-[#0b0d12]"></div>

              <!-- NookTheme Command Input Prompt: >> Type a command... -->
              <form onsubmit="serverConsole.handleSendCommand(event)" class="nook-terminal-prompt-bar">
                <span class="text-slate-500 font-mono font-bold select-none text-sm">&gt;&gt;</span>
                <input type="text" id="console-cmd-input" placeholder="Type a command..." class="nook-terminal-input" autocomplete="off" spellcheck="false">
              </form>
            </div>
          </div>

          <!-- 5 Parsentbar Stat Cards + Address & Uptime (Col 4) -->
          <div class="space-y-2.5 flex flex-col justify-between">
            <!-- Top Row: Address & Uptime Tiles -->
            <div class="grid grid-cols-[1.65fr_1fr] gap-2">
              <!-- 1. Address -->
              <div class="nook-stat-card-mini cursor-pointer group" onclick="app.copyToClipboard(document.getElementById('stat-addr-val').getAttribute('data-addr') || document.getElementById('stat-addr-val').innerText)" title="Click to copy address: ${s.ip || '127.0.0.1'}:${s.port || 25565}">
                <div class="nook-stat-icon-mini nook-glow-mini-addr">
                  <i data-lucide="wifi" class="w-3.5 h-3.5"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between">
                    <p class="nook-stat-title-mini">Address</p>
                    <i data-lucide="copy" class="w-2.5 h-2.5 text-slate-500 group-hover:text-cyan-400 transition opacity-0 group-hover:opacity-100 mr-0.5"></i>
                  </div>
                  <p id="stat-addr-val" data-addr="${s.ip || '127.0.0.1'}:${s.port || 25565}" class="nook-stat-value-mini font-mono" title="${s.ip || '127.0.0.1'}:${s.port || 25565}">${s.ip || '127.0.0.1'}:${s.port || 25565}</p>
                </div>
              </div>

              <!-- 2. Uptime -->
              <div class="nook-stat-card-mini">
                <div id="stat-uptime-icon" class="nook-stat-icon-mini nook-glow-mini-uptime">
                  <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="nook-stat-title-mini">Uptime</p>
                  <p id="stat-uptime-val" class="nook-stat-value-mini">Offline</p>
                </div>
              </div>
            </div>

            <!-- 1. CPU Load Card -->
            <div class="nook-parsent-card">
              <div class="nook-parsent-icon nook-glow-cpu">
                <i data-lucide="cpu" class="w-5 h-5"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="nook-parsent-title">CPU Load</p>
                <div class="flex items-baseline justify-between gap-2 mt-0.5">
                  <div class="nook-parsent-val">
                    <span id="stat-cpu-val">0.00%</span>
                    <span id="stat-cpu-max" class="text-slate-500 text-[11px] font-normal font-sans">/ ${maxCpuStr}</span>
                  </div>
                  <span id="stat-cpu-pct" class="nook-parsent-pct text-sky-400">0.00%</span>
                </div>
                <div class="nook-parsent-track">
                  <div id="bar-cpu" class="nook-parsent-bar nook-bar-cpu" style="width: 0%;"></div>
                </div>
              </div>
            </div>

            <!-- 2. Memory Card -->
            <div class="nook-parsent-card">
              <div class="nook-parsent-icon nook-glow-mem">
                <i data-lucide="activity" class="w-5 h-5"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="nook-parsent-title">Memory</p>
                <div class="flex items-baseline justify-between gap-2 mt-0.5">
                  <div class="nook-parsent-val">
                    <span id="stat-mem-val">0 MiB</span>
                    <span id="stat-mem-max" class="text-slate-500 text-[11px] font-normal font-sans">/ ${maxMemStr}</span>
                  </div>
                  <span id="stat-mem-pct" class="nook-parsent-pct text-purple-400">0.00%</span>
                </div>
                <div class="nook-parsent-track">
                  <div id="bar-mem" class="nook-parsent-bar nook-bar-mem" style="width: 0%;"></div>
                </div>
              </div>
            </div>

            <!-- 3. Disk Card -->
            <div class="nook-parsent-card">
              <div class="nook-parsent-icon nook-glow-disk">
                <i data-lucide="hard-drive" class="w-5 h-5"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="nook-parsent-title">Disk</p>
                <div class="flex items-baseline justify-between gap-2 mt-0.5">
                  <div class="nook-parsent-val">
                    <span id="stat-disk-val">0 MiB</span>
                    <span id="stat-disk-max" class="text-slate-500 text-[11px] font-normal font-sans">/ ${maxDiskStr}</span>
                  </div>
                  <span id="stat-disk-pct" class="nook-parsent-pct text-amber-400">0.00%</span>
                </div>
                <div class="nook-parsent-track">
                  <div id="bar-disk" class="nook-parsent-bar nook-bar-disk" style="width: 0%;"></div>
                </div>
              </div>
            </div>

            <!-- 4. Network (Inbound) Card -->
            <div class="nook-parsent-card">
              <div class="nook-parsent-icon nook-glow-netin">
                <i data-lucide="cloud-download" class="w-5 h-5"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="nook-parsent-title">Network (Inbound)</p>
                <div class="flex items-baseline justify-between gap-2 mt-0.5">
                  <div class="nook-parsent-val">
                    <span id="stat-net-in-val">0 KiB</span>
                  </div>
                  <span id="stat-net-in-pct" class="nook-parsent-pct text-emerald-400">0.00%</span>
                </div>
                <div class="nook-parsent-track">
                  <div id="bar-net-in" class="nook-parsent-bar nook-bar-netin" style="width: 0%;"></div>
                </div>
              </div>
            </div>

            <!-- 5. Network (Outbound) Card -->
            <div class="nook-parsent-card">
              <div class="nook-parsent-icon nook-glow-netout">
                <i data-lucide="cloud-upload" class="w-5 h-5"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="nook-parsent-title">Network (Outbound)</p>
                <div class="flex items-baseline justify-between gap-2 mt-0.5">
                  <div class="nook-parsent-val">
                    <span id="stat-net-out-val">0 KiB</span>
                  </div>
                  <span id="stat-net-out-pct" class="nook-parsent-pct text-rose-400">0.00%</span>
                </div>
                <div class="nook-parsent-track">
                  <div id="bar-net-out" class="nook-parsent-bar nook-bar-netout" style="width: 0%;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Row: 3 Real-time Chart.js graphs -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- 1. CPU Load Graph -->
          <div class="nook-chart-card">
            <div class="flex justify-between items-center mb-2">
              <span class="text-xs font-semibold text-slate-300">CPU Load</span>
              <div class="flex items-center gap-1 font-mono">
                <span id="chart-cpu-val" class="text-xs font-bold text-cyan-400">0.00%</span>
                <span id="chart-cpu-max" class="text-[10px] text-slate-500 font-normal">/ ${maxCpuStr}</span>
              </div>
            </div>
            <div class="h-28 w-full relative">
              <canvas id="nook-cpu-chart"></canvas>
            </div>
          </div>

          <!-- 2. Memory Graph -->
          <div class="nook-chart-card">
            <div class="flex justify-between items-center mb-2">
              <span class="text-xs font-semibold text-slate-300">Memory</span>
              <span id="chart-mem-val" class="text-xs font-mono font-bold text-sky-400">0 MiB</span>
            </div>
            <div class="h-28 w-full relative">
              <canvas id="nook-mem-chart"></canvas>
            </div>
          </div>

          <!-- 3. Network Graph -->
          <div class="nook-chart-card">
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-slate-300">Network</span>
                <div class="flex items-center gap-1.5 ml-1">
                  <span title="Inbound" class="text-orange-400"><i data-lucide="cloud-download" class="w-3.5 h-3.5"></i></span>
                  <span title="Outbound" class="text-red-400"><i data-lucide="cloud-upload" class="w-3.5 h-3.5"></i></span>
                </div>
              </div>
              <span id="chart-net-val" class="text-xs font-mono font-bold text-slate-300">0 B/s</span>
            </div>
            <div class="h-28 w-full relative">
              <canvas id="nook-net-chart"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    this.initTerminal();
    this.initCharts();
    this.connectWebSocket();
    this.updateStatusBadge(this.serverStatus || (this.serverData ? this.serverData.status : 'offline'));
    if (window.lucide) lucide.createIcons();
  }

  initTerminal() {
    if (this.term) {
      try { this.term.dispose(); } catch (e) {}
    }

    const termContainer = document.getElementById('terminal-container');
    if (!termContainer) return;

    const savedFontSize = parseInt(localStorage.getItem('mpanel_term_fontsize') || '12', 10);

    this.term = new Terminal({
      theme: {
        background: '#0b0d12',
        foreground: '#e6edf3',
        cursor: '#38bdf8',
        selectionBackground: 'rgba(56, 189, 248, 0.3)',
        black: '#0b0d12',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#f1f5f9'
      },
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: savedFontSize,
      lineHeight: 1.25,
      cursorBlink: true,
      convertEol: true,
      disableStdin: true
    });

    this.fitAddon = new FitAddon.FitAddon();
    this.term.loadAddon(this.fitAddon);
    this.term.open(termContainer);
    setTimeout(() => {
      if (this.fitAddon) this.fitAddon.fit();
    }, 50);

    window.addEventListener('resize', () => {
      if (this.fitAddon) this.fitAddon.fit();
    });

    const select = document.getElementById('term-font-select');
    if (select) {
      const match = Array.from(select.options).find(o => o.value === savedFontSize.toString());
      if (match) select.value = savedFontSize.toString();
      else select.value = 'custom';
    }
  }

  autoFitTerminal() {
    if (this.fitAddon && this.term) {
      try {
        this.fitAddon.fit();
        app.showToast('Terminal auto-fitted', 'info');
      } catch (e) {
        console.warn('Auto fit error:', e);
      }
    }
  }

  setTerminalFontSize(size, save = true) {
    const s = Math.min(28, Math.max(9, parseInt(size, 10) || 12));
    if (this.term) {
      this.term.options.fontSize = s;
      if (this.fitAddon) {
        setTimeout(() => {
          try { this.fitAddon.fit(); } catch (e) {}
        }, 30);
      }
    }
    if (save) {
      localStorage.setItem('mpanel_term_fontsize', s.toString());
    }
    const select = document.getElementById('term-font-select');
    if (select) {
      const match = Array.from(select.options).find(o => o.value === s.toString());
      if (match) {
        select.value = s.toString();
      } else {
        select.value = 'custom';
      }
    }
  }

  changeTerminalFontSize(delta) {
    const current = parseInt(localStorage.getItem('mpanel_term_fontsize') || (this.term ? this.term.options.fontSize : 12), 10) || 12;
    const next = Math.min(28, Math.max(9, current + delta));
    this.setTerminalFontSize(next, true);
    app.showToast(`Font size: ${next}px`, 'info');
  }

  onFontSizeSelect(val) {
    if (val === 'custom') {
      const current = localStorage.getItem('mpanel_term_fontsize') || '12';
      const customVal = prompt('Enter custom terminal font size (9 - 28 px):', current);
      if (customVal) {
        const num = parseInt(customVal, 10);
        if (!isNaN(num) && num >= 9 && num <= 28) {
          this.setTerminalFontSize(num, true);
          app.showToast(`Custom font size set to ${num}px`, 'success');
        } else {
          app.showToast('Font size must be between 9 and 28 px', 'error');
        }
      } else {
        // Reset select back to current value
        this.setTerminalFontSize(parseInt(current, 10), false);
      }
    } else {
      this.setTerminalFontSize(parseInt(val, 10), true);
    }
  }

  initCharts() {
    this.destroyCharts();

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          backgroundColor: '#1e2026',
          titleColor: '#94a3b8',
          bodyColor: '#ffffff',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          display: false,
          grid: { display: false }
        },
        y: {
          display: true,
          position: 'right',
          grid: {
            color: 'rgba(255, 255, 255, 0.04)',
            drawBorder: false
          },
          ticks: {
            color: '#64748b',
            font: { size: 10, family: 'monospace' },
            maxTicksLimit: 4
          }
        }
      }
    };

    const emptyLabels = Array(20).fill('');

    // 1. CPU Chart
    const cpuCanvas = document.getElementById('nook-cpu-chart');
    if (cpuCanvas) {
      const ctx = cpuCanvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 110);
      grad.addColorStop(0, 'rgba(34, 211, 238, 0.25)');
      grad.addColorStop(1, 'rgba(34, 211, 238, 0.0)');

      this.cpuChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [...emptyLabels],
          datasets: [{
            data: Array(20).fill(0),
            borderColor: '#22d3ee',
            borderWidth: 2,
            backgroundColor: grad,
            fill: true,
            tension: 0.4,
            pointRadius: 0
          }]
        },
        options: {
          ...commonOptions,
          scales: {
            ...commonOptions.scales,
            y: {
              ...commonOptions.scales.y,
              suggestedMin: 0,
              suggestedMax: (this.serverData?.cpu_limit && this.serverData.cpu_limit > 0) ? this.serverData.cpu_limit : 100,
              ticks: {
                ...commonOptions.scales.y.ticks,
                callback: v => `${Math.round(v)}%`
              }
            }
          }
        }
      });
    }

    // 2. Memory Chart
    const memCanvas = document.getElementById('nook-mem-chart');
    if (memCanvas) {
      const ctx = memCanvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 110);
      grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
      grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

      this.memoryChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [...emptyLabels],
          datasets: [{
            data: Array(20).fill(0),
            borderColor: '#38bdf8',
            borderWidth: 2,
            backgroundColor: grad,
            fill: true,
            tension: 0.4,
            pointRadius: 0
          }]
        },
        options: {
          ...commonOptions,
          scales: {
            ...commonOptions.scales,
            y: {
              ...commonOptions.scales.y,
              ticks: {
                ...commonOptions.scales.y.ticks,
                callback: v => `${Math.round(v)}M`
              }
            }
          }
        }
      });
    }

    // 3. Network Chart (Inbound & Outbound)
    const netCanvas = document.getElementById('nook-net-chart');
    if (netCanvas) {
      const ctx = netCanvas.getContext('2d');
      const gradIn = ctx.createLinearGradient(0, 0, 0, 110);
      gradIn.addColorStop(0, 'rgba(251, 146, 60, 0.25)');
      gradIn.addColorStop(1, 'rgba(251, 146, 60, 0.0)');

      const gradOut = ctx.createLinearGradient(0, 0, 0, 110);
      gradOut.addColorStop(0, 'rgba(248, 113, 113, 0.25)');
      gradOut.addColorStop(1, 'rgba(248, 113, 113, 0.0)');

      this.networkChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [...emptyLabels],
          datasets: [
            {
              label: 'Inbound',
              data: Array(20).fill(0),
              borderColor: '#fb923c',
              borderWidth: 2,
              backgroundColor: gradIn,
              fill: true,
              tension: 0.4,
              pointRadius: 0
            },
            {
              label: 'Outbound',
              data: Array(20).fill(0),
              borderColor: '#f87171',
              borderWidth: 2,
              backgroundColor: gradOut,
              fill: true,
              tension: 0.4,
              pointRadius: 0
            }
          ]
        },
        options: {
          ...commonOptions,
          scales: {
            ...commonOptions.scales,
            y: {
              ...commonOptions.scales.y,
              ticks: {
                ...commonOptions.scales.y.ticks,
                callback: v => serverConsole.formatBytes(v)
              }
            }
          }
        }
      });
    }
  }

  destroyCharts() {
    if (this.cpuChart) {
      try { this.cpuChart.destroy(); } catch (e) {}
      this.cpuChart = null;
    }
    if (this.memoryChart) {
      try { this.memoryChart.destroy(); } catch (e) {}
      this.memoryChart = null;
    }
    if (this.networkChart) {
      try { this.networkChart.destroy(); } catch (e) {}
      this.networkChart = null;
    }
  }

  connectWebSocket() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/servers/${this.serverId}/console?token=${app.token}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      if (this.term) {
        this.term.writeln('\x1b[32m[Mpanel]\x1b[0m Connected to server live stream.');
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'history' || msg.type === 'console') {
          if (this.term && msg.data) {
            this.term.write(msg.data);
          }
        } else if (msg.type === 'status') {
          this.updateStatusBadge(msg.status);
          if (msg.stats) this.updateStatsUI(msg.stats);
        } else if (msg.type === 'stats') {
          this.updateStatsUI(msg.stats);
          if (msg.stats && msg.stats.status && msg.stats.status !== this.serverStatus) {
            this.updateStatusBadge(msg.stats.status);
          }
        } else if (msg.type === 'error') {
          app.toast(msg.message, 'error');
        }
      } catch (err) {
        if (this.term) this.term.write(event.data);
      }
    };

    this.ws.onclose = () => {
      if (this.term) {
        this.term.writeln('\r\n\x1b[33m[Mpanel]\x1b[0m Disconnected from server stream.');
      }
    };
  }

  clearTerminal() {
    if (this.term) this.term.clear();
  }

  updateStatsUI(stats) {
    if (!stats) return;

    if (stats.uptime !== undefined && stats.uptime !== null) {
      this.currentUptime = stats.uptime;
      const uptimeEl = document.getElementById('stat-uptime-val');
      if (uptimeEl) {
        uptimeEl.innerText = this.serverStatus === 'offline' ? 'Offline' : this.formatUptime(stats.uptime);
      }
    }

    // 1. CPU Load
    const isOffline = this.serverStatus === 'offline';
    const s = this.serverData || {};

    const cpu = (!isOffline && typeof stats.cpu === 'number') ? stats.cpu : 0;
    const cpuLimit = (s.cpu_limit !== undefined && s.cpu_limit !== null && s.cpu_limit > 0) ? parseInt(s.cpu_limit, 10) : 100;
    const cpuPct = isOffline ? 0 : Math.min(100, Math.max(0, (cpu / cpuLimit) * 100));

    const cpuVal = document.getElementById('stat-cpu-val');
    if (cpuVal) cpuVal.innerText = `${cpu.toFixed(2)}%`;
    const cpuPctEl = document.getElementById('stat-cpu-pct');
    if (cpuPctEl) cpuPctEl.innerText = `${cpu.toFixed(2)}%`;
    const barCpu = document.getElementById('bar-cpu');
    if (barCpu) barCpu.style.width = `${cpuPct.toFixed(1)}%`;

    const chartCpu = document.getElementById('chart-cpu-val');
    if (chartCpu) chartCpu.innerText = `${cpu.toFixed(2)}%`;

    if (this.cpuChart) {
      this.cpuChart.data.datasets[0].data.shift();
      this.cpuChart.data.datasets[0].data.push(cpu);
      this.cpuChart.update('none');
    }

    // 2. Memory
    const mem = (!isOffline && typeof stats.memory === 'number') ? stats.memory : 0;
    const maxMem = (s.memory_mb && s.memory_mb > 0) ? s.memory_mb : 1024;
    const memPct = isOffline ? 0 : Math.min(100, Math.max(0, (mem / maxMem) * 100));

    const memVal = document.getElementById('stat-mem-val');
    if (memVal) {
      memVal.innerText = mem >= 1024 ? `${(mem / 1024).toFixed(2)} GiB` : `${mem.toFixed(0)} MiB`;
    }
    const memPctEl = document.getElementById('stat-mem-pct');
    if (memPctEl) memPctEl.innerText = `${memPct.toFixed(2)}%`;
    const barMem = document.getElementById('bar-mem');
    if (barMem) barMem.style.width = `${memPct.toFixed(1)}%`;

    const chartMem = document.getElementById('chart-mem-val');
    if (chartMem) chartMem.innerText = `${mem} MiB`;

    if (this.memoryChart) {
      this.memoryChart.data.datasets[0].data.shift();
      this.memoryChart.data.datasets[0].data.push(mem);
      this.memoryChart.update('none');
    }

    // 3. Disk
    const disk = (!isOffline && typeof stats.disk === 'number') ? stats.disk : 0;
    const maxDisk = (s.disk_mb && s.disk_mb > 0) ? s.disk_mb : 5120;
    const diskPct = isOffline ? 0 : Math.min(100, Math.max(0, (disk / maxDisk) * 100));

    const diskVal = document.getElementById('stat-disk-val');
    if (diskVal) {
      diskVal.innerText = disk >= 1024 ? `${(disk / 1024).toFixed(2)} GiB` : `${disk.toFixed(0)} MiB`;
    }
    const diskPctEl = document.getElementById('stat-disk-pct');
    if (diskPctEl) diskPctEl.innerText = `${diskPct.toFixed(2)}%`;
    const barDisk = document.getElementById('bar-disk');
    if (barDisk) barDisk.style.width = `${diskPct.toFixed(1)}%`;

    // 4. Network
    if (stats.network) {
      const rx = isOffline ? 0 : (stats.network.rx_bytes || 0);
      const tx = isOffline ? 0 : (stats.network.tx_bytes || 0);

      const inEl = document.getElementById('stat-net-in-val');
      if (inEl) inEl.innerText = this.formatBytes(rx);

      const outEl = document.getElementById('stat-net-out-val');
      if (outEl) outEl.innerText = this.formatBytes(tx);

      // Smooth percentage calculation for network cards
      const netBaseIn = 100 * 1024 * 1024;
      const netBaseOut = 50 * 1024 * 1024;
      const netInPct = isOffline ? 0 : Math.min(100, Math.max(0.5, ((rx % netBaseIn) / netBaseIn) * 100));
      const netOutPct = isOffline ? 0 : Math.min(100, Math.max(0.5, ((tx % netBaseOut) / netBaseOut) * 100));

      const netInPctEl = document.getElementById('stat-net-in-pct');
      if (netInPctEl) netInPctEl.innerText = `${netInPct.toFixed(2)}%`;
      const barNetIn = document.getElementById('bar-net-in');
      if (barNetIn) barNetIn.style.width = `${netInPct.toFixed(1)}%`;

      const netOutPctEl = document.getElementById('stat-net-out-pct');
      if (netOutPctEl) netOutPctEl.innerText = `${netOutPct.toFixed(2)}%`;
      const barNetOut = document.getElementById('bar-net-out');
      if (barNetOut) barNetOut.style.width = `${netOutPct.toFixed(1)}%`;

      const inSpeed = this.prevRx !== null ? Math.max(0, rx - this.prevRx) : 2048;
      const outSpeed = this.prevTx !== null ? Math.max(0, tx - this.prevTx) : 1024;
      this.prevRx = rx;
      this.prevTx = tx;

      const chartNet = document.getElementById('chart-net-val');
      if (chartNet) chartNet.innerText = `${this.formatBytes(inSpeed + outSpeed)}/s`;

      if (this.networkChart) {
        this.networkChart.data.datasets[0].data.shift();
        this.networkChart.data.datasets[0].data.push(inSpeed);
        this.networkChart.data.datasets[1].data.shift();
        this.networkChart.data.datasets[1].data.push(outSpeed);
        this.networkChart.update('none');
      }
    }
  }

  handleSendCommand(e) {
    e.preventDefault();
    const input = document.getElementById('console-cmd-input');
    const cmd = input.value.trim();
    if (!cmd) return;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'command', command: cmd }));
      input.value = '';
    } else {
      app.toast('Terminal is not connected.', 'error');
    }
  }

  async triggerPower(serverId, action) {
    if (this.serverData && (this.serverData.is_suspended || this.serverData.status === 'suspended') && (action === 'start' || action === 'restart')) {
      app.toast('Cannot start: Server is suspended due to expiration.', 'error');
      return;
    }

    const previousStatus = this.serverStatus;

    // Instant optimistic UI update for zero lag
    if (action === 'start') {
      this.updateStatusBadge('starting');
    } else if (action === 'restart') {
      this.updateStatusBadge('restarting');
    } else if (action === 'stop') {
      this.updateStatusBadge('stopping');
    } else if (action === 'kill') {
      this.updateStatusBadge('offline');
    }

    try {
      app.toast(`Sending ${action.toUpperCase()} signal...`, 'info');
      const data = await app.api(`/api/servers/${serverId}/power`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });

      if (data.success) {
        app.toast(`Server power signal "${action}" executed.`, 'success');
        this.loadServerHeader(serverId);
      }
    } catch (err) {
      this.updateStatusBadge(previousStatus);
      app.toast(err.message, 'error');
    }
  }

  // Render Marketplace Tab
  async renderMarketplaceTab(container, category = null) {
    if (window.marketplace) {
      await marketplace.renderServerMarketplaceTab(container, this.serverId, this.serverData, category);
    }
  }

  // Render Version Changer Tab
  async renderVersionChangerTab(container) {
    if (window.versionChanger) {
      await versionChanger.renderVersionChangerTab(container, this.serverId, this.serverData);
    }
  }

  // Render Backups Tab
  async renderBackupsTab(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="archive" class="w-5 h-5 text-cyan-400"></i> Server Backups
            </h3>
            <p class="text-xs text-slate-400">Create, restore, or download complete snapshots of your server</p>
          </div>
          <button onclick="serverConsole.showCreateBackupModal()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
            <i data-lucide="plus" class="w-4 h-4"></i> Create Backup
          </button>
        </div>

        <div class="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th class="px-5 py-3">Backup Name</th>
                <th class="px-5 py-3">Size</th>
                <th class="px-5 py-3">Created</th>
                <th class="px-5 py-3">Lock</th>
                <th class="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="backups-table-tbody" class="divide-y divide-white/5">
              <tr><td colspan="5" class="text-center py-6 text-slate-500">Loading backups...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    try {
      const data = await app.api(`/api/servers/${this.serverId}/backups`);
      const backups = data.backups || [];
      const tbody = document.getElementById('backups-table-tbody');

      if (backups.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-500">No backups created yet.</td></tr>`;
      } else {
        tbody.innerHTML = backups.map(b => `
          <tr class="hover:bg-white/5 transition">
            <td class="px-5 py-3 font-semibold text-white">${b.name}</td>
            <td class="px-5 py-3 font-mono">${(b.file_size / (1024 * 1024)).toFixed(2)} MB</td>
            <td class="px-5 py-3 text-slate-400">${new Date(b.created_at).toLocaleString()}</td>
            <td class="px-5 py-3">
              <button onclick="serverConsole.toggleBackupLock(${b.id})" class="text-xs ${b.is_locked ? 'text-amber-400' : 'text-slate-500'} hover:opacity-80">
                <i data-lucide="${b.is_locked ? 'lock' : 'unlock'}" class="w-4 h-4"></i>
              </button>
            </td>
            <td class="px-5 py-3 text-right space-x-2">
              <a href="/api/servers/${this.serverId}/backups/${b.id}/download?token=${app.token}" target="_blank" class="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-[11px] font-semibold inline-flex items-center gap-1">
                <i data-lucide="download" class="w-3 h-3"></i> Download
              </a>
              <button onclick="serverConsole.restoreBackup(${b.id})" class="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-[11px] font-semibold">
                Restore
              </button>
              <button onclick="serverConsole.deleteBackup(${b.id})" class="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-[11px]">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </td>
          </tr>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }

    // AutoBackups Extension Integration (autobackups.blueprint)
    if (window.autoBackups) {
      await autoBackups.renderSection(container, this.serverId);
    }

    if (window.lucide) lucide.createIcons();
  }

  showCreateBackupModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="archive" class="w-5 h-5 text-cyan-400"></i> Create New Backup
          </h3>
          <p class="text-xs text-slate-300">Enter a descriptive name for this server snapshot:</p>
          <input type="text" id="new-backup-name" placeholder="e.g. Before Mod Update" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required>
          <div class="flex gap-2 pt-2">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="flex-1 py-2 rounded-xl text-xs bg-slate-700 text-slate-300">Cancel</button>
            <button onclick="serverConsole.handleCreateBackup()" class="btn-cyber flex-1 py-2 rounded-xl text-xs font-semibold">Create Snapshot</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async handleCreateBackup() {
    const name = document.getElementById('new-backup-name').value.trim();
    if (!name) return;

    try {
      app.toast('Generating compressed backup archive...', 'info');
      document.getElementById('modal-container').innerHTML = '';
      const data = await app.api(`/api/servers/${this.serverId}/backups`, {
        method: 'POST',
        body: JSON.stringify({ name })
      });

      if (data.success) {
        app.toast('Backup archive created successfully!', 'success');
        this.renderBackupsTab(document.getElementById('subtab-content-area'));
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async restoreBackup(backupId) {
    if (!confirm('Are you sure you want to restore this backup? All existing server files will be overwritten.')) return;
    try {
      app.toast('Restoring backup archive...', 'info');
      const data = await app.api(`/api/servers/${this.serverId}/backups/${backupId}/restore`, { method: 'POST' });
      if (data.success) {
        app.toast('Backup restored successfully!', 'success');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async toggleBackupLock(backupId) {
    try {
      const data = await app.api(`/api/servers/${this.serverId}/backups/${backupId}/lock`, { method: 'POST' });
      if (data.success) {
        this.renderBackupsTab(document.getElementById('subtab-content-area'));
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async deleteBackup(backupId) {
    if (!confirm('Are you sure you want to delete this backup archive?')) return;
    try {
      const data = await app.api(`/api/servers/${this.serverId}/backups/${backupId}`, { method: 'DELETE' });
      if (data.success) {
        app.toast('Backup deleted.', 'info');
        this.renderBackupsTab(document.getElementById('subtab-content-area'));
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  // Render Schedules Tab
  async renderSchedulesTab(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="clock" class="w-5 h-5 text-cyan-400"></i> Scheduled Tasks (Cron)
            </h3>
            <p class="text-xs text-slate-400">Automate recurring server restarts, backups, and custom commands</p>
          </div>
          <button onclick="serverConsole.showCreateScheduleModal()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
            <i data-lucide="plus" class="w-4 h-4"></i> New Schedule
          </button>
        </div>

        <div id="schedules-list" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="col-span-full text-center py-8 text-slate-400">Loading schedules...</div>
        </div>
      </div>
    `;

    try {
      const data = await app.api(`/api/servers/${this.serverId}/schedules`);
      const schedules = data.schedules || [];
      const list = document.getElementById('schedules-list');

      if (schedules.length === 0) {
        list.innerHTML = `<div class="glass-card p-8 rounded-2xl text-center col-span-full border border-dashed border-white/20 text-slate-400 text-xs">No scheduled tasks configured.</div>`;
      } else {
        list.innerHTML = schedules.map(s => `
          <div class="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
            <div class="flex justify-between items-start">
              <div>
                <h4 class="text-sm font-bold text-white">${s.name}</h4>
                <p class="text-[11px] font-mono text-cyan-400">${s.cron_expression}</p>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${s.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}">
                ${s.is_active ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>
            <div class="text-xs text-slate-300">
              <span class="text-slate-400">Action:</span> <span class="font-semibold text-white uppercase">${s.action_type}</span>
              ${s.payload ? `<div class="mt-1 bg-slate-900/60 p-1.5 rounded font-mono text-[11px] text-slate-300 truncate">${s.payload}</div>` : ''}
            </div>
            <div class="pt-2 border-t border-white/10 flex justify-between items-center">
              <span class="text-[10px] text-slate-400">Last run: ${s.last_run_at ? new Date(s.last_run_at).toLocaleString() : 'Never'}</span>
              <button onclick="serverConsole.deleteSchedule(${s.id})" class="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete
              </button>
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
    if (window.lucide) lucide.createIcons();
  }

  showCreateScheduleModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="clock" class="w-5 h-5 text-cyan-400"></i> Create Scheduled Task
          </h3>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Schedule Name</label>
            <input type="text" id="sched-name" placeholder="Daily Restart" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Cron Expression (5-part)</label>
            <input type="text" id="sched-cron" placeholder="0 4 * * * (Daily at 4 AM)" value="0 4 * * *" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Action Type</label>
            <select id="sched-action" class="w-full glass-input px-3 py-2 rounded-xl text-xs">
              <option value="restart">Restart Server</option>
              <option value="backup">Create Full Backup</option>
              <option value="command">Send Console Command</option>
              <option value="stop">Stop Server</option>
              <option value="start">Start Server</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Command / Payload (if action is command)</label>
            <input type="text" id="sched-payload" placeholder="say Server is restarting in 1 minute!" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs">
          </div>
          <div class="flex gap-2 pt-2">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="flex-1 py-2 rounded-xl text-xs bg-slate-700 text-slate-300">Cancel</button>
            <button onclick="serverConsole.handleCreateSchedule()" class="btn-cyber flex-1 py-2 rounded-xl text-xs font-semibold">Save Schedule</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async handleCreateSchedule() {
    const name = document.getElementById('sched-name').value.trim();
    const cron_expression = document.getElementById('sched-cron').value.trim();
    const action_type = document.getElementById('sched-action').value;
    const payload = document.getElementById('sched-payload').value.trim();

    try {
      const data = await app.api(`/api/servers/${this.serverId}/schedules`, {
        method: 'POST',
        body: JSON.stringify({ name, cron_expression, action_type, payload })
      });

      if (data.success) {
        document.getElementById('modal-container').innerHTML = '';
        app.toast('Schedule created successfully!', 'success');
        this.renderSchedulesTab(document.getElementById('subtab-content-area'));
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async deleteSchedule(scheduleId) {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      const data = await app.api(`/api/servers/${this.serverId}/schedules/${scheduleId}`, { method: 'DELETE' });
      if (data.success) {
        app.toast('Schedule deleted.', 'info');
        this.renderSchedulesTab(document.getElementById('subtab-content-area'));
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  // Render Startup Configuration Tab (Pterodactyl / NookTheme 1:1 Layout)
  async renderStartupTab(container) {
    // If serverData already exists, render immediately to avoid delay
    if (this.serverData) {
      this._renderStartupTabContent(container);
    } else {
      container.innerHTML = `<div class="flex items-center justify-center py-20"><i data-lucide="loader-2" class="w-8 h-8 text-cyan-400 animate-spin"></i></div>`;
      if (window.lucide) lucide.createIcons();
    }

    // Ensure fresh server data
    try {
      const res = await app.api(`/api/servers/${this.serverId}`);
      if (res && res.server) {
        this.serverData = res.server;
        this._renderStartupTabContent(container);
      }
    } catch (e) {
      console.warn('Could not refresh server data:', e);
    }
  }

  _renderStartupTabContent(container) {
    const s = this.serverData || {};

    // Parse env_vars
    let envVars = {};
    try {
      envVars = typeof s.env_vars === 'string' ? JSON.parse(s.env_vars || '{}') : (s.env_vars || {});
    } catch (e) {
      envVars = {};
    }

    const isMinecraft = s.server_type === 'minecraft' || !s.server_type;
    const isPython = s.server_type === 'python';
    const isNode = s.server_type === 'nodejs' || s.server_type === 'node';
    const isVm = s.server_type === 'lumenvm' || s.server_type === 'vm' || s.server_type === 'nokvm' || s.server_type === 'lumenvm_nokvm';

    // Set standard variables based on server type if not yet defined
    if (isMinecraft) {
      if (envVars.MINECRAFT_VERSION === undefined) envVars.MINECRAFT_VERSION = 'latest';
      if (envVars.SERVER_JARFILE === undefined) envVars.SERVER_JARFILE = 'server.jar';
      if (envVars.BUILD_NUMBER === undefined) envVars.BUILD_NUMBER = 'latest';
    } else if (isNode) {
      if (envVars.MAIN_FILE === undefined) envVars.MAIN_FILE = 'index.js';
      if (envVars.NODE_VERSION === undefined) envVars.NODE_VERSION = '20';
      if (envVars.ADDITIONAL_PACKAGES === undefined) envVars.ADDITIONAL_PACKAGES = '';
    } else if (isPython) {
      if (envVars.MAIN_FILE === undefined) envVars.MAIN_FILE = 'app.py';
      if (envVars.REQUIREMENTS_FILE === undefined) envVars.REQUIREMENTS_FILE = 'requirements.txt';
      if (envVars.PYTHON_VERSION === undefined) envVars.PYTHON_VERSION = '3.12';
    } else if (isVm) {
      const isNokvm = s.server_type === 'nokvm' || s.server_type === 'lumenvm_nokvm' || envVars.NOKVM === '1';
      if (envVars.KVM === undefined) envVars.KVM = isNokvm ? 'off' : 'on';
      if (envVars.NOKVM === undefined) envVars.NOKVM = isNokvm ? '1' : '0';
      if (envVars.OS_HOSTNAME === undefined) envVars.OS_HOSTNAME = 'mpanel-vm';
      if (envVars.OS_PASSWORD === undefined) envVars.OS_PASSWORD = 'root';
      if (envVars.DISPLAY_MODE === undefined) envVars.DISPLAY_MODE = 'ssh';
      if (envVars.VM_RAM_MB === undefined) envVars.VM_RAM_MB = String(s.memory_mb || 2048);
      if (envVars.VM_DISK_GB === undefined) envVars.VM_DISK_GB = String(Math.round((s.disk_mb || 10240) / 1024) || 10);
    }

    this.currentStartupEnvVars = { ...envVars };

    // Default startup command template
    let rawCmd = s.startup_cmd || '';
    if (!rawCmd || rawCmd.includes('-Xmx{{SERVER_MEMORY}}M -jar server.jar nogui') || rawCmd.startsWith('#Powered by LumenVM')) {
      if (isMinecraft) {
        rawCmd = 'java -Xms128M -XX:MaxRAMPercentage=95.0 -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}';
      } else if (isPython) {
        rawCmd = 'python3 {{MAIN_FILE}}';
      } else if (isVm) {
        rawCmd = '/start.sh';
      } else {
        rawCmd = 'node {{MAIN_FILE}}';
      }
    }
    this.currentStartupTemplate = rawCmd;

    // Evaluated command for preview
    const evaluatedCmd = this.evaluateStartupCommand(rawCmd, this.currentStartupEnvVars);

    // Docker image options
    let dockerOptions = [];
    if (isMinecraft) {
      dockerOptions = [
        { label: 'Java 26', value: 'ghcr.io/pterodactyl/yolks:java_26' },
        { label: 'Java 25', value: 'ghcr.io/pterodactyl/yolks:java_25' },
        { label: 'Java 21', value: 'ghcr.io/pterodactyl/yolks:java_21' },
        { label: 'Java 17', value: 'ghcr.io/pterodactyl/yolks:java_17' },
        { label: 'Java 11', value: 'ghcr.io/pterodactyl/yolks:java_11' },
        { label: 'Java 8', value: 'ghcr.io/pterodactyl/yolks:java_8' }
      ];
    } else if (isNode) {
      dockerOptions = [
        { label: 'NodeJS 22', value: 'ghcr.io/parkervcp/yolks:nodejs_22' },
        { label: 'NodeJS 20', value: 'ghcr.io/parkervcp/yolks:nodejs_20' },
        { label: 'NodeJS 18', value: 'ghcr.io/parkervcp/yolks:nodejs_18' },
        { label: 'NodeJS 16', value: 'ghcr.io/parkervcp/yolks:nodejs_16' }
      ];
    } else if (isPython) {
      dockerOptions = [
        { label: 'Python 3.12', value: 'ghcr.io/parkervcp/yolks:python_3.12' },
        { label: 'Python 3.11', value: 'ghcr.io/parkervcp/yolks:python_3.11' },
        { label: 'Python 3.10', value: 'ghcr.io/parkervcp/yolks:python_3.10' }
      ];
    } else if (isVm) {
      dockerOptions = [
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
    }

    const currentDocker = s.docker_image || (isMinecraft ? 'ghcr.io/pterodactyl/yolks:java_25' : (isVm ? 'ghcr.io/sosuku325/aerovm:guest-debian-12' : (isNode ? 'ghcr.io/parkervcp/yolks:nodejs_20' : 'ghcr.io/parkervcp/yolks:python_3.12')));
    const matchedPreset = dockerOptions.find(o => o.value === currentDocker);
    const isCustomDocker = !matchedPreset;

    const dockerOptionsHtml = dockerOptions.map(opt => `
      <option value="${opt.value}" ${opt.value === currentDocker ? 'selected' : ''}>${opt.label}</option>
    `).join('') + `
      <option value="custom" ${isCustomDocker ? 'selected' : ''}>Custom Docker Image</option>
    `;

    // Standard variable metadata definitions matching Pterodactyl screenshot
    const varMeta = {
      MINECRAFT_VERSION: {
        label: 'MINECRAFT VERSION',
        desc: 'The version of minecraft to download. Leave at latest to always get the latest version. Invalid versions will default to latest.'
      },
      SERVER_JARFILE: {
        label: 'SERVER JAR FILE',
        desc: 'The name of the server jarfile to run the server with.'
      },
      BUILD_NUMBER: {
        label: 'BUILD NUMBER',
        desc: 'The build number for the paper release. Leave at latest to always get the latest version. Invalid versions will default to latest.'
      },
      MAIN_FILE: {
        label: 'MAIN FILE',
        desc: 'The application entrypoint script file executed at server startup.'
      },
      NODE_VERSION: {
        label: 'NODE VERSION',
        desc: 'The runtime version for the Node.js container environment.'
      },
      ADDITIONAL_PACKAGES: {
        label: 'ADDITIONAL PACKAGES',
        desc: 'Space-separated list of additional dependencies to install at launch.'
      },
      REQUIREMENTS_FILE: {
        label: 'REQUIREMENTS FILE',
        desc: 'Path to requirements.txt for pip package installation.'
      },
      PYTHON_VERSION: {
        label: 'PYTHON VERSION',
        desc: 'The Python runtime release version.'
      },
      KVM: {
        label: 'KVM ACCELERATION (NO-KVM / KVM ON-OFF)',
        desc: 'Hardware virtualization: on (KVM hardware acceleration - fastest), off (No-KVM software emulation, runs on any VPS/cloud host), or auto (safe fallback).'
      },
      DISPLAY_MODE: {
        label: 'DISPLAY / ACCESS MODE',
        desc: 'Access method: ssh (port 22), novnc (browser web desktop), vnc (port 5900), or rdp (port 3389).'
      },
      OS_HOSTNAME: {
        label: 'VM HOSTNAME',
        desc: 'Hostname configured inside the virtual machine.'
      },
      OS_PASSWORD: {
        label: 'ROOT PASSWORD',
        desc: 'Default root / user password inside the virtual machine.'
      },
      VM_RAM_MB: {
        label: 'VM MEMORY (MB)',
        desc: 'Amount of host RAM allocated to the QEMU Virtual Machine.'
      },
      VM_DISK_GB: {
        label: 'VM DISK SIZE (GB)',
        desc: 'Size of the virtual QCOW2 hard drive in Gigabytes.'
      }
    };

    // Priority order
    const orderedKeys = isMinecraft
      ? ['MINECRAFT_VERSION', 'SERVER_JARFILE', 'BUILD_NUMBER']
      : (isVm
        ? ['KVM', 'DISPLAY_MODE', 'OS_HOSTNAME', 'OS_PASSWORD', 'VM_RAM_MB', 'VM_DISK_GB']
        : (isNode ? ['MAIN_FILE', 'NODE_VERSION', 'ADDITIONAL_PACKAGES'] : ['MAIN_FILE', 'REQUIREMENTS_FILE', 'PYTHON_VERSION']));

    // Build variables cards HTML matching screenshot
    let variablesCardsHtml = '';
    orderedKeys.forEach(key => {
      const meta = varMeta[key] || { label: key.replace(/_/g, ' '), desc: `Runtime variable for ${key}.` };
      const val = this.currentStartupEnvVars[key] !== undefined ? this.currentStartupEnvVars[key] : '';

      if (key === 'KVM') {
        const isOff = String(val).toLowerCase() === 'off' || String(val).toLowerCase() === 'nokvm';
        const isAuto = String(val).toLowerCase() === 'auto';
        variablesCardsHtml += `
          <div class="startup-card flex flex-col justify-between border-cyan-500/30" id="var-card-${key}">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="startup-label mb-0" for="startup-var-${key}">${meta.label}</label>
                <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${isOff ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : (isAuto ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30')}">
                  ${isOff ? '🛡️ NO-KVM (OFF)' : (isAuto ? '🔄 AUTO' : '⚡ KVM (ON)')}
                </span>
              </div>
              <select id="startup-var-${key}" data-var-key="${key}" class="startup-input font-semibold" onchange="serverConsole.onStartupVariableChange('${key}')">
                <option value="on" ${!isOff && !isAuto ? 'selected' : ''}>⚡ KVM ON (Hardware Accelerated - Fastest)</option>
                <option value="off" ${isOff ? 'selected' : ''}>🛡️ No-KVM / OFF (Software Emulation - Runs anywhere)</option>
                <option value="auto" ${isAuto ? 'selected' : ''}>🔄 Auto (Detect Host Support)</option>
              </select>
            </div>
            <p class="startup-desc">${meta.desc}</p>
          </div>
        `;
        return;
      }

      if (key === 'DISPLAY_MODE') {
        variablesCardsHtml += `
          <div class="startup-card flex flex-col justify-between" id="var-card-${key}">
            <div>
              <label class="startup-label" for="startup-var-${key}">${meta.label}</label>
              <select id="startup-var-${key}" data-var-key="${key}" class="startup-input font-semibold" onchange="serverConsole.onStartupVariableChange('${key}')">
                <option value="ssh" ${val === 'ssh' || !val ? 'selected' : ''}>SSH Terminal Console (Port 22)</option>
                <option value="novnc" ${val === 'novnc' ? 'selected' : ''}>noVNC Web Desktop (GUI in Browser)</option>
                <option value="vnc" ${val === 'vnc' ? 'selected' : ''}>Native VNC Client (Port 5900)</option>
                <option value="spice" ${val === 'spice' ? 'selected' : ''}>SPICE Client</option>
                <option value="rdp" ${val === 'rdp' ? 'selected' : ''}>RDP (Windows Remote Desktop)</option>
              </select>
            </div>
            <p class="startup-desc">${meta.desc}</p>
          </div>
        `;
        return;
      }

      variablesCardsHtml += `
        <div class="startup-card flex flex-col justify-between" id="var-card-${key}">
          <div>
            <label class="startup-label" for="startup-var-${key}">${meta.label}</label>
            <input type="text" id="startup-var-${key}" data-var-key="${key}" value="${app.escapeHtml(val)}" class="startup-input font-normal" oninput="serverConsole.onStartupVariableChange('${key}')" placeholder="${meta.label}">
          </div>
          <p class="startup-desc">${meta.desc}</p>
        </div>
      `;
    });

    // Custom variable cards (any extra keys not in orderedKeys)
    Object.keys(this.currentStartupEnvVars).forEach(key => {
      if (!orderedKeys.includes(key)) {
        const val = this.currentStartupEnvVars[key];
        variablesCardsHtml += `
          <div class="startup-card flex flex-col justify-between relative group" id="var-card-${key}">
            <button type="button" onclick="serverConsole.deleteCustomVariable('${key}')" class="absolute top-4 right-4 text-slate-500 hover:text-rose-400 text-xs p-1 rounded hover:bg-white/5 transition-colors" title="Delete variable">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
            <div>
              <label class="startup-label pr-8">${key.replace(/_/g, ' ')}</label>
              <input type="text" id="startup-var-${key}" data-var-key="${key}" value="${app.escapeHtml(val)}" class="startup-input font-normal" oninput="serverConsole.onStartupVariableChange('${key}')">
            </div>
            <p class="startup-desc">Custom environment variable (passed as <span class="font-mono text-cyan-400">{{${key}}}</span> and process env).</p>
          </div>
        `;
      }
    });

    container.innerHTML = `
      <div class="space-y-6 pb-12">
        <!-- Top Row: STARTUP COMMAND & DOCKER IMAGE -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <!-- STARTUP COMMAND (Left Card, ~67% width) -->
          <div class="lg:col-span-8 startup-card flex flex-col justify-between">
            <div>
              <label class="startup-label">STARTUP COMMAND</label>
              <!-- Evaluated Command Box (matching media_1789374813357.png) -->
              <div id="startup-cmd-display-box" class="startup-code-box flex items-center cursor-pointer" onclick="serverConsole.copyStartupCommand()" title="Click to copy startup command">
                <span id="startup-cmd-display" class="break-all leading-relaxed select-all">${evaluatedCmd}</span>
              </div>
            </div>
          </div>

          <!-- DOCKER IMAGE (Right Card, ~33% width) -->
          <div class="lg:col-span-4 startup-card flex flex-col justify-between">
            <div>
              <label class="startup-label" for="startup-docker-select">DOCKER IMAGE</label>
              <select id="startup-docker-select" class="startup-select" onchange="serverConsole.handleDockerSelectChange(this)">
                ${dockerOptionsHtml}
              </select>
              <div id="startup-custom-docker-container" class="${isCustomDocker ? '' : 'hidden'} mt-2.5">
                <input type="text" id="startup-custom-docker-input" class="startup-input font-mono text-xs" placeholder="e.g. ghcr.io/pterodactyl/yolks:java_25" value="${isCustomDocker ? app.escapeHtml(currentDocker) : ''}" oninput="serverConsole.triggerStartupAutoSave()">
              </div>
            </div>
            <p class="startup-desc">This is an advanced feature allowing you to select a Docker image to use when running this server instance.</p>
          </div>
        </div>

        <!-- Section: Variables -->
        <div class="pt-2">
          <h3 class="text-2xl font-bold text-white tracking-tight">Variables</h3>
        </div>

        <!-- Variables Grid (2 columns matching screenshot) -->
        <div id="startup-variables-grid" class="grid grid-cols-1 md:grid-cols-2 gap-5">
          ${variablesCardsHtml}
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  }

  evaluateStartupCommand(template, envVars) {
    let cmd = template || '';
    if (!cmd.trim() || cmd.startsWith('#Powered by LumenVM')) {
      if (this.serverData?.server_type === 'lumenvm' || this.serverData?.server_type === 'vm' || this.serverData?.server_type === 'nokvm' || this.serverData?.server_type === 'lumenvm_nokvm') {
        cmd = '/start.sh';
      } else if (this.serverData?.server_type === 'minecraft' || !this.serverData?.server_type) {
        cmd = 'java -Xms128M -XX:MaxRAMPercentage=95.0 -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}';
      } else if (this.serverData?.server_type === 'python') {
        cmd = 'python3 {{MAIN_FILE}}';
      } else {
        cmd = 'node {{MAIN_FILE}}';
      }
    }

    const jarFile = envVars.SERVER_JARFILE || 'server.jar';
    const mainFile = envVars.MAIN_FILE || (this.serverData?.server_type === 'python' ? 'app.py' : 'index.js');
    const memory = this.serverData?.memory_mb || 1024;
    const port = this.serverData?.port || 25565;

    let evaluated = cmd
      .replace(/{{SERVER_MEMORY}}/g, `${memory}`)
      .replace(/{{SERVER_PORT}}/g, `${port}`)
      .replace(/{{SERVER_JARFILE}}/g, jarFile)
      .replace(/{{MAIN_FILE}}/g, mainFile);

    // If template has hardcoded server.jar and jarFile changed
    if (!cmd.includes('{{SERVER_JARFILE}}') && cmd.includes('server.jar') && jarFile !== 'server.jar') {
      evaluated = evaluated.replace(/server\.jar/g, jarFile);
    }

    for (const [k, v] of Object.entries(envVars)) {
      if (k !== 'SERVER_JARFILE' && k !== 'MAIN_FILE') {
        const reg = new RegExp(`{{${k}}}`, 'g');
        evaluated = evaluated.replace(reg, v);
      }
    }

    return evaluated;
  }

  updateStartupPreview() {
    const inputs = document.querySelectorAll('#startup-variables-grid [data-var-key]');
    const vars = {};
    inputs.forEach(inp => {
      vars[inp.getAttribute('data-var-key')] = inp.value.trim();
    });
    this.currentStartupEnvVars = vars;

    const rawCmd = document.getElementById('startup-cmd-raw-input')?.value || this.currentStartupTemplate || '';
    const evaluated = this.evaluateStartupCommand(rawCmd, vars);

    const displayEl = document.getElementById('startup-cmd-display');
    if (displayEl) {
      displayEl.innerText = evaluated;
    }
  }

  onStartupVariableChange(key) {
    this.updateStartupPreview();
    this.triggerStartupAutoSave();
  }

  onStartupTemplateInput() {
    const rawInput = document.getElementById('startup-cmd-raw-input');
    if (rawInput) {
      this.currentStartupTemplate = rawInput.value;
    }
    this.updateStartupPreview();
    this.triggerStartupAutoSave();
  }

  toggleStartupCommandEdit() {
    const displayBox = document.getElementById('startup-cmd-display-box');
    const editBox = document.getElementById('startup-cmd-edit-box');
    const toggleText = document.getElementById('startup-edit-toggle-text');

    if (!editBox || !displayBox) return;

    if (editBox.classList.contains('hidden')) {
      editBox.classList.remove('hidden');
      displayBox.classList.add('hidden');
      if (toggleText) toggleText.innerText = 'Preview Mode';
      const rawInput = document.getElementById('startup-cmd-raw-input');
      if (rawInput) {
        if (!rawInput.value) rawInput.value = this.currentStartupTemplate || '';
        rawInput.focus();
      }
    } else {
      editBox.classList.add('hidden');
      displayBox.classList.remove('hidden');
      if (toggleText) toggleText.innerText = 'Edit Template';
      this.updateStartupPreview();
    }
  }

  insertStartupTag(tag) {
    const rawInput = document.getElementById('startup-cmd-raw-input');
    if (!rawInput) return;
    const start = rawInput.selectionStart;
    const end = rawInput.selectionEnd;
    const text = rawInput.value;
    rawInput.value = text.substring(0, start) + tag + text.substring(end);
    rawInput.selectionStart = rawInput.selectionEnd = start + tag.length;
    rawInput.focus();
    this.onStartupTemplateInput();
  }

  copyStartupCommand() {
    app.playSound('copy');
    const displayEl = document.getElementById('startup-cmd-display');
    if (!displayEl) return;
    const text = displayEl.innerText;
    navigator.clipboard.writeText(text).then(() => {
      app.toast('Startup command copied to clipboard!', 'info');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      app.toast('Startup command copied to clipboard!', 'info');
    });
  }

  handleDockerSelectChange(selectEl) {
    const customContainer = document.getElementById('startup-custom-docker-container');
    if (selectEl.value === 'custom') {
      if (customContainer) customContainer.classList.remove('hidden');
      const customInput = document.getElementById('startup-custom-docker-input');
      if (customInput) customInput.focus();
    } else {
      if (customContainer) customContainer.classList.add('hidden');
    }
    this.triggerStartupAutoSave();
  }

  triggerStartupAutoSave() {
    if (this.startupAutoSaveTimer) {
      clearTimeout(this.startupAutoSaveTimer);
    }
    this.startupAutoSaveTimer = setTimeout(() => {
      this.handleSaveStartup(null, true);
    }, 1200);
  }

  showAddCustomVariableModal() {
    const varName = prompt('Enter new variable name (e.g. DEBUG_MODE, SERVER_PORT, EXTRA_FLAGS):');
    if (!varName) return;
    const sanitizedKey = varName.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!sanitizedKey) {
      app.toast('Invalid variable name', 'error');
      return;
    }
    if (this.currentStartupEnvVars[sanitizedKey] !== undefined) {
      app.toast(`Variable ${sanitizedKey} already exists.`, 'warning');
      return;
    }
    const defaultVal = prompt(`Enter default value for ${sanitizedKey}:`, '') || '';
    this.currentStartupEnvVars[sanitizedKey] = defaultVal;

    const area = document.getElementById('subtab-content-area');
    if (area) {
      this.renderStartupTab(area);
      this.handleSaveStartup(null, true);
    }
  }

  deleteCustomVariable(key) {
    if (!confirm(`Are you sure you want to remove variable "${key}"?`)) return;
    delete this.currentStartupEnvVars[key];
    const area = document.getElementById('subtab-content-area');
    if (area) {
      this.renderStartupTab(area);
      this.handleSaveStartup(null, true);
    }
  }

  async handleSaveStartup(e, isAutoSave = false) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    const saveBtn = document.getElementById('btn-save-startup');
    const saveStatus = document.getElementById('startup-save-status');

    // Collect Startup Command
    const rawInput = document.getElementById('startup-cmd-raw-input');
    const startup_cmd = (rawInput?.value || this.currentStartupTemplate || '').trim();

    // Collect Docker Image
    const dockerSelect = document.getElementById('startup-docker-select');
    let docker_image = dockerSelect ? dockerSelect.value : '';
    if (docker_image === 'custom') {
      const customInput = document.getElementById('startup-custom-docker-input');
      docker_image = customInput ? customInput.value.trim() : '';
    }

    // Collect Variables
    const inputs = document.querySelectorAll('#startup-variables-grid [data-var-key]');
    const env_vars = {};
    inputs.forEach(inp => {
      const k = inp.getAttribute('data-var-key');
      env_vars[k] = inp.value.trim();
    });

    try {
      if (saveBtn && !isAutoSave) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Saving...`;
        if (window.lucide) lucide.createIcons();
      }

      const data = await app.api(`/api/servers/${this.serverId}`, {
        method: 'PUT',
        body: JSON.stringify({
          startup_cmd,
          docker_image,
          env_vars
        })
      });

      if (data.success) {
        if (!isAutoSave) {
          app.toast('Startup configuration updated!', 'success');
        }
        if (saveStatus) {
          saveStatus.classList.remove('opacity-0');
          setTimeout(() => {
            saveStatus.classList.add('opacity-0');
          }, 2500);
        }
        if (this.serverData) {
          this.serverData.startup_cmd = startup_cmd;
          this.serverData.docker_image = docker_image;
          this.serverData.env_vars = JSON.stringify(env_vars);
        }
      }
    } catch (err) {
      if (!isAutoSave) {
        app.toast(err.message || 'Failed to update startup configuration', 'error');
      }
    } finally {
      if (saveBtn && !isAutoSave) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i data-lucide="save" class="w-3.5 h-3.5"></i> Save Configuration`;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  // Render Subusers Tab
  async renderSubusersTab(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="users" class="w-5 h-5 text-cyan-400"></i> Server Subusers & Collaborators
            </h3>
            <p class="text-xs text-slate-400">Grant teammates granular access to console, file manager, and controls</p>
          </div>
          <button onclick="serverConsole.showAddSubuserModal()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
            <i data-lucide="user-plus" class="w-4 h-4"></i> Add Subuser
          </button>
        </div>

        <div id="subusers-list" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="col-span-full text-center py-8 text-slate-400">Loading subusers...</div>
        </div>
      </div>
    `;

    try {
      const data = await app.api(`/api/servers/${this.serverId}/subusers`);
      const subusers = data.subusers || [];
      const list = document.getElementById('subusers-list');

      if (subusers.length === 0) {
        list.innerHTML = `<div class="glass-card p-8 rounded-2xl text-center col-span-full border border-dashed border-white/20 text-slate-400 text-xs">No subusers assigned to this server.</div>`;
      } else {
        list.innerHTML = subusers.map(sub => `
          <div class="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                  ${sub.username.substring(0, 1).toUpperCase()}
                </div>
                <div>
                  <h4 class="text-sm font-bold text-white">${sub.username}</h4>
                  <p class="text-[11px] text-slate-400">${sub.email}</p>
                </div>
              </div>
              <button onclick="serverConsole.removeSubuser(${sub.id})" class="text-rose-400 hover:text-rose-300 text-xs">
                <i data-lucide="user-x" class="w-4 h-4"></i>
              </button>
            </div>
            <div class="flex flex-wrap gap-1 pt-1">
              ${sub.permissions.map(p => `<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-cyan-300 border border-white/5">${p}</span>`).join('')}
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
    if (window.lucide) lucide.createIcons();
  }

  showAddSubuserModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="user-plus" class="w-5 h-5 text-cyan-400"></i> Add Subuser
          </h3>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">User Username or Email</label>
            <input type="text" id="subuser-ident" placeholder="user@example.com" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-2">Permissions</label>
            <div class="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <label class="flex items-center gap-2"><input type="checkbox" id="perm-console" value="console.write" checked class="accent-cyan-400"> Console Access</label>
              <label class="flex items-center gap-2"><input type="checkbox" id="perm-power" value="power.control" checked class="accent-cyan-400"> Power Control</label>
              <label class="flex items-center gap-2"><input type="checkbox" id="perm-files" value="files.read,files.write" checked class="accent-cyan-400"> File Manager</label>
              <label class="flex items-center gap-2"><input type="checkbox" id="perm-backups" value="backups.read,backups.create" class="accent-cyan-400"> Backups</label>
              <label class="flex items-center gap-2"><input type="checkbox" id="perm-schedules" value="schedules.read" class="accent-cyan-400"> Schedules</label>
              <label class="flex items-center gap-2"><input type="checkbox" id="perm-settings" value="settings.view" class="accent-cyan-400"> View Settings</label>
            </div>
          </div>
          <div class="flex gap-2 pt-2">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="flex-1 py-2 rounded-xl text-xs bg-slate-700 text-slate-300">Cancel</button>
            <button onclick="serverConsole.handleAddSubuser()" class="btn-cyber flex-1 py-2 rounded-xl text-xs font-semibold">Add User</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async handleAddSubuser() {
    const userIdentifier = document.getElementById('subuser-ident').value.trim();
    if (!userIdentifier) return;

    const perms = ['view'];
    if (document.getElementById('perm-console')?.checked) perms.push('console.view', 'console.write');
    if (document.getElementById('perm-power')?.checked) perms.push('power.control');
    if (document.getElementById('perm-files')?.checked) perms.push('files.read', 'files.write', 'files.delete');
    if (document.getElementById('perm-backups')?.checked) perms.push('backups.read', 'backups.create');
    if (document.getElementById('perm-schedules')?.checked) perms.push('schedules.read', 'schedules.create');
    if (document.getElementById('perm-settings')?.checked) perms.push('settings.view');

    try {
      const data = await app.api(`/api/servers/${this.serverId}/subusers`, {
        method: 'POST',
        body: JSON.stringify({ userIdentifier, permissions: perms })
      });

      if (data.success) {
        document.getElementById('modal-container').innerHTML = '';
        app.toast('Subuser added successfully!', 'success');
        this.renderSubusersTab(document.getElementById('subtab-content-area'));
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async removeSubuser(subuserId) {
    if (!confirm('Are you sure you want to remove this subuser?')) return;
    try {
      const data = await app.api(`/api/servers/${this.serverId}/subusers/${subuserId}`, { method: 'DELETE' });
      if (data.success) {
        app.toast('Subuser removed.', 'info');
        this.renderSubusersTab(document.getElementById('subtab-content-area'));
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  // Render Server Settings & SFTP Info Tab
  // Render Server Settings & SFTP Info Tab
  async renderSettingsTab(container) {
    const s = this.serverData || {};
    const username = app.user?.username || 'admin';
    const shortUuid = s.uuid ? s.uuid.split('-')[0] : (s.id || '1');
    const sftpUser = `${username}.${shortUuid}`;
    const sftpHost = s.sftp_host || s.node_fqdn || window.location.hostname || '127.0.0.1';
    const sftpPort = s.sftp_port || 3004;
    const sftpAddress = `sftp://${sftpHost}:${sftpPort}`;
    const sftpLaunchUrl = `sftp://${sftpUser}@${sftpHost}:${sftpPort}`;

    container.innerHTML = `
      <div class="max-w-6xl mx-auto space-y-6">
        <!-- 2-Column Grid matching reference UI -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- Card 1: SFTP DETAILS (Top Left) -->
          <div class="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between space-y-4 shadow-xl">
            <div class="space-y-4">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300">SFTP DETAILS</h4>

              <div class="space-y-1.5">
                <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400">SERVER ADDRESS</label>
                <div class="relative">
                  <input type="text" readonly value="${sftpAddress}" class="w-full bg-[#1b1c24] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-200 focus:outline-none cursor-pointer select-all pr-10" onclick="this.select(); app.copyToClipboard('${sftpAddress}')" title="Click to copy">
                  <button type="button" onclick="app.copyToClipboard('${sftpAddress}')" title="Copy SFTP Address" class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition rounded-lg">
                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400">USERNAME</label>
                <div class="relative">
                  <input type="text" readonly value="${sftpUser}" class="w-full bg-[#1b1c24] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-200 focus:outline-none cursor-pointer select-all pr-10" onclick="this.select(); app.copyToClipboard('${sftpUser}')" title="Click to copy">
                  <button type="button" onclick="app.copyToClipboard('${sftpUser}')" title="Copy Username" class="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition rounded-lg">
                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
            </div>

            <div class="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-white/5">
              <div class="border-l-2 border-cyan-400 pl-3 py-0.5">
                <p class="text-xs text-slate-400 leading-snug">Your SFTP password is the same as the password you use to access this panel.</p>
              </div>
              <a href="${sftpLaunchUrl}" class="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all flex items-center gap-1.5 shrink-0">
                <i data-lucide="external-link" class="w-3.5 h-3.5"></i> Launch SFTP
              </a>
            </div>
          </div>

          <!-- Card 2: CHANGE SERVER DETAILS (Top Right) -->
          <div class="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between space-y-4 shadow-xl">
            <div class="space-y-4">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300">CHANGE SERVER DETAILS</h4>

              <div class="space-y-1.5">
                <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400">SERVER NAME</label>
                <input type="text" id="srv-edit-name" value="${app.escapeHtml(s.name || '')}" class="w-full bg-[#1b1c24] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-500/50 focus:outline-none transition">
              </div>

              <div class="space-y-1.5">
                <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400">SERVER DESCRIPTION</label>
                <textarea id="srv-edit-description" rows="3" class="w-full bg-[#1b1c24] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:border-cyan-500/50 focus:outline-none resize-none transition" placeholder="A brief description of this server...">${app.escapeHtml(s.description || '')}</textarea>
              </div>
            </div>

            <div class="pt-2 flex justify-end">
              <button id="btn-save-server-details" onclick="serverConsole.handleSaveServerDetails()" class="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5">
                Save
              </button>
            </div>
          </div>

          <!-- Card 3: DEBUG INFORMATION (Bottom Left) -->
          <div class="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 shadow-xl">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300">DEBUG INFORMATION</h4>

            <div class="space-y-3 font-mono text-xs">
              <div class="flex items-center justify-between p-3 rounded-xl bg-[#1b1c24] border border-white/5">
                <span class="text-xs text-slate-400 font-sans font-semibold">Node</span>
                <span class="text-xs font-mono font-bold text-slate-200">${app.escapeHtml(s.node_name || 'Node - ' + (s.node_id || 1))}</span>
              </div>
              <div class="flex items-center justify-between p-3 rounded-xl bg-[#1b1c24] border border-white/5">
                <span class="text-xs text-slate-400 font-sans font-semibold shrink-0">Server ID</span>
                <div class="flex items-center gap-2 overflow-hidden">
                  <span class="text-xs font-mono text-slate-300 select-all truncate max-w-[200px] sm:max-w-[320px]" title="${s.uuid || ''}">${s.uuid || 'N/A'}</span>
                  <button type="button" onclick="app.copyToClipboard('${s.uuid || ''}')" title="Copy UUID" class="p-1 rounded-lg text-slate-400 hover:text-white transition">
                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 4: REINSTALL SERVER (Bottom Right) -->
          <div class="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between space-y-4 shadow-xl">
            <div class="space-y-3">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-300">REINSTALL SERVER</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Reinstalling your server will stop it, and then re-run the installation script that initially set it up. Some files may be deleted or modified during this process, please back up your data before continuing.
              </p>
            </div>

            <div class="pt-2 flex justify-end">
              <button onclick="serverConsole.handleReinstallServer()" class="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-all flex items-center gap-1.5">
                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Reinstall Server
              </button>
            </div>
          </div>

          ${(app.user && app.user.role === 'admin') ? `
          <!-- Card 5: DELETE SERVER (Bottom Full Width - Admin Only) -->
          <div class="col-span-full glass-panel p-6 rounded-3xl border border-rose-500/20 bg-rose-950/10 space-y-3 shadow-xl">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 class="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <i data-lucide="alert-triangle" class="w-4 h-4"></i> Delete Server Instance
                </h4>
                <p class="text-xs text-slate-400 mt-1">
                  Permanently delete this server container, its files, databases, and all backups. This action cannot be undone.
                </p>
              </div>
              <button onclick="serverConsole.handleDeleteServer()" class="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 transition-all shrink-0 flex items-center gap-1.5">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete Server
              </button>
            </div>
          </div>
          ` : `
          <!-- Card 5: DELETE SERVER (Locked - Normal Users Cannot Delete) -->
          <div class="col-span-full glass-panel p-6 rounded-3xl border border-white/5 bg-slate-900/40 space-y-3 shadow-xl">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <i data-lucide="shield-alert" class="w-4 h-4 text-amber-400"></i> Delete Server Instance
                </h4>
                <p class="text-xs text-slate-400 mt-1">
                  Only administrators have permission to delete server instances. Normal users cannot delete servers.
                </p>
              </div>
              <div class="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 text-slate-400 border border-white/10 flex items-center gap-1.5 shrink-0 select-none">
                <i data-lucide="lock" class="w-3.5 h-3.5 text-amber-400"></i> Admin Only
              </div>
            </div>
          </div>
          `}

        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async handleSaveServerDetails() {
    const nameInput = document.getElementById('srv-edit-name');
    const descInput = document.getElementById('srv-edit-description');
    const name = nameInput ? nameInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';

    if (!name) {
      app.toast('Server name cannot be empty.', 'warning');
      return;
    }

    const btn = document.getElementById('btn-save-server-details');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="animate-spin mr-1">⏳</span> Saving...';
    }

    try {
      const data = await app.api(`/api/servers/${this.serverId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, description })
      });
      if (data.success) {
        app.toast('Server details saved successfully!', 'success');
        if (this.serverData) {
          this.serverData.name = name;
          this.serverData.description = description;
        }
        await this.loadServerHeader(this.serverId);
      }
    } catch (err) {
      app.toast(err.message || 'Failed to update server details', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Save';
      }
    }
  }

  handleRenameServer() {
    return this.handleSaveServerDetails();
  }

  async handleReinstallServer() {
    if (!confirm('Are you sure you want to reinstall this server? Reinstalling will stop the server and re-apply default configuration.')) return;
    try {
      app.toast('Reinstalling server base files...', 'info');
      const data = await app.api(`/api/servers/${this.serverId}/reinstall`, { method: 'POST' });
      if (data.success) {
        app.toast('Server reinstalled successfully!', 'success');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async handleDeleteServer() {
    if (!app.user || app.user.role !== 'admin') {
      app.toast('Permission denied: Only administrators can delete servers. Normal users cannot delete servers.', 'error');
      return;
    }
    if (!confirm('DANGER: Are you absolutely sure you want to delete this server? This action CANNOT be undone!')) return;
    try {
      const data = await app.api(`/api/servers/${this.serverId}`, { method: 'DELETE' });
      if (data.success) {
        app.toast('Server deleted successfully.', 'info');
        app.navigate('user-servers');
      }
    } catch (err) {
      app.toast(err.message || 'Failed to delete server.', 'error');
    }
  }

  // Render Server Activity Log
  async renderActivityTab(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <div>
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i data-lucide="activity" class="w-5 h-5 text-cyan-400"></i> Server Activity Audit Trail
          </h3>
          <p class="text-xs text-slate-400">History of actions executed specifically on this server</p>
        </div>

        <div class="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <table class="w-full text-left text-xs text-slate-300">
            <thead class="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th class="px-5 py-3">Action</th>
                <th class="px-5 py-3">User</th>
                <th class="px-5 py-3">Details</th>
                <th class="px-5 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody id="server-activity-tbody" class="divide-y divide-white/5">
              <tr><td colspan="4" class="text-center py-6 text-slate-500">Loading audit history...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    try {
      const data = await app.api(`/api/activity/server/${this.serverId}`);
      const logs = data.logs || [];
      const tbody = document.getElementById('server-activity-tbody');

      if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-slate-500">No activity recorded for this server.</td></tr>`;
      } else {
        tbody.innerHTML = logs.map(l => `
          <tr class="hover:bg-white/5 transition">
            <td class="px-5 py-3 font-semibold text-cyan-400">${l.action}</td>
            <td class="px-5 py-3 font-medium text-white">${l.username || 'System'}</td>
            <td class="px-5 py-3 font-mono text-[11px] text-slate-300 truncate max-w-xs">${l.details || '-'}</td>
            <td class="px-5 py-3 text-slate-400">${new Date(l.created_at).toLocaleString()}</td>
          </tr>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
    if (window.lucide) lucide.createIcons();
  }

  // ==========================================
  // SERVER DATABASES TAB
  // ==========================================
  async renderDatabasesTab(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="database" class="w-5 h-5 text-cyan-400"></i> Server Databases
            </h3>
            <p class="text-xs text-slate-400">Create, manage and connect MariaDB and MySQL databases for plugins and services</p>
          </div>
          <button type="button" onclick="serverConsole.showCreateDatabaseModal()" class="nook-btn-primary flex items-center gap-2">
            <i data-lucide="plus" class="w-4 h-4"></i> New Database
          </button>
        </div>

        <div id="server-databases-container" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="col-span-full text-center py-10 text-slate-400">Loading databases...</div>
        </div>
      </div>
    `;

    try {
      const data = await app.api(`/api/servers/${this.serverId}/databases`);
      const databases = data.databases || [];
      this.availableDbHosts = data.hosts || [];
      const listEl = document.getElementById('server-databases-container');
      if (!listEl) return;

      if (databases.length === 0) {
        listEl.innerHTML = `
          <div class="glass-card p-10 rounded-2xl text-center col-span-full border border-dashed border-white/20 text-slate-400 space-y-3">
            <i data-lucide="database" class="w-10 h-10 text-slate-500 mx-auto"></i>
            <p class="text-sm font-semibold text-white">No databases created yet</p>
            <p class="text-xs text-slate-400 max-w-sm mx-auto">Create a database to store plugin data, user accounts, economies, and web stats.</p>
            <button onclick="serverConsole.showCreateDatabaseModal()" class="nook-btn-primary inline-flex items-center gap-2 text-xs mt-2">
              <i data-lucide="plus" class="w-4 h-4"></i> Create First Database
            </button>
          </div>
        `;
      } else {
        listEl.innerHTML = databases.map(db => {
          const hostDisplay = `${db.host || '127.0.0.1'}:${db.host_port || 3306}`;
          const jdbcStr = `jdbc:mysql://${hostDisplay}/${db.database_name}`;
          return `
            <div class="glass-card p-5 rounded-2xl border border-white/10 space-y-4 hover:border-cyan-500/30 transition">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm shrink-0">
                    <i data-lucide="database" class="w-5 h-5"></i>
                  </div>
                  <div class="min-w-0">
                    <h4 class="text-sm font-bold text-white truncate">${db.database_name}</h4>
                    <p class="text-[11px] text-slate-400 flex items-center gap-1">
                      <span class="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                      ${db.host_name || 'MariaDB Host'} (${hostDisplay})
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button onclick="serverConsole.resetDatabasePassword(${db.id})" title="Reset Password" class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-amber-400 transition">
                    <i data-lucide="key" class="w-4 h-4"></i>
                  </button>
                  <button onclick="serverConsole.deleteDatabase(${db.id})" title="Delete Database" class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 transition">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>

              <!-- Database Credentials Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-black/40 p-3 rounded-xl border border-white/5">
                <div>
                  <span class="text-[10px] uppercase font-bold text-slate-500 block">Database</span>
                  <div class="flex items-center justify-between mt-0.5">
                    <span class="font-mono text-slate-200 select-all truncate">${db.database_name}</span>
                    <button onclick="app.copyToClipboard('${db.database_name}')" class="text-slate-400 hover:text-cyan-400 ml-1"><i data-lucide="copy" class="w-3.5 h-3.5"></i></button>
                  </div>
                </div>
                <div>
                  <span class="text-[10px] uppercase font-bold text-slate-500 block">Username</span>
                  <div class="flex items-center justify-between mt-0.5">
                    <span class="font-mono text-slate-200 select-all truncate">${db.username}</span>
                    <button onclick="app.copyToClipboard('${db.username}')" class="text-slate-400 hover:text-cyan-400 ml-1"><i data-lucide="copy" class="w-3.5 h-3.5"></i></button>
                  </div>
                </div>
                <div class="sm:col-span-2">
                  <span class="text-[10px] uppercase font-bold text-slate-500 block">Password</span>
                  <div class="flex items-center justify-between mt-0.5">
                    <span id="db-pwd-${db.id}" class="font-mono text-slate-200 select-all">••••••••••••</span>
                    <div class="flex items-center gap-1.5">
                      <button onclick="serverConsole.toggleDbPassword(${db.id}, '${db.password}')" id="db-pwd-eye-${db.id}" class="text-slate-400 hover:text-white"><i data-lucide="eye" class="w-3.5 h-3.5"></i></button>
                      <button onclick="app.copyToClipboard('${db.password}')" class="text-slate-400 hover:text-cyan-400"><i data-lucide="copy" class="w-3.5 h-3.5"></i></button>
                    </div>
                  </div>
                </div>
                <div class="sm:col-span-2">
                  <span class="text-[10px] uppercase font-bold text-slate-500 block">Endpoint / Host</span>
                  <div class="flex items-center justify-between mt-0.5">
                    <span class="font-mono text-slate-300 text-[11px] truncate">${hostDisplay}</span>
                    <button onclick="app.copyToClipboard('${hostDisplay}')" class="text-slate-400 hover:text-cyan-400 ml-1"><i data-lucide="copy" class="w-3.5 h-3.5"></i></button>
                  </div>
                </div>
              </div>

              <!-- JDBC String helper -->
              <div class="flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-xl text-[11px] border border-white/5">
                <span class="font-mono text-slate-400 truncate mr-2">${jdbcStr}</span>
                <button onclick="app.copyToClipboard('${jdbcStr}')" title="Copy JDBC URI" class="text-cyan-400 hover:text-cyan-300 text-xs shrink-0 flex items-center gap-1">
                  <i data-lucide="copy" class="w-3 h-3"></i> Copy JDBC
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      console.error(err);
      app.showToast('Failed to load databases: ' + err.message, 'error');
    }
    if (window.lucide) lucide.createIcons();
  }

  toggleDbPassword(dbId, pwd) {
    const el = document.getElementById(`db-pwd-${dbId}`);
    const eye = document.getElementById(`db-pwd-eye-${dbId}`);
    if (!el) return;
    if (el.innerText === '••••••••••••') {
      el.innerText = pwd;
      if (eye) eye.innerHTML = '<i data-lucide="eye-off" class="w-3.5 h-3.5"></i>';
    } else {
      el.innerText = '••••••••••••';
      if (eye) eye.innerHTML = '<i data-lucide="eye" class="w-3.5 h-3.5"></i>';
    }
    if (window.lucide) lucide.createIcons();
  }

  showCreateDatabaseModal() {
    const hosts = this.availableDbHosts || [];
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="database" class="w-5 h-5 text-cyan-400"></i> New Database
            </h3>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="text-slate-400 hover:text-white">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <form onsubmit="serverConsole.handleCreateDatabase(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Database Name Suffix</label>
              <input type="text" id="new-db-name" placeholder="e.g. plugins, luckperms, core" pattern="[a-zA-Z0-9_]{1,16}" title="Alphanumeric up to 16 characters" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required>
              <span class="text-[10px] text-slate-500 mt-1 block">Prefix will automatically be s${this.serverId}_</span>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Database Host</label>
              <select id="new-db-host-id" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900">
                ${hosts.length > 0 ? hosts.map(h => `<option value="${h.id}">${h.name} (${h.host}:${h.port})</option>`).join('') : '<option value="1">Default MariaDB / MySQL Host</option>'}
              </select>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" onclick="document.getElementById('modal-container').innerHTML=''" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/5">Cancel</button>
              <button type="submit" class="nook-btn-primary text-xs">Create Database</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async handleCreateDatabase(e) {
    e.preventDefault();
    const dbName = document.getElementById('new-db-name').value.trim();
    const hostId = document.getElementById('new-db-host-id').value;
    try {
      await app.api(`/api/servers/${this.serverId}/databases`, {
        method: 'POST',
        body: JSON.stringify({ database_name: dbName, host_id: hostId })
      });
      document.getElementById('modal-container').innerHTML = '';
      app.showToast('Database created successfully!', 'success');
      this.renderDatabasesTab(document.getElementById('subtab-content-area'));
    } catch (err) {
      app.showToast('Failed to create database: ' + err.message, 'error');
    }
  }

  async resetDatabasePassword(dbId) {
    if (!confirm('Are you sure you want to reset this database password? Any plugins currently connected with the old password will fail to authenticate until reconfigured.')) return;
    try {
      await app.api(`/api/servers/${this.serverId}/databases/${dbId}/reset-password`, { method: 'POST' });
      app.showToast('Database password reset successfully!', 'success');
      this.renderDatabasesTab(document.getElementById('subtab-content-area'));
    } catch (err) {
      app.showToast('Failed to reset password: ' + err.message, 'error');
    }
  }

  async deleteDatabase(dbId) {
    if (!confirm('CAUTION: Are you sure you want to completely drop and delete this database? All stored tables and data will be permanently removed!')) return;
    try {
      await app.api(`/api/servers/${this.serverId}/databases/${dbId}`, { method: 'DELETE' });
      app.showToast('Database deleted successfully.', 'success');
      this.renderDatabasesTab(document.getElementById('subtab-content-area'));
    } catch (err) {
      app.showToast('Failed to delete database: ' + err.message, 'error');
    }
  }

  // ==========================================
  // SERVER NETWORK TAB
  // ==========================================
  async renderNetworkTab(container) {
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="network" class="w-5 h-5 text-cyan-400"></i> Network Allocations
            </h3>
            <p class="text-xs text-slate-400">Manage primary port bindings and extra network ports allocated to this server</p>
          </div>
          <button type="button" onclick="serverConsole.showAssignPortModal()" class="nook-btn-primary flex items-center gap-2">
            <i data-lucide="plus" class="w-4 h-4"></i> Assign Port
          </button>
        </div>

        <div id="server-network-list" class="space-y-3">
          <div class="text-center py-10 text-slate-400">Loading network allocations...</div>
        </div>
      </div>
    `;

    try {
      const data = await app.api(`/api/servers/${this.serverId}/network`);
      const allocations = data.allocations || [];
      const primaryId = data.primary_allocation_id;
      this.availableAllocations = data.available_allocations || [];
      const listEl = document.getElementById('server-network-list');
      if (!listEl) return;

      if (allocations.length === 0) {
        listEl.innerHTML = `<div class="glass-card p-8 rounded-2xl text-center border border-dashed border-white/20 text-slate-400 text-xs">No allocations found for this server.</div>`;
      } else {
        listEl.innerHTML = allocations.map(a => {
          const isPrimary = (a.id === primaryId);
          const fullAddr = `${a.ip}:${a.port}`;
          return `
            <div class="glass-card p-4 rounded-2xl border ${isPrimary ? 'border-cyan-500/50 bg-cyan-950/10' : 'border-white/10'} flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl ${isPrimary ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'} flex items-center justify-center font-bold text-xs shrink-0">
                  <i data-lucide="${isPrimary ? 'radio' : 'network'}" class="w-5 h-5"></i>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold font-mono text-white">${fullAddr}</span>
                    ${isPrimary ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">PRIMARY</span>' : ''}
                  </div>
                  <p class="text-[11px] text-slate-400 mt-0.5">Node: <span class="text-slate-300 font-medium">${a.node_name || 'Node'}</span> &bull; Port: <span class="font-mono text-slate-300">${a.port}</span></p>
                </div>
              </div>

              <div class="flex items-center gap-2 self-end sm:self-center">
                <button type="button" onclick="app.copyToClipboard('${fullAddr}')" title="Copy Address" class="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1.5 transition">
                  <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copy
                </button>
                ${!isPrimary ? `
                  <button type="button" onclick="serverConsole.handleSetPrimaryPort(${a.id})" title="Set as Primary Bind Port" class="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold flex items-center gap-1.5 border border-cyan-500/20 transition">
                    <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Make Primary
                  </button>
                  <button type="button" onclick="serverConsole.handleUnassignPort(${a.id})" title="Remove Port Allocation" class="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      console.error(err);
      app.showToast('Failed to load network allocations: ' + err.message, 'error');
    }
    if (window.lucide) lucide.createIcons();
  }

  showAssignPortModal() {
    const available = this.availableAllocations || [];
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="network" class="w-5 h-5 text-cyan-400"></i> Assign Network Port
            </h3>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="text-slate-400 hover:text-white">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <form onsubmit="serverConsole.handleAssignPortSubmit(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Available Node Ports</label>
              ${available.length > 0 ? `
                <select id="assign-port-select" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900 font-mono">
                  <option value="">-- Automatically Assign Next Free Port --</option>
                  ${available.map(a => `<option value="${a.id}">${a.ip}:${a.port} (${a.node_name})</option>`).join('')}
                </select>
              ` : `
                <div class="p-3 bg-white/5 rounded-xl text-xs text-slate-400">
                  Will automatically pick and bind the next unallocated port on this server's node.
                </div>
              `}
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" onclick="document.getElementById('modal-container').innerHTML=''" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-white/5">Cancel</button>
              <button type="submit" class="nook-btn-primary text-xs">Assign Port</button>
            </div>
          </form>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async handleAssignPortSubmit(e) {
    e.preventDefault();
    const select = document.getElementById('assign-port-select');
    const allocationId = select ? select.value : '';
    try {
      const payload = allocationId ? { allocation_id: parseInt(allocationId, 10) } : {};
      await app.api(`/api/servers/${this.serverId}/network/assign`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      document.getElementById('modal-container').innerHTML = '';
      app.showToast('Port assigned successfully!', 'success');
      this.renderNetworkTab(document.getElementById('subtab-content-area'));
    } catch (err) {
      app.showToast('Failed to assign port: ' + err.message, 'error');
    }
  }

  async handleSetPrimaryPort(allocId) {
    try {
      await app.api(`/api/servers/${this.serverId}/network/primary`, {
        method: 'POST',
        body: JSON.stringify({ allocation_id: allocId })
      });
      app.showToast('Primary port updated!', 'success');
      this.renderNetworkTab(document.getElementById('subtab-content-area'));
    } catch (err) {
      app.showToast('Failed to set primary port: ' + err.message, 'error');
    }
  }

  async handleUnassignPort(allocId) {
    if (!confirm('Are you sure you want to unassign this port from the server?')) return;
    try {
      await app.api(`/api/servers/${this.serverId}/network/${allocId}`, { method: 'DELETE' });
      app.showToast('Port unassigned.', 'success');
      this.renderNetworkTab(document.getElementById('subtab-content-area'));
    } catch (err) {
      app.showToast('Failed to unassign port: ' + err.message, 'error');
    }
  }
}

window.serverConsole = new ServerConsole();

