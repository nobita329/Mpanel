/**
 * Mpanel - Universal Config Editor Engine
 * Ported from configeditor.blueprint (UndercoverNL / nobita329)
 * Supports visual and raw editing of server.properties, YAML, JSON, CFG, and custom config files.
 */

class UniversalConfigEditor {
  constructor() {
    this.currentServerId = null;
    this.currentFilePath = 'server.properties';
    this.currentFileType = 'properties'; // 'properties' | 'yml' | 'yaml' | 'json' | 'cfg' | 'conf' | 'ini'
    this.viewMode = 'visual'; // 'visual' | 'raw'
    this.searchQuery = '';
    this.rawContent = '';
    this.parsedItems = [];
    this.discoveredFiles = [];
    this.isSaving = false;
    this.isLoading = false;

    // Default catalog of recognizable config files
    this.catalog = [
      { path: 'server.properties', name: 'Server Properties', type: 'properties', icon: 'sliders', desc: 'Minecraft Server Core Rules' },
      { path: 'spigot.yml', name: 'Spigot Config', type: 'yml', icon: 'file-code', desc: 'Spigot Engine & Tick Optimization' },
      { path: 'bukkit.yml', name: 'Bukkit Config', type: 'yml', icon: 'box', desc: 'Bukkit Core & Spawn Limits' },
      { path: 'paper-global.yml', name: 'Paper Global', type: 'yml', icon: 'cpu', desc: 'Paper Engine Global Mechanics' },
      { path: 'paper.yml', name: 'Paper Legacy', type: 'yml', icon: 'cpu', desc: 'Paper Engine Legacy Settings' },
      { path: 'purpur.yml', name: 'Purpur Config', type: 'yml', icon: 'zap', desc: 'Purpur Gameplay & Entities' },
      { path: 'server.cfg', name: 'Server Config', type: 'cfg', icon: 'server', desc: 'FiveM / Valve Engine' },
      { path: 'config.yml', name: 'General Config', type: 'yml', icon: 'file-text', desc: 'General Plugin Config' },
      { path: 'config.json', name: 'JSON Config', type: 'json', icon: 'code', desc: 'JSON Engine Configuration' },
      { path: 'ops.json', name: 'Server Operators', type: 'json', icon: 'shield', desc: 'OP Permissions List' },
      { path: 'whitelist.json', name: 'Whitelist', type: 'json', icon: 'users', desc: 'Whitelisted Players List' }
    ];
  }

  // ---------------------------------------------------------------------------
  // Universal Parsers & Serializers (configeditor.blueprint logic)
  // ---------------------------------------------------------------------------

  /**
   * Parse Properties / INI / Conf
   */
  parseProperties(data) {
    const items = [];
    const lines = data.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trimEnd();

      if (!trimmed) {
        items.push({
          type: 'empty',
          originalIndex: index
        });
      } else if (
        trimmed.startsWith('#') ||
        trimmed.startsWith(';') ||
        trimmed.startsWith('!') ||
        trimmed.startsWith('//')
      ) {
        items.push({
          type: 'comment',
          comment: trimmed,
          originalIndex: index
        });
      } else if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        items.push({
          type: 'section',
          section: trimmed.slice(1, -1).trim(),
          originalIndex: index
        });
      } else {
        const match = trimmed.match(/\s[=:]\s|[=:]|\s/);
        if (match) {
          const separatorIndex = match.index;
          const separator = match[0];
          const key = trimmed.slice(0, separatorIndex).trim();
          let value = trimmed.slice(separatorIndex + separator.length).trim();

          let enclosingQuote = null;
          if (value.startsWith('"') && value.endsWith('"')) {
            enclosingQuote = '"';
            value = value.slice(1, -1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            enclosingQuote = "'";
            value = value.slice(1, -1);
          }

          items.push({
            type: 'property',
            key,
            value,
            separator,
            enclosingQuote,
            originalIndex: index
          });
        } else {
          items.push({
            type: 'raw',
            raw: trimmed,
            originalIndex: index
          });
        }
      }
    });

    return items;
  }

  serializeProperties(items) {
    return items.map(item => {
      if (item.type === 'empty') return '';
      if (item.type === 'comment') return item.comment;
      if (item.type === 'section') return `[${item.section}]`;
      if (item.type === 'raw') return item.raw;
      if (item.type === 'property') {
        const sep = item.separator || '=';
        let val = item.value !== null && item.value !== undefined ? String(item.value) : '';
        if (item.enclosingQuote) {
          val = `${item.enclosingQuote}${val}${item.enclosingQuote}`;
        }
        return `${item.key}${sep}${val}`;
      }
      return '';
    }).join('\n');
  }

  /**
   * Parse YAML / YML (Nested & Indented)
   */
  parseYaml(data) {
    const items = [];
    const lines = data.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trimEnd();

      if (!trimmed) {
        items.push({ type: 'empty', originalIndex: index });
      } else if (trimmed.trimStart().startsWith('#')) {
        items.push({ type: 'comment', comment: trimmed, originalIndex: index });
      } else {
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1] : '';
        const colonIndex = trimmed.indexOf(':');

        if (colonIndex !== -1) {
          const key = trimmed.slice(0, colonIndex).trim();
          let value = trimmed.slice(colonIndex + 1).trim();
          if (value === '') value = null;

          let enclosingQuote = null;
          if (value && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
            enclosingQuote = value[0];
            value = value.slice(1, -1);
          }

          items.push({
            type: 'property',
            key,
            value,
            indent,
            enclosingQuote,
            isSection: value === null && !trimmed.trimStart().startsWith('-'),
            originalIndex: index
          });
        } else {
          items.push({
            type: 'raw',
            raw: trimmed,
            indent,
            originalIndex: index
          });
        }
      }
    });

    return items;
  }

  serializeYaml(items) {
    return items.map(item => {
      if (item.type === 'empty') return '';
      if (item.type === 'comment') return item.comment;
      if (item.type === 'raw') return `${item.indent || ''}${item.raw}`;
      if (item.type === 'property') {
        const indent = item.indent || '';
        const key = item.key || '';
        if (item.value === null || item.value === undefined) {
          return `${indent}${key}:`;
        }
        let val = String(item.value);
        if (item.enclosingQuote) {
          val = `${item.enclosingQuote}${val}${item.enclosingQuote}`;
        }
        return `${indent}${key}: ${val}`;
      }
      return '';
    }).join('\n');
  }

  /**
   * Parse CFG / FiveM / Valve Engine
   */
  parseCfg(data) {
    const items = [];
    const lines = data.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trimEnd();

      if (!trimmed) {
        items.push({ type: 'empty', originalIndex: index });
      } else if (
        trimmed.startsWith('#') ||
        trimmed.startsWith('//') ||
        trimmed.startsWith(';') ||
        trimmed.startsWith('[')
      ) {
        items.push({ type: 'comment', comment: trimmed, originalIndex: index });
      } else {
        const match = trimmed.match(/\s[=:]\s|[=:]|\s/);
        if (match) {
          const separatorIndex = match.index;
          const separator = match[0];
          const key = trimmed.slice(0, separatorIndex).trim();
          let value = trimmed.slice(separatorIndex + separator.length).trim();

          let endsWithSemicolon = false;
          if (value.endsWith(';')) {
            endsWithSemicolon = true;
            value = value.slice(0, -1).trim();
          }

          let enclosingQuote = null;
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            enclosingQuote = value[0];
            value = value.slice(1, -1);
          }

          items.push({
            type: 'property',
            key,
            value,
            separator,
            endsWithSemicolon,
            enclosingQuote,
            originalIndex: index
          });
        } else {
          items.push({ type: 'raw', raw: trimmed, originalIndex: index });
        }
      }
    });

    return items;
  }

  serializeCfg(items) {
    return items.map(item => {
      if (item.type === 'empty') return '';
      if (item.type === 'comment') return item.comment;
      if (item.type === 'raw') return item.raw;
      if (item.type === 'property') {
        const sep = item.separator || ' ';
        let val = item.value !== null && item.value !== undefined ? String(item.value) : '';
        if (item.enclosingQuote) {
          val = `${item.enclosingQuote}${val}${item.enclosingQuote}`;
        }
        if (item.endsWithSemicolon) {
          val += ';';
        }
        return `${item.key}${sep}${val}`;
      }
      return '';
    }).join('\n');
  }

  /**
   * Parse JSON Configuration
   */
  parseJson(data) {
    try {
      const parsed = JSON.parse(data);
      const items = [];

      const flatten = (obj, prefix = '') => {
        for (const [k, v] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${k}` : k;
          if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            items.push({ type: 'section', section: fullKey });
            flatten(v, fullKey);
          } else {
            items.push({
              type: 'property',
              key: fullKey,
              value: Array.isArray(v) ? JSON.stringify(v) : v,
              isJsonArray: Array.isArray(v)
            });
          }
        }
      };

      flatten(parsed);
      return items;
    } catch (e) {
      return [{ type: 'raw', raw: data }];
    }
  }

  // ---------------------------------------------------------------------------
  // View Rendering & Controller
  // ---------------------------------------------------------------------------

  async render(container, serverId, initialFile = 'server.properties') {
    if (!container) return;
    this.currentServerId = serverId;
    this.currentFilePath = initialFile || this.currentFilePath;
    this.detectFileType(this.currentFilePath);

    // Auto-discover servers if available
    let serversList = [];
    try {
      const sRes = await app.api('/api/servers');
      serversList = sRes.servers || [];
      if (!this.currentServerId && serversList.length > 0) {
        this.currentServerId = serversList[0].id;
      }
    } catch (e) {}

    container.innerHTML = `
      <div id="config-editor-root" class="space-y-6 animate-fade-in">
        <!-- 1. Header Bar & Controls -->
        <div class="glass-panel p-6 rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-purple-950/40 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 flex items-center gap-1.5">
                <i data-lucide="sliders" class="w-3.5 h-3.5"></i> Config Editor
              </span>
              <span id="cfg-file-badge" class="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800/80 text-cyan-300 border border-white/10 uppercase">
                ${this.escapeHtml(this.currentFilePath)} (${this.currentFileType.toUpperCase()})
              </span>
            </div>
            <h3 class="text-2xl font-black text-white flex items-center gap-2">
              Universal Configuration Editor
              <span class="text-xs font-mono text-purple-400 font-normal">v1.5 Blueprint</span>
            </h3>
            <p class="text-xs text-slate-300">Easily inspect and configure any game server or proxy configuration file with dynamic form controls.</p>
          </div>

          <!-- Controls & Actions -->
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            ${serversList.length > 1 ? `
              <div class="p-1 bg-black/40 rounded-xl border border-white/10 flex items-center gap-1.5 px-2.5">
                <i data-lucide="server" class="w-3.5 h-3.5 text-blue-400"></i>
                <span class="text-[11px] text-slate-400 font-medium">Server:</span>
                <select onchange="configEditor.switchServer(this.value)" class="glass-input px-2 py-1 rounded-lg text-xs font-semibold text-blue-300 bg-transparent border-0 focus:outline-none">
                  ${serversList.map(s => `
                    <option value="${s.id}" ${s.id == this.currentServerId ? 'selected' : ''} class="bg-slate-900 text-white">${this.escapeHtml(s.name)}</option>
                  `).join('')}
                </select>
              </div>
            ` : ''}

            <!-- Mode Switcher (Visual vs Raw) -->
            <div class="p-1 bg-black/40 rounded-xl border border-white/10 flex items-center gap-1">
              <button type="button" onclick="configEditor.switchMode('visual')" id="btn-cfg-mode-visual" class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${this.viewMode === 'visual' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}">
                <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i> Visual Form
              </button>
              <button type="button" onclick="configEditor.switchMode('raw')" id="btn-cfg-mode-raw" class="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${this.viewMode === 'raw' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}">
                <i data-lucide="code" class="w-3.5 h-3.5"></i> Raw Code
              </button>
            </div>

            <!-- Reload Button -->
            <button type="button" onclick="configEditor.loadFile(configEditor.currentFilePath)" title="Reload file from disk" class="p-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 border border-white/10 transition">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>

            <!-- Save Button -->
            <button type="button" id="btn-cfg-save" onclick="configEditor.saveCurrentFile()" class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2">
              <i data-lucide="save" class="w-4 h-4"></i> Save Configuration
            </button>

            <!-- Restart Server to Apply -->
            <button type="button" onclick="configEditor.restartServer()" title="Restart server to apply configuration changes" class="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 transition flex items-center gap-1.5 shadow">
              <i data-lucide="power" class="w-4 h-4 text-amber-400"></i> Restart to Apply
            </button>
          </div>
        </div>

        <!-- 2. File Switcher Carousel / Tab Bar -->
        <div class="glass-panel p-3.5 rounded-2xl border border-white/10 space-y-2">
          <div class="flex items-center justify-between px-1">
            <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <i data-lucide="files" class="w-3.5 h-3.5 text-blue-400"></i> Config Files Quick Switcher
            </span>
            <button type="button" onclick="configEditor.promptCustomFile()" class="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 hover:underline">
              <i data-lucide="folder-plus" class="w-3.5 h-3.5"></i> Open Custom File...
            </button>
          </div>
          <div id="cfg-files-pills" class="flex flex-wrap gap-2 pt-1">
            <div class="text-xs text-slate-400 py-1">Scanning server configuration files...</div>
          </div>
        </div>

        <!-- 3. Dynamic Editor View Container (Visual or Raw) -->
        <div id="config-editor-body" class="space-y-6">
          <div class="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-3">
            <div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <p class="text-sm font-semibold text-slate-300">Loading ${this.escapeHtml(this.currentFilePath)}...</p>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Fetch available files and load active file
    await this.discoverServerFiles();
    await this.loadFile(this.currentFilePath);
  }

  detectFileType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    if (['yml', 'yaml'].includes(ext)) {
      this.currentFileType = 'yml';
    } else if (ext === 'json') {
      this.currentFileType = 'json';
    } else if (['cfg', 'conf'].includes(ext)) {
      this.currentFileType = 'cfg';
    } else if (ext === 'ini') {
      this.currentFileType = 'ini';
    } else {
      this.currentFileType = 'properties';
    }
  }

  async discoverServerFiles() {
    try {
      const res = await app.api(`/api/marketplace/config-files/discover?serverId=${this.currentServerId}`);
      if (res.success && res.files) {
        this.discoveredFiles = res.files;
      }
    } catch (e) {
      console.warn('Failed to auto-discover config files:', e);
    }
    this.renderFilePills();
  }

  renderFilePills() {
    const container = document.getElementById('cfg-files-pills');
    if (!container) return;

    const filesToDisplay = this.discoveredFiles.length > 0 ? this.discoveredFiles : this.catalog.slice(0, 8);

    container.innerHTML = filesToDisplay.map(f => {
      const isActive = f.path === this.currentFilePath;
      return `
        <button type="button" onclick="configEditor.loadFile('${f.path}')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${isActive ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40' : 'bg-slate-900/60 text-slate-300 border-white/10 hover:border-white/20 hover:text-white'}">
          <i data-lucide="${f.icon || 'file-text'}" class="w-3.5 h-3.5"></i>
          <span>${f.path}</span>
          ${f.exists ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Found on disk"></span>' : ''}
        </button>
      `;
    }).join('') + `
      <button type="button" onclick="configEditor.promptCustomFile()" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-purple-300 border border-purple-500/20 transition flex items-center gap-1">
        <i data-lucide="plus" class="w-3.5 h-3.5"></i> Custom
      </button>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  async promptCustomFile() {
    const pathInput = await app.prompt({
      tag: 'CONFIG FILE',
      tagIcon: 'file-text',
      title: 'Open Config File',
      message: 'Enter the relative path of the configuration file to open:',
      placeholder: 'e.g. plugins/Essentials/config.yml, paper.yml',
      defaultValue: '',
      confirmText: 'Open File',
      confirmIcon: 'file-text',
      type: 'fuchsia'
    });
    if (pathInput && pathInput.trim()) {
      this.loadFile(pathInput.trim());
    }
  }

  async switchServer(serverId) {
    this.currentServerId = serverId;
    await this.discoverServerFiles();
    await this.loadFile(this.currentFilePath);
  }

  async loadFile(filePath) {
    this.currentFilePath = filePath;
    this.detectFileType(filePath);
    this.isLoading = true;

    // Update Badge
    const badge = document.getElementById('cfg-file-badge');
    if (badge) {
      badge.textContent = `${filePath} (${this.currentFileType.toUpperCase()})`;
    }

    this.renderFilePills();

    const body = document.getElementById('config-editor-body');
    if (body) {
      body.innerHTML = `
        <div class="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-3">
          <div class="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p class="text-sm font-semibold text-slate-300">Reading ${this.escapeHtml(filePath)} from server...</p>
        </div>
      `;
    }

    try {
      const res = await app.api(`/api/marketplace/properties?serverId=${this.currentServerId}&file=${encodeURIComponent(filePath)}`);
      this.rawContent = res.raw || '';

      if (this.currentFileType === 'yml') {
        this.parsedItems = this.parseYaml(this.rawContent);
      } else if (this.currentFileType === 'json') {
        this.parsedItems = this.parseJson(this.rawContent);
      } else if (this.currentFileType === 'cfg') {
        this.parsedItems = this.parseCfg(this.rawContent);
      } else {
        this.parsedItems = this.parseProperties(this.rawContent);
      }

      this.renderActiveMode();
    } catch (err) {
      if (body) {
        body.innerHTML = `
          <div class="glass-panel p-12 rounded-3xl border border-rose-500/30 text-center space-y-3">
            <i data-lucide="alert-triangle" class="w-10 h-10 text-rose-400 mx-auto"></i>
            <h4 class="text-base font-bold text-white">Could not load ${this.escapeHtml(filePath)}</h4>
            <p class="text-xs text-slate-400">${err.message || 'File might not exist yet or permission denied.'}</p>
            <div class="flex items-center justify-center gap-2 pt-2">
              <button onclick="configEditor.loadFile('${filePath}')" class="btn-cyber px-4 py-2 rounded-xl text-xs">Retry</button>
              <button onclick="configEditor.createEmptyFile('${filePath}')" class="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white">Create New File</button>
            </div>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
      }
    } finally {
      this.isLoading = false;
    }
  }

  createEmptyFile(filePath) {
    this.rawContent = `# ${filePath} created via Mpanel Config Editor\n`;
    if (this.currentFileType === 'json') this.rawContent = '{\n}\n';
    this.parsedItems = this.parseProperties(this.rawContent);
    this.renderActiveMode();
  }

  switchMode(mode) {
    if (this.viewMode === mode) return;

    if (mode === 'raw') {
      // Sync visual changes into raw string
      this.rawContent = this.serializeCurrentItems();
    } else {
      // Sync raw changes into parsed items
      const rawEl = document.getElementById('cfg-raw-textarea');
      if (rawEl) {
        this.rawContent = rawEl.value;
      }
      if (this.currentFileType === 'yml') {
        this.parsedItems = this.parseYaml(this.rawContent);
      } else if (this.currentFileType === 'json') {
        this.parsedItems = this.parseJson(this.rawContent);
      } else if (this.currentFileType === 'cfg') {
        this.parsedItems = this.parseCfg(this.rawContent);
      } else {
        this.parsedItems = this.parseProperties(this.rawContent);
      }
    }

    this.viewMode = mode;

    const btnVisual = document.getElementById('btn-cfg-mode-visual');
    const btnRaw = document.getElementById('btn-cfg-mode-raw');
    if (btnVisual && btnRaw) {
      if (mode === 'visual') {
        btnVisual.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-blue-600 text-white shadow-md';
        btnRaw.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white';
      } else {
        btnVisual.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white';
        btnRaw.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-blue-600 text-white shadow-md';
      }
    }

    this.renderActiveMode();
  }

  serializeCurrentItems() {
    if (this.currentFileType === 'yml') {
      return this.serializeYaml(this.parsedItems);
    } else if (this.currentFileType === 'json') {
      return this.rawContent || JSON.stringify(this.parsedItems, null, 2);
    } else if (this.currentFileType === 'cfg') {
      return this.serializeCfg(this.parsedItems);
    } else {
      return this.serializeProperties(this.parsedItems);
    }
  }

  renderActiveMode() {
    const body = document.getElementById('config-editor-body');
    if (!body) return;

    if (this.viewMode === 'raw') {
      this.renderRawMode(body);
    } else {
      this.renderVisualMode(body);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  renderRawMode(container) {
    const linesCount = this.rawContent.split('\n').length;
    container.innerHTML = `
      <div class="glass-panel p-5 rounded-3xl border border-white/10 space-y-3 shadow-xl">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
          <div class="flex items-center gap-2">
            <i data-lucide="code-2" class="w-4 h-4 text-blue-400"></i>
            <span class="text-xs font-bold text-slate-200 uppercase tracking-wider">${this.escapeHtml(this.currentFilePath)} Raw Editor</span>
            <span class="text-[10px] text-slate-400 font-mono">Lines: ${linesCount}</span>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" onclick="configEditor.formatJsonOrYaml()" class="px-3 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 border border-white/10 hover:border-white/20 transition flex items-center gap-1.5">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-purple-400"></i> Format / Tidy
            </button>
            <button type="button" onclick="configEditor.copyRawContent()" class="px-3 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 border border-white/10 hover:border-white/20 transition flex items-center gap-1.5">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i> Copy Content
            </button>
          </div>
        </div>
        <textarea id="cfg-raw-textarea" rows="24" oninput="configEditor.rawContent = this.value" class="w-full glass-input p-4 rounded-2xl text-xs font-mono leading-relaxed resize-y border border-white/10 bg-slate-950/90 text-slate-200 focus:border-blue-500 shadow-inner">${this.escapeHtml(this.rawContent)}</textarea>
        <p class="text-[11px] text-slate-400 font-mono">Tip: Syntax is automatically preserved upon saving. Click "Save Configuration" to apply changes immediately.</p>
      </div>
    `;
  }

  formatJsonOrYaml() {
    const rawEl = document.getElementById('cfg-raw-textarea');
    if (!rawEl) return;
    const text = rawEl.value;

    if (this.currentFileType === 'json') {
      try {
        const obj = JSON.parse(text);
        rawEl.value = JSON.stringify(obj, null, 2);
        this.rawContent = rawEl.value;
        if (window.app && window.app.toast) app.toast('Formatted JSON successfully!', 'info');
      } catch (e) {
        if (window.app && window.app.toast) app.toast('Invalid JSON syntax', 'error');
      }
    } else {
      if (window.app && window.app.toast) app.toast('Auto-formatting only available for JSON.', 'info');
    }
  }

  copyRawContent() {
    const rawEl = document.getElementById('cfg-raw-textarea');
    const text = rawEl ? rawEl.value : this.rawContent;
    navigator.clipboard.writeText(text).then(() => {
      if (window.app && window.app.toast) app.toast('Copied to clipboard!', 'info');
    });
  }

  renderVisualMode(container) {
    const filteredItems = this.parsedItems.filter(item => {
      if (!this.searchQuery) return true;
      if (item.key && item.key.toLowerCase().includes(this.searchQuery.toLowerCase())) return true;
      if (item.value && String(item.value).toLowerCase().includes(this.searchQuery.toLowerCase())) return true;
      if (item.comment && item.comment.toLowerCase().includes(this.searchQuery.toLowerCase())) return true;
      return false;
    });

    const isMinecraftProps = this.currentFilePath === 'server.properties';
    const motdItem = this.parsedItems.find(i => i.key === 'motd');
    const motdVal = motdItem ? motdItem.value : 'A Minecraft Server';
    const maxPlayersItem = this.parsedItems.find(i => i.key === 'max-players');
    const maxPlayersVal = maxPlayersItem ? maxPlayersItem.value : '20';

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Search & Filter Header -->
        <div class="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div class="relative w-full sm:w-80">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3"></i>
            <input type="text" value="${this.escapeHtml(this.searchQuery)}" oninput="configEditor.handleSearch(this.value)" placeholder="Search properties or settings..." class="w-full glass-input pl-10 pr-4 py-2 rounded-xl text-xs font-mono">
          </div>
          <div class="flex items-center gap-3 text-xs text-slate-400">
            <span>Showing <strong class="text-white">${filteredItems.filter(i => i.type === 'property').length}</strong> properties</span>
            <button type="button" onclick="configEditor.promptAddProperty()" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition flex items-center gap-1">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Key
            </button>
          </div>
        </div>

        <!-- Special MOTD In-Game Ping Card for server.properties -->
        ${isMinecraftProps ? this.renderMotdCard(motdVal, maxPlayersVal) : ''}

        <!-- Property Rows Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${filteredItems.length === 0 ? `
            <div class="col-span-full text-center py-12 text-slate-400">
              <i data-lucide="search-x" class="w-8 h-8 mx-auto text-slate-500 mb-2"></i>
              <p>No configuration properties found matching "${this.escapeHtml(this.searchQuery)}".</p>
            </div>
          ` : filteredItems.map((item, idx) => this.renderPropertyRow(item, idx)).join('')}
        </div>
      </div>
    `;
  }

  renderMotdCard(motd, maxPlayers) {
    return `
      <div class="glass-panel p-5 rounded-3xl border border-blue-500/20 bg-slate-950/80 space-y-3 shadow-xl">
        <div class="flex items-center justify-between border-b border-white/5 pb-2">
          <span class="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="monitor" class="w-4 h-4 text-blue-400"></i> Multiplayer Server List In-Game Preview
          </span>
          <span class="text-[10px] text-slate-400 font-mono">Real-time MOTD Live Preview</span>
        </div>
        <div class="p-3.5 rounded-2xl bg-[#090c15] border border-white/10 flex items-center gap-3.5 font-mono shadow-2xl overflow-hidden">
          <div class="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 p-1 flex items-center justify-center shrink-0">
            <img src="/assets/favicon.svg" alt="Server Icon" class="w-9 h-9 object-contain">
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-white tracking-wide truncate">Minecraft Server</span>
              <span class="text-slate-400 font-semibold font-mono">0/${this.escapeHtml(String(maxPlayers))}</span>
            </div>
            <div id="cfg-motd-preview" class="text-xs text-slate-300 font-mono tracking-tight mt-1 truncate">
              ${this.parseMinecraftColorCodes(motd)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  parseMinecraftColorCodes(str) {
    if (!str) return 'A Minecraft Server';
    const colorMap = {
      '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
      '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
      '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
      'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF'
    };

    let result = '';
    let currentColor = '#ffffff';
    let i = 0;

    while (i < str.length) {
      if ((str[i] === '&' || str[i] === '§') && i + 1 < str.length) {
        const code = str[i + 1].toLowerCase();
        if (colorMap[code]) {
          currentColor = colorMap[code];
          i += 2;
          continue;
        }
      }
      result += `<span style="color: ${currentColor}">${this.escapeHtml(str[i])}</span>`;
      i++;
    }

    return result || str;
  }

  renderPropertyRow(item, index) {
    if (item.type === 'comment') {
      return `
        <div class="col-span-full py-2 px-3 rounded-xl bg-slate-900/30 border border-white/5 text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <i data-lucide="hash" class="w-3.5 h-3.5 text-slate-500"></i>
          <span>${this.escapeHtml(item.comment)}</span>
        </div>
      `;
    }

    if (item.type === 'section') {
      return `
        <div class="col-span-full pt-4 pb-1">
          <h4 class="text-xs font-black uppercase tracking-wider text-purple-400 flex items-center gap-2">
            <i data-lucide="folder" class="w-4 h-4"></i> ${this.escapeHtml(item.section)}
          </h4>
        </div>
      `;
    }

    if (item.type !== 'property') return '';

    const key = item.key || '';
    const val = item.value;
    const isBool = val === 'true' || val === 'false' || val === true || val === false;
    const isNumber = typeof val === 'number' || (!isNaN(val) && val !== '' && !isBool && typeof val === 'string' && /^-?\d+$/.test(val.trim()));

    // Special select inputs
    const isGamemode = key === 'gamemode';
    const isDifficulty = key === 'difficulty';

    return `
      <div class="p-4 rounded-2xl bg-slate-900/40 border border-white/5 hover:border-white/15 transition flex flex-col justify-between space-y-3">
        <div>
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold text-white font-mono truncate" title="${this.escapeHtml(key)}">
              ${this.escapeHtml(key)}
            </span>
            <span class="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
              ${isBool ? 'Boolean' : (isNumber ? 'Number' : 'String')}
            </span>
          </div>
        </div>

        <div>
          ${isBool ? `
            <div class="flex items-center justify-between pt-1">
              <span class="text-xs font-semibold ${val === 'true' || val === true ? 'text-emerald-400' : 'text-slate-400'}">
                ${val === 'true' || val === true ? 'Enabled (true)' : 'Disabled (false)'}
              </span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" ${val === 'true' || val === true ? 'checked' : ''} onchange="configEditor.updateItemValue(${index}, this.checked ? 'true' : 'false')" class="sr-only peer">
                <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ` : isGamemode ? `
            <select onchange="configEditor.updateItemValue(${index}, this.value)" class="glass-input text-xs w-full px-3 py-2 rounded-xl">
              <option value="survival" ${val === 'survival' ? 'selected' : ''}>Survival</option>
              <option value="creative" ${val === 'creative' ? 'selected' : ''}>Creative</option>
              <option value="adventure" ${val === 'adventure' ? 'selected' : ''}>Adventure</option>
              <option value="spectator" ${val === 'spectator' ? 'selected' : ''}>Spectator</option>
            </select>
          ` : isDifficulty ? `
            <select onchange="configEditor.updateItemValue(${index}, this.value)" class="glass-input text-xs w-full px-3 py-2 rounded-xl">
              <option value="peaceful" ${val === 'peaceful' ? 'selected' : ''}>Peaceful</option>
              <option value="easy" ${val === 'easy' ? 'selected' : ''}>Easy</option>
              <option value="normal" ${val === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="hard" ${val === 'hard' ? 'selected' : ''}>Hard</option>
            </select>
          ` : isNumber ? `
            <input type="number" value="${val !== undefined && val !== null ? val : ''}" oninput="configEditor.updateItemValue(${index}, this.value)" class="w-full glass-input px-3 py-1.5 rounded-xl text-xs font-mono">
          ` : `
            <input type="text" value="${val !== undefined && val !== null ? this.escapeHtml(String(val)) : ''}" oninput="configEditor.updateItemValue(${index}, this.value)" class="w-full glass-input px-3 py-1.5 rounded-xl text-xs font-mono">
          `}
        </div>
      </div>
    `;
  }

  updateItemValue(index, newVal) {
    if (this.parsedItems[index]) {
      this.parsedItems[index].value = newVal;

      // Realtime update MOTD preview if motd changed
      if (this.parsedItems[index].key === 'motd') {
        const preview = document.getElementById('cfg-motd-preview');
        if (preview) {
          preview.innerHTML = this.parseMinecraftColorCodes(newVal);
        }
      }
    }
  }

  handleSearch(query) {
    this.searchQuery = query;
    const body = document.getElementById('config-editor-body');
    if (body && this.viewMode === 'visual') {
      this.renderVisualMode(body);
      if (window.lucide) window.lucide.createIcons();
    }
  }

  async promptAddProperty() {
    const key = await app.prompt({
      tag: 'NEW PROPERTY',
      tagIcon: 'sliders',
      title: 'Configuration Property',
      message: 'Enter new configuration property key:',
      placeholder: 'e.g. max-players, motd, enable-rcon',
      defaultValue: '',
      confirmText: 'Next',
      confirmIcon: 'check',
      type: 'fuchsia'
    });
    if (!key || !key.trim()) return;
    const val = await app.prompt({
      tag: 'PROPERTY VALUE',
      tagIcon: 'sliders',
      title: 'Property Value',
      message: `Enter value for "${key.trim()}":`,
      placeholder: 'Property value...',
      defaultValue: '',
      confirmText: 'Add Property',
      confirmIcon: 'plus',
      type: 'fuchsia'
    });

    this.parsedItems.unshift({
      type: 'property',
      key: key.trim(),
      value: val !== null ? val : '',
      separator: this.currentFileType === 'yml' ? ': ' : '='
    });

    this.renderActiveMode();
    if (window.app && window.app.toast) app.toast(`Added property ${key}`, 'success');
  }

  async saveCurrentFile() {
    if (this.isSaving) return;
    this.isSaving = true;

    const saveBtn = document.getElementById('btn-cfg-save');
    const oldText = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
      saveBtn.innerHTML = '<div class="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full mr-1"></div> Saving...';
      saveBtn.disabled = true;
    }

    try {
      const serialized = this.viewMode === 'raw' ? (document.getElementById('cfg-raw-textarea')?.value || this.rawContent) : this.serializeCurrentItems();
      this.rawContent = serialized;

      const res = await app.api('/api/marketplace/properties', {
        method: 'POST',
        body: JSON.stringify({
          serverId: this.currentServerId,
          file: this.currentFilePath,
          raw: serialized
        })
      });

      if (res.success) {
        if (window.app && window.app.toast) {
          app.toast(`Configuration ${this.currentFilePath} saved successfully!`, 'success');
        }
      } else {
        throw new Error(res.error || 'Failed to save configuration');
      }
    } catch (err) {
      if (window.app && window.app.toast) {
        app.toast(err.message || 'Error saving file', 'error');
      }
    } finally {
      this.isSaving = false;
      if (saveBtn) {
        saveBtn.innerHTML = oldText;
        saveBtn.disabled = false;
      }
    }
  }

  async restartServer() {
    if (!this.currentServerId) return;
    const ok = await app.confirm({
      tag: 'RESTART SERVER',
      tagIcon: 'refresh-cw',
      title: 'Restart Server',
      badge: window.location.host,
      message: 'Restart the server now to apply your configuration changes?',
      subtext: 'The server will briefly disconnect active players while restarting with new settings.',
      icon: 'refresh-cw',
      confirmIcon: 'refresh-cw',
      confirmText: 'Restart Server',
      type: 'warning'
    });
    if (!ok) return;

    try {
      if (window.app && window.app.toast) app.toast('Restarting server...', 'info');
      await app.api(`/api/servers/${this.currentServerId}/power`, {
        method: 'POST',
        body: JSON.stringify({ action: 'restart' })
      });
      if (window.app && window.app.toast) app.toast('Server restart command issued!', 'success');
    } catch (err) {
      if (window.app && window.app.toast) app.toast(err.message || 'Failed to restart server', 'error');
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
}

// Global instance
window.configEditor = new UniversalConfigEditor();
