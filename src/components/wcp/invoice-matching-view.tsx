'use client';

import { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileCheck, 
  Search, 
  Loader2, 
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building2,
  FileText,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  poId: string | null;
  grnId: string | null;
  status: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  matchedAt: string | null;
  matchedBy: string | null;
  discrepancies: any | null;
  createdAt: string;
  supplier?: { id: string; name: string; supplierCode: string };
  po?: { id: string; poNumber: string };
  grn?: { id: string; grnNumber: string };
  lines?: InvoiceLine[];
}

interface InvoiceLine {
  id: string;
  invoiceId: string;
  itemId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  matched: boolean;
  discrepancy: string | null;
  item?: { id: string; itemCode: string; name: string };
}

interface Supplier {
  id: string;
  name: string;
  supplierCode: string;
}

const statusColors: Record<string, string> = {
  'DRAFT': 'bg-slate-100 text-foreground',
  'PENDING': 'bg-blue-100 text-blue-700',
  'MATCHED': 'bg-emerald-100 text-emerald-700',
  'DISCREPANCY': 'bg-amber-100 text-amber-700',
  'APPROVED': 'bg-purple-100 text-purple-700',
  'PAID': 'bg-green-100 text-green-700',
  'CANCELLED': 'bg-red-100 text-red-700',
};

export function InvoiceMatchingView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchTab, setMatchTab] = useState('auto');

  useEffect(() => {
    fetchInvoices();
    fetchSuppliers();
  }, [statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      let url = '/api/invoices?page=1&limit=50';
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.data || data.invoices || []);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
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

  const handleViewInvoice = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedInvoice(data.data || data);
        setShowMatchDialog(true);
      }
    } catch (error) {
      console.error('Failed to fetch invoice details:', error);
      toast.error('Failed to load invoice details');
    }
  };

  const handleAutoMatch = async (invoiceId: string) => {
    try {
      setMatching(true);
      const response = await fetch(`/api/invoices/${invoiceId}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'auto' })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.matched) {
          toast.success('Invoice matched successfully');
        } else {
          toast.warning('Invoice has discrepancies that need manual review');
        }
        fetchInvoices();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to match invoice');
      }
    } catch (error) {
      console.error('Failed to match invoice:', error);
      toast.error('Failed to match invoice');
    } finally {
      setMatching(false);
    }
  };

  const handleApprove = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' })
      });

      if (response.ok) {
        toast.success('Invoice approved');
        fetchInvoices();
        setShowMatchDialog(false);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to approve invoice');
      }
    } catch (error) {
      console.error('Failed to approve invoice:', error);
      toast.error('Failed to approve invoice');
    }
  };

  const filteredInvoices = invoices.filter(inv =>
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number, currency: string = 'LKR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getDiscrepancyCount = (invoice: Invoice): number => {
    if (!invoice.discrepancies) return 0;
    if (Array.isArray(invoice.discrepancies)) return invoice.discrepancies.length;
    return 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoice Matching</h1>
          <p className="text-muted-foreground text-sm">Match invoices with POs and GRNs</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invoices.length}</p>
                <p className="text-xs text-muted-foreground">Total Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {invoices.filter(i => i.status === 'PENDING').length}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {invoices.filter(i => i.status === 'MATCHED' || i.status === 'APPROVED').length}
                </p>
                <p className="text-xs text-muted-foreground">Matched</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    invoices.filter(i => i.status === 'PENDING' || i.status === 'DISCREPANCY')
                      .reduce((sum, i) => sum + i.totalAmount, 0)
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Unmatched Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
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
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="MATCHED">Matched</SelectItem>
                <SelectItem value="DISCREPANCY">Discrepancy</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoice List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-muted-foreground">No invoices found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead>GRN</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.supplier?.name || '-'}</TableCell>
                    <TableCell>{inv.po?.poNumber || '-'}</TableCell>
                    <TableCell>{inv.grn?.grnNumber || '-'}</TableCell>
                    <TableCell>{new Date(inv.invoiceDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(inv.totalAmount, inv.currency)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[inv.status] || 'bg-slate-100'}>
                        {inv.status}
                        {getDiscrepancyCount(inv) > 0 && (
                          <span className="ml-1">({getDiscrepancyCount(inv)})</span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.status === 'PENDING' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAutoMatch(inv.id)}
                            disabled={matching}
                          >
                            Match
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewInvoice(inv)}
                        >
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Dialog */}
      <Dialog open={showMatchDialog} onOpenChange={setShowMatchDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6 py-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-medium">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusColors[selectedInvoice.status]}>
                    {selectedInvoice.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Supplier</p>
                  <p className="font-medium">{selectedInvoice.supplier?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Date</p>
                  <p className="font-medium">{new Date(selectedInvoice.invoiceDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PO</p>
                  <p className="font-medium">{selectedInvoice.po?.poNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GRN</p>
                  <p className="font-medium">{selectedInvoice.grn?.grnNumber || '-'}</p>
                </div>
              </div>

              {/* Amounts */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-muted-foreground">Subtotal</p>
                    <p className="text-lg font-semibold">{formatCurrency(selectedInvoice.subtotal, selectedInvoice.currency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tax</p>
                    <p className="text-lg font-semibold">{formatCurrency(selectedInvoice.taxAmount, selectedInvoice.currency)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(selectedInvoice.totalAmount, selectedInvoice.currency)}</p>
                  </div>
                </div>
              </div>

              {/* Discrepancies */}
              {selectedInvoice.discrepancies && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Discrepancies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(selectedInvoice.discrepancies, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Line Items */}
              {selectedInvoice.lines && selectedInvoice.lines.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Line Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Matched</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{line.item?.itemCode || '-'}</p>
                              <p className="text-xs text-muted-foreground">{line.description}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{line.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.unitPrice)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.totalPrice)}</TableCell>
                          <TableCell>
                            {line.matched ? (
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMatchDialog(false)}>
              Close
            </Button>
            {selectedInvoice?.status === 'MATCHED' && (
              <Button onClick={() => handleApprove(selectedInvoice.id)} className="bg-emerald-600 hover:bg-emerald-700">
                Approve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
