/**
 * PalmCare Precision Agritech OS - Core Application Architecture
 * SPA Router, Live WebSocket Telemetry, Responsive Navigation, & State Management
 */

const PalmCare = {
  // Global State
  state: {
    currentRoute: 'dashboard-overview',
    currentRole: 'supervisor',
    selectedTreeId: 'TR-02',
    mode: 'LIVE SENSORS',
    emergencyStop: false,
    wsConnected: false,
    systemStatus: {
      solar_wattage: 17.5,
      battery_voltage: 12.6,
      line_pressure: 2.10,
      line_flow: 0.50,
      modbus_ok: true,
      interlock_active: true
    },
    trees: {},
    weather: {}
  },

  // Role Definitions
  roles: {
    supervisor: {
      key: 'supervisor',
      name: 'Eng. Fatima',
      title: 'Agricultural Supervisor',
      email: 'fatima.agronomist@palmcare.ae',
      desc: 'Full sensor telemetry access, solenoid actuator arming, OpenCV model tuning.',
      btnText: 'Sign In to PalmCare Cluster OS'
    },
    caretaker: {
      key: 'caretaker',
      name: 'Rashid Al-Nuaimi',
      title: 'Field Operator (Caretaker)',
      email: 'rashid.field@palmcare.ae',
      desc: 'Mobile-first field inspection cards, valve maintenance logging, instant emergency stop.',
      btnText: 'Authenticate Field Operator Terminal'
    },
    owner: {
      key: 'owner',
      name: 'M. Al-Zaabi',
      title: 'Farm Owner',
      email: 'm.alzaabi@groveholdings.ae',
      desc: 'Read-only grove health overview, harvest ROI index, water consumption quotas.',
      btnText: 'View Executive PalmCare Dashboard'
    },
    admin: {
      key: 'admin',
      name: 'Tariq Al-Hammadi',
      title: 'System Administrator',
      email: 'tariq.syseng@palmcare.ae',
      desc: 'Hardware probe diagnostics, edge watchdog resets, simulated acoustic weevil injection.',
      btnText: 'Open System Engineering Shell'
    }
  },

  init() {
    this.setupRouter();
    this.setupEventListeners();
    this.initWebSocket();
    this.fetchInitialData();
  },

  // SPA Hash Routing
  setupRouter() {
    window.addEventListener('hashchange', () => this.handleRoute());
    // Initial route
    this.handleRoute();
  },

  handleRoute() {
    let hash = window.location.hash.replace('#', '').trim();
    if (!hash) hash = 'dashboard-overview';

    // Map aliases
    if (hash === 'dashboard') hash = 'dashboard-overview';
    if (hash === 'twin') hash = 'multi-tree-digital-twin';
    if (hash === 'vision') hash = 'canopy-vision-opencv';
    if (hash === 'dosing') hash = 'precision-fluid-dosing';
    if (hash === 'diagnostics') hash = 'edge-diagnostics';

    this.navigate(hash, false);
  },

  navigate(routeId, updateHash = true) {
    this.state.currentRoute = routeId;

    if (updateHash) {
      window.location.hash = routeId;
    }

    // Hide all views
    document.querySelectorAll('.spa-view').forEach(view => {
      view.classList.remove('active');
    });

    // Handle Login view layout (full screen vs dashboard shell)
    const shellSidebar = document.getElementById('shell-sidebar');
    const shellHeader = document.getElementById('shell-header');
    const shellFooter = document.getElementById('shell-footer');
    const mainWrapper = document.getElementById('main-wrapper');

    if (routeId === 'login') {
      if (shellSidebar) shellSidebar.classList.add('hidden');
      if (shellHeader) shellHeader.classList.add('hidden');
      if (shellFooter) shellFooter.classList.add('hidden');
      if (mainWrapper) {
        mainWrapper.classList.remove('lg:pl-[260px]');
        mainWrapper.classList.add('pl-0');
      }
    } else {
      if (shellSidebar) shellSidebar.classList.remove('hidden');
      if (shellHeader) shellHeader.classList.remove('hidden');
      if (shellFooter) shellFooter.classList.remove('hidden');
      if (mainWrapper) {
        mainWrapper.classList.add('lg:pl-[260px]');
      }
    }

    // Show target view
    const targetView = document.getElementById(`view-${routeId}`);
    if (targetView) {
      targetView.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update active nav links
    this.updateNavHighlight(routeId);

    // Close mobile drawer if open
    this.closeMobileDrawer();

    // Trigger view-specific re-renders
    if (routeId === 'multi-tree-digital-twin' && window.DigitalTwin) {
      window.DigitalTwin.refresh();
    }
    if (routeId === 'canopy-vision-opencv' && window.CanopyVision) {
      window.CanopyVision.refresh();
    }
  },

  updateNavHighlight(routeId) {
    document.querySelectorAll('[data-path]').forEach(link => {
      const path = link.getAttribute('data-path');
      if (path === routeId) {
        link.className = 'flex items-center gap-space-sm px-space-md py-3 rounded-lg bg-primary-container text-on-primary font-semibold shadow-sm transition-all duration-150 cursor-pointer select-none';
        link.setAttribute('aria-current', 'page');
      } else {
        link.className = 'flex items-center gap-space-sm px-space-md py-3 rounded-lg text-primary-fixed-dim hover:bg-on-primary-fixed-variant hover:text-on-primary transition-all duration-150 cursor-pointer select-none';
        link.removeAttribute('aria-current');
      }
    });
  },

  // Mobile Navigation Drawer Toggle
  toggleMobileDrawer() {
    const drawer = document.getElementById('mobile-drawer');
    const backdrop = document.getElementById('mobile-drawer-backdrop');
    if (!drawer) return;

    const isOpen = !drawer.classList.contains('-translate-x-full');
    if (isOpen) {
      this.closeMobileDrawer();
    } else {
      drawer.classList.remove('-translate-x-full');
      if (backdrop) backdrop.classList.remove('hidden');
    }
  },

  closeMobileDrawer() {
    const drawer = document.getElementById('mobile-drawer');
    const backdrop = document.getElementById('mobile-drawer-backdrop');
    if (drawer) drawer.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  },

  // Role Selection
  selectRole(roleKey) {
    if (!this.roles[roleKey]) return;
    this.state.currentRole = roleKey;
    const role = this.roles[roleKey];

    // Update buttons in login page
    document.querySelectorAll('.persona-btn').forEach(btn => {
      btn.className = 'persona-btn py-1.5 px-2 rounded font-telemetry-md text-body-sm font-semibold transition-all duration-150 bg-surface-container text-on-surface hover:bg-surface-container-high flex items-center justify-center gap-1';
    });
    const activeBtn = document.getElementById(`btn-${roleKey}`);
    if (activeBtn) {
      activeBtn.className = 'persona-btn py-1.5 px-2 rounded font-telemetry-md text-body-sm font-semibold transition-all duration-150 bg-primary-container text-on-primary shadow-sm flex items-center justify-center gap-1';
    }

    // Update login email and labels
    const emailInput = document.getElementById('user-email');
    if (emailInput) emailInput.value = role.email;

    const roleDesc = document.getElementById('role-desc-text');
    if (roleDesc) {
      roleDesc.innerHTML = `<strong class="text-on-surface">Active Role: ${role.title}</strong> — ${role.desc}`;
    }

    const signinLabel = document.getElementById('signin-label');
    if (signinLabel) signinLabel.innerText = role.btnText;

    // Update Header Profile displays
    document.querySelectorAll('.current-user-name').forEach(el => el.innerText = role.name);
    document.querySelectorAll('.current-user-role').forEach(el => el.innerText = role.title);

    this.showToast(`Active Persona: ${role.title}`, `Switched session authority to ${role.name}`, 'engineering');
  },

  // WebSocket Live Telemetry
  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;

    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        this.state.wsConnected = true;
        const linkStatus = document.getElementById('field-link-badge');
        if (linkStatus) linkStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-secondary-fixed animate-pulse"></span>ONLINE';
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleLiveTelemetry(data);
        } catch (e) {
          console.error("Telemetry parse error", e);
        }
      };

      socket.onclose = () => {
        this.state.wsConnected = false;
        // Retry connection in 3 seconds
        setTimeout(() => this.initWebSocket(), 3000);
      };

      socket.onerror = () => {
        // Fallback to REST polling if WebSocket fails
        if (!this.state.pollingInterval) {
          this.state.pollingInterval = setInterval(() => this.pollStatus(), 2000);
        }
      };
    } catch (e) {
      this.state.pollingInterval = setInterval(() => this.pollStatus(), 2000);
    }
  },

  async pollStatus() {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        this.updateHeaderFooterUI(data);
      }
    } catch (e) {
      console.warn("Polling error", e);
    }
  },

  handleLiveTelemetry(data) {
    if (data.status) {
      this.updateHeaderFooterUI(data.status);
    }
    if (data.trees) {
      this.state.trees = data.trees;
      if (window.DigitalTwin) {
        window.DigitalTwin.updateFromLiveTelemetry(data.trees);
      }
    }
  },

  updateHeaderFooterUI(status) {
    // Solar
    const solarPills = document.querySelectorAll('.val-solar');
    solarPills.forEach(el => el.innerText = `${status.solar_wattage || 17.5}W`);

    // Battery
    const batPills = document.querySelectorAll('.val-battery');
    batPills.forEach(el => el.innerText = `${status.battery_voltage || 12.6}V`);

    // Line Pressure
    const pressPills = document.querySelectorAll('.val-pressure');
    pressPills.forEach(el => el.innerText = `${(status.line_pressure || 2.10).toFixed(2)} Bar`);

    // Modbus Status
    const modbusPills = document.querySelectorAll('.val-modbus');
    modbusPills.forEach(el => {
      if (status.modbus_ok) {
        el.className = 'flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-caps text-label-caps font-semibold';
        el.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>RS485 MODBUS OK';
      } else {
        el.className = 'flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-error-container text-on-error-container font-label-caps text-label-caps font-bold animate-pulse';
        el.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-error"></span>RS485 BUS TIMEOUT';
      }
    });

    // Emergency Stop State
    const interlockText = document.getElementById('interlock-status-text');
    if (interlockText) {
      if (status.emergency_stop) {
        interlockText.className = 'font-telemetry-md text-body-sm text-error font-bold';
        interlockText.innerText = 'DISENGAGED (E-STOP)';
      } else {
        interlockText.className = 'font-telemetry-md text-body-sm text-secondary-fixed font-semibold';
        interlockText.innerText = 'ARMED & ACTIVE';
      }
    }
  },

  async fetchInitialData() {
    try {
      const [statusRes, treesRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/trees')
      ]);
      if (statusRes.ok) {
        const status = await statusRes.json();
        this.updateHeaderFooterUI(status);
      }
      if (treesRes.ok) {
        const trees = await treesRes.json();
        trees.forEach(t => this.state.trees[t.id] = t);
      }
    } catch (e) {
      console.warn("Initial data load error", e);
    }
  },

  // Setup Event Listeners
  setupEventListeners() {
    // Nav Click Interception
    document.addEventListener('click', (e) => {
      const navTarget = e.target.closest('[data-path]');
      if (navTarget) {
        e.preventDefault();
        const path = navTarget.getAttribute('data-path');
        this.navigate(path);
      }
    });

    // Mobile Hamburger button
    const menuBtn = document.getElementById('btn-mobile-menu');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => this.toggleMobileDrawer());
    }

    const drawerBackdrop = document.getElementById('mobile-drawer-backdrop');
    if (drawerBackdrop) {
      drawerBackdrop.addEventListener('click', () => this.closeMobileDrawer());
    }

    // Emergency Stop Button
    const estopBtns = document.querySelectorAll('.btn-estop');
    estopBtns.forEach(btn => {
      btn.addEventListener('click', () => this.promptEmergencyStop());
    });

    // Notifications Button Toggle
    const notifBtn = document.getElementById('btn-notifications');
    const notifPopover = document.getElementById('notifications-popover');
    if (notifBtn && notifPopover) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifPopover.classList.toggle('hidden');
      });
      document.addEventListener('click', () => {
        notifPopover.classList.add('hidden');
      });
    }

    // LIVE vs SIMULATOR switch
    const liveBtn = document.getElementById('btn-mode-live');
    const simBtn = document.getElementById('btn-mode-sim');
    if (liveBtn && simBtn) {
      liveBtn.addEventListener('click', () => {
        this.state.mode = 'LIVE SENSORS';
        liveBtn.className = 'px-space-sm py-1 rounded font-label-caps text-label-caps bg-primary text-on-primary font-bold shadow-sm';
        simBtn.className = 'px-space-sm py-1 rounded font-label-caps text-label-caps text-on-surface-variant hover:text-on-surface font-semibold';
        this.showToast('Sensor Mode Updated', 'Live IoT telemetry stream active (Master Hub DXB-01)', 'sensors');
      });
      simBtn.addEventListener('click', () => {
        this.state.mode = 'SIMULATOR_DEMO';
        simBtn.className = 'px-space-sm py-1 rounded font-label-caps text-label-caps bg-tertiary-container text-on-tertiary-container font-bold shadow-sm';
        liveBtn.className = 'px-space-sm py-1 rounded font-label-caps text-label-caps text-on-surface-variant hover:text-on-surface font-semibold';
        this.showToast('Simulator Active', 'Stochastic agritech synthetic simulation engaged for defense evaluation.', 'model_training');
      });
    }
  },

  // Emergency Stop Flow
  async promptEmergencyStop() {
    const modal = document.getElementById('emergency-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  async confirmEmergencyStop() {
    try {
      const res = await fetch('/api/safety/emergency-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `Manual E-Stop by ${this.roles[this.state.currentRole].name}` })
      });
      if (res.ok) {
        this.state.emergencyStop = true;
        this.showToast('EMERGENCY STOP EXECUTED', 'All solenoid valves safe-closed. VFD pump loops disengaged.', 'dangerous', 'error');
        this.closeEmergencyModal();
        this.updateHeaderFooterUI({ line_pressure: 0.0, emergency_stop: true });
      }
    } catch (e) {
      console.error(e);
    }
  },

  async resetEmergencyStop() {
    try {
      const res = await fetch('/api/safety/reset', { method: 'POST' });
      if (res.ok) {
        this.state.emergencyStop = false;
        this.showToast('System Re-Armed', '<120ms Analog Pressure Interlock restored to 2.1 Bar nominal.', 'verified_user');
        this.closeEmergencyModal();
        this.updateHeaderFooterUI({ line_pressure: 2.10, emergency_stop: false });
      }
    } catch (e) {
      console.error(e);
    }
  },

  closeEmergencyModal() {
    const modal = document.getElementById('emergency-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  },

  // Toast System
  showToast(title, desc, icon = 'info', type = 'normal') {
    const toast = document.getElementById('global-toast');
    if (!toast) return;

    const toastTitle = document.getElementById('toast-title');
    const toastDesc = document.getElementById('toast-desc');
    const toastIcon = document.getElementById('toast-icon');

    if (toastTitle) toastTitle.innerText = title;
    if (toastDesc) toastDesc.innerText = desc;
    if (toastIcon) {
      toastIcon.innerText = icon;
      toastIcon.className = type === 'error' ? 'material-symbols-outlined text-error text-2xl' : 'material-symbols-outlined text-primary text-2xl';
    }

    toast.classList.remove('hidden');
    toast.classList.add('opacity-100');

    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 4000);
  }
};

// Global Exposure
window.PalmCare = PalmCare;
document.addEventListener('DOMContentLoaded', () => PalmCare.init());
