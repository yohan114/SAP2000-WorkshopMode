'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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
import { 
  Package, Plus, Search, Loader2, Store, DollarSign, FileText, ArrowRight,
  MoreHorizontal, Eye, CheckCircle, XCircle, ShoppingCart, AlertTriangle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/hooks';

interface MaterialIssue {
  id: string;
  miNumber: string;
  store: { id: string; code: string; name: string };
  issuedTo: { id: string; name: string; email: string };
  jobCard: { id: string; jobCardNumber: string; status: string } | null;
  materialRequest: { id: string; mrNumber: string } | null;
  issueType: string;
  status: string;
  totalValue: number | null;
  lineCount: number;
  lines: Array<{
    id: string;
    item: { id: string; itemCode: string; name: string; unitOfMeasure: string };
    issuedQty: number;
    unitCost: number;
    totalCost: number;
  }>;
  issuedAt: string | null;
  createdAt: string;
}

interface Store {
  id: string;
  code: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

interface Item {
  id: string;
  itemCode: string;
  name: string;
  unitOfMeasure: string;
}

interface MRForMI {
  id: string;
  mrNumber: string;
  status: string;
  priority: string;
  jobCard: { id: string; jobCardNumber: string } | null;
  requestor: { id: string; name: string };
  linesCount: number;
  lines?: Array<{
    id: string;
    lineNumber: number;
    item: { id: string; itemCode: string; name: string; unitOfMeasure: string };
    requestedQty: number;
    approvedQty: number;
    issuedQty: number;
    remainingToIssue: number;
    canIssue: boolean;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ISSUED: 'bg-blue-100 text-blue-700',
  PARTIALLY_RETURNED: 'bg-amber-100 text-amber-700',
  RETURNED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  HIGH: 'bg-amber-100 text-amber-700 border-amber-200',
  NORMAL: 'bg-blue-100 text-blue-700 border-blue-200',
  LOW: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function MaterialIssuesView() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [materialIssues, setMaterialIssues] = useState<MaterialIssue[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isFromMROpen, setIsFromMROpen] = useState(false);
  const [selectedMI, setSelectedMI] = useState<MaterialIssue | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // MR selection state
  const [availableMRs, setAvailableMRs] = useState<MRForMI[]>([]);
  const [selectedMR, setSelectedMR] = useState<MRForMI | null>(null);
  const [mrLines, setMRLines] = useState<MRForMI['lines']>([]);
  const [issueSelections, setIssueSelections] = useState<Record<string, number>>({});
  const [selectedStoreId, setSelectedStoreId] = useState('');
  
  // Form state for direct issue
  const [formData, setFormData] = useState({
    storeId: '',
    issuedToId: '',
    jobCardId: '',
    issueType: 'STANDARD',
    notes: '',
    lines: [{ itemId: '', issuedQty: 1, unitCost: '' }],
  });

  const limit = 10;

  useEffect(() => {
    fetchMaterialIssues();
    fetchStores();
    fetchUsers();
    fetchItems();
  }, [page, search, statusFilter]);

  useEffect(() => {
    if (isFromMROpen) {
      fetchAvailableMRs();
    }
  }, [isFromMROpen]);

  const fetchMaterialIssues = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/material-issues?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setMaterialIssues(data.data);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch material issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/inventory/stores');
      const data = await res.json();
      if (data.success) setStores(data.data);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users?limit=100');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data.filter((u: User) => u.isActive));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items?limit=200');
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    }
  };

  const fetchAvailableMRs = async () => {
    try {
      const res = await fetch('/api/material-issues/from-mr');
      const data = await res.json();
      if (data.success) {
        setAvailableMRs(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch MRs:', error);
    }
  };

  const fetchMRDetails = async (mrId: string) => {
    try {
      const res = await fetch(`/api/material-issues/from-mr?mrId=${mrId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedMR(data);
        setMRLines(data.lines || []);
        // Initialize selections with max remaining qty
        const selections: Record<string, number> = {};
        data.lines?.forEach((line: { id: string; remainingToIssue: number }) => {
          selections[line.id] = line.remainingToIssue;
        });
        setIssueSelections(selections);
      }
    } catch (error) {
      console.error('Failed to fetch MR details:', error);
    }
  };

  const handleCreateFromMR = async () => {
    if (!selectedMR || !selectedStoreId || !user) return;

    const lineSelections = Object.entries(issueSelections)
      .filter(([_, qty]) => qty > 0)
      .map(([lineId, qty]) => ({
        mrLineId: lineId,
        issueQty: qty,
      }));

    if (lineSelections.length === 0) {
      toast({ title: 'Error', description: 'Please select at least one item to issue', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/material-issues/from-mr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mrId: selectedMR.id,
          storeId: selectedStoreId,
          issuedToId: selectedMR.requestor.id,
          issuedBy: user.id,
          lineSelections,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: data.message || 'Material issue created successfully' });
        setIsFromMROpen(false);
        setSelectedMR(null);
        setMRLines([]);
        setIssueSelections({});
        fetchMaterialIssues();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create issue', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Create MI from MR error:', error);
      toast({ title: 'Error', description: 'Failed to create material issue', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessIssue = async (miId: string) => {
    if (!user) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/material-issues/${miId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issuedBy: user.id }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Material issue processed successfully' });
        setDetailOpen(false);
        fetchMaterialIssues();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to process', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Process MI error:', error);
      toast({ title: 'Error', description: 'Failed to process material issue', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectCreate = async () => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/material-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: formData.storeId,
          issuedToId: formData.issuedToId,
          jobCardId: formData.jobCardId || undefined,
          issueType: formData.issueType,
          notes: formData.notes || undefined,
          lines: formData.lines
            .filter(l => l.itemId && l.issuedQty > 0)
            .map(l => ({
              itemId: l.itemId,
              issuedQty: l.issuedQty,
              unitCost: l.unitCost ? parseFloat(l.unitCost) : undefined,
            })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Material issue created' });
        setIsCreateOpen(false);
        setFormData({
          storeId: '',
          issuedToId: '',
          jobCardId: '',
          issueType: 'STANDARD',
          notes: '',
          lines: [{ itemId: '', issuedQty: 1, unitCost: '' }],
        });
        fetchMaterialIssues();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Create MI error:', error);
      toast({ title: 'Error', description: 'Failed to create material issue', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Material Issues</h2>
          <p className="text-slate-500">Issue materials from stores to employees</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isFromMROpen} onOpenChange={setIsFromMROpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                <ShoppingCart className="h-4 w-4 mr-2" />
                From MR
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Create Issue from Material Request</DialogTitle>
                <DialogDescription>Select an approved material request to process</DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-4 py-4">
                  {!selectedMR ? (
                    <>
                      <Label>Select Material Request</Label>
                      <div className="space-y-2">
                        {availableMRs.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No approved material requests available</p>
                          </div>
                        ) : (
                          availableMRs.map((mr) => (
                            <div
                              key={mr.id}
                              className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                              onClick={() => fetchMRDetails(mr.id)}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">{mr.mrNumber}</div>
                                  <div className="text-sm text-slate-500">
                                    {mr.jobCard?.jobCardNumber || 'No job card'}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Badge variant="outline" className={PRIORITY_COLORS[mr.priority]}>
                                    {mr.priority}
                                  </Badge>
                                  <Badge>{mr.linesCount} items</Badge>
                                </div>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                Requested by: {mr.requestor.name}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedMR(null); setMRLines([]); }}>
                          <ChevronLeft className="h-4 w-4 mr-1" />Back
                        </Button>
                        <span className="font-medium">{selectedMR.mrNumber}</span>
                        <Badge variant="outline" className={PRIORITY_COLORS[selectedMR.priority]}>
                          {selectedMR.priority}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <Label>Select Store *</Label>
                        <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                          <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                          <SelectContent>
                            {stores.map((store) => (
                              <SelectItem key={store.id} value={store.id}>
                                {store.code} - {store.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator />

                      <div>
                        <Label>Items to Issue</Label>
                        <div className="mt-2 space-y-2">
                          {mrLines?.map((line) => (
                            <div key={line.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                              <div className="flex-1">
                                <div className="font-medium">{line.item.name}</div>
                                <div className="text-xs text-slate-500">{line.item.itemCode}</div>
                                <div className="text-sm text-slate-600 mt-1">
                                  Approved: {line.approvedQty} | Already Issued: {line.issuedQty} | Remaining: {line.remainingToIssue}
                                </div>
                              </div>
                              <div className="w-24">
                                <Input
                                  type="number"
                                  min="0"
                                  max={line.remainingToIssue}
                                  value={issueSelections[line.id] || 0}
                                  onChange={(e) => setIssueSelections(prev => ({
                                    ...prev,
                                    [line.id]: Math.min(line.remainingToIssue, parseInt(e.target.value) || 0),
                                  }))}
                                  className="text-center"
                                />
                              </div>
                              <div className="text-xs text-slate-500 w-12">{line.item.unitOfMeasure}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>

              {selectedMR && (
                <DialogFooter className="mt-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsFromMROpen(false)}>Cancel</Button>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleCreateFromMR}
                    disabled={submitting || !selectedStoreId}
                  >
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create & Issue
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Direct Issue
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Direct Material Issue</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Store *</Label>
                    <Select value={formData.storeId} onValueChange={(v) => setFormData({ ...formData, storeId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.id} value={store.id}>{store.code} - {store.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Issue To *</Label>
                    <Select value={formData.issuedToId} onValueChange={(v) => setFormData({ ...formData, issuedToId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Issue Type</Label>
                  <Select value={formData.issueType} onValueChange={(v) => setFormData({ ...formData, issueType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STANDARD">Standard</SelectItem>
                      <SelectItem value="EMERGENCY">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Items</Label>
                    <Button size="sm" variant="outline" onClick={() => setFormData({
                      ...formData,
                      lines: [...formData.lines, { itemId: '', issuedQty: 1, unitCost: '' }],
                    })}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                  {formData.lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Select value={line.itemId} onValueChange={(v) => {
                          const newLines = [...formData.lines];
                          const selectedItem = items.find(i => i.id === v);
                          newLines[index] = { ...newLines[index], itemId: v, unitCost: selectedItem ? '' : newLines[index].unitCost };
                          setFormData({ ...formData, lines: newLines });
                        }}>
                          <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                          <SelectContent>
                            {items.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.itemCode} - {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Input type="number" placeholder="Qty" value={line.issuedQty} onChange={(e) => {
                          const newLines = [...formData.lines];
                          newLines[index] = { ...newLines[index], issuedQty: parseFloat(e.target.value) || 0 };
                          setFormData({ ...formData, lines: newLines });
                        }} />
                      </div>
                      <div className="col-span-3">
                        <Input type="number" step="0.01" placeholder="Cost" value={line.unitCost} onChange={(e) => {
                          const newLines = [...formData.lines];
                          newLines[index] = { ...newLines[index], unitCost: e.target.value };
                          setFormData({ ...formData, lines: newLines });
                        }} />
                      </div>
                      <div className="col-span-1">
                        {formData.lines.length > 1 && (
                          <Button size="sm" variant="ghost" onClick={() => setFormData({
                            ...formData,
                            lines: formData.lines.filter((_, i) => i !== index),
                          })} className="text-red-500">×</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button onClick={handleDirectCreate} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Issue
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg"><Package className="h-5 w-5 text-emerald-600" /></div>
              <div><p className="text-sm text-slate-500">Total Issues</p><p className="text-xl font-bold">{total}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Store className="h-5 w-5 text-blue-600" /></div>
              <div><p className="text-sm text-slate-500">Stores</p><p className="text-xl font-bold">{stores.length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><FileText className="h-5 w-5 text-amber-600" /></div>
              <div><p className="text-sm text-slate-500">Draft</p><p className="text-xl font-bold">{materialIssues.filter(mi => mi.status === 'DRAFT').length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><DollarSign className="h-5 w-5 text-purple-600" /></div>
              <div><p className="text-sm text-slate-500">Total Value</p><p className="text-xl font-bold">${materialIssues.reduce((sum, mi) => sum + (mi.totalValue || 0), 0).toFixed(2)}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search by MI number..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ISSUED">Issued</SelectItem>
                <SelectItem value="PARTIALLY_RETURNED">Partial Return</SelectItem>
                <SelectItem value="RETURNED">Returned</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Material Issues Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
          ) : materialIssues.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No material issues found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MI Number</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Issued To</TableHead>
                    <TableHead className="hidden md:table-cell">Source</TableHead>
                    <TableHead>Lines</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materialIssues.map((mi) => (
                    <TableRow key={mi.id} className="cursor-pointer hover:bg-slate-50" onClick={() => { setSelectedMI(mi); setDetailOpen(true); }}>
                      <TableCell className="font-medium">{mi.miNumber}</TableCell>
                      <TableCell>
                        <div><div className="font-medium">{mi.store.code}</div><div className="text-xs text-slate-500">{mi.store.name}</div></div>
                      </TableCell>
                      <TableCell>
                        <div><div className="font-medium">{mi.issuedTo.name}</div><div className="text-xs text-slate-500">{mi.issuedTo.email}</div></div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {mi.materialRequest ? (
                          <Badge variant="outline">{mi.materialRequest.mrNumber}</Badge>
                        ) : mi.jobCard ? (
                          <Badge variant="outline">{mi.jobCard.jobCardNumber}</Badge>
                        ) : <span className="text-slate-400">Direct</span>}
                      </TableCell>
                      <TableCell>{mi.lineCount}</TableCell>
                      <TableCell>${mi.totalValue ? mi.totalValue.toFixed(2) : '0.00'}</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[mi.status] || ''}>{mi.status}</Badge></TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedMI(mi); setDetailOpen(true); }}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                            {mi.status === 'DRAFT' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleProcessIssue(mi.id)} className="text-emerald-600">
                                  <CheckCircle className="h-4 w-4 mr-2" />Process Issue
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Material Issue: {selectedMI?.miNumber}
              <Badge className={STATUS_COLORS[selectedMI?.status || '']}>{selectedMI?.status}</Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedMI && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-slate-500">Store</p><p className="font-medium">{selectedMI.store.name}</p></div>
                <div><p className="text-sm text-slate-500">Issued To</p><p className="font-medium">{selectedMI.issuedTo.name}</p></div>
                <div><p className="text-sm text-slate-500">Source</p>
                  <p className="font-medium">
                    {selectedMI.materialRequest ? selectedMI.materialRequest.mrNumber : 
                     selectedMI.jobCard ? selectedMI.jobCard.jobCardNumber : 'Direct Issue'}
                  </p>
                </div>
                <div><p className="text-sm text-slate-500">Total Value</p><p className="font-medium">${selectedMI.totalValue?.toFixed(2) || '0.00'}</p></div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedMI.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <div><div className="font-medium">{line.item.name}</div><div className="text-xs text-slate-500">{line.item.itemCode}</div></div>
                        </TableCell>
                        <TableCell>{line.issuedQty} {line.item.unitOfMeasure}</TableCell>
                        <TableCell>${line.unitCost.toFixed(2)}</TableCell>
                        <TableCell>${line.totalCost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedMI.status === 'DRAFT' && (
                <div className="pt-4 border-t">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => handleProcessIssue(selectedMI.id)} disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <CheckCircle className="h-4 w-4 mr-2" />Process & Issue
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
