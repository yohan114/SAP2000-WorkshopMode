import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

/**
 * @openapi
 * /webhooks:
 *   get:
 *     tags:
 *       - Webhooks
 *     summary: List all webhooks
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of webhooks
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Create a new webhook
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - url
 *               - events
 *             properties:
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               secret:
 *                 type: string
 *     responses:
 *       201:
 *         description: Webhook created
 */

const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/webhooks - List all webhooks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const webhooks = await db.webhook.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mask the secret in response
    const maskedWebhooks = webhooks.map(wh => ({
      ...wh,
      secret: wh.secret ? '••••••••' + wh.secret.slice(-4) : null,
    }));

    return NextResponse.json({ data: maskedWebhooks });
  } catch (error) {
    console.error('Failed to fetch webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 }
    );
  }
}

// POST /api/webhooks - Create webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createWebhookSchema.parse(body);

    // Generate secret if not provided
    const secret = validated.secret || generateSecret();

    const webhook = await db.webhook.create({
      data: {
        name: validated.name,
        url: validated.url,
        secret: secret,
        events: JSON.stringify(validated.events),
        isActive: validated.isActive ?? true,
      },
    });

    return NextResponse.json(
      { data: { ...webhook, secret: secret } }, // Return full secret on creation only
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Failed to create webhook:', error);
    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    );
  }
}

function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'whsec_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
