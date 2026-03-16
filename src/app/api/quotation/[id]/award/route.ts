import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';

// Generate PO number
async function generatePoNumber(): Promise<string> {
  const count = await db.purchaseOrder.count();
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const sequence = String(count + 1).padStart(4, '0');
  return `PO-${year}${month}-${sequence}`;
}

// POST /api/quotation/[id]/award - Award quotation and create PO
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get quotation with details
    const quotation = await db.quotation.findFirst({
      where: { id, isActive: true },
      include: {
        rfqHeader: true,
        lines: true,
        supplier: true,
      },
    });

    if (!quotation) {
      return apiError('Quotation not found', 404);
    }

    if (quotation.status !== 'SUBMITTED' && quotation.status !== 'EVALUATED') {
      return apiError('Quotation must be in SUBMITTED or EVALUATED status to award', 400);
    }

    // Generate PO number
    const poNumber = await generatePoNumber();

    // Calculate total value
    const totalValue = quotation.lines.reduce((sum, line) => sum + Number(line.totalPrice), 0);

    // Create Purchase Order from quotation
    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        poNumber,
        rfqId: quotation.rfqId,
        quotationId: id,
        supplierId: quotation.supplierId,
        procurementChannel: 'LOCAL',
        status: 'DRAFT',
        orderDate: new Date(),
        currency: quotation.currency,
        totalValue,
        lines: {
          create: quotation.lines.map((line, index) => ({
            lineNumber: index + 1,
            itemId: line.itemId,
            description: line.description,
            orderedQty: Number(line.quantity),
            unitPrice: Number(line.unitPrice),
            totalPrice: Number(line.totalPrice),
            leadTime: line.leadTime || undefined,
            status: 'PENDING',
          })),
        },
      },
      select: {
        id: true,
        poNumber: true,
        supplierId: true,
        totalValue: true,
        status: true,
        createdAt: true,
        supplier: {
          select: {
            id: true,
            supplierCode: true,
            name: true,
          },
        },
        lines: {
          select: {
            id: true,
            lineNumber: true,
            description: true,
            orderedQty: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
      },
    });

    // Update quotation status to AWARDED
    await db.quotation.update({
      where: { id },
      data: { status: 'AWARDED' },
    });

    // Update RFQ status to CLOSED
    await db.rfqHeader.update({
      where: { id: quotation.rfqId },
      data: { status: 'CLOSED' },
    });

    // Reject all other quotations for this RFQ
    await db.quotation.updateMany({
      where: {
        rfqId: quotation.rfqId,
        id: { not: id },
        status: { in: ['SUBMITTED', 'EVALUATED'] },
      },
      data: { status: 'REJECTED' },
    });

    return apiSuccess({
      purchaseOrder,
      quotation: { id: quotation.id, quotationNumber: quotation.quotationNumber, status: 'AWARDED' },
    }, 'Quotation awarded and Purchase Order created');
  } catch (error) {
    console.error('Award quotation error:', error);
    return apiError('Failed to award quotation', 500);
  }
}
