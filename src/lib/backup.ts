/**
 * Image Backup System for Photo Management
 * 
 * Provides backup and restore functionality for job card photos.
 */

import { copyFile, mkdir, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { ensureBackupDir } from '@/lib/file-cleanup';

// Backup directory structure
const BACKUP_BASE_DIR = path.join(process.cwd(), 'public', 'uploads', 'backups');

interface BackupResult {
  success: boolean;
  backupId?: string;
  backupPath?: string;
  error?: string;
}

interface RestoreResult {
  success: boolean;
  error?: string;
}

interface BackupInfo {
  id: string;
  photoId: string;
  jobCardId: string;
  originalPath: string;
  backupPath: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  backupType: string;
  status: string;
  backedUpAt: Date;
  backedUpBy: string | null;
}

/**
 * Create a backup of a single photo
 */
export async function backupPhoto(
  photoId: string,
  options: {
    backupType?: 'MANUAL' | 'AUTO' | 'SCHEDULED';
    userId?: string;
    notes?: string;
  } = {}
): Promise<BackupResult> {
  try {
    // Get the photo from database
    const photo = await db.jcPhoto.findUnique({
      where: { id: photoId },
      include: {
        jobCard: {
          select: { id: true, jobCardNumber: true }
        }
      }
    });

    if (!photo) {
      return { success: false, error: 'Photo not found' };
    }

    if (!photo.isActive) {
      return { success: false, error: 'Cannot backup inactive photo' };
    }

    // Check if backup already exists for this photo
    const existingBackup = await db.photoBackup.findFirst({
      where: {
        photoId,
        status: 'ACTIVE'
      }
    });

    if (existingBackup) {
      return {
        success: true,
        backupId: existingBackup.id,
        backupPath: existingBackup.backupPath,
      };
    }

    // Ensure backup directory exists
    await ensureBackupDir();

    // Create job card specific backup directory
    const jobCardBackupDir = path.join(BACKUP_BASE_DIR, photo.jobCardId);
    if (!existsSync(jobCardBackupDir)) {
      await mkdir(jobCardBackupDir, { recursive: true });
    }

    // Generate backup filename with timestamp
    const timestamp = Date.now();
    const backupFileName = `${timestamp}_${photo.fileName}`;
    const backupPath = path.join(jobCardBackupDir, backupFileName);

    // Full paths for copy
    const sourcePath = path.join(process.cwd(), 'public', photo.filePath);
    const destPath = backupPath;

    // Check if source file exists
    if (!existsSync(sourcePath)) {
      return { success: false, error: 'Source file not found' };
    }

    // Copy file to backup location
    await copyFile(sourcePath, destPath);

    // Create backup record in database
    const backup = await db.photoBackup.create({
      data: {
        photoId: photo.id,
        jobCardId: photo.jobCardId,
        originalPath: photo.filePath,
        backupPath: `/uploads/backups/${photo.jobCardId}/${backupFileName}`,
        fileName: backupFileName,
        fileSize: photo.fileSize,
        mimeType: photo.mimeType,
        backupType: options.backupType || 'MANUAL',
        status: 'ACTIVE',
        backedUpBy: options.userId || null,
        notes: options.notes || null,
      }
    });

    console.log(`[Backup] Created backup for photo ${photoId}: ${backup.id}`);

    return {
      success: true,
      backupId: backup.id,
      backupPath: backup.backupPath,
    };
  } catch (error) {
    console.error('[Backup] Failed to create backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Restore a photo from backup
 */
export async function restorePhotoFromBackup(
  backupId: string,
  options: {
    userId?: string;
  } = {}
): Promise<RestoreResult> {
  try {
    // Get the backup record
    const backup = await db.photoBackup.findUnique({
      where: { id: backupId },
      include: {
        photo: true
      }
    });

    if (!backup) {
      return { success: false, error: 'Backup not found' };
    }

    if (backup.status !== 'ACTIVE') {
      return { success: false, error: 'Backup is not active' };
    }

    // Full paths
    const backupFilePath = path.join(process.cwd(), 'public', backup.backupPath);
    
    // Determine the restore location
    let restorePath: string;
    let restoreDbPath: string;

    if (backup.photo && backup.photo.isActive) {
      // Photo still exists - restore to original location
      restorePath = path.join(process.cwd(), 'public', backup.originalPath);
      restoreDbPath = backup.originalPath;
    } else {
      // Photo was deleted - create new location
      const jobCardDir = path.join(process.cwd(), 'public', 'uploads', 'jc-photos', backup.jobCardId);
      if (!existsSync(jobCardDir)) {
        await mkdir(jobCardDir, { recursive: true });
      }
      
      // Use original filename or generate new one
      const fileName = backup.fileName.replace(/^\d+_/, ''); // Remove timestamp prefix
      restorePath = path.join(jobCardDir, fileName);
      restoreDbPath = `/uploads/jc-photos/${backup.jobCardId}/${fileName}`;
    }

    // Check if backup file exists
    if (!existsSync(backupFilePath)) {
      return { success: false, error: 'Backup file not found' };
    }

    // Copy backup to restore location
    await copyFile(backupFilePath, restorePath);

    // Update or create photo record
    if (backup.photo) {
      // Update existing photo record
      await db.jcPhoto.update({
        where: { id: backup.photoId },
        data: {
          isActive: true,
          filePath: restoreDbPath,
        }
      });
    } else {
      // Photo was deleted, create new record
      await db.jcPhoto.create({
        data: {
          id: backup.photoId, // Use the same ID
          jobCardId: backup.jobCardId,
          filePath: restoreDbPath,
          fileName: backup.fileName.replace(/^\d+_/, ''),
          fileSize: backup.fileSize,
          mimeType: backup.mimeType,
          isActive: true,
          uploadedBy: options.userId || null,
        }
      });
    }

    // Update backup status
    await db.photoBackup.update({
      where: { id: backupId },
      data: {
        status: 'RESTORED',
        restoredAt: new Date(),
        restoredBy: options.userId || null,
      }
    });

    console.log(`[Backup] Restored photo ${backup.photoId} from backup ${backupId}`);

    return { success: true };
  } catch (error) {
    console.error('[Backup] Failed to restore from backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get backup info for a photo
 */
export async function getPhotoBackupInfo(photoId: string): Promise<BackupInfo | null> {
  const backup = await db.photoBackup.findFirst({
    where: {
      photoId,
      status: 'ACTIVE'
    },
    orderBy: { backedUpAt: 'desc' }
  });

  if (!backup) {
    return null;
  }

  return {
    id: backup.id,
    photoId: backup.photoId,
    jobCardId: backup.jobCardId,
    originalPath: backup.originalPath,
    backupPath: backup.backupPath,
    fileName: backup.fileName,
    fileSize: backup.fileSize,
    mimeType: backup.mimeType,
    backupType: backup.backupType,
    status: backup.status,
    backedUpAt: backup.backedUpAt,
    backedUpBy: backup.backedUpBy,
  };
}

/**
 * Get all backups for a job card
 */
export async function getJobCardBackups(jobCardId: string): Promise<BackupInfo[]> {
  const backups = await db.photoBackup.findMany({
    where: { jobCardId },
    orderBy: { backedUpAt: 'desc' }
  });

  return backups.map(backup => ({
    id: backup.id,
    photoId: backup.photoId,
    jobCardId: backup.jobCardId,
    originalPath: backup.originalPath,
    backupPath: backup.backupPath,
    fileName: backup.fileName,
    fileSize: backup.fileSize,
    mimeType: backup.mimeType,
    backupType: backup.backupType,
    status: backup.status,
    backedUpAt: backup.backedUpAt,
    backedUpBy: backup.backedUpBy,
  }));
}

/**
 * Delete a backup
 */
export async function deleteBackup(backupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const backup = await db.photoBackup.findUnique({
      where: { id: backupId }
    });

    if (!backup) {
      return { success: false, error: 'Backup not found' };
    }

    // Delete backup file
    const backupFilePath = path.join(process.cwd(), 'public', backup.backupPath);
    if (existsSync(backupFilePath)) {
      await unlink(backupFilePath);
    }

    // Update backup status
    await db.photoBackup.update({
      where: { id: backupId },
      data: { status: 'DELETED' }
    });

    console.log(`[Backup] Deleted backup ${backupId}`);

    return { success: true };
  } catch (error) {
    console.error('[Backup] Failed to delete backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get backup statistics
 */
export async function getBackupStats(): Promise<{
  totalBackups: number;
  activeBackups: number;
  restoredBackups: number;
  totalSize: number;
  byJobCard: { jobCardId: string; count: number; size: number }[];
}> {
  const backups = await db.photoBackup.findMany({
    select: {
      id: true,
      jobCardId: true,
      fileSize: true,
      status: true,
    }
  });

  const stats = {
    totalBackups: backups.length,
    activeBackups: backups.filter(b => b.status === 'ACTIVE').length,
    restoredBackups: backups.filter(b => b.status === 'RESTORED').length,
    totalSize: backups.reduce((sum, b) => sum + (b.fileSize || 0), 0),
    byJobCard: [] as { jobCardId: string; count: number; size: number }[],
  };

  // Group by job card
  const byJobCard = new Map<string, { count: number; size: number }>();
  for (const backup of backups) {
    const existing = byJobCard.get(backup.jobCardId) || { count: 0, size: 0 };
    existing.count++;
    existing.size += backup.fileSize || 0;
    byJobCard.set(backup.jobCardId, existing);
  }

  stats.byJobCard = Array.from(byJobCard.entries()).map(([jobCardId, data]) => ({
    jobCardId,
    ...data
  }));

  return stats;
}

/**
 * Auto-backup photos for a job card (called before destructive operations)
 */
export async function autoBackupJobCardPhotos(
  jobCardId: string,
  userId?: string
): Promise<{ success: boolean; backedUp: number; errors: string[] }> {
  const result = {
    success: true,
    backedUp: 0,
    errors: [] as string[],
  };

  try {
    const photos = await db.jcPhoto.findMany({
      where: {
        jobCardId,
        isActive: true
      }
    });

    for (const photo of photos) {
      const backupResult = await backupPhoto(photo.id, {
        backupType: 'AUTO',
        userId,
        notes: 'Auto-backup before destructive operation'
      });

      if (backupResult.success) {
        result.backedUp++;
      } else {
        result.errors.push(`Failed to backup ${photo.fileName}: ${backupResult.error}`);
      }
    }

    result.success = result.errors.length === 0;
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}
