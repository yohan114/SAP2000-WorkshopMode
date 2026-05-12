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
      case 'total-outside-cost':
        reportData = await getTotalOutsideCost(startDate, endDate);
        break;
      case 'monthly-report':
        reportData = await getMonthlyReport(startDate, endDate);
        break;
      case 'monthly-local-purchasing':
        reportData = await getMonthlyLocalPurchasing(startDate, endDate);
        break;
      case 'monthly-ho-purchasing':
        reportData = await getMonthlyHoPurchasing(startDate, endDate);
        break;
      case 'price-variation':
        reportData = await getPriceVariation(startDate, endDate);
        break;
      case 'wrong-item-return-delay':
        reportData = await getWrongItemReturnDelay(startDate, endDate);
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
      'Total Estimated Cost': `LKR ${totalEstimated.toLocaleString()}`,
      'Total Actual Cost': `LKR ${totalActual.toLocaleString()}`,
      'Variance': `LKR ${(totalActual - totalEstimated).toLocaleString()}`,
    },
    data: jobCards.map((jc, idx) => ({
      no: idx + 1,
      jobCardNumber: jc.jobCardNumber,
      asset: jc.asset ? `${jc.asset.assetNumber} - ${jc.asset.name}` : '-',
      priority: jc.priority,
      estimatedCost: `LKR ${(jc.estimatedCost || 0).toLocaleString()}`,
      actualCost: `LKR ${(jc.actualCost || 0).toLocaleString()}`,
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
      issuedAt: { gte: startDate, lte: endDate },
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
    take: 50,
  });

  const lines = issues.flatMap(issue => 
    issue.lines.map(line => ({
      issueNumber: issue.miNumber,
      store: issue.store?.name || '-',
      date: issue.issuedAt ? new Date(issue.issuedAt).toLocaleDateString() : '-',
      itemCode: line.item?.itemCode || '-',
      itemName: line.item?.name || '-',
      quantity: Number(line.issuedQty),
      unit: line.item?.unitOfMeasure || '-',
      value: `LKR ${((Number(line.issuedQty) * Number(line.unitCost || 0))).toLocaleString()}`,
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
      'Total Value': `LKR ${totalValue.toLocaleString()}`,
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
      'Total Cost': `LKR ${totalCost.toLocaleString()}`,
    },
    data: externalRepairs.map((er, idx) => ({
      no: idx + 1,
      jobCardNumber: er.jobCard?.jobCardNumber || '-',
      asset: er.jobCard?.asset ? `${er.jobCard.asset.assetNumber}` : '-',
      supplier: er.supplier?.name || '-',
      status: er.status,
      estimatedCost: `LKR ${(er.estimatedCost || 0).toLocaleString()}`,
      actualCost: `LKR ${(er.actualCost || 0).toLocaleString()}`,
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
  const pmSchedules = await db.pmSchedule.findMany({
    where: {
      nextExecutionAt: { gte: startDate, lte: endDate },
    },
    include: {
      asset: { select: { assetNumber: true, name: true } },
    },
    orderBy: { nextExecutionAt: 'asc' },
  });

  const total = pmSchedules.length;
  const completed = pmSchedules.filter(pm => pm.status === 'COMPLETED').length;
  const overdue = pmSchedules.filter(pm => pm.status === 'OVERDUE' || (pm.nextExecutionAt && pm.nextExecutionAt < new Date() && pm.status !== 'COMPLETED')).length;

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
      scheduledDate: pm.nextExecutionAt ? new Date(pm.nextExecutionAt).toLocaleDateString() : '-',
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
      'Total Spend': `LKR ${totalValue.toLocaleString()}`,
    },
    data: purchaseOrders.slice(0, 100).map((po, idx) => ({
      no: idx + 1,
      poNumber: po.poNumber,
      supplier: po.supplier?.name || '-',
      orderDate: new Date(po.orderDate).toLocaleDateString(),
      status: po.status,
      totalValue: `LKR ${(po.totalValue || 0).toLocaleString()}`,
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
    period: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
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
      { key: 'hoursLogged', label: 'Hours', align: 'right' },
      { key: 'totalCost', label: 'Cost', align: 'right' },
    ],
  };
}

// Fuel Consumption Report
async function getFuelConsumption(startDate: Date, endDate: Date) {
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
    period: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
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
      { key: 'quantity', label: 'Qty', align: 'right' },
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
      technicianAssignments: {
        include: {
          technician: { select: { name: true } },
        },
      },
      timeLogs: {
        include: {
          employee: { select: { hourlyRate: true } },
        },
      },
      materialIssues: {
        include: {
          lines: {
            include: {
              item: { select: { itemCode: true, name: true } },
            },
          },
        },
      },
      externalJobs: true,
    },
    orderBy: { closedAt: 'desc' },
    take: 100,
  });

  // Calculate costs for each job card
  const reportData = jobCards.map((jc, idx) => {
    // Material Cost - from material issues linked to this job card
    const materialCost = jc.materialIssues?.reduce((sum, mi) => {
      return sum + (mi.lines?.reduce((lSum, line) => 
        lSum + (Number(line.issuedQty) * Number(line.unitCost || 0)), 0) || 0);
    }, 0) || 0;

    // Labour Cost - from time logs (totalMinutes / 60)
    const labourHours = jc.timeLogs?.reduce((sum, tl) => sum + ((tl.totalMinutes || 0) / 60), 0) || 0;
    const labourCost = jc.timeLogs?.reduce((sum, tl) => sum + Number(tl.totalCost || 0), 0) || 0;

    // External Cost - from external jobs
    const externalCost = jc.externalJobs?.reduce((sum, ej) => 
      sum + Number(ej.actualCost || ej.estimatedCost || 0), 0) || 0;

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
    materialCost: `LKR ${r.materialCost.toLocaleString()}`,
    labourHours: `${r.labourHours.toFixed(1)}h`,
    labourCost: `LKR ${r.labourCost.toLocaleString()}`,
    externalCost: `LKR ${r.externalCost.toLocaleString()}`,
    subtotal: `LKR ${r.subtotal.toLocaleString()}`,
    sundry: `LKR ${r.sundry.toFixed(2)}`,
    totalBill: `LKR ${r.totalBill.toLocaleString()}`,
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
      'Total Material Cost': `LKR ${totalMaterialCost.toLocaleString()}`,
      'Total Labour Hours': `${totalLabourHours.toFixed(1)}h`,
      'Total Labour Cost': `LKR ${totalLabourCost.toLocaleString()}`,
      'Total External Cost': `LKR ${totalExternalCost.toLocaleString()}`,
      'Total Sundry (10%)': `LKR ${totalSundry.toFixed(2)}`,
      'Grand Total': `LKR ${grandTotal.toLocaleString()}`,
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
      'Total Value': `LKR ${totalValue.toLocaleString()}`,
      'Average WAC': `LKR ${avgWAC.toFixed(2)}`,
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
      { key: 'quantity', label: 'Qty', align: 'right' },
      { key: 'wac', label: 'WAC', align: 'right' },
      { key: 'value', label: 'Value', align: 'right' },
    ],
    totals: {
      'Total Stock Value': totalValue,
    },
  };
}

// Total Outside Cost Report
async function getTotalOutsideCost(startDate: Date, endDate: Date) {
  const externalJobs = await db.externalJob.findMany({
    where: {
      isActive: true,
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      costs: true,
    },
  });

  // Group by subcontractor and job type
  const grouped: Record<string, { subcontractor: string; jobType: string; jobCount: number; estimatedCost: number; actualCost: number; additionalCosts: number }> = {};

  externalJobs.forEach(job => {
    const key = `${job.subcontractorId || 'unknown'}-${job.jobType}`;
    if (!grouped[key]) {
      grouped[key] = {
        subcontractor: job.subcontractorId || 'Unknown',
        jobType: job.jobType,
        jobCount: 0,
        estimatedCost: 0,
        actualCost: 0,
        additionalCosts: 0,
      };
    }
    grouped[key].jobCount += 1;
    grouped[key].estimatedCost += Number(job.estimatedCost || 0);
    grouped[key].actualCost += Number(job.actualCost || 0);
    grouped[key].additionalCosts += job.costs.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  });

  const data = Object.values(grouped).map((g, idx) => ({
    no: idx + 1,
    subcontractor: g.subcontractor,
    jobType: g.jobType,
    jobCount: g.jobCount,
    estimatedCost: `LKR ${g.estimatedCost.toLocaleString()}`,
    actualCost: `LKR ${g.actualCost.toLocaleString()}`,
    additionalCosts: `LKR ${g.additionalCosts.toLocaleString()}`,
    totalCost: `LKR ${(g.actualCost + g.additionalCosts).toLocaleString()}`,
  }));

  const totalEstimated = Object.values(grouped).reduce((s, g) => s + g.estimatedCost, 0);
  const totalActual = Object.values(grouped).reduce((s, g) => s + g.actualCost, 0);
  const totalAdditional = Object.values(grouped).reduce((s, g) => s + g.additionalCosts, 0);
  const grandTotal = totalActual + totalAdditional;

  return {
    title: 'Total Outside Cost Report',
    generatedAt: new Date().toISOString(),
    period: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
    summary: {
      'Total Jobs': externalJobs.length.toString(),
      'Total Estimated': `LKR ${totalEstimated.toLocaleString()}`,
      'Total Actual Cost': `LKR ${totalActual.toLocaleString()}`,
      'Additional Costs': `LKR ${totalAdditional.toLocaleString()}`,
      'Grand Total': `LKR ${grandTotal.toLocaleString()}`,
    },
    data,
    columns: [
      { key: 'no', label: '#' },
      { key: 'subcontractor', label: 'Subcontractor' },
      { key: 'jobType', label: 'Job Type' },
      { key: 'jobCount', label: 'Jobs', align: 'right' },
      { key: 'estimatedCost', label: 'Estimated', align: 'right' },
      { key: 'actualCost', label: 'Actual Cost', align: 'right' },
      { key: 'additionalCosts', label: 'Additional', align: 'right' },
      { key: 'totalCost', label: 'Total', align: 'right' },
    ],
    charts: {
      costByJobType: Object.values(grouped).reduce((acc, g) => {
        const existing = acc.find(a => a.name === g.jobType);
        if (existing) {
          existing.value += g.actualCost + g.additionalCosts;
        } else {
          acc.push({ name: g.jobType, value: g.actualCost + g.additionalCosts });
        }
        return acc;
      }, [] as { name: string; value: number }[]),
    },
  };
}

// Monthly Report - Comprehensive Monthly Summary
async function getMonthlyReport(startDate: Date, endDate: Date) {
  const [jobCardsCreated, jobCardsClosed, purchaseOrders, grnHeaders, materialIssues] = await Promise.all([
    db.jobCard.count({
      where: { createdAt: { gte: startDate, lte: endDate }, isActive: true },
    }),
    db.jobCard.count({
      where: { closedAt: { gte: startDate, lte: endDate }, isActive: true, status: { in: ['COMPLETED', 'CLOSED'] } },
    }),
    db.purchaseOrder.findMany({
      where: { orderDate: { gte: startDate, lte: endDate }, isActive: true },
    }),
    db.grnHeader.count({
      where: { createdAt: { gte: startDate, lte: endDate }, isActive: true },
    }),
    db.materialIssue.findMany({
      where: { issuedAt: { gte: startDate, lte: endDate } },
      include: { lines: true },
    }),
  ]);

  const totalPOValue = purchaseOrders.reduce((s, po) => s + Number(po.totalValue || 0), 0);
  const totalMaterialCost = materialIssues.reduce((s, mi) =>
    s + mi.lines.reduce((ls, l) => ls + Number(l.totalCost || 0), 0), 0);

  // Get external job costs
  const externalJobs = await db.externalJob.findMany({
    where: { createdAt: { gte: startDate, lte: endDate }, isActive: true },
  });
  const totalExternalCost = externalJobs.reduce((s, ej) => s + Number(ej.actualCost || ej.estimatedCost || 0), 0);

  // Get labour cost from time logs
  const timeLogs = await db.timeLog.findMany({
    where: { logDate: { gte: startDate, lte: endDate } },
  });
  const totalLabourCost = timeLogs.reduce((s, tl) => s + Number(tl.totalCost || 0), 0);

  const grandTotalCost = totalMaterialCost + totalLabourCost + totalExternalCost;

  const data = [
    { no: 1, metric: 'Job Cards Created', value: jobCardsCreated.toString(), category: 'Operations' },
    { no: 2, metric: 'Job Cards Closed', value: jobCardsClosed.toString(), category: 'Operations' },
    { no: 3, metric: 'Purchase Orders Raised', value: purchaseOrders.length.toString(), category: 'Procurement' },
    { no: 4, metric: 'Total PO Value', value: `LKR ${totalPOValue.toLocaleString()}`, category: 'Procurement' },
    { no: 5, metric: 'GRNs Received', value: grnHeaders.toString(), category: 'Stores' },
    { no: 6, metric: 'Material Issues', value: materialIssues.length.toString(), category: 'Stores' },
    { no: 7, metric: 'Material Cost', value: `LKR ${totalMaterialCost.toLocaleString()}`, category: 'Costs' },
    { no: 8, metric: 'Labour Cost', value: `LKR ${totalLabourCost.toLocaleString()}`, category: 'Costs' },
    { no: 9, metric: 'External Cost', value: `LKR ${totalExternalCost.toLocaleString()}`, category: 'Costs' },
    { no: 10, metric: 'Grand Total Cost', value: `LKR ${grandTotalCost.toLocaleString()}`, category: 'Costs' },
  ];

  return {
    title: 'Monthly Report',
    generatedAt: new Date().toISOString(),
    period: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
    summary: {
      'JCs Created': jobCardsCreated.toString(),
      'JCs Closed': jobCardsClosed.toString(),
      'Total PO Value': `LKR ${totalPOValue.toLocaleString()}`,
      'Total Cost': `LKR ${grandTotalCost.toLocaleString()}`,
    },
    data,
    columns: [
      { key: 'no', label: '#' },
      { key: 'metric', label: 'Metric' },
      { key: 'value', label: 'Value', align: 'right' },
      { key: 'category', label: 'Category' },
    ],
    charts: {
      costBreakdown: [
        { name: 'Material', value: totalMaterialCost, color: '#10b981' },
        { name: 'Labour', value: totalLabourCost, color: '#3b82f6' },
        { name: 'External', value: totalExternalCost, color: '#f59e0b' },
      ].filter(d => d.value > 0),
    },
  };
}

// Monthly Local Purchasing Report
async function getMonthlyLocalPurchasing(startDate: Date, endDate: Date) {
  const purchaseOrders = await db.purchaseOrder.findMany({
    where: {
      orderDate: { gte: startDate, lte: endDate },
      procurementChannel: 'LOCAL',
      isActive: true,
    },
    include: {
      supplier: { select: { name: true } },
    },
    orderBy: { orderDate: 'desc' },
  });

  const totalValue = purchaseOrders.reduce((sum, po) => sum + Number(po.totalValue || 0), 0);
  const approved = purchaseOrders.filter(po => po.status === 'APPROVED' || po.status === 'ISSUED' || po.status === 'COMPLETED').length;

  return {
    title: 'Monthly Local Purchasing Report',
    generatedAt: new Date().toISOString(),
    period: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
    summary: {
      'Total POs': purchaseOrders.length.toString(),
      'Approved/Issued': approved.toString(),
      'Total Value': `LKR ${totalValue.toLocaleString()}`,
    },
    data: purchaseOrders.map((po, idx) => ({
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
      { key: 'orderDate', label: 'Order Date' },
      { key: 'status', label: 'Status' },
      { key: 'totalValue', label: 'Value', align: 'right' },
    ],
  };
}

// Monthly Head Office Purchasing Report
async function getMonthlyHoPurchasing(startDate: Date, endDate: Date) {
  const purchaseOrders = await db.purchaseOrder.findMany({
    where: {
      orderDate: { gte: startDate, lte: endDate },
      procurementChannel: 'HEAD_OFFICE',
      isActive: true,
    },
    include: {
      supplier: { select: { name: true } },
    },
    orderBy: { orderDate: 'desc' },
  });

  const totalValue = purchaseOrders.reduce((sum, po) => sum + Number(po.totalValue || 0), 0);
  const approved = purchaseOrders.filter(po => po.status === 'APPROVED' || po.status === 'ISSUED' || po.status === 'COMPLETED').length;

  return {
    title: 'Monthly Head Office Purchasing Report',
    generatedAt: new Date().toISOString(),
    period: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
    summary: {
      'Total POs': purchaseOrders.length.toString(),
      'Approved/Issued': approved.toString(),
      'Total Value': `LKR ${totalValue.toLocaleString()}`,
    },
    data: purchaseOrders.map((po, idx) => ({
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
      { key: 'orderDate', label: 'Order Date' },
      { key: 'status', label: 'Status' },
      { key: 'totalValue', label: 'Value', align: 'right' },
    ],
  };
}

// Same Item Price Variation Report
async function getPriceVariation(startDate: Date, endDate: Date) {
  // Use raw SQL to aggregate in the database, avoiding unbounded in-memory fetch
  interface PriceVariationRow {
    itemId: string;
    occurrences: number;
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
  }

  const variations: PriceVariationRow[] = await (db as any).$queryRaw`
    SELECT
      gl."itemId" AS "itemId",
      COUNT(*) AS "occurrences",
      MIN(CAST(gl."unitCost" AS REAL)) AS "minPrice",
      MAX(CAST(gl."unitCost" AS REAL)) AS "maxPrice",
      AVG(CAST(gl."unitCost" AS REAL)) AS "avgPrice"
    FROM "GrnLine" gl
    INNER JOIN "GrnHeader" gh ON gl."grnId" = gh."id"
    WHERE gh."createdAt" >= ${startDate}
      AND gh."createdAt" <= ${endDate}
      AND gh."isActive" = true
    GROUP BY gl."itemId"
    HAVING COUNT(DISTINCT CAST(gl."unitCost" AS TEXT)) > 1
    ORDER BY (MAX(CAST(gl."unitCost" AS REAL)) - MIN(CAST(gl."unitCost" AS REAL))) / NULLIF(MIN(CAST(gl."unitCost" AS REAL)), 0) DESC
    LIMIT 100
  `;

  const processedVariations = variations.map(row => {
    const minPrice = Number(row.minPrice);
    const maxPrice = Number(row.maxPrice);
    const variationPct = minPrice > 0 ? ((maxPrice - minPrice) / minPrice * 100) : 0;
    return {
      itemId: row.itemId,
      occurrences: Number(row.occurrences),
      minPrice,
      maxPrice,
      avgPrice: Number(row.avgPrice),
      variationPct,
    };
  });

  const data = processedVariations.map((v, idx) => ({
    no: idx + 1,
    itemId: v.itemId,
    occurrences: v.occurrences,
    minPrice: `LKR ${v.minPrice.toLocaleString()}`,
    maxPrice: `LKR ${v.maxPrice.toLocaleString()}`,
    avgPrice: `LKR ${v.avgPrice.toFixed(2)}`,
    variationPct: `${v.variationPct.toFixed(1)}%`,
  }));

  return {
    title: 'Same Item Price Variation Report',
    generatedAt: new Date().toISOString(),
    period: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
    summary: {
      'Items with Variation': processedVariations.length.toString(),
      'Max Variation': processedVariations.length > 0 ? `${processedVariations[0].variationPct.toFixed(1)}%` : '0%',
    },
    data,
    columns: [
      { key: 'no', label: '#' },
      { key: 'itemId', label: 'Item ID' },
      { key: 'occurrences', label: 'Receipts', align: 'right' },
      { key: 'minPrice', label: 'Min Price', align: 'right' },
      { key: 'maxPrice', label: 'Max Price', align: 'right' },
      { key: 'avgPrice', label: 'Avg Price', align: 'right' },
      { key: 'variationPct', label: 'Variation %', align: 'right' },
    ],
  };
}

// Wrong Item Return Delay Time Report
async function getWrongItemReturnDelay(startDate: Date, endDate: Date) {
  const wrongItemReturns = await (db as any).wrongItemReturn.findMany({
    where: {
      identifiedAt: { gte: startDate, lte: endDate },
      isActive: true,
    },
    include: {
      grn: { select: { grnNumber: true } },
    },
    orderBy: { identifiedAt: 'desc' },
  });

  const completedReturns = wrongItemReturns.filter((r: any) => r.returnCompletedAt);
  const avgDelay = completedReturns.length > 0
    ? completedReturns.reduce((s: number, r: any) => s + (r.delayDays || 0), 0) / completedReturns.length
    : 0;
  const maxDelay = completedReturns.length > 0
    ? Math.max(...completedReturns.map((r: any) => r.delayDays || 0))
    : 0;

  const data = wrongItemReturns.map((r: any, idx: number) => ({
    no: idx + 1,
    grnNumber: r.grn?.grnNumber || '-',
    itemId: r.itemId,
    reason: r.reason,
    status: r.status,
    identifiedAt: new Date(r.identifiedAt).toLocaleDateString(),
    returnInitiatedAt: r.returnInitiatedAt ? new Date(r.returnInitiatedAt).toLocaleDateString() : '-',
    returnCompletedAt: r.returnCompletedAt ? new Date(r.returnCompletedAt).toLocaleDateString() : '-',
    delayDays: r.delayDays != null ? `${r.delayDays} days` : '-',
  }));

  return {
    title: 'Wrong Item Return Delay Time Report',
    generatedAt: new Date().toISOString(),
    period: { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] },
    summary: {
      'Total Returns': wrongItemReturns.length.toString(),
      'Completed Returns': completedReturns.length.toString(),
      'Average Delay': `${avgDelay.toFixed(1)} days`,
      'Max Delay': `${maxDelay} days`,
    },
    data,
    columns: [
      { key: 'no', label: '#' },
      { key: 'grnNumber', label: 'GRN Number' },
      { key: 'itemId', label: 'Item ID' },
      { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Status' },
      { key: 'identifiedAt', label: 'Identified' },
      { key: 'returnCompletedAt', label: 'Completed' },
      { key: 'delayDays', label: 'Delay', align: 'right' },
    ],
  };
}
