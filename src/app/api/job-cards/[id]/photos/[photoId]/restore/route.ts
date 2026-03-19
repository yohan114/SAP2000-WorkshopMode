/**
 * Photo Restore API Route
 * 
 * Handles restoring photos from backup.
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import { restorePhotoFromBackup, getPhotoBackupInfo } from '@/lib/backup';
import { PhotoAuditHelpers } from '@/lib/audit-log';

// POST /api/job-cards/[id]/photos/[photoId]/restore - Restore photo from backup
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id: jobCardId, photoId } = await params;

    // Verify job card exists
    const jobCard = await db.jobCard.findUnique({
      where: { id: jobCardId },
      select: { id: true, jobCardNumber: true }
    });

    if (!jobCard) {
      return apiNotFound('Job card');
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const backupId = body.backupId;
    const userId = body.userId;

    // If backup ID is not provided, find the latest backup
    let targetBackupId = backupId;

    if (!targetBackupId) {
      const backupInfo = await getPhotoBackupInfo(photoId);
      if (backupInfo) {
        targetBackupId = backupInfo.id;
      }
    }

    if (!targetBackupId) {
      return apiError('No backup found for this photo', 404);
    }

    // Restore from backup
    const result = await restorePhotoFromBackup(targetBackupId, { userId });

    if (!result.success) {
      return apiError(result.error || 'Failed to restore photo from backup', 400);
    }

    // Log the restore action
    await PhotoAuditHelpers.logRestore(photoId, jobCardId, targetBackupId, userId, request);

    // Get the restored photo
    const photo = await db.jcPhoto.findUnique({
      where: { id: photoId },
      include: {
        category: {
          select: { id: true, code: true, name: true }
        },
        uploader: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return apiSuccess({
      photo,
      restored: true,
      backupId: targetBackupId
    }, 'Photo restored successfully from backup');
  } catch (error) {
    console.error('Restore photo from backup error:', error);
    return apiError('Failed to restore photo from backup', 500);
  }
}
