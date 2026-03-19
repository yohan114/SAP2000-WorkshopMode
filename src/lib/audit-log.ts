/**
 * Photo Audit Logging Utility
 * 
 * Comprehensive audit logging for photo operations including:
 * - Photo uploads
 * - Photo updates (edit)
 * - Photo delete (soft and permanent)
 * - Bulk operations (move, delete)
 * - Backup and restore operations
 */

import { db } from '@/lib/db';

// Action types for photo audit log
export type PhotoAuditAction =
  | 'UPLOAD'
  | 'UPDATE'
  | 'DELETE_SOFT'
  | 'DELETE_PERMANENT'
  | 'RESTORE'
  | 'BACKUP'
  | 'BULK_MOVE'
  | 'BULK_DELETE'
  | 'CATEGORY_CHANGE'
  | 'TAG_UPDATE'
  | 'DESCRIPTION_UPDATE';

// Entity types for photo audit log
export type PhotoEntityType = 'PHOTO' | 'PHOTO_CATEGORY' | 'PHOTO_BACKUP';

// Input interface for creating photo audit log
interface PhotoAuditLogInput {
  photoId?: string | null;
  jobCardId: string;
  action: PhotoAuditAction;
  entityType?: PhotoEntityType;
  entityId?: string | null;
  userId?: string | null;
  details?: Record<string, unknown> | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  request?: Request;
}

/**
 * Log a photo audit event
 */
export async function logPhotoAudit(input: PhotoAuditLogInput): Promise<void> {
  try {
    await db.photoAuditLog.create({
      data: {
        photoId: input.photoId || null,
        jobCardId: input.jobCardId,
        action: input.action,
        entityType: input.entityType || 'PHOTO',
        entityId: input.entityId || input.photoId || null,
        userId: input.userId || null,
        details: input.details ? JSON.stringify(input.details) : null,
        ipAddress: input.request?.headers.get('x-forwarded-for') ||
                   input.request?.headers.get('x-real-ip') ||
                   null,
        userAgent: input.request?.headers.get('user-agent') || null,
        oldValue: input.oldValue ? JSON.stringify(input.oldValue) : null,
        newValue: input.newValue ? JSON.stringify(input.newValue) : null,
      },
    });
    console.log(`[PhotoAudit] Logged: ${input.action} for photo ${input.photoId || 'bulk'}`);
  } catch (error) {
    console.error('[PhotoAudit] Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Helper functions for common photo audit operations
 */
export const PhotoAuditHelpers = {
  /**
   * Log photo upload
   */
  logUpload: (
    photo: {
      id: string;
      jobCardId: string;
      fileName: string;
      fileSize?: number | null;
      categoryId?: string | null;
      uploadedBy?: string | null;
    },
    request?: Request
  ) => logPhotoAudit({
    photoId: photo.id,
    jobCardId: photo.jobCardId,
    action: 'UPLOAD',
    userId: photo.uploadedBy,
    newValue: {
      fileName: photo.fileName,
      fileSize: photo.fileSize,
      categoryId: photo.categoryId,
    },
    request,
  }),

  /**
   * Log photo update
   */
  logUpdate: (
    photoId: string,
    jobCardId: string,
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
    userId?: string,
    request?: Request
  ) => logPhotoAudit({
    photoId,
    jobCardId,
    action: 'UPDATE',
    userId,
    oldValue,
    newValue,
    request,
  }),

  /**
   * Log soft delete
   */
  logSoftDelete: (
    photoId: string,
    jobCardId: string,
    photoDetails: Record<string, unknown>,
    userId?: string,
    request?: Request
  ) => logPhotoAudit({
    photoId,
    jobCardId,
    action: 'DELETE_SOFT',
    userId,
    oldValue: photoDetails,
    details: { deleteType: 'soft' },
    request,
  }),

  /**
   * Log permanent delete
   */
  logPermanentDelete: (
    photoId: string,
    jobCardId: string,
    photoDetails: Record<string, unknown>,
    userId?: string,
    request?: Request
  ) => logPhotoAudit({
    photoId,
    jobCardId,
    action: 'DELETE_PERMANENT',
    userId,
    oldValue: photoDetails,
    details: { deleteType: 'permanent', fileDeleted: true },
    request,
  }),

  /**
   * Log photo restore (from backup)
   */
  logRestore: (
    photoId: string,
    jobCardId: string,
    backupId: string,
    userId?: string,
    request?: Request
  ) => logPhotoAudit({
    photoId,
    jobCardId,
    action: 'RESTORE',
    userId,
    details: { backupId },
    request,
  }),

  /**
   * Log backup creation
   */
  logBackup: (
    photoId: string,
    jobCardId: string,
    backupId: string,
    backupPath: string,
    userId?: string,
    request?: Request
  ) => logPhotoAudit({
    photoId,
    jobCardId,
    action: 'BACKUP',
    entityType: 'PHOTO_BACKUP',
    entityId: backupId,
    userId,
    newValue: { backupPath },
    request,
  }),

  /**
   * Log bulk move operation
   */
  logBulkMove: (
    jobCardId: string,
    photoIds: string[],
    targetCategoryId: string,
    userId?: string,
    request?: Request
  ) => logPhotoAudit({
    photoId: null, // Bulk operation
    jobCardId,
    action: 'BULK_MOVE',
    userId,
    details: {
      photoCount: photoIds.length,
      photoIds,
      targetCategoryId,
    },
    request,
  }),

  /**
   * Log bulk delete operation
   */
  logBulkDelete: (
    jobCardId: string,
    photoIds: string[],
    deleteType: 'soft' | 'permanent',
    userId?: string,
    request?: Request
  ) => logPhotoAudit({
    photoId: null, // Bulk operation
    jobCardId,
    action: 'BULK_DELETE',
    userId,
    details: {
      photoCount: photoIds.length,
      photoIds,
      deleteType,
    },
    request,
  }),

  /**
   * Log category change
   */
  logCategoryChange: (
    photoId: string,
    jobCardId: string,
    oldCategoryId: string | null,
    newCategoryId: string,
    userId?: string,
    request?: Request
  ) => logPhotoAudit({
    photoId,
    jobCardId,
    action: 'CATEGORY_CHANGE',
    userId,
    oldValue: { categoryId: oldCategoryId },
    newValue: { categoryId: newCategoryId },
    request,
  }),

  /**
   * Log description update
   */
  logDescriptionUpdate: (
    photoId: string,
    jobCardId: string,
    oldDescription: string | null,
    newDescription: string | null,
    userId?: string,
    request?: Request
  ) => logPhotoAudit({
    photoId,
    jobCardId,
    action: 'DESCRIPTION_UPDATE',
    userId,
    oldValue: { description: oldDescription },
    newValue: { description: newDescription },
    request,
  }),
};

/**
 * Get audit logs for a specific photo
 */
export async function getPhotoAuditLogs(
  photoId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  return db.photoAuditLog.findMany({
    where: { photoId },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 20,
    skip: options?.offset || 0,
  });
}

/**
 * Get audit logs for a job card's photos
 */
export async function getJobCardPhotoAuditLogs(
  jobCardId: string,
  options?: {
    limit?: number;
    offset?: number;
    action?: PhotoAuditAction;
  }
) {
  const where: Record<string, unknown> = { jobCardId };
  
  if (options?.action) {
    where.action = options.action;
  }
  
  return db.photoAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  });
}

/**
 * Get recent photo audit activity
 */
export async function getRecentPhotoAuditActivity(
  options?: {
    limit?: number;
    userId?: string;
    jobCardId?: string;
    action?: PhotoAuditAction;
  }
) {
  const where: Record<string, unknown> = {};
  
  if (options?.userId) {
    where.userId = options.userId;
  }
  
  if (options?.jobCardId) {
    where.jobCardId = options.jobCardId;
  }
  
  if (options?.action) {
    where.action = options.action;
  }
  
  return db.photoAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 100,
  });
}

/**
 * Get photo audit statistics
 */
export async function getPhotoAuditStats(
  jobCardId?: string,
  dateRange?: {
    from: Date;
    to: Date;
  }
) {
  const where: Record<string, unknown> = {};
  
  if (jobCardId) {
    where.jobCardId = jobCardId;
  }
  
  if (dateRange) {
    where.createdAt = {
      gte: dateRange.from,
      lte: dateRange.to,
    };
  }
  
  const logs = await db.photoAuditLog.findMany({
    where,
    select: {
      action: true,
      createdAt: true,
    },
  });
  
  // Group by action
  const byAction: Record<string, number> = {};
  for (const log of logs) {
    byAction[log.action] = (byAction[log.action] || 0) + 1;
  }
  
  return {
    total: logs.length,
    byAction,
  };
}
