import { db } from '@/lib/db';
import { apiSuccess, apiError, generateDocumentNumber } from '@/lib/api-utils';
import { z } from 'zod';

const createFromMRSchema = z.object({
  mrId: z.string().min(1),
  storeId: z.string().min(1),
  issuedToId: z.string().min(1),
  issuedBy: z.string().min(1),
  lineSelections: z.array(z.object({
    mrLineId: z.string(),
    issueQty: z.number().positive(),
  })).min(1),
  notes: z.string().optional(),
});

// POST - Create Material Issue from approved Material Request
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const validationResult = createFromMRSchema.safeParse(body);
    if (!validationResult.success) {
      return apiError('Validation failed', 400, validationResult.error.errors[0]?.message);
    }

    const { mrId, storeId, issuedToId, issuedBy, lineSelections, notes } = validationResult.data;

    // Get the MR with lines
    const mr = await db.materialRequest.findUnique({
      where: { id: mrId },
      include: {
        lines: {
          include: {
            item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } },
          },
        },
        jobCard: { select: { id: true, jobCardNumber: true } },
        requestor: { select: { id: true, name: true } },
      },
    });

    if (!mr) {
      return apiError('Material request not found', 404);
    }

    if (!['APPROVED', 'PARTIALLY_ISSUED'].includes(mr.status)) {
      return apiError('Only approved or partially issued MRs can be processed', 400);
    }

    // Verify store
    const store = await db.store.findUnique({
      where: { id: storeId },
    });
    if (!store) {
      return apiError('Store not found', 404);
    }

    // Verify user
    const user = await db.user.findUnique({
      where: { id: issuedToId },
    });
    if (!user) {
      return apiError('User not found', 404);
    }

    // Build lines from selections
    const linesData = [];
    let totalValue = 0;

    for (const selection of lineSelections) {
      const mrLine = mr.lines.find(l => l.id === selection.mrLineId);
      if (!mrLine) {
        return apiError(`MR line not found: ${selection.mrLineId}`, 400);
      }

      // Check if issue qty is valid
      const approvedQty = mrLine.approvedQty?.toNumber() || mrLine.requestedQty.toNumber();
      const alreadyIssued = mrLine.issuedQty?.toNumber() || 0;
      const remainingToIssue = approvedQty - alreadyIssued;

      if (selection.issueQty > remainingToIssue) {
        return apiError(
          `Cannot issue more than remaining quantity for ${mrLine.item?.name}. Remaining: ${remainingToIssue}`,
          400
        );
      }

      // Check stock availability
      const stock = await db.storeStock.findUnique({
        where: { storeId_itemId: { storeId, itemId: mrLine.itemId } },
      });

      if (!stock || stock.availableQty.toNumber() < selection.issueQty) {
        return apiError(
          `Insufficient stock for ${mrLine.item?.name}. Available: ${stock?.availableQty.toNumber() || 0}`,
          400
        );
      }

      const unitCost = stock.wac.toNumber();
      const totalCost = unitCost * selection.issueQty;
      totalValue += totalCost;

      linesData.push({
        mrLineId: mrLine.id,
        itemId: mrLine.itemId,
        issuedQty: selection.issueQty,
        unitCost,
        totalCost,
      });
    }

    // Generate MI number
    const currentMonth = new Date().toISOString().slice(0, 7);
    const count = await db.materialIssue.count({
      where: { createdAt: { gte: new Date(`${currentMonth}-01`) } },
    });
    const miNumber = generateDocumentNumber('MI', count + 1);

    // Create MI and process in transaction
    const result = await db.$transaction(async (tx) => {
      // Create MI
      const mi = await tx.materialIssue.create({
        data: {
          miNumber,
          mrId,
          storeId,
          issuedToId,
          jobCardId: mr.jobCardId,
          issueType: 'STANDARD',
          status: 'ISSUED', // Auto-issue
          totalValue,
          issuedAt: new Date(),
          issuedBy: issuedBy,
          lines: {
            create: linesData.map(l => ({
              mrLineId: l.mrLineId,
              itemId: l.itemId,
              issuedQty: l.issuedQty,
              unitCost: l.unitCost,
              totalCost: l.totalCost,
            })),
          },
        },
        include: {
          store: true,
          issuedTo: true,
          lines: { include: { item: true } },
        },
      });

      // Process each line (update stock, create transactions)
      for (const lineData of linesData) {
        // Update stock
        await tx.storeStock.update({
          where: { storeId_itemId: { storeId, itemId: lineData.itemId } },
          data: {
            availableQty: { decrement: lineData.issuedQty },
            lastMovementAt: new Date(),
          },
        });

        // Create stock transaction
        await tx.stockTransaction.create({
          data: {
            storeId,
            itemId: lineData.itemId,
            transactionType: 'ISSUE',
            quantity: -lineData.issuedQty,
            unitCost: lineData.unitCost,
            totalValue: -lineData.totalCost,
            referenceType: 'MATERIAL_ISSUE',
            referenceId: mi.id,
            miId: mi.id,
            performedBy: issuedBy,
            notes: `MI: ${miNumber} from MR: ${mr.mrNumber}${notes ? ` - ${notes}` : ''}`,
          },
        });

        // Update MR line
        const mrLine = mr.lines.find(l => l.id === lineData.mrLineId);
        if (mrLine) {
          const currentIssued = mrLine.issuedQty?.toNumber() || 0;
          const newIssued = currentIssued + lineData.issuedQty;
          const approved = mrLine.approvedQty?.toNumber() || mrLine.requestedQty.toNumber();

          await tx.mrLine.update({
            where: { id: lineData.mrLineId },
            data: {
              issuedQty: newIssued,
              status: newIssued >= approved ? 'ISSUED' : 'PARTIALLY_ISSUED',
            },
          });
        }
      }

      // Update MR status
      const allLines = await tx.mrLine.findMany({ where: { mrId } });
      const allIssued = allLines.every(l => l.status === 'ISSUED');
      const someIssued = allLines.some(l => (l.issuedQty?.toNumber() || 0) > 0);

      let newMRStatus = mr.status;
      if (allIssued) {
        newMRStatus = 'FULFILLED';
      } else if (someIssued) {
        newMRStatus = 'PARTIALLY_ISSUED';
      }

      if (newMRStatus !== mr.status) {
        await tx.materialRequest.update({
          where: { id: mrId },
          data: { status: newMRStatus },
        });
      }

      return mi;
    });

    return apiSuccess({
      id: result.id,
      miNumber: result.miNumber,
      mrNumber: mr.mrNumber,
      status: result.status,
      totalValue: result.totalValue,
      linesCount: linesData.length,
    }, 'Material issue created and processed successfully', 201);
  } catch (error) {
    console.error('Create MI from MR error:', error);
    return apiError('Failed to create material issue', 500);
  }
}

// GET - Get available MRs for creating MI
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const mrId = url.searchParams.get('mrId');

    if (mrId) {
      // Get specific MR with issuable lines
      const mr = await db.materialRequest.findUnique({
        where: { id: mrId },
        include: {
          lines: {
            include: {
              item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } },
            },
          },
          jobCard: { select: { id: true, jobCardNumber: true } },
          requestor: { select: { id: true, name: true } },
        },
      });

      if (!mr) {
        return apiError('Material request not found', 404);
      }

      // Calculate remaining quantities
      const lines = mr.lines.map(line => {
        const approved = line.approvedQty?.toNumber() || line.requestedQty.toNumber();
        const issued = line.issuedQty?.toNumber() || 0;
        const remaining = approved - issued;

        return {
          id: line.id,
          lineNumber: line.lineNumber,
          item: line.item,
          requestedQty: line.requestedQty.toNumber(),
          approvedQty: approved,
          issuedQty: issued,
          remainingToIssue: remaining,
          status: line.status,
          canIssue: remaining > 0,
        };
      });

      return apiSuccess({
        id: mr.id,
        mrNumber: mr.mrNumber,
        status: mr.status,
        priority: mr.priority,
        jobCard: mr.jobCard,
        requestor: mr.requestor,
        lines: lines.filter(l => l.canIssue),
      });
    }

    // List all MRs that can be processed
    const mrs = await db.materialRequest.findMany({
      where: {
        status: { in: ['APPROVED', 'PARTIALLY_ISSUED'] },
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        jobCard: { select: { id: true, jobCardNumber: true } },
        requestor: { select: { id: true, name: true } },
        _count: { select: { lines: true } },
      },
    });

    return apiSuccess({
      data: mrs.map(mr => ({
        id: mr.id,
        mrNumber: mr.mrNumber,
        status: mr.status,
        priority: mr.priority,
        jobCard: mr.jobCard,
        requestor: mr.requestor,
        linesCount: mr._count.lines,
        createdAt: mr.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get MRs for MI error:', error);
    return apiError('Failed to fetch material requests', 500);
  }
}
