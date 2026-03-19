/**
 * Job Card Photos API Route
 * 
 * Handles photo management for job cards:
 * - GET: Retrieve all photos for a job card
 * - POST: Upload new photos to a job card
 * - DELETE: Soft delete a photo
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { PhotoAuditHelpers } from '@/lib/audit-log';

// Default photo categories for job cards
const DEFAULT_PHOTO_CATEGORIES = [
  { code: 'BEFORE_START', name: 'Before Start', description: 'Photos taken before starting the job', sequence: 1, minPhotos: 0, maxPhotos: 10, categoryType: 'JOB_CARD', isRequired: false },
  { code: 'DURING_JOB', name: 'During Job', description: 'Photos taken during the job execution', sequence: 2, minPhotos: 0, maxPhotos: 20, categoryType: 'JOB_CARD', isRequired: false },
  { code: 'AFTER_JOB', name: 'After Job', description: 'Photos taken after job completion', sequence: 3, minPhotos: 0, maxPhotos: 10, categoryType: 'JOB_CARD', isRequired: false },
  { code: 'SPARE_PARTS_REQUEST', name: 'Spare Parts Request', description: 'Photos of spare parts being requested', sequence: 4, minPhotos: 0, maxPhotos: 50, categoryType: 'JOB_CARD', isRequired: false },
  { code: 'SAMPLE_SENDING', name: 'Sample Sending', description: 'Photos of samples being sent', sequence: 5, minPhotos: 0, maxPhotos: 50, categoryType: 'JOB_CARD', isRequired: false },
  { code: 'RECEIVED_ITEMS', name: 'Received Items', description: 'Photos of items received', sequence: 6, minPhotos: 0, maxPhotos: 50, categoryType: 'JOB_CARD', isRequired: false },
  { code: 'DEFECT_FOUND', name: 'Defect Found', description: 'Photos of defects discovered during job', sequence: 7, minPhotos: 0, maxPhotos: 30, categoryType: 'JOB_CARD', isRequired: false },
  { code: 'REPAIR_WORK', name: 'Repair Work', description: 'Photos of repair work in progress', sequence: 8, minPhotos: 0, maxPhotos: 30, categoryType: 'JOB_CARD', isRequired: false },
  { code: 'SAFETY_HAZARD', name: 'Safety Hazard', description: 'Photos of safety hazards identified', sequence: 9, minPhotos: 0, maxPhotos: 20, categoryType: 'JOB_CARD', isRequired: false },
  { code: 'FINAL_INSPECTION', name: 'Final Inspection', description: 'Photos from final inspection', sequence: 10, minPhotos: 0, maxPhotos: 20, categoryType: 'JOB_CARD', isRequired: false },
  { code: 'OTHER', name: 'Other', description: 'Other miscellaneous photos', sequence: 99, minPhotos: 0, maxPhotos: 50, categoryType: 'JOB_CARD', isRequired: false },
];

// Ensure default categories exist
async function ensureDefaultCategories() {
  for (const category of DEFAULT_PHOTO_CATEGORIES) {
    const existing = await db.jcPhotoCategory.findUnique({
      where: { code: category.code }
    });
    if (!existing) {
      await db.jcPhotoCategory.create({ data: category });
    }
  }
}

// GET /api/job-cards/[id]/photos - Get all photos for a job card
async function getPhotos(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('[GET /api/job-cards/[id]/photos] Fetching photos for job card:', id);

    // Verify job card exists
    const jobCard = await db.jobCard.findUnique({
      where: { id },
      select: { id: true, jobCardNumber: true, status: true }
    });

    if (!jobCard) {
      console.log('[GET /api/job-cards/[id]/photos] Job card not found:', id);
      return apiNotFound('Job card');
    }

    // Ensure default categories exist
    await ensureDefaultCategories();
    console.log('[GET /api/job-cards/[id]/photos] Default categories ensured');

    // Get all active categories
    const categories = await db.jcPhotoCategory.findMany({
      where: { 
        isActive: true
      },
      orderBy: { sequence: 'asc' }
    });
    console.log('[GET /api/job-cards/[id]/photos] Found categories:', categories.length);

    // Get all photos for this job card
    const photos = await db.jcPhoto.findMany({
      where: { 
        jobCardId: id,
        isActive: true 
      },
      include: {
        category: {
          select: { id: true, code: true, name: true }
        },
        uploader: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    });

    console.log('[GET /api/job-cards/[id]/photos] Found photos:', photos.length);

    // Group photos by category
    const photosByCategory = categories.map(category => ({
      ...category,
      photos: photos.filter(p => p.categoryId === category.id || (!p.categoryId && category.code === 'OTHER')),
      photoCount: photos.filter(p => p.categoryId === category.id || (!p.categoryId && category.code === 'OTHER')).length
    }));

    console.log('[GET /api/job-cards/[id]/photos] Photos by category:', photosByCategory.length, 'categories');

    // Calculate summary stats
    const stats = {
      totalPhotos: photos.length,
      totalSize: photos.reduce((sum, p) => sum + (p.fileSize || 0), 0),
      byCategory: categories.map(c => ({
        code: c.code,
        name: c.name,
        count: photos.filter(p => p.categoryId === c.id).length
      }))
    };

    console.log('[GET /api/job-cards/[id]/photos] Returning success with', photosByCategory.length, 'categories');
    return apiSuccess({
      jobCard,
      categories: photosByCategory,
      allPhotos: photos,
      stats
    });
  } catch (error) {
    console.error('[GET /api/job-cards/[id]/photos] Error:', error);
    return apiError('Failed to fetch job card photos', 500);
  }
}

// POST /api/job-cards/[id]/photos - Upload new photos (with rate limiting)
async function uploadPhotos(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify job card exists
    const jobCard = await db.jobCard.findUnique({
      where: { id },
      select: { id: true, jobCardNumber: true, status: true }
    });

    if (!jobCard) {
      return apiNotFound('Job card');
    }

    // Ensure default categories exist
    await ensureDefaultCategories();

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const categoryCode = formData.get('categoryCode') as string || 'OTHER';
    const uploadedBy = formData.get('uploadedBy') as string;
    const description = formData.get('description') as string;

    if (!files || files.length === 0) {
      return apiError('No files provided', 400);
    }

    // Find category
    const category = await db.jcPhotoCategory.findUnique({
      where: { code: categoryCode }
    });

    if (!category) {
      return apiError('Invalid category', 400);
    }

    // Check max photos limit
    const existingCount = await db.jcPhoto.count({
      where: { jobCardId: id, categoryId: category.id, isActive: true }
    });

    if (existingCount + files.length > category.maxPhotos) {
      return apiError(`Maximum ${category.maxPhotos} photos allowed for ${category.name} category`, 400);
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'jc-photos', id);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const uploadedPhotos = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        continue; // Skip non-image files
      }

      // Validate file size (max 10MB per image)
      if (file.size > 10 * 1024 * 1024) {
        continue;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const extension = file.name.split('.').pop() || 'jpg';
      const fileName = `${timestamp}-${randomStr}.${extension}`;
      const filePath = path.join(uploadDir, fileName);

      // Save file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Create database record
      const photo = await db.jcPhoto.create({
        data: {
          jobCardId: id,
          categoryId: category.id,
          filePath: `/uploads/jc-photos/${id}/${fileName}`,
          fileName,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          uploadedBy: uploadedBy || null,
          description: description || null,
        },
        include: {
          category: { select: { id: true, code: true, name: true } },
          uploader: { select: { id: true, name: true, email: true } }
        }
      });

      // Log audit trail for photo upload
      await PhotoAuditHelpers.logUpload(
        {
          id: photo.id,
          jobCardId: id,
          fileName: photo.fileName,
          fileSize: photo.fileSize,
          categoryId: photo.categoryId,
          uploadedBy: photo.uploadedBy,
        },
        request
      );

      uploadedPhotos.push(photo);
    }

    return apiSuccess({
      uploaded: uploadedPhotos.length,
      photos: uploadedPhotos
    }, `Successfully uploaded ${uploadedPhotos.length} photo(s)`, 201);
  } catch (error) {
    console.error('Upload job card photos error:', error);
    return apiError('Failed to upload photos', 500);
  }
}

// DELETE /api/job-cards/[id]/photos - Delete a photo (soft delete)
async function deletePhoto(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');

    if (!photoId) {
      return apiError('Photo ID is required', 400);
    }

    // Verify photo belongs to this job card
    const photo = await db.jcPhoto.findFirst({
      where: { id: photoId, jobCardId: id }
    });

    if (!photo) {
      return apiNotFound('Photo');
    }

    // Soft delete
    await db.jcPhoto.update({
      where: { id: photoId },
      data: { isActive: false }
    });

    // Log audit trail for soft delete
    await PhotoAuditHelpers.logSoftDelete(
      photoId,
      id,
      {
        fileName: photo.fileName,
        filePath: photo.filePath,
        fileSize: photo.fileSize,
        categoryId: photo.categoryId,
      },
      undefined,
      request
    );

    return apiSuccess(null, 'Photo deleted successfully');
  } catch (error) {
    console.error('Delete job card photo error:', error);
    return apiError('Failed to delete photo', 500);
  }
}

// Export handlers with rate limiting applied
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return getPhotos(request, { params });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply rate limiting for photo uploads
  const rateLimitResult = withRateLimit(request, 'PHOTO_UPLOAD');
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests',
        message: `Rate limit exceeded. Please retry after ${rateLimitResult.retryAfter} seconds.`,
        retryAfter: rateLimitResult.retryAfter,
      },
      { status: 429 }
    );
  }

  const response = await uploadPhotos(request, { params });
  
  // Add rate limit headers to response
  response.headers.set('X-RateLimit-Limit', '20');
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  response.headers.set('X-RateLimit-Reset', rateLimitResult.resetAt.toString());
  
  return response;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return deletePhoto(request, { params });
}
