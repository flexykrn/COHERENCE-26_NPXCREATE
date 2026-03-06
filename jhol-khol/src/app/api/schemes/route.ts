import { NextResponse } from 'next/server';

// Mock database - Replace with actual database in production
const schemes = [
  {
    id: 1,
    title: "Pradhan Mantri Awas Yojana",
    description: "Housing for All scheme providing affordable housing to urban and rural poor",
    budget: "₹48,000 Crores",
    beneficiaries: "1.2 Crore families",
    status: "Active",
    department: "Ministry of Housing and Urban Affairs",
    launchDate: "2015-06-25",
    completionRate: 78,
  },
  {
    id: 2,
    title: "Ayushman Bharat",
    description: "National Health Protection Scheme providing health insurance coverage",
    budget: "₹6,400 Crores",
    beneficiaries: "50 Crore people",
    status: "Active",
    department: "Ministry of Health",
    launchDate: "2018-09-23",
    completionRate: 85,
  },
  {
    id: 3,
    title: "Swachh Bharat Mission",
    description: "Clean India campaign for sanitation and waste management",
    budget: "₹62,009 Crores",
    beneficiaries: "All citizens",
    status: "Active",
    department: "Ministry of Jal Shakti",
    launchDate: "2014-10-02",
    completionRate: 92,
  },
  {
    id: 4,
    title: "Digital India Programme",
    description: "Initiative to transform India into digitally empowered society",
    budget: "₹1,13,000 Crores",
    beneficiaries: "All citizens",
    status: "Active",
    department: "Ministry of Electronics & IT",
    launchDate: "2015-07-01",
    completionRate: 68,
  },
  {
    id: 5,
    title: "PM-KISAN",
    description: "Income support to farmers with direct cash transfer",
    budget: "₹75,000 Crores",
    beneficiaries: "11 Crore farmers",
    status: "Active",
    department: "Ministry of Agriculture",
    launchDate: "2019-02-01",
    completionRate: 95,
  },
];

export async function GET() {
  return NextResponse.json({ success: true, data: schemes });
}

export async function POST(request: Request) {
  const body = await request.json();
  const newScheme = {
    id: schemes.length + 1,
    ...body,
    completionRate: 0,
  };
  schemes.push(newScheme);
  return NextResponse.json({ success: true, data: newScheme });
}
