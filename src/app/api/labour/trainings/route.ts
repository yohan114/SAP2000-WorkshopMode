import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for training
const trainingSchema = z.object({
  code: z.string().min(1, 'Training code is required'),
  name: z.string().min(1, 'Training name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  validityPeriod: z.number().optional(), // validity in days
  isRequired: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// GET /api/labour/trainings - List all trainings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const category = searchParams.get('category');
    const isRequired = searchParams.get('isRequired');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    
    if (category) {
      where.category = category;
    }
    
    if (isRequired !== null) {
      where.isRequired = isRequired === 'true';
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }
    
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const [trainings, total] = await Promise.all([
      db.training.findMany({
        where,
        include: {
          _count: {
            select: { completions: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.training.count({ where }),
    ]);

    return NextResponse.json({
      data: trainings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching trainings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trainings' },
      { status: 500 }
    );
  }
}

// POST /api/labour/trainings - Create a new training
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = trainingSchema.parse(body);

    // Check if training code already exists
    const existingTraining = await db.training.findUnique({
      where: { code: validatedData.code },
    });

    if (existingTraining) {
      return NextResponse.json(
        { error: 'Training code already exists' },
        { status: 400 }
      );
    }

    const training = await db.training.create({
      data: validatedData,
    });

    return NextResponse.json(training, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating training:', error);
    return NextResponse.json(
      { error: 'Failed to create training' },
      { status: 500 }
    );
  }
}
