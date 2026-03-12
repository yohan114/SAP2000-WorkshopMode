import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  parsePagination,
  getSkip,
} from '@/lib/api-utils';

// GET /api/suppliers - List suppliers with pagination and filters
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Additional filters
    const status = url.searchParams.get('status');

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { supplierCode: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      db.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ name: 'asc' }],
        select: {
          id: true,
          supplierCode: true,
          name: true,
          contactPerson: true,
          email: true,
          phone: true,
          address: true,
          status: true,
          paymentTerms: true,
          createdAt: true,
        },
      }),
      db.supplier.count({ where }),
    ]);

    return apiPaginated(suppliers, total, page, limit);
  } catch (error) {
    console.error('Get suppliers error:', error);
    return apiError('Failed to fetch suppliers', 500);
  }
}
