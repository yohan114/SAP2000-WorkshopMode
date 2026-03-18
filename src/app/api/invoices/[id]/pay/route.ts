import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

const payInvoiceSchema = z.object({
  paymentRef: z.string().min(1, 'Payment reference is required'),
  paidBy: z.string().min(1),
});

// POST - Mark invoice as paid
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const result = payInvoiceSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { paymentRef, paidBy } = result.data;

    // Get invoice
    const invoice = await db.supplierInvoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return apiError('Invoice not found', 404);
    }

    if (invoice.status !== 'APPROVED') {
      return apiError('Invoice must be approved before payment', 400);
    }

    // Update invoice status
    const updatedInvoice = await db.supplierInvoice.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentRef,
      },
    });

    // Check if all invoices for this PO are paid to close the PO
    const allInvoices = await db.supplierInvoice.findMany({
      where: { poId: invoice.poId, isActive: true },
    });

    const allPaid = allInvoices.every(inv => inv.status === 'PAID');
    
    if (allPaid && invoice.poId) {
      const po = await db.purchaseOrder.findUnique({
        where: { id: invoice.poId },
      });

      if (po && po.status === 'RECEIVED') {
        await db.purchaseOrder.update({
          where: { id: invoice.poId },
          data: { status: 'CLOSED' },
        });
      }
    }

    return apiSuccess({
      id: updatedInvoice.id,
      invoiceNumber: updatedInvoice.invoiceNumber,
      status: updatedInvoice.status,
      paidAt: updatedInvoice.paidAt,
      paymentRef: updatedInvoice.paymentRef,
    }, 'Invoice marked as paid');
  } catch (error) {
    console.error('Pay invoice error:', error);
    return apiError('Failed to process payment', 500);
  }
}
