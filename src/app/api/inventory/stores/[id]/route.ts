import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import { z } from 'zod';

// Validation schema for updating a store
const updateStoreSchema = z.object({
  code: z.string().min(1, 'Store code is required').optional(),
  name: z.string().min(1, 'Store name is required').optional(),
  storeType: z.enum(['MAIN', 'SITE', 'CONSUMABLE', 'FUEL']).optional(),
  location: z.string().optional().nullable(),
  managerId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/inventory/stores/[id] - Get a single store by ID with related data
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const store = await db.store.findUnique({
      where: { id },
      include: {
        stock: {
          where: { isActive: true },
          include: {
            item: {
              select: {
                id: true,
                itemCode: true,
                name: true,
                unitOfMeasure: true,
                itemClass: true,
                isCritical: true,
              },
            },
          },
          orderBy: { item: { name: 'asc' } },
        },
        stockTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            item: {
              select: {
                id: true,
                itemCode: true,
                name: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        counterLocks: {
          where: { isActive: true },
          orderBy: { lockedAt: 'desc' },
        },
        materialIssues: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            miNumber: true,
            status: true,
            createdAt: true,
            issuedTo: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        grnHeaders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            grnNumber: true,
            status: true,
            createdAt: true,
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        reservations: {
          where: { status: 'ACTIVE' },
          include: {
            item: {
              select: {
                id: true,
                itemCode: true,
                name: true,
              },
            },
            mrLine: {
              select: {
                id: true,
                materialRequest: {
                  select: {
                    id: true,
                    mrNumber: true,
                  },
                },
              },
            },
          },
        },
        stockTakes: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            stockTakeNumber: true,
            status: true,
            createdAt: true,
          },
        },
        stockAdjustments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            adjustmentNumber: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            stock: { where: { isActive: true } },
            stockTransactions: true,
            counterLocks: { where: { isActive: true } },
            materialIssues: true,
            grnHeaders: true,
            reservations: { where: { status: 'ACTIVE' } },
            stockTakes: true,
            stockAdjustments: true,
          },
        },
      },
    });

    if (!store) {
      return apiNotFound('Store');
    }

    // Calculate stock summary
    const totalStockValue = store.stock.reduce(
      (sum, s) => sum + Number(s.availableQty) * Number(s.wac),
      0
    );

    const totalReservedQty = store.stock.reduce(
      (sum, s) => sum + Number(s.reservedQty),
      0
    );

    const totalQuarantineQty = store.stock.reduce(
      (sum, s) => sum + Number(s.quarantineQty),
      0
    );

    // Transform the response
    const response = {
      ...store,
      stock: store.stock.map((s) => ({
        ...s,
        availableQty: Number(s.availableQty),
        reservedQty: Number(s.reservedQty),
        quarantineQty: Number(s.quarantineQty),
        wac: Number(s.wac),
        stockValue: Number(s.availableQty) * Number(s.wac),
      })),
      stockTransactions: store.stockTransactions.map((t) => ({
        ...t,
        quantity: Number(t.quantity),
        unitCost: Number(t.unitCost),
        totalValue: Number(t.totalValue),
      })),
      reservations: store.reservations.map((r) => ({
        ...r,
        reservedQty: Number(r.reservedQty),
        wacAtReservation: Number(r.wacAtReservation),
      })),
      summary: {
        totalStockValue,
        totalReservedQty,
        totalQuarantineQty,
        uniqueItemCount: store.stock.length,
        activeReservations: store.reservations.length,
      },
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('Get store error:', error);
    return apiError('Failed to fetch store', 500);
  }
}

// PUT /api/inventory/stores/[id] - Update a store
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const result = updateStoreSchema.safeParse(body);
    if (!result.success) {
      return apiError(result.error.issues[0]?.message || 'Invalid input', 400);
    }

    const data = result.data;

    // Check if store exists
    const existingStore = await db.store.findUnique({
      where: { id },
    });

    if (!existingStore) {
      return apiNotFound('Store');
    }

    // If code is being updated, check for duplicates
    if (data.code && data.code !== existingStore.code) {
      const duplicateCode = await db.store.findUnique({
        where: { code: data.code },
      });

      if (duplicateCode) {
        return apiError('Store code already exists', 400);
      }
    }

    // Build update data object, filtering out undefined values
    const updateData: Record<string, unknown> = {};

    if (data.code !== undefined) updateData.code = data.code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.storeType !== undefined) updateData.storeType = data.storeType;
    if (data.location !== undefined) updateData.location = data.location || null;
    if (data.managerId !== undefined) updateData.managerId = data.managerId || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Update store
    const store = await db.store.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            stock: { where: { isActive: true } },
            materialIssues: true,
            grnHeaders: true,
          },
        },
      },
    });

    return apiSuccess(store, 'Store updated successfully');
  } catch (error) {
    console.error('Update store error:', error);
    return apiError('Failed to update store', 500);
  }
}

// DELETE /api/inventory/stores/[id] - Soft delete a store (check for related records first)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if store exists
    const existingStore = await db.store.findUnique({
      where: { id },
    });

    if (!existingStore) {
      return apiNotFound('Store');
    }

    // Check if store is already inactive
    if (!existingStore.isActive) {
      return apiError('Store is already inactive', 400);
    }

    // Check for related records that would prevent deactivation
    const [
      activeStockCount,
      pendingMaterialIssuesCount,
      pendingGrnCount,
      activeReservationsCount,
      activeCounterLocksCount,
      pendingStockTakesCount,
      pendingStockAdjustmentsCount,
    ] = await Promise.all([
      // Active stock with quantity
      db.storeStock.count({
        where: {
          storeId: id,
          isActive: true,
          OR: [
            { availableQty: { gt: 0 } },
            { reservedQty: { gt: 0 } },
            { quarantineQty: { gt: 0 } },
          ],
        },
      }),
      // Pending material issues
      db.materialIssue.count({
        where: {
          storeId: id,
          status: { in: ['DRAFT', 'PENDING', 'ISSUED'] },
        },
      }),
      // Pending GRNs
      db.grnHeader.count({
        where: {
          storeId: id,
          status: { in: ['DRAFT', 'PENDING'] },
        },
      }),
      // Active reservations
      db.stockReservation.count({
        where: {
          storeId: id,
          status: 'ACTIVE',
        },
      }),
      // Active counter locks
      db.storeCounterLock.count({
        where: {
          storeId: id,
          isActive: true,
        },
      }),
      // Pending stock takes
      db.stockTakeHeader.count({
        where: {
          storeId: id,
          status: { in: ['DRAFT', 'IN_PROGRESS'] },
        },
      }),
      // Pending stock adjustments
      db.stockAdjustment.count({
        where: {
          storeId: id,
          status: { in: ['DRAFT', 'PENDING'] },
        },
      }),
    ]);

    // Build list of blocking issues
    const blockingIssues: string[] = [];

    if (activeStockCount > 0) {
      blockingIssues.push(`${activeStockCount} item(s) with stock`);
    }
    if (activeReservationsCount > 0) {
      blockingIssues.push(`${activeReservationsCount} active reservation(s)`);
    }
    if (activeCounterLocksCount > 0) {
      blockingIssues.push(`${activeCounterLocksCount} active counter lock(s)`);
    }
    if (pendingMaterialIssuesCount > 0) {
      blockingIssues.push(`${pendingMaterialIssuesCount} pending material issue(s)`);
    }
    if (pendingGrnCount > 0) {
      blockingIssues.push(`${pendingGrnCount} pending GRN(s)`);
    }
    if (pendingStockTakesCount > 0) {
      blockingIssues.push(`${pendingStockTakesCount} pending stock take(s)`);
    }
    if (pendingStockAdjustmentsCount > 0) {
      blockingIssues.push(`${pendingStockAdjustmentsCount} pending stock adjustment(s)`);
    }

    // If there are blocking issues, return error with details
    if (blockingIssues.length > 0) {
      return apiError(
        `Cannot delete store. The following issues must be resolved first: ${blockingIssues.join(', ')}`,
        400
      );
    }

    // Soft delete by setting isActive to false
    await db.store.update({
      where: { id },
      data: { isActive: false },
    });

    return apiSuccess(null, 'Store deactivated successfully');
  } catch (error) {
    console.error('Delete store error:', error);
    return apiError('Failed to delete store', 500);
  }
}
