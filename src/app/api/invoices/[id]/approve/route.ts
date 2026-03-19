import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

const approveInvoiceSchema = z.object({
  approvedBy: z.string().min(1),
  comments: z.string().optional(),
});

// POST - Approve supplier invoice
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const result = approveInvoiceSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { approvedBy, comments } = result.data;

    // Get invoice
    const invoice = await db.supplierInvoice.findUnique({
      where: { id },
      include: {
        purchaseOrder: { select: { id: true, poNumber: true, totalValue: true } },
      },
    });

    if (!invoice) {
      return apiError('Invoice not found', 404);
    }

    if (!['PENDING', 'MATCHED', 'PARTIALLY_MATCHED'].includes(invoice.status)) {
      return apiError('Invoice cannot be approved in current status', 400);
    }

    // Update invoice status
    const updatedInvoice = await db.supplierInvoice.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
        varianceNotes: invoice.varianceNotes 
          ? `${invoice.varianceNotes}${comments ? ` | Approval: ${comments}` : ''}`
          : comments,
      },
    });

    return apiSuccess({
      id: updatedInvoice.id,
      invoiceNumber: updatedInvoice.invoiceNumber,
      status: updatedInvoice.status,
      approvedAt: updatedInvoice.approvedAt,
    }, 'Invoice approved successfully');
  } catch (error) {
    console.error('Approve invoice error:', error);
    return apiError('Failed to approve invoice', 500);
  }
}
