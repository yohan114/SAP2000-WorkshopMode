import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiError, 
  apiNotFound, 
  handleApiError,
  requirePrivilege,
} from '@/lib/api-utils';
import { z } from 'zod';

// Schema for updating an item
const updateItemSchema = z.object({
  itemCode: z.string().min(1, 'Item code is required').optional(),
  name: z.string().min(1, 'Item name is required').optional(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required').optional(),
  itemClass: z.enum(['SPARE_PART', 'CONSUMABLE', 'LUBRICANT', 'TOOL']).optional(),
  minimumStock: z.number().min(0).optional().nullable(),
  maximumStock: z.number().min(0).optional().nullable(),
  reorderLevel: z.number().min(0).optional().nullable(),
  reorderQuantity: z.number().min(0).optional().nullable(),
  maxIssueLimit: z.number().min(0).optional().nullable(),
  isTool: z.boolean().optional(),
  isCritical: z.boolean().optional(),
  forceHoChannel: z.boolean().optional(),
  highValueThreshold: z.number().min(0).optional().nullable(),
});

// GET /api/items/[id] - Get single item with related data
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePrivilege('ITEM_VIEW');
    
    const { id } = await params;

    const item = await db.item.findUnique({
      where: { id },
      include: {
        stock: {
          include: {
            store: {
              select: {
                id: true,
                code: true,
                name: true,
                storeType: true,
                location: true,
              },
            },
          },
        },
        mrLines: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            lineNumber: true,
            requestedQty: true,
            approvedQty: true,
            issuedQty: true,
            status: true,
            createdAt: true,
            materialRequest: {
              select: {
                id: true,
                mrNumber: true,
                status: true,
                priority: true,
              },
            },
          },
        },
        miLines: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            issuedQty: true,
            unitCost: true,
            totalCost: true,
            serialNumber: true,
            batchNumber: true,
            createdAt: true,
            materialIssue: {
              select: {
                id: true,
                miNumber: true,
                status: true,
                issuedAt: true,
              },
            },
          },
        },
        stockTransactions: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            transactionType: true,
            quantity: true,
            unitCost: true,
            totalValue: true,
            referenceType: true,
            referenceId: true,
            notes: true,
            createdAt: true,
            store: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        reservations: {
          where: { status: 'ACTIVE' },
          include: {
            store: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            mrLine: {
              include: {
                materialRequest: {
                  select: {
                    id: true,
                    mrNumber: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
        assetSpecificity: {
          include: {
            asset: {
              select: {
                id: true,
                assetNumber: true,
                name: true,
                status: true,
              },
            },
          },
        },
        toolLoans: {
          where: { loanStatus: { in: ['ACTIVE', 'OVERDUE'] } },
          take: 10,
          orderBy: { issuedAt: 'desc' },
          include: {
            jobCard: {
              select: {
                id: true,
                jobCardNumber: true,
                status: true,
              },
            },
          },
        },
        stockTakeLines: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            systemQty: true,
            countedQty: true,
            variance: true,
            createdAt: true,
            stockTake: {
              select: {
                id: true,
                stockTakeNumber: true,
                status: true,
              },
            },
          },
        },
        adjustmentLines: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            adjustmentType: true,
            quantity: true,
            unitCost: true,
            totalValue: true,
            reason: true,
            createdAt: true,
            adjustment: {
              select: {
                id: true,
                adjustmentNumber: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            stock: true,
            mrLines: true,
            miLines: true,
            stockTransactions: true,
            reservations: true,
            assetSpecificity: true,
            toolLoans: true,
            stockTakeLines: true,
            adjustmentLines: true,
          },
        },
      },
    });

    if (!item || !item.isActive) {
      return apiNotFound('Item');
    }

    // Calculate summary statistics
    const totalAvailableStock = item.stock.reduce(
      (sum, s) => sum + s.availableQty.toNumber(),
      0
    );
    const totalReservedStock = item.stock.reduce(
      (sum, s) => sum + s.reservedQty.toNumber(),
      0
    );
    const totalQuarantineStock = item.stock.reduce(
      (sum, s) => sum + s.quarantineQty.toNumber(),
      0
    );
    const avgWac = item.stock.length > 0
      ? item.stock.reduce((sum, s) => sum + s.wac.toNumber(), 0) / item.stock.length
      : 0;

    // Check stock status
    const minimumStock = item.minimumStock?.toNumber() ?? 0;
    const reorderLevel = item.reorderLevel?.toNumber() ?? 0;
    let stockStatus = 'NORMAL';
    if (totalAvailableStock <= minimumStock && minimumStock > 0) {
      stockStatus = 'CRITICAL';
    } else if (totalAvailableStock <= reorderLevel && reorderLevel > 0) {
      stockStatus = 'LOW';
    }

    // Transform the response
    const response = {
      ...item,
      minimumStock: item.minimumStock?.toNumber() ?? null,
      maximumStock: item.maximumStock?.toNumber() ?? null,
      reorderLevel: item.reorderLevel?.toNumber() ?? null,
      reorderQuantity: item.reorderQuantity?.toNumber() ?? null,
      maxIssueLimit: item.maxIssueLimit?.toNumber() ?? null,
      highValueThreshold: item.highValueThreshold?.toNumber() ?? null,
      stock: item.stock.map(s => ({
        ...s,
        availableQty: s.availableQty.toNumber(),
        reservedQty: s.reservedQty.toNumber(),
        quarantineQty: s.quarantineQty.toNumber(),
        wac: s.wac.toNumber(),
      })),
      mrLines: item.mrLines.map(l => ({
        ...l,
        requestedQty: l.requestedQty.toNumber(),
        approvedQty: l.approvedQty?.toNumber() ?? null,
        issuedQty: l.issuedQty?.toNumber() ?? null,
      })),
      miLines: item.miLines.map(l => ({
        ...l,
        issuedQty: l.issuedQty.toNumber(),
        unitCost: l.unitCost.toNumber(),
        totalCost: l.totalCost.toNumber(),
      })),
      stockTransactions: item.stockTransactions.map(t => ({
        ...t,
        quantity: t.quantity.toNumber(),
        unitCost: t.unitCost.toNumber(),
        totalValue: t.totalValue.toNumber(),
      })),
      reservations: item.reservations.map(r => ({
        ...r,
        reservedQty: r.reservedQty.toNumber(),
        wacAtReservation: r.wacAtReservation.toNumber(),
      })),
      stockTakeLines: item.stockTakeLines.map(l => ({
        ...l,
        systemQty: l.systemQty.toNumber(),
        countedQty: l.countedQty?.toNumber() ?? null,
        variance: l.variance?.toNumber() ?? null,
      })),
      adjustmentLines: item.adjustmentLines.map(l => ({
        ...l,
        quantity: l.quantity.toNumber(),
        unitCost: l.unitCost?.toNumber() ?? null,
        totalValue: l.totalValue?.toNumber() ?? null,
      })),
      summary: {
        totalAvailableStock,
        totalReservedStock,
        totalQuarantineStock,
        avgWac,
        stockStatus,
        activeReservations: item.reservations.length,
        activeToolLoans: item.toolLoans.filter(t => t.loanStatus === 'ACTIVE' || t.loanStatus === 'OVERDUE').length,
      },
    };

    return apiSuccess(response);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/items/[id] - Update an item
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePrivilege('ITEM_EDIT');
    
    const { id } = await params;
    const body = await request.json();

    const result = updateItemSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const data = result.data;

    // Check if item exists
    const existing = await db.item.findUnique({ where: { id } });
    if (!existing || !existing.isActive) {
      return apiNotFound('Item');
    }

    // If itemCode is being changed, check for duplicates
    if (data.itemCode && data.itemCode !== existing.itemCode) {
      const duplicate = await db.item.findUnique({
        where: { itemCode: data.itemCode },
      });
      if (duplicate) {
        return apiError('Item with this code already exists', 400);
      }
    }

    // Build update data object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.itemCode !== undefined) updateData.itemCode = data.itemCode;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.unitOfMeasure !== undefined) updateData.unitOfMeasure = data.unitOfMeasure;
    if (data.itemClass !== undefined) updateData.itemClass = data.itemClass;
    if (data.minimumStock !== undefined) updateData.minimumStock = data.minimumStock ?? 0;
    if (data.maximumStock !== undefined) updateData.maximumStock = data.maximumStock;
    if (data.reorderLevel !== undefined) updateData.reorderLevel = data.reorderLevel;
    if (data.reorderQuantity !== undefined) updateData.reorderQuantity = data.reorderQuantity;
    if (data.maxIssueLimit !== undefined) updateData.maxIssueLimit = data.maxIssueLimit;
    if (data.isTool !== undefined) updateData.isTool = data.isTool;
    if (data.isCritical !== undefined) updateData.isCritical = data.isCritical;
    if (data.forceHoChannel !== undefined) updateData.forceHoChannel = data.forceHoChannel;
    if (data.highValueThreshold !== undefined) updateData.highValueThreshold = data.highValueThreshold;

    // Update the item
    const item = await db.item.update({
      where: { id },
      data: updateData,
      include: {
        stock: {
          include: {
            store: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Transform the response
    const response = {
      ...item,
      minimumStock: item.minimumStock?.toNumber() ?? null,
      maximumStock: item.maximumStock?.toNumber() ?? null,
      reorderLevel: item.reorderLevel?.toNumber() ?? null,
      reorderQuantity: item.reorderQuantity?.toNumber() ?? null,
      maxIssueLimit: item.maxIssueLimit?.toNumber() ?? null,
      highValueThreshold: item.highValueThreshold?.toNumber() ?? null,
      stock: item.stock.map(s => ({
        ...s,
        availableQty: s.availableQty.toNumber(),
        reservedQty: s.reservedQty.toNumber(),
        quarantineQty: s.quarantineQty.toNumber(),
        wac: s.wac.toNumber(),
      })),
    };

    return apiSuccess(response, 'Item updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/items/[id] - Soft delete an item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePrivilege('ITEM_DELETE');
    
    const { id } = await params;

    // Check if item exists
    const existing = await db.item.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stock: true,
            mrLines: true,
            miLines: true,
            reservations: { where: { status: 'ACTIVE' } },
            toolLoans: { where: { loanStatus: { in: ['ACTIVE', 'OVERDUE'] } } },
          },
        },
      },
    });

    if (!existing || !existing.isActive) {
      return apiNotFound('Item');
    }

    // Check for active reservations
    if (existing._count.reservations > 0) {
      return apiError(
        'Cannot delete item with active reservations',
        400,
        'Please release or complete all reservations before deleting this item.'
      );
    }

    // Check for active tool loans
    if (existing._count.toolLoans > 0) {
      return apiError(
        'Cannot delete item with active tool loans',
        400,
        'Please ensure all tool loans are returned before deleting this item.'
      );
    }

    // Check for available stock
    const stockWithAvailability = await db.storeStock.findFirst({
      where: {
        itemId: id,
        availableQty: { gt: 0 },
      },
    });

    if (stockWithAvailability) {
      return apiError(
        'Cannot delete item with available stock',
        400,
        'Please deplete or transfer all stock before deleting this item.'
      );
    }

    // Check for pending material request lines
    const pendingMrLines = await db.mrLine.count({
      where: {
        itemId: id,
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    if (pendingMrLines > 0) {
      return apiError(
        'Cannot delete item with pending material requests',
        400,
        'Please complete or cancel all pending material requests for this item.'
      );
    }

    // Soft delete the item
    await db.item.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return apiSuccess(null, 'Item deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
