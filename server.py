import os
import asyncio
import json
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

import database
from simulator import simulator

app = FastAPI(title="PalmCare Precision Agritech OS", version="4.2.1")

# Initialize database
database.init_db()

# Mount static folder
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Request Models
class DosingRequest(BaseModel):
    tree_id: str
    conduit: str # 'path-a' or 'path-b'
    duration: int # 5 to 60 seconds
    authorized: bool = True
    operator: str = "Eng. Fatima"

class ScenarioRequest(BaseModel):
    scenario_id: str # 'rpw_infestation', 'hydraulic_rupture', 'thermal_shock', 'rs485_disconnect', 'normal'

class EmergencyRequest(BaseModel):
    reason: str = "Operator Manual Halt"

# Routes
@app.get("/")
async def serve_index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    return FileResponse(index_path)

@app.get("/api/status")
async def get_system_status():
    simulator.tick()
    return {
        "hub_id": "Master Hub DXB-01",
        "sector": "Sector 4 — Al Ain Date Grove",
        "mode": simulator.mode,
        "solar_wattage": simulator.solar_wattage,
        "battery_voltage": simulator.battery_voltage,
        "battery_pct": simulator.battery_pct,
        "line_pressure": simulator.analog_pressure,
        "line_flow": simulator.line_flow,
        "modbus_ok": simulator.modbus_ok,
        "interlock_active": simulator.interlock_active,
        "emergency_stop": simulator.emergency_stop,
        "emergency_reason": simulator.emergency_reason,
        "coral_tpu": {
            "accelerator": "Coral Edge TPU",
            "status": "ACTIVE",
            "inference_ms": simulator.coral_inference_ms,
            "fps": simulator.coral_fps,
            "pipeline": "YOLOv8-AGRI-EXP4 INT8",
            "framework": "OPENCV 4.9-ARM"
        },
        "weather": simulator.weather,
        "rpw_acoustic": simulator.rpw_telemetry,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/trees")
async def get_trees():
    return list(simulator.trees.values())

@app.get("/api/trees/{tree_id}")
async def get_tree(tree_id: str):
    if tree_id not in simulator.trees:
        raise HTTPException(status_code=404, detail="Tree not found")
    return simulator.trees[tree_id]

@app.get("/api/trees/{tree_id}/history")
async def get_tree_history(tree_id: str):
    history = database.get_telemetry_history(tree_id)
    return {
        "tree_id": tree_id,
        "points": history
    }

@app.post("/api/dosing")
async def execute_dosing(req: DosingRequest):
    if not req.authorized:
        raise HTTPException(status_code=400, detail="Supervisor GS-402 safety authorization required.")
    
    res = simulator.apply_dosing(
        tree_id=req.tree_id,
        conduit=req.conduit,
        duration_seconds=req.duration,
        operator=req.operator
    )
    
    if not res["success"]:
        raise HTTPException(status_code=400, detail=res["message"])
        
    # Log to SQLite
    database.log_dosing(
        tree_id=req.tree_id,
        conduit=req.conduit,
        duration=req.duration,
        volume_liters=res["volume_liters"],
        line_pressure=simulator.analog_pressure,
        operator=req.operator
    )
    
    return res

@app.post("/api/safety/emergency-stop")
async def emergency_stop(req: EmergencyRequest):
    res = simulator.trigger_emergency_stop(req.reason)
    return res

@app.post("/api/safety/reset")
async def reset_emergency():
    res = simulator.reset_emergency_stop()
    return res

@app.post("/api/sandbox/inject")
async def inject_sandbox_scenario(req: ScenarioRequest):
    res = simulator.inject_scenario(req.scenario_id)
    return res

@app.get("/api/ledger")
async def get_audit_ledger():
    rows = database.get_audit_ledger()
    return rows

@app.get("/api/diagnostics/ping/{slave_id}")
async def ping_slave(slave_id: str):
    await asyncio.sleep(0.6) # simulate UART latency
    if not simulator.modbus_ok or slave_id == "0x02":
        return {
            "slave_id": slave_id,
            "status": "TIMEOUT",
            "bytes_received": 0,
            "bus_error": "NO MODBUS ECHO: CRC FAIL (Timeout 1,500ms x 3)",
            "success": False
        }
    return {
        "slave_id": slave_id,
        "status": "ACK",
        "bytes_received": 16,
        "latency_ms": 14.2,
        "success": True
    }

@app.post("/api/cv/snapshot")
async def trigger_cv_snapshot():
    await asyncio.sleep(0.5)
    filename = f"Sector4_RAW_{datetime.now().strftime('%H%M%S')}.DNG"
    return {
        "success": True,
        "filename": filename,
        "resolution": "3840x2160 (4K)",
        "sensor": "MAST-OPTIC-4K-DXB",
        "message": f"Snapshot saved successfully ({filename})"
    }

@app.post("/api/cv/batch")
async def trigger_cv_batch():
    await asyncio.sleep(0.7)
    return {
        "success": True,
        "processed_trees": 9,
        "anomalies_flagged": 1,
        "target_anomaly": "Tree-02 (Barhi)",
        "inference_avg_ms": simulator.coral_inference_ms,
        "message": "9/9 Trees phenotyped across Sector 4. Anomaly isolated to Tree-02."
    }

# WebSocket for real-time telemetry streaming
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            simulator.tick()
            payload = {
                "status": {
                    "solar_wattage": simulator.solar_wattage,
                    "battery_voltage": simulator.battery_voltage,
                    "line_pressure": simulator.analog_pressure,
                    "line_flow": simulator.line_flow,
                    "emergency_stop": simulator.emergency_stop,
                    "modbus_ok": simulator.modbus_ok,
                    "inference_ms": simulator.coral_inference_ms,
                    "fps": simulator.coral_fps,
                    "ambient_temp": simulator.weather["ambient_temp"],
                    "vpd": simulator.weather["vpd_kpa"]
                },
                "trees": {
                    "TR-01": simulator.trees["TR-01"],
                    "TR-02": simulator.trees["TR-02"],
                    "TR-03": simulator.trees["TR-03"]
                },
                "rpw": simulator.rpw_telemetry,
                "timestamp": datetime.now().strftime("%H:%M:%S")
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(1.5)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    print("Starting PalmCare Precision Agritech Server on http://127.0.0.1:8000 ...")
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
