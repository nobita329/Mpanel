// Arix Addon Pack v2.0.2 - Admin Addons Management Controller

// Helper for API requests integrated with Mpanel app.api
async function apiRequest(endpoint, method = 'GET', body = null) {
  const appObj = (typeof window !== 'undefined' && window.app) ? window.app : null;
  if (appObj && typeof appObj.api === 'function') {
    if (typeof method === 'string' && method.toUpperCase() !== 'GET') {
      return await appObj.api(endpoint, method, body);
    }
    return await appObj.api(endpoint);
  }
  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('mpanel_token')) ||
                (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('mpanel_token')) || '';
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = (typeof FormData !== 'undefined' && body instanceof FormData) || typeof body === 'string' ? body : JSON.stringify(body);
  const res = await fetch(endpoint, opts);
  return await res.json();
}

function showNotification(msg, type = 'info') {
  const appObj = (typeof window !== 'undefined' && window.app) ? window.app : null;
  if (appObj && typeof appObj.showToast === 'function') {
    appObj.showToast(msg, type);
  } else if (appObj && typeof appObj.toast === 'function') {
    appObj.toast(msg, type);
  } else {
    console.log(`[${(type || 'INFO').toUpperCase()}] ${msg}`);
  }
}

class AdminAddonsController {
  constructor() {
    this.addons = [];
    this.settings = {};
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.activeModal = null;
    this.activeSubdomainTab = 'general'; // 'general' | 'cloudflare' | 'domains' | 'blocklist'
    this.activeEggImporterTab = 'game'; // 'game' | 'application' | 'generic' | 'custom'
    this.eggRepoList = [];
    this.eggRepoLoading = false;
    this.eggSearchQuery = '';
    this.cfConfig = { email: '', api_key: '', proxy_records: 0, use_alias: 0, use_domain_alias: 0 };
    this.connectedDomains = [];
    this.blocklist = [];
    this.fivemArtifacts = [];
  }

  async init() {
    await this.fetchAddons();
  }

  async fetchAddons() {
    try {
      const res = await apiRequest('/api/admin/addons');
      if (res && res.success) {
        this.addons = res.addons || [];
        this.settings = res.settings || {};
      }
    } catch (err) {
      console.error('Failed to load addons:', err);
      showNotification('Failed to load addons configuration: ' + err.message, 'error');
    }
  }

  async renderAddonsView() {
    const container = document.getElementById('view-container');
    if (!container) return;

    await this.fetchAddons();

    const filtered = this.addons.filter(a => {
      const matchCat = this.activeCategory === 'all' || a.category === this.activeCategory;
      const matchSearch = !this.searchQuery ||
        a.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        a.game.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    const activeCount = this.addons.filter(a => a.config && a.config.enabled).length;

    container.innerHTML = `
      <div class="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
        <!-- Header Banner -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                Arix Extension Suite
              </span>
              <span class="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Addon Pack v2.0.2 Active
              </span>
              <span class="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                ${activeCount} / ${this.addons.length} Enabled
              </span>
            </div>
            <h2 class="text-2xl font-black text-white mt-2 flex items-center gap-2.5 tracking-wide">
              <i data-lucide="package-check" class="w-6 h-6 text-purple-400"></i> Addon Pack Management
            </h2>
            <p class="text-xs text-slate-400 mt-1">
              Configure, enable, customize, and manage all 19 Arix Addon extensions for your game servers and client portal
            </p>
          </div>

          <div class="flex items-center gap-2.5 shrink-0">
            <button onclick="adminAddons.resetToDefaults()" class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition flex items-center gap-2">
              <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Reset Addons
            </button>
            <button onclick="adminAddons.openModal('eggImporter')" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2">
              <i data-lucide="download-cloud" class="w-4 h-4"></i> Egg Importer
            </button>
          </div>
        </div>

        <!-- Filter & Search Controls Bar -->
        <div class="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <!-- Categories Filter Pills -->
          <div class="flex flex-wrap items-center gap-1.5">
            ${[
              { id: 'all', label: 'All Addons', icon: 'grid' },
              { id: 'minecraft', label: 'Minecraft', icon: 'pickaxe' },
              { id: 'fivem', label: 'FiveM', icon: 'car' },
              { id: 'network', label: 'Network & DNS', icon: 'network' },
              { id: 'utility', label: 'Utilities', icon: 'wrench' },
              { id: 'database', label: 'Database', icon: 'database' }
            ].map(c => `
              <button onclick="adminAddons.setCategory('${c.id}')"
                class="px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${this.activeCategory === c.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-bold' : 'bg-white/5 hover:bg-white/10 text-slate-300'}">
                <span>${c.label}</span>
              </button>
            `).join('')}
          </div>

          <!-- Search Input -->
          <div class="relative min-w-[240px]">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
            <input type="text"
              placeholder="Search addons..."
              value="${this.searchQuery}"
              oninput="adminAddons.onSearch(this.value)"
              class="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500" />
          </div>
        </div>

        <!-- Addons Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${filtered.map(addon => {
            const isEnabled = addon.config && addon.config.enabled;
            return `
              <div class="glass-panel p-5 rounded-2xl border ${isEnabled ? 'border-purple-500/30 bg-purple-950/10' : 'border-white/5 bg-slate-900/40'} flex flex-col justify-between transition hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/5 group">
                <div>
                  <!-- Top Card Meta -->
                  <div class="flex items-start justify-between gap-3 mb-3">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl ${isEnabled ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-slate-800 text-slate-400 border border-white/10'} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <i data-lucide="${addon.icon || 'puzzle'}" class="w-5 h-5"></i>
                      </div>
                      <div>
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <h3 class="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">${addon.name}</h3>
                          ${addon.beta ? '<span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">BETA</span>' : ''}
                        </div>
                        <span class="text-[10px] font-medium text-slate-400 uppercase tracking-wider">${addon.game}</span>
                      </div>
                    </div>

                    <!-- Enable/Disable Switch -->
                    <label class="relative inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="adminAddons.toggleAddonQuick('${addon.key}', this.checked)" class="sr-only peer">
                      <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <!-- Description -->
                  <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    ${addon.description}
                  </p>
                </div>

                <!-- Footer Action -->
                <div class="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  <span class="inline-flex items-center gap-1.5 text-[11px] ${isEnabled ? 'text-emerald-400 font-semibold' : 'text-slate-500'}">
                    <span class="w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-400' : 'bg-slate-600'}"></span>
                    ${isEnabled ? 'Active' : 'Disabled'}
                  </span>

                  <button onclick="adminAddons.openModal('${addon.key}')" class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 transition flex items-center gap-1.5 font-medium text-[11px]">
                    <i data-lucide="sliders" class="w-3.5 h-3.5 text-purple-400"></i> Configure
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Addon Configuration Modal Container -->
        <div id="addon-modal-container"></div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  setCategory(cat) {
    this.activeCategory = cat;
    this.renderAddonsView();
  }

  onSearch(query) {
    this.searchQuery = query;
    this.renderAddonsView();
  }

  async toggleAddonQuick(addonKey, enabled) {
    try {
      const res = await apiRequest(`/api/admin/addons/${addonKey}`, 'POST', { enabled });
      if (res && res.success) {
        showNotification(`${addonKey} is now ${enabled ? 'Enabled' : 'Disabled'}!`, 'success');
        await this.fetchAddons();
        this.renderAddonsView();
      }
    } catch (err) {
      showNotification('Failed to update addon: ' + err.message, 'error');
      this.renderAddonsView();
    }
  }

  async resetToDefaults() {
    const ok = await window.app.confirm({
      tag: 'RESET ADDONS',
      tagIcon: 'refresh-cw',
      title: 'Reset Configuration',
      badge: window.location.host,
      message: 'Are you sure you want to reset all 19 addons to default configuration?',
      subtext: 'Custom toggles, domain links, and per-addon parameters will revert to factory values.',
      icon: 'refresh-cw',
      confirmIcon: 'refresh-cw',
      confirmText: 'Reset All',
      type: 'warning'
    });
    if (!ok) return;
    try {
      const res = await apiRequest('/api/admin/addons/reset', 'POST');
      if (res && res.success) {
        showNotification('All addons have been reset to factory defaults!', 'success');
        await this.renderAddonsView();
      }
    } catch (err) {
      showNotification('Reset failed: ' + err.message, 'error');
    }
  }

  // Open modal configuration for specific addon
  async openModal(addonKey) {
    const addon = this.addons.find(a => a.key === addonKey);
    if (!addon) return;

    const modalContainer = document.getElementById('addon-modal-container');
    if (!modalContainer) return;

    const config = addon.config || {};

    if (addonKey === 'subdomainManager') {
      await this.loadSubdomainData();
      modalContainer.innerHTML = this.renderSubdomainModal(addon, config);
    } else if (addonKey === 'eggImporter') {
      await this.loadEggRepoData('game');
      modalContainer.innerHTML = this.renderEggImporterModal(addon, config);
    } else if (addonKey === 'fivemArtifactChanger') {
      await this.loadFivemArtifacts();
      modalContainer.innerHTML = this.renderFivemArtifactsModal(addon, config);
    } else if (addonKey === 'fivemUtils') {
      modalContainer.innerHTML = this.renderFivemUtilsModal(addon, config);
    } else if (addonKey === 'ratelimit') {
      modalContainer.innerHTML = this.renderRatelimitModal(addon, config);
    } else if (addonKey === 'eggChanger') {
      modalContainer.innerHTML = this.renderEggChangerModal(addon, config);
    } else {
      modalContainer.innerHTML = this.renderGenericInstallerModal(addon, config);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  closeModal() {
    const modalContainer = document.getElementById('addon-modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
  }

  // ==========================================
  // MODAL: Generic Installer (Plugins, Mods, Worlds, etc.)
  // ==========================================
  renderGenericInstallerModal(addon, config) {
    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="glass-panel w-full max-w-lg p-6 rounded-3xl border border-white/10 space-y-5 shadow-2xl relative">
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <i data-lucide="${addon.icon || 'puzzle'}" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">${addon.name}</h3>
                <p class="text-[11px] text-slate-400">${addon.game} Extension</p>
              </div>
            </div>
            <button onclick="adminAddons.closeModal()" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <form onsubmit="adminAddons.saveGenericAddon('${addon.key}', event)" class="space-y-4 text-xs">
            <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
              <div>
                <p class="font-bold text-white">Enable ${addon.name}</p>
                <p class="text-[11px] text-slate-400">Make this addon accessible for compatible servers</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" id="modal-enabled-checkbox" ${config.enabled ? 'checked' : ''} class="sr-only peer">
                <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-200">Applicable Game Nests</span>
                <span class="text-[10px] text-purple-400 font-mono">Minecraft Nest: 1</span>
              </div>
              <p class="text-[11px] text-slate-400">
                This extension is configured for supported eggs. By default, it operates across primary Minecraft and Node game nests.
              </p>
            </div>

            <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button type="button" onclick="adminAddons.closeModal()" class="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition">Cancel</button>
              <button type="submit" class="btn-cyber px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  async saveGenericAddon(addonKey, event) {
    if (event) event.preventDefault();
    const enabled = document.getElementById('modal-enabled-checkbox').checked;
    try {
      const res = await apiRequest(`/api/admin/addons/${addonKey}`, 'POST', { enabled });
      if (res && res.success) {
        showNotification(`${addonKey} settings saved!`, 'success');
        this.closeModal();
        await this.renderAddonsView();
      }
    } catch (err) {
      showNotification('Error saving: ' + err.message, 'error');
    }
  }

  // ==========================================
  // MODAL: Subdomain Manager
  // ==========================================
  async loadSubdomainData() {
    try {
      const [cf, conn, block] = await Promise.all([
        apiRequest('/api/admin/addons/domains/cloudflare'),
        apiRequest('/api/admin/addons/domains/connected'),
        apiRequest('/api/admin/addons/domains/blocklist')
      ]);
      if (cf && cf.success) this.cfConfig = cf.config || this.cfConfig;
      if (conn && conn.success) this.connectedDomains = conn.domains || [];
      if (block && block.success) this.blocklist = block.blocklist || [];
    } catch (e) {
      console.warn('Subdomain data load error:', e);
    }
  }

  renderSubdomainModal(addon, config) {
    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
        <div class="glass-panel w-full max-w-2xl p-6 rounded-3xl border border-white/10 space-y-5 shadow-2xl relative my-8">
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <i data-lucide="at-sign" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">Subdomain Manager</h3>
                <p class="text-[11px] text-slate-400">Cloudflare DNS & SRV Automated Record Management</p>
              </div>
            </div>
            <button onclick="adminAddons.closeModal()" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Subdomain Tabs Navigation -->
          <div class="flex items-center gap-1.5 border-b border-white/10 pb-2">
            ${[
              { id: 'general', label: 'General' },
              { id: 'cloudflare', label: 'Cloudflare API' },
              { id: 'domains', label: 'Connected Domains (' + this.connectedDomains.length + ')' },
              { id: 'blocklist', label: 'Blocklist (' + this.blocklist.length + ')' }
            ].map(t => `
              <button onclick="adminAddons.setSubdomainTab('${t.id}')"
                class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${this.activeSubdomainTab === t.id ? 'bg-purple-600 text-white' : 'bg-white/5 hover:bg-white/10 text-slate-300'}">
                ${t.label}
              </button>
            `).join('')}
          </div>

          <div id="subdomain-tab-content">
            ${this.renderSubdomainTabContent(addon, config)}
          </div>
        </div>
      </div>
    `;
  }

  setSubdomainTab(tab) {
    this.activeSubdomainTab = tab;
    const el = document.getElementById('subdomain-tab-content');
    const addon = this.addons.find(a => a.key === 'subdomainManager');
    if (el && addon) {
      el.innerHTML = this.renderSubdomainTabContent(addon, addon.config || {});
      if (window.lucide) window.lucide.createIcons();
    }
  }

  renderSubdomainTabContent(addon, config) {
    if (this.activeSubdomainTab === 'general') {
      return `
        <div class="space-y-4 text-xs">
          <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
            <div>
              <p class="font-bold text-white">Enable Subdomain Manager</p>
              <p class="text-[11px] text-slate-400">Allow users to create custom subdomains in client area</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" id="subdomain-enabled-checkbox" ${config.enabled ? 'checked' : ''} class="sr-only peer">
              <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div class="flex justify-end pt-3">
            <button onclick="adminAddons.saveSubdomainGeneral()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-bold">Save Setting</button>
          </div>
        </div>
      `;
    } else if (this.activeSubdomainTab === 'cloudflare') {
      return `
        <form onsubmit="adminAddons.saveCloudflareCredentials(event)" class="space-y-3.5 text-xs">
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Cloudflare Account Email</label>
            <input type="email" id="cf-email-input" value="${this.cfConfig.email || ''}" placeholder="admin@example.com" class="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-white focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Cloudflare API Token / Global Key</label>
            <input type="password" id="cf-key-input" value="${this.cfConfig.api_key || ''}" placeholder="Bearer token with Zone.DNS edit permissions" class="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-white focus:outline-none focus:border-purple-500" />
          </div>

          <div class="space-y-2 pt-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="cf-proxy-checkbox" ${this.cfConfig.proxy_records ? 'checked' : ''} class="rounded bg-slate-900 border-white/20 text-purple-600">
              <span class="text-slate-300 font-semibold">Enable Cloudflare Proxy for Web Records (Orange Cloud)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="cf-alias-checkbox" ${this.cfConfig.use_alias ? 'checked' : ''} class="rounded bg-slate-900 border-white/20 text-purple-600">
              <span class="text-slate-300 font-semibold">Use IP Alias for DNS targets</span>
            </label>
          </div>

          <div class="flex justify-end pt-3">
            <button type="submit" class="btn-cyber px-5 py-2 rounded-xl text-xs font-bold">Save Cloudflare Config</button>
          </div>
        </form>
      `;
    } else if (this.activeSubdomainTab === 'domains') {
      return `
        <div class="space-y-4 text-xs">
          <div class="flex gap-2">
            <input type="text" id="new-domain-input" placeholder="e.g. playmc.com" class="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-purple-500" />
            <input type="text" id="new-zone-input" placeholder="Cloudflare Zone ID (optional)" class="w-48 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-purple-500" />
            <button onclick="adminAddons.connectNewDomain()" class="btn-cyber px-4 py-2 rounded-xl font-bold shrink-0">Connect</button>
          </div>

          <div class="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
            ${this.connectedDomains.length === 0 ? '<p class="text-slate-500 text-center py-4">No connected root domains. Connect one above.</p>' : ''}
            ${this.connectedDomains.map(d => `
              <div class="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
                <div>
                  <span class="font-bold text-white text-sm">${d.domain}</span>
                  <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span class="text-emerald-400">● ${d.status}</span>
                    <span>Zone: ${d.zone_id || 'Auto'}</span>
                    <span>${d.serverCount || 0} Subdomains active</span>
                  </div>
                </div>
                <button onclick="adminAddons.disconnectDomain('${d.domain}')" class="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] transition">Disconnect</button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      return `
        <div class="space-y-4 text-xs">
          <div class="flex gap-2">
            <input type="text" id="block-word-input" placeholder="Forbidden keyword (e.g. admin, porn, free)" class="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-purple-500" />
            <input type="text" id="block-reason-input" placeholder="Reason (e.g. Reserved)" class="w-40 px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-purple-500" />
            <button onclick="adminAddons.addBlocklistWord()" class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shrink-0">Block</button>
          </div>

          <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>${this.blocklist.length} restricted words active</span>
            <div class="flex gap-2">
              <a href="/api/admin/addons/domains/blocklist/export" download class="text-cyan-400 hover:underline">Export JSON</a>
            </div>
          </div>

          <div class="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
            ${this.blocklist.length === 0 ? '<p class="text-slate-500 text-center py-4">No words blocked.</p>' : ''}
            ${this.blocklist.map(b => `
              <div class="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-white/5 text-[11px]">
                <div>
                  <span class="font-bold text-rose-400 font-mono">${b.subdomain}</span>
                  <span class="text-slate-400 ml-2">(${b.reason || 'Restricted'})</span>
                </div>
                <button onclick="adminAddons.removeBlocklistWord(${b.id})" class="text-slate-500 hover:text-rose-400 transition">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
  }

  async saveSubdomainGeneral() {
    const enabled = document.getElementById('subdomain-enabled-checkbox').checked;
    await apiRequest('/api/admin/addons/subdomainManager', 'POST', { enabled });
    showNotification('Subdomain manager setting saved!', 'success');
    this.closeModal();
    this.renderAddonsView();
  }

  async saveCloudflareCredentials(event) {
    if (event) event.preventDefault();
    const email = document.getElementById('cf-email-input').value;
    const api_key = document.getElementById('cf-key-input').value;
    const proxy_records = document.getElementById('cf-proxy-checkbox').checked;
    const use_alias = document.getElementById('cf-alias-checkbox').checked;

    try {
      const res = await apiRequest('/api/admin/addons/domains/cloudflare', 'POST', {
        email, api_key, proxy_records, use_alias
      });
      if (res && res.success) {
        showNotification('Cloudflare configuration saved successfully!', 'success');
        this.cfConfig = res.config;
      }
    } catch (e) {
      showNotification('Failed to save Cloudflare config: ' + e.message, 'error');
    }
  }

  async connectNewDomain() {
    const domain = document.getElementById('new-domain-input').value;
    const zoneId = document.getElementById('new-zone-input').value;
    if (!domain) return showNotification('Please enter a domain name.', 'error');
    try {
      const res = await apiRequest('/api/admin/addons/domains/connect', 'POST', { domain, zoneId });
      if (res && res.success) {
        showNotification(res.message, 'success');
        await this.loadSubdomainData();
        this.setSubdomainTab('domains');
      }
    } catch (e) {
      showNotification('Failed to connect domain: ' + e.message, 'error');
    }
  }

  async disconnectDomain(domain) {
    const ok = await window.app.confirm({
      tag: 'DISCONNECT DOMAIN',
      tagIcon: 'unlink',
      title: 'Disconnect Domain',
      badge: window.location.host,
      message: `Are you sure you want to disconnect ${domain}?`,
      subtext: 'Traffic routing and DNS integration through Cloudflare will be removed.',
      icon: 'unlink',
      confirmIcon: 'unlink',
      confirmText: 'Disconnect',
      type: 'danger'
    });
    if (!ok) return;
    try {
      const res = await apiRequest(`/api/admin/addons/domains/disconnect/${domain}`, 'DELETE');
      if (res && res.success) {
        showNotification(res.message, 'success');
        await this.loadSubdomainData();
        this.setSubdomainTab('domains');
      }
    } catch (e) {
      showNotification('Error disconnecting: ' + e.message, 'error');
    }
  }

  async addBlocklistWord() {
    const subdomain = document.getElementById('block-word-input').value;
    const reason = document.getElementById('block-reason-input').value;
    if (!subdomain) return showNotification('Please enter word to block.', 'error');
    try {
      const res = await apiRequest('/api/admin/addons/domains/blocklist', 'POST', { subdomain, reason });
      if (res && res.success) {
        showNotification(res.message, 'success');
        await this.loadSubdomainData();
        this.setSubdomainTab('blocklist');
      }
    } catch (e) {
      showNotification('Error: ' + e.message, 'error');
    }
  }

  async removeBlocklistWord(id) {
    try {
      await apiRequest(`/api/admin/addons/domains/blocklist/${id}`, 'DELETE');
      showNotification('Blocklist word removed.', 'success');
      await this.loadSubdomainData();
      this.setSubdomainTab('blocklist');
    } catch (e) {
      showNotification('Error: ' + e.message, 'error');
    }
  }

  // ==========================================
  // MODAL: Egg Importer (GitHub Trees)
  // ==========================================
  async loadEggRepoData(type = 'game') {
    this.eggRepoLoading = true;
    try {
      const res = await apiRequest(`/api/admin/addons/eggs/repo/${type}`);
      if (res && res.success) {
        this.eggRepoList = res.eggs || [];
      }
    } catch (e) {
      console.warn('Egg repo fetch error:', e);
    } finally {
      this.eggRepoLoading = false;
    }
  }

  renderEggImporterModal(addon, config) {
    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
        <div class="glass-panel w-full max-w-3xl p-6 rounded-3xl border border-white/10 space-y-5 shadow-2xl relative my-8">
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <i data-lucide="download-cloud" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">Pterodactyl Egg Importer</h3>
                <p class="text-[11px] text-slate-400">1-Click Import Official & Community Eggs from GitHub</p>
              </div>
            </div>
            <button onclick="adminAddons.closeModal()" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Repo Tab switcher -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-1.5">
              ${[
                { id: 'game', label: 'Game Eggs' },
                { id: 'application', label: 'Application Eggs' },
                { id: 'generic', label: 'Generic Eggs' },
                { id: 'custom', label: 'Direct JSON' }
              ].map(t => `
                <button onclick="adminAddons.setEggRepoTab('${t.id}')"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold transition ${this.activeEggImporterTab === t.id ? 'bg-purple-600 text-white' : 'bg-white/5 hover:bg-white/10 text-slate-300'}">
                  ${t.label}
                </button>
              `).join('')}
            </div>

            ${this.activeEggImporterTab !== 'custom' ? `
              <input type="text"
                placeholder="Search eggs..."
                oninput="adminAddons.filterEggs(this.value)"
                class="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500" />
            ` : ''}
          </div>

          <!-- Egg List -->
          <div id="egg-importer-content" class="min-h-[280px]">
            ${this.renderEggListContent()}
          </div>
        </div>
      </div>
    `;
  }

  async setEggRepoTab(tab) {
    this.activeEggImporterTab = tab;
    if (tab !== 'custom') {
      await this.loadEggRepoData(tab);
    }
    const el = document.getElementById('egg-importer-content');
    if (el) {
      el.innerHTML = this.renderEggListContent();
      if (window.lucide) window.lucide.createIcons();
    }
  }

  filterEggs(query) {
    this.eggSearchQuery = query.toLowerCase();
    const el = document.getElementById('egg-importer-content');
    if (el) {
      el.innerHTML = this.renderEggListContent();
      if (window.lucide) window.lucide.createIcons();
    }
  }

  renderEggListContent() {
    if (this.activeEggImporterTab === 'custom') {
      return `
        <form onsubmit="adminAddons.importCustomEggJson(event)" class="space-y-3.5 text-xs">
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Egg Name</label>
            <input type="text" id="custom-egg-name" placeholder="My Custom Server Egg" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white" />
          </div>
          <div>
            <label class="block text-slate-300 font-semibold mb-1">Raw JSON or GitHub Raw URL</label>
            <textarea id="custom-egg-json" rows="7" placeholder="Paste full egg JSON or enter raw URL" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white font-mono text-[11px]"></textarea>
          </div>
          <div class="flex justify-end">
            <button type="submit" class="btn-cyber px-5 py-2 rounded-xl font-bold">Import Custom Egg</button>
          </div>
        </form>
      `;
    }

    if (this.eggRepoLoading) {
      return `
        <div class="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <div class="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs">Fetching eggs from GitHub repository...</p>
        </div>
      `;
    }

    const filtered = this.eggRepoList.filter(e => {
      return !this.eggSearchQuery ||
        e.name.toLowerCase().includes(this.eggSearchQuery) ||
        (e.category && e.category.toLowerCase().includes(this.eggSearchQuery));
    });

    if (filtered.length === 0) {
      return `<p class="text-center text-slate-500 py-12 text-xs">No eggs found matching "${this.eggSearchQuery}".</p>`;
    }

    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto custom-scrollbar pr-1">
        ${filtered.map(e => `
          <div class="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between hover:border-purple-500/30 transition">
            <div class="min-w-0 pr-2">
              <h4 class="text-xs font-bold text-white truncate">${e.name}</h4>
              <p class="text-[10px] text-slate-400 truncate">${e.category || 'General'}</p>
            </div>
            <button onclick="adminAddons.importEggOneClick('${e.name}', '${e.raw_url}')" class="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 font-semibold text-[11px] transition shrink-0 flex items-center gap-1.5">
              <i data-lucide="download" class="w-3.5 h-3.5"></i> Import
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  async importEggOneClick(name, rawUrl) {
    try {
      showNotification(`Importing ${name}...`, 'info');
      const res = await apiRequest('/api/admin/addons/eggs/import', 'POST', { name, raw_url: rawUrl });
      if (res && res.success) {
        showNotification(res.message, 'success');
      }
    } catch (e) {
      showNotification('Import error: ' + e.message, 'error');
    }
  }

  async importCustomEggJson(event) {
    if (event) event.preventDefault();
    const name = document.getElementById('custom-egg-name').value;
    const content = document.getElementById('custom-egg-json').value;
    if (!content) return showNotification('Please provide egg JSON or URL.', 'error');

    const payload = { name };
    if (content.startsWith('http://') || content.startsWith('https://')) {
      payload.raw_url = content.trim();
    } else {
      payload.egg_json = content.trim();
    }

    try {
      const res = await apiRequest('/api/admin/addons/eggs/import', 'POST', payload);
      if (res && res.success) {
        showNotification(res.message, 'success');
        this.closeModal();
      }
    } catch (e) {
      showNotification('Import failed: ' + e.message, 'error');
    }
  }

  // ==========================================
  // MODAL: FiveM Artifacts
  // ==========================================
  async loadFivemArtifacts() {
    try {
      const res = await apiRequest('/api/addons/fivem/artifacts');
      if (res && res.success) {
        this.fivemArtifacts = res.artifacts || [];
      }
    } catch (e) {
      console.warn('Artifacts error:', e);
    }
  }

  renderFivemArtifactsModal(addon, config) {
    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="glass-panel w-full max-w-lg p-6 rounded-3xl border border-white/10 space-y-5 shadow-2xl relative">
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <i data-lucide="layers" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">FiveM Artifacts Changer</h3>
                <p class="text-[11px] text-slate-400">FXServer Master Builds & Version Management</p>
              </div>
            </div>
            <button onclick="adminAddons.closeModal()" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <div class="space-y-4 text-xs">
            <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
              <div>
                <p class="font-bold text-white">Enable Artifact Changer</p>
                <p class="text-[11px] text-slate-400">Allow users to select specific FiveM runtime builds</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" id="modal-enabled-checkbox" ${config.enabled ? 'checked' : ''} class="sr-only peer">
                <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div class="space-y-2">
              <h4 class="font-bold text-slate-200">Available FXServer Artifacts</h4>
              <div class="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                ${this.fivemArtifacts.map(a => `
                  <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between font-mono text-[11px]">
                    <span class="text-slate-300">${a.version}</span>
                    ${a.recommended ? '<span class="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">RECOMMENDED</span>' : ''}
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="flex justify-end pt-3">
              <button onclick="adminAddons.saveGenericAddon('fivemArtifactChanger')" class="btn-cyber px-5 py-2 rounded-xl font-bold">Save Setting</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================
  // MODAL: FiveM Utils
  // ==========================================
  renderFivemUtilsModal(addon, config) {
    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="glass-panel w-full max-w-lg p-6 rounded-3xl border border-white/10 space-y-5 shadow-2xl relative">
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <i data-lucide="tool" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">FiveM Utilities</h3>
                <p class="text-[11px] text-slate-400">TxAdmin Auto-Login & Server Management</p>
              </div>
            </div>
            <button onclick="adminAddons.closeModal()" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <form onsubmit="adminAddons.saveFivemUtils(event)" class="space-y-3.5 text-xs">
            <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
              <div>
                <p class="font-bold text-white">Enable FiveM Utils</p>
                <p class="text-[11px] text-slate-400">Enable txAdmin tools on FiveM servers</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" id="fivem-enabled-check" ${config.enabled ? 'checked' : ''} class="sr-only peer">
                <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div class="space-y-2 p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
              <h4 class="font-bold text-slate-200 mb-2">Available Utilities</h4>
              <label class="flex items-center justify-between py-1 cursor-pointer">
                <span class="text-slate-300">TxAdmin Auto-Login Support</span>
                <input type="checkbox" id="fivem-login-check" ${config.txAdminLogin !== false ? 'checked' : ''} class="rounded bg-slate-800 border-white/20 text-purple-600">
              </label>
              <label class="flex items-center justify-between py-1 cursor-pointer">
                <span class="text-slate-300">TxAdmin Automatic Setup Wizard</span>
                <input type="checkbox" id="fivem-setup-check" ${config.txAdminSetup !== false ? 'checked' : ''} class="rounded bg-slate-800 border-white/20 text-purple-600">
              </label>
              <label class="flex items-center justify-between py-1 cursor-pointer">
                <span class="text-slate-300">One-Click Cache Directory Cleaning</span>
                <input type="checkbox" id="fivem-cache-check" ${config.cacheDelete !== false ? 'checked' : ''} class="rounded bg-slate-800 border-white/20 text-purple-600">
              </label>
            </div>

            <div class="flex justify-end pt-3">
              <button type="submit" class="btn-cyber px-5 py-2 rounded-xl font-bold">Save Settings</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  async saveFivemUtils(event) {
    if (event) event.preventDefault();
    const enabled = document.getElementById('fivem-enabled-check').checked;
    const txAdminLogin = document.getElementById('fivem-login-check').checked;
    const txAdminSetup = document.getElementById('fivem-setup-check').checked;
    const cacheDelete = document.getElementById('fivem-cache-check').checked;

    try {
      const res = await apiRequest('/api/admin/addons/fivemUtils', 'POST', {
        enabled, txAdminLogin, txAdminSetup, cacheDelete
      });
      if (res && res.success) {
        showNotification('FiveM Utils settings saved!', 'success');
        this.closeModal();
        this.renderAddonsView();
      }
    } catch (e) {
      showNotification('Error: ' + e.message, 'error');
    }
  }

  // ==========================================
  // MODAL: Rate Limit Editor
  // ==========================================
  renderRatelimitModal(addon, config) {
    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/10 space-y-5 shadow-2xl relative">
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <i data-lucide="shield-alert" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">Rate Limit Editor</h3>
                <p class="text-[11px] text-slate-400">Traffic Throttling & DDoS Protection</p>
              </div>
            </div>
            <button onclick="adminAddons.closeModal()" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <form onsubmit="adminAddons.saveRatelimit(event)" class="space-y-4 text-xs">
            <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
              <div>
                <p class="font-bold text-white">Enable Rate Limiting</p>
                <p class="text-[11px] text-slate-400">Throttle excessive client API calls</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" id="rl-enabled-check" ${config.enabled ? 'checked' : ''} class="sr-only peer">
                <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div>
              <label class="block text-slate-300 font-semibold mb-1">Rate Limit Multiplier</label>
              <input type="number" id="rl-multiplier-input" min="1" max="100" value="${config.multiplier || 1}" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white" />
              <p class="text-[10px] text-slate-400 mt-1">Increase multiplier to allow higher throughput for large server clusters (1x = standard, 2x = double capacity).</p>
            </div>

            <div class="flex justify-end pt-3">
              <button type="submit" class="btn-cyber px-5 py-2 rounded-xl font-bold">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  async saveRatelimit(event) {
    if (event) event.preventDefault();
    const enabled = document.getElementById('rl-enabled-check').checked;
    const multiplier = parseInt(document.getElementById('rl-multiplier-input').value, 10) || 1;
    try {
      const res = await apiRequest('/api/admin/addons/ratelimit', 'POST', { enabled, multiplier });
      if (res && res.success) {
        showNotification('Rate limit settings saved!', 'success');
        this.closeModal();
        this.renderAddonsView();
      }
    } catch (e) {
      showNotification('Error: ' + e.message, 'error');
    }
  }

  // ==========================================
  // MODAL: Egg Changer
  // ==========================================
  renderEggChangerModal(addon, config) {
    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="glass-panel w-full max-w-lg p-6 rounded-3xl border border-white/10 space-y-5 shadow-2xl relative">
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <i data-lucide="shuffle" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">Egg Changer</h3>
                <p class="text-[11px] text-slate-400">Server Egg & Container Image Switcher</p>
              </div>
            </div>
            <button onclick="adminAddons.closeModal()" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <form onsubmit="adminAddons.saveEggChanger(event)" class="space-y-4 text-xs">
            <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
              <div>
                <p class="font-bold text-white">Enable Egg Changer</p>
                <p class="text-[11px] text-slate-400">Allow users to switch eggs on their servers</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" id="eggchanger-enabled-check" ${config.enabled ? 'checked' : ''} class="sr-only peer">
                <div class="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            <div>
              <label class="block text-slate-300 font-semibold mb-1">Egg Restriction Mode</label>
              <select id="eggchanger-restriction-select" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white">
                <option value="none" ${config.restriction === 'none' ? 'selected' : ''}>None (Users can switch to any egg)</option>
                <option value="nestBased" ${config.restriction === 'nestBased' ? 'selected' : ''}>Nest-Based (Only eggs within same game category)</option>
                <option value="custom" ${config.restriction === 'custom' ? 'selected' : ''}>Custom (Explicit allowed egg mappings)</option>
              </select>
            </div>

            <label class="flex items-center gap-2 p-3 rounded-xl bg-slate-900/60 border border-white/5 cursor-pointer">
              <input type="checkbox" id="eggchanger-force-startup" ${config.forceStartup ? 'checked' : ''} class="rounded bg-slate-800 border-white/20 text-purple-600">
              <span class="text-slate-300">Force automatic update of startup command upon egg switch</span>
            </label>

            <div class="flex justify-end pt-3">
              <button type="submit" class="btn-cyber px-5 py-2 rounded-xl font-bold">Save Egg Changer</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  async saveEggChanger(event) {
    if (event) event.preventDefault();
    const enabled = document.getElementById('eggchanger-enabled-check').checked;
    const restriction = document.getElementById('eggchanger-restriction-select').value;
    const forceStartup = document.getElementById('eggchanger-force-startup').checked;
    try {
      const res = await apiRequest('/api/admin/addons/eggChanger', 'POST', {
        enabled, restriction, forceStartup
      });
      if (res && res.success) {
        showNotification('Egg Changer settings saved!', 'success');
        this.closeModal();
        this.renderAddonsView();
      }
    } catch (e) {
      showNotification('Error: ' + e.message, 'error');
    }
  }
}

// Global instance
window.adminAddons = new AdminAddonsController();
var adminAddons = window.adminAddons;
