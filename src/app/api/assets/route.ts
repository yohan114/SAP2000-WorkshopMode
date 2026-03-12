import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  parsePagination,
  getSkip 
} from '@/lib/api-utils';
import { z } from 'zod';

// Schema for creating asset
const createAssetSchema = z.object({
  assetNumber: z.string().min(1),
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  yearOfManufacture: z.number().int().optional(),
  acquisitionDate: z.string().optional(),
  acquisitionCost: z.number().optional(),
  currentLocation: z.string().optional(),
  status: z.enum(['OPERATIONAL', 'UNDER_REPAIR', 'OUT_OF_SERVICE', 'DISPOSED']).default('OPERATIONAL'),
  criticality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  warrantyExpiry: z.string().optional(),
});

// GET /api/assets - List all assets with pagination
export async function GET(request: Request) {
  try {
    const { page, limit, search, sortBy, sortOrder } = parsePagination(new URL(request.url));
    const skip = getSkip(page, limit);

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };
    
    if (search) {
      where.OR = [
        { assetNumber: { contains: search } },
        { name: { contains: search } },
        { make: { contains: search } },
        { model: { contains: search } },
      ];
    }

    // Build orderBy
    const orderBy: Record<string, unknown> = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [assets, total] = await Promise.all([
      db.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: { id: true, code: true, name: true },
          },
          qrCodes: {
            where: { isActive: true },
            select: { qrCode: true },
            take: 1,
          },
          meters: {
            where: { isActive: true },
            select: { id: true, meterType: true, unit: true, currentValue: true },
          },
          _count: {
            select: { jobCards: true },
          },
        },
      }),
      db.asset.count({ where }),
    ]);

    // Transform data
    const data = assets.map(asset => ({
      id: asset.id,
      assetNumber: asset.assetNumber,
      name: asset.name,
      description: asset.description,
      make: asset.make,
      model: asset.model,
      serialNumber: asset.serialNumber,
      yearOfManufacture: asset.yearOfManufacture,
      currentLocation: asset.currentLocation,
      status: asset.status,
      criticality: asset.criticality,
      category: asset.category,
      qrCode: asset.qrCodes[0]?.qrCode || null,
      meters: asset.meters,
      jobCardCount: asset._count.jobCards,
      createdAt: asset.createdAt,
    }));

    return apiPaginated(data, total, page, limit);
  } catch (error) {
    console.error('Get assets error:', error);
    return apiError('Failed to fetch assets', 500);
  }
}

// POST /api/assets - Create new asset
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const result = createAssetSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.errors[0]?.message);
    }

    const data = result.data;

    // Check if asset number already exists
    const existing = await db.asset.findUnique({
      where: { assetNumber: data.assetNumber },
    });

    if (existing) {
      return apiError('Asset number already exists', 400);
    }

    // Create asset
    const asset = await db.asset.create({
      data: {
        assetNumber: data.assetNumber,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        make: data.make,
        model: data.model,
        serialNumber: data.serialNumber,
        yearOfManufacture: data.yearOfManufacture,
        acquisitionDate: data.acquisitionDate ? new Date(data.acquisitionDate) : undefined,
        acquisitionCost: data.acquisitionCost,
        currentLocation: data.currentLocation,
        status: data.status,
        criticality: data.criticality,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
      },
      include: {
        category: true,
      },
    });

    // Generate QR code
    const qrCode = `WCP-${asset.assetNumber}`;
    const qrHash = Buffer.from(qrCode).toString('base64');
    
    await db.assetQrCode.create({
      data: {
        assetId: asset.id,
        qrCode,
        qrHash,
        isActive: true,
      },
    });

    return apiSuccess({ ...asset, qrCode }, 'Asset created successfully', 201);
  } catch (error) {
    console.error('Create asset error:', error);
    return apiError('Failed to create asset', 500);
  }
}
