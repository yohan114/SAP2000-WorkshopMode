import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound, apiValidationError } from '@/lib/api-utils';
import { z } from 'zod';

// Schema for creating a consumable entry
const createConsumableSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive(),
  unitCost: z.number().optional(),
  notes: z.string().optional(),
});

// GET /api/service-jobs/[id]/consumables - List consumables for a service job
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

    const consumables = await db.serviceConsumable.findMany({
      where: { serviceJobId: id },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(consumables);
  } catch (error) {
    console.error('Get consumables error:', error);
    return apiError('Failed to fetch consumables', 500);
  }
}

// POST /api/service-jobs/[id]/consumables - Add a consumable entry
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = createConsumableSchema.safeParse(body);
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
    const totalCost = data.unitCost
      ? data.quantity * data.unitCost
      : undefined;

    const consumable = await db.serviceConsumable.create({
      data: {
        serviceJobId: id,
        itemName: data.itemName,
        quantity: data.quantity,
        unitCost: data.unitCost,
        totalCost,
        notes: data.notes,
      },
    });

    return apiSuccess(consumable, 'Consumable entry added successfully', 201);
  } catch (error) {
    console.error('Create consumable error:', error);
    return apiError('Failed to add consumable entry', 500);
  }
}
