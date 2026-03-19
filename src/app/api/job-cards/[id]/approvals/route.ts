/**
 * Job Card Specific Approvals API Route
 * 
 * This endpoint handles approval operations for a specific job card,
 * including getting approval history and submitting approval decisions.
 */

import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound, apiForbidden } from '@/lib/api-utils';
import { triggerWebhooks } from '@/lib/webhook-service';
import {
  transitionJobCard,
  canApprove,
  canReject,
  canReturn,
} from '@/lib/job-card-state-machine';
import { hasPrivilege, checkPrivilege } from '@/lib/privileges';
import { z } from 'zod';

// Schema for approval decision
const approvalSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'RETURN']),
  approverId: z.string().min(1, 'Approver ID is required'),
  reason: z.string().optional(),
  comments: z.string().optional(),
});

/**
 * GET /api/job-cards/[id]/approvals
 * 
 * Get approval history for a job card.
 * 
 * Returns:
 * - All approval records for the job card
 * - Current approval status
 * - Next approvers (if pending)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify job card exists
    const jobCard = await db.jobCard.findUnique({
      where: { id },
      select: {
        id: true,
        jobCardNumber: true,
        status: true,
        priority: true,
        estimatedCost: true,
        createdBy: true,
        createdAt: true,
        asset: {
          select: {
            id: true,
            assetNumber: true,
            name: true,
          },
        },
        creator: {
          select: { id: true, name: true, email: true, department: true },
        },
      },
    });

    if (!jobCard) {
      return apiNotFound('Job card');
    }

    // Get all approval records
    const approvals = await db.jobCardApproval.findMany({
      where: { jobCardId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
            department: true,
          },
        },
      },
    });

    // Get state transitions related to approvals
    const approvalTransitions = await db.jcStateTransition.findMany({
      where: {
        jobCardId: id,
        transitionType: { in: ['APPROVE', 'REJECT', 'RETURN', 'SUBMIT'] },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Build approval timeline
    const timeline = [
      // Add submission event
      ...approvalTransitions
        .filter(t => t.transitionType === 'SUBMIT')
        .map(t => ({
          type: 'SUBMISSION',
          id: t.id,
          timestamp: t.createdAt,
          actor: t.actor,
          details: { reason: t.reason },
        })),
      // Add approval records
      ...approvals.map(a => ({
        type: 'APPROVAL_RECORD',
        id: a.id,
        timestamp: a.createdAt,
        actor: a.approver,
        details: {
          status: a.status,
          level: a.approvalLevel,
          comments: a.comments,
          approvedAt: a.approvedAt,
        },
      })),
      // Add transition events
      ...approvalTransitions
        .filter(t => t.transitionType !== 'SUBMIT')
        .map(t => ({
          type: 'TRANSITION',
          id: t.id,
          timestamp: t.createdAt,
          actor: t.actor,
          details: {
            transitionType: t.transitionType,
            fromState: t.fromState,
            toState: t.toState,
            reason: t.reason,
            comments: t.comments,
          },
        })),
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Get potential approvers (users with JC_APPROVE privilege)
    const potentialApprovers = await db.user.findMany({
      where: {
        isActive: true,
        roles: {
          some: {
            isActive: true,
            role: {
              isActive: true,
              privileges: {
                some: {
                  privilege: { code: 'JC_APPROVE' },
                  isGranted: true,
                },
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
      },
    });

    // Filter out the creator
    const eligibleApprovers = potentialApprovers.filter(u => u.id !== jobCard.createdBy);

    return apiSuccess({
      jobCard: {
        id: jobCard.id,
        jobCardNumber: jobCard.jobCardNumber,
        status: jobCard.status,
        priority: jobCard.priority,
        estimatedCost: jobCard.estimatedCost ? Number(jobCard.estimatedCost) : null,
        asset: jobCard.asset,
        creator: jobCard.creator,
        createdAt: jobCard.createdAt,
      },
      approvals: approvals.map(a => ({
        id: a.id,
        approver: a.approver,
        approvalLevel: a.approvalLevel,
        status: a.status,
        comments: a.comments,
        approvedAt: a.approvedAt,
        createdAt: a.createdAt,
      })),
      timeline,
      isPendingApproval: jobCard.status === 'PENDING',
      eligibleApprovers,
      // Quick stats
      stats: {
        totalApprovals: approvals.length,
        approvedCount: approvals.filter(a => a.status === 'APPROVED').length,
        rejectedCount: approvals.filter(a => a.status === 'REJECTED').length,
        pendingCount: approvals.filter(a => a.status === 'PENDING').length,
      },
    });
  } catch (error) {
    console.error('Approvals fetch error:', error);
    return apiError('Failed to fetch approval history', 500);
  }
}

/**
 * POST /api/job-cards/[id]/approvals
 * 
 * Submit approval/rejection decision for a job card.
 * 
 * Request body:
 * - decision: 'APPROVE' | 'REJECT' | 'RETURN'
 * - approverId: The user ID of the approver
 * - reason: Optional reason (required for REJECT and RETURN)
 * - comments: Optional additional comments
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate request
    const result = approvalSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { decision, approverId, reason, comments } = result.data;

    // Verify approver exists and is active
    const approver = await db.user.findUnique({
      where: { id: approverId },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (!approver || !approver.isActive) {
      return apiError('Approver not found or inactive', 404);
    }

    // Get job card with related data
    const jobCard = await db.jobCard.findUnique({
      where: { id },
      include: {
        asset: { select: { id: true, assetNumber: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    if (!jobCard) {
      return apiNotFound('Job card');
    }

    // Check if user can perform the action
    let canProceed = false;
    let blockReason = '';

    switch (decision) {
      case 'APPROVE': {
        const checkResult = await canApprove(jobCard, approverId);
        canProceed = checkResult.canProceed;
        blockReason = checkResult.reason || '';
        break;
      }
      case 'REJECT': {
        if (!reason || reason.length < 10) {
          return apiError('Rejection reason must be at least 10 characters', 400);
        }
        const checkResult = await canReject(jobCard, approverId, undefined, reason);
        canProceed = checkResult.canProceed;
        blockReason = checkResult.reason || '';
        break;
      }
      case 'RETURN': {
        if (!reason || reason.trim().length === 0) {
          return apiError('Return reason is required', 400);
        }
        const checkResult = await canReturn(jobCard, approverId, reason);
        canProceed = checkResult.canProceed;
        blockReason = checkResult.reason || '';
        break;
      }
    }

    if (!canProceed) {
      return apiForbidden(blockReason);
    }

    // Execute the decision using state machine
    const transitionType = decision === 'APPROVE' ? 'APPROVE' 
      : decision === 'REJECT' ? 'REJECT' 
      : 'RETURN';

    const transitionResult = await transitionJobCard(id, transitionType, approverId, {
      reason,
      comments,
    });

    if (!transitionResult.success) {
      return apiError(transitionResult.error || 'Transition failed', 400);
    }

    // Create approval record
    const approvalRecord = await db.jobCardApproval.create({
      data: {
        jobCardId: id,
        approverId,
        approvalLevel: 1,
        status: decision === 'APPROVE' ? 'APPROVED' : decision === 'REJECT' ? 'REJECTED' : 'RETURNED',
        comments: comments || reason,
        approvedAt: decision === 'APPROVE' ? new Date() : undefined,
      },
      include: {
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Get updated job card
    const updatedJobCard = await db.jobCard.findUnique({
      where: { id },
      include: {
        asset: { select: { id: true, assetNumber: true, name: true } },
        creator: { select: { id: true, name: true, email: true } },
        stateTransitions: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });

    // Trigger webhook
    const eventMap: Record<string, 'JOB_CARD_APPROVED' | 'JOB_CARD_REJECTED'> = {
      'APPROVE': 'JOB_CARD_APPROVED',
      'REJECT': 'JOB_CARD_REJECTED',
      'RETURN': 'JOB_CARD_RETURNED',
    };

    await triggerWebhooks(eventMap[decision] || 'JOB_CARD_APPROVED', {
      id: jobCard.id,
      jobCardNumber: jobCard.jobCardNumber,
      decision,
      approver: {
        id: approver.id,
        name: approver.name,
        email: approver.email,
      },
      previousStatus: jobCard.status,
      newStatus: transitionResult.newState,
      reason,
      timestamp: new Date().toISOString(),
    });

    return apiSuccess({
      jobCard: updatedJobCard,
      approval: approvalRecord,
      transition: {
        id: transitionResult.transitionId,
        type: transitionType,
        newState: transitionResult.newState,
      },
    }, `Job card ${decision.toLowerCase()}ed successfully`);
  } catch (error) {
    console.error('Approval decision error:', error);
    return apiError('Failed to process approval decision', 500);
  }
}
