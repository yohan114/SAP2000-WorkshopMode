'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from 'recharts';
import {
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  MoreHorizontal,
  Loader2,
  PieChart,
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface BudgetLine {
  id: string;
  code: string;
  name: string;
  department: string | null;
  financialYear: string;
  originalAmount: number;
  revisedAmount: number | null;
  committedAmount: number;
  actualAmount: number;
  availableAmount: number;
  effectiveAmount: number;
  usedAmount: number;
  utilizationRate: number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EXCEEDED';
  isActive: boolean;
  transactions: BudgetTransaction[];
}

interface BudgetTransaction {
  id: string;
  transactionType: string;
  amount: number;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

interface VarianceData {
  varianceData: Array<{
    id: string;
    code: string;
    name: string;
    department: string;
    financialYear: string;
    originalAmount: number;
    revisedAmount: number;
    committedAmount: number;
    actualAmount: number;
    variance: number;
    variancePercent: number;
    status: string;
  }>;
  byDepartment: Array<{
    department: string;
    budgetLines: unknown[];
    totals: {
      originalAmount: number;
      revisedAmount: number;
      committedAmount: number;
      actualAmount: number;
      variance: number;
      variancePercent: number;
    };
  }>;
  summary: {
    totalBudgetLines: number;
    totalOriginal: number;
    totalRevised: number;
    totalCommitted: number;
    totalActual: number;
    totalVariance: number;
    totalAvailable: number;
    statusBreakdown: {
      normal: number;
      warning: number;
      critical: number;
      exceeded: number;
    };
  };
  chartData: Array<{
    department: string;
    original: number;
    revised: number;
    actual: number;
    variance: number;
    count: number;
  }>;
}

interface AlertData {
  id: string;
  code: string;
  name: string;
  department: string | null;
  financialYear: string;
  utilizationRate: number;
  alertLevel: 'WARNING' | 'CRITICAL' | 'EXCEEDED';
  message: string;
}

interface BudgetListResponse {
  budgetLines: BudgetLine[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: {
    departments: string[];
    financialYears: string[];
  };
}

export function BudgetView() {
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    departments: string[];
    financialYears: string[];
  }>({ departments: [], financialYears: [] });
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetLine | null>(null);
  const [varianceData, setVarianceData] = useState<VarianceData | null>(null);
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    department: '',
    financialYear: new Date().getFullYear().toString(),
    originalAmount: '',
    revisedAmount: '',
  });
  const [saving, setSaving] = useState(false);

  // Fetch budget lines
  const fetchBudgetLines = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDepartment && selectedDepartment !== 'all') {
        params.append('department', selectedDepartment);
      }
      if (selectedYear && selectedYear !== 'all') {
        params.append('financialYear', selectedYear);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/budget?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch budget lines');
      
      const data: BudgetListResponse = await response.json();
      setBudgetLines(data.budgetLines);
      setFilters(data.filters);
    } catch (error) {
      console.error('Error fetching budget lines:', error);
      toast.error('Failed to fetch budget lines');
    } finally {
      setLoading(false);
    }
  };

  // Fetch variance data
  const fetchVarianceData = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedYear && selectedYear !== 'all') {
        params.append('financialYear', selectedYear);
      }
      if (selectedDepartment && selectedDepartment !== 'all') {
        params.append('department', selectedDepartment);
      }

      const response = await fetch(`/api/budget/variance?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch variance data');
      
      const data: VarianceData = await response.json();
      setVarianceData(data);
    } catch (error) {
      console.error('Error fetching variance data:', error);
    }
  };

  // Fetch alerts
  const fetchAlerts = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedYear && selectedYear !== 'all') {
        params.append('financialYear', selectedYear);
      }

      const response = await fetch(`/api/budget/alerts?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch alerts');
      
      const data = await response.json();
      setAlerts(data.alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  useEffect(() => {
    fetchBudgetLines();
    fetchVarianceData();
    fetchAlerts();
  }, [selectedDepartment, selectedYear, searchQuery]);

  // Handle form submit
  const handleSubmit = async () => {
    if (!formData.code || !formData.name || !formData.financialYear || !formData.originalAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const url = editingBudget ? `/api/budget/${editingBudget.id}` : '/api/budget';
      const method = editingBudget ? 'PUT' : 'POST';
      
      const body: Record<string, unknown> = {
        code: formData.code,
        name: formData.name,
        department: formData.department || null,
        financialYear: formData.financialYear,
        originalAmount: parseFloat(formData.originalAmount),
      };

      if (formData.revisedAmount) {
        body.revisedAmount = parseFloat(formData.revisedAmount);
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save budget line');
      }

      toast.success(editingBudget ? 'Budget line updated' : 'Budget line created');
      setShowDialog(false);
      resetForm();
      fetchBudgetLines();
      fetchVarianceData();
    } catch (error) {
      console.error('Error saving budget line:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save budget line');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget line?')) return;

    try {
      const response = await fetch(`/api/budget/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete budget line');

      toast.success('Budget line deleted');
      fetchBudgetLines();
      fetchVarianceData();
    } catch (error) {
      console.error('Error deleting budget line:', error);
      toast.error('Failed to delete budget line');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      department: '',
      financialYear: new Date().getFullYear().toString(),
      originalAmount: '',
      revisedAmount: '',
    });
    setEditingBudget(null);
  };

  // Open edit dialog
  const openEditDialog = (budget: BudgetLine) => {
    setEditingBudget(budget);
    setFormData({
      code: budget.code,
      name: budget.name,
      department: budget.department || '',
      financialYear: budget.financialYear,
      originalAmount: budget.originalAmount.toString(),
      revisedAmount: budget.revisedAmount?.toString() || '',
    });
    setShowDialog(true);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get status badge
  const getStatusBadge = (status: string, utilizationRate: number) => {
    switch (status) {
      case 'EXCEEDED':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Exceeded ({(utilizationRate * 100).toFixed(0)}%)
          </Badge>
        );
      case 'CRITICAL':
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-orange-50 text-orange-700 border-orange-200">
            <AlertTriangle className="h-3 w-3" />
            Critical ({(utilizationRate * 100).toFixed(0)}%)
          </Badge>
        );
      case 'WARNING':
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200">
            <TrendingUp className="h-3 w-3" />
            Warning ({(utilizationRate * 100).toFixed(0)}%)
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle className="h-3 w-3" />
            Normal ({(utilizationRate * 100).toFixed(0)}%)
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-600" />
            Budget Control
          </h1>
          <p className="text-slate-500 mt-1">
            Manage budget lines, track commitments, and monitor spending
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Budget Line
        </Button>
      </div>

      {/* Alert Summary */}
      {alerts.length > 0 && (
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Budget Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {alerts.slice(0, 5).map((alert) => (
                <Badge
                  key={alert.id}
                  variant={alert.alertLevel === 'EXCEEDED' ? 'destructive' : 'outline'}
                  className={
                    alert.alertLevel === 'CRITICAL'
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : alert.alertLevel === 'WARNING'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : ''
                  }
                >
                  {alert.code}: {alert.message}
                </Badge>
              ))}
              {alerts.length > 5 && (
                <Badge variant="secondary">+{alerts.length - 5} more</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="variance">Variance Analysis</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alerts.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search budget lines..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                </div>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {filters.departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {filters.financialYears.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          {varianceData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Budget</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatCurrency(varianceData.summary.totalRevised)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">
                    {varianceData.summary.totalBudgetLines} budget lines
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Committed</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatCurrency(varianceData.summary.totalCommitted)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress
                    value={(varianceData.summary.totalCommitted / varianceData.summary.totalRevised) * 100}
                    className="h-2"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Actual Spent</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatCurrency(varianceData.summary.totalActual)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress
                    value={(varianceData.summary.totalActual / varianceData.summary.totalRevised) * 100}
                    className="h-2"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Variance</CardDescription>
                  <CardTitle className={`text-2xl ${varianceData.summary.totalVariance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(varianceData.summary.totalVariance)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-sm">
                    {varianceData.summary.totalVariance >= 0 ? (
                      <TrendingDown className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-slate-500">
                      {varianceData.summary.totalVariance >= 0 ? 'Under budget' : 'Over budget'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Budget Lines Table */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Lines</CardTitle>
              <CardDescription>
                Manage budget allocations and track spending
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : budgetLines.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No budget lines found. Click &quot;Add Budget Line&quot; to create one.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">Original</TableHead>
                        <TableHead className="text-right">Committed</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budgetLines.map((budget) => (
                        <TableRow key={budget.id} className={
                          budget.status === 'EXCEEDED' ? 'bg-red-50' :
                          budget.status === 'CRITICAL' ? 'bg-orange-50' :
                          budget.status === 'WARNING' ? 'bg-amber-50' : ''
                        }>
                          <TableCell className="font-medium">{budget.code}</TableCell>
                          <TableCell>{budget.name}</TableCell>
                          <TableCell>{budget.department || '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(budget.originalAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(budget.committedAmount)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(budget.actualAmount)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(budget.availableAmount)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(budget.status, budget.utilizationRate)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(budget)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(budget.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
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
        </TabsContent>

        {/* Variance Analysis Tab */}
        <TabsContent value="variance" className="space-y-4">
          {varianceData && (
            <>
              {/* Variance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Budget vs Actual by Department</CardTitle>
                  <CardDescription>
                    Compare original budget, revised budget, and actual spending
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={varianceData.chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => `Department: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="original" fill="#94a3b8" name="Original Budget" />
                        <Bar dataKey="revised" fill="#3b82f6" name="Revised Budget" />
                        <Bar dataKey="actual" fill="#10b981" name="Actual" />
                        <Line type="monotone" dataKey="variance" stroke="#f59e0b" strokeWidth={2} name="Variance" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Variance Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Variance Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead className="text-right">Original</TableHead>
                          <TableHead className="text-right">Revised</TableHead>
                          <TableHead className="text-right">Actual</TableHead>
                          <TableHead className="text-right">Variance</TableHead>
                          <TableHead className="text-right">Variance %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {varianceData.varianceData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.code}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.department}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.originalAmount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.revisedAmount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.actualAmount)}</TableCell>
                            <TableCell className={`text-right font-medium ${item.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {formatCurrency(item.variance)}
                            </TableCell>
                            <TableCell className={`text-right ${item.variancePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {item.variancePercent.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-2">
                <CardDescription>Exceeded</CardDescription>
                <CardTitle className="text-2xl text-red-600">
                  {alerts.filter(a => a.alertLevel === 'EXCEEDED').length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">Over budget limit</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-2">
                <CardDescription>Critical</CardDescription>
                <CardTitle className="text-2xl text-orange-600">
                  {alerts.filter(a => a.alertLevel === 'CRITICAL').length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">90%+ utilized</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardDescription>Warning</CardDescription>
                <CardTitle className="text-2xl text-amber-600">
                  {alerts.filter(a => a.alertLevel === 'WARNING').length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">80%+ utilized</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Budget Alerts</CardTitle>
              <CardDescription>
                Budget lines requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                  <p>No budget alerts. All budget lines are within acceptable limits.</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-lg border ${
                          alert.alertLevel === 'EXCEEDED'
                            ? 'bg-red-50 border-red-200'
                            : alert.alertLevel === 'CRITICAL'
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{alert.code}</span>
                              <span className="text-slate-600">- {alert.name}</span>
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                              {alert.department || 'No Department'} • FY {alert.financialYear}
                            </div>
                          </div>
                          {getStatusBadge(alert.alertLevel, alert.utilizationRate)}
                        </div>
                        <p className="mt-2 text-sm">{alert.message}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBudget ? 'Edit Budget Line' : 'Add Budget Line'}
            </DialogTitle>
            <DialogDescription>
              {editingBudget
                ? 'Update budget line details'
                : 'Create a new budget line allocation'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., BUD-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="financialYear">Financial Year *</Label>
                <Input
                  id="financialYear"
                  value={formData.financialYear}
                  onChange={(e) => setFormData({ ...formData, financialYear: e.target.value })}
                  placeholder="e.g., 2024"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Budget line name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Department name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="originalAmount">Original Amount *</Label>
                <Input
                  id="originalAmount"
                  type="number"
                  value={formData.originalAmount}
                  onChange={(e) => setFormData({ ...formData, originalAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revisedAmount">Revised Amount</Label>
                <Input
                  id="revisedAmount"
                  type="number"
                  value={formData.revisedAmount}
                  onChange={(e) => setFormData({ ...formData, revisedAmount: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingBudget ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
