'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Calendar,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface ExportFilters {
  status?: string;
  priority?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  storeId?: string;
  storeFilter?: string;
  requestType?: string;
}

interface ExportButtonProps {
  /** The export endpoint (e.g., 'job-cards', 'inventory', 'material-requests') */
  exportType: 'job-cards' | 'inventory' | 'material-requests';
  /** Current filters to apply to export */
  filters?: ExportFilters;
  /** Button variant */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Show date range picker */
  showDateRange?: boolean;
  /** Custom button text */
  buttonText?: string;
  /** Additional class names */
  className?: string;
}

export function ExportButton({
  exportType,
  filters = {},
  variant = 'outline',
  size = 'default',
  showDateRange = true,
  buttonText = 'Export',
  className,
}: ExportButtonProps) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [dateRange, setDateRange] = useState({
    fromDate: filters.fromDate || '',
    toDate: filters.toDate || '',
  });

  const handleExport = async (format: 'xlsx' | 'csv', useDateRange: boolean = false) => {
    try {
      setExporting(true);
      
      const params = new URLSearchParams();
      params.append('format', format);
      
      // Add filters
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.priority && filters.priority !== 'all') {
        params.append('priority', filters.priority);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.storeId && filters.storeId !== 'all') {
        params.append('storeId', filters.storeId);
      }
      if (filters.storeFilter && filters.storeFilter !== 'all') {
        params.append('storeFilter', filters.storeFilter);
      }
      if (filters.requestType && filters.requestType !== 'all') {
        params.append('requestType', filters.requestType);
      }
      
      // Add date range if specified
      if (useDateRange && dateRange.fromDate) {
        params.append('fromDate', dateRange.fromDate);
      }
      if (useDateRange && dateRange.toDate) {
        params.append('toDate', dateRange.toDate);
      }
      
      const response = await fetch(`/api/export/${exportType}?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }
      
      // Get the blob
      const blob = await response.blob();
      
      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${exportType}-export.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Export Successful',
        description: `${exportType.replace('-', ' ')} exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to export data',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
      setShowDateDialog(false);
    }
  };

  const handleQuickExport = (format: 'xlsx' | 'csv') => {
    handleExport(format, false);
  };

  const handleDateRangeExport = (format: 'xlsx' | 'csv') => {
    setSelectedFormat(format);
    setShowDateDialog(true);
  };

  const confirmDateRangeExport = () => {
    handleExport(selectedFormat, true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} className={className} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {buttonText}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Export Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Quick Export */}
          <DropdownMenuItem onClick={() => handleQuickExport('xlsx')} disabled={exporting}>
            <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
            Export as Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickExport('csv')} disabled={exporting}>
            <FileText className="h-4 w-4 mr-2 text-blue-600" />
            Export as CSV
          </DropdownMenuItem>
          
          {showDateRange && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">With Date Range</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleDateRangeExport('xlsx')} disabled={exporting}>
                <Calendar className="h-4 w-4 mr-2 text-amber-600" />
                Excel (Date Range)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDateRangeExport('csv')} disabled={exporting}>
                <Calendar className="h-4 w-4 mr-2 text-amber-600" />
                CSV (Date Range)
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Date Range Dialog */}
      <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export with Date Range</DialogTitle>
            <DialogDescription>
              Select a date range to filter the exported data
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={dateRange.fromDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, fromDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={dateRange.toDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, toDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDateRangeExport} disabled={exporting}>
              {exporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Export as {selectedFormat.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
