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
  Scale, 
  Plus, 
  Search, 
  Loader2, 
  FileText,
  DollarSign,
  CheckCircle,
  XCircle,
  Building2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';

interface Quotation {
  id: string;
  quotationNumber: string;
  supplierId: string;
  rfqId: string | null;
  status: string;
  quotationDate: string;
  validUntil: string | null;
  totalAmount: number;
  currency: string;
  terms: string | null;
  createdAt: string;
  supplier?: { id: string; name: string; supplierCode: string };
  lines?: QuotationLine[];
}

interface QuotationLine {
  id: string;
  quotationId: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  deliveryDays: number | null;
  remarks: string | null;
  item?: { id: string; itemCode: string; name: string; unitOfMeasure: string };
}

interface Supplier {
  id: string;
  name: string;
  supplierCode: string;
}

interface ComparisonResult {
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  quotations: {
    supplierId: string;
    supplierName: string;
    unitPrice: number;
    totalPrice: number;
    deliveryDays: number | null;
  }[];
  recommendedSupplierId: string | null;
  savings: number;
}

const statusColors: Record<string, string> = {
  'DRAFT': 'bg-slate-100 text-slate-700',
  'SUBMITTED': 'bg-blue-100 text-blue-700',
  'UNDER_REVIEW': 'bg-purple-100 text-purple-700',
  'ACCEPTED': 'bg-emerald-100 text-emerald-700',
  'REJECTED': 'bg-red-100 text-red-700',
  'EXPIRED': 'bg-amber-100 text-amber-700',
};

export function QuotationComparisonView() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [selectedQuotations, setSelectedQuotations] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    fetchQuotations();
    fetchSuppliers();
  }, [statusFilter]);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      let url = '/api/quotations?page=1&limit=50';
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setQuotations(data.data || data.quotations || []);
      }
    } catch (error) {
      console.error('Failed to fetch quotations:', error);
      toast.error('Failed to load quotations');
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

  const handleCompare = async () => {
    if (selectedQuotations.length < 2) {
      toast.error('Please select at least 2 quotations to compare');
      return;
    }

    try {
      setComparing(true);
      const response = await fetch('/api/quotations/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotationIds: selectedQuotations })
      });

      if (response.ok) {
        const data = await response.json();
        setComparisonResults(data.results || data);
        setShowCompareDialog(true);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to compare quotations');
      }
    } catch (error) {
      console.error('Failed to compare quotations:', error);
      toast.error('Failed to compare quotations');
    } finally {
      setComparing(false);
    }
  };

  const toggleQuotationSelection = (id: string) => {
    setSelectedQuotations(prev =>
      prev.includes(id)
        ? prev.filter(qId => qId !== id)
        : [...prev, id]
    );
  };

  const filteredQuotations = quotations.filter(q =>
    q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotation Comparison</h1>
          <p className="text-slate-500 text-sm">Compare and select best quotations</p>
        </div>
        <div className="flex gap-2">
          {selectedQuotations.length >= 2 && (
            <Button onClick={handleCompare} disabled={comparing} className="bg-emerald-600 hover:bg-emerald-700">
              {comparing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Scale className="h-4 w-4 mr-2" />
              )}
              Compare ({selectedQuotations.length})
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search quotations..."
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
                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quotation List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="text-center py-12">
              <Scale className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No quotations found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedQuotations.length === filteredQuotations.length}
                      onChange={() => {
                        if (selectedQuotations.length === filteredQuotations.length) {
                          setSelectedQuotations([]);
                        } else {
                          setSelectedQuotations(filteredQuotations.map(q => q.id));
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Quotation #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations.map((q) => (
                  <TableRow 
                    key={q.id}
                    className={selectedQuotations.includes(q.id) ? 'bg-emerald-50' : ''}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedQuotations.includes(q.id)}
                        onChange={() => toggleQuotationSelection(q.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{q.quotationNumber}</TableCell>
                    <TableCell>{q.supplier?.name || '-'}</TableCell>
                    <TableCell>{new Date(q.quotationDate).toLocaleDateString()}</TableCell>
                    <TableCell>{formatCurrency(q.totalAmount, q.currency)}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[q.status] || 'bg-slate-100'}>
                        {q.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Comparison Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quotation Comparison</DialogTitle>
            <DialogDescription>
              Compare prices and select the best option
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {comparisonResults.map((result, index) => (
              <Card key={result.itemId}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {result.itemCode} - {result.itemName}
                  </CardTitle>
                  <CardDescription>Quantity: {result.quantity}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total Price</TableHead>
                        <TableHead className="text-right">Delivery Days</TableHead>
                        <TableHead className="text-right">Recommendation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.quotations.map((q) => (
                        <TableRow 
                          key={q.supplierId}
                          className={q.supplierId === result.recommendedSupplierId ? 'bg-emerald-50' : ''}
                        >
                          <TableCell className="font-medium">{q.supplierName}</TableCell>
                          <TableCell className="text-right">{formatCurrency(q.unitPrice)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(q.totalPrice)}</TableCell>
                          <TableCell className="text-right">{q.deliveryDays || '-'} days</TableCell>
                          <TableCell className="text-right">
                            {q.supplierId === result.recommendedSupplierId && (
                              <Badge className="bg-emerald-100 text-emerald-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Best Price
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {result.savings > 0 && (
                    <div className="p-3 bg-emerald-50 border-t flex items-center justify-end gap-2 text-emerald-700 text-sm">
                      <TrendingDown className="h-4 w-4" />
                      Potential savings: {formatCurrency(result.savings)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompareDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
