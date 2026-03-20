import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendScheduledReportEmail } from '@/lib/email-service';

// POST /api/reports/scheduled/[id]/send-test - Send a test email for a saved report
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
      },
    });

    if (!savedReport) {
      return NextResponse.json(
        { error: 'Saved report not found' },
        { status: 404 }
      );
    }

    const recipients = savedReport.recipients ? JSON.parse(savedReport.recipients) : [];

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients configured for this report' },
        { status: 400 }
      );
    }

    // Execute the report to get data
    const filters = JSON.parse(savedReport.filters);
    const from = filters.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = filters.to || new Date().toISOString().split('T')[0];

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/reports/${savedReport.reportType}?from=${from}&to=${to}`);

    if (!response.ok) {
      throw new Error('Failed to generate report data');
    }

    const reportResult = await response.json();

    // Send test email
    const emailResult = await sendScheduledReportEmail(recipients, {
      reportName: `[TEST] ${savedReport.name}`,
      reportType: savedReport.reportType,
      executedAt: new Date().toISOString(),
      recordCount: reportResult.data?.length || 0,
    });

    // Update last run time
    await db.savedReport.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
      },
    });

    return NextResponse.json({
      success: emailResult.success,
      message: emailResult.success
        ? `Test email sent to ${emailResult.sent} recipient(s)`
        : 'Failed to send test email',
      sent: emailResult.sent,
      failed: emailResult.failed,
    });
  } catch (error) {
    console.error('Failed to send test email:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
