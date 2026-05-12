import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, handleApiError } from '@/lib/api-utils';
import { getSlaAlerts, checkSlaStatus } from '@/lib/sla-monitor';
import { db } from '@/lib/db';

// GET /api/sla/alerts - Get active SLA alerts
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type'); // 'atRisk', 'breached', 'escalated', or null for all
    const priority = url.searchParams.get('priority');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const alerts = await getSlaAlerts();

    let result: any[] = [];

    if (!type || type === 'all') {
      result = [
        ...alerts.atRisk.map(a => ({ ...a, type: 'AT_RISK' as const })),
        ...alerts.breached.map(b => ({ ...b, type: 'BREACHED' as const })),
        ...alerts.escalated.map(e => ({ ...e, type: 'ESCALATED' as const })),
      ];
    } else if (type === 'atRisk') {
      result = alerts.atRisk.map(a => ({ ...a, type: 'AT_RISK' as const }));
    } else if (type === 'breached') {
      result = alerts.breached.map(b => ({ ...b, type: 'BREACHED' as const }));
    } else if (type === 'escalated') {
      result = alerts.escalated.map(e => ({ ...e, type: 'ESCALATED' as const }));
    }

    // Filter by priority if specified
    if (priority) {
      result = result.filter(item => 'priority' in item && item.priority === priority);
    }

    // Sort by priority order
    const priorityOrder = ['EMERGENCY', 'CRITICAL', 'HIGH', 'NORMAL', 'LOW'];
    result.sort((a, b) => {
      const aPriority = 'priority' in a ? a.priority : 'LOW';
      const bPriority = 'priority' in b ? b.priority : 'LOW';
      return priorityOrder.indexOf(aPriority) - priorityOrder.indexOf(bPriority);
    });

    return apiSuccess({
      alerts: result.slice(0, limit),
      summary: {
        totalAtRisk: alerts.atRisk.length,
        totalBreached: alerts.breached.length,
        totalEscalated: alerts.escalated.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/sla/alerts - Acknowledge SLA alert
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobCardId, action, userId } = body;

    if (!jobCardId || !action || !userId) {
      return apiError('jobCardId, action, and userId are required', 400);
    }

    // Get job card details
    const jobCard = await db.jobCard.findUnique({
      where: { id: jobCardId },
      select: {
        id: true,
        jobCardNumber: true,
        priority: true,
        status: true,
        createdAt: true,
        escalatedTo: true,
      },
    });

    if (!jobCard) {
      return apiError('Job card not found', 404);
    }

    const slaResult = checkSlaStatus(jobCard);

    if (action === 'acknowledge') {
      // Record acknowledgment
      // In production, this would create a notification record
      await db.jobCard.update({
        where: { id: jobCardId },
        data: {
          notes: `SLA alert acknowledged by user at ${new Date().toISOString()}`,
          updatedAt: new Date(),
        },
      });

      return apiSuccess({
        acknowledged: true,
        jobCardId,
        message: 'SLA alert acknowledged',
      });
    }

    if (action === 'takeOwnership') {
      // Assign the job card to the acknowledging user
      await db.$transaction([
        db.jobCard.update({
          where: { id: jobCardId },
          data: {
            updatedAt: new Date(),
          },
        }),
        db.jcTechnicianAssignment.create({
          data: {
            jobCardId,
            technicianId: userId,
            role: 'LEAD_TECHNICIAN',
            isActive: true,
          },
        }),
      ]);

      return apiSuccess({
        ownershipTaken: true,
        jobCardId,
        message: 'You have taken ownership of this job card',
      });
    }

    return apiError('Invalid action. Use "acknowledge" or "takeOwnership"', 400);
  } catch (error) {
    return handleApiError(error);
  }
}
