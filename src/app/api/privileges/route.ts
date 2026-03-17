import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/privileges - List all privileges
export async function GET(request: NextRequest) {
  try {
    const privileges = await db.privilegeDefinition.findMany({
      orderBy: [
        { category: 'asc' },
        { code: 'asc' },
      ],
    });

    return NextResponse.json({ data: privileges });
  } catch (error) {
    console.error('Failed to fetch privileges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch privileges' },
      { status: 500 }
    );
  }
}
