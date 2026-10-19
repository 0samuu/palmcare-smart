import sqlite3
import os
import json
from datetime import datetime, timedelta

if os.environ.get("VERCEL"):
    DB_PATH = "/tmp/palmcare.db"
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), "palmcare.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS telemetry_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        tree_id TEXT NOT NULL,
        vwc REAL NOT NULL,
        ec REAL NOT NULL,
        root_temp REAL NOT NULL,
        ambient_temp REAL NOT NULL,
        solar_irradiance REAL NOT NULL
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dosing_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        tree_id TEXT NOT NULL,
        conduit TEXT NOT NULL,
        duration INTEGER NOT NULL,
        volume_liters REAL NOT NULL,
        line_pressure REAL NOT NULL,
        operator TEXT NOT NULL,
        status TEXT NOT NULL
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_alarms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        severity TEXT NOT NULL,
        code TEXT NOT NULL,
        message TEXT NOT NULL,
        node TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        node TEXT NOT NULL,
        event_type TEXT NOT NULL,
        measured_value TEXT NOT NULL,
        interlock_status TEXT NOT NULL,
        operator TEXT NOT NULL
    )
    """)
    
    # Seed telemetry history if empty
    cursor.execute("SELECT COUNT(*) as count FROM telemetry_history")
    if cursor.fetchone()["count"] == 0:
        seed_telemetry(cursor)
        
    # Seed audit ledger if empty
    cursor.execute("SELECT COUNT(*) as count FROM audit_ledger")
    if cursor.fetchone()["count"] == 0:
        seed_ledger(cursor)
        
    # Seed initial active alarms
    cursor.execute("SELECT COUNT(*) as count FROM system_alarms")
    if cursor.fetchone()["count"] == 0:
        cursor.execute("""
        INSERT INTO system_alarms (timestamp, severity, code, message, node, active)
        VALUES 
        (datetime('now'), 'CRITICAL', 'ERR_MOIST_CRIT', 'Soil Moisture below permanent wilting point (7.8% VWC)', 'TRNK-BH-02', 1),
        (datetime('now', '-2 hours'), 'WARNING', 'WARN_CHLOROSIS', 'OpenCV ExG frond chlorosis detected (>86% conf)', 'MAST-OPTIC-4K-DXB', 1)
        """)
        
    conn.commit()
    conn.close()

def seed_telemetry(cursor):
    now = datetime.now()
    # 7 days of 6-hour interval points
    # Tree 02 depletion from 19.8% down to 7.8%
    tree2_vwc = [19.8, 18.5, 17.5, 16.1, 15.2, 13.5, 12.1, 10.8, 9.8, 9.1, 8.5, 8.2, 8.0, 7.8]
    tree1_vwc = [19.5, 19.2, 18.9, 18.8, 18.6, 18.5, 18.4, 18.4, 18.3, 18.4, 18.5, 18.4, 18.4, 18.4]
    tree3_vwc = [17.8, 17.4, 17.0, 16.9, 16.8, 16.7, 16.5, 16.4, 16.3, 16.2, 16.2, 16.3, 16.2, 16.2]
    
    for i in range(len(tree2_vwc)):
        ts = (now - timedelta(hours=(len(tree2_vwc) - 1 - i) * 12)).strftime("%Y-%m-%d %H:%M:%S")
        # Tree 02
        ec2 = 1800 + (19.8 - tree2_vwc[i]) * 95
        root2 = 30.0 + (i % 2) * 4.2
        cursor.execute("""
        INSERT INTO telemetry_history (timestamp, tree_id, vwc, ec, root_temp, ambient_temp, solar_irradiance)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (ts, "TR-02", tree2_vwc[i], round(ec2, 1), round(root2, 1), 41.5, 890.0))
        
        # Tree 01
        cursor.execute("""
        INSERT INTO telemetry_history (timestamp, tree_id, vwc, ec, root_temp, ambient_temp, solar_irradiance)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (ts, "TR-01", tree1_vwc[i], 1420.0, 28.5 + (i % 2) * 2.5, 41.5, 890.0))
        
        # Tree 03
        cursor.execute("""
        INSERT INTO telemetry_history (timestamp, tree_id, vwc, ec, root_temp, ambient_temp, solar_irradiance)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (ts, "TR-03", tree3_vwc[i], 1890.0, 29.1 + (i % 2) * 2.8, 41.5, 890.0))

def seed_ledger(cursor):
    events = [
        ("14:22:18 GST", "TRNK-BH-02-SOIL", "Moisture Interlock Triggered (<10%)", "7.8% VWC", "CRITICAL LOCKOUT", "AUTO_DAEMON_P0"),
        ("12:05:44 GST", "DRONE-CV-X4", "Canopy ExG Chlorosis detected", "ExG: -0.12 (Severe)", "Flagged for Spectral Radiometry Overlay", "OpenCV Edge AI"),
        ("09:14:02 GST", "HUB-DXB-RS485", "Modbus Ping Retried (Timeout 450ms)", "ACK 2nd Try", "Packet Resent // RS485 CRC OK", "Hardware Watchdog"),
        ("Yesterday 18:30", "HUB-DXB-RS485", "RS485 Bus Health Check", "Baud 115200 / 0 Err", "Routine Integrity Confirmed", "Supervisor Daemon"),
        ("72h ago (08:00)", "VFD-PUMP-04", "Last Scheduled Dosing Run", "15.0 L @ 2.1 Bar", "Sequence Completed Successfully", "Eng. Fatima (Auth #402)")
    ]
    for ts, node, ev, val, stat, op in events:
        cursor.execute("""
        INSERT INTO audit_ledger (timestamp, node, event_type, measured_value, interlock_status, operator)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (ts, node, ev, val, stat, op))

def log_dosing(tree_id, conduit, duration, volume_liters, line_pressure, operator="Eng. Fatima"):
    conn = get_db()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    INSERT INTO dosing_log (timestamp, tree_id, conduit, duration, volume_liters, line_pressure, operator, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED')
    """, (now_str, tree_id, conduit, duration, volume_liters, line_pressure, operator))
    
    # Also log to audit ledger
    conduit_label = "Clean RO Water (Path A)" if conduit == "path-a" else "Nutrient Chelate (Path B)"
    cursor.execute("""
    INSERT INTO audit_ledger (timestamp, node, event_type, measured_value, interlock_status, operator)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (datetime.now().strftime("%H:%M:%S GST"), f"VFD-PUMP-04 ({tree_id})", f"Precision Pulse: {conduit_label}", f"{volume_liters:.1f} L delivered", "ARMED & DISPATCHED", operator))
    
    conn.commit()
    conn.close()

def get_audit_ledger(limit=50):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_ledger ORDER BY id DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_telemetry_history(tree_id="TR-02"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM telemetry_history WHERE tree_id = ? ORDER BY id ASC", (tree_id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def get_dosing_logs(limit=20):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM dosing_log ORDER BY id DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows
