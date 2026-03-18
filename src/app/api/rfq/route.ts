import { db } from '@/lib/db';
import {
  apiSuccess,
  apiPaginated,
  apiError,
  parsePagination,
  getSkip,
} from '@/lib/api-utils';
import { z } from 'zod';

// Validation schema for creating RFQ
const createRfqSchema = z.object({
  notes: z.string().optional(),
  closingDate: z.string().optional(),
  lines: z.array(z.object({
    itemId: z.string().optional(),
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(0.01, 'Quantity must be positive'),
    unitOfMeasure: z.string().optional(),
  })).min(1, 'At least one line is required'),
  supplierIds: z.array(z.string()).min(1, 'At least one supplier is required'),
});

// Generate RFQ number
async function generateRfqNumber(): Promise<string> {
  const count = await db.rfqHeader.count();
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const sequence = String(count + 1).padStart(4, '0');
  return `RFQ-${year}${month}-${sequence}`;
}

// GET /api/rfq - List RFQs with pagination
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search } = parsePagination(url);
    const skip = getSkip(page, limit);

    const status = url.searchParams.get('status');

    const where: Record<string, unknown> = { isActive: true };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.rfqNumber = { contains: search };
    }

    const [rfqs, total] = await Promise.all([
      db.rfqHeader.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          rfqNumber: true,
          status: true,
          issueDate: true,
          closingDate: true,
          notes: true,
          createdAt: true,
          _count: {
            select: {
              lines: true,
              suppliers: true,
              quotations: true,
            },
          },
          quotations: {
            select: {
              id: true,
              quotationNumber: true,
              supplierId: true,
              totalValue: true,
              status: true,
              supplier: {
                select: {
                  id: true,
                  supplierCode: true,
                  name: true,
                },
              },
            },
          },
          suppliers: {
            select: {
              supplierId: true,
              status: true,
              supplier: {
                select: {
                  id: true,
                  supplierCode: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      db.rfqHeader.count({ where }),
    ]);

    return apiPaginated(rfqs, total, page, limit);
  } catch (error) {
    console.error('Get RFQs error:', error);
    return apiError('Failed to fetch RFQs', 500);
  }
}

// POST /api/rfq - Create a new RFQ
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const result = createRfqSchema.safeParse(body);
    if (!result.success) {
      return apiError(result.error.issues[0]?.message || 'Invalid input', 400);
    }

    const data = result.data;

    // Generate RFQ number
    const rfqNumber = await generateRfqNumber();

    // Create RFQ with lines and suppliers
    const rfq = await db.rfqHeader.create({
      data: {
        rfqNumber,
        closingDate: data.closingDate ? new Date(data.closingDate) : null,
        notes: data.notes || null,
        status: 'DRAFT',
        lines: {
          create: data.lines.map((line) => ({
            description: line.description,
            itemId: line.itemId || null,
            quantity: line.quantity,
            unitOfMeasure: line.unitOfMeasure || null,
          })),
        },
        suppliers: {
          create: data.supplierIds.map((supplierId) => ({
            supplierId,
            status: 'INVITED',
          })),
        },
      },
      select: {
        id: true,
        rfqNumber: true,
        status: true,
        closingDate: true,
        notes: true,
        createdAt: true,
        lines: {
          select: {
            id: true,
            description: true,
            quantity: true,
            unitOfMeasure: true,
          },
        },
        suppliers: {
          select: {
            supplierId: true,
            status: true,
            supplier: {
              select: {
                id: true,
                supplierCode: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return apiSuccess(rfq, 'RFQ created successfully');
  } catch (error) {
    console.error('Create RFQ error:', error);
    return apiError('Failed to create RFQ', 500);
  }
}
