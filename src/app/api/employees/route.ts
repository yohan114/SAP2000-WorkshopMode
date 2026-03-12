import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  parsePagination,
  getSkip,
} from '@/lib/api-utils';

// GET /api/employees - List employees with pagination and filters
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Additional filters
    const status = url.searchParams.get('status');
    const department = url.searchParams.get('department');

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (status) {
      where.status = status;
    }
    if (department) {
      where.department = department;
    }
    
    if (search) {
      where.OR = [
        { employeeNumber: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const [employees, total] = await Promise.all([
      db.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ name: 'asc' }],
        select: {
          id: true,
          employeeNumber: true,
          name: true,
          department: true,
          designation: true,
          skillLevel: true,
          hourlyRate: true,
          overtimeRate: true,
          hireDate: true,
          status: true,
          createdAt: true,
        },
      }),
      db.employee.count({ where }),
    ]);

    return apiPaginated(employees, total, page, limit);
  } catch (error) {
    console.error('Get employees error:', error);
    return apiError('Failed to fetch employees', 500);
  }
}
