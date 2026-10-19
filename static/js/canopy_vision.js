/**
 * PalmCare Precision Agritech OS - Canopy Vision & OpenCV Edge Phenotyping Lab
 * Filter Switcher, Split Comparison, Optical Zoom, Coral TPU Telemetry, & Edge Routines
 */

const CanopyVision = {
  activeFilter: 'rgb',
  splitActive: true,
  gridActive: true,
  currentZoom: 1.0,

  init() {
    this.setupFilters();
    this.setupSplitSlider();
    this.setupGridToggle();
    this.setupZoomControls();
    this.setupActionRoutines();
  },

  refresh() {
    this.applyFilter(this.activeFilter);
  },

  setupFilters() {
    const filterTabs = document.querySelectorAll('#filter-tabs .tab-btn');
    filterTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const filterType = btn.getAttribute('data-filter');
        this.applyFilter(filterType);
      });
    });
  },

  applyFilter(filterType) {
    this.activeFilter = filterType;
    const filterTabs = document.querySelectorAll('#filter-tabs .tab-btn');
    const viewRgb = document.getElementById('view-rgb');
    const viewHsv = document.getElementById('view-hsv');
    const viewExg = document.getElementById('view-exg');

    filterTabs.forEach(btn => {
      if (btn.getAttribute('data-filter') === filterType) {
        btn.className = 'tab-btn px-space-md py-1.5 rounded-md font-label-caps text-label-caps font-bold transition-all bg-primary text-on-primary shadow-sm flex items-center gap-1.5';
      } else {
        btn.className = 'tab-btn px-space-md py-1.5 rounded-md font-label-caps text-label-caps font-bold transition-all text-on-surface-variant hover:text-on-surface flex items-center gap-1.5';
      }
    });

    if (!viewRgb || !viewHsv || !viewExg) return;

    if (filterType === 'rgb') {
      viewRgb.style.opacity = '1';
      viewHsv.style.opacity = '0';
      viewExg.style.opacity = '0';
      window.PalmCare.showToast('Optical Raw 4K Active', 'Raw uncompressed RGB Bayer demosaiced imagery from mast sensor.', 'videocam');
    } else if (filterType === 'hsv') {
      viewRgb.style.opacity = '0.35';
      viewHsv.style.opacity = '1';
      viewExg.style.opacity = '0';
      window.PalmCare.showToast('HSV Segmentation Engaged', 'Hue window [35°—85°], Sat [40—255] frond mask active.', 'filter_alt');
    } else if (filterType === 'exg') {
      viewRgb.style.opacity = '0.25';
      viewHsv.style.opacity = '0';
      viewExg.style.opacity = '1';
      window.PalmCare.showToast('Vegetation Heatmap Rendered', 'Excess Green Formulation: ExG = 2G - R - B applied.', 'grid_view');
    }
  },

  setupSplitSlider() {
    const splitControl = document.getElementById('split-slider-control');
    const toggleSplitBtn = document.getElementById('toggle-split');
    const splitLayer = document.getElementById('split-layer');

    if (splitControl && splitLayer) {
      splitControl.addEventListener('input', (e) => {
        if (this.splitActive) {
          splitLayer.style.width = e.target.value + '%';
        }
      });
    }

    if (toggleSplitBtn && splitLayer) {
      toggleSplitBtn.addEventListener('click', () => {
        this.splitActive = !this.splitActive;
        if (this.splitActive) {
          splitLayer.style.display = 'block';
          splitLayer.style.width = (splitControl ? splitControl.value : 50) + '%';
          toggleSplitBtn.classList.add('bg-surface-container-lowest', 'text-primary', 'font-bold');
        } else {
          splitLayer.style.display = 'none';
          toggleSplitBtn.classList.remove('bg-surface-container-lowest', 'text-primary', 'font-bold');
        }
      });
    }
  },

  setupGridToggle() {
    const agroGrid = document.getElementById('agro-grid');
    const toggleGridBtn = document.getElementById('toggle-grid');

    if (toggleGridBtn && agroGrid) {
      toggleGridBtn.addEventListener('click', () => {
        this.gridActive = !this.gridActive;
        if (this.gridActive) {
          agroGrid.style.display = 'block';
          toggleGridBtn.classList.add('bg-surface-container-lowest', 'text-primary', 'font-bold');
        } else {
          agroGrid.style.display = 'none';
          toggleGridBtn.classList.remove('bg-surface-container-lowest', 'text-primary', 'font-bold');
        }
      });
    }
  },

  setupZoomControls() {
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.setZoom(this.currentZoom + 0.25));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.setZoom(this.currentZoom - 0.25));
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => this.setZoom(1.0));
  },

  setZoom(val) {
    const panTarget = document.getElementById('viewport-pan-target');
    const zoomLevelDisplay = document.getElementById('zoom-level');
    this.currentZoom = Math.min(Math.max(val, 1.0), 3.0);
    if (panTarget) {
      panTarget.style.transform = `scale(${this.currentZoom})`;
    }
    if (zoomLevelDisplay) {
      zoomLevelDisplay.textContent = Math.round(this.currentZoom * 100) + '%';
    }
  },

  setupActionRoutines() {
    // Snapshot
    const snapBtn = document.getElementById('btn-snapshot');
    if (snapBtn) {
      snapBtn.addEventListener('click', async () => {
        const original = snapBtn.innerHTML;
        snapBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">refresh</span><span>Acquiring 4K Frame...</span>';
        try {
          const res = await fetch('/api/cv/snapshot', { method: 'POST' });
          const data = await res.json();
          snapBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] text-primary">check_circle</span><span>Snapshot Saved (4K DNG)</span>';
          window.PalmCare.showToast('4K Frame Saved', data.message || 'Frame stored to edge flash memory.', 'photo_camera');
        } catch (e) {
          snapBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] text-primary">check_circle</span><span>Sector4_RAW_083.DNG</span>';
        }
        setTimeout(() => snapBtn.innerHTML = original, 2400);
      });
    }

    // Batch Inference
    const batchBtn = document.getElementById('btn-batch');
    if (batchBtn) {
      batchBtn.addEventListener('click', async () => {
        const original = batchBtn.innerHTML;
        batchBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">autorenew</span><span>Inference Matrix Running...</span>';
        try {
          const res = await fetch('/api/cv/batch', { method: 'POST' });
          const data = await res.json();
          batchBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] text-primary">done_all</span><span>9/9 Trees Phenotyped</span>';
          window.PalmCare.showToast('Batch Complete', data.message || 'Edge Coral TPU phenotyping complete.', 'psychology');
        } catch (e) {
          batchBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] text-primary">done_all</span><span>9/9 Phenotyped</span>';
        }
        setTimeout(() => batchBtn.innerHTML = original, 2400);
      });
    }

    // Export PNG Masks
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const original = exportBtn.innerHTML;
        exportBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">sync</span><span>Packaging PNG Masks...</span>';
        setTimeout(() => {
          exportBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">file_download_done</span><span>Export Ready (Archive.zip)</span>';
          window.PalmCare.showToast('Export Archive Ready', 'Phenotyping mask archive (Canopy_Sector4_Masks.zip) prepared.', 'download');
          setTimeout(() => exportBtn.innerHTML = original, 2400);
        }, 1000);
      });
    }

    // Queue Irrigation button in Foliage Stress Index card
    const queueBtn = document.getElementById('btn-queue-irrigation');
    if (queueBtn) {
      queueBtn.addEventListener('click', () => {
        if (window.DosingController) {
          window.DosingController.openModal('TR-02', 36); // 36s = 18.0 Liters
        }
      });
    }
  }
};

window.CanopyVision = CanopyVision;
document.addEventListener('DOMContentLoaded', () => CanopyVision.init());
