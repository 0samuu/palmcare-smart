/**
 * PalmCare Precision Agritech OS - Multi-Tree Digital Twin Studio
 * Time-series Soil Depletion Scrubber, NPK Radar Polygon, Soil Stratum, & Event Ledger
 */

const DigitalTwin = {
  activeTreeId: 'TR-02',
  timeScale: '7d', // '12h', '24h', '7d'
  scrubDay: 7, // 1 to 7

  init() {
    this.setupTreeSelector();
    this.setupScrubber();
    this.setupLedgerActions();
    this.setupDosingTrigger();
    this.render();
  },

  refresh() {
    this.render();
  },

  setupTreeSelector() {
    document.querySelectorAll('.tree-selector-card').forEach(card => {
      card.addEventListener('click', () => {
        const treeId = card.getAttribute('data-tree-id');
        this.selectTree(treeId);
      });
    });
  },

  selectTree(treeId) {
    this.activeTreeId = treeId;
    window.PalmCare.state.selectedTreeId = treeId;

    // Highlight selected card
    document.querySelectorAll('.tree-selector-card').forEach(card => {
      const id = card.getAttribute('data-tree-id');
      if (id === treeId) {
        card.className = 'tree-selector-card relative p-4 rounded-xl bg-surface-container-lowest shadow-md ring-2 ring-primary transition-all cursor-pointer';
      } else {
        card.className = 'tree-selector-card group relative p-4 rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all cursor-pointer';
      }
    });

    this.render();
  },

  setupScrubber() {
    const scrubber = document.getElementById('time-scrubber');
    if (scrubber) {
      scrubber.addEventListener('input', (e) => {
        this.scrubDay = parseInt(e.target.value, 10);
        this.updateScrubberDisplay();
      });
    }

    // Time scale filters
    document.querySelectorAll('.btn-timescale').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-timescale').forEach(b => {
          b.className = 'btn-timescale px-2.5 py-1 rounded bg-surface-container font-label-caps text-label-caps text-on-surface hover:bg-surface-variant';
        });
        btn.className = 'btn-timescale px-2.5 py-1 rounded bg-primary text-on-primary font-label-caps text-label-caps font-bold';
        this.timeScale = btn.getAttribute('data-scale');
        window.PalmCare.showToast('Time Domain Rescaled', `Telemetry viewport focused on ${this.timeScale.toUpperCase()} diurnal window.`, 'timeline');
      });
    });
  },

  updateScrubberDisplay() {
    const tree = window.PalmCare.state.trees[this.activeTreeId] || {};
    const tooltip = document.getElementById('scrubber-live-tooltip');
    if (!tooltip) return;

    const dayOffset = 8 - this.scrubDay;
    const dayLabel = this.scrubDay === 7 ? 'TODAY (NOW)' : `DAY -${dayOffset}`;
    
    // Estimate VWC based on curve
    let estimatedVwc = tree.vwc || 7.8;
    if (this.activeTreeId === 'TR-02') {
      const curve = [19.8, 17.5, 15.2, 12.1, 9.8, 8.5, 7.8];
      estimatedVwc = curve[this.scrubDay - 1];
    }
    
    const matricTension = (-10 - (20 - estimatedVwc) * 6.2).toFixed(1);

    tooltip.innerHTML = `
      <span class="text-primary font-bold">${dayLabel}:</span> 
      VWC: <strong class="${estimatedVwc < 12 ? 'text-error' : 'text-on-surface'}">${estimatedVwc}%</strong> · 
      Matric Suction: <strong class="text-tertiary">${matricTension} kPa</strong>
    `;
  },

  setupDosingTrigger() {
    const openBtn = document.getElementById('open-dosing-btn');
    if (openBtn) {
      openBtn.addEventListener('click', () => {
        if (window.DosingController) {
          window.DosingController.openModal(this.activeTreeId);
        }
      });
    }
  },

  setupLedgerActions() {
    const exportBtn = document.getElementById('btn-export-ledger');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportCSV());
    }

    const dossierBtn = document.getElementById('btn-panel-dossier');
    if (dossierBtn) {
      dossierBtn.addEventListener('click', () => this.generateDossier());
    }
  },

  render() {
    const tree = window.PalmCare.state.trees[this.activeTreeId];
    if (!tree) return;

    // Header updates
    const titleEl = document.getElementById('twin-matrix-title');
    if (titleEl) titleEl.innerText = `Twin Matrix // ${tree.id} (${tree.name.split('·')[1]?.trim() || ''})`;

    const alertBadge = document.getElementById('twin-matrix-alert-badge');
    if (alertBadge) {
      if (tree.severity === 'critical') {
        alertBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error/10 text-error font-label-caps text-label-caps font-bold animate-pulse';
        alertBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-error"></span>CRITICAL HYDRAULIC DEFICIT (${tree.vwc}% VWC)`;
      } else {
        alertBadge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-label-caps font-bold';
        alertBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-primary"></span>NOMINAL CANOPY VIGOUR (${tree.vwc}% VWC)`;
      }
    }

    // Telemetry Pills
    const vwcPill = document.getElementById('twin-pill-vwc');
    if (vwcPill) {
      vwcPill.innerHTML = `Soil Moisture (VWC): <strong class="${tree.vwc < 12 ? 'text-error' : 'text-primary'} font-bold">${tree.vwc}%</strong> (${tree.moisture_deficit}%)`;
    }

    const ecPill = document.getElementById('twin-pill-ec');
    if (ecPill) {
      ecPill.innerHTML = `Pore Salinity EC: <strong class="text-on-surface font-bold">${tree.ec.toLocaleString()} µS/cm</strong>`;
    }

    const rootPill = document.getElementById('twin-pill-root');
    if (rootPill) {
      rootPill.innerHTML = `Sub-Soil Root Temp: <strong class="text-on-surface font-bold">${tree.root_temp}°C</strong>`;
    }

    // Update NPK Radar Polygon
    this.renderRadar(tree.nutrients);

    // Update NPK Readout bars
    this.renderNutrientBars(tree.nutrients);

    // Update Lithology Horizon numbers
    this.renderLithology(tree.soil_profile);
  },

  renderRadar(nutrients) {
    if (!nutrients) return;
    const n = Math.min(65, nutrients.n_ppm || 14);
    const p = Math.min(35, nutrients.p_ppm || 8);
    const k = Math.min(190, nutrients.k_ppm || 60);

    // Compute triangle coordinates relative to center (120, 120)
    // Nitrogen: top vertex (y varies between 20 and 120)
    const nRatio = n / 60.0;
    const ny = Math.round(120 - (nRatio * 100));

    // Phosphorus: bottom-right vertex (x toward 215, y toward 190)
    const pRatio = p / 30.0;
    const px = Math.round(120 + (pRatio * 95));
    const py = Math.round(120 + (pRatio * 70));

    // Potassium: bottom-left vertex (x toward 25, y toward 190)
    const kRatio = k / 180.0;
    const kx = Math.round(120 - (kRatio * 95));
    const ky = Math.round(120 + (kRatio * 70));

    const polygon = document.getElementById('radar-measured-polygon');
    if (polygon) {
      polygon.setAttribute('points', `120,${ny} ${px},${py} ${kx},${ky}`);
      if (n < 30 || p < 15 || k < 100) {
        polygon.setAttribute('stroke', '#ba1a1a');
        polygon.setAttribute('fill', 'rgba(186, 26, 26, 0.25)');
      } else {
        polygon.setAttribute('stroke', '#2d6a4f');
        polygon.setAttribute('fill', 'rgba(45, 106, 79, 0.25)');
      }
    }

    // Nodes
    const nodeN = document.getElementById('radar-node-n');
    if (nodeN) { nodeN.setAttribute('cx', 120); nodeN.setAttribute('cy', ny); }
    const nodeP = document.getElementById('radar-node-p');
    if (nodeP) { nodeP.setAttribute('cx', px); nodeP.setAttribute('cy', py); }
    const nodeK = document.getElementById('radar-node-k');
    if (nodeK) { nodeK.setAttribute('cx', kx); nodeK.setAttribute('cy', ky); }
  },

  renderNutrientBars(nutrients) {
    if (!nutrients) return;
    const n = nutrients.n_ppm || 14;
    const p = nutrients.p_ppm || 8;
    const k = nutrients.k_ppm || 60;

    // Nitrogen
    const nVal = document.getElementById('val-nutrient-n');
    const nBar = document.getElementById('bar-nutrient-n');
    const nBadge = document.getElementById('badge-nutrient-n');
    if (nVal) nVal.innerHTML = `${n} <span class="text-body-sm font-normal text-outline">PPM</span>`;
    if (nBar) nBar.style.width = `${Math.min(100, (n / 60) * 100)}%`;
    if (nBadge) {
      nBadge.innerText = n < 30 ? 'DEFICIENT' : (n > 60 ? 'HIGH' : 'OPTIMAL');
      nBadge.className = n < 30 ? 'px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-caps text-label-caps font-bold' : 'px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-caps text-label-caps font-bold';
    }

    // Phosphorus
    const pVal = document.getElementById('val-nutrient-p');
    const pBar = document.getElementById('bar-nutrient-p');
    const pBadge = document.getElementById('badge-nutrient-p');
    if (pVal) pVal.innerHTML = `${p} <span class="text-body-sm font-normal text-outline">PPM</span>`;
    if (pBar) pBar.style.width = `${Math.min(100, (p / 30) * 100)}%`;
    if (pBadge) {
      pBadge.innerText = p < 15 ? 'DEFICIENT' : 'OPTIMAL';
      pBadge.className = p < 15 ? 'px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-caps text-label-caps font-bold' : 'px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-caps text-label-caps font-bold';
    }

    // Potassium
    const kVal = document.getElementById('val-nutrient-k');
    const kBar = document.getElementById('bar-nutrient-k');
    const kBadge = document.getElementById('badge-nutrient-k');
    if (kVal) kVal.innerHTML = `${k} <span class="text-body-sm font-normal text-outline">PPM</span>`;
    if (kBar) kBar.style.width = `${Math.min(100, (k / 180) * 100)}%`;
    if (kBadge) {
      kBadge.innerText = k < 100 ? 'DEPLETED' : 'OPTIMAL';
      kBadge.className = k < 100 ? 'px-2 py-0.5 rounded bg-tertiary-container text-on-tertiary-container font-label-caps text-label-caps font-bold' : 'px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-caps text-label-caps font-bold';
    }
  },

  renderLithology(soilProfile) {
    if (!soilProfile) return;
    const vwcA = document.getElementById('soil-vwc-horizon-a');
    if (vwcA) vwcA.innerText = `VWC: ${soilProfile.horizon_a_vwc || 6.2}%`;
    const ecB = document.getElementById('soil-ec-horizon-b');
    if (ecB) ecB.innerText = `${soilProfile.horizon_b_ec || 2920} µS/cm`;
    const vwcC = document.getElementById('soil-vwc-horizon-c');
    if (vwcC) vwcC.innerText = `VWC: ${soilProfile.horizon_c_vwc || 14.8}%`;
  },

  updateFromLiveTelemetry(trees) {
    // Update live trees in state
    if (trees[this.activeTreeId]) {
      this.render();
    }
  },

  exportCSV() {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Timestamp,Telemetry Node,Event Classification,Measured Value,Interlock Status,Operator\n"
      + "14:22:18 GST,TRNK-BH-02-SOIL,Moisture Interlock Triggered (<10%),7.8% VWC,CRITICAL LOCKOUT,AUTO_DAEMON_P0\n"
      + "12:05:44 GST,DRONE-CV-X4,Canopy ExG Chlorosis detected,ExG: -0.12 (Severe),Flagged for Spectral Overlay,OpenCV Edge AI\n"
      + "09:14:02 GST,HUB-DXB-RS485,Modbus Ping Retried,ACK 2nd Try,Packet Resent CRC OK,Hardware Watchdog\n"
      + "Yesterday 18:30,HUB-DXB-RS485,RS485 Bus Health Check,Baud 115200 / 0 Err,Routine Integrity Confirmed,Supervisor Daemon\n"
      + "72h ago (08:00),VFD-PUMP-04,Last Scheduled Dosing Run,15.0 L @ 2.1 Bar,Sequence Completed,Eng. Fatima\n";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `palmcare_${this.activeTreeId}_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.PalmCare.showToast('CSV Export Ready', `Downloaded audit ledger records for ${this.activeTreeId}.`, 'download');
  },

  generateDossier() {
    const modal = document.getElementById('dossier-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  },

  closeDossier() {
    const modal = document.getElementById('dossier-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }
};

window.DigitalTwin = DigitalTwin;
document.addEventListener('DOMContentLoaded', () => DigitalTwin.init());
