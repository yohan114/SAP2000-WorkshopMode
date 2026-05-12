import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { z } from 'zod';

const compareQuotationsSchema = z.object({
  quotationIds: z.array(z.string()).min(2, 'At least 2 quotations required for comparison'),
});

// POST /api/quotation/compare - Compare quotations and identify best prices
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = compareQuotationsSchema.safeParse(body);

    if (!result.success) {
      return apiError('Validation failed', 400, result.error.issues[0]?.message);
    }

    const { quotationIds } = result.data;

    // Fetch all quotations with their lines
    const quotations = await db.quotation.findMany({
      where: {
        id: { in: quotationIds },
        isActive: true,
      },
      include: {
        supplier: {
          select: { id: true, name: true, supplierCode: true },
        },
        lines: {
          include: {
            item: {
              select: { id: true, itemCode: true, name: true, unitOfMeasure: true },
            },
          },
        },
      },
    });

    if (quotations.length !== quotationIds.length) {
      return apiError('One or more quotations not found', 404);
    }

    // BUG FIX #36: Validate that quotations have common items for meaningful comparison
    // Collect all items from all quotations
    const allItems = new Map<string, Set<string>>();

    for (const quotation of quotations) {
      for (const line of quotation.lines) {
        if (!line.itemId) continue;

        if (!allItems.has(line.itemId)) {
          allItems.set(line.itemId, new Set());
        }
        allItems.get(line.itemId)!.add(quotation.id);
      }
    }

    // Find items that appear in at least 2 quotations (common items)
    const commonItemIds = Array.from(allItems.entries())
      .filter(([_, quotationIds]) => quotationIds.size >= 2)
      .map(([itemId, _]) => itemId);

    if (commonItemIds.length === 0) {
      return apiError(
        'Selected quotations cannot be compared: No common items found. ' +
        'Please select quotations that quote for the same items.',
        400
      );
    }

    // Build comparison results for common items
    const comparisonResults: Array<{
      itemId: string;
      itemCode: string;
      itemName: string;
      quantity: number;
      quotations: Array<{
        supplierId: string;
        supplierName: string;
        unitPrice: number;
        totalPrice: number;
        deliveryDays: number | null;
      }>;
      recommendedSupplierId: string | null;
      savings: number;
    }> = [];

    for (const itemId of commonItemIds) {
      // Get all quotation lines for this item
      const itemLines = quotations.flatMap(q =>
        q.lines
          .filter(l => l.itemId === itemId)
          .map(l => ({
            quotationId: q.id,
            supplierId: q.supplier.id,
            supplierName: q.supplier.name,
            unitPrice: l.unitPrice.toNumber(),
            quantity: l.quantity.toNumber(),
            totalPrice: l.totalPrice.toNumber(),
            deliveryDays: l.leadTime,
            item: l.item,
          }))
      );

      if (itemLines.length < 2) continue;

      const item = itemLines[0].item;

      // Find best price (lowest unit price)
      const sortedByPrice = [...itemLines].sort((a, b) => a.unitPrice - b.unitPrice);
      const bestPrice = sortedByPrice[0];
      const worstPrice = sortedByPrice[sortedByPrice.length - 1];
      const savings = worstPrice.totalPrice - bestPrice.totalPrice;

      comparisonResults.push({
        itemId,
        itemCode: item?.itemCode || '',
        itemName: item?.name || '',
        quantity: bestPrice.quantity,
        quotations: itemLines.map(line => ({
          supplierId: line.supplierId,
          supplierName: line.supplierName,
          unitPrice: line.unitPrice,
          totalPrice: line.totalPrice,
          deliveryDays: line.deliveryDays,
        })),
        recommendedSupplierId: bestPrice.supplierId,
        savings: savings > 0 ? savings : 0,
      });
    }

    if (comparisonResults.length === 0) {
      return apiError(
        'No comparison results available. Ensure quotations have items with matching IDs.',
        400
      );
    }

    return apiSuccess({
      results: comparisonResults,
      summary: {
        totalItems: comparisonResults.length,
        quotations: quotations.map(q => ({
          id: q.id,
          quotationNumber: q.quotationNumber,
          supplierName: q.supplier.name,
        })),
      },
    }, 'Quotation comparison completed successfully');
  } catch (error) {
    console.error('Compare quotations error:', error);
    return apiError('Failed to compare quotations', 500);
  }
}
