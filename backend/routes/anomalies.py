from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()
DATA = {}   # injected by main.py

SEVERITY_MAP = {
    "Phantom Utilization":    "HIGH",
    "Vendor Collusion Network": "HIGH",
    "Duplicate Payment":      "MEDIUM",
    "Year-End Rush":          "MEDIUM",
    "Inflated Procurement":   "MEDIUM",
    "Fund Parking":           "LOW",
}


def enrich(alert: dict) -> dict:
    score = float(alert.get("confidence_score", 0))
    atype = alert.get("alert_type", "")
    severity = SEVERITY_MAP.get(atype, "LOW")
    # Override with score if very high
    if score >= 0.90:
        severity = "HIGH"
    elif score >= 0.75:
        severity = "MEDIUM"
    return {**alert, "severity": severity}


@router.get("/anomalies")
def get_anomalies(
    severity: Optional[str] = Query(None),
    alert_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    alerts = [enrich(a) for a in DATA["alerts"]]

    if severity:
        alerts = [a for a in alerts if a["severity"] == severity.upper()]
    if alert_type:
        alerts = [a for a in alerts if a["alert_type"] == alert_type]

    # Sort by confidence descending
    alerts.sort(key=lambda x: float(x.get("confidence_score", 0)), reverse=True)

    total  = len(alerts)
    start  = (page - 1) * page_size
    paged  = alerts[start: start + page_size]

    # Summary counts
    type_counts = {}
    for a in DATA["alerts"]:
        t = a.get("alert_type", "Unknown")
        type_counts[t] = type_counts.get(t, 0) + 1

    return {
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "type_counts": type_counts,
        "data":        paged,
    }


@router.get("/anomalies/summary")
def get_anomaly_summary():
    alerts = [enrich(a) for a in DATA["alerts"]]
    severity_counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for a in alerts:
        severity_counts[a["severity"]] = severity_counts.get(a["severity"], 0) + 1
    type_counts = {}
    for a in alerts:
        t = a.get("alert_type", "Unknown")
        type_counts[t] = type_counts.get(t, 0) + 1
    return {"severity_counts": severity_counts, "type_counts": type_counts}
