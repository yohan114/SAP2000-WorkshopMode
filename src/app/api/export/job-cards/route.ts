import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// GET /api/export/job-cards - Export job cards to Excel or CSV
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    
    // Parse query parameters
    const format = url.searchParams.get('format') || 'xlsx';
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const search = url.searchParams.get('search');
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');
    const jobType = url.searchParams.get('jobType');
    const assetId = url.searchParams.get('assetId');
    
    // Build where clause
    const where: Record<string, unknown> = { isActive: true };
    
    if (status && status !== 'all') {
      where.status = status;
    }
    if (priority && priority !== 'all') {
      where.priority = priority;
    }
    if (jobType) {
      where.jobType = jobType;
    }
    if (assetId) {
      where.assetId = assetId;
    }
    
    if (search) {
      where.OR = [
        { jobCardNumber: { contains: search } },
        { faultDescription: { contains: search } },
        { ecoNumber: { contains: search } },
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
    
    // Fetch job cards with all related data
    const jobCards = await db.jobCard.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        asset: {
          select: {
            assetNumber: true,
            name: true,
            location: true,
          },
        },
        creator: {
          select: { name: true, email: true },
        },
        supervisor: {
          select: { name: true },
        },
        technicianAssignments: {
          where: { isActive: true },
          include: {
            technician: {
              select: { name: true, employeeId: true },
            },
          },
        },
        _count: {
          select: { tasks: true, materialRequests: true },
        },
      },
    });
    
    // Transform data for export
    const exportData = jobCards.map((jc, index) => ({
      'No': index + 1,
      'Job Card Number': jc.jobCardNumber,
      'Asset Number': jc.asset?.assetNumber || '',
      'Asset Name': jc.asset?.name || '',
      'Asset Location': jc.asset?.location || '',
      'Job Type': jc.jobType,
      'Priority': jc.priority,
      'Status': jc.status,
      'Fault Description': jc.faultDescription || '',
      'Diagnosis Notes': jc.diagnosisNotes || '',
      'Work Performed': jc.workPerformed || '',
      'Estimated Cost': jc.estimatedCost || 0,
      'Actual Cost': jc.actualCost || 0,
      'Estimated Duration (hrs)': jc.estimatedDuration || 0,
      'Actual Duration (hrs)': jc.actualDuration || 0,
      'Scheduled Start': jc.scheduledStart ? new Date(jc.scheduledStart).toLocaleDateString() : '',
      'Scheduled End': jc.scheduledEnd ? new Date(jc.scheduledEnd).toLocaleDateString() : '',
      'Actual Start': jc.actualStart ? new Date(jc.actualStart).toLocaleDateString() : '',
      'Actual End': jc.actualEnd ? new Date(jc.actualEnd).toLocaleDateString() : '',
      'Created By': jc.creator?.name || '',
      'Supervisor': jc.supervisor?.name || '',
      'Technicians': jc.technicianAssignments.map(ta => ta.technician.name).join(', ') || '',
      'Tasks Count': jc._count.tasks,
      'Material Requests': jc._count.materialRequests,
      'Created At': new Date(jc.createdAt).toLocaleDateString(),
    }));
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `job-cards-report-${timestamp}`;
    
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
        wch: Math.min(Math.max(maxWidths[key] || 10, 10), 50),
      }));
      
      // Add header styling
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
        if (cell) {
          cell.s = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'E2E8F0' } },
          };
        }
      }
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Job Cards');
      
      // Add summary sheet
      const summaryData = [
        { 'Metric': 'Total Job Cards', 'Value': jobCards.length },
        { 'Metric': 'Draft', 'Value': jobCards.filter(jc => jc.status === 'DRAFT').length },
        { 'Metric': 'Approved', 'Value': jobCards.filter(jc => jc.status === 'APPROVED').length },
        { 'Metric': 'In Progress', 'Value': jobCards.filter(jc => jc.status === 'IN_PROGRESS').length },
        { 'Metric': 'Completed', 'Value': jobCards.filter(jc => jc.status === 'COMPLETED').length },
        { 'Metric': 'Closed', 'Value': jobCards.filter(jc => jc.status === 'CLOSED').length },
        { 'Metric': 'Cancelled', 'Value': jobCards.filter(jc => jc.status === 'CANCELLED').length },
        { 'Metric': 'Critical Priority', 'Value': jobCards.filter(jc => ['CRITICAL', 'EMERGENCY'].includes(jc.priority)).length },
        { 'Metric': 'Total Estimated Cost', 'Value': jobCards.reduce((sum, jc) => sum + (jc.estimatedCost || 0), 0) },
        { 'Metric': 'Total Actual Cost', 'Value': jobCards.reduce((sum, jc) => sum + (jc.actualCost || 0), 0) },
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
    console.error('Export job cards error:', error);
    return NextResponse.json(
      { error: 'Failed to export job cards' },
      { status: 500 }
    );
  }
}
