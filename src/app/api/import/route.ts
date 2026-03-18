import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import * as XLSX from 'xlsx';

/**
 * @openapi
 * /import:
 *   post:
 *     tags:
 *       - Import/Export
 *     summary: Upload and parse import file
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               entityType:
 *                 type: string
 *                 enum: [items, assets, suppliers, jobCards]
 *     responses:
 *       200:
 *         description: Parsed data with validation results
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const entityType = formData.get('entityType') as string;

    if (!file || !entityType) {
      return NextResponse.json(
        { error: 'File and entity type are required' },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(buffer), { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    // Validate and parse based on entity type
    const result = await validateImportData(entityType, data as Record<string, unknown>[]);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      totalRows: data.length,
      validRows: result.valid.length,
      invalidRows: result.invalid.length,
      data: result,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to parse import file' },
      { status: 500 }
    );
  }
}

async function validateImportData(
  entityType: string,
  data: Record<string, unknown>[]
): Promise<{ valid: Record<string, unknown>[]; invalid: Array<{ row: number; errors: string[] }> }> {
  const valid: Record<string, unknown>[] = [];
  const invalid: Array<{ row: number; errors: string[] }> = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const errors: string[] = [];

    switch (entityType) {
      case 'items':
        if (!row.itemCode) errors.push('itemCode is required');
        if (!row.name) errors.push('name is required');
        if (!row.unitOfMeasure) errors.push('unitOfMeasure is required');
        break;

      case 'assets':
        if (!row.assetNumber) errors.push('assetNumber is required');
        if (!row.name) errors.push('name is required');
        break;

      case 'suppliers':
        if (!row.supplierCode) errors.push('supplierCode is required');
        if (!row.name) errors.push('name is required');
        break;

      case 'jobCards':
        if (!row.assetId && !row.assetNumber) errors.push('assetId or assetNumber is required');
        if (!row.faultDescription) errors.push('faultDescription is required');
        break;

      default:
        errors.push(`Unknown entity type: ${entityType}`);
    }

    if (errors.length === 0) {
      valid.push({ ...row, _rowNumber: i + 2 }); // +2 for 1-based and header row
    } else {
      invalid.push({ row: i + 2, errors });
    }
  }

  return { valid, invalid };
}

/**
 * @openapi
 * /import:
 *   get:
 *     tags:
 *       - Import/Export
 *     summary: Get import templates
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Import template structure
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get('entityType');

  const templates: Record<string, { fields: string[]; required: string[]; example: Record<string, unknown> }> = {
    items: {
      fields: ['itemCode', 'name', 'description', 'unitOfMeasure', 'itemClass', 'unitCost', 'reorderLevel', 'minimumStock'],
      required: ['itemCode', 'name', 'unitOfMeasure'],
      example: { itemCode: 'ITM-001', name: 'Engine Oil 15W40', unitOfMeasure: 'LITRE', itemClass: 'CONSUMABLE', unitCost: 25.00, reorderLevel: 50, minimumStock: 20 },
    },
    assets: {
      fields: ['assetNumber', 'name', 'categoryCode', 'make', 'model', 'serialNumber', 'status', 'location'],
      required: ['assetNumber', 'name'],
      example: { assetNumber: 'VEH-001', name: 'Toyota Hilux', categoryCode: 'VEHICLES', make: 'Toyota', model: 'Hilux', status: 'OPERATIONAL', location: 'Main Workshop' },
    },
    suppliers: {
      fields: ['supplierCode', 'name', 'contactPerson', 'email', 'phone', 'address', 'status'],
      required: ['supplierCode', 'name'],
      example: { supplierCode: 'SUP-001', name: 'Auto Parts Co.', contactPerson: 'John Smith', email: 'john@autoparts.com', phone: '+1234567890', status: 'ACTIVE' },
    },
    jobCards: {
      fields: ['assetNumber', 'jobType', 'priority', 'faultDescription', 'scheduledStart', 'scheduledEnd', 'estimatedCost'],
      required: ['assetNumber', 'faultDescription'],
      example: { assetNumber: 'VEH-001', jobType: 'CORRECTIVE', priority: 'HIGH', faultDescription: 'Engine oil leak', scheduledStart: '2024-01-15', estimatedCost: 500 },
    },
  };

  if (entityType && templates[entityType]) {
    return NextResponse.json({ template: templates[entityType] });
  }

  return NextResponse.json({ templates });
}
