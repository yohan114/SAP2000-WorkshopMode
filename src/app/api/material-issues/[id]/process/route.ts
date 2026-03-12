import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

const processIssueSchema = z.object({
  issuedBy: z.string().min(1),
  notes: z.string().optional(),
});

// POST - Process/Issue the material issue (update stock, create transactions)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const result = processIssueSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.errors[0]?.message);
    }

    const { issuedBy, notes } = result.data;

    // Get the material issue with lines
    const mi = await db.materialIssue.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } },
          },
        },
        store: { select: { id: true, code: true, name: true } },
        issuedTo: { select: { id: true, name: true } },
        materialRequest: {
          include: {
            lines: true,
          },
        },
      },
    });

    if (!mi) {
      return apiError('Material issue not found', 404);
    }

    if (mi.status !== 'DRAFT') {
      return apiError('Only draft material issues can be processed', 400);
    }

    // Check stock availability for all items
    const stockChecks = await Promise.all(
      mi.lines.map(async (line) => {
        const stock = await db.storeStock.findUnique({
          where: {
            storeId_itemId: { storeId: mi.storeId, itemId: line.itemId },
          },
        });
        return {
          line,
          stock,
          hasStock: stock && stock.availableQty.toNumber() >= line.issuedQty.toNumber(),
        };
      })
    );

    const insufficientStock = stockChecks.filter(sc => !sc.hasStock);
    if (insufficientStock.length > 0) {
      const items = insufficientStock.map(sc => 
        `${sc.line.item.name} (available: ${sc.stock?.availableQty.toNumber() || 0}, needed: ${sc.line.issuedQty.toNumber()})`
      ).join(', ');
      return apiError(`Insufficient stock for: ${items}`, 400);
    }

    // Process the issue in a transaction
    const results = await db.$transaction(async (tx) => {
      const transactions = [];
      
      // Process each line
      for (const { line, stock } of stockChecks) {
        if (!stock) continue;

        const unitCost = line.unitCost.toNumber();
        const quantity = line.issuedQty.toNumber();
        const totalValue = unitCost * quantity;
        const newQty = stock.availableQty.toNumber() - quantity;

        // Update stock
        await tx.storeStock.update({
          where: { id: stock.id },
          data: {
            availableQty: newQty,
            lastMovementAt: new Date(),
          },
        });

        // Create stock transaction
        const transaction = await tx.stockTransaction.create({
          data: {
            storeId: mi.storeId,
            itemId: line.itemId,
            transactionType: 'ISSUE',
            quantity: -quantity,
            unitCost,
            totalValue: -totalValue,
            referenceType: 'MATERIAL_ISSUE',
            referenceId: mi.id,
            miId: mi.id,
            performedBy: issuedBy,
            notes: `MI: ${mi.miNumber}${notes ? ` - ${notes}` : ''}`,
          },
        });

        transactions.push(transaction);

        // Update MR line if linked to MR
        if (mi.mrId && mi.materialRequest) {
          const mrLine = mi.materialRequest.lines.find(
            (l: { itemId: string }) => l.itemId === line.itemId
          );
          if (mrLine) {
            const currentIssued = mrLine.issuedQty?.toNumber() || 0;
            const newIssued = currentIssued + quantity;
            const approved = mrLine.approvedQty?.toNumber() || 0;

            await tx.mrLine.update({
              where: { id: mrLine.id },
              data: {
                issuedQty: newIssued,
                status: newIssued >= approved ? 'ISSUED' : 'PARTIALLY_ISSUED',
              },
            });
          }
        }
      }

      // Update MI status
      const updatedMI = await tx.materialIssue.update({
        where: { id },
        data: {
          status: 'ISSUED',
          issuedAt: new Date(),
          issuedBy: issuedBy,
        },
        include: {
          store: true,
          issuedTo: true,
          lines: { include: { item: true } },
        },
      });

      // Update MR status if linked
      if (mi.mrId && mi.materialRequest) {
        const mrLines = await tx.mrLine.findMany({
          where: { mrId: mi.mrId },
        });
        
        const allIssued = mrLines.every(
          (l: { status: string }) => l.status === 'ISSUED'
        );
        const someIssued = mrLines.some(
          (l: { issuedQty: { toNumber: () => number } }) => (l.issuedQty?.toNumber() || 0) > 0
        );

        let newMRStatus = mi.materialRequest.status;
        if (allIssued) {
          newMRStatus = 'FULFILLED';
        } else if (someIssued) {
          newMRStatus = 'PARTIALLY_ISSUED';
        }

        if (newMRStatus !== mi.materialRequest.status) {
          await tx.materialRequest.update({
            where: { id: mi.mrId },
            data: { status: newMRStatus },
          });
        }
      }

      return { mi: updatedMI, transactions };
    });

    return apiSuccess({
      materialIssue: {
        id: results.mi.id,
        miNumber: results.mi.miNumber,
        status: results.mi.status,
        issuedAt: results.mi.issuedAt,
      },
      transactionsProcessed: results.transactions.length,
    }, 'Material issue processed successfully');
  } catch (error) {
    console.error('Process material issue error:', error);
    return apiError('Failed to process material issue', 500);
  }
}
