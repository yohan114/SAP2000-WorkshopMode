import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/reports/[reportId] - Get report data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const to = searchParams.get('to') || new Date().toISOString().split('T')[0];

    const startDate = new Date(from);
    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);

    let reportData: any = {};

    switch (reportId) {
      case 'job-card-cost':
        reportData = await getJobCardCostReport(startDate, endDate);
        break;
      case 'monthly-closed-jobs':
        reportData = await getMonthlyClosedJobs(startDate, endDate);
        break;
      case 'material-usage':
        reportData = await getMaterialUsage(startDate, endDate);
        break;
      case 'external-costs':
        reportData = await getExternalCosts(startDate, endDate);
        break;
      case 'fleet-availability':
        reportData = await getFleetAvailability();
        break;
      case 'pm-compliance':
        reportData = await getPMCompliance(startDate, endDate);
        break;
      case 'procurement-spend':
        reportData = await getProcurementSpend(startDate, endDate);
        break;
      case 'technician-utilisation':
        reportData = await getTechnicianUtilisation(startDate, endDate);
        break;
      case 'fuel-consumption':
        reportData = await getFuelConsumption(startDate, endDate);
        break;
      case 'stock-valuation':
        reportData = await getStockValuation();
        break;
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Failed to generate report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

// Monthly Closed Job Cards Report
async function getMonthlyClosedJobs(startDate: Date, endDate: Date) {
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

  const totalEstimated = jobCards.reduce((sum, jc) => sum + (jc.estimatedCost || 0), 0);
  const totalActual = jobCards.reduce((sum, jc) => sum + (jc.actualCost || 0), 0);

  // Chart data: Status distribution
  const statusDistribution = [
    { name: 'Completed', value: jobCards.filter(jc => jc.status === 'COMPLETED').length, color: '#10b981' },
    { name: 'Closed', value: jobCards.filter(jc => jc.status === 'CLOSED').length, color: '#3b82f6' },
  ];

  // Chart data: Priority breakdown
  const priorityDistribution = [
    { name: 'Emergency', value: jobCards.filter(jc => jc.priority === 'EMERGENCY').length, color: '#ef4444' },
    { name: 'High', value: jobCards.filter(jc => jc.priority === 'HIGH').length, color: '#f59e0b' },
    { name: 'Medium', value: jobCards.filter(jc => jc.priority === 'MEDIUM').length, color: '#3b82f6' },
    { name: 'Low', value: jobCards.filter(jc => jc.priority === 'LOW').length, color: '#10b981' },
  ].filter(d => d.value > 0);

  // Chart data: Costs by asset category
  const costsByCategory = jobCards.reduce((acc, jc) => {
    const category = jc.asset?.category || 'Uncategorized';
    const existing = acc.find(a => a.category === category);
    if (existing) {
      existing.actualCost += jc.actualCost || 0;
      existing.count += 1;
    } else {
      acc.push({ category, actualCost: jc.actualCost || 0, count: 1 });
    }
    return acc;
  }, [] as { category: string; actualCost: number; count: number }[])
    .sort((a, b) => b.actualCost - a.actualCost);

  // Chart data: Monthly trend
  const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
  let costTrend: { month: string; estimated: number; actual: number; count: number }[] = [];
  
  if (monthsDiff >= 1 && jobCards.length > 0) {
    const monthlyData: Record<string, { estimated: number; actual: number; count: number }> = {};
    
    jobCards.forEach(jc => {
      if (jc.closedAt) {
        const monthKey = `${jc.closedAt.getFullYear()}-${String(jc.closedAt.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { estimated: 0, actual: 0, count: 0 };
        }
        monthlyData[monthKey].estimated += jc.estimatedCost || 0;
        monthlyData[monthKey].actual += jc.actualCost || 0;
        monthlyData[monthKey].count += 1;
      }
    });
    
    costTrend = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  }

  return {
    title: 'Monthly Closed Job Cards',
    generatedAt: new Date().toISOString(),
    period: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
    summary: {
      'Total Closed': jobCards.length,
      'Total Estimated Cost': `$${totalEstimated.toLocaleString()}`,
      'Total Actual Cost': `$${totalActual.toLocaleString()}`,
      'Variance': `$${(totalActual - totalEstimated).toLocaleString()}`,
    },
    data: jobCards.map((jc, idx) => ({
      no: idx + 1,
      jobCardNumber: jc.jobCardNumber,
      asset: jc.asset ? `${jc.asset.assetNumber} - ${jc.asset.name}` : '-',
      priority: jc.priority,
      estimatedCost: `$${(jc.estimatedCost || 0).toLocaleString()}`,
      actualCost: `$${(jc.actualCost || 0).toLocaleString()}`,
      closedAt: jc.closedAt ? new Date(jc.closedAt).toLocaleDateString() : '-',
    })),
    columns: [
      { key: 'no', label: '#' },
      { key: 'jobCardNumber', label: 'JC Number' },
      { key: 'asset', label: 'Asset' },
      { key: 'priority', label: 'Priority' },
      { key: 'estimatedCost', label: 'Est. Cost', align: 'right' },
      { key: 'actualCost', label: 'Actual Cost', align: 'right' },
      { key: 'closedAt', label: 'Closed Date' },
    ],
    // Chart-friendly data
    charts: {
      statusDistribution,
      priorityDistribution,
      costsByCategory,
      costTrend,
      rawTotals: {
        totalEstimated,
        totalActual,
        variance: totalActual - totalEstimated,
        count: jobCards.length,
      },
    },
  };
}

// Material Usage Report
async function getMaterialUsage(startDate: Date, endDate: Date) {
  const issues = await db.materialIssue.findMany({
    where: {
      issueDate: { gte: startDate, lte: endDate },
    },
    include: {
      store: { select: { name: true } },
      lines: {
        include: {
          item: { select: { itemCode: true, name: true, unitOfMeasure: true } },
        },
      },
    },
    orderBy: { issueDate: 'desc' },
    take: 50,
  });

  const lines = issues.flatMap(issue => 
    issue.lines.map(line => ({
      issueNumber: issue.issueNumber,
      store: issue.store?.name || '-',
      date: new Date(issue.issueDate).toLocaleDateString(),
      itemCode: line.item?.itemCode || '-',
      itemName: line.item?.name || '-',
      quantity: line.quantityIssued,
      unit: line.item?.unitOfMeasure || '-',
      value: `$${((line.quantityIssued * (line.unitCost || 0))).toLocaleString()}`,
    }))
  );

  const totalValue = lines.reduce((sum, l) => sum + parseFloat(l.value.replace(/[$,]/g, '')), 0);

  return {
    title: 'Material Usage Report',
    generatedAt: new Date().toISOString(),
    period: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
    summary: {
      'Total Issues': issues.length,
      'Total Line Items': lines.length,
      'Total Value': `$${totalValue.toLocaleString()}`,
    },
    data: lines.slice(0, 100),
    columns: [
      { key: 'issueNumber', label: 'Issue #' },
      { key: 'date', label: 'Date' },
      { key: 'store', label: 'Store' },
      { key: 'itemCode', label: 'Item Code' },
      { key: 'itemName', label: 'Item Name' },
      { key: 'quantity', label: 'Qty', align: 'right' },
      { key: 'value', label: 'Value', align: 'right' },
    ],
  };
}

// External Costs Report
async function getExternalCosts(startDate: Date, endDate: Date) {
  const externalRepairs = await db.externalRepair.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      supplier: { select: { name: true } },
      jobCard: { 
        include: { 
          asset: { select: { assetNumber: true, name: true } }
        }
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalCost = externalRepairs.reduce((sum, er) => sum + (er.actualCost || er.estimatedCost || 0), 0);
  const completed = externalRepairs.filter(er => er.status === 'COMPLETED').length;

  return {
    title: 'External Costs Report',
    generatedAt: new Date().toISOString(),
    period: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
    summary: {
      'Total Repairs': externalRepairs.length,
      'Completed': completed,
      'In Progress': externalRepairs.length - completed,
      'Total Cost': `$${totalCost.toLocaleString()}`,
    },
    data: externalRepairs.map((er, idx) => ({
      no: idx + 1,
      jobCardNumber: er.jobCard?.jobCardNumber || '-',
      asset: er.jobCard?.asset ? `${er.jobCard.asset.assetNumber}` : '-',
      supplier: er.supplier?.name || '-',
      status: er.status,
      estimatedCost: `$${(er.estimatedCost || 0).toLocaleString()}`,
      actualCost: `$${(er.actualCost || 0).toLocaleString()}`,
    })),
    columns: [
      { key: 'no', label: '#' },
      { key: 'jobCardNumber', label: 'JC Number' },
      { key: 'asset', label: 'Asset' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'status', label: 'Status' },
      { key: 'estimatedCost', label: 'Est. Cost', align: 'right' },
      { key: 'actualCost', label: 'Actual Cost', align: 'right' },
    ],
  };
}

// Fleet Availability Report
async function getFleetAvailability() {
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
      category: a.category || '-',
      status: a.status,
      jobCards: a._count.jobCards,
    })),
    columns: [
      { key: 'no', label: '#' },
      { key: 'assetNumber', label: 'Asset #' },
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'status', label: 'Status' },
      { key: 'jobCards', label: 'Job Cards', align: 'right' },
    ],
  };
}

// PM Compliance Report
async function getPMCompliance(startDate: Date, endDate: Date) {
  const pmSchedules = await db.preventiveMaintenance.findMany({
    where: {
      scheduledDate: { gte: startDate, lte: endDate },
    },
    include: {
      asset: { select: { assetNumber: true, name: true } },
    },
    orderBy: { scheduledDate: 'asc' },
  });

  const total = pmSchedules.length;
  const completed = pmSchedules.filter(pm => pm.status === 'COMPLETED').length;
  const overdue = pmSchedules.filter(pm => pm.status === 'OVERDUE').length;

  return {
    title: 'PM Compliance Report',
    generatedAt: new Date().toISOString(),
    period: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
    summary: {
      'Total Scheduled': total,
      'Completed': completed,
      'Overdue': overdue,
      'Compliance Rate': `${total > 0 ? ((completed / total) * 100).toFixed(1) : 0}%`,
    },
    data: pmSchedules.slice(0, 100).map((pm, idx) => ({
      no: idx + 1,
      asset: pm.asset ? `${pm.asset.assetNumber}` : '-',
      pmType: pm.pmType,
      scheduledDate: new Date(pm.scheduledDate).toLocaleDateString(),
      status: pm.status,
    })),
    columns: [
      { key: 'no', label: '#' },
      { key: 'asset', label: 'Asset' },
      { key: 'pmType', label: 'PM Type' },
      { key: 'scheduledDate', label: 'Scheduled' },
      { key: 'status', label: 'Status' },
    ],
  };
}

// Procurement Spend Analysis
async function getProcurementSpend(startDate: Date, endDate: Date) {
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

  const totalValue = purchaseOrders.reduce((sum, po) => sum + (po.totalValue || 0), 0);

  return {
    title: 'Procurement Spend Analysis',
    generatedAt: new Date().toISOString(),
    period: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
    summary: {
      'Total POs': purchaseOrders.length,
      'Total Spend': `$${totalValue.toLocaleString()}`,
    },
    data: purchaseOrders.slice(0, 100).map((po, idx) => ({
      no: idx + 1,
      poNumber: po.poNumber,
      supplier: po.supplier?.name || '-',
      orderDate: new Date(po.orderDate).toLocaleDateString(),
      status: po.status,
      totalValue: `$${(po.totalValue || 0).toLocaleString()}`,
    })),
    columns: [
      { key: 'no', label: '#' },
      { key: 'poNumber', label: 'PO Number' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'orderDate', label: 'Date' },
      { key: 'status', label: 'Status' },
      { key: 'totalValue', label: 'Value', align: 'right' },
    ],
  };
}

// Technician Utilisation Report
async function getTechnicianUtilisation(startDate: Date, endDate: Date) {
  const employees = await db.employee.findMany({
    where: { status: 'ACTIVE' },
    include: {
      timeLogs: {
        where: {
          startTime: { gte: startDate, lte: endDate },
        },
      },
      _count: { select: { jobCards: true } },
    },
  });

  const totalHours = employees.reduce((sum, emp) => {
    return sum + emp.timeLogs.reduce((s, tl) => s + (tl.hoursWorked || 0), 0);
  }, 0);

  return {
    title: 'Technician Utilisation Report',
    generatedAt: new Date().toISOString(),
    period: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
    summary: {
      'Total Technicians': employees.length,
      'Total Hours Logged': `${totalHours.toFixed(1)}h`,
      'Avg Hours/Technician': `${employees.length > 0 ? (totalHours / employees.length).toFixed(1) : 0}h`,
    },
    data: employees.map((emp, idx) => {
      const hours = emp.timeLogs.reduce((s, tl) => s + (tl.hoursWorked || 0), 0);
      return {
        no: idx + 1,
        employeeNumber: emp.employeeNumber,
        name: emp.name,
        designation: emp.designation || '-',
        hoursLogged: `${hours.toFixed(1)}h`,
        jobCards: emp._count.jobCards,
      };
    }),
    columns: [
      { key: 'no', label: '#' },
      { key: 'employeeNumber', label: 'Emp #' },
      { key: 'name', label: 'Name' },
      { key: 'designation', label: 'Designation' },
      { key: 'hoursLogged', label: 'Hours', align: 'right' },
      { key: 'jobCards', label: 'Jobs', align: 'right' },
    ],
  };
}

// Fuel Consumption Report
async function getFuelConsumption(startDate: Date, endDate: Date) {
  const fuelIssues = await db.fuelIssue.findMany({
    where: {
      issueDate: { gte: startDate, lte: endDate },
    },
    include: {
      asset: { select: { assetNumber: true, name: true } },
    },
    orderBy: { issueDate: 'desc' },
  });

  const totalLitres = fuelIssues.reduce((sum, fi) => sum + (fi.quantity || 0), 0);
  const totalCost = fuelIssues.reduce((sum, fi) => sum + (fi.totalCost || 0), 0);

  return {
    title: 'Fuel Consumption Report',
    generatedAt: new Date().toISOString(),
    period: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
    summary: {
      'Total Issues': fuelIssues.length,
      'Total Litres': `${totalLitres.toLocaleString()}L`,
      'Total Cost': `$${totalCost.toLocaleString()}`,
    },
    data: fuelIssues.slice(0, 100).map((fi, idx) => ({
      no: idx + 1,
      date: new Date(fi.issueDate).toLocaleDateString(),
      asset: fi.asset ? `${fi.asset.assetNumber}` : '-',
      fuelType: fi.fuelType,
      quantity: `${fi.quantity}L`,
      totalCost: `$${(fi.totalCost || 0).toLocaleString()}`,
    })),
    columns: [
      { key: 'no', label: '#' },
      { key: 'date', label: 'Date' },
      { key: 'asset', label: 'Asset' },
      { key: 'fuelType', label: 'Fuel Type' },
      { key: 'quantity', label: 'Qty', align: 'right' },
      { key: 'totalCost', label: 'Total $', align: 'right' },
    ],
  };
}

// Job Card Cost Report - Complete cost breakdown
async function getJobCardCostReport(startDate: Date, endDate: Date) {
  // Get completed/closed job cards in the period
  const jobCards = await db.jobCard.findMany({
    where: {
      status: { in: ['COMPLETED', 'CLOSED'] },
      closedAt: { gte: startDate, lte: endDate },
      isActive: true,
    },
    include: {
      asset: { select: { assetNumber: true, name: true, category: true } },
      assignedTo: { select: { name: true, hourlyRate: true } },
      timeLogs: true,
      materialIssues: {
        include: {
          lines: true,
        },
      },
      externalRepairs: {
        include: {
          supplier: { select: { name: true } },
        },
      },
    },
    orderBy: { closedAt: 'desc' },
    take: 100,
  });

  // Calculate costs for each job card
  const reportData = jobCards.map((jc, idx) => {
    // Material Cost - from material issues linked to this job card
    const materialCost = jc.materialIssues?.reduce((sum, mi) => {
      return sum + (mi.lines?.reduce((lSum, line) => 
        lSum + (line.quantityIssued * (line.unitCost || 0)), 0) || 0);
    }, 0) || 0;

    // Labour Cost - from time logs
    const labourHours = jc.timeLogs?.reduce((sum, tl) => sum + (tl.hoursWorked || 0), 0) || 0;
    const labourRate = jc.assignedTo?.hourlyRate || 50; // Default rate
    const labourCost = labourHours * labourRate;

    // External Cost - from external repairs
    const externalCost = jc.externalRepairs?.reduce((sum, er) => 
      sum + (er.actualCost || er.estimatedCost || 0), 0) || 0;

    // Subtotal
    const subtotal = materialCost + labourCost + externalCost;

    // Sundry (10%)
    const sundry = subtotal * 0.10;

    // Total Bill
    const totalBill = subtotal + sundry;

    return {
      no: idx + 1,
      jobCardNumber: jc.jobCardNumber,
      asset: jc.asset ? `${jc.asset.assetNumber} - ${jc.asset.name}` : '-',
      assetNumber: jc.asset?.assetNumber || 'Unknown',
      assetName: jc.asset?.name || 'Unknown',
      assetCategory: jc.asset?.category || 'Uncategorized',
      priority: jc.priority,
      materialCost: materialCost,
      labourHours: labourHours,
      labourCost: labourCost,
      externalCost: externalCost,
      subtotal: subtotal,
      sundry: sundry,
      totalBill: totalBill,
      closedAt: jc.closedAt ? new Date(jc.closedAt).toLocaleDateString() : '-',
      closedAtDate: jc.closedAt,
    };
  });

  // Calculate totals
  const totalMaterialCost = reportData.reduce((sum, r) => sum + r.materialCost, 0);
  const totalLabourHours = reportData.reduce((sum, r) => sum + r.labourHours, 0);
  const totalLabourCost = reportData.reduce((sum, r) => sum + r.labourCost, 0);
  const totalExternalCost = reportData.reduce((sum, r) => sum + r.externalCost, 0);
  const totalSubtotal = reportData.reduce((sum, r) => sum + r.subtotal, 0);
  const totalSundry = reportData.reduce((sum, r) => sum + r.sundry, 0);
  const grandTotal = reportData.reduce((sum, r) => sum + r.totalBill, 0);

  // Format data for display
  const formattedData = reportData.map(r => ({
    ...r,
    materialCost: `$${r.materialCost.toLocaleString()}`,
    labourHours: `${r.labourHours.toFixed(1)}h`,
    labourCost: `$${r.labourCost.toLocaleString()}`,
    externalCost: `$${r.externalCost.toLocaleString()}`,
    subtotal: `$${r.subtotal.toLocaleString()}`,
    sundry: `$${r.sundry.toFixed(2)}`,
    totalBill: `$${r.totalBill.toLocaleString()}`,
  }));

  // Chart data: Cost distribution pie chart
  const costDistribution = [
    { name: 'Material', value: totalMaterialCost, color: '#10b981' },
    { name: 'Labour', value: totalLabourCost, color: '#3b82f6' },
    { name: 'External', value: totalExternalCost, color: '#f59e0b' },
    { name: 'Sundry', value: totalSundry, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  // Chart data: Top 10 job cards by total bill
  const topJobCards = [...reportData]
    .sort((a, b) => b.totalBill - a.totalBill)
    .slice(0, 10)
    .map(r => ({
      name: r.jobCardNumber,
      asset: r.assetNumber,
      totalBill: r.totalBill,
      material: r.materialCost,
      labour: r.labourCost,
      external: r.externalCost,
    }));

  // Chart data: Costs by asset
  const costsByAsset = [...reportData]
    .reduce((acc, r) => {
      const existing = acc.find(a => a.assetNumber === r.assetNumber);
      if (existing) {
        existing.totalBill += r.totalBill;
        existing.count += 1;
      } else {
        acc.push({
          assetNumber: r.assetNumber,
          assetName: r.assetName,
          totalBill: r.totalBill,
          count: 1,
        });
      }
      return acc;
    }, [] as { assetNumber: string; assetName: string; totalBill: number; count: number }[])
    .sort((a, b) => b.totalBill - a.totalBill)
    .slice(0, 15);

  // Chart data: Monthly trend (if date range > 1 month)
  const monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
  let costTrend: { month: string; material: number; labour: number; external: number; total: number }[] = [];
  
  if (monthsDiff >= 1) {
    const monthlyData: Record<string, { material: number; labour: number; external: number; total: number }> = {};
    
    reportData.forEach(r => {
      if (r.closedAtDate) {
        const monthKey = `${r.closedAtDate.getFullYear()}-${String(r.closedAtDate.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { material: 0, labour: 0, external: 0, total: 0 };
        }
        monthlyData[monthKey].material += r.materialCost;
        monthlyData[monthKey].labour += r.labourCost;
        monthlyData[monthKey].external += r.externalCost;
        monthlyData[monthKey].total += r.totalBill;
      }
    });
    
    costTrend = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        ...data,
      }));
  }

  // Chart data: Summary donut for M/L/E distribution
  const mleDistribution = [
    { name: 'Material', value: totalMaterialCost, percentage: grandTotal > 0 ? (totalMaterialCost / grandTotal * 100).toFixed(1) : '0' },
    { name: 'Labour', value: totalLabourCost, percentage: grandTotal > 0 ? (totalLabourCost / grandTotal * 100).toFixed(1) : '0' },
    { name: 'External', value: totalExternalCost, percentage: grandTotal > 0 ? (totalExternalCost / grandTotal * 100).toFixed(1) : '0' },
  ];

  return {
    title: 'Job Card Cost Report',
    generatedAt: new Date().toISOString(),
    period: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
    summary: {
      'Total Job Cards': jobCards.length,
      'Total Material Cost': `$${totalMaterialCost.toLocaleString()}`,
      'Total Labour Hours': `${totalLabourHours.toFixed(1)}h`,
      'Total Labour Cost': `$${totalLabourCost.toLocaleString()}`,
      'Total External Cost': `$${totalExternalCost.toLocaleString()}`,
      'Total Sundry (10%)': `$${totalSundry.toFixed(2)}`,
      'Grand Total': `$${grandTotal.toLocaleString()}`,
    },
    data: formattedData,
    columns: [
      { key: 'no', label: '#' },
      { key: 'jobCardNumber', label: 'JC Number' },
      { key: 'asset', label: 'Asset' },
      { key: 'materialCost', label: 'Material', align: 'right' },
      { key: 'labourHours', label: 'Hours', align: 'right' },
      { key: 'labourCost', label: 'Labour', align: 'right' },
      { key: 'externalCost', label: 'External', align: 'right' },
      { key: 'sundry', label: 'Sundry (10%)', align: 'right' },
      { key: 'totalBill', label: 'Total Bill', align: 'right' },
    ],
    totals: {
      'Material Cost': totalMaterialCost,
      'Labour Cost': totalLabourCost,
      'External Cost': totalExternalCost,
      'Sundry (10%)': totalSundry,
      'Grand Total': grandTotal,
    },
    // Chart-friendly data
    charts: {
      costDistribution,
      topJobCards,
      costsByAsset,
      costTrend,
      mleDistribution,
      rawTotals: {
        material: totalMaterialCost,
        labour: totalLabourCost,
        external: totalExternalCost,
        sundry: totalSundry,
        grandTotal,
        jobCardCount: jobCards.length,
      },
    },
  };
}

// Stock Valuation Report
async function getStockValuation() {
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

  // Group by item category
  const itemsWithValue = stockItems.map(ss => ({
    itemCode: ss.item?.itemCode || '-',
    itemName: ss.item?.name || '-',
    store: ss.store?.name || '-',
    quantity: ss.availableQty,
    unit: ss.item?.unitOfMeasure || '-',
    wac: ss.wac || 0,
    value: (ss.availableQty * (ss.wac || 0)),
  }));

  const totalValue = itemsWithValue.reduce((sum, item) => sum + item.value, 0);
  const totalItems = itemsWithValue.length;
  const avgWAC = totalItems > 0 ? totalValue / totalItems : 0;

  return {
    title: 'Stock Valuation Report',
    generatedAt: new Date().toISOString(),
    period: { start: '-', end: new Date().toISOString().split('T')[0] },
    summary: {
      'Total Items': totalItems,
      'Total Value': `$${totalValue.toLocaleString()}`,
      'Average WAC': `$${avgWAC.toFixed(2)}`,
    },
    data: itemsWithValue.slice(0, 100).map((item, idx) => ({
      no: idx + 1,
      itemCode: item.itemCode,
      itemName: item.itemName,
      store: item.store,
      quantity: item.quantity,
      unit: item.unit,
      wac: `$${item.wac.toFixed(2)}`,
      value: `$${item.value.toLocaleString()}`,
    })),
    columns: [
      { key: 'no', label: '#' },
      { key: 'itemCode', label: 'Item Code' },
      { key: 'itemName', label: 'Item Name' },
      { key: 'store', label: 'Store' },
      { key: 'quantity', label: 'Qty', align: 'right' },
      { key: 'wac', label: 'WAC', align: 'right' },
      { key: 'value', label: 'Value', align: 'right' },
    ],
    totals: {
      'Total Stock Value': totalValue,
    },
  };
}
