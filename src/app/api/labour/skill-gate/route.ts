import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for skill gate check
const skillGateSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  requiredSkills: z.array(z.string()).min(1, 'At least one required skill is needed'),
});

// GET /api/labour/skill-gate - Get employee skills status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Get employee with their skills
    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: {
        technicianSkills: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Categorize skills
    const activeSkills = employee.technicianSkills.filter(
      ts => ts.status === 'ACTIVE' && (!ts.expiryDate || ts.expiryDate > now)
    );
    
    const expiringSkills = employee.technicianSkills.filter(
      ts => ts.status === 'ACTIVE' && ts.expiryDate && 
        ts.expiryDate > now && ts.expiryDate <= thirtyDaysFromNow
    );
    
    const expiredSkills = employee.technicianSkills.filter(
      ts => ts.status === 'EXPIRED' || (ts.expiryDate && ts.expiryDate <= now)
    );
    
    const suspendedSkills = employee.technicianSkills.filter(
      ts => ts.status === 'SUSPENDED'
    );

    return NextResponse.json({
      employee: {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        name: employee.name,
        designation: employee.designation,
        department: employee.department,
      },
      skills: {
        active: activeSkills.map(ts => ({
          id: ts.id,
          skill: ts.skill,
          awardedDate: ts.awardedDate,
          expiryDate: ts.expiryDate,
          isExpiringSoon: expiringSkills.includes(ts),
        })),
        expired: expiredSkills.map(ts => ({
          id: ts.id,
          skill: ts.skill,
          expiryDate: ts.expiryDate,
        })),
        suspended: suspendedSkills.map(ts => ({
          id: ts.id,
          skill: ts.skill,
        })),
      },
      summary: {
        totalSkills: employee.technicianSkills.length,
        activeCount: activeSkills.length,
        expiringCount: expiringSkills.length,
        expiredCount: expiredSkills.length,
        suspendedCount: suspendedSkills.length,
      },
    });
  } catch (error) {
    console.error('Error checking skill gate:', error);
    return NextResponse.json(
      { error: 'Failed to check skill gate' },
      { status: 500 }
    );
  }
}

// POST /api/labour/skill-gate - Validate skill gate for assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = skillGateSchema.parse(body);

    // Get employee's active skills
    const employeeSkills = await db.technicianSkill.findMany({
      where: {
        employeeId: validatedData.employeeId,
        status: 'ACTIVE',
      },
      include: {
        skill: true,
      },
    });

    const now = new Date();
    const results: Array<{
      skillCode: string;
      status: 'PASS' | 'FAIL' | 'EXPIRED' | 'EXPIRING_SOON';
      message: string;
      skill?: {
        id: string;
        code: string;
        name: string;
      };
    }> = [];

    let overallStatus = 'PASS';

    for (const requiredSkillCode of validatedData.requiredSkills) {
      // Find the skill by code
      const skill = await db.skill.findUnique({
        where: { code: requiredSkillCode },
      });

      if (!skill) {
        results.push({
          skillCode: requiredSkillCode,
          status: 'FAIL',
          message: `Skill ${requiredSkillCode} not found in system`,
        });
        overallStatus = 'FAIL';
        continue;
      }

      // Check if employee has this skill
      const employeeSkill = employeeSkills.find(
        es => es.skill.code === requiredSkillCode
      );

      if (!employeeSkill) {
        results.push({
          skillCode: requiredSkillCode,
          status: 'FAIL',
          message: `Employee does not have required skill: ${skill.name}`,
          skill: { id: skill.id, code: skill.code, name: skill.name },
        });
        overallStatus = 'FAIL';
        continue;
      }

      // Check if skill is expired
      if (employeeSkill.expiryDate && employeeSkill.expiryDate <= now) {
        results.push({
          skillCode: requiredSkillCode,
          status: 'EXPIRED',
          message: `Skill ${skill.name} expired on ${employeeSkill.expiryDate.toISOString().split('T')[0]}`,
          skill: { id: skill.id, code: skill.code, name: skill.name },
        });
        overallStatus = 'FAIL';
        continue;
      }

      // Check if skill is expiring soon (within 30 days)
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (employeeSkill.expiryDate && employeeSkill.expiryDate <= thirtyDaysFromNow) {
        results.push({
          skillCode: requiredSkillCode,
          status: 'EXPIRING_SOON',
          message: `Skill ${skill.name} expires on ${employeeSkill.expiryDate.toISOString().split('T')[0]}`,
          skill: { id: skill.id, code: skill.code, name: skill.name },
        });
        // Expiring soon is a warning, not a fail
        continue;
      }

      // Skill is valid
      results.push({
        skillCode: requiredSkillCode,
        status: 'PASS',
        message: `Skill ${skill.name} is valid`,
        skill: { id: skill.id, code: skill.code, name: skill.name },
      });
    }

    return NextResponse.json({
      employeeId: validatedData.employeeId,
      overallStatus,
      canProceed: overallStatus === 'PASS',
      details: results,
      warnings: results.filter(r => r.status === 'EXPIRING_SOON'),
      failures: results.filter(r => r.status === 'FAIL' || r.status === 'EXPIRED'),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error validating skill gate:', error);
    return NextResponse.json(
      { error: 'Failed to validate skill gate' },
      { status: 500 }
    );
  }
}
