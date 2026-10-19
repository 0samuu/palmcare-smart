import time
import math
import random
from datetime import datetime

class AgritechSimulator:
    def __init__(self):
        self.mode = "LIVE SENSORS"
        self.emergency_stop = False
        self.emergency_reason = ""
        self.interlock_active = True
        self.analog_pressure = 2.10
        self.line_flow = 0.50
        self.solar_wattage = 17.5
        self.battery_voltage = 12.6
        self.battery_pct = 94.0
        self.coral_tpu_temp = 48.2
        self.coral_inference_ms = 18.2
        self.coral_fps = 30.12
        self.modbus_ok = True
        self.active_scenario = "normal"
        
        # Microclimate Weather (Al Ain hyper-arid)
        self.weather = {
            "ambient_temp": 42.2,
            "relative_humidity": 18.4,
            "solar_irradiance": 985.0, # W/m2
            "wind_speed": 14.2, # km/h
            "vpd_kpa": 4.85, # Vapor Pressure Deficit
            "soil_bulk_density": 1.58 # g/cm3 Aeolian sand
        }
        
        # Digital Twins
        self.trees = {
            "TR-01": {
                "id": "TR-01",
                "name": "Tree-01 · Medjool",
                "age_years": 12,
                "node_id": "TRNK-MD-01",
                "status": "HEALTHY",
                "status_badge": "NOMINAL VIGOUR",
                "severity": "nominal",
                "vwc": 18.4, # Volumetric Water Content %
                "target_vwc": 20.0,
                "ec": 1420.0, # µS/cm
                "root_temp": 28.5,
                "ndvi": 0.81,
                "spad": 44.8,
                "droop_angle": 2.1,
                "canopy_asymmetry": 1.2,
                "chlorosis_conf": 4.2,
                "moisture_deficit": -8.0,
                "soil_profile": {
                    "horizon_a_vwc": 16.5,
                    "horizon_b_ec": 1420,
                    "horizon_c_vwc": 21.0
                },
                "nutrients": {
                    "n_ppm": 52,
                    "p_ppm": 24,
                    "k_ppm": 155,
                    "target_n": [45, 60],
                    "target_p": [20, 30],
                    "target_k": [140, 180]
                }
            },
            "TR-02": {
                "id": "TR-02",
                "name": "Tree-02 · Barhi",
                "age_years": 8,
                "node_id": "TRNK-BH-02",
                "status": "CRITICAL DEFICIT",
                "status_badge": "DESICCATION THREAT",
                "severity": "critical",
                "vwc": 7.8, # Volumetric Water Content % - permanent wilting point 12%
                "target_vwc": 20.0,
                "ec": 2920.0,
                "root_temp": 34.0,
                "ndvi": 0.54,
                "spad": 28.4,
                "droop_angle": 12.4, # +12.4 deg wilting
                "canopy_asymmetry": 8.7,
                "chlorosis_conf": 86.4,
                "moisture_deficit": -61.0,
                "soil_profile": {
                    "horizon_a_vwc": 6.2,
                    "horizon_b_ec": 2920,
                    "horizon_c_vwc": 14.8
                },
                "nutrients": {
                    "n_ppm": 14,
                    "p_ppm": 8,
                    "k_ppm": 60,
                    "target_n": [45, 60],
                    "target_p": [20, 30],
                    "target_k": [140, 180]
                }
            },
            "TR-03": {
                "id": "TR-03",
                "name": "Tree-03 · Khalas",
                "age_years": 15,
                "node_id": "TRNK-KH-03",
                "status": "NOMINAL",
                "status_badge": "NOMINAL VIGOUR",
                "severity": "nominal",
                "vwc": 16.2,
                "target_vwc": 20.0,
                "ec": 1890.0,
                "root_temp": 29.1,
                "ndvi": 0.77,
                "spad": 42.1,
                "droop_angle": -0.8,
                "canopy_asymmetry": 2.1,
                "chlorosis_conf": 6.8,
                "moisture_deficit": -19.0,
                "soil_profile": {
                    "horizon_a_vwc": 14.1,
                    "horizon_b_ec": 1890,
                    "horizon_c_vwc": 19.5
                },
                "nutrients": {
                    "n_ppm": 48,
                    "p_ppm": 22,
                    "k_ppm": 145,
                    "target_n": [45, 60],
                    "target_p": [20, 30],
                    "target_k": [140, 180]
                }
            }
        }
        
        # Acoustic RPW Sensor Data
        self.rpw_telemetry = {
            "sensor_active": True,
            "piezo_sample_rate_khz": 44.1,
            "fundamental_freq_hz": 120.5,
            "current_amplitude_db": -68.4, # Quiet baseline
            "larval_bite_count_per_min": 0,
            "infestation_risk": "NEGLIGIBLE",
            "triangulation_confidence": 0.0
        }
        
    def tick(self):
        """Simulate natural environmental micro-fluctuations every interval"""
        t = time.time()
        
        if not self.emergency_stop:
            # Fluctuate analog pressure within nominal range 2.08 to 2.13 Bar
            noise = math.sin(t * 0.8) * 0.03 + random.uniform(-0.01, 0.01)
            self.analog_pressure = round(2.10 + noise, 2)
        else:
            self.analog_pressure = 0.0
            
        # Solar wattage fluctuations
        self.solar_wattage = round(17.5 + math.sin(t * 0.2) * 0.3 + random.uniform(-0.1, 0.1), 1)
        self.weather["ambient_temp"] = round(42.0 + math.sin(t * 0.1) * 0.4, 1)
        self.weather["vpd_kpa"] = round(4.8 + math.sin(t * 0.1) * 0.1, 2)
        
        # Coral TPU inference micro-jitter
        self.coral_inference_ms = round(18.0 + random.uniform(-0.4, 0.5), 1)
        self.coral_fps = round(30.1 + random.uniform(-0.15, 0.15), 2)
        
    def apply_dosing(self, tree_id, conduit, duration_seconds, operator="Eng. Fatima"):
        """Execute precision fluid dosing and update soil moisture & nutrient twin"""
        if self.emergency_stop:
            return {"success": False, "message": "Emergency Stop is engaged. All solenoid pumps locked."}
            
        target_tree = self.trees.get(tree_id)
        if not target_tree:
            return {"success": False, "message": f"Tree {tree_id} not found."}
            
        # Volume delivered = duration * 0.5 L/s
        volume_liters = round(duration_seconds * 0.5, 1)
        
        # Physics model of volumetric recovery
        # 35 L elevates moisture by ~8.5% in rootzone
        vwc_boost = (volume_liters / 35.0) * 8.5
        target_tree["vwc"] = round(min(24.0, target_tree["vwc"] + vwc_boost), 1)
        target_tree["moisture_deficit"] = round(((target_tree["vwc"] - target_tree["target_vwc"]) / target_tree["target_vwc"]) * 100, 1)
        
        if conduit == "path-a": # Clean RO Water
            # Leaches salts
            target_tree["ec"] = max(1100.0, round(target_tree["ec"] - (volume_liters * 28.0), 1))
            target_tree["droop_angle"] = max(2.5, round(target_tree["droop_angle"] - (vwc_boost * 0.8), 1))
            if target_tree["vwc"] > 12.0:
                target_tree["status"] = "RECOVERING"
                target_tree["status_badge"] = "HYDRATION CYCLE ACTIVE"
                target_tree["severity"] = "warning"
                target_tree["chlorosis_conf"] = max(25.0, round(target_tree["chlorosis_conf"] - 30.0, 1))
        else: # Nutrient Chelate (Path B)
            # Boosts NPK & reverses chlorosis
            target_tree["nutrients"]["n_ppm"] = min(58, target_tree["nutrients"]["n_ppm"] + int(volume_liters * 1.8))
            target_tree["nutrients"]["p_ppm"] = min(28, target_tree["nutrients"]["p_ppm"] + int(volume_liters * 0.9))
            target_tree["nutrients"]["k_ppm"] = min(170, target_tree["nutrients"]["k_ppm"] + int(volume_liters * 4.2))
            target_tree["spad"] = round(min(45.0, target_tree["spad"] + 6.5), 1)
            target_tree["chlorosis_conf"] = max(18.0, round(target_tree["chlorosis_conf"] - 45.0, 1))
            if target_tree["vwc"] > 12.0:
                target_tree["status"] = "NUTRITION ENRICHED"
                target_tree["status_badge"] = "CHEST-CHELATE APPLIED"
                target_tree["severity"] = "nominal"
                
        # Update soil horizon values
        target_tree["soil_profile"]["horizon_a_vwc"] = round(target_tree["vwc"] * 0.85, 1)
        target_tree["soil_profile"]["horizon_b_ec"] = int(target_tree["ec"])
        target_tree["soil_profile"]["horizon_c_vwc"] = round(target_tree["vwc"] * 1.4, 1)
        
        return {
            "success": True,
            "tree_id": tree_id,
            "volume_liters": volume_liters,
            "duration": duration_seconds,
            "conduit": conduit,
            "new_vwc": target_tree["vwc"],
            "new_ec": target_tree["ec"],
            "operator": operator
        }
        
    def trigger_emergency_stop(self, reason="Manual Operator Trigger"):
        self.emergency_stop = True
        self.emergency_reason = reason
        self.interlock_active = False
        self.analog_pressure = 0.0
        return {"status": "EMERGENCY_STOP_ARMED", "timestamp": datetime.now().isoformat()}
        
    def reset_emergency_stop(self):
        self.emergency_stop = False
        self.emergency_reason = ""
        self.interlock_active = True
        self.analog_pressure = 2.10
        return {"status": "SYSTEM_RESTORED_NOMINAL", "timestamp": datetime.now().isoformat()}
        
    def inject_scenario(self, scenario_id):
        self.active_scenario = scenario_id
        if scenario_id == "rpw_infestation":
            # Simulate Acoustic Red Palm Weevil chewing noise spikes
            self.rpw_telemetry["current_amplitude_db"] = -22.4 # Massive spike
            self.rpw_telemetry["larval_bite_count_per_min"] = 48
            self.rpw_telemetry["infestation_risk"] = "CONFIRMED LARVAE DETECTED"
            self.rpw_telemetry["triangulation_confidence"] = 94.8
            return {"scenario": "rpw_infestation", "description": "Injected 120Hz acoustic biting signatures into Tree-02 Medjool trunk sensor probe."}
            
        elif scenario_id == "hydraulic_rupture":
            # Pipe burst
            self.analog_pressure = 0.42
            self.line_flow = 1.95 # Massive outflow
            return {"scenario": "hydraulic_rupture", "description": "Simulated mainline pipe rupture. Line pressure dropped below 0.8 Bar safety cutoff."}
            
        elif scenario_id == "thermal_shock":
            self.weather["ambient_temp"] = 49.6
            self.weather["relative_humidity"] = 9.8
            self.weather["vpd_kpa"] = 6.4
            self.trees["TR-02"]["droop_angle"] = 16.8
            return {"scenario": "thermal_shock", "description": "Desert thermal shockwave initiated (+49.6°C, RH 9.8%). Stomatal tension maximized."}
            
        elif scenario_id == "rs485_disconnect":
            self.modbus_ok = False
            return {"scenario": "rs485_disconnect", "description": "Simulated hardware severance on differential pair A+/B- (Slave 0x02 offline)."}
            
        else: # reset / normal
            self.modbus_ok = True
            self.analog_pressure = 2.10
            self.line_flow = 0.50
            self.rpw_telemetry["current_amplitude_db"] = -68.4
            self.rpw_telemetry["larval_bite_count_per_min"] = 0
            self.rpw_telemetry["infestation_risk"] = "NEGLIGIBLE"
            self.rpw_telemetry["triangulation_confidence"] = 0.0
            self.weather["ambient_temp"] = 42.2
            self.weather["relative_humidity"] = 18.4
            self.weather["vpd_kpa"] = 4.85
            return {"scenario": "normal", "description": "All telemetry reset to baseline calibration standards."}

simulator = AgritechSimulator()
