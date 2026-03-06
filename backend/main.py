import csv
import os
import asyncio
import random
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from routes import overview, anomalies, budget_flow, lapse, reallocation, collusion, anomaly_engine, ml_lapse, budget_dna, ddo_benchmarks, schemes, budget_map, vendors
# Commenting out model loader due to TensorFlow version conflicts
# from model_loader import model_loader

# ── Paths ────────────────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent / "data"

# ── Load CSVs once at startup into module-level dicts ────────────────────────
def load_csv(filename: str) -> list[dict]:
    path = DATA_DIR / filename
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

print("Loading data...")
DATA = {
    "departments":    load_csv("department.csv"),
    "ddos":           load_csv("ddo_accounts.csv"),
    "vendors":        load_csv("vendors.csv"),
    "allocations":    load_csv("budget_allocations.csv"),
    "transactions":          load_csv("transactions.csv"),
    "alerts":                load_csv("intelligence_alerts.csv"),
    "welfare_schemes":     load_csv("welfare_schemes.csv"),
    "scheme_disbursements": load_csv("scheme_disbursements.csv"),
}
print(f"  departments:  {len(DATA['departments'])}")
print(f"  ddos:         {len(DATA['ddos'])}")
print(f"  vendors:      {len(DATA['vendors'])}")
print(f"  allocations:  {len(DATA['allocations'])}")
print(f"  transactions:         {len(DATA['transactions'])}")
print(f"  alerts:               {len(DATA['alerts'])}")
print(f"  welfare_schemes:      {len(DATA['welfare_schemes'])}")
print(f"  scheme_disbursements: {len(DATA['scheme_disbursements'])}")
print("Data loaded. Starting server...")

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="Budget Flow Intelligence API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inject DATA into each route module
overview.DATA       = DATA
anomalies.DATA      = DATA
budget_flow.DATA    = DATA
lapse.DATA          = DATA
reallocation.DATA   = DATA
collusion.DATA      = DATA
anomaly_engine.DATA  = DATA
ml_lapse.DATA        = DATA
budget_dna.DATA      = DATA
ddo_benchmarks.DATA  = DATA
schemes.DATA         = DATA
budget_map.DATA      = DATA
vendors.DATA         = DATA

# Inject model loader into routes (disabled due to TF version conflicts)
# anomaly_engine.model_loader = model_loader
# ml_lapse.model_loader = model_loader
# budget_flow.model_loader = model_loader

# ── Register routers ─────────────────────────────────────────────────────────
app.include_router(overview.router,       prefix="/api")
app.include_router(anomalies.router,      prefix="/api")
app.include_router(anomaly_engine.router, prefix="/api")
app.include_router(budget_flow.router,    prefix="/api")
app.include_router(lapse.router,          prefix="/api")
app.include_router(reallocation.router,   prefix="/api")
app.include_router(collusion.router,       prefix="/api")
app.include_router(ml_lapse.router,        prefix="/api")
app.include_router(budget_dna.router,      prefix="/api")
app.include_router(ddo_benchmarks.router,  prefix="/api")
app.include_router(budget_map.router,      prefix="/api")
app.include_router(schemes.router,         prefix="/api")
app.include_router(vendors.router,         prefix="/api")

# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "rows_loaded": {k: len(v) for k, v in DATA.items()}}

# ── WebSocket — live anomaly feed (replays real alerts every 4s) ─────────────
@app.websocket("/ws/live-feed")
async def live_feed(ws: WebSocket):
    await ws.accept()
    
    # Build lookup maps
    dept_map = {d["id"]: d for d in DATA["departments"]}
    tx_map = {t["id"]: t for t in DATA["transactions"]}
    
    alerts = DATA["alerts"]
    high_alerts = [a for a in alerts if a.get("confidence_score", "0") and float(a.get("confidence_score", 0)) > 0.7]
    pool = high_alerts if high_alerts else alerts
    
    try:
        while True:
            alert = random.choice(pool)
            
            # Enrich alert with department name, severity, and amount
            dept_id = alert.get("dept_id", "1")
            dept = dept_map.get(dept_id, {"name": "Unknown Department"})
            
            # Get transaction amount
            tx_id = alert.get("tx_id", "")
            tx = tx_map.get(tx_id, {})
            amount_str = tx.get("amount", "0")
            amount_cr = float(amount_str) / 10000000 if amount_str else 0
            
            # Calculate severity based on confidence score
            confidence = float(alert.get("confidence_score", 0.5))
            if confidence >= 0.9:
                severity = "CRITICAL"
            elif confidence >= 0.8:
                severity = "HIGH"
            elif confidence >= 0.6:
                severity = "MEDIUM"
            else:
                severity = "LOW"
            
            # Construct enriched alert
            enriched_alert = {
                "id": alert.get("alert_id", ""),
                "timestamp": alert.get("timestamp", ""),
                "department": dept["name"],
                "type": alert.get("alert_type", "Anomaly"),
                "severity": severity,
                "amount": amount_cr,
                "description": alert.get("description", "Anomaly detected"),
                "confidence_score": confidence
            }
            
            await ws.send_json({"type": "new_anomaly", "data": enriched_alert})
            await asyncio.sleep(4)
    except WebSocketDisconnect:
        pass
