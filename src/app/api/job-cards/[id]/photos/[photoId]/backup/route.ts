/**
 * Photo Backup API Route
 * 
 * Handles creating backups for individual photos.
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import { backupPhoto, getPhotoBackupInfo } from '@/lib/backup';
import { PhotoAuditHelpers } from '@/lib/audit-log';

// POST /api/job-cards/[id]/photos/[photoId]/backup - Create backup for a photo
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

    // Verify photo exists and belongs to this job card
    const photo = await db.jcPhoto.findFirst({
      where: { id: photoId, jobCardId, isActive: true }
    });

    if (!photo) {
      return apiNotFound('Photo');
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const backupType = body.backupType || 'MANUAL';
    const userId = body.userId;
    const notes = body.notes;

    // Create backup
    const result = await backupPhoto(photoId, {
      backupType,
      userId,
      notes,
    });

    if (!result.success) {
      return apiError(result.error || 'Failed to create backup', 400);
    }

    // Log the backup action
    if (result.backupId) {
      await PhotoAuditHelpers.logBackup(
        photoId,
        jobCardId,
        result.backupId,
        result.backupPath || '',
        userId,
        request
      );
    }

    // Get backup info
    const backupInfo = await getPhotoBackupInfo(photoId);

    return apiSuccess({
      backup: backupInfo,
      photo: {
        id: photo.id,
        fileName: photo.fileName,
      }
    }, 'Backup created successfully', 201);
  } catch (error) {
    console.error('Create photo backup error:', error);
    return apiError('Failed to create backup', 500);
  }
}

// GET /api/job-cards/[id]/photos/[photoId]/backup - Get backup info for a photo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id: jobCardId, photoId } = await params;

    // Verify job card exists
    const jobCard = await db.jobCard.findUnique({
      where: { id: jobCardId },
      select: { id: true }
    });

    if (!jobCard) {
      return apiNotFound('Job card');
    }

    // Verify photo exists and belongs to this job card
    const photo = await db.jcPhoto.findFirst({
      where: { id: photoId, jobCardId }
    });

    if (!photo) {
      return apiNotFound('Photo');
    }

    // Get backup info
    const backupInfo = await getPhotoBackupInfo(photoId);

    if (!backupInfo) {
      return apiSuccess({
        hasBackup: false,
        backup: null
      });
    }

    return apiSuccess({
      hasBackup: true,
      backup: backupInfo
    });
  } catch (error) {
    console.error('Get photo backup info error:', error);
    return apiError('Failed to get backup info', 500);
  }
}
