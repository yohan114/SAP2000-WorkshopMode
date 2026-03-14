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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShoppingCart, Plus, Search, Loader2, Building2, DollarSign, Calendar, 
  Truck, Eye, CheckCircle, XCircle, Package, ArrowRight, Send, FileText,
  MoreHorizontal, ChevronLeft, ChevronRight, Check, AlertCircle, FileCheck,
  Receipt, Edit, History
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/hooks';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: { id: string; supplierCode: string; name: string; status: string };
  status: string;
  orderDate: string | null;
  expectedDeliveryDate: string | null;
  currency: string;
  totalValue: number;
  lineCount: number;
  lines: Array<{
    id: string;
    itemId: string | null;
    item: { id: string; itemCode: string; name: string; unitOfMeasure: string } | null;
    description: string;
    orderedQty: number;
    receivedQty: number;
    unitPrice: number;
    totalPrice: number;
    status: string;
  }>;
  approvedAt: string | null;
  issuedAt: string | null;
  createdAt: string;
}

interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  status: string;
}

interface Item {
  id: string;
  itemCode: string;
  name: string;
  unitOfMeasure: string;
}

interface Store {
  id: string;
  code: string;
  name: string;
}

interface GRN {
  id: string;
  grnNumber: string;
  po: { id: string; poNumber: string } | null;
  supplier: { id: string; supplierCode: string; name: string };
  store: { id: string; code: string; name: string };
  status: string;
  totalValue: number;
  lineCount: number;
  lines: Array<{
    id: string;
    item: { id: string; itemCode: string; name: string };
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    unitCost: number;
    totalCost: number;
  }>;
  createdBy: { id: string; name: string };
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  po: { id: string; poNumber: string; status: string } | null;
  supplier: { id: string; supplierCode: string; name: string };
  status: string;
  matchStatus: string | null;
  totalValue: number;
  invoiceDate: string;
  dueDate: string | null;
  createdAt: string;
}

interface Amendment {
  id: string;
  amendmentNumber: number;
  amendmentType: string;
  reason: string;
  previousValue: string | null;
  newValue: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  ISSUED: 'bg-cyan-100 text-cyan-700',
  ACKNOWLEDGED: 'bg-teal-100 text-teal-700',
  PARTIALLY_RECEIVED: 'bg-purple-100 text-purple-700',
  RECEIVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-500',
  CANCELLED: 'bg-red-100 text-red-700',
  VERIFIED: 'bg-green-100 text-green-700',
  POSTED: 'bg-emerald-100 text-emerald-700',
  MATCHED: 'bg-green-100 text-green-700',
  PARTIALLY_MATCHED: 'bg-amber-100 text-amber-700',
  DISPUTED: 'bg-red-100 text-red-700',
  PAID: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-slate-100 text-slate-700',
  APPROVED: 'bg-blue-100 text-blue-700',
};

const validTransitions: Record<string, Array<{ action: string; label: string; newStatus: string }>> = {
  'DRAFT': [
    { action: 'SUBMIT', label: 'Submit for Approval', newStatus: 'PENDING_APPROVAL' },
    { action: 'CANCEL', label: 'Cancel PO', newStatus: 'CANCELLED' },
  ],
  'PENDING_APPROVAL': [
    { action: 'APPROVE', label: 'Approve', newStatus: 'APPROVED' },
    { action: 'REJECT', label: 'Send Back to Draft', newStatus: 'DRAFT' },
  ],
  'APPROVED': [
    { action: 'ISSUE', label: 'Issue to Supplier', newStatus: 'ISSUED' },
    { action: 'CANCEL', label: 'Cancel PO', newStatus: 'CANCELLED' },
  ],
  'ISSUED': [
    { action: 'RECEIVE', label: 'Create GRN', newStatus: 'PARTIALLY_RECEIVED' },
    { action: 'AMEND', label: 'Create Amendment', newStatus: 'ISSUED' },
  ],
  'ACKNOWLEDGED': [
    { action: 'RECEIVE', label: 'Create GRN', newStatus: 'PARTIALLY_RECEIVED' },
  ],
  'PARTIALLY_RECEIVED': [
    { action: 'RECEIVE', label: 'Create GRN', newStatus: 'RECEIVED' },
  ],
  'RECEIVED': [
    { action: 'CLOSE', label: 'Close PO', newStatus: 'CLOSED' },
  ],
};

export function PurchaseOrdersView() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');
  
  // PO state
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  
  // GRN state
  const [grns, setGRNs] = useState<GRN[]>([]);
  const [grnLoading, setGRNLoading] = useState(false);
  const [grnTotal, setGRNTotal] = useState(0);
  const [grnPage, setGRNPage] = useState(1);
  
  // Invoice state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [invoicePage, setInvoicePage] = useState(1);
  
  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isGRNOpen, setIsGRNOpen] = useState(false);
  const [isAmendmentOpen, setIsAmendmentOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null);
  const [grnDetailOpen, setGRNDetailOpen] = useState(false);
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: string; po: PurchaseOrder | null }>({
    open: false, action: '', po: null,
  });
  
  // Form state
  const [formData, setFormData] = useState({
    supplierId: '',
    procurementChannel: 'LOCAL',
    expectedDeliveryDate: '',
    currency: 'USD',
    terms: '',
    notes: '',
    lines: [{ itemId: '', description: '', orderedQty: 1, unitPrice: 0 }],
  });

  // GRN form
  const [grnForm, setGrnForm] = useState({
    storeId: '',
    deliveryNoteNo: '',
    deliveryDate: '',
    notes: '',
    lines: [] as Array<{ poLineId: string; itemId: string; receivedQty: number; acceptedQty: number; rejectedQty: number; unitCost: number }>,
  });

  // Amendment form
  const [amendmentForm, setAmendmentForm] = useState({
    amendmentType: 'QUANTITY_CHANGE',
    reason: '',
    previousValue: '',
    newValue: '',
    lineChanges: [] as Array<{ lineId: string; field: string; previousValue: string; newValue: string }>,
  });

  // Invoice form
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    currency: 'USD',
    totalValue: 0,
    taxAmount: 0,
    lines: [] as Array<{ description: string; invoicedQty: number; invoicedPrice: number }>,
  });

  const limit = 10;

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
    fetchItems();
    fetchStores();
  }, [page, search, statusFilter]);

  useEffect(() => {
    if (activeTab === 'grns') fetchGRNs();
    if (activeTab === 'invoices') fetchInvoices();
  }, [activeTab, grnPage, invoicePage]);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/purchase-orders?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setPurchaseOrders(data.data);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGRNs = async () => {
    try {
      setGRNLoading(true);
      const params = new URLSearchParams({ page: grnPage.toString(), limit: limit.toString() });
      const res = await fetch(`/api/grn?${params}`);
      const data = await res.json();
      if (data.success) {
        setGRNs(data.data);
        setGRNTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch GRNs:', error);
    } finally {
      setGRNLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setInvoiceLoading(true);
      const params = new URLSearchParams({ page: invoicePage.toString(), limit: limit.toString() });
      const res = await fetch(`/api/invoices?${params}`);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data);
        setInvoiceTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers?limit=100');
      const data = await res.json();
      if (data.success) setSuppliers(data.data.filter((s: Supplier) => s.status === 'ACTIVE'));
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items?limit=200');
      const data = await res.json();
      if (data.success) setItems(data.data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
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

  const fetchAmendments = async (poId: string) => {
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/amend`);
      const data = await res.json();
      if (data.success) setAmendments(data.data);
    } catch (error) {
      console.error('Failed to fetch amendments:', error);
    }
  };

  const handleTransition = async () => {
    if (!actionDialog.po || !user) return;

    try {
      setSubmitting(true);
      const transition = validTransitions[actionDialog.po.status]?.find(t => t.action === actionDialog.action);
      
      const res = await fetch(`/api/purchase-orders/${actionDialog.po.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toStatus: transition?.newStatus,
          actorId: user.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'PO status updated' });
        setActionDialog({ open: false, action: '', po: null });
        setDetailOpen(false);
        fetchPurchaseOrders();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update PO', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Transition error:', error);
      toast({ title: 'Error', description: 'Failed to update PO', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: formData.supplierId,
          procurementChannel: formData.procurementChannel,
          expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
          currency: formData.currency,
          terms: formData.terms || undefined,
          notes: formData.notes || undefined,
          lines: formData.lines
            .filter(l => l.description && l.orderedQty > 0)
            .map(l => ({
              itemId: l.itemId || undefined,
              description: l.description,
              orderedQty: l.orderedQty,
              unitPrice: l.unitPrice,
            })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Purchase order created' });
        setIsCreateOpen(false);
        resetForm();
        fetchPurchaseOrders();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create PO', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Create PO error:', error);
      toast({ title: 'Error', description: 'Failed to create PO', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const openGRNDialog = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setGrnForm({
      storeId: stores[0]?.id || '',
      deliveryNoteNo: '',
      deliveryDate: '',
      notes: '',
      lines: po.lines.map(l => ({
        poLineId: l.id,
        itemId: l.itemId || '',
        receivedQty: l.orderedQty - l.receivedQty,
        acceptedQty: l.orderedQty - l.receivedQty,
        rejectedQty: 0,
        unitCost: l.unitPrice,
      })),
    });
    setIsGRNOpen(true);
  };

  const handleCreateGRN = async () => {
    if (!selectedPO || !user) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/grn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poId: selectedPO.id,
          storeId: grnForm.storeId,
          deliveryNoteNo: grnForm.deliveryNoteNo || undefined,
          deliveryDate: grnForm.deliveryDate || undefined,
          notes: grnForm.notes || undefined,
          createdBy: user.id,
          lines: grnForm.lines
            .filter(l => l.receivedQty > 0)
            .map(l => ({
              poLineId: l.poLineId,
              itemId: l.itemId,
              receivedQty: l.receivedQty,
              acceptedQty: l.acceptedQty,
              rejectedQty: l.rejectedQty,
              unitCost: l.unitCost,
            })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'GRN created successfully' });
        setIsGRNOpen(false);
        setDetailOpen(false);
        fetchPurchaseOrders();
        if (activeTab === 'grns') fetchGRNs();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create GRN', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Create GRN error:', error);
      toast({ title: 'Error', description: 'Failed to create GRN', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessGRN = async (grnId: string) => {
    if (!user) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/grn/${grnId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postedBy: user.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: `GRN posted - ${data.data.transactionsProcessed} stock transactions created` });
        fetchGRNs();
        setGRNDetailOpen(false);
        fetchPurchaseOrders();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to process GRN', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Process GRN error:', error);
      toast({ title: 'Error', description: 'Failed to process GRN', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAmendment = async () => {
    if (!selectedPO || !user) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/purchase-orders/${selectedPO.id}/amend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...amendmentForm,
          approvedBy: user.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Amendment created successfully' });
        setIsAmendmentOpen(false);
        setDetailOpen(false);
        fetchPurchaseOrders();
        fetchAmendments(selectedPO.id);
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create amendment', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Create amendment error:', error);
      toast({ title: 'Error', description: 'Failed to create amendment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedPO || !user) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poId: selectedPO.id,
          ...invoiceForm,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: `Invoice created - Match Status: ${data.data.matchStatus}` });
        setIsInvoiceOpen(false);
        if (activeTab === 'invoices') fetchInvoices();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create invoice', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Create invoice error:', error);
      toast({ title: 'Error', description: 'Failed to create invoice', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveInvoice = async (invoiceId: string) => {
    if (!user) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/invoices/${invoiceId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: user.id }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Invoice approved' });
        fetchInvoices();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to approve', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Approve invoice error:', error);
      toast({ title: 'Error', description: 'Failed to approve invoice', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayInvoice = async (invoiceId: string, paymentRef: string) => {
    if (!user) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentRef, paidBy: user.id }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Invoice marked as paid' });
        fetchInvoices();
        fetchPurchaseOrders();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to process payment', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Pay invoice error:', error);
      toast({ title: 'Error', description: 'Failed to process payment', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      supplierId: '',
      procurementChannel: 'LOCAL',
      expectedDeliveryDate: '',
      currency: 'USD',
      terms: '',
      notes: '',
      lines: [{ itemId: '', description: '', orderedQty: 1, unitPrice: 0 }],
    });
  };

  const totalPages = Math.ceil(total / limit);

  const pendingApprovalCount = purchaseOrders.filter(po => po.status === 'PENDING_APPROVAL').length;
  const issuedCount = purchaseOrders.filter(po => ['ISSUED', 'ACKNOWLEDGED'].includes(po.status)).length;
  const totalValue = purchaseOrders.reduce((sum, po) => sum + po.totalValue, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Procurement</h2>
          <p className="text-slate-500">Purchase orders, goods receipts, and invoice matching</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />New PO
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Supplier *</Label>
                    <Select value={formData.supplierId} onValueChange={(v) => setFormData({ ...formData, supplierId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.supplierCode} - {s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Channel</Label>
                    <Select value={formData.procurementChannel} onValueChange={(v) => setFormData({ ...formData, procurementChannel: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOCAL">Local</SelectItem>
                        <SelectItem value="HEAD_OFFICE">Head Office</SelectItem>
                        <SelectItem value="DIRECT_IMPORT">Direct Import</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Expected Delivery</Label>
                    <Input type="date" value={formData.expectedDeliveryDate} onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="KES">KES</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Order Lines</Label>
                    <Button size="sm" variant="outline" onClick={() => setFormData({
                      ...formData,
                      lines: [...formData.lines, { itemId: '', description: '', orderedQty: 1, unitPrice: 0 }],
                    })}><Plus className="h-4 w-4 mr-1" />Add</Button>
                  </div>
                  {formData.lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Input placeholder="Description *" value={line.description} onChange={(e) => {
                          const newLines = [...formData.lines];
                          newLines[index] = { ...newLines[index], description: e.target.value };
                          setFormData({ ...formData, lines: newLines });
                        }} className="h-9" />
                      </div>
                      <div className="col-span-2">
                        <Input type="number" placeholder="Qty" value={line.orderedQty} onChange={(e) => {
                          const newLines = [...formData.lines];
                          newLines[index] = { ...newLines[index], orderedQty: parseFloat(e.target.value) || 0 };
                          setFormData({ ...formData, lines: newLines });
                        }} className="h-9" />
                      </div>
                      <div className="col-span-3">
                        <Input type="number" step="0.01" placeholder="Price" value={line.unitPrice} onChange={(e) => {
                          const newLines = [...formData.lines];
                          newLines[index] = { ...newLines[index], unitPrice: parseFloat(e.target.value) || 0 };
                          setFormData({ ...formData, lines: newLines });
                        }} className="h-9" />
                      </div>
                      <div className="col-span-1 text-right text-sm font-medium">
                        {(line.orderedQty * line.unitPrice).toFixed(2)}
                      </div>
                      <div className="col-span-1">
                        {formData.lines.length > 1 && (
                          <Button size="sm" variant="ghost" onClick={() => setFormData({
                            ...formData, lines: formData.lines.filter((_, i) => i !== index),
                          })} className="h-9 text-red-500">×</Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="text-right font-medium">
                    Total: {formData.currency} LKR {formData.lines.reduce((sum, l) => sum + (l.orderedQty * l.unitPrice), 0).toFixed(2)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Terms</Label>
                  <Input value={formData.terms} onChange={(e) => setFormData({ ...formData, terms: e.target.value })} placeholder="Payment terms..." />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create PO
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg"><ShoppingCart className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-sm text-slate-500">Total Orders</p><p className="text-xl font-bold">{total}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg"><AlertCircle className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-sm text-slate-500">Pending Approval</p><p className="text-xl font-bold">{pendingApprovalCount}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Truck className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-sm text-slate-500">Awaiting Delivery</p><p className="text-xl font-bold">{issuedCount}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><DollarSign className="h-5 w-5 text-purple-600" /></div>
            <div><p className="text-sm text-slate-500">Total Value</p><p className="text-xl font-bold">LKR {totalValue.toFixed(0)}</p></div>
          </div>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="grns" className="flex items-center gap-2">
            <Package className="h-4 w-4" />GRNs
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />Invoices
          </TabsTrigger>
        </TabsList>

        {/* Purchase Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          {/* Search & Filter */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Search POs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="ISSUED">Issued</SelectItem>
                    <SelectItem value="PARTIALLY_RECEIVED">Partially Received</SelectItem>
                    <SelectItem value="RECEIVED">Received</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Orders Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
              ) : purchaseOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No purchase orders found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">PO Number</TableHead>
                        <TableHead className="font-semibold">Supplier</TableHead>
                        <TableHead className="font-semibold hidden md:table-cell">Lines</TableHead>
                        <TableHead className="font-semibold text-right">Value</TableHead>
                        <TableHead className="font-semibold hidden lg:table-cell">Expected</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrders.map((po) => (
                        <TableRow key={po.id} className="cursor-pointer hover:bg-slate-50" onClick={() => { 
                          setSelectedPO(po); 
                          setDetailOpen(true); 
                          fetchAmendments(po.id);
                        }}>
                          <TableCell className="font-medium">{po.poNumber}</TableCell>
                          <TableCell>
                            <div><div className="font-medium">{po.supplier.name}</div><div className="text-xs text-slate-500">{po.supplier.supplierCode}</div></div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{po.lineCount}</TableCell>
                          <TableCell className="text-right">{po.currency} LKR {po.totalValue.toFixed(2)}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_COLORS[po.status] || ''}>{po.status.replace(/_/g, ' ')}</Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setSelectedPO(po); setDetailOpen(true); fetchAmendments(po.id); }}><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                                {po.status === 'ISSUED' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => { setSelectedPO(po); setIsAmendmentOpen(true); }}><Edit className="h-4 w-4 mr-2" />Create Amendment</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setSelectedPO(po); setIsInvoiceOpen(true); setInvoiceForm({ ...invoiceForm, lines: po.lines.map(l => ({ description: l.description, invoicedQty: l.orderedQty, invoicedPrice: l.unitPrice })) }); }}><Receipt className="h-4 w-4 mr-2" />Create Invoice</DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                {validTransitions[po.status]?.map((t) => (
                                  <DropdownMenuItem key={t.action} onClick={() => {
                                    if (t.action === 'RECEIVE') {
                                      openGRNDialog(po);
                                    } else {
                                      setActionDialog({ open: true, action: t.action, po });
                                    }
                                  }}>
                                    {t.action === 'APPROVE' && <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />}
                                    {t.action === 'ISSUE' && <Send className="h-4 w-4 mr-2 text-blue-600" />}
                                    {t.action === 'RECEIVE' && <Package className="h-4 w-4 mr-2 text-purple-600" />}
                                    {t.action === 'CANCEL' && <XCircle className="h-4 w-4 mr-2 text-red-600" />}
                                    {!['APPROVE', 'ISSUE', 'RECEIVE', 'CANCEL'].includes(t.action) && <ArrowRight className="h-4 w-4 mr-2" />}
                                    {t.label}
                                  </DropdownMenuItem>
                                ))}
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
        </TabsContent>

        {/* GRNs Tab */}
        <TabsContent value="grns" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {grnLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
              ) : grns.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No goods receipt notes found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">GRN Number</TableHead>
                        <TableHead className="font-semibold">PO</TableHead>
                        <TableHead className="font-semibold">Supplier</TableHead>
                        <TableHead className="font-semibold">Store</TableHead>
                        <TableHead className="font-semibold text-right">Value</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grns.map((grn) => (
                        <TableRow key={grn.id} className="cursor-pointer hover:bg-slate-50" onClick={() => { setSelectedGRN(grn); setGRNDetailOpen(true); }}>
                          <TableCell className="font-medium">{grn.grnNumber}</TableCell>
                          <TableCell>{grn.po?.poNumber || '-'}</TableCell>
                          <TableCell>{grn.supplier.name}</TableCell>
                          <TableCell>{grn.store.name}</TableCell>
                          <TableCell className="text-right">LKR {grn.totalValue.toFixed(2)}</TableCell>
                          <TableCell><Badge className={STATUS_COLORS[grn.status] || ''}>{grn.status}</Badge></TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            {grn.status === 'DRAFT' && (
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleProcessGRN(grn.id)}>
                                <Check className="h-4 w-4 mr-1" />Post
                              </Button>
                            )}
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

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {invoiceLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">Invoice #</TableHead>
                        <TableHead className="font-semibold">PO</TableHead>
                        <TableHead className="font-semibold">Supplier</TableHead>
                        <TableHead className="font-semibold text-right">Value</TableHead>
                        <TableHead className="font-semibold">Match Status</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                          <TableCell>{inv.po?.poNumber || '-'}</TableCell>
                          <TableCell>{inv.supplier.name}</TableCell>
                          <TableCell className="text-right">LKR {inv.totalValue.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={inv.matchStatus === 'FULL_MATCH' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                              {inv.matchStatus?.replace(/_/g, ' ') || 'PENDING'}
                            </Badge>
                          </TableCell>
                          <TableCell><Badge className={STATUS_COLORS[inv.status] || ''}>{inv.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            {inv.status === 'PENDING' && (
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApproveInvoice(inv.id)}>
                                <Check className="h-4 w-4 mr-1" />Approve
                              </Button>
                            )}
                            {inv.status === 'APPROVED' && (
                              <Button size="sm" variant="outline" onClick={() => {
                                const ref = prompt('Enter payment reference:');
                                if (ref) handlePayInvoice(inv.id, ref);
                              }}>
                                Mark Paid
                              </Button>
                            )}
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

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Purchase Order: {selectedPO?.poNumber}
              <Badge className={STATUS_COLORS[selectedPO?.status || '']}>{selectedPO?.status?.replace(/_/g, ' ')}</Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><p className="text-sm text-slate-500">Supplier</p><p className="font-medium">{selectedPO.supplier.name}</p></div>
                  <div><p className="text-sm text-slate-500">Total Value</p><p className="font-medium">{selectedPO.currency} LKR {selectedPO.totalValue.toFixed(2)}</p></div>
                  <div><p className="text-sm text-slate-500">Expected Delivery</p><p className="font-medium">{selectedPO.expectedDeliveryDate ? new Date(selectedPO.expectedDeliveryDate).toLocaleDateString() : 'Not specified'}</p></div>
                  <div><p className="text-sm text-slate-500">Created</p><p className="font-medium">{new Date(selectedPO.createdAt).toLocaleDateString()}</p></div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Order Lines</h4>
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-semibold">Description</TableHead>
                          <TableHead className="font-semibold text-center">Ordered</TableHead>
                          <TableHead className="font-semibold text-center">Received</TableHead>
                          <TableHead className="font-semibold text-right">Unit Price</TableHead>
                          <TableHead className="font-semibold text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPO.lines.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell>
                              <div><div className="font-medium">{line.description}</div>
                              {line.item && <div className="text-xs text-slate-500">{line.item.itemCode}</div>}</div>
                            </TableCell>
                            <TableCell className="text-center">{line.orderedQty}</TableCell>
                            <TableCell className="text-center">
                              <span className={line.receivedQty < line.orderedQty ? 'text-amber-600' : 'text-emerald-600'}>
                                {line.receivedQty}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">LKR {line.unitPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">LKR {line.totalPrice.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Amendments Section */}
                {amendments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2"><History className="h-4 w-4" />Amendments</h4>
                    <div className="space-y-2">
                      {amendments.map((a) => (
                        <div key={a.id} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium">Amendment #{a.amendmentNumber}</span>
                              <Badge className="ml-2" variant="outline">{a.amendmentType.replace(/_/g, ' ')}</Badge>
                            </div>
                            <span className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{a.reason}</p>
                          {a.previousValue && a.newValue && (
                            <p className="text-xs text-slate-500 mt-1">Changed from "{a.previousValue}" to "{a.newValue}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {validTransitions[selectedPO.status] && validTransitions[selectedPO.status].length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    {validTransitions[selectedPO.status].map((t) => (
                      <Button
                        key={t.action}
                        className={t.action === 'CANCEL' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                        onClick={() => {
                          if (t.action === 'RECEIVE') {
                            openGRNDialog(selectedPO);
                          } else {
                            setActionDialog({ open: true, action: t.action, po: selectedPO });
                          }
                        }}
                      >
                        {t.action === 'RECEIVE' && <Package className="h-4 w-4 mr-2" />}
                        {t.action === 'APPROVE' && <CheckCircle className="h-4 w-4 mr-2" />}
                        {t.action === 'ISSUE' && <Send className="h-4 w-4 mr-2" />}
                        {t.action === 'CANCEL' && <XCircle className="h-4 w-4 mr-2" />}
                        {t.label}
                      </Button>
                    ))}
                    {selectedPO.status === 'ISSUED' && (
                      <>
                        <Button variant="outline" onClick={() => setIsAmendmentOpen(true)}><Edit className="h-4 w-4 mr-2" />Amend</Button>
                        <Button variant="outline" onClick={() => { setInvoiceForm({ ...invoiceForm, lines: selectedPO.lines.map(l => ({ description: l.description, invoicedQty: l.orderedQty, invoicedPrice: l.unitPrice })) }); setIsInvoiceOpen(true); }}><Receipt className="h-4 w-4 mr-2" />Invoice</Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* GRN Detail Dialog */}
      <Dialog open={grnDetailOpen} onOpenChange={setGRNDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              GRN: {selectedGRN?.grnNumber}
              <Badge className={STATUS_COLORS[selectedGRN?.status || '']}>{selectedGRN?.status}</Badge>
            </DialogTitle>
          </DialogHeader>
          {selectedGRN && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><p className="text-sm text-slate-500">PO</p><p className="font-medium">{selectedGRN.po?.poNumber || 'Direct'}</p></div>
                <div><p className="text-sm text-slate-500">Supplier</p><p className="font-medium">{selectedGRN.supplier.name}</p></div>
                <div><p className="text-sm text-slate-500">Store</p><p className="font-medium">{selectedGRN.store.name}</p></div>
                <div><p className="text-sm text-slate-500">Total Value</p><p className="font-medium">LKR {selectedGRN.totalValue.toFixed(2)}</p></div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Received Items</h4>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold">Item</TableHead>
                        <TableHead className="font-semibold text-center">Received</TableHead>
                        <TableHead className="font-semibold text-center">Accepted</TableHead>
                        <TableHead className="font-semibold text-center">Rejected</TableHead>
                        <TableHead className="font-semibold text-right">Unit Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedGRN.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>{line.item.name}</TableCell>
                          <TableCell className="text-center">{line.receivedQty}</TableCell>
                          <TableCell className="text-center text-emerald-600">{line.acceptedQty}</TableCell>
                          <TableCell className="text-center text-red-600">{line.rejectedQty}</TableCell>
                          <TableCell className="text-right">LKR {line.unitCost.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {selectedGRN.status === 'DRAFT' && (
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => handleProcessGRN(selectedGRN.id)} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Check className="h-4 w-4 mr-2" />Post GRN & Update Stock
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ open, action: '', po: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'APPROVE' && 'Approve Purchase Order'}
              {actionDialog.action === 'ISSUE' && 'Issue to Supplier'}
              {actionDialog.action === 'SUBMIT' && 'Submit for Approval'}
              {actionDialog.action === 'CANCEL' && 'Cancel Purchase Order'}
            </DialogTitle>
            <DialogDescription>{actionDialog.po?.poNumber}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, action: '', po: null })}>Cancel</Button>
            <Button
              className={actionDialog.action === 'CANCEL' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}
              onClick={handleTransition}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GRN Dialog */}
      <Dialog open={isGRNOpen} onOpenChange={setIsGRNOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Goods Receipt Note</DialogTitle>
            <DialogDescription>From PO: {selectedPO?.poNumber} - {selectedPO?.supplier?.name}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Receiving Store *</Label>
                  <Select value={grnForm.storeId} onValueChange={(v) => setGrnForm({ ...grnForm, storeId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                    <SelectContent>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.code} - {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Delivery Note No</Label>
                  <Input value={grnForm.deliveryNoteNo} onChange={(e) => setGrnForm({ ...grnForm, deliveryNoteNo: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>Items to Receive</Label>
                <div className="mt-2 space-y-2">
                  {grnForm.lines.map((line, index) => {
                    const poLine = selectedPO?.lines[index];
                    if (!poLine) return null;
                    
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{poLine.description}</div>
                          <div className="text-xs text-slate-500">Ordered: {poLine.orderedQty} | Remaining: {poLine.orderedQty - poLine.receivedQty}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Received</Label>
                          <Input
                            type="number"
                            min="0"
                            max={poLine.orderedQty - poLine.receivedQty}
                            value={line.receivedQty}
                            onChange={(e) => {
                              const newLines = [...grnForm.lines];
                              const qty = Math.min(poLine.orderedQty - poLine.receivedQty, parseFloat(e.target.value) || 0);
                              newLines[index] = { ...newLines[index], receivedQty: qty, acceptedQty: qty };
                              setGrnForm({ ...grnForm, lines: newLines });
                            }}
                            className="w-20 h-9"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsGRNOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateGRN} disabled={submitting || !grnForm.storeId}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create GRN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Amendment Dialog */}
      <Dialog open={isAmendmentOpen} onOpenChange={setIsAmendmentOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create PO Amendment</DialogTitle>
            <DialogDescription>PO: {selectedPO?.poNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amendment Type</Label>
              <Select value={amendmentForm.amendmentType} onValueChange={(v) => setAmendmentForm({ ...amendmentForm, amendmentType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUANTITY_CHANGE">Quantity Change</SelectItem>
                  <SelectItem value="PRICE_CHANGE">Price Change</SelectItem>
                  <SelectItem value="DELIVERY_DATE_CHANGE">Delivery Date Change</SelectItem>
                  <SelectItem value="TERMS_CHANGE">Terms Change</SelectItem>
                  <SelectItem value="ADDITIONAL_ITEM">Add Additional Items</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea value={amendmentForm.reason} onChange={(e) => setAmendmentForm({ ...amendmentForm, reason: e.target.value })} placeholder="Reason for amendment..." />
            </div>
            {['DELIVERY_DATE_CHANGE', 'TERMS_CHANGE'].includes(amendmentForm.amendmentType) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Previous Value</Label>
                  <Input value={amendmentForm.previousValue} onChange={(e) => setAmendmentForm({ ...amendmentForm, previousValue: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>New Value</Label>
                  <Input value={amendmentForm.newValue} onChange={(e) => setAmendmentForm({ ...amendmentForm, newValue: e.target.value })} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAmendmentOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateAmendment} disabled={submitting || !amendmentForm.reason}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Amendment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={isInvoiceOpen} onOpenChange={setIsInvoiceOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Supplier Invoice</DialogTitle>
            <DialogDescription>For PO: {selectedPO?.poNumber}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Invoice Number *</Label>
                  <Input value={invoiceForm.invoiceNumber} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} placeholder="INV-001" />
                </div>
                <div className="space-y-2">
                  <Label>Invoice Date *</Label>
                  <Input type="date" value={invoiceForm.invoiceDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Total Value *</Label>
                  <Input type="number" step="0.01" value={invoiceForm.totalValue} onChange={(e) => setInvoiceForm({ ...invoiceForm, totalValue: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              
              <div>
                <Label>Invoice Lines</Label>
                <div className="mt-2 space-y-2">
                  {invoiceForm.lines.map((line, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input value={line.description} onChange={(e) => {
                        const newLines = [...invoiceForm.lines];
                        newLines[index] = { ...newLines[index], description: e.target.value };
                        setInvoiceForm({ ...invoiceForm, lines: newLines });
                      }} className="flex-1 h-9" />
                      <Input type="number" value={line.invoicedQty} onChange={(e) => {
                        const newLines = [...invoiceForm.lines];
                        newLines[index] = { ...newLines[index], invoicedQty: parseFloat(e.target.value) || 0 };
                        setInvoiceForm({ ...invoiceForm, lines: newLines });
                      }} className="w-20 h-9" />
                      <Input type="number" step="0.01" value={line.invoicedPrice} onChange={(e) => {
                        const newLines = [...invoiceForm.lines];
                        newLines[index] = { ...newLines[index], invoicedPrice: parseFloat(e.target.value) || 0 };
                        setInvoiceForm({ ...invoiceForm, lines: newLines });
                      }} className="w-24 h-9" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsInvoiceOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateInvoice} disabled={submitting || !invoiceForm.invoiceNumber || !invoiceForm.invoiceDate}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
