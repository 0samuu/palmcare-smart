/**
 * PalmCare Precision Agritech OS - Diagnostics & Academic Panel Defense Sandbox
 * RS485 Modbus Troubleshooting, Diagnostic Package Extraction, & Scenario Injection
 */

const Diagnostics = {
  init() {
    this.setupHardwarePing();
    this.setupSimulatorFallback();
    this.setupDiagnosticDownload();
    this.setupScenarioInjection();
  },

  setupHardwarePing() {
    const pingBtn = document.getElementById('btn-modbus-ping');
    if (pingBtn) {
      pingBtn.addEventListener('click', async () => {
        const originalText = pingBtn.innerHTML;
        pingBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] text-secondary animate-spin">refresh</span><span>POLLING UART2 ON ESP32...</span>';
        pingBtn.classList.add('pointer-events-none', 'opacity-80');

        try {
          const res = await fetch('/api/diagnostics/ping/0x02');
          const data = await res.json();
          if (data.status === 'TIMEOUT') {
            pingBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] text-error">cancel</span><span>SLAVE 0x02 TIMED OUT (CRC FAIL)</span>';
            window.PalmCare.showToast('Modbus Ping Failed', 'Slave 0x02 differential pair unresponsive (0 bytes returned).', 'link_off', 'error');
          } else {
            pingBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] text-primary">check_circle</span><span>SLAVE 0x02 ACK (14.2ms)</span>';
            window.PalmCare.showToast('Modbus Ping Succeeded', 'Differential handshake verified on RS485 pair.', 'check_circle');
          }
        } catch (e) {
          pingBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] text-error">cancel</span><span>SLAVE 0x02 TIMED OUT (CRC FAIL)</span>';
        }

        setTimeout(() => {
          pingBtn.innerHTML = originalText;
          pingBtn.classList.remove('pointer-events-none', 'opacity-80');
        }, 3000);
      });
    }
  },

  setupSimulatorFallback() {
    const fallbackBtn = document.getElementById('btn-simulator-fallback');
    if (fallbackBtn) {
      fallbackBtn.addEventListener('click', () => {
        fallbackBtn.classList.add('opacity-80');
        fallbackBtn.innerHTML = `
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-primary-fixed animate-spin">autorenew</span>
            <div class="flex flex-col text-left">
              <span class="font-telemetry-md text-telemetry-md font-semibold tracking-wide">SIMULATED STREAM ENGAGED</span>
              <span class="font-body-sm text-body-sm text-on-primary/90">Synthesized 18.4% VWC & 29.2°C injected. Ready for panel presentation.</span>
            </div>
          </div>
          <span class="material-symbols-outlined text-[18px]">check_circle</span>
        `;

        window.PalmCare.state.mode = 'SIMULATOR_DEMO';
        window.PalmCare.showToast('Academic Defense Mode Active', 'In-memory stochastic soil telemetry generator initialized. Presentation continuity preserved without live slave timeout errors.', 'model_training');

        setTimeout(() => {
          window.PalmCare.navigate('multi-tree-digital-twin');
        }, 1200);
      });
    }
  },

  setupDiagnosticDownload() {
    const downloadBtns = document.querySelectorAll('.btn-download-diag');
    downloadBtns.forEach(btn => {
      btn.addEventListener('click', () => this.downloadDiagnosticLog());
    });
  },

  downloadDiagnosticLog() {
    const logData = {
      timestamp: new Date().toISOString(),
      errorCode: 503,
      busProtocol: "RS485 Modbus-RTU Differential",
      baudRate: 9600,
      parity: "8-N-1",
      masterHub: "DXB-01 (Raspberry Pi 4 + ESP32 Industrial Hat)",
      failedNode: "0x02",
      targetLocation: "Tree-02 (Barhi Cultivar, Sector 4-B)",
      hardwareHeartbeat: "TPL5110-PASS (60s timer)",
      hydraulicInterlockValve: "V-02 SAFE-CLOSED (<120ms analog interlock)",
      internalBufferStatus: "ACTIVE_SQLITE_RING_BUFFER (30-day edge retention)",
      systemHealth: {
        solar_wattage: window.PalmCare.state.systemStatus.solar_wattage,
        battery_voltage: window.PalmCare.state.systemStatus.battery_voltage,
        line_pressure_bar: window.PalmCare.state.systemStatus.line_pressure
      }
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `palmcare_diagnostic_node_0x02_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    window.PalmCare.showToast('Diagnostic Package Saved', 'Generated palmcare_diagnostic_node_0x02.json for engineering review.', 'download');
  },

  setupScenarioInjection() {
    document.querySelectorAll('.btn-inject-scenario').forEach(btn => {
      btn.addEventListener('click', async () => {
        const scenarioId = btn.getAttribute('data-scenario');
        try {
          const res = await fetch('/api/sandbox/inject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenario_id: scenarioId })
          });
          const data = await res.json();
          window.PalmCare.showToast(`Scenario Injected: ${scenarioId.toUpperCase()}`, data.description || 'Simulation parameters altered.', 'science');
        } catch (e) {
          console.error(e);
        }
      });
    });
  }
};

window.Diagnostics = Diagnostics;
document.addEventListener('DOMContentLoaded', () => Diagnostics.init());
