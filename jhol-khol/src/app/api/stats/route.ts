import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Proxy to Python FastAPI backend - Overview endpoint
export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/overview`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Backend API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform backend data to match frontend expectations
    const stats = {
      totalSchemes: data.total_departments || 0,
      activeSchemes: data.total_departments || 0,
      budgetAllocated: `₹${data.total_allocated_cr?.toFixed(2)} Crores`,
      beneficiaries: "95.5 Crore citizens",
      complaintsResolved: data.anomaly_count - data.high_severity_count || 0,
      pendingComplaints: data.high_severity_count || 0,
      transparencyScore: Math.round(data.utilization_pct || 0),
      lastUpdated: new Date().toISOString(),
      // Additional backend data
      totalAllocatedCr: data.total_allocated_cr,
      totalUtilizedCr: data.total_utilized_cr,
      utilizationPct: data.utilization_pct,
      anomalyCount: data.anomaly_count,
      highSeverityCount: data.high_severity_count,
      amountAtRiskCr: data.amount_at_risk_cr,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Failed to fetch overview stats from backend:', error);
    
    // Fallback to static data if backend is unavailable
    const fallbackStats = {
      totalSchemes: 157,
      activeSchemes: 142,
      budgetAllocated: "₹15,42,000 Crores",
      beneficiaries: "95.5 Crore citizens",
      complaintsResolved: 8234,
      pendingComplaints: 1456,
      transparencyScore: 82,
      lastUpdated: new Date().toISOString(),
    };
    
    return NextResponse.json({ 
      success: true, 
      data: fallbackStats,
      warning: 'Using fallback data - backend unavailable'
    });
  }
}
