'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  SelectValue,
} from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Gauge, 
  Activity,
  RefreshCw,
  Loader2,
  Target,
  AlertCircle
} from 'lucide-react';

// Types
interface KpiSnapshot {
  id: string;
  kpiCode: string;
  kpiName: string;
  category: string;
  value: number;
  target: number | null;
  unit: string | null;
  snapshotDate: string;
  period: string | null;
  flag: string;
  createdAt: string;
}

interface KpiThreshold {
  id: string;
  kpiCode: string;
  kpiName: string;
  category: string;
  amberThreshold: number;
  redThreshold: number;
  higherIsWorse: boolean;
  unit: string | null;
  isActive: boolean;
}

interface SlaConfig {
  id: string;
  slaType: string;
  name: string;
  responseHours: number | null;
  completionHours: number | null;
  escalationLevels: number | null;
  isActive: boolean;
}

interface SlaTracking {
  id: string;
  entityType: string;
  entityId: string;
  slaType: string;
  startedAt: string;
  targetAt: string;
  respondedAt: string | null;
  completedAt: string | null;
  status: string;
  isOverdue: boolean;
  timeRemaining: number;
  duration: number;
}

export function KpiSlaView() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  
  // Data states
  const [kpiSnapshots, setKpiSnapshots] = useState<KpiSnapshot[]>([]);
  const [kpiThresholds, setKpiThresholds] = useState<KpiThreshold[]>([]);
  const [slaConfigs, setSlaConfigs] = useState<SlaConfig[]>([]);
  const [slaTracking, setSlaTracking] = useState<SlaTracking[]>([]);
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Fetch data
  const fetchKpiSnapshots = async () => {
    try {
      const res = await fetch('/api/kpi/snapshots?limit=100');
      const data = await res.json();
      setKpiSnapshots(data.data || []);
    } catch (error) {
      console.error('Error fetching KPI snapshots:', error);
    }
  };

  const fetchKpiThresholds = async () => {
    try {
      const res = await fetch('/api/kpi/thresholds');
      const data = await res.json();
      setKpiThresholds(data.data || []);
    } catch (error) {
      console.error('Error fetching KPI thresholds:', error);
    }
  };

  const fetchSlaConfigs = async () => {
    try {
      const res = await fetch('/api/sla/configs');
      const data = await res.json();
      setSlaConfigs(data.data || []);
    } catch (error) {
      console.error('Error fetching SLA configs:', error);
    }
  };

  const fetchSlaTracking = async () => {
    try {
      const res = await fetch('/api/sla/tracking?limit=50');
      const data = await res.json();
      setSlaTracking(data.data || []);
    } catch (error) {
      console.error('Error fetching SLA tracking:', error);
    }
  };

  const computeKpis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/kpi/compute');
      const data = await res.json();
      if (data.data) {
        setKpiSnapshots(data.data.map((d: KpiSnapshot & { flag?: string }) => ({ ...d, flag: d.flag || 'GREEN' })));
      }
    } catch (error) {
      console.error('Error computing KPIs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKpiSnapshots();
    fetchKpiThresholds();
    fetchSlaConfigs();
    fetchSlaTracking();
  }, []);

  // Get latest KPI values by code
  const getLatestKpi = (code: string): KpiSnapshot | undefined => {
    return kpiSnapshots.find(s => s.kpiCode === code);
  };

  // Flag badge renderer
  const getFlagBadge = (flag: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      GREEN: { bg: 'bg-emerald-100 text-emerald-700', text: 'Good', icon: <CheckCircle className="h-3 w-3" /> },
      AMBER: { bg: 'bg-amber-100 text-amber-700', text: 'Warning', icon: <AlertTriangle className="h-3 w-3" /> },
      RED: { bg: 'bg-red-100 text-red-700', text: 'Critical', icon: <AlertCircle className="h-3 w-3" /> },
    };
    const style = styles[flag] || styles.GREEN;
    return (
      <Badge className={`${style.bg} flex items-center gap-1`}>
        {style.icon}
        {style.text}
      </Badge>
    );
  };

  // Status badge for SLA tracking
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-blue-100 text-blue-700',
      MET: 'bg-emerald-100 text-emerald-700',
      BREACH: 'bg-red-100 text-red-700',
      WAIVED: 'bg-purple-100 text-purple-700',
    };
    return <Badge className={styles[status] || 'bg-gray-100 text-gray-700'}>{status}</Badge>;
  };

  // Category badge
  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      Fleet: 'bg-cyan-100 text-cyan-700',
      PM: 'bg-orange-100 text-orange-700',
      Efficiency: 'bg-violet-100 text-violet-700',
      Reliability: 'bg-teal-100 text-teal-700',
      SLA: 'bg-rose-100 text-rose-700',
      Labour: 'bg-amber-100 text-amber-700',
      Inventory: 'bg-lime-100 text-lime-700',
      Fuel: 'bg-sky-100 text-sky-700',
      Procurement: 'bg-indigo-100 text-indigo-700',
      Cost: 'bg-pink-100 text-pink-700',
    };
    return <Badge variant="outline" className={colors[category] || 'bg-gray-100 text-gray-700'}>{category}</Badge>;
  };

  // Calculate progress for KPI gauge
  const getProgressValue = (kpi: KpiSnapshot): number => {
    if (!kpi.target) return 0;
    const value = kpi.value;
    const target = kpi.target;
    return Math.min(100, (value / target) * 100);
  };

  // Filter KPIs by category
  const filteredKpis = kpiSnapshots.filter(kpi => {
    if (selectedCategory !== 'all' && kpi.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && kpi.flag !== selectedStatus) return false;
    return true;
  });

  // Filter SLA tracking
  const filteredSla = slaTracking.filter(sla => {
    if (selectedStatus !== 'all' && sla.status !== selectedStatus) return false;
    return true;
  });

  // Summary stats
  const summary = {
    totalKpis: kpiSnapshots.length,
    green: kpiSnapshots.filter(k => k.flag === 'GREEN').length,
    amber: kpiSnapshots.filter(k => k.flag === 'AMBER').length,
    red: kpiSnapshots.filter(k => k.flag === 'RED').length,
    activeSla: slaTracking.filter(s => s.status === 'ACTIVE').length,
    breachedSla: slaTracking.filter(s => s.status === 'BREACH').length,
  };

  // Categories for filter
  const categories = ['all', ...new Set(kpiSnapshots.map(k => k.category))];

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="kpi" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            KPI Metrics
          </TabsTrigger>
          <TabsTrigger value="sla-config" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            SLA Config
          </TabsTrigger>
          <TabsTrigger value="sla-tracking" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            SLA Tracking
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total KPIs</CardTitle>
                <Activity className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalKpis}</div>
                <p className="text-xs text-muted-foreground">Tracked metrics</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Healthy (Green)</CardTitle>
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{summary.green}</div>
                <Progress value={summary.totalKpis > 0 ? (summary.green / summary.totalKpis) * 100 : 0} className="mt-2 h-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Warnings (Amber)</CardTitle>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{summary.amber}</div>
                <Progress value={summary.totalKpis > 0 ? (summary.amber / summary.totalKpis) * 100 : 0} className="mt-2 h-2 bg-amber-100 [&>div]:bg-amber-500" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Critical (Red)</CardTitle>
                <AlertCircle className="h-5 w-5 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{summary.red}</div>
                <Progress value={summary.totalKpis > 0 ? (summary.red / summary.totalKpis) * 100 : 0} className="mt-2 h-2 bg-red-100 [&>div]:bg-red-500" />
              </CardContent>
            </Card>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.filter(c => c !== 'all').map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="GREEN">Good (Green)</SelectItem>
                  <SelectItem value="AMBER">Warning (Amber)</SelectItem>
                  <SelectItem value="RED">Critical (Red)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={computeKpis} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Compute KPIs
            </Button>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredKpis.slice(0, 12).map((kpi) => (
              <Card key={kpi.id} className={`${kpi.flag === 'RED' ? 'border-red-300' : kpi.flag === 'AMBER' ? 'border-amber-300' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{kpi.kpiCode}</CardTitle>
                    {getFlagBadge(kpi.flag)}
                  </div>
                  <CardDescription className="text-xs">{kpi.kpiName}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold">{kpi.value.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground mb-1">{kpi.unit || ''}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{getCategoryBadge(kpi.category)}</span>
                    <span>{new Date(kpi.snapshotDate).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* SLA Summary */}
          <Card>
            <CardHeader>
              <CardTitle>SLA Status Overview</CardTitle>
              <CardDescription>Active and recently completed SLA tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{summary.activeSla}</p>
                  <p className="text-xs text-muted-foreground">Active SLAs</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-600">{slaTracking.filter(s => s.status === 'MET').length}</p>
                  <p className="text-xs text-muted-foreground">Met SLAs</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{summary.breachedSla}</p>
                  <p className="text-xs text-muted-foreground">Breached SLAs</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{slaTracking.filter(s => s.status === 'WAIVED').length}</p>
                  <p className="text-xs text-muted-foreground">Waived</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPI Metrics Tab */}
        <TabsContent value="kpi" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">KPI Metrics History</h3>
              <p className="text-sm text-muted-foreground">Historical KPI snapshots and trends</p>
            </div>
            <Button onClick={computeKpis} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KPI Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiSnapshots.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No KPI data available. Click &quot;Refresh&quot; to compute KPIs.
                      </TableCell>
                    </TableRow>
                  ) : (
                    kpiSnapshots.map((kpi) => (
                      <TableRow key={kpi.id} className={kpi.flag === 'RED' ? 'bg-red-50' : kpi.flag === 'AMBER' ? 'bg-amber-50' : ''}>
                        <TableCell className="font-mono font-medium">{kpi.kpiCode}</TableCell>
                        <TableCell>{kpi.kpiName}</TableCell>
                        <TableCell>{getCategoryBadge(kpi.category)}</TableCell>
                        <TableCell>
                          <span className="font-semibold">{kpi.value.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground ml-1">{kpi.unit}</span>
                        </TableCell>
                        <TableCell>
                          {kpi.target ? `${kpi.target.toFixed(2)} ${kpi.unit}` : '-'}
                        </TableCell>
                        <TableCell>{getFlagBadge(kpi.flag)}</TableCell>
                        <TableCell>{new Date(kpi.snapshotDate).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLA Config Tab */}
        <TabsContent value="sla-config" className="space-y-6 mt-6">
          <div>
            <h3 className="text-lg font-semibold">SLA Configurations</h3>
            <p className="text-sm text-muted-foreground">Define SLA targets for different process types</p>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SLA Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Response (hrs)</TableHead>
                    <TableHead>Completion (hrs)</TableHead>
                    <TableHead>Escalation Levels</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slaConfigs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Loading SLA configurations...
                      </TableCell>
                    </TableRow>
                  ) : (
                    slaConfigs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-mono">{config.slaType}</TableCell>
                        <TableCell>{config.name}</TableCell>
                        <TableCell>{config.responseHours || '-'}</TableCell>
                        <TableCell>{config.completionHours || '-'}</TableCell>
                        <TableCell>{config.escalationLevels || '-'}</TableCell>
                        <TableCell>
                          <Badge className={config.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                            {config.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLA Tracking Tab */}
        <TabsContent value="sla-tracking" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">SLA Tracking</h3>
              <p className="text-sm text-muted-foreground">Real-time SLA monitoring for active processes</p>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="MET">Met</SelectItem>
                <SelectItem value="BREACH">Breach</SelectItem>
                <SelectItem value="WAIVED">Waived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active SLAs Alert */}
          {slaTracking.filter(s => s.status === 'ACTIVE' && s.isOverdue).length > 0 && (
            <Card className="border-red-300 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  Overdue SLAs Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-600">
                  {slaTracking.filter(s => s.status === 'ACTIVE' && s.isOverdue).length} SLA(s) are currently overdue and require attention.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>SLA Type</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Time Remaining</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSla.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No SLA tracking records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSla.map((sla) => (
                      <TableRow key={sla.id} className={sla.isOverdue ? 'bg-red-50' : ''}>
                        <TableCell>
                          <Badge variant="outline">{sla.entityType}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{sla.entityId.slice(0, 8)}...</TableCell>
                        <TableCell>{sla.slaType}</TableCell>
                        <TableCell>{new Date(sla.startedAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={sla.isOverdue ? 'text-red-600 font-medium' : ''}>
                            {new Date(sla.targetAt).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {sla.status === 'ACTIVE' ? (
                            sla.isOverdue ? (
                              <span className="text-red-600 font-medium">OVERDUE</span>
                            ) : (
                              <span className="text-amber-600">{sla.timeRemaining.toFixed(1)}h remaining</span>
                            )
                          ) : (
                            `${sla.duration.toFixed(1)}h total`
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(sla.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
