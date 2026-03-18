import { db } from '@/lib/db';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'APPROVE'
  | 'REJECT'
  | 'ASSIGN'
  | 'COMPLETE'
  | 'CANCEL'
  | 'POST'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT';

export type EntityType =
  | 'JOB_CARD'
  | 'ASSET'
  | 'ITEM'
  | 'SUPPLIER'
  | 'PURCHASE_ORDER'
  | 'GRN'
  | 'MATERIAL_REQUEST'
  | 'INVENTORY'
  | 'USER'
  | 'QUALITY_INSPECTION'
  | 'STOCK_TAKE'
  | 'INVOICE'
  | 'WEBHOOK';

interface AuditLogInput {
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  actorId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  request?: Request;
}

/**
 * Log an audit event
 */
export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        actorId: input.actorId || 'system',
        oldValue: input.oldValue ? JSON.stringify(input.oldValue) : null,
        newValue: input.newValue ? JSON.stringify(input.newValue) : null,
        ipAddress: input.request?.headers.get('x-forwarded-for') ||
                   input.request?.headers.get('x-real-ip') ||
                   'unknown',
        userAgent: input.request?.headers.get('user-agent') || 'unknown',
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Get entity history
 */
export async function getEntityHistory(
  entityType: EntityType,
  entityId: string,
  limit: number = 20
) {
  return db.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Get user activity
 */
export async function getUserActivity(
  userId: string,
  options?: {
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }
) {
  const where: Record<string, unknown> = { userId };
  
  if (options?.fromDate || options?.toDate) {
    where.createdAt = {};
    if (options.fromDate) where.createdAt.gte = options.fromDate;
    if (options.toDate) where.createdAt.lte = options.toDate;
  }

  return db.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
  });
}

/**
 * Audit trail helper for common operations
 */
export const AuditHelpers = {
  logCreate: (
    entityType: EntityType,
    entityId: string,
    newValue: Record<string, unknown>,
    actorId?: string,
    request?: Request
  ) => auditLog({
    action: 'CREATE',
    entityType,
    entityId,
    newValue,
    actorId,
    request,
  }),

  logUpdate: (
    entityType: EntityType,
    entityId: string,
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
    actorId?: string,
    request?: Request
  ) => auditLog({
    action: 'UPDATE',
    entityType,
    entityId,
    oldValue,
    newValue,
    actorId,
    request,
  }),

  logDelete: (
    entityType: EntityType,
    entityId: string,
    oldValue: Record<string, unknown>,
    actorId?: string,
    request?: Request
  ) => auditLog({
    action: 'DELETE',
    entityType,
    entityId,
    oldValue,
    actorId,
    request,
  }),

  logStatusChange: (
    entityType: EntityType,
    entityId: string,
    oldStatus: string,
    newStatus: string,
    actorId?: string,
    request?: Request
  ) => auditLog({
    action: 'STATUS_CHANGE',
    entityType,
    entityId,
    oldValue: { status: oldStatus },
    newValue: { status: newStatus },
    actorId,
    request,
  }),

  logApprove: (
    entityType: EntityType,
    entityId: string,
    actorId: string,
    request?: Request
  ) => auditLog({
    action: 'APPROVE',
    entityType,
    entityId,
    actorId,
    request,
  }),

  logReject: (
    entityType: EntityType,
    entityId: string,
    reason: string,
    actorId: string,
    request?: Request
  ) => auditLog({
    action: 'REJECT',
    entityType,
    entityId,
    metadata: { reason },
    actorId,
    request,
  }),

  logAssign: (
    entityType: EntityType,
    entityId: string,
    assigneeId: string,
    actorId?: string,
    request?: Request
  ) => auditLog({
    action: 'ASSIGN',
    entityType,
    entityId,
    newValue: { assigneeId },
    actorId,
    request,
  }),

  logExport: (
    entityType: EntityType,
    format: string,
    count: number,
    actorId: string,
    request?: Request
  ) => auditLog({
    action: 'EXPORT',
    entityType,
    entityId: 'batch',
    metadata: { format, count },
    actorId,
    request,
  }),

  logImport: (
    entityType: EntityType,
    filename: string,
    count: number,
    actorId: string,
    request?: Request
  ) => auditLog({
    action: 'IMPORT',
    entityType,
    entityId: 'batch',
    metadata: { filename, count },
    actorId,
    request,
  }),
};
