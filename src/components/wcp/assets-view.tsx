'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth/hooks';
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
  Truck, 
  Search, 
  Plus, 
  QrCode,
  MapPin,
  Gauge,
  AlertTriangle,
  CheckCircle,
  Wrench,
  Eye,
  Edit,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface Asset {
  id: string;
  assetNumber: string;
  name: string;
  make?: string;
  model?: string;
  yearOfManufacture?: number;
  status: string;
  criticality: string;
  currentLocation?: string;
  qrCode?: string | null;
  category?: {
    id: string;
    name: string;
    code: string;
  };
  meters?: Array<{
    meterType: string;
    unit: string;
    currentValue: number;
  }>;
  jobCardCount?: number;
  createdAt: string;
}

interface AssetCategory {
  id: string;
  code: string;
  name: string;
}

interface PaginatedResponse {
  data: Asset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const statusColors: Record<string, string> = {
  'OPERATIONAL': 'bg-emerald-100 text-emerald-700',
  'UNDER_REPAIR': 'bg-amber-100 text-amber-700',
  'OUT_OF_SERVICE': 'bg-red-100 text-red-700',
  'STANDBY': 'bg-blue-100 text-blue-700',
  'DISPOSED': 'bg-slate-100 text-muted-foreground',
};

const criticalityColors: Record<string, string> = {
  'CRITICAL': 'bg-red-100 text-red-700 border-red-200',
  'HIGH': 'bg-amber-100 text-amber-700 border-amber-200',
  'MEDIUM': 'bg-blue-100 text-blue-700 border-blue-200',
  'LOW': 'bg-slate-100 text-foreground border-slate-200',
};

export function AssetsView() {
  const { toast } = useToast();
  const { hasPrivilege } = useAuth();
  
  // Check privileges
  const canCreateAsset = hasPrivilege('ASSET_CREATE');
  const canEditAsset = hasPrivilege('ASSET_EDIT');
  const canDeleteAsset = hasPrivilege('ASSET_DELETE');
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [qrDialogAsset, setQrDialogAsset] = useState<Asset | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [jobCardDialogOpen, setJobCardDialogOpen] = useState(false);
  const [jobCardAsset, setJobCardAsset] = useState<Asset | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  
  // Form state
  const [formData, setFormData] = useState({
    assetNumber: '',
    categoryId: '',
    name: '',
    description: '',
    make: '',
    model: '',
    serialNumber: '',
    yearOfManufacture: '',
    currentLocation: '',
    status: 'OPERATIONAL' as const,
    criticality: 'MEDIUM' as const,
  });

  // Job card form state
  const [jobCardForm, setJobCardForm] = useState({
    jobType: 'CORRECTIVE' as const,
    priority: 'NORMAL' as const,
    faultDescription: '',
    diagnosisNotes: '',
    estimatedCost: '',
    estimatedDuration: '',
  });

  useEffect(() => {
    fetchAssets();
    fetchCategories();
  }, [searchTerm, statusFilter, pagination.page]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await fetch(`/api/assets?${params.toString()}`);
      if (response.ok) {
        const data: PaginatedResponse = await response.json();
        setAssets(data.data || []);
        setPagination(prev => ({ ...prev, ...data.meta }));
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load assets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/asset-categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleCreateAsset = async () => {
    if (!formData.assetNumber || !formData.categoryId || !formData.name) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          yearOfManufacture: formData.yearOfManufacture ? parseInt(formData.yearOfManufacture) : undefined,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Asset created successfully',
        });
        setCreateDialogOpen(false);
        resetForm();
        fetchAssets();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to create asset',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Create asset error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create asset',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateJobCard = async () => {
    if (!jobCardAsset || !jobCardForm.faultDescription) {
      toast({
        title: 'Validation Error',
        description: 'Please describe the fault or work required',
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
          assetId: jobCardAsset.id,
          jobType: jobCardForm.jobType,
          priority: jobCardForm.priority,
          faultDescription: jobCardForm.faultDescription,
          diagnosisNotes: jobCardForm.diagnosisNotes || undefined,
          estimatedCost: jobCardForm.estimatedCost ? parseFloat(jobCardForm.estimatedCost) : undefined,
          estimatedDuration: jobCardForm.estimatedDuration ? parseInt(jobCardForm.estimatedDuration) : undefined,
        }),
      });

      if (response.ok) {
        const newJobCard = await response.json();
        toast({
          title: 'Success',
          description: `Job card ${newJobCard.jobCardNumber || ''} created successfully`,
        });
        setJobCardDialogOpen(false);
        resetJobCardForm();
        setJobCardAsset(null);
        fetchAssets();
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

  const resetForm = () => {
    setFormData({
      assetNumber: '',
      categoryId: '',
      name: '',
      description: '',
      make: '',
      model: '',
      serialNumber: '',
      yearOfManufacture: '',
      currentLocation: '',
      status: 'OPERATIONAL',
      criticality: 'MEDIUM',
    });
  };

  const openEditDialog = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      assetNumber: asset.assetNumber,
      categoryId: asset.category?.id || '',
      name: asset.name,
      description: '',
      make: asset.make || '',
      model: asset.model || '',
      serialNumber: '',
      yearOfManufacture: asset.yearOfManufacture?.toString() || '',
      currentLocation: asset.currentLocation || '',
      status: asset.status as typeof formData.status,
      criticality: asset.criticality as typeof formData.criticality,
    });
    setEditDialogOpen(true);
  };

  const handleUpdateAsset = async () => {
    if (!editingAsset || !formData.name) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/assets/${editingAsset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          make: formData.make || undefined,
          model: formData.model || undefined,
          yearOfManufacture: formData.yearOfManufacture ? parseInt(formData.yearOfManufacture) : undefined,
          currentLocation: formData.currentLocation || undefined,
          status: formData.status,
          criticality: formData.criticality,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Asset updated successfully',
        });
        setEditDialogOpen(false);
        setEditingAsset(null);
        resetForm();
        fetchAssets();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.message || 'Failed to update asset',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Update asset error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update asset',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetJobCardForm = () => {
    setJobCardForm({
      jobType: 'CORRECTIVE',
      priority: 'NORMAL',
      faultDescription: '',
      diagnosisNotes: '',
      estimatedCost: '',
      estimatedDuration: '',
    });
  };

  const openJobCardDialog = (asset: Asset) => {
    setJobCardAsset(asset);
    resetJobCardForm();
    setJobCardDialogOpen(true);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Asset Management</h2>
          <p className="text-muted-foreground">Manage and track all workshop assets</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          {canCreateAsset && (
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Register Asset
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New Asset</DialogTitle>
              <DialogDescription>
                Add a new asset to the workshop inventory
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="assetNumber">Asset Number *</Label>
                <Input
                  id="assetNumber"
                  placeholder="e.g., VEH-001"
                  value={formData.assetNumber}
                  onChange={(e) => setFormData({ ...formData, assetNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.categoryId} onValueChange={(v) => setFormData({ ...formData, categoryId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name} ({cat.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Asset Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Toyota Hilux Pickup"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  placeholder="e.g., Toyota"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  placeholder="e.g., Hilux 2.8L"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number</Label>
                <Input
                  id="serialNumber"
                  placeholder="Serial/VIN number"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year of Manufacture</Label>
                <Input
                  id="year"
                  type="number"
                  placeholder="e.g., 2021"
                  value={formData.yearOfManufacture}
                  onChange={(e) => setFormData({ ...formData, yearOfManufacture: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Current Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Main Workshop"
                  value={formData.currentLocation}
                  onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as typeof formData.status })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPERATIONAL">Operational</SelectItem>
                    <SelectItem value="UNDER_REPAIR">Under Repair</SelectItem>
                    <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                    <SelectItem value="STANDBY">Standby</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="criticality">Criticality</Label>
                <Select value={formData.criticality} onValueChange={(v) => setFormData({ ...formData, criticality: v as typeof formData.criticality })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Additional details about the asset..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleCreateAsset}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Asset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by asset number, name, or make..."
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
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPERATIONAL">Operational</SelectItem>
                <SelectItem value="UNDER_REPAIR">Under Repair</SelectItem>
                <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                <SelectItem value="STANDBY">Standby</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Asset Number</TableHead>
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Category</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Location</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Criticality</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="h-16">
                        <div className="animate-pulse bg-slate-200 h-4 rounded w-full"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : assets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Truck className="h-8 w-8 text-slate-300" />
                        <p>No assets found</p>
                        <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Register your first asset
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  assets.map((asset) => (
                    <TableRow key={asset.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-slate-100 rounded">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                          </div>
                          {asset.assetNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          {asset.make && asset.model && (
                            <div className="text-xs text-muted-foreground">{asset.make} {asset.model}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{asset.category?.name || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {asset.currentLocation || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[asset.status] || 'bg-slate-100'}>
                          {asset.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={criticalityColors[asset.criticality] || ''}>
                          {asset.criticality}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Dialog open={detailDialogOpen && selectedAsset?.id === asset.id} onOpenChange={(open) => {
                            setDetailDialogOpen(open);
                            if (open) setSelectedAsset(asset);
                            else setSelectedAsset(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <AssetDetailDialog 
                                asset={asset} 
                                onViewQr={() => {
                                  setDetailDialogOpen(false);
                                  setQrDialogAsset(asset);
                                }}
                                onCreateJobCard={() => {
                                  setDetailDialogOpen(false);
                                  openJobCardDialog(asset);
                                }}
                              />
                            </DialogContent>
                          </Dialog>
                          {canEditAsset && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Edit Asset"
                              onClick={() => openEditDialog(asset)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => setQrDialogAsset(asset)} title="View QR Code">
                            <QrCode className="h-4 w-4" />
                          </Button>
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
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} assets
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{pagination.total}</div>
            <div className="text-sm text-muted-foreground">Total Assets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {assets.filter(a => a.status === 'OPERATIONAL').length}
            </div>
            <div className="text-sm text-muted-foreground">Operational</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {assets.filter(a => a.criticality === 'CRITICAL').length}
            </div>
            <div className="text-sm text-muted-foreground">Critical Assets</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {assets.filter(a => a.jobCardCount && a.jobCardCount > 0).length}
            </div>
            <div className="text-sm text-muted-foreground">With Active Jobs</div>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={!!qrDialogAsset} onOpenChange={() => setQrDialogAsset(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Asset QR Code
            </DialogTitle>
            <DialogDescription>
              Scan this code to quickly access asset information
            </DialogDescription>
          </DialogHeader>
          {qrDialogAsset && (
            <div className="flex flex-col items-center py-6">
              <div className="bg-card p-6 rounded-xl shadow-lg border">
                <QRCodeSVG 
                  value={qrDialogAsset.qrCode || `WCP-${qrDialogAsset.assetNumber}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <div className="mt-6 text-center">
                <p className="font-semibold text-lg">{qrDialogAsset.assetNumber}</p>
                <p className="text-muted-foreground">{qrDialogAsset.name}</p>
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  {qrDialogAsset.qrCode || `WCP-${qrDialogAsset.assetNumber}`}
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const qrData = qrDialogAsset.qrCode || `WCP-${qrDialogAsset.assetNumber}`;
                    navigator.clipboard.writeText(qrData);
                    toast({
                      title: 'Copied!',
                      description: 'QR code value copied to clipboard',
                    });
                  }}
                >
                  Copy Code
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const svg = document.querySelector('.bg-card svg');
                    if (svg) {
                      const svgData = new XMLSerializer().serializeToString(svg);
                      const canvas = document.createElement('canvas');
                      const ctx = canvas.getContext('2d');
                      const img = new Image();
                      img.onload = () => {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx?.fillRect(0, 0, canvas.width, canvas.height);
                        ctx?.drawImage(img, 0, 0);
                        const pngFile = canvas.toDataURL('image/png');
                        const downloadLink = document.createElement('a');
                        downloadLink.download = `QR-${qrDialogAsset.assetNumber}.png`;
                        downloadLink.href = pngFile;
                        downloadLink.click();
                      };
                      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                    }
                  }}
                >
                  Download PNG
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Asset Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              {editingAsset && (
                <span>Editing: <strong>{editingAsset.assetNumber}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-name">Asset Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Toyota Hilux Pickup"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-make">Make</Label>
              <Input
                id="edit-make"
                placeholder="e.g., Toyota"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-model">Model</Label>
              <Input
                id="edit-model"
                placeholder="e.g., Hilux 2.8L"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-year">Year of Manufacture</Label>
              <Input
                id="edit-year"
                type="number"
                placeholder="e.g., 2021"
                value={formData.yearOfManufacture}
                onChange={(e) => setFormData({ ...formData, yearOfManufacture: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Current Location</Label>
              <Input
                id="edit-location"
                placeholder="e.g., Main Workshop"
                value={formData.currentLocation}
                onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as typeof formData.status })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERATIONAL">Operational</SelectItem>
                  <SelectItem value="UNDER_REPAIR">Under Repair</SelectItem>
                  <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
                  <SelectItem value="STANDBY">Standby</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-criticality">Criticality</Label>
              <Select value={formData.criticality} onValueChange={(v) => setFormData({ ...formData, criticality: v as typeof formData.criticality })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Additional details about the asset..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleUpdateAsset}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Job Card Dialog */}
      <Dialog open={jobCardDialogOpen} onOpenChange={setJobCardDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Create Job Card
            </DialogTitle>
            <DialogDescription>
              {jobCardAsset && (
                <span>
                  Creating job card for: <strong>{jobCardAsset.assetNumber}</strong> - {jobCardAsset.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="jobType">Job Type</Label>
              <Select 
                value={jobCardForm.jobType} 
                onValueChange={(v) => setJobCardForm({ ...jobCardForm, jobType: v as typeof jobCardForm.jobType })}
              >
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
              <Select 
                value={jobCardForm.priority} 
                onValueChange={(v) => setJobCardForm({ ...jobCardForm, priority: v as typeof jobCardForm.priority })}
              >
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
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="faultDescription">Fault Description *</Label>
              <Textarea
                id="faultDescription"
                placeholder="Describe the fault or work required..."
                value={jobCardForm.faultDescription}
                onChange={(e) => setJobCardForm({ ...jobCardForm, faultDescription: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="diagnosisNotes">Diagnosis Notes</Label>
              <Textarea
                id="diagnosisNotes"
                placeholder="Initial diagnosis or observations..."
                value={jobCardForm.diagnosisNotes}
                onChange={(e) => setJobCardForm({ ...jobCardForm, diagnosisNotes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedCost">Estimated Cost (LKR)</Label>
              <Input
                id="estimatedCost"
                type="number"
                placeholder="0.00"
                value={jobCardForm.estimatedCost}
                onChange={(e) => setJobCardForm({ ...jobCardForm, estimatedCost: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedDuration">Estimated Duration (hours)</Label>
              <Input
                id="estimatedDuration"
                type="number"
                placeholder="0"
                value={jobCardForm.estimatedDuration}
                onChange={(e) => setJobCardForm({ ...jobCardForm, estimatedDuration: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobCardDialogOpen(false)}>
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
  );
}

function AssetDetailDialog({ asset, onViewQr, onCreateJobCard }: { 
  asset: Asset; 
  onViewQr?: () => void;
  onCreateJobCard?: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Truck className="h-5 w-5 text-muted-foreground" />
          </div>
          {asset.name}
        </DialogTitle>
        <DialogDescription>
          {asset.assetNumber} • {asset.category?.name}
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">Basic Information</h4>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Make</span>
                <span className="font-medium">{asset.make || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="font-medium">{asset.model || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Year</span>
                <span className="font-medium">{asset.yearOfManufacture || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium">{asset.currentLocation || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Status & Criticality */}
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">Status</h4>
            <div className="flex gap-3">
              <Badge className={statusColors[asset.status] || 'bg-slate-100'}>
                {asset.status}
              </Badge>
              <Badge variant="outline" className={criticalityColors[asset.criticality] || ''}>
                {asset.criticality} Criticality
              </Badge>
            </div>
          </div>
        </div>

        {/* Meter Readings */}
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">Meter Readings</h4>
            <div className="bg-muted/50 rounded-lg p-4">
              {asset.meters && asset.meters.length > 0 ? (
                asset.meters.map((meter, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{meter.meterType}</span>
                    </div>
                    <span className="font-semibold text-lg">
                      {meter.currentValue.toLocaleString()} {meter.unit}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">No meters configured</div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h4 className="font-semibold text-sm text-muted-foreground mb-2">Quick Actions</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onViewQr}>
                <QrCode className="h-4 w-4 mr-2" />
                View QR
              </Button>
              <Button variant="outline" size="sm" onClick={onCreateJobCard}>
                <Wrench className="h-4 w-4 mr-2" />
                Create Job Card
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Created Date */}
      <div className="mt-4 text-xs text-muted-foreground">
        Created: {new Date(asset.createdAt).toLocaleString()}
      </div>
    </>
  );
}
