"""
Welfare Scheme Tracker
Tracks government welfare schemes (pensions, free goods, DBT, nutrition, housing etc.)
and surfaces leakage patterns: ghost beneficiaries, year-end cash dumps, stranded funds,
per-district cost anomalies.

Endpoints
---------
GET /api/schemes                 — full scheme list with utilisation metrics
GET /api/schemes/summary         — KPI dashboard cards
GET /api/schemes/anomalies       — leakage / misuse detections
GET /api/schemes/{scheme_id}     — individual scheme district drill-down
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import math

router = APIRouter()
DATA: dict = {}

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _schemes():
    return DATA.get("welfare_schemes", [])

def _disbursements():
    return DATA.get("scheme_disbursements", [])

def _dept_name(dept_id: int) -> str:
    for d in DATA.get("departments", []):
        if int(d["id"]) == dept_id:
            return d["name"]
    return f"Dept-{dept_id}"

def _safe_float(val, default=0.0) -> float:
    try:
        return float(val)
    except (TypeError, ValueError):
        return default

def _safe_int(val, default=0) -> int:
    try:
        return int(float(val))
    except (TypeError, ValueError):
        return default

def _stat(values: list) -> dict:
    """Return mean, std, min, max for a list of floats."""
    if not values:
        return {"mean": 0.0, "std": 0.0, "min": 0.0, "max": 0.0}
    n = len(values)
    mean = sum(values) / n
    variance = sum((x - mean) ** 2 for x in values) / n
    return {
        "mean": round(mean, 4),
        "std": round(math.sqrt(variance), 4),
        "min": round(min(values), 4),
        "max": round(max(values), 4),
    }


# ---------------------------------------------------------------------------
# GET /api/schemes
# ---------------------------------------------------------------------------

@router.get("/schemes")
def get_schemes(
    category: Optional[str] = Query(None, description="Filter by scheme_category"),
    dept_id: Optional[int] = Query(None, description="Filter by department id"),
    active_only: bool = Query(False, description="Return only active schemes"),
    sort_by: str = Query("fy2024_utilization_pct", description="Field to sort by"),
    order: str = Query("asc", description="asc or desc"),
):
    rows = _schemes()
    if not rows:
        return {"schemes": [], "total": 0}

    result = []
    for s in rows:
        if active_only and _safe_int(s.get("active")) == 0:
            continue
        if category and s.get("scheme_category", "").lower() != category.lower():
            continue
        if dept_id and _safe_int(s.get("dept_id")) != dept_id:
            continue

        sid = _safe_int(s["scheme_id"])
        util = _safe_float(s.get("fy2024_utilization_pct"))
        alloc = _safe_float(s.get("fy2024_allocated_cr"))
        disb = _safe_float(s.get("fy2024_disbursed_cr"))
        unspent = round(alloc - disb, 2)

        result.append({
            "scheme_id": sid,
            "scheme_name": s.get("scheme_name"),
            "scheme_category": s.get("scheme_category"),
            "dept_id": _safe_int(s["dept_id"]),
            "dept_name": _dept_name(_safe_int(s["dept_id"])),
            "delivery_mode": s.get("delivery_mode"),
            "launch_year": _safe_int(s.get("launch_year")),
            "target_beneficiaries_lakhs": _safe_float(s.get("target_beneficiaries_lakhs")),
            "per_beneficiary_amount_inr": _safe_float(s.get("per_beneficiary_amount_inr")),
            "annual_budget_cr": _safe_float(s.get("annual_budget_cr")),
            "fy2022_disbursed_cr": _safe_float(s.get("fy2022_disbursed_cr")),
            "fy2022_beneficiaries_reached": _safe_int(s.get("fy2022_beneficiaries_reached")),
            "fy2023_disbursed_cr": _safe_float(s.get("fy2023_disbursed_cr")),
            "fy2023_beneficiaries_reached": _safe_int(s.get("fy2023_beneficiaries_reached")),
            "fy2024_allocated_cr": alloc,
            "fy2024_disbursed_cr": disb,
            "fy2024_beneficiaries_reached": _safe_int(s.get("fy2024_beneficiaries_reached")),
            "fy2024_utilization_pct": util,
            "fy2024_unspent_cr": unspent,
            "active": bool(_safe_int(s.get("active", 1))),
            "anomaly_flag": s.get("anomaly_flag", "normal"),
        })

    reverse = order.lower() == "desc"
    try:
        result.sort(key=lambda x: x.get(sort_by, 0) or 0, reverse=reverse)
    except Exception:
        pass

    return {"schemes": result, "total": len(result)}


# ---------------------------------------------------------------------------
# GET /api/schemes/summary  (must be BEFORE /{scheme_id})
# ---------------------------------------------------------------------------

@router.get("/schemes/summary")
def get_schemes_summary():
    rows = _schemes()
    if not rows:
        return {}

    total_schemes = len(rows)
    active_schemes = sum(1 for s in rows if _safe_int(s.get("active", 1)))
    total_alloc = sum(_safe_float(s.get("fy2024_allocated_cr")) for s in rows)
    total_disbursed = sum(_safe_float(s.get("fy2024_disbursed_cr")) for s in rows)
    total_unspent = round(total_alloc - total_disbursed, 2)
    total_beneficiaries = sum(_safe_int(s.get("fy2024_beneficiaries_reached")) for s in rows)
    target_beneficiaries = sum(
        _safe_float(s.get("target_beneficiaries_lakhs")) * 1e5 for s in rows
    )

    # Average utilisation
    utils = [_safe_float(s.get("fy2024_utilization_pct")) for s in rows]
    avg_util = round(sum(utils) / len(utils), 1) if utils else 0.0

    # Anomaly breakdown
    anomaly_counts = {}
    anomaly_funds = {}
    for s in rows:
        flag = s.get("anomaly_flag", "normal")
        anomaly_counts[flag] = anomaly_counts.get(flag, 0) + 1
        anomaly_funds[flag] = round(
            anomaly_funds.get(flag, 0.0) + _safe_float(s.get("fy2024_allocated_cr")), 2
        )

    # Category breakdown
    cat_totals = {}
    for s in rows:
        cat = s.get("scheme_category", "Unknown")
        cat_totals[cat] = cat_totals.get(cat, 0.0) + _safe_float(s.get("fy2024_allocated_cr"))
    cat_totals = {k: round(v, 2) for k, v in sorted(cat_totals.items(), key=lambda x: -x[1])}

    # Delivery mode breakdown
    mode_totals = {}
    for s in rows:
        m = s.get("delivery_mode", "Unknown")
        mode_totals[m] = round(mode_totals.get(m, 0.0) + _safe_float(s.get("fy2024_disbursed_cr")), 2)

    # YoY trend
    fy22_total = sum(_safe_float(s.get("fy2022_disbursed_cr")) for s in rows)
    fy23_total = sum(_safe_float(s.get("fy2023_disbursed_cr")) for s in rows)
    yoy_growth_pct = round((total_disbursed - fy23_total) / fy23_total * 100, 1) if fy23_total else 0.0

    return {
        "kpis": {
            "total_schemes": total_schemes,
            "active_schemes": active_schemes,
            "total_fy2024_allocated_cr": round(total_alloc, 2),
            "total_fy2024_disbursed_cr": round(total_disbursed, 2),
            "total_fy2024_unspent_cr": total_unspent,
            "overall_utilization_pct": round(total_disbursed / total_alloc * 100, 1) if total_alloc else 0,
            "avg_scheme_utilization_pct": avg_util,
            "total_beneficiaries_reached_fy2024": total_beneficiaries,
            "target_beneficiary_coverage_pct": round(total_beneficiaries / target_beneficiaries * 100, 1) if target_beneficiaries else 0,
        },
        "anomaly_breakdown": {
            "counts": anomaly_counts,
            "funds_at_risk_cr": anomaly_funds,
        },
        "category_allocation_cr": cat_totals,
        "delivery_mode_disbursed_cr": mode_totals,
        "yoy_trend": {
            "fy2022_total_disbursed_cr": round(fy22_total, 2),
            "fy2023_total_disbursed_cr": round(fy23_total, 2),
            "fy2024_total_disbursed_cr": round(total_disbursed, 2),
            "fy24_vs_fy23_growth_pct": yoy_growth_pct,
        },
    }


# ---------------------------------------------------------------------------
# GET /api/schemes/anomalies
# ---------------------------------------------------------------------------

@router.get("/schemes/anomalies")
def get_scheme_anomalies(min_risk_score: float = Query(0.5, description="Minimum risk score 0-1")):
    rows = _schemes()
    disbursements = _disbursements()

    # Build per-scheme disbursement index
    disb_by_scheme: dict[int, list] = {}
    for d in disbursements:
        sid = _safe_int(d.get("scheme_id"))
        disb_by_scheme.setdefault(sid, []).append(d)

    detections = []

    for s in rows:
        sid = _safe_int(s["scheme_id"])
        name = s.get("scheme_name")
        alloc = _safe_float(s.get("fy2024_allocated_cr"))
        disbursed = _safe_float(s.get("fy2024_disbursed_cr"))
        util = _safe_float(s.get("fy2024_utilization_pct"))
        flag = s.get("anomaly_flag", "normal")
        disb_rows = disb_by_scheme.get(sid, [])

        # ── 1. STRANDED FUNDS ──────────────────────────────────────────────
        if util < 25.0 and alloc > 0:
            stranded_cr = round(alloc - disbursed, 2)
            risk = round(min(1.0, (25.0 - util) / 25.0 * 0.9 + alloc / 500 * 0.1), 3)
            detections.append({
                "type": "STRANDED_FUNDS",
                "severity": "CRITICAL" if util < 10 else "HIGH",
                "risk_score": risk,
                "scheme_id": sid,
                "scheme_name": name,
                "scheme_category": s.get("scheme_category"),
                "dept_name": _dept_name(_safe_int(s["dept_id"])),
                "description": f"Only {util}% utilised — ₹{stranded_cr}Cr will lapse at year-end",
                "evidence": {
                    "allocated_cr": alloc,
                    "disbursed_cr": disbursed,
                    "stranded_cr": stranded_cr,
                    "utilization_pct": util,
                },
                "recommendation": "Review implementation bottlenecks; consider reallocation surrender before March 31",
            })

        # ── 2. YEAR-END CASH DUMP ──────────────────────────────────────────
        if disb_rows:
            q_actual = {}
            for d in disb_rows:
                q = _safe_int(d.get("quarter"))
                q_actual[q] = q_actual.get(q, 0.0) + _safe_float(d.get("actual_disbursed_lakhs"))
            total_actual = sum(q_actual.values())
            q4_share = q_actual.get(4, 0.0) / total_actual if total_actual else 0
            if q4_share > 0.50:
                risk = round(min(1.0, q4_share * 0.95), 3)
                detections.append({
                    "type": "YEAR_END_CASH_DUMP",
                    "severity": "HIGH" if q4_share > 0.65 else "MEDIUM",
                    "risk_score": risk,
                    "scheme_id": sid,
                    "scheme_name": name,
                    "scheme_category": s.get("scheme_category"),
                    "dept_name": _dept_name(_safe_int(s["dept_id"])),
                    "description": f"{round(q4_share*100,1)}% of annual disbursement pushed into Q4",
                    "evidence": {
                        "q1_share_pct": round(q_actual.get(1,0)/total_actual*100, 1) if total_actual else 0,
                        "q2_share_pct": round(q_actual.get(2,0)/total_actual*100, 1) if total_actual else 0,
                        "q3_share_pct": round(q_actual.get(3,0)/total_actual*100, 1) if total_actual else 0,
                        "q4_share_pct": round(q4_share * 100, 1),
                    },
                    "recommendation": "Disburse evenly across quarters; Q4 dumps indicate poor planning or window-dressing",
                })

        # ── 3. GHOST BENEFICIARIES (disbursement > 110% of target) ─────────
        target_ben = _safe_float(s.get("target_beneficiaries_lakhs")) * 1e5
        reached_ben = _safe_int(s.get("fy2024_beneficiaries_reached"))
        if target_ben > 0 and reached_ben > target_ben * 1.10:
            overshoot_pct = round((reached_ben - target_ben) / target_ben * 100, 1)
            excess_cr = round(disbursed * (reached_ben - target_ben) / reached_ben, 2)
            risk = round(min(1.0, overshoot_pct / 100 * 0.8 + excess_cr / 100 * 0.2), 3)
            detections.append({
                "type": "GHOST_BENEFICIARIES",
                "severity": "CRITICAL" if overshoot_pct > 20 else "HIGH",
                "risk_score": risk,
                "scheme_id": sid,
                "scheme_name": name,
                "scheme_category": s.get("scheme_category"),
                "dept_name": _dept_name(_safe_int(s["dept_id"])),
                "description": f"Beneficiaries exceed target by {overshoot_pct}% — {int(reached_ben - target_ben):,} extra recipients",
                "evidence": {
                    "target_beneficiaries": int(target_ben),
                    "actual_beneficiaries": reached_ben,
                    "overshoot_pct": overshoot_pct,
                    "estimated_excess_cr": excess_cr,
                },
                "recommendation": "Cross-check beneficiary list against Aadhaar/DBT seeding; likely duplicate or fake entries",
            })

        # ── 4. PER-DISTRICT COST SPIKE ─────────────────────────────────────
        if disb_rows:
            dist_per_ben = {}
            dist_data = {}
            for d in disb_rows:
                dist = d.get("district")
                ab = _safe_int(d.get("actual_beneficiaries"))
                ad = _safe_float(d.get("actual_disbursed_lakhs"))
                if dist not in dist_data:
                    dist_data[dist] = {"ben": 0, "lakhs": 0.0}
                dist_data[dist]["ben"] += ab
                dist_data[dist]["lakhs"] += ad

            for dist, v in dist_data.items():
                if v["ben"] > 0:
                    dist_per_ben[dist] = v["lakhs"] / v["ben"]  # lakhs per beneficiary

            if dist_per_ben:
                vals = list(dist_per_ben.values())
                st = _stat(vals)
                if st["std"] > 0:
                    for dist, cpb in dist_per_ben.items():
                        z = (cpb - st["mean"]) / st["std"]
                        if z > 2.5:  # extreme outlier district
                            risk = round(min(1.0, z / 5.0), 3)
                            detections.append({
                                "type": "DISTRICT_COST_SPIKE",
                                "severity": "HIGH" if z > 3.5 else "MEDIUM",
                                "risk_score": risk,
                                "scheme_id": sid,
                                "scheme_name": name,
                                "scheme_category": s.get("scheme_category"),
                                "dept_name": _dept_name(_safe_int(s["dept_id"])),
                                "description": f"{dist}: ₹{round(cpb*1e5,0):,.0f}/beneficiary vs avg ₹{round(st['mean']*1e5,0):,.0f} (z={round(z,2)})",
                                "evidence": {
                                    "district": dist,
                                    "cost_per_beneficiary_inr": round(cpb * 1e5, 0),
                                    "avg_cost_per_beneficiary_inr": round(st["mean"] * 1e5, 0),
                                    "z_score": round(z, 3),
                                },
                                "recommendation": "Audit district-level disbursement records; possible inflated cost claims",
                            })

    # Filter by risk score
    detections = [d for d in detections if d["risk_score"] >= min_risk_score]
    detections.sort(key=lambda x: -x["risk_score"])

    # Summary
    by_type: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    total_funds = 0.0
    for d in detections:
        by_type[d["type"]] = by_type.get(d["type"], 0) + 1
        by_severity[d["severity"]] = by_severity.get(d["severity"], 0) + 1
        ev = d.get("evidence", {})
        total_funds += _safe_float(ev.get("stranded_cr", ev.get("estimated_excess_cr", 0)))

    return {
        "total_detections": len(detections),
        "total_funds_at_risk_cr": round(total_funds, 2),
        "by_type": by_type,
        "by_severity": by_severity,
        "detections": detections,
    }


# ---------------------------------------------------------------------------
# GET /api/schemes/{scheme_id}  — individual drill-down
# ---------------------------------------------------------------------------

@router.get("/schemes/{scheme_id}")
def get_scheme_detail(scheme_id: int):
    rows = _schemes()
    scheme = next((s for s in rows if _safe_int(s.get("scheme_id")) == scheme_id), None)
    if scheme is None:
        raise HTTPException(status_code=404, detail=f"Scheme {scheme_id} not found")

    disbursements = _disbursements()
    s_disb = [d for d in disbursements if _safe_int(d.get("scheme_id")) == scheme_id]

    # District breakdown (FY2024 totals)
    dist_map: dict[str, dict] = {}
    for d in s_disb:
        dist = d.get("district", "Unknown")
        if dist not in dist_map:
            dist_map[dist] = {"planned_lakhs": 0.0, "actual_lakhs": 0.0,
                               "planned_ben": 0, "actual_ben": 0}
        dist_map[dist]["planned_lakhs"] += _safe_float(d.get("planned_amount_lakhs"))
        dist_map[dist]["actual_lakhs"] += _safe_float(d.get("actual_disbursed_lakhs"))
        dist_map[dist]["planned_ben"] += _safe_int(d.get("planned_beneficiaries"))
        dist_map[dist]["actual_ben"] += _safe_int(d.get("actual_beneficiaries"))

    district_breakdown = []
    for dist, v in sorted(dist_map.items()):
        util = round(v["actual_lakhs"] / v["planned_lakhs"] * 100, 1) if v["planned_lakhs"] else 0.0
        cpb = round(v["actual_lakhs"] * 1e3 / v["actual_ben"], 0) if v["actual_ben"] else 0.0
        district_breakdown.append({
            "district": dist,
            "planned_amount_lakhs": round(v["planned_lakhs"], 2),
            "actual_disbursed_lakhs": round(v["actual_lakhs"], 2),
            "utilization_pct": util,
            "planned_beneficiaries": v["planned_ben"],
            "actual_beneficiaries": v["actual_ben"],
            "cost_per_beneficiary_inr": cpb,
        })

    # Quarter phasing
    q_map: dict[int, dict] = {}
    for d in s_disb:
        q = _safe_int(d.get("quarter"))
        if q not in q_map:
            q_map[q] = {"planned": 0.0, "actual": 0.0}
        q_map[q]["planned"] += _safe_float(d.get("planned_amount_lakhs"))
        q_map[q]["actual"] += _safe_float(d.get("actual_disbursed_lakhs"))

    quarterly_phasing = []
    total_q_actual = sum(v["actual"] for v in q_map.values()) or 1
    for q in sorted(q_map):
        quarterly_phasing.append({
            "quarter": q,
            "planned_lakhs": round(q_map[q]["planned"], 2),
            "actual_lakhs": round(q_map[q]["actual"], 2),
            "share_of_annual_pct": round(q_map[q]["actual"] / total_q_actual * 100, 1),
        })

    # Cost-per-beneficiary stats across districts
    cpb_vals = [r["cost_per_beneficiary_inr"] for r in district_breakdown if r["cost_per_beneficiary_inr"] > 0]
    cpb_stats = _stat(cpb_vals)

    dept_id = _safe_int(scheme.get("dept_id"))
    return {
        "scheme_id": scheme_id,
        "scheme_name": scheme.get("scheme_name"),
        "scheme_category": scheme.get("scheme_category"),
        "dept_id": dept_id,
        "dept_name": _dept_name(dept_id),
        "delivery_mode": scheme.get("delivery_mode"),
        "launch_year": _safe_int(scheme.get("launch_year")),
        "anomaly_flag": scheme.get("anomaly_flag", "normal"),
        "active": bool(_safe_int(scheme.get("active", 1))),
        "target_beneficiaries_lakhs": _safe_float(scheme.get("target_beneficiaries_lakhs")),
        "per_beneficiary_amount_inr": _safe_float(scheme.get("per_beneficiary_amount_inr")),
        "annual_budget_cr": _safe_float(scheme.get("annual_budget_cr")),
        "fy_performance": {
            "fy2022": {
                "disbursed_cr": _safe_float(scheme.get("fy2022_disbursed_cr")),
                "beneficiaries_reached": _safe_int(scheme.get("fy2022_beneficiaries_reached")),
            },
            "fy2023": {
                "disbursed_cr": _safe_float(scheme.get("fy2023_disbursed_cr")),
                "beneficiaries_reached": _safe_int(scheme.get("fy2023_beneficiaries_reached")),
            },
            "fy2024": {
                "allocated_cr": _safe_float(scheme.get("fy2024_allocated_cr")),
                "disbursed_cr": _safe_float(scheme.get("fy2024_disbursed_cr")),
                "beneficiaries_reached": _safe_int(scheme.get("fy2024_beneficiaries_reached")),
                "utilization_pct": _safe_float(scheme.get("fy2024_utilization_pct")),
                "unspent_cr": round(
                    _safe_float(scheme.get("fy2024_allocated_cr")) - _safe_float(scheme.get("fy2024_disbursed_cr")), 2
                ),
            },
        },
        "quarterly_phasing": quarterly_phasing,
        "district_breakdown": district_breakdown,
        "cost_per_beneficiary_stats": cpb_stats,
    }
