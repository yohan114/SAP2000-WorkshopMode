import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';

// GET /api/rfq/[id] - Get single RFQ details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rfq = await db.rfqHeader.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        rfqNumber: true,
        status: true,
        issueDate: true,
        closingDate: true,
        notes: true,
        createdAt: true,
        lines: {
          select: {
            id: true,
            itemId: true,
            description: true,
            quantity: true,
            unitOfMeasure: true,
            item: {
              select: {
                id: true,
                itemCode: true,
                name: true,
                unitOfMeasure: true,
              },
            },
          },
        },
        suppliers: {
          select: {
            supplierId: true,
            sentAt: true,
            respondedAt: true,
            status: true,
            notes: true,
            supplier: {
              select: {
                id: true,
                supplierCode: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        quotations: {
          select: {
            id: true,
            quotationNumber: true,
            quotationDate: true,
            validUntil: true,
            currency: true,
            totalValue: true,
            status: true,
            terms: true,
            notes: true,
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
                rfqLineId: true,
                description: true,
                quantity: true,
                unitPrice: true,
                totalPrice: true,
                leadTime: true,
              },
            },
          },
        },
      },
    });

    if (!rfq) {
      return apiError('RFQ not found', 404);
    }

    return apiSuccess(rfq);
  } catch (error) {
    console.error('Get RFQ error:', error);
    return apiError('Failed to fetch RFQ', 500);
  }
}

// DELETE /api/rfq/[id] - Delete RFQ (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rfq = await db.rfqHeader.update({
      where: { id },
      data: { isActive: false },
    });

    return apiSuccess(rfq, 'RFQ deleted successfully');
  } catch (error) {
    console.error('Delete RFQ error:', error);
    return apiError('Failed to delete RFQ', 500);
  }
}
