import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';

// POST /api/rfq/[id]/send - Send RFQ to suppliers (change status to ISSUED)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if RFQ exists and is in DRAFT status
    const rfq = await db.rfqHeader.findFirst({
      where: { id, isActive: true },
      include: {
        suppliers: true,
        lines: true,
      },
    });

    if (!rfq) {
      return apiError('RFQ not found', 404);
    }

    if (rfq.status !== 'DRAFT') {
      return apiError('RFQ can only be sent from DRAFT status', 400);
    }

    if (rfq.suppliers.length === 0) {
      return apiError('RFQ must have at least one supplier', 400);
    }

    if (rfq.lines.length === 0) {
      return apiError('RFQ must have at least one line item', 400);
    }

    // Update RFQ status and issue date
    const updatedRfq = await db.rfqHeader.update({
      where: { id },
      data: {
        status: 'ISSUED',
        issueDate: new Date(),
        suppliers: {
          updateMany: {
            where: { rfqId: id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          },
        },
      },
      select: {
        id: true,
        rfqNumber: true,
        status: true,
        issueDate: true,
        closingDate: true,
        suppliers: {
          select: {
            supplierId: true,
            status: true,
            sentAt: true,
            supplier: {
              select: {
                id: true,
                supplierCode: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return apiSuccess(updatedRfq, 'RFQ sent to suppliers successfully');
  } catch (error) {
    console.error('Send RFQ error:', error);
    return apiError('Failed to send RFQ', 500);
  }
}
