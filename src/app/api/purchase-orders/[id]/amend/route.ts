import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

const createAmendmentSchema = z.object({
  amendmentType: z.enum([
    'QUANTITY_CHANGE',
    'PRICE_CHANGE',
    'DELIVERY_DATE_CHANGE',
    'TERMS_CHANGE',
    'CANCELLATION',
    'ADDITIONAL_ITEM',
  ]),
  reason: z.string().min(1, 'Reason is required'),
  previousValue: z.string().optional(),
  newValue: z.string().optional(),
  lineChanges: z.array(z.object({
    lineId: z.string(),
    field: z.string(),
    previousValue: z.string(),
    newValue: z.string(),
  })).optional(),
  newLines: z.array(z.object({
    itemId: z.string().optional(),
    description: z.string(),
    orderedQty: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    leadTime: z.number().int().optional(),
    notes: z.string().optional(),
  })).optional(),
  approvedBy: z.string().optional(),
});

// GET - Get amendments for a PO
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const amendments = await db.poAmendment.findMany({
      where: { poId: id },
      orderBy: { amendmentNumber: 'asc' },
    });

    return apiSuccess(amendments.map(a => ({
      id: a.id,
      amendmentNumber: a.amendmentNumber,
      amendmentType: a.amendmentType,
      reason: a.reason,
      previousValue: a.previousValue,
      newValue: a.newValue,
      approvedBy: a.approvedBy,
      approvedAt: a.approvedAt,
      createdAt: a.createdAt,
    })));
  } catch (error) {
    console.error('Get amendments error:', error);
    return apiError('Failed to fetch amendments', 500);
  }
}

// POST - Create amendment for a PO
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = createAmendmentSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const data = result.data;

    // Get the PO
    const po = await db.purchaseOrder.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!po) {
      return apiError('Purchase order not found', 404);
    }

    // Only issued or acknowledged POs can be amended
    if (!['ISSUED', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
      return apiError('PO must be issued to create amendments', 400);
    }

    // Get next amendment number
    const amendmentCount = await db.poAmendment.count({
      where: { poId: id },
    });

    const amendmentNumber = amendmentCount + 1;

    // Process amendment in transaction
    const amendment = await db.$transaction(async (tx) => {
      // Create amendment record
      const newAmendment = await tx.poAmendment.create({
        data: {
          poId: id,
          amendmentNumber,
          amendmentType: data.amendmentType,
          reason: data.reason,
          previousValue: data.previousValue,
          newValue: data.newValue,
          approvedBy: data.approvedBy,
          approvedAt: data.approvedBy ? new Date() : null,
        },
      });

      // Apply line changes if provided
      if (data.lineChanges && data.lineChanges.length > 0) {
        for (const change of data.lineChanges) {
          const line = await tx.poLine.findUnique({
            where: { id: change.lineId },
          });

          if (line) {
            const updateData: Record<string, unknown> = {};

            if (change.field === 'orderedQty') {
              const newQty = parseFloat(change.newValue);
              updateData.orderedQty = newQty;
              updateData.totalPrice = newQty * line.unitPrice.toNumber();
            } else if (change.field === 'unitPrice') {
              const newPrice = parseFloat(change.newValue);
              updateData.unitPrice = newPrice;
              updateData.totalPrice = newPrice * line.orderedQty.toNumber();
            }

            await tx.poLine.update({
              where: { id: change.lineId },
              data: updateData,
            });
          }
        }
      }

      // Add new lines if provided
      if (data.newLines && data.newLines.length > 0) {
        const existingLines = await tx.poLine.count({
          where: { poId: id },
        });

        for (const [index, newLine] of data.newLines.entries()) {
          const totalPrice = newLine.unitPrice * newLine.orderedQty;

          await tx.poLine.create({
            data: {
              poId: id,
              lineNumber: existingLines + index + 1,
              itemId: newLine.itemId,
              description: newLine.description,
              orderedQty: newLine.orderedQty,
              receivedQty: 0,
              unitPrice: newLine.unitPrice,
              totalPrice,
              leadTime: newLine.leadTime,
              notes: newLine.notes,
              status: 'PENDING',
            },
          });
        }
      }

      // Update delivery date if changed
      if (data.amendmentType === 'DELIVERY_DATE_CHANGE' && data.newValue) {
        await tx.purchaseOrder.update({
          where: { id },
          data: {
            expectedDeliveryDate: new Date(data.newValue),
          },
        });
      }

      // Update terms if changed
      if (data.amendmentType === 'TERMS_CHANGE' && data.newValue) {
        await tx.purchaseOrder.update({
          where: { id },
          data: { terms: data.newValue },
        });
      }

      // Recalculate total value
      const allLines = await tx.poLine.findMany({
        where: { poId: id },
      });

      const totalValue = allLines.reduce(
        (sum, l) => sum + l.totalPrice.toNumber(),
        0
      );

      await tx.purchaseOrder.update({
        where: { id },
        data: { totalValue },
      });

      return newAmendment;
    });

    return apiSuccess({
      id: amendment.id,
      amendmentNumber: amendment.amendmentNumber,
      amendmentType: amendment.amendmentType,
      reason: amendment.reason,
    }, 'Amendment created successfully', 201);
  } catch (error) {
    console.error('Create amendment error:', error);
    return apiError('Failed to create amendment', 500);
  }
}
