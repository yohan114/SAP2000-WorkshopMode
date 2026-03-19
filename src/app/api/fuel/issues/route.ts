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

// Schema for creating fuel issue
const createFuelIssueSchema = z.object({
  tankId: z.string().min(1, 'Tank is required'),
  assetId: z.string().optional(),
  jobCardId: z.string().optional(),
  issuedToId: z.string().min(1, 'Recipient is required'),
  quantity: z.number().positive('Quantity must be positive'),
  previousMeterReading: z.number().min(0).optional(),
  currentMeterReading: z.number().min(0).optional(),
  consumptionNorm: z.number().min(0).optional(),
  issuedAt: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/fuel/issues - List fuel issues with filters
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Filter parameters
    const tankId = url.searchParams.get('tankId') || undefined;
    const assetId = url.searchParams.get('assetId') || undefined;
    const isAbnormal = url.searchParams.get('isAbnormal');
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (tankId) {
      where.tankId = tankId;
    }
    
    if (assetId) {
      where.assetId = assetId;
    }
    
    if (isAbnormal !== null && isAbnormal !== undefined) {
      where.isAbnormal = isAbnormal === 'true';
    }

    // Date range filter
    const dateFilter = getDateRangeFilter(startDate, endDate);
    if (dateFilter) {
      where.issuedAt = dateFilter;
    }

    if (search) {
      where.OR = [
        { issueNumber: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    // Build orderBy
    const orderBy: Record<string, unknown> = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.issuedAt = 'desc';
    }

    const [issues, total] = await Promise.all([
      db.fuelIssue.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          tank: {
            select: { id: true, tankNumber: true, name: true, fuelType: true }
          },
          asset: {
            select: { id: true, assetNumber: true, name: true }
          },
          abnormalFlags: {
            where: { status: 'OPEN' },
            select: { id: true, severity: true, description: true }
          }
        },
      }),
      db.fuelIssue.count({ where }),
    ]);

    // Get unique issuedToIds and fetch employees
    const issuedToIds = [...new Set(issues.map(i => i.issuedToId).filter(Boolean))];
    const users = issuedToIds.length > 0 ? await db.user.findMany({
      where: { id: { in: issuedToIds } },
      select: { id: true, name: true, employeeId: true }
    }) : [];
    const userMap = new Map(users.map(u => [u.id, { id: u.id, name: u.name, employeeNumber: u.employeeId || '' }]));

    // Transform data - convert Decimal to number for JSON serialization
    const data = issues.map(issue => ({
      id: issue.id,
      issueNumber: issue.issueNumber,
      tankId: issue.tankId,
      assetId: issue.assetId,
      issuedToId: issue.issuedToId,
      tank: issue.tank,
      asset: issue.asset,
      issuedTo: userMap.get(issue.issuedToId) || null,
      quantity: issue.quantity ? Number(issue.quantity) : 0,
      previousMeterReading: issue.previousMeterReading ? Number(issue.previousMeterReading) : null,
      currentMeterReading: issue.currentMeterReading ? Number(issue.currentMeterReading) : null,
      consumptionNorm: issue.consumptionNorm ? Number(issue.consumptionNorm) : null,
      isAbnormal: issue.isAbnormal,
      abnormalReason: issue.abnormalReason,
      issuedAt: issue.issuedAt,
      notes: issue.notes,
      abnormalFlags: issue.abnormalFlags,
      createdAt: issue.createdAt,
    }));

    return apiPaginated(data, total, page, limit);
  } catch (error) {
    console.error('Get fuel issues error:', error);
    return apiError('Failed to fetch fuel issues', 500);
  }
}

// POST /api/fuel/issues - Create fuel issue with abnormal detection logic
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const result = createFuelIssueSchema.safeParse(body);
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

    // Check if there's enough fuel
    if (Number(tank.currentLevel) < data.quantity) {
      return apiError('Insufficient fuel in tank', 400);
    }

    // Determine if this is an abnormal consumption
    let isAbnormal = false;
    let abnormalReason: string | null = null;
    let consumptionRate: number | null = null;
    let normalConsumptionRate: number | null = null;

    // Calculate consumption rate if meter readings are provided
    if (data.previousMeterReading !== undefined && 
        data.currentMeterReading !== undefined && 
        data.quantity > 0) {
      
      const meterDiff = data.currentMeterReading - data.previousMeterReading;
      
      if (meterDiff > 0) {
        // Calculate consumption rate: liters per unit (km/hours)
        consumptionRate = data.quantity / meterDiff;
        
        // Get the consumption norm if provided, otherwise try to calculate from history
        normalConsumptionRate = data.consumptionNorm ?? null;
        
        // If no norm provided, calculate from historical data
        if (!normalConsumptionRate && data.assetId) {
          const historicalIssues = await db.fuelIssue.findMany({
            where: {
              assetId: data.assetId,
              isAbnormal: false,
              previousMeterReading: { not: null },
              currentMeterReading: { not: null },
            },
            take: 10,
            orderBy: { issuedAt: 'desc' },
            select: {
              quantity: true,
              previousMeterReading: true,
              currentMeterReading: true,
            }
          });

          if (historicalIssues.length > 0) {
            const rates = historicalIssues
              .filter(i => 
                i.previousMeterReading !== null && 
                i.currentMeterReading !== null &&
                Number(i.currentMeterReading) > Number(i.previousMeterReading)
              )
              .map(i => 
                Number(i.quantity) / (Number(i.currentMeterReading) - Number(i.previousMeterReading!))
              );

            if (rates.length > 0) {
              normalConsumptionRate = rates.reduce((a, b) => a + b, 0) / rates.length;
            }
          }
        }

        // Check for abnormal consumption (> 1.5x normal rate)
        if (normalConsumptionRate && consumptionRate > normalConsumptionRate * 1.5) {
          isAbnormal = true;
          abnormalReason = `High consumption rate: ${consumptionRate.toFixed(3)} L/unit vs normal ${normalConsumptionRate.toFixed(3)} L/unit (${((consumptionRate / normalConsumptionRate - 1) * 100).toFixed(1)}% above normal)`;
        }
      }
    }

    // Get count for sequential numbering
    const issueCount = await db.fuelIssue.count();
    const issueNumber = generateDocumentNumber('FI', issueCount + 1);

    // Use a transaction to ensure atomicity
    const fuelIssue = await db.$transaction(async (tx) => {
      // Create the fuel issue
      const issue = await tx.fuelIssue.create({
        data: {
          issueNumber,
          tankId: data.tankId,
          assetId: data.assetId,
          jobCardId: data.jobCardId,
          issuedToId: data.issuedToId,
          quantity: data.quantity,
          previousMeterReading: data.previousMeterReading,
          currentMeterReading: data.currentMeterReading,
          consumptionNorm: normalConsumptionRate,
          isAbnormal,
          abnormalReason,
          issuedAt: data.issuedAt ? new Date(data.issuedAt) : new Date(),
          notes: data.notes,
        },
        include: {
          tank: true,
          asset: true,
        },
      });

      // Update tank level
      await tx.fuelTank.update({
        where: { id: data.tankId },
        data: {
          currentLevel: Number(tank.currentLevel) - data.quantity,
        },
      });

      // If abnormal, create AbnormalDetection record
      if (isAbnormal) {
        await tx.abnormalDetection.create({
          data: {
            detectionType: 'FUEL_CONSUMPTION',
            referenceType: 'FUEL_ISSUE',
            referenceId: issue.id,
            severity: consumptionRate && normalConsumptionRate && consumptionRate > normalConsumptionRate * 2 
              ? 'HIGH' 
              : 'MEDIUM',
            description: abnormalReason || 'Abnormal fuel consumption detected',
            status: 'OPEN',
          },
        });
      }

      return issue;
    });

    return apiSuccess(
      {
        ...fuelIssue,
        consumptionRate,
        normalConsumptionRate,
        isAbnormal,
        abnormalReason,
      }, 
      isAbnormal 
        ? 'Fuel issue created with abnormal consumption flag' 
        : 'Fuel issue created successfully', 
      201
    );
  } catch (error) {
    console.error('Create fuel issue error:', error);
    return apiError('Failed to create fuel issue', 500);
  }
}
