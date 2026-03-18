import { db } from '@/lib/db';
import crypto from 'crypto';

export type WebhookEvent =
  | 'JOB_CARD_CREATED'
  | 'JOB_CARD_UPDATED'
  | 'JOB_CARD_COMPLETED'
  | 'JOB_CARD_CLOSED'
  | 'JOB_CARD_APPROVED'
  | 'JOB_CARD_REJECTED'
  | 'JOB_CARD_RETURNED'
  | 'JOB_CARD_SUBMITTED'
  | 'JOB_CARD_STARTED'
  | 'JOB_CARD_HOLD'
  | 'JOB_CARD_CANCELLED'
  | 'MR_CREATED'
  | 'MR_APPROVED'
  | 'MR_REJECTED'
  | 'GRN_POSTED'
  | 'LOW_STOCK_ALERT'
  | 'PM_COMPLETED'
  | 'INSPECTION_FAILED'
  | 'ASSET_STATUS_CHANGED'
  | 'INVENTORY_ADJUSTED';

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  response?: string;
  error?: string;
}

/**
 * Trigger webhooks for a specific event
 */
export async function triggerWebhooks(
  event: WebhookEvent,
  data: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    // Get all active webhooks subscribed to this event
    const webhooks = await db.webhook.findMany({
      where: { isActive: true },
    });

    const subscribedWebhooks = webhooks.filter(wh => {
      const events: string[] = JSON.parse(wh.events);
      return events.includes(event) || events.includes('*');
    });

    // Send to all subscribed webhooks in parallel
    await Promise.allSettled(
      subscribedWebhooks.map(wh => deliverWebhook(wh, event, data, metadata))
    );
  } catch (error) {
    console.error('Failed to trigger webhooks:', error);
  }
}

/**
 * Deliver a webhook to its endpoint
 */
async function deliverWebhook(
  webhook: { id: string; url: string; secret: string; name: string },
  event: WebhookEvent,
  data: Record<string, unknown>,
  metadata?: Record<string, unknown>
): Promise<WebhookDeliveryResult> {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
    metadata: {
      webhookId: webhook.id,
      webhookName: webhook.name,
      ...metadata,
    },
  };

  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, webhook.secret);

  // Create delivery record
  const delivery = await db.webhookDelivery.create({
    data: {
      webhookId: webhook.id,
      event,
      payload: payloadString,
      status: 'PENDING',
    },
  });

  let result: WebhookDeliveryResult = { success: false };

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WCP-Event': event,
        'X-WCP-Signature': signature,
        'X-WCP-Timestamp': payload.timestamp,
        'X-WCP-Delivery': delivery.id,
        'User-Agent': 'WCP-Webhook/1.0',
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseText = await response.text();

    result = {
      success: response.ok,
      statusCode: response.status,
      response: responseText.slice(0, 1000), // Limit response size
    };

    // Update delivery record
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: response.ok ? 'DELIVERED' : 'FAILED',
        statusCode: response.status,
        response: result.response,
        deliveredAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    // Update webhook last triggered
    if (response.ok) {
      await db.webhook.update({
        where: { id: webhook.id },
        data: {
          lastTriggeredAt: new Date(),
          failureCount: 0,
        },
      });
    } else {
      await incrementFailureCount(webhook.id);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result = { success: false, error: errorMessage };

    // Update delivery record with error
    await db.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'FAILED',
        response: errorMessage,
        attempts: { increment: 1 },
      },
    });

    await incrementFailureCount(webhook.id);
  }

  return result;
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify webhook signature (for receiving webhooks)
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Increment failure count and deactivate if threshold reached
 */
async function incrementFailureCount(webhookId: string): Promise<void> {
  const webhook = await db.webhook.findUnique({
    where: { id: webhookId },
    select: { failureCount: true },
  });

  if (webhook) {
    const newFailureCount = webhook.failureCount + 1;
    
    await db.webhook.update({
      where: { id: webhookId },
      data: {
        failureCount: newFailureCount,
        // Deactivate after 5 consecutive failures
        isActive: newFailureCount < 5,
      },
    });
  }
}

/**
 * Retry failed webhook deliveries
 */
export async function retryFailedDeliveries(): Promise<void> {
  const failedDeliveries = await db.webhookDelivery.findMany({
    where: {
      status: 'FAILED',
      attempts: { lt: 3 },
    },
    include: {
      webhook: true,
    },
    take: 50,
  });

  for (const delivery of failedDeliveries) {
    if (!delivery.webhook.isActive) continue;

    try {
      const payload = JSON.parse(delivery.payload);
      const signature = generateSignature(delivery.payload, delivery.webhook.secret);

      const response = await fetch(delivery.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WCP-Event': delivery.event,
          'X-WCP-Signature': signature,
          'X-WCP-Retry': 'true',
          'X-WCP-Delivery': delivery.id,
          'User-Agent': 'WCP-Webhook/1.0',
        },
        body: delivery.payload,
        signal: AbortSignal.timeout(30000),
      });

      const responseText = await response.text();

      await db.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: response.ok ? 'DELIVERED' : 'FAILED',
          statusCode: response.status,
          response: responseText.slice(0, 1000),
          deliveredAt: response.ok ? new Date() : undefined,
          attempts: { increment: 1 },
        },
      });

      if (response.ok) {
        await db.webhook.update({
          where: { id: delivery.webhookId },
          data: {
            lastTriggeredAt: new Date(),
            failureCount: 0,
          },
        });
      }
    } catch (error) {
      await db.webhookDelivery.update({
        where: { id: delivery.id },
        data: { attempts: { increment: 1 } },
      });
    }
  }
}
