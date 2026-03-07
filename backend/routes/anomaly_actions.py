"""
Anomaly Action Workflow Engine
================================
Defines actionable responses for each anomaly type.
Provides clear next steps for analysts/auditors.

This module enhances the anomaly detection engine by:
1. Mapping anomaly types to specific actions
2. Calculating urgency and priority
3. Suggesting audit procedures
4. Integrating with blockchain for audit trails
"""

from enum import Enum
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel


class ActionPriority(str, Enum):
    IMMEDIATE = "IMMEDIATE"   # Within 24 hours
    HIGH = "HIGH"             # Within 3 days
    MEDIUM = "MEDIUM"         # Within 1 week
    LOW = "LOW"               # Within 1 month


class ActionCategory(str, Enum):
    BLOCK_PAYMENT = "BLOCK_PAYMENT"
    MANUAL_AUDIT = "MANUAL_AUDIT"
    VENDOR_INVESTIGATION = "VENDOR_INVESTIGATION"
    FUND_RECOVERY = "FUND_RECOVERY"
    PREVENTIVE_MEASURE = "PREVENTIVE_MEASURE"
    STAKEHOLDER_ALERT = "STAKEHOLDER_ALERT"
    BLACKLIST_VENDOR = "BLACKLIST_VENDOR"
    DEPARTMENT_REVIEW = "DEPARTMENT_REVIEW"


class AnomalyAction(BaseModel):
    """Action recommendation for a detected anomaly"""
    action_id: str
    anomaly_id: str
    priority: ActionPriority
    category: ActionCategory
    action_title: str
    action_description: str
    required_steps: List[str]
    required_documents: List[str]
    responsible_authority: str
    deadline: str
    estimated_recovery_cr: Optional[float] = None
    blockchain_track: bool = True


# ──────────────────────────────────────────────────────────────────────────────
# ACTION RULES ENGINE
# ──────────────────────────────────────────────────────────────────────────────

ACTION_RULES = {
    "Statistical Outlier": {
        "priority": ActionPriority.HIGH,
        "category": ActionCategory.MANUAL_AUDIT,
        "title": "Conduct Detailed Transaction Audit",
        "description": (
            "Statistical analysis flagged this transaction as significantly deviating "
            "from normal patterns. Requires manual verification of legitimacy."
        ),
        "steps": [
            "Request supporting documents (invoice, purchase order, delivery challan)",
            "Verify vendor registration and credentials",
            "Cross-check with procurement committee approval",
            "Validate market price comparison",
            "Interview DDO if amount exceeds ₹10L",
            "Log findings in audit management system"
        ],
        "documents": [
            "Purchase Order",
            "Tax Invoice",
            "Delivery Receipt",
            "Procurement Committee Minutes",
            "Market Rate Comparison",
            "DDO Authorization Letter"
        ],
        "authority": "District Audit Officer",
    },
    
    "Duplicate Payment": {
        "priority": ActionPriority.IMMEDIATE,
        "category": ActionCategory.BLOCK_PAYMENT,
        "title": "Block Payment & Initiate Recovery",
        "description": (
            "System detected identical payment to same vendor within suspicious timeframe. "
            "Immediate action required to prevent fund loss."
        ),
        "steps": [
            "Freeze second payment if not yet processed",
            "Issue stop-payment to treasury",
            "Notify bank to hold funds if already transferred",
            "Send legal notice to vendor for refund",
            "Investigate DDO involvement (error vs fraud)",
            "File FIR if fraud confirmed",
            "Update duplicate detection database"
        ],
        "documents": [
            "Both Payment Orders",
            "Vendor Bank Statement",
            "DDO Statement",
            "Legal Notice Draft",
            "Recovery Certificate"
        ],
        "authority": "Treasury Officer + Vigilance Department",
    },
    
    "Vendor Concentration": {
        "priority": ActionPriority.HIGH,
        "category": ActionCategory.VENDOR_INVESTIGATION,
        "title": "Investigate Potential Collusion",
        "description": (
            "DDO is conducting business with extremely limited vendor pool, "
            "suggesting possible conflict of interest or collusion."
        ),
        "steps": [
            "Analyze vendor ownership (directors, shareholders)",
            "Check for family/personal relationships with DDO",
            "Review procurement process compliance",
            "Assess if competitive bidding was conducted",
            "Compare prices with market rates",
            "Interview DDO and vendors separately",
            "Consider anti-cartel investigation"
        ],
        "documents": [
            "Vendor Registration Certificates",
            "Director/Ownership Details",
            "Bid Documents",
            "Price Comparison Analysis",
            "Procurement Policy Compliance Report",
            "Interview Records"
        ],
        "authority": "Vigilance Department + CBI (if large-scale)",
    },
    
    "Q4 Acceleration": {
        "priority": ActionPriority.MEDIUM,
        "category": ActionCategory.DEPARTMENT_REVIEW,
        "title": "Review Budget Utilization Justification",
        "description": (
            "Department exhibited year-end spending rush pattern, "
            "indicating potential mismanagement or pressure to exhaust budget."
        ),
        "steps": [
            "Request quarterly expenditure breakdown",
            "Verify if Q4 spending was pre-planned",
            "Check for artificial advance payments",
            "Review project timelines and deliverables",
            "Implement quarterly spending caps for next FY",
            "Assess if quality compromised due to rush",
            "Recommend process improvements"
        ],
        "documents": [
            "Quarterly Expenditure Report",
            "Annual Budget Plan",
            "Project Timelines",
            "Delivery Reports",
            "Quality Assessment Reports"
        ],
        "authority": "Budget Controller + Department Head",
    },
    
    "Spend Deceleration": {
        "priority": ActionPriority.MEDIUM,
        "category": ActionCategory.PREVENTIVE_MEASURE,
        "title": "Proactive Lapse Prevention Meeting",
        "description": (
            "Early warning system detected slowing expenditure velocity. "
            "Proactive intervention can prevent end-of-year budget lapse."
        ),
        "steps": [
            "Schedule meeting with department head",
            "Identify bottlenecks causing slowdown",
            "Review pending proposals and approvals",
            "Fast-track non-controversial expenditures",
            "Reallocate funds to high-velocity projects",
            "Set monthly spend targets with monitoring",
            "Provide administrative support if needed"
        ],
        "documents": [
            "Monthly Expenditure Trend Report",
            "Pending Proposals List",
            "Bottleneck Analysis",
            "Reallocation Proposal"
        ],
        "authority": "Finance Secretary + Department Head",
    },
    
    "Cross-Ministry Contamination": {
        "priority": ActionPriority.HIGH,
        "category": ActionCategory.BLACKLIST_VENDOR,
        "title": "Multi-Ministry Vendor Risk Assessment",
        "description": (
            "High-risk vendor has penetrated multiple ministries, "
            "suggesting coordinated fraud network or systemic vulnerability."
        ),
        "steps": [
            "Aggregate all transactions across ministries",
            "Check vendor against criminal databases",
            "Conduct surprise inspection of vendor premises",
            "Interview ministry officials who approved vendor",
            "Assess if vendor used different names/entities",
            "Consider government-wide blacklist if fraud confirmed",
            "Share intelligence with other states/agencies"
        ],
        "documents": [
            "Cross-Ministry Transaction Report",
            "Vendor Background Check",
            "Field Investigation Report",
            "Official Interview Records",
            "Blacklist Recommendation"
        ],
        "authority": "Central Vigilance Commission + Ministry of Finance",
    },
}


def generate_action(anomaly: Dict) -> AnomalyAction:
    """
    Generate an actionable response for a detected anomaly.
    
    Args:
        anomaly: Anomaly dict from detection engine
        
    Returns:
        AnomalyAction with specific steps and deadlines
    """
    alert_type = anomaly.get("alert_type", "Unknown")
    rules = ACTION_RULES.get(alert_type)
    
    if not rules:
        # Default fallback action
        return AnomalyAction(
            action_id=f"ACT-{anomaly.get('alert_id', 'UNKNOWN')}",
            anomaly_id=anomaly.get("alert_id", ""),
            priority=ActionPriority.MEDIUM,
            category=ActionCategory.MANUAL_AUDIT,
            action_title="General Anomaly Review",
            action_description="Review flagged transaction and determine appropriate action.",
            required_steps=["Review anomaly details", "Consult senior officer", "Document findings"],
            required_documents=["Transaction Records"],
            responsible_authority="Audit Officer",
            deadline=(datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
            blockchain_track=True
        )
    
    # Calculate deadline based on priority
    days_offset = {
        ActionPriority.IMMEDIATE: 1,
        ActionPriority.HIGH: 3,
        ActionPriority.MEDIUM: 7,
        ActionPriority.LOW: 30,
    }
    deadline = datetime.now() + timedelta(days=days_offset[rules["priority"]])
    
    # Estimate recovery amount for financial anomalies
    recovery = None
    if alert_type in ["Duplicate Payment", "Statistical Outlier"]:
        recovery = anomaly.get("amount_cr")
    
    return AnomalyAction(
        action_id=f"ACT-{anomaly.get('alert_id', 'UNKNOWN')}",
        anomaly_id=anomaly.get("alert_id", ""),
        priority=rules["priority"],
        category=rules["category"],
        action_title=rules["title"],
        action_description=rules["description"],
        required_steps=rules["steps"],
        required_documents=rules["documents"],
        responsible_authority=rules["authority"],
        deadline=deadline.strftime("%Y-%m-%d"),
        estimated_recovery_cr=recovery,
        blockchain_track=True
    )


def batch_generate_actions(anomalies: List[Dict]) -> List[AnomalyAction]:
    """Generate actions for a batch of anomalies"""
    return [generate_action(a) for a in anomalies]


def get_action_summary(actions: List[AnomalyAction]) -> Dict:
    """Generate summary statistics for action workflow"""
    priority_counts = {p.value: 0 for p in ActionPriority}
    category_counts = {c.value: 0 for c in ActionCategory}
    total_recovery = 0.0
    
    for action in actions:
        priority_counts[action.priority] += 1
        category_counts[action.category] += 1
        if action.estimated_recovery_cr:
            total_recovery += action.estimated_recovery_cr
    
    return {
        "total_actions": len(actions),
        "priority_breakdown": priority_counts,
        "category_breakdown": category_counts,
        "estimated_total_recovery_cr": round(total_recovery, 2),
        "immediate_actions": priority_counts["IMMEDIATE"],
        "blockchain_tracked": len([a for a in actions if a.blockchain_track])
    }
