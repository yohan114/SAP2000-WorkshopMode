/**
 * Job Card SLA API Route
 * 
 * This endpoint provides SLA (Service Level Agreement) information for a job card,
 * including targets, current status, time remaining, and escalation level.
 */

import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import {
  calculateSlaTargets,
  checkSlaStatus,
  getEscalationLevel,
  getSlaTimeRemaining,
  SLA_TARGETS,
  SlaStatus,
  EscalationLevel,
} from '@/lib/job-card-state-machine';

/**
 * GET /api/job-cards/[id]/sla
 * 
 * Get SLA status for a job card.
 * 
 * Returns:
 * - SLA targets for the job card's priority
 * - Current SLA status (ON_TRACK, AT_RISK, BREACHED)
 * - Time remaining for first response and completion
 * - Current escalation level
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch job card with relevant data
    const jobCard = await db.jobCard.findUnique({
      where: { id },
      select: {
        id: true,
        jobCardNumber: true,
        status: true,
        priority: true,
        createdAt: true,
        actualStart: true,
        actualEnd: true,
        scheduledStart: true,
        scheduledEnd: true,
        asset: {
          select: {
            id: true,
            assetNumber: true,
            name: true,
          },
        },
        stateTransitions: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            fromState: true,
            toState: true,
            transitionType: true,
            createdAt: true,
          },
        },
      },
    });

    if (!jobCard) {
      return apiNotFound('Job card');
    }

    // Calculate SLA information
    const slaTarget = calculateSlaTargets(jobCard);
    const slaStatus = checkSlaStatus(jobCard);
    const escalationLevel = getEscalationLevel(jobCard);
    const timeRemaining = getSlaTimeRemaining(jobCard);

    // Find when first response happened (actual start)
    const firstResponseTransition = jobCard.stateTransitions.find(
      t => t.toState === 'IN_PROGRESS' || t.transitionType === 'START'
    );
    const firstResponseAt = jobCard.actualStart || firstResponseTransition?.createdAt || null;

    // Find when completion happened
    const completionTransition = jobCard.stateTransitions.find(
      t => t.toState === 'COMPLETED' || t.transitionType === 'COMPLETE'
    );
    const completedAt = jobCard.actualEnd || completionTransition?.createdAt || null;

    // Calculate elapsed time
    const now = new Date();
    const createdTime = new Date(jobCard.createdAt).getTime();
    const elapsedMs = now.getTime() - createdTime;
    const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    const elapsedDays = Math.floor(elapsedHours / 24);

    // Format time remaining for display
    const formatTimeRemaining = (minutes: number | null): string => {
      if (minutes === null) return 'N/A';
      if (minutes <= 0) return 'Overdue';
      
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h ${mins}m`;
      }
      
      if (hours > 0) {
        return `${hours}h ${mins}m`;
      }
      
      return `${mins}m`;
    };

    // Build response
    const response = {
      jobCard: {
        id: jobCard.id,
        jobCardNumber: jobCard.jobCardNumber,
        status: jobCard.status,
        priority: jobCard.priority,
        asset: jobCard.asset,
        createdAt: jobCard.createdAt,
        scheduledStart: jobCard.scheduledStart,
        scheduledEnd: jobCard.scheduledEnd,
      },
      sla: {
        // SLA target configuration
        target: slaTarget ? {
          priority: slaTarget.priority,
          firstResponseMinutes: slaTarget.firstResponseMinutes,
          completionMinutes: slaTarget.completionMinutes,
          firstResponseHours: Math.floor(slaTarget.firstResponseMinutes / 60),
          completionHours: Math.floor(slaTarget.completionMinutes / 60),
          autoEscalation: slaTarget.autoEscalation,
        } : null,
        
        // Current status
        status: slaStatus,
        statusDisplay: getSlaStatusDisplay(slaStatus),
        escalationLevel,
        escalationDisplay: getEscalationDisplay(escalationLevel),
        
        // Time tracking
        timeRemaining: {
          firstResponse: timeRemaining.firstResponseMinutes,
          firstResponseDisplay: formatTimeRemaining(timeRemaining.firstResponseMinutes),
          completion: timeRemaining.completionMinutes,
          completionDisplay: formatTimeRemaining(timeRemaining.completionMinutes),
        },
        
        // Elapsed time
        elapsed: {
          minutes: elapsedMinutes,
          hours: elapsedHours,
          days: elapsedDays,
          display: formatElapsedTime(elapsedMinutes),
        },
        
        // Milestones
        milestones: {
          created: jobCard.createdAt,
          firstResponse: firstResponseAt,
          firstResponseWithinSla: firstResponseAt && slaTarget
            ? (new Date(firstResponseAt).getTime() - createdTime) <= slaTarget.firstResponseMinutes * 60 * 1000
            : null,
          completed: completedAt,
          completedWithinSla: completedAt && slaTarget
            ? (new Date(completedAt).getTime() - createdTime) <= slaTarget.completionMinutes * 60 * 1000
            : null,
        },
        
        // Percentage calculations
        percentages: slaTarget ? {
          firstResponseUsed: Math.min(100, Math.round((elapsedMinutes / slaTarget.firstResponseMinutes) * 100)),
          completionUsed: Math.min(100, Math.round((elapsedMinutes / slaTarget.completionMinutes) * 100)),
          firstResponseRemaining: Math.max(0, Math.round((timeRemaining.firstResponseMinutes ?? 0 / slaTarget.firstResponseMinutes) * 100)),
          completionRemaining: Math.max(0, Math.round((timeRemaining.completionMinutes ?? 0 / slaTarget.completionMinutes) * 100)),
        } : null,
      },
      // All SLA targets for reference
      allTargets: SLA_TARGETS.map(t => ({
        priority: t.priority,
        firstResponseMinutes: t.firstResponseMinutes,
        completionMinutes: t.completionMinutes,
      })),
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('SLA fetch error:', error);
    return apiError('Failed to fetch SLA information', 500);
  }
}

/**
 * Get display text for SLA status
 */
function getSlaStatusDisplay(status: SlaStatus): string {
  const displays: Record<SlaStatus, string> = {
    'ON_TRACK': 'On Track',
    'AT_RISK': 'At Risk',
    'BREACHED': 'Breached',
  };
  return displays[status] || status;
}

/**
 * Get display text for escalation level
 */
function getEscalationDisplay(level: EscalationLevel): string {
  const displays: Record<EscalationLevel, string> = {
    'NONE': 'No Escalation',
    'SUPERVISOR': 'Escalated to Supervisor',
    'MANAGER': 'Escalated to Manager',
    'DIRECTOR': 'Escalated to Director',
  };
  return displays[level] || level;
}

/**
 * Format elapsed time for display
 */
function formatElapsedTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h ${mins}m`;
  }
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  
  return `${mins}m`;
}
