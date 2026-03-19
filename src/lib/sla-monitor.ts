// ============================================
// SLA MONITORING SYSTEM
// Workshop Control Platform
// ============================================

import { db } from '@/lib/db';

// ============================================
// TYPES
// ============================================

export type JobCardPriority = 'EMERGENCY' | 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
export type SlaStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED';
export type EscalationLevel = 'NONE' | 'SUPERVISOR' | 'MANAGER' | 'DIRECTOR';

export interface SlaConfig {
  priority: JobCardPriority;
  firstResponseMinutes: number;
  completionMinutes: number;
  atRiskThresholdPercent: number; // When to mark as AT_RISK (e.g., 80% of time elapsed)
  escalationTriggers: EscalationTrigger[];
}

export interface EscalationTrigger {
  afterMinutes: number;
  escalateTo: EscalationLevel;
  action: string;
}

export interface SlaDeadlines {
  firstResponseDue: Date;
  completionDue: Date;
}

export interface SlaCheckResult {
  firstResponseStatus: SlaStatus;
  completionStatus: SlaStatus;
  overallStatus: SlaStatus;
  escalationLevel: EscalationLevel;
  firstResponseRemaining: number; // minutes
  completionRemaining: number; // minutes
  nextEscalation?: EscalationTrigger;
}

export interface SlaDashboardStats {
  onTrack: number;
  atRisk: number;
  breached: number;
  escalated: number;
  avgResolutionByPriority: Record<JobCardPriority, number>;
  slaComplianceRate: number;
}

// ============================================
// SLA CONFIGURATION BY PRIORITY
// ============================================

const SLA_CONFIGS: Record<JobCardPriority, SlaConfig> = {
  EMERGENCY: {
    priority: 'EMERGENCY',
    firstResponseMinutes: 30,
    completionMinutes: 240, // 4 hours
    atRiskThresholdPercent: 75,
    escalationTriggers: [
      { afterMinutes: 30, escalateTo: 'SUPERVISOR', action: 'First response overdue' },
      { afterMinutes: 60, escalateTo: 'MANAGER', action: 'SLA breach imminent' },
      { afterMinutes: 120, escalateTo: 'DIRECTOR', action: 'Critical SLA breach' },
    ],
  },
  CRITICAL: {
    priority: 'CRITICAL',
    firstResponseMinutes: 120, // 2 hours
    completionMinutes: 480, // 8 hours
    atRiskThresholdPercent: 80,
    escalationTriggers: [
      { afterMinutes: 120, escalateTo: 'SUPERVISOR', action: 'First response overdue' },
      { afterMinutes: 240, escalateTo: 'MANAGER', action: 'SLA breach imminent' },
      { afterMinutes: 480, escalateTo: 'DIRECTOR', action: 'Critical SLA breach' },
    ],
  },
  HIGH: {
    priority: 'HIGH',
    firstResponseMinutes: 240, // 4 hours
    completionMinutes: 1440, // 24 hours (1 working day)
    atRiskThresholdPercent: 75,
    escalationTriggers: [
      { afterMinutes: 240, escalateTo: 'SUPERVISOR', action: 'First response overdue' },
      { afterMinutes: 480, escalateTo: 'MANAGER', action: 'SLA breach warning' },
    ],
  },
  NORMAL: {
    priority: 'NORMAL',
    firstResponseMinutes: 480, // Next working day (8 hours)
    completionMinutes: 2400, // 5 working days (40 hours)
    atRiskThresholdPercent: 80,
    escalationTriggers: [
      { afterMinutes: 1440, escalateTo: 'SUPERVISOR', action: 'Response overdue reminder' },
      { afterMinutes: 2880, escalateTo: 'MANAGER', action: 'SLA at risk' },
    ],
  },
  LOW: {
    priority: 'LOW',
    firstResponseMinutes: 1440, // 3 working days
    completionMinutes: 4800, // 10 working days (80 hours)
    atRiskThresholdPercent: 80,
    escalationTriggers: [
      { afterMinutes: 2880, escalateTo: 'SUPERVISOR', action: 'Response overdue reminder' },
      { afterMinutes: 4320, escalateTo: 'MANAGER', action: 'SLA at risk' },
    ],
  },
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get SLA configuration for a priority level
 */
export function getSlaConfig(priority: JobCardPriority): SlaConfig {
  return SLA_CONFIGS[priority];
}

/**
 * Calculate SLA deadlines for a job card
 */
export function calculateSlaDeadlines(
  createdAt: Date,
  priority: JobCardPriority,
  options?: { skipNonWorkingHours?: boolean }
): SlaDeadlines {
  const config = SLA_CONFIGS[priority];
  const created = new Date(createdAt);

  // For simplicity, we calculate from creation time
  // In production, you'd want to consider working hours
  const firstResponseDue = new Date(created.getTime() + config.firstResponseMinutes * 60 * 1000);
  const completionDue = new Date(created.getTime() + config.completionMinutes * 60 * 1000);

  return {
    firstResponseDue,
    completionDue,
  };
}

/**
 * Check SLA status for a job card
 */
export function checkSlaStatus(
  jobCard: {
    createdAt: Date;
    priority: string;
    status: string;
    firstResponseAt?: Date | null;
    actualStart?: Date | null;
    actualEnd?: Date | null;
    slaFirstResponseDue?: Date | null;
    slaCompletionDue?: Date | null;
    escalatedTo?: string | null;
  }
): SlaCheckResult {
  const priority = jobCard.priority as JobCardPriority;
  const config = SLA_CONFIGS[priority];
  const now = new Date();

  // Get deadlines
  const firstResponseDue = jobCard.slaFirstResponseDue 
    ? new Date(jobCard.slaFirstResponseDue)
    : calculateSlaDeadlines(jobCard.createdAt, priority).firstResponseDue;
  
  const completionDue = jobCard.slaCompletionDue
    ? new Date(jobCard.slaCompletionDue)
    : calculateSlaDeadlines(jobCard.createdAt, priority).completionDue;

  // Calculate remaining time
  let firstResponseRemaining = 0;
  let completionRemaining = 0;

  if (!jobCard.firstResponseAt) {
    firstResponseRemaining = Math.max(0, Math.floor((firstResponseDue.getTime() - now.getTime()) / (60 * 1000)));
  }

  if (!['COMPLETED', 'CLOSED', 'CANCELLED'].includes(jobCard.status)) {
    completionRemaining = Math.max(0, Math.floor((completionDue.getTime() - now.getTime()) / (60 * 1000)));
  }

  // Determine first response status
  let firstResponseStatus: SlaStatus = 'ON_TRACK';
  if (jobCard.firstResponseAt) {
    firstResponseStatus = new Date(jobCard.firstResponseAt) <= firstResponseDue ? 'ON_TRACK' : 'BREACHED';
  } else {
    const firstResponseElapsed = (now.getTime() - new Date(jobCard.createdAt).getTime()) / (60 * 1000);
    const firstResponseThreshold = config.firstResponseMinutes * (config.atRiskThresholdPercent / 100);
    
    if (firstResponseElapsed >= config.firstResponseMinutes) {
      firstResponseStatus = 'BREACHED';
    } else if (firstResponseElapsed >= firstResponseThreshold) {
      firstResponseStatus = 'AT_RISK';
    }
  }

  // Determine completion status
  let completionStatus: SlaStatus = 'ON_TRACK';
  if (['COMPLETED', 'CLOSED'].includes(jobCard.status)) {
    if (jobCard.actualEnd) {
      completionStatus = new Date(jobCard.actualEnd) <= completionDue ? 'ON_TRACK' : 'BREACHED';
    }
  } else {
    const elapsed = (now.getTime() - new Date(jobCard.createdAt).getTime()) / (60 * 1000);
    const completionThreshold = config.completionMinutes * (config.atRiskThresholdPercent / 100);
    
    if (elapsed >= config.completionMinutes) {
      completionStatus = 'BREACHED';
    } else if (elapsed >= completionThreshold) {
      completionStatus = 'AT_RISK';
    }
  }

  // Determine overall status
  const overallStatus: SlaStatus = 
    firstResponseStatus === 'BREACHED' || completionStatus === 'BREACHED' ? 'BREACHED' :
    firstResponseStatus === 'AT_RISK' || completionStatus === 'AT_RISK' ? 'AT_RISK' : 'ON_TRACK';

  // Determine escalation level
  let escalationLevel: EscalationLevel = jobCard.escalatedTo as EscalationLevel || 'NONE';
  let nextEscalation: EscalationTrigger | undefined;

  const elapsed = (now.getTime() - new Date(jobCard.createdAt).getTime()) / (60 * 1000);
  
  for (const trigger of config.escalationTriggers) {
    if (elapsed >= trigger.afterMinutes) {
      escalationLevel = trigger.escalateTo;
    } else {
      nextEscalation = trigger;
      break;
    }
  }

  return {
    firstResponseStatus,
    completionStatus,
    overallStatus,
    escalationLevel,
    firstResponseRemaining,
    completionRemaining,
    nextEscalation,
  };
}

/**
 * Get next escalation action for a job card
 */
export function getNextEscalation(
  jobCard: {
    createdAt: Date;
    priority: string;
    escalatedTo?: string | null;
  }
): EscalationTrigger | null {
  const priority = jobCard.priority as JobCardPriority;
  const config = SLA_CONFIGS[priority];
  const now = new Date();
  const elapsed = (now.getTime() - new Date(jobCard.createdAt).getTime()) / (60 * 1000);

  const currentLevel = (jobCard.escalatedTo as EscalationLevel) || 'NONE';
  const levelOrder: EscalationLevel[] = ['NONE', 'SUPERVISOR', 'MANAGER', 'DIRECTOR'];
  const currentIndex = levelOrder.indexOf(currentLevel);

  for (const trigger of config.escalationTriggers) {
    const triggerIndex = levelOrder.indexOf(trigger.escalateTo);
    if (triggerIndex > currentIndex && elapsed >= trigger.afterMinutes) {
      return trigger;
    }
  }

  return null;
}

/**
 * Trigger escalation for a job card
 */
export async function triggerEscalation(
  jobCardId: string,
  level: EscalationLevel,
  reason: string
): Promise<void> {
  await db.jobCard.update({
    where: { id: jobCardId },
    data: {
      escalatedTo: level,
      escalatedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create notification for escalation
  // In production, this would send emails/push notifications
  console.log(`[SLA ESCALATION] Job Card ${jobCardId} escalated to ${level}: ${reason}`);
}

/**
 * Update SLA fields for a job card
 */
export async function updateSlaFields(jobCardId: string): Promise<void> {
  const jobCard = await db.jobCard.findUnique({
    where: { id: jobCardId },
    select: {
      id: true,
      createdAt: true,
      priority: true,
      status: true,
      firstResponseAt: true,
      actualEnd: true,
      slaFirstResponseDue: true,
      slaCompletionDue: true,
      escalatedTo: true,
    },
  });

  if (!jobCard) return;

  const priority = jobCard.priority as JobCardPriority;
  const deadlines = calculateSlaDeadlines(jobCard.createdAt, priority);
  const slaResult = checkSlaStatus(jobCard);

  await db.jobCard.update({
    where: { id: jobCardId },
    data: {
      slaFirstResponseDue: deadlines.firstResponseDue,
      slaCompletionDue: deadlines.completionDue,
      slaStatus: slaResult.overallStatus,
      updatedAt: new Date(),
    },
  });
}

/**
 * Get SLA dashboard statistics
 */
export async function getSlaDashboardStats(): Promise<SlaDashboardStats> {
  // Get active job cards (not closed/cancelled)
  const activeJobCards = await db.jobCard.findMany({
    where: {
      isActive: true,
      status: { in: ['PENDING', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD'] },
    },
    select: {
      id: true,
      priority: true,
      status: true,
      createdAt: true,
      slaStatus: true,
      escalatedTo: true,
      actualStart: true,
      actualEnd: true,
    },
  });

  let onTrack = 0;
  let atRisk = 0;
  let breached = 0;
  let escalated = 0;

  const resolutionTimes: Record<JobCardPriority, number[]> = {
    EMERGENCY: [],
    CRITICAL: [],
    HIGH: [],
    NORMAL: [],
    LOW: [],
  };

  for (const jc of activeJobCards) {
    const slaResult = checkSlaStatus(jc);

    if (slaResult.overallStatus === 'ON_TRACK') onTrack++;
    else if (slaResult.overallStatus === 'AT_RISK') atRisk++;
    else breached++;

    if (slaResult.escalationLevel !== 'NONE') escalated++;

    // Track resolution times for completed job cards
    if (jc.actualStart && jc.actualEnd) {
      const duration = (new Date(jc.actualEnd).getTime() - new Date(jc.actualStart).getTime()) / (60 * 1000);
      const priority = jc.priority as JobCardPriority;
      if (resolutionTimes[priority]) {
        resolutionTimes[priority].push(duration);
      }
    }
  }

  // Calculate averages
  const avgResolutionByPriority: Record<JobCardPriority, number> = {
    EMERGENCY: 0,
    CRITICAL: 0,
    HIGH: 0,
    NORMAL: 0,
    LOW: 0,
  };

  for (const priority of Object.keys(resolutionTimes) as JobCardPriority[]) {
    const times = resolutionTimes[priority];
    if (times.length > 0) {
      avgResolutionByPriority[priority] = times.reduce((a, b) => a + b, 0) / times.length;
    }
  }

  const total = onTrack + atRisk + breached;
  const slaComplianceRate = total > 0 ? (onTrack / total) * 100 : 100;

  return {
    onTrack,
    atRisk,
    breached,
    escalated,
    avgResolutionByPriority,
    slaComplianceRate,
  };
}

/**
 * Get job cards requiring SLA attention
 */
export async function getSlaAlerts(): Promise<{
  atRisk: Array<{ id: string; jobCardNumber: string; priority: string; remainingMinutes: number }>;
  breached: Array<{ id: string; jobCardNumber: string; priority: string; overdueMinutes: number }>;
  escalated: Array<{ id: string; jobCardNumber: string; priority: string; escalationLevel: string }>;
}> {
  const activeJobCards = await db.jobCard.findMany({
    where: {
      isActive: true,
      status: { in: ['PENDING', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD'] },
    },
    select: {
      id: true,
      jobCardNumber: true,
      priority: true,
      status: true,
      createdAt: true,
      escalatedTo: true,
    },
  });

  const atRisk: Array<{ id: string; jobCardNumber: string; priority: string; remainingMinutes: number }> = [];
  const breached: Array<{ id: string; jobCardNumber: string; priority: string; overdueMinutes: number }> = [];
  const escalated: Array<{ id: string; jobCardNumber: string; priority: string; escalationLevel: string }> = [];

  for (const jc of activeJobCards) {
    const slaResult = checkSlaStatus(jc);

    if (slaResult.escalationLevel !== 'NONE') {
      escalated.push({
        id: jc.id,
        jobCardNumber: jc.jobCardNumber,
        priority: jc.priority,
        escalationLevel: slaResult.escalationLevel,
      });
    }

    if (slaResult.overallStatus === 'AT_RISK') {
      atRisk.push({
        id: jc.id,
        jobCardNumber: jc.jobCardNumber,
        priority: jc.priority,
        remainingMinutes: slaResult.completionRemaining,
      });
    } else if (slaResult.overallStatus === 'BREACHED') {
      const overdue = Math.abs(slaResult.completionRemaining);
      breached.push({
        id: jc.id,
        jobCardNumber: jc.jobCardNumber,
        priority: jc.priority,
        overdueMinutes: overdue,
      });
    }
  }

  // Sort by priority and remaining time
  const priorityOrder = ['EMERGENCY', 'CRITICAL', 'HIGH', 'NORMAL', 'LOW'];
  atRisk.sort((a, b) => {
    const priorityDiff = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    if (priorityDiff !== 0) return priorityDiff;
    return a.remainingMinutes - b.remainingMinutes;
  });

  breached.sort((a, b) => {
    const priorityDiff = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    if (priorityDiff !== 0) return priorityDiff;
    return b.overdueMinutes - a.overdueMinutes;
  });

  return { atRisk, breached, escalated };
}
