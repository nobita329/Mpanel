// ==========================================================================
// Better Files Manager v3.5 (SAGA / Pterodactyl Edition for Mpanel)
// Features: Collapsible Tree Explorer, Live Search, Multi-Item Batch Actions,
//           Pull from URL, Git Manager, Trash Bin, Permissions Calculator,
//           File Properties & SHA256, Code Beautifier, and Media Viewer Studio.
// ==========================================================================

// Safe Global Escape Helper
if (!window.escapeHtml) {
  window.escapeHtml = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };
}
if (window.app && !window.app.escapeHtml) {
  window.app.escapeHtml = window.escapeHtml;
}

class FileManager {
  constructor() {
    this.serverId = null;
    this.currentPath = '';
    this.aceEditor = null;
    this.activeEditingFile = null;
    this.editorOriginalContent = '';
    this.selectedFiles = new Set();
    this.allCurrentFiles = [];
    this.expandedFolders = new Set(['']);
    this.searchQuery = '';
    this.searchMode = 'name'; // 'name' | 'content'
    this.trashItems = [];
    this.gitInfo = { isGit: false, branch: null, files: [] };
    this.mediaAudio = null;
    this.activeContextMenu = null;

    // Close context menu on global click
    document.addEventListener('click', () => this.hideContextMenu());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideContextMenu();
      }
    });
  }

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }


  // --------------------------------------------------------------------------
  // 1. Primary Render Method
  // --------------------------------------------------------------------------
  async renderFileManagerTab(container, serverId, currentPath = '') {
    this.serverId = serverId;
    this.currentPath = currentPath;
    this.selectedFiles.clear();

    container.innerHTML = `
      <div class="space-y-4 pb-12" id="bfm-main-wrapper">
        <!-- Action Toolbar & Breadcrumbs Header -->
        <div class="glass-panel p-3.5 rounded-2xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <!-- Breadcrumbs Path & Shortcuts -->
          <div class="flex items-center gap-2 flex-wrap min-w-0">
            <div class="flex items-center gap-1 text-xs font-mono text-slate-300 overflow-x-auto max-w-full">
              <button onclick="fileManager.navigateTo('')" class="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/5 transition">
                <i data-lucide="hard-drive" class="w-3.5 h-3.5 text-cyan-400"></i> /home/container
              </button>
              <div id="bfm-breadcrumbs-trail" class="flex items-center gap-1">${this.renderBreadcrumbsHTML(currentPath)}</div>
            </div>
            <button onclick="fileManager.copyCurrentPath()" title="Copy Path" class="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-cyan-400 transition">
              <i data-lucide="copy" class="w-3 h-3"></i>
            </button>
          </div>

          <!-- Actions Toolbar -->
          <div class="flex items-center gap-2 flex-wrap">
            <button onclick="fileManager.showPullUrlModal()" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition">
              <i data-lucide="download-cloud" class="w-3.5 h-3.5"></i> Pull URL
            </button>
            <label class="btn-cyber px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-md">
              <i data-lucide="upload" class="w-3.5 h-3.5"></i> Upload
              <input type="file" multiple class="hidden" onchange="fileManager.handleUpload(this)">
            </label>
            <button onclick="fileManager.showNewFileModal()" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/10 flex items-center gap-1.5 transition">
              <i data-lucide="file-plus" class="w-3.5 h-3.5"></i> New File
            </button>
            <button onclick="fileManager.showNewFolderModal()" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/10 flex items-center gap-1.5 transition">
              <i data-lucide="folder-plus" class="w-3.5 h-3.5"></i> New Folder
            </button>
            <button onclick="fileManager.showGitModal()" class="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 flex items-center gap-1.5 transition" title="Git Integration">
              <i data-lucide="git-branch" class="w-3.5 h-3.5 text-violet-400"></i>
              <span id="bfm-git-branch-badge" class="hidden sm:inline text-[11px] font-mono">Git</span>
            </button>
            <button onclick="fileManager.showTrashModal()" class="relative px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 flex items-center gap-1.5 transition" title="Trash Bin">
              <i data-lucide="trash-2" class="w-3.5 h-3.5 text-rose-400"></i>
              <span id="bfm-trash-badge" class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">0</span>
            </button>
            <button onclick="fileManager.refresh()" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 flex items-center justify-center transition">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

        <!-- 2-Column Responsive Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <!-- Left Column: Search & Tree Explorer (3 cols) -->
          <div class="lg:col-span-3 space-y-3">
            <!-- Search Box -->
            <div class="glass-panel p-3 rounded-2xl border border-white/10 space-y-2">
              <div class="relative">
                <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"></i>
                <input type="text" id="bfm-tree-search" placeholder="Search files or content..." oninput="fileManager.handleSearchInput(this.value)" class="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-black/40 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono">
              </div>
              <div class="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>Mode:</span>
                <div class="flex items-center gap-1">
                  <button id="search-mode-name" onclick="fileManager.setSearchMode('name')" class="px-2 py-0.5 rounded font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">Name</button>
                  <button id="search-mode-content" onclick="fileManager.setSearchMode('content')" class="px-2 py-0.5 rounded font-semibold bg-white/5 text-slate-400 hover:text-white">Content</button>
                </div>
              </div>
            </div>

            <!-- Interactive Tree Explorer -->
            <div class="glass-panel p-3 rounded-2xl border border-white/10 max-h-[580px] overflow-y-auto">
              <div class="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                <span class="flex items-center gap-1.5"><i data-lucide="folder-tree" class="w-3.5 h-3.5 text-amber-400"></i> Explorer</span>
                <button onclick="fileManager.collapseAllFolders()" class="text-slate-500 hover:text-white text-[10px] lowercase hover:underline">collapse all</button>
              </div>
              <div id="bfm-tree-container" class="space-y-0.5 text-xs font-mono">
                <div class="text-slate-500 text-[11px] px-2 py-2">Loading tree...</div>
              </div>
            </div>

            <!-- Quick Jump Directory Badges -->
            <div class="glass-panel p-3 rounded-2xl border border-white/10">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">Quick Jump</span>
              <div class="flex flex-wrap gap-1.5">
                <button onclick="fileManager.navigateTo('')" class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition">/root</button>
                <button onclick="fileManager.navigateTo('plugins')" class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 transition">/plugins</button>
                <button onclick="fileManager.navigateTo('mods')" class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 transition">/mods</button>
                <button onclick="fileManager.navigateTo('config')" class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 transition">/config</button>
                <button onclick="fileManager.navigateTo('logs')" class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition">/logs</button>
                <button onclick="fileManager.navigateTo('world')" class="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition">/world</button>
              </div>
            </div>
          </div>

          <!-- Right Column: Files List & Multi-Actions (9 cols) -->
          <div class="lg:col-span-9 space-y-3">
            <!-- Floating Multi-Item Selection Bar -->
            <div id="bfm-selection-bar" class="hidden p-3 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-xs flex flex-wrap items-center justify-between gap-3 shadow-2xl backdrop-blur-lg">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span id="bfm-selected-count" class="font-bold text-white">0 items selected</span>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <button onclick="fileManager.handleBulkArchive()" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 transition">
                  <i data-lucide="archive" class="w-3.5 h-3.5"></i> Archive
                </button>
                <button onclick="fileManager.handleBulkMovePrompt()" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition">
                  <i data-lucide="folder-input" class="w-3.5 h-3.5"></i> Move
                </button>
                <button onclick="fileManager.handleBulkCopyPrompt()" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition">
                  <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copy
                </button>
                <button onclick="fileManager.handleBulkTrash()" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Move to Trash
                </button>
                <button onclick="fileManager.handleBulkDeletePermanent()" class="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 transition" title="Delete Permanently">
                  <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> Delete
                </button>
                <button onclick="fileManager.clearSelection()" class="w-7 h-7 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>

            <!-- Drag & Drop Overlay Zone -->
            <div id="bfm-drag-drop-zone" class="relative glass-panel rounded-2xl border border-white/10 overflow-hidden" ondragover="fileManager.handleDragOver(event)" ondragleave="fileManager.handleDragLeave(event)" ondrop="fileManager.handleDrop(event)">
              <div id="bfm-drop-overlay" class="hidden absolute inset-0 z-30 bg-cyan-950/80 border-2 border-dashed border-cyan-400 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none">
                <i data-lucide="upload-cloud" class="w-12 h-12 text-cyan-400 animate-bounce mb-2"></i>
                <p class="text-sm font-bold text-white">Drop files here to upload to current directory</p>
              </div>

              <!-- Files Table -->
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs text-slate-300">
                  <thead class="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                    <tr>
                      <th class="px-4 py-3 w-10">
                        <input type="checkbox" id="bfm-select-all" onchange="fileManager.toggleSelectAll(this.checked)" class="rounded bg-black/40 border-white/20 text-cyan-500 focus:ring-0 cursor-pointer">
                      </th>
                      <th class="px-3 py-3">Name</th>
                      <th class="px-4 py-3 hidden sm:table-cell">Size</th>
                      <th class="px-4 py-3 hidden md:table-cell">Permissions</th>
                      <th class="px-4 py-3 hidden lg:table-cell">Modified</th>
                      <th class="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody id="files-table-tbody" class="divide-y divide-white/5 font-mono">
                    <tr><td colspan="6" class="text-center py-12 text-slate-500">Loading directory contents...</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Load directory & auxiliary telemetry
    await Promise.all([
      this.loadDirectory(this.currentPath),
      this.refreshTrashCount(),
      this.refreshGitStatus()
    ]);

    if (window.lucide) lucide.createIcons();
  }

  // --------------------------------------------------------------------------
  // 2. Breadcrumbs Navigation
  // --------------------------------------------------------------------------
  renderBreadcrumbsHTML(p) {
    if (!p) return '';
    const segments = p.split('/').filter(Boolean);
    let accum = '';
    return segments.map((seg) => {
      accum += (accum ? '/' : '') + seg;
      const target = accum;
      return `
        <span class="text-slate-500">/</span>
        <button onclick="fileManager.navigateTo('${app.escapeHtml(target)}')" class="text-slate-300 hover:text-cyan-400 hover:underline px-1 py-0.5 rounded transition">
          ${app.escapeHtml(seg)}
        </button>
      `;
    }).join('');
  }

  copyCurrentPath() {
    const full = '/home/container' + (this.currentPath ? '/' + this.currentPath : '');
    navigator.clipboard.writeText(full).then(() => {
      app.playSound('copy');
      app.toast(`Copied path: ${full}`, 'info');
    });
  }

  // --------------------------------------------------------------------------
  // 3. Directory Loading & Table Rendering
  // --------------------------------------------------------------------------
  async loadDirectory(subPath = '') {
    this.currentPath = subPath;
    this.selectedFiles.clear();
    this.updateSelectionBar();

    const trail = document.getElementById('bfm-breadcrumbs-trail');
    if (trail) trail.innerHTML = this.renderBreadcrumbsHTML(subPath);

    const tbody = document.getElementById('files-table-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-12 text-slate-500"><i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400"></i>Loading files...</td></tr>`;
      if (window.lucide) lucide.createIcons();
    }

    try {
      const data = await app.api(`/api/servers/${this.serverId}/files?directory=${encodeURIComponent(subPath)}`);
      const files = data.files || [];
      this.allCurrentFiles = files;

      if (!tbody) return;

      if (files.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-16 text-slate-500">
              <i data-lucide="folder-open" class="w-10 h-10 mx-auto mb-3 opacity-40 text-slate-400"></i>
              <p class="text-sm font-semibold text-slate-400">This directory is empty</p>
              <p class="text-xs text-slate-500 mt-1">Upload files or pull from a URL to get started.</p>
            </td>
          </tr>
        `;
        if (window.lucide) lucide.createIcons();
        this.renderFileTree();
        return;
      }

      let rowsHtml = '';
      if (subPath) {
        const parentPath = subPath.split('/').slice(0, -1).join('/');
        rowsHtml += `
          <tr class="hover:bg-white/5 transition-colors cursor-pointer" onclick="fileManager.navigateTo('${app.escapeHtml(parentPath)}')">
            <td class="px-4 py-2.5"></td>
            <td class="px-3 py-2.5 flex items-center gap-2.5 font-bold text-slate-400 hover:text-cyan-300">
              <i data-lucide="corner-left-up" class="w-4 h-4 text-cyan-400"></i> ..
            </td>
            <td class="px-4 py-2.5 text-slate-500 text-[11px] hidden sm:table-cell">—</td>
            <td class="px-4 py-2.5 text-slate-500 text-[11px] hidden md:table-cell">—</td>
            <td class="px-4 py-2.5 text-slate-500 text-[11px] hidden lg:table-cell">—</td>
            <td class="px-4 py-2.5 text-right"></td>
          </tr>
        `;
      }

      files.forEach((f) => {
        const itemRel = subPath ? `${subPath}/${f.name}` : f.name;
        const iconData = this.resolveFileIcon(f.name, f.isDirectory);
        const badgeData = this.resolveFileTypeBadge(f.name, f.isDirectory);
        const isSelected = this.selectedFiles.has(itemRel);

        rowsHtml += `
          <tr class="hover:bg-white/5 transition-colors group cursor-pointer ${isSelected ? 'bg-cyan-500/10' : ''}" 
              oncontextmenu="fileManager.handleContextMenu(event, '${app.escapeHtml(itemRel)}', ${f.isDirectory})"
              onclick="fileManager.handleRowClick(event, '${app.escapeHtml(itemRel)}', ${f.isDirectory})">
            <!-- Selection Checkbox -->
            <td class="px-4 py-2.5" onclick="event.stopPropagation()">
              <input type="checkbox" value="${app.escapeHtml(itemRel)}" ${isSelected ? 'checked' : ''} onchange="fileManager.toggleFileSelection('${app.escapeHtml(itemRel)}', this.checked)" class="rounded bg-black/40 border-white/20 text-cyan-500 focus:ring-0 cursor-pointer">
            </td>

            <!-- File / Folder Name & Badge -->
            <td class="px-3 py-2.5">
              <div class="flex items-center gap-2.5">
                <i data-lucide="${iconData.icon}" class="w-4 h-4 ${iconData.color} shrink-0"></i>
                <span class="text-white hover:text-cyan-300 font-medium truncate max-w-[260px] sm:max-w-md">${app.escapeHtml(f.name)}</span>
                ${badgeData}
              </div>
            </td>

            <!-- Size -->
            <td class="px-4 py-2.5 text-slate-400 text-[11px] hidden sm:table-cell">
              ${f.isDirectory ? '<span class="text-slate-600">—</span>' : this.formatSize(f.size)}
            </td>

            <!-- Permissions -->
            <td class="px-4 py-2.5 hidden md:table-cell">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-400 border border-white/5 group-hover:border-white/15 transition">${f.mode || '0644'}</span>
            </td>

            <!-- Modified Date -->
            <td class="px-4 py-2.5 text-slate-400 text-[11px] hidden lg:table-cell">
              ${f.modifiedAt ? new Date(f.modifiedAt).toLocaleDateString() + ' ' + new Date(f.modifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            </td>

            <!-- Quick Action Dropdown -->
            <td class="px-4 py-2.5 text-right" onclick="event.stopPropagation()">
              <button onclick="fileManager.showActionDropdown(event, '${app.escapeHtml(itemRel)}', ${f.isDirectory})" class="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition">
                <i data-lucide="more-vertical" class="w-4 h-4"></i>
              </button>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = rowsHtml;
      if (window.lucide) lucide.createIcons();

      // Render Tree Explorer
      this.renderFileTree();
    } catch (err) {
      console.error('Error loading directory:', err);
      const safeErr = this.escapeHtml(err.message || 'Failed to load directory');
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-rose-400 font-semibold">${safeErr}</td></tr>`;
    }
  }

  // Row Click: single click / double click
  handleRowClick(e, relPath, isDirectory) {
    if (isDirectory) {
      this.navigateTo(relPath);
    } else {
      this.openItem(relPath);
    }
  }

  // Open item appropriately (editor vs media viewer)
  openItem(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext)) {
      this.openMediaViewer(filePath, 'image');
    } else if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
      this.openMediaViewer(filePath, 'audio');
    } else if (['mp4', 'webm', 'ogv'].includes(ext)) {
      this.openMediaViewer(filePath, 'video');
    } else {
      this.openEditor(filePath);
    }
  }

  // --------------------------------------------------------------------------
  // 4. File Icon & Badge Resolvers (Better Files v3.5 Aesthetics)
  // --------------------------------------------------------------------------
  resolveFileIcon(name, isDirectory) {
    if (isDirectory) {
      return { icon: 'folder', color: 'text-amber-400 fill-amber-400/20' };
    }
    const ext = name.split('.').pop().toLowerCase();
    switch (ext) {
      case 'jar':
        return { icon: 'coffee', color: 'text-rose-400' };
      case 'yml':
      case 'yaml':
        return { icon: 'settings-2', color: 'text-emerald-400' };
      case 'json':
        return { icon: 'braces', color: 'text-cyan-400' };
      case 'js':
      case 'ts':
        return { icon: 'code', color: 'text-yellow-400' };
      case 'py':
        return { icon: 'terminal', color: 'text-blue-400' };
      case 'sh':
      case 'bash':
        return { icon: 'terminal-square', color: 'text-emerald-400' };
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return { icon: 'image', color: 'text-purple-400' };
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'flac':
        return { icon: 'music', color: 'text-pink-400' };
      case 'mp4':
      case 'webm':
        return { icon: 'video', color: 'text-indigo-400' };
      case 'zip':
      case 'tar':
      case 'gz':
      case 'rar':
        return { icon: 'archive', color: 'text-amber-400' };
      case 'md':
        return { icon: 'file-text', color: 'text-cyan-300' };
      case 'log':
      case 'txt':
        return { icon: 'file-text', color: 'text-slate-400' };
      default:
        return { icon: 'file', color: 'text-slate-400' };
    }
  }

  resolveFileTypeBadge(name, isDirectory) {
    if (isDirectory) return '';
    const ext = name.split('.').pop().toLowerCase();
    const badges = {
      jar: '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">JAR</span>',
      yml: '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">YML</span>',
      yaml: '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">YAML</span>',
      json: '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">JSON</span>',
      properties: '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">PROP</span>',
      zip: '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">ZIP</span>',
      mp3: '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">AUDIO</span>',
      png: '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">IMG</span>',
      jpg: '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">IMG</span>'
    };
    return badges[ext] || '';
  }

  // --------------------------------------------------------------------------
  // 5. Left Tree Explorer Rendering
  // --------------------------------------------------------------------------
  renderFileTree() {
    const treeEl = document.getElementById('bfm-tree-container');
    if (!treeEl) return;

    const folders = this.allCurrentFiles.filter(f => f.isDirectory);
    let html = `
      <div class="px-2 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer ${this.currentPath === '' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-white/5'}" onclick="fileManager.navigateTo('')">
        <i data-lucide="hard-drive" class="w-3.5 h-3.5 text-cyan-400"></i>
        <span>/ (root)</span>
      </div>
    `;

    folders.forEach(f => {
      const rel = this.currentPath ? `${this.currentPath}/${f.name}` : f.name;
      const isActive = this.currentPath === rel;
      html += `
        <div class="pl-4 py-1 rounded-lg flex items-center justify-between cursor-pointer group ${isActive ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'}" onclick="fileManager.navigateTo('${app.escapeHtml(rel)}')">
          <div class="flex items-center gap-1.5 truncate">
            <i data-lucide="folder" class="w-3.5 h-3.5 text-amber-400 fill-amber-400/20"></i>
            <span class="truncate">${app.escapeHtml(f.name)}</span>
          </div>
          <i data-lucide="chevron-right" class="w-3 h-3 text-slate-600 group-hover:text-slate-300 opacity-0 group-hover:opacity-100 transition mr-1"></i>
        </div>
      `;
    });

    treeEl.innerHTML = html;
    if (window.lucide) lucide.createIcons();
  }

  collapseAllFolders() {
    this.expandedFolders.clear();
    this.navigateTo('');
  }

  // --------------------------------------------------------------------------
  // 6. Multi-Item Selection & Batch Operations
  // --------------------------------------------------------------------------
  toggleFileSelection(relPath, checked) {
    if (checked) {
      this.selectedFiles.add(relPath);
    } else {
      this.selectedFiles.delete(relPath);
    }
    this.updateSelectionBar();
  }

  toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll('#files-table-tbody input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = checked;
      if (checked) {
        this.selectedFiles.add(cb.value);
      } else {
        this.selectedFiles.delete(cb.value);
      }
    });
    this.updateSelectionBar();
  }

  clearSelection() {
    this.selectedFiles.clear();
    const selectAll = document.getElementById('bfm-select-all');
    if (selectAll) selectAll.checked = false;
    document.querySelectorAll('#files-table-tbody input[type="checkbox"]').forEach(cb => cb.checked = false);
    this.updateSelectionBar();
  }

  updateSelectionBar() {
    const bar = document.getElementById('bfm-selection-bar');
    const countEl = document.getElementById('bfm-selected-count');
    if (!bar) return;

    const count = this.selectedFiles.size;
    if (count > 0) {
      bar.classList.remove('hidden');
      if (countEl) countEl.innerText = `${count} ${count === 1 ? 'item' : 'items'} selected`;
    } else {
      bar.classList.add('hidden');
    }
  }

  async handleBulkArchive() {
    if (this.selectedFiles.size === 0) return;
    const outputName = await app.prompt({
      tag: 'COMPRESS ARCHIVE',
      tagIcon: 'archive',
      title: 'Create Archive',
      message: 'Enter archive name (e.g. backup.zip):',
      placeholder: 'backup.zip',
      defaultValue: 'archive.zip',
      confirmText: 'Create Archive',
      confirmIcon: 'archive',
      type: 'fuchsia'
    });
    if (!outputName) return;

    app.toast('Compressing selected items...', 'info');
    try {
      await app.api(`/api/servers/${this.serverId}/files/compress`, {
        method: 'POST',
        body: JSON.stringify({
          files: Array.from(this.selectedFiles),
          outputName
        })
      });
      app.toast('Archive created successfully!', 'success');
      this.clearSelection();
      this.refresh();
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async handleBulkTrash() {
    if (this.selectedFiles.size === 0) return;
    const ok = await app.confirm({
      tag: 'MOVE TO TRASH',
      tagIcon: 'trash-2',
      title: 'Move to Trash',
      badge: window.location.host,
      message: `Move ${this.selectedFiles.size} items to Trash Bin?`,
      subtext: 'Items can be inspected and restored or permanently wiped from the Trash Bin.',
      icon: 'trash-2',
      confirmIcon: 'trash-2',
      confirmText: 'Move to Trash',
      type: 'warning'
    });
    if (!ok) return;

    try {
      await app.api(`/api/servers/${this.serverId}/files/move-to-trash`, {
        method: 'POST',
        body: JSON.stringify({ items: Array.from(this.selectedFiles) })
      });
      app.toast(`Moved ${this.selectedFiles.size} items to Trash Bin.`, 'success');
      this.clearSelection();
      this.refresh();
      this.refreshTrashCount();
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async handleBulkDeletePermanent() {
    if (this.selectedFiles.size === 0) return;
    const ok = await app.confirm({
      tag: 'PERMANENT DELETE',
      tagIcon: 'alert-triangle',
      title: 'Permanent Delete',
      badge: window.location.host,
      message: `Are you sure you want to permanently destroy ${this.selectedFiles.size} items?`,
      subtext: '⚠️ CRITICAL WARNING: This action CANNOT be undone! Selected items will be erased from disk.',
      icon: 'trash-2',
      confirmIcon: 'trash-2',
      confirmText: 'Destroy Items',
      type: 'danger'
    });
    if (!ok) return;

    try {
      for (const item of this.selectedFiles) {
        await app.api(`/api/servers/${this.serverId}/files/delete`, {
          method: 'POST',
          body: JSON.stringify({ itemPath: item })
        });
      }
      app.toast(`Permanently deleted ${this.selectedFiles.size} items.`, 'info');
      this.clearSelection();
      this.refresh();
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async handleBulkMovePrompt() {
    if (this.selectedFiles.size === 0) return;
    const dest = await app.prompt({
      tag: 'BULK MOVE',
      tagIcon: 'folder',
      title: 'Move Selected Items',
      message: 'Enter destination directory path (relative to /home/container):',
      placeholder: 'e.g. plugins or leave blank for root',
      defaultValue: this.currentPath || '',
      confirmText: 'Move Items',
      confirmIcon: 'check',
      type: 'fuchsia'
    });
    if (dest === null) return;

    try {
      for (const item of this.selectedFiles) {
        const baseName = item.split('/').pop();
        const targetNew = dest ? `${dest.replace(/^[\/\\]+/, '')}/${baseName}` : baseName;
        await app.api(`/api/servers/${this.serverId}/files/rename`, {
          method: 'POST',
          body: JSON.stringify({ oldPath: item, newPath: targetNew })
        });
      }
      app.toast(`Moved ${this.selectedFiles.size} items to ${dest || '/root'}.`, 'success');
      this.clearSelection();
      this.refresh();
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async handleBulkCopyPrompt() {
    if (this.selectedFiles.size === 0) return;
    const dest = await app.prompt({
      tag: 'BULK COPY',
      tagIcon: 'copy',
      title: 'Copy Selected Items',
      message: 'Enter destination folder for copy:',
      placeholder: 'e.g. backup or leave blank for root',
      defaultValue: this.currentPath || '',
      confirmText: 'Copy Items',
      confirmIcon: 'copy',
      type: 'fuchsia'
    });
    if (dest === null) return;

    try {
      for (const item of this.selectedFiles) {
        const baseName = item.split('/').pop();
        const targetNew = dest ? `${dest.replace(/^[\/\\]+/, '')}/${baseName}` : `copy_${baseName}`;
        await app.api(`/api/servers/${this.serverId}/files/copy`, {
          method: 'POST',
          body: JSON.stringify({ sourcePath: item, destPath: targetNew })
        });
      }
      app.toast(`Copied ${this.selectedFiles.size} items.`, 'success');
      this.clearSelection();
      this.refresh();
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  // --------------------------------------------------------------------------
  // 7. Right-Click Context Menu & Action Dropdown
  // --------------------------------------------------------------------------
  handleContextMenu(e, relPath, isDirectory) {
    e.preventDefault();
    this.showFloatingContextMenu(e.clientX, e.clientY, relPath, isDirectory);
  }

  showActionDropdown(e, relPath, isDirectory) {
    const rect = e.currentTarget.getBoundingClientRect();
    this.showFloatingContextMenu(rect.left - 120, rect.bottom + 5, relPath, isDirectory);
  }

  showFloatingContextMenu(x, y, relPath, isDirectory) {
    this.hideContextMenu();
    const menu = document.createElement('div');
    menu.id = 'bfm-context-menu';
    menu.className = 'fixed z-[9999] w-48 rounded-xl bg-[#18191f] border border-white/15 shadow-2xl p-1.5 text-xs text-slate-200 font-sans space-y-0.5 backdrop-blur-xl';
    
    // Bounds check
    const maxX = window.innerWidth - 200;
    const maxY = window.innerHeight - 300;
    menu.style.left = `${Math.min(x, maxX)}px`;
    menu.style.top = `${Math.min(y, maxY)}px`;

    const ext = relPath.split('.').pop().toLowerCase();
    const isZip = ['zip', 'tar', 'gz'].includes(ext);
    const isMedia = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp3', 'wav', 'ogg', 'flac', 'mp4', 'webm'].includes(ext);

    menu.innerHTML = `
      ${!isDirectory ? `
        <button onclick="fileManager.openItem('${app.escapeHtml(relPath)}')" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 transition">
          <i data-lucide="${isMedia ? 'play-circle' : 'edit-3'}" class="w-3.5 h-3.5 text-cyan-400"></i>
          <span>${isMedia ? 'Preview / Play' : 'Edit File'}</span>
        </button>
      ` : `
        <button onclick="fileManager.navigateTo('${app.escapeHtml(relPath)}')" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 transition">
          <i data-lucide="folder-open" class="w-3.5 h-3.5 text-amber-400"></i>
          <span>Open Folder</span>
        </button>
      `}
      <button onclick="fileManager.promptRename('${app.escapeHtml(relPath)}')" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 transition">
        <i data-lucide="tag" class="w-3.5 h-3.5 text-yellow-400"></i>
        <span>Rename</span>
      </button>
      <button onclick="fileManager.promptCopy('${app.escapeHtml(relPath)}')" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 transition">
        <i data-lucide="copy" class="w-3.5 h-3.5 text-slate-400"></i>
        <span>Duplicate</span>
      </button>
      ${!isDirectory ? `
        <a href="/api/servers/${this.serverId}/files/download?file=${encodeURIComponent(relPath)}" download class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 transition text-slate-200">
          <i data-lucide="download" class="w-3.5 h-3.5 text-emerald-400"></i>
          <span>Download</span>
        </a>
      ` : ''}
      ${isZip ? `
        <button onclick="fileManager.promptExtract('${app.escapeHtml(relPath)}')" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 transition text-amber-300">
          <i data-lucide="package-open" class="w-3.5 h-3.5 text-amber-400"></i>
          <span>Extract Archive</span>
        </button>
      ` : ''}
      <button onclick="fileManager.showPermissionsModal('${app.escapeHtml(relPath)}')" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 transition">
        <i data-lucide="shield" class="w-3.5 h-3.5 text-blue-400"></i>
        <span>Permissions (chmod)</span>
      </button>
      <button onclick="fileManager.showPropertiesModal('${app.escapeHtml(relPath)}')" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center gap-2 transition">
        <i data-lucide="info" class="w-3.5 h-3.5 text-slate-400"></i>
        <span>Properties</span>
      </button>
      <div class="h-px bg-white/10 my-1"></div>
      <button onclick="fileManager.moveSingleToTrash('${app.escapeHtml(relPath)}')" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-300 flex items-center gap-2 transition">
        <i data-lucide="trash-2" class="w-3.5 h-3.5 text-rose-400"></i>
        <span>Move to Trash</span>
      </button>
      <button onclick="fileManager.deleteSinglePermanent('${app.escapeHtml(relPath)}')" class="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-600/30 text-rose-400 flex items-center gap-2 transition">
        <i data-lucide="x-circle" class="w-3.5 h-3.5"></i>
        <span>Permanent Delete</span>
      </button>
    `;

    document.body.appendChild(menu);
    this.activeContextMenu = menu;
    if (window.lucide) lucide.createIcons();
  }

  hideContextMenu() {
    if (this.activeContextMenu) {
      this.activeContextMenu.remove();
      this.activeContextMenu = null;
    }
  }

  // --------------------------------------------------------------------------
  // 8. Pull From URL Modal
  // --------------------------------------------------------------------------
  showPullUrlModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div class="glass-panel w-full max-w-lg p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="download-cloud" class="w-5 h-5 text-cyan-400"></i> Pull File From URL
            </h3>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="text-slate-400 hover:text-white">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <div>
              <label class="font-semibold text-slate-300 block mb-1">Direct Download URL</label>
              <div class="flex gap-2">
                <input type="url" id="pull-url-input" placeholder="https://example.com/plugin.jar" class="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white font-mono focus:border-cyan-400 focus:outline-none">
                <button type="button" onclick="fileManager.probePullUrl()" class="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition">Inspect</button>
              </div>
            </div>

            <div id="pull-url-preview-box" class="hidden p-3 rounded-xl bg-white/5 border border-white/10 space-y-1 text-slate-300">
              <div class="flex justify-between"><span>File Size:</span><span id="pull-url-size" class="font-bold text-cyan-400">—</span></div>
              <div class="flex justify-between"><span>Detected Name:</span><span id="pull-url-name" class="font-mono text-white">—</span></div>
            </div>

            <div>
              <label class="font-semibold text-slate-300 block mb-1">Save As Filename (Optional)</label>
              <input type="text" id="pull-url-filename" placeholder="Auto-detected if left blank" class="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white font-mono focus:border-cyan-400 focus:outline-none">
            </div>

            <div>
              <label class="font-semibold text-slate-300 block mb-1">Target Directory</label>
              <input type="text" id="pull-url-dir" value="${app.escapeHtml(this.currentPath || '/')}" class="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-slate-400 font-mono" readonly>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold">Cancel</button>
            <button id="btn-start-pull" onclick="fileManager.executePullUrl()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <i data-lucide="download" class="w-3.5 h-3.5"></i> Download to Server
            </button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async probePullUrl() {
    const url = document.getElementById('pull-url-input')?.value.trim();
    if (!url) return app.toast('Enter a valid URL', 'warning');

    try {
      const res = await app.api(`/api/servers/${this.serverId}/files/pull-url/query`, {
        method: 'POST',
        body: JSON.stringify({ url })
      });
      const box = document.getElementById('pull-url-preview-box');
      const sizeEl = document.getElementById('pull-url-size');
      const nameEl = document.getElementById('pull-url-name');
      const fnInput = document.getElementById('pull-url-filename');

      if (box) box.classList.remove('hidden');
      if (sizeEl) sizeEl.innerText = res.size > 0 ? this.formatSize(res.size) : 'Unknown (Streamed)';
      if (nameEl) nameEl.innerText = res.filename;
      if (fnInput && !fnInput.value) fnInput.value = res.filename;
      app.toast('URL inspected successfully.', 'info');
    } catch (e) {
      app.toast('Could not probe URL', 'warning');
    }
  }

  async executePullUrl() {
    const url = document.getElementById('pull-url-input')?.value.trim();
    const customFilename = document.getElementById('pull-url-filename')?.value.trim();
    if (!url) return app.toast('Please specify a URL', 'error');

    const btn = document.getElementById('btn-start-pull');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Downloading...`;
      if (window.lucide) lucide.createIcons();
    }

    try {
      const res = await app.api(`/api/servers/${this.serverId}/files/pull-url`, {
        method: 'POST',
        body: JSON.stringify({
          url,
          directory: this.currentPath,
          filename: customFilename
        })
      });
      document.getElementById('modal-container').innerHTML = '';
      app.toast(`Downloaded ${res.filename} (${this.formatSize(res.size)}) successfully!`, 'success');
      this.refresh();
    } catch (err) {
      app.toast(err.message || 'Failed to download file from URL', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="download" class="w-3.5 h-3.5"></i> Retry Download`;
      }
    }
  }

  // --------------------------------------------------------------------------
  // 9. Trash Bin Modal & Actions
  // --------------------------------------------------------------------------
  async refreshTrashCount() {
    try {
      const data = await app.api(`/api/servers/${this.serverId}/files/trash`);
      this.trashItems = data.items || [];
      const badge = document.getElementById('bfm-trash-badge');
      if (badge) badge.innerText = `${this.trashItems.length}`;
    } catch (e) {
      // Ignore
    }
  }

  async showTrashModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div class="glass-panel w-full max-w-3xl max-h-[85vh] p-6 rounded-3xl border border-white/15 shadow-2xl flex flex-col justify-between">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center gap-2">
              <i data-lucide="trash-2" class="w-5 h-5 text-rose-400"></i>
              <h3 class="text-base font-bold text-white">Trash Bin</h3>
              <span id="trash-modal-badge" class="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30">Loading...</span>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="fileManager.emptyTrash()" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition">
                <i data-lucide="trash" class="w-3.5 h-3.5"></i> Empty Trash
              </button>
              <button onclick="document.getElementById('modal-container').innerHTML=''" class="text-slate-400 hover:text-white p-1">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto my-4 space-y-2" id="trash-items-container">
            <div class="text-center py-10 text-slate-500">Loading trash bin items...</div>
          </div>

          <div class="flex justify-between items-center text-xs text-slate-400 pt-3 border-t border-white/10">
            <span>Items moved to trash can be restored back to their exact original location.</span>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold">Close</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    await this.renderTrashItemsList();
  }

  async renderTrashItemsList() {
    const listEl = document.getElementById('trash-items-container');
    const badgeEl = document.getElementById('trash-modal-badge');
    if (!listEl) return;

    try {
      const data = await app.api(`/api/servers/${this.serverId}/files/trash`);
      const items = data.items || [];
      this.trashItems = items;
      if (badgeEl) badgeEl.innerText = `${items.length} items`;

      if (items.length === 0) {
        listEl.innerHTML = `
          <div class="text-center py-16 text-slate-500">
            <i data-lucide="sparkles" class="w-10 h-10 mx-auto mb-2 text-slate-600"></i>
            <p class="text-sm font-semibold text-slate-400">Trash bin is clean!</p>
            <p class="text-xs text-slate-500 mt-0.5">No deleted files are currently staged.</p>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      let html = '';
      items.forEach(it => {
        html += `
          <div class="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 hover:bg-white/10 transition">
            <div class="flex items-center gap-3 min-w-0">
              <i data-lucide="${it.isDirectory ? 'folder' : 'file'}" class="w-4 h-4 ${it.isDirectory ? 'text-amber-400' : 'text-cyan-400'} shrink-0"></i>
              <div class="min-w-0">
                <p class="text-xs font-bold text-white truncate font-mono">${app.escapeHtml(it.originalName)}</p>
                <p class="text-[10px] text-slate-400 truncate">Original: <span class="font-mono text-slate-300">/${app.escapeHtml(it.originalPath)}</span></p>
              </div>
            </div>
            <div class="flex items-center gap-3 shrink-0">
              <span class="text-[11px] text-slate-400 hidden sm:inline">${this.formatSize(it.size)}</span>
              <button onclick="fileManager.restoreTrashItem('${app.escapeHtml(it.trashName)}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition">
                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Restore
              </button>
            </div>
          </div>
        `;
      });

      listEl.innerHTML = html;
      if (window.lucide) lucide.createIcons();
    } catch (e) {
      listEl.innerHTML = `<div class="text-center text-rose-400 py-6">${app.escapeHtml(e.message)}</div>`;
    }
  }

  async moveSingleToTrash(relPath) {
    try {
      await app.api(`/api/servers/${this.serverId}/files/move-to-trash`, {
        method: 'POST',
        body: JSON.stringify({ items: [relPath] })
      });
      app.toast(`Moved "${relPath.split('/').pop()}" to Trash Bin.`, 'success');
      this.refresh();
      this.refreshTrashCount();
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async restoreTrashItem(trashName) {
    try {
      await app.api(`/api/servers/${this.serverId}/files/restore-from-trash`, {
        method: 'POST',
        body: JSON.stringify({ trashNames: [trashName] })
      });
      app.toast('Item restored to original location!', 'success');
      await this.renderTrashItemsList();
      this.refresh();
      this.refreshTrashCount();
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  async emptyTrash() {
    const ok = await app.confirm({
      tag: 'EMPTY TRASH',
      tagIcon: 'trash-2',
      title: 'Empty Trash',
      badge: window.location.host,
      message: 'Permanently wipe and empty the Trash Bin?',
      subtext: 'All trashed files and folders will be irrevocably purged from storage.',
      icon: 'trash-2',
      confirmIcon: 'trash-2',
      confirmText: 'Empty Trash',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await app.api(`/api/servers/${this.serverId}/files/empty-trash`, { method: 'POST' });
      app.toast('Trash bin emptied successfully.', 'info');
      await this.renderTrashItemsList();
      this.refreshTrashCount();
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  // --------------------------------------------------------------------------
  // 10. Git Integration Modal
  // --------------------------------------------------------------------------
  async refreshGitStatus() {
    try {
      const data = await app.api(`/api/servers/${this.serverId}/files/git/status`);
      this.gitInfo = data;
      const badge = document.getElementById('bfm-git-branch-badge');
      if (badge && data.isGit && data.branch) {
        badge.innerText = `${data.branch}`;
      }
    } catch (e) {
      // Ignore
    }
  }

  async showGitModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div class="glass-panel w-full max-w-xl p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="git-branch" class="w-5 h-5 text-violet-400"></i> Git Repository Manager
            </h3>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="text-slate-400 hover:text-white">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div id="git-modal-body" class="space-y-4 text-xs">
            <div class="text-center py-6 text-slate-500">Checking git status...</div>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      const data = await app.api(`/api/servers/${this.serverId}/files/git/status`);
      const body = document.getElementById('git-modal-body');
      if (!body) return;

      if (!data.isGit) {
        body.innerHTML = `
          <div class="text-center py-4 space-y-3">
            <i data-lucide="git-pull-request" class="w-12 h-12 text-slate-600 mx-auto"></i>
            <p class="text-sm font-bold text-white">No Git Repository Initialized</p>
            <p class="text-xs text-slate-400">Clone a remote git repository directly into your server root directory.</p>
          </div>
          <div class="space-y-3 pt-2">
            <div>
              <label class="font-semibold text-slate-300 block mb-1">Repository Clone URL</label>
              <input type="text" id="git-clone-url" placeholder="https://github.com/user/repo.git" class="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white font-mono focus:border-cyan-400 focus:outline-none">
            </div>
            <div>
              <label class="font-semibold text-slate-300 block mb-1">Branch (Optional)</label>
              <input type="text" id="git-clone-branch" value="main" class="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white font-mono focus:border-cyan-400 focus:outline-none">
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-3 border-t border-white/10">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold">Cancel</button>
            <button onclick="fileManager.executeGitClone()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <i data-lucide="download" class="w-3.5 h-3.5"></i> Clone Repository
            </button>
          </div>
        `;
      } else {
        body.innerHTML = `
          <div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div>
              <p class="text-xs text-slate-400">Current Branch:</p>
              <p class="text-sm font-bold text-violet-400 font-mono flex items-center gap-1.5 mt-0.5">
                <i data-lucide="git-commit" class="w-4 h-4"></i> ${app.escapeHtml(data.branch || 'main')}
              </p>
            </div>
            <button onclick="fileManager.executeGitPull()" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1.5 transition">
              <i data-lucide="download" class="w-3.5 h-3.5"></i> Git Pull
            </button>
          </div>

          <div>
            <span class="font-bold text-slate-300 block mb-1.5">Modified / Staged Files:</span>
            <div class="max-h-48 overflow-y-auto rounded-xl bg-black/40 border border-white/10 p-2 font-mono text-[11px] space-y-1">
              ${data.files && data.files.length > 0 ? data.files.map(f => `
                <div class="flex items-center justify-between px-2 py-1 rounded bg-white/5">
                  <span class="text-slate-300">${app.escapeHtml(f.file)}</span>
                  <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 font-mono">${app.escapeHtml(f.status)}</span>
                </div>
              `).join('') : '<div class="text-slate-500 text-center py-4">Working tree clean. No pending changes.</div>'}
            </div>
          </div>

          <div class="flex justify-end pt-3 border-t border-white/10">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="px-4 py-2 rounded-xl bg-slate-800 text-white font-semibold">Done</button>
          </div>
        `;
      }
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      document.getElementById('git-modal-body').innerHTML = `<div class="text-rose-400">${app.escapeHtml(err.message)}</div>`;
    }
  }

  async executeGitClone() {
    const repoUrl = document.getElementById('git-clone-url')?.value.trim();
    const branch = document.getElementById('git-clone-branch')?.value.trim() || 'main';
    if (!repoUrl) return app.toast('Repository URL required', 'warning');

    app.toast('Cloning git repository...', 'info');
    try {
      await app.api(`/api/servers/${this.serverId}/files/git/clone`, {
        method: 'POST',
        body: JSON.stringify({ repoUrl, branch })
      });
      document.getElementById('modal-container').innerHTML = '';
      app.toast('Git repository cloned successfully!', 'success');
      this.refresh();
      this.refreshGitStatus();
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  async executeGitPull() {
    app.toast('Pulling latest git changes...', 'info');
    try {
      const res = await app.api(`/api/servers/${this.serverId}/files/git/pull`, { method: 'POST' });
      app.toast('Git pull executed successfully!', 'success');
      this.showGitModal();
      this.refresh();
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  // --------------------------------------------------------------------------
  // 11. Code Editor & Beautifier Studio
  // --------------------------------------------------------------------------
  async openEditor(filePath) {
    this.activeEditingFile = filePath;
    const modalContainer = document.getElementById('modal-container');
    const ext = filePath.split('.').pop().toLowerCase();
    const isMarkdown = ext === 'md';

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
        <div class="glass-panel w-full max-w-6xl h-[90vh] p-4 sm:p-6 rounded-3xl border border-white/15 shadow-2xl flex flex-col justify-between" id="bfm-editor-container">
          <!-- Editor Header -->
          <div class="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <i data-lucide="file-code" class="w-5 h-5 text-cyan-400 shrink-0"></i>
              <h3 class="text-sm font-bold text-white font-mono truncate max-w-xs sm:max-w-md">${app.escapeHtml(filePath)}</h3>
              <span id="editor-dirty-indicator" class="w-2 h-2 rounded-full bg-amber-400 hidden" title="Unsaved Changes"></span>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <button type="button" onclick="fileManager.beautifyActiveFile()" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 flex items-center gap-1.5 transition" title="Format / Beautify Code">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-yellow-400"></i> Beautify
              </button>
              ${isMarkdown ? `
                <button type="button" onclick="fileManager.toggleMarkdownSplitPreview()" id="btn-toggle-md-preview" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 flex items-center gap-1.5 transition">
                  <i data-lucide="eye" class="w-3.5 h-3.5 text-cyan-400"></i> Preview
                </button>
              ` : ''}
              <button type="button" onclick="fileManager.saveActiveFile()" id="btn-editor-save" class="btn-cyber px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <i data-lucide="save" class="w-3.5 h-3.5"></i> Save File
              </button>
              <button type="button" onclick="fileManager.closeEditor()" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>
          </div>

          <!-- Editor Body (Supports Split Preview for Markdown) -->
          <div class="flex-1 my-3 flex gap-3 overflow-hidden" id="editor-main-area">
            <div id="ace-code-editor" class="flex-1 rounded-xl overflow-hidden border border-white/10"></div>
            <div id="md-preview-pane" class="hidden flex-1 rounded-xl overflow-y-auto p-4 bg-slate-950/80 border border-white/10 prose prose-invert max-w-none text-xs leading-relaxed"></div>
          </div>

          <!-- Status Bar -->
          <div class="flex justify-between items-center text-[11px] text-slate-400 pt-2 border-t border-white/10 font-mono">
            <span>Shortcut: <kbd class="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">Ctrl+S</kbd> / <kbd class="px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">Cmd+S</kbd> to save</span>
            <div class="flex items-center gap-4">
              <span id="editor-cursor-pos">Ln 1, Col 1</span>
              <span class="px-2 py-0.5 rounded bg-white/5 text-cyan-400 font-bold uppercase">${app.escapeHtml(ext)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      const data = await app.api(`/api/servers/${this.serverId}/files/content?file=${encodeURIComponent(filePath)}`);
      this.editorOriginalContent = data.content || '';

      this.aceEditor = ace.edit('ace-code-editor');
      this.aceEditor.setTheme('ace/theme/tomorrow_night_eighties');
      
      const modeMap = {
        js: 'javascript',
        json: 'json',
        py: 'python',
        yml: 'yaml',
        yaml: 'yaml',
        properties: 'properties',
        sh: 'sh',
        html: 'html',
        css: 'css',
        md: 'markdown',
        xml: 'xml',
        sql: 'sql',
        txt: 'text'
      };
      const mode = modeMap[ext] || 'text';
      this.aceEditor.session.setMode(`ace/mode/${mode}`);
      this.aceEditor.setValue(this.editorOriginalContent, -1);
      this.aceEditor.setFontSize(13);
      this.aceEditor.setShowPrintMargin(false);

      // Change listener for unsaved dot
      this.aceEditor.session.on('change', () => {
        const isDirty = this.aceEditor.getValue() !== this.editorOriginalContent;
        const ind = document.getElementById('editor-dirty-indicator');
        if (ind) {
          if (isDirty) ind.classList.remove('hidden');
          else ind.classList.add('hidden');
        }
      });

      // Cursor listener
      this.aceEditor.selection.on('changeCursor', () => {
        const pos = this.aceEditor.getCursorPosition();
        const curEl = document.getElementById('editor-cursor-pos');
        if (curEl) curEl.innerText = `Ln ${pos.row + 1}, Col ${pos.column + 1}`;
      });

      // Bind Ctrl+S
      this.aceEditor.commands.addCommand({
        name: 'save',
        bindKey: { win: 'Ctrl-S', mac: 'Command-S' },
        exec: () => this.saveActiveFile()
      });
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async beautifyActiveFile() {
    if (!this.aceEditor || !this.activeEditingFile) return;
    const content = this.aceEditor.getValue();
    try {
      const res = await app.api(`/api/servers/${this.serverId}/files/beautify`, {
        method: 'POST',
        body: JSON.stringify({ content, filePath: this.activeEditingFile })
      });
      if (res.success && res.beautified) {
        this.aceEditor.setValue(res.beautified, -1);
        app.toast('Code formatted cleanly!', 'success');
      }
    } catch (e) {
      app.toast(e.message || 'Beautify failed', 'warning');
    }
  }

  toggleMarkdownSplitPreview() {
    const pane = document.getElementById('md-preview-pane');
    const btn = document.getElementById('btn-toggle-md-preview');
    if (!pane || !this.aceEditor) return;

    if (pane.classList.contains('hidden')) {
      pane.classList.remove('hidden');
      const text = this.aceEditor.getValue();
      pane.innerHTML = `<div class="p-2 whitespace-pre-wrap">${app.escapeHtml(text)}</div>`;
      if (btn) btn.classList.add('bg-cyan-500/20', 'text-cyan-300');
    } else {
      pane.classList.add('hidden');
      if (btn) btn.classList.remove('bg-cyan-500/20', 'text-cyan-300');
    }
  }

  async saveActiveFile() {
    if (!this.aceEditor || !this.activeEditingFile) return;
    const content = this.aceEditor.getValue();
    const btn = document.getElementById('btn-editor-save');

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Saving...`;
      if (window.lucide) lucide.createIcons();
    }

    try {
      await app.api(`/api/servers/${this.serverId}/files/content`, {
        method: 'POST',
        body: JSON.stringify({ filePath: this.activeEditingFile, content })
      });
      this.editorOriginalContent = content;
      const ind = document.getElementById('editor-dirty-indicator');
      if (ind) ind.classList.add('hidden');
      app.toast('File saved successfully!', 'success');
      app.playSound('copy');
    } catch (err) {
      app.toast(err.message || 'Failed to save file', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="save" class="w-3.5 h-3.5"></i> Save File`;
        if (window.lucide) lucide.createIcons();
      }
    }
  }

  async closeEditor() {
    if (this.aceEditor && this.aceEditor.getValue() !== this.editorOriginalContent) {
      const ok = await app.confirm({
        tag: 'UNSAVED CHANGES',
        tagIcon: 'alert-triangle',
        title: 'Unsaved Changes',
        badge: window.location.host,
        message: 'You have unsaved changes. Are you sure you want to exit without saving?',
        subtext: 'Any modifications you made in this file will be discarded.',
        icon: 'alert-triangle',
        confirmIcon: 'x',
        confirmText: 'Discard & Exit',
        type: 'warning'
      });
      if (!ok) return;
    }
    document.getElementById('modal-container').innerHTML = '';
    this.aceEditor = null;
    this.activeEditingFile = null;
    this.refresh();
  }

  // --------------------------------------------------------------------------
  // 12. Integrated Media Viewer Studio (Images, Audio with Waveform, Video)
  // --------------------------------------------------------------------------
  openMediaViewer(filePath, type) {
    const modalContainer = document.getElementById('modal-container');
    const downloadUrl = `/api/servers/${this.serverId}/files/download?file=${encodeURIComponent(filePath)}`;
    const fileName = filePath.split('/').pop();

    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
        <div class="glass-panel w-full max-w-4xl p-6 rounded-3xl border border-white/15 shadow-2xl flex flex-col justify-between">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center gap-2">
              <i data-lucide="${type === 'image' ? 'image' : (type === 'audio' ? 'music' : 'video')}" class="w-5 h-5 text-cyan-400"></i>
              <h3 class="text-sm font-bold text-white font-mono truncate max-w-md">${app.escapeHtml(fileName)}</h3>
            </div>
            <div class="flex items-center gap-2">
              <a href="${downloadUrl}" download class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition">
                <i data-lucide="download" class="w-3.5 h-3.5"></i> Download
              </a>
              <button onclick="document.getElementById('modal-container').innerHTML=''" class="text-slate-400 hover:text-white p-1">
                <i data-lucide="x" class="w-5 h-5"></i>
              </button>
            </div>
          </div>

          <div class="my-6 flex items-center justify-center min-h-[320px]">
            ${type === 'image' ? `
              <div class="max-h-[60vh] max-w-full flex items-center justify-center overflow-hidden rounded-2xl bg-black/60 p-2 border border-white/10">
                <img src="${downloadUrl}" alt="${app.escapeHtml(fileName)}" class="max-h-[55vh] max-w-full object-contain rounded-xl shadow-2xl">
              </div>
            ` : (type === 'audio' ? `
              <div class="w-full max-w-md p-6 rounded-3xl bg-slate-900/90 border border-white/10 space-y-5 text-center shadow-2xl">
                <!-- Visual Animated Equalizer -->
                <div class="flex items-center justify-center gap-1.5 h-16 py-2">
                  <span class="w-1.5 h-6 bg-pink-400 rounded-full animate-pulse"></span>
                  <span class="w-1.5 h-12 bg-pink-500 rounded-full animate-bounce"></span>
                  <span class="w-1.5 h-8 bg-cyan-400 rounded-full animate-pulse"></span>
                  <span class="w-1.5 h-14 bg-cyan-300 rounded-full animate-bounce"></span>
                  <span class="w-1.5 h-10 bg-violet-400 rounded-full animate-pulse"></span>
                  <span class="w-1.5 h-4 bg-pink-400 rounded-full animate-bounce"></span>
                </div>
                <div>
                  <h4 class="text-base font-bold text-white font-mono">${app.escapeHtml(fileName)}</h4>
                  <p class="text-xs text-slate-400 mt-1">Audio Media Stream</p>
                </div>
                <audio controls autoplay class="w-full rounded-xl" src="${downloadUrl}"></audio>
              </div>
            ` : `
              <div class="w-full max-h-[60vh] rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl flex items-center justify-center">
                <video controls autoplay class="max-h-[55vh] w-full" src="${downloadUrl}"></video>
              </div>
            `)}
          </div>

          <div class="flex justify-between items-center text-xs text-slate-400 pt-3 border-t border-white/10 font-mono">
            <span>/${app.escapeHtml(filePath)}</span>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold">Close</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  // --------------------------------------------------------------------------
  // 13. File Permissions Modal (chmod Calculator)
  // --------------------------------------------------------------------------
  async showPermissionsModal(filePath) {
    let currentMode = '0644';
    try {
      const prop = await app.api(`/api/servers/${this.serverId}/files/properties?file=${encodeURIComponent(filePath)}`);
      currentMode = prop.properties?.mode || '0644';
    } catch (e) {}

    const octalVal = parseInt(currentMode, 8) || parseInt('644', 8);
    const ownerR = !!(octalVal & 256);
    const ownerW = !!(octalVal & 128);
    const ownerX = !!(octalVal & 64);
    const groupR = !!(octalVal & 32);
    const groupW = !!(octalVal & 16);
    const groupX = !!(octalVal & 8);
    const otherR = !!(octalVal & 4);
    const otherW = !!(octalVal & 2);
    const otherX = !!(octalVal & 1);

    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="shield" class="w-5 h-5 text-blue-400"></i> File Permissions (chmod)
            </h3>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="text-slate-400 hover:text-white">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <p class="text-xs text-slate-400 truncate font-mono">Target: ${app.escapeHtml(filePath)}</p>

          <!-- Permissions Matrix -->
          <div class="grid grid-cols-4 gap-2 text-center text-xs py-2">
            <div></div>
            <div class="font-bold text-slate-400">Read</div>
            <div class="font-bold text-slate-400">Write</div>
            <div class="font-bold text-slate-400">Execute</div>

            <div class="font-bold text-left text-slate-300">Owner</div>
            <div><input type="checkbox" id="perm-owner-r" ${ownerR ? 'checked' : ''} onchange="fileManager.calcChmod()" class="rounded bg-black/40 border-white/20 text-cyan-500"></div>
            <div><input type="checkbox" id="perm-owner-w" ${ownerW ? 'checked' : ''} onchange="fileManager.calcChmod()" class="rounded bg-black/40 border-white/20 text-cyan-500"></div>
            <div><input type="checkbox" id="perm-owner-x" ${ownerX ? 'checked' : ''} onchange="fileManager.calcChmod()" class="rounded bg-black/40 border-white/20 text-cyan-500"></div>

            <div class="font-bold text-left text-slate-300">Group</div>
            <div><input type="checkbox" id="perm-group-r" ${groupR ? 'checked' : ''} onchange="fileManager.calcChmod()" class="rounded bg-black/40 border-white/20 text-cyan-500"></div>
            <div><input type="checkbox" id="perm-group-w" ${groupW ? 'checked' : ''} onchange="fileManager.calcChmod()" class="rounded bg-black/40 border-white/20 text-cyan-500"></div>
            <div><input type="checkbox" id="perm-group-x" ${groupX ? 'checked' : ''} onchange="fileManager.calcChmod()" class="rounded bg-black/40 border-white/20 text-cyan-500"></div>

            <div class="font-bold text-left text-slate-300">Public</div>
            <div><input type="checkbox" id="perm-other-r" ${otherR ? 'checked' : ''} onchange="fileManager.calcChmod()" class="rounded bg-black/40 border-white/20 text-cyan-500"></div>
            <div><input type="checkbox" id="perm-other-w" ${otherW ? 'checked' : ''} onchange="fileManager.calcChmod()" class="rounded bg-black/40 border-white/20 text-cyan-500"></div>
            <div><input type="checkbox" id="perm-other-x" ${otherX ? 'checked' : ''} onchange="fileManager.calcChmod()" class="rounded bg-black/40 border-white/20 text-cyan-500"></div>
          </div>

          <div class="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
            <span class="text-xs text-slate-300">Calculated Octal Mode:</span>
            <input type="text" id="perm-octal-val" value="${currentMode}" class="w-20 text-center font-mono font-bold text-sm bg-black/50 border border-white/20 rounded-lg text-cyan-400 py-1">
          </div>

          <div class="flex justify-end gap-2 pt-2 border-t border-white/10">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Cancel</button>
            <button onclick="fileManager.applyPermissions('${app.escapeHtml(filePath)}')" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold">Apply Permissions</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  calcChmod() {
    let owner = 0;
    if (document.getElementById('perm-owner-r')?.checked) owner += 4;
    if (document.getElementById('perm-owner-w')?.checked) owner += 2;
    if (document.getElementById('perm-owner-x')?.checked) owner += 1;

    let group = 0;
    if (document.getElementById('perm-group-r')?.checked) group += 4;
    if (document.getElementById('perm-group-w')?.checked) group += 2;
    if (document.getElementById('perm-group-x')?.checked) group += 1;

    let other = 0;
    if (document.getElementById('perm-other-r')?.checked) other += 4;
    if (document.getElementById('perm-other-w')?.checked) other += 2;
    if (document.getElementById('perm-other-x')?.checked) other += 1;

    const val = `0${owner}${group}${other}`;
    const inp = document.getElementById('perm-octal-val');
    if (inp) inp.value = val;
  }

  async applyPermissions(filePath) {
    const mode = document.getElementById('perm-octal-val')?.value.trim() || '0644';
    try {
      await app.api(`/api/servers/${this.serverId}/files/permissions`, {
        method: 'POST',
        body: JSON.stringify({ file: filePath, mode })
      });
      document.getElementById('modal-container').innerHTML = '';
      app.toast(`Permissions set to ${mode}`, 'success');
      this.refresh();
    } catch (e) {
      app.toast(e.message, 'error');
    }
  }

  // --------------------------------------------------------------------------
  // 14. File Properties Modal (Metadata & SHA256)
  // --------------------------------------------------------------------------
  async showPropertiesModal(filePath) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/15 shadow-2xl space-y-4">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="info" class="w-5 h-5 text-cyan-400"></i> File Properties
            </h3>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="text-slate-400 hover:text-white">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div id="file-props-body" class="space-y-3 text-xs text-slate-300">
            <div class="text-center py-6 text-slate-500">Reading metadata...</div>
          </div>

          <div class="flex justify-end pt-2 border-t border-white/10">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold">Close</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      const data = await app.api(`/api/servers/${this.serverId}/files/properties?file=${encodeURIComponent(filePath)}`);
      const p = data.properties;
      const body = document.getElementById('file-props-body');
      if (!body) return;

      body.innerHTML = `
        <div class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <div class="flex justify-between"><span class="text-slate-400">Name:</span><span class="font-bold text-white font-mono">${app.escapeHtml(p.name)}</span></div>
          <div class="flex justify-between"><span class="text-slate-400">Path:</span><span class="font-mono text-cyan-400">/${app.escapeHtml(p.path)}</span></div>
          <div class="flex justify-between"><span class="text-slate-400">Size:</span><span class="font-mono">${this.formatSize(p.size)} (${p.size.toLocaleString()} bytes)</span></div>
          <div class="flex justify-between"><span class="text-slate-400">Mode:</span><span class="font-mono font-bold text-amber-300">${p.mode}</span></div>
          <div class="flex justify-between"><span class="text-slate-400">Modified:</span><span class="text-slate-300">${new Date(p.modified).toLocaleString()}</span></div>
        </div>
        ${p.sha256 ? `
          <div>
            <span class="text-slate-400 block mb-1">SHA-256 Checksum:</span>
            <div class="p-2.5 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-cyan-300 break-all select-all">${p.sha256}</div>
          </div>
        ` : ''}
      `;
    } catch (e) {
      document.getElementById('file-props-body').innerHTML = `<div class="text-rose-400">${app.escapeHtml(e.message)}</div>`;
    }
  }

  // --------------------------------------------------------------------------
  // 15. Search Handling (Filename & Content)
  // --------------------------------------------------------------------------
  handleSearchInput(q) {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchQuery = q.trim();

    if (!this.searchQuery) {
      this.loadDirectory(this.currentPath);
      return;
    }

    this.searchTimer = setTimeout(() => {
      this.executeSearch(this.searchQuery);
    }, 400);
  }

  setSearchMode(mode) {
    this.searchMode = mode;
    const btnName = document.getElementById('search-mode-name');
    const btnContent = document.getElementById('search-mode-content');

    if (mode === 'name') {
      if (btnName) btnName.className = 'px-2 py-0.5 rounded font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40';
      if (btnContent) btnContent.className = 'px-2 py-0.5 rounded font-semibold bg-white/5 text-slate-400 hover:text-white';
    } else {
      if (btnContent) btnContent.className = 'px-2 py-0.5 rounded font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40';
      if (btnName) btnName.className = 'px-2 py-0.5 rounded font-semibold bg-white/5 text-slate-400 hover:text-white';
    }

    if (this.searchQuery) {
      this.executeSearch(this.searchQuery);
    }
  }

  async executeSearch(query) {
    const tbody = document.getElementById('files-table-tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-10 text-slate-500"><i data-lucide="loader-2" class="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400"></i>Searching "${app.escapeHtml(query)}"...</td></tr>`;
      if (window.lucide) lucide.createIcons();
    }

    try {
      const isContent = this.searchMode === 'content' ? '1' : '0';
      const data = await app.api(`/api/servers/${this.serverId}/files/search?query=${encodeURIComponent(query)}&content=${isContent}`);
      const results = data.results || [];

      if (!tbody) return;

      if (results.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-16 text-slate-500">
              <i data-lucide="search-x" class="w-10 h-10 mx-auto mb-2 opacity-50"></i>
              <p class="text-sm font-semibold text-white">No matches found for "${app.escapeHtml(query)}"</p>
            </td>
          </tr>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      let html = '';
      results.forEach(r => {
        const iconData = this.resolveFileIcon(r.name, r.isDirectory);
        html += `
          <tr class="hover:bg-white/5 transition-colors cursor-pointer group" onclick="fileManager.openItem('${app.escapeHtml(r.path)}')">
            <td class="px-4 py-2.5">
              <i data-lucide="search" class="w-3.5 h-3.5 text-cyan-400"></i>
            </td>
            <td class="px-3 py-2.5">
              <div class="flex items-center gap-2">
                <i data-lucide="${iconData.icon}" class="w-4 h-4 ${iconData.color}"></i>
                <div class="min-w-0">
                  <span class="text-white font-medium hover:text-cyan-300 truncate">${app.escapeHtml(r.name)}</span>
                  <p class="text-[10px] text-slate-400 font-mono">/${app.escapeHtml(r.path)}</p>
                  ${r.snippet ? `<p class="text-[10px] text-cyan-300 font-mono bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20 mt-1">${app.escapeHtml(r.snippet)}</p>` : ''}
                </div>
              </div>
            </td>
            <td class="px-4 py-2.5 text-slate-400 text-[11px] hidden sm:table-cell">${this.formatSize(r.size)}</td>
            <td class="px-4 py-2.5 hidden md:table-cell">—</td>
            <td class="px-4 py-2.5 text-slate-400 text-[11px] hidden lg:table-cell">${new Date(r.modifiedAt).toLocaleDateString()}</td>
            <td class="px-4 py-2.5 text-right">
              <button onclick="event.stopPropagation(); fileManager.navigateTo('${app.escapeHtml(r.path.split('/').slice(0, -1).join('/'))}')" class="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 text-[11px] transition">Go to folder</button>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
      if (window.lucide) lucide.createIcons();
    } catch (e) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-rose-400">${app.escapeHtml(e.message)}</td></tr>`;
    }
  }

  // --------------------------------------------------------------------------
  // 16. Drag & Drop File Upload
  // --------------------------------------------------------------------------
  handleDragOver(e) {
    e.preventDefault();
    const overlay = document.getElementById('bfm-drop-overlay');
    if (overlay) overlay.classList.remove('hidden');
  }

  handleDragLeave(e) {
    e.preventDefault();
    const overlay = document.getElementById('bfm-drop-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  async handleDrop(e) {
    e.preventDefault();
    const overlay = document.getElementById('bfm-drop-overlay');
    if (overlay) overlay.classList.add('hidden');

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    app.toast(`Uploading ${files.length} items...`, 'info');
    for (let i = 0; i < files.length; i++) {
      await this.uploadSingleFile(files[i]);
    }
    app.toast('Upload complete!', 'success');
    this.refresh();
  }

  async handleUpload(input) {
    const files = input.files;
    if (!files || files.length === 0) return;

    app.toast(`Uploading ${files.length} items...`, 'info');
    for (let i = 0; i < files.length; i++) {
      await this.uploadSingleFile(files[i]);
    }
    app.toast('Files uploaded successfully!', 'success');
    input.value = '';
    this.refresh();
  }

  async uploadSingleFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('directory', this.currentPath);

    await app.api(`/api/servers/${this.serverId}/files/upload`, {
      method: 'POST',
      body: formData
    });
  }

  // --------------------------------------------------------------------------
  // 17. Standard Modals (New File, New Folder, Rename, Copy, Extract, Delete)
  // --------------------------------------------------------------------------
  async showNewFileModal() {
    const name = await app.prompt({
      tag: 'NEW FILE',
      tagIcon: 'file-plus',
      title: 'Create New File',
      message: 'Enter new file name (e.g. config.yml, script.js):',
      placeholder: 'e.g. config.yml',
      defaultValue: '',
      confirmText: 'Create File',
      confirmIcon: 'plus',
      type: 'fuchsia'
    });
    if (!name || !name.trim()) return;
    const rel = this.currentPath ? `${this.currentPath}/${name.trim()}` : name.trim();
    this.openEditor(rel);
  }

  async showNewFolderModal() {
    const name = await app.prompt({
      tag: 'NEW FOLDER',
      tagIcon: 'folder-plus',
      title: 'Create New Folder',
      message: 'Enter new folder name:',
      placeholder: 'e.g. plugins, logs',
      defaultValue: '',
      confirmText: 'Create Folder',
      confirmIcon: 'plus',
      type: 'fuchsia'
    });
    if (!name || !name.trim()) return;
    const rel = this.currentPath ? `${this.currentPath}/${name.trim()}` : name.trim();
    app.api(`/api/servers/${this.serverId}/files/directory`, {
      method: 'POST',
      body: JSON.stringify({ dirPath: rel })
    }).then(() => {
      app.toast('Folder created successfully!', 'success');
      this.refresh();
    }).catch(err => app.toast(err.message, 'error'));
  }

  async promptRename(relPath) {
    const currentName = relPath.split('/').pop();
    const newName = await app.prompt({
      tag: 'RENAME ITEM',
      tagIcon: 'edit-3',
      title: 'Rename File or Folder',
      message: `Enter new name for "${currentName}":`,
      placeholder: currentName,
      defaultValue: currentName,
      confirmText: 'Rename',
      confirmIcon: 'check',
      type: 'fuchsia'
    });
    if (!newName || !newName.trim() || newName.trim() === currentName) return;

    const parent = relPath.split('/').slice(0, -1).join('/');
    const targetNew = parent ? `${parent}/${newName.trim()}` : newName.trim();

    app.api(`/api/servers/${this.serverId}/files/rename`, {
      method: 'POST',
      body: JSON.stringify({ oldPath: relPath, newPath: targetNew })
    }).then(() => {
      app.toast('Item renamed!', 'success');
      this.refresh();
    }).catch(err => app.toast(err.message, 'error'));
  }

  async promptCopy(relPath) {
    const base = relPath.split('/').pop();
    const parent = relPath.split('/').slice(0, -1).join('/');
    const defaultCopy = parent ? `${parent}/copy_${base}` : `copy_${base}`;
    const dest = await app.prompt({
      tag: 'DUPLICATE ITEM',
      tagIcon: 'copy',
      title: 'Duplicate File or Folder',
      message: `Duplicate "${base}" as:`,
      placeholder: defaultCopy,
      defaultValue: defaultCopy,
      confirmText: 'Duplicate',
      confirmIcon: 'copy',
      type: 'fuchsia'
    });
    if (!dest || !dest.trim()) return;

    app.api(`/api/servers/${this.serverId}/files/copy`, {
      method: 'POST',
      body: JSON.stringify({ sourcePath: relPath, destPath: dest.trim() })
    }).then(() => {
      app.toast('Item duplicated!', 'success');
      this.refresh();
    }).catch(err => app.toast(err.message, 'error'));
  }

  async promptExtract(relPath) {
    const dest = await app.prompt({
      tag: 'EXTRACT ARCHIVE',
      tagIcon: 'archive',
      title: 'Extract Archive',
      message: 'Extract to directory (relative to /home/container):',
      placeholder: 'Leave blank for root, or specify directory...',
      defaultValue: this.currentPath || '',
      confirmText: 'Extract',
      confirmIcon: 'arrow-down-circle',
      type: 'fuchsia'
    });
    if (dest === null) return;

    app.toast('Extracting archive...', 'info');
    app.api(`/api/servers/${this.serverId}/files/extract`, {
      method: 'POST',
      body: JSON.stringify({ zipFilePath: relPath, destPath: dest.trim() })
    }).then(() => {
      app.toast('Archive extracted!', 'success');
      this.refresh();
    }).catch(err => app.toast(err.message, 'error'));
  }

  async deleteSinglePermanent(relPath) {
    const fileName = relPath.split('/').pop();
    const ok = await app.confirm({
      tag: 'DELETE FILE',
      tagIcon: 'alert-triangle',
      title: 'Permanent Delete',
      badge: window.location.host,
      message: `Are you sure you want to permanently delete "${fileName}"?`,
      subtext: 'This action cannot be undone and will permanently remove this file.',
      icon: 'trash-2',
      confirmIcon: 'trash-2',
      confirmText: 'Delete File',
      type: 'danger'
    });
    if (!ok) return;
    try {
      await app.api(`/api/servers/${this.serverId}/files/delete`, {
        method: 'POST',
        body: JSON.stringify({ itemPath: relPath })
      });
      app.toast('Item deleted permanently.', 'info');
      this.refresh();
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  // --------------------------------------------------------------------------
  // 18. Utilities
  // --------------------------------------------------------------------------
  navigateTo(p) {
    this.currentPath = p;
    const area = document.getElementById('subtab-content-area');
    if (document.getElementById('bfm-main-wrapper') && area) {
      this.loadDirectory(p);
    } else if (area) {
      this.renderFileManagerTab(area, this.serverId, p);
    }
  }

  refresh() {
    this.loadDirectory(this.currentPath);
  }

  formatSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// Global Singleton
window.fileManager = new FileManager();
window.filemanager = window.fileManager; // Backwards-compatible alias

