import { db } from '@/lib/db';
import { apiSuccess, apiPaginated, apiError, parsePagination, getSkip } from '@/lib/api-utils';

// GET /api/quotation - List all quotations with pagination and filters
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Additional filters
    const status = url.searchParams.get('status');
    const supplierId = url.searchParams.get('supplierId');
    const rfqId = url.searchParams.get('rfqId');

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };

    if (status) {
      where.status = status;
    }
    if (supplierId) {
      where.supplierId = supplierId;
    }
    if (rfqId) {
      where.rfqId = rfqId;
    }

    if (search) {
      where.OR = [
        { quotationNumber: { contains: search } },
      ];
    }

    // Build orderBy
    let orderBy: Array<Record<string, string>>;
    if (sortBy) {
      orderBy = [{ [sortBy]: sortOrder }];
    } else {
      orderBy = [{ createdAt: 'desc' }];
    }

    const [quotations, total] = await Promise.all([
      db.quotation.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          supplier: {
            select: { id: true, supplierCode: true, name: true },
          },
          rfqHeader: {
            select: { id: true, rfqNumber: true },
          },
          lines: {
            include: {
              item: {
                select: { id: true, itemCode: true, name: true, unitOfMeasure: true },
              },
            },
          },
          _count: {
            select: { lines: true },
          },
        },
      }),
      db.quotation.count({ where }),
    ]);

    // Transform data - convert Decimal to number for JSON serialization
    const data = quotations.map(q => ({
      id: q.id,
      quotationNumber: q.quotationNumber,
      supplier: q.supplier,
      rfqId: q.rfqId,
      rfq: q.rfqHeader,
      status: q.status,
      quotationDate: q.quotationDate,
      validUntil: q.validUntil,
      totalAmount: q.totalValue ? Number(q.totalValue) : 0,
      currency: q.currency,
      terms: q.terms,
      lineCount: q._count.lines,
      lines: q.lines.map(line => ({
        id: line.id,
        itemId: line.itemId,
        description: line.description,
        item: line.item,
        quantity: line.quantity ? Number(line.quantity) : 0,
        unitPrice: line.unitPrice ? Number(line.unitPrice) : 0,
        totalPrice: line.totalPrice ? Number(line.totalPrice) : 0,
        deliveryDays: line.leadTime,
        remarks: line.notes,
      })),
      createdAt: q.createdAt,
    }));

    return apiPaginated(data, total, page, limit);
  } catch (error) {
    console.error('Get quotations error:', error);
    return apiError('Failed to fetch quotations', 500);
  }
}
