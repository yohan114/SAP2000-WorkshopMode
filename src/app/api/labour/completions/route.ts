import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for training completion
const completionSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  trainingId: z.string().min(1, 'Training is required'),
  completedAt: z.string(),
  expiresAt: z.string().optional(),
  score: z.number().optional(),
  certificateRef: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/labour/completions - List training completions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const employeeId = searchParams.get('employeeId');
    const trainingId = searchParams.get('trainingId');
    const expiringWithin = searchParams.get('expiringWithin'); // days

    const where: Record<string, unknown> = {};
    
    if (employeeId) {
      where.employeeId = employeeId;
    }
    
    if (trainingId) {
      where.trainingId = trainingId;
    }

    // Filter by expiring within X days
    if (expiringWithin) {
      const days = parseInt(expiringWithin);
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      where.expiresAt = {
        gte: now,
        lte: futureDate,
      };
    }

    const [completions, total] = await Promise.all([
      db.trainingCompletion.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employeeNumber: true,
              name: true,
              designation: true,
              department: true,
            },
          },
          training: {
            select: {
              id: true,
              code: true,
              name: true,
              category: true,
              validityPeriod: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.trainingCompletion.count({ where }),
    ]);

    return NextResponse.json({
      data: completions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching training completions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training completions' },
      { status: 500 }
    );
  }
}

// POST /api/labour/completions - Record training completion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = completionSchema.parse(body);

    // Check if employee exists
    const employee = await db.employee.findUnique({
      where: { id: validatedData.employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check if training exists
    const training = await db.training.findUnique({
      where: { id: validatedData.trainingId },
    });

    if (!training) {
      return NextResponse.json(
        { error: 'Training not found' },
        { status: 404 }
      );
    }

    // Check if already completed
    const existing = await db.trainingCompletion.findUnique({
      where: {
        employeeId_trainingId: {
          employeeId: validatedData.employeeId,
          trainingId: validatedData.trainingId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Training already completed by this employee' },
        { status: 400 }
      );
    }

    // Calculate expiry date if training has validity period
    let expiresAt = validatedData.expiresAt ? new Date(validatedData.expiresAt) : null;
    if (!expiresAt && training.validityPeriod) {
      const completedAt = new Date(validatedData.completedAt);
      expiresAt = new Date(completedAt.getTime() + training.validityPeriod * 24 * 60 * 60 * 1000);
    }

    const completion = await db.trainingCompletion.create({
      data: {
        employeeId: validatedData.employeeId,
        trainingId: validatedData.trainingId,
        completedAt: new Date(validatedData.completedAt),
        expiresAt,
        score: validatedData.score,
        certificateRef: validatedData.certificateRef,
        notes: validatedData.notes,
      },
      include: {
        employee: true,
        training: true,
      },
    });

    return NextResponse.json(completion, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error recording training completion:', error);
    return NextResponse.json(
      { error: 'Failed to record training completion' },
      { status: 500 }
    );
  }
}
