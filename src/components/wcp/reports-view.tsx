'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  Eye, 
  Loader2, 
  Calendar,
  Wrench,
  Package,
  Truck,
  DollarSign,
  Users,
  Fuel,
  ClipboardCheck,
  CalendarCheck,
  TrendingUp,
  Building2,
  Clock,
  Receipt,
  Calculator,
  Star,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

// Report categories
const REPORT_CATEGORIES = {
  FINANCIAL: 'Financial',
  OPERATIONAL: 'Operational',
  MAINTENANCE: 'Maintenance',
  INVENTORY: 'Inventory',
};

// Report types configuration with categories
const REPORT_TYPES = [
  // RECOMMENDED REPORTS (Most used)
  {
    id: 'job-card-cost',
    name: 'Job Card Cost Report',
    description: 'Complete JC cost: Material + Labour + External + 10% Sundry',
    icon: Receipt,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    category: REPORT_CATEGORIES.FINANCIAL,
    recommended: true,
    featured: true,
  },
  {
    id: 'monthly-closed-jobs',
    name: 'Monthly Closed Job Cards',
    description: 'Summary of closed JCs with costs by period',
    icon: Wrench,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    category: REPORT_CATEGORIES.MAINTENANCE,
    recommended: true,
  },
  {
    id: 'fleet-availability',
    name: 'Fleet Availability Report',
    description: 'Current fleet status and availability rate',
    icon: Truck,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
    category: REPORT_CATEGORIES.OPERATIONAL,
    recommended: true,
  },
  {
    id: 'pm-compliance',
    name: 'PM Compliance Report',
    description: 'PM schedule compliance tracking',
    icon: CalendarCheck,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    category: REPORT_CATEGORIES.MAINTENANCE,
    recommended: true,
  },
  
  // FINANCIAL REPORTS
  {
    id: 'external-costs',
    name: 'External Costs Report',
    description: 'Subcontractor/external job costs',
    icon: DollarSign,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    category: REPORT_CATEGORIES.FINANCIAL,
  },
  {
    id: 'procurement-spend',
    name: 'Procurement Spend Analysis',
    description: 'PO spend by supplier and category',
    icon: TrendingUp,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
    category: REPORT_CATEGORIES.FINANCIAL,
  },
  
  // OPERATIONAL REPORTS
  {
    id: 'technician-utilisation',
    name: 'Technician Utilisation',
    description: 'Labour hours and productivity',
    icon: Users,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    category: REPORT_CATEGORIES.OPERATIONAL,
  },
  {
    id: 'fuel-consumption',
    name: 'Fuel Consumption Report',
    description: 'Fuel issues and consumption trends',
    icon: Fuel,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    category: REPORT_CATEGORIES.OPERATIONAL,
  },
  
  // INVENTORY REPORTS
  {
    id: 'material-usage',
    name: 'Material Usage Report',
    description: 'Items issued with costs by store',
    icon: Package,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    category: REPORT_CATEGORIES.INVENTORY,
  },
  {
    id: 'stock-valuation',
    name: 'Stock Valuation Report',
    description: 'Current stock value by category',
    icon: Calculator,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    category: REPORT_CATEGORIES.INVENTORY,
  },
];

interface ReportData {
  title: string;
  generatedAt: string;
  period: { start: string; end: string };
  summary: Record<string, any>;
  data: any[];
  columns: { key: string; label: string; align?: 'left' | 'right' }[];
  totals?: Record<string, number>;
}

export function ReportsView() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ReportData | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Quick date range handlers
  const setThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setDateFrom(start.toISOString().split('T')[0]);
    setDateTo(now.toISOString().split('T')[0]);
  };

  const setLastMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    setDateFrom(start.toISOString().split('T')[0]);
    setDateTo(end.toISOString().split('T')[0]);
  };

  const setLastQuarter = () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), (quarter - 1) * 3, 1);
    const end = new Date(now.getFullYear(), quarter * 3, 0);
    setDateFrom(start.toISOString().split('T')[0]);
    setDateTo(end.toISOString().split('T')[0]);
  };

  const setThisYear = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    setDateFrom(start.toISOString().split('T')[0]);
    setDateTo(now.toISOString().split('T')[0]);
  };

  // Fetch report data
  const fetchReportData = async (reportId: string): Promise<ReportData | null> => {
    try {
      const response = await fetch(
        `/api/reports/${reportId}?from=${dateFrom}&to=${dateTo}`
      );
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch report:', error);
      return null;
    }
  };

  // Handle preview
  const handlePreview = async (reportId: string) => {
    setLoading(true);
    setSelectedReport(reportId);
    
    const data = await fetchReportData(reportId);
    if (data) {
      setPreviewData(data);
      setShowPreviewDialog(true);
    } else {
      toast.error('Failed to load report data');
    }
    
    setLoading(false);
  };

  // Handle PDF export
  const handleExportPDF = async (reportId: string) => {
    setExporting(true);
    setSelectedReport(reportId);

    try {
      const data = await fetchReportData(reportId);
      if (!data) {
        toast.error('Failed to generate report');
        setExporting(false);
        return;
      }

      await generateClientPDF(data);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Failed to generate PDF');
    }

    setExporting(false);
  };

  // Client-side PDF generation
  const generateClientPDF = async (data: ReportData) => {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();
    
    // Company header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('WCP - Workshop Control Platform', 14, 20);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(data.title, 14, 30);
    
    // Date info
    doc.setFontSize(10);
    doc.text(`Period: ${data.period.start} to ${data.period.end}`, 14, 38);
    doc.text(`Generated: ${data.generatedAt}`, 14, 44);

    // Summary section
    let yPos = 55;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    Object.entries(data.summary).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`, 14, yPos);
      yPos += 5;
    });

    // Data table
    yPos += 10;
    
    const tableColumns = data.columns.map(col => col.label);
    const tableRows = data.data.map(row => 
      data.columns.map(col => String(row[col.key] ?? ''))
    );

    (doc as any).autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: yPos,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [16, 185, 129] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    // Totals section if exists
    if (data.totals) {
      const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTALS:', 14, finalY + 10);
      Object.entries(data.totals).forEach(([key, value], idx) => {
        doc.text(`${key}: $${(value as number).toLocaleString()}`, 14, finalY + 16 + (idx * 5));
      });
    }

    // Page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    // Save
    doc.save(`${data.title.toLowerCase().replace(/\s+/g, '-')}-${dateFrom}-to-${dateTo}.pdf`);
    toast.success('Report downloaded successfully');
  };

  // Filter reports by category
  const filteredReports = activeCategory === 'all' 
    ? REPORT_TYPES 
    : REPORT_TYPES.filter(r => r.category === activeCategory);

  // Get recommended reports
  const recommendedReports = REPORT_TYPES.filter(r => r.recommended);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 text-sm">Generate and export workshop reports</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">From Date</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">To Date</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={setThisMonth}>
                This Month
              </Button>
              <Button variant="outline" size="sm" onClick={setLastMonth}>
                Last Month
              </Button>
              <Button variant="outline" size="sm" onClick={setLastQuarter}>
                Last Quarter
              </Button>
              <Button variant="outline" size="sm" onClick={setThisYear}>
                This Year
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Reports Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-slate-900">Recommended Reports</h2>
        </div>
        
        {/* Featured Job Card Cost Report */}
        {REPORT_TYPES.filter(r => r.featured).map((report) => {
          const Icon = report.icon;
          const isLoading = loading && selectedReport === report.id;
          const isExporting = exporting && selectedReport === report.id;

          return (
            <Card key={report.id} className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-xl ${report.bgColor}`}>
                      <Icon className={`h-8 w-8 ${report.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900">{report.name}</h3>
                        <Badge className="bg-emerald-500 text-white">Most Popular</Badge>
                      </div>
                      <p className="text-slate-600 mt-1">{report.description}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="outline" className="text-xs">
                          Material Costs
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Labour Costs
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          External Costs
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          + 10% Sundry
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handlePreview(report.id)}
                      disabled={isLoading || isExporting}
                      className="min-w-[120px]"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      Preview
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => handleExportPDF(report.id)}
                      disabled={isLoading || isExporting}
                      className="bg-emerald-600 hover:bg-emerald-700 min-w-[140px]"
                    >
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Export PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Other Recommended Reports */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {recommendedReports.filter(r => !r.featured).map((report) => {
            const Icon = report.icon;
            const isLoading = loading && selectedReport === report.id;
            const isExporting = exporting && selectedReport === report.id;

            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${report.bgColor}`}>
                      <Icon className={`h-5 w-5 ${report.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 truncate">{report.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {report.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePreview(report.id)}
                      disabled={isLoading || isExporting}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Eye className="h-4 w-4 mr-1" />
                      )}
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleExportPDF(report.id)}
                      disabled={isLoading || isExporting}
                    >
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Download className="h-4 w-4 mr-1" />
                      )}
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* All Reports Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-slate-900">All Reports</h2>
          <Select value={activeCategory} onValueChange={setActiveCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value={REPORT_CATEGORIES.FINANCIAL}>Financial</SelectItem>
              <SelectItem value={REPORT_CATEGORIES.OPERATIONAL}>Operational</SelectItem>
              <SelectItem value={REPORT_CATEGORIES.MAINTENANCE}>Maintenance</SelectItem>
              <SelectItem value={REPORT_CATEGORIES.INVENTORY}>Inventory</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredReports.map((report) => {
            const Icon = report.icon;
            const isLoading = loading && selectedReport === report.id;
            const isExporting = exporting && selectedReport === report.id;

            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${report.bgColor}`}>
                      <Icon className={`h-5 w-5 ${report.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 truncate">{report.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {report.description}
                      </p>
                      <Badge variant="outline" className="text-xs mt-2">
                        {report.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePreview(report.id)}
                      disabled={isLoading || isExporting}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Eye className="h-4 w-4 mr-1" />
                      )}
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleExportPDF(report.id)}
                      disabled={isLoading || isExporting}
                    >
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Download className="h-4 w-4 mr-1" />
                      )}
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewData?.title || 'Report Preview'}</DialogTitle>
            <DialogDescription>
              Period: {previewData?.period.start} to {previewData?.period.end}
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Summary Section */}
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-sm text-slate-600 mb-2">Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Object.entries(previewData.summary).slice(0, 8).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs text-slate-500">{key}</p>
                      <p className="font-semibold text-slate-900">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-auto">
                {previewData.data.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewData.columns.map((col) => (
                          <TableHead 
                            key={col.key}
                            className={col.align === 'right' ? 'text-right' : ''}
                          >
                            {col.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.data.slice(0, 100).map((row, index) => (
                        <TableRow key={index}>
                          {previewData.columns.map((col) => (
                            <TableCell 
                              key={col.key}
                              className={`${col.align === 'right' ? 'text-right' : ''} ${
                                col.key.toLowerCase().includes('total') || 
                                col.key.toLowerCase().includes('cost') ? 'font-medium' : ''
                              }`}
                            >
                              {String(row[col.key] ?? '-')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No data available for the selected period
                  </div>
                )}
              </div>

              {/* Totals Section */}
              {previewData.totals && Object.keys(previewData.totals).length > 0 && (
                <div className="bg-emerald-50 rounded-lg p-4 mt-4 border border-emerald-200">
                  <h4 className="font-medium text-emerald-800 mb-2">Totals</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Object.entries(previewData.totals).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs text-emerald-600">{key}</p>
                        <p className="font-bold text-emerald-900 text-lg">
                          ${(value as number).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <span className="text-xs text-slate-400">
                  Generated: {previewData.generatedAt} • {previewData.data.length} records
                </span>
                <Button
                  onClick={() => {
                    setShowPreviewDialog(false);
                    if (selectedReport) handleExportPDF(selectedReport);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
