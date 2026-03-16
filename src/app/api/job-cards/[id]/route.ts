import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import { z } from 'zod';

// Schema for updating job card
const updateJobCardSchema = z.object({
  faultDescription: z.string().min(1).optional(),
  diagnosisNotes: z.string().optional(),
  workPerformed: z.string().optional(),
  estimatedCost: z.number().optional(),
  estimatedDuration: z.number().int().optional(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  meterReadingEnd: z.number().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL', 'EMERGENCY']).optional(),
  jobType: z.enum(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'INSPECTION', 'MODIFICATION']).optional(),
});

// GET /api/job-cards/[id] - Get single job card with full details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const jobCard = await db.jobCard.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            category: true,
            meters: { where: { isActive: true } },
          },
        },
        creator: {
          select: { id: true, name: true, email: true, employeeId: true },
        },
        supervisor: {
          select: { id: true, name: true, email: true },
        },
        tasks: {
          orderBy: { sequence: 'asc' },
        },
        technicianAssignments: {
          where: { isActive: true },
          include: {
            technician: {
              select: { id: true, name: true, email: true, employeeId: true },
            },
          },
        },
        materialRequests: {
          include: {
            lines: {
              include: {
                item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } },
              },
            },
          },
        },
        materialIssues: {
          include: {
            lines: {
              include: {
                item: { select: { id: true, itemCode: true, name: true } },
              },
            },
          },
        },
        costLines: true,
        documents: true,
        stateTransitions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        approvals: {
          include: {
            approver: { select: { id: true, name: true, email: true } },
          },
        },
        timeLogs: {
          include: {
            employee: { select: { id: true, name: true, employeeNumber: true } },
          },
        },
      },
    });

    if (!jobCard || !jobCard.isActive) {
      return apiNotFound('Job card');
    }

    // Calculate totals
    const totalCost = jobCard.costLines.reduce((sum, cl) => sum + Number(cl.totalCost), 0);
    const totalHours = jobCard.timeLogs.reduce((sum, tl) => sum + (tl.totalMinutes || 0), 0);

    return apiSuccess({
      ...jobCard,
      calculatedCost: totalCost,
      calculatedHours: totalHours,
    });
  } catch (error) {
    console.error('Get job card error:', error);
    return apiError('Failed to fetch job card', 500);
  }
}

// PUT /api/job-cards/[id] - Update job card
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = updateJobCardSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const data = result.data;

    // Check if job card exists
    const existing = await db.jobCard.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      return apiNotFound('Job card');
    }

    // Only allow updates if in DRAFT or APPROVED status
    if (!['DRAFT', 'APPROVED'].includes(existing.status)) {
      return apiError('Cannot update job card in current status', 400);
    }

    // Update job card
    const jobCard = await db.jobCard.update({
      where: { id },
      data: {
        faultDescription: data.faultDescription,
        diagnosisNotes: data.diagnosisNotes,
        workPerformed: data.workPerformed,
        estimatedCost: data.estimatedCost,
        estimatedDuration: data.estimatedDuration,
        scheduledStart: data.scheduledStart ? new Date(data.scheduledStart) : undefined,
        scheduledEnd: data.scheduledEnd ? new Date(data.scheduledEnd) : undefined,
        meterReadingEnd: data.meterReadingEnd,
        priority: data.priority,
        jobType: data.jobType,
        updatedAt: new Date(),
      },
      include: {
        asset: true,
      },
    });

    return apiSuccess(jobCard, 'Job card updated successfully');
  } catch (error) {
    console.error('Update job card error:', error);
    return apiError('Failed to update job card', 500);
  }
}
