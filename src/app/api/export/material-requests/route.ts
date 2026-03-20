import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// GET /api/export/material-requests - Export material requests to Excel or CSV
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    
    // Parse query parameters
    const format = url.searchParams.get('format') || 'xlsx';
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const requestType = url.searchParams.get('requestType');
    const search = url.searchParams.get('search');
    const jobCardId = url.searchParams.get('jobCardId');
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');
    
    // Build where clause
    const where: Record<string, unknown> = { isActive: true };
    
    if (status && status !== 'all') {
      where.status = status;
    }
    if (priority && priority !== 'all') {
      where.priority = priority;
    }
    if (requestType && requestType !== 'all') {
      where.requestType = requestType;
    }
    if (jobCardId) {
      where.jobCardId = jobCardId;
    }
    
    if (search) {
      where.OR = [
        { mrNumber: { contains: search } },
        { jobCard: { jobCardNumber: { contains: search } } },
      ];
    }
    
    // Date range filter
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        (where.createdAt as Record<string, Date>).gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        (where.createdAt as Record<string, Date>).lte = endDate;
      }
    }
    
    // Fetch material requests with all related data
    const materialRequests = await db.materialRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        jobCard: {
          select: {
            jobCardNumber: true,
            asset: { select: { name: true } },
          },
        },
        requestor: {
          select: { name: true, email: true },
        },
        lines: {
          include: {
            item: {
              select: {
                itemCode: true,
                name: true,
                unitOfMeasure: true,
              },
            },
          },
        },
      },
    });

    // Get approver info separately if needed
    const approverIds = materialRequests
      .filter(mr => mr.approvedBy)
      .map(mr => mr.approvedBy as string);

    const approvers = approverIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: approverIds } },
          select: { id: true, name: true },
        })
      : [];

    const approverMap = new Map(approvers.map(a => [a.id, a.name]));
    
    // Transform data for main sheet (one row per MR)
    const exportData = materialRequests.map((mr, index) => {
      const totalRequested = mr.lines.reduce((sum, line) => sum + Number(line.requestedQty), 0);
      const totalApproved = mr.lines.reduce((sum, line) => sum + (line.approvedQty ? Number(line.approvedQty) : 0), 0);
      const totalIssued = mr.lines.reduce((sum, line) => sum + (line.issuedQty ? Number(line.issuedQty) : 0), 0);
      
      const itemsList = mr.lines.map(l => `${l.item?.name || 'Unknown'} (${Number(l.requestedQty)})`).join('; ');
      
      return {
        'No': index + 1,
        'MR Number': mr.mrNumber,
        'Request Type': mr.requestType,
        'Priority': mr.priority,
        'Status': mr.status,
        'Job Card': mr.jobCard?.jobCardNumber || '',
        'Asset': mr.jobCard?.asset?.name || '',
        'Requestor': mr.requestor?.name || '',
        'Required By': mr.requiredBy ? new Date(mr.requiredBy).toLocaleDateString() : '',
        'Total Lines': mr.lines.length,
        'Total Requested': totalRequested,
        'Total Approved': totalApproved,
        'Total Issued': totalIssued,
        'Items Summary': itemsList,
        'Approved By': mr.approvedBy ? (approverMap.get(mr.approvedBy) || '') : '',
        'Approved At': mr.approvedAt ? new Date(mr.approvedAt).toLocaleDateString() : '',
        'Rejection Reason': mr.rejectionReason || '',
        'Created At': new Date(mr.createdAt).toLocaleDateString(),
      };
    });
    
    // Prepare line items data for detail sheet
    const lineItemsData: Record<string, unknown>[] = [];
    materialRequests.forEach((mr) => {
      mr.lines.forEach((line, lineIndex) => {
        lineItemsData.push({
          'MR Number': mr.mrNumber,
          'Line No': lineIndex + 1,
          'Item Code': line.item?.itemCode || '',
          'Item Name': line.item?.name || '',
          'Requested Qty': Number(line.requestedQty),
          'Approved Qty': line.approvedQty ? Number(line.approvedQty) : '',
          'Issued Qty': line.issuedQty ? Number(line.issuedQty) : '',
          'Unit': line.item?.unitOfMeasure || '',
          'Line Status': line.status,
          'Notes': line.notes || '',
        });
      });
    });
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `material-requests-report-${timestamp}`;
    
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
      
      // Main sheet - MR Summary
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
        wch: Math.min(Math.max(maxWidths[key] || 10, 10), 50),
      }));
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Material Requests');
      
      // Line Items sheet
      if (lineItemsData.length > 0) {
        const linesSheet = XLSX.utils.json_to_sheet(lineItemsData);
        
        // Auto-size columns for lines
        const lineMaxWidths: Record<string, number> = {};
        lineItemsData.forEach(row => {
          Object.keys(row).forEach(key => {
            const value = String(row[key as keyof typeof row] || '');
            lineMaxWidths[key] = Math.max(lineMaxWidths[key] || key.length, value.length);
          });
        });
        
        linesSheet['!cols'] = Object.keys(lineItemsData[0] || {}).map(key => ({
          wch: Math.min(Math.max(lineMaxWidths[key] || 10, 10), 40),
        }));
        
        XLSX.utils.book_append_sheet(workbook, linesSheet, 'Line Items');
      }
      
      // Summary sheet
      const summaryData = [
        { 'Metric': 'Total Material Requests', 'Value': materialRequests.length },
        { 'Metric': 'Draft', 'Value': materialRequests.filter(mr => mr.status === 'DRAFT').length },
        { 'Metric': 'Pending Approval', 'Value': materialRequests.filter(mr => mr.status === 'PENDING_APPROVAL').length },
        { 'Metric': 'Approved', 'Value': materialRequests.filter(mr => mr.status === 'APPROVED').length },
        { 'Metric': 'Partially Issued', 'Value': materialRequests.filter(mr => mr.status === 'PARTIALLY_ISSUED').length },
        { 'Metric': 'Fulfilled', 'Value': materialRequests.filter(mr => mr.status === 'FULFILLED').length },
        { 'Metric': 'Rejected', 'Value': materialRequests.filter(mr => mr.status === 'REJECTED').length },
        { 'Metric': 'Cancelled', 'Value': materialRequests.filter(mr => mr.status === 'CANCELLED').length },
        { 'Metric': '', 'Value': '' },
        { 'Metric': 'By Request Type', 'Value': '' },
        { 'Metric': 'Job Card Linked', 'Value': materialRequests.filter(mr => mr.requestType === 'JC_LINKED').length },
        { 'Metric': 'Stock Request', 'Value': materialRequests.filter(mr => mr.requestType === 'STOCK_REQUEST').length },
        { 'Metric': 'Emergency', 'Value': materialRequests.filter(mr => mr.requestType === 'EMERGENCY').length },
        { 'Metric': '', 'Value': '' },
        { 'Metric': 'Total Line Items', 'Value': lineItemsData.length },
        { 'Metric': 'Total Items Requested', 'Value': lineItemsData.reduce((sum, l) => sum + (l['Requested Qty'] as number || 0), 0) },
        { 'Metric': 'Total Items Approved', 'Value': lineItemsData.reduce((sum, l) => sum + (l['Approved Qty'] as number || 0), 0) },
        { 'Metric': 'Total Items Issued', 'Value': lineItemsData.reduce((sum, l) => sum + (l['Issued Qty'] as number || 0), 0) },
        { 'Metric': '', 'Value': '' },
        { 'Metric': 'Export Date', 'Value': new Date().toLocaleString() },
      ];
      
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      
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
    console.error('Export material requests error:', error);
    return NextResponse.json(
      { error: 'Failed to export material requests' },
      { status: 500 }
    );
  }
}
