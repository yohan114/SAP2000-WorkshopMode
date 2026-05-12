import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound, apiValidationError } from '@/lib/api-utils';
import { z } from 'zod';

// Schema for updating a service job
const updateServiceJobSchema = z.object({
  serviceDate: z.string().optional(),
  vehicleNumber: z.string().optional(),
  assetId: z.string().nullable().optional(),
  site: z.string().optional(),
  lastServiceMeter: z.number().optional(),
  currentServiceMeter: z.number().optional(),
  serviceInterval: z.number().optional(),
  intervalId: z.string().nullable().optional(),
  oilQuantity: z.number().nullable().optional(),
  filterUsed: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
  industrialUse: z.string().nullable().optional(),
  minimumCharge: z.number().nullable().optional(),
  totalCharge: z.number().nullable().optional(),
  status: z.string().optional(),
});

// GET /api/service-jobs/[id] - Get a single service job with full relations
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const serviceJob = await db.serviceJob.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            assetNumber: true,
            name: true,
          },
        },
        interval: {
          select: {
            id: true,
            name: true,
            intervalValue: true,
            unit: true,
          },
        },
        manHours: {
          orderBy: { createdAt: 'desc' },
        },
        consumables: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!serviceJob || !serviceJob.isActive) {
      return apiNotFound('Service job');
    }

    return apiSuccess(serviceJob);
  } catch (error) {
    console.error('Get service job error:', error);
    return apiError('Failed to fetch service job', 500);
  }
}

// PUT /api/service-jobs/[id] - Update a service job
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = updateServiceJobSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;

    // Check if service job exists
    const existing = await db.serviceJob.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      return apiNotFound('Service job');
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (data.serviceDate !== undefined) updateData.serviceDate = new Date(data.serviceDate);
    if (data.vehicleNumber !== undefined) updateData.vehicleNumber = data.vehicleNumber;
    if (data.assetId !== undefined) updateData.assetId = data.assetId;
    if (data.site !== undefined) updateData.site = data.site;
    if (data.lastServiceMeter !== undefined) updateData.lastServiceMeter = data.lastServiceMeter;
    if (data.currentServiceMeter !== undefined) updateData.currentServiceMeter = data.currentServiceMeter;
    if (data.serviceInterval !== undefined) updateData.serviceInterval = data.serviceInterval;
    if (data.intervalId !== undefined) updateData.intervalId = data.intervalId;
    if (data.oilQuantity !== undefined) updateData.oilQuantity = data.oilQuantity;
    if (data.filterUsed !== undefined) updateData.filterUsed = data.filterUsed;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;
    if (data.industrialUse !== undefined) updateData.industrialUse = data.industrialUse;
    if (data.minimumCharge !== undefined) updateData.minimumCharge = data.minimumCharge;
    if (data.totalCharge !== undefined) updateData.totalCharge = data.totalCharge;
    if (data.status !== undefined) updateData.status = data.status;

    // Recalculate nextServiceMeter if currentServiceMeter or serviceInterval changes
    const currentMeter = data.currentServiceMeter !== undefined
      ? data.currentServiceMeter
      : Number(existing.currentServiceMeter);
    const interval = data.serviceInterval !== undefined
      ? data.serviceInterval
      : Number(existing.serviceInterval);

    if (data.currentServiceMeter !== undefined || data.serviceInterval !== undefined) {
      updateData.nextServiceMeter = currentMeter + interval;
    }

    const serviceJob = await db.serviceJob.update({
      where: { id },
      data: updateData,
      include: {
        asset: {
          select: {
            id: true,
            assetNumber: true,
            name: true,
          },
        },
        interval: {
          select: {
            id: true,
            name: true,
            intervalValue: true,
            unit: true,
          },
        },
        manHours: true,
        consumables: true,
      },
    });

    return apiSuccess(serviceJob, 'Service job updated successfully');
  } catch (error) {
    console.error('Update service job error:', error);
    return apiError('Failed to update service job', 500);
  }
}

// DELETE /api/service-jobs/[id] - Soft delete a service job
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.serviceJob.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      return apiNotFound('Service job');
    }

    await db.serviceJob.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return apiSuccess({ id }, 'Service job deleted successfully');
  } catch (error) {
    console.error('Delete service job error:', error);
    return apiError('Failed to delete service job', 500);
  }
}
