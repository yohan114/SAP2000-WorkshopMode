import { db } from '@/lib/db';
import { apiSuccess, apiError, apiNotFound } from '@/lib/api-utils';
import { z } from 'zod';

const printSchema = z.object({
  blinded: z.boolean().default(true), // Hide system quantities
  groupBy: z.enum(['ITEM_CODE', 'LOCATION', 'ITEM_CLASS']).optional(),
});

// GET - Generate printable count sheet
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    
    const blinded = url.searchParams.get('blinded') !== 'false';
    const groupBy = url.searchParams.get('groupBy') || 'ITEM_CODE';

    // Get stock take with all details
    const stockTake = await db.stockTakeHeader.findUnique({
      where: { id },
      include: {
        store: { select: { id: true, name: true, code: true, location: true } },
        lines: {
          include: {
            item: { 
              select: { 
                id: true, 
                itemCode: true, 
                name: true, 
                unitOfMeasure: true,
                itemClass: true,
              } 
            }
          },
          orderBy: groupBy === 'ITEM_CLASS' 
            ? { item: { itemClass: 'asc' } }
            : groupBy === 'LOCATION'
              ? { location: 'asc' }
              : { item: { itemCode: 'asc' } }
        }
      }
    });

    if (!stockTake) {
      return apiNotFound('Stock take');
    }

    // Group lines if requested
    interface GroupedLines {
      [key: string]: Array<{
        id: string;
        itemId: string;
        itemCode: string;
        itemName: string;
        unitOfMeasure: string;
        itemClass: string;
        location: string;
        systemQty: number | null;
        unitCost: number;
      }>;
    }
    
    let groupedLines: GroupedLines = {};
    
    if (groupBy === 'ITEM_CLASS') {
      stockTake.lines.forEach(line => {
        const key = line.item?.itemClass || 'Unclassified';
        if (!groupedLines[key]) groupedLines[key] = [];
        groupedLines[key].push({
          id: line.id,
          itemId: line.itemId,
          itemCode: line.item?.itemCode || '',
          itemName: line.item?.name || '',
          unitOfMeasure: line.item?.unitOfMeasure || '',
          itemClass: line.item?.itemClass || '',
          location: line.location || '',
          systemQty: blinded ? null : line.systemQty.toNumber(),
          unitCost: line.unitCost.toNumber(),
        });
      });
    } else if (groupBy === 'LOCATION') {
      stockTake.lines.forEach(line => {
        const key = line.location || 'No Location';
        if (!groupedLines[key]) groupedLines[key] = [];
        groupedLines[key].push({
          id: line.id,
          itemId: line.itemId,
          itemCode: line.item?.itemCode || '',
          itemName: line.item?.name || '',
          unitOfMeasure: line.item?.unitOfMeasure || '',
          itemClass: line.item?.itemClass || '',
          location: line.location || '',
          systemQty: blinded ? null : line.systemQty.toNumber(),
          unitCost: line.unitCost.toNumber(),
        });
      });
    } else {
      groupedLines['All Items'] = stockTake.lines.map(line => ({
        id: line.id,
        itemId: line.itemId,
        itemCode: line.item?.itemCode || '',
        itemName: line.item?.name || '',
        unitOfMeasure: line.item?.unitOfMeasure || '',
        itemClass: line.item?.itemClass || '',
        location: line.location || '',
        systemQty: blinded ? null : line.systemQty.toNumber(),
        unitCost: line.unitCost.toNumber(),
      }));
    }

    // Generate print sheet data
    const printSheet = {
      header: {
        stockTakeNumber: stockTake.stockTakeNumber,
        store: stockTake.store,
        countMethod: stockTake.countMethod,
        scheduledDate: stockTake.scheduledDate,
        status: stockTake.status,
        blindCount: blinded,
        createdAt: stockTake.createdAt,
        totalItems: stockTake.totalItems,
      },
      groupedLines,
      printConfig: {
        blinded,
        groupBy,
        showSystemQty: !blinded,
        showCountSpace: true,
        showVarianceSpace: true,
        showNotesSpace: true,
      },
      // Print metadata
      printMeta: {
        generatedAt: new Date().toISOString(),
        pageCount: Math.ceil(stockTake.lines.length / 30), // ~30 lines per page
      }
    };

    return apiSuccess(printSheet);
  } catch (error) {
    console.error('Print stock take error:', error);
    return apiError('Failed to generate print sheet', 500);
  }
}
