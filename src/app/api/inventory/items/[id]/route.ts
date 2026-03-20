import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiError, 
  apiNotFound, 
  handleApiError, 
  requirePrivilege 
} from '@/lib/api-utils';
import { z } from 'zod';

// Schema for updating item
const updateItemSchema = z.object({
  itemCode: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  unitOfMeasure: z.string().min(1).optional(),
  itemClass: z.enum(['CONSUMABLE', 'SPARE_PART', 'LUBRICANT', 'TOOL', 'SAFETY']).optional(),
  minimumStock: z.number().min(0).optional(),
  maximumStock: z.number().optional(),
  reorderLevel: z.number().optional(),
  reorderQuantity: z.number().optional(),
  maxIssueLimit: z.number().optional(),
  isTool: z.boolean().optional(),
  isCritical: z.boolean().optional(),
  forceHoChannel: z.boolean().optional(),
  highValueThreshold: z.number().optional(),
});

// GET /api/inventory/items/[id] - Get single item (requires INVENTORY_VIEW)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePrivilege('INVENTORY_VIEW');
    
    const { id } = await params;

    const item = await db.item.findUnique({
      where: { id },
      include: {
        stock: {
          include: {
            store: { 
              select: { id: true, code: true, name: true, location: true } 
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
                status: true 
              },
            },
          },
        },
        _count: {
          select: { 
            mrLines: true,
            miLines: true,
            stockTransactions: true,
            reservations: true,
          },
        },
      },
    });

    if (!item || !item.isActive) {
      return apiNotFound('Item');
    }

    // Calculate aggregated stock data
    const totalStock = item.stock.reduce((sum, s) => sum + Number(s.availableQty), 0);
    const totalReserved = item.stock.reduce((sum, s) => sum + Number(s.reservedQty), 0);
    const totalQuarantine = item.stock.reduce((sum, s) => sum + Number(s.quarantineQty), 0);
    const avgWac = item.stock.length > 0
      ? item.stock.reduce((sum, s) => sum + Number(s.wac), 0) / item.stock.length
      : 0;
    const totalValue = item.stock.reduce((sum, s) => {
      const qty = Number(s.availableQty) + Number(s.reservedQty) + Number(s.quarantineQty);
      return sum + (qty * Number(s.wac));
    }, 0);

    // Get recent transactions
    const recentTransactions = await db.stockTransaction.findMany({
      where: { itemId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
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
          select: { id: true, code: true, name: true },
        },
      },
    });

    // Get active reservations
    const activeReservations = await db.stockReservation.findMany({
      where: { 
        itemId: id,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        reservedQty: true,
        wacAtReservation: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        store: {
          select: { id: true, code: true, name: true },
        },
        mrLine: {
          select: {
            id: true,
            lineNumber: true,
            materialRequest: {
              select: { 
                id: true, 
                mrNumber: true, 
                status: true 
              },
            },
          },
        },
      },
    });

    // Get tool loan tracking if this is a tool
    let toolLoans: unknown[] = [];
    if (item.isTool) {
      toolLoans = await db.toolLoanTracking.findMany({
        where: { toolId: id },
        orderBy: { issuedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          loanStatus: true,
          issuedAt: true,
          dueDate: true,
          returnedAt: true,
          returnedCondition: true,
          overdueAlerts: true,
          notes: true,
        },
      });
    }

    return apiSuccess({
      id: item.id,
      itemCode: item.itemCode,
      name: item.name,
      description: item.description,
      categoryId: item.categoryId,
      unitOfMeasure: item.unitOfMeasure,
      itemClass: item.itemClass,
      minimumStock: Number(item.minimumStock),
      maximumStock: item.maximumStock ? Number(item.maximumStock) : null,
      reorderLevel: item.reorderLevel ? Number(item.reorderLevel) : null,
      reorderQuantity: item.reorderQuantity ? Number(item.reorderQuantity) : null,
      maxIssueLimit: item.maxIssueLimit ? Number(item.maxIssueLimit) : null,
      isTool: item.isTool,
      isCritical: item.isCritical,
      forceHoChannel: item.forceHoChannel,
      highValueThreshold: item.highValueThreshold ? Number(item.highValueThreshold) : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      // Aggregated data
      totalStock,
      totalReserved,
      totalQuarantine,
      avgWac,
      totalValue,
      isLowStock: totalStock <= Number(item.minimumStock),
      // Related data
      stockByStore: item.stock.map(s => ({
        id: s.id,
        store: s.store,
        availableQty: Number(s.availableQty),
        reservedQty: Number(s.reservedQty),
        quarantineQty: Number(s.quarantineQty),
        wac: Number(s.wac),
        lastMovementAt: s.lastMovementAt,
      })),
      assetSpecificity: item.assetSpecificity,
      recentTransactions,
      activeReservations,
      toolLoans,
      _count: item._count,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/inventory/items/[id] - Update item (requires INVENTORY_EDIT)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePrivilege('INVENTORY_EDIT');
    
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
      const duplicateCode = await db.item.findUnique({
        where: { itemCode: data.itemCode },
      });
      if (duplicateCode) {
        return apiError('Item code already exists', 400);
      }
    }

    // Update item
    const item = await db.item.update({
      where: { id },
      data: {
        itemCode: data.itemCode,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        unitOfMeasure: data.unitOfMeasure,
        itemClass: data.itemClass,
        minimumStock: data.minimumStock,
        maximumStock: data.maximumStock,
        reorderLevel: data.reorderLevel,
        reorderQuantity: data.reorderQuantity,
        maxIssueLimit: data.maxIssueLimit,
        isTool: data.isTool,
        isCritical: data.isCritical,
        forceHoChannel: data.forceHoChannel,
        highValueThreshold: data.highValueThreshold,
        updatedAt: new Date(),
      },
      include: {
        stock: {
          include: {
            store: { 
              select: { id: true, code: true, name: true } 
            },
          },
        },
      },
    });

    // Calculate aggregated data for response
    const totalStock = item.stock.reduce((sum, s) => sum + Number(s.availableQty), 0);
    const totalReserved = item.stock.reduce((sum, s) => sum + Number(s.reservedQty), 0);
    const avgWac = item.stock.length > 0
      ? item.stock.reduce((sum, s) => sum + Number(s.wac), 0) / item.stock.length
      : 0;

    return apiSuccess({
      id: item.id,
      itemCode: item.itemCode,
      name: item.name,
      description: item.description,
      categoryId: item.categoryId,
      unitOfMeasure: item.unitOfMeasure,
      itemClass: item.itemClass,
      minimumStock: Number(item.minimumStock),
      maximumStock: item.maximumStock ? Number(item.maximumStock) : null,
      reorderLevel: item.reorderLevel ? Number(item.reorderLevel) : null,
      reorderQuantity: item.reorderQuantity ? Number(item.reorderQuantity) : null,
      maxIssueLimit: item.maxIssueLimit ? Number(item.maxIssueLimit) : null,
      isTool: item.isTool,
      isCritical: item.isCritical,
      forceHoChannel: item.forceHoChannel,
      highValueThreshold: item.highValueThreshold ? Number(item.highValueThreshold) : null,
      totalStock,
      totalReserved,
      avgWac,
      isLowStock: totalStock <= Number(item.minimumStock),
      stockByStore: item.stock.map(s => ({
        store: s.store,
        availableQty: Number(s.availableQty),
        reservedQty: Number(s.reservedQty),
        wac: Number(s.wac),
      })),
    }, 'Item updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/inventory/items/[id] - Soft delete item (requires INVENTORY_DELETE)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePrivilege('INVENTORY_DELETE');
    
    const { id } = await params;

    // Check if item exists
    const existing = await db.item.findUnique({ 
      where: { id },
      include: {
        stock: true,
        _count: {
          select: { 
            reservations: { 
              where: { status: 'ACTIVE' } 
            } 
          },
        },
      },
    });
    
    if (!existing || !existing.isActive) {
      return apiNotFound('Item');
    }

    // Check for active stock
    const hasActiveStock = existing.stock.some(
      s => Number(s.availableQty) > 0 || Number(s.reservedQty) > 0
    );
    
    if (hasActiveStock) {
      return apiError('Cannot delete item with active stock. Please transfer or adjust stock first.', 400);
    }

    // Check for active reservations
    if (existing._count.reservations > 0) {
      return apiError('Cannot delete item with active reservations', 400);
    }

    // Check for active tool loans if this is a tool
    if (existing.isTool) {
      const activeLoans = await db.toolLoanTracking.count({
        where: {
          toolId: id,
          loanStatus: 'ACTIVE',
        },
      });
      
      if (activeLoans > 0) {
        return apiError('Cannot delete tool with active loans', 400);
      }
    }

    // Soft delete by setting isActive to false
    // Note: The Item model doesn't have a deletedAt field according to schema,
    // so we only set isActive to false
    await db.item.update({
      where: { id },
      data: { 
        isActive: false,
      },
    });

    return apiSuccess(null, 'Item deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
