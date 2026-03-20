// Email Service for Scheduled Reports
// This service handles sending emails for scheduled reports

interface EmailOptions {
  to: string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

interface ReportEmailData {
  reportName: string;
  reportType: string;
  executedAt: string;
  recipientCount: number;
  recordCount: number;
  downloadUrl?: string;
}

// Email configuration (can be replaced with actual email provider)
const EMAIL_CONFIG = {
  from: process.env.SMTP_FROM || 'reports@wcp.local',
  replyTo: process.env.SMTP_REPLY_TO || 'noreply@wcp.local',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};

/**
 * Send an email using the configured email provider
 * This is a placeholder implementation that logs emails in development
 * In production, integrate with SendGrid, AWS SES, or similar
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // In development, just log the email
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Email Service - Development Mode');
      console.log('To:', options.to.join(', '));
      console.log('Subject:', options.subject);
      console.log('HTML Length:', options.html.length);
      if (options.attachments?.length) {
        console.log('Attachments:', options.attachments.map(a => a.filename).join(', '));
      }
      console.log('---');

      return {
        success: true,
        messageId: `dev-${Date.now()}`,
      };
    }

    // Production implementation would use actual email provider
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({ ... });

    // Example with AWS SES:
    // const AWS = require('aws-sdk');
    // const ses = new AWS.SES();
    // await ses.sendEmail({ ... }).promise();

    // For now, simulate success
    return {
      success: true,
      messageId: `email-${Date.now()}`,
    };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate HTML email for report delivery
 */
export function generateReportEmailHTML(data: ReportEmailData): string {
  const { reportName, reportType, executedAt, recordCount, downloadUrl } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LKR {reportName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .header p { margin: 8px 0 0; opacity: 0.9; }
    .content { background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-top: none; }
    .info-card { background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .info-row:last-child { border-bottom: none; }
    .label { color: #64748b; font-size: 14px; }
    .value { font-weight: 500; color: #1e293b; }
    .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 16px; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
    .badge-success { background: #dcfce7; color: #166534; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ${reportName}</h1>
      <p>Scheduled Report - ${new Date(executedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <div class="content">
      <p>Your scheduled report has been generated and is ready for viewing.</p>

      <div class="info-card">
        <div class="info-row">
          <span class="label">Report Type</span>
          <span class="value">LKR {reportType}</span>
        </div>
        <div class="info-row">
          <span class="label">Generated At</span>
          <span class="value">LKR {new Date(executedAt).toLocaleString()}</span>
        </div>
        <div class="info-row">
          <span class="label">Records</span>
          <span class="value">LKR {recordCount.toLocaleString()} records</span>
        </div>
        <div class="info-row">
          <span class="label">Status</span>
          <span class="badge badge-success">✓ Completed</span>
        </div>
      </div>

      ${downloadUrl ? `
      <a href="${downloadUrl}" class="button">Download Report</a>
      ` : ''}

      <p style="margin-top: 24px; font-size: 14px; color: #64748b;">
        This report was automatically generated based on your schedule settings.
        You can modify your report preferences in the WCP application.
      </p>
    </div>

    <div class="footer">
      <p>Workshop Control Platform (WCP) - Automated Report Delivery</p>
      <p>This is an automated message. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email for report delivery
 */
export function generateReportEmailText(data: ReportEmailData): string {
  const { reportName, reportType, executedAt, recordCount, downloadUrl } = data;

  return `
${reportName}
${'='.repeat(reportName.length)}

Scheduled Report - ${new Date(executedAt).toLocaleDateString()}

Your scheduled report has been generated and is ready for viewing.

Report Details:
- Type: ${reportType}
- Generated: ${new Date(executedAt).toLocaleString()}
- Records: ${recordCount.toLocaleString()}
- Status: Completed

${downloadUrl ? `Download: ${downloadUrl}` : ''}

This report was automatically generated based on your schedule settings.
You can modify your report preferences in the WCP application.

---
Workshop Control Platform (WCP) - Automated Report Delivery
This is an automated message. Please do not reply directly to this email.
  `.trim();
}

/**
 * Send a scheduled report email
 */
export async function sendScheduledReportEmail(
  recipients: string[],
  reportData: {
    reportName: string;
    reportType: string;
    executedAt: string;
    recordCount: number;
    downloadUrl?: string;
    attachment?: {
      filename: string;
      content: Buffer;
      contentType: string;
    };
  }
): Promise<{ success: boolean; sent: number; failed: string[] }> {
  const html = generateReportEmailHTML(reportData);
  const text = generateReportEmailText(reportData);

  const results = {
    success: true,
    sent: 0,
    failed: [] as string[],
  };

  // Send to each recipient (could be batched in production)
  for (const recipient of recipients) {
    const result = await sendEmail({
      to: [recipient],
      subject: `📊 ${reportData.reportName} - ${new Date(reportData.executedAt).toLocaleDateString()}`,
      html,
      text,
      attachments: reportData.attachment
        ? [reportData.attachment]
        : undefined,
    });

    if (result.success) {
      results.sent++;
    } else {
      results.failed.push(recipient);
      results.success = false;
    }
  }

  return results;
}

/**
 * Schedule a report to run and send via email
 * This would typically be called by a cron job or scheduler
 */
export async function processScheduledReports(): Promise<{
  processed: number;
  success: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    processed: 0,
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Import db dynamically to avoid circular dependencies
    const { db } = await import('@/lib/db');

    // Find all reports that are due to run
    const dueReports = await db.savedReport.findMany({
      where: {
        isActive: true,
        schedule: { not: null },
        nextRunAt: { lte: new Date() },
      },
    });

    for (const report of dueReports) {
      results.processed++;

      try {
        // Execute the report
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const filters = JSON.parse(report.filters);
        const from = filters.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const to = filters.to || new Date().toISOString().split('T')[0];

        const response = await fetch(`${baseUrl}/api/reports/${report.reportType}?from=${from}&to=${to}`);
        const reportResult = await response.json();

        const recipients = report.recipients ? JSON.parse(report.recipients) : [];

        if (recipients.length > 0) {
          // Send email
          const emailResult = await sendScheduledReportEmail(recipients, {
            reportName: report.name,
            reportType: report.reportType,
            executedAt: new Date().toISOString(),
            recordCount: reportResult.data?.length || 0,
          });

          if (emailResult.success) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push(`Failed to send ${report.name} to: ${emailResult.failed.join(', ')}`);
          }
        } else {
          results.success++; // No recipients, but execution succeeded
        }

        // Update next run time
        const nextRunAt = calculateNextRun(report.schedule!);
        await db.savedReport.update({
          where: { id: report.id },
          data: {
            lastRunAt: new Date(),
            nextRunAt,
          },
        });

        // Log execution
        await db.savedReportHistory.create({
          data: {
            savedReportId: report.id,
            executedAt: new Date(),
            executedBy: 'system',
            status: 'SUCCESS',
            recordCount: reportResult.data?.length || 0,
          },
        }).catch(() => {}); // Ignore if table doesn't exist

      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Failed to process ${report.name}: ${errorMsg}`);

        // Log failed execution
        await db.savedReportHistory.create({
          data: {
            savedReportId: report.id,
            executedAt: new Date(),
            executedBy: 'system',
            status: 'FAILED',
            errorMessage: errorMsg,
          },
        }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Error processing scheduled reports:', error);
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return results;
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
