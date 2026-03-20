import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiError, 
  apiNotFound,
  apiValidationError
} from '@/lib/api-utils';
import { z } from 'zod';

// Schema for updating fuel tank
const updateFuelTankSchema = z.object({
  name: z.string().min(1).optional(),
  fuelType: z.enum(['DIESEL', 'PETROL', 'OIL', 'KEROSENE']).optional(),
  capacity: z.number().positive().optional(),
  currentLevel: z.number().min(0).optional(),
  location: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/fuel/tanks/[id] - Get tank details with current readings
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tank = await db.fuelTank.findUnique({
      where: { id },
      include: {
        readings: {
          orderBy: { readingAt: 'desc' },
          take: 10,
          select: {
            id: true,
            readingValue: true,
            readingAt: true,
            readingBy: true,
            notes: true,
          }
        },
        issues: {
          orderBy: { issuedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            issueNumber: true,
            quantity: true,
            isAbnormal: true,
            issuedAt: true,
            asset: {
              select: { id: true, assetNumber: true, name: true }
            }
          }
        },
        _count: {
          select: { issues: true, readings: true }
        }
      },
    });

    if (!tank) {
      return apiNotFound('Fuel tank');
    }

    // Calculate tank statistics
    const capacityNum = Number(tank.capacity);
    const currentLevelNum = Number(tank.currentLevel);
    const capacityPercent = capacityNum > 0 ? (currentLevelNum / capacityNum) * 100 : 0;

    // Calculate average daily consumption from recent issues
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentIssues = await db.fuelIssue.findMany({
      where: {
        tankId: id,
        issuedAt: { gte: thirtyDaysAgo }
      },
      select: { quantity: true, issuedAt: true }
    });

    const totalConsumption = recentIssues.reduce((sum, issue) => 
      sum + Number(issue.quantity), 0
    );
    const avgDailyConsumption = totalConsumption / 30;

    // Estimate days until empty
    const daysUntilEmpty = avgDailyConsumption > 0 
      ? Math.floor(currentLevelNum / avgDailyConsumption) 
      : null;

    const data = {
      ...tank,
      capacityPercent,
      statistics: {
        totalIssues: tank._count.issues,
        totalReadings: tank._count.readings,
        avgDailyConsumption: Math.round(avgDailyConsumption * 100) / 100,
        daysUntilEmpty,
        last30DaysConsumption: totalConsumption,
      }
    };

    return apiSuccess(data);
  } catch (error) {
    console.error('Get fuel tank error:', error);
    return apiError('Failed to fetch fuel tank', 500);
  }
}

// PUT /api/fuel/tanks/[id] - Update tank
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const result = updateFuelTankSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;

    // Check if tank exists
    const existing = await db.fuelTank.findUnique({
      where: { id },
    });

    if (!existing) {
      return apiNotFound('Fuel tank');
    }

    // Validate capacity vs current level
    if (data.capacity && data.currentLevel === undefined) {
      if (Number(existing.currentLevel) > data.capacity) {
        return apiError('Current level exceeds new capacity', 400);
      }
    } else if (data.currentLevel !== undefined && data.capacity === undefined) {
      if (data.currentLevel > Number(existing.capacity)) {
        return apiError('Current level exceeds capacity', 400);
      }
    } else if (data.capacity && data.currentLevel !== undefined) {
      if (data.currentLevel > data.capacity) {
        return apiError('Current level exceeds capacity', 400);
      }
    }

    // Update tank
    const tank = await db.fuelTank.update({
      where: { id },
      data: {
        name: data.name,
        fuelType: data.fuelType,
        capacity: data.capacity,
        currentLevel: data.currentLevel,
        location: data.location,
        isActive: data.isActive,
      },
    });

    return apiSuccess(tank, 'Fuel tank updated successfully');
  } catch (error) {
    console.error('Update fuel tank error:', error);
    return apiError('Failed to update fuel tank', 500);
  }
}

// DELETE /api/fuel/tanks/[id] - Soft delete tank
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if tank exists
    const existing = await db.fuelTank.findUnique({
      where: { id },
      include: {
        _count: {
          select: { issues: true }
        }
      }
    });

    if (!existing) {
      return apiNotFound('Fuel tank');
    }

    // Check for active issues
    const activeIssues = await db.fuelIssue.count({
      where: {
        tankId: id,
        issuedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    if (activeIssues > 0) {
      return apiError('Cannot delete tank with recent fuel issues', 400);
    }

    // Soft delete
    const tank = await db.fuelTank.update({
      where: { id },
      data: { isActive: false },
    });

    return apiSuccess(tank, 'Fuel tank deactivated successfully');
  } catch (error) {
    console.error('Delete fuel tank error:', error);
    return apiError('Failed to delete fuel tank', 500);
  }
}
