import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import { z } from 'zod';

/**
 * @openapi
 * /api/material-requests/{id}:
 *   get:
 *     tags:
 *       - Material Requests
 *     summary: Get a single material request by ID
 *     description: Retrieve a material request with all related data including lines, requestor, approvals, state transitions, and material issues.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Material request ID
 *     responses:
 *       200:
 *         description: Material request details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/MaterialRequest'
 *                 - type: object
 *                   properties:
 *                     jobCard:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         jobCardNumber:
 *                           type: string
 *                         asset:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                     requestor:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                     approver:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                     lines:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           lineNumber:
 *                             type: integer
 *                           item:
 *                             type: object
 *                           requestedQty:
 *                             type: number
 *                           approvedQty:
 *                             type: number
 *                           issuedQty:
 *                             type: number
 *                           unitCost:
 *                             type: number
 *                           status:
 *                             type: string
 *                           availableStock:
 *                             type: number
 *                     stateTransitions:
 *                       type: array
 *                       items:
 *                         type: object
 *                     approvals:
 *                       type: array
 *                       items:
 *                         type: object
 *                     materialIssues:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Material request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     tags:
 *       - Material Requests
 *     summary: Update a material request
 *     description: Update a material request. Only allowed when status is DRAFT.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Material request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requestType:
 *                 type: string
 *                 enum: [JC_LINKED, STOCK_REQUEST, EMERGENCY]
 *               priority:
 *                 type: string
 *                 enum: [LOW, NORMAL, HIGH, CRITICAL, EMERGENCY]
 *               requiredBy:
 *                 type: string
 *                 format: date-time
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Material request updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MaterialRequest'
 *       400:
 *         description: Validation error or cannot update in current status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Material request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     tags:
 *       - Material Requests
 *     summary: Delete a material request
 *     description: Soft delete a material request by setting isActive to false. Only allowed when status is DRAFT.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Material request ID
 *     responses:
 *       200:
 *         description: Material request deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Cannot delete material request in current status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Material request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// Schema for updating material request
const updateMRSchema = z.object({
  requestType: z.enum(['JC_LINKED', 'STOCK_REQUEST', 'EMERGENCY']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL', 'EMERGENCY']).optional(),
  requiredBy: z.string().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
});

// GET /api/material-requests/[id] - Get single material request with full details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const materialRequest = await db.materialRequest.findUnique({
      where: { id },
      include: {
        jobCard: {
          select: {
            id: true,
            jobCardNumber: true,
            jobType: true,
            status: true,
            priority: true,
            asset: {
              select: {
                id: true,
                name: true,
                assetNumber: true,
              },
            },
          },
        },
        requestor: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
            department: true,
          },
        },
        lines: {
          orderBy: { lineNumber: 'asc' },
          include: {
            item: {
              select: {
                id: true,
                itemCode: true,
                name: true,
                unitOfMeasure: true,
                isCritical: true,
                itemClass: true,
              },
            },
            reservations: {
              where: { status: 'ACTIVE' },
              select: {
                id: true,
                reservedQty: true,
                store: {
                  select: { id: true, name: true, code: true },
                },
              },
            },
            issueLines: {
              select: {
                id: true,
                issuedQty: true,
                materialIssue: {
                  select: {
                    id: true,
                    miNumber: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
        stateTransitions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            fromState: true,
            toState: true,
            transitionType: true,
            reason: true,
            createdAt: true,
          },
        },
        approvals: {
          orderBy: { approvalLevel: 'asc' },
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        materialIssues: {
          select: {
            id: true,
            miNumber: true,
            status: true,
            issuedAt: true,
            store: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    if (!materialRequest || !materialRequest.isActive) {
      return apiNotFound('Material request');
    }

    // Get stock info for all items in the MR lines
    const itemIds = materialRequest.lines.map(l => l.itemId);
    const stockInfo = await db.storeStock.findMany({
      where: { itemId: { in: itemIds } },
      select: {
        itemId: true,
        storeId: true,
        availableQty: true,
        reservedQty: true,
        wac: true,
        store: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    // Create a map for quick stock lookup
    const stockMap = new Map(
      stockInfo.map(s => [`${s.storeId}-${s.itemId}`, s])
    );

    // Get approver info if exists
    let approver: any = null;
    if (materialRequest.approvedBy) {
      approver = await db.user.findUnique({
        where: { id: materialRequest.approvedBy },
        select: { id: true, name: true, email: true },
      });
    }

    // Transform lines with stock info
    const transformedLines = materialRequest.lines.map(line => {
      // Find stock info for this item (from any store)
      const stockData = stockInfo.filter(s => s.itemId === line.itemId);
      const totalAvailable = stockData.reduce(
        (sum, s) => sum + (s.availableQty?.toNumber() || 0),
        0
      );

      return {
        id: line.id,
        lineNumber: line.lineNumber,
        item: line.item,
        requestedQty: line.requestedQty,
        approvedQty: line.approvedQty,
        issuedQty: line.issuedQty,
        unitCost: line.unitCost,
        wacAtApproval: line.wacAtApproval,
        status: line.status,
        notes: line.notes,
        availableStock: totalAvailable,
        stockByStore: stockData.map(s => ({
          store: s.store,
          availableQty: s.availableQty?.toNumber() || 0,
          reservedQty: s.reservedQty?.toNumber() || 0,
          wac: s.wac?.toNumber() || 0,
        })),
        reservations: line.reservations,
        issueLines: line.issueLines,
      };
    });

    // Calculate totals
    const totalRequested = materialRequest.lines.reduce(
      (sum, line) => sum + line.requestedQty.toNumber(),
      0
    );
    const totalApproved = materialRequest.lines.reduce(
      (sum, line) => sum + (line.approvedQty?.toNumber() || 0),
      0
    );
    const totalIssued = materialRequest.lines.reduce(
      (sum, line) => sum + (line.issuedQty?.toNumber() || 0),
      0
    );

    return apiSuccess({
      id: materialRequest.id,
      mrNumber: materialRequest.mrNumber,
      jobCardId: materialRequest.jobCardId,
      jobCard: materialRequest.jobCard,
      requestorId: materialRequest.requestorId,
      requestor: materialRequest.requestor,
      requestType: materialRequest.requestType,
      priority: materialRequest.priority,
      status: materialRequest.status,
      requiredBy: materialRequest.requiredBy,
      approvedAt: materialRequest.approvedAt,
      approvedBy: materialRequest.approvedBy,
      approver,
      rejectionReason: materialRequest.rejectionReason,
      fulfilledAt: materialRequest.fulfilledAt,
      closedAt: materialRequest.closedAt,
      isActive: materialRequest.isActive,
      createdAt: materialRequest.createdAt,
      updatedAt: materialRequest.updatedAt,
      createdBy: materialRequest.createdBy,
      updatedBy: materialRequest.updatedBy,
      lines: transformedLines,
      stateTransitions: materialRequest.stateTransitions,
      approvals: materialRequest.approvals,
      materialIssues: materialRequest.materialIssues,
      summary: {
        lineCount: materialRequest.lines.length,
        totalRequested,
        totalApproved,
        totalIssued,
        fulfillmentRate: totalRequested > 0 ? (totalIssued / totalRequested) * 100 : 0,
      },
    });
  } catch (error) {
    console.error('Get material request error:', error);
    return apiError('Failed to fetch material request', 500);
  }
}

// PUT /api/material-requests/[id] - Update material request
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = updateMRSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const data = result.data;

    // Check if material request exists and is active
    const existing = await db.materialRequest.findUnique({
      where: { id },
      select: { id: true, status: true, isActive: true },
    });

    if (!existing || !existing.isActive) {
      return apiNotFound('Material request');
    }

    // Only allow updates if in DRAFT status
    if (existing.status !== 'DRAFT') {
      return apiError(
        'Cannot update material request in current status. Only DRAFT status can be modified.',
        400
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.requestType !== undefined) {
      updateData.requestType = data.requestType;
    }
    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }
    if (data.requiredBy !== undefined) {
      updateData.requiredBy = data.requiredBy ? new Date(data.requiredBy) : null;
    }
    if (data.rejectionReason !== undefined) {
      updateData.rejectionReason = data.rejectionReason;
    }

    // Update material request
    const materialRequest = await db.materialRequest.update({
      where: { id },
      data: updateData,
      include: {
        jobCard: {
          select: {
            id: true,
            jobCardNumber: true,
            asset: { select: { id: true, name: true } },
          },
        },
        requestor: {
          select: { id: true, name: true, email: true },
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

    return apiSuccess(materialRequest, 'Material request updated successfully');
  } catch (error) {
    console.error('Update material request error:', error);
    return apiError('Failed to update material request', 500);
  }
}

// DELETE /api/material-requests/[id] - Soft delete material request
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if material request exists and is active
    const existing = await db.materialRequest.findUnique({
      where: { id },
      select: {
        id: true,
        mrNumber: true,
        status: true,
        isActive: true,
        lines: {
          select: { id: true },
        },
      },
    });

    if (!existing || !existing.isActive) {
      return apiNotFound('Material request');
    }

    // Only allow delete if in DRAFT status
    if (existing.status !== 'DRAFT') {
      return apiError(
        'Cannot delete material request in current status. Only DRAFT status can be deleted.',
        400
      );
    }

    // Soft delete by setting isActive to false and setting deletedAt
    await db.materialRequest.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return apiSuccess(
      { id, mrNumber: existing.mrNumber },
      'Material request deleted successfully'
    );
  } catch (error) {
    console.error('Delete material request error:', error);
    return apiError('Failed to delete material request', 500);
  }
}
