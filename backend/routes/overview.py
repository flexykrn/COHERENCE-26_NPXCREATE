from fastapi import APIRouter

router = APIRouter()
DATA = {}   # injected by main.py


@router.get("/overview")
def get_overview():
    allocations  = DATA["allocations"]
    transactions = DATA["transactions"]
    alerts       = DATA["alerts"]

    # Only FY 2024
    alloc_2024 = [a for a in allocations if a["fiscal_year"] == "2024"]
    txn_2024   = [t for t in transactions if t["release_date"].startswith("2024")]

    total_allocated = sum(float(a["allocated_amount"]) for a in alloc_2024)
    total_utilized  = sum(float(t["amount"])           for t in txn_2024)
    util_pct        = round(total_utilized / total_allocated * 100, 1) if total_allocated else 0

    total_anomalies = len(alerts)
    high_count      = sum(1 for a in alerts if float(a.get("confidence_score", 0)) >= 0.80)
    amount_at_risk  = sum(
        float(a["amount"]) for a in txn_2024
        if a["status"] == "paid" and not a["utilization_date"]
    )

    return {
        "total_allocated_cr":   round(total_allocated / 1e7, 2),
        "total_utilized_cr":    round(total_utilized  / 1e7, 2),
        "utilization_pct":      util_pct,
        "total_anomalies":      total_anomalies,
        "high_severity_count":  high_count,
        "amount_at_risk_cr":    round(amount_at_risk  / 1e7, 2),
        "departments_tracked":  len(set(a["dept_id"] for a in allocations)),
        "ddos_tracked":         len(set(t["ddo_code"] for t in transactions)),
    }
