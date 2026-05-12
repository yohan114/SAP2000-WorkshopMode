import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

/**
 * @openapi
 * /api/quality:
 *   get:
 *     tags:
 *       - Quality
 *     summary: List all quality inspections
 *     description: Retrieve a paginated list of quality inspections with optional filtering by status, type, and date range. Includes statistics and analytics.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for inspection number
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/InspectionStatus'
 *         description: Filter by inspection status
 *       - in: query
 *         name: entityType
 *         schema:
 *           $ref: '#/components/schemas/EntityType'
 *         description: Filter by entity type
 *       - in: query
 *         name: inspectionType
 *         schema:
 *           $ref: '#/components/schemas/InspectionType'
 *         description: Filter by inspection type
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by scheduled date (from)
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by scheduled date (to)
 *     responses:
 *       200:
 *         description: List of quality inspections with pagination, statistics, and analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/QualityInspection'
 *                       - type: object
 *                         properties:
 *                           inspector:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                           template:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               code:
 *                                 type: string
 *                           _count:
 *                             type: object
 *                             properties:
 *                               checklistItems:
 *                                 type: integer
 *                               defects:
 *                                 type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     passed:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     passRate:
 *                       type: integer
 *                       description: Pass rate percentage
 *                 analytics:
 *                   type: object
 *                   properties:
 *                     passRateTrend:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                           total:
 *                             type: integer
 *                           passed:
 *                             type: integer
 *                           rate:
 *                             type: integer
 *                     defectsBySeverity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           severity:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     inspectorWorkload:
 *                       type: array
 *                       items:
 *                         type: object
 *                     upcomingInspections:
 *                       type: array
 *                       items:
 *                         type: object
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *   post:
 *     tags:
 *       - Quality
 *     summary: Create a new inspection
 *     description: Create a new quality inspection. If a template is specified, checklist items are automatically populated from the template.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInspectionInput'
 *     responses:
 *       201:
 *         description: Inspection created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/QualityInspection'
 *                 - type: object
 *                   properties:
 *                     checklistItems:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           criterion:
 *                             type: string
 *                           expectedResult:
 *                             type: string
 *                           isMandatory:
 *                             type: boolean
 *                           sequence:
 *                             type: integer
 *                           status:
 *                             type: string
 *                     inspector:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                     template:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         code:
 *                           type: string
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

// Schema for creating a new inspection
const createInspectionSchema = z.object({
  entityType: z.enum(['JOB_CARD', 'GRN', 'ASSET']),
  entityId: z.string().optional(),
  inspectionType: z.enum(['PRE_USE', 'POST_REPAIR', 'INCOMING', 'ROUTINE', 'FINAL']),
  templateId: z.string().optional(),
  scheduledDate: z.string().optional(),
  inspectorId: z.string().optional(),
  notes: z.string().optional(),
});

// GET - List all inspections with filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const entityType = searchParams.get('entityType');
    const inspectionType = searchParams.get('inspectionType');
    const search = searchParams.get('search');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (entityType && entityType !== 'all') {
      where.entityType = entityType;
    }

    if (inspectionType && inspectionType !== 'all') {
      where.inspectionType = inspectionType;
    }

    if (search) {
      where.inspectionNumber = { contains: search };
    }

    if (fromDate || toDate) {
      where.scheduledDate = {};
      if (fromDate) {
        (where.scheduledDate as Record<string, unknown>).gte = new Date(fromDate);
      }
      if (toDate) {
        (where.scheduledDate as Record<string, unknown>).lte = new Date(toDate);
      }
    }

    const [inspections, total] = await Promise.all([
      db.qualityInspection.findMany({
        where,
        include: {
          inspector: {
            select: { id: true, name: true, email: true }
          },
          template: {
            select: { id: true, name: true, code: true }
          },
          _count: {
            select: {
              checklistItems: true,
              defects: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.qualityInspection.count({ where })
    ]);

    // Calculate stats
    const stats = await db.qualityInspection.aggregate({
      where: { isActive: true },
      _count: {
        id: true,
      }
    });

    const passCount = await db.qualityInspection.count({
      where: { isActive: true, result: 'PASS' }
    });

    const failCount = await db.qualityInspection.count({
      where: { isActive: true, result: 'FAIL' }
    });

    // Pass rate trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyStats = await db.$queryRaw<Array<{ month: string; total: number; passed: number }>>`
      SELECT 
        strftime('%Y-%m', createdAt) as month,
        COUNT(*) as total,
        SUM(CASE WHEN result = 'PASS' THEN 1 ELSE 0 END) as passed
      FROM QualityInspection
      WHERE isActive = 1 AND createdAt >= ${sixMonthsAgo}
      GROUP BY strftime('%Y-%m', createdAt)
      ORDER BY month ASC
    `;

    // Defects by severity
    const defectsBySeverity = await db.qualityDefect.groupBy({
      by: ['severity'],
      _count: { id: true },
      where: { inspection: { isActive: true } }
    });

    // Inspector workload
    const inspectorWorkload = await db.qualityInspection.groupBy({
      by: ['inspectorId'],
      _count: { id: true },
      where: {
        isActive: true,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      }
    });

    const inspectorIds = inspectorWorkload.map(i => i.inspectorId).filter(Boolean) as string[];
    const inspectors = await db.user.findMany({
      where: { id: { in: inspectorIds } },
      select: { id: true, name: true }
    });

    const inspectorStats = inspectorWorkload.map(iw => ({
      inspector: inspectors.find(i => i.id === iw.inspectorId),
      count: iw._count.id
    }));

    // Upcoming inspections (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const upcomingInspections = await db.qualityInspection.findMany({
      where: {
        isActive: true,
        status: 'SCHEDULED',
        scheduledDate: {
          gte: new Date(),
          lte: nextWeek
        }
      },
      include: {
        inspector: { select: { id: true, name: true } }
      },
      orderBy: { scheduledDate: 'asc' },
      take: 10
    });

    return NextResponse.json({
      data: inspections,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        total: stats._count.id,
        passed: passCount,
        failed: failCount,
        passRate: stats._count.id > 0 ? Math.round((passCount / stats._count.id) * 100) : 0
      },
      analytics: {
        passRateTrend: monthlyStats.map(m => ({
          month: m.month,
          total: Number(m.total),
          passed: Number(m.passed),
          rate: Number(m.total) > 0 ? Math.round((Number(m.passed) / Number(m.total)) * 100) : 0
        })),
        defectsBySeverity: defectsBySeverity.map(d => ({
          severity: d.severity,
          count: d._count.id
        })),
        inspectorWorkload: inspectorStats,
        upcomingInspections
      }
    });

  } catch (error) {
    console.error('Error fetching inspections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inspections' },
      { status: 500 }
    );
  }
}

// POST - Create a new inspection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createInspectionSchema.parse(body);

    // Generate inspection number
    const date = new Date();
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const lastInspection = await db.qualityInspection.findFirst({
      where: {
        inspectionNumber: { startsWith: `QI-${yearMonth}` }
      },
      orderBy: { inspectionNumber: 'desc' }
    });

    let sequence = 1;
    if (lastInspection) {
      const lastSequence = parseInt(lastInspection.inspectionNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }

    const inspectionNumber = `QI-${yearMonth}-${String(sequence).padStart(4, '0')}`;

    // If template is specified, get template items
    let templateItems: Array<{ criterion: string; expectedResult: string | null; isMandatory: boolean; sequence: number }> = [];
    if (data.templateId) {
      const template = await db.qualityTemplate.findUnique({
        where: { id: data.templateId },
        include: {
          items: {
            orderBy: { sequence: 'asc' }
          }
        }
      });

      if (template) {
        templateItems = template.items.map(item => ({
          criterion: item.criterion,
          expectedResult: item.expectedResult,
          isMandatory: item.isMandatory,
          sequence: item.sequence
        }));
      }
    }

    // Create inspection with checklist items
    const inspection = await db.qualityInspection.create({
      data: {
        inspectionNumber,
        entityType: data.entityType,
        entityId: data.entityId || null,
        inspectionType: data.inspectionType,
        templateId: data.templateId || null,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        inspectorId: data.inspectorId || null,
        notes: data.notes || null,
        checklistItems: {
          create: templateItems.map(item => ({
            criterion: item.criterion,
            expectedResult: item.expectedResult,
            isMandatory: item.isMandatory,
            sequence: item.sequence,
            status: 'PENDING'
          }))
        }
      },
      include: {
        checklistItems: true,
        inspector: { select: { id: true, name: true } },
        template: { select: { id: true, name: true, code: true } }
      }
    });

    return NextResponse.json(inspection, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating inspection:', error);
    return NextResponse.json(
      { error: 'Failed to create inspection' },
      { status: 500 }
    );
  }
}
