'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus, Search, Loader2, MoreHorizontal, Eye, Edit, Trash2, AlertTriangle, Clock, Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ServiceJob {
  id: string;
  jobNumber: string;
  serviceDate: string;
  vehicleNumber: string;
  assetId: string | null;
  asset?: { id: string; assetNumber: string; name: string } | null;
  site: string;
  lastServiceMeter: number;
  currentServiceMeter: number;
  serviceInterval: number;
  nextServiceMeter: number;
  intervalId: string | null;
  interval?: { id: string; name: string; intervalValue: number; unit: string } | null;
  oilQuantity: number | null;
  filterUsed: string | null;
  remarks: string | null;
  industrialUse: string | null;
  minimumCharge: number | null;
  totalCharge: number | null;
  status: string;
  isActive: boolean;
  createdAt: string;
  manHours?: ServiceManHour[];
  consumables?: ServiceConsumable[];
  _count?: { manHours: number; consumables: number };
}

interface ServiceInterval {
  id: string;
  name: string;
  intervalValue: number;
  unit: string;
  description: string | null;
  isActive: boolean;
}

interface ServiceManHour {
  id: string;
  serviceJobId: string;
  technicianName: string;
  hoursWorked: number;
  hourlyRate: number | null;
  totalCost: number | null;
  notes: string | null;
}

interface ServiceConsumable {
  id: string;
  serviceJobId: string;
  itemName: string;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  notes: string | null;
}

interface ServiceAlert {
  id: string;
  jobNumber: string;
  vehicleNumber: string;
  site: string;
  serviceDate: string;
  nextServiceMeter: number;
  currentServiceMeter: number;
  daysSinceService: number;
  isOverdue: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'default',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
};

export function ServiceJobsView() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('jobs');

  // Data states
  const [jobs, setJobs] = useState<ServiceJob[]>([]);
  const [intervals, setIntervals] = useState<ServiceInterval[]>([]);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [history, setHistory] = useState<ServiceJob[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search and filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('');
  const [historyVehicle, setHistoryVehicle] = useState('');

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isIntervalDialogOpen, setIsIntervalDialogOpen] = useState(false);
  const [isEditIntervalDialogOpen, setIsEditIntervalDialogOpen] = useState(false);
  const [isManHourDialogOpen, setIsManHourDialogOpen] = useState(false);
  const [isConsumableDialogOpen, setIsConsumableDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ServiceJob | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<ServiceInterval | null>(null);

  // Form states
  const [jobForm, setJobForm] = useState({
    serviceDate: new Date().toISOString().split('T')[0],
    vehicleNumber: '',
    site: '',
    lastServiceMeter: '',
    currentServiceMeter: '',
    intervalId: '',
    serviceInterval: '',
    oilQuantity: '',
    filterUsed: '',
    remarks: '',
    industrialUse: '',
    minimumCharge: '',
    totalCharge: '',
  });

  const [intervalForm, setIntervalForm] = useState({
    name: '',
    intervalValue: '',
    unit: 'KM',
    description: '',
  });

  const [manHourForm, setManHourForm] = useState({
    technicianName: '',
    hoursWorked: '',
    hourlyRate: '',
    notes: '',
  });

  const [consumableForm, setConsumableForm] = useState({
    itemName: '',
    quantity: '',
    unitCost: '',
    notes: '',
  });

  useEffect(() => {
    fetchJobs();
    fetchIntervals();
    fetchAlerts();
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [search, statusFilter, siteFilter]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '50' });
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (siteFilter) params.set('site', siteFilter);

      const res = await fetch(`/api/service-jobs?${params}`);
      const data = await res.json();
      if (data.success) {
        setJobs(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch service jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIntervals = async () => {
    try {
      const res = await fetch('/api/service-intervals');
      const data = await res.json();
      if (data.success) {
        setIntervals(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch intervals:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/service-jobs/alerts');
      const data = await res.json();
      if (data.success) {
        setAlerts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const fetchHistory = async (vehicle: string) => {
    if (!vehicle) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/service-jobs/history?vehicleNumber=${encodeURIComponent(vehicle)}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/service-jobs/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedJob(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch job detail:', error);
    }
  };

  // Compute next service meter
  const computedNextMeter = () => {
    const current = parseFloat(jobForm.currentServiceMeter);
    const interval = parseFloat(jobForm.serviceInterval);
    if (!isNaN(current) && !isNaN(interval)) {
      return current + interval;
    }
    return 0;
  };

  // Handle interval selection to auto-populate serviceInterval value
  const handleIntervalSelect = (intervalId: string) => {
    const selected = intervals.find(i => i.id === intervalId);
    if (selected) {
      setJobForm({
        ...jobForm,
        intervalId,
        serviceInterval: String(selected.intervalValue),
      });
    } else {
      setJobForm({ ...jobForm, intervalId, serviceInterval: '' });
    }
  };

  // CRUD handlers
  const handleCreateJob = async () => {
    if (!jobForm.vehicleNumber || !jobForm.site || !jobForm.currentServiceMeter) {
      toast({ title: 'Validation Error', description: 'Vehicle, site, and current meter are required', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/service-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceDate: jobForm.serviceDate,
          vehicleNumber: jobForm.vehicleNumber,
          site: jobForm.site,
          lastServiceMeter: parseFloat(jobForm.lastServiceMeter) || 0,
          currentServiceMeter: parseFloat(jobForm.currentServiceMeter),
          serviceInterval: parseFloat(jobForm.serviceInterval) || 0,
          intervalId: jobForm.intervalId || undefined,
          oilQuantity: jobForm.oilQuantity ? parseFloat(jobForm.oilQuantity) : undefined,
          filterUsed: jobForm.filterUsed || undefined,
          remarks: jobForm.remarks || undefined,
          industrialUse: jobForm.industrialUse || undefined,
          minimumCharge: jobForm.minimumCharge ? parseFloat(jobForm.minimumCharge) : undefined,
          totalCharge: jobForm.totalCharge ? parseFloat(jobForm.totalCharge) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Service job created successfully' });
        setIsCreateDialogOpen(false);
        resetJobForm();
        fetchJobs();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create job', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Create job error:', error);
      toast({ title: 'Error', description: 'Failed to create service job', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteJob = async (job: ServiceJob) => {
    if (!confirm(`Are you sure you want to delete job ${job.jobNumber}?`)) return;
    try {
      const res = await fetch(`/api/service-jobs/${job.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Service job deleted' });
        setIsDetailDialogOpen(false);
        fetchJobs();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Error', description: 'Failed to delete job', variant: 'destructive' });
    }
  };

  const handleCreateInterval = async () => {
    if (!intervalForm.name || !intervalForm.intervalValue) {
      toast({ title: 'Validation Error', description: 'Name and interval value are required', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/service-intervals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: intervalForm.name,
          intervalValue: parseFloat(intervalForm.intervalValue),
          unit: intervalForm.unit,
          description: intervalForm.description || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Interval created successfully' });
        setIsIntervalDialogOpen(false);
        setIntervalForm({ name: '', intervalValue: '', unit: 'KM', description: '' });
        fetchIntervals();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create interval', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Create interval error:', error);
      toast({ title: 'Error', description: 'Failed to create interval', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateInterval = async () => {
    if (!selectedInterval) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/service-intervals/${selectedInterval.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: intervalForm.name,
          intervalValue: parseFloat(intervalForm.intervalValue),
          unit: intervalForm.unit,
          description: intervalForm.description || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Interval updated' });
        setIsEditIntervalDialogOpen(false);
        setSelectedInterval(null);
        fetchIntervals();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Update interval error:', error);
      toast({ title: 'Error', description: 'Failed to update interval', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInterval = async (interval: ServiceInterval) => {
    if (!confirm(`Delete interval "${interval.name}"?`)) return;
    try {
      const res = await fetch(`/api/service-intervals/${interval.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Interval deleted' });
        fetchIntervals();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Delete interval error:', error);
      toast({ title: 'Error', description: 'Failed to delete interval', variant: 'destructive' });
    }
  };

  const handleAddManHour = async () => {
    if (!selectedJob || !manHourForm.technicianName || !manHourForm.hoursWorked) {
      toast({ title: 'Validation Error', description: 'Technician and hours are required', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`/api/service-jobs/${selectedJob.id}/man-hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicianName: manHourForm.technicianName,
          hoursWorked: parseFloat(manHourForm.hoursWorked),
          hourlyRate: manHourForm.hourlyRate ? parseFloat(manHourForm.hourlyRate) : undefined,
          notes: manHourForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Man hour added' });
        setIsManHourDialogOpen(false);
        setManHourForm({ technicianName: '', hoursWorked: '', hourlyRate: '', notes: '' });
        fetchJobDetail(selectedJob.id);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to add man hour', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Add man hour error:', error);
      toast({ title: 'Error', description: 'Failed to add man hour', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddConsumable = async () => {
    if (!selectedJob || !consumableForm.itemName || !consumableForm.quantity) {
      toast({ title: 'Validation Error', description: 'Item name and quantity are required', variant: 'destructive' });
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`/api/service-jobs/${selectedJob.id}/consumables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: consumableForm.itemName,
          quantity: parseFloat(consumableForm.quantity),
          unitCost: consumableForm.unitCost ? parseFloat(consumableForm.unitCost) : undefined,
          notes: consumableForm.notes || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Consumable added' });
        setIsConsumableDialogOpen(false);
        setConsumableForm({ itemName: '', quantity: '', unitCost: '', notes: '' });
        fetchJobDetail(selectedJob.id);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to add consumable', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Add consumable error:', error);
      toast({ title: 'Error', description: 'Failed to add consumable', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const resetJobForm = () => {
    setJobForm({
      serviceDate: new Date().toISOString().split('T')[0],
      vehicleNumber: '', site: '', lastServiceMeter: '', currentServiceMeter: '',
      intervalId: '', serviceInterval: '', oilQuantity: '', filterUsed: '',
      remarks: '', industrialUse: '', minimumCharge: '', totalCharge: '',
    });
  };

  const openEditInterval = (interval: ServiceInterval) => {
    setSelectedInterval(interval);
    setIntervalForm({
      name: interval.name,
      intervalValue: String(interval.intervalValue),
      unit: interval.unit,
      description: interval.description || '',
    });
    setIsEditIntervalDialogOpen(true);
  };

  // Stats
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(j => j.status === 'ACTIVE').length;
  const overdueAlerts = alerts.filter(a => a.isOverdue).length;
  const thisMonthJobs = jobs.filter(j => {
    const d = new Date(j.serviceDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Service Jobs</h2>
          <p className="text-muted-foreground">Manage vehicle servicing, intervals, and alerts</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="jobs">Service Jobs</TabsTrigger>
          <TabsTrigger value="intervals">Intervals</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        {/* TAB: Service Jobs */}
        <TabsContent value="jobs" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Activity className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Jobs</p>
                    <p className="text-xl font-bold">{totalJobs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Jobs</p>
                    <p className="text-xl font-bold">{activeJobs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue Alerts</p>
                    <p className="text-xl font-bold">{overdueAlerts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Activity className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-xl font-bold">{thisMonthJobs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters + New Button */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Filter by site"
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Service Job
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Service Job</DialogTitle>
                  <DialogDescription>Job number will be auto-generated</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Service Date *</Label>
                      <Input type="date" value={jobForm.serviceDate} onChange={(e) => setJobForm({ ...jobForm, serviceDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Vehicle Number *</Label>
                      <Input value={jobForm.vehicleNumber} onChange={(e) => setJobForm({ ...jobForm, vehicleNumber: e.target.value })} placeholder="e.g. VH-001" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Site *</Label>
                      <Input value={jobForm.site} onChange={(e) => setJobForm({ ...jobForm, site: e.target.value })} placeholder="Site name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Service Interval</Label>
                      <Select value={jobForm.intervalId} onValueChange={handleIntervalSelect}>
                        <SelectTrigger><SelectValue placeholder="Select interval" /></SelectTrigger>
                        <SelectContent>
                          {intervals.map((i) => (
                            <SelectItem key={i.id} value={i.id}>{i.name} ({i.intervalValue} {i.unit})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Last Meter</Label>
                      <Input type="number" value={jobForm.lastServiceMeter} onChange={(e) => setJobForm({ ...jobForm, lastServiceMeter: e.target.value })} placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Meter *</Label>
                      <Input type="number" value={jobForm.currentServiceMeter} onChange={(e) => setJobForm({ ...jobForm, currentServiceMeter: e.target.value })} placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Next Meter</Label>
                      <Input type="number" value={String(computedNextMeter())} readOnly className="bg-muted" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Oil Quantity</Label>
                      <Input type="number" value={jobForm.oilQuantity} onChange={(e) => setJobForm({ ...jobForm, oilQuantity: e.target.value })} placeholder="Litres" />
                    </div>
                    <div className="space-y-2">
                      <Label>Filter Used</Label>
                      <Input value={jobForm.filterUsed} onChange={(e) => setJobForm({ ...jobForm, filterUsed: e.target.value })} placeholder="Filter details" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Remarks</Label>
                    <Textarea value={jobForm.remarks} onChange={(e) => setJobForm({ ...jobForm, remarks: e.target.value })} placeholder="Notes..." rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Industrial Use</Label>
                      <Input value={jobForm.industrialUse} onChange={(e) => setJobForm({ ...jobForm, industrialUse: e.target.value })} placeholder="Usage type" />
                    </div>
                    <div className="space-y-2">
                      <Label>Interval Value</Label>
                      <Input type="number" value={jobForm.serviceInterval} onChange={(e) => setJobForm({ ...jobForm, serviceInterval: e.target.value })} placeholder="Manual override" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Minimum Charge</Label>
                      <Input type="number" step="0.01" value={jobForm.minimumCharge} onChange={(e) => setJobForm({ ...jobForm, minimumCharge: e.target.value })} placeholder="0.00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Charge</Label>
                      <Input type="number" step="0.01" value={jobForm.totalCharge} onChange={(e) => setJobForm({ ...jobForm, totalCharge: e.target.value })} placeholder="0.00" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateJob} className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Job
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Jobs Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Current Meter</TableHead>
                    <TableHead>Next Meter</TableHead>
                    <TableHead>Interval</TableHead>
                    <TableHead>Oil Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No service jobs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.jobNumber}</TableCell>
                        <TableCell>{new Date(job.serviceDate).toLocaleDateString()}</TableCell>
                        <TableCell>{job.vehicleNumber}</TableCell>
                        <TableCell>{job.site}</TableCell>
                        <TableCell>{Number(job.currentServiceMeter)}</TableCell>
                        <TableCell>{Number(job.nextServiceMeter)}</TableCell>
                        <TableCell>{job.interval?.name || String(Number(job.serviceInterval))}</TableCell>
                        <TableCell>{job.oilQuantity != null ? Number(job.oilQuantity) : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_COLORS[job.status] as 'default' | 'secondary' | 'destructive' || 'default'}>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { fetchJobDetail(job.id); setIsDetailDialogOpen(true); }}>
                                <Eye className="h-4 w-4 mr-2" />View
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteJob(job)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* TAB: Intervals */}
        <TabsContent value="intervals" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Service Intervals</h3>
            <Dialog open={isIntervalDialogOpen} onOpenChange={setIsIntervalDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Interval
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Service Interval</DialogTitle>
                  <DialogDescription>Add a new service interval configuration</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={intervalForm.name} onChange={(e) => setIntervalForm({ ...intervalForm, name: e.target.value })} placeholder="e.g. 5000km Service" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Interval Value *</Label>
                      <Input type="number" value={intervalForm.intervalValue} onChange={(e) => setIntervalForm({ ...intervalForm, intervalValue: e.target.value })} placeholder="5000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit *</Label>
                      <Select value={intervalForm.unit} onValueChange={(v) => setIntervalForm({ ...intervalForm, unit: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KM">KM</SelectItem>
                          <SelectItem value="HOURS">HOURS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={intervalForm.description} onChange={(e) => setIntervalForm({ ...intervalForm, description: e.target.value })} placeholder="Optional description" rows={2} />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsIntervalDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateInterval} className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                      {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Interval Value</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {intervals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No intervals configured</TableCell>
                  </TableRow>
                ) : (
                  intervals.map((interval) => (
                    <TableRow key={interval.id}>
                      <TableCell className="font-medium">{interval.name}</TableCell>
                      <TableCell>{Number(interval.intervalValue)}</TableCell>
                      <TableCell><Badge variant="secondary">{interval.unit}</Badge></TableCell>
                      <TableCell>{interval.description || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditInterval(interval)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteInterval(interval)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Edit Interval Dialog */}
          <Dialog open={isEditIntervalDialogOpen} onOpenChange={setIsEditIntervalDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Interval</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={intervalForm.name} onChange={(e) => setIntervalForm({ ...intervalForm, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Interval Value *</Label>
                    <Input type="number" value={intervalForm.intervalValue} onChange={(e) => setIntervalForm({ ...intervalForm, intervalValue: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit *</Label>
                    <Select value={intervalForm.unit} onValueChange={(v) => setIntervalForm({ ...intervalForm, unit: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KM">KM</SelectItem>
                        <SelectItem value="HOURS">HOURS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={intervalForm.description} onChange={(e) => setIntervalForm({ ...intervalForm, description: e.target.value })} rows={2} />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditIntervalDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpdateInterval} className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* TAB: History */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="space-y-2 flex-1 max-w-sm">
              <Label>Vehicle Number</Label>
              <Input
                value={historyVehicle}
                onChange={(e) => setHistoryVehicle(e.target.value)}
                placeholder="Enter vehicle number to search history"
              />
            </div>
            <Button onClick={() => fetchHistory(historyVehicle)} disabled={!historyVehicle}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {history.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Job Number</TableHead>
                    <TableHead>Last Meter</TableHead>
                    <TableHead>Current Meter</TableHead>
                    <TableHead>Next Meter</TableHead>
                    <TableHead>Interval</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{new Date(job.serviceDate).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{job.jobNumber}</TableCell>
                      <TableCell>{Number(job.lastServiceMeter)}</TableCell>
                      <TableCell>{Number(job.currentServiceMeter)}</TableCell>
                      <TableCell>{Number(job.nextServiceMeter)}</TableCell>
                      <TableCell>{job.interval?.name || String(Number(job.serviceInterval))}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[job.status] as 'default' | 'secondary' | 'destructive' || 'default'}>
                          {job.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {historyVehicle ? 'No service history found for this vehicle' : 'Enter a vehicle number to view service history'}
            </div>
          )}
        </TabsContent>

        {/* TAB: Alerts */}
        <TabsContent value="alerts" className="space-y-4">
          <h3 className="text-lg font-semibold">Overdue Service Alerts</h3>
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No overdue services
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Last Service Date</TableHead>
                    <TableHead>Next Service Meter</TableHead>
                    <TableHead>Days Since Service</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.vehicleNumber}</TableCell>
                      <TableCell>{alert.site}</TableCell>
                      <TableCell>{new Date(alert.serviceDate).toLocaleDateString()}</TableCell>
                      <TableCell>{Number(alert.nextServiceMeter)}</TableCell>
                      <TableCell>{alert.daysSinceService}</TableCell>
                      <TableCell>
                        <Badge variant={alert.isOverdue ? 'destructive' : 'default'}>
                          {alert.isOverdue ? 'Overdue' : 'Active'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Service Job: {selectedJob?.jobNumber}</DialogTitle>
            <DialogDescription>View service job details, man hours, and consumables</DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-6 mt-4">
              {/* Job Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date(selectedJob.serviceDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vehicle</p>
                  <p className="font-medium">{selectedJob.vehicleNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Site</p>
                  <p className="font-medium">{selectedJob.site}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Meter</p>
                  <p className="font-medium">{Number(selectedJob.lastServiceMeter)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Meter</p>
                  <p className="font-medium">{Number(selectedJob.currentServiceMeter)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Next Meter</p>
                  <p className="font-medium">{Number(selectedJob.nextServiceMeter)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Interval</p>
                  <p className="font-medium">{selectedJob.interval?.name || String(Number(selectedJob.serviceInterval))}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Oil Quantity</p>
                  <p className="font-medium">{selectedJob.oilQuantity != null ? Number(selectedJob.oilQuantity) : '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Filter Used</p>
                  <p className="font-medium">{selectedJob.filterUsed || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Industrial Use</p>
                  <p className="font-medium">{selectedJob.industrialUse || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Minimum Charge</p>
                  <p className="font-medium">{selectedJob.minimumCharge != null ? Number(selectedJob.minimumCharge) : '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Charge</p>
                  <p className="font-medium">{selectedJob.totalCharge != null ? Number(selectedJob.totalCharge) : '-'}</p>
                </div>
              </div>
              {selectedJob.remarks && (
                <div>
                  <p className="text-sm text-muted-foreground">Remarks</p>
                  <p className="text-sm">{selectedJob.remarks}</p>
                </div>
              )}

              {/* Man Hours Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Man Hours</h4>
                  <Button size="sm" variant="outline" onClick={() => setIsManHourDialogOpen(true)}>
                    <Plus className="h-3 w-3 mr-1" />Add
                  </Button>
                </div>
                {selectedJob.manHours && selectedJob.manHours.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Technician</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedJob.manHours.map((mh) => (
                        <TableRow key={mh.id}>
                          <TableCell>{mh.technicianName}</TableCell>
                          <TableCell>{Number(mh.hoursWorked)}</TableCell>
                          <TableCell>{mh.hourlyRate != null ? Number(mh.hourlyRate) : '-'}</TableCell>
                          <TableCell>{mh.totalCost != null ? Number(mh.totalCost) : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No man hours recorded</p>
                )}
              </div>

              {/* Consumables Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Consumables</h4>
                  <Button size="sm" variant="outline" onClick={() => setIsConsumableDialogOpen(true)}>
                    <Plus className="h-3 w-3 mr-1" />Add
                  </Button>
                </div>
                {selectedJob.consumables && selectedJob.consumables.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedJob.consumables.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.itemName}</TableCell>
                          <TableCell>{Number(c.quantity)}</TableCell>
                          <TableCell>{c.unitCost != null ? Number(c.unitCost) : '-'}</TableCell>
                          <TableCell>{c.totalCost != null ? Number(c.totalCost) : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No consumables recorded</p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => handleDeleteJob(selectedJob)} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />Delete
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Man Hour Dialog */}
      <Dialog open={isManHourDialogOpen} onOpenChange={setIsManHourDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Man Hours</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Technician Name *</Label>
              <Input value={manHourForm.technicianName} onChange={(e) => setManHourForm({ ...manHourForm, technicianName: e.target.value })} placeholder="Name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Hours Worked *</Label>
                <Input type="number" step="0.5" value={manHourForm.hoursWorked} onChange={(e) => setManHourForm({ ...manHourForm, hoursWorked: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Hourly Rate</Label>
                <Input type="number" step="0.01" value={manHourForm.hourlyRate} onChange={(e) => setManHourForm({ ...manHourForm, hourlyRate: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={manHourForm.notes} onChange={(e) => setManHourForm({ ...manHourForm, notes: e.target.value })} rows={2} placeholder="Optional notes" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsManHourDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddManHour} className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Consumable Dialog */}
      <Dialog open={isConsumableDialogOpen} onOpenChange={setIsConsumableDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Consumable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Item Name *</Label>
              <Input value={consumableForm.itemName} onChange={(e) => setConsumableForm({ ...consumableForm, itemName: e.target.value })} placeholder="Item name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input type="number" value={consumableForm.quantity} onChange={(e) => setConsumableForm({ ...consumableForm, quantity: e.target.value })} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Unit Cost</Label>
                <Input type="number" step="0.01" value={consumableForm.unitCost} onChange={(e) => setConsumableForm({ ...consumableForm, unitCost: e.target.value })} placeholder="0.00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={consumableForm.notes} onChange={(e) => setConsumableForm({ ...consumableForm, notes: e.target.value })} rows={2} placeholder="Optional notes" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConsumableDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddConsumable} className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
