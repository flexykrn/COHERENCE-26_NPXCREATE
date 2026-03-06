"""
Budget DNA Fingerprinting
=========================
Every department has a "spending fingerprint" — the normalised 12-month
distribution of how it historically spreads its annual budget.

This is NOT about total spend. It is about PATTERN.

A dept can be at 73% utilization and look fine on any dashboard,
but if it normally spends 8% each month and this year it spent nothing
for 9 months then dumped 73% in October — the pattern is completely
different. That is a behavioral anomaly invisible to utilization metrics.

Algorithm:
  1. Build a 12-dimensional spend vector per dept per year
     (each dimension = fraction of that year's total spend in that month)
  2. Historical DNA  = mean of FY2022 + FY2023 normalised vectors
  3. FY2024 DNA      = this year's normalised spend vector
  4. Cosine similarity between FY2024 and historical DNA
     sim = (a · b) / (|a| × |b|)
  5. Low similarity  = behavioral anomaly. High similarity = spending as expected.
  6. Also compute a "DNA drift score" = 1 - cosine_similarity

Endpoint: GET /api/ml/budget-dna
"""

from fastapi import APIRouter, Query
from collections import defaultdict
from math import sqrt, isfinite
from typing import Optional

router = APIRouter()
DATA   = {}   # injected by main.py

MONTHS     = [f"{m:02d}" for m in range(1, 13)]
MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun",
               "Jul","Aug","Sep","Oct","Nov","Dec"]

# Adaptive thresholds (computed from the actual data distribution at runtime)
# Departments whose cosine similarity is > Z_HIGH standard deviations below the
# cohort mean are flagged HIGH; > Z_MEDIUM std devs below = MEDIUM.
Z_HIGH   = 1.5   # σ below cohort mean → HIGH drift
Z_MEDIUM = 0.75  # σ below cohort mean → MEDIUM drift


def _cosine_sim(a: list, b: list) -> float:
    dot   = sum(x * y for x, y in zip(a, b))
    mag_a = sqrt(sum(x * x for x in a))
    mag_b = sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _build_monthly_vector(dept_id: str, year: str,
                          transactions: list,
                          ddo_to_dept: dict) -> list:
    """12-element vector of monthly spend (raw amounts)."""
    monthly = defaultdict(float)
    for t in transactions:
        if t["release_date"].startswith(year) and ddo_to_dept.get(t["ddo_code"]) == dept_id:
            mm = t["release_date"][5:7]
            monthly[mm] += float(t["amount"])
    return [monthly.get(mm, 0.0) for mm in MONTHS]


def _normalise(vec: list) -> list:
    """Convert raw monthly amounts to a 12D probability distribution."""
    total = sum(vec)
    if total == 0:
        return [0.0] * 12
    return [v / total for v in vec]


def _vec_mean(vecs: list) -> list:
    """Element-wise mean of a list of 12D vectors."""
    if not vecs:
        return [0.0] * 12
    return [sum(v[i] for v in vecs) / len(vecs) for i in range(12)]


def _stat_thresholds(sims: list) -> tuple:
    """Return (mean, std, high_cut, medium_cut) for adaptive classification."""
    n  = len(sims)
    if n == 0:
        return 0.0, 0.0, 0.0, 0.0
    mu = sum(sims) / n
    sd = sqrt(sum((s - mu) ** 2 for s in sims) / n) if n > 1 else 0.0
    # high_cut  = mu - Z_HIGH   * sd  (below this → HIGH)
    # medium_cut= mu - Z_MEDIUM * sd  (below this → MEDIUM)
    return mu, sd, mu - Z_HIGH * sd, mu - Z_MEDIUM * sd


def compute_dna():
    transactions = DATA["transactions"]
    allocations  = DATA["allocations"]
    departments  = DATA["departments"]
    ddos         = DATA["ddos"]

    ddo_to_dept   = {d["ddo_code"]: d["dept_id"] for d in ddos}
    dept_alloc_24 = defaultdict(float)
    for a in allocations:
        if a["fiscal_year"] == "2024":
            dept_alloc_24[a["dept_id"]] += float(a["allocated_amount"])

    results = []
    for dept in departments:
        did = dept["id"]

        # Build normalised fingerprints for each year
        vecs_hist = []
        for yr in ["2022", "2023"]:
            raw = _build_monthly_vector(did, yr, transactions, ddo_to_dept)
            if sum(raw) > 0:
                vecs_hist.append(_normalise(raw))

        raw_24 = _build_monthly_vector(did, "2024", transactions, ddo_to_dept)
        if sum(raw_24) == 0 or not vecs_hist:
            continue

        dna_24   = _normalise(raw_24)
        dna_hist = _vec_mean(vecs_hist)

        sim   = round(_cosine_sim(dna_24, dna_hist), 4)
        drift = round(1 - sim, 4)

        # Which months deviate most from historical expectation?
        month_deltas = [
            {
                "month":          MONTH_NAMES[i],
                "historical_pct": round(dna_hist[i] * 100, 1),
                "current_pct":    round(dna_24[i]   * 100, 1),
                "delta_ppt":      round((dna_24[i] - dna_hist[i]) * 100, 1),
            }
            for i in range(12)
        ]
        month_deltas.sort(key=lambda x: abs(x["delta_ppt"]), reverse=True)

        top_shift = month_deltas[0]
        alloc_cr  = round(dept_alloc_24.get(did, 0) / 1e7, 2)

        results.append({
            "dept_id":          did,
            "name":             dept["name"],
            "ministry":         dept.get("ministry", ""),
            "scheme_type":      dept.get("scheme_type", ""),
            "allocated_cr":     alloc_cr,
            "cosine_similarity":  sim,
            "dna_drift_score":    drift,
            # anomaly_level assigned in second pass
            "anomaly_level":    None,
            "description":      None,
            "dna_2024":         [round(x * 100, 2) for x in dna_24],
            "dna_historical":   [round(x * 100, 2) for x in dna_hist],
            "month_labels":     MONTH_NAMES,
            "top_3_shifted_months": month_deltas[:3],
            "_top_shift":       top_shift,   # temp for description
        })

    # ── Second pass: adaptive threshold classification ──
    all_sims  = [r["cosine_similarity"] for r in results]
    mu, sd, high_cut, medium_cut = _stat_thresholds(all_sims)

    for r in results:
        sim       = r["cosine_similarity"]
        top_shift = r.pop("_top_shift")

        if sim < high_cut:
            level = "HIGH"
        elif sim < medium_cut:
            level = "MEDIUM"
        else:
            level = "NORMAL"

        r["anomaly_level"] = level
        r["description"]   = _describe(r["name"], sim, r["dna_drift_score"], top_shift, level)
        r["z_score"]       = round((sim - mu) / sd, 3) if sd > 0 else 0.0
        r["threshold_context"] = {
            "cohort_mean_sim": round(mu, 4),
            "cohort_std_sim":  round(sd, 4),
            "high_cut":        round(high_cut, 4),
            "medium_cut":      round(medium_cut, 4),
        }

    results.sort(key=lambda x: x["cosine_similarity"])
    return results


def _describe(name, sim, drift, top_shift, level) -> str:
    if level == "HIGH":
        return (
            f"{name} spending pattern has diverged severely from its 2-year baseline "
            f"(cosine similarity={sim}, drift={drift}). "
            f"Biggest shift: {top_shift['month']} is now {top_shift['current_pct']}% of annual spend "
            f"vs historical {top_shift['historical_pct']}% "
            f"(delta {top_shift['delta_ppt']:+.1f} percentage points). "
            f"This is a behavioral anomaly — the department is not just spending less, "
            f"it is spending in a fundamentally different pattern."
        )
    elif level == "MEDIUM":
        return (
            f"{name} shows moderate behavioral drift from historical pattern "
            f"(cosine similarity={sim}). "
            f"Largest deviation in {top_shift['month']}: "
            f"{top_shift['delta_ppt']:+.1f} ppt from expected."
        )
    else:
        return (
            f"{name} spending pattern closely matches its historical baseline "
            f"(cosine similarity={sim}). Execution is on-track behaviorally."
        )


@router.get("/ml/budget-dna")
def get_budget_dna(
    anomaly_level: Optional[str] = Query(None, description="HIGH | MEDIUM | NORMAL"),
    ministry: Optional[str]      = Query(None),
):
    """
    Budget DNA Fingerprinting — compares each department's FY2024 monthly
    spending pattern against its own 2-year historical fingerprint using
    cosine similarity.

    A department at 73% utilization can still flag HIGH if its spending
    is happening in completely different months than its baseline —
    invisible to any utilization-percentage metric.
    """
    results = compute_dna()

    if anomaly_level:
        results = [r for r in results if r["anomaly_level"] == anomaly_level.upper()]
    if ministry:
        results = [r for r in results if r["ministry"].lower() == ministry.lower()]

    high   = [r for r in results if r["anomaly_level"] == "HIGH"]
    medium = [r for r in results if r["anomaly_level"] == "MEDIUM"]
    normal = [r for r in results if r["anomaly_level"] == "NORMAL"]

    avg_sim = round(
        sum(r["cosine_similarity"] for r in results) / len(results), 4
    ) if results else 0

    return {
        "summary": {
            "total_depts_analysed": len(results),
            "high_drift":   len(high),
            "medium_drift": len(medium),
            "normal":       len(normal),
            "avg_cosine_similarity": avg_sim,
            "algorithm": (
                "Cosine similarity between FY2024 normalised monthly spend vector "
                "and 2-year historical mean vector. "
                "Score of 1.0 = identical pattern, 0.0 = completely different."
            ),
        },
        "departments": results,
    }
