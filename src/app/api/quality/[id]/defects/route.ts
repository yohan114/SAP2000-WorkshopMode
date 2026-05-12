import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const createDefectSchema = z.object({
  severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR', 'OBSERVATION']),
  defectCode: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  location: z.string().optional(),
  assignedToId: z.string().optional(),
});

const updateDefectSchema = z.object({
  severity: z.enum(['CRITICAL', 'MAJOR', 'MINOR', 'OBSERVATION']).optional(),
  defectCode: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED']).optional(),
  assignedToId: z.string().optional().nullable(),
  resolutionNotes: z.string().optional().nullable(),
  verificationNotes: z.string().optional().nullable(),
});

// GET - Get all defects for an inspection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const defects = await db.qualityDefect.findMany({
      where: { inspectionId: id },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        correctiveActions: {
          include: {
            jobCard: { select: { id: true, jobCardNumber: true, status: true } },
            assignee: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(defects);

  } catch (error) {
    console.error('Error fetching defects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch defects' },
      { status: 500 }
    );
  }
}

// POST - Create a new defect
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = createDefectSchema.parse(body);

    // Verify inspection exists
    const inspection = await db.qualityInspection.findUnique({
      where: { id }
    });

    if (!inspection) {
      return NextResponse.json(
        { error: 'Inspection not found' },
        { status: 404 }
      );
    }

    if (!['IN_PROGRESS'].includes(inspection.status)) {
      return NextResponse.json(
        { error: 'Can only add defects to in-progress inspections' },
        { status: 400 }
      );
    }

    const defect = await db.qualityDefect.create({
      data: {
        inspectionId: id,
        severity: data.severity,
        defectCode: data.defectCode || null,
        description: data.description,
        location: data.location || null,
        assignedToId: data.assignedToId || null,
        status: 'OPEN'
      },
      include: {
        assignee: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(defect, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating defect:', error);
    return NextResponse.json(
      { error: 'Failed to create defect' },
      { status: 500 }
    );
  }
}
