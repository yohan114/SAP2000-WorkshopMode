import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiError,
} from '@/lib/api-utils';
import { z } from 'zod';

// Time Log update schema
const updateTimeLogSchema = z.object({
  employeeId: z.string().min(1).optional(),
  jobCardId: z.string().nullable().optional(),
  logDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().nullable().optional(),
  breakMinutes: z.number().int().min(0).optional(),
  hourlyRate: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// GET /api/time-logs/[id] - Get single time log
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const timeLog = await db.timeLog.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            name: true,
            designation: true,
            hourlyRate: true,
          },
        },
        jobCard: {
          select: {
            id: true,
            jobCardNumber: true,
            status: true,
            asset: {
              select: {
                id: true,
                name: true,
                assetNumber: true,
              },
            },
          },
        },
      },
    });

    if (!timeLog) {
      return apiError('Time log not found', 404);
    }

    return apiSuccess({
      id: timeLog.id,
      employee: timeLog.employee,
      jobCard: timeLog.jobCard,
      logDate: timeLog.logDate,
      startTime: timeLog.startTime,
      endTime: timeLog.endTime,
      breakMinutes: timeLog.breakMinutes,
      totalMinutes: timeLog.totalMinutes,
      hourlyRate: timeLog.hourlyRate ? Number(timeLog.hourlyRate) : null,
      totalCost: timeLog.totalCost ? Number(timeLog.totalCost) : null,
      notes: timeLog.notes,
      createdAt: timeLog.createdAt,
    });
  } catch (error) {
    console.error('Get time log error:', error);
    return apiError('Failed to fetch time log', 500);
  }
}

// PUT /api/time-logs/[id] - Update time log
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const result = updateTimeLogSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const data = result.data;

    // Check if time log exists
    const existingLog = await db.timeLog.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!existingLog) {
      return apiError('Time log not found', 404);
    }

    // Verify employee if changing
    if (data.employeeId) {
      const employee = await db.employee.findUnique({
        where: { id: data.employeeId },
      });
      if (!employee || employee.status !== 'ACTIVE') {
        return apiError('Employee not found or inactive', 404);
      }
    }

    // Verify job card if changing
    if (data.jobCardId) {
      const jobCard = await db.jobCard.findUnique({
        where: { id: data.jobCardId },
      });
      if (!jobCard || !jobCard.isActive) {
        return apiError('Job card not found', 404);
      }
    }

    // Calculate total minutes and cost if times are provided
    let totalMinutes = existingLog.totalMinutes;
    let totalCost = existingLog.totalCost;

    const startTime = data.startTime ? new Date(data.startTime) : existingLog.startTime;
    const endTime = data.endTime !== undefined ? (data.endTime ? new Date(data.endTime) : null) : existingLog.endTime;
    const breakMinutes = data.breakMinutes !== undefined ? data.breakMinutes : existingLog.breakMinutes;
    const hourlyRate = data.hourlyRate !== undefined ? data.hourlyRate : existingLog.hourlyRate?.toNumber();

    if (startTime && endTime) {
      totalMinutes = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 60000) - breakMinutes);
      
      if (hourlyRate && totalMinutes > 0) {
        totalCost = (hourlyRate / 60) * totalMinutes;
      } else {
        totalCost = null;
      }
    } else {
      totalMinutes = null;
      totalCost = null;
    }

    // Update time log
    const timeLog = await db.timeLog.update({
      where: { id },
      data: {
        employeeId: data.employeeId,
        jobCardId: data.jobCardId === null ? null : data.jobCardId,
        logDate: data.logDate ? new Date(data.logDate) : undefined,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime === null ? null : (data.endTime ? new Date(data.endTime) : undefined),
        breakMinutes: data.breakMinutes,
        hourlyRate: data.hourlyRate,
        totalMinutes,
        totalCost,
        notes: data.notes,
      },
      include: {
        employee: true,
        jobCard: {
          include: {
            asset: true,
          },
        },
      },
    });

    return apiSuccess(timeLog, 'Time log updated successfully');
  } catch (error) {
    console.error('Update time log error:', error);
    return apiError('Failed to update time log', 500);
  }
}

// DELETE /api/time-logs/[id] - Delete time log
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if time log exists
    const existingLog = await db.timeLog.findUnique({
      where: { id },
    });

    if (!existingLog) {
      return apiError('Time log not found', 404);
    }

    // Delete time log
    await db.timeLog.delete({
      where: { id },
    });

    return apiSuccess(null, 'Time log deleted successfully');
  } catch (error) {
    console.error('Delete time log error:', error);
    return apiError('Failed to delete time log', 500);
  }
}
