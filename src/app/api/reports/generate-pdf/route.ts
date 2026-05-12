/**
 * Server-side PDF Generation API
 * Handles PDF generation for various report types using jsPDF with jspdf-autotable v5.x
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  generateReportPDF,
  generateJobCardPDF,
  generateCostReportPDF,
  generateMaterialUsagePDF,
  generatePMCompliancePDF,
  JobCardPDFData,
  CostReportData,
} from '@/lib/pdf-service';
import { getTemplate } from '@/lib/report-templates';

// ============================================
// POST /api/reports/generate-pdf
// Generate PDF for a specific report type
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportType, reportData, from, to } = body;

    // If reportData is provided directly, use it
    if (reportData) {
      return await generatePDFFromData(reportType, reportData);
    }

    // Otherwise, fetch data based on report type and date range
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();
    endDate.setHours(23, 59, 59, 999);

    return await generatePDFFromDatabase(reportType, startDate, endDate);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate PDF from provided report data
 */
async function generatePDFFromData(reportType: string, reportData: Record<string, unknown>): Promise<NextResponse> {
  let pdfBuffer: Buffer;

  switch (reportType) {
    case 'job-card':
    case 'job-card-cost':
      pdfBuffer = await generateJobCardPDF(reportData as unknown as JobCardPDFData);
      break;

    case 'cost-report':
      pdfBuffer = await generateCostReportPDF(reportData as unknown as CostReportData);
      break;

    case 'material-usage':
      pdfBuffer = await generateMaterialUsagePDF(reportData as Parameters<typeof generateMaterialUsagePDF>[0]);
      break;

    case 'pm-compliance':
      pdfBuffer = await generatePMCompliancePDF(reportData as Parameters<typeof generatePMCompliancePDF>[0]);
      break;

    default:
      // Generic report generation
      pdfBuffer = await generateReportPDF(reportType, reportData as Parameters<typeof generateReportPDF>[1]);
  }

  const template = getTemplate(reportType);
  const filename = template ? template.name.toLowerCase().replace(/\s+/g, '-') : reportType;

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.pdf"`,
    },
  });
}

/**
 * Generate PDF by fetching data from database
 */
async function generatePDFFromDatabase(reportType: string, startDate: Date, endDate: Date): Promise<NextResponse> {
  let pdfBuffer: Buffer;
  let filename: string;

  switch (reportType) {
    case 'job-card-cost':
    case 'cost-report':
      const costData = await fetchCostReportData(startDate, endDate);
      pdfBuffer = await generateCostReportPDF(costData);
      filename = `cost-report-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
      break;

    case 'material-usage':
      const materialData = await fetchMaterialUsageData(startDate, endDate);
      pdfBuffer = await generateMaterialUsagePDF(materialData);
      filename = `material-usage-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
      break;

    case 'pm-compliance':
      const pmData = await fetchPMComplianceData(startDate, endDate);
      pdfBuffer = await generatePMCompliancePDF(pmData);
      filename = `pm-compliance-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
      break;

    case 'monthly-closed-jobs':
      const monthlyData = await fetchMonthlyClosedJobsData(startDate, endDate);
      pdfBuffer = await generateReportPDF('monthly-closed-jobs', monthlyData);
      filename = `monthly-closed-jobs-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
      break;

    case 'external-costs':
      const externalData = await fetchExternalCostsData(startDate, endDate);
      pdfBuffer = await generateReportPDF('external-costs', externalData);
      filename = `external-costs-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
      break;

    case 'fleet-availability':
      const fleetData = await fetchFleetAvailabilityData();
      pdfBuffer = await generateReportPDF('fleet-availability', fleetData);
      filename = `fleet-availability-${new Date().toISOString().split('T')[0]}`;
      break;

    case 'technician-utilisation':
      const techData = await fetchTechnicianUtilisationData(startDate, endDate);
      pdfBuffer = await generateReportPDF('technician-utilisation', techData);
      filename = `technician-utilisation-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
      break;

    case 'fuel-consumption':
      const fuelData = await fetchFuelConsumptionData(startDate, endDate);
      pdfBuffer = await generateReportPDF('fuel-consumption', fuelData);
      filename = `fuel-consumption-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
      break;

    case 'stock-valuation':
      const stockData = await fetchStockValuationData();
      pdfBuffer = await generateReportPDF('stock-valuation', stockData);
      filename = `stock-valuation-${new Date().toISOString().split('T')[0]}`;
      break;

    case 'procurement-spend':
      const procurementData = await fetchProcurementSpendData(startDate, endDate);
      pdfBuffer = await generateReportPDF('procurement-spend', procurementData);
      filename = `procurement-spend-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`;
      break;

    default:
      return NextResponse.json({ error: `Unknown report type: ${reportType}` }, { status: 400 });
  }

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}.pdf"`,
    },
  });
}

// ============================================
// Data Fetching Functions
// ============================================

/**
 * Fetch Cost Report data from database
 */
async function fetchCostReportData(startDate: Date, endDate: Date): Promise<CostReportData> {
  const jobCards = await db.jobCard.findMany({
    where: {
      status: { in: ['COMPLETED', 'CLOSED'] },
      closedAt: { gte: startDate, lte: endDate },
      isActive: true,
    },
    include: {
      asset: { select: { assetNumber: true, name: true } },
      timeLogs: { include: { employee: { select: { hourlyRate: true } } } },
      materialIssues: {
        where: { status: 'ISSUED' },
        include: { lines: { include: { item: { select: { itemCode: true, name: true } } } } },
      },
      externalJobs: { where: { isActive: true } },
    },
    orderBy: { closedAt: 'desc' },
    take: 100,
  });

  const jobCardCosts = jobCards.map(jc => {
    const materialCost = jc.materialIssues.reduce((sum, mi) => {
      return sum + mi.lines.reduce((lSum, line) => lSum + Number(line.issuedQty) * Number(line.unitCost || 0), 0);
    }, 0);

    const labourCost = jc.timeLogs.reduce((sum, tl) => sum + Number(tl.totalCost || 0), 0);

    const externalCost = jc.externalJobs.reduce((sum, ej) => sum + Number(ej.actualCost || ej.estimatedCost || 0), 0);

    const total = materialCost + labourCost + externalCost;

    return {
      jobCardNumber: jc.jobCardNumber,
      asset: jc.asset ? `${jc.asset.assetNumber} - ${jc.asset.name}` : '-',
      materialCost,
      labourCost,
      externalCost,
      total,
    };
  });

  const totalMaterialCost = jobCardCosts.reduce((sum, jc) => sum + jc.materialCost, 0);
  const totalLabourCost = jobCardCosts.reduce((sum, jc) => sum + jc.labourCost, 0);
  const totalExternalCost = jobCardCosts.reduce((sum, jc) => sum + jc.externalCost, 0);
  const subtotal = totalMaterialCost + totalLabourCost + totalExternalCost;
  const totalSundry = subtotal * 0.10;
  const grandTotal = subtotal + totalSundry;

  return {
    title: 'Job Card Cost Report',
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    generatedAt: new Date().toISOString(),
    summary: {
      totalJobCards: jobCards.length,
      totalMaterialCost,
      totalLabourCost,
      totalExternalCost,
      totalSundry,
      grandTotal,
    },
    jobCards: jobCardCosts,
  };
}

/**
 * Fetch Material Usage data from database
 */
async function fetchMaterialUsageData(startDate: Date, endDate: Date) {
  const issues = await db.materialIssue.findMany({
    where: {
      issuedAt: { gte: startDate, lte: endDate },
      status: 'ISSUED',
    },
    include: {
      store: { select: { name: true } },
      lines: {
        include: {
          item: { select: { itemCode: true, name: true, unitOfMeasure: true } },
        },
      },
    },
    orderBy: { issuedAt: 'desc' },
    take: 100,
  });

  const items = issues.flatMap(issue =>
    issue.lines.map(line => ({
      issueNumber: issue.miNumber,
      date: issue.issuedAt ? new Date(issue.issuedAt).toLocaleDateString() : '-',
      store: issue.store?.name || '-',
      itemCode: line.item?.itemCode || '-',
      itemName: line.item?.name || '-',
      quantity: Number(line.issuedQty),
      unit: line.item?.unitOfMeasure || '-',
      value: Number(line.issuedQty) * Number(line.unitCost || 0),
    }))
  );

  const totalValue = items.reduce((sum, item) => sum + item.value, 0);

  return {
    title: 'Material Usage Report',
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    generatedAt: new Date().toISOString(),
    summary: {
      'Total Issues': issues.length,
      'Total Line Items': items.length,
      'Total Value': `LKR ${totalValue.toLocaleString()}`,
    },
    items,
  };
}

/**
 * Fetch PM Compliance data from database
 */
async function fetchPMComplianceData(startDate: Date, endDate: Date) {
  const schedules = await db.pmSchedule.findMany({
    where: {
      nextExecutionAt: { gte: startDate, lte: endDate },
    },
    include: {
      asset: { select: { assetNumber: true, name: true } },
    },
    orderBy: { nextExecutionAt: 'asc' },
  });

  const total = schedules.length;
  const completed = schedules.filter(pm => pm.status === 'COMPLETED').length;
  const overdue = schedules.filter(pm =>
    pm.status === 'OVERDUE' ||
    (pm.nextExecutionAt && pm.nextExecutionAt < new Date() && pm.status !== 'COMPLETED')
  ).length;

  return {
    title: 'PM Compliance Report',
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    generatedAt: new Date().toISOString(),
    summary: {
      'Total Scheduled': total,
      'Completed': completed,
      'Overdue': overdue,
      'Compliance Rate': `${total > 0 ? ((completed / total) * 100).toFixed(1) : 0}%`,
    },
    schedules: schedules.map(pm => ({
      asset: pm.asset ? `${pm.asset.assetNumber} - ${pm.asset.name}` : '-',
      pmType: pm.pmType,
      scheduledDate: pm.nextExecutionAt ? new Date(pm.nextExecutionAt).toLocaleDateString() : '-',
      status: pm.status,
    })),
  };
}

/**
 * Fetch Monthly Closed Jobs data from database
 */
async function fetchMonthlyClosedJobsData(startDate: Date, endDate: Date) {
  const jobCards = await db.jobCard.findMany({
    where: {
      status: { in: ['COMPLETED', 'CLOSED'] },
      closedAt: { gte: startDate, lte: endDate },
      isActive: true,
    },
    include: {
      asset: { select: { assetNumber: true, name: true, category: true } },
    },
    orderBy: { closedAt: 'desc' },
    take: 100,
  });

  const totalEstimated = jobCards.reduce((sum, jc) => sum + (jc.estimatedCost ? Number(jc.estimatedCost) : 0), 0);
  const totalActual = jobCards.reduce((sum, jc) => sum + (jc.actualCost ? Number(jc.actualCost) : 0), 0);

  return {
    title: 'Monthly Closed Job Cards',
    generatedAt: new Date().toISOString(),
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    summary: {
      'Total Closed': jobCards.length,
      'Total Estimated Cost': `LKR ${totalEstimated.toLocaleString()}`,
      'Total Actual Cost': `LKR ${totalActual.toLocaleString()}`,
      'Variance': `LKR ${(totalActual - totalEstimated).toLocaleString()}`,
    },
    data: jobCards.map((jc, idx) => ({
      no: idx + 1,
      jobCardNumber: jc.jobCardNumber,
      asset: jc.asset ? `${jc.asset.assetNumber} - ${jc.asset.name}` : '-',
      priority: jc.priority,
      estimatedCost: `LKR ${(jc.estimatedCost ? Number(jc.estimatedCost) : 0).toLocaleString()}`,
      actualCost: `LKR ${(jc.actualCost ? Number(jc.actualCost) : 0).toLocaleString()}`,
      closedAt: jc.closedAt ? new Date(jc.closedAt).toLocaleDateString() : '-',
    })),
    columns: [
      { key: 'no', label: '#' },
      { key: 'jobCardNumber', label: 'JC Number' },
      { key: 'asset', label: 'Asset' },
      { key: 'priority', label: 'Priority' },
      { key: 'estimatedCost', label: 'Est. Cost', align: 'right' as const },
      { key: 'actualCost', label: 'Actual Cost', align: 'right' as const },
      { key: 'closedAt', label: 'Closed Date' },
    ],
  };
}

/**
 * Fetch External Costs data from database
 */
async function fetchExternalCostsData(startDate: Date, endDate: Date) {
  const externalJobs = await db.externalJob.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      isActive: true,
    },
    include: {
      subcontractor: { select: { name: true } },
      jobCard: {
        include: {
          asset: { select: { assetNumber: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  }) as any[];

  const totalCost = externalJobs.reduce((sum: number, ej: any) => sum + Number(ej.actualCost || ej.estimatedCost || 0), 0);
  const completed = externalJobs.filter((ej: any) => ej.status === 'COMPLETED').length;

  return {
    title: 'External Costs Report',
    generatedAt: new Date().toISOString(),
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    summary: {
      'Total Repairs': externalJobs.length,
      'Completed': completed,
      'In Progress': externalJobs.length - completed,
      'Total Cost': `LKR ${totalCost.toLocaleString()}`,
    },
    data: externalJobs.map((ej: any, idx: number) => ({
      no: idx + 1,
      jobNumber: ej.jobNumber,
      jobCardNumber: ej.jobCard?.jobCardNumber || '-',
      asset: ej.jobCard?.asset ? `${ej.jobCard.asset.assetNumber}` : '-',
      supplier: ej.subcontractor?.name || '-',
      status: ej.status,
      estimatedCost: `LKR ${Number(ej.estimatedCost || 0).toLocaleString()}`,
      actualCost: `LKR ${Number(ej.actualCost || 0).toLocaleString()}`,
    })),
    columns: [
      { key: 'no', label: '#' },
      { key: 'jobNumber', label: 'Job #' },
      { key: 'jobCardNumber', label: 'JC Number' },
      { key: 'asset', label: 'Asset' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'status', label: 'Status' },
      { key: 'estimatedCost', label: 'Est. Cost', align: 'right' as const },
      { key: 'actualCost', label: 'Actual Cost', align: 'right' as const },
    ],
  };
}

/**
 * Fetch Fleet Availability data from database
 */
async function fetchFleetAvailabilityData() {
  const assets = await db.asset.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { jobCards: true } },
    },
  });

  const total = assets.length;
  const operational = assets.filter(a => a.status === 'OPERATIONAL').length;
  const underRepair = assets.filter(a => a.status === 'UNDER_REPAIR').length;

  return {
    title: 'Fleet Availability Report',
    generatedAt: new Date().toISOString(),
    period: { start: '-', end: new Date().toISOString().split('T')[0] },
    summary: {
      'Total Assets': total,
      'Operational': operational,
      'Under Repair': underRepair,
      'Availability Rate': `${total > 0 ? ((operational / total) * 100).toFixed(1) : 0}%`,
    },
    data: assets.slice(0, 100).map((a, idx) => ({
      no: idx + 1,
      assetNumber: a.assetNumber,
      name: a.name,
      category: (a as any).categoryId || '-',
      status: a.status,
      jobCards: a._count.jobCards,
    })),
    columns: [
      { key: 'no', label: '#' },
      { key: 'assetNumber', label: 'Asset #' },
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'status', label: 'Status' },
      { key: 'jobCards', label: 'Job Cards', align: 'right' as const },
    ],
  };
}

/**
 * Fetch Technician Utilisation data from database
 */
async function fetchTechnicianUtilisationData(startDate: Date, endDate: Date) {
  const employees = await db.employee.findMany({
    where: { status: 'ACTIVE' },
    include: {
      timeLogs: {
        where: {
          logDate: { gte: startDate, lte: endDate },
        },
      },
    },
  });

  const totalHours = employees.reduce((sum, emp) => {
    return sum + emp.timeLogs.reduce((s, tl) => s + ((tl.totalMinutes || 0) / 60), 0);
  }, 0);

  return {
    title: 'Technician Utilisation Report',
    generatedAt: new Date().toISOString(),
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    summary: {
      'Total Technicians': employees.length,
      'Total Hours Logged': `${totalHours.toFixed(1)}h`,
      'Avg Hours/Technician': `${employees.length > 0 ? (totalHours / employees.length).toFixed(1) : 0}h`,
    },
    data: employees.map((emp, idx) => {
      const hours = emp.timeLogs.reduce((s, tl) => s + ((tl.totalMinutes || 0) / 60), 0);
      return {
        no: idx + 1,
        employeeNumber: emp.employeeNumber,
        name: emp.name,
        designation: emp.designation || '-',
        hoursLogged: `${hours.toFixed(1)}h`,
        totalCost: emp.timeLogs.reduce((s, tl) => s + Number(tl.totalCost || 0), 0),
      };
    }),
    columns: [
      { key: 'no', label: '#' },
      { key: 'employeeNumber', label: 'Emp #' },
      { key: 'name', label: 'Name' },
      { key: 'designation', label: 'Designation' },
      { key: 'hoursLogged', label: 'Hours', align: 'right' as const },
      { key: 'totalCost', label: 'Cost', align: 'right' as const },
    ],
  };
}

/**
 * Fetch Fuel Consumption data from database
 */
async function fetchFuelConsumptionData(startDate: Date, endDate: Date) {
  const fuelIssues = await db.fuelIssue.findMany({
    where: {
      issuedAt: { gte: startDate, lte: endDate },
    },
    include: {
      asset: { select: { assetNumber: true, name: true } },
      tank: { select: { name: true, fuelType: true } },
    },
    orderBy: { issuedAt: 'desc' },
  });

  const totalLitres = fuelIssues.reduce((sum, fi) => sum + Number(fi.quantity || 0), 0);

  return {
    title: 'Fuel Consumption Report',
    generatedAt: new Date().toISOString(),
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    summary: {
      'Total Issues': fuelIssues.length,
      'Total Litres': `${totalLitres.toLocaleString()}L`,
    },
    data: fuelIssues.slice(0, 100).map((fi, idx) => ({
      no: idx + 1,
      date: new Date(fi.issuedAt).toLocaleDateString(),
      asset: fi.asset ? `${fi.asset.assetNumber}` : '-',
      tank: fi.tank?.name || '-',
      fuelType: fi.tank?.fuelType || '-',
      quantity: `${Number(fi.quantity).toLocaleString()}L`,
    })),
    columns: [
      { key: 'no', label: '#' },
      { key: 'date', label: 'Date' },
      { key: 'asset', label: 'Asset' },
      { key: 'tank', label: 'Tank' },
      { key: 'fuelType', label: 'Fuel Type' },
      { key: 'quantity', label: 'Qty', align: 'right' as const },
    ],
  };
}

/**
 * Fetch Stock Valuation data from database
 */
async function fetchStockValuationData() {
  const stockItems = await db.storeStock.findMany({
    where: {
      availableQty: { gt: 0 },
    },
    include: {
      item: { select: { itemCode: true, name: true, unitOfMeasure: true } },
      store: { select: { name: true } },
    },
    orderBy: { item: { name: 'asc' } },
  });

  const itemsWithValue = stockItems.map(ss => ({
    itemCode: ss.item?.itemCode || '-',
    itemName: ss.item?.name || '-',
    store: ss.store?.name || '-',
    quantity: Number(ss.availableQty),
    unit: ss.item?.unitOfMeasure || '-',
    wac: Number(ss.wac || 0),
    value: Number(ss.availableQty) * Number(ss.wac || 0),
  }));

  const totalValue = itemsWithValue.reduce((sum, item) => sum + item.value, 0);
  const totalItems = itemsWithValue.length;

  return {
    title: 'Stock Valuation Report',
    generatedAt: new Date().toISOString(),
    period: { start: '-', end: new Date().toISOString().split('T')[0] },
    summary: {
      'Total Items': totalItems,
      'Total Value': `LKR ${totalValue.toLocaleString()}`,
      'Average WAC': `LKR ${totalItems > 0 ? (totalValue / totalItems).toFixed(2) : '0.00'}`,
    },
    data: itemsWithValue.slice(0, 100).map((item, idx) => ({
      no: idx + 1,
      itemCode: item.itemCode,
      itemName: item.itemName,
      store: item.store,
      quantity: item.quantity,
      unit: item.unit,
      wac: `LKR ${item.wac.toFixed(2)}`,
      value: `LKR ${item.value.toLocaleString()}`,
    })),
    columns: [
      { key: 'no', label: '#' },
      { key: 'itemCode', label: 'Item Code' },
      { key: 'itemName', label: 'Item Name' },
      { key: 'store', label: 'Store' },
      { key: 'quantity', label: 'Qty', align: 'right' as const },
      { key: 'wac', label: 'WAC', align: 'right' as const },
      { key: 'value', label: 'Value', align: 'right' as const },
    ],
    totals: {
      'Total Stock Value': totalValue,
    },
  };
}

/**
 * Fetch Procurement Spend data from database
 */
async function fetchProcurementSpendData(startDate: Date, endDate: Date) {
  const purchaseOrders = await db.purchaseOrder.findMany({
    where: {
      orderDate: { gte: startDate, lte: endDate },
      isActive: true,
    },
    include: {
      supplier: { select: { name: true } },
    },
    orderBy: { orderDate: 'desc' },
  });

  const totalValue = purchaseOrders.reduce((sum, po) => sum + Number(po.totalValue || 0), 0);

  return {
    title: 'Procurement Spend Analysis',
    generatedAt: new Date().toISOString(),
    period: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    summary: {
      'Total POs': purchaseOrders.length,
      'Total Spend': `LKR ${totalValue.toLocaleString()}`,
    },
    data: purchaseOrders.slice(0, 100).map((po, idx) => ({
      no: idx + 1,
      poNumber: po.poNumber,
      supplier: po.supplier?.name || '-',
      orderDate: po.orderDate ? new Date(po.orderDate).toLocaleDateString() : '-',
      status: po.status,
      totalValue: `LKR ${Number(po.totalValue || 0).toLocaleString()}`,
    })),
    columns: [
      { key: 'no', label: '#' },
      { key: 'poNumber', label: 'PO Number' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'orderDate', label: 'Date' },
      { key: 'status', label: 'Status' },
      { key: 'totalValue', label: 'Value', align: 'right' as const },
    ],
  };
}

// ============================================
// GET /api/reports/generate-pdf
// Generate PDF with query parameters
// ============================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('reportType');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!reportType) {
      return NextResponse.json({ error: 'reportType parameter is required' }, { status: 400 });
    }

    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();
    endDate.setHours(23, 59, 59, 999);

    return await generatePDFFromDatabase(reportType, startDate, endDate);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
