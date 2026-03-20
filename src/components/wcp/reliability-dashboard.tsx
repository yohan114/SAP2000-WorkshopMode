'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  RefreshCw,
  Gauge,
  AlertTriangle,
  BarChart3,
  Timer,
  Truck,
  Wrench,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  CheckCircle,
  XCircle,
  Package,
} from 'lucide-react';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================
// TYPES
// ============================================

interface FleetReliability {
  mtbf: number;
  mttr: number;
  availability: number;
  reliabilityRate: number;
  totalFailures: number;
  totalDowntime: number;
  totalOperatingTime: number;
  totalAssets: number;
  operationalAssets: number;
  underRepairAssets: number;
}

interface CategoryReliability {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  assetCount: number;
  mtbf: number;
  mttr: number;
  availability: number;
  reliabilityRate: number;
  totalFailures: number;
  totalDowntime: number;
  totalOperatingTime: number;
}

interface AssetReliability {
  assetId: string;
  assetNumber: string;
  assetName: string;
  category: string;
  categoryId: string;
  mtbf: number;
  mttr: number;
  availability: number;
  reliabilityRate: number;
  totalFailures: number;
  totalDowntime: number;
  totalOperatingTime: number;
}

interface MtbfTrend {
  period: string;
  mtbf: number;
  failureCount: number;
  downtimeHours: number;
}

interface RepairTimeDistribution {
  category: string;
  avgRepairTime: number;
  minRepairTime: number;
  maxRepairTime: number;
  repairCount: number;
}

interface FailureCause {
  cause: string;
  count: number;
  percentage: number;
  totalDowntime: number;
}

interface ReliabilityData {
  fleet: FleetReliability;
  categories: CategoryReliability[];
  mtbfTrend: MtbfTrend[];
  mttrByCategory: RepairTimeDistribution[];
  topProblematicAssets: AssetReliability[];
  failureCauses: FailureCause[];
}

// ============================================
// CONSTANTS
// ============================================

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#6b7280', '#06b6d4', '#ec4899'];
const RELIABILITY_COLORS = {
  excellent: '#10b981', // >90%
  good: '#3b82f6',      // 80-90%
  fair: '#f59e0b',      // 60-80%
  poor: '#ef4444',      // <60%
};

const chartConfig = {
  mtbf: {
    label: "MTBF (hrs)",
    color: "#10b981",
  },
  mttr: {
    label: "MTTR (hrs)",
    color: "#f59e0b",
  },
  availability: {
    label: "Availability %",
    color: "#3b82f6",
  },
  reliabilityRate: {
    label: "Reliability %",
    color: "#10b981",
  },
  avgRepairTime: {
    label: "Avg Repair Time",
    color: "#f59e0b",
  },
  count: {
    label: "Count",
    color: "#3b82f6",
  },
  percentage: {
    label: "%",
    color: "#8b5cf6",
  },
} satisfies ChartConfig;

// ============================================
// HELPER FUNCTIONS
// ============================================

function getReliabilityColor(rate: number): string {
  if (rate >= 90) return RELIABILITY_COLORS.excellent;
  if (rate >= 80) return RELIABILITY_COLORS.good;
  if (rate >= 60) return RELIABILITY_COLORS.fair;
  return RELIABILITY_COLORS.poor;
}

function getReliabilityBadge(rate: number): { label: string; className: string } {
  if (rate >= 90) return { label: 'Excellent', className: 'bg-emerald-100 text-emerald-700' };
  if (rate >= 80) return { label: 'Good', className: 'bg-blue-100 text-blue-700' };
  if (rate >= 60) return { label: 'Fair', className: 'bg-amber-100 text-amber-700' };
  return { label: 'Poor', className: 'bg-red-100 text-red-700' };
}

function formatNumber(num: number, decimals: number = 1): string {
  return num.toFixed(decimals);
}

// ============================================
// COMPONENT
// ============================================

export function ReliabilityDashboard() {
  const [data, setData] = useState<ReliabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState('6');
  const [sortBy, setSortBy] = useState<'reliability' | 'failures' | 'downtime'>('reliability');

  useEffect(() => {
    fetchData();
  }, [months, sortBy]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth() - parseInt(months) + 1, 1);
      
      const response = await fetch(
        `/api/analytics/mtbf-mttr?groupBy=fleet&months=${months}&limit=10&sortBy=${sortBy}`
      );
      
      if (response.ok) {
        const result = await response.json();
        setData(result.data || result);
      } else {
        setError('Failed to load reliability data');
      }
    } catch (err) {
      console.error('Failed to fetch reliability data:', err);
      setError('Failed to load reliability data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Reliability Analytics</h2>
            <p className="text-muted-foreground">MTBF/MTTR Dashboard</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-[350px] bg-slate-200 rounded"></div>
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-[350px] bg-slate-200 rounded"></div>
            </CardContent>
          </Card>
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
            <Button variant="outline" className="mt-4" onClick={fetchData}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { fleet, categories, mtbfTrend, mttrByCategory, topProblematicAssets, failureCauses } = data;

  // KPI Cards Data
  const kpiCards = [
    {
      title: 'MTBF',
      value: `${formatNumber(fleet.mtbf, 0)}h`,
      subtitle: 'Mean Time Between Failures',
      icon: RefreshCw,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      trend: fleet.mtbf > 720 ? 'up' : 'down',
      trendLabel: fleet.mtbf > 720 ? 'Healthy' : 'Needs Attention',
    },
    {
      title: 'MTTR',
      value: `${formatNumber(fleet.mttr, 1)}h`,
      subtitle: 'Mean Time To Repair',
      icon: Timer,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      trend: fleet.mttr < 24 ? 'up' : 'down',
      trendLabel: fleet.mttr < 24 ? 'Efficient' : 'Room for Improvement',
    },
    {
      title: 'Availability',
      value: `${formatNumber(fleet.availability, 1)}%`,
      subtitle: `${fleet.operationalAssets} of ${fleet.totalAssets} assets operational`,
      icon: Gauge,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Reliability Rate',
      value: `${formatNumber(fleet.reliabilityRate, 1)}%`,
      subtitle: `${fleet.totalFailures} failures, ${formatNumber(fleet.totalDowntime, 0)}h downtime`,
      icon: Activity,
      color: fleet.reliabilityRate >= 80 ? 'text-emerald-600' : fleet.reliabilityRate >= 60 ? 'text-amber-600' : 'text-red-600',
      bgColor: fleet.reliabilityRate >= 80 ? 'bg-emerald-50' : fleet.reliabilityRate >= 60 ? 'bg-amber-50' : 'bg-red-50',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reliability Analytics</h2>
          <p className="text-muted-foreground">MTBF/MTTR Dashboard - Fleet Performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                    {kpi.trend && (
                      kpi.trend === 'up' 
                        ? <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                        : <ArrowDownRight className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
                  {kpi.trendLabel && (
                    <Badge 
                      variant="outline" 
                      className={kpi.trend === 'up' ? 'mt-2 border-emerald-200 text-emerald-700' : 'mt-2 border-red-200 text-red-700'}
                    >
                      {kpi.trendLabel}
                    </Badge>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="assets">Asset Ranking</TabsTrigger>
          <TabsTrigger value="failures">Failure Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MTBF Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <RefreshCw className="h-5 w-5 text-emerald-600" />
                  MTBF Trend
                </CardTitle>
                <CardDescription>Mean Time Between Failures over time</CardDescription>
              </CardHeader>
              <CardContent>
                {mtbfTrend.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mtbfTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="period" stroke="#6b7280" fontSize={11} />
                        <YAxis stroke="#6b7280" fontSize={12} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line 
                          type="monotone" 
                          dataKey="mtbf" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          dot={{ fill: '#10b981', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No trend data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* MTTR by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Timer className="h-5 w-5 text-amber-600" />
                  MTTR by Category
                </CardTitle>
                <CardDescription>Average repair time by asset category</CardDescription>
              </CardHeader>
              <CardContent>
                {mttrByCategory.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mttrByCategory} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" stroke="#6b7280" fontSize={12} />
                        <YAxis 
                          dataKey="category" 
                          type="category" 
                          stroke="#6b7280" 
                          fontSize={10} 
                          width={100}
                          tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}...` : value}
                        />
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-card p-2 border rounded shadow-sm">
                                  <p className="font-medium text-sm">{data.category}</p>
                                  <p className="text-xs text-muted-foreground">Avg: {data.avgRepairTime}h</p>
                                  <p className="text-xs text-muted-foreground">Min: {data.minRepairTime}h | Max: {data.maxRepairTime}h</p>
                                  <p className="text-xs text-muted-foreground">Repairs: {data.repairCount}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="avgRepairTime" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No repair time data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Category Reliability Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Category Reliability Summary
              </CardTitle>
              <CardDescription>Reliability metrics by asset category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Assets</TableHead>
                      <TableHead className="text-right">MTBF (hrs)</TableHead>
                      <TableHead className="text-right">MTTR (hrs)</TableHead>
                      <TableHead className="text-right">Availability</TableHead>
                      <TableHead className="text-right">Reliability</TableHead>
                      <TableHead className="text-right">Failures</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat) => {
                      const badge = getReliabilityBadge(cat.reliabilityRate);
                      return (
                        <TableRow key={cat.categoryId}>
                          <TableCell className="font-medium">{cat.categoryName}</TableCell>
                          <TableCell className="text-right">{cat.assetCount}</TableCell>
                          <TableCell className="text-right">{formatNumber(cat.mtbf, 0)}</TableCell>
                          <TableCell className="text-right">{formatNumber(cat.mttr, 1)}</TableCell>
                          <TableCell className="text-right">{formatNumber(cat.availability, 1)}%</TableCell>
                          <TableCell className="text-right">
                            <span style={{ color: getReliabilityColor(cat.reliabilityRate) }}>
                              {formatNumber(cat.reliabilityRate, 1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{cat.totalFailures}</TableCell>
                          <TableCell className="text-right">
                            <Badge className={badge.className}>{badge.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Combined MTBF/MTTR Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">MTBF vs MTTR Trend</CardTitle>
                <CardDescription>Reliability metrics comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={mtbfTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="period" stroke="#6b7280" fontSize={11} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="downtimeHours" fill="#ef4444" name="Downtime (hrs)" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="mtbf" stroke="#10b981" strokeWidth={2} name="MTBF (hrs)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Failure Count Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Failure Frequency</CardTitle>
                <CardDescription>Monthly breakdown counts</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mtbfTrend}>
                      <defs>
                        <linearGradient id="colorFailure" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="period" stroke="#6b7280" fontSize={11} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="failureCount" 
                        stroke="#ef4444" 
                        fillOpacity={1} 
                        fill="url(#colorFailure)"
                        strokeWidth={2}
                        name="Failures"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Asset Ranking Tab */}
        <TabsContent value="assets" className="space-y-6 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Asset Reliability Ranking</h3>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reliability">Lowest Reliability</SelectItem>
                <SelectItem value="failures">Most Failures</SelectItem>
                <SelectItem value="downtime">Most Downtime</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Top Problematic Assets Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Top 10 Problematic Assets
              </CardTitle>
              <CardDescription>Assets with lowest reliability or most issues</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProblematicAssets}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="assetNumber" 
                      stroke="#6b7280" 
                      fontSize={10}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-card p-2 border rounded shadow-sm">
                              <p className="font-medium text-sm">{data.assetName}</p>
                              <p className="text-xs text-muted-foreground">{data.category}</p>
                              <p className="text-xs text-muted-foreground">Reliability: {data.reliabilityRate}%</p>
                              <p className="text-xs text-muted-foreground">Failures: {data.totalFailures} | Downtime: {data.totalDowntime}h</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="reliabilityRate" radius={[4, 4, 0, 0]}>
                      {topProblematicAssets.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getReliabilityColor(entry.reliabilityRate)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Asset Ranking Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Asset Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">MTBF (hrs)</TableHead>
                      <TableHead className="text-right">MTTR (hrs)</TableHead>
                      <TableHead className="text-right">Availability</TableHead>
                      <TableHead className="text-right">Reliability</TableHead>
                      <TableHead className="text-right">Failures</TableHead>
                      <TableHead className="text-right">Downtime</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProblematicAssets.map((asset) => (
                      <TableRow key={asset.assetId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{asset.assetNumber}</p>
                            <p className="text-xs text-muted-foreground">{asset.assetName}</p>
                          </div>
                        </TableCell>
                        <TableCell>{asset.category}</TableCell>
                        <TableCell className="text-right">{formatNumber(asset.mtbf, 0)}</TableCell>
                        <TableCell className="text-right">{formatNumber(asset.mttr, 1)}</TableCell>
                        <TableCell className="text-right">{formatNumber(asset.availability, 1)}%</TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            className={getReliabilityBadge(asset.reliabilityRate).className}
                          >
                            {formatNumber(asset.reliabilityRate, 1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{asset.totalFailures}</TableCell>
                        <TableCell className="text-right">{formatNumber(asset.totalDowntime, 0)}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Failure Analysis Tab */}
        <TabsContent value="failures" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Failure Causes Pareto Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  Failure Causes (Pareto)
                </CardTitle>
                <CardDescription>Distribution of failure causes</CardDescription>
              </CardHeader>
              <CardContent>
                {failureCauses.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={failureCauses.slice(0, 10)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" stroke="#6b7280" fontSize={12} />
                        <YAxis 
                          dataKey="cause" 
                          type="category" 
                          stroke="#6b7280" 
                          fontSize={9}
                          width={120}
                          tickFormatter={(value) => value.length > 18 ? `${value.slice(0, 18)}...` : value}
                        />
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-card p-2 border rounded shadow-sm">
                                  <p className="font-medium text-sm">{data.cause}</p>
                                  <p className="text-xs text-muted-foreground">Count: {data.count}</p>
                                  <p className="text-xs text-muted-foreground">Percentage: {data.percentage}%</p>
                                  <p className="text-xs text-muted-foreground">Total Downtime: {data.totalDowntime}h</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                    No failure cause data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Failure Causes Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Failure Distribution</CardTitle>
                <CardDescription>Breakdown by cause</CardDescription>
              </CardHeader>
              <CardContent>
                {failureCauses.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <div className="w-[250px] h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={failureCauses.slice(0, 6)}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="count"
                            nameKey="cause"
                            label={({ cause, percentage }) => `${percentage}%`}
                            labelLine={false}
                          >
                            {failureCauses.slice(0, 6).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full mt-4 space-y-2 max-h-[150px] overflow-y-auto">
                      {failureCauses.slice(0, 6).map((item, index) => (
                        <div key={item.cause} className="flex items-center gap-2 text-sm">
                          <div 
                            className="w-3 h-3 rounded flex-shrink-0" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-muted-foreground flex-1 truncate" title={item.cause}>{item.cause}</span>
                          <span className="font-medium">{item.count}</span>
                          <span className="text-muted-foreground text-xs">({item.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                    No failure cause data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Failure Causes Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Failure Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cause</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                      <TableHead className="text-right">Total Downtime</TableHead>
                      <TableHead className="text-right">Avg Downtime/Failure</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failureCauses.map((cause) => (
                      <TableRow key={cause.cause}>
                        <TableCell className="font-medium">{cause.cause}</TableCell>
                        <TableCell className="text-right">{cause.count}</TableCell>
                        <TableCell className="text-right">{cause.percentage}%</TableCell>
                        <TableCell className="text-right">{formatNumber(cause.totalDowntime, 1)}h</TableCell>
                        <TableCell className="text-right">
                          {cause.count > 0 ? formatNumber(cause.totalDowntime / cause.count, 1) : 0}h
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Footer */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Operational: {fleet.operationalAssets}
              </span>
              <span className="flex items-center gap-1">
                <Wrench className="h-4 w-4 text-amber-500" />
                Under Repair: {fleet.underRepairAssets}
              </span>
              <span className="flex items-center gap-1">
                <Truck className="h-4 w-4 text-blue-500" />
                Total Assets: {fleet.totalAssets}
              </span>
            </div>
            <div className="text-muted-foreground">
              Last updated: {new Date().toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
