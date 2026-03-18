import { db } from '@/lib/db';
import { 
  apiSuccess, 
  apiPaginated, 
  apiError, 
  parsePagination,
  getSkip,
  generateDocumentNumber 
} from '@/lib/api-utils';
import { z } from 'zod';

// Material Issue status enum
const MiStatus = {
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  PARTIALLY_RETURNED: 'PARTIALLY_RETURNED',
  RETURNED: 'RETURNED',
  CANCELLED: 'CANCELLED',
} as const;

// Schema for creating material issue
const createMaterialIssueSchema = z.object({
  mrId: z.string().optional(),
  storeId: z.string().min(1),
  issuedToId: z.string().min(1),
  jobCardId: z.string().optional(),
  issueType: z.enum(['STANDARD', 'EMERGENCY', 'RETURN']).default('STANDARD'),
  notes: z.string().optional(),
  lines: z.array(z.object({
    itemId: z.string(),
    issuedQty: z.number().positive(),
    unitCost: z.number().optional(),
    serialNumber: z.string().optional(),
    batchNumber: z.string().optional(),
    notes: z.string().optional(),
  })).min(1),
});

// GET /api/material-issues - List material issues with pagination and filters
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Additional filters
    const status = url.searchParams.get('status');
    const storeId = url.searchParams.get('storeId');
    const jobCardId = url.searchParams.get('jobCardId');
    const issuedToId = url.searchParams.get('issuedToId');

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };
    
    if (status) {
      where.status = status;
    }
    if (storeId) {
      where.storeId = storeId;
    }
    if (jobCardId) {
      where.jobCardId = jobCardId;
    }
    if (issuedToId) {
      where.issuedToId = issuedToId;
    }
    
    if (search) {
      where.OR = [
        { miNumber: { contains: search } },
      ];
    }

    // Build orderBy
    let orderBy: Array<Record<string, string>>;
    if (sortBy) {
      orderBy = [{ [sortBy]: sortOrder }];
    } else {
      orderBy = [{ createdAt: 'desc' }];
    }

    const [materialIssues, total] = await Promise.all([
      db.materialIssue.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          store: {
            select: { id: true, code: true, name: true },
          },
          issuedTo: {
            select: { id: true, name: true, email: true },
          },
          jobCard: {
            select: { id: true, jobCardNumber: true, status: true },
          },
          materialRequest: {
            select: { id: true, mrNumber: true },
          },
          lines: {
            include: {
              item: {
                select: { id: true, itemCode: true, name: true, unitOfMeasure: true },
              },
            },
          },
          _count: {
            select: { lines: true },
          },
        },
      }),
      db.materialIssue.count({ where }),
    ]);

    // Transform data - convert Decimal to number for JSON serialization
    const data = materialIssues.map(mi => ({
      id: mi.id,
      miNumber: mi.miNumber,
      store: mi.store,
      issuedTo: mi.issuedTo,
      jobCard: mi.jobCard,
      materialRequest: mi.materialRequest,
      issueType: mi.issueType,
      status: mi.status,
      totalValue: mi.totalValue ? Number(mi.totalValue) : 0,
      lineCount: mi._count.lines,
      lines: mi.lines.map(line => ({
        id: line.id,
        item: line.item,
        issuedQty: line.issuedQty ? Number(line.issuedQty) : 0,
        unitCost: line.unitCost ? Number(line.unitCost) : 0,
        totalCost: line.totalCost ? Number(line.totalCost) : 0,
        serialNumber: line.serialNumber,
        batchNumber: line.batchNumber,
      })),
      issuedAt: mi.issuedAt,
      createdAt: mi.createdAt,
    }));

    return apiPaginated(data, total, page, limit);
  } catch (error) {
    console.error('Get material issues error:', error);
    return apiError('Failed to fetch material issues', 500);
  }
}

// POST /api/material-issues - Create new material issue
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const result = createMaterialIssueSchema.safeParse(body);
    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const data = result.data;

    // Verify store exists
    const store = await db.store.findUnique({
      where: { id: data.storeId },
    });
    if (!store || !store.isActive) {
      return apiError('Store not found', 404);
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: data.issuedToId },
    });
    if (!user) {
      return apiError('User not found', 404);
    }

    // Get sequence for MI number
    const currentMonth = new Date().toISOString().slice(0, 7);
    const count = await db.materialIssue.count({
      where: {
        createdAt: {
          gte: new Date(`${currentMonth}-01`),
        },
      },
    });

    const miNumber = generateDocumentNumber('MI', count + 1);

    // Calculate total value
    let totalValue = 0;
    const linesData = await Promise.all(
      data.lines.map(async (line) => {
        // Get stock info for unit cost
        const stock = await db.storeStock.findFirst({
          where: { storeId: data.storeId, itemId: line.itemId },
        });
        
        const unitCost = line.unitCost || stock?.wac?.toNumber() || 0;
        const totalCost = unitCost * line.issuedQty;
        totalValue += totalCost;

        return {
          itemId: line.itemId,
          issuedQty: line.issuedQty,
          unitCost,
          totalCost,
          serialNumber: line.serialNumber,
          batchNumber: line.batchNumber,
          notes: line.notes,
        };
      })
    );

    // Create material issue with lines
    const materialIssue = await db.materialIssue.create({
      data: {
        miNumber,
        mrId: data.mrId,
        storeId: data.storeId,
        issuedToId: data.issuedToId,
        jobCardId: data.jobCardId,
        issueType: data.issueType,
        status: MiStatus.DRAFT,
        totalValue,
        lines: {
          create: linesData,
        },
      },
      include: {
        store: true,
        issuedTo: true,
        lines: {
          include: {
            item: true,
          },
        },
      },
    });

    return apiSuccess(materialIssue, 'Material issue created successfully', 201);
  } catch (error) {
    console.error('Create material issue error:', error);
    return apiError('Failed to create material issue', 500);
  }
}
