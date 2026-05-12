'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Search, 
  Plus, 
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Package,
  User,
  Calendar,
  Link,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Send,
  RotateCcw,
  X,
  History,
  List,
  Minus,
  Download
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/hooks';
import { useRouter } from 'next/navigation';
import { ExportButton } from '@/components/wcp/export-button';

interface MaterialRequest {
  id: string;
  mrNumber: string;
  jobCardId?: string;
  jobCard?: {
    jobCardNumber: string;
    asset?: {
      name: string;
    };
  };
  requestorId: string;
  requestor?: {
    name: string;
  };
  requestType: string;
  priority: string;
  status: string;
  requiredBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  lines?: Array<{
    id: string;
    lineNumber: number;
    item?: {
      itemCode: string;
      name: string;
      unitOfMeasure: string;
    };
    requestedQty: number;
    approvedQty?: number;
    issuedQty?: number;
    status: string;
    availableStock?: number;
  }>;
}

interface Item {
  id: string;
  itemCode: string;
  name: string;
  unitOfMeasure: string;
  availableStock: number;
  wac: number;
}

interface JobCard {
  id: string;
  jobCardNumber: string;
  asset?: { name: string };
  status: string;
}

interface PaginatedResponse {
  data: MaterialRequest[];
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

const statusColors: Record<string, string> = {
  'DRAFT': 'bg-slate-100 text-foreground',
  'PENDING_APPROVAL': 'bg-amber-100 text-amber-700',
  'APPROVED': 'bg-blue-100 text-blue-700',
  'PARTIALLY_ISSUED': 'bg-purple-100 text-purple-700',
  'FULFILLED': 'bg-emerald-100 text-emerald-700',
  'REJECTED': 'bg-red-100 text-red-700',
  'CLOSED': 'bg-slate-100 text-muted-foreground',
  'CANCELLED': 'bg-slate-100 text-muted-foreground',
};

const priorityColors: Record<string, string> = {
  'CRITICAL': 'bg-red-100 text-red-700 border-red-200',
  'HIGH': 'bg-amber-100 text-amber-700 border-amber-200',
  'NORMAL': 'bg-blue-100 text-blue-700 border-blue-200',
  'LOW': 'bg-slate-100 text-foreground border-slate-200',
};

const requestTypeColors: Record<string, string> = {
  'JC_LINKED': 'text-blue-600',
  'GENERAL': 'text-purple-600',
  'EMERGENCY': 'text-red-600',
};

// Valid transitions for MR status
const validTransitions: Record<string, Array<{ action: string; label: string; newStatus: string }>> = {
  'DRAFT': [
    { action: 'SUBMIT', label: 'Submit for Approval', newStatus: 'PENDING_APPROVAL' },
    { action: 'CANCEL', label: 'Cancel', newStatus: 'CANCELLED' },
  ],
  'PENDING_APPROVAL': [
    { action: 'APPROVE', label: 'Approve', newStatus: 'APPROVED' },
    { action: 'REJECT', label: 'Reject', newStatus: 'REJECTED' },
  ],
  'APPROVED': [
    { action: 'CANCEL', label: 'Cancel', newStatus: 'CANCELLED' },
  ],
  'REJECTED': [
    { action: 'RESUBMIT', label: 'Edit & Resubmit', newStatus: 'DRAFT' },
  ],
  'FULFILLED': [
    { action: 'CLOSE', label: 'Close', newStatus: 'CLOSED' },
  ],
};

export function MaterialRequestsView() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMR, setSelectedMR] = useState<MaterialRequest | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{ 
    open: boolean; 
    action: 'approve' | 'reject' | 'submit' | 'cancel' | 'resubmit'; 
    mr: MaterialRequest | null 
  }>({
    open: false,
    action: 'approve',
    mr: null,
  });
  const [actionNotes, setActionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  // Create form state
  const [formData, setFormData] = useState({
    jobCardId: '',
    requestType: 'JC_LINKED',
    priority: 'NORMAL',
    requiredBy: '',
    lines: [] as Array<{ itemId: string; requestedQty: number; item?: Item }>,
  });

  useEffect(() => {
    fetchMaterialRequests();
    fetchItems();
    fetchJobCards();
  }, [searchTerm, statusFilter, pagination.page]);

  const fetchMaterialRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await fetch(`/api/material-requests?${params.toString()}`);
      if (response.ok) {
        const data: PaginatedResponse = await response.json();
        setMaterialRequests(data.data || []);
        setPagination(prev => ({ ...prev, ...data.meta }));
      }
    } catch (error) {
      console.error('Failed to fetch material requests:', error);
      toast({ title: 'Error', description: 'Failed to load material requests', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/items?limit=200');
      if (response.ok) {
        const data = await response.json();
        setItems(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const fetchJobCards = async () => {
    try {
      const response = await fetch('/api/job-cards?limit=100');
      if (response.ok) {
        const data = await response.json();
        setJobCards(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch job cards:', error);
    }
  };

  const handleCreateMR = async () => {
    if (formData.lines.length === 0) {
      toast({ title: 'Validation Error', description: 'Please add at least one item', variant: 'destructive' });
      return;
    }

    if (formData.requestType === 'JC_LINKED' && !formData.jobCardId) {
      toast({ title: 'Validation Error', description: 'Please select a job card for JC Linked requests', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/material-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobCardId: formData.jobCardId || undefined,
          requestType: formData.requestType,
          priority: formData.priority,
          requiredBy: formData.requiredBy || undefined,
          requestorId: user?.id,
          lines: formData.lines.map(l => ({
            itemId: l.itemId,
            requestedQty: l.requestedQty,
          })),
        }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Material request created successfully' });
        setCreateDialogOpen(false);
        resetForm();
        fetchMaterialRequests();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.error || 'Failed to create request', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Create MR error:', error);
      toast({ title: 'Error', description: 'Failed to create material request', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async () => {
    if (!actionDialog.mr || !user) return;

    try {
      setSubmitting(true);

      if (actionDialog.action === 'approve') {
        const response = await fetch(`/api/material-requests/${actionDialog.mr.id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            approverId: user.id,
            notes: actionNotes,
          }),
        });

        if (response.ok) {
          toast({ title: 'Success', description: 'Material request approved' });
          fetchMaterialRequests();
          if (detailDialogOpen) {
            fetchMRDetails(actionDialog.mr.id);
          }
        } else {
          const error = await response.json();
          toast({ title: 'Error', description: error.error || 'Failed to approve', variant: 'destructive' });
        }
      } else if (actionDialog.action === 'reject') {
        if (!actionNotes) {
          toast({ title: 'Validation Error', description: 'Please provide a rejection reason', variant: 'destructive' });
          setSubmitting(false);
          return;
        }
        const response = await fetch(`/api/material-requests/${actionDialog.mr.id}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toStatus: 'REJECTED',
            actorId: user.id,
            reason: actionNotes,
          }),
        });

        if (response.ok) {
          toast({ title: 'Success', description: 'Material request rejected' });
          fetchMaterialRequests();
          if (detailDialogOpen) {
            fetchMRDetails(actionDialog.mr.id);
          }
        } else {
          const error = await response.json();
          toast({ title: 'Error', description: error.error || 'Failed to reject', variant: 'destructive' });
        }
      } else if (actionDialog.action === 'submit') {
        const response = await fetch(`/api/material-requests/${actionDialog.mr.id}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toStatus: 'PENDING_APPROVAL',
            actorId: user.id,
            reason: actionNotes,
          }),
        });

        if (response.ok) {
          toast({ title: 'Success', description: 'Material request submitted for approval' });
          fetchMaterialRequests();
          if (detailDialogOpen) {
            fetchMRDetails(actionDialog.mr.id);
          }
        } else {
          const error = await response.json();
          toast({ title: 'Error', description: error.error || 'Failed to submit', variant: 'destructive' });
        }
      } else if (actionDialog.action === 'cancel') {
        const response = await fetch(`/api/material-requests/${actionDialog.mr.id}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toStatus: 'CANCELLED',
            actorId: user.id,
            reason: actionNotes || 'Cancelled by user',
          }),
        });

        if (response.ok) {
          toast({ title: 'Success', description: 'Material request cancelled' });
          fetchMaterialRequests();
          if (detailDialogOpen) {
            fetchMRDetails(actionDialog.mr.id);
          }
        } else {
          const error = await response.json();
          toast({ title: 'Error', description: error.error || 'Failed to cancel', variant: 'destructive' });
        }
      } else if (actionDialog.action === 'resubmit') {
        const response = await fetch(`/api/material-requests/${actionDialog.mr.id}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toStatus: 'DRAFT',
            actorId: user.id,
            reason: actionNotes || 'Resubmitting for approval',
          }),
        });

        if (response.ok) {
          toast({ title: 'Success', description: 'Material request moved to draft for editing' });
          fetchMaterialRequests();
          if (detailDialogOpen) {
            fetchMRDetails(actionDialog.mr.id);
          }
        } else {
          const error = await response.json();
          toast({ title: 'Error', description: error.error || 'Failed to resubmit', variant: 'destructive' });
        }
      }
    } catch (error) {
      console.error('Action error:', error);
      toast({ title: 'Error', description: 'Failed to process action', variant: 'destructive' });
    } finally {
      setSubmitting(false);
      setActionDialog({ open: false, action: 'approve', mr: null });
      setActionNotes('');
    }
  };

  const fetchMRDetails = async (mrId: string) => {
    try {
      const response = await fetch(`/api/material-requests/${mrId}/lines`);
      if (response.ok) {
        const result = await response.json();
        console.log('MR Details response:', result);
        // Only update lines if we received valid data with items
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          setSelectedMR(prev => prev ? { ...prev, lines: result.data } : null);
        } else if (!result.success) {
          console.error('API returned error:', result);
        }
      } else {
        console.error('Failed to fetch MR details, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch MR details:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      jobCardId: '',
      requestType: 'JC_LINKED',
      priority: 'NORMAL',
      requiredBy: '',
      lines: [],
    });
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { itemId: '', requestedQty: 1 }],
    }));
  };

  const removeLine = (index: number) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const updateLine = (index: number, field: 'itemId' | 'requestedQty', value: string | number) => {
    setFormData(prev => {
      const newLines = [...prev.lines];
      if (field === 'itemId') {
        const item = items.find(i => i.id === value);
        newLines[index] = { ...newLines[index], itemId: value as string, item };
      } else {
        newLines[index] = { ...newLines[index], requestedQty: value as number };
      }
      return { ...prev, lines: newLines };
    });
  };

  const openDetailDialog = (mr: MaterialRequest) => {
    setSelectedMR(mr);
    setDetailDialogOpen(true);
    fetchMRDetails(mr.id);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Material Requests</h2>
          <p className="text-muted-foreground">Request and approve materials for job cards</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            exportType="material-requests"
            filters={{
              status: statusFilter,
              search: searchTerm,
            }}
            buttonText="Export"
          />
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Create Material Request</DialogTitle>
              <DialogDescription>Request materials for maintenance work</DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto overflow-x-auto -mx-6 px-6">
              <div className="space-y-4 py-4 min-w-[600px] sm:min-w-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Request Type</Label>
                    <Select value={formData.requestType} onValueChange={(v) => setFormData({ ...formData, requestType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="JC_LINKED">Job Card Linked</SelectItem>
                        <SelectItem value="STOCK_REQUEST">Stock Request</SelectItem>
                        <SelectItem value="EMERGENCY">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.requestType === 'JC_LINKED' && (
                  <div className="space-y-2">
                    <Label>Job Card *</Label>
                    <Select value={formData.jobCardId} onValueChange={(v) => setFormData({ ...formData, jobCardId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select job card" /></SelectTrigger>
                      <SelectContent>
                        {jobCards.filter(jc => !['COMPLETED', 'CLOSED', 'CANCELLED'].includes(jc.status)).map((jc) => (
                          <SelectItem key={jc.id} value={jc.id}>
                            {jc.jobCardNumber} - {jc.asset?.name || 'Unknown Asset'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Required By</Label>
                  <Input type="date" value={formData.requiredBy} onChange={(e) => setFormData({ ...formData, requiredBy: e.target.value })} />
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Requested Items</Label>
                    <Button variant="outline" size="sm" onClick={addLine}>
                      <Plus className="h-4 w-4 mr-1" /> Add Item
                    </Button>
                  </div>
                  
                  {formData.lines.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground bg-muted/50 rounded-lg border-2 border-dashed">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No items added</p>
                      <p className="text-xs">Click "Add Item" to request materials</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.lines.map((line, index) => (
                        <div key={index} className="flex flex-col sm:flex-row items-start sm:items-end gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="w-full sm:flex-1 space-y-1 min-w-0">
                            <Label className="text-xs">Item</Label>
                            <Select value={line.itemId} onValueChange={(v) => updateLine(index, 'itemId', v)}>
                              <SelectTrigger className="w-full [&>span]:truncate"><SelectValue placeholder="Select item" /></SelectTrigger>
                              <SelectContent>
                                {items.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.itemCode} - {item.name} (Stock: {item.availableStock})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-end gap-2 w-full sm:w-auto">
                            <div className="flex-1 sm:w-24 space-y-1 shrink-0">
                              <Label className="text-xs">Qty</Label>
                              <Input type="number" min="1" value={line.requestedQty} onChange={(e) => updateLine(index, 'requestedQty', parseInt(e.target.value) || 1)} />
                            </div>
                            <div className="w-20 space-y-1 shrink-0">
                              <Label className="text-xs">Unit</Label>
                              <div className="h-10 px-3 flex items-center text-sm text-muted-foreground bg-card border rounded-md">
                                {line.item?.unitOfMeasure || '-'}
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="text-red-500 shrink-0" onClick={() => removeLine(index)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateMR} disabled={submitting || formData.lines.length === 0}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Request
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
                placeholder="Search by MR number or job card..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPagination(prev => ({ ...prev, page: 1 })); }}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PARTIALLY_ISSUED">Partially Issued</SelectItem>
                <SelectItem value="FULFILLED">Fulfilled</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Material Requests Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">MR Number</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Type</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Linked To</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Required By</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="h-14">
                        <div className="animate-pulse bg-slate-200 h-4 rounded w-full"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : materialRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-slate-300" />
                        <p>No material requests found</p>
                        <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />Create your first request
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  materialRequests.map((mr) => (
                    <TableRow key={mr.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetailDialog(mr)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded"><FileText className="h-4 w-4 text-muted-foreground" /></div>
                          <div>
                            <div className="font-medium">{mr.mrNumber}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />{mr.requestor?.name || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className={`font-medium ${requestTypeColors[mr.requestType] || ''}`}>
                          {mr.requestType === 'JC_LINKED' ? 'Job Card' : mr.requestType}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {mr.jobCard ? (
                          <div>
                            <div className="font-medium">{mr.jobCard.jobCardNumber}</div>
                            <div className="text-xs text-muted-foreground">{mr.jobCard.asset?.name}</div>
                          </div>
                        ) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priorityColors[mr.priority] || ''}>{mr.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[mr.status] || 'bg-slate-100'}>{mr.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {mr.requiredBy ? new Date(mr.requiredBy).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {mr.status === 'PENDING_APPROVAL' && (
                            <>
                              <Button variant="ghost" size="icon" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => setActionDialog({ open: true, action: 'approve', mr: mr })}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setActionDialog({ open: true, action: 'reject', mr: mr })}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetailDialog(mr)}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                              {mr.status === 'DRAFT' && <DropdownMenuItem><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}
                              {mr.status === 'APPROVED' && <DropdownMenuItem onClick={() => router.push('/wcp/material-issues')}><Package className="h-4 w-4 mr-2" />Process Issue</DropdownMenuItem>}
                              <DropdownMenuSeparator />
                              {mr.status === 'DRAFT' && (
                                <DropdownMenuItem className="text-red-600" onClick={() => setActionDialog({ open: true, action: 'cancel', mr: mr })}>
                                  <Trash2 className="h-4 w-4 mr-2" />Cancel
                                </DropdownMenuItem>
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
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} requests
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}>
              <ChevronLeft className="h-4 w-4" />Previous
            </Button>
            <span className="text-sm">Page {pagination.page} of {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}>
              Next<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{materialRequests.filter(mr => mr.status === 'PENDING_APPROVAL').length}</div>
          <div className="text-sm text-muted-foreground">Pending Approval</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{materialRequests.filter(mr => mr.status === 'APPROVED').length}</div>
          <div className="text-sm text-muted-foreground">Approved</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{materialRequests.filter(mr => mr.status === 'FULFILLED').length}</div>
          <div className="text-sm text-muted-foreground">Fulfilled</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{materialRequests.filter(mr => mr.priority === 'CRITICAL' && !['FULFILLED', 'CANCELLED', 'CLOSED'].includes(mr.status)).length}</div>
          <div className="text-sm text-muted-foreground">Critical Pending</div>
        </CardContent></Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          {selectedMR && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg"><FileText className="h-5 w-5 text-muted-foreground" /></div>
                  {selectedMR.mrNumber}
                  <Badge className={statusColors[selectedMR.status]}>{selectedMR.status}</Badge>
                </DialogTitle>
                <DialogDescription className="flex items-center gap-4">
                  <span className={`font-medium ${requestTypeColors[selectedMR.requestType] || ''}`}>
                    {selectedMR.requestType === 'JC_LINKED' ? 'Job Card Linked' : selectedMR.requestType}
                  </span>
                  {selectedMR.jobCard && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Link className="h-3 w-3" />{selectedMR.jobCard.jobCardNumber}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Requested by: <strong>{selectedMR.requestor?.name}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Required by: <strong>{selectedMR.requiredBy ? new Date(selectedMR.requiredBy).toLocaleDateString() : 'N/A'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={priorityColors[selectedMR.priority]}>{selectedMR.priority}</Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Request Lines */}
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                      <List className="h-4 w-4" />Requested Items ({selectedMR.lines?.length || 0})
                    </h4>
                    {selectedMR.lines && selectedMR.lines.length > 0 ? (
                      <div className="rounded-lg border max-h-[300px] overflow-y-auto overflow-x-auto">
                        <Table className="min-w-[600px]">
                          <TableHeader className="sticky top-0 z-10 bg-muted shadow-sm">
                            <TableRow>
                              <TableHead className="font-semibold">Item</TableHead>
                              <TableHead className="font-semibold text-center">Requested</TableHead>
                              <TableHead className="font-semibold text-center">Approved</TableHead>
                              <TableHead className="font-semibold text-center">Issued</TableHead>
                              <TableHead className="font-semibold text-center">Stock</TableHead>
                              <TableHead className="font-semibold">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedMR.lines.map((line) => (
                              <TableRow key={line.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{line.item?.name}</div>
                                    <div className="text-xs text-muted-foreground">{line.item?.itemCode}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">{line.requestedQty} {line.item?.unitOfMeasure}</TableCell>
                                <TableCell className="text-center">{line.approvedQty ?? '-'} {line.approvedQty ? line.item?.unitOfMeasure : ''}</TableCell>
                                <TableCell className="text-center">{line.issuedQty ?? '-'} {line.issuedQty ? line.item?.unitOfMeasure : ''}</TableCell>
                                <TableCell className="text-center">
                                  <span className={line.availableStock && line.availableStock < line.requestedQty ? 'text-red-600 font-medium' : ''}>
                                    {line.availableStock ?? '-'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={statusColors[line.status] || 'bg-slate-100'}>{line.status}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8 bg-muted/50 rounded-lg">No items in this request</div>
                    )}
                  </div>

                  {selectedMR.rejectionReason && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="font-medium text-red-800 text-sm">Rejection Reason</div>
                      <div className="text-sm text-red-600">{selectedMR.rejectionReason}</div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Created: {new Date(selectedMR.createdAt).toLocaleString()}
                  </div>
                </div>
              </ScrollArea>

              {/* Action Buttons */}
              {selectedMR && validTransitions[selectedMR.status]?.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {validTransitions[selectedMR.status].map((t) => (
                    <Button
                      key={t.action}
                      className={t.action === 'REJECT' || t.action === 'CANCEL' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                      onClick={() => setActionDialog({ open: true, action: t.action.toLowerCase() as 'approve' | 'reject' | 'submit' | 'cancel' | 'resubmit', mr: selectedMR })}
                    >
                      {t.action === 'APPROVE' && <CheckCircle className="h-4 w-4 mr-2" />}
                      {t.action === 'REJECT' && <XCircle className="h-4 w-4 mr-2" />}
                      {t.action === 'SUBMIT' && <Send className="h-4 w-4 mr-2" />}
                      {t.action === 'CANCEL' && <Trash2 className="h-4 w-4 mr-2" />}
                      {t.action === 'RESUBMIT' && <RotateCcw className="h-4 w-4 mr-2" />}
                      {t.label}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'approve' && 'Approve Material Request'}
              {actionDialog.action === 'reject' && 'Reject Material Request'}
              {actionDialog.action === 'submit' && 'Submit for Approval'}
              {actionDialog.action === 'cancel' && 'Cancel Material Request'}
              {actionDialog.action === 'resubmit' && 'Resubmit Material Request'}
            </DialogTitle>
            <DialogDescription>{actionDialog.mr?.mrNumber} - {actionDialog.mr?.lines?.length || 0} items</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">
                {(actionDialog.action === 'reject' || actionDialog.action === 'cancel') ? 'Reason (Required)' : 'Notes (Optional)'}
              </Label>
              <Textarea
                id="notes"
                placeholder={actionDialog.action === 'reject' ? 'Please provide a reason for rejection...' : 'Add any notes...'}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, action: 'approve', mr: null })}>Cancel</Button>
            <Button
              className={actionDialog.action === 'reject' || actionDialog.action === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}
              onClick={handleAction}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionDialog.action === 'approve' && 'Approve'}
              {actionDialog.action === 'reject' && 'Reject'}
              {actionDialog.action === 'submit' && 'Submit'}
              {actionDialog.action === 'cancel' && 'Confirm Cancel'}
              {actionDialog.action === 'resubmit' && 'Resubmit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
