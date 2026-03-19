import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiError, 
  apiNotFound, 
  handleApiError,
} from '@/lib/api-utils';
import { z } from 'zod';

// Schema for updating a photo category
const updatePhotoCategorySchema = z.object({
  code: z.string().min(1, 'Code is required').optional(),
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional().nullable(),
  sequence: z.number().int().min(1).optional(),
  minPhotos: z.number().int().min(0).optional(),
  maxPhotos: z.number().int().min(1).optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/photo-categories/[id] - Get a single photo category with photo count
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const category = await db.jcPhotoCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { photos: true },
        },
        photos: {
          take: 10,
          orderBy: { uploadedAt: 'desc' },
          select: {
            id: true,
            fileName: true,
            filePath: true,
            fileSize: true,
            mimeType: true,
            capturedAt: true,
            uploadedAt: true,
            task: {
              select: {
                id: true,
                taskNumber: true,
                description: true,
                jobCard: {
                  select: {
                    id: true,
                    jobCardNumber: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!category) {
      return apiNotFound('Photo category');
    }

    const response = {
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description,
      sequence: category.sequence,
      minPhotos: category.minPhotos,
      maxPhotos: category.maxPhotos,
      isRequired: category.isRequired,
      isActive: category.isActive,
      photoCount: category._count.photos,
      recentPhotos: category.photos.map(photo => ({
        id: photo.id,
        fileName: photo.fileName,
        filePath: photo.filePath,
        fileSize: photo.fileSize,
        mimeType: photo.mimeType,
        capturedAt: photo.capturedAt,
        uploadedAt: photo.uploadedAt,
        task: photo.task,
      })),
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };

    return apiSuccess(response);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/photo-categories/[id] - Update a photo category
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const result = updatePhotoCategorySchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const data = result.data;

    // Check if photo category exists
    const existing = await db.jcPhotoCategory.findUnique({ where: { id } });
    if (!existing) {
      return apiNotFound('Photo category');
    }

    // If code is being changed, check for duplicates
    if (data.code && data.code !== existing.code) {
      const duplicate = await db.jcPhotoCategory.findUnique({
        where: { code: data.code },
      });
      if (duplicate) {
        return apiError('Photo category with this code already exists', 400);
      }
    }

    // Validate minPhotos <= maxPhotos if both are provided
    const minPhotos = data.minPhotos ?? existing.minPhotos;
    const maxPhotos = data.maxPhotos ?? existing.maxPhotos;
    if (minPhotos > maxPhotos) {
      return apiError('minPhotos cannot be greater than maxPhotos', 400);
    }

    // Build update data object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.code !== undefined) updateData.code = data.code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.sequence !== undefined) updateData.sequence = data.sequence;
    if (data.minPhotos !== undefined) updateData.minPhotos = data.minPhotos;
    if (data.maxPhotos !== undefined) updateData.maxPhotos = data.maxPhotos;
    if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Update the photo category
    const category = await db.jcPhotoCategory.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { photos: true },
        },
      },
    });

    const response = {
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description,
      sequence: category.sequence,
      minPhotos: category.minPhotos,
      maxPhotos: category.maxPhotos,
      isRequired: category.isRequired,
      isActive: category.isActive,
      photoCount: category._count.photos,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };

    return apiSuccess(response, 'Photo category updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/photo-categories/[id] - Delete a photo category (soft delete by default, hard delete if no related photos)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if photo category exists
    const existing = await db.jcPhotoCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { photos: true },
        },
      },
    });

    if (!existing) {
      return apiNotFound('Photo category');
    }

    // Check for related photos
    if (existing._count.photos > 0) {
      return apiError(
        'Cannot delete photo category with related photos',
        400,
        `This category has ${existing._count.photos} photo(s) associated with it. Please reassign or remove the photos first.`
      );
    }

    // Hard delete since there are no related photos
    await db.jcPhotoCategory.delete({
      where: { id },
    });

    return apiSuccess(null, 'Photo category deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
