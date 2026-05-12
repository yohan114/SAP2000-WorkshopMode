import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound, apiValidationError } from '@/lib/api-utils';
import { z } from 'zod';

// Schema for updating a service interval
const updateServiceIntervalSchema = z.object({
  name: z.string().min(1).optional(),
  intervalValue: z.number().positive().optional(),
  unit: z.enum(['KM', 'HOURS']).optional(),
  description: z.string().nullable().optional(),
});

// GET /api/service-intervals/[id] - Get a single interval
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const interval = await db.serviceInterval.findUnique({
      where: { id },
    });

    if (!interval || !interval.isActive) {
      return apiNotFound('Service interval');
    }

    return apiSuccess(interval);
  } catch (error) {
    console.error('Get service interval error:', error);
    return apiError('Failed to fetch service interval', 500);
  }
}

// PUT /api/service-intervals/[id] - Update a service interval
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = updateServiceIntervalSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;

    const existing = await db.serviceInterval.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      return apiNotFound('Service interval');
    }

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.intervalValue !== undefined) updateData.intervalValue = data.intervalValue;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.description !== undefined) updateData.description = data.description;

    const interval = await db.serviceInterval.update({
      where: { id },
      data: updateData,
    });

    return apiSuccess(interval, 'Service interval updated successfully');
  } catch (error) {
    console.error('Update service interval error:', error);
    return apiError('Failed to update service interval', 500);
  }
}

// DELETE /api/service-intervals/[id] - Soft delete a service interval
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.serviceInterval.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      return apiNotFound('Service interval');
    }

    await db.serviceInterval.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return apiSuccess({ id }, 'Service interval deleted successfully');
  } catch (error) {
    console.error('Delete service interval error:', error);
    return apiError('Failed to delete service interval', 500);
  }
}
