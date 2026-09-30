// Server Importer Suite (SFTP / FTP / Direct Archive URL)
class ServerImporter {
  constructor() {
    this.currentServerId = null;
    this.pollTimer = null;
  }

  async renderImporterTab(container, serverId) {
    this.currentServerId = serverId;
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-0.5 rounded-full border border-purple-500/20">Migration Engine</span>
              <span class="text-[10px] font-mono text-slate-400">ServerImporter v2.0</span>
            </div>
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <i data-lucide="download-cloud" class="w-5 h-5 text-purple-400"></i> Server Importer
            </h2>
            <p class="text-xs text-slate-400">Migrate your entire game server from another host via SFTP or direct archive download.</p>
          </div>

          <!-- Saved Profiles Dropdown -->
          <div class="flex items-center gap-2">
            <select id="importer-profile-picker" onchange="serverImporter.handleLoadProfile(this.value)" class="glass-input px-3 py-2 rounded-xl text-xs text-slate-300">
              <option value="">-- Load Saved Profile --</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Configuration Card -->
          <div class="lg:col-span-6 space-y-4">
            <div class="glass-panel p-6 rounded-3xl border border-white/10 space-y-4">
              <!-- Mode Tabs -->
              <div class="flex p-1 bg-black/40 rounded-xl border border-white/5">
                <button type="button" id="tab-mode-sftp" onclick="serverImporter.switchMode('sftp')" class="flex-1 py-1.5 rounded-lg text-xs font-bold bg-purple-600/30 text-purple-300 border border-purple-500/30 transition">
                  SFTP / Remote Host
                </button>
                <button type="button" id="tab-mode-url" onclick="serverImporter.switchMode('url')" class="flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition">
                  Direct Archive URL (.zip)
                </button>
              </div>

              <!-- SFTP Form Fields -->
              <div id="importer-sftp-fields" class="space-y-3">
                <div class="grid grid-cols-3 gap-3">
                  <div class="col-span-2">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Host / IP Address</label>
                    <input type="text" id="imp-host" placeholder="sftp.example.com or 192.168.1.1" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono" required>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Port</label>
                    <input type="number" id="imp-port" value="22" class="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono" required>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                    <input type="text" id="imp-username" placeholder="user.abc123" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono" required>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                    <div class="relative">
                      <input type="password" id="imp-password" placeholder="••••••••••••" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono pr-8" required>
                      <button type="button" onclick="serverImporter.togglePasswordVisibility()" class="absolute right-2.5 top-2.5 text-slate-400 hover:text-white">
                        <i data-lucide="eye" class="w-3.5 h-3.5" id="imp-pwd-icon"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Remote Directory Path</label>
                  <input type="text" id="imp-remote-path" value="/" placeholder="/" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono text-slate-300">
                  <p class="text-[10px] text-slate-500 mt-1">Path on the remote server where game files reside (usually / or ./)</p>
                </div>
              </div>

              <!-- URL Form Fields -->
              <div id="importer-url-fields" class="space-y-3 hidden">
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Archive Download URL</label>
                  <input type="url" id="imp-archive-url" placeholder="https://example.com/downloads/server-backup.zip" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono">
                  <p class="text-[10px] text-slate-500 mt-1">Direct downloadable link to a .zip archive containing server files.</p>
                </div>
              </div>

              <!-- Options -->
              <div class="pt-2 border-t border-white/5 space-y-2">
                <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" id="imp-wipe-target" class="rounded bg-black/40 border-white/10 text-purple-600 focus:ring-0">
                  <span>Wipe current server directory before import</span>
                </label>
              </div>

              <!-- Actions -->
              <div class="flex flex-wrap gap-2 pt-2">
                <button type="button" id="imp-btn-test" onclick="serverImporter.handleTestConnection()" class="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 transition">
                  <i data-lucide="shield-check" class="w-4 h-4 text-cyan-400"></i> Test Connection
                </button>
                <button type="button" onclick="serverImporter.handleSaveProfile()" class="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center justify-center gap-1.5 transition">
                  <i data-lucide="bookmark" class="w-4 h-4 text-amber-400"></i> Save Profile
                </button>
                <button type="button" id="imp-btn-start" onclick="serverImporter.handleStartImport()" class="w-full py-2.5 rounded-xl text-xs font-bold btn-cyber-purple flex items-center justify-center gap-2 shadow-lg">
                  <i data-lucide="upload-cloud" class="w-4 h-4"></i> Start Server Import
                </button>
              </div>
            </div>
          </div>

          <!-- Live Progress & Activity Log Card -->
          <div class="lg:col-span-6 space-y-4">
            <div class="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col h-full justify-between space-y-4">
              <div class="flex items-center justify-between border-b border-white/10 pb-3">
                <div class="flex items-center gap-2">
                  <i data-lucide="terminal" class="w-4 h-4 text-cyan-400"></i>
                  <span class="text-xs font-bold text-white">Transfer Progress & Activity</span>
                </div>
                <span id="imp-status-badge" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/10">IDLE</span>
              </div>

              <!-- Terminal Logs Window -->
              <div id="imp-log-container" class="flex-1 min-h-[300px] max-h-[400px] overflow-y-auto bg-black/60 rounded-2xl p-4 font-mono text-[11px] text-slate-300 space-y-1 border border-white/5 leading-relaxed">
                <div class="text-slate-500">Ready to initiate remote server transfer. Configure connection settings and click Start.</div>
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
                <span id="imp-status-detail">Waiting for action...</span>
                <button type="button" onclick="document.getElementById('imp-log-container').innerHTML=''" class="hover:text-white transition">Clear Logs</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    this.currentMode = 'sftp';
    this.loadProfiles();
    this.startStatusPolling();
  }

  switchMode(mode) {
    this.currentMode = mode;
    const sftpFields = document.getElementById('importer-sftp-fields');
    const urlFields = document.getElementById('importer-url-fields');
    const sftpTab = document.getElementById('tab-mode-sftp');
    const urlTab = document.getElementById('tab-mode-url');
    const btnTest = document.getElementById('imp-btn-test');

    if (mode === 'sftp') {
      sftpFields.classList.remove('hidden');
      urlFields.classList.add('hidden');
      sftpTab.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-purple-600/30 text-purple-300 border border-purple-500/30 transition';
      urlTab.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition';
      btnTest.classList.remove('hidden');
    } else {
      sftpFields.classList.add('hidden');
      urlFields.classList.remove('hidden');
      urlTab.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-purple-600/30 text-purple-300 border border-purple-500/30 transition';
      sftpTab.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition';
      btnTest.classList.add('hidden');
    }
  }

  togglePasswordVisibility() {
    const pwdInput = document.getElementById('imp-password');
    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
    } else {
      pwdInput.type = 'password';
    }
  }

  async loadProfiles() {
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/importer/profiles`);
      const picker = document.getElementById('importer-profile-picker');
      if (res.success && picker) {
        this.profiles = res.profiles || [];
        picker.innerHTML = '<option value="">-- Load Saved Profile --</option>' +
          this.profiles.map(p => `<option value="${p.id}">${p.name} (${p.host})</option>`).join('');
      }
    } catch (err) {
      console.error('Failed to load importer profiles:', err);
    }
  }

  handleLoadProfile(id) {
    if (!id || !this.profiles) return;
    const p = this.profiles.find(x => x.id === parseInt(id, 10));
    if (!p) return;

    document.getElementById('imp-host').value = p.host || '';
    document.getElementById('imp-port').value = p.port || 22;
    document.getElementById('imp-username').value = p.username || '';
    document.getElementById('imp-remote-path').value = p.remote_path || '/';
    app.toast(`Profile "${p.name}" loaded!`, 'info');
  }

  async handleSaveProfile() {
    const name = await app.prompt({
      tag: 'IMPORT PROFILE',
      tagIcon: 'server',
      title: 'Save Profile',
      message: 'Enter a name for this connection profile:',
      placeholder: 'e.g. Remote VPS SFTP',
      defaultValue: '',
      confirmText: 'Save Profile',
      confirmIcon: 'check',
      type: 'info'
    });
    if (!name || !name.trim()) return;

    const host = document.getElementById('imp-host').value.trim();
    const port = document.getElementById('imp-port').value;
    const username = document.getElementById('imp-username').value.trim();
    const remote_path = document.getElementById('imp-remote-path').value.trim();

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/importer/profiles`, {
        method: 'POST',
        body: JSON.stringify({ name, host, port, username, remote_path, mode: 'sftp' })
      });
      if (res.success) {
        app.toast('Profile saved successfully!', 'success');
        this.loadProfiles();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async handleTestConnection() {
    const host = document.getElementById('imp-host').value.trim();
    const port = document.getElementById('imp-port').value;
    const username = document.getElementById('imp-username').value.trim();
    const password = document.getElementById('imp-password').value;

    if (!host || !username) {
      return app.toast('Please specify Host and Username to test connection.', 'error');
    }

    app.toast('Testing SFTP connection...', 'info');
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/importer/test`, {
        method: 'POST',
        body: JSON.stringify({ host, port, username, password })
      });
      if (res.success) {
        app.toast('✅ Connection Successful! SFTP server responded properly.', 'success');
      } else {
        app.toast(`❌ Connection Failed: ${res.error}`, 'error');
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async handleStartImport() {
    const mode = this.currentMode;
    const wipeTarget = document.getElementById('imp-wipe-target').checked;

    let payload = { mode, wipeTarget };

    if (mode === 'sftp') {
      const host = document.getElementById('imp-host').value.trim();
      const port = document.getElementById('imp-port').value;
      const username = document.getElementById('imp-username').value.trim();
      const password = document.getElementById('imp-password').value;
      const remotePath = document.getElementById('imp-remote-path').value.trim();

      if (!host || !username) {
        return app.toast('Please enter remote host and username.', 'error');
      }
      payload = { ...payload, host, port, username, password, remotePath };
    } else {
      const archiveUrl = document.getElementById('imp-archive-url').value.trim();
      if (!archiveUrl) {
        return app.toast('Please enter the archive URL.', 'error');
      }
      payload = { ...payload, archiveUrl };
    }

    if (wipeTarget) {
      const ok = await app.confirm({
        tag: 'WIPE DESTINATION',
        tagIcon: 'alert-triangle',
        title: 'Wipe Server Directory',
        badge: window.location.host,
        message: 'WARNING: Wiping destination directory will delete all existing files on this server.',
        subtext: 'Are you sure you want to completely erase the current server contents before importing?',
        icon: 'trash-2',
        confirmIcon: 'trash-2',
        confirmText: 'Wipe & Import',
        type: 'danger'
      });
      if (!ok) return;
    }

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/importer/import`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.success) {
        app.toast('Migration initiated! Live transfer stream running.', 'success');
        this.pollStatusNow();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  startStatusPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.pollStatusNow(), 2000);
  }

  async pollStatusNow() {
    if (!this.currentServerId) return;
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/importer/status`);
      if (res.success && res.job) {
        const job = res.job;
        const badge = document.getElementById('imp-status-badge');
        const detail = document.getElementById('imp-status-detail');
        const logBox = document.getElementById('imp-log-container');

        if (badge) {
          badge.textContent = (job.status || 'idle').toUpperCase();
          if (job.status === 'transferring') {
            badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse';
          } else if (job.status === 'completed') {
            badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
          } else if (job.status === 'failed') {
            badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30';
          } else {
            badge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/10';
          }
        }

        if (detail) {
          if (job.transferredFiles) {
            detail.textContent = `Transferred files: ${job.transferredFiles}`;
          } else {
            detail.textContent = job.status === 'completed' ? 'Synchronization complete.' : (job.status === 'transferring' ? 'Transferring files...' : 'Ready');
          }
        }

        if (logBox && job.logs && job.logs.length > 0) {
          logBox.innerHTML = job.logs.map(l => `<div class="${l.includes('error') || l.includes('Warning') ? 'text-amber-400' : (l.includes('🎉') ? 'text-emerald-400 font-bold' : 'text-slate-300')}">${l}</div>`).join('');
          logBox.scrollTop = logBox.scrollHeight;
        }
      }
    } catch (e) {}
  }
}

window.serverImporter = new ServerImporter();
