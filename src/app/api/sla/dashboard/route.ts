import { NextRequest } from 'next/server';
import { apiSuccess, handleApiError } from '@/lib/api-utils';
import { getSlaDashboardStats } from '@/lib/sla-monitor';

// GET /api/sla/dashboard - Get SLA dashboard statistics
export async function GET(_request: NextRequest) {
  try {
    const stats = await getSlaDashboardStats();

    return apiSuccess({
      statistics: {
        onTrack: stats.onTrack,
        atRisk: stats.atRisk,
        breached: stats.breached,
        escalated: stats.escalated,
        total: stats.onTrack + stats.atRisk + stats.breached,
      },
      compliance: {
        rate: stats.slaComplianceRate,
        target: 95, // 95% target compliance
        status: stats.slaComplianceRate >= 95 ? 'GOOD' : stats.slaComplianceRate >= 80 ? 'WARNING' : 'CRITICAL',
      },
      resolutionTimes: stats.avgResolutionByPriority,
      slaTargets: {
        EMERGENCY: { firstResponse: 30, completion: 240 },
        CRITICAL: { firstResponse: 120, completion: 480 },
        HIGH: { firstResponse: 240, completion: 1440 },
        NORMAL: { firstResponse: 480, completion: 2400 },
        LOW: { firstResponse: 1440, completion: 4800 },
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
