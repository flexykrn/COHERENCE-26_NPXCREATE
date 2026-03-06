import { NextResponse } from 'next/server';

// Mock database - Replace with actual database in production
const complaints = [
  {
    id: 1,
    title: "Road Construction Delay",
    description: "NH-48 expansion project delayed by 6 months without explanation",
    category: "Infrastructure",
    location: "Mumbai, Maharashtra",
    status: "Under Review",
    priority: "High",
    submittedBy: "Citizen",
    submittedDate: "2026-02-15",
    upvotes: 234,
  },
  {
    id: 2,
    title: "Irregular Fund Allocation",
    description: "Discrepancy in rural development fund distribution in district",
    category: "Finance",
    location: "Varanasi, UP",
    status: "Investigating",
    priority: "Critical",
    submittedBy: "Anonymous",
    submittedDate: "2026-02-20",
    upvotes: 567,
  },
  {
    id: 3,
    title: "Ghost Beneficiaries in Scheme",
    description: "Fake beneficiaries found in housing scheme records",
    category: "Welfare",
    location: "Bengaluru, Karnataka",
    status: "Resolved",
    priority: "Critical",
    submittedBy: "Whistleblower",
    submittedDate: "2026-01-10",
    upvotes: 892,
  },
];

export async function GET() {
  return NextResponse.json({ success: true, data: complaints });
}

export async function POST(request: Request) {
  const body = await request.json();
  const newComplaint = {
    id: complaints.length + 1,
    ...body,
    status: "Submitted",
    submittedDate: new Date().toISOString().split('T')[0],
    upvotes: 0,
  };
  complaints.push(newComplaint);
  return NextResponse.json({ success: true, data: newComplaint });
}
