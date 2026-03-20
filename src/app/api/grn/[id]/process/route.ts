import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const processGRNSchema = z.object({
  postedBy: z.string().min(1),
  notes: z.string().optional(),
});

// POST - Process/Post GRN (update stock, create transactions, convert budget commitments)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = processGRNSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { postedBy, notes } = result.data;

    // Get GRN with lines
    const grn = await db.grnHeader.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } },
          },
        },
        store: { select: { id: true, code: true, name: true } },
        supplier: { select: { id: true, supplierCode: true, name: true } },
        purchaseOrder: {
          include: {
            lines: true,
            budgetLine: true,
          },
        },
      },
    });

    if (!grn) {
      return apiError('GRN not found', 404);
    }

    if (grn.status !== 'DRAFT') {
      return apiError('Only draft GRNs can be processed', 400);
    }

    // Process in transaction
    const result_data = await db.$transaction(async (tx) => {
      const transactions = [];
      let totalGRNValue = 0;

      // Process each line
      for (const line of grn.lines) {
        const acceptedQty = line.acceptedQty.toNumber();
        if (acceptedQty <= 0) continue;

        const unitCost = line.unitCost.toNumber();
        const totalValue = unitCost * acceptedQty;
        totalGRNValue += totalValue;

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
            notes: `GRN: ${grn.grnNumber} from ${grn.supplier.name}${notes ? ` - ${notes}` : ''}`,
          },
        });

        transactions.push(transaction);

        // Update PO line received quantity
        if (grn.purchaseOrder) {
          const poLine = grn.purchaseOrder.lines.find(
            (l: { itemId: string }) => l.itemId === line.itemId
          );
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
        where: { id },
        data: {
          status: 'POSTED',
          postedAt: new Date(),
          postedBy,
        },
      });

      // Update PO status
      let poStatusChanged = false;
      if (grn.purchaseOrder) {
        const allLines = await tx.poLine.findMany({
          where: { poId: grn.poId! },
        });

        const allReceived = allLines.every(
          (l: { status: string }) => l.status === 'RECEIVED'
        );
        const someReceived = allLines.some(
          (l: { receivedQty: { toNumber: () => number } }) => (l.receivedQty?.toNumber() || 0) > 0
        );

        let newPOStatus = grn.purchaseOrder.status;
        if (allReceived) {
          newPOStatus = 'RECEIVED';
        } else if (someReceived) {
          newPOStatus = 'PARTIALLY_RECEIVED';
        }

        if (newPOStatus !== grn.purchaseOrder.status) {
          await tx.purchaseOrder.update({
            where: { id: grn.poId! },
            data: { status: newPOStatus },
          });
          poStatusChanged = true;
        }

        // Convert budget commitment to actual if PO has budget line
        if (grn.purchaseOrder.budgetLineId && grn.purchaseOrder.commitmentCreated) {
          const budgetLineId = grn.purchaseOrder.budgetLineId;

          // Find the original commitment
          const commitment = await tx.budgetTransaction.findFirst({
            where: {
              budgetLineId,
              referenceType: 'PO',
              referenceId: grn.poId!,
              transactionType: 'COMMITMENT',
            },
          });

          if (commitment) {
            const committedAmount = Number(commitment.amount);
            const actualAmount = totalGRNValue;
            const variance = committedAmount - actualAmount;

            // Get current budget line state
            const budgetLine = await tx.budgetLine.findUnique({
              where: { id: budgetLineId },
            });

            if (budgetLine) {
              const currentCommitted = Number(budgetLine.committedAmount);
              const currentActual = Number(budgetLine.actualAmount);
              const revisedAmount = budgetLine.revisedAmount
                ? Number(budgetLine.revisedAmount)
                : Number(budgetLine.originalAmount);

              // Create actual transaction
              await tx.budgetTransaction.create({
                data: {
                  budgetLineId,
                  transactionType: 'ACTUAL',
                  amount: new Decimal(actualAmount),
                  referenceType: 'GRN',
                  referenceId: id,
                  description: `GRN ${grn.grnNumber} - Actual expense${variance !== 0 ? ` (Variance: ${variance >= 0 ? '+' : ''}${variance.toLocaleString()})` : ''}`,
                },
              });

              // If there's variance, create adjustment transaction
              if (Math.abs(variance) > 0.01) {
                await tx.budgetTransaction.create({
                  data: {
                    budgetLineId,
                    transactionType: variance > 0 ? 'RELEASE' : 'ADJUSTMENT',
                    amount: new Decimal(Math.abs(variance)),
                    referenceType: 'GRN',
                    referenceId: id,
                    description: `Variance adjustment for GRN ${grn.grnNumber} - ${variance > 0 ? 'Under budget' : 'Over budget'}`,
                  },
                });
              }

              // Update budget line - reduce commitment, increase actual
              const newCommitted = currentCommitted - committedAmount;
              const newActual = currentActual + actualAmount;
              const newAvailable = revisedAmount - newCommitted - newActual;

              await tx.budgetLine.update({
                where: { id: budgetLineId },
                data: {
                  committedAmount: new Decimal(Math.max(0, newCommitted)),
                  actualAmount: new Decimal(newActual),
                  availableAmount: new Decimal(newAvailable),
                },
              });
            }
          }
        }
      }

      return { grn: updatedGRN, transactions, totalGRNValue, poStatusChanged };
    });

    // Build response message
    let message = 'GRN processed successfully';
    if (grn.purchaseOrder?.budgetLine) {
      message = `GRN processed successfully. Budget commitment converted to actual expense of ${result_data.totalGRNValue.toLocaleString()} for ${grn.purchaseOrder.budgetLine.code}`;
    }

    return apiSuccess({
      id: result_data.grn.id,
      grnNumber: grn.grnNumber,
      status: result_data.grn.status,
      transactionsProcessed: result_data.transactions.length,
      totalValue: result_data.totalGRNValue,
      budgetConverted: !!grn.purchaseOrder?.budgetLineId,
      budgetLine: grn.purchaseOrder?.budgetLine,
    }, message);
  } catch (error) {
    console.error('Process GRN error:', error);
    return apiError('Failed to process GRN', 500);
  }
}

// GET - Get GRN details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const grn = await db.grnHeader.findUnique({
      where: { id },
      include: {
        supplier: { select: { id: true, supplierCode: true, name: true } },
        store: { select: { id: true, code: true, name: true } },
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
            status: true,
            budgetLineId: true,
            commitmentCreated: true,
            budgetLine: { select: { id: true, code: true, name: true } },
          },
        },
        creator: { select: { id: true, name: true } },
        verifier: { select: { id: true, name: true } },
        lines: {
          include: {
            item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } },
          },
        },
      },
    });

    if (!grn) {
      return apiError('GRN not found', 404);
    }

    // Get budget transactions for this GRN
    const budgetTransactions = grn.purchaseOrder?.budgetLineId
      ? await db.budgetTransaction.findMany({
          where: {
            budgetLineId: grn.purchaseOrder.budgetLineId,
            referenceId: id,
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    return apiSuccess({
      id: grn.id,
      grnNumber: grn.grnNumber,
      po: grn.purchaseOrder,
      supplier: grn.supplier,
      store: grn.store,
      status: grn.status,
      deliveryNoteNo: grn.deliveryNoteNo,
      deliveryDate: grn.deliveryDate,
      totalValue: grn.totalValue.toNumber(),
      notes: grn.notes,
      createdBy: grn.creator,
      verifiedBy: grn.verifier,
      verifiedAt: grn.verifiedAt,
      postedAt: grn.postedAt,
      lines: grn.lines.map(l => ({
        id: l.id,
        item: l.item,
        receivedQty: l.receivedQty.toNumber(),
        acceptedQty: l.acceptedQty.toNumber(),
        rejectedQty: l.rejectedQty.toNumber(),
        rejectionReason: l.rejectionReason,
        unitCost: l.unitCost.toNumber(),
        totalCost: l.totalCost.toNumber(),
        batchNumber: l.batchNumber,
        expiryDate: l.expiryDate,
      })),
      budgetTransactions: budgetTransactions.map(t => ({
        id: t.id,
        type: t.transactionType,
        amount: Number(t.amount),
        description: t.description,
        createdAt: t.createdAt,
      })),
      createdAt: grn.createdAt,
    });
  } catch (error) {
    console.error('Get GRN error:', error);
    return apiError('Failed to fetch GRN', 500);
  }
}
