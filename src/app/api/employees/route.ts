import { db } from '@/lib/db';
import { apiSuccess, apiPaginated, apiError, parsePagination, getSkip } from '@/lib/api-utils';
import { z } from 'zod';

const createEmployeeSchema = z.object({
  employeeNumber: z.string().min(1, 'Employee number is required'),
  name: z.string().min(1, 'Name is required'),
  department: z.string().optional(),
  designation: z.string().optional(),
  skillLevel: z.string().optional(),
  hourlyRate: z.number().optional(),
  overtimeRate: z.number().optional(),
  hireDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']).default('ACTIVE'),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search } = parsePagination(url);
    const skip = getSkip(page, limit!);

    const status = url.searchParams.get('status');
    const department = url.searchParams.get('department');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (department) where.department = department;
    if (search) {
      where.OR = [
        { employeeNumber: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const [employees, total] = await Promise.all([
      db.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ name: 'asc' }],
        select: {
          id: true,
          employeeNumber: true,
          name: true,
          department: true,
          designation: true,
          skillLevel: true,
          hourlyRate: true,
          overtimeRate: true,
          hireDate: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              timeLogs: true,
              technicianSkills: true,
            },
          },
        },
      }),
      db.employee.count({ where }),
    ]);

    const data = employees.map(emp => ({
      ...emp,
      hourlyRate: emp.hourlyRate ? Number(emp.hourlyRate) : null,
      overtimeRate: emp.overtimeRate ? Number(emp.overtimeRate) : null,
    }));

    return apiPaginated(data, total, page, limit);
  } catch (error) {
    console.error('Get employees error:', error);
    return apiError('Failed to fetch employees', 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createEmployeeSchema.safeParse(body);
    
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const data = result.data;

    const existing = await db.employee.findUnique({
      where: { employeeNumber: data.employeeNumber },
    });

    if (existing) {
      return apiError('Employee number already exists', 400);
    }

    const employee = await db.employee.create({
      data: {
        employeeNumber: data.employeeNumber,
        name: data.name,
        department: data.department,
        designation: data.designation,
        skillLevel: data.skillLevel,
        hourlyRate: data.hourlyRate,
        overtimeRate: data.overtimeRate,
        hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
        status: data.status,
      },
    });

    return apiSuccess({
      ...employee,
      hourlyRate: employee.hourlyRate ? Number(employee.hourlyRate) : null,
      overtimeRate: employee.overtimeRate ? Number(employee.overtimeRate) : null,
    }, 'Employee created successfully');
  } catch (error) {
    console.error('Create employee error:', error);
    return apiError('Failed to create employee', 500);
  }
}
