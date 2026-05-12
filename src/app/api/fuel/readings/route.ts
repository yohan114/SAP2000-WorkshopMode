import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  apiNotFound,
  apiValidationError,
  parsePagination,
  getSkip,
  generateDocumentNumber,
  getDateRangeFilter
} from '@/lib/api-utils';
import { z } from 'zod';

// Schema for creating fuel reading
const createFuelReadingSchema = z.object({
  tankId: z.string().min(1, 'Tank is required'),
  readingValue: z.number().min(0, 'Reading value must be non-negative'),
  readingAt: z.string().optional(),
  readingBy: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/fuel/readings - List readings for a tank
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Filter parameters
    const tankId = url.searchParams.get('tankId') || undefined;
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (tankId) {
      where.tankId = tankId;
    }

    // Date range filter
    const dateFilter = getDateRangeFilter(startDate, endDate);
    if (dateFilter) {
      where.readingAt = dateFilter;
    }

    // Build orderBy
    const orderBy: Record<string, unknown> = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.readingAt = 'desc';
    }

    const [readings, total] = await Promise.all([
      db.fuelReading.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          tank: {
            select: { 
              id: true, 
              tankNumber: true, 
              name: true, 
              fuelType: true,
              capacity: true,
            }
          }
        },
      }),
      db.fuelReading.count({ where }),
    ]);

    // Calculate consumption between readings if tankId is provided
    let enrichedReadings = readings;
    
    if (tankId && readings.length > 0) {
      // Get previous readings for consumption calculation
      const allReadingsForTank = await db.fuelReading.findMany({
        where: { tankId },
        orderBy: { readingAt: 'asc' },
        select: {
          id: true,
          readingValue: true,
          readingAt: true,
        }
      });

      // Create a map for quick lookup
      const readingMap = new Map(
        allReadingsForTank.map(r => [r.id, r])
      );

      // Find previous reading for each reading
      enrichedReadings = readings.map(reading => {
        const readingIndex = allReadingsForTank.findIndex(r => r.id === reading.id);
        let consumption: number | null = null;
        let previousReading: { readingValue: bigint; readingAt: Date } | null = null;

        if (readingIndex > 0) {
          previousReading = allReadingsForTank[readingIndex - 1];
          consumption = Number(reading.readingValue) - Number(previousReading!.readingValue);
        }

        // Calculate percentage of capacity
        const capacityNum = Number(reading.tank.capacity);
        const readingValueNum = Number(reading.readingValue);
        const capacityPercent = capacityNum > 0 ? (readingValueNum / capacityNum) * 100 : 0;

        return {
          id: reading.id,
          readingValue: reading.readingValue ? Number(reading.readingValue) : 0,
          readingAt: reading.readingAt,
          readingBy: reading.readingBy,
          notes: reading.notes,
          createdAt: reading.createdAt,
          tank: {
            ...reading.tank,
            capacity: reading.tank.capacity ? Number(reading.tank.capacity) : 0,
          },
          capacityPercent,
          previousReadingValue: previousReading?.readingValue ? Number(previousReading.readingValue) : null,
          previousReadingAt: previousReading?.readingAt ?? null,
          consumption, // Negative = fuel added, Positive = fuel consumed
        };
      });
    }

    return apiPaginated(enrichedReadings, total, page, limit);
  } catch (error) {
    console.error('Get fuel readings error:', error);
    return apiError('Failed to fetch fuel readings', 500);
  }
}

// POST /api/fuel/readings - Record tank level reading
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const result = createFuelReadingSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;

    // Verify tank exists and is active
    const tank = await db.fuelTank.findUnique({
      where: { id: data.tankId },
    });

    if (!tank) {
      return apiNotFound('Fuel tank');
    }

    if (!tank.isActive) {
      return apiError('Fuel tank is not active', 400);
    }

    // Validate reading doesn't exceed capacity
    if (Number(data.readingValue) > Number(tank.capacity)) {
      return apiError('Reading value exceeds tank capacity', 400);
    }

    // Get count for sequential numbering (internal tracking)
    const readingCount = await db.fuelReading.count();

    // Use transaction to update both reading and tank level
    const fuelReading = await db.$transaction(async (tx) => {
      // Create the reading
      const reading = await tx.fuelReading.create({
        data: {
          tankId: data.tankId,
          readingValue: data.readingValue,
          readingAt: data.readingAt ? new Date(data.readingAt) : new Date(),
          readingBy: data.readingBy,
          notes: data.notes,
        },
        include: {
          tank: {
            select: {
              id: true,
              tankNumber: true,
              name: true,
              fuelType: true,
              capacity: true,
            }
          }
        },
      });

      // Update tank current level
      await tx.fuelTank.update({
        where: { id: data.tankId },
        data: {
          currentLevel: data.readingValue,
        },
      });

      return reading;
    });

    // Calculate additional metrics
    const capacityNum = Number(tank.capacity);
    const readingValueNum = Number(data.readingValue);
    const capacityPercent = capacityNum > 0 ? (readingValueNum / capacityNum) * 100 : 0;

    // Get the previous reading for comparison
    const previousReading = await db.fuelReading.findFirst({
      where: {
        tankId: data.tankId,
        id: { not: fuelReading.id },
      },
      orderBy: { readingAt: 'desc' },
      select: {
        readingValue: true,
        readingAt: true,
      }
    });

    let consumption: number | null = null;
    let daysSinceLastReading: number | null = null;

    if (previousReading) {
      consumption = readingValueNum - Number(previousReading.readingValue);
      const msDiff = new Date(fuelReading.readingAt).getTime() - new Date(previousReading.readingAt).getTime();
      daysSinceLastReading = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    }

    return apiSuccess(
      {
        ...fuelReading,
        displayNumber: generateDocumentNumber('FR', readingCount + 1),
        capacityPercent,
        previousReadingValue: previousReading?.readingValue ?? null,
        previousReadingAt: previousReading?.readingAt ?? null,
        consumption,
        daysSinceLastReading,
      }, 
      'Fuel reading recorded successfully', 
      201
    );
  } catch (error) {
    console.error('Create fuel reading error:', error);
    return apiError('Failed to create fuel reading', 500);
  }
}
