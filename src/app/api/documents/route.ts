import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  apiValidationError,
  parsePagination,
  getSkip,
  getCurrentUser,
} from '@/lib/api-utils';
import { z } from 'zod';
import { writeFile, mkdir } from 'fs/promises';
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

// BUG FIX #48: Allowed file types for security
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Schema for creating a document (metadata only, file handled separately)
const createDocumentSchema = z.object({
  name: z.string().min(1, 'Document name is required'),
  fileName: z.string().min(1, 'File name is required'),
  filePath: z.string().min(1, 'File path is required'),
  fileSize: z.number().int().min(0).optional().default(0),
  mimeType: z.string().optional(),
  category: DocumentCategory.default('OTHER'),
  entityType: z.string().optional().nullable(),
  entityId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.union([
    z.array(z.string()),
    z.string().transform(val => val.split(',').map(t => t.trim()).filter(Boolean)),
  ]).optional().nullable(),
});

// GET /api/documents - List all documents with optional filters
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Additional filters
    const category = url.searchParams.get('category');
    const entityType = url.searchParams.get('entityType');
    const entityId = url.searchParams.get('entityId');

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };

    if (category && category !== 'all') {
      where.category = category;
    }
    if (entityType) {
      where.entityType = entityType;
    }
    if (entityId) {
      where.entityId = entityId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { fileName: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Determine sort
    const orderBy: Record<string, unknown> = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      db.document.count({ where }),
    ]);

    // Transform data to match frontend expectations
    const data = documents.map(doc => ({
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
    }));

    return apiPaginated(data, total, page, limit);
  } catch (error) {
    console.error('Get documents error:', error);
    return apiError('Failed to fetch documents', 500);
  }
}

// POST /api/documents - Create a new document (with file upload)
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    
    // Check if this is a multipart form data request (file upload)
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const name = formData.get('name') as string;
      const category = formData.get('category') as string || 'OTHER';
      const description = formData.get('description') as string || '';
      const tagsStr = formData.get('tags') as string || '';
      const entityType = formData.get('entityType') as string || null;
      const entityId = formData.get('entityId') as string || null;

      if (!file) {
        return apiError('No file provided', 400);
      }

      if (!name) {
        return apiError('Document name is required', 400);
      }

      // BUG FIX #48: Validate file type for security
      if (file.type && !ALLOWED_FILE_TYPES.includes(file.type)) {
        return apiError(
          `Invalid file type: ${file.type}. Allowed types: PDF, Images (JPEG, PNG, GIF, WebP), Word, Excel, PowerPoint, Text, CSV`,
          400
        );
      }

      // Validate file size (max 50MB)
      if (file.size > MAX_FILE_SIZE) {
        return apiError('File size exceeds 50MB limit', 400);
      }

      // Create upload directory if it doesn't exist
      const uploadDir = path.join(process.cwd(), 'public', 'documents');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const extension = file.name.split('.').pop() || 'bin';
      const uniqueFileName = `${timestamp}-${randomStr}.${extension}`;
      const filePath = path.join(uploadDir, uniqueFileName);

      // Convert file to buffer and write
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Public URL path
      const publicPath = `/documents/${uniqueFileName}`;

      // Parse tags
      let tags: string[] = [];
      if (tagsStr) {
        try {
          tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
        } catch {
          tags = [];
        }
      }

      // Validate category
      const categoryResult = DocumentCategory.safeParse(category);
      const validCategory = categoryResult.success ? categoryResult.data : 'OTHER';

      // Create document record
      const document = await db.document.create({
        data: {
          name,
          fileName: file.name,
          filePath: publicPath,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          category: validCategory,
          entityType: entityType || null,
          entityId: entityId || null,
          description: description || null,
          tags: tags.length > 0 ? JSON.stringify(tags) : null,
          uploadedBy: user?.id || null,
        },
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

      // Transform response
      const response = {
        id: document.id,
        name: document.name,
        fileName: document.fileName,
        filePath: document.filePath,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        category: document.category,
        entityType: document.entityType,
        entityId: document.entityId,
        description: document.description,
        tags: document.tags ? JSON.parse(document.tags) : [],
        uploadedBy: document.uploadedBy,
        uploadedByName: document.uploader?.name || null,
        createdAt: document.createdAt.toISOString(),
      };

      return apiSuccess(response, 'Document uploaded successfully', 201);
    } else {
      // Handle JSON request (metadata only, no file)
      const body = await request.json();
      
      const result = createDocumentSchema.safeParse(body);
      if (!result.success) {
        return apiValidationError(result.error);
      }

      const data = result.data;

      // Create document record
      const document = await db.document.create({
        data: {
          name: data.name,
          fileName: data.fileName,
          filePath: data.filePath,
          fileSize: data.fileSize || 0,
          mimeType: data.mimeType || null,
          category: data.category,
          entityType: data.entityType || null,
          entityId: data.entityId || null,
          description: data.description || null,
          tags: data.tags && Array.isArray(data.tags) && data.tags.length > 0 
            ? JSON.stringify(data.tags) 
            : null,
          uploadedBy: user?.id || null,
        },
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

      // Transform response
      const response = {
        id: document.id,
        name: document.name,
        fileName: document.fileName,
        filePath: document.filePath,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        category: document.category,
        entityType: document.entityType,
        entityId: document.entityId,
        description: document.description,
        tags: document.tags ? JSON.parse(document.tags) : [],
        uploadedBy: document.uploadedBy,
        uploadedByName: document.uploader?.name || null,
        createdAt: document.createdAt.toISOString(),
      };

      return apiSuccess(response, 'Document created successfully', 201);
    }
  } catch (error) {
    console.error('Create document error:', error);
    return apiError('Failed to create document', 500);
  }
}
