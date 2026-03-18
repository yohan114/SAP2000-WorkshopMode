import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

// Validation schema for creating quotation
const createQuotationSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  quotationNumber: z.string().min(1, 'Quotation number is required'),
  quotationDate: z.string().min(1, 'Quotation date is required'),
  validUntil: z.string().optional(),
  currency: z.string().default('USD'),
  terms: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    rfqLineId: z.string().optional(),
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(0.01, 'Quantity must be positive'),
    unitPrice: z.number().min(0, 'Unit price must be non-negative'),
    leadTime: z.number().optional(),
  })).min(1, 'At least one line is required'),
});

// GET /api/rfq/[id]/quotation - List quotations for an RFQ
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const quotations = await db.quotation.findMany({
      where: { rfqId: id, isActive: true },
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
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(quotations);
  } catch (error) {
    console.error('Get quotations error:', error);
    return apiError('Failed to fetch quotations', 500);
  }
}

// POST /api/rfq/[id]/quotation - Create a quotation for an RFQ
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if RFQ exists
    const rfq = await db.rfqHeader.findFirst({
      where: { id, isActive: true },
    });

    if (!rfq) {
      return apiError('RFQ not found', 404);
    }

    if (rfq.status !== 'ISSUED') {
      return apiError('Quotations can only be added to issued RFQs', 400);
    }

    const body = await request.json();

    // Validate input
    const result = createQuotationSchema.safeParse(body);
    if (!result.success) {
      return apiError(result.error.issues[0]?.message || 'Invalid input', 400);
    }

    const data = result.data;

    // Check if supplier is invited to this RFQ
    const rfqSupplier = await db.rfqSupplier.findFirst({
      where: { rfqId: id, supplierId: data.supplierId },
    });

    if (!rfqSupplier) {
      return apiError('Supplier is not invited to this RFQ', 400);
    }

    // Calculate total value
    const totalValue = data.lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);

    // Create quotation
    const quotation = await db.quotation.create({
      data: {
        rfqId: id,
        supplierId: data.supplierId,
        quotationNumber: data.quotationNumber,
        quotationDate: new Date(data.quotationDate),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        currency: data.currency,
        totalValue,
        terms: data.terms || null,
        notes: data.notes || null,
        status: 'SUBMITTED',
        lines: {
          create: data.lines.map((line) => ({
            rfqLineId: line.rfqLineId || null,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            totalPrice: line.quantity * line.unitPrice,
            leadTime: line.leadTime || null,
          })),
        },
      },
      select: {
        id: true,
        quotationNumber: true,
        quotationDate: true,
        validUntil: true,
        currency: true,
        totalValue: true,
        status: true,
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
            description: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            leadTime: true,
          },
        },
      },
    });

    // Update RFQ supplier respondedAt
    await db.rfqSupplier.update({
      where: {
        rfqId_supplierId: { rfqId: id, supplierId: data.supplierId },
      },
      data: {
        status: 'RESPONDED',
        respondedAt: new Date(),
      },
    });

    return apiSuccess(quotation, 'Quotation submitted successfully');
  } catch (error) {
    console.error('Create quotation error:', error);
    return apiError('Failed to create quotation', 500);
  }
}
