/**
 * AutoBackups Client Extension Module for Mpanel
 * Ported from autobackups.blueprint (v1.0 by makkmarci13)
 */
class AutoBackupsClient {
  constructor() {
    this.currentServerId = null;
    this.backups = [];
    this.isLoading = false;
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

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  timeAgo(dateInput) {
    if (!dateInput) return 'Unknown';
    const date = new Date(dateInput);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  }

  /**
   * Render the Automatic Backups section inside the server backups tab
   */
  async renderSection(container, serverId) {
    if (!container) return;
    this.currentServerId = serverId;

    let targetEl = document.getElementById('auto-backups-section-wrapper');
    if (!targetEl) {
      targetEl = document.createElement('div');
      targetEl.id = 'auto-backups-section-wrapper';
      targetEl.className = 'mt-6 space-y-4';
      container.appendChild(targetEl);
    }

    targetEl.innerHTML = `
      <div class="glass-panel p-5 rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-cyan-950/20 shadow-xl space-y-4">
        <!-- Section Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-white/10">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <i data-lucide="clock-rewind" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="text-sm font-bold text-white">Automatic Backup(s)</h4>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase font-bold">
                  Daily Engine
                </span>
              </div>
              <p class="text-[11px] text-slate-400">
                Managed snapshots automatically captured & retained based on global server retention policies.
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 self-end sm:self-center">
            <button onclick="autoBackups.refresh('${serverId}')" title="Refresh auto backups" class="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 border border-white/10 transition">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

        <!-- Auto Backups List / Table -->
        <div id="auto-backups-list-content">
          <div class="py-6 text-center text-slate-400 text-xs">
            <div class="animate-spin inline-block w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full mb-2"></div>
            <p>Loading automatic backups...</p>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    await this.loadBackups(serverId);
  }

  async loadBackups(serverId) {
    const listEl = document.getElementById('auto-backups-list-content');
    if (!listEl) return;

    try {
      this.isLoading = true;
      const res = await app.api(`/api/servers/${serverId}/backups/auto`);
      this.backups = (res && res.backups) || [];

      if (this.backups.length === 0) {
        listEl.innerHTML = `
          <div class="py-8 text-center space-y-2 border border-dashed border-white/10 rounded-2xl bg-black/20">
            <i data-lucide="archive" class="w-8 h-8 text-slate-600 mx-auto"></i>
            <p class="text-xs text-slate-400 font-medium">It looks like there are no automatic backups currently stored for this server.</p>
            <p class="text-[11px] text-slate-500">Daily backups run automatically according to the schedule set by administrators.</p>
          </div>
        `;
      } else {
        listEl.innerHTML = `
          <div class="space-y-2">
            ${this.backups.map(b => this.renderBackupRow(b)).join('')}
          </div>
        `;
      }
    } catch (err) {
      listEl.innerHTML = `
        <div class="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs text-center">
          Failed to load automatic backups: ${this.escapeHtml(err.message)}
        </div>
      `;
    } finally {
      this.isLoading = false;
      if (window.lucide) lucide.createIcons();
    }
  }

  renderBackupRow(b) {
    const isLocked = b.is_locked === 1;
    const formattedDate = new Date(b.created_at).toLocaleString();
    const ago = this.timeAgo(b.created_at);

    return `
      <div class="p-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800/80 border border-white/10 transition flex flex-col md:flex-row md:items-center justify-between gap-3 group">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl ${isLocked ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'} flex items-center justify-center shrink-0">
            <i data-lucide="${isLocked ? 'lock' : 'archive'}" class="w-4 h-4"></i>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-bold text-xs text-white truncate max-w-[240px] sm:max-w-md">${this.escapeHtml(b.name)}</span>
              <span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                ${this.formatBytes(b.file_size)}
              </span>
              ${isLocked ? `
                <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Protected
                </span>
              ` : ''}
            </div>
            <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
              <span title="${this.escapeHtml(formattedDate)}"><i data-lucide="calendar" class="w-3 h-3 inline mr-1 text-slate-500"></i>${ago}</span>
              <span>•</span>
              <span class="truncate max-w-[180px] text-slate-500">${this.escapeHtml(b.file_name)}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1.5 self-end md:self-center shrink-0">
          <!-- Lock/Unlock Toggle -->
          <button onclick="autoBackups.toggleLock(${b.id})" title="${isLocked ? 'Unlock (allows retention auto-pruning)' : 'Lock (protects from retention auto-pruning)'}" class="p-2 rounded-xl text-xs font-semibold ${isLocked ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20' : 'text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white'} border border-white/10 transition">
            <i data-lucide="${isLocked ? 'lock' : 'unlock'}" class="w-3.5 h-3.5"></i>
          </button>

          <!-- Download Archive -->
          <a href="/api/servers/${b.server_id}/backups/${b.id}/download?token=${app.token}" target="_blank" title="Download backup archive" class="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-xs font-bold inline-flex items-center gap-1.5 border border-cyan-500/30 transition">
            <i data-lucide="download" class="w-3.5 h-3.5"></i> <span class="hidden sm:inline">Download</span>
          </a>

          <!-- Restore Backup -->
          <button onclick="autoBackups.promptRestore(${b.id}, '${this.escapeHtml(b.name)}')" title="Restore server snapshot" class="px-2.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-bold inline-flex items-center gap-1.5 border border-amber-500/30 transition">
            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> <span class="hidden sm:inline">Restore</span>
          </button>

          <!-- Delete Backup -->
          <button onclick="autoBackups.promptDelete(${b.id}, '${this.escapeHtml(b.name)}', ${isLocked})" title="Delete backup" class="p-2 rounded-xl text-rose-400 hover:text-rose-200 bg-rose-950/30 hover:bg-rose-900/50 border border-rose-500/30 transition">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }

  async refresh(serverId) {
    await this.loadBackups(serverId || this.currentServerId);
  }

  async toggleLock(backupId) {
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/backups/${backupId}/lock`, { method: 'POST' });
      if (!res.success) throw new Error(res.error || 'Failed to toggle lock');
      app.toast(res.isLocked ? 'Backup locked & protected.' : 'Backup unlocked.', 'success');
      await this.refresh();
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  promptRestore(backupId, backupName) {
    const modalContainer = document.getElementById('modal-container') || document.body;
    const modal = document.createElement('div');
    modal.id = 'autobackup-restore-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md';
    modal.innerHTML = `
      <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-amber-500/30 shadow-2xl space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <i data-lucide="rotate-ccw" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-base font-bold text-white">Restore "${this.escapeHtml(backupName)}"</h4>
            <p class="text-[11px] text-slate-400">Restore server state from this automatic backup.</p>
          </div>
        </div>

        <div class="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
          <b>Notice:</b> Server files will be overwritten by this snapshot. If the server is currently running, it is recommended to stop it before restoring.
        </div>

        <div class="flex items-center gap-2 pt-2">
          <button onclick="document.getElementById('autobackup-restore-modal').remove()" class="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition">Cancel</button>
          <button onclick="autoBackups.executeRestore(${backupId})" class="flex-1 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 transition">Confirm Restore</button>
        </div>
      </div>
    `;
    modalContainer.appendChild(modal);
    if (window.lucide) lucide.createIcons();
  }

  async executeRestore(backupId) {
    const modal = document.getElementById('autobackup-restore-modal');
    if (modal) modal.remove();

    try {
      app.toast('Restoring server snapshot...', 'info');
      const res = await app.api(`/api/servers/${this.currentServerId}/backups/${backupId}/restore`, { method: 'POST' });
      if (!res.success) throw new Error(res.error || 'Failed to restore backup');
      app.toast('Server restored from automatic backup successfully!', 'success');
      await this.refresh();
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async promptDelete(backupId, backupName, isLocked) {
    if (isLocked) {
      app.toast('This backup is locked. Please unlock it before deleting.', 'warning');
      return;
    }

    const ok = await app.confirm({
      tag: 'DELETE BACKUP',
      tagIcon: 'archive',
      title: 'Delete Backup',
      badge: window.location.host,
      message: `Are you sure you want to permanently delete "${backupName}"?`,
      subtext: 'This backup archive will be permanently erased. This action cannot be undone.',
      icon: 'trash-2',
      confirmIcon: 'trash-2',
      confirmText: 'Delete Backup',
      type: 'danger'
    });
    if (!ok) return;

    this.executeDelete(backupId);
  }

  async executeDelete(backupId) {
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/backups/${backupId}`, { method: 'DELETE' });
      if (!res.success) throw new Error(res.error || 'Failed to delete backup');
      app.toast('Automatic backup deleted.', 'success');
      await this.refresh();
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }
}

window.autoBackups = new AutoBackupsClient();
