'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Wrench, 
  Search, 
  Plus, 
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  Download,
  X,
  CheckSquare,
  ArrowRight,
  Users,
  AlertTriangle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ExportButton } from '@/components/wcp/export-button';

interface JobCard {
  id: string;
  jobCardNumber: string;
  assetId: string;
  asset?: {
    id: string;
    assetNumber: string;
    name: string;
  };
  jobType: string;
  priority: string;
  status: string;
  faultDescription: string;
  diagnosisNotes?: string;
  workPerformed?: string;
  estimatedCost?: number;
  actualCost?: number;
  estimatedDuration?: number;
  actualDuration?: number;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  createdAt: string;
  creator?: {
    name: string;
  };
  technicians?: Array<{
    id: string;
    name: string;
  }>;
  taskCount?: number;
  materialRequestCount?: number;
}

interface Asset {
  id: string;
  assetNumber: string;
  name: string;
}

interface Technician {
  id: string;
  name: string;
  employeeId?: string;
}

interface PaginatedResponse {
  data: JobCard[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const statusColors: Record<string, string> = {
  'DRAFT': 'bg-slate-100 text-slate-700',
  'APPROVED': 'bg-blue-100 text-blue-700',
  'IN_PROGRESS': 'bg-purple-100 text-purple-700',
  'COMPLETED': 'bg-emerald-100 text-emerald-700',
  'CLOSED': 'bg-slate-100 text-slate-500',
  'CANCELLED': 'bg-red-100 text-red-700',
  'ON_HOLD': 'bg-amber-100 text-amber-700',
};

const priorityColors: Record<string, string> = {
  'CRITICAL': 'bg-red-100 text-red-700 border-red-200',
  'EMERGENCY': 'bg-red-200 text-red-800 border-red-300',
  'HIGH': 'bg-amber-100 text-amber-700 border-amber-200',
  'NORMAL': 'bg-blue-100 text-blue-700 border-blue-200',
  'LOW': 'bg-slate-100 text-slate-700 border-slate-200',
};

const jobTypeColors: Record<string, string> = {
  'CORRECTIVE': 'text-red-600',
  'PREVENTIVE': 'text-emerald-600',
  'INSPECTION': 'text-purple-600',
  'EMERGENCY': 'text-orange-600',
  'MODIFICATION': 'text-blue-600',
};

const validTransitions: Record<string, Array<{ action: string; label: string; newStatus: string }>> = {
  'DRAFT': [
    { action: 'SUBMIT', label: 'Submit for Approval', newStatus: 'APPROVED' },
    { action: 'CANCEL', label: 'Cancel', newStatus: 'CANCELLED' },
  ],
  'APPROVED': [
    { action: 'START', label: 'Start Work', newStatus: 'IN_PROGRESS' },
    { action: 'CANCEL', label: 'Cancel', newStatus: 'CANCELLED' },
  ],
  'IN_PROGRESS': [
    { action: 'COMPLETE', label: 'Complete', newStatus: 'COMPLETED' },
    { action: 'HOLD', label: 'Put on Hold', newStatus: 'ON_HOLD' },
  ],
  'ON_HOLD': [
    { action: 'RESUME', label: 'Resume', newStatus: 'IN_PROGRESS' },
    { action: 'CANCEL', label: 'Cancel', newStatus: 'CANCELLED' },
  ],
  'COMPLETED': [
    { action: 'CLOSE', label: 'Close Job Card', newStatus: 'CLOSED' },
  ],
  'CLOSED': [
    { action: 'REOPEN', label: 'Reopen', newStatus: 'APPROVED' },
  ],
  'CANCELLED': [],
};

// Valid bulk status transitions
const bulkStatusOptions = [
  { status: 'APPROVED', label: 'Approve', description: 'Approve selected job cards' },
  { status: 'IN_PROGRESS', label: 'Start Work', description: 'Start work on selected job cards' },
  { status: 'ON_HOLD', label: 'Put on Hold', description: 'Put selected job cards on hold' },
  { status: 'COMPLETED', label: 'Complete', description: 'Mark selected job cards as completed' },
  { status: 'CANCELLED', label: 'Cancel', description: 'Cancel selected job cards' },
  { status: 'CLOSED', label: 'Close', description: 'Close selected job cards' },
];

export function JobCardsView() {
  const { toast } = useToast();
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [transitionDialog, setTransitionDialog] = useState<{ open: boolean; action: string; jobCard: JobCard | null }>({
    open: false,
    action: '',
    jobCard: null,
  });
  const [transitionNotes, setTransitionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    id: string;
    faultDescription: string;
    diagnosisNotes: string;
    estimatedCost: string;
    estimatedDuration: string;
    scheduledStart: string;
    scheduledEnd: string;
    priority: string;
    jobType: string;
  } | null>(null);

  // Bulk operation state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'CHANGE_STATUS' | 'ASSIGN_TECHNICIAN' | 'CANCEL' | 'DELETE' | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkTechnicianId, setBulkTechnicianId] = useState<string>('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    assetId: '',
    jobType: 'CORRECTIVE' as const,
    priority: 'NORMAL' as const,
    faultDescription: '',
    diagnosisNotes: '',
    estimatedCost: '',
    estimatedDuration: '',
    scheduledStart: '',
    scheduledEnd: '',
  });

  useEffect(() => {
    fetchJobCards();
    fetchAssets();
    fetchTechnicians();
  }, [searchTerm, statusFilter, priorityFilter, pagination.page]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchTerm, statusFilter, priorityFilter, pagination.page]);

  const fetchJobCards = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await fetch(`/api/job-cards?${params.toString()}`);
      if (response.ok) {
        const data: PaginatedResponse = await response.json();
        setJobCards(data.data || []);
        setPagination(prev => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error('Failed to fetch job cards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load job cards',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets?limit=100');
      if (response.ok) {
        const data = await response.json();
        setAssets(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await fetch('/api/users?role=TECHNICIAN&limit=100');
      if (response.ok) {
        const data = await response.json();
        setTechnicians(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch technicians:', error);
    }
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(jobCards.map(jc => jc.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk operation handlers
  const handleBulkAction = async () => {
    if (selectedIds.size === 0) return;

    try {
      setSubmitting(true);
      const jobCardIds = Array.from(selectedIds);

      let requestBody: Record<string, unknown> = { jobCardIds };

      switch (bulkAction) {
        case 'CHANGE_STATUS':
          requestBody = { ...requestBody, action: 'CHANGE_STATUS', newStatus: bulkStatus, notes: bulkNotes };
          break;
        case 'ASSIGN_TECHNICIAN':
          requestBody = { ...requestBody, action: 'ASSIGN_TECHNICIAN', technicianId: bulkTechnicianId };
          break;
        case 'CANCEL':
          requestBody = { ...requestBody, action: 'CANCEL', reason: bulkReason };
          break;
        case 'DELETE':
          requestBody = { ...requestBody, action: 'DELETE', reason: bulkReason };
          break;
      }

      const response = await fetch('/api/job-cards/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Success',
          description: result.message || 'Bulk operation completed successfully',
        });
        clearSelection();
        fetchJobCards();
        setBulkDialogOpen(false);
        resetBulkForm();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to perform bulk operation',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Bulk operation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform bulk operation',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetBulkForm = () => {
    setBulkAction(null);
    setBulkStatus('');
    setBulkTechnicianId('');
    setBulkReason('');
    setBulkNotes('');
  };

  const openBulkDialog = (action: 'CHANGE_STATUS' | 'ASSIGN_TECHNICIAN' | 'CANCEL' | 'DELETE') => {
    setBulkAction(action);
    setBulkDialogOpen(true);
  };

  const getBulkDialogTitle = () => {
    switch (bulkAction) {
      case 'CHANGE_STATUS': return 'Bulk Status Change';
      case 'ASSIGN_TECHNICIAN': return 'Bulk Assign Technician';
      case 'CANCEL': return 'Bulk Cancel Job Cards';
      case 'DELETE': return 'Bulk Delete Job Cards';
      default: return 'Bulk Operation';
    }
  };

  const getBulkDialogDescription = () => {
    const count = selectedIds.size;
    switch (bulkAction) {
      case 'CHANGE_STATUS': return `Change status for ${count} selected job card(s)`;
      case 'ASSIGN_TECHNICIAN': return `Assign a technician to ${count} selected job card(s)`;
      case 'CANCEL': return `Cancel ${count} selected job card(s). This action cannot be undone.`;
      case 'DELETE': return `Permanently delete ${count} selected job card(s). This action cannot be undone.`;
      default: return '';
    }
  };

  const handleCreateJobCard = async () => {
    if (!formData.assetId || !formData.faultDescription) {
      toast({
        title: 'Validation Error',
        description: 'Please select an asset and describe the fault',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/job-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: formData.assetId,
          jobType: formData.jobType,
          priority: formData.priority,
          faultDescription: formData.faultDescription,
          diagnosisNotes: formData.diagnosisNotes || undefined,
          estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : undefined,
          estimatedDuration: formData.estimatedDuration ? parseInt(formData.estimatedDuration) : undefined,
          scheduledStart: formData.scheduledStart || undefined,
          scheduledEnd: formData.scheduledEnd || undefined,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Job card created successfully',
        });
        setCreateDialogOpen(false);
        resetForm();
        fetchJobCards();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to create job card',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Create job card error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create job card',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransition = async (action: string, jobCard: JobCard) => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/job-cards/${jobCard.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: transitionNotes,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Job card ${action.toLowerCase()} successfully`,
        });
        fetchJobCards();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || `Failed to ${action.toLowerCase()} job card`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Transition error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update job card',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setTransitionDialog({ open: false, action: '', jobCard: null });
      setTransitionNotes('');
    }
  };

  const openEditDialog = (jc: JobCard) => {
    setEditFormData({
      id: jc.id,
      faultDescription: jc.faultDescription || '',
      diagnosisNotes: jc.diagnosisNotes || '',
      estimatedCost: jc.estimatedCost?.toString() || '',
      estimatedDuration: jc.estimatedDuration?.toString() || '',
      scheduledStart: jc.scheduledStart ? new Date(jc.scheduledStart).toISOString().slice(0, 16) : '',
      scheduledEnd: jc.scheduledEnd ? new Date(jc.scheduledEnd).toISOString().slice(0, 16) : '',
      priority: jc.priority || 'NORMAL',
      jobType: jc.jobType || 'CORRECTIVE',
    });
    setEditDialogOpen(true);
  };

  const handleUpdateJobCard = async () => {
    if (!editFormData) return;
    
    if (!editFormData.faultDescription) {
      toast({
        title: 'Validation Error',
        description: 'Fault description is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/job-cards/${editFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faultDescription: editFormData.faultDescription,
          diagnosisNotes: editFormData.diagnosisNotes || undefined,
          estimatedCost: editFormData.estimatedCost ? parseFloat(editFormData.estimatedCost) : undefined,
          estimatedDuration: editFormData.estimatedDuration ? parseInt(editFormData.estimatedDuration) : undefined,
          scheduledStart: editFormData.scheduledStart || undefined,
          scheduledEnd: editFormData.scheduledEnd || undefined,
          priority: editFormData.priority,
          jobType: editFormData.jobType,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Job card updated successfully',
        });
        setEditDialogOpen(false);
        setEditFormData(null);
        fetchJobCards();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to update job card',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Update job card error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update job card',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      assetId: '',
      jobType: 'CORRECTIVE',
      priority: 'NORMAL',
      faultDescription: '',
      diagnosisNotes: '',
      estimatedCost: '',
      estimatedDuration: '',
      scheduledStart: '',
      scheduledEnd: '',
    });
  };

  const allSelected = jobCards.length > 0 && selectedIds.size === jobCards.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < jobCards.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <Card className="bg-slate-900 text-white border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-emerald-400" />
                  <span className="font-semibold">{selectedIds.size} selected</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm">
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Change Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {bulkStatusOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.status}
                        onClick={() => {
                          setBulkStatus(option.status);
                          openBulkDialog('CHANGE_STATUS');
                        }}
                      >
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-slate-500">{option.description}</div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openBulkDialog('ASSIGN_TECHNICIAN')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Assign
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openBulkDialog('CANCEL')}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => openBulkDialog('DELETE')}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Job Cards</h2>
          <p className="text-slate-500">Manage maintenance work orders</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            exportType="job-cards"
            filters={{
              status: statusFilter,
              priority: priorityFilter,
              search: searchTerm,
            }}
            buttonText="Export"
          />
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                New Job Card
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Job Card</DialogTitle>
              <DialogDescription>
                Create a new maintenance work order
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="asset">Asset *</Label>
                <Select value={formData.assetId} onValueChange={(v) => setFormData({ ...formData, assetId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.assetNumber} - {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobType">Job Type</Label>
                <Select value={formData.jobType} onValueChange={(v) => setFormData({ ...formData, jobType: v as typeof formData.jobType })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CORRECTIVE">Corrective</SelectItem>
                    <SelectItem value="PREVENTIVE">Preventive</SelectItem>
                    <SelectItem value="INSPECTION">Inspection</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="MODIFICATION">Modification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as typeof formData.priority })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedCost">Estimated Cost (LKR)</Label>
                <Input
                  id="estimatedCost"
                  type="number"
                  placeholder="0.00"
                  value={formData.estimatedCost}
                  onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="faultDescription">Fault Description *</Label>
                <Textarea
                  id="faultDescription"
                  placeholder="Describe the fault or work required..."
                  value={formData.faultDescription}
                  onChange={(e) => setFormData({ ...formData, faultDescription: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="diagnosisNotes">Diagnosis Notes</Label>
                <Textarea
                  id="diagnosisNotes"
                  placeholder="Initial diagnosis or observations..."
                  value={formData.diagnosisNotes}
                  onChange={(e) => setFormData({ ...formData, diagnosisNotes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedDuration">Estimated Duration (hours)</Label>
                <Input
                  id="estimatedDuration"
                  type="number"
                  placeholder="0"
                  value={formData.estimatedDuration}
                  onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledStart">Scheduled Start</Label>
                <Input
                  id="scheduledStart"
                  type="datetime-local"
                  value={formData.scheduledStart}
                  onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleCreateJobCard}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Job Card
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by job card number, asset, or description..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => {
              setStatusFilter(v);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(v) => {
              setPriorityFilter(v);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Job Cards Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                      className={someSelected ? 'opacity-50' : ''}
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Job Card</TableHead>
                  <TableHead className="font-semibold">Asset</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Type</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Created</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8} className="h-16">
                        <div className="animate-pulse bg-slate-200 h-4 rounded w-full"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : jobCards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <Wrench className="h-8 w-8 text-slate-300" />
                        <p>No job cards found</p>
                        <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create your first job card
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  jobCards.map((jc) => (
                    <TableRow key={jc.id} className={`hover:bg-slate-50 ${selectedIds.has(jc.id) ? 'bg-emerald-50' : ''}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(jc.id)}
                          onCheckedChange={(checked) => handleSelectOne(jc.id, checked as boolean)}
                          aria-label={`Select ${jc.jobCardNumber}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-slate-100 rounded">
                            <Wrench className="h-4 w-4 text-slate-600" />
                          </div>
                          <div>
                            <div className="font-medium">{jc.jobCardNumber}</div>
                            <div className="text-xs text-slate-500 truncate max-w-[200px]">
                              {jc.faultDescription}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{jc.asset?.name || 'N/A'}</div>
                          <div className="text-xs text-slate-500">{jc.asset?.assetNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className={`font-medium ${jobTypeColors[jc.jobType] || ''}`}>
                          {jc.jobType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priorityColors[jc.priority] || ''}>
                          {jc.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[jc.status] || 'bg-slate-100'}>
                          {jc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-slate-600">
                        {new Date(jc.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setSelectedJobCard(jc)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <JobCardDetailDialog 
                                jobCard={jc} 
                                onTransition={(action, jobCard) => setTransitionDialog({ open: true, action, jobCard })}
                              />
                            </DialogContent>
                          </Dialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(jc)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {['DRAFT', 'APPROVED', 'ON_HOLD'].includes(jc.status) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => setTransitionDialog({ open: true, action: 'CANCEL', jobCard: jc })}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Cancel Job Card
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} job cards
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {jobCards.filter(jc => ['DRAFT', 'APPROVED'].includes(jc.status)).length}
            </div>
            <div className="text-sm text-slate-500">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {jobCards.filter(jc => jc.status === 'IN_PROGRESS').length}
            </div>
            <div className="text-sm text-slate-500">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {jobCards.filter(jc => jc.status === 'COMPLETED').length}
            </div>
            <div className="text-sm text-slate-500">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {jobCards.filter(jc => ['CRITICAL', 'EMERGENCY'].includes(jc.priority) && !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(jc.status)).length}
            </div>
            <div className="text-sm text-slate-500">Critical</div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Card</DialogTitle>
            <DialogDescription>
              Update job card details
            </DialogDescription>
          </DialogHeader>
          {editFormData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-jobType">Job Type</Label>
                <Select value={editFormData.jobType} onValueChange={(v) => setEditFormData({ ...editFormData, jobType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CORRECTIVE">Corrective</SelectItem>
                    <SelectItem value="PREVENTIVE">Preventive</SelectItem>
                    <SelectItem value="INSPECTION">Inspection</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    <SelectItem value="MODIFICATION">Modification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select value={editFormData.priority} onValueChange={(v) => setEditFormData({ ...editFormData, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="EMERGENCY">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-estimatedCost">Estimated Cost (LKR)</Label>
                <Input
                  id="edit-estimatedCost"
                  type="number"
                  placeholder="0.00"
                  value={editFormData.estimatedCost}
                  onChange={(e) => setEditFormData({ ...editFormData, estimatedCost: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-estimatedDuration">Estimated Duration (hours)</Label>
                <Input
                  id="edit-estimatedDuration"
                  type="number"
                  placeholder="0"
                  value={editFormData.estimatedDuration}
                  onChange={(e) => setEditFormData({ ...editFormData, estimatedDuration: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-faultDescription">Fault Description *</Label>
                <Textarea
                  id="edit-faultDescription"
                  placeholder="Describe the fault or work required..."
                  value={editFormData.faultDescription}
                  onChange={(e) => setEditFormData({ ...editFormData, faultDescription: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-diagnosisNotes">Diagnosis Notes</Label>
                <Textarea
                  id="edit-diagnosisNotes"
                  placeholder="Initial diagnosis or observations..."
                  value={editFormData.diagnosisNotes}
                  onChange={(e) => setEditFormData({ ...editFormData, diagnosisNotes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-scheduledStart">Scheduled Start</Label>
                <Input
                  id="edit-scheduledStart"
                  type="datetime-local"
                  value={editFormData.scheduledStart}
                  onChange={(e) => setEditFormData({ ...editFormData, scheduledStart: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-scheduledEnd">Scheduled End</Label>
                <Input
                  id="edit-scheduledEnd"
                  type="datetime-local"
                  value={editFormData.scheduledEnd}
                  onChange={(e) => setEditFormData({ ...editFormData, scheduledEnd: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleUpdateJobCard}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transition Dialog */}
      <Dialog open={transitionDialog.open} onOpenChange={(open) => setTransitionDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {transitionDialog.action === 'SUBMIT' && 'Submit for Approval'}
              {transitionDialog.action === 'START' && 'Start Work'}
              {transitionDialog.action === 'COMPLETE' && 'Complete Job Card'}
              {transitionDialog.action === 'CLOSE' && 'Close Job Card'}
              {transitionDialog.action === 'CANCEL' && 'Cancel Job Card'}
              {transitionDialog.action === 'HOLD' && 'Put on Hold'}
            </DialogTitle>
            <DialogDescription>
              {transitionDialog.jobCard?.jobCardNumber} - {transitionDialog.jobCard?.faultDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes or comments..."
                value={transitionNotes}
                onChange={(e) => setTransitionNotes(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransitionDialog({ open: false, action: '', jobCard: null })}>
              Cancel
            </Button>
            <Button 
              className={transitionDialog.action === 'CANCEL' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}
              onClick={() => transitionDialog.jobCard && handleTransition(transitionDialog.action, transitionDialog.jobCard)}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={(open) => { setBulkDialogOpen(open); if (!open) resetBulkForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getBulkDialogTitle()}</DialogTitle>
            <DialogDescription>{getBulkDialogDescription()}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {bulkAction === 'CHANGE_STATUS' && (
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVED">Approve</SelectItem>
                    <SelectItem value="IN_PROGRESS">Start Work</SelectItem>
                    <SelectItem value="ON_HOLD">Put on Hold</SelectItem>
                    <SelectItem value="COMPLETED">Complete</SelectItem>
                    <SelectItem value="CLOSED">Close</SelectItem>
                  </SelectContent>
                </Select>
                <div className="space-y-2 mt-4">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add notes for this status change..."
                    value={bulkNotes}
                    onChange={(e) => setBulkNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
            {bulkAction === 'ASSIGN_TECHNICIAN' && (
              <div className="space-y-2">
                <Label>Technician</Label>
                <Select value={bulkTechnicianId} onValueChange={setBulkTechnicianId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.name} {tech.employeeId ? `(${tech.employeeId})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(bulkAction === 'CANCEL' || bulkAction === 'DELETE') && (
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Textarea
                  placeholder={`Please provide a reason for ${bulkAction === 'DELETE' ? 'deletion' : 'cancellation'}...`}
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkDialogOpen(false); resetBulkForm(); }}>
              Cancel
            </Button>
            <Button 
              className={bulkAction === 'DELETE' ? 'bg-red-600 hover:bg-red-700' : bulkAction === 'CANCEL' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}
              onClick={handleBulkAction}
              disabled={submitting || (bulkAction === 'CHANGE_STATUS' && !bulkStatus) || (bulkAction === 'ASSIGN_TECHNICIAN' && !bulkTechnicianId) || ((bulkAction === 'CANCEL' || bulkAction === 'DELETE') && !bulkReason)}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm {selectedIds.size} Job Card(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function JobCardDetailDialog({ jobCard, onTransition }: { jobCard: JobCard; onTransition: (action: string, jc: JobCard) => void }) {
  const transitions = validTransitions[jobCard.status] || [];

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Wrench className="h-5 w-5 text-slate-600" />
          </div>
          {jobCard.jobCardNumber}
        </DialogTitle>
        <DialogDescription>
          {jobCard.asset?.name} ({jobCard.asset?.assetNumber})
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Status & Priority */}
          <div className="flex flex-wrap gap-2">
            <Badge className={statusColors[jobCard.status] || 'bg-slate-100'}>
              {jobCard.status}
            </Badge>
            <Badge variant="outline" className={priorityColors[jobCard.priority] || ''}>
              {jobCard.priority}
            </Badge>
            <span className={`font-medium text-sm ${jobTypeColors[jobCard.jobType] || ''}`}>
              {jobCard.jobType}
            </span>
          </div>

          {/* Fault Description */}
          <div>
            <h4 className="font-semibold text-sm text-slate-500 mb-2">Fault Description</h4>
            <div className="bg-slate-50 rounded-lg p-4 text-sm">
              {jobCard.faultDescription}
            </div>
          </div>

          {/* Diagnosis */}
          {jobCard.diagnosisNotes && (
            <div>
              <h4 className="font-semibold text-sm text-slate-500 mb-2">Diagnosis Notes</h4>
              <div className="bg-amber-50 rounded-lg p-4 text-sm border border-amber-200">
                {jobCard.diagnosisNotes}
              </div>
            </div>
          )}

          {/* Work Performed */}
          {jobCard.workPerformed && (
            <div>
              <h4 className="font-semibold text-sm text-slate-500 mb-2">Work Performed</h4>
              <div className="bg-emerald-50 rounded-lg p-4 text-sm border border-emerald-200">
                {jobCard.workPerformed}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Cost & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-sm text-slate-500">Estimated Cost</div>
              <div className="text-xl font-bold">${jobCard.estimatedCost?.toLocaleString() || 'N/A'}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-sm text-slate-500">Actual Cost</div>
              <div className="text-xl font-bold">${jobCard.actualCost?.toLocaleString() || 'N/A'}</div>
            </div>
          </div>

          {/* Technicians */}
          {jobCard.technicians && jobCard.technicians.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-slate-500 mb-2">Assigned Technicians</h4>
              <div className="flex flex-wrap gap-2">
                {jobCard.technicians.map((tech) => (
                  <Badge key={tech.id} variant="outline" className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {tech.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Created:</span>
              <span>{new Date(jobCard.createdAt).toLocaleString()}</span>
            </div>
            {jobCard.scheduledStart && (
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Start:</span>
                <span>{new Date(jobCard.scheduledStart).toLocaleString()}</span>
              </div>
            )}
            {jobCard.actualStart && (
              <div className="flex justify-between">
                <span className="text-slate-500">Actual Start:</span>
                <span>{new Date(jobCard.actualStart).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          {transitions.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-slate-500 mb-2">Actions</h4>
              <div className="flex flex-wrap gap-2">
                {transitions.map((t) => (
                  <Button
                    key={t.action}
                    size="sm"
                    variant={t.action === 'CANCEL' ? 'destructive' : 'default'}
                    onClick={() => onTransition(t.action, jobCard)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
