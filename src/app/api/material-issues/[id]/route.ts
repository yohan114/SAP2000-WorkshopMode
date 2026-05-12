import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound, apiValidationError } from '@/lib/api-utils';
import { z } from 'zod';

// Material Issue status enum
const MiStatus = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PARTIALLY_RETURNED: 'PARTIALLY_RETURNED',
  RETURNED: 'RETURNED',
  CANCELLED: 'CANCELLED',
} as const;

// Schema for updating material issue
const updateMaterialIssueSchema = z.object({
  mrId: z.string().optional().nullable(),
  storeId: z.string().optional(),
  issuedToId: z.string().optional(),
  jobCardId: z.string().optional().nullable(),
  issueType: z.enum(['STANDARD', 'EMERGENCY', 'RETURN']).optional(),
  counterNumber: z.number().int().optional().nullable(),
  notes: z.string().optional(),
  // For updating lines
  lines: z.array(z.object({
    id: z.string().optional(), // If provided, update existing line
    itemId: z.string(),
    issuedQty: z.number().positive(),
    unitCost: z.number().min(0).optional(),
    serialNumber: z.string().optional().nullable(),
    batchNumber: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })).optional(),
});

// GET /api/material-issues/[id] - Get single material issue with all relations
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const materialIssue = await db.materialIssue.findUnique({
      where: { id },
      include: {
        materialRequest: {
          select: {
            id: true,
            mrNumber: true,
            status: true,
            priority: true,
            requestType: true,
            requestor: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        store: {
          select: {
            id: true,
            code: true,
            name: true,
            storeType: true,
            location: true,
          },
        },
        issuedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            employeeId: true,
          },
        },
        verifier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        jobCard: {
          select: {
            id: true,
            jobCardNumber: true,
            status: true,
            priority: true,
            jobType: true,
            faultDescription: true,
            asset: {
              select: {
                id: true,
                assetNumber: true,
                name: true,
              },
            },
          },
        },
        lines: {
          include: {
            item: {
              select: {
                id: true,
                itemCode: true,
                name: true,
                unitOfMeasure: true,
                itemClass: true,
              },
            },
            mrLine: {
              select: {
                id: true,
                lineNumber: true,
                requestedQty: true,
                approvedQty: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        returns: {
          select: {
            id: true,
            returnNumber: true,
            returnType: true,
            status: true,
            createdAt: true,
            _count: {
              select: { lines: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        stockTransactions: {
          select: {
            id: true,
            transactionType: true,
            quantity: true,
            unitCost: true,
            totalValue: true,
            createdAt: true,
            item: {
              select: { itemCode: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!materialIssue || !materialIssue.isActive) {
      return apiNotFound('Material issue');
    }

    // Calculate computed fields
    const totalLines = materialIssue.lines.length;
    const totalIssuedQty = materialIssue.lines.reduce(
      (sum, line) => sum + Number(line.issuedQty),
      0
    );
    const totalCost = materialIssue.lines.reduce(
      (sum, line) => sum + Number(line.totalCost),
      0
    );

    // Group lines by item class
    const linesByClass = materialIssue.lines.reduce((acc, line) => {
      const itemClass = line.item.itemClass;
      if (!acc[itemClass]) {
        acc[itemClass] = { lines: [], totalCost: 0, totalQty: 0 };
      }
      acc[itemClass].lines.push(line);
      acc[itemClass].totalCost += Number(line.totalCost);
      acc[itemClass].totalQty += Number(line.issuedQty);
      return acc;
    }, {} as Record<string, { lines: typeof materialIssue.lines; totalCost: number; totalQty: number }>);

    // Return summary of returns
    const returnsSummary = {
      total: materialIssue.returns.length,
      pending: materialIssue.returns.filter(r => r.status === 'DRAFT').length,
      processed: materialIssue.returns.filter(r => r.status === 'PROCESSED').length,
      totalLines: materialIssue.returns.reduce((sum, r) => sum + r._count.lines, 0),
    };

    // Transform for JSON serialization
    const result = {
      ...materialIssue,
      totalValue: Number(materialIssue.totalValue),
      lines: materialIssue.lines.map(line => ({
        ...line,
        issuedQty: Number(line.issuedQty),
        unitCost: Number(line.unitCost),
        totalCost: Number(line.totalCost),
        mrLine: line.mrLine ? {
          ...line.mrLine,
          requestedQty: Number(line.mrLine.requestedQty),
          approvedQty: line.mrLine.approvedQty ? Number(line.mrLine.approvedQty) : null,
        } : null,
      })),
      stockTransactions: materialIssue.stockTransactions.map(tx => ({
        ...tx,
        quantity: Number(tx.quantity),
        unitCost: Number(tx.unitCost),
        totalValue: Number(tx.totalValue),
      })),
      // Computed fields
      computed: {
        totalLines,
        totalIssuedQty,
        totalCost,
        linesByClass: Object.entries(linesByClass).map(([itemClass, data]: [string, any]) => ({
          itemClass,
          lineCount: data.lines.length,
          totalCost: data.totalCost,
          totalQty: data.totalQty,
        })),
        returnsSummary,
        isReturnable: ['ISSUED', 'PARTIALLY_RETURNED'].includes(materialIssue.status),
        isVerified: !!materialIssue.verifiedAt,
      },
    };

    return apiSuccess(result);
  } catch (error) {
    console.error('Get material issue error:', error);
    return apiError('Failed to fetch material issue', 500);
  }
}

// PUT /api/material-issues/[id] - Update material issue (only if status is DRAFT)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = updateMaterialIssueSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;

    // Check if material issue exists and is active
    const existing = await db.materialIssue.findUnique({
      where: { id },
      include: {
        lines: true,
      },
    });

    if (!existing || !existing.isActive) {
      return apiNotFound('Material issue');
    }

    // Only allow updates if status is DRAFT
    if (existing.status !== MiStatus.DRAFT) {
      return apiError(
        'Cannot update material issue. Only DRAFT status material issues can be modified.',
        400
      );
    }

    // Verify store exists if being changed
    if (data.storeId && data.storeId !== existing.storeId) {
      const store = await db.store.findUnique({
        where: { id: data.storeId },
      });
      if (!store || !store.isActive) {
        return apiError('Store not found or inactive', 400);
      }
    }

    // Verify user exists if being changed
    if (data.issuedToId && data.issuedToId !== existing.issuedToId) {
      const user = await db.user.findUnique({
        where: { id: data.issuedToId },
      });
      if (!user || !user.isActive) {
        return apiError('User not found or inactive', 400);
      }
    }

    // Verify job card exists if being changed
    if (data.jobCardId !== undefined && data.jobCardId !== existing.jobCardId) {
      if (data.jobCardId) {
        const jobCard = await db.jobCard.findUnique({
          where: { id: data.jobCardId },
        });
        if (!jobCard || !jobCard.isActive) {
          return apiError('Job card not found or inactive', 400);
        }
      }
    }

    // Verify material request exists if being changed
    if (data.mrId !== undefined && data.mrId !== existing.mrId) {
      if (data.mrId) {
        const mr = await db.materialRequest.findUnique({
          where: { id: data.mrId },
        });
        if (!mr || !mr.isActive) {
          return apiError('Material request not found or inactive', 400);
        }
      }
    }

    // Use transaction for atomic update
    const updatedMI = await db.$transaction(async (tx) => {
      // Prepare update data
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (data.mrId !== undefined) updateData.mrId = data.mrId;
      if (data.storeId !== undefined) updateData.storeId = data.storeId;
      if (data.issuedToId !== undefined) updateData.issuedToId = data.issuedToId;
      if (data.jobCardId !== undefined) updateData.jobCardId = data.jobCardId;
      if (data.issueType !== undefined) updateData.issueType = data.issueType;
      if (data.counterNumber !== undefined) updateData.counterNumber = data.counterNumber;

      // Handle lines update
      if (data.lines && data.lines.length > 0) {
        // Get stock info for unit cost calculation
        const storeId = data.storeId || existing.storeId;
        
        // Calculate line data with unit costs
        const linesData = await Promise.all(
          data.lines.map(async (line) => {
            const stock = await tx.storeStock.findFirst({
              where: { storeId, itemId: line.itemId },
            });
            
            const unitCost = line.unitCost ?? stock?.wac?.toNumber() ?? existing.lines.find(l => l.itemId === line.itemId)?.unitCost.toNumber() ?? 0;
            const totalCost = unitCost * line.issuedQty;

            return {
              id: line.id,
              itemId: line.itemId,
              issuedQty: line.issuedQty,
              unitCost,
              totalCost,
              serialNumber: line.serialNumber,
              batchNumber: line.batchNumber,
              notes: line.notes,
            };
          })
        );

        // Delete existing lines not in the update
        const existingLineIds = existing.lines.map(l => l.id);
        const updateLineIds = linesData.filter(l => l.id).map(l => l.id);
        const linesToDelete = existingLineIds.filter(id => !updateLineIds.includes(id));

        if (linesToDelete.length > 0) {
          await tx.miLine.deleteMany({
            where: { id: { in: linesToDelete } },
          });
        }

        // Update or create lines
        for (const lineData of linesData) {
          if (lineData.id) {
            // Update existing line
            await tx.miLine.update({
              where: { id: lineData.id },
              data: {
                itemId: lineData.itemId,
                issuedQty: lineData.issuedQty,
                unitCost: lineData.unitCost,
                totalCost: lineData.totalCost,
                serialNumber: lineData.serialNumber,
                batchNumber: lineData.batchNumber,
                notes: lineData.notes,
              },
            });
          } else {
            // Create new line
            await tx.miLine.create({
              data: {
                miId: id,
                itemId: lineData.itemId,
                issuedQty: lineData.issuedQty,
                unitCost: lineData.unitCost,
                totalCost: lineData.totalCost,
                serialNumber: lineData.serialNumber,
                batchNumber: lineData.batchNumber,
                notes: lineData.notes,
              },
            });
          }
        }

        // Calculate total value
        const totalValue = linesData.reduce((sum, line) => sum + line.totalCost, 0);
        updateData.totalValue = totalValue;
      }

      // Update material issue
      return tx.materialIssue.update({
        where: { id },
        data: updateData,
        include: {
          store: {
            select: { id: true, code: true, name: true },
          },
          issuedTo: {
            select: { id: true, name: true, email: true },
          },
          jobCard: {
            select: { id: true, jobCardNumber: true, status: true },
          },
          materialRequest: {
            select: { id: true, mrNumber: true },
          },
          lines: {
            include: {
              item: {
                select: { id: true, itemCode: true, name: true, unitOfMeasure: true },
              },
            },
          },
        },
      });
    });

    // Transform for response
    const response = {
      ...updatedMI,
      totalValue: Number(updatedMI.totalValue),
      lines: updatedMI.lines.map(line => ({
        ...line,
        issuedQty: Number(line.issuedQty),
        unitCost: Number(line.unitCost),
        totalCost: Number(line.totalCost),
      })),
    };

    return apiSuccess(response, 'Material issue updated successfully');
  } catch (error) {
    console.error('Update material issue error:', error);
    return apiError('Failed to update material issue', 500);
  }
}

// DELETE /api/material-issues/[id] - Soft delete (set isActive = false, only if status is DRAFT)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if material issue exists
    const existing = await db.materialIssue.findUnique({
      where: { id },
      include: {
        _count: {
          select: { returns: true },
        },
      },
    });

    if (!existing || !existing.isActive) {
      return apiNotFound('Material issue');
    }

    // Only allow deletion for DRAFT status
    if (existing.status !== MiStatus.DRAFT) {
      return apiError(
        'Cannot delete material issue. Only DRAFT status material issues can be deleted.',
        400
      );
    }

    // Check for associated returns
    if (existing._count.returns > 0) {
      return apiError(
        'Cannot delete material issue with associated returns. Please remove returns first.',
        400
      );
    }

    // Soft delete - set isActive to false
    await db.materialIssue.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return apiSuccess({ id }, 'Material issue deleted successfully');
  } catch (error) {
    console.error('Delete material issue error:', error);
    return apiError('Failed to delete material issue', 500);
  }
}
