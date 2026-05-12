import { db } from '@/lib/db';
import {
  apiSuccess,
  apiPaginated,
  apiError,
  apiValidationError,
  apiNotFound,
  parsePagination,
  getSkip,
} from '@/lib/api-utils';
import { z } from 'zod';

// Schema for creating a service job
const createServiceJobSchema = z.object({
  serviceDate: z.string().min(1, 'Service date is required'),
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  assetId: z.string().optional(),
  site: z.string().min(1, 'Site is required'),
  lastServiceMeter: z.number(),
  currentServiceMeter: z.number(),
  intervalId: z.string().optional(),
  serviceInterval: z.number(),
  oilQuantity: z.number().optional(),
  filterUsed: z.string().optional(),
  remarks: z.string().optional(),
  industrialUse: z.string().optional(),
  minimumCharge: z.number().optional(),
  totalCharge: z.number().optional(),
});

// GET /api/service-jobs - List service jobs with pagination and filters
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Filter parameters
    const status = url.searchParams.get('status');
    const site = url.searchParams.get('site');
    const vehicleNumber = url.searchParams.get('vehicleNumber');
    const assetId = url.searchParams.get('assetId');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };

    if (status) {
      where.status = status;
    }

    if (site) {
      where.site = site;
    }

    if (vehicleNumber) {
      where.vehicleNumber = vehicleNumber;
    }

    if (assetId) {
      where.assetId = assetId;
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, unknown> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.serviceDate = dateFilter;
    }

    if (search) {
      where.OR = [
        { jobNumber: { contains: search } },
        { vehicleNumber: { contains: search } },
        { site: { contains: search } },
        { remarks: { contains: search } },
      ];
    }

    // Build orderBy
    const orderBy: Record<string, unknown> = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [jobs, total] = await Promise.all([
      db.serviceJob.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          asset: {
            select: {
              id: true,
              assetNumber: true,
              name: true,
            },
          },
          interval: {
            select: {
              id: true,
              name: true,
              intervalValue: true,
              unit: true,
            },
          },
          _count: {
            select: {
              manHours: true,
              consumables: true,
            },
          },
        },
      }),
      db.serviceJob.count({ where }),
    ]);

    return apiPaginated(jobs, total, page, limit);
  } catch (error) {
    console.error('Get service jobs error:', error);
    return apiError('Failed to fetch service jobs', 500);
  }
}

// POST /api/service-jobs - Create a new service job
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = createServiceJobSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;

    // Verify asset exists if provided
    if (data.assetId) {
      const asset = await db.asset.findUnique({
        where: { id: data.assetId },
      });

      if (!asset || !asset.isActive) {
        return apiNotFound('Asset');
      }
    }

    // Auto-calculate nextServiceMeter
    const nextServiceMeter = data.currentServiceMeter + data.serviceInterval;

    // Generate job number with retry loop for race condition handling
    const MAX_RETRIES = 3;
    let serviceJob;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // Generate job number: YYYY/S/MM/NNN
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const prefix = `${year}/S/${month}/`;

      const existingCount = await db.serviceJob.count({
        where: {
          jobNumber: { startsWith: prefix },
        },
      });

      const seq = (existingCount + 1 + attempt).toString().padStart(3, '0');
      const jobNumber = `${prefix}${seq}`;

      try {
        // Create service job
        serviceJob = await db.serviceJob.create({
          data: {
            jobNumber,
            serviceDate: new Date(data.serviceDate),
            vehicleNumber: data.vehicleNumber,
            assetId: data.assetId,
            site: data.site,
            lastServiceMeter: data.lastServiceMeter,
            currentServiceMeter: data.currentServiceMeter,
            serviceInterval: data.serviceInterval,
            nextServiceMeter,
            intervalId: data.intervalId,
            oilQuantity: data.oilQuantity,
            filterUsed: data.filterUsed,
            remarks: data.remarks,
            industrialUse: data.industrialUse,
            minimumCharge: data.minimumCharge,
            totalCharge: data.totalCharge,
            status: 'ACTIVE',
          },
          include: {
            asset: {
              select: {
                id: true,
                assetNumber: true,
                name: true,
              },
            },
            interval: {
              select: {
                id: true,
                name: true,
                intervalValue: true,
                unit: true,
              },
            },
          },
        });
        break; // Success - exit retry loop
      } catch (createError: unknown) {
        // Check for unique constraint violation (P2002)
        const prismaError = createError as { code?: string };
        if (prismaError.code === 'P2002' && attempt < MAX_RETRIES - 1) {
          // Retry with next sequence number
          continue;
        }
        throw createError;
      }
    }

    if (!serviceJob) {
      return apiError('Failed to generate unique job number after retries', 500);
    }

    return apiSuccess(serviceJob, 'Service job created successfully', 201);
  } catch (error) {
    console.error('Create service job error:', error);
    return apiError('Failed to create service job', 500);
  }
}
