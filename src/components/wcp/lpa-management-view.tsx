'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
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
import { 
  DollarSign, 
  Plus, 
  Search, 
  Loader2, 
  Edit,
  History,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

interface LpaConfig {
  id: string;
  workshopId: string;
  workshopName: string;
  lpaLimit: number;
  emergencyLpaLimit: number;
  monthlyCap: number;
  currentMonthSpend: number;
  usagePercent: string;
  remainingBudget: number;
  currentMonth: string;
  isCurrentMonth: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LpaHistory {
  id: string;
  workshopId: string;
  previousLimit: number;
  newLimit: number;
  limitChange: number;
  changeReason: string;
  changedBy: string;
  changedByName: string;
  changedByEmail: string;
  effectiveFrom: string;
  createdAt: string;
}

interface LpaSummary {
  totalWorkshops: number;
  currentMonth: string;
  totalMonthlySpend: number;
  totalMonthlyCap: number;
}

// ============================================
// COMPONENT
// ============================================

export function LpaManagementView() {
  const [configs, setConfigs] = useState<LpaConfig[]>([]);
  const [summary, setSummary] = useState<LpaSummary | null>(null);
  const [history, setHistory] = useState<LpaHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<LpaConfig | null>(null);

  const [editForm, setEditForm] = useState({
    workshopName: '',
    lpaLimit: 0,
    emergencyLpaLimit: 0,
    monthlyCap: 0,
    changeReason: '',
  });

  const [createForm, setCreateForm] = useState({
    workshopId: '',
    workshopName: '',
    lpaLimit: 25000,
    emergencyLpaLimit: 37500,
    monthlyCap: 150000,
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/lpa');
      
      if (!response.ok) {
        throw new Error('Failed to fetch LPA configurations');
      }

      const data = await response.json();
      setConfigs(data.data?.configurations || []);
      setSummary(data.data?.summary || null);
    } catch (error) {
      console.error('Failed to fetch LPA configurations:', error);
      toast.error('Failed to load LPA configurations');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (workshopId: string) => {
    try {
      const response = await fetch(`/api/lpa/${workshopId}/history`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      setHistory(data.data?.history || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
      toast.error('Failed to load change history');
    }
  };

  const handleEdit = (config: LpaConfig) => {
    setSelectedWorkshop(config);
    setEditForm({
      workshopName: config.workshopName,
      lpaLimit: config.lpaLimit,
      emergencyLpaLimit: config.emergencyLpaLimit,
      monthlyCap: config.monthlyCap,
      changeReason: '',
    });
    setShowEditDialog(true);
  };

  const handleViewHistory = async (config: LpaConfig) => {
    setSelectedWorkshop(config);
    await fetchHistory(config.workshopId);
    setShowHistoryDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedWorkshop) return;
    
    if (!editForm.changeReason.trim()) {
      toast.error('Change reason is required');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/lpa/${selectedWorkshop.workshopId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update');
      }

      toast.success('LPA configuration updated successfully');
      setShowEditDialog(false);
      fetchConfigs();
    } catch (error) {
      console.error('Failed to update LPA:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update LPA configuration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.workshopId || !createForm.workshopName) {
      toast.error('Workshop ID and Name are required');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/lpa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create');
      }

      toast.success('LPA configuration created successfully');
      setShowCreateDialog(false);
      setCreateForm({
        workshopId: '',
        workshopName: '',
        lpaLimit: 25000,
        emergencyLpaLimit: 37500,
        monthlyCap: 150000,
      });
      fetchConfigs();
    } catch (error) {
      console.error('Failed to create LPA:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create LPA configuration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (config: LpaConfig) => {
    if (!confirm(`Are you sure you want to deactivate LPA for ${config.workshopName}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/lpa/${config.workshopId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to deactivate');
      }

      toast.success('LPA configuration deactivated');
      fetchConfigs();
    } catch (error) {
      console.error('Failed to deactivate LPA:', error);
      toast.error('Failed to deactivate LPA configuration');
    }
  };

  const filteredConfigs = configs.filter(config =>
    config.workshopId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    config.workshopName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUsageColor = (usagePercent: number) => {
    if (usagePercent >= 90) return 'bg-red-500';
    if (usagePercent >= 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getUsageBadgeVariant = (usagePercent: number) => {
    if (usagePercent >= 90) return 'bg-red-100 text-red-700';
    if (usagePercent >= 75) return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-emerald-600" />
            LPA Management
          </h1>
          <p className="text-slate-500 text-sm">Manage Limited Purchase Authority configurations for workshops</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Workshop LPA
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Workshops</p>
                  <p className="text-2xl font-bold">{summary.totalWorkshops}</p>
                </div>
                <DollarSign className="h-8 w-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Monthly Cap Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.totalMonthlyCap)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Monthly Spend</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.totalMonthlySpend)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Current Month</p>
                  <p className="text-lg font-bold flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {summary.currentMonth}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by workshop ID or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* LPA Configurations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Workshop LPA Configurations</CardTitle>
          <CardDescription>
            Manage purchase authority limits for each workshop
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No LPA configurations found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workshop</TableHead>
                  <TableHead className="text-right">Standard LPA</TableHead>
                  <TableHead className="text-right">Emergency LPA</TableHead>
                  <TableHead className="text-right">Monthly Cap</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConfigs.map((config) => {
                  const usagePercent = parseFloat(config.usagePercent);
                  return (
                    <TableRow key={config.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{config.workshopName}</p>
                          <p className="text-xs text-slate-500">{config.workshopId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(config.lpaLimit)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(config.emergencyLpaLimit)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(config.monthlyCap)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>{formatCurrency(config.currentMonthSpend)}</span>
                            <Badge className={getUsageBadgeVariant(usagePercent)}>
                              {usagePercent.toFixed(1)}%
                            </Badge>
                          </div>
                          <Progress 
                            value={usagePercent} 
                            className="h-2"
                          />
                          <p className="text-xs text-slate-500">
                            Remaining: {formatCurrency(config.remainingBudget)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewHistory(config)}
                            title="View History"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(config)}
                            title="Edit LPA"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit LPA Configuration</DialogTitle>
            <DialogDescription>
              Update LPA limits for {selectedWorkshop?.workshopName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Workshop Name</label>
              <Input
                value={editForm.workshopName}
                onChange={(e) => setEditForm(prev => ({ ...prev, workshopName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Standard LPA Limit</label>
              <Input
                type="number"
                value={editForm.lpaLimit}
                onChange={(e) => setEditForm(prev => ({ ...prev, lpaLimit: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Emergency LPA Limit</label>
              <Input
                type="number"
                value={editForm.emergencyLpaLimit}
                onChange={(e) => setEditForm(prev => ({ ...prev, emergencyLpaLimit: parseFloat(e.target.value) || 0 }))}
              />
              <p className="text-xs text-slate-500">Typically 1.5x the standard limit</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Monthly Cap</label>
              <Input
                type="number"
                value={editForm.monthlyCap}
                onChange={(e) => setEditForm(prev => ({ ...prev, monthlyCap: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-red-600">Change Reason *</label>
              <Input
                value={editForm.changeReason}
                onChange={(e) => setEditForm(prev => ({ ...prev, changeReason: e.target.value }))}
                placeholder="Reason for LPA change..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>LPA Change History</DialogTitle>
            <DialogDescription>
              Historical changes for {selectedWorkshop?.workshopName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {history.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No change history available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Previous</TableHead>
                    <TableHead>New</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-sm">
                        {formatDate(h.createdAt)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatCurrency(h.previousLimit)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatCurrency(h.newLimit)}
                      </TableCell>
                      <TableCell>
                        <Badge className={h.limitChange >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                          {h.limitChange >= 0 ? '+' : ''}{formatCurrency(h.limitChange)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate" title={h.changeReason}>
                        {h.changeReason}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <p>{h.changedByName}</p>
                          <p className="text-xs text-slate-500">{h.changedByEmail}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Workshop LPA</DialogTitle>
            <DialogDescription>
              Create a new LPA configuration for a workshop
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Workshop ID *</label>
              <Input
                value={createForm.workshopId}
                onChange={(e) => setCreateForm(prev => ({ ...prev, workshopId: e.target.value }))}
                placeholder="e.g., ws-workshop-001"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Workshop Name *</label>
              <Input
                value={createForm.workshopName}
                onChange={(e) => setCreateForm(prev => ({ ...prev, workshopName: e.target.value }))}
                placeholder="e.g., Main Workshop"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Standard LPA Limit</label>
              <Input
                type="number"
                value={createForm.lpaLimit}
                onChange={(e) => setCreateForm(prev => ({ ...prev, lpaLimit: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Emergency LPA Limit</label>
              <Input
                type="number"
                value={createForm.emergencyLpaLimit}
                onChange={(e) => setCreateForm(prev => ({ ...prev, emergencyLpaLimit: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Monthly Cap</label>
              <Input
                type="number"
                value={createForm.monthlyCap}
                onChange={(e) => setCreateForm(prev => ({ ...prev, monthlyCap: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-sm">
              <p className="font-medium mb-2">Default LPA Limits by Role:</p>
              <ul className="space-y-1 text-slate-600">
                <li>• Workshop Supervisor: {formatCurrency(25000)} / Emergency: {formatCurrency(37500)}</li>
                <li>• Procurement Officer: {formatCurrency(100000)} / Emergency: {formatCurrency(150000)}</li>
                <li>• Workshop Manager: {formatCurrency(250000)} / Emergency: {formatCurrency(375000)}</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create LPA Config
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
