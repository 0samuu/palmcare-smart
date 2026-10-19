# PalmCare — Precision Agritech OS (v4.2)
### Cybernetic Date Palm Health & Precision Intervention Cluster

PalmCare is an enterprise IoT Precision Agritech OS designed for commercial date palm plantations in hyper-arid desert climates (such as the Al Ain Plantation Sector 4, Liwa, and Sweihan groves in the United Arab Emirates).

---

## Architecture Overview

The system combines:
1. **Python FastAPI Backend (`server.py`)**:
   - Asynchronous RESTful API for telemetry, solenoid controls, diagnostics, and sandbox scenarios.
   - Live WebSocket stream (`/ws/telemetry`) streaming sensor updates to connected terminals.
   - SQLite persistence (`database.py`) maintaining an immutable agronomic audit ledger and 30-day ring buffer.
   - Agritech Environmental Simulator (`simulator.py`) modeling diurnal soil moisture flux, salinity accumulation, stomatal conductance, and acoustic Red Palm Weevil (RPW) larval detection.

2. **Responsive Single-Page Application (`static/`)**:
   - Modern, responsive UI with mobile drawer menu, sticky telemetry header, and emergency safety footer.
   - **Multi-Tree Digital Twin Studio**: 7-day soil moisture depletion curve with wilting threshold (12% VWC), interactive diurnal scrubber, ion-selective electrode (ISE) NPK radar chart, and lithological soil profile.
   - **Canopy Vision & OpenCV Edge Phenotyping Lab**: Multi-filter viewport (Raw RGB 4K, HSV Chlorosis Frond Mask, ExG Heatmap), draggable split-comparison slider, zoom controls, and Coral TPU INT8 inference metrics.
   - **Precision Fluid Dosing Controller**: Dual-manifold conduit selection (Clean RO Water vs. Nutrient Chelate), pulse duration timer (5s to 60s hard firmware cap), and UAE GS-402 safety interlocks.
   - **Hardware Diagnostics & Error 503 Console**: RS-485 Modbus RTU differential pair diagnostics, live UART polling, and JSON diagnostic package extractor.
   - **Academic Panel Defense Sandbox**: Live fault injection (Acoustic RPW infestation, hydraulic line rupture, desert thermal shockwave, Modbus cable cut) and technical defense notes.
   - **Role & Persona Switcher**: Instant switching between Supervisor (Eng. Fatima), Field Caretaker (Rashid), Farm Owner (M. Al-Zaabi), and System Admin (Tariq).

---

## Quick Start

### 1. Requirements
Ensure Python 3.10+ is installed. Dependencies:
```bash
pip install -r requirements.txt
```

### 2. Launch the Application
Run the launcher:
```bash
python run.py
```
Or directly with uvicorn:
```bash
uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Open in Browser
- **Web Application UI**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive OpenAPI Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Current Master Hub DXB-01 telemetry (solar, battery, pressure, TPU) |
| `GET` | `/api/trees` | List all date palm specimen twins (Medjool, Barhi, Khalas) |
| `GET` | `/api/trees/{id}` | Detailed twin data for a specific tree |
| `GET` | `/api/trees/{id}/history` | 7-day historical diurnal soil moisture points |
| `POST` | `/api/dosing` | Execute precision fluid pulse (Tree, conduit, duration, auth) |
| `POST` | `/api/safety/emergency-stop` | Instantaneous emergency electrical pump trip |
| `POST` | `/api/safety/reset` | Re-arm analog pressure interlock to 2.1 Bar nominal |
| `POST` | `/api/sandbox/inject` | Inject anomaly scenarios (RPW, rupture, heatwave, cable cut) |
| `GET` | `/api/ledger` | Audit ledger events |
| `GET` | `/api/diagnostics/ping/{slave_id}` | RS485 Modbus RTU ping test to satellite probe |
| `POST` | `/api/cv/snapshot` | Trigger 4K raw frame capture |
| `POST` | `/api/cv/batch` | Run batch inference on edge accelerator |
| `WS` | `/ws/telemetry` | Real-time sensor telemetry WebSocket stream |
