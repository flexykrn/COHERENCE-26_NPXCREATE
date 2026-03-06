"""
DDO Peer Cohort Benchmarking
-----------------------------
Every DDO (Drawing & Disbursing Officer) is compared not against a national
average, but against its own peer group defined by:
    • district        — same geography
    • allocation_bucket — Small (<₹5Cr), Medium (₹5–20Cr), Large (>₹20Cr)
    • scheme_type     — capital / revenue / salary

Within each cohort the algorithm computes:
    • cohort mean utilization %
    • cohort std-dev utilization %
    • z-score for each DDO:  z = (ddo_util - cohort_mean) / cohort_std

A DDO with z < -1.5 is a "relative underperformer" even if its raw
utilization % looks acceptable — because peers with identical
constraints are doing significantly better.

This is genuinely novel because it exposes structural (systemic) underperformance
that lapse risk scores miss: a department spending at 60% looks fine nationally
but is a 2σ outlier in its cohort of 35 peers all running at 85%.

GET /api/ddo/benchmarks
    ?district=<str>           filter by district
    ?bucket=Small|Medium|Large filter by allocation bucket
    ?scheme_type=capital|revenue|salary
    ?flag_only=true           return only flagged DDOs (z < -1.5)
    ?limit=<int>              max results (default 200)
"""

import math
from collections import defaultdict
from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()
DATA: dict = {}   # injected by main.py

# Allocation bucket thresholds (average per-DDO allocated amount in Cr)
BUCKET_SMALL  = 5.0    # < 5  Cr avg → Small
BUCKET_MEDIUM = 20.0   # 5–20 Cr avg → Medium (else Large)

FLAG_ZSCORE   = -1.5   # z-score below this = relative underperformer
MIN_COHORT    = 3      # need ≥ 3 members to compute meaningful z-score


# ─── helpers ──────────────────────────────────────────────────────────────────

def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _std(values: list[float], mu: float) -> float:
    if len(values) < 2:
        return 0.0
    return math.sqrt(sum((v - mu) ** 2 for v in values) / len(values))


def _bucket(avg_alloc_cr: float) -> str:
    if avg_alloc_cr < BUCKET_SMALL:
        return "Small"
    if avg_alloc_cr < BUCKET_MEDIUM:
        return "Medium"
    return "Large"


# ─── main computation ─────────────────────────────────────────────────────────

def compute_benchmarks() -> list[dict]:
    transactions = DATA["transactions"]
    ddos         = DATA["ddos"]
    allocations  = DATA["allocations"]
    departments  = DATA["departments"]

    dept_map    = {d["id"]: d for d in departments}

    # ── Per-DDO: total allocated and total spent ──
    ddo_alloc: dict = defaultdict(float)   # sum of allocations for this DDO's dept
    ddo_spent: dict = defaultdict(float)

    # Allocations are at dept level; map to DDO via departments
    dept_alloc: dict = defaultdict(float)
    for a in allocations:
        dept_alloc[a["dept_id"]] += float(a["allocated_amount"])

    for t in transactions:
        ddo_spent[t["ddo_code"]] += float(t["amount"])

    # Build DDO records
    ddo_map: dict = {}
    for d in ddos:
        code = d["ddo_code"]
        did  = d["dept_id"]
        dept = dept_map.get(did, {})

        # avg allocation per DDO in this dept
        # count DDOs per dept
        ddo_map[code] = {
            "ddo_code":    code,
            "name":        d.get("name", code),
            "district":    d.get("district", "Unknown"),
            "dept_id":     did,
            "scheme_type": dept.get("scheme_type", "revenue"),
        }

    # Count DDOs per department to apportion allocation
    ddos_per_dept: dict = defaultdict(int)
    for d in ddos:
        ddos_per_dept[d["dept_id"]] += 1

    for d in ddos:
        code = d["ddo_code"]
        did  = d["dept_id"]
        n    = ddos_per_dept[did] or 1
        ddo_map[code]["avg_alloc_cr"] = round(dept_alloc[did] / n / 1e7, 2)

    # Compute utilization % per DDO
    for code, rec in ddo_map.items():
        alloc_cr = rec["avg_alloc_cr"]
        spent_cr = round(ddo_spent.get(code, 0) / 1e7, 2)
        util_pct = round(spent_cr / alloc_cr * 100, 2) if alloc_cr > 0 else 0.0
        rec["spent_cr"]  = spent_cr
        rec["util_pct"]  = min(util_pct, 150.0)   # cap outliers for z-score
        rec["bucket"]    = _bucket(alloc_cr)

    # ── Build peer cohorts ──
    cohort_utils: dict = defaultdict(list)          # key → [util_pct]
    cohort_codes: dict = defaultdict(list)          # key → [ddo_code]

    for code, rec in ddo_map.items():
        key = (rec["district"], rec["bucket"], rec["scheme_type"])
        cohort_utils[key].append(rec["util_pct"])
        cohort_codes[key].append(code)

    # Compute cohort stats
    cohort_stats: dict = {}
    for key, vals in cohort_utils.items():
        mu = _mean(vals)
        sd = _std(vals, mu)
        cohort_stats[key] = {"mean": round(mu, 2), "std": round(sd, 2), "n": len(vals)}

    # Annotate each DDO with z-score, flag, explanation
    results = []
    for code, rec in ddo_map.items():
        key   = (rec["district"], rec["bucket"], rec["scheme_type"])
        stats = cohort_stats[key]
        mu    = stats["mean"]
        sd    = stats["std"]
        n     = stats["n"]

        if sd > 0 and n >= MIN_COHORT:
            z = round((rec["util_pct"] - mu) / sd, 3)
        else:
            z = 0.0   # insufficient cohort data

        flagged = z < FLAG_ZSCORE and n >= MIN_COHORT

        if flagged:
            severity = "HIGH" if z < -2.5 else "MEDIUM"
            gap_pct  = round(mu - rec["util_pct"], 1)
            desc = (
                f"{rec['name']} is spending at {rec['util_pct']}% utilization, "
                f"while its peer cohort ({rec['district']} / {rec['bucket']} / "
                f"{rec['scheme_type']}, n={n}) averages {mu}%. "
                f"That is a {gap_pct}pp gap — {abs(z):.1f}σ below peers."
            )
        else:
            severity = None
            desc     = None

        dept = dept_map.get(rec["dept_id"], {})
        results.append({
            "ddo_code":         code,
            "name":             rec["name"],
            "district":         rec["district"],
            "department":       dept.get("name", ""),
            "ministry":         dept.get("ministry", ""),
            "scheme_type":      rec["scheme_type"],
            "allocation_bucket": rec["bucket"],
            "avg_alloc_cr":     rec["avg_alloc_cr"],
            "spent_cr":         rec["spent_cr"],
            "util_pct":         rec["util_pct"],
            "cohort_mean_pct":  mu,
            "cohort_std_pct":   sd,
            "cohort_size":      n,
            "z_score":          z,
            "flagged":          flagged,
            "severity":         severity,
            "description":      desc,
        })

    return results


# ─── routes ───────────────────────────────────────────────────────────────────

@router.get("/ddo/benchmarks")
def get_ddo_benchmarks(
    district:    Optional[str]  = Query(None),
    bucket:      Optional[str]  = Query(None),
    scheme_type: Optional[str]  = Query(None),
    flag_only:   bool           = Query(False),
    limit:       int            = Query(200),
):
    """
    Returns DDOs ranked by peer-cohort z-score.
    Flagged DDOs are structural underperformers relative to comparable peers
    (same district + allocation size + scheme type).
    """
    rows = compute_benchmarks()

    if district:
        rows = [r for r in rows if r["district"].lower() == district.lower()]
    if bucket:
        rows = [r for r in rows if r["allocation_bucket"].lower() == bucket.lower()]
    if scheme_type:
        rows = [r for r in rows if r["scheme_type"].lower() == scheme_type.lower()]
    if flag_only:
        rows = [r for r in rows if r["flagged"]]

    # Sort flagged first, then by z-score ascending (worst first)
    rows.sort(key=lambda x: (not x["flagged"], x["z_score"]))
    rows = rows[:limit]

    flagged_total = sum(1 for r in rows if r["flagged"])
    high_total    = sum(1 for r in rows if r["severity"] == "HIGH")

    return {
        "summary": {
            "ddos_returned":       len(rows),
            "flagged_underperformers": flagged_total,
            "high_severity":       high_total,
            "flag_threshold":      f"z < {FLAG_ZSCORE}",
            "min_cohort_size":     MIN_COHORT,
        },
        "ddos": rows,
    }


@router.get("/ddo/benchmarks/cohorts")
def get_cohort_summary():
    """
    Returns a summary of all peer cohorts — useful for visualising
    how many DDOs exist in each district/bucket/scheme_type combination.
    """
    rows    = compute_benchmarks()
    cohorts: dict = defaultdict(lambda: {"count": 0, "mean_util": 0.0, "flagged": 0})

    for r in rows:
        key = f"{r['district']} / {r['allocation_bucket']} / {r['scheme_type']}"
        c   = cohorts[key]
        c["count"]      += 1
        c["mean_util"]  += r["util_pct"]
        c["flagged"]    += int(r["flagged"])

    cohort_list = []
    for key, c in cohorts.items():
        parts  = key.split(" / ")
        n      = c["count"]
        mu     = round(c["mean_util"] / n, 1) if n > 0 else 0.0
        cohort_list.append({
            "cohort":        key,
            "district":      parts[0] if len(parts) > 0 else "",
            "bucket":        parts[1] if len(parts) > 1 else "",
            "scheme_type":   parts[2] if len(parts) > 2 else "",
            "ddo_count":     n,
            "avg_util_pct":  mu,
            "flagged_count": c["flagged"],
            "flag_rate_pct": round(c["flagged"] / n * 100, 1) if n > 0 else 0.0,
        })

    cohort_list.sort(key=lambda x: x["flag_rate_pct"], reverse=True)
    return {"total_cohorts": len(cohort_list), "cohorts": cohort_list}
