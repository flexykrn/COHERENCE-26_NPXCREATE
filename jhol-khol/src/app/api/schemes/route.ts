import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Proxy to Python FastAPI backend
export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/schemes`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data: data.schemes || [] });
  } catch (error) {
    console.error('Failed to fetch schemes from backend:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schemes from backend' },
      { status: 500 }
    );
  }
}
