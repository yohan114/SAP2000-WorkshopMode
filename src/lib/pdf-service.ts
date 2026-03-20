/**
 * PDF Service - Server-side PDF generation using jsPDF with jspdf-autotable v5.x
 * Provides robust PDF generation for scheduled report delivery
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ============================================
// Type Definitions
// ============================================

export interface ReportTemplate {
  id: string;
  name: string;
  reportType: string;
  header: {
    logo: string;
    company: string;
    address: string;
  };
  styles: {
    primaryColor: string;
    fontSize: number;
    fontFamily: string;
  };
  sections: ReportSection[];
  footer: {
    pageNumbers: boolean;
    generatedAt: boolean;
  };
}

export interface ReportSection {
  type: 'summary' | 'table' | 'text' | 'chart' | 'spacer';
  title?: string;
  data?: Record<string, unknown>[];
  columns?: { key: string; label: string; align?: 'left' | 'right' | 'center'; width?: number }[];
  content?: string;
  summaryData?: Record<string, string | number>;
  chartImage?: string; // Base64 encoded image
  height?: number;
}

export interface CostReportData {
  title: string;
  period: { start: string; end: string };
  generatedAt: string;
  summary: {
    totalJobCards: number;
    totalMaterialCost: number;
    totalLabourCost: number;
    totalExternalCost: number;
    totalSundry: number;
    grandTotal: number;
  };
  jobCards: {
    jobCardNumber: string;
    asset: string;
    materialCost: number;
    labourCost: number;
    externalCost: number;
    total: number;
  }[];
}

export interface JobCardPDFData {
  jobCardNumber: string;
  asset: {
    assetNumber: string;
    name: string;
    category?: string;
    make?: string;
    model?: string;
    currentLocation?: string;
  };
  jobType: string;
  priority: string;
  status: string;
  faultDescription: string;
  diagnosisNotes?: string;
  workPerformed?: string;
  createdAt: Date;
  closedAt?: Date;
  creator?: { name: string };
  technicians?: { name: string; role: string }[];
  materialCosts: {
    miNumber: string;
    itemCode: string;
    itemName: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
  }[];
  labourCosts: {
    date: string;
    employee: string;
    hours: number;
    hourlyRate: number;
    totalCost: number;
  }[];
  externalCosts: {
    jobNumber: string;
    subcontractor: string;
    jobType: string;
    estimatedCost: number;
    actualCost: number;
  }[];
  costSummary: {
    materialCost: number;
    labourCost: number;
    externalCost: number;
    subtotal: number;
    sundry: number;
    totalBill: number;
  };
}

// ============================================
// Constants
// ============================================

const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const MARGIN = 14; // Left/right margin
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN; // 182mm

const DEFAULT_STYLES = {
  primaryColor: [16, 185, 129] as [number, number, number], // Emerald
  secondaryColor: [59, 130, 246] as [number, number, number], // Blue
  warningColor: [245, 158, 11] as [number, number, number], // Amber
  purpleColor: [139, 92, 246] as [number, number, number], // Purple
  headerBg: [16, 185, 129] as [number, number, number],
  alternateRowBg: [248, 250, 252] as [number, number, number],
  textColor: [31, 41, 55] as [number, number, number],
};

const COMPANY_HEADER = {
  name: 'WCP - Workshop Control Platform',
  tagline: 'Professional Maintenance Management',
  address: '',
};

// ============================================
// Helper Functions
// ============================================

/**
 * Format currency value with LKR symbol
 */
function formatCurrency(value: number, currency: string = 'LKR'): string {
  return `${currency} ${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get current Y position from last autoTable
 */
function getLastY(doc: jsPDF): number {
  // Access lastAutoTable property that's added by jspdf-autotable
  const docWithTable = doc as unknown as { lastAutoTable?: { finalY: number } };
  return docWithTable.lastAutoTable?.finalY || 20;
}

/**
 * Add page header with company branding
 */
function addHeader(doc: jsPDF, title: string, period?: { start: string; end: string }): number {
  let yPos = 20;

  // Company name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DEFAULT_STYLES.textColor);
  doc.text(COMPANY_HEADER.name, MARGIN, yPos);

  // Tagline
  yPos += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(COMPANY_HEADER.tagline, MARGIN, yPos);

  // Report title
  yPos += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DEFAULT_STYLES.textColor);
  doc.text(title, MARGIN, yPos);

  // Period if provided
  if (period) {
    yPos += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`Period: ${period.start} to ${period.end}`, MARGIN, yPos);
  }

  return yPos + 8;
}

/**
 * Add page footer with page numbers and timestamp
 */
function addFooter(doc: jsPDF, generatedAt: Date = new Date()) {
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);

    const footerText = `Generated: ${generatedAt.toLocaleString()} | Page ${i} of ${pageCount}`;
    doc.text(
      footerText,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 10,
      { align: 'center' }
    );
  }
}

/**
 * Add summary section with key-value pairs
 */
function addSummarySection(
  doc: jsPDF,
  startY: number,
  data: Record<string, string | number>,
  title?: string
): number {
  let yPos = startY;

  // Title
  if (title) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DEFAULT_STYLES.textColor);
    doc.text(title, MARGIN, yPos);
    yPos += 8;
  }

  // Summary box
  const entries = Object.entries(data);
  const boxHeight = Math.ceil(entries.length / 4) * 12 + 10;

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, boxHeight, 3, 3, 'FD');

  yPos += 8;
  doc.setFontSize(9);

  let xPos = MARGIN + 5;
  let rowStartY = yPos;

  entries.forEach(([key, value], index) => {
    // Move to next row after 4 items
    if (index > 0 && index % 4 === 0) {
      yPos = rowStartY + 12;
      rowStartY = yPos;
      xPos = MARGIN + 5;
    }

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(key, xPos, yPos);

    // Value
    yPos += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DEFAULT_STYLES.textColor);
    doc.text(String(value), xPos, yPos);

    xPos += CONTENT_WIDTH / 4;
    yPos -= 4;
  });

  return rowStartY + 14;
}

/**
 * Add data table with alternating row colors
 */
function addDataTable(
  doc: jsPDF,
  startY: number,
  columns: { key: string; label: string; align?: 'left' | 'right' | 'center' }[],
  data: Record<string, unknown>[],
  options?: {
    headColor?: [number, number, number];
    alternateRows?: boolean;
    totals?: Record<string, number>;
  }
): number {
  const headColor = options?.headColor || DEFAULT_STYLES.headerBg;

  autoTable(doc, {
    startY,
    head: [columns.map(col => col.label)],
    body: data.map(row => columns.map(col => row[col.key] ?? '-')),
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: DEFAULT_STYLES.textColor,
    },
    headStyles: {
      fillColor: headColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: options?.alternateRows !== false ? {
      fillColor: DEFAULT_STYLES.alternateRowBg,
    } : {},
    columnStyles: columns.reduce((acc, col, index) => {
      acc[index] = {
        halign: col.align || 'left',
      };
      return acc;
    }, {} as Record<number, { halign: 'left' | 'right' | 'center' }>),
    margin: { left: MARGIN },
    didDrawPage: () => {
      // Add header on new pages
    },
  });

  let finalY = getLastY(doc);

  // Add totals row if provided
  if (options?.totals) {
    finalY += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DEFAULT_STYLES.textColor);

    const totalsText = Object.entries(options.totals)
      .map(([key, value]) => `${key}: ${formatCurrency(value)}`)
      .join('  |  ');
    doc.text(totalsText, MARGIN, finalY);
  }

  return finalY + 10;
}

// ============================================
// Main PDF Generation Functions
// ============================================

/**
 * Generate PDF for any report type
 */
export async function generateReportPDF(
  reportType: string,
  data: {
    title: string;
    generatedAt: string;
    period: { start: string; end: string };
    summary: Record<string, string | number>;
    data: Record<string, unknown>[];
    columns: { key: string; label: string; align?: 'left' | 'right' | 'center' }[];
    totals?: Record<string, number>;
  }
): Promise<Buffer> {
  const doc = new jsPDF();

  // Add header
  let yPos = addHeader(doc, data.title, data.period);

  // Add summary section
  yPos = addSummarySection(doc, yPos, data.summary, 'Summary');
  yPos += 5;

  // Add data table
  if (data.data.length > 0) {
    yPos = addDataTable(doc, yPos, data.columns, data.data, {
      totals: data.totals,
    });
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(107, 114, 128);
    doc.text('No data available for this period.', MARGIN, yPos);
  }

  // Add footer
  addFooter(doc, new Date(data.generatedAt));

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Generate PDF for individual job card with cost breakdown
 */
export async function generateJobCardPDF(data: JobCardPDFData): Promise<Buffer> {
  const doc = new jsPDF();

  // Header
  let yPos = addHeader(doc, 'Finished Job Card Report');

  // Job Card Info Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 50, 3, 3, 'FD');

  yPos += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Job Card Details', MARGIN + 5, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const infoItems = [
    [`Job Card Number:`, data.jobCardNumber],
    [`Asset:`, `${data.asset.assetNumber} - ${data.asset.name}`],
    [`Make/Model:`, `${data.asset.make || '-'} ${data.asset.model || '-'}`],
    [`Location:`, data.asset.currentLocation || '-'],
    [`Job Type:`, data.jobType],
    [`Priority:`, data.priority],
    [`Status:`, data.status],
    [`Created:`, formatDate(data.createdAt)],
  ];

  // Two columns
  const leftCol = infoItems.slice(0, 4);
  const rightCol = infoItems.slice(4);

  let tempY = yPos;
  leftCol.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(label, MARGIN + 5, tempY);
    doc.setTextColor(...DEFAULT_STYLES.textColor);
    doc.text(value, MARGIN + 40, tempY);
    tempY += 5;
  });

  tempY = yPos;
  rightCol.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(label, MARGIN + 95, tempY);
    doc.setTextColor(...DEFAULT_STYLES.textColor);
    doc.text(value, MARGIN + 130, tempY);
    tempY += 5;
  });

  yPos += 25;

  // Fault Description
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DEFAULT_STYLES.textColor);
  doc.text('Fault Description:', MARGIN, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const faultLines = doc.splitTextToSize(data.faultDescription || '-', CONTENT_WIDTH);
  faultLines.slice(0, 5).forEach((line: string) => {
    doc.text(line, MARGIN, yPos);
    yPos += 4;
  });

  // Work Performed
  if (data.workPerformed) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Work Performed:', MARGIN, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const workLines = doc.splitTextToSize(data.workPerformed, CONTENT_WIDTH);
    workLines.slice(0, 5).forEach((line: string) => {
      doc.text(line, MARGIN, yPos);
      yPos += 4;
    });
  }

  // Assigned Technicians
  if (data.technicians && data.technicians.length > 0) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Assigned Technicians:', MARGIN, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    data.technicians.forEach(t => {
      doc.text(`• ${t.name} (${t.role})`, MARGIN + 5, yPos);
      yPos += 4;
    });
  }

  yPos += 5;

  // Material Costs Table
  if (data.materialCosts.length > 0) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Material Costs', MARGIN, yPos);
    yPos += 3;

    autoTable(doc, {
      startY: yPos,
      head: [['MI #', 'Item Code', 'Item Name', 'Qty', 'Unit', 'Unit Cost', 'Total']],
      body: data.materialCosts.map(l => [
        l.miNumber,
        l.itemCode,
        l.itemName.substring(0, 25),
        l.quantity.toFixed(2),
        l.unit,
        formatCurrency(l.unitCost, ''),
        formatCurrency(l.totalCost, ''),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: DEFAULT_STYLES.primaryColor },
      margin: { left: MARGIN },
    });

    yPos = getLastY(doc);
  }

  // Labour Costs Table
  if (data.labourCosts.length > 0) {
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Labour Costs', MARGIN, yPos);
    yPos += 3;

    autoTable(doc, {
      startY: yPos,
      head: [['Date', 'Employee', 'Hours', 'Rate', 'Total']],
      body: data.labourCosts.map(l => [
        l.date,
        l.employee,
        l.hours.toFixed(2),
        formatCurrency(l.hourlyRate, ''),
        formatCurrency(l.totalCost, ''),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: DEFAULT_STYLES.secondaryColor },
      margin: { left: MARGIN },
    });

    yPos = getLastY(doc);
  }

  // External Costs Table
  if (data.externalCosts.length > 0) {
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('External Costs', MARGIN, yPos);
    yPos += 3;

    autoTable(doc, {
      startY: yPos,
      head: [['Job #', 'Subcontractor', 'Type', 'Estimated', 'Actual']],
      body: data.externalCosts.map(l => [
        l.jobNumber,
        l.subcontractor,
        l.jobType,
        formatCurrency(l.estimatedCost, ''),
        formatCurrency(l.actualCost, ''),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: DEFAULT_STYLES.warningColor },
      margin: { left: MARGIN },
    });

    yPos = getLastY(doc);
  }

  // Cost Summary Box
  yPos += 10;
  const summaryHeight = 42;
  doc.setDrawColor(16, 185, 129);
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, summaryHeight, 3, 3, 'FD');

  yPos += 7;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('Cost Summary', MARGIN + 5, yPos);
  yPos += 6;

  doc.setFontSize(9);
  const costItems = [
    { label: 'Material Cost', value: data.costSummary.materialCost },
    { label: 'Labour Cost', value: data.costSummary.labourCost },
    { label: 'External Cost', value: data.costSummary.externalCost },
    { label: 'Subtotal', value: data.costSummary.subtotal },
    { label: 'Sundry (10%)', value: data.costSummary.sundry },
  ];

  costItems.forEach(item => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(item.label, MARGIN + 5, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DEFAULT_STYLES.textColor);
    doc.text(formatCurrency(item.value), MARGIN + CONTENT_WIDTH - 5, yPos, { align: 'right' });
    yPos += 5;
  });

  // Total Bill (highlighted)
  yPos += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129);
  doc.text('TOTAL BILL', MARGIN + 5, yPos);
  doc.text(formatCurrency(data.costSummary.totalBill), MARGIN + CONTENT_WIDTH - 5, yPos, { align: 'right' });

  // Add footer
  addFooter(doc, new Date());

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Generate Cost Report PDF (monthly/period summary)
 */
export async function generateCostReportPDF(data: CostReportData): Promise<Buffer> {
  const doc = new jsPDF();

  // Header
  let yPos = addHeader(doc, data.title, data.period);

  // Summary Section
  const summaryData: Record<string, string | number> = {
    'Total Job Cards': data.summary.totalJobCards,
    'Material Cost': formatCurrency(data.summary.totalMaterialCost),
    'Labour Cost': formatCurrency(data.summary.totalLabourCost),
    'External Cost': formatCurrency(data.summary.totalExternalCost),
    'Sundry (10%)': formatCurrency(data.summary.totalSundry),
    'Grand Total': formatCurrency(data.summary.grandTotal),
  };

  yPos = addSummarySection(doc, yPos, summaryData, 'Cost Summary');
  yPos += 10;

  // Job Cards Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DEFAULT_STYLES.textColor);
  doc.text('Job Card Breakdown', MARGIN, yPos);
  yPos += 5;

  const columns = [
    { key: 'jobCardNumber', label: 'JC Number', align: 'left' as const },
    { key: 'asset', label: 'Asset', align: 'left' as const },
    { key: 'materialCost', label: 'Material', align: 'right' as const },
    { key: 'labourCost', label: 'Labour', align: 'right' as const },
    { key: 'externalCost', label: 'External', align: 'right' as const },
    { key: 'total', label: 'Total', align: 'right' as const },
  ];

  const formattedData = data.jobCards.map(jc => ({
    ...jc,
    materialCost: formatCurrency(jc.materialCost, ''),
    labourCost: formatCurrency(jc.labourCost, ''),
    externalCost: formatCurrency(jc.externalCost, ''),
    total: formatCurrency(jc.total, ''),
  }));

  yPos = addDataTable(doc, yPos, columns, formattedData, {
    totals: {
      'Material': data.summary.totalMaterialCost,
      'Labour': data.summary.totalLabourCost,
      'External': data.summary.totalExternalCost,
      'Grand Total': data.summary.grandTotal,
    },
  });

  // Add footer
  addFooter(doc, new Date(data.generatedAt));

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Generate Material Usage Report PDF
 */
export async function generateMaterialUsagePDF(data: {
  title: string;
  period: { start: string; end: string };
  generatedAt: string;
  summary: Record<string, string | number>;
  items: {
    issueNumber: string;
    date: string;
    store: string;
    itemCode: string;
    itemName: string;
    quantity: number;
    unit: string;
    value: number;
  }[];
}): Promise<Buffer> {
  const doc = new jsPDF();

  // Header
  let yPos = addHeader(doc, data.title, data.period);

  // Summary Section
  yPos = addSummarySection(doc, yPos, data.summary, 'Summary');
  yPos += 10;

  // Material Table
  const columns = [
    { key: 'issueNumber', label: 'Issue #', align: 'left' as const },
    { key: 'date', label: 'Date', align: 'left' as const },
    { key: 'store', label: 'Store', align: 'left' as const },
    { key: 'itemCode', label: 'Item Code', align: 'left' as const },
    { key: 'itemName', label: 'Item Name', align: 'left' as const },
    { key: 'quantity', label: 'Qty', align: 'right' as const },
    { key: 'formattedValue', label: 'Value', align: 'right' as const },
  ];

  const formattedData = data.items.map(item => ({
    ...item,
    formattedValue: formatCurrency(item.value),
  }));

  yPos = addDataTable(doc, yPos, columns, formattedData);

  // Add footer
  addFooter(doc, new Date(data.generatedAt));

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Generate PM Compliance Report PDF
 */
export async function generatePMCompliancePDF(data: {
  title: string;
  period: { start: string; end: string };
  generatedAt: string;
  summary: Record<string, string | number>;
  schedules: {
    asset: string;
    pmType: string;
    scheduledDate: string;
    status: string;
    completedAt?: string;
  }[];
}): Promise<Buffer> {
  const doc = new jsPDF();

  // Header
  let yPos = addHeader(doc, data.title, data.period);

  // Summary Section with compliance rate highlight
  yPos = addSummarySection(doc, yPos, data.summary, 'PM Compliance Summary');
  yPos += 10;

  // PM Schedule Table
  const columns = [
    { key: 'asset', label: 'Asset', align: 'left' as const },
    { key: 'pmType', label: 'PM Type', align: 'left' as const },
    { key: 'scheduledDate', label: 'Scheduled', align: 'left' as const },
    { key: 'status', label: 'Status', align: 'center' as const },
    { key: 'completedAt', label: 'Completed', align: 'left' as const },
  ];

  const formattedData = data.schedules.map(s => ({
    ...s,
    completedAt: s.completedAt || '-',
  }));

  // Use warning color for overdue items
  autoTable(doc, {
    startY: yPos,
    head: [columns.map(col => col.label)],
    body: formattedData.map(row => columns.map(col => row[col.key] ?? '-')),
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: DEFAULT_STYLES.textColor,
    },
    headStyles: {
      fillColor: DEFAULT_STYLES.primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: DEFAULT_STYLES.alternateRowBg,
    },
    didParseCell: (hookData) => {
      // Highlight overdue status in red
      if (hookData.cell.raw === 'OVERDUE') {
        hookData.cell.styles.textColor = [239, 68, 68];
        hookData.cell.styles.fontStyle = 'bold';
      }
      // Highlight completed in green
      if (hookData.cell.raw === 'COMPLETED') {
        hookData.cell.styles.textColor = [16, 185, 129];
      }
    },
    margin: { left: MARGIN },
  });

  // Add footer
  addFooter(doc, new Date(data.generatedAt));

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Create a multi-page report with custom sections
 */
export async function generateCustomReportPDF(
  template: ReportTemplate,
  sections: ReportSection[]
): Promise<Buffer> {
  const doc = new jsPDF();

  // Parse primary color
  const primaryColor = template.styles.primaryColor
    ? template.styles.primaryColor.split(',').map(Number)
    : DEFAULT_STYLES.primaryColor;

  // Header
  let yPos = 20;

  // Company header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DEFAULT_STYLES.textColor);
  doc.text(template.header.company || COMPANY_HEADER.name, MARGIN, yPos);

  // Report title
  yPos += 10;
  doc.setFontSize(14);
  doc.text(template.name, MARGIN, yPos);

  // Process each section
  for (const section of sections) {
    // Check if we need a new page
    if (yPos > PAGE_HEIGHT - 60) {
      doc.addPage();
      yPos = 20;
    }

    switch (section.type) {
      case 'summary':
        yPos = addSummarySection(doc, yPos, section.summaryData || {}, section.title);
        break;

      case 'table':
        if (section.title) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(section.title, MARGIN, yPos);
          yPos += 5;
        }
        if (section.data && section.columns) {
          yPos = addDataTable(doc, yPos, section.columns, section.data);
        }
        break;

      case 'text':
        if (section.title) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(section.title, MARGIN, yPos);
          yPos += 5;
        }
        if (section.content) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(section.content, CONTENT_WIDTH);
          lines.forEach((line: string) => {
            doc.text(line, MARGIN, yPos);
            yPos += 4;
          });
        }
        break;

      case 'spacer':
        yPos += section.height || 10;
        break;

      case 'chart':
        if (section.chartImage) {
          try {
            doc.addImage(section.chartImage, 'PNG', MARGIN, yPos, 80, 50);
            yPos += 55;
          } catch (error) {
            console.error('Failed to add chart image:', error);
          }
        }
        break;
    }
  }

  // Add footer
  addFooter(doc);

  return Buffer.from(doc.output('arraybuffer'));
}
