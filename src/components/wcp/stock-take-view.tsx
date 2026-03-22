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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Loader2, 
  Play,
  Printer,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  FileSpreadsheet,
  Eye,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StockTake {
  id: string;
  stockTakeNumber: string;
  storeId: string;
  status: string;
  countType: string;
  scheduledDate: string;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  store?: { id: string; name: string; code: string };
  lines?: StockTakeLine[];
}

interface StockTakeLine {
  id: string;
  stockTakeId: string;
  itemId: string;
  systemQty: number;
  countedQty: number | null;
  variance: number | null;
  unitCost: number;
  varianceValue: number | null;
  varianceReason: string | null;
  remarks: string | null;
  item?: { id: string; itemCode: string; name: string; unitOfMeasure: string };
  location?: string;
}

interface Store {
  id: string;
  name: string;
  code: string;
}

interface StockTakeStats {
  total: number;
  completed: number;
  inProgress: number;
  totalVarianceValue: number;
  positiveVariance: number;
  negativeVariance: number;
  accuracyRate: number;
}

const statusColors: Record<string, string> = {
  'SCHEDULED': 'bg-blue-100 text-blue-700',
  'IN_PROGRESS': 'bg-purple-100 text-purple-700',
  'COMPLETED': 'bg-emerald-100 text-emerald-700',
  'CANCELLED': 'bg-red-100 text-red-700',
};

const countTypeColors: Record<string, string> = {
  'FULL': 'bg-emerald-100 text-emerald-700',
  'CYCLE': 'bg-blue-100 text-blue-700',
  'SPOT': 'bg-amber-100 text-amber-700',
};

const varianceReasons = [
  'Damaged goods',
  'Theft/Pilferage',
  'Receiving error',
  'Issuing error',
  'Data entry error',
  'Miscounting',
  'Wrong location',
  'Expired/Obsolete',
  'Other'
];

export function StockTakeView() {
  const { toast } = useToast();
  const [stockTakes, setStockTakes] = useState<StockTake[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [stats, setStats] = useState<StockTakeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCountDialog, setShowCountDialog] = useState(false);
  const [showVarianceDialog, setShowVarianceDialog] = useState(false);
  const [selectedStockTake, setSelectedStockTake] = useState<StockTake | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [countLines, setCountLines] = useState<StockTakeLine[]>([]);
  const [varianceSummary, setVarianceSummary] = useState<any>(null);
  const [blindedMode, setBlindedMode] = useState(false);
  const [quickScanMode, setQuickScanMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');

  const [formData, setFormData] = useState({
    storeId: '',
    countType: 'FULL',
    scheduledDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchStockTakes();
    fetchStores();
    fetchStats();
  }, [statusFilter]);

  useEffect(() => {
    // Handle barcode scanner input
    if (quickScanMode && barcodeInput) {
      const line = countLines.find(l => l.item?.itemCode === barcodeInput);
      if (line) {
        // Focus on that line's count input
        document.getElementById(`count-${line.id}`)?.focus();
      }
    }
  }, [barcodeInput, quickScanMode, countLines]);

  const fetchStockTakes = async () => {
    try {
      setLoading(true);
      let url = '/api/stock-take?page=1&limit=50';
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setStockTakes(data.data || data.stockTakes || []);
      }
    } catch (error) {
      console.error('Failed to fetch stock takes:', error);
      toast({ title: 'Error', description: 'Failed to load stock takes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch('/api/stock-take/statistics');
      if (response.ok) {
        const data = await response.json();
        setStats(data.data || data);
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setStatsLoading(false);
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

  const handleCreateStockTake = async () => {
    if (!formData.storeId) {
      toast({ title: 'Error', description: 'Please select a store', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/stock-take', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Stock take created successfully' });
        setShowCreateDialog(false);
        setFormData({ storeId: '', countType: 'FULL', scheduledDate: new Date().toISOString().split('T')[0], notes: '' });
        fetchStockTakes();
        fetchStats();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.error || 'Failed to create stock take', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to create stock take:', error);
      toast({ title: 'Error', description: 'Failed to create stock take', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartCount = async (stockTake: StockTake) => {
    try {
      const response = await fetch(`/api/stock-take/${stockTake.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Stock take started' });
        fetchStockTakes();
        fetchStats();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.error || 'Failed to start stock take', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to start stock take:', error);
      toast({ title: 'Error', description: 'Failed to start stock take', variant: 'destructive' });
    }
  };

  const handleOpenCount = async (stockTake: StockTake) => {
    try {
      const response = await fetch(`/api/stock-take/${stockTake.id}`);
      if (response.ok) {
        const data = await response.json();
        const st = data.data || data;
        setSelectedStockTake(st);
        setCountLines(st.lines || []);
        setShowCountDialog(true);
      }
    } catch (error) {
      console.error('Failed to fetch stock take details:', error);
      toast({ title: 'Error', description: 'Failed to load stock take details', variant: 'destructive' });
    }
  };

  const handleSaveCount = async () => {
    if (!selectedStockTake) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/stock-take/${selectedStockTake.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'count',
          lines: countLines.map(l => ({ 
            id: l.id, 
            countedQty: l.countedQty, 
            varianceReason: l.varianceReason,
            remarks: l.remarks 
          }))
        })
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Count saved successfully' });
        setShowCountDialog(false);
        fetchStockTakes();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.error || 'Failed to save count', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to save count:', error);
      toast({ title: 'Error', description: 'Failed to save count', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (stockTake: StockTake) => {
    // Fetch variance summary first
    try {
      const response = await fetch(`/api/stock-take/${stockTake.id}/variance`);
      if (response.ok) {
        const data = await response.json();
        setVarianceSummary(data.data || data);
        setSelectedStockTake(stockTake);
        setShowVarianceDialog(true);
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.error || 'Failed to fetch variance summary', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to fetch variance:', error);
      toast({ title: 'Error', description: 'Failed to fetch variance summary', variant: 'destructive' });
    }
  };

  const handleConfirmComplete = async () => {
    if (!selectedStockTake) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/stock-take/${selectedStockTake.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Stock take completed successfully' });
        setShowVarianceDialog(false);
        fetchStockTakes();
        fetchStats();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.error || 'Failed to complete stock take', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to complete stock take:', error);
      toast({ title: 'Error', description: 'Failed to complete stock take', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (stockTake: StockTake) => {
    if (!confirm('Are you sure you want to delete this stock take?')) return;
    try {
      const response = await fetch(`/api/stock-take/${stockTake.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        toast({ title: 'Success', description: 'Stock take deleted successfully' });
        fetchStockTakes();
        fetchStats();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.error || 'Failed to delete stock take', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to delete stock take:', error);
      toast({ title: 'Error', description: 'Failed to delete stock take', variant: 'destructive' });
    }
  };

  const handlePrintCountSheet = async (stockTake: StockTake) => {
    try {
      const response = await fetch(`/api/stock-take/${stockTake.id}`);
      if (response.ok) {
        const data = await response.json();
        const st = data.data || data;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          toast({ title: 'Error', description: 'Please allow popups to print', variant: 'destructive' });
          return;
        }

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Count Sheet - ${st.stockTakeNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 15px; }
              .header h1 { margin: 0; font-size: 20px; }
              .info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
              .info p { margin: 4px 0; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #333; padding: 8px; text-align: left; }
              th { background: #f0f0f0; }
              .count-col { width: 80px; text-align: center; }
              .signature { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
              .signature-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 10px; text-align: center; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>STOCK COUNT SHEET</h1>
              <p>WCP - Workshop Control Platform</p>
            </div>
            <div class="info">
              <div>
                <p><strong>Stock Take #:</strong> ${st.stockTakeNumber}</p>
                <p><strong>Store:</strong> ${st.store?.name || '-'}</p>
              </div>
              <div>
                <p><strong>Date:</strong> ${new Date(st.scheduledDate).toLocaleDateString()}</p>
                <p><strong>Type:</strong> ${st.countType}</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item Code</th>
                  <th>Description</th>
                  <th>Location</th>
                  <th>Unit</th>
                  <th class="count-col">System Qty</th>
                  <th class="count-col">Count 1</th>
                  <th class="count-col">Count 2</th>
                  <th class="count-col">Variance</th>
                </tr>
              </thead>
              <tbody>
                ${(st.lines || []).map((line: StockTakeLine, idx: number) => `
                  <tr>
                    <td>LKR {idx + 1}</td>
                    <td>LKR {line.item?.itemCode || '-'}</td>
                    <td>LKR {line.item?.name || '-'}</td>
                    <td>LKR {line.location || '-'}</td>
                    <td>LKR {line.item?.unitOfMeasure || '-'}</td>
                    <td class="count-col">LKR {blindedMode ? '***' : line.systemQty}</td>
                    <td class="count-col"></td>
                    <td class="count-col"></td>
                    <td class="count-col"></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="signature">
              <div><div class="signature-line">Counter 1</div></div>
              <div><div class="signature-line">Counter 2 / Verified By</div></div>
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Failed to print count sheet:', error);
      toast({ title: 'Error', description: 'Failed to generate count sheet', variant: 'destructive' });
    }
  };

  const updateCountLine = (index: number, field: string, value: any) => {
    setCountLines(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'countedQty') {
        updated[index].variance = value - updated[index].systemQty;
        updated[index].varianceValue = (value - updated[index].systemQty) * updated[index].unitCost;
      }
      return updated;
    });
  };

  const filteredStockTakes = stockTakes.filter(st =>
    st.stockTakeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    st.store?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCompletionPercentage = (st: StockTake): number => {
    if (!st.lines || st.lines.length === 0) return 0;
    const counted = st.lines.filter(l => l.countedQty !== null).length;
    return Math.round((counted / st.lines.length) * 100);
  };

  const getCountStats = () => {
    const total = countLines.length;
    const counted = countLines.filter(l => l.countedQty !== null).length;
    const withVariance = countLines.filter(l => l.variance !== null && l.variance !== 0).length;
    const positiveVariance = countLines.filter(l => l.variance !== null && l.variance > 0).length;
    const negativeVariance = countLines.filter(l => l.variance !== null && l.variance < 0).length;
    const totalVarianceValue = countLines.reduce((sum, l) => sum + (l.varianceValue || 0), 0);
    
    return { total, counted, withVariance, positiveVariance, negativeVariance, totalVarianceValue };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stock Take</h1>
          <p className="text-muted-foreground text-sm">Manage inventory stock counts</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />New Stock Take
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total Stock Takes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <RefreshCw className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.inProgress || 0}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${(stats?.totalVarianceValue || 0) >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {(stats?.totalVarianceValue || 0) >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold">LKR {Math.abs(stats?.totalVarianceValue || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Variance Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.accuracyRate || 0}%</p>
                <p className="text-xs text-muted-foreground">Count Accuracy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search stock takes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /></div>
          ) : filteredStockTakes.length === 0 ? (
            <div className="text-center py-12"><ClipboardCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" /><p className="text-muted-foreground">No stock takes found</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stock Take #</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStockTakes.map((st) => (
                  <TableRow key={st.id}>
                    <TableCell className="font-medium">{st.stockTakeNumber}</TableCell>
                    <TableCell>{st.store?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge className={countTypeColors[st.countType] || 'bg-slate-100'}>{st.countType}</Badge>
                    </TableCell>
                    <TableCell>{new Date(st.scheduledDate).toLocaleDateString()}</TableCell>
                    <TableCell><Badge className={statusColors[st.status] || 'bg-slate-100'}>{st.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 w-32">
                        <Progress value={getCompletionPercentage(st)} className="h-2" />
                        <span className="text-xs text-muted-foreground">{getCompletionPercentage(st)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {st.status === 'SCHEDULED' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handlePrintCountSheet(st)}>
                              <Printer className="h-4 w-4 mr-1" />Print
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleStartCount(st)}>
                              <Play className="h-4 w-4 mr-1" />Start
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(st)} className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {st.status === 'IN_PROGRESS' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleOpenCount(st)}>
                              Count
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handlePrintCountSheet(st)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleComplete(st)} className="text-emerald-600">
                              Complete
                            </Button>
                          </>
                        )}
                        {st.status === 'COMPLETED' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenCount(st)}>
                              <Eye className="h-4 w-4 mr-1" />View
                            </Button>
                          </>
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

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create New Stock Take</DialogTitle><DialogDescription>Schedule a new stock count</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Store *</label>
              <Select value={formData.storeId} onValueChange={(v) => setFormData(prev => ({ ...prev, storeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                <SelectContent>{stores.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Count Type *</label>
              <Select value={formData.countType} onValueChange={(v) => setFormData(prev => ({ ...prev, countType: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL">Full Count - All items</SelectItem>
                  <SelectItem value="CYCLE">Cycle Count - By category</SelectItem>
                  <SelectItem value="SPOT">Spot Check - Random sample</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Scheduled Date *</label>
              <Input type="date" value={formData.scheduledDate} onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Enter any notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateStockTake} disabled={submitting}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Count Dialog */}
      <Dialog open={showCountDialog} onOpenChange={setShowCountDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Stock Take: {selectedStockTake?.stockTakeNumber}
              <Badge className={statusColors[selectedStockTake?.status || '']}>{selectedStockTake?.status}</Badge>
            </DialogTitle>
          </DialogHeader>
          
          {/* Count Stats Bar */}
          {selectedStockTake?.status === 'IN_PROGRESS' && (
            <div className="grid grid-cols-4 gap-4 py-2 border-b">
              {(() => {
                const stats = getCountStats();
                return (
                  <>
                    <div className="text-center">
                      <p className="text-lg font-bold">{stats.counted}/{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Items Counted</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-emerald-600">{stats.positiveVariance}</p>
                      <p className="text-xs text-muted-foreground">Positive Variance</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-600">{stats.negativeVariance}</p>
                      <p className="text-xs text-muted-foreground">Negative Variance</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-lg font-bold ${stats.totalVarianceValue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        ${Math.abs(stats.totalVarianceValue).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Variance Value</p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <div className="flex-1 overflow-auto py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">System Qty</TableHead>
                  <TableHead className="text-right">Counted Qty</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Variance Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countLines.map((line, index) => (
                  <TableRow key={line.id} className={line.variance !== null && line.variance !== 0 ? (line.variance > 0 ? 'bg-emerald-50' : 'bg-red-50') : ''}>
                    <TableCell className="font-medium">{line.item?.itemCode}</TableCell>
                    <TableCell>
                      <div>
                        <p>{line.item?.name}</p>
                        <p className="text-xs text-muted-foreground">{line.item?.unitOfMeasure}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{blindedMode ? '***' : line.systemQty}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        id={`count-${line.id}`}
                        type="number"
                        min="0"
                        value={line.countedQty ?? ''}
                        onChange={(e) => updateCountLine(index, 'countedQty', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-24 ml-auto"
                        disabled={selectedStockTake?.status === 'COMPLETED'}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-medium ${line.variance !== null && line.variance !== 0 ? (line.variance > 0 ? 'text-emerald-600' : 'text-red-600') : ''}`}>
                        {line.variance !== null ? line.variance : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {selectedStockTake?.status !== 'COMPLETED' ? (
                        <Select 
                          value={line.varianceReason || ''} 
                          onValueChange={(v) => updateCountLine(index, 'varianceReason', v)}
                          disabled={line.variance === null || line.variance === 0}
                        >
                          <SelectTrigger className="w-40"><SelectValue placeholder="Select reason" /></SelectTrigger>
                          <SelectContent>
                            {varianceReasons.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm">{line.varianceReason || '-'}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={blindedMode} onChange={(e) => setBlindedMode(e.target.checked)} className="rounded" />
                Blind Count Mode
              </label>
              <Button variant="outline" size="sm" onClick={() => selectedStockTake && handlePrintCountSheet(selectedStockTake)}>
                <Printer className="h-4 w-4 mr-1" />Print Sheet
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCountDialog(false)}>Close</Button>
              {selectedStockTake?.status === 'IN_PROGRESS' && (
                <Button onClick={handleSaveCount} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save Count
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Variance Confirmation Dialog */}
      <Dialog open={showVarianceDialog} onOpenChange={setShowVarianceDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Variance Summary</DialogTitle>
            <DialogDescription>Review variance before completing stock take</DialogDescription>
          </DialogHeader>
          {varianceSummary && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-emerald-50 border-emerald-200">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-emerald-600">{varianceSummary.positiveCount}</p>
                    <p className="text-xs text-emerald-700">Positive Variance Items</p>
                    <p className="text-sm font-medium">+${varianceSummary.positiveValue?.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4 text-center">
                    <TrendingDown className="h-6 w-6 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-600">{varianceSummary.negativeCount}</p>
                    <p className="text-xs text-red-700">Negative Variance Items</p>
                    <p className="text-sm font-medium">-${Math.abs(varianceSummary.negativeValue || 0).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <BarChart3 className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">LKR {varianceSummary.netValue?.toLocaleString()}</p>
                    <p className="text-xs text-blue-700">Net Variance Value</p>
                  </CardContent>
                </Card>
              </div>

              {varianceSummary.significantVariances?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Significant Variances (&gt;5% or &gt;$100)
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">System Qty</TableHead>
                        <TableHead className="text-right">Counted</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {varianceSummary.significantVariances.map((v: any) => (
                        <TableRow key={v.itemId} className="bg-amber-50">
                          <TableCell>{v.itemCode} - {v.itemName}</TableCell>
                          <TableCell className="text-right">{v.systemQty}</TableCell>
                          <TableCell className="text-right">{v.countedQty}</TableCell>
                          <TableCell className={`text-right font-medium ${v.variance > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{v.variance}</TableCell>
                          <TableCell className="text-right">LKR {v.varianceValue?.toLocaleString()}</TableCell>
                          <TableCell>{v.varianceReason || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> Completing this stock take will create stock adjustments for all variance items. 
                  These adjustments will update inventory levels and be recorded in the audit trail.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVarianceDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmComplete} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete & Post Adjustments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
