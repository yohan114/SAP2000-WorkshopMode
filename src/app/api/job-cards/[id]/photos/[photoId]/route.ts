/**
 * Individual Job Card Photo API Route
 * 
 * Handles operations on a single photo:
 * - GET: Retrieve a single photo's details
 * - PATCH: Update photo details (category, description, tags)
 * - DELETE: Permanently delete a photo
 */

import { NextRequest } from 'next/server';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import { deletePhotoFile } from '@/lib/file-cleanup';
import { PhotoAuditHelpers } from '@/lib/audit-log';

// GET /api/job-cards/[id]/photos/[photoId] - Get single photo details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id, photoId } = await params;

    // Verify job card exists
    const jobCard = await db.jobCard.findUnique({
      where: { id },
      select: { id: true, jobCardNumber: true }
    });

    if (!jobCard) {
      return apiNotFound('Job card');
    }

    // Get the photo
    const photo = await db.jcPhoto.findFirst({
      where: { 
        id: photoId, 
        jobCardId: id,
        isActive: true 
      },
      include: {
        category: {
          select: { id: true, code: true, name: true, description: true }
        },
        uploader: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!photo) {
      return apiNotFound('Photo');
    }

    // Parse tags if they exist
    const photoWithParsedTags = {
      ...photo,
      tags: photo.tags ? JSON.parse(photo.tags) : []
    };

    return apiSuccess({
      photo: photoWithParsedTags,
      jobCard
    });
  } catch (error) {
    console.error('Get photo error:', error);
    return apiError('Failed to fetch photo', 500);
  }
}

// PATCH /api/job-cards/[id]/photos/[photoId] - Update photo details
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id, photoId } = await params;
    const body = await request.json();

    // Verify job card exists
    const jobCard = await db.jobCard.findUnique({
      where: { id },
      select: { id: true, jobCardNumber: true, status: true }
    });

    if (!jobCard) {
      return apiNotFound('Job card');
    }

    // Verify photo exists and belongs to this job card
    const existingPhoto = await db.jcPhoto.findFirst({
      where: { id: photoId, jobCardId: id, isActive: true }
    });

    if (!existingPhoto) {
      return apiNotFound('Photo');
    }

    // Track changes for audit log
    const oldValue: Record<string, unknown> = {};
    const newValue: Record<string, unknown> = {};

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Update category if provided
    if (body.categoryCode) {
      const category = await db.jcPhotoCategory.findUnique({
        where: { code: body.categoryCode }
      });
      if (!category) {
        return apiError('Invalid category', 400);
      }
      
      // Track category change
      if (existingPhoto.categoryId !== category.id) {
        oldValue.categoryId = existingPhoto.categoryId;
        newValue.categoryId = category.id;
      }
      
      updateData.categoryId = category.id;
    }

    // Update description if provided
    if (body.description !== undefined) {
      if (existingPhoto.description !== body.description) {
        oldValue.description = existingPhoto.description;
        newValue.description = body.description;
      }
      updateData.description = body.description;
    }

    // Update tags if provided
    if (body.tags !== undefined) {
      if (Array.isArray(body.tags)) {
        const newTagsStr = JSON.stringify(body.tags);
        if (existingPhoto.tags !== newTagsStr) {
          oldValue.tags = existingPhoto.tags ? JSON.parse(existingPhoto.tags) : [];
          newValue.tags = body.tags;
        }
        updateData.tags = newTagsStr;
      } else {
        return apiError('Tags must be an array', 400);
      }
    }

    // Update the photo
    const updatedPhoto = await db.jcPhoto.update({
      where: { id: photoId },
      data: updateData,
      include: {
        category: {
          select: { id: true, code: true, name: true }
        },
        uploader: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Log audit trail if there were changes
    if (Object.keys(oldValue).length > 0) {
      await PhotoAuditHelpers.logUpdate(
        photoId,
        id,
        oldValue,
        newValue,
        body.userId,
        request
      );
    }

    return apiSuccess({
      photo: {
        ...updatedPhoto,
        tags: updatedPhoto.tags ? JSON.parse(updatedPhoto.tags) : []
      }
    }, 'Photo updated successfully');
  } catch (error) {
    console.error('Update photo error:', error);
    return apiError('Failed to update photo', 500);
  }
}

// DELETE /api/job-cards/[id]/photos/[photoId] - Delete a photo (soft or permanent)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id, photoId } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    // Verify job card exists
    const jobCard = await db.jobCard.findUnique({
      where: { id },
      select: { id: true, jobCardNumber: true }
    });

    if (!jobCard) {
      return apiNotFound('Job card');
    }

    // Verify photo exists and belongs to this job card
    const photo = await db.jcPhoto.findFirst({
      where: { id: photoId, jobCardId: id }
    });

    if (!photo) {
      return apiNotFound('Photo');
    }

    // Store photo details for audit log before deletion
    const photoDetails = {
      fileName: photo.fileName,
      originalName: photo.originalName,
      filePath: photo.filePath,
      fileSize: photo.fileSize,
      mimeType: photo.mimeType,
      categoryId: photo.categoryId,
      description: photo.description,
    };

    if (permanent) {
      // Permanently delete - remove file and database record
      
      // Delete the actual file from filesystem using the cleanup utility
      const fileDeleted = await deletePhotoFile({
        id: photoId,
        filePath: photo.filePath,
        fileName: photo.fileName,
        jobCardId: id,
      });

      if (!fileDeleted) {
        console.warn(`[DELETE] Failed to delete file for photo ${photoId}, continuing with database deletion`);
      }

      // Hard delete from database
      await db.jcPhoto.delete({
        where: { id: photoId }
      });

      // Log audit trail for permanent delete
      await PhotoAuditHelpers.logPermanentDelete(
        photoId,
        id,
        photoDetails,
        undefined,
        request
      );

      return apiSuccess(null, 'Photo permanently deleted');
    } else {
      // Soft delete - just mark as inactive
      await db.jcPhoto.update({
        where: { id: photoId },
        data: { isActive: false }
      });

      // Log audit trail for soft delete
      await PhotoAuditHelpers.logSoftDelete(
        photoId,
        id,
        photoDetails,
        undefined,
        request
      );

      return apiSuccess(null, 'Photo deleted successfully');
    }
  } catch (error) {
    console.error('Delete photo error:', error);
    return apiError('Failed to delete photo', 500);
  }
}
