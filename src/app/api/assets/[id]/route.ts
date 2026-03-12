import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import { z } from 'zod';

// Schema for updating asset
const updateAssetSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  yearOfManufacture: z.number().int().optional(),
  acquisitionDate: z.string().optional(),
  acquisitionCost: z.number().optional(),
  currentLocation: z.string().optional(),
  status: z.enum(['OPERATIONAL', 'UNDER_REPAIR', 'OUT_OF_SERVICE', 'DISPOSED']).optional(),
  criticality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  warrantyExpiry: z.string().optional(),
});

// GET /api/assets/[id] - Get single asset
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const asset = await db.asset.findUnique({
      where: { id },
      include: {
        category: true,
        qrCodes: {
          where: { isActive: true },
        },
        meters: {
          where: { isActive: true },
          include: {
            readings: {
              orderBy: { readingAt: 'desc' },
              take: 10,
            },
          },
        },
        assetSpecificity: {
          include: {
            item: {
              select: { id: true, itemCode: true, name: true },
            },
          },
        },
        _count: {
          select: { 
            jobCards: true,
            pmSchedules: true,
          },
        },
      },
    });

    if (!asset || !asset.isActive) {
      return apiNotFound('Asset');
    }

    // Get recent job cards
    const recentJobCards = await db.jobCard.findMany({
      where: { assetId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        jobCardNumber: true,
        jobType: true,
        status: true,
        priority: true,
        createdAt: true,
        actualEnd: true,
      },
    });

    // Get PM schedules
    const pmSchedules = await db.pmSchedule.findMany({
      where: { assetId: id, isActive: true },
      orderBy: { nextExecutionAt: 'asc' },
    });

    return apiSuccess({
      ...asset,
      recentJobCards,
      pmSchedules,
    });
  } catch (error) {
    console.error('Get asset error:', error);
    return apiError('Failed to fetch asset', 500);
  }
}

// PUT /api/assets/[id] - Update asset
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = updateAssetSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.errors[0]?.message);
    }

    const data = result.data;

    // Check if asset exists
    const existing = await db.asset.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      return apiNotFound('Asset');
    }

    // Update asset
    const asset = await db.asset.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        make: data.make,
        model: data.model,
        serialNumber: data.serialNumber,
        yearOfManufacture: data.yearOfManufacture,
        acquisitionDate: data.acquisitionDate ? new Date(data.acquisitionDate) : undefined,
        acquisitionCost: data.acquisitionCost,
        currentLocation: data.currentLocation,
        status: data.status,
        criticality: data.criticality,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
        updatedAt: new Date(),
      },
      include: {
        category: true,
      },
    });

    return apiSuccess(asset, 'Asset updated successfully');
  } catch (error) {
    console.error('Update asset error:', error);
    return apiError('Failed to update asset', 500);
  }
}

// DELETE /api/assets/[id] - Soft delete asset
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if asset exists
    const existing = await db.asset.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      return apiNotFound('Asset');
    }

    // Check for active job cards
    const activeJobCards = await db.jobCard.count({
      where: {
        assetId: id,
        status: { in: ['DRAFT', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD'] },
      },
    });

    if (activeJobCards > 0) {
      return apiError('Cannot delete asset with active job cards', 400);
    }

    // Soft delete
    await db.asset.update({
      where: { id },
      data: { 
        isActive: false,
        deletedAt: new Date(),
      },
    });

    return apiSuccess(null, 'Asset deleted successfully');
  } catch (error) {
    console.error('Delete asset error:', error);
    return apiError('Failed to delete asset', 500);
  }
}
