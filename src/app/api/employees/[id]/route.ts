import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import { z } from 'zod';

const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  skillLevel: z.string().optional(),
  hourlyRate: z.number().optional(),
  overtimeRate: z.number().optional(),
  hireDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        timeLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            jobCard: {
              select: {
                jobCardNumber: true,
                asset: { select: { name: true } },
              },
            },
          },
        },
        technicianSkills: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!employee) {
      return apiNotFound('Employee');
    }

    return apiSuccess({
      ...employee,
      hourlyRate: employee.hourlyRate ? Number(employee.hourlyRate) : null,
      overtimeRate: employee.overtimeRate ? Number(employee.overtimeRate) : null,
    });
  } catch (error) {
    console.error('Get employee error:', error);
    return apiError('Failed to fetch employee', 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = updateEmployeeSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const data = result.data;

    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing) {
      return apiNotFound('Employee');
    }

    const employee = await db.employee.update({
      where: { id },
      data: {
        name: data.name,
        department: data.department,
        designation: data.designation,
        skillLevel: data.skillLevel,
        hourlyRate: data.hourlyRate,
        overtimeRate: data.overtimeRate,
        hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
        status: data.status,
        updatedAt: new Date(),
      },
    });

    return apiSuccess({
      ...employee,
      hourlyRate: employee.hourlyRate ? Number(employee.hourlyRate) : null,
      overtimeRate: employee.overtimeRate ? Number(employee.overtimeRate) : null,
    }, 'Employee updated successfully');
  } catch (error) {
    console.error('Update employee error:', error);
    return apiError('Failed to update employee', 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing) {
      return apiNotFound('Employee');
    }

    const activeTimeLogs = await db.timeLog.count({
      where: {
        employeeId: id,
        endTime: null,
      },
    });

    if (activeTimeLogs > 0) {
      return apiError('Cannot delete employee with active time logs', 400);
    }

    await db.employee.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return apiSuccess(null, 'Employee deactivated successfully');
  } catch (error) {
    console.error('Delete employee error:', error);
    return apiError('Failed to delete employee', 500);
  }
}
