import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  secret: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/webhooks/[id] - Get webhook details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const webhook = await db.webhook.findUnique({
      where: { id },
      include: {
        deliveries: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { deliveries: true },
        },
      },
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...webhook,
        secret: webhook.secret ? '••••••••' + webhook.secret.slice(-4) : null,
        events: JSON.parse(webhook.events),
      },
    });
  } catch (error) {
    console.error('Failed to fetch webhook:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook' },
      { status: 500 }
    );
  }
}

// PUT /api/webhooks/[id] - Update webhook
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateWebhookSchema.parse(body);

    const updateData: Record<string, unknown> = { ...validated };
    if (validated.events) {
      updateData.events = JSON.stringify(validated.events);
    }

    const webhook = await db.webhook.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: webhook });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Failed to update webhook:', error);
    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    );
  }
}

// DELETE /api/webhooks/[id] - Delete webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.webhook.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete webhook:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}
