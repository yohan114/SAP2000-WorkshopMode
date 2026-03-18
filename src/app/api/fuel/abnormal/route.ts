import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  apiNotFound,
  apiValidationError,
  parsePagination,
  getSkip,
  getDateRangeFilter
} from '@/lib/api-utils';
import { z } from 'zod';

// Schema for resolving abnormal detection
const resolveAbnormalSchema = z.object({
  resolvedBy: z.string().min(1, 'Resolver ID is required'),
  resolutionNotes: z.string().min(1, 'Resolution notes are required'),
});

// GET /api/fuel/abnormal - List open abnormal detections
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Filter parameters
    const status = url.searchParams.get('status') || 'OPEN';
    const detectionType = url.searchParams.get('detectionType') || undefined;
    const severity = url.searchParams.get('severity') || undefined;
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (status !== 'ALL') {
      where.status = status;
    }
    
    if (detectionType) {
      where.detectionType = detectionType;
    }
    
    if (severity) {
      where.severity = severity;
    }

    // Date range filter
    const dateFilter = getDateRangeFilter(startDate, endDate);
    if (dateFilter) {
      where.detectedAt = dateFilter;
    }

    // Build orderBy - use array for multiple sort criteria
    let orderBy: Record<string, unknown>[];
    if (sortBy) {
      orderBy = [{ [sortBy]: sortOrder }];
    } else {
      // Prioritize HIGH severity and oldest first for OPEN items
      if (status === 'OPEN') {
        orderBy = [{ severity: 'desc' }, { detectedAt: 'asc' }];
      } else {
        orderBy = [{ detectedAt: 'desc' }];
      }
    }

    const [detections, total] = await Promise.all([
      db.abnormalDetection.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          fuelIssue: {
            include: {
              tank: {
                select: { 
                  id: true, 
                  tankNumber: true, 
                  name: true, 
                  fuelType: true 
                }
              },
              asset: {
                select: { 
                  id: true, 
                  assetNumber: true, 
                  name: true 
                }
              }
            }
          }
        },
      }),
      db.abnormalDetection.count({ where }),
    ]);

    // Calculate summary statistics
    const stats = await db.abnormalDetection.groupBy({
      by: ['status', 'severity'],
      where: { status: 'OPEN' },
      _count: true,
    });

    const summary = {
      totalOpen: stats.filter(s => s.status === 'OPEN').reduce((sum, s) => sum + s._count, 0),
      highPriority: stats.filter(s => s.status === 'OPEN' && s.severity === 'HIGH').reduce((sum, s) => sum + s._count, 0),
      mediumPriority: stats.filter(s => s.status === 'OPEN' && s.severity === 'MEDIUM').reduce((sum, s) => sum + s._count, 0),
      lowPriority: stats.filter(s => s.status === 'OPEN' && s.severity === 'LOW').reduce((sum, s) => sum + s._count, 0),
    };

    // Transform data
    const data = detections.map(detection => {
      // Calculate time since detection
      const detectedAt = new Date(detection.detectedAt);
      const now = new Date();
      const hoursSinceDetection = Math.floor((now.getTime() - detectedAt.getTime()) / (1000 * 60 * 60));
      const daysSinceDetection = Math.floor(hoursSinceDetection / 24);

      return {
        id: detection.id,
        detectionType: detection.detectionType,
        referenceType: detection.referenceType,
        referenceId: detection.referenceId,
        severity: detection.severity,
        description: detection.description,
        detectedAt: detection.detectedAt,
        resolvedAt: detection.resolvedAt,
        resolvedBy: detection.resolvedBy,
        resolutionNotes: detection.resolutionNotes,
        status: detection.status,
        createdAt: detection.createdAt,
        hoursSinceDetection,
        daysSinceDetection,
        fuelIssue: detection.fuelIssue ? {
          id: detection.fuelIssue.id,
          issueNumber: detection.fuelIssue.issueNumber,
          quantity: detection.fuelIssue.quantity ? Number(detection.fuelIssue.quantity) : 0,
          tank: detection.fuelIssue.tank,
          asset: detection.fuelIssue.asset,
        } : null,
      };
    });

    return apiPaginated({ data, summary }, total, page, limit);
  } catch (error) {
    console.error('Get abnormal detections error:', error);
    return apiError('Failed to fetch abnormal detections', 500);
  }
}

// POST /api/fuel/abnormal - Resolve an abnormal detection
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check if this is a resolve request or a create request
    if (body.action === 'resolve') {
      return handleResolve(body);
    }
    
    // For creating new abnormal detections manually
    return handleCreate(body);
  } catch (error) {
    console.error('Process abnormal detection error:', error);
    return apiError('Failed to process abnormal detection', 500);
  }
}

// Handle resolving an abnormal detection
async function handleResolve(body: unknown) {
  const resolveSchema = z.object({
    id: z.string().min(1, 'Detection ID is required'),
    resolvedBy: z.string().min(1, 'Resolver ID is required'),
    resolutionNotes: z.string().min(1, 'Resolution notes are required'),
    action: z.literal('resolve'),
  });

  const result = resolveSchema.safeParse(body);
  if (!result.success) {
    return apiValidationError(result.error);
  }

  const data = result.data;

  // Check if detection exists
  const existing = await db.abnormalDetection.findUnique({
    where: { id: data.id },
  });

  if (!existing) {
    return apiNotFound('Abnormal detection');
  }

  if (existing.status === 'RESOLVED') {
    return apiError('Detection is already resolved', 400);
  }

  // Update the detection
  const detection = await db.abnormalDetection.update({
    where: { id: data.id },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedBy: data.resolvedBy,
      resolutionNotes: data.resolutionNotes,
    },
    include: {
      fuelIssue: {
        include: {
          tank: true,
          asset: true,
        }
      }
    },
  });

  // If linked to a fuel issue, update the issue's abnormal status
  if (detection.referenceType === 'FUEL_ISSUE' && detection.fuelIssue) {
    // Check if there are any other open abnormal detections for this fuel issue
    const otherOpenDetections = await db.abnormalDetection.count({
      where: {
        referenceType: 'FUEL_ISSUE',
        referenceId: detection.referenceId,
        status: 'OPEN',
        id: { not: detection.id }
      }
    });

    // If no more open detections, we can optionally clear the abnormal flag
    // This is a design decision - we're keeping the original flag for audit purposes
    // but the issue can be considered "resolved" from an abnormal perspective
  }

  return apiSuccess(detection, 'Abnormal detection resolved successfully');
}

// Handle creating a new abnormal detection manually
async function handleCreate(body: unknown) {
  const createSchema = z.object({
    detectionType: z.enum(['FUEL_CONSUMPTION', 'FUEL_THEFT', 'LEAKAGE', 'OTHER'], {
      errorMap: () => ({ message: 'Invalid detection type' })
    }),
    referenceType: z.string().min(1, 'Reference type is required'),
    referenceId: z.string().min(1, 'Reference ID is required'),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
    description: z.string().min(1, 'Description is required'),
  });

  const result = createSchema.safeParse(body);
  if (!result.success) {
    return apiValidationError(result.error);
  }

  const data = result.data;

  // Create the detection
  const detection = await db.abnormalDetection.create({
    data: {
      detectionType: data.detectionType,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      severity: data.severity,
      description: data.description,
      status: 'OPEN',
    },
    include: {
      fuelIssue: {
        include: {
          tank: true,
          asset: true,
        }
      }
    },
  });

  return apiSuccess(detection, 'Abnormal detection created successfully', 201);
}

// PATCH /api/fuel/abnormal - Bulk resolve multiple detections
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    
    const bulkResolveSchema = z.object({
      ids: z.array(z.string()).min(1, 'At least one ID is required'),
      resolvedBy: z.string().min(1, 'Resolver ID is required'),
      resolutionNotes: z.string().min(1, 'Resolution notes are required'),
    });

    const result = bulkResolveSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;

    // Update all detections
    const updateResult = await db.abnormalDetection.updateMany({
      where: {
        id: { in: data.ids },
        status: 'OPEN',
      },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: data.resolvedBy,
        resolutionNotes: data.resolutionNotes,
      },
    });

    return apiSuccess(
      { 
        updated: updateResult.count,
        requested: data.ids.length 
      }, 
      `Resolved ${updateResult.count} abnormal detection(s)`
    );
  } catch (error) {
    console.error('Bulk resolve abnormal detections error:', error);
    return apiError('Failed to bulk resolve abnormal detections', 500);
  }
}
