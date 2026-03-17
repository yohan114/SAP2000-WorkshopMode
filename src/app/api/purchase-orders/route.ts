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

/**
 * @openapi
 * /api/purchase-orders:
 *   get:
 *     tags:
 *       - Purchase Orders
 *     summary: List all purchase orders
 *     description: Retrieve a paginated list of purchase orders with optional filtering by status and supplier.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for PO number or supplier name
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/POStatus'
 *         description: Filter by purchase order status
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: string
 *         description: Filter by supplier ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of purchase orders with pagination
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/PurchaseOrder'
 *                           - type: object
 *                             properties:
 *                               supplier:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   supplierCode:
 *                                     type: string
 *                                   name:
 *                                     type: string
 *                                   status:
 *                                     type: string
 *                               lineCount:
 *                                 type: integer
 *                               lines:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: string
 *                                     item:
 *                                       type: object
 *                                     description:
 *                                       type: string
 *                                     orderedQty:
 *                                       type: number
 *                                     receivedQty:
 *                                       type: number
 *                                     unitPrice:
 *                                       type: number
 *                                     totalPrice:
 *                                       type: number
 *                                     status:
 *                                       type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     tags:
 *       - Purchase Orders
 *     summary: Create a new purchase order
 *     description: Create a new purchase order with line items. PO number is auto-generated.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePOInput'
 *     responses:
 *       201:
 *         description: Purchase order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseOrder'
 *       400:
 *         description: Validation error or supplier not active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Supplier not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// Purchase Order status enum
const PoStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  ISSUED: 'ISSUED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

// Schema for creating purchase order
const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  prId: z.string().optional(),
  quotationId: z.string().optional(),
  procurementChannel: z.enum(['LOCAL', 'HEAD_OFFICE', 'DIRECT_IMPORT']).optional(),
  expectedDeliveryDate: z.string().optional(),
  currency: z.string().default('USD'),
  terms: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    itemId: z.string().optional(),
    description: z.string().min(1),
    orderedQty: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    leadTime: z.number().int().optional(),
    notes: z.string().optional(),
  })).min(1),
});

// GET /api/purchase-orders - List purchase orders with pagination and filters
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Additional filters
    const status = url.searchParams.get('status');
    const supplierId = url.searchParams.get('supplierId');

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };
    
    if (status) {
      where.status = status;
    }
    if (supplierId) {
      where.supplierId = supplierId;
    }
    
    if (search) {
      where.OR = [
        { poNumber: { contains: search } },
        { supplier: { name: { contains: search } } },
      ];
    }

    // Build orderBy
    let orderBy: Array<Record<string, string>>;
    if (sortBy) {
      orderBy = [{ [sortBy]: sortOrder }];
    } else {
      orderBy = [{ createdAt: 'desc' }];
    }

    const [purchaseOrders, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          supplier: {
            select: { id: true, supplierCode: true, name: true, status: true },
          },
          lines: {
            select: {
              id: true,
              itemId: true,
              description: true,
              orderedQty: true,
              receivedQty: true,
              unitPrice: true,
              totalPrice: true,
              status: true,
            },
          },
          _count: {
            select: { lines: true },
          },
        },
      }),
      db.purchaseOrder.count({ where }),
    ]);

    // Get all unique item IDs
    const itemIds = [...new Set(purchaseOrders.flatMap(po => po.lines.map(l => l.itemId)).filter(Boolean))] as string[];
    
    // Fetch items separately
    const items = itemIds.length > 0 ? await db.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, itemCode: true, name: true, unitOfMeasure: true },
    }) : [];
    
    const itemMap = new Map(items.map(i => [i.id, i]));

    // Transform data
    const data = purchaseOrders.map(po => ({
      id: po.id,
      poNumber: po.poNumber,
      supplier: po.supplier,
      status: po.status,
      orderDate: po.orderDate,
      expectedDeliveryDate: po.expectedDeliveryDate,
      currency: po.currency,
      totalValue: po.totalValue,
      lineCount: po._count.lines,
      lines: po.lines.map(line => ({
        id: line.id,
        item: line.itemId ? itemMap.get(line.itemId) || null : null,
        description: line.description,
        orderedQty: line.orderedQty,
        receivedQty: line.receivedQty,
        unitPrice: line.unitPrice,
        totalPrice: line.totalPrice,
        status: line.status,
      })),
      approvedAt: po.approvedAt,
      issuedAt: po.issuedAt,
      createdAt: po.createdAt,
    }));

    return apiPaginated(data, total, page, limit);
  } catch (error) {
    console.error('Get purchase orders error:', error);
    return apiError('Failed to fetch purchase orders', 500);
  }
}

// POST /api/purchase-orders - Create new purchase order
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const result = createPurchaseOrderSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const data = result.data;

    // Verify supplier exists
    const supplier = await db.supplier.findUnique({
      where: { id: data.supplierId },
    });
    if (!supplier || supplier.status !== 'ACTIVE') {
      return apiError('Supplier not found or inactive', 404);
    }

    // Get sequence for PO number
    const currentMonth = new Date().toISOString().slice(0, 7);
    const count = await db.purchaseOrder.count({
      where: {
        createdAt: {
          gte: new Date(`${currentMonth}-01`),
        },
      },
    });

    const poNumber = generateDocumentNumber('PO', count + 1);

    // Calculate total value
    let totalValue = 0;
    const linesData = data.lines.map((line, index) => {
      const totalPrice = line.unitPrice * line.orderedQty;
      totalValue += totalPrice;

      return {
        lineNumber: index + 1,
        itemId: line.itemId,
        description: line.description,
        orderedQty: line.orderedQty,
        receivedQty: 0,
        unitPrice: line.unitPrice,
        totalPrice,
        leadTime: line.leadTime,
        notes: line.notes,
        status: 'PENDING',
      };
    });

    // Create purchase order with lines
    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        poNumber,
        prId: data.prId,
        quotationId: data.quotationId,
        supplierId: data.supplierId,
        procurementChannel: data.procurementChannel,
        status: PoStatus.DRAFT,
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        currency: data.currency,
        totalValue,
        terms: data.terms,
        notes: data.notes,
        lines: {
          create: linesData,
        },
      },
      include: {
        supplier: true,
        lines: {
          include: {
            item: true,
          },
        },
      },
    });

    return apiSuccess(purchaseOrder, 'Purchase order created successfully', 201);
  } catch (error) {
    console.error('Create purchase order error:', error);
    return apiError('Failed to create purchase order', 500);
  }
}
