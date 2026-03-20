'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  Truck,
  Plus,
  Trash2,
  Play,
  CheckCircle,
  AlertTriangle,
  FileText,
  Search,
  RefreshCw,
  Loader2,
  ListChecks
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Types
interface Asset {
  id: string;
  assetNumber: string;
  name: string;
  status: string;
  category?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface PmChecklistItem {
  id: string;
  sequence: number;
  itemType: string;
  description: string;
  partRequired: boolean;
  partCode: string | null;
  quantity: number | null;
  unitOfMeasure: string | null;
  isMandatory: boolean;
  notes: string | null;
}

interface PmTemplate {
  id: string;
  code: string;
  name: string;
  assetCategory: string;
  description: string | null;
  estimatedHours: number | null;
  isActive: boolean;
  checklistItems?: PmChecklistItem[];
  _count?: {
    schedules: number;
    checklistItems: number;
  };
}

interface PmSchedule {
  id: string;
  scheduleNumber: string;
  assetId: string;
  templateId: string | null;
  pmType: string;
  calendarInterval: number | null;
  kmInterval: number | null;
  hourInterval: number | null;
  leadDays: number;
  lastExecutedAt: string | null;
  lastOdometer: number | null;
  lastHours: number | null;
  nextExecutionAt: string | null;
  nextDueKm: number | null;
  nextDueHours: number | null;
  estimatedDuration: number | null;
  priority: string;
  status: string;
  pauseReason: string | null;
  pausedAt: string | null;
  isActive: boolean;
  asset?: Asset | null;
  template?: PmTemplate | null;
  _count?: {
    executions: number;
  };
  isOverdue?: boolean;
}

interface PmExecution {
  id: string;
  executionNumber: string;
  scheduleId: string;
  jobCardId: string | null;
  scheduledDate: string | null;
  executionDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  status: string;
  odometerReading: number | null;
  hourReading: number | null;
  downtimeMinutes: number | null;
  technicianNotes: string | null;
  supervisorNotes: string | null;
  failItemsCount: number;
  schedule?: PmSchedule | null;
  executionItems?: PmExecutionItem[];
  _count?: {
    executionItems: number;
  };
  totalItems?: number;
}

interface PmExecutionItem {
  id: string;
  checklistItemId: string;
  status: string;
  measuredValue: string | null;
  notes: string | null;
  checklistItem?: PmChecklistItem | null;
}

// Form Schemas
const templateSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  assetCategory: z.string().min(1, 'Asset category is required'),
  description: z.string().optional(),
  estimatedHours: z.number().optional().nullable()
});

const scheduleSchema = z.object({
  assetId: z.string().min(1, 'Asset is required'),
  templateId: z.string().optional().nullable(),
  pmType: z.string().default('SCHEDULED'),
  calendarInterval: z.number().optional().nullable(),
  kmInterval: z.number().optional().nullable(),
  hourInterval: z.number().optional().nullable(),
  leadDays: z.number().default(7),
  estimatedDuration: z.number().optional().nullable(),
  priority: z.string().default('NORMAL')
});

const executionCompleteSchema = z.object({
  executionDate: z.string(),
  odometerReading: z.number().optional().nullable(),
  hourReading: z.number().optional().nullable(),
  downtimeMinutes: z.number().optional().nullable(),
  technicianNotes: z.string().optional(),
  supervisorNotes: z.string().optional()
});

type TemplateFormData = z.infer<typeof templateSchema>;
type ScheduleFormData = z.infer<typeof scheduleSchema>;
type ExecutionCompleteFormData = z.infer<typeof executionCompleteSchema>;

// Constants
const ASSET_CATEGORIES = [
  { value: 'LIGHT_VEHICLE', label: 'Light Vehicle' },
  { value: 'HEAVY_VEHICLE', label: 'Heavy Vehicle' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'GENERATOR', label: 'Generator' }
];

const PM_TYPES = [
  { value: 'SCHEDULED', label: 'Scheduled Maintenance' },
  { value: 'INSPECTION', label: 'Inspection' },
  { value: 'SAFETY', label: 'Safety Check' }
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' }
];

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    PAUSED: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-red-100 text-red-800',
    SCHEDULED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    DEFERRED: 'bg-orange-100 text-orange-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-700',
    NORMAL: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700',
    CRITICAL: 'bg-red-100 text-red-700'
  };
  return colors[priority] || 'bg-gray-100 text-gray-700';
};

// Helper functions
const formatDate = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString();
  } catch {
    return '-';
  }
};

export function PmView() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('schedules');
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [templates, setTemplates] = useState<PmTemplate[]>([]);
  const [schedules, setSchedules] = useState<PmSchedule[]>([]);
  const [executions, setExecutions] = useState<PmExecution[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showExecutionDialog, setShowExecutionDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PmTemplate | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<PmSchedule | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<PmExecution | null>(null);

  // Checklist items for template
  const [checklistItems, setChecklistItems] = useState<Partial<PmChecklistItem>[]>([]);
  const [executionItems, setExecutionItems] = useState<PmExecutionItem[]>([]);

  // Forms
  const templateForm = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      code: '',
      name: '',
      assetCategory: '',
      description: '',
      estimatedHours: null
    }
  });

  const scheduleForm = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      assetId: '',
      templateId: null,
      pmType: 'SCHEDULED',
      calendarInterval: null,
      kmInterval: null,
      hourInterval: null,
      leadDays: 7,
      estimatedDuration: null,
      priority: 'NORMAL'
    }
  });

  const executionCompleteForm = useForm<ExecutionCompleteFormData>({
    resolver: zodResolver(executionCompleteSchema),
    defaultValues: {
      executionDate: new Date().toISOString().split('T')[0],
      odometerReading: null,
      hourReading: null,
      downtimeMinutes: null,
      technicianNotes: '',
      supervisorNotes: ''
    }
  });

  // Fetch functions
  const fetchAssets = useCallback(async () => {
    try {
      const response = await fetch('/api/assets');
      if (response.ok) {
        const data = await response.json();
        setAssets(Array.isArray(data.assets) ? data.assets : (Array.isArray(data) ? data : []));
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/pm/templates?includeItems=true');
      if (response.ok) {
        const data = await response.json();
        setTemplates(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pm/schedules');
      if (response.ok) {
        const data = await response.json();
        setSchedules(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExecutions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pm/executions');
      if (response.ok) {
        const data = await response.json();
        setExecutions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching executions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAssets();
    fetchTemplates();
    fetchSchedules();
    fetchExecutions();
  }, [fetchAssets, fetchTemplates, fetchSchedules, fetchExecutions]);

  // Template handlers
  const handleCreateTemplate = async (data: TemplateFormData) => {
    try {
      const response = await fetch('/api/pm/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          checklistItems
        })
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Template created successfully' });
        setShowTemplateDialog(false);
        templateForm.reset();
        setChecklistItems([]);
        fetchTemplates();
      } else {
        const error = await response.json();
        toast({ variant: 'destructive', title: 'Error', description: error.error || 'Failed to create template' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create template' });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const response = await fetch(`/api/pm/templates/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Template deleted' });
        fetchTemplates();
      } else {
        const error = await response.json();
        toast({ variant: 'destructive', title: 'Error', description: error.error || 'Failed to delete template' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete template' });
    }
  };

  // Schedule handlers
  const handleCreateSchedule = async (data: ScheduleFormData) => {
    try {
      const response = await fetch('/api/pm/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Schedule created successfully' });
        setShowScheduleDialog(false);
        scheduleForm.reset();
        fetchSchedules();
      } else {
        const error = await response.json();
        toast({ variant: 'destructive', title: 'Error', description: error.error || 'Failed to create schedule' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to create schedule' });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const response = await fetch(`/api/pm/schedules/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Schedule deleted' });
        fetchSchedules();
      } else {
        const error = await response.json();
        toast({ variant: 'destructive', title: 'Error', description: error.error || 'Failed to delete schedule' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete schedule' });
    }
  };

  // Execution handlers
  const handleStartExecution = async (scheduleId: string) => {
    try {
      const response = await fetch('/api/pm/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId })
      });

      if (response.ok) {
        const execution = await response.json();
        setSelectedExecution(execution);
        setExecutionItems(Array.isArray(execution.executionItems) ? execution.executionItems : []);
        executionCompleteForm.reset({
          executionDate: new Date().toISOString().split('T')[0],
          odometerReading: null,
          hourReading: null,
          downtimeMinutes: null,
          technicianNotes: '',
          supervisorNotes: ''
        });
        setShowExecutionDialog(true);
        fetchExecutions();
      } else {
        const error = await response.json();
        toast({ variant: 'destructive', title: 'Error', description: error.error || 'Failed to start execution' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to start execution' });
    }
  };

  const handleCompleteExecution = async (data: ExecutionCompleteFormData) => {
    if (!selectedExecution) return;

    try {
      const response = await fetch(`/api/pm/executions/${selectedExecution.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          executionItems
        })
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Execution completed successfully' });
        setShowExecutionDialog(false);
        setSelectedExecution(null);
        setExecutionItems([]);
        fetchExecutions();
        fetchSchedules();
      } else {
        const error = await response.json();
        toast({ variant: 'destructive', title: 'Error', description: error.error || 'Failed to complete execution' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to complete execution' });
    }
  };

  const updateExecutionItem = (itemId: string, field: string, value: string) => {
    setExecutionItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  // Checklist item helpers
  const addChecklistItem = () => {
    setChecklistItems(prev => [
      ...prev,
      {
        sequence: prev.length + 1,
        itemType: 'INSPECT',
        description: '',
        partRequired: false,
        isMandatory: true
      }
    ]);
  };

  const updateChecklistItem = (index: number, field: string, value: string | boolean | number) => {
    setChecklistItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems(prev =>
      prev.filter((_, i) => i !== index).map((item, i) => ({
        ...item,
        sequence: i + 1
      }))
    );
  };

  // Filtered data
  const filteredSchedules = schedules.filter(s =>
    (s.asset?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (s.asset?.assetNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    s.scheduleNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExecutions = executions.filter(e =>
    e.executionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.schedule?.asset?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Stats
  const overdueCount = schedules.filter(s => s.isOverdue).length;
  const upcomingCount = schedules.filter(s => {
    if (!s.nextExecutionAt || s.isOverdue) return false;
    try {
      const next = new Date(s.nextExecutionAt);
      const weekLater = new Date();
      weekLater.setDate(weekLater.getDate() + 7);
      return next <= weekLater;
    } catch {
      return false;
    }
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Preventive Maintenance</h2>
          <p className="text-muted-foreground">Manage PM templates, schedules, and executions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchSchedules(); fetchExecutions(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{schedules.length}</p>
                <p className="text-sm text-muted-foreground">Active Schedules</p>
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
                <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{upcomingCount}</p>
                <p className="text-sm text-muted-foreground">Due This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{executions.filter(e => e.status === 'COMPLETED').length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedules
          </TabsTrigger>
          <TabsTrigger value="executions" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Executions
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Schedules Tab */}
        <TabsContent value="schedules" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>PM Schedules</CardTitle>
                  <CardDescription>Manage preventive maintenance schedules for assets</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search schedules..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => {
                        setEditingSchedule(null);
                        scheduleForm.reset();
                      }}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Schedule
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Create PM Schedule</DialogTitle>
                        <DialogDescription>
                          Set up a new preventive maintenance schedule for an asset
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={scheduleForm.handleSubmit(handleCreateSchedule)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Asset *</Label>
                            <Select
                              value={scheduleForm.watch('assetId') || ''}
                              onValueChange={(value) => scheduleForm.setValue('assetId', value)}
                            >
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
                            {scheduleForm.formState.errors.assetId && (
                              <p className="text-sm text-red-500">{scheduleForm.formState.errors.assetId.message}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Template</Label>
                            <Select
                              value={scheduleForm.watch('templateId') || ''}
                              onValueChange={(value) => scheduleForm.setValue('templateId', value || null)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select template (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                {templates.map((template) => (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.code} - {template.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>PM Type</Label>
                            <Select
                              value={scheduleForm.watch('pmType') || 'SCHEDULED'}
                              onValueChange={(value) => scheduleForm.setValue('pmType', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PM_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select
                              value={scheduleForm.watch('priority') || 'NORMAL'}
                              onValueChange={(value) => scheduleForm.setValue('priority', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PRIORITIES.map((priority) => (
                                  <SelectItem key={priority.value} value={priority.value}>
                                    {priority.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <Label className="text-base font-medium">Trigger Intervals</Label>
                          <p className="text-sm text-muted-foreground">Set one or more triggers for when PM should be performed</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Calendar (Days)</Label>
                            <Input
                              type="number"
                              placeholder="e.g., 90"
                              {...scheduleForm.register('calendarInterval', { valueAsNumber: true })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>KM Interval</Label>
                            <Input
                              type="number"
                              placeholder="e.g., 10000"
                              {...scheduleForm.register('kmInterval', { valueAsNumber: true })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Hour Interval</Label>
                            <Input
                              type="number"
                              placeholder="e.g., 250"
                              {...scheduleForm.register('hourInterval', { valueAsNumber: true })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Lead Days</Label>
                            <Input
                              type="number"
                              {...scheduleForm.register('leadDays', { valueAsNumber: true })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Est. Duration (mins)</Label>
                            <Input
                              type="number"
                              {...scheduleForm.register('estimatedDuration', { valueAsNumber: true })}
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setShowScheduleDialog(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Create Schedule</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Schedule #</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Interval</TableHead>
                        <TableHead>Next Due</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSchedules.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No schedules found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSchedules.map((schedule) => (
                          <TableRow key={schedule.id} className={schedule.isOverdue ? 'bg-red-50' : ''}>
                            <TableCell className="font-medium">{schedule.scheduleNumber}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{schedule.asset?.name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">{schedule.asset?.assetNumber || '-'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{schedule.pmType}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {schedule.calendarInterval && <span>{schedule.calendarInterval}d</span>}
                                {schedule.kmInterval && <span> / {schedule.kmInterval}km</span>}
                                {schedule.hourInterval && <span> / {schedule.hourInterval}h</span>}
                                {!schedule.calendarInterval && !schedule.kmInterval && !schedule.hourInterval && '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              {schedule.nextExecutionAt ? (
                                <div className={schedule.isOverdue ? 'text-red-600 font-medium' : ''}>
                                  {formatDate(schedule.nextExecutionAt)}
                                  {schedule.isOverdue && (
                                    <Badge variant="destructive" className="ml-2">Overdue</Badge>
                                  )}
                                </div>
                              ) : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getPriorityColor(schedule.priority)}>
                                {schedule.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(schedule.status)}>
                                {schedule.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStartExecution(schedule.id)}
                                  disabled={schedule.status !== 'ACTIVE'}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost">
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this schedule? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteSchedule(schedule.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Executions Tab */}
        <TabsContent value="executions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>PM Executions</CardTitle>
              <CardDescription>View and manage preventive maintenance executions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Execution #</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Failed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExecutions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No executions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredExecutions.map((execution) => (
                          <TableRow key={execution.id}>
                            <TableCell className="font-medium">{execution.executionNumber}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                <span>{execution.schedule?.asset?.name || 'Unknown'}</span>
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(execution.scheduledDate)}</TableCell>
                            <TableCell>{formatDate(execution.completedAt)}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(execution.status)}>
                                {execution.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{execution._count?.executionItems || execution.totalItems || 0}</TableCell>
                            <TableCell>
                              {execution.failItemsCount > 0 ? (
                                <Badge variant="destructive">{execution.failItemsCount}</Badge>
                              ) : (
                                <span className="text-green-600">0</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>PM Templates</CardTitle>
                  <CardDescription>Reusable PM checklists and procedures</CardDescription>
                </div>
                <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingTemplate(null);
                      templateForm.reset();
                      setChecklistItems([]);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create PM Template</DialogTitle>
                      <DialogDescription>
                        Define a reusable PM checklist template
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={templateForm.handleSubmit(handleCreateTemplate)} className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Code *</Label>
                          <Input
                            placeholder="e.g., PM-LV-001"
                            {...templateForm.register('code')}
                          />
                          {templateForm.formState.errors.code && (
                            <p className="text-sm text-red-500">{templateForm.formState.errors.code.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            placeholder="e.g., Light Vehicle Service"
                            {...templateForm.register('name')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Asset Category *</Label>
                          <Select
                            value={templateForm.watch('assetCategory') || ''}
                            onValueChange={(value) => templateForm.setValue('assetCategory', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {ASSET_CATEGORIES.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            placeholder="Template description..."
                            {...templateForm.register('description')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Estimated Hours</Label>
                          <Input
                            type="number"
                            step="0.5"
                            {...templateForm.register('estimatedHours', { valueAsNumber: true })}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base font-medium">Checklist Items</Label>
                            <p className="text-sm text-muted-foreground">Define the tasks for this PM template</p>
                          </div>
                          <Button type="button" variant="outline" size="sm" onClick={addChecklistItem}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                        </div>

                        <ScrollArea className="h-64 border rounded-lg p-4">
                          {checklistItems.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <ListChecks className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No checklist items added yet</p>
                              <Button type="button" variant="link" onClick={addChecklistItem}>
                                Add first item
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {checklistItems.map((item, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                  <div className="flex-shrink-0 w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium">
                                    {item.sequence}
                                  </div>
                                  <div className="flex-1 grid grid-cols-4 gap-2">
                                    <Select
                                      value={item.itemType || 'INSPECT'}
                                      onValueChange={(value) => updateChecklistItem(index, 'itemType', value)}
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="INSPECT">Inspect</SelectItem>
                                        <SelectItem value="REPLACE">Replace</SelectItem>
                                        <SelectItem value="MEASURE">Measure</SelectItem>
                                        <SelectItem value="ACTION">Action</SelectItem>
                                        <SelectItem value="TOP_UP">Top Up</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      className="col-span-2 h-8"
                                      placeholder="Description"
                                      value={item.description || ''}
                                      onChange={(e) => updateChecklistItem(index, 'description', e.target.value)}
                                    />
                                    <Input
                                      className="h-8"
                                      placeholder="Part #"
                                      value={item.partCode || ''}
                                      onChange={(e) => updateChecklistItem(index, 'partCode', e.target.value)}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeChecklistItem(index)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </div>

                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowTemplateDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Create Template</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No templates found. Create one to get started.
                  </div>
                ) : (
                  templates.map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <CardDescription>{template.code}</CardDescription>
                          </div>
                          <Badge variant="outline">{(template.assetCategory || '').replace('_', ' ')}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {template.description || 'No description'}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4 text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <ListChecks className="h-4 w-4" />
                              {template._count?.checklistItems || 0} items
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {template._count?.schedules || 0} schedules
                            </span>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this template? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteTemplate(template.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Execution Complete Dialog */}
      <Dialog open={showExecutionDialog} onOpenChange={setShowExecutionDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete PM Execution</DialogTitle>
            <DialogDescription>
              {selectedExecution?.executionNumber} - {selectedExecution?.schedule?.asset?.name || 'Unknown Asset'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={executionCompleteForm.handleSubmit(handleCompleteExecution)} className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Execution Date</Label>
                <Input
                  type="date"
                  {...executionCompleteForm.register('executionDate')}
                />
              </div>
              <div className="space-y-2">
                <Label>Odometer Reading</Label>
                <Input
                  type="number"
                  {...executionCompleteForm.register('odometerReading', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Hour Reading</Label>
                <Input
                  type="number"
                  {...executionCompleteForm.register('hourReading', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Downtime (mins)</Label>
                <Input
                  type="number"
                  {...executionCompleteForm.register('downtimeMinutes', { valueAsNumber: true })}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base font-medium">Checklist Items</Label>
              <ScrollArea className="h-64 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead className="w-32">Value</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executionItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No checklist items
                        </TableCell>
                      </TableRow>
                    ) : (
                      executionItems.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.checklistItem?.description || 'Unknown task'}</p>
                              <p className="text-xs text-muted-foreground">{item.checklistItem?.itemType || ''}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.status}
                              onValueChange={(value) => updateExecutionItem(item.id, 'status', value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="PASS">Pass</SelectItem>
                                <SelectItem value="FAIL">Fail</SelectItem>
                                <SelectItem value="REPLACED">Replaced</SelectItem>
                                <SelectItem value="SKIPPED">Skipped</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8"
                              placeholder="Value"
                              value={item.measuredValue || ''}
                              onChange={(e) => updateExecutionItem(item.id, 'measuredValue', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8"
                              placeholder="Notes"
                              value={item.notes || ''}
                              onChange={(e) => updateExecutionItem(item.id, 'notes', e.target.value)}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Technician Notes</Label>
                <Textarea
                  {...executionCompleteForm.register('technicianNotes')}
                  placeholder="Work performed, observations..."
                />
              </div>
              <div className="space-y-2">
                <Label>Supervisor Notes</Label>
                <Textarea
                  {...executionCompleteForm.register('supervisorNotes')}
                  placeholder="Review comments..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowExecutionDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Execution
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
