'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  Eye,
  Edit,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ClipboardList,
  Lock,
  Unlock,
  ArrowRightLeft,
  History,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  X,
  CheckSquare,
  ArrowRight,
  ArrowDownToLine
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth/hooks';

interface StoreStock {
  id: string;
  itemId: string;
  item: {
    itemCode: string;
    name: string;
    unitOfMeasure: string;
    itemClass: string;
    minimumStock?: number;
    reorderLevel?: number;
    isCritical?: boolean;
  };
  storeId: string;
  store: { id: string; name: string; code: string };
  availableQty: number;
  reservedQty: number;
  quarantineQty: number;
  wac: number | string;
}

interface Store {
  id: string;
  code: string;
  name: string;
}

interface Reservation {
  id: string;
  mrNumber: string;
  jobCardNumber?: string;
  requestor?: string;
  store: { code: string; name: string };
  item: { itemCode: string; name: string; unitOfMeasure: string };
  reservedQty: number;
  status: string;
  createdAt: string;
}

interface Alert {
  id: string;
  store: { id: string; code: string; name: string };
  item: { id: string; itemCode: string; name: string; unitOfMeasure: string; itemClass: string };
  availableQty: number;
  reservedQty: number;
  reorderLevel: number | null;
  minimumStock: number | null;
  shortage: number;
  alertLevel: string;
  suggestedOrderQty: number;
  stockValue: number;
}

interface Transaction {
  id: string;
  store: { code: string; name: string };
  item: { itemCode: string; name: string; unitOfMeasure: string };
  transactionType: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  performedBy?: string;
  notes?: string;
  createdAt: string;
}

interface Item {
  id: string;
  itemCode: string;
  name: string;
  description?: string;
  unitOfMeasure: string;
  itemClass: string;
  isTool: boolean;
  isCritical: boolean;
  minimumStock?: number;
  reorderLevel?: number;
  availableStock: number;
  wac: number;
}

const itemClassColors: Record<string, string> = {
  'SPARE_PART': 'bg-blue-100 text-blue-700',
  'CONSUMABLE': 'bg-emerald-100 text-emerald-700',
  'LUBRICANT': 'bg-amber-100 text-amber-700',
  'TOOL': 'bg-purple-100 text-purple-700',
};

const transactionTypeColors: Record<string, string> = {
  'RECEIPT': 'bg-emerald-100 text-emerald-700',
  'ISSUE': 'bg-blue-100 text-blue-700',
  'ADJUSTMENT_IN': 'bg-green-100 text-green-700',
  'ADJUSTMENT_OUT': 'bg-amber-100 text-amber-700',
  'TRANSFER_IN': 'bg-purple-100 text-purple-700',
  'TRANSFER_OUT': 'bg-purple-100 text-purple-700',
  'RETURN': 'bg-teal-100 text-teal-700',
};

export function InventoryView() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('stock');
  const [stockItems, setStockItems] = useState<StoreStock[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  
  // Dialogs
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StoreStock | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'>('ADJUSTMENT_IN');
  const [submitting, setSubmitting] = useState(false);

  // Bulk operation state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'ADJUST_STOCK' | 'TRANSFER_STOCK' | null>(null);
  const [bulkQty, setBulkQty] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkTargetStoreId, setBulkTargetStoreId] = useState('');
  const [bulkAdjustmentType, setBulkAdjustmentType] = useState<'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'>('ADJUSTMENT_IN');

  // Items management state
  const [items, setItems] = useState<Item[]>([]);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [itemForm, setItemForm] = useState({
    itemCode: '',
    name: '',
    description: '',
    unitOfMeasure: 'PCS',
    itemClass: 'CONSUMABLE',
    minimumStock: 0,
    reorderLevel: 0,
    isTool: false,
    isCritical: false,
  });

  // Receive stock state
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receiveForm, setReceiveForm] = useState({
    itemId: '',
    storeId: '',
    quantity: 0,
    unitCost: 0,
    notes: '',
  });

  useEffect(() => {
    fetchStock();
    fetchStores();
    fetchAlerts();
    fetchItems();
  }, [searchTerm, storeFilter, stockFilter, pagination.page]);

  useEffect(() => {
    if (activeTab === 'reservations') fetchReservations();
    if (activeTab === 'transactions') fetchTransactions();
    if (activeTab === 'items') fetchItems();
  }, [activeTab]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchTerm, storeFilter, stockFilter, pagination.page, activeTab]);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (storeFilter !== 'all') params.append('storeId', storeFilter);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await fetch(`/api/inventory/stock?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        let items = data.data || [];
        
        if (stockFilter === 'low') {
          items = items.filter((item: StoreStock) => 
            item.item.reorderLevel && item.availableQty <= item.item.reorderLevel && item.availableQty > 0
          );
        } else if (stockFilter === 'out') {
          items = items.filter((item: StoreStock) => item.availableQty === 0);
        }
        
        setStockItems(items);
        setPagination(prev => ({ ...prev, total: data.meta?.total || items.length }));
      }
    } catch (error) {
      console.error('Failed to fetch stock:', error);
      toast({ title: 'Error', description: 'Failed to load inventory', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/inventory/stores');
      if (response.ok) {
        const data = await response.json();
        setStores(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/inventory/alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const fetchReservations = async () => {
    try {
      const response = await fetch('/api/inventory/reservations?status=ACTIVE');
      if (response.ok) {
        const data = await response.json();
        setReservations(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/inventory/transactions?limit=50');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      params.append('limit', '100');
      
      const response = await fetch(`/api/items?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!itemForm.itemCode || !itemForm.name || !itemForm.unitOfMeasure) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemForm),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Item created successfully' });
        setAddItemDialogOpen(false);
        setItemForm({
          itemCode: '',
          name: '',
          description: '',
          unitOfMeasure: 'PCS',
          itemClass: 'CONSUMABLE',
          minimumStock: 0,
          reorderLevel: 0,
          isTool: false,
          isCritical: false,
        });
        fetchItems();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.error || 'Failed to create item', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Add item error:', error);
      toast({ title: 'Error', description: 'Failed to create item', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiveStock = async () => {
    if (!receiveForm.itemId || !receiveForm.storeId || receiveForm.quantity <= 0 || !user) {
      toast({ title: 'Validation Error', description: 'Please select an item, store, and enter a valid quantity', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/inventory/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: receiveForm.storeId,
          itemId: receiveForm.itemId,
          transactionType: 'RECEIPT',
          quantity: receiveForm.quantity,
          unitCost: receiveForm.unitCost,
          notes: receiveForm.notes,
          performedBy: user.id,
        }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Stock received successfully' });
        setReceiveDialogOpen(false);
        setReceiveForm({
          itemId: '',
          storeId: '',
          quantity: 0,
          unitCost: 0,
          notes: '',
        });
        fetchStock();
        fetchAlerts();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.error || 'Failed to receive stock', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Receive stock error:', error);
      toast({ title: 'Error', description: 'Failed to receive stock', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(stockItems.map(item => item.id)));
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
    if (selectedIds.size === 0 || !user) return;

    try {
      setSubmitting(true);
      const stockIds = Array.from(selectedIds);

      let requestBody: Record<string, unknown> = { stockIds };

      switch (bulkAction) {
        case 'ADJUST_STOCK':
          requestBody = {
            ...requestBody,
            operation: 'ADJUST_STOCK',
            adjustmentType: bulkAdjustmentType,
            quantity: parseFloat(bulkQty),
            reason: bulkReason,
            performedBy: user.id,
          };
          break;
        case 'TRANSFER_STOCK':
          requestBody = {
            ...requestBody,
            operation: 'TRANSFER_STOCK',
            targetStoreId: bulkTargetStoreId,
            notes: bulkReason,
            performedBy: user.id,
          };
          break;
      }

      const response = await fetch('/api/inventory/bulk', {
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
        fetchStock();
        fetchAlerts();
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
    setBulkQty('');
    setBulkReason('');
    setBulkTargetStoreId('');
    setBulkAdjustmentType('ADJUSTMENT_IN');
  };

  const openBulkDialog = (action: 'ADJUST_STOCK' | 'TRANSFER_STOCK') => {
    setBulkAction(action);
    setBulkDialogOpen(true);
  };

  const getBulkDialogTitle = () => {
    switch (bulkAction) {
      case 'ADJUST_STOCK': return 'Bulk Stock Adjustment';
      case 'TRANSFER_STOCK': return 'Bulk Stock Transfer';
      default: return 'Bulk Operation';
    }
  };

  const getBulkDialogDescription = () => {
    const count = selectedIds.size;
    switch (bulkAction) {
      case 'ADJUST_STOCK': return `Adjust stock for ${count} selected item(s)`;
      case 'TRANSFER_STOCK': return `Transfer ${count} selected item(s) to another store`;
      default: return '';
    }
  };

  const handleAdjustment = async () => {
    if (!selectedStock || !adjustmentQty || !user) return;

    try {
      setSubmitting(true);
      const response = await fetch('/api/inventory/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStock.storeId,
          itemId: selectedStock.itemId,
          transactionType: adjustmentType,
          quantity: parseFloat(adjustmentQty),
          unitCost: Number(selectedStock.wac),
          notes: adjustmentReason,
          performedBy: user.id,
        }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Stock adjusted successfully' });
        setAdjustDialogOpen(false);
        setSelectedStock(null);
        setAdjustmentQty('');
        setAdjustmentReason('');
        fetchStock();
        fetchAlerts();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.error || 'Failed to adjust stock', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Adjustment error:', error);
      toast({ title: 'Error', description: 'Failed to adjust stock', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStockStatus = (item: StoreStock) => {
    if (item.availableQty === 0) return { status: 'OUT_OF_STOCK', color: 'bg-red-500', label: 'Out of Stock' };
    if (item.item.reorderLevel && item.availableQty <= item.item.reorderLevel) return { status: 'LOW_STOCK', color: 'bg-amber-500', label: 'Low Stock' };
    return { status: 'IN_STOCK', color: 'bg-emerald-500', label: 'In Stock' };
  };

  const totalValue = stockItems.reduce((sum, item) => sum + (item.availableQty * Number(item.wac)), 0);
  const lowStockCount = alerts.filter(a => a.alertLevel !== 'CRITICAL').length;
  const outOfStockCount = alerts.filter(a => a.alertLevel === 'CRITICAL').length;

  const allSelected = stockItems.length > 0 && selectedIds.size === stockItems.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < stockItems.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && activeTab === 'stock' && (
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openBulkDialog('ADJUST_STOCK')}
                >
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Adjust Stock
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openBulkDialog('TRANSFER_STOCK')}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Transfer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Inventory Management</h2>
          <p className="text-muted-foreground">Track stock levels, manage reservations, and perform stock takes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveTab('transactions')}>
            <History className="h-4 w-4 mr-2" />
            Transactions
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setAddItemDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={async () => { 
            // Fetch all items without search filter for the dialog
            try {
              const response = await fetch('/api/items?limit=100');
              if (response.ok) {
                const data = await response.json();
                setItems(data.data || []);
              }
            } catch (e) {
              console.error('Failed to fetch items:', e);
            }
            setReceiveDialogOpen(true); 
          }}>
            <ArrowDownToLine className="h-4 w-4 mr-2" />
            Receive Stock
          </Button>
          <Button variant="outline" onClick={() => { setSelectedStock(null); setAdjustDialogOpen(true); }}>
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Adjust Stock
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{stockItems.length}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">LKR {totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Out of Stock</p>
                <p className="text-2xl font-bold text-red-700">{outOfStockCount}</p>
              </div>
              <Minus className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700">Low Stock</p>
                <p className="text-2xl font-bold text-amber-700">{lowStockCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Reserved</p>
                <p className="text-2xl font-bold text-blue-700">{reservations.length}</p>
              </div>
              <Lock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="stock"><Package className="h-4 w-4 mr-2" />Stock</TabsTrigger>
          <TabsTrigger value="items"><Package className="h-4 w-4 mr-2" />Items</TabsTrigger>
          <TabsTrigger value="alerts" className="relative">
            <AlertCircle className="h-4 w-4 mr-2" />
            Alerts
            {alerts.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white text-xs">{alerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reservations"><Lock className="h-4 w-4 mr-2" />Reservations</TabsTrigger>
          <TabsTrigger value="transactions"><History className="h-4 w-4 mr-2" />Transactions</TabsTrigger>
        </TabsList>

        {/* Stock Tab */}
        <TabsContent value="stock" className="space-y-4 mt-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by item code or name..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                    className="pl-10"
                  />
                </div>
                <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setPagination(prev => ({ ...prev, page: 1 })); }}>
                  <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Stock Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={storeFilter} onValueChange={(v) => { setStoreFilter(v); setPagination(prev => ({ ...prev, page: 1 })); }}>
                  <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Store" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Stock Table */}
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
                      <TableHead className="font-semibold">Item</TableHead>
                      <TableHead className="font-semibold hidden lg:table-cell">Class</TableHead>
                      <TableHead className="font-semibold text-center">Available</TableHead>
                      <TableHead className="font-semibold text-center hidden sm:table-cell">Reserved</TableHead>
                      <TableHead className="font-semibold text-right">WAC</TableHead>
                      <TableHead className="font-semibold text-right">Value</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={9} className="h-14"><div className="animate-pulse bg-slate-200 h-4 rounded w-full"></div></TableCell>
                        </TableRow>
                      ))
                    ) : stockItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-8 w-8 text-slate-300" />
                            <p>No inventory items found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      stockItems.map((item) => {
                        const stockStatus = getStockStatus(item);
                        const itemValue = item.availableQty * Number(item.wac);
                        const stockLevel = item.item.minimumStock 
                          ? Math.min(100, (item.availableQty / item.item.minimumStock) * 100)
                          : 100;
                        
                        return (
                          <TableRow key={item.id} className={`hover:bg-muted/50 ${selectedIds.has(item.id) ? 'bg-emerald-50' : ''}`}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(item.id)}
                                onCheckedChange={(checked) => handleSelectOne(item.id, checked as boolean)}
                                aria-label={`Select ${item.item.name}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 rounded"><Package className="h-4 w-4 text-muted-foreground" /></div>
                                <div>
                                  <div className="font-medium">{item.item.name}</div>
                                  <div className="text-xs text-muted-foreground">{item.item.itemCode}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <Badge className={itemClassColors[item.item.itemClass] || 'bg-slate-100'}>{item.item.itemClass}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div>
                                <span className="font-semibold">{item.availableQty}</span>
                                <span className="text-xs text-muted-foreground ml-1">{item.item.unitOfMeasure}</span>
                              </div>
                              <div className="w-full mt-1"><Progress value={stockLevel} className="h-1" /></div>
                            </TableCell>
                            <TableCell className="text-center hidden sm:table-cell">
                              {item.reservedQty > 0 ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700">{item.reservedQty}</Badge>
                              ) : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="text-right font-medium">LKR {Number(item.wac).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">LKR {itemValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${stockStatus.color}`}></div>
                                <span className="text-sm">{stockStatus.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { 
                                  setSelectedStock(item); 
                                  setAdjustmentType(item.availableQty > 0 ? 'ADJUSTMENT_OUT' : 'ADJUSTMENT_IN');
                                  setAdjustDialogOpen(true); 
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-500" />
                Item Master Data
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Item Code</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell">Class</TableHead>
                      <TableHead className="font-semibold">UoM</TableHead>
                      <TableHead className="font-semibold text-center hidden sm:table-cell">Stock</TableHead>
                      <TableHead className="font-semibold text-center hidden lg:table-cell">Reorder Level</TableHead>
                      <TableHead className="font-semibold hidden lg:table-cell">Flags</TableHead>
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
                    ) : items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Package className="h-8 w-8 text-slate-300" />
                            <p>No items found</p>
                            <Button variant="outline" size="sm" onClick={() => setAddItemDialogOpen(true)}>
                              <Plus className="h-4 w-4 mr-2" />Add your first item
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/50">
                          <TableCell className="font-mono font-medium">{item.itemCode}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-xs">{item.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge className={itemClassColors[item.itemClass] || 'bg-slate-100'}>
                              {item.itemClass}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.unitOfMeasure}</TableCell>
                          <TableCell className="text-center hidden sm:table-cell">
                            <span className={item.availableStock === 0 ? 'text-red-600 font-medium' : ''}>
                              {item.availableStock}
                            </span>
                          </TableCell>
                          <TableCell className="text-center hidden lg:table-cell">
                            {item.reorderLevel ?? '-'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-1">
                              {item.isTool && (
                                <Badge variant="outline" className="text-xs">Tool</Badge>
                              )}
                              {item.isCritical && (
                                <Badge variant="outline" className="text-xs text-red-600 border-red-200">Critical</Badge>
                              )}
                              {!item.isTool && !item.isCritical && '-'}
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
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Alert</TableHead>
                      <TableHead className="font-semibold">Item</TableHead>
                      <TableHead className="font-semibold text-center">Available</TableHead>
                      <TableHead className="font-semibold text-center">Reorder Level</TableHead>
                      <TableHead className="font-semibold text-center">Shortage</TableHead>
                      <TableHead className="font-semibold text-center">Suggested Order</TableHead>
                      <TableHead className="font-semibold">Store</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <CheckCircle className="h-8 w-8 text-emerald-500" />
                            <p>All stock levels are healthy</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      alerts.map((alert) => (
                        <TableRow key={alert.id} className={alert.alertLevel === 'CRITICAL' ? 'bg-red-50' : alert.alertLevel === 'HIGH' ? 'bg-amber-50' : ''}>
                          <TableCell>
                            <Badge className={alert.alertLevel === 'CRITICAL' ? 'bg-red-500 text-white' : alert.alertLevel === 'HIGH' ? 'bg-amber-500 text-white' : 'bg-yellow-500 text-white'}>
                              {alert.alertLevel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{alert.item.name}</div>
                              <div className="text-xs text-muted-foreground">{alert.item.itemCode}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={alert.availableQty === 0 ? 'text-red-600 font-bold' : ''}>
                              {alert.availableQty} {alert.item.unitOfMeasure}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">{alert.reorderLevel || '-'}</TableCell>
                          <TableCell className="text-center text-red-600 font-medium">{alert.shortage}</TableCell>
                          <TableCell className="text-center">
                            {alert.suggestedOrderQty > 0 ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700">{alert.suggestedOrderQty}</Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{alert.store.name}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reservations Tab */}
        <TabsContent value="reservations" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-500" />
                Active Stock Reservations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">MR Number</TableHead>
                      <TableHead className="font-semibold">Item</TableHead>
                      <TableHead className="font-semibold text-center">Reserved Qty</TableHead>
                      <TableHead className="font-semibold">Requested By</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell">Job Card</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Unlock className="h-8 w-8 text-slate-300" />
                            <p>No active reservations</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      reservations.map((res) => (
                        <TableRow key={res.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{res.mrNumber}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{res.item.name}</div>
                              <div className="text-xs text-muted-foreground">{res.item.itemCode}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {res.reservedQty} {res.item.unitOfMeasure}
                            </Badge>
                          </TableCell>
                          <TableCell>{res.requestor || '-'}</TableCell>
                          <TableCell className="hidden md:table-cell">{res.jobCardNumber || '-'}</TableCell>
                          <TableCell className="text-muted-foreground">{new Date(res.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-purple-500" />
                Recent Stock Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Item</TableHead>
                      <TableHead className="font-semibold text-center">Quantity</TableHead>
                      <TableHead className="font-semibold text-right">Unit Cost</TableHead>
                      <TableHead className="font-semibold text-right">Total Value</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell">Store</TableHead>
                      <TableHead className="font-semibold hidden lg:table-cell">Performed By</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <History className="h-8 w-8 text-slate-300" />
                            <p>No recent transactions</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx) => (
                        <TableRow key={tx.id} className="hover:bg-muted/50">
                          <TableCell>
                            <Badge className={transactionTypeColors[tx.transactionType] || 'bg-slate-100'}>
                              {tx.transactionType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{tx.item.name}</div>
                              <div className="text-xs text-muted-foreground">{tx.item.itemCode}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">{tx.quantity} {tx.item.unitOfMeasure}</TableCell>
                          <TableCell className="text-right">LKR {tx.unitCost.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">LKR {tx.totalValue.toFixed(2)}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline">{tx.store.name}</Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">{tx.performedBy || '-'}</TableCell>
                          <TableCell className="text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {pagination.totalPages > 1 && activeTab === 'stock' && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} items
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}>
              <ChevronLeft className="h-4 w-4" />Previous
            </Button>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}>
              Next<ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Adjustment Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Adjustment</DialogTitle>
            <DialogDescription>
              {selectedStock ? `Adjust ${selectedStock.item.name} (${selectedStock.item.itemCode})` : 'Record a stock adjustment'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedStock && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Current Stock</div>
                <div className="text-2xl font-bold">{selectedStock.availableQty} {selectedStock.item.unitOfMeasure}</div>
                <div className="text-sm text-muted-foreground">WAC: LKR {Number(selectedStock.wac).toFixed(2)}</div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADJUSTMENT_IN">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />Add Stock
                    </div>
                  </SelectItem>
                  <SelectItem value="ADJUSTMENT_OUT">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />Remove Stock
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" placeholder="Enter quantity" value={adjustmentQty} onChange={(e) => setAdjustmentQty(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea placeholder="Enter reason for adjustment..." value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancel</Button>
            <Button 
              className={adjustmentType === 'ADJUSTMENT_IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
              onClick={handleAdjustment}
              disabled={submitting || !adjustmentQty}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {adjustmentType === 'ADJUSTMENT_IN' ? 'Add Stock' : 'Remove Stock'}
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
            {bulkAction === 'ADJUST_STOCK' && (
              <>
                <div className="space-y-2">
                  <Label>Adjustment Type</Label>
                  <Select value={bulkAdjustmentType} onValueChange={(v) => setBulkAdjustmentType(v as 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADJUSTMENT_IN">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-emerald-500" />Add Stock
                        </div>
                      </SelectItem>
                      <SelectItem value="ADJUSTMENT_OUT">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-500" />Remove Stock
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" placeholder="Enter quantity" value={bulkQty} onChange={(e) => setBulkQty(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Reason *</Label>
                  <Textarea placeholder="Enter reason for adjustment..." value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} />
                </div>
              </>
            )}
            {bulkAction === 'TRANSFER_STOCK' && (
              <>
                <div className="space-y-2">
                  <Label>Target Store</Label>
                  <Select value={bulkTargetStoreId} onValueChange={setBulkTargetStoreId}>
                    <SelectTrigger><SelectValue placeholder="Select target store" /></SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>{store.name} ({store.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea placeholder="Enter notes for transfer..." value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkDialogOpen(false); resetBulkForm(); }}>
              Cancel
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleBulkAction}
              disabled={submitting || (bulkAction === 'ADJUST_STOCK' && (!bulkQty || !bulkReason)) || (bulkAction === 'TRANSFER_STOCK' && !bulkTargetStoreId)}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm {selectedIds.size} Item(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>Create a new item in the inventory master data</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item Code *</Label>
                <Input 
                  placeholder="e.g., SP-001" 
                  value={itemForm.itemCode} 
                  onChange={(e) => setItemForm({ ...itemForm, itemCode: e.target.value })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input 
                  placeholder="Item name" 
                  value={itemForm.name} 
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                placeholder="Item description (optional)" 
                value={itemForm.description} 
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} 
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Item Class</Label>
                <Select value={itemForm.itemClass} onValueChange={(v) => setItemForm({ ...itemForm, itemClass: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SPARE_PART">Spare Part</SelectItem>
                    <SelectItem value="CONSUMABLE">Consumable</SelectItem>
                    <SelectItem value="LUBRICANT">Lubricant</SelectItem>
                    <SelectItem value="TOOL">Tool</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unit of Measure *</Label>
                <Select value={itemForm.unitOfMeasure} onValueChange={(v) => setItemForm({ ...itemForm, unitOfMeasure: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PCS">Pieces (PCS)</SelectItem>
                    <SelectItem value="KG">Kilograms (KG)</SelectItem>
                    <SelectItem value="L">Liters (L)</SelectItem>
                    <SelectItem value="M">Meters (M)</SelectItem>
                    <SelectItem value="BOX">Box</SelectItem>
                    <SelectItem value="ROLL">Roll</SelectItem>
                    <SelectItem value="SET">Set</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reorder Level</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={itemForm.reorderLevel} 
                  onChange={(e) => setItemForm({ ...itemForm, reorderLevel: parseInt(e.target.value) || 0 })} 
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Stock</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={itemForm.minimumStock} 
                  onChange={(e) => setItemForm({ ...itemForm, minimumStock: parseInt(e.target.value) || 0 })} 
                />
              </div>
              <div className="flex items-end gap-4 pt-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isTool" 
                    checked={itemForm.isTool} 
                    onCheckedChange={(checked) => setItemForm({ ...itemForm, isTool: checked as boolean })} 
                  />
                  <Label htmlFor="isTool" className="cursor-pointer">Is Tool</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isCritical" 
                    checked={itemForm.isCritical} 
                    onCheckedChange={(checked) => setItemForm({ ...itemForm, isCritical: checked as boolean })} 
                  />
                  <Label htmlFor="isCritical" className="cursor-pointer">Critical Item</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleAddItem}
              disabled={submitting || !itemForm.itemCode || !itemForm.name}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Stock Dialog */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-blue-500" />
              Receive Stock
            </DialogTitle>
            <DialogDescription>Add stock to inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Store *</Label>
              <Select value={receiveForm.storeId} onValueChange={(v) => setReceiveForm({ ...receiveForm, storeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name} ({store.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Item *</Label>
              <Select value={receiveForm.itemId} onValueChange={(v) => setReceiveForm({ ...receiveForm, itemId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.itemCode} - {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={receiveForm.quantity} 
                  onChange={(e) => setReceiveForm({ ...receiveForm, quantity: parseFloat(e.target.value) || 0 })} 
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Cost (LKR)</Label>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={receiveForm.unitCost} 
                  onChange={(e) => setReceiveForm({ ...receiveForm, unitCost: parseFloat(e.target.value) || 0 })} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                placeholder="Reference number, supplier, etc." 
                value={receiveForm.notes} 
                onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleReceiveStock}
              disabled={submitting || !receiveForm.itemId || !receiveForm.storeId || receiveForm.quantity <= 0}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Receive Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
