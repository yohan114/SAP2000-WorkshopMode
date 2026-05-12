import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

const addLineSchema = z.object({
  itemId: z.string().min(1),
  requestedQty: z.number().positive(),
  notes: z.string().optional(),
});

const updateLineSchema = z.object({
  lineId: z.string(),
  approvedQty: z.number().min(0).optional(),
  issuedQty: z.number().min(0).optional(),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ISSUED', 'PARTIALLY_ISSUED', 'CANCELLED']).optional(),
});

// GET - Get lines for an MR
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lines = await db.mrLine.findMany({
      where: { mrId: id },
      orderBy: { lineNumber: 'asc' },
      include: {
        item: {
          select: {
            id: true,
            itemCode: true,
            name: true,
            unitOfMeasure: true,
            isCritical: true,
          },
        },
      },
    });

    // Get stock info for each item
    const itemIds = lines.map(l => l.itemId);
    const stockInfo = await db.storeStock.findMany({
      where: { itemId: { in: itemIds } },
      select: {
        itemId: true,
        availableQty: true,
        wac: true,
      },
    });

    const stockMap = new Map((stockInfo as any[]).map(s => [s.itemId, s]));

    return apiSuccess(lines.map(line => ({
      id: line.id,
      lineNumber: line.lineNumber,
      item: line.item,
      requestedQty: line.requestedQty,
      approvedQty: line.approvedQty,
      issuedQty: line.issuedQty,
      unitCost: line.unitCost,
      status: line.status,
      notes: line.notes,
      availableStock: stockMap.get(line.itemId)?.availableQty?.toNumber() || 0,
      wac: stockMap.get(line.itemId)?.wac?.toNumber() || 0,
    })));
  } catch (error) {
    console.error('Get MR lines error:', error);
    return apiError('Failed to fetch lines', 500);
  }
}

// POST - Add a line to MR
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const result = addLineSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { itemId, requestedQty, notes } = result.data;

    // Get MR
    const mr = await db.materialRequest.findUnique({
      where: { id },
    });

    if (!mr) {
      return apiError('Material request not found', 404);
    }

    // Only allow adding lines to DRAFT MR
    if (mr.status !== 'DRAFT') {
      return apiError('Can only add lines to draft material requests', 400);
    }

    // Verify item exists
    const item = await db.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return apiError('Item not found', 404);
    }

    // Get max line number
    const maxLine = await db.mrLine.findFirst({
      where: { mrId: id },
      orderBy: { lineNumber: 'desc' },
      select: { lineNumber: true },
    });

    const lineNumber = (maxLine?.lineNumber || 0) + 1;

    const line = await db.mrLine.create({
      data: {
        mrId: id,
        lineNumber,
        itemId,
        requestedQty,
        notes,
        status: 'PENDING',
      },
      include: {
        item: {
          select: { id: true, itemCode: true, name: true, unitOfMeasure: true },
        },
      },
    });

    return apiSuccess(line, 'Line added successfully', 201);
  } catch (error) {
    console.error('Add MR line error:', error);
    return apiError('Failed to add line', 500);
  }
}

// PATCH - Update a line
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const result = updateLineSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { lineId, approvedQty, issuedQty, notes, status } = result.data;

    // Verify line belongs to this MR
    const line = await db.mrLine.findFirst({
      where: { id: lineId, mrId: id },
    });

    if (!line) {
      return apiError('Line not found', 404);
    }

    const updateData: Record<string, unknown> = {};
    
    if (approvedQty !== undefined) {
      updateData.approvedQty = approvedQty;
    }
    if (issuedQty !== undefined) {
      updateData.issuedQty = issuedQty;
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    if (status !== undefined) {
      updateData.status = status;
    }

    const updatedLine = await db.mrLine.update({
      where: { id: lineId },
      data: updateData,
      include: {
        item: {
          select: { id: true, itemCode: true, name: true, unitOfMeasure: true },
        },
      },
    });

    return apiSuccess(updatedLine, 'Line updated successfully');
  } catch (error) {
    console.error('Update MR line error:', error);
    return apiError('Failed to update line', 500);
  }
}

// DELETE - Remove a line from MR
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const lineId = url.searchParams.get('lineId');

    if (!lineId) {
      return apiError('Line ID is required', 400);
    }

    // Get MR
    const mr = await db.materialRequest.findUnique({
      where: { id },
    });

    if (!mr) {
      return apiError('Material request not found', 404);
    }

    // Only allow removing lines from DRAFT MR
    if (mr.status !== 'DRAFT') {
      return apiError('Can only remove lines from draft material requests', 400);
    }

    await db.mrLine.delete({
      where: { id: lineId },
    });

    return apiSuccess({}, 'Line removed successfully');
  } catch (error) {
    console.error('Delete MR line error:', error);
    return apiError('Failed to remove line', 500);
  }
}
