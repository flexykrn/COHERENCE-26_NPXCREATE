"""
Reallocation Engine — with Geographic (State/District) Enforcement
==================================================================

Indian budget law mandates that funds allocated for a specific
geographic area cannot be redirected outside that area without
Finance Ministry approval.

This module enforces a three-tier geographic hierarchy:

  VILLAGE / BLOCK level DDOs
    → funds pinned to their specific district
  DISTRICT level DDOs
    → funds pinned to their district
  STATE level DDOs
    → funds can move statewide within the same ministry

Two reallocation models are provided:

  1. GET /api/reallocation
       Direct dept-to-dept suggestion.
       Constraints: same ministry + same scheme type + geographic overlap.

  2. GET /api/reallocation/reimburse
       Two-step government pool model (mirrors actual process):
         Step 1 — HIGH-lapse depts surrender surplus to ministry pool.
         Step 2 — Pool redistributes to proven absorbers.
         Stranded amount = what nobody can absorb (the real leakage risk).

  3. GET /api/reallocation/geography
       Diagnostic — each dept's district footprint and state-wide eligibility.
"""

from fastapi import APIRouter, Query
from collections import defaultdict
from typing import Optional
from routes.lapse import _compute_lapse

router = APIRouter()
DATA = {}   # injected by main.py

# ── Constants ─────────────────────────────────────────────────────────────────
MAX_TRANSFER_PCT   = 0.30   # max 30% of allocation can leave a dept
MIN_TRANSFER_LAKHS = 10     # ₹10L minimum per transfer
MIN_TRANSFER_CR    = MIN_TRANSFER_LAKHS / 100   # converted to Crores
ABSORPTION_BUFFER  = 1.20   # recipient can absorb up to 120% of current spend
SURRENDER_RATIO    = 0.50   # HIGH depts surrender 50% of projected lapse amount
STATE_JURISDICTION = "State"  # DDOs with this level can operate statewide


# ── Geographic helper ─────────────────────────────────────────────────────────

def _build_dept_geography() -> dict:
    """
    Returns mapping: dept_id → {districts: set, state_wide: bool, district_count: int}

    Rule:
      - A dept with ≥1 State-level DDO is state-wide (can reallocate anywhere
        in the same ministry, regardless of district).
      - Otherwise the dept is pinned to the union of its DDOs' districts.
        Reallocation partner must share ≥1 district.
    """
    ddos = DATA["ddos"]
    geo: dict = defaultdict(lambda: {"districts": set(), "state_wide": False})

    for ddo in ddos:
        did   = ddo["dept_id"]
        dist  = ddo.get("district", "").strip()
        level = ddo.get("jurisdiction_level", "").strip()
        if dist:
            geo[did]["districts"].add(dist)
        if level == STATE_JURISDICTION:
            geo[did]["state_wide"] = True

    result = {}
    for did, info in geo.items():
        result[did] = {
            "districts":     info["districts"],
            "state_wide":    info["state_wide"],
            "district_count": len(info["districts"]),
        }
    return result


def _geo_compatible(src_id: str, rec_id: str, geo: dict) -> tuple:
    """
    Returns (compatible: bool, reason: str).
    Compatible when either dept is state-wide OR they share ≥1 district.
    """
    src_geo = geo.get(src_id, {"districts": set(), "state_wide": False})
    rec_geo = geo.get(rec_id, {"districts": set(), "state_wide": False})

    if src_geo["state_wide"] or rec_geo["state_wide"]:
        return True, "state-wide jurisdiction"

    overlap = src_geo["districts"] & rec_geo["districts"]
    if overlap:
        shared = sorted(overlap)
        label  = ", ".join(shared[:3]) + ("…" if len(shared) > 3 else "")
        return True, f"shared district(s): {label}"

    src_d = ", ".join(sorted(src_geo["districts"])[:2])
    rec_d = ", ".join(sorted(rec_geo["districts"])[:2])
    return False, f"no district overlap ({src_d} vs {rec_d})"


# ── Direct reallocation ───────────────────────────────────────────────────────

@router.get("/reallocation")
def get_reallocation():
    """
    Direct dept-to-dept reallocation suggestions.
    Three constraints enforced:
      1. Same ministry
      2. Same scheme type (Capital/Revenue)
      3. Geographic: shared district(s) OR state-wide DDO jurisdiction
    """
    lapse_data  = _compute_lapse()
    departments = DATA["departments"]
    geo         = _build_dept_geography()

    ministry_map = {d["id"]: d["ministry"] for d in departments}
    scheme_map   = {d["id"]: d["scheme_type"] for d in departments}

    sources   = [r for r in lapse_data if r["risk_level"] == "HIGH"
                 and r["lapse_amount_cr"] > 0]
    receivers = [r for r in lapse_data
                 if r["risk_level"] in ["LOW", "MEDIUM"]
                 and r["utilization_pct"] > 50]

    suggestions  = []
    used_sources = defaultdict(float)

    for src in sources:
        sid          = src["dept_id"]
        src_ministry = ministry_map.get(sid, "")
        src_scheme   = scheme_map.get(sid, "")
        src_alloc_cr = src["allocated_cr"]
        max_give_cr  = src_alloc_cr * MAX_TRANSFER_PCT
        src_geo      = geo.get(sid, {"districts": set(), "state_wide": False})

        for rec in receivers:
            rid          = rec["dept_id"]
            rec_ministry = ministry_map.get(rid, "")
            rec_scheme   = scheme_map.get(rid, "")

            if sid == rid:
                continue
            if src_ministry != rec_ministry:
                continue
            if src_scheme != rec_scheme:
                continue
            compatible, geo_reason = _geo_compatible(sid, rid, geo)
            if not compatible:
                continue

            already_given  = used_sources[sid]
            remaining_give = max_give_cr - already_given
            if remaining_give < MIN_TRANSFER_CR:
                break

            rec_headroom_cr = max(
                0.0, rec["utilized_cr"] * ABSORPTION_BUFFER - rec["utilized_cr"]
            )
            transfer_cr = round(
                min(remaining_give, rec_headroom_cr, src["lapse_amount_cr"] * SURRENDER_RATIO), 2
            )
            if transfer_cr < MIN_TRANSFER_CR:
                continue

            new_lapse_cr   = max(0.0, src["lapse_amount_cr"] - transfer_cr)
            risk_reduction = round(
                (src["lapse_amount_cr"] - new_lapse_cr) / src["lapse_amount_cr"]
                * src["risk_score"] if src["lapse_amount_cr"] > 0 else 0, 1
            )
            rec_geo = geo.get(rid, {"districts": set(), "state_wide": False})

            suggestions.append({
                "from_dept":               src["name"],
                "from_dept_id":            sid,
                "from_ministry":           src["ministry"],
                "from_districts":          sorted(src_geo["districts"]),
                "from_state_wide":         src_geo["state_wide"],
                "to_dept":                 rec["name"],
                "to_dept_id":              rid,
                "to_ministry":             rec["ministry"],
                "to_districts":            sorted(rec_geo["districts"]),
                "to_state_wide":           rec_geo["state_wide"],
                "scheme_type":             src_scheme,
                "transfer_amount_cr":      transfer_cr,
                "from_lapse_risk_pct":     src["risk_score"],
                "to_utilization_pct":      rec["utilization_pct"],
                "geo_justification":       geo_reason,
                "estimated_risk_reduction_pts": risk_reduction,
                "reason": (
                    f"{src['name']} has {src['risk_score']}% lapse risk "
                    f"(₹{src['lapse_amount_cr']}Cr unspent). "
                    f"{rec['name']} has {rec['utilization_pct']}% absorption. "
                    f"Geographic basis: {geo_reason}."
                ),
            })
            used_sources[sid] += transfer_cr
            break

    suggestions.sort(key=lambda x: x["transfer_amount_cr"], reverse=True)
    total_saveable = round(sum(s["transfer_amount_cr"] for s in suggestions), 2)

    return {
        "total_suggestions":  len(suggestions),
        "total_saveable_cr":  total_saveable,
        "suggestions":        suggestions,
        "constraints_applied": [
            "Same ministry only (cross-ministry requires parliamentary approval)",
            "Capital stays within Capital; Revenue stays within Revenue",
            "Max 30% of original allocation can leave any single department",
            f"Minimum transfer: ₹{MIN_TRANSFER_LAKHS}L",
            "Recipient absorption capped at 120% of current utilization",
            "Geographic: shared district(s) OR state-wide DDO jurisdiction required",
        ],
    }


# ── Two-step reimbursement / central pool model ───────────────────────────────

@router.get("/reallocation/reimburse")
def get_reimbursement(
    ministry: Optional[str] = Query(None, description="Filter to one ministry"),
):
    """
    Two-step Government Reimbursement / Pool Model
    -----------------------------------------------
    Mirrors the actual Indian budget reallocation process:

    STEP 1 — SURRENDER
      HIGH-lapse depts surrender surplus to the ministry-level pool.
      Each surrender = min(projected_lapse × 50%, allocation × 30%).
      Surrendered funds are tagged to the originating dept's districts.
      State-wide depts contribute untagged (statewide) funds.

    STEP 2 — REDISTRIBUTION
      Pool is distributed to MEDIUM/LOW-risk depts by absorption rate (highest first).
      Constraints: same ministry + same scheme type + geographic overlap.

    STRANDED AMOUNT
      Funds no eligible receiver can absorb = maximum year-end lapse risk.
      These require inter-ministry approval or will lapse on March 31.
    """
    lapse_data  = _compute_lapse()
    departments = DATA["departments"]
    geo         = _build_dept_geography()

    if ministry:
        allowed_ids = {d["id"] for d in departments if d.get("ministry") == ministry}
        lapse_data  = [r for r in lapse_data if r["dept_id"] in allowed_ids]

    ministry_map = {d["id"]: d["ministry"] for d in departments}
    scheme_map   = {d["id"]: d["scheme_type"] for d in departments}

    sources   = [r for r in lapse_data if r["risk_level"] == "HIGH"
                 and r["lapse_amount_cr"] > 0]
    receivers = sorted(
        [r for r in lapse_data if r["risk_level"] in ["LOW", "MEDIUM"]
         and r["utilization_pct"] > 50],
        key=lambda x: x["utilization_pct"], reverse=True
    )

    # Step 1 — build pool buckets (each tagged by origin)
    pool_buckets: list   = []
    surrendered_by: list = []

    for src in sources:
        sid          = src["dept_id"]
        src_ministry = ministry_map.get(sid, "")
        src_scheme   = scheme_map.get(sid, "")
        src_geo      = geo.get(sid, {"districts": set(), "state_wide": False})
        surrender_cr = round(
            min(src["lapse_amount_cr"] * SURRENDER_RATIO,
                src["allocated_cr"] * MAX_TRANSFER_PCT), 2
        )
        if surrender_cr < MIN_TRANSFER_CR:
            continue

        pool_buckets.append({
            "ministry":        src_ministry,
            "scheme_type":     src_scheme,
            "districts":       set(src_geo["districts"]),
            "state_wide":      src_geo["state_wide"],
            "amount_cr":       surrender_cr,
            "remaining_cr":    surrender_cr,
            "originating_dept": src["name"],
            "originating_id":   sid,
        })
        surrendered_by.append({
            "dept_id":            sid,
            "name":               src["name"],
            "ministry":           src_ministry,
            "scheme_type":        src_scheme,
            "lapse_risk_pct":     src["risk_score"],
            "projected_lapse_cr": src["lapse_amount_cr"],
            "surrender_cr":       surrender_cr,
            "districts":          sorted(src_geo["districts"]),
            "state_wide":         src_geo["state_wide"],
            "reason": (
                f"{src['risk_score']}% lapse probability; "
                f"₹{src['lapse_amount_cr']}Cr projected unspent. "
                f"Surrendering ₹{surrender_cr}Cr to {src_ministry} pool."
            ),
        })

    # Step 2 — redistribute from pool
    redistributed_to: list = []

    for rec in receivers:
        rid          = rec["dept_id"]
        rec_ministry = ministry_map.get(rid, "")
        rec_scheme   = scheme_map.get(rid, "")
        rec_geo      = geo.get(rid, {"districts": set(), "state_wide": False})
        headroom_cr  = max(0.0, rec["utilized_cr"] * ABSORPTION_BUFFER - rec["utilized_cr"])
        if headroom_cr < MIN_TRANSFER_CR:
            continue

        total_received  = 0.0
        remaining_need  = headroom_cr
        sources_used    = []

        for bkt in pool_buckets:
            if bkt["remaining_cr"] < MIN_TRANSFER_CR:
                continue
            if bkt["ministry"] != rec_ministry:
                continue
            if bkt["scheme_type"] != rec_scheme:
                continue
            compat, geo_reason = _geo_compatible(bkt["originating_id"], rid, geo)
            if not compat:
                continue

            take = round(min(bkt["remaining_cr"], remaining_need), 2)
            if take < MIN_TRANSFER_CR:
                continue
            bkt["remaining_cr"] = round(bkt["remaining_cr"] - take, 2)
            total_received += take
            remaining_need  = round(remaining_need - take, 2)
            sources_used.append({
                "from_dept":  bkt["originating_dept"],
                "amount_cr":  take,
                "geo_basis":  geo_reason,
            })
            if remaining_need < MIN_TRANSFER_CR:
                break

        if total_received >= MIN_TRANSFER_CR:
            redistributed_to.append({
                "dept_id":          rid,
                "name":             rec["name"],
                "ministry":         rec_ministry,
                "scheme_type":      rec_scheme,
                "current_util_pct": rec["utilization_pct"],
                "headroom_cr":      round(headroom_cr, 2),
                "received_cr":      round(total_received, 2),
                "districts":        sorted(rec_geo["districts"]),
                "state_wide":       rec_geo["state_wide"],
                "funded_from":      sources_used,
                "reason": (
                    f"Absorbing ₹{round(total_received,2)}Cr from pool. "
                    f"Current utilization {rec['utilization_pct']}% with "
                    f"₹{round(headroom_cr,2)}Cr headroom."
                ),
            })

    # Pool summary
    stranded_map: dict = defaultdict(float)
    for bkt in pool_buckets:
        if bkt["remaining_cr"] >= MIN_TRANSFER_CR:
            stranded_map[bkt["ministry"]] += bkt["remaining_cr"]

    total_surrendered   = round(sum(s["surrender_cr"] for s in surrendered_by), 2)
    total_redistributed = round(sum(r["received_cr"] for r in redistributed_to), 2)
    total_stranded      = round(sum(stranded_map.values()), 2)

    ministry_pools = []
    all_ministries = {s["ministry"] for s in surrendered_by}
    for mn in sorted(all_ministries):
        sur  = round(sum(s["surrender_cr"] for s in surrendered_by if s["ministry"] == mn), 2)
        red  = round(sum(r["received_cr"]  for r in redistributed_to if r["ministry"] == mn), 2)
        stra = round(stranded_map.get(mn, 0.0), 2)
        ministry_pools.append({
            "ministry":            mn,
            "surrendered_cr":      sur,
            "redistributed_cr":    red,
            "stranded_cr":         stra,
            "pool_efficiency_pct": round(red / sur * 100 if sur > 0 else 0, 1),
        })
    ministry_pools.sort(key=lambda x: x["stranded_cr"], reverse=True)

    return {
        "process": (
            "Step 1: HIGH-risk depts surrender projected surplus to ministry pool. "
            "Step 2: Pool redistributes to proven absorbers via geographic + scheme eligibility."
        ),
        "summary": {
            "depts_surrendering":     len(surrendered_by),
            "total_surrendered_cr":   total_surrendered,
            "depts_receiving":        len(redistributed_to),
            "total_redistributed_cr": total_redistributed,
            "total_stranded_cr":      total_stranded,
            "pool_efficiency_pct":    round(
                total_redistributed / total_surrendered * 100
                if total_surrendered > 0 else 0, 1
            ),
            "geographic_note": (
                "State-wide DDO depts may receive from any ministry peer. "
                "District-pinned depts can only receive from district-overlapping sources. "
                "Stranded = no geographically compatible receiver found."
            ),
        },
        "ministry_pool_summary":  ministry_pools,
        "step1_surrendered_by":   surrendered_by,
        "step2_redistributed_to": redistributed_to,
        "stranded_by_ministry":   {k: round(v, 2) for k, v in stranded_map.items()},
    }


# ── Geography diagnostic ──────────────────────────────────────────────────────

@router.get("/reallocation/geography")
def get_dept_geography(
    state_wide_only: bool           = Query(False),
    ministry:        Optional[str]  = Query(None),
):
    """
    Shows each department's geographic footprint:
      - District list where it has DDOs
      - State-wide eligibility (any DDO at State jurisdiction level)
    Use this to explain why a reallocation suggestion was or wasn't eligible.
    """
    departments = DATA["departments"]
    geo         = _build_dept_geography()

    results = []
    for dept in departments:
        did  = dept["id"]
        info = geo.get(did, {"districts": set(), "state_wide": False, "district_count": 0})
        if state_wide_only and not info["state_wide"]:
            continue
        if ministry and dept.get("ministry", "") != ministry:
            continue
        districts = sorted(info["districts"])
        results.append({
            "dept_id":            did,
            "name":               dept["name"],
            "ministry":           dept.get("ministry", ""),
            "scheme_type":        dept.get("scheme_type", ""),
            "state_wide":         info["state_wide"],
            "district_count":     info.get("district_count", len(info["districts"])),
            "districts":          districts,
            "reallocation_scope": (
                "Statewide within ministry" if info["state_wide"]
                else ("Districts: " + ", ".join(districts[:5])
                      + ("…" if len(districts) > 5 else ""))
            ),
        })

    results.sort(key=lambda x: (not x["state_wide"], x["name"]))
    state_wide_count = sum(1 for r in results if r["state_wide"])

    return {
        "summary": {
            "total_depts":         len(results),
            "state_wide_eligible": state_wide_count,
            "district_pinned":     len(results) - state_wide_count,
        },
        "departments": results,
    }
