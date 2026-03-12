import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import { z } from 'zod';

const createMeterSchema = z.object({
  meterType: z.enum(['ODOMETER', 'HOUR_METER', 'CYCLE_COUNTER', 'OTHER']),
  unit: z.string().min(1),
  currentValue: z.number().min(0).default(0),
});

const addReadingSchema = z.object({
  readingValue: z.number().min(0),
  readingSource: z.string().optional(),
  overrideReason: z.string().optional(),
});

// GET /api/assets/[id]/meters - Get asset meters
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const asset = await db.asset.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });

    if (!asset || !asset.isActive) {
      return apiNotFound('Asset');
    }

    const meters = await db.assetMeter.findMany({
      where: { assetId: id, isActive: true },
      include: {
        readings: {
          orderBy: { readingAt: 'desc' },
          take: 20,
        },
      },
    });

    return apiSuccess(meters);
  } catch (error) {
    console.error('Get meters error:', error);
    return apiError('Failed to fetch meters', 500);
  }
}

// POST /api/assets/[id]/meters - Create meter or add reading
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const asset = await db.asset.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });

    if (!asset || !asset.isActive) {
      return apiNotFound('Asset');
    }

    // Check if this is a new meter or a reading
    if (body.meterId) {
      // Adding a reading to existing meter
      const result = addReadingSchema.safeParse(body);
      if (!result.success) {
        return apiError('Validation failed', 400, result.error.errors[0]?.message);
      }

      const meter = await db.assetMeter.findUnique({
        where: { id: body.meterId, assetId: id },
      });

      if (!meter || !meter.isActive) {
        return apiNotFound('Meter');
      }

      const reading = await db.meterReading.create({
        data: {
          meterId: meter.id,
          readingValue: result.data.readingValue,
          readingSource: result.data.readingSource,
          overrideReason: result.data.overrideReason,
        },
      });

      // Update meter current value
      await db.assetMeter.update({
        where: { id: meter.id },
        data: {
          currentValue: result.data.readingValue,
          lastReadingAt: new Date(),
        },
      });

      return apiSuccess(reading, 'Reading recorded successfully', 201);
    } else {
      // Creating a new meter
      const result = createMeterSchema.safeParse(body);
      if (!result.success) {
        return apiError('Validation failed', 400, result.error.errors[0]?.message);
      }

      // Check if meter type already exists for this asset
      const existing = await db.assetMeter.findFirst({
        where: { assetId: id, meterType: result.data.meterType, isActive: true },
      });

      if (existing) {
        return apiError('Meter type already exists for this asset', 400);
      }

      const meter = await db.assetMeter.create({
        data: {
          assetId: id,
          meterType: result.data.meterType,
          unit: result.data.unit,
          currentValue: result.data.currentValue,
        },
      });

      return apiSuccess(meter, 'Meter created successfully', 201);
    }
  } catch (error) {
    console.error('Create meter/reading error:', error);
    return apiError('Failed to create meter/reading', 500);
  }
}
