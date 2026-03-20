import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/saved-reports - List all saved reports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('reportType');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where: Record<string, unknown> = { createdBy: session.user.id };
    if (reportType) where.reportType = reportType;
    if (activeOnly) where.isActive = true;

    const savedReports = await db.savedReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Parse JSON fields for response
    const reports = savedReports.map(report => ({
      ...report,
      filters: JSON.parse(report.filters),
      recipients: report.recipients ? JSON.parse(report.recipients) : [],
    }));

    return NextResponse.json({ success: true, data: reports });
  } catch (error) {
    console.error('Failed to fetch saved reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved reports' },
      { status: 500 }
    );
  }
}

// POST /api/saved-reports - Create a new saved report
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      reportType,
      filters,
      schedule,
      recipients,
      format = 'PDF',
    } = body;

    // Validate required fields
    if (!name || !reportType || !filters) {
      return NextResponse.json(
        { error: 'Missing required fields: name, reportType, filters' },
        { status: 400 }
      );
    }

    // Validate report type
    const validReportTypes = [
      'job-card-cost',
      'monthly-closed-jobs',
      'material-usage',
      'external-costs',
      'fleet-availability',
      'pm-compliance',
      'procurement-spend',
      'technician-utilisation',
      'fuel-consumption',
      'stock-valuation',
    ];

    if (!validReportTypes.includes(reportType)) {
      return NextResponse.json(
        { error: `Invalid report type. Valid types: ${validReportTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate format
    const validFormats = ['PDF', 'EXCEL', 'CSV'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Valid formats: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate schedule if provided
    if (schedule) {
      const validSchedules = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'];
      if (!validSchedules.includes(schedule)) {
        return NextResponse.json(
          { error: `Invalid schedule. Valid options: ${validSchedules.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Calculate next run date if schedule is set
    let nextRunAt: Date | null = null;
    if (schedule) {
      nextRunAt = calculateNextRun(schedule);
    }

    const savedReport = await db.savedReport.create({
      data: {
        name,
        reportType,
        filters: JSON.stringify(filters),
        schedule,
        nextRunAt,
        recipients: recipients ? JSON.stringify(recipients) : null,
        format,
        createdBy: session.user.id,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...savedReport,
        filters: JSON.parse(savedReport.filters),
        recipients: savedReport.recipients ? JSON.parse(savedReport.recipients) : [],
      },
    });
  } catch (error) {
    console.error('Failed to create saved report:', error);
    return NextResponse.json(
      { error: 'Failed to create saved report' },
      { status: 500 }
    );
  }
}

// Helper function to calculate next run date
function calculateNextRun(schedule: string): Date {
  const now = new Date();
  const next = new Date(now);
  
  // Set to start of next day at 8 AM
  next.setHours(8, 0, 0, 0);
  
  switch (schedule) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
  }
  
  return next;
}
