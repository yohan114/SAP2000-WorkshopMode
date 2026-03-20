import * as XLSX from 'xlsx';

/**
 * Export data to Excel file with support for multiple sheets
 * @param data - Array of data objects or sheet configurations
 * @param filename - Output filename (without extension)
 * @param options - Export options
 */
export interface ExcelSheet {
  name: string;
  data: Record<string, unknown>[];
  columns?: { key: string; label: string; width?: number }[];
  totals?: Record<string, number>;
}

export interface ExportOptions {
  /** Sheet name for single sheet exports */
  sheetName?: string;
  /** Column widths auto-sizing (default: true) */
  autoSizeColumns?: boolean;
  /** Add summary sheet */
  includeSummary?: boolean;
  /** Summary data */
  summary?: Record<string, unknown>;
  /** Currency columns to format */
  currencyColumns?: string[];
  /** Date columns to format */
  dateColumns?: string[];
  /** Number format for currency */
  currencyFormat?: string;
}

/**
 * Format a number as currency
 */
function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return String(value);
  return num.toLocaleString('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  });
}

/**
 * Format a date for display
 */
function formatDate(value: unknown): string {
  if (!value) return '-';
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Auto-size columns based on content
 */
function autoSizeColumns(ws: XLSX.WorkSheet, data: Record<string, unknown>[]) {
  const colWidths: { [key: string]: number } = {};
  
  // Get headers
  const headers = Object.keys(data[0] || {});
  headers.forEach(h => {
    colWidths[h] = h.length;
  });
  
  // Check data content
  data.forEach(row => {
    Object.entries(row).forEach(([key, value]) => {
      const len = String(value ?? '').length;
      if (len > colWidths[key]) {
        colWidths[key] = Math.min(len, 50); // Cap at 50
      }
    });
  });
  
  // Set column widths
  ws['!cols'] = Object.values(colWidths).map(w => ({ wch: w + 2 }));
}

/**
 * Export data to Excel file
 */
export function exportToExcel(
  data: Record<string, unknown>[] | ExcelSheet[],
  filename: string,
  options: ExportOptions = {}
): void {
  const {
    sheetName = 'Data',
    autoSizeColumns = true,
    includeSummary = false,
    summary,
    currencyColumns = [],
    dateColumns = [],
  } = options;

  const wb = XLSX.utils.book_new();
  
  // Check if it's multi-sheet format
  const isMultiSheet = Array.isArray(data) && data.length > 0 && 'name' in data[0] && 'data' in data[0];
  
  if (isMultiSheet) {
    // Multi-sheet export
    const sheets = data as ExcelSheet[];
    
    sheets.forEach((sheet, idx) => {
      let sheetData = [...sheet.data];
      
      // Add totals row if provided
      if (sheet.totals && sheet.data.length > 0) {
        const totalsRow: Record<string, unknown> = { _row: 'TOTALS' };
        Object.keys(sheet.data[0]).forEach(key => {
          if (key in sheet.totals) {
            totalsRow[key] = sheet.totals![key];
          } else if (key !== '_row') {
            totalsRow[key] = '';
          }
        });
        sheetData.push(totalsRow);
      }
      
      const ws = XLSX.utils.json_to_sheet(sheetData);
      
      if (autoSizeColumns) {
        autoSizeColumns(ws, sheet.data);
      }
      
      XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31)); // Excel limit
    });
    
    // Add summary sheet if requested
    if (includeSummary && summary) {
      const summaryRows = Object.entries(summary).map(([key, value]) => ({
        Metric: key,
        Value: value
      }));
      const ws = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    }
  } else {
    // Single sheet export
    let sheetData = Array.isArray(data) ? data as Record<string, unknown>[] : [];
    
    // Add summary as first rows if provided
    if (includeSummary && summary) {
      const summaryRows = Object.entries(summary).map(([key, value]) => ({
        _metric: key,
        _value: value
      }));
      sheetData = [...summaryRows, {} as Record<string, unknown>, ...sheetData];
    }
    
    const ws = XLSX.utils.json_to_sheet(sheetData);
    
    if (autoSizeColumns && sheetData.length > 0) {
      autoSizeColumns(ws, sheetData);
    }
    
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  }
  
  // Generate and download
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export data to CSV file
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  options: Omit<ExportOptions, 'sheetName' | 'includeSummary'> = {}
): void {
  const { currencyColumns = [], dateColumns = [] } = options;
  
  // Format data for CSV
  const formattedData = data.map(row => {
    const newRow: Record<string, unknown> = {};
    Object.entries(row).forEach(([key, value]) => {
      if (currencyColumns.includes(key)) {
        newRow[key] = formatCurrency(value);
      } else if (dateColumns.includes(key)) {
        newRow[key] = formatDate(value);
      } else {
        newRow[key] = value;
      }
    });
    return newRow;
  });
  
  const ws = XLSX.utils.json_to_sheet(formattedData);
  const csv = XLSX.utils.sheet_to_csv(ws);
  
  // Create and download blob
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export report data with standard formatting
 * Used for WCP Reports module
 */
export interface ReportExportData {
  title: string;
  generatedAt: string;
  period: { start: string; end: string };
  summary: Record<string, unknown>;
  data: Record<string, unknown>[];
  columns: { key: string; label: string; align?: 'left' | 'right' }[];
  totals?: Record<string, number>;
}

/**
 * Export report to Excel with multi-sheet support
 */
export function exportReportToExcel(report: ReportExportData, filename?: string): void {
  const sheets: ExcelSheet[] = [];
  
  // Main data sheet
  sheets.push({
    name: 'Report Data',
    data: report.data,
    columns: report.columns,
    totals: report.totals
  });
  
  // Summary sheet
  const summaryData = [
    { Metric: 'Report', Value: report.title },
    { Metric: 'Generated At', Value: report.generatedAt },
    { Metric: 'Period Start', Value: report.period.start },
    { Metric: 'Period End', Value: report.period.end },
    {} as Record<string, unknown>,
    ...Object.entries(report.summary).map(([key, value]) => ({
      Metric: key,
      Value: typeof value === 'number' && !isNaN(value) 
        ? (value as number).toLocaleString() 
        : String(value)
    }))
  ];
  
  // Add totals to summary
  if (report.totals) {
    summaryData.push({} as Record<string, unknown>);
    Object.entries(report.totals).forEach(([key, value]) => {
      summaryData.push({
        Metric: `Total ${key}`,
        Value: formatCurrency(value)
      });
    });
  }
  
  sheets.push({
    name: 'Summary',
    data: summaryData
  });
  
  exportToExcel(sheets, filename || `wcp-report-${new Date().toISOString().split('T')[0]}`);
}

/**
 * Export report to CSV
 */
export function exportReportToCSV(report: ReportExportData, filename?: string): void {
  // Flatten report data for CSV
  const dataWithSummary = [
    { _info: `Report: ${report.title}` },
    { _info: `Generated: ${report.generatedAt}` },
    { _info: `Period: ${report.period.start} to ${report.period.end}` },
    {} as Record<string, unknown>,
    ...report.data
  ];
  
  exportToCSV(
    dataWithSummary,
    filename || `wcp-report-${new Date().toISOString().split('T')[0]}`
  );
}

/**
 * Format data specifically for spreadsheet exports
 * Converts Decimal values and handles nulls
 */
export function formatForSpreadsheet(data: Record<string, unknown>[]): Record<string, unknown>[] {
  return data.map(row => {
    const formatted: Record<string, unknown> = {};
    Object.entries(row).forEach(([key, value]) => {
      // Handle Decimal type from Prisma
      if (value !== null && typeof value === 'object' && 'toNumber' in (value as object)) {
        formatted[key] = (value as { toNumber: () => number }).toNumber();
      }
      // Handle other types
      else if (value === null || value === undefined) {
        formatted[key] = '';
      }
      else if (typeof value === 'boolean') {
        formatted[key] = value ? 'Yes' : 'No';
      }
      else {
        formatted[key] = value;
      }
    });
    return formatted;
  });
}

/**
 * Create a multi-sheet workbook from different data sources
 */
export function createMultiSheetWorkbook(
  sheets: { name: string; data: Record<string, unknown>[] }[]
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  
  sheets.forEach(sheet => {
    if (sheet.data.length > 0) {
      const ws = XLSX.utils.json_to_sheet(sheet.data);
      autoSizeColumns(ws, sheet.data);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31));
    }
  });
  
  return wb;
}

/**
 * Download workbook as Excel file
 */
export function downloadWorkbook(wb: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
