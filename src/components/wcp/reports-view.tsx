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
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig 
} from '@/components/ui/chart';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  LineChart, 
  Line, 
  Area, 
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
  ComposedChart,
  ReferenceLine
} from 'recharts';
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
  ArrowRight,
  TrendingDown,
  Minus,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Bookmark,
  BookmarkCheck,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportReportToExcel, exportReportToCSV } from '@/lib/export-utils';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  
  // NEW REPORTS
  {
    id: 'total-outside-cost',
    name: 'Total Outside Cost',
    description: 'Aggregated external/subcontractor costs by job type',
    icon: DollarSign,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    category: REPORT_CATEGORIES.FINANCIAL,
  },
  {
    id: 'monthly-report',
    name: 'Monthly Report',
    description: 'Comprehensive monthly summary of all workshop activities',
    icon: FileText,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
    category: REPORT_CATEGORIES.OPERATIONAL,
  },
  {
    id: 'monthly-local-purchasing',
    name: 'Monthly Local Purchasing',
    description: 'Local procurement POs for the selected period',
    icon: Building2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    category: REPORT_CATEGORIES.FINANCIAL,
  },
  {
    id: 'monthly-ho-purchasing',
    name: 'Monthly Head Office Purchasing',
    description: 'Head Office procurement POs for the selected period',
    icon: Building2,
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
    category: REPORT_CATEGORIES.FINANCIAL,
  },
  {
    id: 'price-variation',
    name: 'Same Item Price Variation',
    description: 'Identifies items received at different prices across GRNs',
    icon: TrendingUp,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    category: REPORT_CATEGORIES.INVENTORY,
  },
  {
    id: 'wrong-item-return-delay',
    name: 'Wrong Item Return Delay Time',
    description: 'Tracks delay from wrong item identification to return completion',
    icon: Clock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    category: REPORT_CATEGORIES.OPERATIONAL,
  },
];

// Chart colors
const CHART_COLORS = {
  material: '#10b981',
  labour: '#3b82f6',
  external: '#f59e0b',
  sundry: '#8b5cf6',
  total: '#6366f1',
  estimated: '#94a3b8',
  actual: '#10b981',
};

interface ChartData {
  costDistribution?: { name: string; value: number; color: string }[];
  topJobCards?: { name: string; asset: string; totalBill: number; material: number; labour: number; external: number }[];
  costsByAsset?: { assetNumber: string; assetName: string; totalBill: number; count: number }[];
  costTrend?: { month: string; material: number; labour: number; external: number; total: number }[];
  mleDistribution?: { name: string; value: number; percentage: string }[];
  rawTotals?: {
    material?: number;
    labour?: number;
    external?: number;
    sundry?: number;
    grandTotal?: number;
    jobCardCount?: number;
    totalEstimated?: number;
    totalActual?: number;
    variance?: number;
    count?: number;
  };
  statusDistribution?: { name: string; value: number; color: string }[];
  priorityDistribution?: { name: string; value: number; color: string }[];
  costsByCategory?: { category: string; actualCost: number; count: number }[];
}

interface ReportData {
  title: string;
  generatedAt: string;
  period: { start: string; end: string };
  summary: Record<string, any>;
  data: any[];
  columns: { key: string; label: string; align?: 'left' | 'right' }[];
  totals?: Record<string, number>;
  charts?: ChartData;
}

// Sparkline component for mini trend charts
function Sparkline({ data, color = '#10b981', height = 30 }: { data: number[]; color?: string; height?: number }) {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>No trend</span>
      </div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const lastValue = data[data.length - 1];
  const prevValue = data[data.length - 2];
  const trend = lastValue >= prevValue ? 'up' : 'down';

  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 100 100" className="w-16" style={{ height }}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {trend === 'up' ? (
        <TrendingUp className="h-3 w-3 text-emerald-500" />
      ) : (
        <TrendingDown className="h-3 w-3 text-red-500" />
      )}
    </div>
  );
}

// Color indicator component
function ColorIndicator({ value, thresholds }: { value: number; thresholds: { green: number; amber: number } }) {
  let color = 'bg-emerald-500';
  if (value > thresholds.amber) {
    color = 'bg-red-500';
  } else if (value > thresholds.green) {
    color = 'bg-amber-500';
  }

  return (
    <div className={`w-2 h-2 rounded-full ${color}`} title={`Value: ${value}`} />
  );
}

interface SavedReport {
  id: string;
  name: string;
  reportType: string;
  filters: Record<string, any>;
  schedule: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  recipients: string[] | null;
  format: string;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function ReportsView() {
  const { toast } = useToast();
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
  const [reportTrends, setReportTrends] = useState<Record<string, number[]>>({});
  
  // Saved reports state
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveSchedule, setSaveSchedule] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Fetch saved reports
  const fetchSavedReports = async () => {
    try {
      const response = await fetch('/api/reports/saved');
      if (response.ok) {
        const data = await response.json();
        setSavedReports(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch saved reports:', error);
    }
  };

  // Load saved reports on mount
  useEffect(() => {
    fetchSavedReports();
  }, []);

  // Save current report configuration
  const handleSaveReport = async () => {
    if (!selectedReport || !saveName.trim()) {
      toast({ title: 'Error', description: 'Please enter a name for the saved report', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/reports/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName,
          reportType: selectedReport,
          filters: {
            dateFrom,
            dateTo,
            category: activeCategory,
          },
          schedule: saveSchedule || null,
          format: 'PDF',
          createdBy: 'demo-user', // In real app, get from auth
        }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Report saved successfully' });
        setShowSaveDialog(false);
        setSaveName('');
        setSaveSchedule('');
        fetchSavedReports();
      } else {
        toast({ title: 'Error', description: 'Failed to save report', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to save report:', error);
      toast({ title: 'Error', description: 'Failed to save report', variant: 'destructive' });
    }
    setSaving(false);
  };

  // Load a saved report configuration
  const handleLoadReport = (saved: SavedReport) => {
    if (saved.filters) {
      if (saved.filters.dateFrom) setDateFrom(saved.filters.dateFrom);
      if (saved.filters.dateTo) setDateTo(saved.filters.dateTo);
      if (saved.filters.category) setActiveCategory(saved.filters.category);
    }
    setSelectedReport(saved.reportType);
    setShowLoadDialog(false);
    toast({ title: 'Success', description: `Loaded: ${saved.name}` });
  };

  // Delete a saved report
  const handleDeleteSavedReport = async (id: string) => {
    try {
      const response = await fetch(`/api/reports/saved/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Report deleted' });
        fetchSavedReports();
      } else {
        toast({ title: 'Error', description: 'Failed to delete report', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
      toast({ title: 'Error', description: 'Failed to delete report', variant: 'destructive' });
    }
  };

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
      toast({ title: 'Error', description: 'Failed to load report data', variant: 'destructive' });
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
        toast({ title: 'Error', description: 'Failed to generate report', variant: 'destructive' });
        setExporting(false);
        return;
      }

      await generateClientPDF(data);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast({ title: 'Error', description: 'Failed to generate PDF', variant: 'destructive' });
    }

    setExporting(false);
  };

  // Handle Excel export
  const handleExportExcel = async (reportId: string) => {
    setExporting(true);
    setSelectedReport(reportId);

    try {
      const data = await fetchReportData(reportId);
      if (!data) {
        toast({ title: 'Error', description: 'Failed to generate report', variant: 'destructive' });
        setExporting(false);
        return;
      }

      exportReportToExcel(data, `${reportId}-${dateFrom}-to-${dateTo}`);
      toast({ title: 'Success', description: 'Excel file downloaded successfully' });
    } catch (error) {
      console.error('Failed to export Excel:', error);
      toast({ title: 'Error', description: 'Failed to generate Excel file', variant: 'destructive' });
    }

    setExporting(false);
  };

  // Handle CSV export
  const handleExportCSV = async (reportId: string) => {
    setExporting(true);
    setSelectedReport(reportId);

    try {
      const data = await fetchReportData(reportId);
      if (!data) {
        toast({ title: 'Error', description: 'Failed to generate report', variant: 'destructive' });
        setExporting(false);
        return;
      }

      exportReportToCSV(data, `${reportId}-${dateFrom}-to-${dateTo}`);
      toast({ title: 'Success', description: 'CSV file downloaded successfully' });
    } catch (error) {
      console.error('Failed to export CSV:', error);
      toast({ title: 'Error', description: 'Failed to generate CSV file', variant: 'destructive' });
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
        doc.text(`${key}: LKR ${(value as number).toLocaleString()}`, 14, finalY + 16 + (idx * 5));
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
    toast({ title: 'Success', description: 'Report downloaded successfully' });
  };

  // Filter reports by category
  const filteredReports = activeCategory === 'all' 
    ? REPORT_TYPES 
    : REPORT_TYPES.filter(r => r.category === activeCategory);

  // Get recommended reports
  const recommendedReports = REPORT_TYPES.filter(r => r.recommended);

  // Calculate date range in months
  const getDateRangeMonths = () => {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground text-sm">Generate and export workshop reports</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowLoadDialog(true)}
            className="flex items-center gap-2"
          >
            <BookmarkCheck className="h-4 w-4" />
            Load Saved
            {savedReports.length > 0 && (
              <Badge variant="secondary" className="ml-1">{savedReports.length}</Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">From Date</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">To Date</label>
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
              {selectedReport && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowSaveDialog(true)}
                  className="text-emerald-600 border-emerald-600"
                >
                  <Bookmark className="h-4 w-4 mr-1" />
                  Save
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Reports Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-foreground">Recommended Reports</h2>
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
                        <h3 className="text-xl font-bold text-foreground">{report.name}</h3>
                        <Badge className="bg-emerald-500 text-white">Most Popular</Badge>
                      </div>
                      <p className="text-muted-foreground mt-1">{report.description}</p>
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
                      <h3 className="font-medium text-foreground truncate">{report.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
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
          <h2 className="text-lg font-semibold text-foreground">All Reports</h2>
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
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-foreground truncate">{report.name}</h3>
                        <ColorIndicator value={Math.random() * 100} thresholds={{ green: 30, amber: 70 }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
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

      {/* Save Report Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Report Configuration</DialogTitle>
            <DialogDescription>
              Save this report configuration for quick access later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Report Name</label>
              <Input
                placeholder="e.g., Monthly Maintenance Report"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Schedule (Optional)</label>
              <Select value={saveSchedule} onValueChange={setSaveSchedule}>
                <SelectTrigger>
                  <SelectValue placeholder="No schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No schedule</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p><strong>Report Type:</strong> {REPORT_TYPES.find(r => r.id === selectedReport)?.name}</p>
              <p><strong>Date Range:</strong> {dateFrom} to {dateTo}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveReport} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Bookmark className="h-4 w-4 mr-2" />
              )}
              Save Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Load Saved Reports Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Load Saved Report</DialogTitle>
            <DialogDescription>
              Select a previously saved report configuration
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {savedReports.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedReports.map((saved) => (
                  <div
                    key={saved.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  >
                    <div className="flex-1" onClick={() => handleLoadReport(saved)}>
                      <div className="flex items-center gap-2">
                        <Bookmark className="h-4 w-4 text-emerald-500" />
                        <span className="font-medium">{saved.name}</span>
                        {saved.schedule && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {saved.schedule}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {REPORT_TYPES.find(r => r.id === saved.reportType)?.name || saved.reportType}
                        {' • '}
                        {saved.filters?.dateFrom} to {saved.filters?.dateTo}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSavedReport(saved.id);
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bookmark className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No saved reports yet</p>
                <p className="text-sm mt-1">Generate a report and click "Save" to add it here</p>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowLoadDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{previewData?.title || 'Report Preview'}</DialogTitle>
            <DialogDescription>
              Period: {previewData?.period.start} to {previewData?.period.end}
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <Tabs defaultValue="data" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="data">
                  <FileText className="h-4 w-4 mr-2" />
                  Data
                </TabsTrigger>
                <TabsTrigger value="charts">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Charts
                </TabsTrigger>
              </TabsList>

              {/* Data Tab */}
              <TabsContent value="data" className="flex-1 overflow-hidden flex flex-col mt-4">
                {/* Summary Section */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Summary</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Object.entries(previewData.summary).slice(0, 8).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-xs text-muted-foreground">{key}</p>
                        <p className="font-semibold text-foreground">{String(value)}</p>
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
                    <div className="text-center py-8 text-muted-foreground">
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
              </TabsContent>

              {/* Charts Tab */}
              <TabsContent value="charts" className="flex-1 overflow-auto mt-4">
                {previewData.charts ? (
                  <div className="space-y-6">
                    {/* Job Card Cost Report Charts */}
                    {selectedReport === 'job-card-cost' && previewData.charts && (
                      <>
                        {/* Cost Distribution Pie Chart */}
                        {previewData.charts.costDistribution && previewData.charts.costDistribution.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base flex items-center gap-2">
                                <PieChartIcon className="h-4 w-4 text-emerald-600" />
                                Cost Distribution
                              </CardTitle>
                              <CardDescription>Material, Labour, External, and Sundry breakdown</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ChartContainer
                                  config={{
                                    material: { label: 'Material', color: CHART_COLORS.material },
                                    labour: { label: 'Labour', color: CHART_COLORS.labour },
                                    external: { label: 'External', color: CHART_COLORS.external },
                                    sundry: { label: 'Sundry', color: CHART_COLORS.sundry },
                                  }}
                                  className="h-[250px]"
                                >
                                  <PieChart>
                                    <Pie
                                      data={previewData.charts.costDistribution}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={90}
                                      paddingAngle={2}
                                      dataKey="value"
                                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                      {previewData.charts.costDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                  </PieChart>
                                </ChartContainer>
                                <div className="flex flex-col justify-center gap-4">
                                  {previewData.charts.costDistribution.map((item) => (
                                    <div key={item.name} className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-sm font-medium">{item.name}</span>
                                      </div>
                                      <span className="text-sm font-bold">LKR {item.value.toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Top 10 Job Cards by Total Bill - Horizontal Bar Chart */}
                        {previewData.charts.topJobCards && previewData.charts.topJobCards.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-blue-600" />
                                Top 10 Job Cards by Total Bill
                              </CardTitle>
                              <CardDescription>Highest costing job cards in the period</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ChartContainer
                                config={{
                                  totalBill: { label: 'Total Bill', color: CHART_COLORS.total },
                                  material: { label: 'Material', color: CHART_COLORS.material },
                                  labour: { label: 'Labour', color: CHART_COLORS.labour },
                                  external: { label: 'External', color: CHART_COLORS.external },
                                }}
                                className="h-[350px]"
                              >
                                <BarChart
                                  data={previewData.charts.topJobCards}
                                  layout="vertical"
                                  margin={{ left: 80, right: 20 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                  <XAxis type="number" tickFormatter={(value) => `LKR ${(value / 1000).toFixed(0)}k`} />
                                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                  <Bar dataKey="material" stackId="a" fill={CHART_COLORS.material} radius={[0, 0, 0, 0]} />
                                  <Bar dataKey="labour" stackId="a" fill={CHART_COLORS.labour} />
                                  <Bar dataKey="external" stackId="a" fill={CHART_COLORS.external} radius={[0, 4, 4, 0]} />
                                </BarChart>
                              </ChartContainer>
                            </CardContent>
                          </Card>
                        )}

                        {/* Costs by Asset - Bar Chart */}
                        {previewData.charts.costsByAsset && previewData.charts.costsByAsset.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base flex items-center gap-2">
                                <Truck className="h-4 w-4 text-teal-600" />
                                Costs by Asset
                              </CardTitle>
                              <CardDescription>Total costs grouped by asset</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ChartContainer
                                config={{
                                  totalBill: { label: 'Total Bill', color: CHART_COLORS.total },
                                }}
                                className="h-[300px]"
                              >
                                <BarChart data={previewData.charts.costsByAsset.slice(0, 10)}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                  <XAxis dataKey="assetNumber" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                                  <YAxis tickFormatter={(value) => `LKR ${(value / 1000).toFixed(0)}k`} />
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                  <Bar dataKey="totalBill" fill={CHART_COLORS.total} radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ChartContainer>
                            </CardContent>
                          </Card>
                        )}

                        {/* Cost Trend Line Chart (if date range > 1 month) */}
                        {previewData.charts.costTrend && previewData.charts.costTrend.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base flex items-center gap-2">
                                <Activity className="h-4 w-4 text-purple-600" />
                                Cost Trend Over Time
                              </CardTitle>
                              <CardDescription>Monthly cost breakdown for the selected period</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ChartContainer
                                config={{
                                  material: { label: 'Material', color: CHART_COLORS.material },
                                  labour: { label: 'Labour', color: CHART_COLORS.labour },
                                  external: { label: 'External', color: CHART_COLORS.external },
                                  total: { label: 'Total', color: CHART_COLORS.total },
                                }}
                                className="h-[300px]"
                              >
                                <AreaChart data={previewData.charts.costTrend}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                  <YAxis tickFormatter={(value) => `LKR ${(value / 1000).toFixed(0)}k`} />
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                  <Area type="monotone" dataKey="material" stackId="1" stroke={CHART_COLORS.material} fill={CHART_COLORS.material} fillOpacity={0.6} />
                                  <Area type="monotone" dataKey="labour" stackId="1" stroke={CHART_COLORS.labour} fill={CHART_COLORS.labour} fillOpacity={0.6} />
                                  <Area type="monotone" dataKey="external" stackId="1" stroke={CHART_COLORS.external} fill={CHART_COLORS.external} fillOpacity={0.6} />
                                </AreaChart>
                              </ChartContainer>
                            </CardContent>
                          </Card>
                        )}

                        {/* M/L/E Summary Donut */}
                        {previewData.charts.mleDistribution && previewData.charts.mleDistribution.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Material/Labour/External Distribution</CardTitle>
                              <CardDescription>Percentage breakdown excluding sundry</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <ChartContainer
                                  config={{
                                    material: { label: 'Material', color: CHART_COLORS.material },
                                    labour: { label: 'Labour', color: CHART_COLORS.labour },
                                    external: { label: 'External', color: CHART_COLORS.external },
                                  }}
                                  className="h-[200px]"
                                >
                                  <PieChart>
                                    <Pie
                                      data={previewData.charts.mleDistribution}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={50}
                                      outerRadius={80}
                                      paddingAngle={2}
                                      dataKey="value"
                                    >
                                      {previewData.charts.mleDistribution.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={[CHART_COLORS.material, CHART_COLORS.labour, CHART_COLORS.external][index]} />
                                      ))}
                                    </Pie>
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                  </PieChart>
                                </ChartContainer>
                                <div className="flex flex-col justify-center gap-4">
                                  {previewData.charts.mleDistribution.map((item, index) => (
                                    <div key={item.name} className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: [CHART_COLORS.material, CHART_COLORS.labour, CHART_COLORS.external][index] }} />
                                        <span className="text-sm font-medium">{item.name}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-sm font-bold">LKR {item.value.toLocaleString()}</span>
                                        <span className="text-xs text-muted-foreground ml-2">({item.percentage}%)</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    )}

                    {/* Monthly Closed Jobs Charts */}
                    {selectedReport === 'monthly-closed-jobs' && previewData.charts && (
                      <>
                        {/* Priority Distribution */}
                        {previewData.charts.priorityDistribution && previewData.charts.priorityDistribution.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Priority Distribution</CardTitle>
                              <CardDescription>Job cards by priority level</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ChartContainer
                                config={{
                                  emergency: { label: 'Emergency', color: '#ef4444' },
                                  high: { label: 'High', color: '#f59e0b' },
                                  medium: { label: 'Medium', color: '#3b82f6' },
                                  low: { label: 'Low', color: '#10b981' },
                                }}
                                className="h-[250px]"
                              >
                                <PieChart>
                                  <Pie
                                    data={previewData.charts.priorityDistribution}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                  >
                                    {previewData.charts.priorityDistribution!.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                </PieChart>
                              </ChartContainer>
                            </CardContent>
                          </Card>
                        )}

                        {/* Costs by Category */}
                        {previewData.charts.costsByCategory && previewData.charts.costsByCategory.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Costs by Asset Category</CardTitle>
                              <CardDescription>Actual costs grouped by asset category</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ChartContainer
                                config={{
                                  actualCost: { label: 'Actual Cost', color: CHART_COLORS.actual },
                                }}
                                className="h-[300px]"
                              >
                                <BarChart data={previewData.charts.costsByCategory}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                  <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                                  <YAxis tickFormatter={(value) => `LKR ${(value / 1000).toFixed(0)}k`} />
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                  <Bar dataKey="actualCost" fill={CHART_COLORS.actual} radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ChartContainer>
                            </CardContent>
                          </Card>
                        )}

                        {/* Cost Trend */}
                        {previewData.charts.costTrend && previewData.charts.costTrend.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Estimated vs Actual Cost Trend</CardTitle>
                              <CardDescription>Monthly comparison of estimated and actual costs</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ChartContainer
                                config={{
                                  estimated: { label: 'Estimated', color: CHART_COLORS.estimated },
                                  actual: { label: 'Actual', color: CHART_COLORS.actual },
                                }}
                                className="h-[300px]"
                              >
                                <ComposedChart data={previewData.charts.costTrend}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                  <YAxis tickFormatter={(value) => `LKR ${(value / 1000).toFixed(0)}k`} />
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                  <Legend />
                                  <Bar dataKey="estimated" fill={CHART_COLORS.estimated} radius={[4, 4, 0, 0]} />
                                  <Line type="monotone" dataKey="actual" stroke={CHART_COLORS.actual} strokeWidth={2} dot={{ fill: CHART_COLORS.actual }} />
                                </ComposedChart>
                              </ChartContainer>
                            </CardContent>
                          </Card>
                        )}
                      </>
                    )}

                    {/* Generic message if no charts available */}
                    {(!previewData.charts || 
                      (!previewData.charts.costDistribution && 
                       !previewData.charts.topJobCards && 
                       !previewData.charts.costsByAsset &&
                       !previewData.charts.priorityDistribution &&
                       !previewData.charts.costsByCategory)) && (
                      <div className="text-center py-12 text-muted-foreground">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                        <p className="text-lg font-medium">No charts available</p>
                        <p className="text-sm">Charts are available for specific reports with chartable data.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium">No chart data available</p>
                    <p className="text-sm">Generate a report to see visualizations here.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t mt-4">
            <span className="text-xs text-muted-foreground">
              Generated: {previewData?.generatedAt} • {previewData?.data.length || 0} records
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedReport) handleExportCSV(selectedReport);
                }}
                disabled={exporting}
              >
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (selectedReport) handleExportExcel(selectedReport);
                }}
                disabled={exporting}
                className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button
                onClick={() => {
                  setShowPreviewDialog(false);
                  if (selectedReport) handleExportPDF(selectedReport);
                }}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
