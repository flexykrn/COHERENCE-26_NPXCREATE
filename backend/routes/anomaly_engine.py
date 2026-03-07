"""
Real Statistical Anomaly Detection Engine
==========================================
Runs 6 algorithms directly on raw transaction data.
No pre-labelled CSV alerts used — everything computed fresh.

Algorithms:
  1. Z-Score per DDO           — flags statistically anomalous payment amounts
  2. Duplicate Sliding Window  — flags same DDO+vendor+amount within 7 days
  3. Shannon Entropy           — flags DDOs with suspiciously narrow vendor diversity
  4. Q4 Acceleration Ratio     — flags depts whose Q4 spend rate > 2.5× their Q1-Q3 baseline
  5. Velocity Deceleration     — flags depts whose monthly spend is decelerating in Q3 (early lapse signal)
  6. Cross-Ministry Contamination — flags high-risk vendors operating across 3+ ministries
"""

from fastapi import APIRouter, Query
from collections import defaultdict
from math import log, sqrt
from datetime import datetime
from typing import Optional
from .anomaly_actions import generate_action, batch_generate_actions, get_action_summary

router = APIRouter()
DATA = {}   # injected by main.py

# ── Tuneable thresholds ───────────────────────────────────────────────────────
ZSCORE_THRESHOLD        = 2.5    # standard deviations above DDO mean
ENTROPY_THRESHOLD       = 0.80   # normalised Shannon entropy — below = suspicious
Q4_ACCEL_FACTOR         = 2.5    # Q4 daily rate must be this many × Q1-Q3 baseline
DECEL_THRESHOLD         = -0.15  # 15% month-over-month slowdown triggers alert
CONTAMINATION_MIN_MIN   = 3      # vendor must cross this many ministry boundaries
MIN_DDO_TX              = 5      # DDO needs at least this many transactions for Z-score


def _log2(x: float) -> float:
    return log(x) / log(2) if x > 0 else 0.0


def _shannon_entropy(counts: list) -> float:
    total = sum(counts)
    if total == 0:
        return 0.0
    return -sum((c / total) * _log2(c / total) for c in counts if c > 0)


def run_scan() -> list:
    transactions = DATA["transactions"]
    vendors      = DATA["vendors"]
    ddos         = DATA["ddos"]
    departments  = DATA["departments"]

    vendor_map   = {v["id"]: v for v in vendors}
    ddo_map      = {d["ddo_code"]: d for d in ddos}
    dept_map     = {d["id"]: d for d in departments}
    ddo_to_dept  = {d["ddo_code"]: d["dept_id"] for d in ddos}

    txns_2024    = [t for t in transactions if t["release_date"].startswith("2024")]

    detected  = []
    alert_id  = 1

    # ── 1. Z-SCORE ANOMALY DETECTION PER DDO ─────────────────────────────────
    ddo_tx_groups: dict = defaultdict(list)
    for t in txns_2024:
        ddo_tx_groups[t["ddo_code"]].append(t)

    for ddo_code, group in ddo_tx_groups.items():
        if len(group) < MIN_DDO_TX:
            continue
        amounts = [float(t["amount"]) for t in group]
        mean    = sum(amounts) / len(amounts)
        var     = sum((x - mean) ** 2 for x in amounts) / len(amounts)
        std     = sqrt(var) if var > 0 else 0
        if std == 0:
            continue

        ddo      = ddo_map.get(ddo_code, {})
        dept_id  = ddo_to_dept.get(ddo_code, "")
        dept     = dept_map.get(dept_id, {})

        for txn in group:
            z = (float(txn["amount"]) - mean) / std
            if z > ZSCORE_THRESHOLD:
                confidence = round(min(0.99, 0.70 + (z - ZSCORE_THRESHOLD) * 0.04), 2)
                detected.append({
                    "alert_id":        f"ENG-{alert_id:05d}",
                    "source":          "Statistical Engine v1",
                    "tx_id":           txn["id"],
                    "ddo_code":        ddo_code,
                    "dept_id":         dept_id,
                    "dept_name":       dept.get("name", ""),
                    "ministry":        dept.get("ministry", ""),
                    "vendor_id":       txn["vendor_id"],
                    "amount_cr":       round(float(txn["amount"]) / 1e7, 4),
                    "alert_type":      "Statistical Outlier",
                    "confidence_score": confidence,
                    "severity":        "HIGH" if confidence >= 0.90 else "MEDIUM",
                    "description": (
                        f"DDO {ddo_code} payment of ₹{round(float(txn['amount'])/1e5,1)}L "
                        f"is {round(z,1)}σ above that DDO's own mean of "
                        f"₹{round(mean/1e5,1)}L (std ₹{round(std/1e5,1)}L). "
                        f"Statistically anomalous — not explained by normal variance."
                    ),
                    "detected_by": f"Z-Score per DDO (σ={round(z,2)} > threshold {ZSCORE_THRESHOLD})",
                    "z_score":     round(z, 2),
                    "ddo_mean_cr": round(mean / 1e7, 4),
                    "ddo_std_cr":  round(std / 1e7, 4),
                    "release_date": txn["release_date"],
                })
                alert_id += 1

    # ── 2. DUPLICATE PAYMENT DETECTION (same DDO+vendor+amount within 7 days) ──
    payment_sig: dict = defaultdict(list)
    for t in txns_2024:
        key = (t["ddo_code"], t["vendor_id"], t["amount"])
        payment_sig[key].append(t)

    for key, group in payment_sig.items():
        if len(group) < 2:
            continue
        group_s = sorted(group, key=lambda x: x["release_date"])
        for i in range(len(group_s) - 1):
            d1 = datetime.strptime(group_s[i]["release_date"],   "%Y-%m-%d")
            d2 = datetime.strptime(group_s[i+1]["release_date"], "%Y-%m-%d")
            delta = (d2 - d1).days
            if 0 < delta <= 7:
                dco     = key[0]
                ddo     = ddo_map.get(dco, {})
                dept_id = ddo_to_dept.get(dco, "")
                dept    = dept_map.get(dept_id, {})
                vendor  = vendor_map.get(key[1], {})
                confidence = round(min(0.99, 0.85 + max(0, 7 - delta) * 0.02), 2)
                detected.append({
                    "alert_id":        f"ENG-{alert_id:05d}",
                    "source":          "Statistical Engine v1",
                    "tx_id":           group_s[i]["id"],
                    "ddo_code":        dco,
                    "dept_id":         dept_id,
                    "dept_name":       dept.get("name", ""),
                    "ministry":        dept.get("ministry", ""),
                    "vendor_id":       key[1],
                    "amount_cr":       round(float(key[2]) / 1e7, 4),
                    "alert_type":      "Duplicate Payment",
                    "confidence_score": confidence,
                    "severity":        "HIGH",
                    "description": (
                        f"DDO {dco} paid {vendor.get('name','vendor')} "
                        f"₹{round(float(key[2])/1e5,1)}L twice within {delta} day(s) "
                        f"(tx #{group_s[i]['id']} and #{group_s[i+1]['id']}). "
                        f"Classic double-billing signature."
                    ),
                    "detected_by": f"Duplicate Sliding Window (same DDO+vendor+amount within {delta}d ≤ 7d)",
                    "days_apart":  delta,
                    "tx_id_pair":  [group_s[i]["id"], group_s[i+1]["id"]],
                    "release_date": group_s[i]["release_date"],
                })
                alert_id += 1

    # ── 3. VENDOR CONCENTRATION ENTROPY (Shannon entropy, narrow pool = suspicious) ──
    ddo_vendor_counts: dict = defaultdict(lambda: defaultdict(int))
    ddo_tx_total: dict = defaultdict(int)
    for t in txns_2024:
        ddo_vendor_counts[t["ddo_code"]][t["vendor_id"]] += 1
        ddo_tx_total[t["ddo_code"]] += 1

    for dco, vcounts in ddo_vendor_counts.items():
        if ddo_tx_total[dco] < 10:
            continue
        n_vendors = len(vcounts)
        if n_vendors > 10:
            continue        # Only flag narrow pools
        ent      = _shannon_entropy(list(vcounts.values()))
        max_ent  = _log2(n_vendors) if n_vendors > 1 else 1.0
        norm_ent = ent / max_ent if max_ent > 0 else 1.0

        if norm_ent < ENTROPY_THRESHOLD and n_vendors <= 3:
            top_vid    = max(vcounts, key=vcounts.get)
            top_vendor = vendor_map.get(top_vid, {})
            v_risk     = float(top_vendor.get("risk_score", 0))
            confidence = round(min(0.99, (1 - norm_ent) * 0.6 + v_risk * 0.4), 2)
            ddo        = ddo_map.get(dco, {})
            dept_id    = ddo_to_dept.get(dco, "")
            dept       = dept_map.get(dept_id, {})
            detected.append({
                "alert_id":        f"ENG-{alert_id:05d}",
                "source":          "Statistical Engine v1",
                "tx_id":           None,
                "ddo_code":        dco,
                "dept_id":         dept_id,
                "dept_name":       dept.get("name", ""),
                "ministry":        dept.get("ministry", ""),
                "vendor_id":       top_vid,
                "amount_cr":       None,
                "alert_type":      "Vendor Concentration",
                "confidence_score": confidence,
                "severity":        "HIGH" if confidence >= 0.80 else "MEDIUM",
                "description": (
                    f"DDO {dco} made {ddo_tx_total[dco]} payments "
                    f"to only {n_vendors} vendor(s) "
                    f"(normalised entropy={round(norm_ent,2)}, threshold={ENTROPY_THRESHOLD}). "
                    f"Top vendor '{top_vendor.get('name','?')}' has risk score {v_risk}. "
                    f"Extremely narrow vendor pool — collusion signal."
                ),
                "detected_by": f"Shannon Entropy (norm_entropy={round(norm_ent,3)} < {ENTROPY_THRESHOLD})",
                "vendor_count":          n_vendors,
                "normalized_entropy":    round(norm_ent, 3),
                "total_ddo_transactions": ddo_tx_total[dco],
                "release_date":          None,
            })
            alert_id += 1

    # ── 4. Q4 ACCELERATION RATIO (Q4 daily rate vs Q1-Q3 baseline) ─────────────
    dept_monthly: dict = defaultdict(lambda: defaultdict(float))
    for t in txns_2024:
        dept_id = ddo_to_dept.get(t["ddo_code"])
        if dept_id:
            mm = t["release_date"][5:7]
            dept_monthly[dept_id][mm] += float(t["amount"])

    for dept_id, monthly in dept_monthly.items():
        q123_total = sum(monthly.get(f"{m:02d}", 0) for m in range(1, 10))
        q4_total   = sum(monthly.get(f"{m:02d}", 0) for m in [10, 11, 12])
        q123_daily = q123_total / 270 if q123_total > 0 else 0
        q4_daily   = q4_total   / 92  if q4_total   > 0 else 0

        if q123_daily > 0 and q4_daily > q123_daily * Q4_ACCEL_FACTOR:
            dept  = dept_map.get(dept_id, {})
            ratio = round(q4_daily / q123_daily, 2)
            confidence = round(min(0.99, 0.65 + (ratio - Q4_ACCEL_FACTOR) * 0.03), 2)
            detected.append({
                "alert_id":        f"ENG-{alert_id:05d}",
                "source":          "Statistical Engine v1",
                "tx_id":           None,
                "ddo_code":        None,
                "dept_id":         dept_id,
                "dept_name":       dept.get("name", ""),
                "ministry":        dept.get("ministry", ""),
                "vendor_id":       None,
                "amount_cr":       round(q4_total / 1e7, 2),
                "alert_type":      "Q4 Acceleration",
                "confidence_score": confidence,
                "severity":        "HIGH" if ratio > 4.0 else "MEDIUM",
                "description": (
                    f"{dept.get('name','Dept')} Q4 daily spend rate is {ratio}× its Q1-Q3 baseline. "
                    f"Q4: ₹{round(q4_daily/1e5,1)}L/day vs Q1-Q3: ₹{round(q123_daily/1e5,1)}L/day. "
                    f"₹{round(q4_total/1e7,2)}Cr pushed in last quarter. "
                    f"Textbook year-end fund-dumping pattern."
                ),
                "detected_by": f"Q4 vs Q1-Q3 acceleration ({ratio}× > threshold {Q4_ACCEL_FACTOR}×)",
                "q4_to_q123_ratio":  ratio,
                "q4_daily_cr":       round(q4_daily   / 1e7, 4),
                "q123_daily_cr":     round(q123_daily / 1e7, 4),
                "release_date":      None,
            })
            alert_id += 1

    # ── 5. SPEND VELOCITY DECELERATION (MoM slowdown in Q3 = early lapse warning) ──
    for dept_id, monthly in dept_monthly.items():
        m_spend = [monthly.get(f"{m:02d}", 0.0) for m in range(1, 10)]
        if sum(m_spend) == 0:
            continue
        velocity    = [m_spend[i] - m_spend[i - 1] for i in range(1, len(m_spend))]
        if len(velocity) < 3:
            continue
        # Acceleration over last 2 velocity steps
        accel         = velocity[-1] - velocity[-2]
        avg_monthly   = sum(m_spend) / 9
        norm_decel    = accel / avg_monthly if avg_monthly > 0 else 0

        if norm_decel < DECEL_THRESHOLD:
            dept       = dept_map.get(dept_id, {})
            confidence = round(min(0.92, 0.62 + abs(norm_decel)), 2)
            detected.append({
                "alert_id":        f"ENG-{alert_id:05d}",
                "source":          "Statistical Engine v1",
                "tx_id":           None,
                "ddo_code":        None,
                "dept_id":         dept_id,
                "dept_name":       dept.get("name", ""),
                "ministry":        dept.get("ministry", ""),
                "vendor_id":       None,
                "amount_cr":       None,
                "alert_type":      "Spend Deceleration",
                "confidence_score": confidence,
                "severity":        "MEDIUM",
                "description": (
                    f"{dept.get('name','Dept')} spending velocity dropped "
                    f"{round(abs(norm_decel)*100,1)}% in Q3 relative to its own monthly average. "
                    f"MoM slowdown: ₹{round(abs(accel)/1e5,1)}L/month. "
                    f"Proactive early warning — budget lapse likely in 90 days."
                ),
                "detected_by": (
                    f"Velocity Deceleration (norm_accel={round(norm_decel,3)} "
                    f"< threshold {DECEL_THRESHOLD})"
                ),
                "deceleration_pct":   round(norm_decel * 100, 1),
                "monthly_spend_trend": [round(v / 1e5, 1) for v in m_spend],
                "release_date":        None,
            })
            alert_id += 1

    # ── 6. CROSS-MINISTRY VENDOR CONTAMINATION (high-risk vendor in 3+ ministries) ──
    vendor_ministries: dict = defaultdict(set)
    vendor_total_amt:  dict = defaultdict(float)
    for t in transactions:   # use all years for full network picture
        dept_id  = ddo_to_dept.get(t["ddo_code"])
        dept     = dept_map.get(dept_id, {})
        ministry = dept.get("ministry", "")
        if ministry:
            vendor_ministries[t["vendor_id"]].add(ministry)
            vendor_total_amt[t["vendor_id"]] += float(t["amount"])

    for vid, ministries in vendor_ministries.items():
        if len(ministries) < CONTAMINATION_MIN_MIN:
            continue
        vendor = vendor_map.get(vid, {})
        v_risk = float(vendor.get("risk_score", 0))
        if v_risk < 0.50:
            continue
        avg_per_ministry    = vendor_total_amt[vid] / len(ministries)
        contamination_score = round(len(ministries) * (avg_per_ministry / 1e7) * v_risk, 2)
        confidence = round(min(0.99, 0.55 + v_risk * 0.30 + min(len(ministries), 8) * 0.02), 2)
        ministry_list = sorted(ministries)

        detected.append({
            "alert_id":        f"ENG-{alert_id:05d}",
            "source":          "Statistical Engine v1",
            "tx_id":           None,
            "ddo_code":        None,
            "dept_id":         None,
            "dept_name":       None,
            "ministry":        ", ".join(ministry_list[:3]) + ("…" if len(ministry_list) > 3 else ""),
            "vendor_id":       vid,
            "amount_cr":       round(vendor_total_amt[vid] / 1e7, 2),
            "alert_type":      "Cross-Ministry Contamination",
            "confidence_score": confidence,
            "severity":        "HIGH" if v_risk >= 0.75 else "MEDIUM",
            "description": (
                f"Vendor '{vendor.get('name','?')}' (risk={v_risk}) has transacted "
                f"across {len(ministries)} ministries totalling "
                f"₹{round(vendor_total_amt[vid]/1e7,1)}Cr. "
                f"Contamination score: {contamination_score}. "
                f"Ministries: {', '.join(ministry_list[:5])}."
            ),
            "detected_by": (
                f"Cross-Ministry Graph (vendor in {len(ministries)} ministries "
                f"≥ threshold {CONTAMINATION_MIN_MIN})"
            ),
            "ministries_count":     len(ministries),
            "ministries_list":      ministry_list,
            "contamination_score":  contamination_score,
            "release_date":         None,
        })
        alert_id += 1

    return detected


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/anomalies/scan")
def get_scan_results(
    alert_type: Optional[str] = Query(None, description="Filter by alert type"),
    severity:   Optional[str] = Query(None, description="HIGH | MEDIUM | LOW"),
):
    """
    Run all 6 statistical anomaly detection algorithms on raw transaction data.
    Results are computed fresh — not read from pre-labelled CSV.
    """
    detected = run_scan()

    if alert_type:
        detected = [d for d in detected if d["alert_type"] == alert_type]
    if severity:
        detected = [d for d in detected if d["severity"] == severity.upper()]

    detected.sort(key=lambda x: x["confidence_score"], reverse=True)

    type_counts     = defaultdict(int)
    severity_counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    total_amount    = 0.0
    for d in detected:
        type_counts[d["alert_type"]] += 1
        sev = d.get("severity", "LOW")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1
        if d.get("amount_cr"):
            total_amount += d["amount_cr"]

    return {
        "total_detected":          len(detected),
        "total_amount_flagged_cr": round(total_amount, 2),
        "severity_counts":         severity_counts,
        "type_counts":             dict(type_counts),
        "algorithms_used": [
            "1. Z-Score per DDO (threshold: 2.5σ above DDO own mean)",
            "2. Duplicate Sliding Window (same DDO+vendor+amount within 7 days)",
            "3. Shannon Entropy — Vendor Diversity (normalised entropy < 0.80)",
            "4. Q4 Acceleration Ratio (Q4 daily rate > 2.5× Q1-Q3 baseline)",
            "5. Month-over-Month Velocity Deceleration (early lapse warning)",
            "6. Cross-Ministry Vendor Contamination Graph (3+ ministries)",
        ],
        "data": detected,
    }


@router.get("/anomalies/scan-with-actions")
def get_scan_with_actions(
    alert_type: Optional[str] = Query(None, description="Filter by alert type"),
    severity:   Optional[str] = Query(None, description="HIGH | MEDIUM | LOW"),
):
    """
    Enhanced anomaly scan that includes actionable recommendations.
    For each anomaly, generates:
    - Recommended action
    - Priority level
    - Required steps
    - Responsible authority
    - Deadline
    """
    # Run detection
    detected = run_scan()

    if alert_type:
        detected = [d for d in detected if d["alert_type"] == alert_type]
    if severity:
        detected = [d for d in detected if d["severity"] == severity.upper()]

    detected.sort(key=lambda x: x["confidence_score"], reverse=True)

    # Generate actions for each anomaly
    actions = batch_generate_actions(detected)
    action_summary = get_action_summary(actions)
    
    # Merge anomalies with their actions
    enriched_data = []
    for anomaly, action in zip(detected, actions):
        enriched_data.append({
            **anomaly,
            "action": {
                "action_id": action.action_id,
                "priority": action.priority,
                "category": action.category,
                "title": action.action_title,
                "description": action.action_description,
                "steps": action.required_steps,
                "documents": action.required_documents,
                "authority": action.responsible_authority,
                "deadline": action.deadline,
                "estimated_recovery_cr": action.estimated_recovery_cr,
            }
        })

    type_counts     = defaultdict(int)
    severity_counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    total_amount    = 0.0
    for d in detected:
        type_counts[d["alert_type"]] += 1
        sev = d.get("severity", "LOW")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1
        if d.get("amount_cr"):
            total_amount += d["amount_cr"]

    return {
        "total_detected":          len(detected),
        "total_amount_flagged_cr": round(total_amount, 2),
        "severity_counts":         severity_counts,
        "type_counts":             dict(type_counts),
        "action_workflow": action_summary,
        "algorithms_used": [
            "1. Z-Score per DDO (threshold: 2.5σ above DDO own mean)",
            "2. Duplicate Sliding Window (same DDO+vendor+amount within 7 days)",
            "3. Shannon Entropy — Vendor Diversity (normalised entropy < 0.80)",
            "4. Q4 Acceleration Ratio (Q4 daily rate > 2.5× Q1-Q3 baseline)",
            "5. Month-over-Month Velocity Deceleration (early lapse warning)",
            "6. Cross-Ministry Vendor Contamination Graph (3+ ministries)",
        ],
        "data": enriched_data,
    }
