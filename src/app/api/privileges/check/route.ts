/**
 * Privilege Check API
 * 
 * Endpoints for checking user privileges:
 * - GET: Get user's effective privileges
 * - POST: Check if user has specific privilege/privileges
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getUserPrivileges,
  hasAnyPrivilege,
  hasAllPrivileges,
  checkPrivilege,
  batchCheckPrivileges,
  getUserPrivilegeSummary,
} from '@/lib/privileges';

// Validation schemas
const checkOneSchema = z.object({
  userId: z.string().min(1),
  privilegeCode: z.string().min(1),
  workshopId: z.string().optional(),
  checkAmount: z.number().optional(),
});

const checkAnySchema = z.object({
  userId: z.string().min(1),
  privilegeCodes: z.array(z.string().min(1)).min(1),
  workshopId: z.string().optional(),
  mode: z.enum(['any', 'all']).optional(),
});

const batchCheckSchema = z.object({
  userId: z.string().min(1),
  privilegeCodes: z.array(z.string().min(1)).min(1),
  workshopId: z.string().optional(),
});

/**
 * GET /api/privileges/check
 * Get a user's effective privileges
 * 
 * Query params:
 * - userId: User ID (required)
 * - workshopId: Filter by workshop (optional)
 * - summary: Return summary instead of full list (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const workshopId = searchParams.get('workshopId') || undefined;
    const includeSummary = searchParams.get('summary') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (includeSummary) {
      const summary = await getUserPrivilegeSummary(userId);
      return NextResponse.json({
        data: summary,
      });
    }

    const privileges = await getUserPrivileges(userId, { workshopId });

    // Group by category for easier consumption
    const byCategory = privileges.reduce<Record<string, typeof privileges>>((acc, p) => {
      if (!acc[p.category]) {
        acc[p.category] = [];
      }
      acc[p.category].push(p);
      return acc;
    }, {});

    return NextResponse.json({
      data: privileges,
      byCategory,
      meta: {
        total: privileges.length,
        fromRoles: privileges.filter(p => p.source === 'ROLE').length,
        fromOverrides: privileges.filter(p => p.source === 'OVERRIDE').length,
        categories: Object.keys(byCategory).length,
      },
    });
  } catch (error) {
    console.error('Failed to get user privileges:', error);
    return NextResponse.json(
      { error: 'Failed to get user privileges' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/privileges/check
 * Check if user has specific privilege(s)
 * 
 * Request body modes:
 * 1. Single privilege check:
 *    { userId, privilegeCode, workshopId?, checkAmount? }
 * 
 * 2. Multiple privilege check (any/all):
 *    { userId, privilegeCodes, workshopId?, mode: 'any' | 'all' }
 * 
 * 3. Batch check (returns object with results for each code):
 *    { userId, privilegeCodes, workshopId?, mode: 'batch' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Single privilege check
    if ('privilegeCode' in body && typeof body.privilegeCode === 'string') {
      const validated = checkOneSchema.parse(body);
      
      const result = await checkPrivilege(
        validated.userId,
        validated.privilegeCode,
        {
          workshopId: validated.workshopId,
          checkAmount: validated.checkAmount,
        }
      );

      return NextResponse.json({
        data: result,
      });
    }

    // Multiple privilege check
    if ('privilegeCodes' in body && Array.isArray(body.privilegeCodes)) {
      const mode = body.mode || 'any';
      
      if (mode === 'batch') {
        // Batch check - return result for each privilege
        const validated = batchCheckSchema.parse(body);
        const results = await batchCheckPrivileges(
          validated.userId,
          validated.privilegeCodes,
          { workshopId: validated.workshopId }
        );

        return NextResponse.json({
          data: results,
          meta: {
            total: validated.privilegeCodes.length,
            granted: Object.values(results).filter(Boolean).length,
            denied: Object.values(results).filter(v => !v).length,
          },
        });
      }

      // Any or All check
      const validated = checkAnySchema.parse(body);
      
      let hasAccess: boolean;
      if (validated.mode === 'all') {
        hasAccess = await hasAllPrivileges(
          validated.userId,
          validated.privilegeCodes,
          { workshopId: validated.workshopId }
        );
      } else {
        hasAccess = await hasAnyPrivilege(
          validated.userId,
          validated.privilegeCodes,
          { workshopId: validated.workshopId }
        );
      }

      return NextResponse.json({
        data: {
          userId: validated.userId,
          privilegeCodes: validated.privilegeCodes,
          mode: validated.mode || 'any',
          hasAccess,
        },
      });
    }

    return NextResponse.json(
      { error: 'Invalid request body. Provide privilegeCode (string) or privilegeCodes (array)' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Failed to check privileges:', error);
    return NextResponse.json(
      { error: 'Failed to check privileges' },
      { status: 500 }
    );
  }
}
