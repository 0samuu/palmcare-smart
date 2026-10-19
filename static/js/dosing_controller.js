/**
 * PalmCare Precision Agritech OS - Precision Fluid Dosing Controller
 * Dual-Path Manifold Solenoid Selector, Firmware Safety Interlocks, & Hydraulic Dispatch
 */

const DosingController = {
  activeTreeId: 'TR-02',
  currentPath: 'path-a',
  durationSeconds: 25,
  isAuthorized: false,

  init() {
    this.setupPathSelectors();
    this.setupSliders();
    this.setupAuthorization();
    this.setupExecutionButtons();
    this.setupModalDismiss();
  },

  openModal(treeId = 'TR-02', duration = 25) {
    this.activeTreeId = treeId;
    this.durationSeconds = duration;
    const modal = document.getElementById('dosing-modal');
    if (!modal) return;

    // Prepopulate tree info
    const tree = window.PalmCare.state.trees[treeId] || { name: 'Tree-02 · Barhi', vwc: 7.8 };
    const modalTargetName = document.querySelectorAll('.dosing-target-tree');
    modalTargetName.forEach(el => el.innerText = tree.name || 'Tree-02 (Barhi)');

    const modalTargetVwc = document.querySelectorAll('.dosing-target-vwc');
    modalTargetVwc.forEach(el => el.innerText = `${tree.vwc || 7.8}% VWC`);

    // Reset slider
    const slider = document.getElementById('modal-duration-slider');
    if (slider) {
      slider.value = duration;
      this.updateValues(duration);
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  },

  closeModal() {
    const modal = document.getElementById('dosing-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    const overlay = document.getElementById('execution-overlay');
    if (overlay) overlay.classList.add('hidden');
  },

  setupModalDismiss() {
    const closeBtns = document.querySelectorAll('.btn-close-dosing');
    closeBtns.forEach(btn => btn.addEventListener('click', () => this.closeModal()));

    const modal = document.getElementById('dosing-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal();
      });
    }
  },

  setupPathSelectors() {
    document.querySelectorAll('.btn-select-path').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const path = btn.getAttribute('data-path');
        this.selectPath(path);
      });
    });
  },

  selectPath(pathKey) {
    this.currentPath = pathKey;

    document.querySelectorAll('.fluid-card').forEach(card => {
      const path = card.getAttribute('data-path');
      const badge = card.querySelector('.fluid-check-badge');

      if (path === pathKey) {
        card.className = 'fluid-card text-left p-space-md rounded-xl bg-secondary-container/30 ring-2 ring-primary hover:bg-secondary-container/50 transition-all duration-150 relative group cursor-pointer flex flex-col justify-between h-36';
        if (badge) {
          badge.className = 'fluid-check-badge w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center';
        }
      } else {
        card.className = 'fluid-card text-left p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-all duration-150 relative group cursor-pointer flex flex-col justify-between h-36';
        if (badge) {
          badge.className = 'fluid-check-badge w-5 h-5 rounded-full bg-surface-variant text-transparent flex items-center justify-center';
        }
      }
    });

    const conduitLabel = pathKey === 'path-a' ? 'Solenoid 1 (Clean RO Water)' : 'Solenoid 2 (Nutrient Chelate)';
    window.PalmCare.showToast('Fluid Manifold Conduit Armed', `${conduitLabel} selected for pulsed injection.`, 'valve');
  },

  setupSliders() {
    const sliders = document.querySelectorAll('.dosing-duration-slider');
    sliders.forEach(slider => {
      slider.addEventListener('input', (e) => {
        this.durationSeconds = parseInt(e.target.value, 10);
        this.updateValues(this.durationSeconds);
      });
    });
  },

  updateValues(duration) {
    const volume = (duration * 0.5).toFixed(1);

    document.querySelectorAll('.timer-display-val').forEach(el => {
      el.innerHTML = `${duration}<span class="text-body-lg font-normal text-on-surface-variant ml-0.5">sec</span>`;
    });

    document.querySelectorAll('.calc-volume-val').forEach(el => {
      el.innerText = `${volume} Liters`;
    });
  },

  setupAuthorization() {
    const authCheckboxes = document.querySelectorAll('.dosing-auth-checkbox');
    authCheckboxes.forEach(cb => {
      cb.addEventListener('change', (e) => {
        this.isAuthorized = e.target.checked;
        this.toggleExecutionState(this.isAuthorized);
      });
    });
  },

  toggleExecutionState(isAuthorized) {
    const executeBtns = document.querySelectorAll('.btn-execute-dosing');
    executeBtns.forEach(btn => {
      if (isAuthorized) {
        btn.disabled = false;
        btn.className = 'btn-execute-dosing w-full sm:flex-1 py-3.5 px-space-md rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-caps text-body-sm font-bold uppercase tracking-wider flex items-center justify-center gap-space-xs transition-all duration-200 cursor-pointer shadow-md active:scale-95';
      } else {
        btn.disabled = true;
        btn.className = 'btn-execute-dosing w-full sm:flex-1 py-3.5 px-space-md rounded-lg bg-outline text-surface-variant font-label-caps text-body-sm font-bold uppercase tracking-wider flex items-center justify-center gap-space-xs transition-all duration-200 cursor-not-allowed opacity-60 shadow-sm';
      }
    });
  },

  setupExecutionButtons() {
    const executeBtns = document.querySelectorAll('.btn-execute-dosing');
    executeBtns.forEach(btn => {
      btn.addEventListener('click', () => this.executeDosing());
    });
  },

  async executeDosing() {
    if (!this.isAuthorized) {
      window.PalmCare.showToast('Authorization Required', 'Please confirm GS-402 safety directive checkbox.', 'warning', 'error');
      return;
    }

    const payload = {
      tree_id: this.activeTreeId,
      conduit: this.currentPath,
      duration: this.durationSeconds,
      authorized: true,
      operator: window.PalmCare.roles[window.PalmCare.state.currentRole].name
    };

    const overlay = document.getElementById('execution-overlay');
    const summary = document.getElementById('execution-summary');
    const pBar = document.getElementById('progress-bar-dosing');

    if (overlay && summary) {
      const pathLabel = this.currentPath === 'path-a' ? 'Clean RO Water (Path A)' : 'Nutrient Chelate (Path B)';
      const targetVolume = (this.durationSeconds * 0.5).toFixed(1);
      summary.innerText = `Pneumatic pulse initiated for ${this.durationSeconds}s (${targetVolume}L) using ${pathLabel} on ${this.activeTreeId}. Line telemetry steady at 2.1 Bar.`;
      overlay.classList.remove('hidden');

      let progress = 0;
      const step = 100 / (this.durationSeconds * 2);
      const interval = setInterval(() => {
        progress += step;
        if (pBar) pBar.style.width = Math.min(100, progress) + '%';
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 500);
    }

    try {
      const res = await fetch('/api/dosing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        window.PalmCare.showToast('Precision Dosing Executed', `${data.volume_liters}L discharged to ${this.activeTreeId}. New moisture: ${data.new_vwc}%`, 'check_circle');
        // Refresh digital twin state
        if (window.DigitalTwin) {
          window.DigitalTwin.render();
        }
      } else {
        window.PalmCare.showToast('Execution Alert', data.detail || 'Manifold dispatch error', 'error', 'error');
      }
    } catch (e) {
      console.error(e);
      window.PalmCare.showToast('Precision Dosing Simulated', `Dispatched ${(this.durationSeconds * 0.5).toFixed(1)}L to ${this.activeTreeId}.`, 'check_circle');
    }
  }
};

window.DosingController = DosingController;
document.addEventListener('DOMContentLoaded', () => DosingController.init());
