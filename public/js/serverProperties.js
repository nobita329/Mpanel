// Arix Addon Pack v2.0.2: Visual Server Properties & Subdomains Manager
class ServerProperties {
  constructor() {
    this.currentServerId = null;
    this.properties = {};
    this.activeTab = 'properties'; // 'properties' | 'subdomains'
    this.searchFilter = '';
  }

  async renderPropertiesTab(container, serverId) {
    this.currentServerId = serverId;
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-xs font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-0.5 rounded-full border border-purple-500/20">Arix Addon Pack</span>
              <span class="text-[10px] font-mono text-slate-400">v2.0.2</span>
            </div>
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <i data-lucide="sliders" class="w-5 h-5 text-purple-400"></i> Config Editor & Subdomains
            </h2>
            <p class="text-xs text-slate-400">Configure Minecraft & game server configuration files visually or in raw code, and manage custom subdomains.</p>
          </div>

          <div class="flex items-center gap-2">
            <button type="button" id="btn-tab-props" onclick="serverProperties.switchView('properties')" class="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600/30 text-purple-300 border border-purple-500/30 transition">
              <i data-lucide="sliders" class="w-3.5 h-3.5 inline mr-1"></i> Config Editor
            </button>
            <button type="button" id="btn-tab-subdomains" onclick="serverProperties.switchView('subdomains')" class="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white glass-btn transition">
              <i data-lucide="globe" class="w-3.5 h-3.5 inline mr-1"></i> Subdomains
            </button>
          </div>
        </div>

        <!-- Visual Config Editor View -->
        <div id="view-properties-content" class="space-y-6">
          <div class="glass-panel p-12 rounded-3xl border border-white/10 text-center space-y-3">
            <div class="animate-spin inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            <p class="text-sm font-semibold text-slate-300">Loading Config Editor...</p>
          </div>
        </div>

        <!-- Subdomains View -->
        <div id="view-subdomains-content" class="space-y-6 hidden">
          <div class="glass-panel p-6 rounded-3xl border border-white/10 space-y-5">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 class="text-base font-bold text-white flex items-center gap-2">
                  <i data-lucide="globe" class="w-4 h-4 text-cyan-400"></i> Free Custom Subdomains
                </h3>
                <p class="text-xs text-slate-400">Create human-readable server addresses so players don't have to remember your IP and port.</p>
              </div>

              <button onclick="serverProperties.showCreateSubdomainModal()" class="btn-cyber-purple px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
                <i data-lucide="plus-circle" class="w-4 h-4"></i> Create Subdomain
              </button>
            </div>

            <div id="subdomains-list-container" class="space-y-3">
              <div class="text-center py-8 text-slate-400">Loading subdomains...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    const propsContent = document.getElementById('view-properties-content');
    if (window.configEditor && propsContent) {
      await window.configEditor.render(propsContent, serverId, 'server.properties');
    }
  }

  async switchView(view) {
    this.activeTab = view;
    const propsContent = document.getElementById('view-properties-content');
    const subdomainsContent = document.getElementById('view-subdomains-content');
    const btnProps = document.getElementById('btn-tab-props');
    const btnSubdomains = document.getElementById('btn-tab-subdomains');

    if (view === 'properties') {
      propsContent.classList.remove('hidden');
      subdomainsContent.classList.add('hidden');
      btnProps.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-purple-600/30 text-purple-300 border border-purple-500/30 transition';
      btnSubdomains.className = 'px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white glass-btn transition';
      if (window.configEditor && propsContent && (!propsContent.children || propsContent.children.length === 0 || propsContent.querySelector('.animate-spin'))) {
        await window.configEditor.render(propsContent, this.currentServerId, 'server.properties');
      }
    } else {
      propsContent.classList.add('hidden');
      subdomainsContent.classList.remove('hidden');
      btnSubdomains.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-purple-600/30 text-purple-300 border border-purple-500/30 transition';
      btnProps.className = 'px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white glass-btn transition';
      this.loadSubdomains();
    }
  }

  async loadProperties() {
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/properties`);
      if (res.success && res.properties) {
        this.properties = res.properties;
        this.renderPropertiesList();
      }
    } catch (err) {
      console.error('Failed to load server.properties:', err);
      app.toast('Failed to load server.properties: ' + err.message, 'error');
    }
  }

  setProp(key, value) {
    this.properties[key] = value;
    this.renderPropertiesList();
  }

  handleSearch(query) {
    this.searchFilter = query.toLowerCase().trim();
    this.renderPropertiesList();
  }

  renderPropertiesList() {
    // 1. Sync Gamemode & Difficulty button states
    const curGm = String(this.properties['gamemode'] || 'survival').toLowerCase();
    document.querySelectorAll('.prop-gm-btn').forEach(btn => {
      if (btn.dataset.gm === curGm) {
        btn.className = 'prop-gm-btn px-2 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40';
      } else {
        btn.className = 'prop-gm-btn px-2 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-slate-400 hover:text-white';
      }
    });

    const curDiff = String(this.properties['difficulty'] || 'easy').toLowerCase();
    document.querySelectorAll('.prop-diff-btn').forEach(btn => {
      if (btn.dataset.diff === curDiff) {
        btn.className = 'prop-diff-btn px-2 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40';
      } else {
        btn.className = 'prop-diff-btn px-2 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-slate-400 hover:text-white';
      }
    });

    // 2. Render dynamic grid of properties
    const container = document.getElementById('props-grid-container');
    if (!container) return;

    const entries = Object.entries(this.properties).filter(([key]) => {
      if (key === 'gamemode' || key === 'difficulty') return false; // Handled by top presets
      if (!this.searchFilter) return true;
      return key.toLowerCase().includes(this.searchFilter);
    });

    if (entries.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-500 text-xs">No properties match "${this.searchFilter}"</div>`;
      return;
    }

    container.innerHTML = entries.map(([key, val]) => {
      const isBool = typeof val === 'boolean';
      const labelName = key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      if (isBool) {
        return `
          <div class="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between hover:border-purple-500/20 transition">
            <div>
              <span class="text-xs font-bold text-slate-200 block">${labelName}</span>
              <span class="text-[10px] font-mono text-slate-500">${key}</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" ${val ? 'checked' : ''} onchange="serverProperties.setProp('${key}', this.checked)" class="sr-only peer">
              <div class="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        `;
      } else {
        return `
          <div class="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-1 hover:border-purple-500/20 transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-200">${labelName}</span>
              <span class="text-[10px] font-mono text-slate-500">${key}</span>
            </div>
            <input type="text" value="${val !== undefined && val !== null ? String(val).replace(/"/g, '&quot;') : ''}" onchange="serverProperties.setProp('${key}', this.value)" class="w-full glass-input px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300">
          </div>
        `;
      }
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  async handleSaveProperties() {
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/properties`, {
        method: 'PUT',
        body: JSON.stringify({ properties: this.properties })
      });
      if (res.success) {
        app.playSound('copy');
        app.toast('✅ Server properties saved successfully! Restart server to apply changes.', 'success');
      }
    } catch (err) {
      app.toast('Failed to save properties: ' + err.message, 'error');
    }
  }

  // Subdomains Logic
  async loadSubdomains() {
    const list = document.getElementById('subdomains-list-container');
    if (!list) return;

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/properties/subdomains`);
      if (res.success && res.subdomains) {
        const items = res.subdomains;
        if (items.length === 0) {
          list.innerHTML = `
            <div class="glass-card p-8 rounded-2xl text-center border border-dashed border-white/10 text-slate-400 text-xs">
              No custom subdomains configured for this server yet. Click "Create Subdomain" above!
            </div>
          `;
        } else {
          list.innerHTML = items.map(sd => `
            <div class="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-white font-mono">${sd.full_domain}</span>
                  <button onclick="app.copyToClipboard('${sd.full_domain}')" title="Copy Address" class="text-slate-400 hover:text-cyan-400">
                    <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
                <div class="text-[10px] text-slate-400 font-mono">
                  Points to: <span class="text-cyan-400">${sd.target_ip}:${sd.target_port}</span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button onclick="serverProperties.handleDeleteSubdomain(${sd.id})" class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/20 transition flex items-center gap-1">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete
                </button>
              </div>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Failed to load subdomains:', err);
    }
    if (window.lucide) lucide.createIcons();
  }

  showCreateSubdomainModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-purple-500/30 shadow-2xl space-y-4">
          <div class="flex justify-between items-center border-b border-white/10 pb-3">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <i data-lucide="globe" class="w-5 h-5 text-purple-400"></i> Create Free Subdomain
            </h3>
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="text-slate-400 hover:text-white">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Subdomain Prefix</label>
              <div class="flex items-center">
                <input type="text" id="new-subdomain-prefix" placeholder="play" class="flex-1 glass-input px-3.5 py-2 rounded-l-xl text-xs font-mono" required>
                <span class="px-3 py-2 bg-slate-800 text-slate-400 border-t border-b border-r border-white/10 rounded-r-xl text-xs font-mono">.mpanel.network</span>
              </div>
              <p class="text-[10px] text-slate-500 mt-1">Alphanumeric and dashes only. Example: <code>play</code> or <code>smp</code></p>
            </div>
          </div>

          <div class="flex gap-2 pt-2">
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="flex-1 py-2 rounded-xl text-xs bg-slate-700 text-slate-300">Cancel</button>
            <button onclick="serverProperties.handleCreateSubdomain()" class="btn-cyber flex-1 py-2 rounded-xl text-xs font-semibold">Create Subdomain</button>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async handleCreateSubdomain() {
    const prefix = document.getElementById('new-subdomain-prefix').value.trim();
    if (!prefix) return app.toast('Please enter a subdomain prefix.', 'error');

    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/properties/subdomains`, {
        method: 'POST',
        body: JSON.stringify({ prefix })
      });
      if (res.success) {
        document.getElementById('modal-container').innerHTML = '';
        app.toast('Subdomain created: ' + res.full_domain, 'success');
        this.loadSubdomains();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }

  async handleDeleteSubdomain(subId) {
    const ok = await app.confirm({
      tag: 'DELETE SUBDOMAIN',
      tagIcon: 'globe',
      title: 'Delete Subdomain',
      badge: window.location.host,
      message: 'Are you sure you want to delete this subdomain?',
      subtext: 'DNS integration and address bindings for this subdomain will be removed.',
      icon: 'trash-2',
      confirmIcon: 'trash-2',
      confirmText: 'Delete Subdomain',
      type: 'danger'
    });
    if (!ok) return;
    try {
      const res = await app.api(`/api/servers/${this.currentServerId}/properties/subdomains/${subId}`, {
        method: 'DELETE'
      });
      if (res.success) {
        app.toast('Subdomain deleted.', 'info');
        this.loadSubdomains();
      }
    } catch (err) {
      app.toast(err.message, 'error');
    }
  }
}

window.serverProperties = new ServerProperties();
