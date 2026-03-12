import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

// Valid state transitions for GRN
const validTransitions: Record<string, string[]> = {
  'DRAFT': ['VERIFIED', 'CANCELLED'],
  'VERIFIED': ['POSTED', 'DRAFT'],
  'POSTED': [],
  'CANCELLED': [],
};

const transitionSchema = z.object({
  toStatus: z.string(),
  actorId: z.string(),
  comments: z.string().optional(),
});

// POST - Transition GRN to new status
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const result = transitionSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.errors[0]?.message);
    }

    const { toStatus, actorId, comments } = result.data;

    // Get current GRN
    const grn = await db.grnHeader.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!grn) {
      return apiError('GRN not found', 404);
    }

    const fromStatus = grn.status;

    // Validate transition
    if (!validTransitions[fromStatus]?.includes(toStatus)) {
      return apiError(
        `Invalid transition from ${fromStatus} to ${toStatus}`,
        400,
        `Valid transitions: ${validTransitions[fromStatus]?.join(', ') || 'none'}`
      );
    }

    // Update data based on transition
    const updateData: Record<string, unknown> = {
      status: toStatus,
    };

    if (toStatus === 'VERIFIED') {
      updateData.verifiedBy = actorId;
      updateData.verifiedAt = new Date();
    }

    if (toStatus === 'CANCELLED') {
      updateData.isActive = false;
    }

    // If posting, process stock updates
    if (toStatus === 'POSTED') {
      return await processGRNPosting(grn, actorId, comments);
    }

    const updatedGRN = await db.grnHeader.update({
      where: { id },
      data: updateData,
      include: {
        supplier: { select: { id: true, supplierCode: true, name: true } },
        store: { select: { id: true, code: true, name: true } },
      },
    });

    return apiSuccess({
      id: updatedGRN.id,
      grnNumber: updatedGRN.grnNumber,
      status: updatedGRN.status,
    }, 'GRN status updated successfully');
  } catch (error) {
    console.error('GRN transition error:', error);
    return apiError('Failed to transition GRN', 500);
  }
}

// Process GRN posting with stock updates
async function processGRNPosting(grn: { id: string; grnNumber: string; storeId: string; supplierId: string; poId: string | null; lines: { id: string; itemId: string; receivedQty: { toNumber: () => number }; acceptedQty: { toNumber: () => number }; rejectedQty: { toNumber: () => number }; unitCost: { toNumber: () => number }; totalCost: { toNumber: () => number } }[] }, postedBy: string, notes?: string) {
  // Get PO lines for reference
  let poLines: { id: string; itemId: string | null; orderedQty: { toNumber: () => number }; receivedQty: { toNumber: () => number }; status: string }[] = [];
  if (grn.poId) {
    const po = await db.purchaseOrder.findUnique({
      where: { id: grn.poId },
      include: { lines: true },
    });
    poLines = po?.lines || [];
  }

  const result = await db.$transaction(async (tx) => {
    const transactions = [];
    
    // Process each line
    for (const line of grn.lines) {
      const acceptedQty = line.acceptedQty.toNumber();
      if (acceptedQty <= 0) continue;

      const unitCost = line.unitCost.toNumber();
      const totalValue = line.totalCost.toNumber();

      // Check if stock record exists
      let stock = await tx.storeStock.findFirst({
        where: {
          storeId: grn.storeId,
          itemId: line.itemId,
        },
      });

      if (stock) {
        // Update existing stock - calculate new WAC
        const currentQty = stock.availableQty.toNumber();
        const currentWac = stock.wac.toNumber();
        const currentValue = currentQty * currentWac;
        const newValue = currentValue + totalValue;
        const newQty = currentQty + acceptedQty;
        const newWac = newQty > 0 ? newValue / newQty : currentWac;

        await tx.storeStock.update({
          where: { id: stock.id },
          data: {
            availableQty: newQty,
            wac: newWac,
            lastMovementAt: new Date(),
          },
        });
      } else {
        // Create new stock record
        stock = await tx.storeStock.create({
          data: {
            storeId: grn.storeId,
            itemId: line.itemId,
            availableQty: acceptedQty,
            reservedQty: 0,
            quarantineQty: line.rejectedQty.toNumber(),
            wac: unitCost,
          },
        });
      }

      // Create stock transaction
      const supplier = await tx.supplier.findUnique({
        where: { id: grn.supplierId },
      });

      const transaction = await tx.stockTransaction.create({
        data: {
          storeId: grn.storeId,
          itemId: line.itemId,
          transactionType: 'RECEIPT',
          quantity: acceptedQty,
          unitCost,
          totalValue,
          referenceType: 'GRN',
          referenceId: grn.id,
          performedBy: postedBy,
          notes: `GRN: ${grn.grnNumber} from ${supplier?.name || 'Unknown'}${notes ? ` - ${notes}` : ''}`,
        },
      });

      transactions.push(transaction);

      // Update PO line received quantity
      if (grn.poId && poLines.length > 0) {
        const poLine = poLines.find(l => l.itemId === line.itemId);
        if (poLine) {
          const currentReceived = poLine.receivedQty?.toNumber() || 0;
          const newReceived = currentReceived + acceptedQty;
          
          await tx.poLine.update({
            where: { id: poLine.id },
            data: {
              receivedQty: newReceived,
              status: newReceived >= poLine.orderedQty.toNumber() ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
            },
          });
        }
      }
    }

    // Update GRN status
    const updatedGRN = await tx.grnHeader.update({
      where: { id: grn.id },
      data: {
        status: 'POSTED',
        postedAt: new Date(),
        postedBy,
      },
    });

    // Update PO status
    if (grn.poId) {
      const allLines = await tx.poLine.findMany({
        where: { poId: grn.poId },
      });

      const allReceived = allLines.every(
        (l: { status: string }) => l.status === 'RECEIVED'
      );
      const someReceived = allLines.some(
        (l: { receivedQty: { toNumber: () => number } }) => (l.receivedQty?.toNumber() || 0) > 0
      );

      const po = await db.purchaseOrder.findUnique({
        where: { id: grn.poId },
      });

      let newPOStatus = po?.status;
      if (allReceived) {
        newPOStatus = 'RECEIVED';
      } else if (someReceived && po?.status !== 'PARTIALLY_RECEIVED') {
        newPOStatus = 'PARTIALLY_RECEIVED';
      }

      if (newPOStatus && newPOStatus !== po?.status) {
        await tx.purchaseOrder.update({
          where: { id: grn.poId },
          data: { status: newPOStatus },
        });
      }
    }

    return { grn: updatedGRN, transactions };
  });

  return apiSuccess({
    id: result.grn.id,
    grnNumber: grn.grnNumber,
    status: result.grn.status,
    transactionsProcessed: result.transactions.length,
  }, 'GRN posted successfully');
}
