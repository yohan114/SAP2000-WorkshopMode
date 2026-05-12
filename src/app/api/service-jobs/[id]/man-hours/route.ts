import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound, apiValidationError } from '@/lib/api-utils';
import { z } from 'zod';

// Schema for creating a man hour entry
const createManHourSchema = z.object({
  technicianName: z.string().min(1, 'Technician name is required'),
  hoursWorked: z.number().positive(),
  hourlyRate: z.number().optional(),
  notes: z.string().optional(),
});

// GET /api/service-jobs/[id]/man-hours - List man hours for a service job
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify service job exists
    const serviceJob = await db.serviceJob.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });

    if (!serviceJob || !serviceJob.isActive) {
      return apiNotFound('Service job');
    }

    const manHours = await db.serviceManHour.findMany({
      where: { serviceJobId: id },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(manHours);
  } catch (error) {
    console.error('Get man hours error:', error);
    return apiError('Failed to fetch man hours', 500);
  }
}

// POST /api/service-jobs/[id]/man-hours - Add a man hour entry
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = createManHourSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;

    // Verify service job exists
    const serviceJob = await db.serviceJob.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });

    if (!serviceJob || !serviceJob.isActive) {
      return apiNotFound('Service job');
    }

    // Auto-calculate totalCost
    const totalCost = data.hourlyRate
      ? data.hoursWorked * data.hourlyRate
      : undefined;

    const manHour = await db.serviceManHour.create({
      data: {
        serviceJobId: id,
        technicianName: data.technicianName,
        hoursWorked: data.hoursWorked,
        hourlyRate: data.hourlyRate,
        totalCost,
        notes: data.notes,
      },
    });

    // Update parent job's totalCharge from line items
    const [manHoursAgg, consumablesAgg, job] = await Promise.all([
      db.serviceManHour.aggregate({
        where: { serviceJobId: id },
        _sum: { totalCost: true },
      }),
      db.serviceConsumable.aggregate({
        where: { serviceJobId: id },
        _sum: { totalCost: true },
      }),
      db.serviceJob.findUnique({
        where: { id },
        select: { minimumCharge: true },
      }),
    ]);

    const manHourTotal = Number(manHoursAgg._sum.totalCost) || 0;
    const consumableTotal = Number(consumablesAgg._sum.totalCost) || 0;
    const minimumCharge = Number(job?.minimumCharge) || 0;
    const computedTotal = manHourTotal + consumableTotal + minimumCharge;

    await db.serviceJob.update({
      where: { id },
      data: { totalCharge: computedTotal },
    });

    return apiSuccess(manHour, 'Man hour entry added successfully', 201);
  } catch (error) {
    console.error('Create man hour error:', error);
    return apiError('Failed to add man hour entry', 500);
  }
}
