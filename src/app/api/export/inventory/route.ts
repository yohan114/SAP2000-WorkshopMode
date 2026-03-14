import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// GET /api/export/inventory - Export inventory to Excel or CSV
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    
    // Parse query parameters
    const format = url.searchParams.get('format') || 'xlsx';
    const storeId = url.searchParams.get('storeId');
    const storeFilter = url.searchParams.get('storeFilter');
    const search = url.searchParams.get('search');
    const stockFilter = url.searchParams.get('stockFilter'); // 'low', 'out', 'all'
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');
    
    // Build where clause for store stock
    const where: Record<string, unknown> = {};
    
    // Use storeId or storeFilter (both are same thing, just different param names)
    const effectiveStoreId = storeId || storeFilter;
    if (effectiveStoreId && effectiveStoreId !== 'all') {
      where.storeId = effectiveStoreId;
    }
    
    // Fetch all stock data with related info
    let stockItems = await db.storeStock.findMany({
      where,
      orderBy: { lastMovementAt: 'desc' },
      include: {
        store: {
          select: { id: true, code: true, name: true },
        },
        item: {
          select: {
            id: true,
            itemCode: true,
            name: true,
            unitOfMeasure: true,
            itemClass: true,
            minimumStock: true,
            reorderLevel: true,
            isCritical: true,
            unitPrice: true,
          },
        },
      },
    });
    
    // Transform and filter data
    let exportData = stockItems.map((s, index) => {
      const availableQty = Number(s.availableQty);
      const wac = Number(s.wac);
      const reorderLevel = s.item.reorderLevel ? Number(s.item.reorderLevel) : null;
      const minimumStock = s.item.minimumStock ? Number(s.item.minimumStock) : null;
      
      // Determine stock status
      let stockStatus = 'In Stock';
      if (availableQty === 0) {
        stockStatus = 'Out of Stock';
      } else if (reorderLevel && availableQty <= reorderLevel) {
        stockStatus = 'Low Stock';
      } else if (minimumStock && availableQty <= minimumStock) {
        stockStatus = 'Below Minimum';
      }
      
      return {
        'No': index + 1,
        'Item Code': s.item.itemCode,
        'Item Name': s.item.name,
        'Item Class': s.item.itemClass,
        'Store Code': s.store.code,
        'Store Name': s.store.name,
        'Available Qty': availableQty,
        'Reserved Qty': Number(s.reservedQty),
        'Quarantine Qty': Number(s.quarantineQty),
        'Unit': s.item.unitOfMeasure,
        'WAC': wac,
        'Stock Value': availableQty * wac,
        'Reorder Level': reorderLevel || '',
        'Minimum Stock': minimumStock || '',
        'Shortage': (reorderLevel && availableQty < reorderLevel) ? reorderLevel - availableQty : 0,
        'Stock Status': stockStatus,
        'Is Critical': s.item.isCritical ? 'Yes' : 'No',
        'Last Movement': s.lastMovementAt ? new Date(s.lastMovementAt).toLocaleDateString() : '',
      };
    });
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      exportData = exportData.filter(item =>
        item['Item Code'].toLowerCase().includes(searchLower) ||
        item['Item Name'].toLowerCase().includes(searchLower)
      );
    }
    
    // Apply stock filter
    if (stockFilter === 'low') {
      exportData = exportData.filter(item => 
        item['Stock Status'] === 'Low Stock' || item['Stock Status'] === 'Below Minimum'
      );
    } else if (stockFilter === 'out') {
      exportData = exportData.filter(item => item['Stock Status'] === 'Out of Stock');
    }
    
    // Date range filter - filter by last movement date
    if (fromDate || toDate) {
      exportData = exportData.filter(item => {
        if (!item['Last Movement']) return false;
        const movementDate = new Date(item['Last Movement']);
        if (fromDate && movementDate < new Date(fromDate)) return false;
        if (toDate) {
          const endDate = new Date(toDate);
          endDate.setHours(23, 59, 59, 999);
          if (movementDate > endDate) return false;
        }
        return true;
      });
    }
    
    // Recalculate No column after filtering
    exportData = exportData.map((item, index) => ({ ...item, 'No': index + 1 }));
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `inventory-report-${timestamp}`;
    
    if (format === 'csv') {
      // Generate CSV
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    } else {
      // Generate Excel file
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-size columns
      const maxWidths: Record<string, number> = {};
      exportData.forEach(row => {
        Object.keys(row).forEach(key => {
          const value = String(row[key as keyof typeof row] || '');
          maxWidths[key] = Math.max(maxWidths[key] || key.length, value.length);
        });
      });
      
      worksheet['!cols'] = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.min(Math.max(maxWidths[key] || 10, 10), 40),
      }));
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
      
      // Add summary sheet
      const totalValue = exportData.reduce((sum, item) => sum + (item['Stock Value'] || 0), 0);
      const totalReserved = exportData.reduce((sum, item) => sum + (item['Reserved Qty'] || 0), 0);
      
      const summaryData = [
        { 'Metric': 'Total Items', 'Value': exportData.length },
        { 'Metric': 'Total Stock Value', 'Value': totalValue },
        { 'Metric': 'Total Reserved Qty', 'Value': totalReserved },
        { 'Metric': 'In Stock Items', 'Value': exportData.filter(i => i['Stock Status'] === 'In Stock').length },
        { 'Metric': 'Low Stock Items', 'Value': exportData.filter(i => i['Stock Status'] === 'Low Stock').length },
        { 'Metric': 'Out of Stock Items', 'Value': exportData.filter(i => i['Stock Status'] === 'Out of Stock').length },
        { 'Metric': 'Critical Items', 'Value': exportData.filter(i => i['Is Critical'] === 'Yes').length },
        { 'Metric': 'Export Date', 'Value': new Date().toLocaleString() },
      ];
      
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      
      // Add stock alerts sheet
      const alertItems = exportData.filter(item => 
        item['Stock Status'] === 'Low Stock' || 
        item['Stock Status'] === 'Out of Stock' ||
        item['Stock Status'] === 'Below Minimum'
      );
      
      if (alertItems.length > 0) {
        const alertsSheet = XLSX.utils.json_to_sheet(alertItems.map((item, index) => ({
          'No': index + 1,
          'Item Code': item['Item Code'],
          'Item Name': item['Item Name'],
          'Store': item['Store Name'],
          'Available': item['Available Qty'],
          'Reorder Level': item['Reorder Level'],
          'Shortage': item['Shortage'],
          'Status': item['Stock Status'],
        })));
        XLSX.utils.book_append_sheet(workbook, alertsSheet, 'Stock Alerts');
      }
      
      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      });
    }
  } catch (error) {
    console.error('Export inventory error:', error);
    return NextResponse.json(
      { error: 'Failed to export inventory' },
      { status: 500 }
    );
  }
}
