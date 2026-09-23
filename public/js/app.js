// Mpanel Application Core & Router
class App {
  constructor() {
    this.token = localStorage.getItem('mpanel_token') || null;
    this.user = null;
    this.currentView = 'user-overview';
    this.currentServerId = null;
    this.settings = {};
    this.deviceMode = localStorage.getItem('mpanel_device_mode') || 'auto';
    this.init();
  }

  async init() {
    this.initDeviceMode();

    // Handle OAuth Callback query parameters
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('social_token')) {
        const token = urlParams.get('social_token');
        localStorage.setItem('mpanel_token', token);
        this.token = token;
        window.history.replaceState({}, document.title, window.location.pathname + (window.location.hash || '#overview'));
        setTimeout(() => this.toast('Signed in via Social Login successfully!', 'success'), 300);
      } else if (urlParams.has('social_error')) {
        const errorMsg = urlParams.get('social_error') || 'Social login failed.';
        window.history.replaceState({}, document.title, window.location.pathname + (window.location.hash || '#overview'));
        setTimeout(() => this.toast(decodeURIComponent(errorMsg), 'error'), 300);
      } else if (urlParams.has('social_success')) {
        const msg = urlParams.get('social_success') || 'Social account linked successfully!';
        window.history.replaceState({}, document.title, window.location.pathname + (window.location.hash || '#overview'));
        setTimeout(() => this.toast(decodeURIComponent(msg), 'success'), 300);
      }
    } catch (e) {
      console.warn('Error handling OAuth URL parameters:', e);
    }

    await this.loadPublicSettings();
    await this.checkAuth();
    this.bindHashChange();
    this.handleRoute();

    // Auto-Tutorial Guided Tour on first login
    try {
      const autoTourEnabled = (this.settings?.tutorials_autostart_enabled === '1' || localStorage.getItem('mpanel_tutorials_autostart_enabled') === '1');
      const autoTourDone = localStorage.getItem('mpanel_autotour_done') === '1';
      if (autoTourEnabled && !autoTourDone && window.autoTutorial && this.user) {
        setTimeout(() => {
          if (this.user && !document.getElementById('tutorial-tooltip-card')) {
            autoTutorial.startTour('panel-tour', true);
          }
        }, 1200);
      }
    } catch (e) {}
  }

  // Toast Notification System
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-600/90 border-emerald-400 text-white',
      error: 'bg-rose-600/90 border-rose-400 text-white',
      warning: 'bg-amber-600/90 border-amber-400 text-white',
      info: 'bg-cyan-600/90 border-cyan-400 text-white'
    };

    const icons = {
      success: 'check-circle',
      error: 'alert-circle',
      warning: 'alert-triangle',
      info: 'info'
    };

    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md pointer-events-auto transition-all transform duration-300 translate-y-2 opacity-0 text-xs font-medium ${bgColors[type] || bgColors.info}`;
    toast.innerHTML = `
      <i data-lucide="${icons[type] || 'info'}" class="w-4 h-4 shrink-0"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Compatibility alias for toast
  showToast(message, type = 'info') {
    return this.toast(message, type);
  }

  // HTML Escaper for XSS prevention and safe template rendering
  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Generic API Requester (supports options object or method + body)
  async api(endpoint, options = {}, maybeBody = null) {
    let opts = options;
    if (typeof options === 'string') {
      opts = { method: options.toUpperCase() };
      if (maybeBody !== null && maybeBody !== undefined) {
        opts.body = (maybeBody instanceof FormData || typeof maybeBody === 'string')
          ? maybeBody
          : JSON.stringify(maybeBody);
      }
    } else if (opts && opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
      opts.body = JSON.stringify(opts.body);
    }

    const headers = (opts && opts.headers) ? { ...opts.headers } : {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (opts && !(opts.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const res = await fetch(endpoint, {
        ...opts,
        headers
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP error ${res.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  }

  async loadPublicSettings() {
    try {
      const data = await this.api('/api/admin/settings/public');
      if (data.success && data.settings) {
        this.settings = data.settings;
        this.applyBrandingAndTheme(data.settings);
      }
    } catch (e) {
      console.warn('Could not load public settings:', e);
    }
  }

  applyBrandingAndTheme(s) {
    if (!s) return;

    if (s.panel_name) {
      const tabTitle = document.getElementById('tab-title');
      if (tabTitle) tabTitle.innerText = s.panel_name;
      const headerTitle = document.getElementById('header-panel-name');
      if (headerTitle) headerTitle.innerText = s.panel_name;
    }

    if (s.favicon_name) {
      const tabTitle = document.getElementById('tab-title');
      if (tabTitle) tabTitle.innerText = s.favicon_name;
    }

    if (s.panel_logo) {
      const img = document.getElementById('header-logo-img');
      if (img) img.src = s.panel_logo;
    }

    if (s.favicon_logo) {
      const fav = document.getElementById('tab-favicon');
      if (fav) fav.href = s.favicon_logo;
    }

    // Theme Mode (Dark / Light)
    const isLight = s.theme_mode === 'light';
    if (isLight) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }

    // Apply Background (Image or Video)
    if (s.panel_bg) {
      const isVideo = s.panel_bg_type === 'video' || /\.(mp4|webm|mkv|mov)($|\?)/i.test(s.panel_bg);
      const vid = document.getElementById('wallpaper-video');
      const wallLayer = document.getElementById('wallpaper-layer');

      if (isVideo && vid) {
        if (vid.src !== s.panel_bg) {
          vid.src = s.panel_bg;
        }
        vid.classList.remove('hidden');
        if (wallLayer) wallLayer.style.backgroundImage = 'none';
        vid.play().catch(() => {});
      } else {
        if (vid) {
          vid.classList.add('hidden');
          vid.pause();
        }
        if (wallLayer) wallLayer.style.backgroundImage = '';
        document.documentElement.style.setProperty('--panel-bg', `url('${s.panel_bg}')`);
      }
    }

    // Active UI Theme (Arix Theme vs NookTheme vs LiquidX Theme vs PteroX Theme vs DezerX Theme vs LucentUI)
    const activeTheme = s.active_theme || localStorage.getItem('mpanel_active_theme') || 'lucent';
    localStorage.setItem('mpanel_active_theme', activeTheme);
    this.activeTheme = activeTheme;

    document.documentElement.classList.remove('theme-arix', 'theme-nook', 'theme-liquidx', 'theme-pterox', 'theme-nebula', 'theme-dezerx', 'theme-lucent');

    const logoEl = document.getElementById('header-logo-img');
    const subNameEl = document.getElementById('header-sub-name');

    if (activeTheme === 'lucent') {
      document.documentElement.classList.add('theme-lucent');
      if (logoEl && (!s.panel_logo || s.panel_logo === '/assets/mpanel-logo.svg' || s.panel_logo === '/arix/Arix.png' || s.panel_logo === '/assets/liquidx-logo.svg' || s.panel_logo === '/images/pterox-header-logo.webp')) {
        logoEl.src = '/assets/lucent-logo.svg';
      }
      if (subNameEl && (!s.panel_name || s.panel_name === 'Angelillo15' || s.panel_name === 'Mpanel' || subNameEl.innerText.includes('Theme') || subNameEl.innerText.includes('Server Engine') || subNameEl.innerText.includes('PteroX'))) {
        subNameEl.innerText = 'LucentUI Minimalist Engine';
      }
    } else if (activeTheme === 'dezerx') {
      document.documentElement.classList.add('theme-dezerx');
      if (logoEl && (!s.panel_logo || s.panel_logo === '/assets/mpanel-logo.svg' || s.panel_logo === '/arix/Arix.png' || s.panel_logo === '/assets/liquidx-logo.svg' || s.panel_logo === '/images/pterox-header-logo.webp')) {
        logoEl.src = '/images/meta/Logo.png';
      }
      if (subNameEl && (!s.panel_name || s.panel_name === 'Angelillo15' || s.panel_name === 'Mpanel' || subNameEl.innerText.includes('Theme') || subNameEl.innerText.includes('Server Engine') || subNameEl.innerText.includes('PteroX'))) {
        subNameEl.innerText = 'DezerX Vulcan Cloud';
      }
    } else if (activeTheme === 'nebula') {
      document.documentElement.classList.add('theme-nebula');
      if (logoEl && (!s.panel_logo || s.panel_logo === '/assets/mpanel-logo.svg' || s.panel_logo === '/arix/Arix.png' || s.panel_logo === '/assets/liquidx-logo.svg' || s.panel_logo === '/images/pterox-header-logo.webp')) {
        logoEl.src = '/assets/nebula-logo.svg';
      }
      if (subNameEl && (!s.panel_name || s.panel_name === 'Angelillo15' || s.panel_name === 'Mpanel' || subNameEl.innerText.includes('Theme') || subNameEl.innerText.includes('Server Engine') || subNameEl.innerText.includes('PteroX'))) {
        subNameEl.innerText = 'Nebula Theme v2.0';
      }
      if (window.nebulaEditor) {
        if (s.nebula_config) {
          try {
            const parsed = typeof s.nebula_config === 'string' ? JSON.parse(s.nebula_config) : s.nebula_config;
            window.nebulaEditor.config = { ...window.nebulaEditor.config, ...parsed };
          } catch (e) {}
        }
        window.nebulaEditor.applyConfig();
      }
    } else {
      const banner = document.getElementById('nebula-alert-banner');
      if (banner) banner.classList.add('hidden');
      document.body.classList.remove('nebula-sidebar-compact', 'nebula-btn-outline', 'nebula-btn-line');
      document.documentElement.classList.remove('nebula-sidebar-compact', 'nebula-btn-outline', 'nebula-btn-line');
      const wallLayer = document.getElementById('wallpaper-layer');
      if (wallLayer) {
        const patternClasses = Array.from(wallLayer.classList).filter(c => c.startsWith('nebula-pattern-'));
        patternClasses.forEach(c => wallLayer.classList.remove(c));
      }
    }

    if (activeTheme === 'pterox') {
      document.documentElement.classList.add('theme-pterox');
      const pteroxLogo = localStorage.getItem('pterox_header_logo') || s.pterox_header_logo || '/images/pterox-header-logo.webp';
      if (logoEl) {
        logoEl.src = pteroxLogo;
      }
      const pteroxBrand = localStorage.getItem('pterox_brand_name') || s.pterox_brand_name || 'PteroX';
      if (subNameEl) {
        subNameEl.innerText = `${pteroxBrand} v2.0.2`;
      }
    } else if (activeTheme === 'liquidx') {
      document.documentElement.classList.add('theme-liquidx');
      if (logoEl && (!s.panel_logo || s.panel_logo === '/assets/mpanel-logo.svg' || s.panel_logo === '/arix/Arix.png' || s.panel_logo === '/images/pterox-header-logo.webp')) {
        logoEl.src = '/assets/liquidx-logo.svg';
      }
      if (subNameEl && (!s.panel_name || s.panel_name === 'Angelillo15' || s.panel_name === 'Mpanel' || subNameEl.innerText.includes('Theme') || subNameEl.innerText.includes('Server Engine') || subNameEl.innerText.includes('PteroX'))) {
        subNameEl.innerText = 'LiquidX Theme v1.0';
      }
      if (s.liquidx_primary_color) {
        document.documentElement.style.setProperty('--liquidx-gold', s.liquidx_primary_color);
      }
    } else if (activeTheme === 'arix') {
      document.documentElement.classList.add('theme-arix');
      if (logoEl && (!s.panel_logo || s.panel_logo === '/assets/mpanel-logo.svg' || s.panel_logo === '/assets/liquidx-logo.svg' || s.panel_logo === '/images/pterox-header-logo.webp')) {
        logoEl.src = '/arix/Arix.png';
      }
      if (subNameEl && (!s.panel_name || s.panel_name === 'Angelillo15' || s.panel_name === 'Mpanel' || subNameEl.innerText.includes('Theme') || subNameEl.innerText.includes('Server Engine') || subNameEl.innerText.includes('PteroX'))) {
        subNameEl.innerText = 'Arix Theme v2.1.3';
      }
      if (s.arix_primary_color) {
        document.documentElement.style.setProperty('--arix-primary', s.arix_primary_color);
      }
    } else {
      document.documentElement.classList.add('theme-nook');
      if (logoEl && (!s.panel_logo || s.panel_logo === '/arix/Arix.png' || s.panel_logo === '/assets/liquidx-logo.svg' || s.panel_logo === '/images/pterox-header-logo.webp')) {
        logoEl.src = '/assets/mpanel-logo.svg';
      }
      if (subNameEl && (subNameEl.innerText.includes('Theme') || subNameEl.innerText.includes('PteroX'))) {
        subNameEl.innerText = 'Mpanel Server Engine';
      }
    }

    if (s.panel_sounds_enabled !== undefined) {
      localStorage.setItem('panelSounds', s.panel_sounds_enabled === '1' ? 'true' : 'false');
    }

    // Apply Transparency slider (0 to 100%)
    if (s.transparency_bar !== undefined) {
      const transparency = parseInt(s.transparency_bar, 10);
      const opacityVal = (100 - transparency) / 100;
      document.documentElement.style.setProperty('--card-opacity', `${Math.max(0.02, Math.min(1.0, opacityVal))}`);
    }

    // Apply Blur slider (0 to 40px)
    if (s.blur_bar !== undefined) {
      const blur = parseInt(s.blur_bar, 10);
      document.documentElement.style.setProperty('--card-blur', `${Math.max(0, Math.min(40, blur))}px`);
    }

    // Auto Tutorials Page Toggle
    if (s.tutorials_enabled !== undefined) {
      const isTut = s.tutorials_enabled === '1' || s.tutorials_enabled === 1 || s.tutorials_enabled === true;
      localStorage.setItem('mpanel_tutorials_enabled', isTut ? '1' : '0');
      this.tutorialsEnabled = isTut;
      const tutNav = document.getElementById('nav-user-tutorials');
      if (tutNav) {
        if (isTut) {
          tutNav.classList.remove('hidden');
        } else {
          tutNav.classList.add('hidden');
        }
      }
    }

    if (s.tutorials_autostart_enabled !== undefined) {
      localStorage.setItem('mpanel_tutorials_autostart_enabled', s.tutorials_autostart_enabled === '1' ? '1' : '0');
    }
  }

  playSound(type) {
    const soundsEnabled = this.settings?.panel_sounds_enabled !== '0' && localStorage.getItem('panelSounds') !== 'false';
    if (!soundsEnabled) return;

    let soundFile = '';
    let volume = 0.5;
    if (type === 'online') {
      soundFile = '/arix/online.mp3';
      volume = 0.8;
    } else if (type === 'offline') {
      soundFile = '/arix/offline.mp3';
      volume = 0.4;
    } else if (type === 'copy') {
      soundFile = '/arix/copy.mp3';
      volume = 0.6;
    }

    if (soundFile) {
      try {
        const audio = new Audio(soundFile);
        audio.volume = volume;
        audio.play().catch(() => {});
      } catch (e) {}
    }
  }

  async checkAuth() {
    if (!this.token) {
      this.updateAuthUI(null);
      return;
    }

    try {
      const data = await this.api('/api/auth/me');
      if (data.success && data.user) {
        this.user = data.user;
        this.updateAuthUI(data.user);
      } else {
        this.logout();
      }
    } catch (err) {
      this.logout();
    }
  }

  updateAuthUI(user) {
    const authSection = document.getElementById('header-auth-section');
    const userMenu = document.getElementById('header-user-menu');
    const sidebarAdmin = document.getElementById('sidebar-admin-section');
    const portalAdminSwitchCard = document.getElementById('portal-admin-switch-card');
    const headerAdminToggleBtn = document.getElementById('header-admin-toggle-btn');
    const dropdownAdminDivider = document.getElementById('dropdown-admin-divider');
    const dropdownAdminLink = document.getElementById('dropdown-admin-link');

    if (user) {
      if (authSection) authSection.classList.add('hidden');
      if (userMenu) userMenu.classList.remove('hidden');

      const nameEl = document.getElementById('user-display-name');
      if (nameEl) nameEl.innerText = user.username;

      const roleEl = document.getElementById('user-display-role');
      if (roleEl) roleEl.innerText = user.role === 'admin' ? 'Administrator' : 'Standard User';

      const avatarEl = document.getElementById('user-avatar-initials');
      if (avatarEl) avatarEl.innerText = (user.username || 'U').substring(0, 1).toUpperCase();

      const emailEl = document.getElementById('user-dropdown-email');
      if (emailEl) emailEl.innerText = user.email;

      if (user.role === 'admin') {
        if (portalAdminSwitchCard) portalAdminSwitchCard.classList.remove('hidden');
        if (headerAdminToggleBtn) headerAdminToggleBtn.classList.remove('hidden');
        if (dropdownAdminDivider) dropdownAdminDivider.classList.remove('hidden');
        if (dropdownAdminLink) dropdownAdminLink.classList.remove('hidden');
        this.checkAdminUpdateBadge();
      } else {
        if (portalAdminSwitchCard) portalAdminSwitchCard.classList.add('hidden');
        if (headerAdminToggleBtn) headerAdminToggleBtn.classList.add('hidden');
        if (sidebarAdmin) sidebarAdmin.classList.add('hidden');
        if (dropdownAdminDivider) dropdownAdminDivider.classList.add('hidden');
        if (dropdownAdminLink) dropdownAdminLink.classList.add('hidden');
      }
    } else {
      if (authSection) authSection.classList.remove('hidden');
      if (userMenu) userMenu.classList.add('hidden');
      if (sidebarAdmin) sidebarAdmin.classList.add('hidden');
      if (portalAdminSwitchCard) portalAdminSwitchCard.classList.add('hidden');
      if (headerAdminToggleBtn) headerAdminToggleBtn.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();
  }

  async checkAdminUpdateBadge() {
    if (!this.currentUser || this.currentUser.role !== 'admin') return;
    try {
      const data = await this.api('/api/admin/updates/status');
      if (data && data.has_update) {
        const badge = document.getElementById('nav-update-badge');
        if (badge) {
          badge.classList.remove('hidden');
          badge.innerText = 'UPDATE';
        }
      }
    } catch (e) {
      // Background check failure is non-blocking
    }
  }

  toggleAdminPortalMode() {
    const hash = (window.location.hash || '').replace(/^#/, '');
    if (hash.startsWith('admin-')) {
      this.navigate('user-overview');
    } else {
      this.navigate('admin-overview');
    }
  }

  toggleUserDropdown() {
    const dd = document.getElementById('user-dropdown-dropdown');
    if (dd) dd.classList.toggle('hidden');
  }

  bindHashChange() {
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  navigate(viewName, params = {}) {
    this.closeMobileSidebar();
    if (params.serverId) {
      this.currentServerId = params.serverId;
    }
    const cleanHash = (viewName || '').replace(/^#/, '');
    const currentHash = window.location.hash.replace(/^#/, '');
    if (currentHash === cleanHash) {
      this.handleRoute();
    } else {
      window.location.hash = cleanHash;
    }
  }

  // Device Layout & Auto-Sizing Engine (Phone, Tablet, PC)
  getDetectedProfile() {
    const w = window.innerWidth;
    if (w < 640) return 'phone';
    if (w < 1024) return 'tablet';
    return 'pc';
  }

  initDeviceMode() {
    this.applyDeviceMode(this.deviceMode);

    // Auto adapt layout dynamically when resized
    window.addEventListener('resize', () => {
      if (this.deviceMode === 'auto') {
        this.applyDeviceMode('auto', false);
      } else {
        this.updateDetectedScreenInfo();
      }
    });

    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        if (this.deviceMode === 'auto') {
          this.applyDeviceMode('auto', false);
        } else {
          this.updateDetectedScreenInfo();
        }
      }, 100);
    });

    // Close header dropdowns on outside click
    document.addEventListener('click', (e) => {
      const deviceContainer = document.getElementById('header-device-mode-container');
      const deviceDropdown = document.getElementById('header-device-dropdown');
      if (deviceDropdown && !deviceDropdown.classList.contains('hidden')) {
        if (deviceContainer && !deviceContainer.contains(e.target)) {
          deviceDropdown.classList.add('hidden');
        }
      }

      const userMenu = document.getElementById('header-user-menu');
      const userDropdown = document.getElementById('user-dropdown-dropdown');
      if (userDropdown && !userDropdown.classList.contains('hidden')) {
        if (userMenu && !userMenu.contains(e.target)) {
          userDropdown.classList.add('hidden');
        }
      }
    });
  }

  toggleDeviceModeDropdown(e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById('header-device-dropdown');
    if (dd) {
      dd.classList.toggle('hidden');
      this.updateDetectedScreenInfo();
    }
  }

  setDeviceMode(mode) {
    const validModes = ['auto', 'phone', 'tablet', 'pc'];
    if (!validModes.includes(mode)) mode = 'auto';

    this.deviceMode = mode;
    localStorage.setItem('mpanel_device_mode', mode);
    this.applyDeviceMode(mode, true);

    const dd = document.getElementById('header-device-dropdown');
    if (dd) dd.classList.add('hidden');

    const labels = {
      auto: 'Auto Adaptive (Screen Scaled)',
      phone: 'Phone Mode (<640px)',
      tablet: 'Tablet Mode (640-1024px)',
      pc: 'PC / Laptop Mode (>1024px)'
    };
    this.toast(`Screen Layout: ${labels[mode] || mode}`, 'info');
  }

  applyDeviceMode(mode = this.deviceMode, notify = false) {
    const detected = this.getDetectedProfile();
    const activeProfile = mode === 'auto' ? detected : mode;

    const html = document.documentElement;
    html.classList.remove('panel-mode-phone', 'panel-mode-tablet', 'panel-mode-pc');
    html.classList.remove('panel-pref-auto', 'panel-pref-phone', 'panel-pref-tablet', 'panel-pref-pc');

    html.classList.add(`panel-mode-${activeProfile}`);
    html.classList.add(`panel-pref-${mode}`);

    // Update Topbar button icon
    const iconEl = document.getElementById('header-device-icon');
    if (iconEl) {
      const iconMap = {
        auto: 'sparkles',
        phone: 'smartphone',
        tablet: 'tablet',
        pc: 'monitor'
      };
      iconEl.setAttribute('data-lucide', iconMap[mode] || 'monitor');
    }

    // Update dropdown header badge
    const badge = document.getElementById('device-current-badge');
    if (badge) {
      badge.textContent = mode.toUpperCase();
    }

    // Update dropdown checkmarks
    document.querySelectorAll('.device-opt-btn').forEach(btn => {
      const bMode = btn.getAttribute('data-mode');
      const check = btn.querySelector('.check-icon');
      if (check) {
        if (bMode === mode) {
          check.classList.remove('hidden');
        } else {
          check.classList.add('hidden');
        }
      }
    });

    this.updateDetectedScreenInfo();

    if (window.lucide) lucide.createIcons();

    // If Settings page is loaded, update settings UI
    if (window.settingsManager && typeof settingsManager.updateDeviceModeUI === 'function') {
      settingsManager.updateDeviceModeUI();
    }

    // Trigger auto-fit on terminal if console is open
    if (window.serverConsole && serverConsole.fitAddon) {
      setTimeout(() => {
        try {
          serverConsole.fitAddon.fit();
        } catch (e) {}
      }, 50);
    }
  }

  updateDetectedScreenInfo() {
    const dimEl = document.getElementById('device-screen-dimensions');
    const detected = this.getDetectedProfile();
    const profileLabel = detected === 'phone' ? 'Phone' : (detected === 'tablet' ? 'Tablet' : 'PC');
    const txt = `${window.innerWidth} × ${window.innerHeight} (${profileLabel})`;
    if (dimEl) dimEl.textContent = txt;
  }

  toggleMobileSidebar() {
    const sidebar = document.getElementById('main-sidebar');
    const backdrop = document.getElementById('sidebar-mobile-backdrop');
    if (!sidebar) return;

    const isHidden = sidebar.classList.contains('hidden');
    if (isHidden) {
      sidebar.classList.remove('hidden');
      sidebar.classList.add('fixed', 'inset-y-0', 'left-0', 'z-50', 'shadow-2xl', 'bg-[#121317]');
      if (backdrop) backdrop.classList.remove('hidden');
    } else {
      this.closeMobileSidebar();
    }
  }

  closeMobileSidebar() {
    const sidebar = document.getElementById('main-sidebar');
    const backdrop = document.getElementById('sidebar-mobile-backdrop');
    const isPhoneMode = document.documentElement.classList.contains('panel-mode-phone');
    if (sidebar && (window.innerWidth < 768 || isPhoneMode)) {
      sidebar.classList.add('hidden');
      sidebar.classList.remove('fixed', 'inset-y-0', 'left-0', 'z-50', 'shadow-2xl', 'bg-[#121317]');
    }
    if (backdrop) backdrop.classList.add('hidden');
  }

  toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    const btn = document.getElementById('header-theme-toggle-btn');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      if (btn) btn.innerHTML = '<i data-lucide="sun" class="w-4 h-4 text-amber-400"></i>';
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      if (btn) btn.innerHTML = '<i data-lucide="moon" class="w-4 h-4"></i>';
    }
    if (window.lucide) lucide.createIcons();
  }

  async showServerSwitcherModal() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    let servers = [];
    try {
      const data = await this.api('/api/servers');
      servers = data.servers || [];
    } catch (e) {
      console.warn(e);
    }

    modalContainer.innerHTML = `
      <div id="server-switcher-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4" onclick="app.closeServerSwitcherModal(event)">
        <div class="bg-[#17171b] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onclick="event.stopPropagation()">
          <div class="p-4 border-b border-white/10 flex items-center gap-3">
            <i data-lucide="search" class="w-5 h-5 text-slate-400"></i>
            <input type="text" id="switcher-search-input" placeholder="Search servers by name or port..." oninput="app.filterServerSwitcher(this.value)" class="bg-transparent border-none text-white text-sm w-full outline-none focus:ring-0" autofocus>
            <button onclick="app.closeServerSwitcherModal()" class="text-slate-400 hover:text-white p-1">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
          <div id="switcher-servers-list" class="max-h-80 overflow-y-auto p-2 space-y-1">
            ${servers.length === 0 ? '<p class="text-xs text-slate-400 text-center py-6">No servers deployed yet</p>' : servers.map(s => `
              <div onclick="app.selectServerFromSwitcher(${s.id})" class="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer transition switcher-item" data-name="${s.name.toLowerCase()}">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-[#212121] flex items-center justify-center text-slate-300">
                    <i data-lucide="server" class="w-4 h-4"></i>
                  </div>
                  <div>
                    <h4 class="text-xs font-bold text-white">${s.name}</h4>
                    <p class="text-[10px] text-slate-400 font-mono">${s.ip || '127.0.0.1'}:${s.port || 25565}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] px-2.5 py-0.5 rounded-full font-bold ${s.status === 'running' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}">${s.status.toUpperCase()}</span>
                  <i data-lucide="chevron-right" class="w-4 h-4 text-slate-500"></i>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    setTimeout(() => {
      const inp = document.getElementById('switcher-search-input');
      if (inp) inp.focus();
    }, 50);
  }

  closeServerSwitcherModal(e) {
    const el = document.getElementById('server-switcher-modal');
    if (el) el.remove();
  }

  filterServerSwitcher(query) {
    const q = query.toLowerCase().trim();
    document.querySelectorAll('.switcher-item').forEach(item => {
      const name = item.getAttribute('data-name') || '';
      item.style.display = name.includes(q) ? 'flex' : 'none';
    });
  }

  selectServerFromSwitcher(serverId) {
    this.closeServerSwitcherModal();
    this.navigate(`server-manage/${serverId}/console`, { serverId });
  }

  renderNookServerSidebar(serverId, activeSubTab = 'console') {
    const container = document.getElementById('server-nav-links');
    if (!container) return;

    const routes = [
      { tab: 'console', name: 'Console', icon: 'terminal' },
      { tab: 'files', name: 'Files', icon: 'folder' },
      { tab: 'properties', name: 'Properties', icon: 'sliders' },
      { tab: 'players', name: 'Players', icon: 'gamepad-2' },
      { tab: 'importer', name: 'Importer', icon: 'download-cloud' },
      { tab: 'splitter', name: 'Splitter', icon: 'git-fork' },
      { tab: 'marketplace', name: 'Addons', icon: 'shopping-bag' },
      { tab: 'databases', name: 'Databases', icon: 'database' },
      { tab: 'schedules', name: 'Schedules', icon: 'clock' },
      { tab: 'subusers', name: 'Users', icon: 'users' },
      { tab: 'backups', name: 'Backups', icon: 'archive' },
      { tab: 'network', name: 'Network', icon: 'network' },
      { tab: 'startup', name: 'Startup', icon: 'play-circle' },
      { tab: 'settings', name: 'Settings', icon: 'settings' },
      { tab: 'activity', name: 'Activity', icon: 'activity' }
    ];

    container.innerHTML = routes.map(r => `
      <a href="#server-manage/${serverId}/${r.tab}" onclick="serverConsole.switchSubTab('${r.tab}')" id="server-nav-${r.tab}" class="nook-nav-item ${activeSubTab === r.tab ? 'active' : ''}">
        <div class="nook-icon-box">
          <i data-lucide="${r.icon}" class="w-5 h-5"></i>
        </div>
        <span>${r.name}</span>
      </a>
    `).join('') + `
      <div class="pt-2 mt-2 border-t border-white/5">
        <a href="#servers" onclick="app.navigate('user-servers')" class="nook-nav-item text-slate-400 hover:text-white">
          <div class="nook-icon-box bg-transparent text-slate-400">
            <i data-lucide="arrow-left" class="w-5 h-5"></i>
          </div>
          <span>Back to Servers</span>
        </a>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  async handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'overview';
    const dd = document.getElementById('user-dropdown-dropdown');
    if (dd) dd.classList.add('hidden');

    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.scrollTop = 0;

    if (!this.user && hash !== 'login' && hash !== 'register') {
      if (window.auth && typeof window.auth.showLoginModal === 'function') {
        window.auth.showLoginModal();
      }
      return;
    }

    const isServerContext = hash.startsWith('server-manage');
    const isAdminContext = hash.startsWith('admin-');
    const serverSection = document.getElementById('sidebar-server-section');
    const portalSection = document.getElementById('sidebar-portal-section');
    const adminSection = document.getElementById('sidebar-admin-section');
    const headerAdminToggleBtn = document.getElementById('header-admin-toggle-btn');

    // Update Topbar Admin / Client Area Quick Switcher Toggle Button
    if (headerAdminToggleBtn && this.user && this.user.role === 'admin') {
      headerAdminToggleBtn.classList.remove('hidden');
      if (isAdminContext) {
        headerAdminToggleBtn.className = 'px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-sm bg-white/10 hover:bg-white/20 text-slate-200 border-white/10';
        headerAdminToggleBtn.title = 'Switch to Client Area';
        headerAdminToggleBtn.innerHTML = `<i data-lucide="arrow-left" class="w-3.5 h-3.5 text-cyan-400"></i><span class="hidden sm:inline">Client Area</span>`;
      } else {
        headerAdminToggleBtn.className = 'px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/40';
        headerAdminToggleBtn.title = 'Switch to Admin Area';
        headerAdminToggleBtn.innerHTML = `<i data-lucide="shield" class="w-3.5 h-3.5"></i><span class="hidden sm:inline">Admin Area</span>`;
      }
    }

    this.closeMobileSidebar();
    if (hash !== 'admin-overview' && window.admin && typeof window.admin.stopOverviewPolling === 'function') {
      window.admin.stopOverviewPolling();
    }

    if (isServerContext) {
      if (portalSection) portalSection.classList.add('hidden');
      if (adminSection) adminSection.classList.add('hidden');
      if (serverSection) serverSection.classList.remove('hidden');

      const parts = hash.split('/');
      const sId = parts[1] || this.currentServerId;
      const subTab = parts[2] || 'console';
      this.currentServerId = sId;

      this.renderNookServerSidebar(sId, subTab);
      await serverConsole.renderServerManagementSuite(sId, subTab);
    } else if (isAdminContext) {
      // Security guard: redirect if not admin
      if (this.user && this.user.role !== 'admin') {
        this.toast('Access denied. Administrator privileges required.', 'error');
        this.navigate('user-overview');
        return;
      }

      if (serverSection) serverSection.classList.add('hidden');
      if (portalSection) portalSection.classList.add('hidden');
      if (adminSection) adminSection.classList.remove('hidden');

      // Update active nav links in admin sidebar
      document.querySelectorAll('.nook-nav-item').forEach(el => el.classList.remove('active'));
      const activeNav = document.getElementById(`nav-${hash}`);
      if (activeNav) activeNav.classList.add('active');

      // Admin route handling
      if (hash === 'admin-overview') {
        await admin.renderAdminOverview();
      } else if (hash === 'admin-updates') {
        admin.renderUpdatesView();
      } else if (hash === 'admin-settings') {
        await settingsManager.renderSettingsView();
      } else if (hash === 'admin-servers') {
        await admin.renderServersView();
      } else if (hash === 'admin-users') {
        await admin.renderUsersView();
      } else if (hash === 'admin-databases') {
        await admin.renderDatabasesView();
      } else if (hash === 'admin-backups') {
        await admin.renderBackupsView();
      } else if (hash === 'admin-autobackups') {
        await admin.renderAutoBackupsView();
      } else if (hash === 'admin-network') {
        await admin.renderNetworkView();
      } else if (hash === 'admin-nodes') {
        await admin.renderNodesView();
      } else if (hash === 'admin-locations') {
        await admin.renderLocationsView();
      } else if (hash === 'admin-api') {
        await admin.renderApiKeysView();
      } else if (hash === 'admin-sociallogin') {
        await admin.renderSocialLoginView();
      }
    } else {
      if (serverSection) serverSection.classList.add('hidden');
      if (adminSection) adminSection.classList.add('hidden');
      if (portalSection) portalSection.classList.remove('hidden');

      // Update active nav links in portal sidebar
      document.querySelectorAll('.nook-nav-item').forEach(el => el.classList.remove('active'));
      const activeNav = document.getElementById(`nav-${hash}`) || 
                        document.getElementById(`nav-user-${hash}`) || 
                        ((hash === 'tutorials' || hash === 'knowledge') ? (document.getElementById('nav-user-tutorials') || document.getElementById('nav-user-knowledge')) : null);
      if (activeNav) activeNav.classList.add('active');

      // Route handling
      if (hash === 'overview' || hash === 'user-overview') {
        await this.renderUserOverview();
      } else if (hash === 'servers' || hash === 'user-servers') {
        await this.renderUserServers();
      } else if (hash === 'marketplace') {
        if (window.marketplace) {
          await marketplace.renderGlobalMarketplaceView();
        }
      } else if (hash === 'tutorials' || hash === 'user-tutorials' || hash === 'knowledge' || hash === 'user-knowledge') {
        const isTut = this.settings?.tutorials_enabled !== '0' && localStorage.getItem('mpanel_tutorials_enabled') !== '0';
        if (!isTut && (!this.user || this.user.role !== 'admin')) {
          this.toast('Tutorials page is currently disabled by administrator.', 'warning');
          this.navigate('user-overview');
          return;
        }
        if (window.knowledgeManager) {
          knowledgeManager.renderKnowledgeView();
        }
      } else if (hash === 'profile' || hash === 'user-profile') {
        await this.renderUserProfile();
      } else if (hash === 'activity' || hash === 'user-activity') {
        await this.renderUserActivity();
      } else {
        await this.renderUserOverview();
      }
    }

    if (window.lucide) lucide.createIcons();
  }

  // Render Normal User Overview
  async renderUserOverview() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Welcome Hero Banner -->
        <div class="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div class="space-y-1">
            <span class="text-xs font-bold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">User Dashboard</span>
            <h2 class="text-2xl font-black text-white">Welcome back, ${this.user?.username || 'User'}!</h2>
            <p class="text-xs text-slate-300 max-w-xl">Manage your Minecraft servers, Python bots, and Node.js applications with ultra-low latency container orchestration.</p>
          </div>
          ${this.user?.role === 'admin' ? `
            <button onclick="admin.showCreateServerModal()" class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg">
              <i data-lucide="plus-circle" class="w-4 h-4"></i> Deploy New Server
            </button>
          ` : `
            <button onclick="app.navigate('user-servers')" class="btn-cyber px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg">
              <i data-lucide="server" class="w-4 h-4"></i> My Servers
            </button>
          `}
        </div>

        <!-- Metric Statistics Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="glass-card p-5 rounded-2xl border border-white/10 flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <i data-lucide="server" class="w-6 h-6"></i>
            </div>
            <div>
              <p class="text-[11px] text-slate-400 uppercase font-semibold">My Servers</p>
              <h3 id="stat-user-servers" class="text-2xl font-bold text-white">...</h3>
            </div>
          </div>
          <div class="glass-card p-5 rounded-2xl border border-white/10 flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <i data-lucide="activity" class="w-6 h-6"></i>
            </div>
            <div>
              <p class="text-[11px] text-slate-400 uppercase font-semibold">Running Servers</p>
              <h3 id="stat-user-running" class="text-2xl font-bold text-emerald-400">...</h3>
            </div>
          </div>
          <div class="glass-card p-5 rounded-2xl border border-white/10 flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <i data-lucide="cpu" class="w-6 h-6"></i>
            </div>
            <div>
              <p class="text-[11px] text-slate-400 uppercase font-semibold">Memory Allocated</p>
              <h3 id="stat-user-memory" class="text-2xl font-bold text-purple-400">...</h3>
            </div>
          </div>
          <div class="glass-card p-5 rounded-2xl border border-white/10 flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <i data-lucide="hard-drive" class="w-6 h-6"></i>
            </div>
            <div>
              <p class="text-[11px] text-slate-400 uppercase font-semibold">Disk Allocated</p>
              <h3 id="stat-user-disk" class="text-2xl font-bold text-amber-400">...</h3>
            </div>
          </div>
        </div>

        <!-- Active Servers Overview Grid -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-slate-200 flex items-center gap-2">
              <i data-lucide="layers" class="w-4 h-4 text-cyan-400"></i> Active Server Instances
            </h3>
            <button onclick="app.navigate('user-servers')" class="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1">
              View All <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
          <div id="overview-servers-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div class="text-center py-10 text-slate-400 col-span-full">Loading servers...</div>
          </div>
        </div>
      </div>
    `;

    try {
      const data = await this.api('/api/servers');
      let servers = data.servers || [];

      const sServers = document.getElementById('stat-user-servers');
      if (sServers) sServers.innerText = servers.length;

      const sRunning = document.getElementById('stat-user-running');
      if (sRunning) sRunning.innerText = servers.filter(s => s.status === 'running').length;
      
      const totalMem = servers.reduce((acc, s) => acc + (s.memory_mb || 0), 0);
      const sMem = document.getElementById('stat-user-memory');
      if (sMem) sMem.innerText = totalMem > 1024 ? `${(totalMem/1024).toFixed(1)} GB` : `${totalMem} MB`;

      const totalDisk = servers.reduce((acc, s) => acc + (s.disk_mb || 0), 0);
      const sDisk = document.getElementById('stat-user-disk');
      if (sDisk) sDisk.innerText = totalDisk > 1024 ? `${(totalDisk/1024).toFixed(1)} GB` : `${totalDisk} MB`;

      const grid = document.getElementById('overview-servers-grid');
      if (window.customServerSort) {
        servers = customServerSort.sortServers(servers, 'user');
      }
      if (servers.length === 0) {
        grid.innerHTML = `
          <div class="glass-card p-10 rounded-2xl text-center col-span-full border border-dashed border-white/20">
            <i data-lucide="server-off" class="w-12 h-12 text-slate-500 mx-auto mb-3"></i>
            <h4 class="text-sm font-bold text-slate-200">No servers deployed yet</h4>
            ${this.user?.role === 'admin' ? `
              <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Create your first Minecraft, Python, or Node.js server to get started.</p>
              <button onclick="admin.showCreateServerModal()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold mt-4">
                + Create Server
              </button>
            ` : `
              <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">No servers assigned yet. Contact your panel administrator to allocate a server instance to your account.</p>
            `}
          </div>
        `;
      } else {
        grid.innerHTML = servers.slice(0, 6).map(s => this.renderServerCardHTML(s)).join('');
      }
    } catch (e) {
      console.error('Error rendering user overview:', e);
      const grid = document.getElementById('overview-servers-grid');
      if (grid) {
        grid.innerHTML = `
          <div class="glass-card p-8 rounded-2xl text-center col-span-full border border-rose-500/20 text-rose-300">
            <p class="text-xs">Failed to load server instances. Please refresh or try again.</p>
            <button onclick="app.renderUserOverview()" class="mt-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs inline-flex items-center gap-1.5">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Retry
            </button>
          </div>
        `;
      }
    }
    if (window.lucide) lucide.createIcons();
  }

  // Render User Servers View (Grid of cards)
  async renderUserServers() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <i data-lucide="server" class="w-5 h-5 text-cyan-400"></i> My Server Instances
            </h2>
            <p class="text-xs text-slate-400">View and control all your deployed server applications</p>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap">
            <div id="user-servers-sort-toolbar-slot"></div>
            <button onclick="app.renderUserServers()" class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>
            ${this.user?.role === 'admin' ? `
              <button onclick="admin.showCreateServerModal()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2">
                <i data-lucide="plus-circle" class="w-4 h-4"></i> Create Server
              </button>
            ` : ''}
          </div>
        </div>

        <div id="user-servers-list-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div class="text-center py-10 text-slate-400 col-span-full">Loading servers...</div>
        </div>
      </div>
    `;

    try {
      const data = await this.api('/api/servers');
      let servers = data.servers || [];
      const grid = document.getElementById('user-servers-list-grid');

      // Custom Server Sort Extension (customserversort.blueprint)
      if (window.customServerSort) {
        const slot = document.getElementById('user-servers-sort-toolbar-slot');
        if (slot) slot.innerHTML = customServerSort.renderToolbarHTML('user', 'app.handleServerSortChange');
        servers = customServerSort.sortServers(servers, 'user');
      }

      if (servers.length === 0) {
        grid.innerHTML = `
          <div class="glass-card p-12 rounded-2xl text-center col-span-full border border-dashed border-white/20">
            <i data-lucide="box" class="w-12 h-12 text-slate-500 mx-auto mb-3"></i>
            <h4 class="text-base font-bold text-slate-200">No servers deployed yet</h4>
            ${this.user?.role === 'admin' ? `
              <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">You have not created or been assigned any game or application servers.</p>
              <button onclick="admin.showCreateServerModal()" class="btn-cyber px-4 py-2 rounded-xl text-xs font-semibold mt-4">
                Deploy Your First Server
              </button>
            ` : `
              <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">You do not have any active servers assigned. Please contact your panel administrator to allocate a server to your account.</p>
            `}
          </div>
        `;
      } else {
        grid.innerHTML = servers.map(s => this.renderServerCardHTML(s)).join('');
        if (window.customServerSort) {
          customServerSort.attachSortable(grid, 'user');
        }
      }
    } catch (e) {
      console.error('Error rendering user servers:', e);
      const grid = document.getElementById('user-servers-list-grid');
      if (grid) {
        grid.innerHTML = `
          <div class="glass-card p-8 rounded-2xl text-center col-span-full border border-rose-500/20 text-rose-300">
            <p class="text-xs">Failed to load server instances. Please refresh or try again.</p>
            <button onclick="app.renderUserServers()" class="mt-3 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs inline-flex items-center gap-1.5">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> Retry
            </button>
          </div>
        `;
      }
    }
    if (window.lucide) lucide.createIcons();
  }

  handleServerSortChange(newMode) {
    if (window.customServerSort) {
      customServerSort.setSortMode('user', newMode);
      this.renderUserServers();
    }
  }

  renderUserServersView() {
    return this.renderUserServers();
  }

  getServerStatusConfig(rawStatus, isSuspended = false) {
    if (isSuspended) {
      return {
        key: 'suspended',
        label: '🔒 Suspended',
        badge: `<span class="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30"><i data-lucide="lock" class="w-3 h-3"></i> SUSPENDED</span>`,
        colorClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        dotClass: 'bg-rose-400'
      };
    }
    const s = String(rawStatus || 'offline').toLowerCase().trim();
    if (s === 'running' || s === 'online' || s === 'started') {
      return {
        key: 'running',
        label: '🟢 Online / Started',
        badge: `<span class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> 🟢 ONLINE</span>`,
        colorClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        dotClass: 'bg-emerald-400 animate-pulse'
      };
    }
    if (s === 'starting') {
      return {
        key: 'starting',
        label: '🔵 Starting',
        badge: `<span class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30"><span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span> 🔵 STARTING</span>`,
        colorClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        dotClass: 'bg-blue-400 animate-ping'
      };
    }
    if (s === 'restarting') {
      return {
        key: 'restarting',
        label: '🟡 Restarting',
        badge: `<span class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span> 🟡 RESTARTING</span>`,
        colorClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        dotClass: 'bg-amber-400 animate-pulse'
      };
    }
    if (s === 'stopping') {
      return {
        key: 'stopping',
        label: '⚫ Stopping',
        badge: `<span class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30"><span class="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></span> ⚫ STOPPING</span>`,
        colorClass: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        dotClass: 'bg-slate-400 animate-pulse'
      };
    }
    return {
      key: 'offline',
      label: '🔴 Offline / Stopped',
      badge: `<span class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> 🔴 OFFLINE</span>`,
      colorClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      dotClass: 'bg-rose-400'
    };
  }

  // HTML Template for Server Card
  renderServerCardHTML(s) {
    if (this.activeTheme === 'pterox' || this.activeTheme === 'dezerx' || this.activeTheme === 'lucent') {
      return this.renderPteroxServerCardHTML(s);
    }
    const isSuspended = !!s.is_suspended || s.status === 'suspended';
    const statusCfg = this.getServerStatusConfig(s.status, isSuspended);

    const typeIcons = {
      minecraft: '<img src="/images/icons/minecraft-icon.webp" class="w-3.5 h-3.5 inline-block mr-1 align-text-bottom rounded object-contain" onerror="this.remove()">Minecraft',
      nodejs: '<img src="/images/icons/nodejs.png" class="w-3.5 h-3.5 inline-block mr-1 align-text-bottom rounded object-contain" onerror="this.remove()">Node.js',
      python: '🐍 Python',
      lumenvm: '🖥️ VM - KVM',
      nokvm: '🛡️ VM - No-KVM',
      lumenvm_nokvm: '🛡️ VM - No-KVM',
      vm: '🖥️ VM - KVM',
      cs2: '<img src="/images/icons/cs2-icon.webp" class="w-3.5 h-3.5 inline-block mr-1 align-text-bottom rounded object-contain" onerror="this.remove()">CS2',
      rust: '<img src="/images/icons/rust-icon.webp" class="w-3.5 h-3.5 inline-block mr-1 align-text-bottom rounded object-contain" onerror="this.remove()">Rust',
      ark: '<img src="/images/icons/ark-icon.webp" class="w-3.5 h-3.5 inline-block mr-1 align-text-bottom rounded object-contain" onerror="this.remove()">ARK',
      gmod: '<img src="/images/icons/gmod-icon.webp" class="w-3.5 h-3.5 inline-block mr-1 align-text-bottom rounded object-contain" onerror="this.remove()">GMod',
      valheim: '<img src="/images/icons/valheim-icon.webp" class="w-3.5 h-3.5 inline-block mr-1 align-text-bottom rounded object-contain" onerror="this.remove()">Valheim'
    };

    let expBadge = '';
    if (s.expiration_date) {
      const expDate = new Date(s.expiration_date);
      const diffDays = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 3600 * 24));
      if (diffDays <= 0) {
        expBadge = `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">Expired</span>`;
      } else if (diffDays <= 3) {
        expBadge = `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Expires in ${diffDays}d</span>`;
      } else {
        expBadge = `<span class="px-2 py-0.5 rounded-full text-[9px] font-mono text-slate-400 bg-white/5 border border-white/10">${diffDays}d left</span>`;
      }
    }

    const statusBadge = statusCfg.badge;
    const ipPort = `${s.ip || '127.0.0.1'}:${s.port || 25565}`;

    return `
      <div data-server-id="${s.id}" class="glass-card rounded-2xl p-5 flex flex-col justify-between border ${isSuspended ? 'border-rose-500/30' : 'border-white/10 hover:border-cyan-500/40'} transition relative">
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2.5 min-w-0">
              ${window.customServerSort ? customServerSort.renderDragHandleHTML() : ''}
              <div class="min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">${typeIcons[s.server_type] || s.server_type}</span>
                  ${expBadge}
                </div>
                <h4 class="text-base font-bold text-white hover:text-cyan-400 cursor-pointer truncate max-w-[200px]" onclick="app.navigate('server-manage/${s.id}/console')">${s.name}</h4>
              </div>
            </div>
            ${statusBadge}
          </div>

          <div class="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono text-slate-300">
            <span class="truncate">${ipPort}</span>
            <button onclick="app.copyToClipboard('${ipPort}')" title="Copy Address" class="text-slate-400 hover:text-cyan-400 ml-2">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <div class="grid grid-cols-3 gap-2 text-center text-xs text-slate-300 py-1">
            <div class="bg-slate-800/40 p-2 rounded-lg">
              <p class="text-[10px] text-slate-400">RAM</p>
              <p class="font-bold text-white">${s.memory_mb || 1024} MB</p>
            </div>
            <div class="bg-slate-800/40 p-2 rounded-lg">
              <p class="text-[10px] text-slate-400">CPU</p>
              <p class="font-bold text-white">${s.cpu_limit || 100}%</p>
            </div>
            <div class="bg-slate-800/40 p-2 rounded-lg">
              <p class="text-[10px] text-slate-400">SSD</p>
              <p class="font-bold text-white">${s.disk_mb || 5120} MB</p>
            </div>
          </div>
        </div>

        <div class="pt-4 mt-3 border-t border-white/10 flex items-center justify-between gap-2">
          <button onclick="app.navigate('server-manage/${s.id}/console')" class="btn-cyber px-4 py-1.5 rounded-lg text-xs font-semibold flex-1 flex items-center justify-center gap-1.5">
            <i data-lucide="terminal" class="w-3.5 h-3.5"></i> Console
          </button>
          ${isSuspended
            ? `<span class="px-3 py-1 text-[11px] font-bold text-rose-400 bg-rose-950/40 rounded-lg border border-rose-500/20">Locked</span>`
            : (statusCfg.key === 'running'
              ? `<button onclick="serverConsole.triggerPower(${s.id}, 'restart')" title="Restart" class="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 flex items-center justify-center"><i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i></button>
                 <button onclick="serverConsole.triggerPower(${s.id}, 'stop')" title="Stop" class="w-8 h-8 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 flex items-center justify-center"><i data-lucide="square" class="w-3.5 h-3.5"></i></button>`
              : (statusCfg.key === 'starting' || statusCfg.key === 'restarting'
                ? `<button onclick="serverConsole.triggerPower(${s.id}, 'stop')" title="Stop" class="w-8 h-8 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 flex items-center justify-center"><i data-lucide="square" class="w-3.5 h-3.5"></i></button>`
                : (statusCfg.key === 'stopping'
                  ? `<button onclick="serverConsole.triggerPower(${s.id}, 'kill')" title="Force Kill" class="w-8 h-8 rounded-lg bg-rose-900/40 hover:bg-rose-900 text-rose-300 border border-rose-500/30 flex items-center justify-center"><i data-lucide="zap-off" class="w-3.5 h-3.5"></i></button>`
                  : `<button onclick="serverConsole.triggerPower(${s.id}, 'start')" title="Start" class="w-8 h-8 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center"><i data-lucide="play" class="w-3.5 h-3.5"></i></button>`
                )
              )
            )
          }
        </div>
      </div>
    `;
  }

  // PteroX Server Card HTML Template with Banner & Resource Telemetry
  renderPteroxServerCardHTML(s) {
    const isSuspended = !!s.is_suspended || s.status === 'suspended';
    const statusCfg = this.getServerStatusConfig(s.status, isSuspended);

    const typeBannerMap = {
      minecraft: '/images/banners/minecraft-banners.webp',
      nodejs: '/images/banners/node.webp',
      node: '/images/banners/node.webp',
      cs2: '/images/banners/cs2-banner.webp',
      rust: '/images/banners/rust-banner.webp',
      ark: '/images/banners/ark-banners.webp',
      gmod: '/images/banners/gmod-banner.webp',
      valheim: '/images/banners/valheim-banner.webp',
    };
    const customBanner = localStorage.getItem('pterox_server_banner');
    const bannerImg = customBanner || (s.server_type && typeBannerMap[s.server_type.toLowerCase()]) || '/images/server-banner.jpg';
    const ipPort = `${s.ip || '127.0.0.1'}:${s.port || 25565}`;

    let statusText = statusCfg.label;
    let statusBadgeColor = statusCfg.colorClass;

    const isRunning = !isSuspended && statusCfg.key === 'running';

    return `
      <div data-server-id="${s.id}" class="pterox-server-card flex flex-col justify-between group relative">
        <!-- Top Banner Header -->
        <div class="pterox-server-card-banner" style="background-image: url('${bannerImg}');">
          <div class="pterox-server-card-banner-overlay"></div>
          <div class="pterox-server-card-top relative z-10 flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              ${window.customServerSort ? customServerSort.renderDragHandleHTML() : ''}
              <span class="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-black/60 text-cyan-400 border border-cyan-500/30 backdrop-blur-sm">
                ${(s.server_type || 'generic').toUpperCase()}
              </span>
            </div>
            <span class="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-sm ${statusBadgeColor}">
              <span class="w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}"></span>
              ${statusText}
            </span>
          </div>

          <div class="relative z-10">
            <h4 class="text-lg font-bold text-white group-hover:text-cyan-400 cursor-pointer truncate transition-colors drop-shadow-md" onclick="app.navigate('server-manage/${s.id}/console')">
              ${this.escapeHtml(s.name)}
            </h4>
            <p class="text-[11px] font-mono text-slate-300 truncate flex items-center gap-1.5 drop-shadow">
              <span>${ipPort}</span>
              <button onclick="event.stopPropagation(); app.copyToClipboard('${ipPort}')" class="text-slate-400 hover:text-white" title="Copy Host:Port">
                <i data-lucide="copy" class="w-3 h-3"></i>
              </button>
            </p>
          </div>
        </div>

        <!-- Metrics & Telemetry Body -->
        <div class="pterox-server-card-body p-4 space-y-3 flex-1 flex flex-col justify-between">
          <div class="grid grid-cols-3 gap-2 text-center text-xs">
            <div class="bg-black/30 p-2 rounded-xl border border-white/5">
              <span class="text-[9px] uppercase tracking-wider text-slate-400 block mb-0.5">RAM</span>
              <span class="font-bold font-mono text-white text-xs">${s.memory_mb || 1024} MB</span>
              <div class="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                <div class="bg-cyan-500 h-full rounded-full" style="width: ${isRunning ? '45%' : '0%'}"></div>
              </div>
            </div>
            <div class="bg-black/30 p-2 rounded-xl border border-white/5">
              <span class="text-[9px] uppercase tracking-wider text-slate-400 block mb-0.5">CPU</span>
              <span class="font-bold font-mono text-white text-xs">${s.cpu_limit || 100}%</span>
              <div class="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                <div class="bg-orange-500 h-full rounded-full" style="width: ${isRunning ? '30%' : '0%'}"></div>
              </div>
            </div>
            <div class="bg-black/30 p-2 rounded-xl border border-white/5">
              <span class="text-[9px] uppercase tracking-wider text-slate-400 block mb-0.5">SSD</span>
              <span class="font-bold font-mono text-white text-xs">${s.disk_mb || 5120} MB</span>
              <div class="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                <div class="bg-indigo-500 h-full rounded-full" style="width: 25%"></div>
              </div>
            </div>
          </div>

          <!-- Quick Action Footer -->
          <div class="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            <button onclick="app.navigate('server-manage/${s.id}/console')" class="pterox-btn-primary flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5">
              <i data-lucide="terminal" class="w-3.5 h-3.5"></i> Manage
            </button>
            ${isSuspended
              ? `<span class="px-2.5 py-1 text-[10px] font-bold text-rose-400 bg-rose-950/40 rounded-lg border border-rose-500/20">Suspended</span>`
              : (statusCfg.key === 'running'
                ? `<button onclick="serverConsole.triggerPower(${s.id}, 'restart')" title="Restart Server" class="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 flex items-center justify-center transition"><i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i></button>
                   <button onclick="serverConsole.triggerPower(${s.id}, 'stop')" title="Stop Server" class="w-8 h-8 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 flex items-center justify-center transition"><i data-lucide="square" class="w-3.5 h-3.5"></i></button>`
                : (statusCfg.key === 'starting' || statusCfg.key === 'restarting'
                  ? `<button onclick="serverConsole.triggerPower(${s.id}, 'stop')" title="Stop Server" class="w-8 h-8 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 flex items-center justify-center transition"><i data-lucide="square" class="w-3.5 h-3.5"></i></button>`
                  : (statusCfg.key === 'stopping'
                    ? `<button onclick="serverConsole.triggerPower(${s.id}, 'kill')" title="Force Kill" class="w-8 h-8 rounded-lg bg-rose-900/40 hover:bg-rose-900 text-rose-300 border border-rose-500/30 flex items-center justify-center transition"><i data-lucide="zap-off" class="w-3.5 h-3.5"></i></button>`
                    : `<button onclick="serverConsole.triggerPower(${s.id}, 'start')" title="Start Server" class="w-8 h-8 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center transition"><i data-lucide="play" class="w-3.5 h-3.5"></i></button>`
                  )
                )
              )
            }
          </div>
        </div>
      </div>
    `;
  }

  // Render User Profile & 2FA
  async renderUserProfile() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="flex items-center justify-center py-16 text-slate-500">
        <i data-lucide="loader-2" class="w-6 h-6 animate-spin mr-2 text-cyan-400"></i>
        <span>Loading profile and account data...</span>
      </div>
    `;
    if (window.lucide) lucide.createIcons();

    try {
      // Fetch latest user data and servers in parallel
      const [meRes, srvRes] = await Promise.all([
        this.api('/api/auth/me').catch(() => ({ success: false })),
        this.api('/api/servers').catch(() => ({ servers: [] }))
      ]);

      if (meRes && meRes.success && meRes.user) {
        this.user = meRes.user;
        this.updateAuthUI(this.user);
      }

      const u = this.user || {};
      const servers = srvRes.servers || [];
      const isAdm = u.role === 'admin';

      // Build Server Access HTML
      let serverAccessHTML = '';
      if (servers.length === 0) {
        serverAccessHTML = `<span class="text-slate-500 font-mono text-[11px]">0 Servers Assigned</span>`;
      } else {
        serverAccessHTML = `
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              ${servers.length} ${servers.length === 1 ? 'Server' : 'Servers'}
            </span>
            ${servers.map(s => `
              <button onclick="app.navigate('server-manage/${s.id}/console')" class="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition inline-flex items-center gap-1" title="Manage ${this.escapeHtml(s.name)}">
                <i data-lucide="hard-drive" class="w-2.5 h-2.5 text-cyan-400"></i> ${this.escapeHtml(s.name)}
              </button>
            `).join('')}
          </div>
        `;
      }

      container.innerHTML = `
        <div class="space-y-8 pb-12">
          <!-- Top Header Bar -->
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-5">
            <div>
              <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                <span class="bg-gradient-to-r from-cyan-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">PROFILE</span>
              </h1>
              <p class="text-xs text-slate-400 mt-1 font-medium">Manage your personal account, security credentials, and server access</p>
            </div>
            <div class="flex items-center gap-2.5 flex-wrap">
              <button onclick="app.renderUserProfile()" class="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-300 transition" title="Refresh Profile">
                <i data-lucide="refresh-cw" class="w-4 h-4"></i>
              </button>
              <button onclick="auth.logout()" class="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition shadow-sm">
                <i data-lucide="log-out" class="w-4 h-4 text-rose-400"></i> Sign Out
              </button>
            </div>
          </div>

          <!-- ──────────────────────────────────────── -->
          <!-- Account Section                          -->
          <!-- ──────────────────────────────────────── -->
          <div class="space-y-3">
            <div class="flex items-center justify-between px-1">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <i data-lucide="user-check" class="w-4 h-4"></i>
                </div>
                <h3 class="text-base font-bold text-white tracking-wide">Account</h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Active</span>
              </div>
              <div class="text-[11px] text-slate-400 font-mono">
                UID #${u.id || 1}
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
                  <tbody class="divide-y divide-white/5">
                    <tr class="hover:bg-white/5 transition-colors">
                      <!-- Username -->
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-2.5">
                          <div class="w-8 h-8 rounded-full ${isAdm ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'} flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            ${(u.username || 'U').substring(0, 1)}
                          </div>
                          <div class="min-w-0">
                            <span class="font-bold text-white block text-xs truncate">${this.escapeHtml(u.username || 'User')}</span>
                            <span class="text-[10px] font-mono text-slate-500">UID #${u.id || 1}</span>
                          </div>
                        </div>
                      </td>

                      <!-- Email -->
                      <td class="px-4 py-3 font-mono">
                        <div class="flex items-center gap-1.5">
                          <span class="text-slate-300 text-xs truncate max-w-xs">${this.escapeHtml(u.email || 'user@mpanel.local')}</span>
                          <button onclick="navigator.clipboard.writeText('${this.escapeHtml(u.email || '')}'); app.toast('Copied email: ${this.escapeHtml(u.email || '')}', 'info');" class="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300 transition" title="Copy Email">
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
                          <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ACTIVE</span>
                        </div>
                      </td>

                      <!-- Actions -->
                      <td class="px-4 py-3 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                          <button onclick="document.getElementById('prof-username').focus(); document.getElementById('prof-username').scrollIntoView({behavior:'smooth', block:'center'}); app.toast('Ready to edit profile details below', 'info');" class="btn-cyber px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shadow-sm" title="Edit Profile Details">
                            <i data-lucide="edit-3" class="w-3 h-3"></i> Edit
                          </button>
                          <button onclick="document.getElementById('prof-current-pass').focus(); document.getElementById('prof-current-pass').scrollIntoView({behavior:'smooth', block:'center'}); app.toast('Enter your current & new password below', 'info');" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-white/10 transition" title="Change Password">
                            <i data-lucide="key" class="w-3.5 h-3.5"></i>
                          </button>
                          ${u.two_factor_enabled
                            ? `<button onclick="auth.showDisable2FAModal()" class="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-rose-500/20 text-emerald-400 hover:text-rose-400 border border-emerald-500/30 transition" title="Manage 2FA">
                                <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                              </button>`
                            : `<button onclick="auth.start2FASetup()" class="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 transition" title="Setup 2FA">
                                <i data-lucide="shield" class="w-3.5 h-3.5"></i>
                              </button>`
                          }
                          <button onclick="auth.logout()" class="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20 transition" title="Sign Out">
                            <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Settings & 2FA Cards Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <!-- Profile Details Card -->
            <div class="glass-panel p-6 rounded-2xl border border-white/10 space-y-4 shadow-xl">
              <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">
                <i data-lucide="edit-3" class="w-4 h-4 text-cyan-400"></i> Update Profile Credentials
              </h3>
              <form onsubmit="auth.handleProfileUpdate(event)" class="space-y-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                  <input type="text" id="prof-username" value="${this.escapeHtml(u.username || '')}" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input type="email" id="prof-email" value="${this.escapeHtml(u.email || '')}" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs" required>
                </div>
                <div class="pt-2 border-t border-white/10">
                  <label class="block text-xs font-semibold text-slate-300 mb-1">Current Password (required to change)</label>
                  <input type="password" id="prof-current-pass" placeholder="••••••••" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
                  <input type="password" id="prof-new-pass" placeholder="Leave empty to keep unchanged" class="w-full glass-input px-3.5 py-2 rounded-xl text-xs">
                </div>
                <button type="submit" class="btn-cyber w-full py-2.5 rounded-xl text-xs font-semibold shadow-md">
                  Save Profile Changes
                </button>
              </form>
            </div>

            <!-- Two-Factor Authentication (2FA) Card -->
            <div class="glass-panel p-6 rounded-2xl border border-white/10 space-y-4 shadow-xl">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i> Two-Factor Authentication
                </h3>
                ${u.two_factor_enabled
                  ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ENABLED</span>`
                  : `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-400">DISABLED</span>`
                }
              </div>
              <p class="text-xs text-slate-400 leading-relaxed">Protect your account from unauthorized access by requiring an authenticator code (Google Authenticator / Authy) on login.</p>

              ${u.two_factor_enabled
                ? `
                  <div class="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-xs text-emerald-300 space-y-2">
                    <p class="font-semibold">✓ 2FA is actively protecting your account.</p>
                    <p class="text-[11px] text-slate-400">You must provide a 6-digit TOTP code each time you sign in.</p>
                  </div>
                  <button onclick="auth.showDisable2FAModal()" class="w-full py-2.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition shadow-sm">
                    Disable Two-Factor Auth
                  </button>
                `
                : `
                  <button onclick="auth.start2FASetup()" class="btn-cyber w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md">
                    <i data-lucide="qr-code" class="w-4 h-4"></i> Setup 2FA Authenticator
                  </button>
                  <div id="2fa-setup-box" class="hidden space-y-4 pt-4 border-t border-white/10"></div>
                `
              }
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      console.error('Error rendering user profile:', err);
      container.innerHTML = `
        <div class="p-8 text-center text-rose-400">
          <i data-lucide="alert-triangle" class="w-8 h-8 mx-auto mb-2"></i>
          <p class="text-sm font-semibold">Failed to load account profile: ${this.escapeHtml(err.message)}</p>
        </div>
      `;
    }

    if (window.lucide) lucide.createIcons();
  }

  // Render User Activity Log
  async renderUserActivity() {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div class="space-y-6">
        <div>
          <h2 class="text-xl font-bold text-white flex items-center gap-2">
            <i data-lucide="activity" class="w-5 h-5 text-cyan-400"></i> My Activity & Login History
          </h2>
          <p class="text-xs text-slate-400">Audit trail of actions and logins performed on your account</p>
        </div>

        <div class="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300">
              <thead class="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th class="px-5 py-3">Action</th>
                  <th class="px-5 py-3">Details</th>
                  <th class="px-5 py-3">IP Address</th>
                  <th class="px-5 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody id="user-activity-tbody" class="divide-y divide-white/5">
                <tr><td colspan="4" class="text-center py-6 text-slate-500">Loading audit history...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    try {
      const data = await this.api('/api/activity?limit=50');
      const logs = data.logs || [];
      const tbody = document.getElementById('user-activity-tbody');

      if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-6 text-slate-500">No activity recorded yet.</td></tr>`;
      } else {
        tbody.innerHTML = logs.map(l => `
          <tr class="hover:bg-white/5 transition">
            <td class="px-5 py-3 font-semibold text-cyan-400">${l.action}</td>
            <td class="px-5 py-3 font-mono text-[11px] text-slate-300 truncate max-w-xs">${l.details || '-'}</td>
            <td class="px-5 py-3 font-mono text-slate-400">${l.ip_address || '127.0.0.1'}</td>
            <td class="px-5 py-3 text-slate-400">${new Date(l.created_at).toLocaleString()}</td>
          </tr>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
    if (window.lucide) lucide.createIcons();
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    this.toast(`Copied "${text}" to clipboard!`, 'success');
  }

  showDeveloperCardModal() {
    const container = document.getElementById('modal-container');
    if (!container) return;

    const liveHtml = (window.discordLive && typeof window.discordLive.renderCardInner === 'function')
      ? window.discordLive.renderCardInner()
      : `
        <div class="relative w-full bg-[#111214] flex justify-center items-center overflow-hidden">
          <img src="/images/nobita-discord.png" class="w-full h-auto object-contain select-none" alt="Nobita Discord Profile">
        </div>
      `;

    container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in" onclick="if(event.target===this) document.getElementById('modal-container').innerHTML=''">
        <div class="w-full max-w-sm rounded-3xl overflow-hidden border border-indigo-500/30 bg-[#111214] text-slate-200 shadow-2xl relative animate-scale-in font-sans max-h-[92vh] flex flex-col">
          
          <!-- Top Bar: View Switcher & Close -->
          <div class="p-2.5 px-3 bg-[#111214]/90 border-b border-white/5 flex items-center justify-between z-20 shrink-0">
            <div class="flex items-center gap-1.5 p-0.5 rounded-xl bg-black/40 border border-white/10">
              <button id="dev-modal-btn-live" onclick="if(window.discordLive) window.discordLive.toggleView('live')" class="px-2.5 py-1 rounded-lg bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-500/40 text-[11px] flex items-center gap-1 transition">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Discord</span>
              </button>
              <button id="dev-modal-btn-popout" onclick="if(window.discordLive) window.discordLive.toggleView('popout')" class="px-2.5 py-1 rounded-lg bg-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 transition">
                <i data-lucide="image" class="w-3 h-3"></i>
                <span>Snapshot</span>
              </button>
            </div>

            <!-- Close Button -->
            <button onclick="document.getElementById('modal-container').innerHTML=''" class="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition border border-white/10">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <!-- Dynamic Content Area -->
          <div id="developer-modal-content-area" class="flex-1 overflow-y-auto custom-scrollbar">
            <div id="discord-live-card-body">
              ${liveHtml}
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="p-3 bg-[#111214] border-t border-white/5 space-y-2 shrink-0">
            <div class="grid grid-cols-2 gap-2">
              <a href="https://discord.com/users/924366651443527710" target="_blank" class="py-2 px-3 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-md shadow-indigo-500/20 active:scale-95">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                <span>Open Discord</span>
              </a>
              <a href="https://nobitahost.in/" target="_blank" class="py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-md shadow-cyan-500/20 active:scale-95">
                <i data-lucide="globe" class="w-3.5 h-3.5"></i>
                <span>nobitahost.in</span>
              </a>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button onclick="app.copyToClipboard('<@924366651443527710>')" class="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-mono flex items-center justify-center gap-1.5 border border-white/10 transition active:scale-98">
                <i data-lucide="copy" class="w-3 h-3 text-purple-400"></i>
                <span>&lt;@924366651443527710&gt;</span>
              </button>
              <button onclick="app.copyToClipboard('924366651443527710')" class="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[11px] font-mono flex items-center justify-center gap-1 border border-white/10 transition active:scale-98">
                <i data-lucide="hash" class="w-3 h-3 text-cyan-400"></i>
                <span>ID: 924366651443527710</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }


  logout() {
    localStorage.removeItem('mpanel_token');
    this.token = null;
    this.user = null;
    this.updateAuthUI(null);
    if (window.auth && typeof window.auth.showLoginModal === 'function') {
      window.auth.showLoginModal();
    }
  }
}

window.app = new App();
window.escapeHtml = (str) => window.app.escapeHtml(str);

