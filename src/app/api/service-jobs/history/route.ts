import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';

// GET /api/service-jobs/history - Get service history for a vehicle or asset
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const vehicleNumber = url.searchParams.get('vehicleNumber');
    const assetId = url.searchParams.get('assetId');

    if (!vehicleNumber && !assetId) {
      return apiError('Either vehicleNumber or assetId query parameter is required', 400);
    }

    const where: Record<string, unknown> = { isActive: true };

    if (vehicleNumber) {
      where.vehicleNumber = vehicleNumber;
    }

    if (assetId) {
      where.assetId = assetId;
    }

    const serviceJobs = await db.serviceJob.findMany({
      where,
      orderBy: { serviceDate: 'desc' },
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
        manHours: true,
        consumables: true,
      },
    });

    // Add computed isOverdue field based on date (if serviceDate + 90 days < now)
    const now = new Date();
    const data = serviceJobs.map((job) => {
      const serviceDate = new Date(job.serviceDate);
      const daysSinceService = Math.floor(
        (now.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isOverdue = daysSinceService > 90;

      return {
        ...job,
        isOverdue,
        daysSinceService,
      };
    });

    return apiSuccess(data);
  } catch (error) {
    console.error('Get service history error:', error);
    return apiError('Failed to fetch service history', 500);
  }
}
