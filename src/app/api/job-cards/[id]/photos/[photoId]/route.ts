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
      updateData.categoryId = category.id;
    }

    // Update description if provided
    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    // Update tags if provided
    if (body.tags !== undefined) {
      if (Array.isArray(body.tags)) {
        updateData.tags = JSON.stringify(body.tags);
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

// DELETE /api/job-cards/[id]/photos/[photoId] - Permanently delete a photo
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

    if (permanent) {
      // Permanently delete - remove file and database record
      const filePath = path.join(process.cwd(), 'public', photo.filePath);
      
      // Delete file from filesystem
      if (existsSync(filePath)) {
        try {
          await unlink(filePath);
        } catch (e) {
          console.error('Failed to delete file:', e);
          // Continue with database deletion even if file deletion fails
        }
      }

      // Hard delete from database
      await db.jcPhoto.delete({
        where: { id: photoId }
      });

      return apiSuccess(null, 'Photo permanently deleted');
    } else {
      // Soft delete - just mark as inactive
      await db.jcPhoto.update({
        where: { id: photoId },
        data: { isActive: false }
      });

      return apiSuccess(null, 'Photo deleted successfully');
    }
  } catch (error) {
    console.error('Delete photo error:', error);
    return apiError('Failed to delete photo', 500);
  }
}
