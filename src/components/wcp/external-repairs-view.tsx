'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Progress } from '@/components/ui/progress';
import { 
  ExternalLink, Plus, Search, Loader2, Building2, DollarSign, 
  Calendar, FileText, CheckCircle, XCircle, Clock, Wrench,
  MoreHorizontal, Eye, Edit, Trash2, Send, Receipt, AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/hooks';

// Types
interface ExternalJob {
  id: string;
  jobNumber: string;
  jobCardId: string | null;
  jobCard?: { id: string; jobCardNumber: string; status: string };
  assetId: string | null;
  asset?: { id: string; assetNumber: string; name: string };
  subcontractorId: string | null;
  subcontractor?: { id: string; code: string; name: string; rating: number | null };
  jobType: string;
  description: string;
  status: string;
  estimatedCost: number | null;
  actualCost: number | null;
  startDate: string | null;
  endDate: string | null;
  completedAt: string | null;
  invoiceRef: string | null;
  warrantyExpiry: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  quotations?: ExternalQuotation[];
  costs?: ExtJobCost[];
}

interface ExternalQuotation {
  id: string;
  externalJobId: string;
  quotationNumber: string | null;
  amount: number;
  currency: string;
  validUntil: string | null;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface ExtJobCost {
  id: string;
  externalJobId: string;
  costType: string;
  description: string;
  amount: number;
  invoiceRef: string | null;
  costDate: string;
  notes: string | null;
}

interface Subcontractor {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  specialization: string | null;
  status: string;
  rating: number | null;
  notes: string | null;
}

interface Asset {
  id: string;
  assetNumber: string;
  name: string;
}

interface JobCard {
  id: string;
  jobCardNumber: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  QUOTATION_PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-cyan-100 text-cyan-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  INVOICED: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const JOB_TYPES: Record<string, string> = {
  REPAIR: 'Repair',
  OVERHAUL: 'Overhaul',
  FABRICATION: 'Fabrication',
  INSPECTION: 'Inspection',
  CALIBRATION: 'Calibration',
  PAINTING: 'Painting',
  OTHER: 'Other',
};

const COST_TYPES: Record<string, string> = {
  LABOUR: 'Labour',
  MATERIALS: 'Materials',
  TRANSPORT: 'Transport',
  EQUIPMENT: 'Equipment',
  OVERHEAD: 'Overhead',
  OTHER: 'Other',
};

const STATUS_TRANSITIONS: Record<string, Array<{ action: string; label: string; status: string }>> = {
  'DRAFT': [
    { action: 'send_quotation', label: 'Request Quotation', status: 'QUOTATION_PENDING' },
    { action: 'approve', label: 'Approve Directly', status: 'APPROVED' },
    { action: 'cancel', label: 'Cancel', status: 'CANCELLED' },
  ],
  'QUOTATION_PENDING': [
    { action: 'approve', label: 'Approve Quotation', status: 'APPROVED' },
    { action: 'reject', label: 'Reject', status: 'DRAFT' },
  ],
  'APPROVED': [
    { action: 'start', label: 'Start Work', status: 'IN_PROGRESS' },
    { action: 'cancel', label: 'Cancel', status: 'CANCELLED' },
  ],
  'IN_PROGRESS': [
    { action: 'complete', label: 'Complete', status: 'COMPLETED' },
  ],
  'COMPLETED': [
    { action: 'invoice', label: 'Mark Invoiced', status: 'INVOICED' },
  ],
};

export function ExternalRepairsView() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('jobs');
  
  // Data states
  const [jobs, setJobs] = useState<ExternalJob[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Search and filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [subcontractorFilter, setSubcontractorFilter] = useState('all');
  
  // Dialog states
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [isSubcontractorDialogOpen, setIsSubcontractorDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isQuotationDialogOpen, setIsQuotationDialogOpen] = useState(false);
  const [isCostDialogOpen, setIsCostDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ExternalJob | null>(null);
  
  // Form states
  const [jobForm, setJobForm] = useState({
    subcontractorId: '',
    jobCardId: 'none',
    assetId: 'none',
    jobType: 'REPAIR',
    description: '',
    estimatedCost: '',
    startDate: '',
    endDate: '',
    notes: '',
  });
  
  const [subcontractorForm, setSubcontractorForm] = useState({
    code: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    specialization: '',
    notes: '',
  });
  
  const [quotationForm, setQuotationForm] = useState({
    quotationNumber: '',
    amount: '',
    currency: 'USD',
    validUntil: '',
    notes: '',
  });
  
  const [costForm, setCostForm] = useState({
    costType: 'LABOUR',
    description: '',
    amount: '',
    invoiceRef: '',
    costDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchJobs();
    fetchSubcontractors();
    fetchAssets();
    fetchJobCards();
  }, [search, statusFilter, typeFilter, subcontractorFilter]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '50' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('jobType', typeFilter);
      if (subcontractorFilter) params.set('subcontractorId', subcontractorFilter);
      
      const res = await fetch(`/api/external-jobs?${params}`);
      const data = await res.json();
      if (data.success) {
        setJobs(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcontractors = async () => {
    try {
      const res = await fetch('/api/subcontractors?limit=100');
      const data = await res.json();
      if (data.success) {
        setSubcontractors(data.data.filter((s: Subcontractor) => s.status === 'ACTIVE'));
      }
    } catch (error) {
      console.error('Failed to fetch subcontractors:', error);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets?limit=100');
      const data = await res.json();
      if (data.success) setAssets(data.data);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  };

  const fetchJobCards = async () => {
    try {
      const res = await fetch('/api/job-cards?limit=100');
      const data = await res.json();
      if (data.success) setJobCards(data.data);
    } catch (error) {
      console.error('Failed to fetch job cards:', error);
    }
  };

  // Job CRUD
  const handleCreateJob = async () => {
    if (!jobForm.description) {
      toast({ title: 'Validation Error', description: 'Description is required', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/external-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subcontractorId: jobForm.subcontractorId || undefined,
          jobCardId: jobForm.jobCardId || undefined,
          assetId: jobForm.assetId || undefined,
          jobType: jobForm.jobType,
          description: jobForm.description,
          estimatedCost: jobForm.estimatedCost ? parseFloat(jobForm.estimatedCost) : undefined,
          startDate: jobForm.startDate || undefined,
          endDate: jobForm.endDate || undefined,
          notes: jobForm.notes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'External job created successfully' });
        setIsJobDialogOpen(false);
        setJobForm({
          subcontractorId: '', jobCardId: '', assetId: '', jobType: 'REPAIR',
          description: '', estimatedCost: '', startDate: '', endDate: '', notes: '',
        });
        fetchJobs();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create job', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Create job error:', error);
      toast({ title: 'Error', description: 'Failed to create external job', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusTransition = async (job: ExternalJob, newStatus: string) => {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/external-jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: `Job status updated to ${newStatus}` });
        setIsDetailDialogOpen(false);
        fetchJobs();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update status', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Update status error:', error);
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteJob = async (job: ExternalJob) => {
    if (!confirm(`Are you sure you want to delete job ${job.jobNumber}?`)) return;

    try {
      const res = await fetch(`/api/external-jobs/${job.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Job deleted successfully' });
        setIsDetailDialogOpen(false);
        fetchJobs();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete job', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Delete job error:', error);
      toast({ title: 'Error', description: 'Failed to delete job', variant: 'destructive' });
    }
  };

  // Subcontractor CRUD
  const handleCreateSubcontractor = async () => {
    if (!subcontractorForm.code || !subcontractorForm.name) {
      toast({ title: 'Validation Error', description: 'Code and name are required', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/subcontractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subcontractorForm),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Subcontractor created successfully' });
        setIsSubcontractorDialogOpen(false);
        setSubcontractorForm({
          code: '', name: '', contactPerson: '', phone: '', email: '',
          address: '', specialization: '', notes: '',
        });
        fetchSubcontractors();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create subcontractor', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Create subcontractor error:', error);
      toast({ title: 'Error', description: 'Failed to create subcontractor', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Quotation
  const handleAddQuotation = async () => {
    if (!selectedJob || !quotationForm.amount) {
      toast({ title: 'Validation Error', description: 'Amount is required', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/external-jobs/${selectedJob.id}/quotation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationNumber: quotationForm.quotationNumber || undefined,
          amount: parseFloat(quotationForm.amount),
          currency: quotationForm.currency,
          validUntil: quotationForm.validUntil || undefined,
          notes: quotationForm.notes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Quotation added successfully' });
        setIsQuotationDialogOpen(false);
        setQuotationForm({ quotationNumber: '', amount: '', currency: 'USD', validUntil: '', notes: '' });
        fetchJobs();
        // Refresh selected job
        const jobRes = await fetch(`/api/external-jobs/${selectedJob.id}`);
        const jobData = await jobRes.json();
        if (jobData.success) setSelectedJob(jobData.data);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to add quotation', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Add quotation error:', error);
      toast({ title: 'Error', description: 'Failed to add quotation', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveQuotation = async (quotationId: string, approve: boolean) => {
    if (!selectedJob) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/external-jobs/${selectedJob.id}/quotation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId,
          action: approve ? 'approve' : 'reject',
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: `Quotation ${approve ? 'approved' : 'rejected'}` });
        fetchJobs();
        // Refresh selected job
        const jobRes = await fetch(`/api/external-jobs/${selectedJob.id}`);
        const jobData = await jobRes.json();
        if (jobData.success) setSelectedJob(jobData.data);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update quotation', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Update quotation error:', error);
      toast({ title: 'Error', description: 'Failed to update quotation', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Cost
  const handleAddCost = async () => {
    if (!selectedJob || !costForm.description || !costForm.amount) {
      toast({ title: 'Validation Error', description: 'Description and amount are required', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/external-jobs/${selectedJob.id}/costs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          costType: costForm.costType,
          description: costForm.description,
          amount: parseFloat(costForm.amount),
          invoiceRef: costForm.invoiceRef || undefined,
          costDate: costForm.costDate,
          notes: costForm.notes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Cost added successfully' });
        setIsCostDialogOpen(false);
        setCostForm({
          costType: 'LABOUR', description: '', amount: '', invoiceRef: '',
          costDate: new Date().toISOString().split('T')[0], notes: '',
        });
        fetchJobs();
        // Refresh selected job
        const jobRes = await fetch(`/api/external-jobs/${selectedJob.id}`);
        const jobData = await jobRes.json();
        if (jobData.success) setSelectedJob(jobData.data);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to add cost', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Add cost error:', error);
      toast({ title: 'Error', description: 'Failed to add cost', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Stats
  const totalJobs = jobs.length;
  const pendingJobs = jobs.filter(j => ['DRAFT', 'QUOTATION_PENDING', 'APPROVED'].includes(j.status)).length;
  const inProgressJobs = jobs.filter(j => j.status === 'IN_PROGRESS').length;
  const totalEstimated = jobs.reduce((sum, j) => sum + (j.estimatedCost || 0), 0);
  const totalActual = jobs.reduce((sum, j) => sum + (j.actualCost || 0), 0);
  const activeSubcontractors = subcontractors.filter(s => s.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">External Repairs</h2>
          <p className="text-slate-500">Manage subcontractor repairs and external job costing</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSubcontractorDialogOpen} onOpenChange={setIsSubcontractorDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Building2 className="h-4 w-4 mr-2" />
                Add Subcontractor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Subcontractor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Code *</Label>
                    <Input 
                      value={subcontractorForm.code}
                      onChange={(e) => setSubcontractorForm({ ...subcontractorForm, code: e.target.value })}
                      placeholder="SUB-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input 
                      value={subcontractorForm.name}
                      onChange={(e) => setSubcontractorForm({ ...subcontractorForm, name: e.target.value })}
                      placeholder="ABC Engineering"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Contact Person</Label>
                    <Input 
                      value={subcontractorForm.contactPerson}
                      onChange={(e) => setSubcontractorForm({ ...subcontractorForm, contactPerson: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input 
                      value={subcontractorForm.phone}
                      onChange={(e) => setSubcontractorForm({ ...subcontractorForm, phone: e.target.value })}
                      placeholder="+1 234 567 890"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={subcontractorForm.email}
                    onChange={(e) => setSubcontractorForm({ ...subcontractorForm, email: e.target.value })}
                    placeholder="contact@abc-engineering.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea 
                    value={subcontractorForm.address}
                    onChange={(e) => setSubcontractorForm({ ...subcontractorForm, address: e.target.value })}
                    placeholder="Street, City, Country"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Specialization</Label>
                  <Input 
                    value={subcontractorForm.specialization}
                    onChange={(e) => setSubcontractorForm({ ...subcontractorForm, specialization: e.target.value })}
                    placeholder="Engine Repairs, Hydraulics, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea 
                    value={subcontractorForm.notes}
                    onChange={(e) => setSubcontractorForm({ ...subcontractorForm, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsSubcontractorDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateSubcontractor} className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Subcontractor
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                New External Job
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create External Job</DialogTitle>
                <DialogDescription>Create a new external repair job for subcontractor</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Subcontractor</Label>
                    <Select value={jobForm.subcontractorId} onValueChange={(v) => setJobForm({ ...jobForm, subcontractorId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select subcontractor" /></SelectTrigger>
                      <SelectContent>
                        {subcontractors.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.code} - {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Job Type</Label>
                    <Select value={jobForm.jobType} onValueChange={(v) => setJobForm({ ...jobForm, jobType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(JOB_TYPES).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Related Job Card</Label>
                    <Select value={jobForm.jobCardId} onValueChange={(v) => setJobForm({ ...jobForm, jobCardId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select job card" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {jobCards.map((jc) => (
                          <SelectItem key={jc.id} value={jc.id}>{jc.jobCardNumber}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Asset</Label>
                    <Select value={jobForm.assetId} onValueChange={(v) => setJobForm({ ...jobForm, assetId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {assets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.assetNumber} - {asset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea 
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    placeholder="Describe the work to be performed..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Estimated Cost</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={jobForm.estimatedCost}
                      onChange={(e) => setJobForm({ ...jobForm, estimatedCost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input 
                      type="date"
                      value={jobForm.startDate}
                      onChange={(e) => setJobForm({ ...jobForm, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input 
                      type="date"
                      value={jobForm.endDate}
                      onChange={(e) => setJobForm({ ...jobForm, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea 
                    value={jobForm.notes}
                    onChange={(e) => setJobForm({ ...jobForm, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsJobDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateJob} className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Job
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <ExternalLink className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Jobs</p>
                <p className="text-xl font-bold">{totalJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-xl font-bold">{pendingJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Wrench className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">In Progress</p>
                <p className="text-xl font-bold">{inProgressJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Value</p>
                <p className="text-xl font-bold">LKR {totalActual.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Subcontractors</p>
                <p className="text-xl font-bold">{activeSubcontractors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />External Jobs
          </TabsTrigger>
          <TabsTrigger value="subcontractors" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />Subcontractors
          </TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search jobs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.keys(STATUS_COLORS).map((status) => (
                      <SelectItem key={status} value={status}>{status.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(JOB_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={subcontractorFilter} onValueChange={setSubcontractorFilter}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="All Subcontractors" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subcontractors</SelectItem>
                    {subcontractors.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Jobs Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ExternalLink className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No external jobs found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job #</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Subcontractor</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Estimated</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-medium">{job.jobNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{JOB_TYPES[job.jobType] || job.jobType}</Badge>
                          </TableCell>
                          <TableCell>
                            {job.subcontractor ? (
                              <div>
                                <div className="font-medium">{job.subcontractor.name}</div>
                                <div className="text-xs text-slate-500">{job.subcontractor.code}</div>
                              </div>
                            ) : <span className="text-slate-400">-</span>}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{job.description}</TableCell>
                          <TableCell>
                            {job.estimatedCost ? `LKR ${job.estimatedCost.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell>
                            {job.actualCost ? `LKR ${job.actualCost.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[job.status] || ''}>
                              {job.status.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={async () => {
                                  const res = await fetch(`/api/external-jobs/${job.id}`);
                                  const data = await res.json();
                                  if (data.success) {
                                    setSelectedJob(data.data);
                                    setIsDetailDialogOpen(true);
                                  }
                                }}>
                                  <Eye className="h-4 w-4 mr-2" />View Details
                                </DropdownMenuItem>
                                {STATUS_TRANSITIONS[job.status]?.map((t) => (
                                  <DropdownMenuItem key={t.action} onClick={() => handleStatusTransition(job, t.status)}>
                                    {t.action === 'approve' && <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />}
                                    {t.action === 'cancel' && <XCircle className="h-4 w-4 mr-2 text-red-600" />}
                                    {t.action === 'start' && <Wrench className="h-4 w-4 mr-2 text-cyan-600" />}
                                    {t.action === 'complete' && <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />}
                                    {t.action === 'invoice' && <Receipt className="h-4 w-4 mr-2 text-purple-600" />}
                                    {t.action === 'send_quotation' && <Send className="h-4 w-4 mr-2 text-amber-600" />}
                                    {!['approve', 'cancel', 'start', 'complete', 'invoice', 'send_quotation'].includes(t.action) && <ExternalLink className="h-4 w-4 mr-2" />}
                                    {t.label}
                                  </DropdownMenuItem>
                                ))}
                                {['DRAFT', 'CANCELLED'].includes(job.status) && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDeleteJob(job)} className="text-red-600">
                                      <Trash2 className="h-4 w-4 mr-2" />Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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

        {/* Subcontractors Tab */}
        <TabsContent value="subcontractors" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {subcontractors.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No subcontractors found. Add your first subcontractor.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Specialization</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subcontractors.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.code}</TableCell>
                          <TableCell>{sub.name}</TableCell>
                          <TableCell>{sub.contactPerson || '-'}</TableCell>
                          <TableCell>{sub.phone || '-'}</TableCell>
                          <TableCell>{sub.specialization || '-'}</TableCell>
                          <TableCell>
                            {sub.rating ? (
                              <div className="flex items-center gap-1">
                                {sub.rating.toFixed(1)}
                                <span className="text-amber-500">★</span>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={sub.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                              {sub.status}
                            </Badge>
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
      </Tabs>

      {/* Job Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              External Job: {selectedJob?.jobNumber}
              {selectedJob && (
                <Badge className={STATUS_COLORS[selectedJob.status] || ''}>
                  {selectedJob.status.replace(/_/g, ' ')}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4 mt-4 overflow-y-auto flex-1">
              {/* Job Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Type</p>
                  <p className="font-medium">{JOB_TYPES[selectedJob.jobType] || selectedJob.jobType}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Subcontractor</p>
                  <p className="font-medium">{selectedJob.subcontractor?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Estimated Cost</p>
                  <p className="font-medium">LKR {selectedJob.estimatedCost?.toFixed(2) || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Actual Cost</p>
                  <p className="font-medium">LKR {selectedJob.actualCost?.toFixed(2) || '-'}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-slate-500">Description</p>
                <p className="font-medium">{selectedJob.description}</p>
              </div>

              {/* Cost Progress */}
              {selectedJob.estimatedCost && selectedJob.actualCost && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Cost Progress</span>
                    <span className={selectedJob.actualCost > selectedJob.estimatedCost ? 'text-red-600' : 'text-emerald-600'}>
                      {((selectedJob.actualCost / selectedJob.estimatedCost) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, (selectedJob.actualCost / selectedJob.estimatedCost) * 100)} 
                    className={selectedJob.actualCost > selectedJob.estimatedCost ? 'bg-red-200' : ''}
                  />
                  {selectedJob.actualCost > selectedJob.estimatedCost && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Over budget by LKR {(selectedJob.actualCost - selectedJob.estimatedCost).toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {/* Quotations */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Quotations</h4>
                  {['DRAFT', 'QUOTATION_PENDING'].includes(selectedJob.status) && (
                    <Button size="sm" variant="outline" onClick={() => setIsQuotationDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />Add Quotation
                    </Button>
                  )}
                </div>
                {selectedJob.quotations && selectedJob.quotations.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Number</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedJob.quotations.map((q) => (
                        <TableRow key={q.id}>
                          <TableCell>{q.quotationNumber || '-'}</TableCell>
                          <TableCell>LKR {q.amount.toFixed(2)} {q.currency}</TableCell>
                          <TableCell>{q.validUntil ? new Date(q.validUntil).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>
                            <Badge className={q.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : q.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                              {q.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {q.status === 'PENDING' && selectedJob.status === 'QUOTATION_PENDING' && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => handleApproveQuotation(q.id, true)}>
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleApproveQuotation(q.id, false)}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-slate-500">No quotations yet</p>
                )}
              </div>

              {/* Costs */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Cost Breakdown</h4>
                  {['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(selectedJob.status) && (
                    <Button size="sm" variant="outline" onClick={() => setIsCostDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />Add Cost
                    </Button>
                  )}
                </div>
                {selectedJob.costs && selectedJob.costs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedJob.costs.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell><Badge variant="outline">{COST_TYPES[c.costType] || c.costType}</Badge></TableCell>
                          <TableCell>{c.description}</TableCell>
                          <TableCell>LKR {c.amount.toFixed(2)}</TableCell>
                          <TableCell>{new Date(c.costDate).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-slate-500">No costs recorded yet</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quotation Dialog */}
      <Dialog open={isQuotationDialogOpen} onOpenChange={setIsQuotationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Quotation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quotation Number</Label>
                <Input 
                  value={quotationForm.quotationNumber}
                  onChange={(e) => setQuotationForm({ ...quotationForm, quotationNumber: e.target.value })}
                  placeholder="QT-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={quotationForm.currency} onValueChange={(v) => setQuotationForm({ ...quotationForm, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="KES">KES</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input 
                type="number"
                step="0.01"
                value={quotationForm.amount}
                onChange={(e) => setQuotationForm({ ...quotationForm, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Valid Until</Label>
              <Input 
                type="date"
                value={quotationForm.validUntil}
                onChange={(e) => setQuotationForm({ ...quotationForm, validUntil: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                value={quotationForm.notes}
                onChange={(e) => setQuotationForm({ ...quotationForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsQuotationDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddQuotation} className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Quotation
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cost Dialog */}
      <Dialog open={isCostDialogOpen} onOpenChange={setIsCostDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Cost Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cost Type</Label>
                <Select value={costForm.costType} onValueChange={(v) => setCostForm({ ...costForm, costType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(COST_TYPES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={costForm.amount}
                  onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input 
                value={costForm.description}
                onChange={(e) => setCostForm({ ...costForm, description: e.target.value })}
                placeholder="Cost description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date"
                  value={costForm.costDate}
                  onChange={(e) => setCostForm({ ...costForm, costDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Invoice Ref</Label>
                <Input 
                  value={costForm.invoiceRef}
                  onChange={(e) => setCostForm({ ...costForm, invoiceRef: e.target.value })}
                  placeholder="INV-001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                value={costForm.notes}
                onChange={(e) => setCostForm({ ...costForm, notes: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCostDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddCost} className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Cost
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
