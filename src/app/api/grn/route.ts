import { db } from '@/lib/db';
import { apiSuccess, apiPaginated, apiError, parsePagination, getSkip, generateDocumentNumber } from '@/lib/api-utils';
import { z } from 'zod';

/**
 * @openapi
 * /api/grn:
 *   get:
 *     tags:
 *       - GRN
 *     summary: List all Goods Receipt Notes
 *     description: Retrieve a paginated list of GRNs with optional filtering by status, store, and purchase order.
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
 *         description: Search term for GRN number
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/GRNStatus'
 *         description: Filter by GRN status
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *         description: Filter by store ID
 *       - in: query
 *         name: poId
 *         schema:
 *           type: string
 *         description: Filter by purchase order ID
 *     responses:
 *       200:
 *         description: List of GRNs with pagination
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
 *                           - $ref: '#/components/schemas/GRN'
 *                           - type: object
 *                             properties:
 *                               po:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   poNumber:
 *                                     type: string
 *                               supplier:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   supplierCode:
 *                                     type: string
 *                                   name:
 *                                     type: string
 *                               store:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   code:
 *                                     type: string
 *                                   name:
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
 *                                     receivedQty:
 *                                       type: number
 *                                     acceptedQty:
 *                                       type: number
 *                                     rejectedQty:
 *                                       type: number
 *                                     unitCost:
 *                                       type: number
 *                                     totalCost:
 *                                       type: number
 *                               createdBy:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   name:
 *                                     type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     tags:
 *       - GRN
 *     summary: Create a new GRN
 *     description: Create a new Goods Receipt Note from a purchase order. The PO must be in ISSUED, ACKNOWLEDGED, or PARTIALLY_RECEIVED status.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGRNInput'
 *     responses:
 *       201:
 *         description: GRN created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 grnNumber:
 *                   type: string
 *                 status:
 *                   $ref: '#/components/schemas/GRNStatus'
 *                 totalValue:
 *                   type: number
 *                 linesCount:
 *                   type: integer
 *       400:
 *         description: Validation error or PO not in correct status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Purchase order or store not found
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

const createGRNSchema = z.object({
  poId: z.string().optional(),
  supplierId: z.string().optional(),
  storeId: z.string().min(1),
  deliveryNoteNo: z.string().optional(),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
  createdBy: z.string().min(1),
  lines: z.array(z.object({
    poLineId: z.string().optional(),
    itemId: z.string(),
    receivedQty: z.number().positive(),
    acceptedQty: z.number().min(0),
    rejectedQty: z.number().min(0).optional(),
    rejectionReason: z.string().optional(),
    unitCost: z.number().positive(),
    batchNumber: z.string().optional(),
    expiryDate: z.string().optional(),
    notes: z.string().optional(),
  })).min(1),
});

// GET - List GRNs
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search } = parsePagination(url);
    const skip = getSkip(page, limit);

    const status = url.searchParams.get('status');
    const storeId = url.searchParams.get('storeId');
    const poId = url.searchParams.get('poId');

    const where: Record<string, unknown> = { isActive: true };
    if (status) where.status = status;
    if (storeId) where.storeId = storeId;
    if (poId) where.poId = poId;
    if (search) where.grnNumber = { contains: search };

    const [grns, total] = await Promise.all([
      db.grnHeader.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, supplierCode: true, name: true } },
          store: { select: { id: true, code: true, name: true } },
          purchaseOrder: { select: { id: true, poNumber: true } },
          creator: { select: { id: true, name: true } },
          lines: {
            include: {
              item: { select: { id: true, itemCode: true, name: true, unitOfMeasure: true } },
            },
          },
          _count: { select: { lines: true } },
        },
      }),
      db.grnHeader.count({ where }),
    ]);

    return apiPaginated(
      grns.map(grn => ({
        id: grn.id,
        grnNumber: grn.grnNumber,
        po: grn.purchaseOrder,
        supplier: grn.supplier,
        store: grn.store,
        status: grn.status,
        totalValue: grn.totalValue.toNumber(),
        lineCount: grn._count.lines,
        lines: grn.lines.map(l => ({
          id: l.id,
          item: l.item,
          receivedQty: l.receivedQty.toNumber(),
          acceptedQty: l.acceptedQty.toNumber(),
          rejectedQty: l.rejectedQty.toNumber(),
          unitCost: l.unitCost.toNumber(),
          totalCost: l.totalCost.toNumber(),
        })),
        createdBy: grn.creator,
        createdAt: grn.createdAt,
      })),
      total,
      page,
      limit
    );
  } catch (error) {
    console.error('Get GRNs error:', error);
    return apiError('Failed to fetch GRNs', 500);
  }
}

// POST - Create GRN (from PO or standalone)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createGRNSchema.safeParse(body);

    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { poId, supplierId, storeId, deliveryNoteNo, deliveryDate, notes, createdBy, lines } = result.data;

    let finalSupplierId = supplierId;
    let po = null;

    // If PO is provided, verify it exists and get supplier
    if (poId) {
      po = await db.purchaseOrder.findUnique({
        where: { id: poId },
        include: { lines: true },
      });

      if (!po) {
        return apiError('Purchase order not found', 404);
      }

      if (!['ISSUED', 'ACKNOWLEDGED', 'PARTIALLY_RECEIVED'].includes((po as any).status)) {
        return apiError('PO must be issued or acknowledged to create GRN', 400);
      }

      finalSupplierId = (po as any).supplierId;
    } else if (supplierId) {
      // Verify supplier exists for standalone GRN
      const supplier = await db.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) {
        return apiError('Supplier not found', 404);
      }
    } else {
      return apiError('Either PO or Supplier must be provided', 400);
    }

    // Verify store exists
    const store = await db.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return apiError('Store not found', 404);
    }

    // Generate GRN number
    const count = await db.grnHeader.count();
    const grnNumber = generateDocumentNumber('GRN', count + 1);

    // Calculate total value
    let totalValue = 0;
    const linesData = lines.map(line => {
      const totalCost = line.unitCost * line.acceptedQty;
      totalValue += totalCost;
      return {
        itemId: line.itemId,
        receivedQty: line.receivedQty,
        acceptedQty: line.acceptedQty,
        rejectedQty: line.rejectedQty || 0,
        rejectionReason: line.rejectionReason,
        unitCost: line.unitCost,
        totalCost,
        batchNumber: line.batchNumber,
        expiryDate: line.expiryDate ? new Date(line.expiryDate) : undefined,
        notes: line.notes,
      };
    });

    // Create GRN
    const grn = await db.grnHeader.create({
      data: {
        grnNumber,
        poId,
        supplierId: finalSupplierId,
        storeId,
        deliveryNoteNo,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        status: 'DRAFT',
        createdBy,
        totalValue,
        notes,
        lines: { create: linesData },
      },
      include: {
        supplier: true,
        store: true,
        purchaseOrder: true,
        lines: { include: { item: true } },
      },
    });

    return apiSuccess({
      id: grn.id,
      grnNumber: grn.grnNumber,
      status: grn.status,
      totalValue: grn.totalValue.toNumber(),
      linesCount: grn.lines.length,
    }, 'GRN created successfully', 201);
  } catch (error) {
    console.error('Create GRN error:', error);
    return apiError('Failed to create GRN', 500);
  }
}
