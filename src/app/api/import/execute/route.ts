import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

/**
 * @openapi
 * /import/execute:
 *   post:
 *     tags:
 *       - Import/Export
 *     summary: Execute the import
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entityType:
 *                 type: string
 *               data:
 *                 type: array
 *     responses:
 *       200:
 *         description: Import results
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType, data } = body;

    if (!entityType || !data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'entityType and data array are required' },
        { status: 400 }
      );
    }

    const result = {
      total: data.length,
      created: 0,
      updated: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    // Process in batches
    const batchSize = 50;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      for (const item of batch) {
        try {
          switch (entityType) {
            case 'items':
              await importItem(item, result);
              break;
            case 'assets':
              await importAsset(item, result);
              break;
            case 'suppliers':
              await importSupplier(item, result);
              break;
            default:
              result.errors.push({ row: item._rowNumber || i + 1, error: `Unknown entity type: ${entityType}` });
          }
        } catch (error) {
          result.errors.push({
            row: item._rowNumber || i + 1,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return NextResponse.json({
      success: result.errors.length === 0,
      ...result,
    });
  } catch (error) {
    console.error('Import execute error:', error);
    return NextResponse.json(
      { error: 'Failed to execute import' },
      { status: 500 }
    );
  }
}

async function importItem(item: Record<string, unknown>, result: { created: number; updated: number; errors: Array<{ row: number; error: string }> }) {
  const existing = await db.item.findUnique({
    where: { itemCode: String(item.itemCode) },
  });

  if (existing) {
    await db.item.update({
      where: { id: existing.id },
      data: {
        name: String(item.name || existing.name),
        description: String(item.description || existing.description),
        unitOfMeasure: String(item.unitOfMeasure || existing.unitOfMeasure),
        itemClass: String(item.itemClass || existing.itemClass),
        minimumStock: item.minimumStock ? parseFloat(String(item.minimumStock)) : existing.minimumStock,
        reorderLevel: item.reorderLevel ? parseFloat(String(item.reorderLevel)) : existing.reorderLevel,
      },
    });
    result.updated++;
  } else {
    await db.item.create({
      data: {
        itemCode: String(item.itemCode),
        name: String(item.name),
        description: item.description ? String(item.description) : null,
        unitOfMeasure: String(item.unitOfMeasure || 'EACH'),
        itemClass: String(item.itemClass || 'CONSUMABLE'),
        minimumStock: item.minimumStock ? parseFloat(String(item.minimumStock)) : 0,
        reorderLevel: item.reorderLevel ? parseFloat(String(item.reorderLevel)) : null,
      },
    });
    result.created++;
  }
}

async function importAsset(item: Record<string, unknown>, result: { created: number; updated: number; errors: Array<{ row: number; error: string }> }) {
  // Find category if provided
  let categoryId: string | undefined;
  if (item.categoryCode) {
    const category = await db.assetCategory.findFirst({
      where: { code: String(item.categoryCode) },
    });
    categoryId = category?.id;
  }

  const existing = await db.asset.findUnique({
    where: { assetNumber: String(item.assetNumber) },
  });

  if (existing) {
    await db.asset.update({
      where: { id: existing.id },
      data: {
        name: String(item.name || existing.name),
        make: item.make ? String(item.make) : existing.make,
        model: item.model ? String(item.model) : existing.model,
        serialNumber: item.serialNumber ? String(item.serialNumber) : existing.serialNumber,
        status: String(item.status || existing.status),
        currentLocation: item.location ? String(item.location) : existing.currentLocation,
        categoryId: categoryId || existing.categoryId,
      },
    });
    result.updated++;
  } else {
    if (!categoryId) {
      // Get default category or create one
      let defaultCategory = await db.assetCategory.findFirst();
      if (!defaultCategory) {
        defaultCategory = await db.assetCategory.create({
          data: { code: 'GENERAL', name: 'General Assets' },
        });
      }
      categoryId = defaultCategory.id;
    }

    await db.asset.create({
      data: {
        assetNumber: String(item.assetNumber),
        name: String(item.name),
        make: item.make ? String(item.make) : null,
        model: item.model ? String(item.model) : null,
        serialNumber: item.serialNumber ? String(item.serialNumber) : null,
        status: String(item.status || 'OPERATIONAL'),
        currentLocation: item.location ? String(item.location) : null,
        categoryId: categoryId,
      },
    });
    result.created++;
  }
}

async function importSupplier(item: Record<string, unknown>, result: { created: number; updated: number; errors: Array<{ row: number; error: string }> }) {
  const existing = await db.supplier.findFirst({
    where: { supplierCode: String(item.supplierCode) },
  });

  if (existing) {
    await db.supplier.update({
      where: { id: existing.id },
      data: {
        name: String(item.name || existing.name),
        contactPerson: item.contactPerson ? String(item.contactPerson) : existing.contactPerson,
        email: item.email ? String(item.email) : existing.email,
        phone: item.phone ? String(item.phone) : existing.phone,
        address: item.address ? String(item.address) : existing.address,
        status: String(item.status || existing.status),
      },
    });
    result.updated++;
  } else {
    await db.supplier.create({
      data: {
        supplierCode: String(item.supplierCode),
        name: String(item.name),
        contactPerson: item.contactPerson ? String(item.contactPerson) : null,
        email: item.email ? String(item.email) : null,
        phone: item.phone ? String(item.phone) : null,
        address: item.address ? String(item.address) : null,
        status: String(item.status || 'ACTIVE'),
      },
    });
    result.created++;
  }
}
