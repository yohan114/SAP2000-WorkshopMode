/**
 * File Cleanup Utility for Photo Management
 * 
 * Handles filesystem cleanup for deleted photos and orphaned files.
 */

import { unlink, readdir, stat, rmdir } from 'fs/promises';
import { existsSync, lstatSync } from 'fs';
import path from 'path';
import { db } from '@/lib/db';

// Base upload directory
const UPLOAD_BASE_DIR = path.join(process.cwd(), 'public', 'uploads');
const JC_PHOTOS_DIR = path.join(UPLOAD_BASE_DIR, 'jc-photos');
const BACKUP_DIR = path.join(UPLOAD_BASE_DIR, 'backups');

interface CleanupResult {
  deletedFiles: string[];
  errors: { file: string; error: string }[];
  freedBytes: number;
}

interface OrphanedFile {
  path: string;
  size: number;
  createdAt: Date;
  jobCardFolder: string;
}

/**
 * Delete a single file from the filesystem
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    // Resolve the full path if it's a relative path from public
    const fullPath = filePath.startsWith(process.cwd())
      ? filePath
      : path.join(process.cwd(), 'public', filePath);
    
    if (!existsSync(fullPath)) {
      console.log(`[FileCleanup] File not found, nothing to delete: ${fullPath}`);
      return true; // Consider it success if file doesn't exist
    }
    
    await unlink(fullPath);
    console.log(`[FileCleanup] File deleted: ${fullPath}`);
    return true;
  } catch (error) {
    console.error(`[FileCleanup] Failed to delete file: ${filePath}`, error);
    return false;
  }
}

/**
 * Delete a photo file from the filesystem based on its database record
 */
export async function deletePhotoFile(photo: {
  id: string;
  filePath: string;
  fileName: string;
  jobCardId: string;
}): Promise<boolean> {
  const fullPath = path.join(process.cwd(), 'public', photo.filePath);
  
  // Verify the file is within the expected directory (security check)
  const expectedDir = path.join(JC_PHOTOS_DIR, photo.jobCardId);
  if (!fullPath.startsWith(expectedDir)) {
    console.error(`[FileCleanup] Security: File path outside expected directory: ${fullPath}`);
    return false;
  }
  
  return deleteFile(fullPath);
}

/**
 * Clean up empty job card photo directories
 */
export async function cleanupEmptyDirectories(): Promise<string[]> {
  const removedDirs: string[] = [];
  
  try {
    if (!existsSync(JC_PHOTOS_DIR)) {
      return removedDirs;
    }
    
    const jobCardDirs = await readdir(JC_PHOTOS_DIR);
    
    for (const dir of jobCardDirs) {
      const dirPath = path.join(JC_PHOTOS_DIR, dir);
      const dirStat = lstatSync(dirPath);
      
      if (!dirStat.isDirectory()) continue;
      
      const files = await readdir(dirPath);
      
      if (files.length === 0) {
        // Check if there are any photos in the database for this job card
        const photoCount = await db.jcPhoto.count({
          where: { jobCardId: dir }
        });
        
        if (photoCount === 0) {
          await rmdir(dirPath);
          removedDirs.push(dirPath);
          console.log(`[FileCleanup] Removed empty directory: ${dirPath}`);
        }
      }
    }
  } catch (error) {
    console.error('[FileCleanup] Error cleaning up empty directories:', error);
  }
  
  return removedDirs;
}

/**
 * Find orphaned files - files in uploads folder without database records
 */
export async function findOrphanedFiles(): Promise<OrphanedFile[]> {
  const orphanedFiles: OrphanedFile[] = [];
  
  try {
    if (!existsSync(JC_PHOTOS_DIR)) {
      return orphanedFiles;
    }
    
    // Get all photo file paths from database
    const dbPhotos = await db.jcPhoto.findMany({
      select: { filePath: true }
    });
    const dbFilePaths = new Set(dbPhotos.map(p => p.filePath));
    
    // Scan the uploads directory
    const jobCardDirs = await readdir(JC_PHOTOS_DIR);
    
    for (const dir of jobCardDirs) {
      const dirPath = path.join(JC_PHOTOS_DIR, dir);
      const dirStat = lstatSync(dirPath);
      
      if (!dirStat.isDirectory()) continue;
      
      const files = await readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const relativePath = `/uploads/jc-photos/${dir}/${file}`;
        
        // Check if this file exists in database
        if (!dbFilePaths.has(relativePath)) {
          const fileStat = await stat(filePath);
          
          orphanedFiles.push({
            path: relativePath,
            size: fileStat.size,
            createdAt: fileStat.birthtime,
            jobCardFolder: dir,
          });
        }
      }
    }
  } catch (error) {
    console.error('[FileCleanup] Error finding orphaned files:', error);
  }
  
  return orphanedFiles;
}

/**
 * Clean up orphaned files
 */
export async function cleanupOrphanedFiles(
  options: {
    maxAgeDays?: number;    // Only delete files older than this
    dryRun?: boolean;        // If true, don't actually delete
  } = {}
): Promise<CleanupResult> {
  const result: CleanupResult = {
    deletedFiles: [],
    errors: [],
    freedBytes: 0,
  };
  
  const { maxAgeDays = 7, dryRun = false } = options;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
  
  try {
    const orphanedFiles = await findOrphanedFiles();
    
    for (const file of orphanedFiles) {
      // Only delete files older than maxAgeDays
      if (file.createdAt > cutoffDate) {
        continue;
      }
      
      if (dryRun) {
        result.deletedFiles.push(file.path);
        result.freedBytes += file.size;
        continue;
      }
      
      const deleted = await deleteFile(file.path);
      
      if (deleted) {
        result.deletedFiles.push(file.path);
        result.freedBytes += file.size;
      } else {
        result.errors.push({
          file: file.path,
          error: 'Failed to delete file',
        });
      }
    }
  } catch (error) {
    console.error('[FileCleanup] Error during cleanup:', error);
  }
  
  return result;
}

/**
 * Clean up backup files older than specified days
 */
export async function cleanupOldBackups(maxAgeDays: number = 30): Promise<CleanupResult> {
  const result: CleanupResult = {
    deletedFiles: [],
    errors: [],
    freedBytes: 0,
  };
  
  try {
    if (!existsSync(BACKUP_DIR)) {
      return result;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    
    const backupFolders = await readdir(BACKUP_DIR);
    
    for (const folder of backupFolders) {
      const folderPath = path.join(BACKUP_DIR, folder);
      const folderStat = lstatSync(folderPath);
      
      if (!folderStat.isDirectory()) continue;
      
      if (folderStat.birthtime < cutoffDate) {
        // Delete all files in the backup folder
        const files = await readdir(folderPath);
        
        for (const file of files) {
          const filePath = path.join(folderPath, file);
          const fileStat = await stat(filePath);
          
          const deleted = await deleteFile(filePath);
          
          if (deleted) {
            result.deletedFiles.push(filePath);
            result.freedBytes += fileStat.size;
          } else {
            result.errors.push({
              file: filePath,
              error: 'Failed to delete backup file',
            });
          }
        }
        
        // Remove the empty directory
        try {
          await rmdir(folderPath);
        } catch (e) {
          console.error(`[FileCleanup] Failed to remove backup directory: ${folderPath}`, e);
        }
      }
    }
  } catch (error) {
    console.error('[FileCleanup] Error cleaning up old backups:', error);
  }
  
  return result;
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  totalPhotos: number;
  totalSize: number;
  byJobCard: { jobCardId: string; count: number; size: number }[];
  orphanedCount: number;
  orphanedSize: number;
}> {
  const photos = await db.jcPhoto.findMany({
    where: { isActive: true },
    select: {
      id: true,
      jobCardId: true,
      fileSize: true,
    },
  });
  
  const orphanedFiles = await findOrphanedFiles();
  
  // Group by job card
  const byJobCard = new Map<string, { count: number; size: number }>();
  
  for (const photo of photos) {
    const existing = byJobCard.get(photo.jobCardId) || { count: 0, size: 0 };
    existing.count++;
    existing.size += photo.fileSize || 0;
    byJobCard.set(photo.jobCardId, existing);
  }
  
  return {
    totalPhotos: photos.length,
    totalSize: photos.reduce((sum, p) => sum + (p.fileSize || 0), 0),
    byJobCard: Array.from(byJobCard.entries()).map(([jobCardId, data]) => ({
      jobCardId,
      ...data,
    })),
    orphanedCount: orphanedFiles.length,
    orphanedSize: orphanedFiles.reduce((sum, f) => sum + f.size, 0),
  };
}

/**
 * Ensure the backup directory exists
 */
export async function ensureBackupDir(): Promise<string> {
  if (!existsSync(BACKUP_DIR)) {
    const { mkdir } = await import('fs/promises');
    await mkdir(BACKUP_DIR, { recursive: true });
  }
  return BACKUP_DIR;
}
