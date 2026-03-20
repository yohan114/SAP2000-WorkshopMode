import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  extractExif, 
  validateExif, 
  isSupportedImageFormat,
  formatExifData,
  type ExifValidationContext 
} from '@/lib/exif-validator';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * GET /api/photos/validate
 * Get validation status for one or more photos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');
    const jobCardId = searchParams.get('jobCardId');
    const minTrustScore = searchParams.get('minTrustScore');
    const hasWarnings = searchParams.get('hasWarnings');

    // Single photo lookup
    if (photoId) {
      const photo = await db.jcPhoto.findUnique({
        where: { id: photoId },
        include: {
          jobCard: {
            select: {
              id: true,
              jobCardNumber: true,
              scheduledStart: true,
              scheduledEnd: true,
              asset: {
                select: {
                  id: true,
                  assetNumber: true,
                  name: true,
                  currentLocation: true,
                }
              }
            }
          },
          category: {
            select: {
              id: true,
              code: true,
              name: true,
            }
          },
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });

      if (!photo) {
        return NextResponse.json(
          { success: false, error: 'Photo not found' },
          { status: 404 }
        );
      }

      // Parse EXIF data from stored JSON
      let exifData = null;
      let validation = null;
      let formattedExif = null;
      let warnings = [];

      if (photo.exifData) {
        try {
          exifData = JSON.parse(photo.exifData);
          formattedExif = formatExifData(exifData);
        } catch {
          // Invalid JSON
        }
      }

      if (photo.exifWarnings) {
        try {
          warnings = JSON.parse(photo.exifWarnings);
        } catch {
          // Invalid JSON
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          photo: {
            id: photo.id,
            fileName: photo.fileName,
            originalName: photo.originalName,
            filePath: photo.filePath,
            fileSize: photo.fileSize,
            mimeType: photo.mimeType,
            width: photo.width,
            height: photo.height,
            description: photo.description,
            uploadedAt: photo.uploadedAt,
            capturedAt: photo.capturedAt,
          },
          jobCard: photo.jobCard,
          category: photo.category,
          uploader: photo.uploader,
          validation: {
            isValid: photo.exifIsValid ?? true,
            trustScore: photo.exifTrustScore ?? null,
            capturedAt: photo.exifCapturedAt,
            device: photo.exifDeviceMake || photo.exifDeviceModel 
              ? `${photo.exifDeviceMake || ''} ${photo.exifDeviceModel || ''}`.trim()
              : null,
            latitude: photo.exifLatitude ? Number(photo.exifLatitude) : null,
            longitude: photo.exifLongitude ? Number(photo.exifLongitude) : null,
            warnings,
          },
          exifData,
          formattedExif,
        }
      });
    }

    // List photos by job card
    const where: {
      jobCardId?: string;
      isActive: boolean;
      exifTrustScore?: { gte?: number; lte?: number };
      exifWarnings?: { not: string | null };
    } = { isActive: true };

    if (jobCardId) {
      where.jobCardId = jobCardId;
    }

    if (minTrustScore) {
      const score = parseInt(minTrustScore, 10);
      if (!isNaN(score)) {
        where.exifTrustScore = { gte: score };
      }
    }

    if (hasWarnings === 'true') {
      where.exifWarnings = { not: null };
    }

    const photos = await db.jcPhoto.findMany({
      where,
      include: {
        jobCard: {
          select: {
            id: true,
            jobCardNumber: true,
          }
        },
        category: {
          select: {
            id: true,
            code: true,
            name: true,
          }
        },
      },
      orderBy: { uploadedAt: 'desc' },
      take: 100,
    });

    // Calculate summary stats
    const stats = {
      total: photos.length,
      validated: photos.filter(p => p.exifValidatedAt !== null).length,
      valid: photos.filter(p => p.exifIsValid === true).length,
      invalid: photos.filter(p => p.exifIsValid === false).length,
      averageTrustScore: photos.length > 0 && photos.some(p => p.exifTrustScore !== null)
        ? Math.round(
            photos
              .filter(p => p.exifTrustScore !== null)
              .reduce((sum, p) => sum + (p.exifTrustScore || 0), 0) /
            photos.filter(p => p.exifTrustScore !== null).length
          )
        : null,
      highTrust: photos.filter(p => (p.exifTrustScore ?? 0) >= 80).length,
      mediumTrust: photos.filter(p => {
        const score = p.exifTrustScore ?? 0;
        return score >= 60 && score < 80;
      }).length,
      lowTrust: photos.filter(p => {
        const score = p.exifTrustScore ?? 0;
        return score >= 40 && score < 60;
      }).length,
      untrusted: photos.filter(p => (p.exifTrustScore ?? 0) < 40).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        photos: photos.map(p => ({
          id: p.id,
          fileName: p.fileName,
          originalName: p.originalName,
          filePath: p.filePath,
          fileSize: p.fileSize,
          mimeType: p.mimeType,
          uploadedAt: p.uploadedAt,
          capturedAt: p.capturedAt,
          jobCard: p.jobCard,
          category: p.category,
          validation: {
            isValid: p.exifIsValid ?? true,
            trustScore: p.exifTrustScore ?? null,
            capturedAt: p.exifCapturedAt,
            device: p.exifDeviceMake || p.exifDeviceModel 
              ? `${p.exifDeviceMake || ''} ${p.exifDeviceModel || ''}`.trim()
              : null,
            latitude: p.exifLatitude ? Number(p.exifLatitude) : null,
            longitude: p.exifLongitude ? Number(p.exifLongitude) : null,
            hasWarnings: !!p.exifWarnings,
          },
        })),
        stats,
      }
    });
  } catch (error) {
    console.error('[API] Error fetching photo validation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch photo validation data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/photos/validate
 * Upload and validate a photo for EXIF data
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const photoId = formData.get('photoId') as string;
    const jobCardId = formData.get('jobCardId') as string;
    const file = formData.get('file') as File | null;
    const expectedDateStart = formData.get('expectedDateStart') as string | null;
    const expectedDateEnd = formData.get('expectedDateEnd') as string | null;
    const expectedLat = formData.get('expectedLat') as string | null;
    const expectedLng = formData.get('expectedLng') as string | null;
    const expectedRadius = formData.get('expectedRadius') as string | null;
    const allowedDevices = formData.get('allowedDevices') as string | null;
    const revalidate = formData.get('revalidate') === 'true';

    let buffer: Buffer | null = null;
    let existingPhoto = null;

    // If photoId is provided, fetch existing photo
    if (photoId) {
      existingPhoto = await db.jcPhoto.findUnique({
        where: { id: photoId },
        include: {
          jobCard: {
            select: {
              id: true,
              jobCardNumber: true,
              scheduledStart: true,
              scheduledEnd: true,
            }
          }
        }
      });

      if (!existingPhoto) {
        return NextResponse.json(
          { success: false, error: 'Photo not found' },
          { status: 404 }
        );
      }

      // If revalidating and file is provided, use new file
      if (!revalidate && existingPhoto.exifValidatedAt) {
        // Already validated, return existing data
        return NextResponse.json({
          success: true,
          data: {
            photoId: existingPhoto.id,
            alreadyValidated: true,
            message: 'Photo already validated. Use revalidate=true to re-analyze.',
          }
        });
      }

      // Fetch the file from storage if no new file provided
      if (!file && existingPhoto.filePath) {
        try {
          // Try to read from local file system
          const fs = await import('fs');
          const path = await import('path');
          const fullPath = path.join(process.cwd(), 'public', existingPhoto.filePath);
          
          if (fs.existsSync(fullPath)) {
            const fileBuffer = fs.readFileSync(fullPath);
            buffer = Buffer.from(fileBuffer);
          }
        } catch (fsError) {
          console.log('[API] Could not read file from disk:', fsError);
        }
      }
    }

    // If file is provided directly
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    if (!buffer) {
      return NextResponse.json(
        { success: false, error: 'No file provided and could not load existing photo' },
        { status: 400 }
      );
    }

    // Check if supported image format
    if (!isSupportedImageFormat(buffer)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported image format. Only JPEG and PNG are supported.' },
        { status: 400 }
      );
    }

    // Extract EXIF data
    const exifData = await extractExif(buffer);

    // Build validation context
    const context: ExifValidationContext = {};

    // Date range from parameters or job card
    if (expectedDateStart && expectedDateEnd) {
      context.expectedDateRange = {
        start: new Date(expectedDateStart),
        end: new Date(expectedDateEnd),
      };
    } else if (existingPhoto?.jobCard?.scheduledStart && existingPhoto?.jobCard?.scheduledEnd) {
      // Use job card scheduled dates with a 7-day buffer before
      const startDate = new Date(existingPhoto.jobCard.scheduledStart);
      startDate.setDate(startDate.getDate() - 7);
      
      context.expectedDateRange = {
        start: startDate,
        end: new Date(existingPhoto.jobCard.scheduledEnd),
      };
    }

    // Expected location
    if (expectedLat && expectedLng && expectedRadius) {
      context.expectedLocation = {
        lat: parseFloat(expectedLat),
        lng: parseFloat(expectedLng),
        radiusMeters: parseInt(expectedRadius, 10),
      };
    }

    // Allowed devices
    if (allowedDevices) {
      try {
        context.allowedDevices = JSON.parse(allowedDevices);
      } catch {
        context.allowedDevices = allowedDevices.split(',').map(d => d.trim());
      }
    }

    // Validate EXIF
    const validationResult = validateExif(exifData, context);

    // Format EXIF for display
    const formattedExif = formatExifData(exifData);

    // Update photo record if we have a photoId
    if (existingPhoto) {
      await db.jcPhoto.update({
        where: { id: existingPhoto.id },
        data: {
          exifCapturedAt: exifData.capturedAt || null,
          exifDeviceMake: exifData.deviceMake || null,
          exifDeviceModel: exifData.deviceModel || null,
          exifLatitude: exifData.gpsLatitude ? new Decimal(exifData.gpsLatitude) : null,
          exifLongitude: exifData.gpsLongitude ? new Decimal(exifData.gpsLongitude) : null,
          exifTrustScore: validationResult.trustScore,
          exifWarnings: validationResult.warnings.length > 0 
            ? JSON.stringify(validationResult.warnings) 
            : null,
          exifValidatedAt: new Date(),
          exifIsValid: validationResult.isValid,
          exifData: JSON.stringify(exifData),
          // Also update capturedAt if we have EXIF capture date
          capturedAt: exifData.capturedAt || existingPhoto.capturedAt,
        }
      });
    }

    // Create new photo record if jobCardId provided but no photoId
    if (!existingPhoto && jobCardId) {
      // This would require file upload handling
      // For now, we just return validation results
      console.log('[API] New photo validation for job card:', jobCardId);
    }

    return NextResponse.json({
      success: true,
      data: {
        photoId: existingPhoto?.id,
        validation: {
          isValid: validationResult.isValid,
          trustScore: validationResult.trustScore,
          warnings: validationResult.warnings,
        },
        exifData,
        formattedExif,
        context: {
          expectedDateRange: context.expectedDateRange ? {
            start: context.expectedDateRange.start.toISOString(),
            end: context.expectedDateRange.end.toISOString(),
          } : null,
          expectedLocation: context.expectedLocation || null,
          allowedDevices: context.allowedDevices || null,
        }
      }
    });
  } catch (error) {
    console.error('[API] Error validating photo:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate photo' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/photos/validate
 * Bulk revalidate photos
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { photoIds, jobCardId } = body;

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'photoIds array is required' },
        { status: 400 }
      );
    }

    // Limit bulk operation
    if (photoIds.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Maximum 50 photos can be validated at once' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    // Get job card context if provided
    let jobCardContext: ExifValidationContext = {};
    if (jobCardId) {
      const jobCard = await db.jobCard.findUnique({
        where: { id: jobCardId },
        select: {
          scheduledStart: true,
          scheduledEnd: true,
        }
      });

      if (jobCard?.scheduledStart && jobCard?.scheduledEnd) {
        const startDate = new Date(jobCard.scheduledStart);
        startDate.setDate(startDate.getDate() - 7);
        
        jobCardContext.expectedDateRange = {
          start: startDate,
          end: new Date(jobCard.scheduledEnd),
        };
      }
    }

    for (const photoId of photoIds) {
      try {
        const photo = await db.jcPhoto.findUnique({
          where: { id: photoId }
        });

        if (!photo) {
          errors.push({ photoId, error: 'Photo not found' });
          continue;
        }

        // Try to read file
        let buffer: Buffer | null = null;
        try {
          const fs = await import('fs');
          const path = await import('path');
          const fullPath = path.join(process.cwd(), 'public', photo.filePath);
          
          if (fs.existsSync(fullPath)) {
            const fileBuffer = fs.readFileSync(fullPath);
            buffer = Buffer.from(fileBuffer);
          }
        } catch {
          errors.push({ photoId, error: 'Could not read file' });
          continue;
        }

        if (!buffer) {
          errors.push({ photoId, error: 'File not accessible' });
          continue;
        }

        // Extract and validate EXIF
        const exifData = await extractExif(buffer);
        const validationResult = validateExif(exifData, jobCardContext);

        // Update photo
        await db.jcPhoto.update({
          where: { id: photoId },
          data: {
            exifCapturedAt: exifData.capturedAt || null,
            exifDeviceMake: exifData.deviceMake || null,
            exifDeviceModel: exifData.deviceModel || null,
            exifLatitude: exifData.gpsLatitude ? new Decimal(exifData.gpsLatitude) : null,
            exifLongitude: exifData.gpsLongitude ? new Decimal(exifData.gpsLongitude) : null,
            exifTrustScore: validationResult.trustScore,
            exifWarnings: validationResult.warnings.length > 0 
              ? JSON.stringify(validationResult.warnings) 
              : null,
            exifValidatedAt: new Date(),
            exifIsValid: validationResult.isValid,
            exifData: JSON.stringify(exifData),
          }
        });

        results.push({
          photoId,
          isValid: validationResult.isValid,
          trustScore: validationResult.trustScore,
          warningCount: validationResult.warnings.length,
        });
      } catch (err) {
        errors.push({ photoId, error: String(err) });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        errors: errors.length,
        results,
        errors,
      }
    });
  } catch (error) {
    console.error('[API] Error bulk validating photos:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk validate photos' },
      { status: 500 }
    );
  }
}
