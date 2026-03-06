from fastapi import APIRouter, Query
from collections import defaultdict

router = APIRouter()
DATA = {}   # injected by main.py


@router.get("/budget/flow")
def get_budget_flow(year: str = Query("2024")):
    transactions = DATA["transactions"]
    ddos         = DATA["ddos"]
    departments  = DATA["departments"]

    ddo_map  = {d["ddo_code"]: d for d in ddos}
    dept_map = {d["id"]: d       for d in departments}

    txns = [t for t in transactions if t["release_date"].startswith(year)]

    ministry_dept   = defaultdict(float)   # (ministry, dept_name) → amount
    dept_district   = defaultdict(float)   # (dept_name, district) → amount

    for t in txns:
        ddo  = ddo_map.get(t["ddo_code"], {})
        dept = dept_map.get(ddo.get("dept_id", ""), {})
        if not dept:
            continue
        ministry   = dept.get("ministry", "Unknown")
        dept_name  = dept.get("name",     "Unknown")
        district   = ddo.get("district",  "Unknown")
        amount     = float(t["amount"])
        ministry_dept[(ministry, dept_name)] += amount
        dept_district[(dept_name, district)] += amount

    # Build nodes & links (D3 Sankey expects integer indices)
    nodes     = []
    node_idx  = {}

    def add_node(name: str, node_type: str) -> int:
        key = f"{node_type}::{name}"
        if key not in node_idx:
            node_idx[key] = len(nodes)
            nodes.append({"name": name, "type": node_type})
        return node_idx[key]

    links = []

    for (ministry, dept_name), amount in ministry_dept.items():
        m_i = add_node(ministry,  "ministry")
        d_i = add_node(dept_name, "department")
        links.append({
            "source": m_i,
            "target": d_i,
            "value":  round(amount / 1e5, 2),   # in Lakhs
        })

    for (dept_name, district), amount in dept_district.items():
        d_i  = add_node(dept_name, "department")
        di_i = add_node(district,  "district")
        links.append({
            "source": d_i,
            "target": di_i,
            "value":  round(amount / 1e5, 2),
        })

    return {
        "year":  year,
        "nodes": nodes,
        "links": links,
    }


@router.get("/budget/departments")
def get_department_spend(year: str = Query("2024")):
    """Per-department allocated vs utilized for bar charts."""
    transactions = DATA["transactions"]
    allocations  = DATA["allocations"]
    ddos         = DATA["ddos"]
    departments  = DATA["departments"]

    ddo_map  = {d["ddo_code"]: d["dept_id"] for d in ddos}
    dept_map = {d["id"]: d for d in departments}

    spend = defaultdict(float)
    for t in transactions:
        if t["release_date"].startswith(year):
            dept_id = ddo_map.get(t["ddo_code"])
            if dept_id:
                spend[dept_id] += float(t["amount"])

    alloc = defaultdict(float)
    for a in allocations:
        if a["fiscal_year"] == year:
            alloc[a["dept_id"]] += float(a["allocated_amount"])

    rows = []
    for dept in departments:
        did = dept["id"]
        allocated = alloc.get(did, 0)
        utilized  = spend.get(did, 0)
        rows.append({
            "dept_id":        did,
            "name":           dept["name"],
            "ministry":       dept["ministry"],
            "scheme_type":    dept["scheme_type"],
            "allocated_cr":   round(allocated / 1e7, 2),
            "utilized_cr":    round(utilized  / 1e7, 2),
            "utilization_pct": round(utilized / allocated * 100, 1) if allocated else 0,
        })

    rows.sort(key=lambda x: x["utilization_pct"])
    return rows
