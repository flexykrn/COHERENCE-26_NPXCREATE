"""
Vendor API endpoints for contractor selection
"""
from fastapi import APIRouter, Query
from typing import Optional
import random

router = APIRouter()
DATA = None  # Will be injected from main.py

@router.get("/vendors")
def get_vendors(
    category: Optional[str] = None,
    limit: int = Query(default=20, ge=1, le=100),
):
    """
    Get vendors with calculated contractor metrics
    
    - category: Filter by category (Construction, Civil Works, Electrical, etc.)
    - limit: Maximum number of vendors to return (1-100)
    """
    vendors = DATA["vendors"]
    
    # Filter by category if specified
    if category:
        vendors = [v for v in vendors if v["category"].lower() == category.lower()]
    
    # Convert to contractor format with enriched data
    contractors = []
    for v in vendors[:limit]:
        risk_score = float(v["risk_score"])
        scaled_risk = int(risk_score * 100)  # Convert 0-1 to 0-100
        
        # Generate realistic metrics based on risk score
        # Lower risk = better metrics
        contractors.append({
            "id": int(v["id"]),
            "name": v["name"],
            "category": v["category"],
            "pan_hash": v["pan_hash"],
            "registration_date": v["registration_date"],
            "riskScore": scaled_risk,
            
            # Derived metrics (inversely correlated with risk)
            "completionRate": max(60, int(100 - (risk_score * 40))),
            "qualityScore": max(55, int(95 - (risk_score * 35))),
            
            # Random but constrained by risk
            "activeProjects": random.randint(2, 8) if scaled_risk < 50 else random.randint(1, 4),
            "pastProjects": random.randint(15, 50) if scaled_risk < 50 else random.randint(8, 25),
            
            # Delays and issues increase with risk
            "avgDelay": int(risk_score * 25),  # 0-13 days
            "litigationCount": 0 if scaled_risk < 30 else (1 if scaled_risk < 60 else random.randint(2, 5)),
            "financialStability": round(1 - (risk_score * 0.4), 2),  # 0.6-1.0
            "costOverrunPct": int(risk_score * 30),  # 0-15%
        })
    
    return {
        "contractors": contractors,
        "total": len(contractors),
        "category": category
    }


@router.get("/vendors/categories")
def get_vendor_categories():
    """Get unique vendor categories"""
    vendors = DATA["vendors"]
    categories = sorted(set(v["category"] for v in vendors))
    
    # Count vendors per category
    category_counts = {}
    for cat in categories:
        category_counts[cat] = len([v for v in vendors if v["category"] == cat])
    
    return {
        "categories": [
            {"name": cat, "count": category_counts[cat]}
            for cat in categories
        ]
    }
