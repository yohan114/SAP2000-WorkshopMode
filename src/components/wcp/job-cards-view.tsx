'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  X,
  CheckSquare,
  ArrowRight,
  Users,
  AlertTriangle,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Pause,
  Play,
  Flag,
  TrendingUp,
  ShieldAlert,
  Timer,
  Calendar,
  FileCheck,
  ArrowUpCircle,
  Camera,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ExportButton } from '@/components/wcp/export-button';
import { JobCardPhotos } from '@/components/wcp/job-card-photos';

// SLA Status type
type SlaStatus = 'ON_TRACK' | 'AT_RISK' | 'BREACHED';
type EscalationLevel = 'NONE' | 'SUPERVISOR' | 'MANAGER' | 'DIRECTOR';

// Extended JobCard interface with SLA info
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
    id: string;
    name: string;
  };
  technicians?: Array<{
    id: string;
    name: string;
  }>;
  taskCount?: number;
  materialRequestCount?: number;
  // SLA fields
  sla?: {
    status: SlaStatus;
    escalationLevel: EscalationLevel;
    firstResponseMinutes?: number;
    completionMinutes?: number;
    firstResponseRemaining?: number;
    completionRemaining?: number;
  };
}

// Guard conditions for transitions
interface GuardConditions {
  can: {
    submit: boolean;
    approve: boolean;
    reject: boolean;
    return: boolean;
    start: boolean;
    hold: boolean;
    resume: boolean;
    complete: boolean;
    reopen: boolean;
    close: boolean;
    cancel: boolean;
  };
  context?: {
    hasAsset: boolean;
    hasTechnician: boolean;
    taskCount: number;
    completedTaskCount: number;
    openMaterialRequestCount: number;
  };
  validTransitions: Array<{
    type: string;
    canProceed: boolean;
    reason?: string;
    missingRequirements?: string[];
  }>;
}

// SLA Dashboard stats
interface SlaDashboardStats {
  statistics: {
    onTrack: number;
    atRisk: number;
    breached: number;
    escalated: number;
    total: number;
  };
  compliance: {
    rate: number;
    target: number;
    status: string;
  };
  slaTargets: Record<string, { firstResponse: number; completion: number }>;
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
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// SLA Status Colors
const slaStatusColors: Record<SlaStatus, string> = {
  'ON_TRACK': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'AT_RISK': 'bg-amber-100 text-amber-700 border-amber-200',
  'BREACHED': 'bg-red-100 text-red-700 border-red-200',
};

const slaStatusBgColors: Record<SlaStatus, string> = {
  'ON_TRACK': 'bg-emerald-500',
  'AT_RISK': 'bg-amber-500',
  'BREACHED': 'bg-red-500',
};

// Escalation Level Colors
const escalationColors: Record<EscalationLevel, string> = {
  'NONE': '',
  'SUPERVISOR': 'text-amber-600',
  'MANAGER': 'text-orange-600',
  'DIRECTOR': 'text-red-600',
};

const statusColors: Record<string, string> = {
  'DRAFT': 'bg-slate-100 text-foreground',
  'PENDING': 'bg-amber-100 text-amber-700',
  'APPROVED': 'bg-blue-100 text-blue-700',
  'IN_PROGRESS': 'bg-purple-100 text-purple-700',
  'COMPLETED': 'bg-emerald-100 text-emerald-700',
  'CLOSED': 'bg-slate-100 text-muted-foreground',
  'CANCELLED': 'bg-red-100 text-red-700',
  'ON_HOLD': 'bg-amber-100 text-amber-700',
  'REJECTED': 'bg-red-100 text-red-700',
};

const priorityColors: Record<string, string> = {
  'CRITICAL': 'bg-red-100 text-red-700 border-red-200',
  'EMERGENCY': 'bg-red-200 text-red-800 border-red-300',
  'HIGH': 'bg-amber-100 text-amber-700 border-amber-200',
  'NORMAL': 'bg-blue-100 text-blue-700 border-blue-200',
  'LOW': 'bg-slate-100 text-foreground border-slate-200',
};

const jobTypeColors: Record<string, string> = {
  'CORRECTIVE': 'text-red-600',
  'PREVENTIVE': 'text-emerald-600',
  'INSPECTION': 'text-purple-600',
  'EMERGENCY': 'text-orange-600',
  'MODIFICATION': 'text-blue-600',
};

// SLA Targets by Priority (in minutes)
const slaTargetsByPriority: Record<string, { firstResponse: number; completion: number }> = {
  'EMERGENCY': { firstResponse: 30, completion: 240 },  // 30min / 4hrs
  'CRITICAL': { firstResponse: 120, completion: 480 },  // 2hrs / 8hrs
  'HIGH': { firstResponse: 240, completion: 1440 },     // 4hrs / 24hrs
  'NORMAL': { firstResponse: 480, completion: 2880 },   // 8hrs / 48hrs
  'LOW': { firstResponse: 1440, completion: 5760 },     // 24hrs / 4 days
};

const validTransitions: Record<string, Array<{ action: string; label: string; newStatus: string }>> = {
  'DRAFT': [
    { action: 'SUBMIT', label: 'Submit for Approval', newStatus: 'PENDING' },
    { action: 'CANCEL', label: 'Cancel', newStatus: 'CANCELLED' },
  ],
  'PENDING': [
    { action: 'APPROVE', label: 'Approve', newStatus: 'APPROVED' },
    { action: 'REJECT', label: 'Reject', newStatus: 'REJECTED' },
    { action: 'RETURN', label: 'Return to Draft', newStatus: 'DRAFT' },
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
  'REJECTED': [
    { action: 'RETURN', label: 'Return to Draft', newStatus: 'DRAFT' },
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

// SLA Countdown Timer Component
function SlaCountdownTimer({ 
  minutesRemaining, 
  status, 
  label 
}: { 
  minutesRemaining?: number; 
  status: SlaStatus;
  label: string;
}) {
  if (minutesRemaining === undefined || minutesRemaining === null) {
    return (
      <div className="text-xs text-muted-foreground">
        {label}: N/A
      </div>
    );
  }

  const isOverdue = minutesRemaining <= 0;
  const absMinutes = Math.abs(minutesRemaining);
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  const formatTime = () => {
    if (isOverdue) {
      if (days > 0) return `${days}d ${remainingHours}h overdue`;
      if (hours > 0) return `${hours}h ${mins}m overdue`;
      return `${mins}m overdue`;
    }
    if (days > 0) return `${days}d ${remainingHours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600' : status === 'AT_RISK' ? 'text-amber-600' : 'text-muted-foreground'}`}>
      <Clock className={`h-3 w-3 ${isOverdue ? 'animate-pulse' : ''}`} />
      <span className="font-medium">{label}:</span>
      <span className={isOverdue ? 'font-bold' : ''}>{formatTime()}</span>
    </div>
  );
}

// SLA Progress Bar Component
function SlaProgressBar({ 
  used, 
  total, 
  status 
}: { 
  used: number; 
  total: number;
  status: SlaStatus;
}) {
  const percentage = Math.min(100, Math.round((used / total) * 100));
  
  return (
    <div className="w-full">
      <Progress 
        value={percentage} 
        className={`h-1.5 ${status === 'BREACHED' ? 'bg-red-100' : status === 'AT_RISK' ? 'bg-amber-100' : 'bg-emerald-100'}`}
      />
    </div>
  );
}

// Escalation Badge Component
function EscalationBadge({ level }: { level: EscalationLevel }) {
  if (level === 'NONE') return null;
  
  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${escalationColors[level]}`}>
      <ArrowUpCircle className="h-3 w-3" />
      {level}
    </div>
  );
}

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
  const [transitionDialog, setTransitionDialog] = useState<{ 
    open: boolean; 
    action: string; 
    jobCard: JobCard | null;
    guardConditions?: GuardConditions;
  }>({
    open: false,
    action: '',
    jobCard: null,
  });
  const [transitionNotes, setTransitionNotes] = useState('');
  const [transitionReason, setTransitionReason] = useState('');
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
  
  // SLA Dashboard Stats
  const [slaStats, setSlaStats] = useState<SlaDashboardStats | null>(null);

  // Bulk operation state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'CHANGE_STATUS' | 'ASSIGN_TECHNICIAN' | 'CANCEL' | 'DELETE' | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkTechnicianId, setBulkTechnicianId] = useState<string>('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');

  // Detail dialog with guard conditions
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [guardConditions, setGuardConditions] = useState<GuardConditions | null>(null);
  const [slaInfo, setSlaInfo] = useState<Record<string, unknown> | null>(null);

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

  // Fetch SLA stats
  const fetchSlaStats = useCallback(async () => {
    try {
      const response = await fetch('/api/sla/dashboard');
      if (response.ok) {
        const data = await response.json();
        setSlaStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch SLA stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchJobCards();
    fetchAssets();
    fetchTechnicians();
    fetchSlaStats();
  }, [searchTerm, statusFilter, priorityFilter, pagination.page]);

  // Real-time SLA updates (poll every minute)
  const hasJobCards = jobCards.length > 0;
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSlaStats();
      // Re-fetch job cards to update SLA timers
      if (hasJobCards) {
        fetchJobCards();
      }
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [hasJobCards]);

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
        // Enhance job cards with SLA info
        const jobCardsWithSla = await Promise.all(
          (data.data || []).map(async (jc) => {
            try {
              const slaResponse = await fetch(`/api/job-cards/${jc.id}/sla`);
              if (slaResponse.ok) {
                const slaData = await slaResponse.json();
                return {
                  ...jc,
                  sla: {
                    status: slaData.sla?.status || 'ON_TRACK',
                    escalationLevel: slaData.sla?.escalationLevel || 'NONE',
                    firstResponseMinutes: slaData.sla?.target?.firstResponseMinutes,
                    completionMinutes: slaData.sla?.target?.completionMinutes,
                    firstResponseRemaining: slaData.sla?.timeRemaining?.firstResponse,
                    completionRemaining: slaData.sla?.timeRemaining?.completion,
                  },
                };
              }
              return jc;
            } catch {
              return jc;
            }
          })
        );
        setJobCards(jobCardsWithSla);
        setPagination(prev => ({ ...prev, ...data.meta }));
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

  // Fetch guard conditions for a job card
  const fetchGuardConditions = async (jobCardId: string) => {
    try {
      const response = await fetch(`/api/job-cards/${jobCardId}/guards?userId=current`);
      if (response.ok) {
        const data = await response.json();
        setGuardConditions(data);
        return data;
      }
    } catch (error) {
      console.error('Failed to fetch guard conditions:', error);
    }
    return null;
  };

  // Fetch SLA info for a job card
  const fetchSlaInfo = async (jobCardId: string) => {
    try {
      const response = await fetch(`/api/job-cards/${jobCardId}/sla`);
      if (response.ok) {
        const data = await response.json();
        setSlaInfo(data);
        return data;
      }
    } catch (error) {
      console.error('Failed to fetch SLA info:', error);
    }
    return null;
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
    // For actions that require reason
    if (['REJECT', 'RETURN', 'HOLD', 'CANCEL'].includes(action) && !transitionReason.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Reason is required for this action',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      
      // First check guard conditions
      const guards = await fetchGuardConditions(jobCard.id);
      const transitionGuard = guards?.validTransitions?.find(t => t.type === action);
      
      if (transitionGuard && !transitionGuard.canProceed) {
        toast({
          title: 'Cannot Perform Action',
          description: transitionGuard.reason || transitionGuard.missingRequirements?.join(', ') || 'Requirements not met',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      const response = await fetch(`/api/job-cards/${jobCard.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: transitionNotes,
          reason: transitionReason,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: `Job card ${action.toLowerCase()}ed successfully`,
        });
        fetchJobCards();
        setDetailDialogOpen(false);
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
      setTransitionReason('');
    }
  };

  const openTransitionDialog = async (action: string, jobCard: JobCard) => {
    // Fetch guard conditions first
    const guards = await fetchGuardConditions(jobCard.id);
    setTransitionDialog({ open: true, action, jobCard, guardConditions: guards || undefined });
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

  // Open detail dialog and fetch guard conditions
  const handleViewJobCard = async (jc: JobCard) => {
    setSelectedJobCard(jc);
    setDetailDialogOpen(true);
    await Promise.all([
      fetchGuardConditions(jc.id),
      fetchSlaInfo(jc.id),
    ]);
  };

  const allSelected = jobCards.length > 0 && selectedIds.size === jobCards.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < jobCards.length;

  // Calculate SLA progress percentage
  const calculateSlaPercentage = (jc: JobCard): number => {
    const target = slaTargetsByPriority[jc.priority];
    if (!target || !jc.createdAt) return 0;
    
    const created = new Date(jc.createdAt).getTime();
    const now = Date.now();
    const elapsedMinutes = (now - created) / (1000 * 60);
    
    return Math.min(100, Math.round((elapsedMinutes / target.completion) * 100));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* SLA Stats Summary */}
      {slaStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                <div>
                  <div className="text-2xl font-bold text-emerald-600">{slaStats.statistics.onTrack}</div>
                  <div className="text-xs text-muted-foreground">On Track</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <div className="text-2xl font-bold text-amber-600">{slaStats.statistics.atRisk}</div>
                  <div className="text-xs text-muted-foreground">At Risk</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold text-red-600">{slaStats.statistics.breached}</div>
                  <div className="text-xs text-muted-foreground">Breached</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold text-orange-600">{slaStats.statistics.escalated}</div>
                  <div className="text-xs text-muted-foreground">Escalated</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">{slaStats.compliance.rate.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">SLA Compliance</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                          <div className="text-xs text-muted-foreground">{option.description}</div>
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
          <h2 className="text-2xl font-bold text-foreground">Job Cards</h2>
          <p className="text-muted-foreground">Manage maintenance work orders with SLA tracking</p>
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
                <Label htmlFor="priority">Priority (SLA Target)</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v as typeof formData.priority })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMERGENCY">Emergency (30min response)</SelectItem>
                    <SelectItem value="CRITICAL">Critical (2hr response)</SelectItem>
                    <SelectItem value="HIGH">High (4hr response)</SelectItem>
                    <SelectItem value="NORMAL">Normal (8hr response)</SelectItem>
                    <SelectItem value="LOW">Low (24hr response)</SelectItem>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <SelectItem value="PENDING">Pending Approval</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
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
                <SelectItem value="EMERGENCY">Emergency</SelectItem>
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
                <TableRow className="bg-muted/50">
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
                  <TableHead className="font-semibold hidden xl:table-cell">SLA Status</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">SLA Timer</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Created</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={10} className="h-16">
                        <div className="animate-pulse bg-slate-200 h-4 rounded w-full"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : jobCards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
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
                    <TableRow key={jc.id} className={`hover:bg-muted/50 ${selectedIds.has(jc.id) ? 'bg-emerald-50' : ''}`}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(jc.id)}
                          onCheckedChange={(checked) => handleSelectOne(jc.id, checked as boolean)}
                          aria-label={`Select ${jc.jobCardNumber}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${jc.sla?.status === 'BREACHED' ? 'bg-red-100' : jc.sla?.status === 'AT_RISK' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                            <Wrench className={`h-4 w-4 ${jc.sla?.status === 'BREACHED' ? 'text-red-600' : jc.sla?.status === 'AT_RISK' ? 'text-amber-600' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{jc.jobCardNumber}</span>
                              {jc.sla?.escalationLevel && jc.sla.escalationLevel !== 'NONE' && (
                                <EscalationBadge level={jc.sla.escalationLevel} />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {jc.faultDescription}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{jc.asset?.name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground">{jc.asset?.assetNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className={`font-medium ${jobTypeColors[jc.jobType] || ''}`}>
                          {jc.jobType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className={priorityColors[jc.priority] || ''}>
                            <Flag className="h-3 w-3 mr-1" />
                            {jc.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {slaTargetsByPriority[jc.priority]?.firstResponse}m resp
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[jc.status] || 'bg-slate-100'}>
                          {jc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {jc.sla && jc.sla.status && !['CLOSED', 'CANCELLED', 'COMPLETED'].includes(jc.status) ? (
                          <div className="space-y-1">
                            <Badge variant="outline" className={slaStatusColors[jc.sla.status]}>
                              {jc.sla.status.replace('_', ' ')}
                            </Badge>
                            <SlaProgressBar 
                              used={calculateSlaPercentage(jc)} 
                              total={100} 
                              status={jc.sla.status} 
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {jc.sla && !['CLOSED', 'CANCELLED', 'COMPLETED'].includes(jc.status) ? (
                          <div className="space-y-1">
                            <SlaCountdownTimer 
                              minutesRemaining={jc.sla.firstResponseRemaining}
                              status={jc.sla.status}
                              label="Response"
                            />
                            <SlaCountdownTimer 
                              minutesRemaining={jc.sla.completionRemaining}
                              status={jc.sla.status}
                              label="Completion"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(jc.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleViewJobCard(jc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
                              
                              {/* Quick Action Buttons based on status */}
                              {jc.status === 'DRAFT' && (
                                <DropdownMenuItem onClick={() => openTransitionDialog('SUBMIT', jc)}>
                                  <ArrowRight className="h-4 w-4 mr-2" />
                                  Submit for Approval
                                </DropdownMenuItem>
                              )}
                              
                              {jc.status === 'PENDING' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-emerald-600"
                                    onClick={() => openTransitionDialog('APPROVE', jc)}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => openTransitionDialog('REJECT', jc)}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-amber-600"
                                    onClick={() => openTransitionDialog('RETURN', jc)}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Return to Draft
                                  </DropdownMenuItem>
                                </>
                              )}
                              
                              {jc.status === 'APPROVED' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openTransitionDialog('START', jc)}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Start Work
                                  </DropdownMenuItem>
                                </>
                              )}
                              
                              {jc.status === 'IN_PROGRESS' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openTransitionDialog('COMPLETE', jc)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Complete
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openTransitionDialog('HOLD', jc)}>
                                    <Pause className="h-4 w-4 mr-2" />
                                    Put on Hold
                                  </DropdownMenuItem>
                                </>
                              )}
                              
                              {jc.status === 'ON_HOLD' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openTransitionDialog('RESUME', jc)}>
                                    <Play className="h-4 w-4 mr-2" />
                                    Resume
                                  </DropdownMenuItem>
                                </>
                              )}
                              
                              {jc.status === 'COMPLETED' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openTransitionDialog('CLOSE', jc)}>
                                    <FileCheck className="h-4 w-4 mr-2" />
                                    Close Job Card
                                  </DropdownMenuItem>
                                </>
                              )}
                              
                              {['DRAFT', 'APPROVED', 'ON_HOLD', 'PENDING'].includes(jc.status) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => openTransitionDialog('CANCEL', jc)}
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
          <p className="text-sm text-muted-foreground">
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
              {jobCards.filter(jc => ['DRAFT', 'PENDING', 'APPROVED'].includes(jc.status)).length}
            </div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {jobCards.filter(jc => jc.status === 'IN_PROGRESS').length}
            </div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {jobCards.filter(jc => jc.status === 'COMPLETED').length}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {jobCards.filter(jc => ['CRITICAL', 'EMERGENCY'].includes(jc.priority) && !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(jc.status)).length}
            </div>
            <div className="text-sm text-muted-foreground">Critical</div>
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
                    <SelectItem value="EMERGENCY">Emergency (30min response)</SelectItem>
                    <SelectItem value="CRITICAL">Critical (2hr response)</SelectItem>
                    <SelectItem value="HIGH">High (4hr response)</SelectItem>
                    <SelectItem value="NORMAL">Normal (8hr response)</SelectItem>
                    <SelectItem value="LOW">Low (24hr response)</SelectItem>
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

      {/* Job Card Detail Dialog with Actions */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedJobCard && (
            <JobCardDetailDialog 
              jobCard={selectedJobCard} 
              guardConditions={guardConditions}
              slaInfo={slaInfo}
              onTransition={(action, jc) => openTransitionDialog(action, jc)}
              onClose={() => setDetailDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Transition Dialog */}
      <Dialog open={transitionDialog.open} onOpenChange={(open) => {
        setTransitionDialog(prev => ({ ...prev, open }));
        if (!open) {
          setTransitionNotes('');
          setTransitionReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {transitionDialog.action === 'SUBMIT' && <><ArrowRight className="h-5 w-5" /> Submit for Approval</>}
              {transitionDialog.action === 'APPROVE' && <><CheckCircle className="h-5 w-5 text-emerald-500" /> Approve Job Card</>}
              {transitionDialog.action === 'REJECT' && <><XCircle className="h-5 w-5 text-red-500" /> Reject Job Card</>}
              {transitionDialog.action === 'RETURN' && <><RotateCcw className="h-5 w-5 text-amber-500" /> Return to Draft</>}
              {transitionDialog.action === 'START' && <><Play className="h-5 w-5 text-blue-500" /> Start Work</>}
              {transitionDialog.action === 'COMPLETE' && <><CheckCircle className="h-5 w-5 text-emerald-500" /> Complete Job Card</>}
              {transitionDialog.action === 'CLOSE' && <><FileCheck className="h-5 w-5 text-muted-foreground" /> Close Job Card</>}
              {transitionDialog.action === 'CANCEL' && <><XCircle className="h-5 w-5 text-red-500" /> Cancel Job Card</>}
              {transitionDialog.action === 'HOLD' && <><Pause className="h-5 w-5 text-amber-500" /> Put on Hold</>}
              {transitionDialog.action === 'RESUME' && <><Play className="h-5 w-5 text-blue-500" /> Resume Work</>}
              {transitionDialog.action === 'REOPEN' && <><RotateCcw className="h-5 w-5 text-blue-500" /> Reopen Job Card</>}
            </DialogTitle>
            <DialogDescription>
              {transitionDialog.jobCard?.jobCardNumber} - {transitionDialog.jobCard?.faultDescription}
            </DialogDescription>
          </DialogHeader>
          
          {/* Guard Conditions Warning */}
          {transitionDialog.guardConditions?.validTransitions?.find(t => t.type === transitionDialog.action)?.canProceed === false && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700">Cannot proceed</p>
                  <p className="text-sm text-red-600">
                    {transitionDialog.guardConditions?.validTransitions?.find(t => t.type === transitionDialog.action)?.reason}
                  </p>
                  {transitionDialog.guardConditions?.validTransitions?.find(t => t.type === transitionDialog.action)?.missingRequirements && (
                    <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                      {transitionDialog.guardConditions?.validTransitions?.find(t => t.type === transitionDialog.action)?.missingRequirements?.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {/* Reason field for REJECT, RETURN, HOLD, CANCEL */}
            {['REJECT', 'RETURN', 'HOLD', 'CANCEL'].includes(transitionDialog.action) && (
              <div>
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  placeholder={`Please provide a reason for ${transitionDialog.action.toLowerCase()}ing this job card...`}
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  className="mt-2"
                />
              </div>
            )}
            
            {/* Notes field for all transitions */}
            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes or comments..."
                value={transitionNotes}
                onChange={(e) => setTransitionNotes(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransitionDialog(prev => ({ ...prev, open: false }))}>
              Cancel
            </Button>
            <Button 
              className={
                transitionDialog.action === 'CANCEL' || transitionDialog.action === 'REJECT' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : transitionDialog.action === 'RETURN' || transitionDialog.action === 'HOLD'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }
              onClick={() => transitionDialog.jobCard && handleTransition(transitionDialog.action, transitionDialog.jobCard)}
              disabled={submitting || ['REJECT', 'RETURN', 'HOLD', 'CANCEL'].includes(transitionDialog.action) && !transitionReason.trim()}
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

// Enhanced Job Card Detail Dialog with SLA and Approval Actions
function JobCardDetailDialog({ 
  jobCard, 
  guardConditions,
  slaInfo,
  onTransition,
  onClose,
}: { 
  jobCard: JobCard; 
  guardConditions: GuardConditions | null;
  slaInfo: Record<string, unknown> | null;
  onTransition: (action: string, jc: JobCard) => void;
  onClose: () => void;
}) {
  const transitions = validTransitions[jobCard.status] || [];
  const slaData = slaInfo as {
    sla?: {
      status: SlaStatus;
      statusDisplay: string;
      escalationLevel: EscalationLevel;
      escalationDisplay: string;
      timeRemaining?: {
        firstResponse?: number;
        firstResponseDisplay?: string;
        completion?: number;
        completionDisplay?: string;
      };
      elapsed?: {
        display: string;
      };
      milestones?: {
        firstResponse?: string;
        firstResponseWithinSla?: boolean;
        completed?: string;
        completedWithinSla?: boolean;
      };
    };
  } | null;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${jobCard.sla?.status === 'BREACHED' ? 'bg-red-100' : jobCard.sla?.status === 'AT_RISK' ? 'bg-amber-100' : 'bg-slate-100'}`}>
            <Wrench className={`h-5 w-5 ${jobCard.sla?.status === 'BREACHED' ? 'text-red-600' : jobCard.sla?.status === 'AT_RISK' ? 'text-amber-600' : 'text-muted-foreground'}`} />
          </div>
          {jobCard.jobCardNumber}
        </DialogTitle>
        <DialogDescription className="flex items-center gap-2">
          {jobCard.asset?.name} ({jobCard.asset?.assetNumber})
          {jobCard.sla?.escalationLevel && jobCard.sla.escalationLevel !== 'NONE' && (
            <EscalationBadge level={jobCard.sla.escalationLevel} />
          )}
        </DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="details" className="mt-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="sla">SLA Status</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <h4 className="font-semibold text-sm text-muted-foreground mb-2">Fault Description</h4>
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  {jobCard.faultDescription}
                </div>
              </div>

              {/* Diagnosis */}
              {jobCard.diagnosisNotes && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Diagnosis Notes</h4>
                  <div className="bg-amber-50 rounded-lg p-4 text-sm border border-amber-200">
                    {jobCard.diagnosisNotes}
                  </div>
                </div>
              )}

              {/* Work Performed */}
              {jobCard.workPerformed && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Work Performed</h4>
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
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Estimated Cost</div>
                  <div className="text-xl font-bold">LKR {jobCard.estimatedCost?.toLocaleString() || 'N/A'}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Actual Cost</div>
                  <div className="text-xl font-bold">LKR {jobCard.actualCost?.toLocaleString() || 'N/A'}</div>
                </div>
              </div>

              {/* Technicians */}
              {jobCard.technicians && jobCard.technicians.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Assigned Technicians</h4>
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
                  <span className="text-muted-foreground">Created:</span>
                  <span>{new Date(jobCard.createdAt).toLocaleString()}</span>
                </div>
                {jobCard.scheduledStart && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scheduled Start:</span>
                    <span>{new Date(jobCard.scheduledStart).toLocaleString()}</span>
                  </div>
                )}
                {jobCard.actualStart && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Actual Start:</span>
                    <span>{new Date(jobCard.actualStart).toLocaleString()}</span>
                  </div>
                )}
                {jobCard.actualEnd && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Actual End:</span>
                    <span>{new Date(jobCard.actualEnd).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="photos" className="mt-4">
          <JobCardPhotos
            jobCardId={jobCard.id}
            jobCardNumber={jobCard.jobCardNumber}
            jobCardStatus={jobCard.status}
            canUpload={!['CLOSED', 'CANCELLED'].includes(jobCard.status)}
          />
        </TabsContent>
        
        <TabsContent value="sla" className="mt-4">
          <div className="space-y-6">
            {/* SLA Status Overview */}
            {jobCard.sla && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">SLA Status</div>
                    <Badge variant="outline" className={`mt-2 ${slaStatusColors[jobCard.sla.status]}`}>
                      {jobCard.sla.status.replace('_', ' ')}
                    </Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Escalation Level</div>
                    <div className="mt-2 font-semibold">
                      {jobCard.sla.escalationLevel === 'NONE' ? (
                        <span className="text-muted-foreground">None</span>
                      ) : (
                        <span className={escalationColors[jobCard.sla.escalationLevel]}>
                          {jobCard.sla.escalationLevel}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Time to First Response</div>
                    <div className="mt-2 font-semibold">
                      {slaData?.sla?.timeRemaining?.firstResponseDisplay || 'N/A'}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Time to Completion</div>
                    <div className="mt-2 font-semibold">
                      {slaData?.sla?.timeRemaining?.completionDisplay || 'N/A'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* SLA Progress */}
            {jobCard.sla && !['CLOSED', 'CANCELLED', 'COMPLETED'].includes(jobCard.status) && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-4">SLA Timeline Progress</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>First Response</span>
                        <span>{slaData?.sla?.timeRemaining?.firstResponseDisplay || 'N/A'}</span>
                      </div>
                      <Progress 
                        value={jobCard.sla.firstResponseRemaining && jobCard.sla.firstResponseMinutes
                          ? Math.min(100, ((jobCard.sla.firstResponseMinutes - jobCard.sla.firstResponseRemaining) / jobCard.sla.firstResponseMinutes) * 100)
                          : 0
                        }
                        className={`h-2 ${jobCard.sla.status === 'BREACHED' ? 'bg-red-100' : jobCard.sla.status === 'AT_RISK' ? 'bg-amber-100' : 'bg-emerald-100'}`}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Completion</span>
                        <span>{slaData?.sla?.timeRemaining?.completionDisplay || 'N/A'}</span>
                      </div>
                      <Progress 
                        value={jobCard.sla.completionRemaining && jobCard.sla.completionMinutes
                          ? Math.min(100, ((jobCard.sla.completionMinutes - jobCard.sla.completionRemaining) / jobCard.sla.completionMinutes) * 100)
                          : 0
                        }
                        className={`h-2 ${jobCard.sla.status === 'BREACHED' ? 'bg-red-100' : jobCard.sla.status === 'AT_RISK' ? 'bg-amber-100' : 'bg-emerald-100'}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SLA Milestones */}
            {slaData?.sla?.milestones && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-4">SLA Milestones</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {slaData.sla.milestones.firstResponse ? (
                        slaData.sla.milestones.firstResponseWithinSla ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )
                      ) : (
                        <Timer className="h-5 w-5 text-slate-300" />
                      )}
                      <div>
                        <div className="font-medium">First Response</div>
                        <div className="text-sm text-muted-foreground">
                          {slaData.sla.milestones.firstResponse 
                            ? new Date(slaData.sla.milestones.firstResponse).toLocaleString()
                            : 'Pending'
                          }
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {slaData.sla.milestones.completed ? (
                        slaData.sla.milestones.completedWithinSla ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )
                      ) : (
                        <Timer className="h-5 w-5 text-slate-300" />
                      )}
                      <div>
                        <div className="font-medium">Completion</div>
                        <div className="text-sm text-muted-foreground">
                          {slaData.sla.milestones.completed 
                            ? new Date(slaData.sla.milestones.completed).toLocaleString()
                            : 'Pending'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SLA Targets Reference */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-4">SLA Targets by Priority</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Priority</TableHead>
                        <TableHead>First Response</TableHead>
                        <TableHead>Completion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(slaTargetsByPriority).map(([priority, targets]) => (
                        <TableRow key={priority} className={priority === jobCard.priority ? 'bg-muted/50' : ''}>
                          <TableCell>
                            <Badge variant="outline" className={priorityColors[priority]}>
                              {priority}
                            </Badge>
                          </TableCell>
                          <TableCell>{targets.firstResponse} minutes</TableCell>
                          <TableCell>{targets.completion} minutes</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="actions" className="mt-4">
          <div className="space-y-6">
            {/* Available Actions */}
            {transitions.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-4">Available Actions</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {transitions.map((t) => {
                    const guard = guardConditions?.validTransitions?.find(g => g.type === t.action);
                    const canProceed = guard?.canProceed ?? true;
                    const isBlocked = !canProceed;
                    
                    return (
                      <Button
                        key={t.action}
                        size="lg"
                        variant={t.action === 'CANCEL' || t.action === 'REJECT' ? 'destructive' : 'default'}
                        className={`h-auto py-4 flex flex-col items-center gap-2 ${isBlocked ? 'opacity-50' : ''}`}
                        onClick={() => onTransition(t.action, jobCard)}
                        disabled={isBlocked}
                      >
                        {t.action === 'SUBMIT' && <ArrowRight className="h-5 w-5" />}
                        {t.action === 'APPROVE' && <CheckCircle className="h-5 w-5" />}
                        {t.action === 'REJECT' && <XCircle className="h-5 w-5" />}
                        {t.action === 'RETURN' && <RotateCcw className="h-5 w-5" />}
                        {t.action === 'START' && <Play className="h-5 w-5" />}
                        {t.action === 'COMPLETE' && <CheckCircle className="h-5 w-5" />}
                        {t.action === 'CLOSE' && <FileCheck className="h-5 w-5" />}
                        {t.action === 'CANCEL' && <XCircle className="h-5 w-5" />}
                        {t.action === 'HOLD' && <Pause className="h-5 w-5" />}
                        {t.action === 'RESUME' && <Play className="h-5 w-5" />}
                        {t.action === 'REOPEN' && <RotateCcw className="h-5 w-5" />}
                        <span>{t.label}</span>
                      </Button>
                    );
                  })}
                </div>
                
                {/* Guard Conditions Info */}
                {guardConditions && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <h5 className="font-medium text-sm mb-2">Requirements Check</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        {guardConditions.context?.hasAsset ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span>Asset assigned</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {guardConditions.context?.hasTechnician ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span>Technician assigned</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {guardConditions.context?.openMaterialRequestCount === 0 ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                        <span>No open MRs ({guardConditions.context?.openMaterialRequestCount || 0})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {guardConditions.context?.taskCount === guardConditions.context?.completedTaskCount ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                        <span>Tasks ({guardConditions.context?.completedTaskCount || 0}/{guardConditions.context?.taskCount || 0})</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Context Information */}
            {guardConditions?.context && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm text-muted-foreground mb-4">Job Card Context</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{guardConditions.context.taskCount}</div>
                      <div className="text-sm text-muted-foreground">Tasks</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-600">{guardConditions.context.completedTaskCount}</div>
                      <div className="text-sm text-muted-foreground">Completed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-600">{guardConditions.context.openMaterialRequestCount}</div>
                      <div className="text-sm text-muted-foreground">Open MRs</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${guardConditions.context.hasTechnician ? 'text-emerald-600' : 'text-red-600'}`}>
                        {guardConditions.context.hasTechnician ? 'Yes' : 'No'}
                      </div>
                      <div className="text-sm text-muted-foreground">Technician</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
