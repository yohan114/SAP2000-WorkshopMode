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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Search, 
  Loader2, 
  AlertTriangle,
  Eye,
  Activity,
  UserCheck,
  FileWarning,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: any;
  newValue: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string };
}

interface AnomalyDetection {
  id: string;
  type: string;
  severity: string;
  description: string;
  entityId: string | null;
  entityType: string | null;
  status: string;
  detectedAt: string;
  resolvedAt: string | null;
  resolution: string | null;
}

interface RiskIndicator {
  id: string;
  category: string;
  indicator: string;
  score: number;
  trend: string;
  lastUpdated: string;
}

const actionColors: Record<string, string> = {
  'CREATE': 'bg-emerald-100 text-emerald-700',
  'UPDATE': 'bg-blue-100 text-blue-700',
  'DELETE': 'bg-red-100 text-red-700',
  'LOGIN': 'bg-purple-100 text-purple-700',
  'LOGOUT': 'bg-slate-100 text-foreground',
  'APPROVE': 'bg-amber-100 text-amber-700',
};

const severityColors: Record<string, string> = {
  'CRITICAL': 'bg-red-500',
  'HIGH': 'bg-amber-500',
  'MEDIUM': 'bg-yellow-500',
  'LOW': 'bg-blue-500',
};

const anomalyStatusColors: Record<string, string> = {
  'OPEN': 'bg-red-100 text-red-700',
  'INVESTIGATING': 'bg-amber-100 text-amber-700',
  'RESOLVED': 'bg-emerald-100 text-emerald-700',
  'FALSE_POSITIVE': 'bg-slate-100 text-foreground',
};

export function AuditView() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyDetection[]>([]);
  const [riskIndicators, setRiskIndicators] = useState<RiskIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalLogs: 0,
    openAnomalies: 0,
    avgRiskScore: 0,
    criticalCount: 0
  });

  useEffect(() => {
    fetchData();
  }, [actionFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch audit logs
      let logsUrl = '/api/audit?page=1&limit=50';
      if (actionFilter !== 'all') logsUrl += `&action=${actionFilter}`;
      
      const logsResponse = await fetch(logsUrl);
      if (logsResponse.ok) {
        const data = await logsResponse.json();
        setAuditLogs(data.data || data.logs || []);
      }

      // Fetch anomalies
      const anomaliesResponse = await fetch('/api/audit/anomalies');
      if (anomaliesResponse.ok) {
        const data = await anomaliesResponse.json();
        setAnomalies(data.data || data.anomalies || []);
      }

      // Fetch risk indicators
      const riskResponse = await fetch('/api/audit/risk');
      if (riskResponse.ok) {
        const data = await riskResponse.json();
        setRiskIndicators(data.data || data.indicators || []);
      }

      // Calculate stats
      setStats({
        totalLogs: auditLogs.length,
        openAnomalies: anomalies.filter(a => a.status === 'OPEN').length,
        avgRiskScore: riskIndicators.length > 0 
          ? Math.round(riskIndicators.reduce((sum, r) => sum + r.score, 0) / riskIndicators.length)
          : 0,
        criticalCount: anomalies.filter(a => a.severity === 'CRITICAL' && a.status === 'OPEN').length
      });

    } catch (error) {
      console.error('Failed to fetch audit data:', error);
      toast.error('Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLog = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailDialog(true);
  };

  const handleResolveAnomaly = async (anomalyId: string, resolution: string) => {
    try {
      const response = await fetch(`/api/audit/anomalies/${anomalyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED', resolution })
      });

      if (response.ok) {
        toast.success('Anomaly resolved');
        fetchData();
      } else {
        toast.error('Failed to resolve anomaly');
      }
    } catch (error) {
      console.error('Failed to resolve anomaly:', error);
      toast.error('Failed to resolve anomaly');
    }
  };

  const handleExportLogs = async () => {
    try {
      const response = await fetch('/api/audit/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('Audit logs exported');
      }
    } catch (error) {
      console.error('Failed to export logs:', error);
      toast.error('Failed to export logs');
    }
  };

  const filteredLogs = auditLogs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatValue = (value: any): string => {
    if (!value) return '-';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Dashboard</h1>
          <p className="text-muted-foreground text-sm">Monitor system activity and detect anomalies</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalLogs}</p>
                <p className="text-xs text-muted-foreground">Total Logs (24h)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.openAnomalies}</p>
                <p className="text-xs text-muted-foreground">Open Anomalies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgRiskScore}%</p>
                <p className="text-xs text-muted-foreground">Avg Risk Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <FileWarning className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.criticalCount}</p>
                <p className="text-xs text-muted-foreground">Critical Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs">
        <TabsList>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          <TabsTrigger value="risk">Risk Indicators</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="CREATE">Create</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                    <SelectItem value="LOGIN">Login</SelectItem>
                    <SelectItem value="APPROVE">Approve</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-muted-foreground">No audit logs found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>{log.user?.name || 'System'}</TableCell>
                        <TableCell>
                          <Badge className={actionColors[log.action] || 'bg-slate-100'}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{log.entityType}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.ipAddress || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {anomalies.length === 0 ? (
                <div className="text-center py-12">
                  <FileWarning className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-muted-foreground">No anomalies detected</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Detected</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anomalies.map((anomaly) => (
                      <TableRow key={anomaly.id}>
                        <TableCell>
                          <Badge className={severityColors[anomaly.severity] || 'bg-muted/500'}>
                            {anomaly.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{anomaly.type}</TableCell>
                        <TableCell className="max-w-xs truncate">{anomaly.description}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(anomaly.detectedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={anomalyStatusColors[anomaly.status] || 'bg-slate-100'}>
                            {anomaly.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {anomaly.status === 'OPEN' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResolveAnomaly(anomaly.id, 'Resolved by user')}
                            >
                              Resolve
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {riskIndicators.map((indicator) => (
              <Card key={indicator.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{indicator.category}</p>
                      <p className="font-medium">{indicator.indicator}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {indicator.trend === 'UP' ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      ) : indicator.trend === 'DOWN' ? (
                        <TrendingDown className="h-4 w-4 text-emerald-500" />
                      ) : null}
                      <span className="text-lg font-bold">{indicator.score}%</span>
                    </div>
                  </div>
                  <Progress value={indicator.score} className="mt-3 h-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="font-medium">{selectedLog.user?.name || 'System'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Action</p>
                  <Badge className={actionColors[selectedLog.action] || 'bg-slate-100'}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entity Type</p>
                  <p className="font-medium">{selectedLog.entityType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IP Address</p>
                  <p className="font-medium">{selectedLog.ipAddress || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entity ID</p>
                  <p className="font-medium text-sm">{selectedLog.entityId || '-'}</p>
                </div>
              </div>

              {selectedLog.oldValue && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Old Value</p>
                  <pre className="text-xs bg-red-50 p-3 rounded-lg overflow-x-auto">
                    {formatValue(selectedLog.oldValue)}
                  </pre>
                </div>
              )}

              {selectedLog.newValue && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">New Value</p>
                  <pre className="text-xs bg-emerald-50 p-3 rounded-lg overflow-x-auto">
                    {formatValue(selectedLog.newValue)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
