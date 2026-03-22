'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Search,
  Play,
  Clock,
  Mail,
  MoreHorizontal,
  Loader2,
  Calendar,
  FileSpreadsheet,
  FileDown,
  Bell,
  CheckCircle,
  XCircle,
  AlertCircle,
  Repeat,
  Download,
  Eye,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Types
interface SavedReport {
  id: string;
  name: string;
  reportType: string;
  filters: Record<string, unknown>;
  schedule: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  recipients: string[];
  format: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ExecutionHistory {
  id: string;
  savedReportId: string;
  executedAt: string;
  executedBy: string;
  status: 'SUCCESS' | 'FAILED';
  recordCount: number;
  errorMessage: string | null;
}

// Report types configuration
const REPORT_TYPES = [
  { value: 'job-card-cost', label: 'Job Card Cost Report' },
  { value: 'monthly-closed-jobs', label: 'Monthly Closed Jobs' },
  { value: 'material-usage', label: 'Material Usage Report' },
  { value: 'external-costs', label: 'External Costs Report' },
  { value: 'fleet-availability', label: 'Fleet Availability Report' },
  { value: 'pm-compliance', label: 'PM Compliance Report' },
  { value: 'procurement-spend', label: 'Procurement Spend Analysis' },
  { value: 'technician-utilisation', label: 'Technician Utilisation' },
  { value: 'fuel-consumption', label: 'Fuel Consumption Report' },
  { value: 'stock-valuation', label: 'Stock Valuation Report' },
];

const SCHEDULE_OPTIONS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
];

const FORMAT_OPTIONS = [
  { value: 'PDF', label: 'PDF', icon: FileText },
  { value: 'EXCEL', label: 'Excel', icon: FileSpreadsheet },
  { value: 'CSV', label: 'CSV', icon: FileDown },
];

export function SavedReportsView() {
  const { toast } = useToast();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingReport, setEditingReport] = useState<SavedReport | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    reportType: '',
    schedule: '',
    recipients: '',
    format: 'PDF',
    isActive: true,
    // Filter fields
    dateFrom: '',
    dateTo: '',
  });
  const [saving, setSaving] = useState(false);

  // Fetch saved reports
  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('reportType', filterType);
      if (filterStatus === 'active') params.append('activeOnly', 'true');

      const response = await fetch(`/api/saved-reports?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch reports');

      const data = await response.json();
      setReports(data.data || []);
    } catch (error) {
      console.error('Error fetching saved reports:', error);
      toast({ title: 'Error', description: 'Failed to fetch saved reports', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filterType, filterStatus]);

  // Filter reports by search query
  const filteredReports = reports.filter(report =>
    report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.reportType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle form submit
  const handleSubmit = async () => {
    if (!formData.name || !formData.reportType) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const url = editingReport ? `/api/saved-reports/${editingReport.id}` : '/api/saved-reports';
      const method = editingReport ? 'PUT' : 'POST';

      const filters: Record<string, unknown> = {};
      if (formData.dateFrom) filters.from = formData.dateFrom;
      if (formData.dateTo) filters.to = formData.dateTo;

      const body: Record<string, unknown> = {
        name: formData.name,
        reportType: formData.reportType,
        filters,
        schedule: formData.schedule || null,
        format: formData.format,
        isActive: formData.isActive,
      };

      if (formData.recipients) {
        body.recipients = formData.recipients.split(',').map(e => e.trim()).filter(Boolean);
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save report');
      }

      toast({ title: 'Success', description: editingReport ? 'Report updated' : 'Report saved' });
      setShowDialog(false);
      resetForm();
      fetchReports();
    } catch (error) {
      console.error('Error saving report:', error);
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to save report', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this saved report?')) return;

    try {
      const response = await fetch(`/api/saved-reports/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete report');

      toast({ title: 'Success', description: 'Report deleted' });
      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast({ title: 'Error', description: 'Failed to delete report', variant: 'destructive' });
    }
  };

  // Handle execute
  const handleExecute = async (report: SavedReport) => {
    setExecutingId(report.id);
    try {
      const response = await fetch(`/api/saved-reports/${report.id}/execute`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to execute report');

      const data = await response.json();

      // Show preview
      setPreviewData(data);
      setShowPreviewDialog(true);

      toast({ title: 'Success', description: `Report "${report.name}" executed successfully` });
      fetchReports();
    } catch (error) {
      console.error('Error executing report:', error);
      toast({ title: 'Error', description: 'Failed to execute report', variant: 'destructive' });
    } finally {
      setExecutingId(null);
    }
  };

  // Handle toggle active
  const handleToggleActive = async (report: SavedReport) => {
    try {
      const response = await fetch(`/api/saved-reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !report.isActive }),
      });

      if (!response.ok) throw new Error('Failed to update report');

      toast({ title: 'Success', description: report.isActive ? 'Report deactivated' : 'Report activated' });
      fetchReports();
    } catch (error) {
      console.error('Error toggling report:', error);
      toast({ title: 'Error', description: 'Failed to update report', variant: 'destructive' });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      reportType: '',
      schedule: '',
      recipients: '',
      format: 'PDF',
      isActive: true,
      dateFrom: '',
      dateTo: '',
    });
    setEditingReport(null);
  };

  // Open edit dialog
  const openEditDialog = (report: SavedReport) => {
    setEditingReport(report);
    setFormData({
      name: report.name,
      reportType: report.reportType,
      schedule: report.schedule || '',
      recipients: report.recipients?.join(', ') || '',
      format: report.format,
      isActive: report.isActive,
      dateFrom: (report.filters?.from as string) || '',
      dateTo: (report.filters?.to as string) || '',
    });
    setShowDialog(true);
  };

  // Get report type label
  const getReportTypeLabel = (type: string) => {
    return REPORT_TYPES.find(t => t.value === type)?.label || type;
  };

  // Get schedule badge
  const getScheduleBadge = (schedule: string | null) => {
    if (!schedule) return <Badge variant="outline">Manual</Badge>;

    const colors: Record<string, string> = {
      DAILY: 'bg-blue-50 text-blue-700 border-blue-200',
      WEEKLY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      MONTHLY: 'bg-purple-50 text-purple-700 border-purple-200',
      QUARTERLY: 'bg-amber-50 text-amber-700 border-amber-200',
    };

    return (
      <Badge variant="outline" className={colors[schedule] || ''}>
        <Repeat className="h-3 w-3 mr-1" />
        {schedule.charAt(0) + schedule.slice(1).toLowerCase()}
      </Badge>
    );
  };

  // Get format icon
  const getFormatIcon = (format: string) => {
    const formatObj = FORMAT_OPTIONS.find(f => f.value === format);
    if (!formatObj) return <FileText className="h-4 w-4" />;
    const Icon = formatObj.icon;
    return <Icon className="h-4 w-4" />;
  };

  // Format date
  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-600" />
            Saved Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and schedule your saved report configurations
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Saved Report
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">All Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>

        {/* All Reports Tab */}
        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Report Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Report Types</SelectItem>
                    {REPORT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Reports Table */}
          <Card>
            <CardHeader>
              <CardTitle>Saved Reports ({filteredReports.length})</CardTitle>
              <CardDescription>
                View and manage your saved report configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No saved reports found. Click &quot;New Saved Report&quot; to create one.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Report Type</TableHead>
                        <TableHead>Schedule</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Last Run</TableHead>
                        <TableHead>Next Run</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((report) => (
                        <TableRow key={report.id} className={!report.isActive ? 'opacity-50' : ''}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{report.name}</div>
                              {report.recipients && report.recipients.length > 0 && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <Mail className="h-3 w-3" />
                                  {report.recipients.length} recipient(s)
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getReportTypeLabel(report.reportType)}
                            </Badge>
                          </TableCell>
                          <TableCell>{getScheduleBadge(report.schedule)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getFormatIcon(report.format)}
                              <span className="text-sm">{report.format}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(report.lastRunAt)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(report.nextRunAt)}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={report.isActive}
                              onCheckedChange={() => handleToggleActive(report)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleExecute(report)}
                                disabled={executingId === report.id}
                                title="Execute Report"
                              >
                                {executingId === report.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditDialog(report)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleExecute(report)}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Run Now
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(report.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Tab */}
        <TabsContent value="scheduled" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports
              .filter(r => r.schedule && r.isActive)
              .map((report) => (
                <Card key={report.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{report.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {getReportTypeLabel(report.reportType)}
                        </CardDescription>
                      </div>
                      {getScheduleBadge(report.schedule)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Next run:</span>
                      <span className="font-medium">{formatDate(report.nextRunAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Last run:</span>
                      <span>{formatDate(report.lastRunAt)}</span>
                    </div>
                    {report.recipients && report.recipients.length > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Recipients:</span>
                        <span>{report.recipients.length}</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleExecute(report)}
                        disabled={executingId === report.id}
                      >
                        {executingId === report.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-1" />
                        )}
                        Run Now
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(report)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {filteredReports.filter(r => r.schedule && r.isActive).length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No scheduled reports. Create a report with a schedule to see it here.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Recent Tab */}
        <TabsContent value="recent" className="space-y-4">
          <div className="space-y-3">
            {filteredReports
              .filter(r => r.lastRunAt)
              .sort((a, b) => new Date(b.lastRunAt!).getTime() - new Date(a.lastRunAt!).getTime())
              .slice(0, 10)
              .map((report) => (
                <Card key={report.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100">
                        {getFormatIcon(report.format)}
                      </div>
                      <div>
                        <div className="font-medium">{report.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {getReportTypeLabel(report.reportType)} • Executed {formatDate(report.lastRunAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                      <Button size="sm" variant="outline" onClick={() => handleExecute(report)}>
                        <Play className="h-4 w-4 mr-1" />
                        Re-run
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            {filteredReports.filter(r => r.lastRunAt).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No reports have been executed yet.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingReport ? 'Edit Saved Report' : 'New Saved Report'}
            </DialogTitle>
            <DialogDescription>
              {editingReport
                ? 'Update the saved report configuration'
                : 'Create a new saved report with optional scheduling'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Report Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Monthly Cost Report"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type *</Label>
              <Select
                value={formData.reportType}
                onValueChange={(value) => setFormData({ ...formData, reportType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Date From</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={formData.dateFrom}
                  onChange={(e) => setFormData({ ...formData, dateFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Date To</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={formData.dateTo}
                  onChange={(e) => setFormData({ ...formData, dateTo: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="format">Output Format</Label>
                <Select
                  value={formData.format}
                  onValueChange={(value) => setFormData({ ...formData, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule">Schedule</Label>
                <Select
                  value={formData.schedule}
                  onValueChange={(value) => setFormData({ ...formData, schedule: value === 'NONE' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Manual (No Schedule)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Manual (No Schedule)</SelectItem>
                    {SCHEDULE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.schedule && (
              <div className="space-y-2">
                <Label htmlFor="recipients">Email Recipients</Label>
                <Textarea
                  id="recipients"
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                  placeholder="Enter email addresses separated by commas"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Reports will be sent to these email addresses when scheduled
                </p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive reports won&apos;t run on schedule
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingReport ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Report Preview: {previewData?.reportName}
            </DialogTitle>
            <DialogDescription>
              Executed at {previewData?.executedAt ? new Date(previewData.executedAt as string).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="p-4">
              <pre className="text-sm bg-muted/50 p-4 rounded-lg overflow-auto">
                {JSON.stringify(previewData?.data, null, 2)}
              </pre>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              if (previewData) {
                const blob = new Blob([JSON.stringify(previewData.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${previewData.reportName || 'report'}-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }
            }}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
