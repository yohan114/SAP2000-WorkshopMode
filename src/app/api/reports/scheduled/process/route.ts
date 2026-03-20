import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { processScheduledReports } from '@/lib/email-service';

// POST /api/reports/scheduled/process - Process all scheduled reports that are due
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process all due scheduled reports
    const results = await processScheduledReports();

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} scheduled reports`,
      results,
    });
  } catch (error) {
    console.error('Failed to process scheduled reports:', error);
    return NextResponse.json(
      { error: 'Failed to process scheduled reports' },
      { status: 500 }
    );
  }
}

// GET /api/reports/scheduled/process - Get status of scheduled reports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all scheduled reports with their next run times
    const scheduledReports = await db.savedReport.findMany({
      where: {
        isActive: true,
        schedule: { not: null },
      },
      orderBy: { nextRunAt: 'asc' },
    });

    const now = new Date();
    const overdue = scheduledReports.filter(r => r.nextRunAt && new Date(r.nextRunAt) <= now);
    const upcoming = scheduledReports.filter(r => r.nextRunAt && new Date(r.nextRunAt) > now);

    return NextResponse.json({
      success: true,
      total: scheduledReports.length,
      overdue: overdue.length,
      upcoming: upcoming.length,
      reports: {
        overdue: overdue.map(r => ({
          id: r.id,
          name: r.name,
          schedule: r.schedule,
          nextRunAt: r.nextRunAt,
          lastRunAt: r.lastRunAt,
        })),
        upcoming: upcoming.map(r => ({
          id: r.id,
          name: r.name,
          schedule: r.schedule,
          nextRunAt: r.nextRunAt,
          lastRunAt: r.lastRunAt,
        })),
      },
    });
  } catch (error) {
    console.error('Failed to get scheduled reports status:', error);
    return NextResponse.json(
      { error: 'Failed to get scheduled reports status' },
      { status: 500 }
    );
  }
}
