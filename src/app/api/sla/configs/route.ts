import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET /api/sla/configs - List SLA configurations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slaType = searchParams.get('slaType');

    const where: Record<string, unknown> = { isActive: true };
    if (slaType) {
      where.slaType = slaType;
    }

    const configs = await db.slaConfig.findMany({
      where,
      orderBy: { slaType: 'asc' },
    });

    // Add default SLA configs if none exist
    if (configs.length === 0) {
      const defaults = [
        { slaType: 'JOB_CARD_RESPONSE', name: 'Job Card First Response', responseHours: 4, completionHours: 24 },
        { slaType: 'JOB_CARD_EMERGENCY', name: 'Emergency Job Card', responseHours: 0.5, completionHours: 4 },
        { slaType: 'JOB_CARD_CORRECTIVE', name: 'Corrective Maintenance', responseHours: 8, completionHours: 72 },
        { slaType: 'JOB_CARD_PREVENTIVE', name: 'Preventive Maintenance', responseHours: 24, completionHours: 48 },
        { slaType: 'MATERIAL_REQUEST', name: 'Material Request Processing', responseHours: 4, completionHours: 24 },
        { slaType: 'PURCHASE_ORDER', name: 'Purchase Order Processing', responseHours: 24, completionHours: 168 },
      ];
      
      for (const def of defaults) {
        await db.slaConfig.create({ data: def });
      }
      
      const newConfigs = await db.slaConfig.findMany({
        where: { isActive: true },
        orderBy: { slaType: 'asc' },
      });
      
      return NextResponse.json({ data: newConfigs });
    }

    return NextResponse.json({ data: configs });
  } catch (error) {
    console.error('Error fetching SLA configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SLA configs' },
      { status: 500 }
    );
  }
}

// POST /api/sla/configs - Create/update SLA config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schema = z.object({
      slaType: z.string().min(1),
      name: z.string().min(1),
      responseHours: z.number().optional(),
      completionHours: z.number().optional(),
      escalationLevels: z.number().optional(),
    });
    
    const validatedData = schema.parse(body);

    const config = await db.slaConfig.upsert({
      where: { slaType: validatedData.slaType },
      create: validatedData,
      update: {
        name: validatedData.name,
        responseHours: validatedData.responseHours,
        completionHours: validatedData.completionHours,
        escalationLevels: validatedData.escalationLevels,
      },
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating SLA config:', error);
    return NextResponse.json(
      { error: 'Failed to create SLA config' },
      { status: 500 }
    );
  }
}
