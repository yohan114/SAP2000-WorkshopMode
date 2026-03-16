import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  parsePagination,
  getSkip,
} from '@/lib/api-utils';

// GET /api/users - List users with pagination and filters
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ name: 'asc' }],
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          isActive: true,
          createdAt: true,
        },
      }),
      db.user.count({ where }),
    ]);

    return apiPaginated(users, total, page, limit);
  } catch (error) {
    console.error('Get users error:', error);
    return apiError('Failed to fetch users', 500);
  }
}
