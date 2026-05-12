import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as XLSX from 'xlsx';

/**
 * @openapi
 * /export/bulk:
 *   post:
 *     tags:
 *       - Import/Export
 *     summary: Bulk export multiple entity types
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entityTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *               format:
 *                     type: string
 *                     enum: [xlsx, csv, json]
 *               includeRelated:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Exported data file
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityTypes, format = 'xlsx', includeRelated = false } = body;

    if (!entityTypes || !Array.isArray(entityTypes) || entityTypes.length === 0) {
      return NextResponse.json(
        { error: 'entityTypes array is required' },
        { status: 400 }
      );
    }

    const exportData: Record<string, unknown[]> = {};

    for (const entityType of entityTypes) {
      switch (entityType) {
        case 'items':
          exportData.items = await db.item.findMany({
            where: { isActive: true },
            select: {
              itemCode: true,
              name: true,
              description: true,
              unitOfMeasure: true,
              itemClass: true,
              minimumStock: true,
              reorderLevel: true,
              createdAt: true,
            },
          });
          break;

        case 'assets':
          exportData.assets = await db.asset.findMany({
            where: { isActive: true },
            select: {
              assetNumber: true,
              name: true,
              make: true,
              model: true,
              serialNumber: true,
              status: true,
              currentLocation: true,
              createdAt: true,
              category: { select: { code: true, name: true } },
            },
          });
          break;

        case 'suppliers':
          exportData.suppliers = await db.supplier.findMany({
            where: { isActive: true },
            select: {
              supplierCode: true,
              name: true,
              contactPerson: true,
              email: true,
              phone: true,
              address: true,
              status: true,
            },
          });
          break;

        case 'jobCards':
          const jobCards = await db.jobCard.findMany({
            where: { isActive: true },
            select: {
              jobCardNumber: true,
              jobType: true,
              priority: true,
              status: true,
              faultDescription: true,
              estimatedCost: true,
              actualCost: true,
              scheduledStart: true,
              scheduledEnd: true,
              actualStart: true,
              actualEnd: true,
              createdAt: true,
              asset: { select: { assetNumber: true, name: true } },
            },
            take: 1000, // Limit for performance
          });
          exportData.jobCards = jobCards.map(jc => ({
            ...jc,
            assetNumber: jc.asset?.assetNumber,
            assetName: jc.asset?.name,
          }));
          break;

        case 'inventory':
          const stock = await db.storeStock.findMany({
            where: { isActive: true },
            select: {
              availableQty: true,
              reservedQty: true,
              wac: true,
              store: { select: { code: true, name: true } },
              item: { select: { itemCode: true, name: true, unitOfMeasure: true } },
            },
          });
          exportData.inventory = stock.map(s => ({
            itemCode: s.item?.itemCode,
            itemName: s.item?.name,
            unit: s.item?.unitOfMeasure,
            storeCode: s.store?.code,
            storeName: s.store?.name,
            availableQty: s.availableQty,
            reservedQty: s.reservedQty,
            wac: s.wac,
            totalValue: Number(s.availableQty) * Number(s.wac),
          }));
          break;
      }
    }

    // Format output
    if (format === 'json') {
      return NextResponse.json(exportData);
    }

    // Create workbook for Excel/CSV
    const workbook = XLSX.utils.book_new();

    for (const [sheetName, data] of Object.entries(exportData)) {
      if (data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(
          data.map(row => convertDecimals(row as Record<string, unknown>))
        );
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31)); // Excel sheet name limit
      }
    }

    // Generate file
    const fileName = `wcp-export-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      // Return first sheet as CSV
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(firstSheet);
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${fileName}.csv"`,
        },
      });
    }

    // Return as Excel
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Bulk export error:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}

function convertDecimals(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && 'toNumber' in value) {
      result[key] = (value as any).toNumber();
    } else if (value instanceof Date) {
      result[key] = value.toISOString();
    } else {
      result[key] = value;
    }
  }
  return result;
}
