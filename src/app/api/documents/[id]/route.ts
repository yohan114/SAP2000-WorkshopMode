import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiError, 
  apiNotFound,
  apiValidationError,
  handleApiError,
  getCurrentUser,
} from '@/lib/api-utils';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Document category enum
const DocumentCategory = z.enum([
  'POLICY',
  'PROCEDURE',
  'MANUAL',
  'CERTIFICATE',
  'CONTRACT',
  'REPORT',
  'OTHER',
]);

// Schema for updating a document
const updateDocumentSchema = z.object({
  name: z.string().min(1, 'Document name is required').optional(),
  category: DocumentCategory.optional(),
  entityType: z.string().optional().nullable(),
  entityId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.union([
    z.array(z.string()),
    z.string().transform(val => val.split(',').map(t => t.trim()).filter(Boolean)),
  ]).optional().nullable(),
});

// Transform document for response
function transformDocument(doc: {
  id: string;
  name: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string | null;
  category: string;
  entityType: string | null;
  entityId: string | null;
  description: string | null;
  tags: string | null;
  uploadedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  uploader?: { id: string; name: string; email: string } | null;
}) {
  return {
    id: doc.id,
    name: doc.name,
    fileName: doc.fileName,
    filePath: doc.filePath,
    fileSize: doc.fileSize,
    mimeType: doc.mimeType || 'application/octet-stream',
    category: doc.category,
    entityType: doc.entityType,
    entityId: doc.entityId,
    description: doc.description,
    tags: doc.tags ? JSON.parse(doc.tags) : [],
    uploadedBy: doc.uploadedBy,
    uploadedByName: doc.uploader?.name || null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// GET /api/documents/[id] - Get a single document
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    
    // Check if download is requested
    const download = url.searchParams.get('download') === 'true';

    const document = await db.document.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!document || !document.isActive) {
      return apiNotFound('Document');
    }

    // If download is requested, serve the file
    if (download) {
      try {
        // Construct the file path
        const filePath = path.join(process.cwd(), 'public', document.filePath);
        
        if (!existsSync(filePath)) {
          return apiError('File not found on server', 404);
        }

        // Read the file
        const fileBuffer = await readFile(filePath);
        
        // Determine content type
        const contentType = document.mimeType || 'application/octet-stream';
        
        // Return the file with appropriate headers
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${document.fileName}"`,
            'Content-Length': String(fileBuffer.length),
          },
        });
      } catch (fileError) {
        console.error('Error reading file:', fileError);
        return apiError('Failed to read file', 500);
      }
    }

    // Return document metadata
    return apiSuccess(transformDocument(document));
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/documents/[id] - Update a document
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await request.json();

    const result = updateDocumentSchema.safeParse(body);
    if (!result.success) {
      return apiValidationError(result.error);
    }

    const data = result.data;

    // Check if document exists
    const existing = await db.document.findUnique({
      where: { id },
    });

    if (!existing || !existing.isActive) {
      return apiNotFound('Document');
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.entityType !== undefined) updateData.entityType = data.entityType;
    if (data.entityId !== undefined) updateData.entityId = data.entityId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.tags !== undefined) {
      updateData.tags = data.tags && Array.isArray(data.tags) && data.tags.length > 0
        ? JSON.stringify(data.tags)
        : null;
    }

    // Update the document
    const document = await db.document.update({
      where: { id },
      data: updateData,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return apiSuccess(transformDocument(document), 'Document updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/documents/[id] - Delete a document
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if document exists
    const existing = await db.document.findUnique({
      where: { id },
    });

    if (!existing || !existing.isActive) {
      return apiNotFound('Document');
    }

    // Try to delete the physical file
    try {
      const filePath = path.join(process.cwd(), 'public', existing.filePath);
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch (fileError) {
      // Log the error but don't fail the request
      console.warn('Failed to delete physical file:', fileError);
    }

    // Soft delete the document record
    await db.document.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return apiSuccess(null, 'Document deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
