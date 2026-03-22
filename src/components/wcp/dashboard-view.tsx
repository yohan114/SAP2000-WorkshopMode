'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Truck, 
  Wrench, 
  Package, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Calendar,
  Activity,
  ArrowUpRight,
  Loader2,
  DollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
  Timer,
  Gauge,
  Users,
  AlertCircle,
  ClipboardCheck,
  Zap
} from 'lucide-react';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  Legend,
  AreaChart,
  Area,
  ComposedChart,
  Tooltip
} from 'recharts';

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
  recent: {
    jobCards: Array<{
      id: string;
      jobCardNumber: string;
      status: string;
      priority: string;
      asset: { name: string } | null;
      createdAt: string;
    }>;
    materialRequests: Array<{
      id: string;
      mrNumber: string;
      status: string;
      requestor: { name: string } | null;
      createdAt: string;
    }>;
  };
  topAssets: Array<{
    id: string;
    assetNumber: string;
    name: string;
    status: string;
    jobCardCount: number;
  }>;
  period: string;
  generatedAt: string;
}

interface AnalyticsData {
  monthlyTrends: {
    jobCards: Array<{
      month: string;
      fullMonth: string;
      created: number;
      completed: number;
    }>;
    costs: Array<{
      month: string;
      fullMonth: string;
      estimated: number;
      actual: number;
    }>;
  };
  reliability: {
    mttr: {
      overall: number;
      byCategory: Array<{
        id: string;
        category: string;
        code: string;
        mttr: number;
        jobCount: number;
      }>;
    };
    mtbf: {
      overall: number;
      byCategory: Array<{
        id: string;
        category: string;
        code: string;
        mtbf: number;
        breakdownCount: number;
        totalDowntimeHours: number;
      }>;
    };
  };
  costs: {
    totalEstimated: number;
    totalActual: number;
    variance: number;
    isOverBudget: boolean;
    monthly: Array<{
      month: string;
      estimated: number;
      actual: number;
    }>;
  };
  inventory: {
    turnover: Array<{
      month: string;
      fullMonth: string;
      receipts: number;
      issues: number;
      adjustments: number;
      turnover: number;
    }>;
    summary: {
      totalReceipts: number;
      totalIssues: number;
      avgTurnover: number;
    };
  };
  assets: {
    utilization: {
      rate: number;
      operational: number;
      underRepair: number;
      total: number;
      byStatus: Array<{
        status: string;
        count: number;
        percentage: number;
      }>;
    };
    byCategory: Array<{
      id: string;
      category: string;
      operational: number;
      total: number;
      utilizationRate: number;
    }>;
  };
  period: {
    months: number;
    startDate: string;
    endDate: string;
  };
  generatedAt: string;
}

interface WidgetsData {
  quickActions: {
    todaysCompletedJobs: number;
    jobsDueToday: number;
    overduePmSchedules: number;
    pendingApprovals: number;
  };
  topTechnicians: Array<{
    id: string;
    name: string;
    employeeId: string | null;
    jobsCompleted: number;
    avgCompletionTime: number;
  }>;
  fleetStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  alerts: {
    lowStock: Array<{
      id: string;
      itemCode: string;
      name: string;
      availableQty: number;
      reorderLevel: number;
      storeName: string;
      type: 'LOW_STOCK';
    }>;
    emergencyJobs: Array<{
      id: string;
      jobCardNumber: string;
      assetName: string;
      description: string;
      status: string;
      createdAt: string;
      type: 'EMERGENCY_JOB';
    }>;
    overdueJobs: Array<{
      id: string;
      jobCardNumber: string;
      assetName: string;
      status: string;
      scheduledEnd: string | null;
      type: 'OVERDUE_JOB';
    }>;
    pendingApprovals: {
      materialRequests: number;
      jobCards: number;
      total: number;
    };
  };
  weeklyActivity: Array<{
    day: string;
    date: string;
    created: number;
    completed: number;
  }>;
  generatedAt: string;
}

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#6b7280', '#06b6d4', '#ec4899'];
const STATUS_COLORS: Record<string, string> = {
  'OPERATIONAL': '#10b981',
  'UNDER_REPAIR': '#f59e0b',
  'STANDBY': '#3b82f6',
  'OUT_OF_SERVICE': '#ef4444',
  'DISPOSED': '#6b7280',
};

const chartConfig = {
  completed: {
    label: "Completed",
    color: "#10b981",
  },
  created: {
    label: "Created",
    color: "#3b82f6",
  },
  estimated: {
    label: "Estimated",
    color: "#3b82f6",
  },
  actual: {
    label: "Actual",
    color: "#10b981",
  },
  receipts: {
    label: "Receipts",
    color: "#10b981",
  },
  issues: {
    label: "Issues",
    color: "#f59e0b",
  },
  mttr: {
    label: "MTTR (hrs)",
    color: "#ef4444",
  },
  mtbf: {
    label: "MTBF (hrs)",
    color: "#10b981",
  },
  jobsCompleted: {
    label: "Jobs Completed",
    color: "#10b981",
  },
} satisfies ChartConfig;

const statusColors: Record<string, string> = {
  'DRAFT': 'bg-slate-100 text-foreground',
  'APPROVED': 'bg-blue-100 text-blue-700',
  'IN_PROGRESS': 'bg-purple-100 text-purple-700',
  'COMPLETED': 'bg-emerald-100 text-emerald-700',
  'CLOSED': 'bg-slate-100 text-muted-foreground',
  'CANCELLED': 'bg-red-100 text-red-700',
  'ON_HOLD': 'bg-amber-100 text-amber-700',
};

const priorityColors: Record<string, string> = {
  'CRITICAL': 'bg-red-500',
  'EMERGENCY': 'bg-red-600',
  'HIGH': 'bg-amber-500',
  'NORMAL': 'bg-blue-500',
  'LOW': 'bg-slate-400',
};

interface DashboardViewProps {
  onNavigate?: (tab: string) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [widgets, setWidgets] = useState<WidgetsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [widgetsLoading, setWidgetsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchAnalytics();
    fetchWidgets();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/dashboard?period=month');
      if (response.ok) {
        const data = await response.json();
        setStats(data.data || data);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const response = await fetch('/api/dashboard/analytics?months=6');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data || data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchWidgets = async () => {
    try {
      setWidgetsLoading(true);
      const response = await fetch('/api/dashboard/widgets');
      if (response.ok) {
        const data = await response.json();
        setWidgets(data.data || data);
      }
    } catch (err) {
      console.error('Failed to fetch widgets:', err);
    } finally {
      setWidgetsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-6 auto-rows-[120px]">
          <Skeleton className="col-span-1 md:col-span-3 xl:col-span-6 row-span-2 h-full" />
          <Skeleton className="col-span-1 md:col-span-3 xl:col-span-3 row-span-1 h-full" />
          <Skeleton className="col-span-1 md:col-span-3 xl:col-span-3 row-span-1 h-full" />
          <Skeleton className="col-span-1 md:col-span-3 xl:col-span-6 row-span-1 h-full" />
          
          <Skeleton className="col-span-1 md:col-span-6 xl:col-span-12 row-span-3 h-full mt-4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-700 font-medium">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchDashboardStats}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const summary = stats?.summary;
  const charts = stats?.charts;

  const kpiCards = [
    {
      title: 'Total Assets',
      value: summary?.assets?.total || 0,
      subtitle: `${summary?.assets?.operational || 0} operational (${summary?.assets?.availability || 0}% availability)`,
      icon: Truck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Active Job Cards',
      value: summary?.jobCards?.open || 0,
      subtitle: `${summary?.jobCards?.completed || 0} completed this period`,
      icon: Wrench,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      alert: summary?.jobCards?.emergency ? { count: summary.jobCards.emergency, label: 'Emergency' } : undefined,
    },
    {
      title: 'Pending MRs',
      value: summary?.materialRequests?.pending || 0,
      subtitle: `${summary?.materialRequests?.approved || 0} approved`,
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Low Stock Alerts',
      value: summary?.inventory?.lowStockItems || 0,
      subtitle: `Total value: LKR ${Number(summary?.inventory?.totalValue || 0).toLocaleString()}`,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  const analyticsKpiCards = analytics ? [
    {
      title: 'MTTR (Avg Repair Time)',
      value: `${analytics.reliability.mttr.overall.toFixed(1)}h`,
      subtitle: 'Mean Time To Repair',
      icon: Timer,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: analytics.reliability.mttr.overall < 24 ? 'down' as const : 'up' as const,
    },
    {
      title: 'MTBF (Avg Between Failures)',
      value: `${analytics.reliability.mtbf.overall.toFixed(0)}h`,
      subtitle: 'Mean Time Between Failures',
      icon: RefreshCw,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      trend: analytics.reliability.mtbf.overall > 720 ? 'up' as const : 'down' as const,
    },
    {
      title: 'Asset Utilization',
      value: `${analytics.assets.utilization.rate}%`,
      subtitle: `${analytics.assets.utilization.operational} of ${analytics.assets.utilization.total} operational`,
      icon: Gauge,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Cost Variance',
      value: `${Math.abs(analytics.costs.variance).toFixed(1)}%`,
      subtitle: analytics.costs.isOverBudget ? 'Over budget' : 'Under budget',
      icon: analytics.costs.isOverBudget ? TrendingUp : TrendingDown,
      color: analytics.costs.isOverBudget ? 'text-red-600' : 'text-emerald-600',
      bgColor: analytics.costs.isOverBudget ? 'bg-red-50' : 'bg-emerald-50',
    },
  ] : [];

  // Quick action cards data
  const quickActionCards = widgets ? [
    {
      title: "Today's Completed",
      value: widgets.quickActions.todaysCompletedJobs,
      subtitle: 'Jobs completed today',
      icon: CheckCircle,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Due Today',
      value: widgets.quickActions.jobsDueToday,
      subtitle: 'Jobs scheduled for today',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Overdue PM',
      value: widgets.quickActions.overduePmSchedules,
      subtitle: 'PM schedules overdue',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Pending Approvals',
      value: widgets.quickActions.pendingApprovals,
      subtitle: 'Awaiting approval',
      icon: ClipboardCheck,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ] : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-foreground mt-1">{kpi.value}</p>
                    {kpi.alert && kpi.alert.count > 0 && (
                      <Badge className="bg-red-500 text-white text-xs animate-pulse">
                        {kpi.alert.count} {kpi.alert.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
                </div>
                <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Action Cards */}
      {widgets && !widgetsLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActionCards.map((card, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Analytics KPI Cards */}
      {analytics && !analyticsLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {analyticsKpiCards.map((kpi, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.title}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-bold text-foreground mt-1">{kpi.value}</p>
                      {kpi.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                    <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Widgets Row: Technician Performance + Fleet Status + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Technician Performance Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-emerald-600" />
              Top Technicians
            </CardTitle>
            <CardDescription>Jobs completed this month</CardDescription>
          </CardHeader>
          <CardContent>
            {widgets && widgets.topTechnicians.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={widgets.topTechnicians} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={11} width={80} tickFormatter={(value) => value.length > 10 ? `${value.slice(0, 10)}...` : value} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-card p-2 border rounded shadow-sm">
                              <p className="font-medium">{data.name}</p>
                              <p className="text-sm text-muted-foreground">Jobs: {data.jobsCompleted}</p>
                              <p className="text-sm text-muted-foreground">Avg Time: {data.avgCompletionTime}h</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="jobsCompleted" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No technician data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fleet Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-5 w-5 text-emerald-600" />
              Fleet Status
            </CardTitle>
            <CardDescription>Asset status distribution</CardDescription>
          </CardHeader>
          <CardContent>
            {widgets && widgets.fleetStatus.length > 0 ? (
              <div className="flex flex-col items-center">
                <div className="w-[150px] h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={widgets.fleetStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="status"
                      >
                        {widgets.fleetStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full mt-4 space-y-2 max-h-[100px] overflow-y-auto">
                  {widgets.fleetStatus.map((item, index) => (
                    <div key={item.status} className="flex items-center gap-2 text-sm">
                      <div 
                        className="w-3 h-3 rounded" 
                        style={{ backgroundColor: STATUS_COLORS[item.status] || COLORS[index % COLORS.length] }}
                      />
                      <span className="text-muted-foreground flex-1">{item.status}</span>
                      <span className="font-medium">{item.count}</span>
                      <span className="text-muted-foreground text-xs">({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No fleet data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts Widget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Critical Alerts
            </CardTitle>
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            {widgets ? (
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                {/* Emergency Jobs */}
                {widgets.alerts.emergencyJobs.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-600">Emergency Jobs ({widgets.alerts.emergencyJobs.length})</span>
                    </div>
                    {widgets.alerts.emergencyJobs.slice(0, 2).map((job) => (
                      <div key={job.id} className="pl-6 text-xs text-muted-foreground">
                        <span className="font-medium">{job.jobCardNumber}</span> - {job.assetName}
                      </div>
                    ))}
                  </div>
                )}

                {/* Low Stock */}
                {widgets.alerts.lowStock.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-600">Low Stock ({widgets.alerts.lowStock.length})</span>
                    </div>
                    {widgets.alerts.lowStock.slice(0, 2).map((item) => (
                      <div key={item.id} className="pl-6 text-xs text-muted-foreground">
                        <span className="font-medium">{item.itemCode}</span> - {item.availableQty}/{item.reorderLevel} units
                      </div>
                    ))}
                  </div>
                )}

                {/* Overdue Jobs */}
                {widgets.alerts.overdueJobs.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-600">Overdue Jobs ({widgets.alerts.overdueJobs.length})</span>
                    </div>
                    {widgets.alerts.overdueJobs.slice(0, 2).map((job) => (
                      <div key={job.id} className="pl-6 text-xs text-muted-foreground">
                        <span className="font-medium">{job.jobCardNumber}</span> - {job.assetName}
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending Approvals */}
                {widgets.alerts.pendingApprovals.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-600">Pending Approvals ({widgets.alerts.pendingApprovals.total})</span>
                    </div>
                    <div className="pl-6 text-xs text-muted-foreground">
                      MR: {widgets.alerts.pendingApprovals.materialRequests} | Job Cards: {widgets.alerts.pendingApprovals.jobCards}
                    </div>
                  </div>
                )}

                {widgets.alerts.emergencyJobs.length === 0 && 
                 widgets.alerts.lowStock.length === 0 && 
                 widgets.alerts.overdueJobs.length === 0 && 
                 widgets.alerts.pendingApprovals.total === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    No critical alerts
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Loading alerts...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            Weekly Activity
          </CardTitle>
          <CardDescription>Jobs created vs completed this week</CardDescription>
        </CardHeader>
        <CardContent>
          {widgets && widgets.weeklyActivity.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={widgets.weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="created" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Created" />
                  <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              No weekly activity data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Analytics Tabs */}
      {analytics && !analyticsLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              Advanced Analytics
            </CardTitle>
            <CardDescription>
              Last {analytics.period.months} months performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="trends" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="trends">Trends</TabsTrigger>
                <TabsTrigger value="reliability">Reliability</TabsTrigger>
                <TabsTrigger value="costs">Costs</TabsTrigger>
                <TabsTrigger value="inventory">Inventory</TabsTrigger>
              </TabsList>
              
              {/* Trends Tab */}
              <TabsContent value="trends" className="space-y-6 mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Job Card Trends */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Job Card Activity</CardTitle>
                      <CardDescription>Created vs Completed job cards</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analytics.monthlyTrends.jobCards}>
                            <defs>
                              <linearGradient id="colorCreatedTrend" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorCompletedTrend" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                            <YAxis stroke="#6b7280" fontSize={12} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend />
                            <Area 
                              type="monotone" 
                              dataKey="created" 
                              stroke="#3b82f6" 
                              fillOpacity={1} 
                              fill="url(#colorCreatedTrend)"
                              strokeWidth={2}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="completed" 
                              stroke="#10b981" 
                              fillOpacity={1} 
                              fill="url(#colorCompletedTrend)"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Asset Utilization by Category */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Asset Utilization by Category</CardTitle>
                      <CardDescription>Operational rate by asset type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.assets.byCategory} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis type="number" domain={[0, 100]} stroke="#6b7280" fontSize={12} />
                            <YAxis dataKey="category" type="category" stroke="#6b7280" fontSize={11} width={80} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="utilizationRate" fill="#10b981" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Reliability Tab */}
              <TabsContent value="reliability" className="space-y-6 mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* MTTR by Category */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Timer className="h-4 w-4 text-orange-500" />
                        MTTR by Asset Category
                      </CardTitle>
                      <CardDescription>Mean Time To Repair (hours)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.reliability.mttr.byCategory.length > 0 ? (
                        <ChartContainer config={chartConfig} className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.reliability.mttr.byCategory}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="code" stroke="#6b7280" fontSize={12} />
                              <YAxis stroke="#6b7280" fontSize={12} label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                              <ChartTooltip 
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-card p-2 border rounded shadow-sm">
                                        <p className="font-medium">{data.category}</p>
                                        <p className="text-sm text-muted-foreground">MTTR: {data.mttr}h</p>
                                        <p className="text-sm text-muted-foreground">Jobs: {data.jobCount}</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="mttr" fill="#f97316" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      ) : (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                          No repair time data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* MTBF by Category */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-emerald-500" />
                        MTBF by Asset Category
                      </CardTitle>
                      <CardDescription>Mean Time Between Failures (hours)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.reliability.mtbf.byCategory.length > 0 ? (
                        <ChartContainer config={chartConfig} className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.reliability.mtbf.byCategory}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis dataKey="code" stroke="#6b7280" fontSize={12} />
                              <YAxis stroke="#6b7280" fontSize={12} label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                              <ChartTooltip 
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-card p-2 border rounded shadow-sm">
                                        <p className="font-medium">{data.category}</p>
                                        <p className="text-sm text-muted-foreground">MTBF: {data.mtbf}h</p>
                                        <p className="text-sm text-muted-foreground">Breakdowns: {data.breakdownCount}</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="mtbf" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      ) : (
                        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                          No breakdown data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Asset Status Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Asset Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-8">
                      <div className="w-[200px] h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analytics.assets.utilization.byStatus}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="count"
                              nameKey="status"
                            >
                              {analytics.assets.utilization.byStatus.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-3">
                        {analytics.assets.utilization.byStatus.map((item, index) => (
                          <div key={item.status} className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded" 
                              style={{ backgroundColor: STATUS_COLORS[item.status] || COLORS[index % COLORS.length] }}
                            />
                            <span className="text-sm font-medium w-32">{item.status}</span>
                            <div className="flex-1">
                              <Progress value={item.percentage} className="h-2" />
                            </div>
                            <span className="text-sm text-muted-foreground w-20 text-right">
                              {item.count} ({item.percentage}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Costs Tab */}
              <TabsContent value="costs" className="space-y-6 mt-4">
                {/* Cost Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <DollarSign className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Estimated Cost</p>
                          <p className="text-xl font-bold">LKR {analytics.costs.totalEstimated.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                          <DollarSign className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Actual Cost</p>
                          <p className="text-xl font-bold">LKR {analytics.costs.totalActual.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${analytics.costs.isOverBudget ? 'bg-red-50' : 'bg-emerald-50'}`}>
                          {analytics.costs.isOverBudget ? (
                            <TrendingUp className="h-5 w-5 text-red-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-emerald-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Variance</p>
                          <p className={`text-xl font-bold ${analytics.costs.isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                            {analytics.costs.isOverBudget ? '+' : '-'}{Math.abs(analytics.costs.variance)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Cost Comparison Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Estimated vs Actual Cost</CardTitle>
                    <CardDescription>Monthly cost comparison</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={analytics.costs.monthly}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                          <YAxis stroke="#6b7280" fontSize={12} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Bar dataKey="estimated" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Estimated" />
                          <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} name="Actual" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Inventory Tab */}
              <TabsContent value="inventory" className="space-y-6 mt-4">
                {/* Inventory Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                          <TrendingDown className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Receipts</p>
                          <p className="text-xl font-bold">LKR {analytics.inventory.summary.totalReceipts.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 rounded-lg">
                          <Package className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Issues</p>
                          <p className="text-xl font-bold">LKR {analytics.inventory.summary.totalIssues.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Activity className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Avg Turnover Rate</p>
                          <p className="text-xl font-bold">{analytics.inventory.summary.avgTurnover.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Inventory Turnover Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Inventory Movement</CardTitle>
                    <CardDescription>Monthly receipts and issues</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.inventory.turnover}>
                          <defs>
                            <linearGradient id="colorReceiptsInv" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorIssuesInv" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                          <YAxis stroke="#6b7280" fontSize={12} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="receipts" 
                            stroke="#10b981" 
                            fillOpacity={1} 
                            fill="url(#colorReceiptsInv)"
                            strokeWidth={2}
                            name="Receipts"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="issues" 
                            stroke="#f59e0b" 
                            fillOpacity={1} 
                            fill="url(#colorIssuesInv)"
                            strokeWidth={2}
                            name="Issues"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Original Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Cards by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-600" />
              Job Cards by Status
            </CardTitle>
            <CardDescription>Current distribution of job card statuses</CardDescription>
          </CardHeader>
          <CardContent>
            {charts?.jobCardsByStatus && charts.jobCardsByStatus.length > 0 ? (
              <>
                <div className="h-[200px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.jobCardsByStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="status"
                        label={({ status, count }) => `${count}`}
                        labelLine={false}
                      >
                        {charts.jobCardsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {charts.jobCardsByStatus.map((item, index) => (
                    <div key={item.status} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-muted-foreground">{item.status} ({item.count})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No job card data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {charts?.jobCardsByPriority && charts.jobCardsByPriority.length > 0 ? (
              charts.jobCardsByPriority.map((item) => {
                const total = charts.jobCardsByPriority.reduce((sum, p) => sum + p.count, 0);
                const percentage = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div key={item.priority} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.priority}</span>
                      <span className="text-muted-foreground">{item.count} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className="h-2" 
                    />
                  </div>
                );
              })
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No priority data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Job Cards */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-600" />
                Recent Job Cards
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onNavigate?.('jobcards')}>
                View All
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.recent?.jobCards && stats.recent.jobCards.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {stats.recent.jobCards.map((jc) => (
                  <div 
                    key={jc.id} 
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="p-2 bg-card rounded-lg shadow-sm">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{jc.jobCardNumber}</span>
                        <Badge className={statusColors[jc.status] || 'bg-slate-100'} variant="secondary">
                          {jc.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{jc.asset?.name || 'No asset'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(jc.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {jc.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No recent job cards
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-600" />
              Top Assets by Job Card Count
            </CardTitle>
            <CardDescription>Assets requiring the most maintenance attention</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.topAssets && stats.topAssets.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {stats.topAssets.map((asset, index) => (
                  <div 
                    key={asset.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-full">
                      <span className="text-sm font-bold text-emerald-600">#{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{asset.assetNumber}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={statusColors[asset.status] || 'bg-slate-100'}>
                        {asset.status}
                      </Badge>
                      <p className="text-sm font-bold text-foreground mt-1">{asset.jobCardCount} jobs</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No asset data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onNavigate?.('jobcards')}
            >
              <Wrench className="h-4 w-4 mr-2" />
              New Job Card
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate?.('requests')}
            >
              <Package className="h-4 w-4 mr-2" />
              New Material Request
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate?.('assets')}
            >
              <Truck className="h-4 w-4 mr-2" />
              Register Asset
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate?.('pm')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule PM
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      {stats?.generatedAt && (
        <div className="text-xs text-muted-foreground text-center">
          Last updated: {new Date(stats.generatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
