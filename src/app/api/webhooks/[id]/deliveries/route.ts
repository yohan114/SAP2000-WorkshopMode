import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * @openapi
 * /webhooks/{id}/deliveries:
 *   get:
 *     tags:
 *       - Webhooks
 *     summary: Get webhook delivery history
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, DELIVERED, FAILED]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Delivery history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = { webhookId: id };
    if (status) {
      where.status = status;
    }

    const [deliveries, total] = await Promise.all([
      db.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.webhookDelivery.count({ where }),
    ]);

    return NextResponse.json({
      data: deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch deliveries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deliveries' },
      { status: 500 }
    );
  }
}
