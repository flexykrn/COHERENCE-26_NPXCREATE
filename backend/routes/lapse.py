from fastapi import APIRouter
from collections import defaultdict

router = APIRouter()
DATA = {}   # injected by main.py

DAYS_IN_YEAR     = 365
FISCAL_YEAR      = "2024"
# Simulate 9 months elapsed (Jan-Sep) with 3 months remaining (Oct-Dec)
# This creates a realistic mid-year prediction scenario
ELAPSED_DAYS     = 270
REMAINING_DAYS   = 95


def _compute_lapse():
    transactions = DATA["transactions"]
    allocations  = DATA["allocations"]
    ddos         = DATA["ddos"]
    departments  = DATA["departments"]

    ddo_to_dept = {d["ddo_code"]: d["dept_id"] for d in ddos}
    dept_map    = {d["id"]: d for d in departments}

    hist_util = defaultdict(list)
    for year in ["2022", "2023"]:
        spend = defaultdict(float)
        alloc = defaultdict(float)
        for t in transactions:
            if t["release_date"].startswith(year):
                did = ddo_to_dept.get(t["ddo_code"])
                if did:
                    spend[did] += float(t["amount"])
        for a in allocations:
            if a["fiscal_year"] == year:
                alloc[a["dept_id"]] += float(a["allocated_amount"])
        for did in alloc:
            if alloc[did] > 0:
                hist_util[did].append(spend[did] / alloc[did])

    curr_spend = defaultdict(float)
    for t in transactions:
        if t["release_date"].startswith(FISCAL_YEAR):
            did = ddo_to_dept.get(t["ddo_code"])
            if did:
                curr_spend[did] += float(t["amount"])

    curr_alloc = defaultdict(float)
    for a in allocations:
        if a["fiscal_year"] == FISCAL_YEAR:
            curr_alloc[a["dept_id"]] += float(a["allocated_amount"])

    results = []
    for dept in departments:
        did       = dept["id"]
        allocated = curr_alloc.get(did, 0)
        utilized  = curr_spend.get(did, 0)
        if allocated == 0:
            continue

        # Only count Q1-Q3 spending for the "current pace" calculation (first 9 months)
        ytd_spend = sum(
            float(t["amount"]) for t in transactions
            if t["release_date"].startswith(FISCAL_YEAR)
            and ddo_to_dept.get(t["ddo_code"]) == did
            and t["release_date"][5:7] not in ["10", "11", "12"]  # exclude Q4
        )
        util_pct     = ytd_spend / allocated * 100
        pace_per_day = ytd_spend / ELAPSED_DAYS
        projected_total = ytd_spend + (pace_per_day * REMAINING_DAYS)
        proj_pct        = min(projected_total / allocated * 100, 100)

        lapse_amount = max(0, allocated - projected_total)

        # Historical average utilization
        hist_avg = (sum(hist_util[did]) / len(hist_util[did]) * 100) if hist_util[did] else 80.0

        # Risk score components:
        # 1. How far below historical average this dept is trending
        # 2. How much absolute lapse is expected
        gap_score    = max(0, hist_avg - proj_pct) / 100
        lapse_score  = lapse_amount / allocated if allocated > 0 else 0
        risk_raw     = gap_score * 0.4 + lapse_score * 0.6
        risk_pct     = min(round(risk_raw * 100, 1), 99)

        if risk_pct >= 40:
            risk_level = "HIGH"
        elif risk_pct >= 15:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        q4_spend = sum(
            float(t["amount"]) for t in transactions
            if t["release_date"].startswith(FISCAL_YEAR)
            and ddo_to_dept.get(t["ddo_code"]) == did
            and t["release_date"][5:7] in ["10", "11", "12"]
        )
        q4_ratio = round(q4_spend / utilized * 100, 1) if utilized > 0 else 0

        results.append({
            "dept_id":            did,
            "name":               dept["name"],
            "ministry":           dept["ministry"],
            "scheme_type":        dept["scheme_type"],
            "allocated_cr":       round(allocated      / 1e7, 2),
            "ytd_utilized_cr":    round(ytd_spend       / 1e7, 2),
            "utilized_cr":        round(utilized        / 1e7, 2),
            "utilization_pct":    round(util_pct,        1),
            "projected_util_pct": round(proj_pct,        1),
            "lapse_amount_cr":    round(lapse_amount    / 1e7, 2),
            "historical_avg_pct": round(hist_avg,        1),
            "risk_score":         risk_pct,
            "risk_level":         risk_level,
            "q4_spend_ratio_pct": q4_ratio,
            "days_remaining":     REMAINING_DAYS,
        })

    results.sort(key=lambda x: x["risk_score"], reverse=True)
    return results


@router.get("/lapse-risk")
def get_lapse_risk():
    return _compute_lapse()


@router.get("/lapse-risk/summary")
def get_lapse_summary():
    rows = _compute_lapse()
    high   = [r for r in rows if r["risk_level"] == "HIGH"]
    medium = [r for r in rows if r["risk_level"] == "MEDIUM"]
    low    = [r for r in rows if r["risk_level"] == "LOW"]
    total_at_risk = sum(r["lapse_amount_cr"] for r in high + medium)
    return {
        "high_count":         len(high),
        "medium_count":       len(medium),
        "low_count":          len(low),
        "total_at_risk_cr":   round(total_at_risk, 2),
        "top_5_high_risk":    high[:5],
    }
