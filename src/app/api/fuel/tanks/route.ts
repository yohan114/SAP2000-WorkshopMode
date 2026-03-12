import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  apiValidationError,
  parsePagination,
  getSkip,
  generateDocumentNumber
} from '@/lib/api-utils';
import { z } from 'zod';

// Schema for creating fuel tank
const createFuelTankSchema = z.object({
  tankNumber: z.string().min(1, 'Tank number is required'),
  name: z.string().min(1, 'Name is required'),
  fuelType: z.enum(['DIESEL', 'PETROL', 'OIL', 'KEROSENE'], {
    errorMap: () => ({ message: 'Invalid fuel type' })
  }),
  capacity: z.number().positive('Capacity must be positive'),
  currentLevel: z.number().min(0).optional().default(0),
  location: z.string().optional(),
});

// GET /api/fuel/tanks - List all fuel tanks with pagination
export async function GET(request: Request) {
  try {
    const { page, limit, search, sortBy, sortOrder } = parsePagination(new URL(request.url));
    const skip = getSkip(page, limit);

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };
    
    if (search) {
      where.OR = [
        { tankNumber: { contains: search } },
        { name: { contains: search } },
        { location: { contains: search } },
      ];
    }

    // Build orderBy
    const orderBy: Record<string, unknown> = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [tanks, total] = await Promise.all([
      db.fuelTank.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: {
            select: { issues: true, readings: true }
          },
          readings: {
            orderBy: { readingAt: 'desc' },
            take: 1,
            select: {
              id: true,
              readingValue: true,
              readingAt: true,
            }
          }
        },
      }),
      db.fuelTank.count({ where }),
    ]);

    // Transform data
    const data = tanks.map(tank => ({
      id: tank.id,
      tankNumber: tank.tankNumber,
      name: tank.name,
      fuelType: tank.fuelType,
      capacity: tank.capacity,
      currentLevel: tank.currentLevel,
      location: tank.location,
      isActive: tank.isActive,
      lastReading: tank.readings[0] || null,
      issueCount: tank._count.issues,
      readingCount: tank._count.readings,
      createdAt: tank.createdAt,
      updatedAt: tank.updatedAt,
    }));

    return apiPaginated(data, total, page, limit);
  } catch (error) {
    console.error('Get fuel tanks error:', error);
    return apiError('Failed to fetch fuel tanks', 500);
  }
}

// POST /api/fuel/tanks - Create new fuel tank
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const result = createFuelTankSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;

    // Check if tank number already exists
    const existing = await db.fuelTank.findUnique({
      where: { tankNumber: data.tankNumber },
    });

    if (existing) {
      return apiError('Tank number already exists', 400);
    }

    // Get the count of existing tanks for sequential numbering
    const tankCount = await db.fuelTank.count();
    
    // Create fuel tank
    const tank = await db.fuelTank.create({
      data: {
        tankNumber: data.tankNumber,
        name: data.name,
        fuelType: data.fuelType,
        capacity: data.capacity,
        currentLevel: data.currentLevel ?? 0,
        location: data.location,
      },
    });

    // Generate a sequential number for display
    const displayNumber = generateDocumentNumber('FT', tankCount + 1);

    return apiSuccess(
      { 
        ...tank, 
        displayNumber,
        capacityPercent: tank.currentLevel && tank.capacity ? 
          Number(tank.currentLevel) / Number(tank.capacity) * 100 : 0 
      }, 
      'Fuel tank created successfully', 
      201
    );
  } catch (error) {
    console.error('Create fuel tank error:', error);
    return apiError('Failed to create fuel tank', 500);
  }
}
