'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Truck, 
  Wrench, 
  Package, 
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface DashboardStats {
  summary: {
    assets: {
      total: number;
      operational: number;
      underRepair: number;
      availability: string;
    };
    jobCards: {
      total: number;
      open: number;
      completed: number;
      emergency: number;
      completionRate: string;
      avgCompletionHours: number | null;
    };
    materialRequests: {
      total: number;
      pending: number;
      approved: number;
    };
    inventory: {
      totalItems: number;
      lowStockItems: number;
      totalValue: string;
    };
    suppliers: {
      total: number;
      active: number;
    };
    stockMovements: number;
  };
  charts: {
    jobCardsByStatus: Array<{ status: string; count: number }>;
    jobCardsByPriority: Array<{ priority: string; count: number }>;
  };
}

export function ReportsView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard?period=${period}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-slate-500">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Failed to load reports</p>
      </div>
    );
  }

  const { summary, charts } = stats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports & Analytics</h2>
          <p className="text-slate-500">Performance metrics and analysis</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Last 24 Hours</SelectItem>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">Last 30 Days</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Asset Availability</p>
                <p className="text-3xl font-bold text-emerald-700">{summary.assets.availability}%</p>
                <p className="text-xs text-emerald-600 mt-1">
                  {summary.assets.operational} of {summary.assets.total} operational
                </p>
              </div>
              <div className="p-3 bg-emerald-200 rounded-full">
                <Truck className="h-6 w-6 text-emerald-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Job Completion</p>
                <p className="text-3xl font-bold text-blue-700">{summary.jobCards.completionRate}%</p>
                <p className="text-xs text-blue-600 mt-1">
                  {summary.jobCards.completed} completed
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Wrench className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Avg Completion Time</p>
                <p className="text-3xl font-bold text-amber-700">
                  {summary.jobCards.avgCompletionHours || 0}h
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Average job duration
                </p>
              </div>
              <div className="p-3 bg-amber-200 rounded-full">
                <Clock className="h-6 w-6 text-amber-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Inventory Value</p>
                <p className="text-3xl font-bold text-purple-700">
                  ${(parseFloat(summary.inventory.totalValue) / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {summary.inventory.totalItems} items
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <DollarSign className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Cards by Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-500" />
              Job Cards by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {charts.jobCardsByStatus.map((item) => {
                const percentage = summary.jobCards.total > 0 
                  ? ((item.count / summary.jobCards.total) * 100).toFixed(0)
                  : 0;
                return (
                  <div key={item.status} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.status.replace(/_/g, ' ')}</span>
                      <span className="text-slate-500">{item.count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Job Cards by Priority */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-slate-500" />
              Job Cards by Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {charts.jobCardsByPriority.map((item) => {
                const percentage = summary.jobCards.total > 0 
                  ? ((item.count / summary.jobCards.total) * 100).toFixed(0)
                  : 0;
                const colors: Record<string, string> = {
                  EMERGENCY: 'bg-red-500',
                  CRITICAL: 'bg-orange-500',
                  HIGH: 'bg-amber-500',
                  NORMAL: 'bg-blue-500',
                  LOW: 'bg-slate-400',
                };
                return (
                  <div key={item.priority} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.priority}</span>
                      <span className="text-slate-500">{item.count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${colors[item.priority] || 'bg-slate-400'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Asset Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Total Assets</TableCell>
                  <TableCell className="text-right">{summary.assets.total}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Operational</TableCell>
                  <TableCell className="text-right text-emerald-600">{summary.assets.operational}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Under Repair</TableCell>
                  <TableCell className="text-right text-amber-600">{summary.assets.underRepair}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Availability Rate</TableCell>
                  <TableCell className="text-right font-bold">{summary.assets.availability}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Inventory Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Inventory Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Total Items</TableCell>
                  <TableCell className="text-right">{summary.inventory.totalItems}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Low Stock Items</TableCell>
                  <TableCell className="text-right text-amber-600">{summary.inventory.lowStockItems}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total Stock Value</TableCell>
                  <TableCell className="text-right font-bold">${summary.inventory.totalValue}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Stock Movements</TableCell>
                  <TableCell className="text-right">{summary.stockMovements}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Job Cards Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Job Cards Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Total Job Cards</TableCell>
                  <TableCell className="text-right">{summary.jobCards.total}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Open Jobs</TableCell>
                  <TableCell className="text-right text-blue-600">{summary.jobCards.open}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Completed</TableCell>
                  <TableCell className="text-right text-emerald-600">{summary.jobCards.completed}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Emergency/Critical</TableCell>
                  <TableCell className="text-right text-red-600">{summary.jobCards.emergency}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Avg Completion Time</TableCell>
                  <TableCell className="text-right font-bold">{summary.jobCards.avgCompletionHours || 0} hours</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Procurement Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Procurement Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Material Requests</TableCell>
                  <TableCell className="text-right">{summary.materialRequests.total}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Pending Approval</TableCell>
                  <TableCell className="text-right text-amber-600">{summary.materialRequests.pending}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Approved</TableCell>
                  <TableCell className="text-right text-emerald-600">{summary.materialRequests.approved}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Active Suppliers</TableCell>
                  <TableCell className="text-right">{summary.suppliers.active} / {summary.suppliers.total}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Alert Cards */}
      {(summary.jobCards.emergency > 0 || summary.inventory.lowStockItems > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {summary.jobCards.emergency > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-red-800">Emergency Jobs</p>
                    <p className="text-sm text-red-600">
                      {summary.jobCards.emergency} emergency/critical job(s) require immediate attention
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {summary.inventory.lowStockItems > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Package className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-amber-800">Low Stock Alert</p>
                    <p className="text-sm text-amber-600">
                      {summary.inventory.lowStockItems} item(s) below reorder level
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
