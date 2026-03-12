import { db } from '@/lib/db';
import { apiSuccess, apiPaginated, apiError, parsePagination, getSkip } from '@/lib/api-utils';
import { z } from 'zod';

const createReservationSchema = z.object({
  mrLineId: z.string().min(1),
  storeId: z.string().min(1),
  itemId: z.string().min(1),
  reservedQty: z.number().positive(),
  wacAtReservation: z.number().optional(),
  expiresAt: z.string().optional(),
});

const releaseReservationSchema = z.object({
  releaseReason: z.string().optional(),
});

// GET - List stock reservations
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search } = parsePagination(url);
    const skip = getSkip(page, limit);

    const status = url.searchParams.get('status') || 'ACTIVE';
    const storeId = url.searchParams.get('storeId');
    const itemId = url.searchParams.get('itemId');

    const where: Record<string, unknown> = {};
    
    if (status !== 'all') {
      where.status = status;
    }
    if (storeId) {
      where.storeId = storeId;
    }
    if (itemId) {
      where.itemId = itemId;
    }

    const [reservations, total] = await Promise.all([
      db.stockReservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          mrLine: {
            include: {
              materialRequest: {
                include: {
                  jobCard: { select: { jobCardNumber: true } },
                  requestor: { select: { name: true } },
                },
              },
              item: { select: { itemCode: true, name: true, unitOfMeasure: true } },
            },
          },
          store: { select: { code: true, name: true } },
          item: { select: { itemCode: true, name: true, unitOfMeasure: true } },
        },
      }),
      db.stockReservation.count({ where }),
    ]);

    return apiPaginated(
      reservations.map(r => ({
        id: r.id,
        mrLineId: r.mrLineId,
        mrNumber: r.mrLine?.materialRequest?.mrNumber,
        jobCardNumber: r.mrLine?.materialRequest?.jobCard?.jobCardNumber,
        requestor: r.mrLine?.materialRequest?.requestor?.name,
        store: r.store,
        item: r.item,
        reservedQty: r.reservedQty.toNumber(),
        wacAtReservation: r.wacAtReservation.toNumber(),
        status: r.status,
        expiresAt: r.expiresAt,
        releasedAt: r.releasedAt,
        releaseReason: r.releaseReason,
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit
    );
  } catch (error) {
    console.error('Get reservations error:', error);
    return apiError('Failed to fetch reservations', 500);
  }
}

// POST - Create a stock reservation
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = createReservationSchema.safeParse(body);
    
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.errors[0]?.message);
    }

    const { mrLineId, storeId, itemId, reservedQty, wacAtReservation, expiresAt } = result.data;

    // Check available stock
    const stock = await db.storeStock.findUnique({
      where: { storeId_itemId: { storeId, itemId } },
    });

    if (!stock) {
      return apiError('Stock record not found', 404);
    }

    const availableQty = stock.availableQty.toNumber() - stock.reservedQty.toNumber();
    if (availableQty < reservedQty) {
      return apiError(`Insufficient available stock. Available: ${availableQty}`, 400);
    }

    // Get WAC from stock if not provided
    const wac = wacAtReservation || stock.wac.toNumber();

    // Create reservation and update stock
    const [reservation] = await db.$transaction([
      db.stockReservation.create({
        data: {
          mrLineId,
          storeId,
          itemId,
          reservedQty,
          wacAtReservation: wac,
          status: 'ACTIVE',
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        },
        include: {
          store: { select: { code: true, name: true } },
          item: { select: { itemCode: true, name: true, unitOfMeasure: true } },
        },
      }),
      db.storeStock.update({
        where: { storeId_itemId: { storeId, itemId } },
        data: {
          reservedQty: { increment: reservedQty },
        },
      }),
    ]);

    return apiSuccess({
      id: reservation.id,
      store: reservation.store,
      item: reservation.item,
      reservedQty: reservation.reservedQty.toNumber(),
      status: reservation.status,
    }, 'Stock reserved successfully', 201);
  } catch (error) {
    console.error('Create reservation error:', error);
    return apiError('Failed to create reservation', 500);
  }
}
