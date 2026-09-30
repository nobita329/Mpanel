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

  // Toast Notification System (Image Spec: Modern Glassmorphic Neon Notification Cards)
  toast(messageOrOpts, type = 'info', extraOpts = {}) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed top-5 right-5 z-[99999] flex flex-col gap-3 pointer-events-none max-w-[calc(100vw-24px)]';
      document.body.appendChild(container);
    }

    // Resolve options
    let opts = typeof messageOrOpts === 'object' && messageOrOpts !== null
      ? messageOrOpts
      : { message: messageOrOpts, type, ...extraOpts };

    let toastType = opts.type || type || 'info';
    if (toastType === 'danger' || toastType === 'red') toastType = 'error';
    if (toastType === 'warn' || toastType === 'yellow') toastType = 'warning';
    if (toastType === 'blue') toastType = 'info';
    if (toastType === 'green') toastType = 'success';

    let rawMessage = String(opts.message || '');
    let title = opts.title;
    let messageText = rawMessage;
    let host = opts.host || window.location.host || '127.0.0.1:3001';
    let duration = opts.duration || 4200;

    // Smart title and message detection matching user screenshot
    if (!title) {
      const lower = rawMessage.toLowerCase();
      if (lower.includes('port unassigned') || (lower.includes('port') && lower.includes('unassigned'))) {
        title = 'Port Unassigned';
        if (rawMessage === 'Port unassigned.' || rawMessage === 'Port unassigned') {
          messageText = 'Port is now available.';
        }
      } else if (lower.includes('failed to unassign') || lower.includes('unassign failed')) {
        title = 'Unassign Failed';
        if (rawMessage.startsWith('Failed to unassign port:')) {
          messageText = rawMessage.replace('Failed to unassign port:', '').trim() || 'Failed to unassign port.';
        } else {
          messageText = 'Failed to unassign port.';
        }
      } else if (lower.includes('port in use') || (lower.includes('port') && lower.includes('in use'))) {
        title = 'Port In Use';
        messageText = 'Port is currently in use.';
      } else if (lower.includes('please try again later')) {
        title = 'Information';
        messageText = 'Please try again later.';
      } else if (lower.includes('primary port')) {
        title = 'Primary Port';
      } else if (lower.includes('backup restored')) {
        title = 'Backup Restored';
      } else if (lower.includes('backup deleted')) {
        title = 'Backup Deleted';
      } else if (lower.includes('schedule deleted')) {
        title = 'Schedule Deleted';
      } else if (lower.includes('server reinstalled')) {
        title = 'Server Reinstalled';
      } else if (lower.includes('subdomain deleted') || lower.includes('subdomain created')) {
        title = lower.includes('deleted') ? 'Subdomain Deleted' : 'Subdomain Created';
      } else if (lower.includes('cache cleaned')) {
        title = 'Cache Cleaned';
      } else {
        const defaultTitles = {
          success: 'Success',
          error: 'Action Failed',
          warning: 'Warning',
          info: 'Information'
        };
        title = defaultTitles[toastType] || 'Notification';
      }
    }

    const themes = {
      success: {
        borderGlow: 'border-emerald-500/50 shadow-[0_0_25px_rgba(16,185,129,0.3)]',
        outerRing: 'bg-emerald-950/70 border-emerald-500/40',
        innerBadge: `
          <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.7)]">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        `,
        titleColor: 'text-emerald-400',
        progressBar: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]'
      },
      error: {
        borderGlow: 'border-rose-500/50 shadow-[0_0_25px_rgba(244,63,94,0.3)]',
        outerRing: 'bg-rose-950/70 border-rose-500/40',
        innerBadge: `
          <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-[0_0_12px_rgba(244,63,94,0.7)]">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        `,
        titleColor: 'text-rose-400',
        progressBar: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]'
      },
      warning: {
        borderGlow: 'border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.3)]',
        outerRing: 'bg-amber-950/70 border-amber-500/40',
        innerBadge: `
          <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500/25 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]">
            <svg class="w-4 h-4 fill-amber-400/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
        `,
        titleColor: 'text-amber-400',
        progressBar: 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]'
      },
      info: {
        borderGlow: 'border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.3)]',
        outerRing: 'bg-cyan-950/70 border-cyan-500/40',
        innerBadge: `
          <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-cyan-500/25 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
        `,
        titleColor: 'text-cyan-400',
        progressBar: 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]'
      }
    };

    const theme = themes[toastType] || themes.info;

    const toast = document.createElement('div');
    toast.className = `w-[320px] sm:w-[350px] p-3.5 sm:p-4 rounded-[20px] bg-[#0c0d14]/95 border ${theme.borderGlow} backdrop-blur-xl pointer-events-auto select-none transition-all transform duration-300 translate-x-8 opacity-0 shadow-2xl relative overflow-hidden`;

    toast.innerHTML = `
      <div class="flex items-start gap-3">
        <!-- Circular Outer Ring + Inner Icon Badge -->
        <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-full ${theme.outerRing} border flex items-center justify-center shrink-0">
          ${theme.innerBadge}
        </div>

        <!-- Middle Content Area -->
        <div class="flex-1 min-w-0 pt-0.5">
          <h4 class="text-sm font-bold ${theme.titleColor} leading-tight truncate">
            ${this.escapeHtml(title)}
          </h4>
          <div class="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
            ${this.escapeHtml(host)}
          </div>
          <p class="text-xs text-slate-300 mt-1 leading-snug break-words">
            ${this.escapeHtml(messageText)}
          </p>
        </div>

        <!-- Top Right Close Button -->
        <button class="toast-close-btn text-slate-400 hover:text-white transition p-0.5 -mr-1 -mt-0.5 cursor-pointer shrink-0" title="Dismiss">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Bottom Animated Progress Bar -->
      <div class="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-3">
        <div class="toast-progress-bar h-full ${theme.progressBar} rounded-full" style="width: 100%;"></div>
      </div>
    `;

    container.appendChild(toast);

    const progressBar = toast.querySelector('.toast-progress-bar');
    const closeBtn = toast.querySelector('.toast-close-btn');

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      toast.classList.add('opacity-0', 'translate-x-8', 'scale-95');
      setTimeout(() => toast.remove(), 250);
    };

    if (closeBtn) closeBtn.onclick = dismiss;

    // Trigger Entrance animation & Progress Bar countdown
    requestAnimationFrame(() => {
      toast.classList.remove('translate-x-8', 'opacity-0');
      if (progressBar) {
        progressBar.style.transition = `width ${duration}ms linear`;
        progressBar.style.width = '0%';
      }
    });

    let timer = setTimeout(dismiss, duration);

    // Pause timer and progress on hover
    toast.onmouseenter = () => {
      clearTimeout(timer);
      if (progressBar) {
        const computedWidth = window.getComputedStyle(progressBar).width;
        progressBar.style.transition = 'none';
        progressBar.style.width = computedWidth;
      }
    };
    toast.onmouseleave = () => {
      timer = setTimeout(dismiss, 1200);
    };
  }

  // Compatibility alias for toast
  showToast(message, type = 'info', opts = {}) {
    return this.toast(message, type, opts);
  }

  // Helper for instant SVG icons with full fallback
  renderIcon(name, className = 'w-5 h-5') {
    switch (name) {
      case 'file-plus':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>`;
      case 'folder-plus':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>`;
      case 'folder':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
      case 'edit-3':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
      case 'copy':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
      case 'terminal':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>`;
      case 'server':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`;
      case 'sliders':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>`;
      case 'arrow-down-circle':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="8 12 12 16 16 12"></polyline><line x1="12" y1="8" x2="12" y2="16"></line></svg>`;
      case 'cpu':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>`;
      case 'plus':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
      case 'unlink':
      case 'broken-link':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18.84 12.25l1.72-1.71a4.5 4.5 0 0 0-6.36-6.36l-1.72 1.71"></path>
          <path d="M5.16 11.75l-1.72 1.71a4.5 4.5 0 0 0 6.36 6.36l1.72-1.71"></path>
          <line x1="8" y1="2" x2="8" y2="5"></line>
          <line x1="2" y1="8" x2="5" y2="8"></line>
          <line x1="16" y1="19" x2="16" y2="22"></line>
          <line x1="19" y1="16" x2="22" y2="16"></line>
        </svg>`;
      case 'trash-2':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
      case 'alert-triangle':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
      case 'refresh-cw':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`;
      case 'archive':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`;
      case 'database':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`;
      case 'globe':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg>`;
      case 'key':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"></circle><path d="M10.5 12.5L21 2"></path><path d="M18 5l2 2"></path><path d="M14 9l2 2"></path></svg>`;
      case 'monitor':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;
      case 'x':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
      case 'check':
        return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      default:
        return `<i data-lucide="${name || 'help-circle'}" class="${className}"></i>`;
    }
  }

  // Modern Glassmorphism Confirmation Modal (Image 2 Spec)
  confirm(options) {
    return new Promise((resolve) => {
      let opts = typeof options === 'string' ? { message: options } : (options || {});
      const renderIcon = (name, className = 'w-5 h-5') => this.renderIcon(name, className);

      // Heuristic string detection
      const rawMsg = opts.message || '';
      let tag = opts.tag;
      let tagIcon = opts.tagIcon;
      let title = opts.title;
      let message = rawMsg;
      let subtext = opts.subtext || '';
      let icon = opts.icon;
      let confirmIcon = opts.confirmIcon;
      let confirmText = opts.confirmText;
      let cancelText = opts.cancelText || 'Cancel';
      let type = opts.type || 'fuchsia';
      let badge = opts.badge || window.location.host || '127.0.0.1:3001';
      let badgeIcon = opts.badgeIcon || 'monitor';

      if (!tag || !title) {
        if (/unassign.*port|port.*unassign/i.test(rawMsg)) {
          tag = tag || 'UNASSIGN PORT';
          tagIcon = tagIcon || 'unlink';
          title = title || 'Unassign Port';
          subtext = subtext || 'This will release the port and make it available for other servers.';
          icon = icon || 'unlink';
          confirmIcon = confirmIcon || 'unlink';
          confirmText = confirmText || 'Unassign Port';
          type = opts.type || 'fuchsia';
        } else if (/delete.*server|destroy.*server/i.test(rawMsg)) {
          tag = tag || 'DELETE SERVER';
          tagIcon = tagIcon || 'alert-triangle';
          title = title || 'Delete Server';
          subtext = subtext || 'This action cannot be undone and will permanently destroy all server files.';
          icon = icon || 'trash-2';
          confirmIcon = confirmIcon || 'trash-2';
          confirmText = confirmText || 'Delete Server';
          type = opts.type || 'danger';
        } else if (/reinstall.*server/i.test(rawMsg)) {
          tag = tag || 'REINSTALL SERVER';
          tagIcon = tagIcon || 'refresh-cw';
          title = title || 'Reinstall Server';
          subtext = subtext || 'Reinstalling will stop the server and wipe default configuration files.';
          icon = icon || 'refresh-cw';
          confirmIcon = confirmIcon || 'refresh-cw';
          confirmText = confirmText || 'Reinstall';
          type = opts.type || 'warning';
        } else if (/drop.*database|delete.*database/i.test(rawMsg)) {
          tag = tag || 'DROP DATABASE';
          tagIcon = tagIcon || 'database';
          title = title || 'Delete Database';
          subtext = subtext || 'All stored tables, records and schema data will be permanently removed.';
          icon = icon || 'trash-2';
          confirmIcon = confirmIcon || 'trash-2';
          confirmText = confirmText || 'Delete Database';
          type = opts.type || 'danger';
        } else if (/reset.*password/i.test(rawMsg)) {
          tag = tag || 'RESET PASSWORD';
          tagIcon = tagIcon || 'key';
          title = title || 'Reset Password';
          subtext = subtext || 'Any connected plugins will fail to authenticate until reconfigured.';
          icon = icon || 'key';
          confirmIcon = confirmIcon || 'refresh-cw';
          confirmText = confirmText || 'Reset Password';
          type = opts.type || 'warning';
        } else if (/backup.*restore|restore.*backup/i.test(rawMsg)) {
          tag = tag || 'RESTORE BACKUP';
          tagIcon = tagIcon || 'archive';
          title = title || 'Restore Backup';
          subtext = subtext || 'All existing server files will be overwritten with the backup state.';
          icon = icon || 'archive';
          confirmIcon = confirmIcon || 'refresh-cw';
          confirmText = confirmText || 'Restore';
          type = opts.type || 'warning';
        } else if (/delete.*backup/i.test(rawMsg)) {
          tag = tag || 'DELETE BACKUP';
          tagIcon = tagIcon || 'archive';
          title = title || 'Delete Backup';
          subtext = subtext || 'This backup archive will be permanently erased from storage.';
          icon = icon || 'trash-2';
          confirmIcon = confirmIcon || 'trash-2';
          confirmText = confirmText || 'Delete Backup';
          type = opts.type || 'danger';
        } else if (/subdomain/i.test(rawMsg)) {
          tag = tag || 'DELETE SUBDOMAIN';
          tagIcon = tagIcon || 'globe';
          title = title || 'Delete Subdomain';
          subtext = subtext || 'DNS records and traffic routing for this subdomain will be removed.';
          icon = icon || 'trash-2';
          confirmIcon = confirmIcon || 'trash-2';
          confirmText = confirmText || 'Delete Subdomain';
          type = opts.type || 'danger';
        } else if (/startup.*command|startup.*profile/i.test(rawMsg)) {
          tag = tag || 'DELETE PROFILE';
          tagIcon = tagIcon || 'sliders';
          title = title || 'Delete Profile';
          subtext = subtext || 'This startup profile configuration will be removed.';
          icon = icon || 'trash-2';
          confirmIcon = confirmIcon || 'trash-2';
          confirmText = confirmText || 'Delete Profile';
          type = opts.type || 'danger';
        } else if (/fivem.*cache/i.test(rawMsg)) {
          tag = tag || 'CLEAN CACHE';
          tagIcon = tagIcon || 'trash-2';
          title = title || 'Clean Cache';
          subtext = subtext || 'Temporary runtime cache will be purged and rebuilt on next boot.';
          icon = icon || 'trash-2';
          confirmIcon = confirmIcon || 'trash-2';
          confirmText = confirmText || 'Clean Cache';
          type = opts.type || 'warning';
        } else if (/disconnect/i.test(rawMsg)) {
          tag = tag || 'DISCONNECT';
          tagIcon = tagIcon || 'unlink';
          title = title || 'Disconnect Domain';
          subtext = subtext || 'The domain mapping will be detached from this panel instance.';
          icon = icon || 'unlink';
          confirmIcon = confirmIcon || 'unlink';
          confirmText = confirmText || 'Disconnect';
          type = opts.type || 'danger';
        } else if (/delete|remove|wipe|destroy|kill/i.test(rawMsg)) {
          tag = tag || 'PERMANENT ACTION';
          tagIcon = tagIcon || 'alert-triangle';
          title = title || 'Confirm Delete';
          subtext = subtext || 'This action is permanent and cannot be undone.';
          icon = icon || 'trash-2';
          confirmIcon = confirmIcon || 'trash-2';
          confirmText = confirmText || 'Delete';
          type = opts.type || 'danger';
        } else if (/reset|revert/i.test(rawMsg)) {
          tag = tag || 'RESET DEFAULTS';
          tagIcon = tagIcon || 'refresh-cw';
          title = title || 'Reset Defaults';
          subtext = subtext || 'All customized options will be restored to their factory state.';
          icon = icon || 'refresh-cw';
          confirmIcon = confirmIcon || 'refresh-cw';
          confirmText = confirmText || 'Reset';
          type = opts.type || 'warning';
        } else {
          tag = tag || 'CONFIRM ACTION';
          tagIcon = tagIcon || 'help-circle';
          title = title || 'Please Confirm';
          icon = icon || 'help-circle';
          confirmIcon = confirmIcon || 'check';
          confirmText = confirmText || 'Confirm';
          type = opts.type || 'fuchsia';
        }
      }

      tagIcon = tagIcon || 'help-circle';
      icon = icon || 'help-circle';
      confirmIcon = confirmIcon || icon;
      confirmText = confirmText || 'Confirm';

      const themeStyles = {
        fuchsia: {
          borderGlow: 'border-fuchsia-500/40 shadow-[0_0_50px_rgba(217,70,239,0.3)]',
          tagPill: 'bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-300',
          iconBox: 'bg-fuchsia-950/40 border-fuchsia-500/30 text-fuchsia-400 shadow-[0_0_25px_rgba(217,70,239,0.22)]',
          accentColor: 'text-fuchsia-400',
          confirmBtn: 'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600 hover:from-fuchsia-500 hover:via-pink-500 hover:to-rose-500 text-white shadow-[0_0_25px_rgba(217,70,239,0.45)] border border-fuchsia-400/40'
        },
        danger: {
          borderGlow: 'border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.3)]',
          tagPill: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
          iconBox: 'bg-rose-950/40 border-rose-500/30 text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.22)]',
          accentColor: 'text-rose-400',
          confirmBtn: 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:via-red-500 hover:to-rose-600 text-white shadow-[0_0_25px_rgba(244,63,94,0.45)] border border-rose-400/40'
        },
        warning: {
          borderGlow: 'border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.3)]',
          tagPill: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          iconBox: 'bg-amber-950/40 border-amber-500/30 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.22)]',
          accentColor: 'text-amber-400',
          confirmBtn: 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:via-amber-400 hover:to-yellow-500 text-white shadow-[0_0_25px_rgba(245,158,11,0.45)] border border-amber-400/40'
        },
        info: {
          borderGlow: 'border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.3)]',
          tagPill: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
          iconBox: 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.22)]',
          accentColor: 'text-cyan-400',
          confirmBtn: 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.45)] border border-cyan-400/40'
        }
      };

      const style = themeStyles[type] || themeStyles[type === 'red' ? 'danger' : type === 'yellow' ? 'warning' : type === 'pink' ? 'fuchsia' : 'fuchsia'] || themeStyles.fuchsia;

      // Format title into white first word(s) + colored last word
      let formattedTitle = opts.titleHtml;
      if (!formattedTitle && title) {
        const words = title.trim().split(/\s+/);
        if (words.length <= 1) {
          formattedTitle = `<span class="text-white">${this.escapeHtml(words[0])}</span>`;
        } else {
          const firstPart = words.slice(0, -1).join(' ');
          const lastWord = words[words.length - 1];
          formattedTitle = `<span class="text-white">${this.escapeHtml(firstPart)} </span><span class="${style.accentColor}">${this.escapeHtml(lastWord)}</span>`;
        }
      }

      // Build Modal DOM
      const overlay = document.createElement('div');
      overlay.id = 'mpanel-confirm-overlay';
      overlay.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md opacity-0 transition-opacity duration-200 select-none';

      overlay.innerHTML = `
        <div id="mpanel-confirm-modal-box" class="relative w-full max-w-[560px] rounded-[24px] bg-[#12101c]/95 border ${style.borderGlow} p-6 sm:p-7 backdrop-blur-2xl transform scale-95 transition-all duration-200 shadow-2xl">
          <!-- Top Row: Tag Pill & Close Button -->
          <div class="flex items-center justify-between mb-3">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full ${style.tagPill} border text-[11px] font-bold tracking-wider uppercase">
              ${renderIcon(tagIcon, 'w-3.5 h-3.5 shrink-0')}
              <span>${this.escapeHtml(tag)}</span>
            </div>
            <button id="mpanel-confirm-close-btn" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer" title="Close">
              ${renderIcon('x', 'w-4 h-4')}
            </button>
          </div>

          <!-- Middle Content Row: Large Square Icon + Text Details -->
          <div class="flex items-start gap-5 mt-4 mb-6">
            <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ${style.iconBox} border flex items-center justify-center shrink-0">
              ${renderIcon(icon, 'w-10 h-10 sm:w-12 sm:h-12')}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-2xl sm:text-[28px] font-extrabold tracking-tight leading-tight">
                ${formattedTitle}
              </h3>
              ${badge ? `
                <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs font-mono font-medium mt-2">
                  ${renderIcon(badgeIcon, 'w-3.5 h-3.5 text-slate-400 shrink-0')}
                  <span>${this.escapeHtml(badge)}</span>
                </div>
              ` : ''}
              <p class="text-slate-200 text-sm sm:text-[15px] font-normal mt-3 leading-relaxed">
                ${this.escapeHtml(message)}
              </p>
              ${subtext ? `
                <p class="text-slate-400 text-xs sm:text-[13px] mt-1.5 leading-relaxed font-normal">
                  ${this.escapeHtml(subtext)}
                </p>
              ` : ''}
            </div>
          </div>

          <!-- Bottom Action Buttons: Cancel + Confirm -->
          <div class="flex items-center justify-end gap-3 pt-2">
            ${opts.isAlert ? '' : `
              <button id="mpanel-confirm-cancel-btn" class="px-5 py-2.5 rounded-xl border border-white/10 bg-[#171424] hover:bg-[#221e33] text-slate-300 hover:text-white text-sm font-medium flex items-center gap-2 transition cursor-pointer">
                ${renderIcon('x', 'w-4 h-4')}
                <span>${this.escapeHtml(cancelText)}</span>
              </button>
            `}
            <button id="mpanel-confirm-action-btn" class="px-6 py-2.5 rounded-xl ${style.confirmBtn} text-sm font-semibold flex items-center gap-2 transition transform active:scale-95 cursor-pointer">
              ${renderIcon(confirmIcon, 'w-4 h-4 shrink-0')}
              <span>${this.escapeHtml(confirmText)}</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      if (window.lucide) lucide.createIcons();

      const modalBox = overlay.querySelector('#mpanel-confirm-modal-box');
      const closeBtn = overlay.querySelector('#mpanel-confirm-close-btn');
      const cancelBtn = overlay.querySelector('#mpanel-confirm-cancel-btn');
      const actionBtn = overlay.querySelector('#mpanel-confirm-action-btn');

      const finish = (result) => {
        overlay.classList.add('opacity-0');
        if (modalBox) {
          modalBox.classList.remove('scale-100');
          modalBox.classList.add('scale-95');
        }
        document.removeEventListener('keydown', keydownHandler);
        setTimeout(() => {
          overlay.remove();
          resolve(result);
        }, 200);
      };

      const keydownHandler = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          finish(true);
        }
      };

      document.addEventListener('keydown', keydownHandler);

      if (closeBtn) closeBtn.onclick = () => finish(false);
      if (cancelBtn) cancelBtn.onclick = () => finish(false);
      if (actionBtn) {
        actionBtn.focus();
        actionBtn.onclick = () => finish(true);
      }
      overlay.onclick = (e) => {
        if (e.target === overlay) finish(false);
      };

      requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        if (modalBox) {
          modalBox.classList.remove('scale-95');
          modalBox.classList.add('scale-100');
        }
      });
    });
  }

  // Modern Glassmorphism Alert Modal
  alert(options) {
    let opts = typeof options === 'string' ? { message: options } : (options || {});
    return this.confirm({
      ...opts,
      isAlert: true,
      confirmText: opts.confirmText || 'OK',
      confirmIcon: opts.confirmIcon || 'check'
    });
  }

  // Modern Glassmorphism Prompt Modal
  prompt(options, defaultVal = '') {
    return new Promise((resolve) => {
      let opts = typeof options === 'string' ? { message: options, defaultValue: defaultVal } : (options || {});
      if (defaultVal && opts.defaultValue === undefined) {
        opts.defaultValue = defaultVal;
      }

      const rawMsg = opts.message || '';
      let tag = opts.tag;
      let tagIcon = opts.tagIcon;
      let title = opts.title;
      let message = rawMsg;
      let subtext = opts.subtext || '';
      let icon = opts.icon;
      let confirmIcon = opts.confirmIcon;
      let confirmText = opts.confirmText;
      let cancelText = opts.cancelText || 'Cancel';
      let type = opts.type || 'fuchsia';
      let placeholder = opts.placeholder || '';
      let defaultValue = opts.defaultValue !== undefined && opts.defaultValue !== null ? String(opts.defaultValue) : '';
      let inputType = opts.inputType || 'text';
      let badge = opts.badge || window.location.host || '127.0.0.1:3001';
      let badgeIcon = opts.badgeIcon || 'monitor';
      let inputHelp = opts.inputHelp || '';

      // Heuristic detection based on raw message
      if (!tag || !title) {
        if (/new file|file name|create file/i.test(rawMsg)) {
          tag = tag || 'NEW FILE';
          tagIcon = tagIcon || 'file-plus';
          title = title || 'Create New File';
          subtext = subtext || 'File will be created in the current working directory.';
          icon = icon || 'file-plus';
          confirmIcon = confirmIcon || 'plus';
          confirmText = confirmText || 'Create File';
          placeholder = placeholder || 'e.g. config.yml, script.js';
          type = opts.type || 'fuchsia';
        } else if (/new folder|folder name|create folder/i.test(rawMsg)) {
          tag = tag || 'NEW FOLDER';
          tagIcon = tagIcon || 'folder-plus';
          title = title || 'Create New Folder';
          subtext = subtext || 'Folder will be created in the current working directory.';
          icon = icon || 'folder-plus';
          confirmIcon = confirmIcon || 'plus';
          confirmText = confirmText || 'Create Folder';
          placeholder = placeholder || 'e.g. plugins, logs';
          type = opts.type || 'fuchsia';
        } else if (/rename|new name/i.test(rawMsg)) {
          tag = tag || 'RENAME ITEM';
          tagIcon = tagIcon || 'edit-3';
          title = title || 'Rename Item';
          subtext = subtext || 'Enter the new target name for this item.';
          icon = icon || 'edit-3';
          confirmIcon = confirmIcon || 'check';
          confirmText = confirmText || 'Rename';
          placeholder = placeholder || 'Enter new name...';
          type = opts.type || 'fuchsia';
        } else if (/duplicate|copy/i.test(rawMsg)) {
          tag = tag || 'DUPLICATE ITEM';
          tagIcon = tagIcon || 'copy';
          title = title || 'Duplicate Item';
          subtext = subtext || 'Specify target destination path or filename.';
          icon = icon || 'copy';
          confirmIcon = confirmIcon || 'copy';
          confirmText = confirmText || 'Duplicate';
          placeholder = placeholder || 'Enter destination...';
          type = opts.type || 'fuchsia';
        } else if (/extract/i.test(rawMsg)) {
          tag = tag || 'EXTRACT ARCHIVE';
          tagIcon = tagIcon || 'archive';
          title = title || 'Extract Archive';
          subtext = subtext || 'Leave blank to extract into current directory.';
          icon = icon || 'archive';
          confirmIcon = confirmIcon || 'arrow-down-circle';
          confirmText = confirmText || 'Extract';
          placeholder = placeholder || 'Directory path (optional)...';
          type = opts.type || 'fuchsia';
        } else if (/archive name|compress/i.test(rawMsg)) {
          tag = tag || 'COMPRESS ARCHIVE';
          tagIcon = tagIcon || 'archive';
          title = title || 'Create Archive';
          subtext = subtext || 'Specify output zip filename for selected items.';
          icon = icon || 'archive';
          confirmIcon = confirmIcon || 'archive';
          confirmText = confirmText || 'Compress';
          placeholder = placeholder || 'e.g. backup.zip';
          type = opts.type || 'fuchsia';
        } else if (/destination directory|destination folder/i.test(rawMsg)) {
          tag = tag || 'DESTINATION';
          tagIcon = tagIcon || 'folder';
          title = title || 'Destination Folder';
          subtext = subtext || 'Relative to server root /home/container.';
          icon = icon || 'folder';
          confirmIcon = confirmIcon || 'check';
          confirmText = confirmText || 'Confirm';
          placeholder = placeholder || 'e.g. plugins or leave blank for root';
          type = opts.type || 'fuchsia';
        } else if (/permission|chmod|unix/i.test(rawMsg)) {
          tag = tag || 'PERMISSIONS';
          tagIcon = tagIcon || 'key';
          title = title || 'Set Permissions';
          subtext = subtext || 'Enter 4-digit octal Unix mode (e.g. 0644 or 0755).';
          icon = icon || 'key';
          confirmIcon = confirmIcon || 'check';
          confirmText = confirmText || 'Save Mode';
          placeholder = placeholder || '0644';
          type = opts.type || 'warning';
        } else if (/font size/i.test(rawMsg)) {
          tag = tag || 'TERMINAL CONFIG';
          tagIcon = tagIcon || 'terminal';
          title = title || 'Terminal Font Size';
          subtext = subtext || 'Choose a font size between 9 and 28 px.';
          icon = icon || 'terminal';
          confirmIcon = confirmIcon || 'check';
          confirmText = confirmText || 'Apply Font Size';
          placeholder = placeholder || '12';
          type = opts.type || 'info';
        } else if (/variable/i.test(rawMsg)) {
          tag = tag || 'ENVIRONMENT';
          tagIcon = tagIcon || 'terminal';
          title = title || 'Startup Variable';
          subtext = subtext || 'Configure environment variable for container execution.';
          icon = icon || 'terminal';
          confirmIcon = confirmIcon || 'plus';
          confirmText = confirmText || 'Save Variable';
          placeholder = placeholder || 'e.g. SERVER_PORT';
          type = opts.type || 'info';
        } else if (/world.*folder|world/i.test(rawMsg)) {
          tag = tag || 'WORLD MANAGER';
          tagIcon = tagIcon || 'globe';
          title = title || 'World Name';
          subtext = subtext || 'Folder name where the world data will be generated.';
          icon = icon || 'globe';
          confirmIcon = confirmIcon || 'check';
          confirmText = confirmText || 'Create World';
          placeholder = placeholder || 'world';
          type = opts.type || 'fuchsia';
        } else if (/connection profile|profile/i.test(rawMsg)) {
          tag = tag || 'IMPORT PROFILE';
          tagIcon = tagIcon || 'server';
          title = title || 'Save Profile';
          subtext = subtext || 'Enter a memorable label for this SFTP connection.';
          icon = icon || 'server';
          confirmIcon = confirmIcon || 'check';
          confirmText = confirmText || 'Save Profile';
          placeholder = placeholder || 'e.g. Production Node';
          type = opts.type || 'info';
        } else if (/property|configuration|relative path/i.test(rawMsg)) {
          tag = tag || 'CONFIGURATION';
          tagIcon = tagIcon || 'sliders';
          title = title || 'Config Editor';
          subtext = subtext || 'Specify configuration parameter.';
          icon = icon || 'sliders';
          confirmIcon = confirmIcon || 'check';
          confirmText = confirmText || 'Confirm';
          placeholder = placeholder || 'Enter value...';
          type = opts.type || 'fuchsia';
        } else {
          tag = tag || 'INPUT REQUIRED';
          tagIcon = tagIcon || 'edit-3';
          title = title || 'Please Provide Input';
          icon = icon || 'edit-3';
          confirmIcon = confirmIcon || 'check';
          confirmText = confirmText || 'OK';
          type = opts.type || 'fuchsia';
        }
      }

      tagIcon = tagIcon || 'edit-3';
      icon = icon || 'edit-3';
      confirmIcon = confirmIcon || 'check';
      confirmText = confirmText || 'Confirm';

      const themeStyles = {
        fuchsia: {
          borderGlow: 'border-fuchsia-500/40 shadow-[0_0_50px_rgba(217,70,239,0.3)]',
          tagPill: 'bg-fuchsia-500/15 border-fuchsia-500/30 text-fuchsia-300',
          iconBox: 'bg-fuchsia-950/40 border-fuchsia-500/30 text-fuchsia-400 shadow-[0_0_25px_rgba(217,70,239,0.22)]',
          accentColor: 'text-fuchsia-400',
          inputFocus: 'border-fuchsia-500/40 focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20',
          confirmBtn: 'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600 hover:from-fuchsia-500 hover:via-pink-500 hover:to-rose-500 text-white shadow-[0_0_25px_rgba(217,70,239,0.45)] border border-fuchsia-400/40'
        },
        danger: {
          borderGlow: 'border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.3)]',
          tagPill: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
          iconBox: 'bg-rose-950/40 border-rose-500/30 text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.22)]',
          accentColor: 'text-rose-400',
          inputFocus: 'border-rose-500/40 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20',
          confirmBtn: 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:via-red-500 hover:to-rose-600 text-white shadow-[0_0_25px_rgba(244,63,94,0.45)] border border-rose-400/40'
        },
        warning: {
          borderGlow: 'border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.3)]',
          tagPill: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          iconBox: 'bg-amber-950/40 border-amber-500/30 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.22)]',
          accentColor: 'text-amber-400',
          inputFocus: 'border-amber-500/40 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20',
          confirmBtn: 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-500 hover:via-amber-400 hover:to-yellow-500 text-white shadow-[0_0_25px_rgba(245,158,11,0.45)] border border-amber-400/40'
        },
        info: {
          borderGlow: 'border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.3)]',
          tagPill: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
          iconBox: 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.22)]',
          accentColor: 'text-cyan-400',
          inputFocus: 'border-cyan-500/40 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20',
          confirmBtn: 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:via-blue-500 hover:to-indigo-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.45)] border border-cyan-400/40'
        }
      };

      const style = themeStyles[type] || themeStyles[type === 'red' ? 'danger' : type === 'yellow' ? 'warning' : type === 'pink' ? 'fuchsia' : 'fuchsia'] || themeStyles.fuchsia;

      // Format title into white first word(s) + colored last word
      let formattedTitle = opts.titleHtml;
      if (!formattedTitle && title) {
        const words = title.trim().split(/\s+/);
        if (words.length <= 1) {
          formattedTitle = `<span class="text-white">${this.escapeHtml(words[0])}</span>`;
        } else {
          const firstPart = words.slice(0, -1).join(' ');
          const lastWord = words[words.length - 1];
          formattedTitle = `<span class="text-white">${this.escapeHtml(firstPart)} </span><span class="${style.accentColor}">${this.escapeHtml(lastWord)}</span>`;
        }
      }

      // Build Modal DOM
      const overlay = document.createElement('div');
      overlay.id = 'mpanel-prompt-overlay';
      overlay.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md opacity-0 transition-opacity duration-200 select-none';

      overlay.innerHTML = `
        <div id="mpanel-prompt-modal-box" class="relative w-full max-w-[560px] rounded-[24px] bg-[#12101c]/95 border ${style.borderGlow} p-6 sm:p-7 backdrop-blur-2xl transform scale-95 transition-all duration-200 shadow-2xl">
          <!-- Top Row: Tag Pill & Close Button -->
          <div class="flex items-center justify-between mb-3">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full ${style.tagPill} border text-[11px] font-bold tracking-wider uppercase">
              ${this.renderIcon(tagIcon, 'w-3.5 h-3.5 shrink-0')}
              <span>${this.escapeHtml(tag)}</span>
            </div>
            <button id="mpanel-prompt-close-btn" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer" title="Close">
              ${this.renderIcon('x', 'w-4 h-4')}
            </button>
          </div>

          <!-- Middle Content Row: Icon Card + Text & Input Field -->
          <div class="flex items-start gap-5 mt-4 mb-4">
            <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl ${style.iconBox} border flex items-center justify-center shrink-0">
              ${this.renderIcon(icon, 'w-10 h-10 sm:w-12 sm:h-12')}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-2xl sm:text-[28px] font-extrabold tracking-tight leading-tight">
                ${formattedTitle}
              </h3>
              ${badge ? `
                <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs font-mono font-medium mt-2">
                  ${this.renderIcon(badgeIcon, 'w-3.5 h-3.5 text-slate-400 shrink-0')}
                  <span>${this.escapeHtml(badge)}</span>
                </div>
              ` : ''}
              <p class="text-slate-200 text-sm sm:text-[15px] font-normal mt-3 leading-relaxed">
                ${this.escapeHtml(message)}
              </p>
              ${subtext ? `
                <p class="text-slate-400 text-xs sm:text-[13px] mt-1.5 leading-relaxed font-normal">
                  ${this.escapeHtml(subtext)}
                </p>
              ` : ''}
            </div>
          </div>

          <!-- Input Box -->
          <div class="mt-2 mb-6">
            <div class="relative">
              <input
                id="mpanel-prompt-input"
                type="${inputType}"
                class="w-full px-4 py-3 rounded-xl bg-slate-900/90 border ${style.inputFocus} text-white placeholder-slate-500 font-mono text-sm outline-none transition shadow-inner select-text"
                placeholder="${this.escapeHtml(placeholder)}"
                value="${this.escapeHtml(defaultValue)}"
                autocomplete="off"
                spellcheck="false"
              />
            </div>
            ${inputHelp ? `<p class="text-[11px] text-slate-400 mt-2 font-mono">${this.escapeHtml(inputHelp)}</p>` : ''}
          </div>

          <!-- Bottom Action Buttons: Cancel + Confirm -->
          <div class="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
            <button id="mpanel-prompt-cancel-btn" class="px-5 py-2.5 rounded-xl border border-white/10 bg-[#171424] hover:bg-[#221e33] text-slate-300 hover:text-white text-sm font-medium flex items-center gap-2 transition cursor-pointer">
              ${this.renderIcon('x', 'w-4 h-4')}
              <span>${this.escapeHtml(cancelText)}</span>
            </button>
            <button id="mpanel-prompt-action-btn" class="px-6 py-2.5 rounded-xl ${style.confirmBtn} text-sm font-semibold flex items-center gap-2 transition transform active:scale-95 cursor-pointer">
              ${this.renderIcon(confirmIcon, 'w-4 h-4 shrink-0')}
              <span>${this.escapeHtml(confirmText)}</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      if (window.lucide) lucide.createIcons();

      const modalBox = overlay.querySelector('#mpanel-prompt-modal-box');
      const closeBtn = overlay.querySelector('#mpanel-prompt-close-btn');
      const cancelBtn = overlay.querySelector('#mpanel-prompt-cancel-btn');
      const actionBtn = overlay.querySelector('#mpanel-prompt-action-btn');
      const inputEl = overlay.querySelector('#mpanel-prompt-input');

      let resolved = false;
      const finish = (result) => {
        if (resolved) return;
        resolved = true;
        overlay.classList.add('opacity-0');
        if (modalBox) {
          modalBox.classList.remove('scale-100');
          modalBox.classList.add('scale-95');
        }
        document.removeEventListener('keydown', keydownHandler);
        setTimeout(() => {
          overlay.remove();
          resolve(result);
        }, 200);
      };

      const keydownHandler = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(null);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const val = inputEl ? inputEl.value : '';
          finish(val);
        }
      };

      document.addEventListener('keydown', keydownHandler);

      if (closeBtn) closeBtn.onclick = () => finish(null);
      if (cancelBtn) cancelBtn.onclick = () => finish(null);
      if (actionBtn) {
        actionBtn.onclick = () => {
          const val = inputEl ? inputEl.value : '';
          finish(val);
        };
      }
      overlay.onclick = (e) => {
        if (e.target === overlay) finish(null);
      };

      requestAnimationFrame(() => {
        overlay.classList.remove('opacity-0');
        if (modalBox) {
          modalBox.classList.remove('scale-95');
          modalBox.classList.add('scale-100');
        }
        if (inputEl) {
          inputEl.focus();
          if (defaultValue) {
            const lastDot = defaultValue.lastIndexOf('.');
            if (lastDot > 0) {
              inputEl.setSelectionRange(0, lastDot);
            } else {
              inputEl.select();
            }
          }
        }
      });
    });
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

    // Impersonation Banner (from users.zip: users/view.blade.php Login as User)
    const impersonatorToken = sessionStorage.getItem('impersonator_token');
    let impBanner = document.getElementById('impersonation-active-banner');
    if (impersonatorToken && user) {
      if (!impBanner) {
        impBanner = document.createElement('div');
        impBanner.id = 'impersonation-active-banner';
        impBanner.className = 'fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 text-white text-xs font-bold py-2 px-4 shadow-2xl flex items-center justify-between border-b border-white/20';
        document.body.prepend(impBanner);
      }
      impBanner.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-white animate-ping"></span>
          <span>IMPERSONATION MODE: Currently logged in as <strong class="underline font-mono">${this.escapeHtml(user.username)}</strong> (${this.escapeHtml(user.email)})</span>
        </div>
        <button onclick="app.exitImpersonation()" class="px-3 py-1 rounded-lg bg-black/50 hover:bg-black/80 text-white border border-white/30 transition text-xs font-bold flex items-center gap-1.5 shadow">
          Exit Impersonation &rarr; Return to Admin
        </button>
      `;
    } else if (impBanner) {
      impBanner.remove();
    }

    if (window.lucide) lucide.createIcons();
  }

  exitImpersonation() {
    const adminToken = sessionStorage.getItem('impersonator_token');
    const adminUser = sessionStorage.getItem('impersonator_user');
    if (adminToken) {
      localStorage.setItem('mpanel_token', adminToken);
      if (adminUser) localStorage.setItem('mpanel_user', adminUser);
      sessionStorage.removeItem('impersonator_token');
      sessionStorage.removeItem('impersonator_user');
      const impBanner = document.getElementById('impersonation-active-banner');
      if (impBanner) impBanner.remove();
      this.toast('Returned to Administrator account.', 'success');
      window.location.hash = '#admin-users';
      window.location.reload();
    }
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
      } else if (hash === 'admin-addons') {
        if (window.adminAddons && typeof window.adminAddons.renderAddonsView === 'function') {
          await window.adminAddons.renderAddonsView();
        } else {
          let attempts = 0;
          const pollTimer = setInterval(async () => {
            attempts++;
            if (window.adminAddons && typeof window.adminAddons.renderAddonsView === 'function') {
              clearInterval(pollTimer);
              await window.adminAddons.renderAddonsView();
            } else if (attempts > 30) {
              clearInterval(pollTimer);
            }
          }, 50);
        }
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
window.confirmAsync = (options) => (window.app ? window.app.confirm(options) : Promise.resolve(confirm(typeof options === 'string' ? options : (options.message || 'Confirm?'))));
window.appConfirm = (options) => (window.app ? window.app.confirm(options) : Promise.resolve(confirm(typeof options === 'string' ? options : (options.message || 'Confirm?'))));
window.promptAsync = (options, defaultVal) => (window.app ? window.app.prompt(options, defaultVal) : Promise.resolve(prompt(typeof options === 'string' ? options : (options.message || ''), defaultVal || '')));
window.appPrompt = (options, defaultVal) => (window.app ? window.app.prompt(options, defaultVal) : Promise.resolve(prompt(typeof options === 'string' ? options : (options.message || ''), defaultVal || '')));



