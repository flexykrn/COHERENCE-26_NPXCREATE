import { NextResponse } from 'next/server';

export async function GET() {
  const stats = {
    totalSchemes: 157,
    activeSchemes: 142,
    budgetAllocated: "₹15,42,000 Crores",
    beneficiaries: "95.5 Crore citizens",
    complaintsResolved: 8234,
    pendingComplaints: 1456,
    transparencyScore: 82,
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json({ success: true, data: stats });
}
