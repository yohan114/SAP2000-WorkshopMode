import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';

// GET /api/service-jobs/alerts - Get overdue service alerts
export async function GET() {
  try {
    // Get the latest service job per vehicle (by serviceDate desc)
    // We fetch all active service jobs ordered by serviceDate desc,
    // then filter to only the latest per vehicleNumber
    const allActiveJobs = await db.serviceJob.findMany({
      where: {
        isActive: true,
        status: 'ACTIVE',
      },
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
      },
    });

    // Get only the latest service job per vehicleNumber
    const latestPerVehicle = new Map<string, typeof allActiveJobs[number]>();
    for (const job of allActiveJobs) {
      if (!latestPerVehicle.has(job.vehicleNumber)) {
        latestPerVehicle.set(job.vehicleNumber, job);
      }
    }

    const now = new Date();
    const alerts = Array.from(latestPerVehicle.values()).map((job) => {
      const serviceDate = new Date(job.serviceDate);
      const daysSinceService = Math.floor(
        (now.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      // Consider potentially overdue if serviceDate + 90 days < now
      const isOverdue = daysSinceService > 90;

      return {
        ...job,
        isOverdue,
        daysSinceService,
      };
    });

    // Sort by nextServiceMeter ascending (those closest to overdue first)
    alerts.sort((a, b) => Number(a.nextServiceMeter) - Number(b.nextServiceMeter));

    return apiSuccess(alerts);
  } catch (error) {
    console.error('Get service alerts error:', error);
    return apiError('Failed to fetch service alerts', 500);
  }
}
