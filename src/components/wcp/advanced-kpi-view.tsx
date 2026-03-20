'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Gauge,
  Target,
  BarChart3,
  LineChart,
  Settings,
  ChevronUp,
  ChevronDown,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// Types
interface KPIPrediction {
  kpiId: string;
  currentValue: number;
  predictedValue: number;
  predictionDate: string;
  confidence: number;
  method: 'LINEAR' | 'MOVING_AVERAGE' | 'EXPONENTIAL_SMOOTHING';
}

interface KPIResult {
  id: string;
  name: string;
  category: 'OPERATIONAL' | 'RELIABILITY' | 'COST' | 'INVENTORY';
  currentValue: number;
  previousValue: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendPercentage: number;
  target: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
  unit: string;
  description: string;
  prediction?: KPIPrediction;
  historicalValues?: Array<{ date: string; value: number }>;
  sparklineData?: number[];
}

interface KPISummary {
  total: number;
  onTrack: number;
  atRisk: number;
  offTrack: number;
  byCategory: {
    OPERATIONAL: { total: number; avgValue: number };
    RELIABILITY: { total: number; avgValue: number };
    COST: { total: number; avgValue: number };
    INVENTORY: { total: number; avgValue: number };
  };
}

interface AdvancedKPIData {
  kpis: KPIResult[];
  summary: KPISummary;
  healthScore: number;
  period: { start: string; end: string };
  computedAt: string;
}

const CHART_COLORS = {
  operational: '#10b981', // emerald
  reliability: '#3b82f6', // blue
  cost: '#f59e0b', // amber
  inventory: '#8b5cf6', // purple
  onTrack: '#10b981',
  atRisk: '#f59e0b',
  offTrack: '#ef4444',
};

const CATEGORY_COLORS: Record<string, string> = {
  OPERATIONAL: '#10b981',
  RELIABILITY: '#3b82f6',
  COST: '#f59e0b',
  INVENTORY: '#8b5cf6',
};

export function AdvancedKpiView() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AdvancedKPIData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<KPIResult | null>(null);
  const [months, setMonths] = useState('3');

  // Fetch KPI data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/kpi/advanced?includePredictions=true&months=${months}`
      );
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [months]);

  // Get status badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; icon: React.ReactNode }> = {
      ON_TRACK: {
        bg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: <CheckCircle className="h-3 w-3" />,
      },
      AT_RISK: {
        bg: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: <AlertTriangle className="h-3 w-3" />,
      },
      OFF_TRACK: {
        bg: 'bg-red-100 text-red-700 border-red-200',
        icon: <AlertCircle className="h-3 w-3" />,
      },
    };
    const style = styles[status] || styles.ON_TRACK;
    return (
      <Badge variant="outline" className={`${style.bg} flex items-center gap-1`}>
        {style.icon}
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  // Get trend indicator
  const getTrendIndicator = (trend: string, percentage: number) => {
    if (trend === 'UP') {
      return (
        <div className="flex items-center gap-1 text-emerald-600">
          <TrendingUp className="h-4 w-4" />
          <span className="text-sm font-medium">+{percentage.toFixed(1)}%</span>
        </div>
      );
    } else if (trend === 'DOWN') {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <TrendingDown className="h-4 w-4" />
          <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-4 w-4" />
        <span className="text-sm">Stable</span>
      </div>
    );
  };

  // Get category badge
  const getCategoryBadge = (category: string) => {
    const color = CATEGORY_COLORS[category] || '#6b7280';
    return (
      <Badge
        variant="outline"
        style={{
          borderColor: color,
          color: color,
          backgroundColor: `${color}15`,
        }}
      >
        {category}
      </Badge>
    );
  };

  // Render sparkline
  const renderSparkline = (values: number[] | undefined, color: string) => {
    if (!values || values.length < 2) {
      return <span className="text-xs text-muted-foreground">No trend data</span>;
    }

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    const points = values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = 100 - ((v - min) / range) * 100;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg viewBox="0 0 100 100" className="h-12 w-24" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  // Filter KPIs
  const filteredKPIs =
    data?.kpis.filter((kpi) => {
      if (selectedCategory !== 'all' && kpi.category !== selectedCategory) return false;
      return true;
    }) || [];

  // Health score gauge
  const renderHealthGauge = (score: number) => {
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (score / 100) * circumference;
    const color =
      score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

    return (
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
    );
  };

  // Status distribution chart data
  const statusDistributionData = data
    ? [
        { name: 'On Track', value: data.summary.onTrack, color: CHART_COLORS.onTrack },
        { name: 'At Risk', value: data.summary.atRisk, color: CHART_COLORS.atRisk },
        { name: 'Off Track', value: data.summary.offTrack, color: CHART_COLORS.offTrack },
      ]
    : [];

  // Category performance chart data
  const categoryData = data
    ? [
        {
          category: 'Operational',
          avgValue: data.summary.byCategory.OPERATIONAL.avgValue,
          total: data.summary.byCategory.OPERATIONAL.total,
          color: CATEGORY_COLORS.OPERATIONAL,
        },
        {
          category: 'Reliability',
          avgValue: data.summary.byCategory.RELIABILITY.avgValue,
          total: data.summary.byCategory.RELIABILITY.total,
          color: CATEGORY_COLORS.RELIABILITY,
        },
        {
          category: 'Cost',
          avgValue: data.summary.byCategory.COST.avgValue,
          total: data.summary.byCategory.COST.total,
          color: CATEGORY_COLORS.COST,
        },
        {
          category: 'Inventory',
          avgValue: data.summary.byCategory.INVENTORY.avgValue,
          total: data.summary.byCategory.INVENTORY.total,
          color: CATEGORY_COLORS.INVENTORY,
        },
      ]
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Advanced KPI Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Performance metrics with trend analysis and predictive indicators
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchData} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Health Score</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {renderHealthGauge(data?.healthScore || 0)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total KPIs</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.summary.total || 0}</div>
            <p className="text-xs text-muted-foreground">Tracked metrics</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {data?.summary.onTrack || 0}
            </div>
            <Progress
              value={
                data && data.summary.total > 0
                  ? (data.summary.onTrack / data.summary.total) * 100
                  : 0
              }
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {(data?.summary.atRisk || 0) + (data?.summary.offTrack || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.summary.atRisk || 0} at risk, {data?.summary.offTrack || 0} off track
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="operational" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Operational
          </TabsTrigger>
          <TabsTrigger value="reliability" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Reliability
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Predictions
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status Distribution</CardTitle>
                <CardDescription>KPIs by performance status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  {statusDistributionData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category Performance</CardTitle>
                <CardDescription>Average value by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <RechartsTooltip />
                      <Bar dataKey="avgValue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KPI Cards Grid */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">All KPIs</h3>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="OPERATIONAL">Operational</SelectItem>
                <SelectItem value="RELIABILITY">Reliability</SelectItem>
                <SelectItem value="COST">Cost</SelectItem>
                <SelectItem value="INVENTORY">Inventory</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredKPIs.map((kpi) => (
              <Card
                key={kpi.id}
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  kpi.status === 'OFF_TRACK'
                    ? 'border-red-300'
                    : kpi.status === 'AT_RISK'
                    ? 'border-amber-300'
                    : ''
                }`}
                onClick={() => {
                  setSelectedKPI(kpi);
                  setShowConfigDialog(true);
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {kpi.description}
                      </CardDescription>
                    </div>
                    {getStatusBadge(kpi.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold">{kpi.currentValue.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground mb-1">{kpi.unit}</span>
                    </div>
                    {getTrendIndicator(kpi.trend, kpi.trendPercentage)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryBadge(kpi.category)}
                      <span className="text-xs text-muted-foreground">
                        Target: {kpi.target} {kpi.unit}
                      </span>
                    </div>
                    {renderSparkline(kpi.sparklineData, CATEGORY_COLORS[kpi.category])}
                  </div>
                  {kpi.prediction && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2 text-xs">
                        <Sparkles className="h-3 w-3 text-purple-500" />
                        <span className="text-muted-foreground">Predicted:</span>
                        <span className="font-medium">
                          {kpi.prediction.predictedValue.toFixed(1)} {kpi.unit}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {kpi.prediction.confidence.toFixed(0)}% confidence
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Operational Tab */}
        <TabsContent value="operational" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredKPIs
              .filter((k) => k.category === 'OPERATIONAL')
              .map((kpi) => (
                <Card key={kpi.id} className={kpi.status !== 'ON_TRACK' ? 'border-amber-300' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
                      {getStatusBadge(kpi.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2 mb-3">
                      <span className="text-2xl font-bold">{kpi.currentValue.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground mb-1">{kpi.unit}</span>
                    </div>
                    <Progress
                      value={Math.min(100, (kpi.currentValue / kpi.target) * 100)}
                      className="h-2"
                    />
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>Target: {kpi.target}</span>
                      {getTrendIndicator(kpi.trend, kpi.trendPercentage)}
                    </div>
                    {kpi.historicalValues && kpi.historicalValues.length > 1 && (
                      <div className="mt-4 h-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={kpi.historicalValues}>
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke={CATEGORY_COLORS.OPERATIONAL}
                              fill={`${CATEGORY_COLORS.OPERATIONAL}20`}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* Reliability Tab */}
        <TabsContent value="reliability" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredKPIs
              .filter((k) => k.category === 'RELIABILITY')
              .map((kpi) => (
                <Card key={kpi.id} className={kpi.status !== 'ON_TRACK' ? 'border-amber-300' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
                      {getStatusBadge(kpi.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2 mb-3">
                      <span className="text-2xl font-bold">{kpi.currentValue.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground mb-1">{kpi.unit}</span>
                    </div>
                    <Progress
                      value={Math.min(100, (kpi.currentValue / kpi.target) * 100)}
                      className="h-2"
                    />
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>Target: {kpi.target}</span>
                      {getTrendIndicator(kpi.trend, kpi.trendPercentage)}
                    </div>
                    {kpi.historicalValues && kpi.historicalValues.length > 1 && (
                      <div className="mt-4 h-24">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={kpi.historicalValues}>
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke={CATEGORY_COLORS.RELIABILITY}
                              fill={`${CATEGORY_COLORS.RELIABILITY}20`}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Predictive Analytics
              </CardTitle>
              <CardDescription>
                Forecasted KPI values based on historical trends using linear regression
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredKPIs
                  .filter((k) => k.prediction)
                  .map((kpi) => (
                    <div
                      key={kpi.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">{kpi.name}</p>
                          <p className="text-sm text-muted-foreground">{kpi.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Current</p>
                          <p className="text-lg font-semibold">
                            {kpi.currentValue.toFixed(1)} {kpi.unit}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Predicted</p>
                          <p className="text-lg font-semibold text-purple-600">
                            {kpi.prediction?.predictedValue.toFixed(1)} {kpi.unit}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Confidence</p>
                          <Badge
                            variant="outline"
                            className={
                              (kpi.prediction?.confidence || 0) >= 70
                                ? 'bg-emerald-100 text-emerald-700'
                                : (kpi.prediction?.confidence || 0) >= 50
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }
                          >
                            {kpi.prediction?.confidence.toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Method</p>
                          <p className="text-sm font-medium">
                            {kpi.prediction?.method.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                {filteredKPIs.filter((k) => k.prediction).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <LineChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No predictions available yet.</p>
                    <p className="text-sm">
                      Need at least 3 historical data points to generate predictions.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Threshold Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Threshold Configuration
              </CardTitle>
              <CardDescription>
                Set warning and critical thresholds for each KPI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredKPIs.slice(0, 5).map((kpi) => (
                  <div
                    key={kpi.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{kpi.name}</p>
                      <p className="text-sm text-muted-foreground">{kpi.category}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <Label className="text-xs">Warning</Label>
                        <Input
                          type="number"
                          className="w-20 h-8"
                          placeholder={kpi.target.toString()}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Critical</Label>
                        <Input
                          type="number"
                          className="w-20 h-8"
                          placeholder={(kpi.target * 0.8).toFixed(0)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* KPI Detail Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedKPI?.name}</DialogTitle>
            <DialogDescription>{selectedKPI?.description}</DialogDescription>
          </DialogHeader>
          {selectedKPI && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Current Value</p>
                  <p className="text-2xl font-bold">
                    {selectedKPI.currentValue.toFixed(1)} {selectedKPI.unit}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Previous Value</p>
                  <p className="text-2xl font-bold">
                    {selectedKPI.previousValue.toFixed(1)} {selectedKPI.unit}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Target</p>
                  <p className="text-2xl font-bold">
                    {selectedKPI.target} {selectedKPI.unit}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Trend</p>
                  {getTrendIndicator(selectedKPI.trend, selectedKPI.trendPercentage)}
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  {getStatusBadge(selectedKPI.status)}
                </div>
              </div>

              {selectedKPI.historicalValues && selectedKPI.historicalValues.length > 1 && (
                <div>
                  <p className="text-sm font-medium mb-2">Historical Trend</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={selectedKPI.historicalValues}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(v) => new Date(v).toLocaleDateString()}
                        />
                        <YAxis />
                        <RechartsTooltip
                          labelFormatter={(v) => new Date(v).toLocaleDateString()}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={CATEGORY_COLORS[selectedKPI.category]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {selectedKPI.prediction && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <p className="font-medium text-purple-700">Prediction</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Predicted Value</p>
                      <p className="font-semibold">
                        {selectedKPI.prediction.predictedValue.toFixed(1)} {selectedKPI.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Confidence</p>
                      <p className="font-semibold">
                        {selectedKPI.prediction.confidence.toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Method</p>
                      <p className="font-semibold">{selectedKPI.prediction.method}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ChevronRight icon component
function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
