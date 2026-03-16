import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

const assignSchema = z.object({
  technicianId: z.string().min(1, 'Technician ID is required'),
  role: z.enum(['TECHNICIAN', 'LEAD', 'SUPERVISOR']).default('TECHNICIAN'),
  assignedBy: z.string().optional(),
});

const unassignSchema = z.object({
  technicianId: z.string().min(1, 'Technician ID is required'),
});

// GET - Get technicians assigned to a job card
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const assignments = await db.jcTechnicianAssignment.findMany({
      where: { 
        jobCardId: id,
        isActive: true,
      },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
          },
        },
      },
      orderBy: { assignedAt: 'asc' },
    });

    return apiSuccess({
      data: assignments.map(a => ({
        id: a.id,
        technicianId: a.technicianId,
        technician: a.technician,
        role: a.role,
        assignedAt: a.assignedAt,
        startTime: a.startTime,
        endTime: a.endTime,
      })),
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    return apiError('Failed to fetch assignments', 500);
  }
}

// POST - Assign a technician to a job card
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const result = assignSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { technicianId, role, assignedBy } = result.data;

    // Verify job card exists
    const jobCard = await db.jobCard.findUnique({
      where: { id },
    });

    if (!jobCard) {
      return apiError('Job card not found', 404);
    }

    // Check if job card can have technicians assigned
    if (['COMPLETED', 'CLOSED', 'CANCELLED'].includes(jobCard.status)) {
      return apiError('Cannot assign technicians to a completed/closed/cancelled job card', 400);
    }

    // Verify technician exists
    const technician = await db.user.findUnique({
      where: { id: technicianId },
    });

    if (!technician || !technician.isActive) {
      return apiError('Technician not found or inactive', 404);
    }

    // Check if already assigned
    const existingAssignment = await db.jcTechnicianAssignment.findUnique({
      where: {
        jobCardId_technicianId: {
          jobCardId: id,
          technicianId: technicianId,
        },
      },
    });

    if (existingAssignment) {
      if (existingAssignment.isActive) {
        return apiError('Technician is already assigned to this job card', 400);
      }
      // Reactivate existing assignment
      const updated = await db.jcTechnicianAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          isActive: true,
          role: role,
          assignedAt: new Date(),
          assignedBy: assignedBy,
        },
        include: {
          technician: {
            select: { id: true, name: true, email: true, employeeId: true },
          },
        },
      });

      return apiSuccess({
        id: updated.id,
        technicianId: updated.technicianId,
        technician: updated.technician,
        role: updated.role,
        assignedAt: updated.assignedAt,
      }, 'Technician reassigned successfully');
    }

    // Create new assignment
    const assignment = await db.jcTechnicianAssignment.create({
      data: {
        jobCardId: id,
        technicianId: technicianId,
        role: role,
        assignedBy: assignedBy,
      },
      include: {
        technician: {
          select: { id: true, name: true, email: true, employeeId: true },
        },
      },
    });

    return apiSuccess({
      id: assignment.id,
      technicianId: assignment.technicianId,
      technician: assignment.technician,
      role: assignment.role,
      assignedAt: assignment.assignedAt,
    }, 'Technician assigned successfully', 201);
  } catch (error) {
    console.error('Assign technician error:', error);
    return apiError('Failed to assign technician', 500);
  }
}

// DELETE - Unassign a technician from a job card
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const result = unassignSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { technicianId } = result.data;

    // Find and deactivate the assignment
    const assignment = await db.jcTechnicianAssignment.findUnique({
      where: {
        jobCardId_technicianId: {
          jobCardId: id,
          technicianId: technicianId,
        },
      },
    });

    if (!assignment) {
      return apiError('Assignment not found', 404);
    }

    // Soft delete by setting isActive to false
    await db.jcTechnicianAssignment.update({
      where: { id: assignment.id },
      data: {
        isActive: false,
        endTime: new Date(),
      },
    });

    return apiSuccess({}, 'Technician unassigned successfully');
  } catch (error) {
    console.error('Unassign technician error:', error);
    return apiError('Failed to unassign technician', 500);
  }
}
