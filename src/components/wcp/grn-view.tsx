'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  PackageCheck, 
  Plus, 
  Search, 
  Loader2, 
  Eye,
  Printer,
  FileText,
  DollarSign,
  Clock,
  TrendingUp,
  Link,
  Unlink,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { SearchableItemSelect } from './searchable-item-select';

interface GrnHeader {
  id: string;
  grnNumber: string;
  poId: string | null;
  supplierId: string | null;
  storeId: string;
  status: string;
  grnDate: string;
  receivedBy: string | null;
  notes: string | null;
  createdAt: string;
  supplier?: { id: string; name: string; supplierCode: string };
  store?: { id: string; name: string; code: string };
  lines?: GrnLine[];
}

interface GrnLine {
  id: string;
  grnId: string;
  itemId: string;
  qtyOrdered: number;
  qtyReceived: number;
  qtyAccepted: number;
  qtyRejected: number;
  unitCost: number;
  remarks: string | null;
  batchNumber?: string;
  expiryDate?: string;
  item?: { id: string; itemCode: string; name: string; unitOfMeasure: string };
}

interface Supplier {
  id: string;
  name: string;
  supplierCode: string;
}

interface Store {
  id: string;
  name: string;
  code: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplier?: { name: string };
  orderDate: string;
  status: string;
  totalValue: number;
  lines?: { itemId: string; itemName: string; itemCode: string; quantity: number; unitPrice: number; unit: string }[];
}

interface GrnStats {
  totalGrns: number;
  totalValue: number;
  pendingVerification: number;
  avgProcessingTime: number;
  thisMonth: number;
  postedThisMonth: number;
}

const statusColors: Record<string, string> = {
  'DRAFT': 'bg-slate-100 text-slate-700',
  'SUBMITTED': 'bg-blue-100 text-blue-700',
  'VERIFIED': 'bg-purple-100 text-purple-700',
  'POSTED': 'bg-emerald-100 text-emerald-700',
  'CANCELLED': 'bg-red-100 text-red-700',
};

export function GrnView() {
  const [grns, setGrns] = useState<GrnHeader[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [stats, setStats] = useState<GrnStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showPoSelectDialog, setShowPoSelectDialog] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState<GrnHeader | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linkedPo, setLinkedPo] = useState<PurchaseOrder | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    supplierId: '',
    storeId: '',
    grnDate: new Date().toISOString().split('T')[0],
    notes: '',
    lines: [] as {
      itemId: string;
      itemCode: string;
      itemName: string;
      unit: string;
      qtyOrdered: number;
      qtyReceived: number;
      qtyAccepted: number;
      qtyRejected: number;
      unitCost: number;
      remarks: string;
      batchNumber: string;
      expiryDate: string;
    }[]
  });

  useEffect(() => {
    fetchGrns();
    fetchSuppliers();
    fetchStores();
    fetchStats();
    fetchPurchaseOrders();
  }, [statusFilter]);

  const fetchGrns = async () => {
    try {
      setLoading(true);
      let url = '/api/grn?page=1&limit=50';
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setGrns(data.data || data.grns || []);
      }
    } catch (error) {
      console.error('Failed to fetch GRNs:', error);
      toast.error('Failed to load GRNs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch('/api/grn/statistics');
      if (response.ok) {
        const data = await response.json();
        setStats(data.data || data);
      }
    } catch (error) {
      console.error('Failed to fetch GRN statistics:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers?limit=100');
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.data || data.suppliers || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/inventory/stores');
      if (response.ok) {
        const data = await response.json();
        setStores(data.data || data.stores || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await fetch('/api/purchase-orders?status=APPROVED&limit=50');
      if (response.ok) {
        const data = await response.json();
        setPurchaseOrders(data.data || data.purchaseOrders || []);
      }
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
    }
  };

  const handleLinkPo = (po: PurchaseOrder) => {
    setLinkedPo(po);
    setFormData(prev => ({
      ...prev,
      supplierId: po.supplierId,
      lines: po.lines?.map(line => ({
        itemId: line.itemId,
        itemCode: line.itemCode,
        itemName: line.itemName,
        unit: line.unit,
        qtyOrdered: line.quantity,
        qtyReceived: line.quantity,
        qtyAccepted: line.quantity,
        qtyRejected: 0,
        unitCost: line.unitPrice,
        remarks: '',
        batchNumber: '',
        expiryDate: ''
      })) || []
    }));
    setShowPoSelectDialog(false);
    toast.success(`Linked to PO ${po.poNumber}`);
  };

  const handleUnlinkPo = () => {
    setLinkedPo(null);
    setFormData(prev => ({
      ...prev,
      supplierId: '',
      lines: []
    }));
  };

  const handleCreateGrn = async () => {
    if (!formData.storeId) {
      toast.error('Please select a store');
      return;
    }
    if (formData.lines.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/grn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: formData.supplierId || null,
          storeId: formData.storeId,
          grnDate: formData.grnDate,
          notes: formData.notes,
          poId: linkedPo?.id || null,
          lines: formData.lines.map(l => ({
            itemId: l.itemId,
            qtyOrdered: l.qtyOrdered,
            qtyReceived: l.qtyReceived,
            qtyAccepted: l.qtyAccepted,
            qtyRejected: l.qtyRejected,
            unitCost: l.unitCost,
            remarks: l.remarks,
            batchNumber: l.batchNumber,
            expiryDate: l.expiryDate || null
          }))
        })
      });

      if (response.ok) {
        toast.success('GRN created successfully');
        setShowCreateDialog(false);
        resetForm();
        fetchGrns();
        fetchStats();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create GRN');
      }
    } catch (error) {
      console.error('Failed to create GRN:', error);
      toast.error('Failed to create GRN');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewGrn = async (grn: GrnHeader) => {
    try {
      const response = await fetch(`/api/grn/${grn.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedGrn(data.data || data);
        setShowViewDialog(true);
      }
    } catch (error) {
      console.error('Failed to fetch GRN details:', error);
      toast.error('Failed to load GRN details');
    }
  };

  const handleStatusChange = async (grnId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/grn/${grnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast.success(`GRN ${newStatus.toLowerCase()} successfully`);
        fetchGrns();
        fetchStats();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update GRN');
      }
    } catch (error) {
      console.error('Failed to update GRN:', error);
      toast.error('Failed to update GRN');
    }
  };

  const handlePrintGrn = () => {
    if (!selectedGrn) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const totalValue = selectedGrn.lines?.reduce((sum, line) => 
      sum + (line.qtyAccepted * line.unitCost), 0) || 0;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>GRN - ${selectedGrn.grnNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0 0; color: #666; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-item label { font-size: 12px; color: #666; display: block; }
          .info-item p { margin: 4px 0 0; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f5f5f5; }
          .text-right { text-align: right; }
          .totals { margin-top: 20px; text-align: right; }
          .totals p { margin: 5px 0; }
          .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-top: 40px; }
          .signature-box { text-align: center; }
          .signature-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>GOODS RECEIVED NOTE</h1>
          <p>WCP - Workshop Control Platform</p>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <label>GRN Number</label>
            <p>${selectedGrn.grnNumber}</p>
          </div>
          <div class="info-item">
            <label>Date</label>
            <p>${new Date(selectedGrn.grnDate).toLocaleDateString()}</p>
          </div>
          <div class="info-item">
            <label>Supplier</label>
            <p>${selectedGrn.supplier?.name || '-'}</p>
          </div>
          <div class="info-item">
            <label>Store</label>
            <p>${selectedGrn.store?.name || '-'}</p>
          </div>
          <div class="info-item">
            <label>Status</label>
            <p>${selectedGrn.status}</p>
          </div>
          <div class="info-item">
            <label>Reference</label>
            <p>${selectedGrn.poId ? 'PO Linked' : 'Direct Receipt'}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Description</th>
              <th class="text-right">Qty Received</th>
              <th class="text-right">Qty Accepted</th>
              <th class="text-right">Qty Rejected</th>
              <th class="text-right">Unit Cost</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${selectedGrn.lines?.map(line => `
              <tr>
                <td>${line.item?.itemCode || '-'}</td>
                <td>${line.item?.name || '-'}</td>
                <td class="text-right">${line.qtyReceived}</td>
                <td class="text-right">${line.qtyAccepted}</td>
                <td class="text-right">${line.qtyRejected}</td>
                <td class="text-right">$${line.unitCost.toFixed(2)}</td>
                <td class="text-right">$${(line.qtyAccepted * line.unitCost).toFixed(2)}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>

        <div class="totals">
          <p><strong>Total Value: $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></p>
        </div>

        ${selectedGrn.notes ? `<p><strong>Notes:</strong> ${selectedGrn.notes}</p>` : ''}

        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line">Received By</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Checked By</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Approved By</div>
          </div>
        </div>

        <div class="footer">
          <p style="font-size: 12px; color: #666; text-align: center;">
            Generated on ${new Date().toLocaleString()} | WCP - Workshop Control Platform
          </p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const resetForm = () => {
    setFormData({
      supplierId: '',
      storeId: '',
      grnDate: new Date().toISOString().split('T')[0],
      notes: '',
      lines: []
    });
    setLinkedPo(null);
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, {
        itemId: '',
        itemCode: '',
        itemName: '',
        unit: '',
        qtyOrdered: 0,
        qtyReceived: 0,
        qtyAccepted: 0,
        qtyRejected: 0,
        unitCost: 0,
        remarks: '',
        batchNumber: '',
        expiryDate: ''
      }]
    }));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      )
    }));
    
    // Auto-calculate accepted when received changes
    if (field === 'qtyReceived') {
      setFormData(prev => ({
        ...prev,
        lines: prev.lines.map((line, i) => 
          i === index ? { ...line, qtyAccepted: value - line.qtyRejected } : line
        )
      }));
    }
  };

  const removeLineItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  const filteredGrns = grns.filter(grn =>
    grn.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    grn.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateTotalValue = () => {
    return formData.lines.reduce((sum, line) => sum + (line.qtyAccepted * line.unitCost), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Goods Received Notes</h1>
          <p className="text-slate-500 text-sm">Manage goods received from suppliers</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          New GRN
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <PackageCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.thisMonth || 0}</p>
                <p className="text-xs text-slate-500">GRNs This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${(stats?.totalValue || 0).toLocaleString()}</p>
                <p className="text-xs text-slate-500">Total Value Received</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pendingVerification || 0}</p>
                <p className="text-xs text-slate-500">Pending Verification</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.avgProcessingTime || 0}h</p>
                <p className="text-xs text-slate-500">Avg Processing Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search GRNs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="POSTED">Posted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredGrns.length === 0 ? (
            <div className="text-center py-12">
              <PackageCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No GRNs found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>GRN Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGrns.map((grn) => (
                  <TableRow key={grn.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {grn.grnNumber}
                        {grn.poId && (
                          <Badge variant="outline" className="text-xs">
                            <Link className="h-3 w-3 mr-1" />
                            PO
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{grn.supplier?.name || '-'}</TableCell>
                    <TableCell>{grn.store?.name || '-'}</TableCell>
                    <TableCell>{new Date(grn.grnDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[grn.status] || 'bg-slate-100'}>
                        {grn.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleViewGrn(grn)} title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {grn.status === 'DRAFT' && (
                          <Button variant="ghost" size="sm" onClick={() => handleStatusChange(grn.id, 'SUBMITTED')}>
                            Submit
                          </Button>
                        )}
                        {grn.status === 'SUBMITTED' && (
                          <Button variant="ghost" size="sm" onClick={() => handleStatusChange(grn.id, 'VERIFIED')} className="text-emerald-600">
                            Verify
                          </Button>
                        )}
                        {grn.status === 'VERIFIED' && (
                          <Button variant="ghost" size="sm" onClick={() => handleStatusChange(grn.id, 'POSTED')} className="text-emerald-600">
                            Post
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create GRN Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New GRN</DialogTitle>
            <DialogDescription>Create a new Goods Received Note</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* PO Linking Section */}
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-slate-500" />
                    <div>
                      <p className="font-medium">Purchase Order Link</p>
                      <p className="text-xs text-slate-500">Link to an approved PO to auto-populate items</p>
                    </div>
                  </div>
                  {linkedPo ? (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-medium text-emerald-600">{linkedPo.poNumber}</p>
                        <p className="text-xs text-slate-500">{linkedPo.supplier?.name}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleUnlinkPo}>
                        <Unlink className="h-4 w-4 mr-1" />
                        Unlink
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => setShowPoSelectDialog(true)}>
                      <Link className="h-4 w-4 mr-2" />
                      Link PO
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Supplier</label>
                <Select value={formData.supplierId} onValueChange={(v) => setFormData(prev => ({ ...prev, supplierId: v }))} disabled={!!linkedPo}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Store *</label>
                <Select value={formData.storeId} onValueChange={(v) => setFormData(prev => ({ ...prev, storeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">GRN Date *</label>
                <Input type="date" value={formData.grnDate} onChange={(e) => setFormData(prev => ({ ...prev, grnDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Enter any notes..." rows={2} />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Line Items</h4>
                  <p className="text-xs text-slate-500">Total Value: ${calculateTotalValue().toLocaleString()}</p>
                </div>
                <Button variant="outline" size="sm" onClick={addLineItem} disabled={!!linkedPo}>
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
              </div>
              {formData.lines.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-24">Qty Ordered</TableHead>
                        <TableHead className="w-24">Received</TableHead>
                        <TableHead className="w-24">Accepted</TableHead>
                        <TableHead className="w-24">Rejected</TableHead>
                        <TableHead className="w-28">Unit Cost</TableHead>
                        <TableHead className="w-28">Batch #</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.lines.map((line, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {linkedPo ? (
                              <div>
                                <p className="font-medium">{line.itemCode}</p>
                                <p className="text-xs text-slate-500">{line.itemName}</p>
                              </div>
                            ) : (
                              <SearchableItemSelect value={line.itemId} onChange={(val, item) => {
                                if (item) {
                                  updateLineItem(index, 'itemId', val);
                                  updateLineItem(index, 'itemCode', item.itemCode);
                                  updateLineItem(index, 'itemName', item.name);
                                  updateLineItem(index, 'unit', item.unitOfMeasure || '');
                                }
                              }} storeId={formData.storeId} showStock placeholder="Select item" />
                            )}
                          </TableCell>
                          <TableCell><Input type="number" min="0" value={line.qtyOrdered} onChange={(e) => updateLineItem(index, 'qtyOrdered', parseFloat(e.target.value) || 0)} className="w-20" /></TableCell>
                          <TableCell><Input type="number" min="0" value={line.qtyReceived} onChange={(e) => updateLineItem(index, 'qtyReceived', parseFloat(e.target.value) || 0)} className="w-20" /></TableCell>
                          <TableCell><Input type="number" min="0" value={line.qtyAccepted} onChange={(e) => updateLineItem(index, 'qtyAccepted', parseFloat(e.target.value) || 0)} className="w-20" /></TableCell>
                          <TableCell><Input type="number" min="0" value={line.qtyRejected} onChange={(e) => updateLineItem(index, 'qtyRejected', parseFloat(e.target.value) || 0)} className="w-20" /></TableCell>
                          <TableCell><Input type="number" min="0" step="0.01" value={line.unitCost} onChange={(e) => updateLineItem(index, 'unitCost', parseFloat(e.target.value) || 0)} className="w-24" /></TableCell>
                          <TableCell><Input type="text" value={line.batchNumber} onChange={(e) => updateLineItem(index, 'batchNumber', e.target.value)} placeholder="Batch" className="w-24" /></TableCell>
                          <TableCell>
                            {!linkedPo && (
                              <Button variant="ghost" size="icon" onClick={() => removeLineItem(index)} className="text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateGrn} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create GRN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View GRN Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              GRN Details
              {selectedGrn?.poId && (
                <Badge variant="outline" className="text-xs">
                  <Link className="h-3 w-3 mr-1" />
                  PO Linked
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedGrn && (
            <div className="space-y-4 py-4" ref={printRef}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div><p className="text-sm text-slate-500">GRN Number</p><p className="font-medium">{selectedGrn.grnNumber}</p></div>
                <div><p className="text-sm text-slate-500">Status</p><Badge className={statusColors[selectedGrn.status]}>{selectedGrn.status}</Badge></div>
                <div><p className="text-sm text-slate-500">Supplier</p><p className="font-medium">{selectedGrn.supplier?.name || '-'}</p></div>
                <div><p className="text-sm text-slate-500">Store</p><p className="font-medium">{selectedGrn.store?.name || '-'}</p></div>
                <div><p className="text-sm text-slate-500">Date</p><p className="font-medium">{new Date(selectedGrn.grnDate).toLocaleDateString()}</p></div>
                <div><p className="text-sm text-slate-500">Total Value</p><p className="font-medium text-emerald-600">
                  ${selectedGrn.lines?.reduce((sum, l) => sum + (l.qtyAccepted * l.unitCost), 0).toLocaleString() || 0}
                </p></div>
              </div>
              {selectedGrn.notes && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm text-slate-500">Notes</p>
                  <p className="text-sm">{selectedGrn.notes}</p>
                </div>
              )}
              {selectedGrn.lines && selectedGrn.lines.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Line Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Accepted</TableHead>
                        <TableHead className="text-right">Rejected</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedGrn.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{line.item?.itemCode}</p>
                              <p className="text-xs text-slate-500">{line.item?.name}</p>
                              {line.batchNumber && <p className="text-xs text-slate-400">Batch: {line.batchNumber}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{line.qtyReceived}</TableCell>
                          <TableCell className="text-right">{line.qtyAccepted}</TableCell>
                          <TableCell className="text-right">{line.qtyRejected}</TableCell>
                          <TableCell className="text-right">${line.unitCost.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">${(line.qtyAccepted * line.unitCost).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
            <Button variant="outline" onClick={handlePrintGrn}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            {selectedGrn?.status === 'DRAFT' && (
              <Button onClick={() => { handleStatusChange(selectedGrn.id, 'SUBMITTED'); setShowViewDialog(false); }} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit
              </Button>
            )}
            {selectedGrn?.status === 'SUBMITTED' && (
              <Button onClick={() => { handleStatusChange(selectedGrn.id, 'VERIFIED'); setShowViewDialog(false); }} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify
              </Button>
            )}
            {selectedGrn?.status === 'VERIFIED' && (
              <Button onClick={() => { handleStatusChange(selectedGrn.id, 'POSTED'); setShowViewDialog(false); }} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Post to Inventory
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PO Select Dialog */}
      <Dialog open={showPoSelectDialog} onOpenChange={setShowPoSelectDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Purchase Order</DialogTitle>
            <DialogDescription>Choose an approved PO to link to this GRN</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {purchaseOrders.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No approved purchase orders available</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.poNumber}</TableCell>
                      <TableCell>{po.supplier?.name}</TableCell>
                      <TableCell>{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">${po.totalValue?.toLocaleString() || 0}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => handleLinkPo(po)} className="bg-emerald-600 hover:bg-emerald-700">
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
