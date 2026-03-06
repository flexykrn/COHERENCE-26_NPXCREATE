import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Proxy to Python FastAPI backend - Anomalies endpoint
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const response = await fetch(
      `${BACKEND_URL}/api/anomalies${queryString ? '?' + queryString : ''}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Backend API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data: data.data || [] });
  } catch (error) {
    console.error('Failed to fetch anomalies from backend:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch anomalies from backend' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // For complaints/reports submission, we can keep this as a separate endpoint
  // or integrate with the anomaly system later
  const body = await request.json();
  return NextResponse.json({ 
    success: true, 
    message: 'Report submitted successfully',
    data: body 
  });
}
