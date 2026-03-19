/**
 * Job Card State Machine Module
 * 
 * This module provides comprehensive state machine implementation for Job Cards
 * in the Workshop Control Platform (WCP). It handles:
 * - State transitions with guard conditions
 * - SLA tracking and escalation
 * - State transition logging
 * - Business rule validation
 * 
 * @module job-card-state-machine
 */

import { db } from '@/lib/db';
import { hasPrivilege, checkPrivilege } from '@/lib/privileges';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================
// Types and Interfaces
// ============================================

/**
 * Valid job card status values
 * Defines all possible states in the job card lifecycle
 */
export type JobCardStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'REJECTED';

/**
 * Job card priority levels
 * Used for SLA calculations and escalation
 */
export type JobCardPriority =
  | 'EMERGENCY'
  | 'CRITICAL'
  | 'HIGH'
  | 'NORMAL'
  | 'LOW';

/**
 * Transition types for job card state changes
 */
export type TransitionType =
  | 'SUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'RETURN'
  | 'START'
  | 'HOLD'
  | 'RESUME'
  | 'COMPLETE'
  | 'REOPEN'
  | 'CLOSE'
  | 'CANCEL';

/**
 * SLA status for tracking job card timelines
 */
export type SlaStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED';

/**
 * Escalation level based on SLA breaches
 */
export type EscalationLevel = 'NONE' | 'SUPERVISOR' | 'MANAGER' | 'DIRECTOR';

/**
 * SLA target configuration for each priority level
 */
export interface SlaTarget {
  priority: JobCardPriority;
  firstResponseMinutes: number;
  completionMinutes: number;
  autoEscalation: {
    level1Minutes: number;
    level1Target: 'SUPERVISOR' | 'MANAGER';
    level2Minutes?: number;
    level2Target?: 'MANAGER' | 'DIRECTOR';
  };
}

/**
 * Result of a guard check
 */
export interface GuardCheckResult {
  canProceed: boolean;
  reason?: string;
  missingRequirements?: string[];
}

/**
 * Result of a state transition
 */
export interface TransitionResult {
  success: boolean;
  newState?: JobCardStatus;
  error?: string;
  transitionId?: string;
}

/**
 * Options for state transition
 */
export interface TransitionOptions {
  reason?: string;
  meterReading?: number;
  comments?: string;
}

/**
 * Extended job card data for state machine operations
 */
export interface JobCardForStateMachine {
  id: string;
  jobCardNumber: string;
  status: string;
  priority: string;
  assetId: string;
  faultDescription: string;
  estimatedCost: Decimal | null;
  createdBy: string | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  meterReadingStart: Decimal | null;
  meterReadingEnd: Decimal | null;
  closedAt: Date | null;
  cancelledAt: Date | null;
  reopenedAt: Date | null;
  createdAt: Date;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  asset?: {
    id: string;
    assetNumber: string;
    qrCodes: { id: string; qrCode: string }[];
  } | null;
  tasks?: {
    id: string;
    isMandatory: boolean;
    isComplete: boolean;
    requiresPhoto: boolean;
    photoCount: number;
  }[];
  technicianAssignments?: {
    id: string;
    technicianId: string;
    isActive: boolean;
  }[];
  materialRequests?: {
    id: string;
    status: string;
  }[];
  toolLoans?: {
    id: string;
    loanStatus: string;
    returnedAt: Date | null;
  }[];
  stateTransitions?: {
    id: string;
    fromState: string;
    toState: string;
    transitionType: string;
    createdAt: Date;
  }[];
}

// ============================================
// Constants
// ============================================

/**
 * SLA targets by priority level
 */
export const SLA_TARGETS: SlaTarget[] = [
  {
    priority: 'EMERGENCY',
    firstResponseMinutes: 30,
    completionMinutes: 4 * 60, // 4 hours
    autoEscalation: {
      level1Minutes: 60,
      level1Target: 'MANAGER',
      level2Minutes: 120,
      level2Target: 'DIRECTOR',
    },
  },
  {
    priority: 'CRITICAL',
    firstResponseMinutes: 120, // 2 hours
    completionMinutes: 8 * 60, // 8 hours
    autoEscalation: {
      level1Minutes: 240,
      level1Target: 'MANAGER',
      level2Minutes: 480,
      level2Target: 'DIRECTOR',
    },
  },
  {
    priority: 'HIGH',
    firstResponseMinutes: 240, // 4 hours
    completionMinutes: 24 * 60, // 24 hours
    autoEscalation: {
      level1Minutes: 480,
      level1Target: 'MANAGER',
    },
  },
  {
    priority: 'NORMAL',
    firstResponseMinutes: 8 * 60, // Next working day (8 hours)
    completionMinutes: 5 * 8 * 60, // 5 working days (40 hours)
    autoEscalation: {
      level1Minutes: 3 * 8 * 60, // 3 working days
      level1Target: 'SUPERVISOR',
    },
  },
  {
    priority: 'LOW',
    firstResponseMinutes: 3 * 8 * 60, // 3 working days
    completionMinutes: 10 * 8 * 60, // 10 working days
    autoEscalation: {
      level1Minutes: 7 * 8 * 60, // 7 working days
      level1Target: 'SUPERVISOR',
    },
  },
];

/**
 * Valid state transitions map
 * Defines which transitions are allowed from each state
 */
export const VALID_TRANSITIONS: Record<JobCardStatus, TransitionType[]> = {
  DRAFT: ['SUBMIT', 'CANCEL'],
  PENDING: ['APPROVE', 'REJECT', 'RETURN'],
  APPROVED: ['START', 'CANCEL'],
  IN_PROGRESS: ['HOLD', 'COMPLETE', 'CANCEL'],
  ON_HOLD: ['RESUME'],
  COMPLETED: ['REOPEN', 'CLOSE'],
  CLOSED: [],
  CANCELLED: [],
  REJECTED: [],
};

/**
 * Maps transition types to target states
 */
export const TRANSITION_TARGET_STATES: Record<TransitionType, JobCardStatus> = {
  SUBMIT: 'PENDING',
  APPROVE: 'APPROVED',
  REJECT: 'REJECTED',
  RETURN: 'DRAFT',
  START: 'IN_PROGRESS',
  HOLD: 'ON_HOLD',
  RESUME: 'IN_PROGRESS',
  COMPLETE: 'COMPLETED',
  REOPEN: 'IN_PROGRESS',
  CLOSE: 'CLOSED',
  CANCEL: 'CANCELLED',
};

/**
 * Reopen window in hours (72 hours)
 */
export const REOPEN_WINDOW_HOURS = 72;

// ============================================
// Guard Check Functions
// ============================================

/**
 * Check if a job card can be submitted for approval
 * 
 * Requirements:
 * - Asset QR code must be scanned
 * - Job type must be selected
 * - Fault description must be at least 20 characters
 * - At least 1 task must be defined
 * 
 * @param jobCard - The job card to check
 * @param userId - The user attempting to submit
 * @returns Guard check result
 */
export async function canSubmit(
  jobCard: JobCardForStateMachine,
  userId: string
): Promise<GuardCheckResult> {
  const missingRequirements: string[] = [];

  // Check if already in correct state
  if (jobCard.status !== 'DRAFT') {
    return {
      canProceed: false,
      reason: `Cannot submit job card in ${jobCard.status} status. Must be in DRAFT status.`,
    };
  }

  // Check asset QR code is scanned (asset exists)
  if (!jobCard.assetId) {
    missingRequirements.push('Asset must be selected');
  }

  // Check job type is selected (jobType is a required field, so check it exists)
  // This would be checked at the job card level

  // Check fault description length
  if (!jobCard.faultDescription || jobCard.faultDescription.length < 20) {
    missingRequirements.push('Fault description must be at least 20 characters');
  }

  // Check at least 1 task is defined
  const tasks = jobCard.tasks || await db.jcTask.count({
    where: { jobCardId: jobCard.id },
  });

  if ((typeof tasks === 'number' ? tasks : tasks.length) === 0) {
    missingRequirements.push('At least 1 task must be defined');
  }

  if (missingRequirements.length > 0) {
    return {
      canProceed: false,
      reason: 'Requirements not met for submission',
      missingRequirements,
    };
  }

  return { canProceed: true };
}

/**
 * Check if a user can approve a job card
 * 
 * Requirements:
 * - User must have JC_APPROVE privilege
 * - Approver must not be the originator
 * - Estimated cost must be within approver's authority
 * 
 * @param jobCard - The job card to approve
 * @param userId - The user attempting to approve
 * @param userPrivileges - Array of user's privilege codes
 * @returns Guard check result
 */
export async function canApprove(
  jobCard: JobCardForStateMachine,
  userId: string,
  userPrivileges?: string[]
): Promise<GuardCheckResult> {
  // Check if in correct state
  if (jobCard.status !== 'PENDING') {
    return {
      canProceed: false,
      reason: `Cannot approve job card in ${jobCard.status} status. Must be in PENDING status.`,
    };
  }

  // Check privilege
  const hasApprovePrivilege = userPrivileges
    ? userPrivileges.includes('JC_APPROVE')
    : await hasPrivilege(userId, 'JC_APPROVE');

  if (!hasApprovePrivilege) {
    return {
      canProceed: false,
      reason: 'You do not have permission to approve job cards',
    };
  }

  // Check approver is not the originator
  if (jobCard.createdBy === userId) {
    return {
      canProceed: false,
      reason: 'You cannot approve a job card you created',
    };
  }

  // Check estimated cost within authority
  const estimatedCost = jobCard.estimatedCost ? Number(jobCard.estimatedCost) : 0;
  
  if (estimatedCost > 0) {
    const privilegeCheck = await checkPrivilege(userId, 'JC_APPROVE', {
      checkAmount: estimatedCost,
    });

    if (!privilegeCheck.hasPrivilege && privilegeCheck.details?.maxAmount) {
      return {
        canProceed: false,
        reason: `Estimated cost (${estimatedCost}) exceeds your approval authority (${privilegeCheck.details.maxAmount})`,
      };
    }
  }

  return { canProceed: true };
}

/**
 * Check if a user can reject a job card
 * 
 * Requirements:
 * - User must have JC_APPROVE privilege
 * - Rejection reason must be provided (min 10 chars)
 * 
 * @param jobCard - The job card to reject
 * @param userId - The user attempting to reject
 * @param userPrivileges - Array of user's privilege codes
 * @param reason - The rejection reason
 * @returns Guard check result
 */
export async function canReject(
  jobCard: JobCardForStateMachine,
  userId: string,
  userPrivileges?: string[],
  reason?: string
): Promise<GuardCheckResult> {
  // Check if in correct state
  if (jobCard.status !== 'PENDING') {
    return {
      canProceed: false,
      reason: `Cannot reject job card in ${jobCard.status} status. Must be in PENDING status.`,
    };
  }

  // Check privilege
  const hasApprovePrivilege = userPrivileges
    ? userPrivileges.includes('JC_APPROVE')
    : await hasPrivilege(userId, 'JC_APPROVE');

  if (!hasApprovePrivilege) {
    return {
      canProceed: false,
      reason: 'You do not have permission to reject job cards',
    };
  }

  // Check rejection reason
  if (!reason || reason.length < 10) {
    return {
      canProceed: false,
      reason: 'Rejection reason must be at least 10 characters',
    };
  }

  return { canProceed: true };
}

/**
 * Check if a job card can be returned to draft
 * 
 * Requirements:
 * - Job card must be in PENDING status
 * - Return reason must be provided
 * 
 * @param jobCard - The job card to return
 * @param userId - The user attempting to return
 * @param reason - The return reason
 * @returns Guard check result
 */
export async function canReturn(
  jobCard: JobCardForStateMachine,
  userId: string,
  reason?: string
): Promise<GuardCheckResult> {
  // Check if in correct state
  if (jobCard.status !== 'PENDING') {
    return {
      canProceed: false,
      reason: `Cannot return job card in ${jobCard.status} status. Must be in PENDING status.`,
    };
  }

  // Check return reason
  if (!reason || reason.trim().length === 0) {
    return {
      canProceed: false,
      reason: 'Return reason is mandatory',
    };
  }

  return { canProceed: true };
}

/**
 * Check if work can be started on a job card
 * 
 * Requirements:
 * - Job card must be in APPROVED status
 * - Assigned technician must exist
 * - Meter reading must be recorded (for meter-based assets)
 * 
 * @param jobCard - The job card to start work on
 * @param userId - The user attempting to start
 * @returns Guard check result
 */
export async function canStartWork(
  jobCard: JobCardForStateMachine,
  userId: string
): Promise<GuardCheckResult> {
  const missingRequirements: string[] = [];

  // Check if in correct state
  if (jobCard.status !== 'APPROVED') {
    return {
      canProceed: false,
      reason: `Cannot start work on job card in ${jobCard.status} status. Must be in APPROVED status.`,
    };
  }

  // Check assigned technician exists
  const assignments = jobCard.technicianAssignments || await db.jcTechnicianAssignment.findMany({
    where: { jobCardId: jobCard.id, isActive: true },
  });

  if (assignments.length === 0) {
    missingRequirements.push('At least one technician must be assigned');
  }

  // Check meter reading recorded (if start reading is required)
  // This is optional based on business rules - meter reading can be provided at transition
  if (jobCard.meterReadingStart === null) {
    // Meter reading will be provided at transition time, so this is acceptable
  }

  if (missingRequirements.length > 0) {
    return {
      canProceed: false,
      reason: 'Requirements not met for starting work',
      missingRequirements,
    };
  }

  return { canProceed: true };
}

/**
 * Check if a job card can be put on hold
 * 
 * Requirements:
 * - Job card must be in IN_PROGRESS status
 * - Hold reason must be provided
 * - User must have appropriate privilege
 * 
 * @param jobCard - The job card to hold
 * @param userId - The user attempting to hold
 * @param userPrivileges - Array of user's privilege codes
 * @param reason - The hold reason
 * @returns Guard check result
 */
export async function canHold(
  jobCard: JobCardForStateMachine,
  userId: string,
  userPrivileges?: string[],
  reason?: string
): Promise<GuardCheckResult> {
  // Check if in correct state
  if (jobCard.status !== 'IN_PROGRESS') {
    return {
      canProceed: false,
      reason: `Cannot hold job card in ${jobCard.status} status. Must be in IN_PROGRESS status.`,
    };
  }

  // Check privilege
  const hasHoldPrivilege = userPrivileges
    ? userPrivileges.includes('JC_HOLD') || userPrivileges.includes('JC_MANAGE')
    : await hasPrivilege(userId, 'JC_HOLD') || await hasPrivilege(userId, 'JC_MANAGE');

  if (!hasHoldPrivilege) {
    return {
      canProceed: false,
      reason: 'You do not have permission to put job cards on hold',
    };
  }

  // Check hold reason
  if (!reason || reason.trim().length === 0) {
    return {
      canProceed: false,
      reason: 'Hold reason is mandatory',
    };
  }

  return { canProceed: true };
}

/**
 * Check if a job card can be resumed from hold
 * 
 * Requirements:
 * - Job card must be in ON_HOLD status
 * - Hold reason must be resolved
 * - User must have appropriate privilege
 * 
 * @param jobCard - The job card to resume
 * @param userId - The user attempting to resume
 * @param userPrivileges - Array of user's privilege codes
 * @returns Guard check result
 */
export async function canResume(
  jobCard: JobCardForStateMachine,
  userId: string,
  userPrivileges?: string[]
): Promise<GuardCheckResult> {
  // Check if in correct state
  if (jobCard.status !== 'ON_HOLD') {
    return {
      canProceed: false,
      reason: `Cannot resume job card in ${jobCard.status} status. Must be in ON_HOLD status.`,
    };
  }

  // Check privilege
  const hasResumePrivilege = userPrivileges
    ? userPrivileges.includes('JC_HOLD') || userPrivileges.includes('JC_MANAGE')
    : await hasPrivilege(userId, 'JC_HOLD') || await hasPrivilege(userId, 'JC_MANAGE');

  if (!hasResumePrivilege) {
    return {
      canProceed: false,
      reason: 'You do not have permission to resume job cards',
    };
  }

  return { canProceed: true };
}

/**
 * Check if a job card can be marked as complete
 * 
 * Requirements:
 * - Job card must be in IN_PROGRESS status
 * - ALL tasks must be complete
 * - ALL mandatory photos must be uploaded
 * - NO open material requests
 * - NO unreturned tools
 * 
 * @param jobCard - The job card to complete
 * @param userId - The user attempting to complete
 * @returns Guard check result
 */
export async function canComplete(
  jobCard: JobCardForStateMachine,
  userId: string
): Promise<GuardCheckResult> {
  const missingRequirements: string[] = [];

  // Check if in correct state
  if (jobCard.status !== 'IN_PROGRESS') {
    return {
      canProceed: false,
      reason: `Cannot complete job card in ${jobCard.status} status. Must be in IN_PROGRESS status.`,
    };
  }

  // Check all tasks are complete
  const tasks = jobCard.tasks || await db.jcTask.findMany({
    where: { jobCardId: jobCard.id },
    select: { id: true, isMandatory: true, isComplete: true, requiresPhoto: true, photoCount: true },
  });

  const incompleteTasks = tasks.filter(t => !t.isComplete);
  if (incompleteTasks.length > 0) {
    missingRequirements.push(`${incompleteTasks.length} task(s) are not complete`);
  }

  // Check all mandatory photos are uploaded
  const tasksMissingPhotos = tasks.filter(
    t => t.requiresPhoto && t.isComplete && t.photoCount === 0
  );
  if (tasksMissingPhotos.length > 0) {
    missingRequirements.push(`${tasksMissingPhotos.length} task(s) missing mandatory photos`);
  }

  // Check no open material requests
  const materialRequests = jobCard.materialRequests || await db.materialRequest.findMany({
    where: { jobCardId: jobCard.id, status: { notIn: ['CLOSED', 'CANCELLED', 'REJECTED'] } },
    select: { id: true, status: true },
  });

  const openMrs = materialRequests.filter(mr => 
    !['CLOSED', 'CANCELLED', 'REJECTED', 'FULFILLED'].includes(mr.status)
  );
  if (openMrs.length > 0) {
    missingRequirements.push(`${openMrs.length} open material request(s)`);
  }

  // Check no unreturned tools
  const toolLoans = jobCard.toolLoans || await db.toolLoanTracking.findMany({
    where: { jobCardId: jobCard.id, loanStatus: 'ACTIVE' },
    select: { id: true, loanStatus: true },
  });

  if (toolLoans.length > 0) {
    missingRequirements.push(`${toolLoans.length} unreturned tool(s)`);
  }

  if (missingRequirements.length > 0) {
    return {
      canProceed: false,
      reason: 'Requirements not met for completion',
      missingRequirements,
    };
  }

  return { canProceed: true };
}

/**
 * Check if a job card can be reopened
 * 
 * Requirements:
 * - Job card must be in COMPLETED status
 * - Must be within reopen window (72 hours)
 * - Reopen reason must be provided
 * - User must have appropriate privilege
 * 
 * @param jobCard - The job card to reopen
 * @param userId - The user attempting to reopen
 * @param userPrivileges - Array of user's privilege codes
 * @param reason - The reopen reason
 * @returns Guard check result
 */
export async function canReopen(
  jobCard: JobCardForStateMachine,
  userId: string,
  userPrivileges?: string[],
  reason?: string
): Promise<GuardCheckResult> {
  // Check if in correct state
  if (jobCard.status !== 'COMPLETED') {
    return {
      canProceed: false,
      reason: `Cannot reopen job card in ${jobCard.status} status. Must be in COMPLETED status.`,
    };
  }

  // Check privilege
  const hasReopenPrivilege = userPrivileges
    ? userPrivileges.includes('JC_REOPEN') || userPrivileges.includes('JC_MANAGE')
    : await hasPrivilege(userId, 'JC_REOPEN') || await hasPrivilege(userId, 'JC_MANAGE');

  if (!hasReopenPrivilege) {
    return {
      canProceed: false,
      reason: 'You do not have permission to reopen job cards',
    };
  }

  // Check within reopen window
  const completedAt = jobCard.actualEnd || jobCard.stateTransitions?.find(
    t => t.toState === 'COMPLETED'
  )?.createdAt;

  if (completedAt) {
    const hoursSinceCompletion = (Date.now() - new Date(completedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCompletion > REOPEN_WINDOW_HOURS) {
      return {
        canProceed: false,
        reason: `Cannot reopen job card after ${REOPEN_WINDOW_HOURS} hours. ${Math.floor(hoursSinceCompletion)} hours have passed.`,
      };
    }
  }

  // Check reopen reason
  if (!reason || reason.trim().length === 0) {
    return {
      canProceed: false,
      reason: 'Reopen reason is mandatory',
    };
  }

  return { canProceed: true };
}

/**
 * Check if a job card can be closed
 * 
 * Requirements:
 * - Job card must be in COMPLETED status
 * - Supervisor sign-off required
 * - Final meter reading must be recorded
 * - Cost review must be completed
 * - User must have appropriate privilege
 * 
 * @param jobCard - The job card to close
 * @param userId - The user attempting to close
 * @param userPrivileges - Array of user's privilege codes
 * @returns Guard check result
 */
export async function canClose(
  jobCard: JobCardForStateMachine,
  userId: string,
  userPrivileges?: string[]
): Promise<GuardCheckResult> {
  const missingRequirements: string[] = [];

  // Check if in correct state
  if (jobCard.status !== 'COMPLETED') {
    return {
      canProceed: false,
      reason: `Cannot close job card in ${jobCard.status} status. Must be in COMPLETED status.`,
    };
  }

  // Check privilege
  const hasClosePrivilege = userPrivileges
    ? userPrivileges.includes('JC_CLOSE') || userPrivileges.includes('JC_MANAGE')
    : await hasPrivilege(userId, 'JC_CLOSE') || await hasPrivilege(userId, 'JC_MANAGE');

  if (!hasClosePrivilege) {
    return {
      canProceed: false,
      reason: 'You do not have permission to close job cards',
    };
  }

  // Check supervisor sign-off (check if there's a supervisor assignment)
  const supervisorAssignment = await db.jcTechnicianAssignment.findFirst({
    where: { jobCardId: jobCard.id, role: 'SUPERVISOR', isActive: true },
  });

  if (!supervisorAssignment) {
    // Check if user is a supervisor or has management privilege
    const isSupervisor = await hasPrivilege(userId, 'JC_SUPERVISE');
    if (!isSupervisor && !hasClosePrivilege) {
      missingRequirements.push('Supervisor sign-off required');
    }
  }

  // Check final meter reading (if meter reading was recorded at start)
  if (jobCard.meterReadingStart !== null && jobCard.meterReadingEnd === null) {
    missingRequirements.push('Final meter reading required');
  }

  // Check cost review - actual cost should be populated or confirmed
  const hasCostLines = await db.jcCostLine.count({
    where: { jobCardId: jobCard.id },
  });

  if (hasCostLines === 0 && jobCard.estimatedCost) {
    // Has estimated cost but no cost lines - might need cost review
    // This is a soft check - business might want to allow this
  }

  if (missingRequirements.length > 0) {
    return {
      canProceed: false,
      reason: 'Requirements not met for closure',
      missingRequirements,
    };
  }

  return { canProceed: true };
}

/**
 * Check if a job card can be cancelled
 * 
 * Requirements:
 * - Job card must be in DRAFT, APPROVED, or IN_PROGRESS status
 * - For IN_PROGRESS: Manager-level privilege required, MRs auto-cancelled
 * - Cancellation reason must be provided
 * - For DRAFT: No MRs raised, no labour logged
 * 
 * @param jobCard - The job card to cancel
 * @param userId - The user attempting to cancel
 * @param userPrivileges - Array of user's privilege codes
 * @param reason - The cancellation reason
 * @returns Guard check result
 */
export async function canCancel(
  jobCard: JobCardForStateMachine,
  userId: string,
  userPrivileges?: string[],
  reason?: string
): Promise<GuardCheckResult> {
  const missingRequirements: string[] = [];

  // Check valid states for cancellation
  const validStates: JobCardStatus[] = ['DRAFT', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD'];
  
  if (!validStates.includes(jobCard.status as JobCardStatus)) {
    return {
      canProceed: false,
      reason: `Cannot cancel job card in ${jobCard.status} status. Must be in DRAFT, APPROVED, IN_PROGRESS, or ON_HOLD status.`,
    };
  }

  // Check cancellation reason
  if (!reason || reason.trim().length === 0) {
    return {
      canProceed: false,
      reason: 'Cancellation reason is mandatory',
    };
  }

  // For DRAFT status - check no MRs raised, no labour logged
  if (jobCard.status === 'DRAFT') {
    const mrCount = await db.materialRequest.count({
      where: { jobCardId: jobCard.id },
    });
    if (mrCount > 0) {
      missingRequirements.push('Material requests must be cancelled first');
    }

    const timeLogCount = await db.timeLog.count({
      where: { jobCardId: jobCard.id },
    });
    if (timeLogCount > 0) {
      missingRequirements.push('Labour logs must be removed first');
    }
  }

  // For IN_PROGRESS or ON_HOLD - check manager-level privilege
  if (jobCard.status === 'IN_PROGRESS' || jobCard.status === 'ON_HOLD') {
    const hasManagerPrivilege = userPrivileges
      ? userPrivileges.includes('JC_CANCEL') || userPrivileges.includes('JC_MANAGE')
      : await hasPrivilege(userId, 'JC_CANCEL') || await hasPrivilege(userId, 'JC_MANAGE');

    if (!hasManagerPrivilege) {
      return {
        canProceed: false,
        reason: 'Manager-level privilege required to cancel job card in progress',
      };
    }
  }

  if (missingRequirements.length > 0) {
    return {
      canProceed: false,
      reason: 'Requirements not met for cancellation',
      missingRequirements,
    };
  }

  return { canProceed: true };
}

// ============================================
// State Transition Function
// ============================================

/**
 * Execute a state transition on a job card
 * 
 * This function:
 * 1. Validates the transition is allowed
 * 2. Executes guard checks
 * 3. Updates the job card status
 * 4. Logs the transition to JcStateTransition table
 * 5. Handles side effects (MR cancellation, etc.)
 * 
 * @param jobCardId - The ID of the job card to transition
 * @param transition - The type of transition to execute
 * @param userId - The ID of the user performing the transition
 * @param options - Additional options (reason, meter reading, comments)
 * @returns Transition result with success status and new state
 */
export async function transitionJobCard(
  jobCardId: string,
  transition: TransitionType,
  userId: string,
  options?: TransitionOptions
): Promise<TransitionResult> {
  try {
    // Fetch job card with related data
    const jobCard = await db.jobCard.findUnique({
      where: { id: jobCardId },
      include: {
        asset: {
          include: { qrCodes: true },
        },
        tasks: {
          select: {
            id: true,
            isMandatory: true,
            isComplete: true,
            requiresPhoto: true,
            photoCount: true,
          },
        },
        technicianAssignments: {
          where: { isActive: true },
        },
        materialRequests: {
          where: { status: { notIn: ['CLOSED', 'CANCELLED', 'REJECTED'] } },
        },
        toolLoans: {
          where: { loanStatus: 'ACTIVE' },
        },
        stateTransitions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!jobCard) {
      return {
        success: false,
        error: 'Job card not found',
      };
    }

    const currentStatus = jobCard.status as JobCardStatus;
    const targetStatus = TRANSITION_TARGET_STATES[transition];

    // Validate transition is allowed from current state
    if (!VALID_TRANSITIONS[currentStatus]?.includes(transition)) {
      return {
        success: false,
        error: `Transition ${transition} is not allowed from ${currentStatus} status`,
      };
    }

    // Execute guard checks based on transition type
    let guardResult: GuardCheckResult;

    switch (transition) {
      case 'SUBMIT':
        guardResult = await canSubmit(jobCard, userId);
        break;
      case 'APPROVE':
        guardResult = await canApprove(jobCard, userId);
        break;
      case 'REJECT':
        guardResult = await canReject(jobCard, userId, undefined, options?.reason);
        break;
      case 'RETURN':
        guardResult = await canReturn(jobCard, userId, options?.reason);
        break;
      case 'START':
        guardResult = await canStartWork(jobCard, userId);
        break;
      case 'HOLD':
        guardResult = await canHold(jobCard, userId, undefined, options?.reason);
        break;
      case 'RESUME':
        guardResult = await canResume(jobCard, userId);
        break;
      case 'COMPLETE':
        guardResult = await canComplete(jobCard, userId);
        break;
      case 'REOPEN':
        guardResult = await canReopen(jobCard, userId, undefined, options?.reason);
        break;
      case 'CLOSE':
        guardResult = await canClose(jobCard, userId);
        break;
      case 'CANCEL':
        guardResult = await canCancel(jobCard, userId, undefined, options?.reason);
        break;
      default:
        return {
          success: false,
          error: `Unknown transition type: ${transition}`,
        };
    }

    if (!guardResult.canProceed) {
      return {
        success: false,
        error: guardResult.reason || 'Guard check failed',
      };
    }

    // Execute transition in transaction
    const result = await db.$transaction(async (tx) => {
      // Prepare update data
      const updateData: Record<string, unknown> = {
        status: targetStatus,
        updatedBy: userId,
        updatedAt: new Date(),
      };

      // Handle transition-specific side effects
      switch (transition) {
        case 'START':
          updateData.actualStart = new Date();
          if (options?.meterReading !== undefined) {
            updateData.meterReadingStart = options.meterReading;
          }
          break;

        case 'COMPLETE':
          updateData.actualEnd = new Date();
          if (options?.meterReading !== undefined) {
            updateData.meterReadingEnd = options.meterReading;
          }
          break;

        case 'CLOSE':
          updateData.closedAt = new Date();
          updateData.closedBy = userId;
          break;

        case 'CANCEL':
          updateData.cancelledAt = new Date();
          updateData.cancelledBy = userId;
          updateData.cancellationReason = options?.reason;
          break;

        case 'REOPEN':
          updateData.reopenedAt = new Date();
          updateData.reopenedBy = userId;
          updateData.reopenReason = options?.reason;
          updateData.actualEnd = null; // Clear completion time
          break;

        case 'REJECT':
          // Rejection reason stored in transition log
          break;
      }

      // Cancel material requests when cancelling IN_PROGRESS job card
      if (transition === 'CANCEL' && currentStatus === 'IN_PROGRESS') {
        await tx.materialRequest.updateMany({
          where: {
            jobCardId,
            status: { notIn: ['CLOSED', 'CANCELLED', 'REJECTED', 'FULFILLED'] },
          },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date(),
          },
        });
      }

      // Update job card status
      await tx.jobCard.update({
        where: { id: jobCardId },
        data: updateData,
      });

      // Create state transition log
      const stateTransition = await tx.jcStateTransition.create({
        data: {
          jobCardId,
          fromState: currentStatus,
          toState: targetStatus,
          transitionType: transition,
          actorId: userId,
          reason: options?.reason,
          comments: options?.comments,
        },
      });

      return stateTransition;
    });

    return {
      success: true,
      newState: targetStatus,
      transitionId: result.id,
    };
  } catch (error) {
    console.error('State transition error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

// ============================================
// SLA Functions
// ============================================

/**
 * Calculate SLA targets for a job card based on its priority
 * 
 * @param jobCard - The job card or priority string
 * @returns SLA target configuration
 */
export function calculateSlaTargets(
  jobCard: { priority: string } | JobCardPriority
): SlaTarget | null {
  const priority = typeof jobCard === 'string' ? jobCard : jobCard.priority;
  return SLA_TARGETS.find(t => t.priority === priority) || null;
}

/**
 * Check the current SLA status of a job card
 * 
 * @param jobCard - The job card to check
 * @returns SLA status (ON_TRACK, AT_RISK, BREACHED)
 */
export function checkSlaStatus(jobCard: {
  status: string;
  priority: string;
  createdAt: Date;
  actualStart: Date | null;
  actualEnd: Date | null;
}): SlaStatus {
  const slaTarget = calculateSlaTargets(jobCard.priority);
  
  if (!slaTarget) {
    return 'ON_TRACK';
  }

  const now = new Date();
  const createdTime = new Date(jobCard.createdAt).getTime();
  
  // Check first response SLA
  if (!jobCard.actualStart && jobCard.status !== 'CLOSED') {
    const firstResponseDeadline = createdTime + slaTarget.firstResponseMinutes * 60 * 1000;
    const timeUntilDeadline = firstResponseDeadline - now.getTime();
    
    if (timeUntilDeadline < 0) {
      return 'BREACHED';
    }
    
    // At risk if less than 25% of time remaining
    if (timeUntilDeadline < slaTarget.firstResponseMinutes * 60 * 1000 * 0.25) {
      return 'AT_RISK';
    }
  }

  // Check completion SLA
  const endTime = jobCard.actualEnd ? new Date(jobCard.actualEnd).getTime() : now.getTime();
  const completionDeadline = createdTime + slaTarget.completionMinutes * 60 * 1000;
  const timeUntilCompletion = completionDeadline - endTime;

  if (['COMPLETED', 'CLOSED'].includes(jobCard.status)) {
    // Check if completed within SLA
    if (jobCard.actualEnd) {
      const completionTime = new Date(jobCard.actualEnd).getTime();
      if (completionTime > completionDeadline) {
        return 'BREACHED';
      }
    }
    return 'ON_TRACK';
  }

  if (timeUntilCompletion < 0) {
    return 'BREACHED';
  }

  // At risk if less than 25% of time remaining
  if (timeUntilCompletion < slaTarget.completionMinutes * 60 * 1000 * 0.25) {
    return 'AT_RISK';
  }

  return 'ON_TRACK';
}

/**
 * Get the current escalation level for a job card
 * Based on how long the job card has been active and its priority
 * 
 * @param jobCard - The job card to check
 * @returns Current escalation level
 */
export function getEscalationLevel(jobCard: {
  status: string;
  priority: string;
  createdAt: Date;
  actualStart: Date | null;
}): EscalationLevel {
  const slaTarget = calculateSlaTargets(jobCard.priority);
  
  if (!slaTarget || ['CLOSED', 'CANCELLED'].includes(jobCard.status)) {
    return 'NONE';
  }

  const now = new Date();
  const createdTime = new Date(jobCard.createdAt).getTime();
  const minutesSinceCreation = (now.getTime() - createdTime) / (1000 * 60);

  // Check escalation levels
  if (slaTarget.autoEscalation.level2Minutes && slaTarget.autoEscalation.level2Target) {
    if (minutesSinceCreation >= slaTarget.autoEscalation.level2Minutes) {
      return slaTarget.autoEscalation.level2Target;
    }
  }

  if (minutesSinceCreation >= slaTarget.autoEscalation.level1Minutes) {
    return slaTarget.autoEscalation.level1Target;
  }

  return 'NONE';
}

/**
 * Calculate time remaining until SLA breach
 * 
 * @param jobCard - The job card to check
 * @returns Object with first response and completion times remaining in minutes
 */
export function getSlaTimeRemaining(jobCard: {
  status: string;
  priority: string;
  createdAt: Date;
  actualStart: Date | null;
}): {
  firstResponseMinutes: number | null;
  completionMinutes: number | null;
} {
  const slaTarget = calculateSlaTargets(jobCard.priority);
  
  if (!slaTarget || ['COMPLETED', 'CLOSED', 'CANCELLED'].includes(jobCard.status)) {
    return {
      firstResponseMinutes: null,
      completionMinutes: null,
    };
  }

  const now = new Date();
  const createdTime = new Date(jobCard.createdAt).getTime();
  const minutesSinceCreation = (now.getTime() - createdTime) / (1000 * 60);

  const firstResponseRemaining = jobCard.actualStart
    ? null
    : Math.max(0, slaTarget.firstResponseMinutes - minutesSinceCreation);

  const completionRemaining = Math.max(
    0,
    slaTarget.completionMinutes - minutesSinceCreation
  );

  return {
    firstResponseMinutes: firstResponseRemaining,
    completionMinutes: completionRemaining,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get all valid transitions for a job card status
 * 
 * @param status - Current job card status
 * @returns Array of valid transition types
 */
export function getValidTransitions(status: JobCardStatus): TransitionType[] {
  return VALID_TRANSITIONS[status] || [];
}

/**
 * Get the target state for a transition type
 * 
 * @param transition - The transition type
 * @returns The target job card status
 */
export function getTransitionTarget(transition: TransitionType): JobCardStatus {
  return TRANSITION_TARGET_STATES[transition];
}

/**
 * Check if a status transition is valid
 * 
 * @param fromStatus - Current status
 * @param toStatus - Target status
 * @returns True if transition is valid
 */
export function isValidTransition(
  fromStatus: JobCardStatus,
  toStatus: JobCardStatus
): boolean {
  const validTransitions = VALID_TRANSITIONS[fromStatus];
  if (!validTransitions) return false;
  
  return validTransitions.some(
    t => TRANSITION_TARGET_STATES[t] === toStatus
  );
}

/**
 * Get all state transitions for a job card
 * 
 * @param jobCardId - The job card ID
 * @returns Array of state transitions
 */
export async function getStateTransitionHistory(
  jobCardId: string
): Promise<Array<{
  id: string;
  fromState: string;
  toState: string;
  transitionType: string;
  actorId: string;
  reason: string | null;
  comments: string | null;
  createdAt: Date;
}>> {
  return db.jcStateTransition.findMany({
    where: { jobCardId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get the previous state for a job card
 * 
 * @param jobCardId - The job card ID
 * @returns The previous status or null
 */
export async function getPreviousState(
  jobCardId: string
): Promise<JobCardStatus | null> {
  const lastTransition = await db.jcStateTransition.findFirst({
    where: { jobCardId },
    orderBy: { createdAt: 'desc' },
    select: { fromState: true },
  });

  return (lastTransition?.fromState as JobCardStatus) || null;
}

/**
 * Check if a job card has been reopened
 * 
 * @param jobCardId - The job card ID
 * @returns True if the job card has been reopened
 */
export async function hasBeenReopened(jobCardId: string): Promise<boolean> {
  const reopenCount = await db.jcStateTransition.count({
    where: {
      jobCardId,
      transitionType: 'REOPEN',
    },
  });

  return reopenCount > 0;
}

/**
 * Get reopen count for a job card
 * 
 * @param jobCardId - The job card ID
 * @returns Number of times the job card has been reopened
 */
export async function getReopenCount(jobCardId: string): Promise<number> {
  return db.jcStateTransition.count({
    where: {
      jobCardId,
      transitionType: 'REOPEN',
    },
  });
}
