import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// POST /api/saved-reports/[id]/execute - Execute a saved report
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the saved report
    const savedReport = await db.savedReport.findFirst({
      where: {
        id,
        createdBy: session.user.id,
        isActive: true,
      },
    });

    if (!savedReport) {
      return NextResponse.json(
        { error: 'Saved report not found or inactive' },
        { status: 404 }
      );
    }

    // Parse filters
    const filters = JSON.parse(savedReport.filters);
    
    // Get date range from filters or use defaults
    const from = filters.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = filters.to || new Date().toISOString().split('T')[0];

    // Build the report URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const reportUrl = `${baseUrl}/api/reports/${savedReport.reportType}?from=${from}&to=${to}`;

    // Fetch the report data
    const response = await fetch(reportUrl, {
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to generate report');
    }

    const reportData = await response.json();

    // Update last run timestamp
    await db.savedReport.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        // Update nextRunAt if schedule is set
        ...(savedReport.schedule && {
          nextRunAt: calculateNextRun(savedReport.schedule),
        }),
      },
    });

    // Create execution history record
    await db.savedReportHistory.create({
      data: {
        savedReportId: id,
        executedAt: new Date(),
        executedBy: session.user.id,
        status: 'SUCCESS',
        recordCount: reportData.data?.length || 0,
      },
    }).catch(() => {
      // History table might not exist, ignore error
    });

    return NextResponse.json({
      success: true,
      reportName: savedReport.name,
      reportType: savedReport.reportType,
      format: savedReport.format,
      executedAt: new Date().toISOString(),
      data: reportData,
    });
  } catch (error) {
    console.error('Failed to execute saved report:', error);
    
    // Log failed execution
    try {
      const { id } = await params;
      await db.savedReportHistory.create({
        data: {
          savedReportId: id,
          executedAt: new Date(),
          executedBy: session?.user?.id || 'unknown',
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      }).catch(() => {});
    } catch {}

    return NextResponse.json(
      { error: 'Failed to execute saved report' },
      { status: 500 }
    );
  }
}

// Helper function to calculate next run date
function calculateNextRun(schedule: string): Date {
  const now = new Date();
  const next = new Date(now);
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
