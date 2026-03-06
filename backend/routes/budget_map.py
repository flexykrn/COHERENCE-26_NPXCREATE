"""
Budget Map API - State and District level budget aggregation
"""
from fastapi import APIRouter, HTTPException
from typing import Optional

router = APIRouter()
DATA: dict = {}

# State-to-Department mapping (static mapping for demo)
# Distributing 50 departments across major states
STATE_DEPARTMENT_MAP = {
    "mh": {"name": "Maharashtra", "depts": [1, 2, 3, 4, 5, 6]},
    "ka": {"name": "Karnataka", "depts": [7, 8, 9, 10, 11]},
    "tn": {"name": "Tamil Nadu", "depts": [12, 13, 14, 15, 16]},
    "up": {"name": "Uttar Pradesh", "depts": [17, 18, 19, 20, 21]},
    "rj": {"name": "Rajasthan", "depts": [22, 23, 24, 25]},
    "gj": {"name": "Gujarat", "depts": [26, 27, 28, 29]},
    "mp": {"name": "Madhya Pradesh", "depts": [30, 31, 32]},
    "wb": {"name": "West Bengal", "depts": [33, 34, 35]},
    "dl": {"name": "Delhi", "depts": [36, 37]},
    "hr": {"name": "Haryana", "depts": [38, 39]},
    "pb": {"name": "Punjab", "depts": [40, 41]},
    "ap": {"name": "Andhra Pradesh", "depts": [42, 43]},
    "ts": {"name": "Telangana", "depts": [44, 45]},
    "br": {"name": "Bihar", "depts": [46]},
    "or": {"name": "Odisha", "depts": [47]},
    "jh": {"name": "Jharkhand", "depts": [48]},
    "ct": {"name": "Chhattisgarh", "depts": [49]},
    "as": {"name": "Assam", "depts": [50]},
    "kl": {"name": "Kerala", "depts": [1, 2]},
    "ut": {"name": "Uttarakhand", "depts": [3, 4]},
    "hp": {"name": "Himachal Pradesh", "depts": [5,6]},
    "jk": {"name": "Jammu and Kashmir", "depts": [7, 8]},
    "ga": {"name": "Goa", "depts": [9]},
    "sk": {"name": "Sikkim", "depts": [10]},
    "mn": {"name": "Manipur", "depts": [11]},
    "tr": {"name": "Tripura", "depts": [12]},
    "ml": {"name": "Meghalaya", "depts": [13]},
    "mz": {"name": "Mizoram", "depts": [14]},
    "nl": {"name": "Nagaland", "depts": [15]},
    "ar": {"name": "Arunachal Pradesh", "depts": [16]},
}

# District mapping per state (simplified version - maps to same departments)
DISTRICT_MAP = {
    "mh": [
        {"id": "mumbai", "name": "Mumbai", "depts": [1, 2]},
        {"id": "pune", "name": "Pune", "depts": [3, 4]},
        {"id": "nagpur", "name": "Nagpur", "depts": [5]},
        {"id": "nashik", "name": "Nashik", "depts": [6]},
    ],
    "ka": [
        {"id": "bangalore", "name": "Bengaluru", "depts": [7, 8]},
        {"id": "mysore", "name": "Mysuru", "depts": [9]},
        {"id": "hubli", "name": "Hubli-Dharwad", "depts": [10]},
        {"id": "mangalore", "name": "Mangaluru", "depts": [11]},
    ],
    "tn": [
        {"id": "chennai", "name": "Chennai", "depts": [12, 13]},
        {"id": "coimbatore", "name": "Coimbatore", "depts": [14]},
        {"id": "madurai", "name": "Madurai", "depts": [15]},
        {"id": "trichy", "name": "Tiruchirappalli", "depts": [16]},
    ],
    "up": [
        {"id": "lucknow", "name": "Lucknow", "depts": [17, 18]},
        {"id": "varanasi", "name": "Varanasi", "depts": [19]},
        {"id": "agra", "name": "Agra", "depts": [20]},
        {"id": "kanpur", "name": "Kanpur", "depts": [21]},
    ],
    "rj": [
        {"id": "jaipur", "name": "Jaipur", "depts": [22, 23]},
        {"id": "jodhpur", "name": "Jodhpur", "depts": [24]},
        {"id": "udaipur", "name": "Udaipur", "depts": [25]},
    ],
    "gj": [
        {"id": "ahmedabad", "name": "Ahmedabad", "depts": [26, 27]},
        {"id": "surat", "name": "Surat", "depts": [28]},
        {"id": "vadodara", "name": "Vadodara", "depts": [29]},
    ],
    "mp": [
        {"id": "bhopal", "name": "Bhopal", "depts": [30]},
        {"id": "indore", "name": "Indore", "depts": [31]},
        {"id": "gwalior", "name": "Gwalior", "depts": [32]},
    ],
    "wb": [
        {"id": "kolkata", "name": "Kolkata", "depts": [33, 34]},
        {"id": "howrah", "name": "Howrah", "depts": [35]},
    ],
    "dl": [
        {"id": "central", "name": "Central Delhi", "depts": [36]},
        {"id": "south", "name": "South Delhi", "depts": [37]},
    ],
    "hr": [
        {"id": "gurgaon", "name": "Gurgaon", "depts": [38]},
        {"id": "faridabad", "name": "Faridabad", "depts": [39]},
    ],
    "pb": [
        {"id": "ludhiana", "name": "Ludhiana", "depts": [40]},
        {"id": "amritsar", "name": "Amritsar", "depts": [41]},
    ],
    "ap": [
        {"id": "visakhapatnam", "name": "Visakhapatnam", "depts": [42]},
        {"id": "vijayawada", "name": "Vijayawada", "depts": [43]},
    ],
    "ts": [
        {"id": "hyderabad", "name": "Hyderabad", "depts": [44]},
        {"id": "warangal", "name": "Warangal", "depts": [45]},
    ],
    "br": [
        {"id": "patna", "name": "Patna", "depts": [46]},
    ],
    "or": [
        {"id": "bhubaneswar", "name": "Bhubaneswar", "depts": [47]},
    ],
    "jh": [
        {"id": "ranchi", "name": "Ranchi", "depts": [48]},
    ],
    "ct": [
        {"id": "raipur", "name": "Raipur", "depts": [49]},
    ],
    "as": [
        {"id": "guwahati", "name": "Guwahati", "depts": [50]},
    ],
    "kl": [
        {"id": "thiruvananthapuram", "name": "Thiruvananthapuram", "depts": [1]},
        {"id": "kochi", "name": "Kochi", "depts": [2]},
    ],
    "ut": [
        {"id": "dehradun", "name": "Dehradun", "depts": [3]},
        {"id": "haridwar", "name": "Haridwar", "depts": [4]},
    ],
    "hp": [
        {"id": "shimla", "name": "Shimla", "depts": [5]},
        {"id": "manali", "name": "Manali", "depts": [6]},
    ],
    "jk": [
        {"id": "srinagar", "name": "Srinagar", "depts": [7]},
        {"id": "jammu", "name": "Jammu", "depts": [8]},
    ],
    "ga": [
        {"id": "panaji", "name": "Panaji", "depts": [9]},
    ],
    "sk": [
        {"id": "gangtok", "name": "Gangtok", "depts": [10]},
    ],
    "mn": [
        {"id": "imphal", "name": "Imphal", "depts": [11]},
    ],
    "tr": [
        {"id": "agartala", "name": "Agartala", "depts": [12]},
    ],
    "ml": [
        {"id": "shillong", "name": "Shillong", "depts": [13]},
    ],
    "mz": [
        {"id": "aizawl", "name": "Aizawl", "depts": [14]},
    ],
    "nl": [
        {"id": "kohima", "name": "Kohima", "depts": [15]},
    ],
    "ar": [
        {"id": "itanagar", "name": "Itanagar", "depts": [16]},
    ],
}


@router.get("/budget/states")
async def get_all_states():
    """
    Get budget data aggregated by state
    """
    states_data = []
    
    # Build DDO to dept mapping
    ddo_dept_map = {ddo["ddo_code"]: int(ddo["dept_id"]) for ddo in DATA.get("ddos", [])}
    
    for state_id, state_info in STATE_DEPARTMENT_MAP.items():
        state_depts = state_info["depts"]
        
        # Aggregate allocations for this state's departments
        total_allocated = 0
        total_revised = 0
        
        for alloc in DATA.get("allocations", []):
            dept_id = int(alloc["dept_id"])
            if dept_id in state_depts:
                total_allocated += float(alloc["allocated_amount"])
                total_revised += float(alloc.get("revised_amount", alloc["allocated_amount"]))
        
        # Aggregate transactions (actual spent) - join through DDO
        total_spent = 0
        for tx in DATA.get("transactions", []):
            ddo_code = tx.get("ddo_code", "")
            dept_id = ddo_dept_map.get(ddo_code)
            if dept_id and dept_id in state_depts:
                total_spent += float(tx["amount"])
        
        # Convert to crores (amounts are in rupees)
        allocated_cr = total_allocated / 10000000
        spent_cr = total_spent / 10000000
        
        states_data.append({
            "id": state_id,
            "name": state_info["name"],
            "allocated": round(allocated_cr, 2),
            "spent": round(spent_cr, 2),
            "utilization": round((spent_cr / allocated_cr * 100) if allocated_cr > 0 else 0, 2),
            "districts_count": len(DISTRICT_MAP.get(state_id, []))
        })
    
    # Sort by allocated amount (descending)
    states_data.sort(key=lambda x: x["allocated"], reverse=True)
    
    return {
        "states": states_data,
        "total_states": len(states_data)
    }


@router.get("/budget/states/{state_id}")
async def get_state_details(state_id: str):
    """
    Get detailed budget data for a specific state including district breakdown
    """
    if state_id not in STATE_DEPARTMENT_MAP:
        raise HTTPException(status_code=404, detail=f"State '{state_id}' not found")
    
    state_info = STATE_DEPARTMENT_MAP[state_id]
    state_depts = state_info["depts"]
    
    # Build DDO to dept mapping
    ddo_dept_map = {ddo["ddo_code"]: int(ddo["dept_id"]) for ddo in DATA.get("ddos", [])}
    
    # Get state-level aggregates
    total_allocated = 0
    total_revised = 0
    total_spent = 0
    
    for alloc in DATA.get("allocations", []):
        dept_id = int(alloc["dept_id"])
        if dept_id in state_depts:
            total_allocated += float(alloc["allocated_amount"])
            total_revised += float(alloc.get("revised_amount", alloc["allocated_amount"]))
    
    for tx in DATA.get("transactions", []):
        ddo_code = tx.get("ddo_code", "")
        dept_id = ddo_dept_map.get(ddo_code)
        if dept_id and dept_id in state_depts:
            total_spent += float(tx["amount"])
    
    # Get district breakdown
    districts = []
    for district in DISTRICT_MAP.get(state_id, []):
        district_depts = district["depts"]
        dist_allocated = 0
        dist_spent = 0
        
        for alloc in DATA.get("allocations", []):
            dept_id = int(alloc["dept_id"])
            if dept_id in district_depts:
                dist_allocated += float(alloc["allocated_amount"])
        
        for tx in DATA.get("transactions", []):
            ddo_code = tx.get("ddo_code", "")
            dept_id = ddo_dept_map.get(ddo_code)
            if dept_id and dept_id in district_depts:
                dist_spent += float(tx["amount"])
        
        districts.append({
            "id": district["id"],
            "name": district["name"],
            "allocated": round(dist_allocated / 10000000, 2),
            "spent": round(dist_spent / 10000000, 2)
        })
    
    return {
        "id": state_id,
        "name": state_info["name"],
        "allocated": round(total_allocated / 10000000, 2),
        "spent": round(total_spent / 10000000, 2),
        "utilization": round((total_spent / total_allocated * 100) if total_allocated > 0 else 0, 2),
        "districts": districts
    }


@router.get("/budget/schemes")
async def get_schemes_overview():
    """
    Get welfare schemes with budget and utilization data
    """
    schemes_data = []
    
    for scheme in DATA.get("welfare_schemes", []):
        scheme_id = scheme["scheme_id"]
        
        # Get disbursement data for this scheme
        disbursements = [d for d in DATA.get("scheme_disbursements", []) 
                        if d["scheme_id"] == scheme_id]
        
        # Calculate trends (quarterly disbursements)
        trend = []
        for quarter in range(1, 5):  # 4 quarters
            quarter_total = sum(
                float(d.get("actual_disbursed_lakhs", 0)) 
                for d in disbursements 
                if int(d.get("quarter", 1)) == quarter
            )
            trend.append(round(quarter_total / 10, 2))  # Convert lakhs to crores
        # Extend to 12 months by repeating quarters
        trend = trend * 3
        
        schemes_data.append({
            "id": scheme_id,
            "name": scheme["scheme_name"],
            "category": scheme["scheme_category"],
            "allocated": float(scheme["annual_budget_cr"]),
            "spent": float(scheme["fy2024_disbursed_cr"]),
            "utilization": float(scheme["fy2024_utilization_pct"]),
            "trend": trend,
            "anomaly_flag": scheme.get("anomaly_flag", "normal"),
            "delivery_mode": scheme.get("delivery_mode", "N/A"),
            "beneficiaries": int(float(scheme.get("target_beneficiaries_lakhs", 0)) * 100000)
        })
    
    return {
        "schemes": schemes_data,
        "total_schemes": len(schemes_data)
    }


@router.get("/budget/national-stats")
async def get_national_stats():
    """
    Get national-level budget statistics
    """
    total_allocated = sum(float(a["allocated_amount"]) for a in DATA.get("allocations", []))
    total_revised = sum(float(a.get("revised_amount", a["allocated_amount"])) for a in DATA.get("allocations", []))
    total_spent = sum(float(t["amount"]) for t in DATA.get("transactions", []))
    
    total_schemes = len(DATA.get("welfare_schemes", []))
    active_schemes = len([s for s in DATA.get("welfare_schemes", []) if s.get("active") == "1"])
    
    total_alerts = len(DATA.get("alerts", []))
    high_severity_alerts = len([a for a in DATA.get("alerts", []) if float(a.get("confidence_score", 0)) >= 0.8])
    
    return {
        "allocated": round(total_allocated / 10000000, 2),
        "revised": round(total_revised / 10000000, 2),
        "spent": round(total_spent / 10000000, 2),
        "utilization": round((total_spent / total_allocated * 100) if total_allocated > 0 else 0, 2),
        "schemes": {
            "total": total_schemes,
            "active": active_schemes
        },
        "alerts": {
            "total": total_alerts,
            "high_severity": high_severity_alerts
        }
    }
