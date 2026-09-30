/**
 * Custom Server Sort Extension for Mpanel
 * Ported from customserversort.blueprint (v1.0.3 by kiip)
 * Enables smooth drag-and-drop server reordering and multi-criteria sorting.
 */
class CustomServerSort {
  constructor() {
    this.sortModes = {
      user: localStorage.getItem('mpanel_user_sort_mode') || 'custom',
      admin: localStorage.getItem('mpanel_admin_sort_mode') || 'custom'
    };
    this.reorderMode = {
      user: false,
      admin: false
    };
    this.sortableInstances = new Map();
    this.syncedWithBackend = false;
    this.injectStyles();
  }

  injectStyles() {
    if (typeof document === 'undefined' || document.getElementById('custom-server-sort-styles')) return;
    const style = document.createElement('style');
    style.id = 'custom-server-sort-styles';
    style.textContent = `
      .sortable-ghost-card {
        opacity: 0.35 !important;
        transform: scale(0.98);
        border: 2px dashed #06b6d4 !important;
        background: rgba(6, 182, 212, 0.08) !important;
      }
      .sortable-chosen-card {
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(168, 85, 247, 0.4) !important;
        border-color: rgba(168, 85, 247, 0.6) !important;
      }
      .sortable-drag-card {
        opacity: 0.95 !important;
        cursor: grabbing !important;
      }
      .custom-sort-active .sortable-handle {
        opacity: 1 !important;
        animation: pulse-handle 1.5s infinite;
      }
      @keyframes pulse-handle {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
      }
    `;
    document.head.appendChild(style);
  }

  async syncFromBackend() {
    if (this.syncedWithBackend || typeof window === 'undefined' || !window.app || !app.token) return;
    try {
      const res = await app.api('/api/auth/server-order');
      if (res && res.server_order && Array.isArray(res.server_order)) {
        const local = localStorage.getItem(this.getStorageKey('user'));
        if (!local) {
          localStorage.setItem(this.getStorageKey('user'), JSON.stringify(res.server_order));
        }
      }
      this.syncedWithBackend = true;
    } catch (e) {}
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

  getStorageKey(context = 'user') {
    return context === 'admin' ? 'mpanel_admin_server_order' : 'mpanel_user_server_order';
  }

  getSortModeKey(context = 'user') {
    return context === 'admin' ? 'mpanel_admin_sort_mode' : 'mpanel_user_sort_mode';
  }

  getSavedOrder(context = 'user') {
    const key = this.getStorageKey(context);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      if (raw.startsWith('[') && raw.endsWith(']')) {
        return JSON.parse(raw).map(Number).filter(n => !isNaN(n));
      }
      return raw.split('|').map(Number).filter(n => !isNaN(n));
    } catch (e) {
      return [];
    }
  }

  saveOrder(context = 'user', orderArray = []) {
    const key = this.getStorageKey(context);
    const cleaned = orderArray.map(Number).filter(n => !isNaN(n) && n > 0);
    localStorage.setItem(key, JSON.stringify(cleaned));

    // Also persist to backend user preferences in the background
    if (context === 'user' && window.app && app.token) {
      app.api('/api/auth/server-order', {
        method: 'PUT',
        body: { server_order: JSON.stringify(cleaned) }
      }).catch(() => {});
    }
  }

  setSortMode(context = 'user', mode = 'custom') {
    this.sortModes[context] = mode;
    localStorage.setItem(this.getSortModeKey(context), mode);
  }

  getSortMode(context = 'user') {
    return this.sortModes[context] || 'custom';
  }

  toggleReorderMode(context = 'user') {
    this.reorderMode[context] = !this.reorderMode[context];
    const container = context === 'admin'
      ? document.getElementById('adm-servers-view-target')
      : document.getElementById('user-servers-list-grid');

    if (container) {
      container.classList.toggle('custom-sort-active', this.reorderMode[context]);
    }
    return this.reorderMode[context];
  }

  /**
   * Sort array of server objects according to the active sort mode
   */
  sortServers(servers = [], context = 'user') {
    if (context === 'user' && !this.syncedWithBackend) {
      this.syncFromBackend();
    }
    if (!Array.isArray(servers) || servers.length <= 1) return servers;
    const mode = this.getSortMode(context);
    const list = [...servers];

    switch (mode) {
      case 'name-asc':
        return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));

      case 'name-desc':
        return list.sort((a, b) => (b.name || '').localeCompare(a.name || '', undefined, { numeric: true, sensitivity: 'base' }));

      case 'status':
        return list.sort((a, b) => {
          const score = s => {
            if (s.is_suspended || s.status === 'suspended') return 0;
            if (s.status === 'running') return 3;
            if (s.status === 'starting') return 2;
            return 1;
          };
          return score(b) - score(a);
        });

      case 'id-asc':
        return list.sort((a, b) => Number(a.id) - Number(b.id));

      case 'id-desc':
        return list.sort((a, b) => Number(b.id) - Number(a.id));

      case 'memory-desc':
        return list.sort((a, b) => Number(b.memory_mb || 0) - Number(a.memory_mb || 0));

      case 'custom':
      default: {
        const saved = this.getSavedOrder(context);
        if (!saved || saved.length === 0) return list;

        const orderMap = new Map();
        saved.forEach((id, index) => orderMap.set(Number(id), index));

        return list.sort((a, b) => {
          const posA = orderMap.has(Number(a.id)) ? orderMap.get(Number(a.id)) : 999999;
          const posB = orderMap.has(Number(b.id)) ? orderMap.get(Number(b.id)) : 999999;
          if (posA !== posB) return posA - posB;
          return Number(a.id) - Number(b.id);
        });
      }
    }
  }

  /**
   * Attach SortableJS on the server container
   */
  attachSortable(container, context = 'user', onReorderCallback = null) {
    if (!container || typeof window.Sortable === 'undefined') return;

    // Destroy prior instance if present
    if (this.sortableInstances.has(container)) {
      try {
        this.sortableInstances.get(container).destroy();
      } catch (e) {}
      this.sortableInstances.delete(container);
    }

    const sortable = Sortable.create(container, {
      animation: 150,
      delay: (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) ? 100 : 0,
      delayOnTouchOnly: true,
      handle: '.sortable-handle, [data-drag-handle]',
      ghostClass: 'sortable-ghost-card',
      chosenClass: 'sortable-chosen-card',
      dragClass: 'sortable-drag-card',
      dataIdAttr: 'data-server-id',
      onEnd: (evt) => {
        // Collect current server IDs in new DOM order
        const cards = Array.from(container.querySelectorAll('[data-server-id]'));
        const newOrder = cards.map(c => Number(c.getAttribute('data-server-id'))).filter(n => !isNaN(n) && n > 0);

        if (newOrder.length > 0) {
          this.setSortMode(context, 'custom');
          this.saveOrder(context, newOrder);

          // Update UI select if present
          const selectEl = document.getElementById(`server-sort-select-${context}`);
          if (selectEl) selectEl.value = 'custom';

          if (window.app && typeof app.toast === 'function') {
            app.toast('Server order updated and saved.', 'info');
          }

          if (typeof onReorderCallback === 'function') {
            onReorderCallback(newOrder);
          }
        }
      }
    });

    this.sortableInstances.set(container, sortable);
  }

  /**
   * Render Sort Controls Toolbar
   */
  renderToolbarHTML(context = 'user', onSortChangeFnName = null) {
    const currentMode = this.getSortMode(context);
    const isReorderActive = !!this.reorderMode[context];

    const sortOptions = [
      { id: 'custom', label: 'Custom (Drag & Drop)' },
      { id: 'name-asc', label: 'Name (A → Z)' },
      { id: 'name-desc', label: 'Name (Z → A)' },
      { id: 'status', label: 'Status (Online First)' },
      { id: 'id-desc', label: 'Newest First (ID ↓)' },
      { id: 'id-asc', label: 'Oldest First (ID ↑)' },
      { id: 'memory-desc', label: 'Memory (High → Low)' }
    ];

    const changeCall = onSortChangeFnName || (context === 'admin' ? 'admin.handleServerSortChange' : 'app.handleServerSortChange');

    return `
      <div id="server-sort-toolbar-${context}" class="flex items-center gap-2 flex-wrap">
        <!-- Sort By Dropdown -->
        <div class="flex items-center gap-1.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner text-xs">
          <i data-lucide="arrow-up-down" class="w-3.5 h-3.5 text-cyan-400"></i>
          <span class="text-[11px] font-semibold text-slate-400">Sort:</span>
          <select id="server-sort-select-${context}" onchange="${changeCall}(this.value)" class="bg-transparent border-0 text-xs font-bold text-white focus:outline-none cursor-pointer pr-2">
            ${sortOptions.map(o => `
              <option value="${o.id}" ${currentMode === o.id ? 'selected' : ''} class="bg-slate-900 text-white">
                ${o.label}
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Reorder Mode Toggle Button -->
        <button type="button" onclick="customServerSort.handleToggleReorder('${context}')" id="btn-reorder-toggle-${context}" class="px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${isReorderActive ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30 ring-1 ring-purple-400/50' : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-white/10'}" title="Toggle Drag & Drop Handles">
          <i data-lucide="grip-vertical" class="w-3.5 h-3.5 ${isReorderActive ? 'text-white' : 'text-purple-400'}"></i>
          <span>${isReorderActive ? 'Done Reordering' : 'Reorder'}</span>
        </button>

        <!-- Reset Order Button -->
        <button type="button" onclick="customServerSort.promptReset('${context}')" title="Reset to default server order" class="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 text-slate-400 hover:text-white border border-white/10 transition">
          <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
  }

  handleToggleReorder(context = 'user') {
    const active = this.toggleReorderMode(context);
    const btn = document.getElementById(`btn-reorder-toggle-${context}`);
    if (btn) {
      if (active) {
        btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30 ring-1 ring-purple-400/50';
        btn.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-white"></i><span>Done Reordering</span>`;
      } else {
        btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-white/10';
        btn.innerHTML = `<i data-lucide="grip-vertical" class="w-3.5 h-3.5 text-purple-400"></i><span>Reorder</span>`;
      }
      if (window.lucide) lucide.createIcons();
    }

    // Toggle handles visibility on cards
    document.querySelectorAll('.sortable-handle, [data-drag-handle]').forEach(el => {
      el.classList.toggle('opacity-100', active);
      el.classList.toggle('cursor-grab', active);
    });
  }

  async promptReset(context = 'user') {
    const ok = await app.confirm({
      tag: 'RESET SORTING',
      tagIcon: 'refresh-cw',
      title: 'Reset Server Order',
      badge: window.location.host,
      message: 'Reset server sorting back to default ID order?',
      subtext: 'Your custom drag-and-drop server positioning will revert to creation order.',
      icon: 'refresh-cw',
      confirmIcon: 'refresh-cw',
      confirmText: 'Reset Order',
      type: 'warning'
    });
    if (!ok) return;
    localStorage.removeItem(this.getStorageKey(context));
    this.setSortMode(context, 'custom');
    if (context === 'user' && window.app && app.token) {
      app.api('/api/auth/server-order', {
        method: 'PUT',
        body: { server_order: null }
      }).catch(() => {});
    }
    if (window.app && typeof app.toast === 'function') {
      app.toast('Server order reset to default.', 'info');
    }
    if (context === 'admin' && window.admin && typeof admin.renderServersView === 'function') {
      admin.renderServersView();
    } else if (window.app && typeof app.renderUserServersView === 'function') {
      app.renderUserServersView();
    }
  }

  /**
   * Helper to render the drag handle badge for card or row templates
   */
  renderDragHandleHTML() {
    return `
      <div class="sortable-handle opacity-40 hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-cyan-300 cursor-grab active:cursor-grabbing transition shrink-0" data-drag-handle title="Drag to reorder server">
        <i data-lucide="grip-vertical" class="w-4 h-4"></i>
      </div>
    `;
  }
}

window.customServerSort = new CustomServerSort();
