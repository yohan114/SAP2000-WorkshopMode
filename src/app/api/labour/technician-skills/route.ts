import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for technician skill
const technicianSkillSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  skillId: z.string().min(1, 'Skill is required'),
  status: z.enum(['ACTIVE', 'EXPIRED', 'SUSPENDED']).default('ACTIVE'),
  awardedDate: z.string().optional(),
  expiryDate: z.string().optional(),
  certificateUrl: z.string().optional(),
  trainingRef: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/labour/technician-skills - List technician skills
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const employeeId = searchParams.get('employeeId');
    const skillId = searchParams.get('skillId');
    const status = searchParams.get('status');
    const expiringWithin = searchParams.get('expiringWithin'); // days

    const where: Record<string, unknown> = {};
    
    if (employeeId) {
      where.employeeId = employeeId;
    }
    
    if (skillId) {
      where.skillId = skillId;
    }
    
    if (status) {
      where.status = status;
    }

    // Filter by expiring within X days
    if (expiringWithin) {
      const days = parseInt(expiringWithin);
      const now = new Date();
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      where.expiryDate = {
        gte: now,
        lte: futureDate,
      };
    }

    const [technicianSkills, total] = await Promise.all([
      db.technicianSkill.findMany({
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
          skill: {
            select: {
              id: true,
              code: true,
              name: true,
              category: true,
              level: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.technicianSkill.count({ where }),
    ]);

    return NextResponse.json({
      data: technicianSkills,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching technician skills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch technician skills' },
      { status: 500 }
    );
  }
}

// POST /api/labour/technician-skills - Assign skill to technician
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = technicianSkillSchema.parse(body);

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

    // Check if skill exists
    const skill = await db.skill.findUnique({
      where: { id: validatedData.skillId },
    });

    if (!skill) {
      return NextResponse.json(
        { error: 'Skill not found' },
        { status: 404 }
      );
    }

    // Check if already assigned
    const existing = await db.technicianSkill.findUnique({
      where: {
        employeeId_skillId: {
          employeeId: validatedData.employeeId,
          skillId: validatedData.skillId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Skill already assigned to this technician' },
        { status: 400 }
      );
    }

    // Calculate expiry date if skill expires and not provided
    let expiryDate = validatedData.expiryDate ? new Date(validatedData.expiryDate) : null;
    if (!expiryDate && skill.expires && skill.validityDays) {
      const awardedDate = validatedData.awardedDate 
        ? new Date(validatedData.awardedDate) 
        : new Date();
      expiryDate = new Date(awardedDate.getTime() + skill.validityDays * 24 * 60 * 60 * 1000);
    }

    const technicianSkill = await db.technicianSkill.create({
      data: {
        employeeId: validatedData.employeeId,
        skillId: validatedData.skillId,
        status: validatedData.status,
        awardedDate: validatedData.awardedDate ? new Date(validatedData.awardedDate) : new Date(),
        expiryDate,
        certificateUrl: validatedData.certificateUrl,
        trainingRef: validatedData.trainingRef,
        notes: validatedData.notes,
      },
      include: {
        employee: true,
        skill: true,
      },
    });

    return NextResponse.json(technicianSkill, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error assigning skill:', error);
    return NextResponse.json(
      { error: 'Failed to assign skill' },
      { status: 500 }
    );
  }
}
