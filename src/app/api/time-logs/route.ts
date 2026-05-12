import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  parsePagination,
  getSkip,
} from '@/lib/api-utils';
import { z } from 'zod';

// Time Log schema for creation
const createTimeLogSchema = z.object({
  employeeId: z.string().min(1),
  jobCardId: z.string().optional(),
  logDate: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  breakMinutes: z.number().int().min(0).default(0),
  hourlyRate: z.number().optional(),
  notes: z.string().optional(),
});

// GET /api/time-logs - List time logs with pagination and filters
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Additional filters
    const employeeId = url.searchParams.get('employeeId');
    const jobCardId = url.searchParams.get('jobCardId');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (employeeId) {
      where.employeeId = employeeId;
    }
    if (jobCardId) {
      where.jobCardId = jobCardId;
    }
    if (dateFrom || dateTo) {
      where.logDate = {};
      if (dateFrom) {
        (where.logDate as Record<string, unknown>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.logDate as Record<string, unknown>).lte = new Date(dateTo);
      }
    }

    // Build orderBy - must be an array for Prisma
    let orderBy: Array<Record<string, unknown>>;
    if (sortBy) {
      orderBy = [{ [sortBy]: sortOrder }];
    } else {
      orderBy = [{ logDate: 'desc' }, { createdAt: 'desc' }];
    }

    const [timeLogs, total] = await Promise.all([
      db.timeLog.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
      }),
      db.timeLog.count({ where }),
    ]);

    // Transform data - convert Decimal to number for JSON serialization
    const data = timeLogs.map(tl => ({
      id: tl.id,
      employee: tl.employee,
      jobCard: tl.jobCard,
      logDate: tl.logDate,
      startTime: tl.startTime,
      endTime: tl.endTime,
      breakMinutes: tl.breakMinutes,
      totalMinutes: tl.totalMinutes,
      hourlyRate: tl.hourlyRate ? Number(tl.hourlyRate) : null,
      totalCost: tl.totalCost ? Number(tl.totalCost) : null,
      notes: tl.notes,
      createdAt: tl.createdAt,
    }));

    return apiPaginated(data, total, page, limit);
  } catch (error) {
    console.error('Get time logs error:', error);
    return apiError('Failed to fetch time logs', 500);
  }
}

// POST /api/time-logs - Create new time log
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const result = createTimeLogSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const data = result.data;

    // Verify employee exists
    const employee = await db.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!employee || employee.status !== 'ACTIVE') {
      return apiError('Employee not found or inactive', 404);
    }

    // Verify job card if provided
    if (data.jobCardId) {
      const jobCard = await db.jobCard.findUnique({
        where: { id: data.jobCardId },
      });
      if (!jobCard || !jobCard.isActive) {
        return apiError('Job card not found', 404);
      }
    }

    // Calculate total minutes and cost
    const startTime = new Date(data.startTime);
    let totalMinutes = 0;
    let totalCost: number | null = null;

    if (data.endTime) {
      const endTime = new Date(data.endTime);
      totalMinutes = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 60000) - data.breakMinutes);
      
      const rate = data.hourlyRate || employee.hourlyRate?.toNumber();
      if (rate && totalMinutes > 0) {
        totalCost = (rate / 60) * totalMinutes;
      }
    }

    // Create time log
    const timeLog = await db.timeLog.create({
      data: {
        employeeId: data.employeeId,
        jobCardId: data.jobCardId,
        logDate: new Date(data.logDate),
        startTime: startTime,
        endTime: data.endTime ? new Date(data.endTime) : null,
        breakMinutes: data.breakMinutes,
        totalMinutes: totalMinutes || null,
        hourlyRate: data.hourlyRate || employee.hourlyRate,
        totalCost: totalCost,
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

    return apiSuccess(timeLog, 'Time log created successfully', 201);
  } catch (error) {
    console.error('Create time log error:', error);
    return apiError('Failed to create time log', 500);
  }
}
