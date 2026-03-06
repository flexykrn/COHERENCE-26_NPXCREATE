from fastapi import APIRouter, Query
from collections import defaultdict

router = APIRouter()
DATA = {}   # injected by main.py

SHELL_RISK_THRESHOLD   = 0.75   # vendors above this are considered high-risk
MIN_DDO_CONNECTIONS    = 4      # flag vendors connected to 4+ DDOs
MIN_COLLUSION_POOL     = 3      # DDOs sharing ≤3 vendors are flagged


@router.get("/collusion")
def get_collusion_graph(year: str = Query("all")):
    transactions = DATA["transactions"]
    vendors      = DATA["vendors"]
    ddos         = DATA["ddos"]
    departments  = DATA["departments"]

    vendor_map  = {v["id"]: v for v in vendors}
    ddo_map     = {d["ddo_code"]: d for d in ddos}
    dept_map    = {d["id"]: d for d in departments}

    # Filter transactions
    txns = transactions if year == "all" else [
        t for t in transactions if t["release_date"].startswith(year)
    ]

    # Build adjacency: vendor_id → set of ddo_codes, amounts
    vendor_ddos   = defaultdict(set)
    vendor_amount = defaultdict(float)
    ddo_vendors   = defaultdict(set)
    edge_amount   = defaultdict(float)   # (ddo_code, vendor_id) → total

    for t in txns:
        vid = t["vendor_id"]
        dco = t["ddo_code"]
        amt = float(t["amount"])
        vendor_ddos[vid].add(dco)
        vendor_amount[vid]         += amt
        ddo_vendors[dco].add(vid)
        edge_amount[(dco, vid)]    += amt

    # Nodes: vendors (flagged ones) + connected DDOs
    nodes = []
    node_idx = {}

    def add_node(nid: str, label: str, node_type: str, risk: float = 0.0, amount: float = 0.0):
        if nid not in node_idx:
            node_idx[nid] = len(nodes)
            nodes.append({
                "id":     nid,
                "label":  label,
                "type":   node_type,
                "risk":   round(risk, 2),
                "amount_cr": round(amount / 1e7, 2),
            })
        return node_idx[nid]

    edges       = []
    flagged_set = set()

    # Flag high-risk vendors connected to MIN_DDO_CONNECTIONS+ DDOs
    for vid, connected_ddos in vendor_ddos.items():
        vendor = vendor_map.get(vid, {})
        risk   = float(vendor.get("risk_score", 0))
        if len(connected_ddos) >= MIN_DDO_CONNECTIONS and risk >= SHELL_RISK_THRESHOLD:
            flagged_set.add(vid)

    # Also flag DDOs whose vendor pool is suspiciously small (≤ MIN_COLLUSION_POOL vendors)
    colluding_ddos = {
        dco for dco, vids in ddo_vendors.items()
        if len(vids) <= MIN_COLLUSION_POOL
    }

    # Add flagged vendors and their connected DDOs to graph
    shown_vendors = set()
    for vid in flagged_set:
        vendor = vendor_map.get(vid, {})
        v_label = vendor.get("name", f"Vendor {vid}")
        v_risk  = float(vendor.get("risk_score", 0))
        add_node(f"v_{vid}", v_label, "shell_vendor", v_risk, vendor_amount[vid])
        shown_vendors.add(vid)

        for dco in vendor_ddos[vid]:
            ddo = ddo_map.get(dco, {})
            dept_id  = ddo.get("dept_id", "")
            dept     = dept_map.get(dept_id, {})
            district = ddo.get("district", "")
            is_col   = dco in colluding_ddos
            add_node(
                f"d_{dco}", dco, "colluding_ddo" if is_col else "ddo",
                0.9 if is_col else 0.2,
            )
            edges.append({
                "source":    f"d_{dco}",
                "target":    f"v_{vid}",
                "amount_cr": round(edge_amount[(dco, vid)] / 1e7, 2),
                "dept":      dept.get("name", ""),
                "district":  district,
            })

    # Add colluding DDOs even if vendor not shell (small vendor pool = suspicious)
    for dco in colluding_ddos:
        node_key = f"d_{dco}"
        if node_key not in node_idx:
            ddo  = ddo_map.get(dco, {})
            add_node(node_key, dco, "colluding_ddo", 0.75)
            # Add their vendors as normal vendor nodes
            for vid in ddo_vendors[dco]:
                vendor = vendor_map.get(vid, {})
                vk     = f"v_{vid}"
                if vk not in node_idx:
                    add_node(vk, vendor.get("name", f"V{vid}"), "vendor",
                             float(vendor.get("risk_score", 0)), vendor_amount[vid])
                edges.append({
                    "source":    node_key,
                    "target":    vk,
                    "amount_cr": round(edge_amount[(dco, vid)] / 1e7, 2),
                    "dept":      "",
                    "district":  ddo_map.get(dco, {}).get("district", ""),
                })

    # Summary stats
    shell_vendor_count   = sum(1 for n in nodes if n["type"] == "shell_vendor")
    colluding_ddo_count  = sum(1 for n in nodes if n["type"] == "colluding_ddo")
    total_at_risk_cr     = round(
        sum(n["amount_cr"] for n in nodes if n["type"] in ["shell_vendor"]), 2
    )

    return {
        "year":                year,
        "nodes":               nodes,
        "edges":               edges,
        "summary": {
            "shell_vendors":     shell_vendor_count,
            "colluding_ddos":    colluding_ddo_count,
            "total_edges":       len(edges),
            "total_at_risk_cr":  total_at_risk_cr,
        },
    }


CONTAGION_RISK_THRESHOLD = 0.75


@router.get("/collusion/contagion")
def get_vendor_contagion():
    """
    Vendor Contagion Propagation — simulates what happens if all shell vendors
    are debarred. Shows execution capacity loss per department and ministry,
    identifying which budget silos are most exposed to vendor-side collapse.
    """
    transactions = DATA["transactions"]
    vendors      = DATA["vendors"]
    ddos         = DATA["ddos"]
    departments  = DATA["departments"]

    vendor_map  = {v["id"]: v for v in vendors}
    ddo_map     = {d["ddo_code"]: d for d in ddos}
    dept_map    = {d["id"]: d for d in departments}
    ddo_to_dept = {d["ddo_code"]: d["dept_id"] for d in ddos}

    # Identify at-risk vendors
    at_risk_vids = {
        v["id"] for v in vendors
        if float(v.get("risk_score", 0)) >= CONTAGION_RISK_THRESHOLD
    }

    # Per-DDO: total spend and spend to at-risk vendors
    ddo_total:    dict = defaultdict(float)
    ddo_at_risk:  dict = defaultdict(float)

    for t in transactions:
        amt = float(t["amount"])
        dco = t["ddo_code"]
        ddo_total[dco]  += amt
        if t["vendor_id"] in at_risk_vids:
            ddo_at_risk[dco] += amt

    # Per-DDO dependency ratio
    ddo_dependency: dict = {}
    for dco in ddo_total:
        if ddo_total[dco] > 0:
            ddo_dependency[dco] = ddo_at_risk[dco] / ddo_total[dco]

    # Per-department contagion exposure (spend-weighted)
    dept_spend:      dict = defaultdict(float)
    dept_at_risk:    dict = defaultdict(float)
    dept_ddos:       dict = defaultdict(list)

    for dco, total in ddo_total.items():
        did = ddo_to_dept.get(dco)
        if not did:
            continue
        dept_spend[did]   += total
        dept_at_risk[did] += ddo_at_risk[dco]
        dept_ddos[did].append({
            "ddo_code":        dco,
            "district":        ddo_map.get(dco, {}).get("district", ""),
            "total_spend_cr":  round(total / 1e7, 2),
            "at_risk_cr":      round(ddo_at_risk.get(dco, 0) / 1e7, 2),
            "dependency_ratio": round(ddo_dependency.get(dco, 0) * 100, 1),
        })

    dept_results = []
    for dept in departments:
        did   = dept["id"]
        total = dept_spend.get(did, 0)
        if total == 0:
            continue
        at_risk   = dept_at_risk.get(did, 0)
        exposure  = at_risk / total
        loss_cr   = round(at_risk / 1e7, 2)
        total_cr  = round(total   / 1e7, 2)

        # Sort DDOs by dependency descending
        ddos_sorted = sorted(dept_ddos[did],
                             key=lambda x: x["dependency_ratio"], reverse=True)

        if exposure >= 0.30:
            risk_level = "CRITICAL"
        elif exposure >= 0.15:
            risk_level = "HIGH"
        elif exposure >= 0.05:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        dept_results.append({
            "dept_id":              did,
            "name":                 dept["name"],
            "ministry":             dept.get("ministry", ""),
            "scheme_type":          dept.get("scheme_type", ""),
            "total_spend_cr":       total_cr,
            "at_risk_spend_cr":     loss_cr,
            "contagion_exposure_pct": round(exposure * 100, 1),
            "risk_level":           risk_level,
            "description": (
                f"{dept['name']} routes {round(exposure*100,1)}% of its transactions "
                f"(₹{loss_cr}Cr of ₹{total_cr}Cr) through at-risk vendors. "
                f"Debarment would immediately freeze this execution capacity."
            ),
            "most_exposed_ddos":    ddos_sorted[:5],
        })

    dept_results.sort(key=lambda x: x["contagion_exposure_pct"], reverse=True)

    # Roll up to ministry level
    ministry_exposure: dict = defaultdict(lambda: {"total": 0.0, "at_risk": 0.0})
    for r in dept_results:
        min_name = r["ministry"]
        ministry_exposure[min_name]["total"]   += r["total_spend_cr"]
        ministry_exposure[min_name]["at_risk"] += r["at_risk_spend_cr"]

    ministry_summary = sorted(
        [
            {
                "ministry":             mn,
                "total_spend_cr":       round(v["total"],   2),
                "at_risk_cr":           round(v["at_risk"], 2),
                "contagion_exposure_pct": round(
                    v["at_risk"] / v["total"] * 100 if v["total"] > 0 else 0, 1
                ),
            }
            for mn, v in ministry_exposure.items()
        ],
        key=lambda x: x["contagion_exposure_pct"],
        reverse=True,
    )

    critical = [d for d in dept_results if d["risk_level"] == "CRITICAL"]
    high     = [d for d in dept_results if d["risk_level"] == "HIGH"]

    return {
        "scenario":        "Immediate debarment of all vendors with risk_score ≥ 0.75",
        "at_risk_vendors": len(at_risk_vids),
        "summary": {
            "critical_depts":             len(critical),
            "high_exposure_depts":        len(high),
            "total_at_risk_across_all_cr": round(
                sum(d["at_risk_spend_cr"] for d in dept_results), 2
            ),
        },
        "ministry_exposure":  ministry_summary,
        "department_exposure": dept_results,
    }
