import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Schema for creating a saved report
const createSavedReportSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  reportType: z.string().min(1, 'Report type is required'),
  filters: z.record(z.string(), z.any()).optional().default({}),
  schedule: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional().nullable(),
  recipients: z.array(z.string().email()).optional().nullable(),
  format: z.enum(['PDF', 'EXCEL', 'CSV']).optional().default('PDF'),
  createdBy: z.string().min(1, 'Created by is required'),
});

// GET /api/reports/saved - List all saved reports
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('reportType');
    const createdBy = searchParams.get('createdBy');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (reportType) where.reportType = reportType;
    if (createdBy) where.createdBy = createdBy;
    if (isActive !== null) where.isActive = isActive === 'true';

    const savedReports = await db.savedReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Parse JSON fields for each report
    const reportsWithParsedData = savedReports.map(report => ({
      ...report,
      filters: JSON.parse(report.filters),
      recipients: report.recipients ? JSON.parse(report.recipients) : null,
    }));

    return NextResponse.json({
      data: reportsWithParsedData,
      total: savedReports.length,
    });
  } catch (error) {
    console.error('Failed to fetch saved reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved reports' },
      { status: 500 }
    );
  }
}

// POST /api/reports/saved - Create a new saved report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createSavedReportSchema.parse(body);

    // Calculate next run date if schedule is set
    let nextRunAt: Date | null = null;
    if (validated.schedule) {
      const now = new Date();
      switch (validated.schedule) {
        case 'DAILY':
          nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'WEEKLY':
          nextRunAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'MONTHLY':
          nextRunAt = new Date(now.setMonth(now.getMonth() + 1));
          break;
      }
    }

    const savedReport = await db.savedReport.create({
      data: {
        name: validated.name,
        reportType: validated.reportType,
        filters: JSON.stringify(validated.filters),
        schedule: validated.schedule || null,
        nextRunAt,
        recipients: validated.recipients ? JSON.stringify(validated.recipients) : null,
        format: validated.format,
        createdBy: validated.createdBy,
        isActive: true,
      },
    });

    return NextResponse.json({
      ...savedReport,
      filters: JSON.parse(savedReport.filters),
      recipients: savedReport.recipients ? JSON.parse(savedReport.recipients) : null,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to create saved report:', error);
    return NextResponse.json(
      { error: 'Failed to create saved report' },
      { status: 500 }
    );
  }
}
