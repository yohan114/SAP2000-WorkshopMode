import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  parsePagination,
  getSkip,
  generateDocumentNumber 
} from '@/lib/api-utils';
import { z } from 'zod';

// Invoice status
const InvoiceStatus = {
  PENDING: 'PENDING',
  MATCHED: 'MATCHED',
  PARTIALLY_MATCHED: 'PARTIALLY_MATCHED',
  DISPUTED: 'DISPUTED',
  APPROVED: 'APPROVED',
  PAID: 'PAID',
} as const;

// Match status
const MatchStatus = {
  FULL_MATCH: 'FULL_MATCH',
  QUANTITY_VARIANCE: 'QUANTITY_VARIANCE',
  PRICE_VARIANCE: 'PRICE_VARIANCE',
  BOTH_VARIANCE: 'BOTH_VARIANCE',
  NO_MATCH: 'NO_MATCH',
} as const;

const createInvoiceSchema = z.object({
  poId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string(),
  dueDate: z.string().optional(),
  currency: z.string().default('LKR'),
  totalValue: z.number().nonnegative(),
  taxAmount: z.number().optional(),
  invoicePdfPath: z.string().optional(),
  lines: z.array(z.object({
    description: z.string(),
    invoicedQty: z.number().positive(),
    invoicedPrice: z.number().nonnegative(),
    notes: z.string().optional(),
  })).min(1),
});

// GET - List invoices with pagination
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search } = parsePagination(url);
    const skip = getSkip(page, limit);

    const status = url.searchParams.get('status');
    const poId = url.searchParams.get('poId');
    const supplierId = url.searchParams.get('supplierId');

    const where: Record<string, unknown> = { isActive: true };
    if (status) where.status = status;
    if (poId) where.poId = poId;
    if (supplierId) where.supplierId = supplierId;
    if (search) where.invoiceNumber = { contains: search };

    const [invoices, total] = await Promise.all([
      db.supplierInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, supplierCode: true, name: true } },
          purchaseOrder: { select: { id: true, poNumber: true, status: true } },
          lines: true,
          _count: { select: { lines: true } },
        },
      }),
      db.supplierInvoice.count({ where }),
    ]);

    return apiPaginated(
      invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        po: inv.purchaseOrder,
        supplier: inv.supplier,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        currency: inv.currency,
        totalValue: inv.totalValue.toNumber(),
        taxAmount: inv.taxAmount?.toNumber() || 0,
        status: inv.status,
        matchStatus: inv.matchStatus,
        invoicePdfPath: inv.invoicePdfPath,
        lineCount: inv._count.lines,
        approvedAt: inv.approvedAt,
        paidAt: inv.paidAt,
        createdAt: inv.createdAt,
      })),
      total,
      page,
      limit
    );
  } catch (error) {
    console.error('Get invoices error:', error);
    return apiError('Failed to fetch invoices', 500);
  }
}

// POST - Create supplier invoice
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const result = createInvoiceSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const data = result.data;

    // Verify PO exists
    const po = await db.purchaseOrder.findUnique({
      where: { id: data.poId },
      include: { supplier: true, lines: true },
    });

    if (!po) {
      return apiError('Purchase order not found', 404);
    }

    // Check if invoice number already exists
    const existingInvoice = await db.supplierInvoice.findUnique({
      where: { invoiceNumber: data.invoiceNumber },
    });

    if (existingInvoice) {
      return apiError('Invoice number already exists', 400);
    }

    // BUG FIX #38: Validate invoice amount doesn't exceed PO total
    const poTotal = po.lines.reduce((sum, l) => sum + l.totalPrice.toNumber(), 0);

    if (data.totalValue > poTotal) {
      return apiError(
        `Invoice total (${data.totalValue.toFixed(2)}) exceeds PO total (${poTotal.toFixed(2)}). ` +
        `Variance: ${(data.totalValue - poTotal).toFixed(2)}`,
        400
      );
    }

    // Validate against received quantities from GRNs
    const grns = await db.grnHeader.findMany({
      where: {
        poId: data.poId,
        status: 'POSTED',
      },
      include: { lines: true },
    });

    // Calculate total received quantities per item
    const receivedItems = new Map<string, number>();
    for (const grn of grns) {
      for (const line of grn.lines) {
        const current = receivedItems.get(line.itemId) || 0;
        receivedItems.set(line.itemId, current + line.acceptedQty.toNumber());
      }
    }

    // Check each invoice line against PO and received quantities
    for (const invoiceLine of data.lines) {
      const poLine = po.lines.find(l =>
        l.description.toLowerCase() === invoiceLine.description.toLowerCase()
      );

      if (!poLine) {
        return apiError(`Invoice line "${invoiceLine.description}" not found in PO`, 400);
      }

      const poQty = poLine.orderedQty.toNumber();
      const receivedQty = receivedItems.get(poLine.itemId || '') || 0;

      if (invoiceLine.invoicedQty > poQty) {
        return apiError(
          `Invoice quantity (${invoiceLine.invoicedQty}) for "${invoiceLine.description}" ` +
          `exceeds PO quantity (${poQty})`,
          400
        );
      }

      if (invoiceLine.invoicedQty > receivedQty) {
        return apiError(
          `Invoice quantity (${invoiceLine.invoicedQty}) for "${invoiceLine.description}" ` +
          `exceeds received quantity (${receivedQty}). Please verify GRNs.`,
          400
        );
      }

      if (invoiceLine.invoicedPrice > poLine.unitPrice.toNumber() * 1.1) {
        return apiError(
          `Invoice unit price (${invoiceLine.invoicedPrice}) for "${invoiceLine.description}" ` +
          `exceeds PO price (${poLine.unitPrice.toNumber()}) by more than 10%`,
          400
        );
      }
    }

    // Calculate total from lines
    let calculatedTotal = 0;
    const linesData = data.lines.map(line => {
      const invoicedTotal = line.invoicedQty * line.invoicedPrice;
      calculatedTotal += invoicedTotal;
      return {
        description: line.description,
        invoicedQty: line.invoicedQty,
        invoicedPrice: line.invoicedPrice,
        invoicedTotal,
        notes: line.notes,
      };
    });

    // Create invoice with auto-matching
    const invoice = await db.$transaction(async (tx) => {
      // Create invoice
      const newInvoice = await tx.supplierInvoice.create({
        data: {
          invoiceNumber: data.invoiceNumber,
          poId: data.poId,
          supplierId: po.supplierId,
          invoiceDate: new Date(data.invoiceDate),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          currency: data.currency,
          totalValue: data.totalValue,
          taxAmount: data.taxAmount || 0,
          invoicePdfPath: data.invoicePdfPath || null,
          status: InvoiceStatus.PENDING,
          lines: {
            create: linesData,
          },
        },
        include: {
          lines: true,
        },
      });

      // Perform matching
      let matchResult = MatchStatus.NO_MATCH;
      let qtyVariance = 0;
      let priceVariance = 0;

      // Match against PO lines and GRNs
      const grns = await tx.grnHeader.findMany({
        where: { 
          poId: data.poId,
          status: 'POSTED',
        },
        include: { lines: true },
      });

      const receivedItems = new Map<string, number>();
      for (const grn of grns) {
        for (const line of grn.lines) {
          const current = receivedItems.get(line.itemId) || 0;
          receivedItems.set(line.itemId, current + line.acceptedQty.toNumber());
        }
      }

      // Calculate variances
      const poTotal = po.lines.reduce((sum, l) => sum + l.totalPrice.toNumber(), 0);
      const valueVariance = Math.abs(data.totalValue - poTotal);

      if (valueVariance < 0.01 && calculatedTotal === data.totalValue) {
        matchResult = MatchStatus.FULL_MATCH;
      } else {
        // Check for quantity or price variance
        if (Math.abs(calculatedTotal - poTotal) > 0.01) {
          if (valueVariance > 0.01 * poTotal) {
            matchResult = MatchStatus.PRICE_VARIANCE;
          } else {
            matchResult = MatchStatus.QUANTITY_VARIANCE;
          }
        }
      }

      // Update invoice with match status
      await tx.supplierInvoice.update({
        where: { id: newInvoice.id },
        data: {
          matchStatus: matchResult,
          varianceNotes: matchResult !== MatchStatus.FULL_MATCH 
            ? `PO Total: ${poTotal.toFixed(2)}, Invoice Total: ${data.totalValue.toFixed(2)}, Variance: ${valueVariance.toFixed(2)}`
            : null,
        },
      });

      // Update invoice lines with variance info
      for (const invoiceLine of newInvoice.lines) {
        const poLine = po.lines.find(l => 
          l.description.toLowerCase() === invoiceLine.description.toLowerCase()
        );

        if (poLine) {
          const qtyVar = invoiceLine.invoicedQty.toNumber() - poLine.orderedQty.toNumber();
          const priceVar = invoiceLine.invoicedPrice.toNumber() - poLine.unitPrice.toNumber();

          await tx.invoiceLine.update({
            where: { id: invoiceLine.id },
            data: {
              matchQtyVariance: qtyVar,
              matchPriceVariance: priceVar,
            },
          });
        }
      }

      return newInvoice;
    });

    return apiSuccess({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      matchStatus: invoice.matchStatus,
    }, 'Invoice created successfully', 201);
  } catch (error) {
    console.error('Create invoice error:', error);
    return apiError('Failed to create invoice', 500);
  }
}
