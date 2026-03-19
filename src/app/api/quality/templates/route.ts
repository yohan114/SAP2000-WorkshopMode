import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const createTemplateSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  entityType: z.enum(['JOB_CARD', 'GRN', 'ASSET']),
  inspectionType: z.enum(['PRE_USE', 'POST_REPAIR', 'INCOMING', 'ROUTINE', 'FINAL']),
  description: z.string().optional(),
  items: z.array(z.object({
    criterion: z.string().min(1, 'Criterion is required'),
    expectedResult: z.string().optional(),
    isMandatory: z.boolean().default(true),
    scoringMethod: z.enum(['PASS_FAIL', 'SCORE', 'YES_NO']).default('PASS_FAIL'),
    maxScore: z.number().optional(),
    notes: z.string().optional(),
  })).optional(),
});

// GET - List all templates
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entityType');
    const inspectionType = searchParams.get('inspectionType');
    const active = searchParams.get('active');

    const where: Record<string, unknown> = {};

    if (entityType && entityType !== 'all') {
      where.entityType = entityType;
    }

    if (inspectionType && inspectionType !== 'all') {
      where.inspectionType = inspectionType;
    }

    if (active !== null && active !== 'all') {
      where.isActive = active === 'true';
    }

    const templates = await db.qualityTemplate.findMany({
      where,
      include: {
        items: {
          orderBy: { sequence: 'asc' }
        },
        _count: {
          select: { inspections: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(templates);

  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST - Create a new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createTemplateSchema.parse(body);

    // Check if code already exists
    const existingTemplate = await db.qualityTemplate.findUnique({
      where: { code: data.code }
    });

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'Template code already exists' },
        { status: 400 }
      );
    }

    const template = await db.qualityTemplate.create({
      data: {
        code: data.code,
        name: data.name,
        entityType: data.entityType,
        inspectionType: data.inspectionType,
        description: data.description || null,
        items: {
          create: (data.items || []).map((item, index) => ({
            criterion: item.criterion,
            expectedResult: item.expectedResult || null,
            isMandatory: item.isMandatory,
            scoringMethod: item.scoringMethod,
            maxScore: item.maxScore || null,
            notes: item.notes || null,
            sequence: index + 1
          }))
        }
      },
      include: {
        items: { orderBy: { sequence: 'asc' } }
      }
    });

    return NextResponse.json(template, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
