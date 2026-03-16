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
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Loader2, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  ClipboardCheck,
  FileWarning,
  TrendingUp,
  TrendingDown,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface QualityInspection {
  id: string;
  inspectionNumber: string;
  entityType: string;
  entityId: string | null;
  inspectionType: string;
  status: string;
  result: string | null;
  scheduledDate: string | null;
  completedAt: string | null;
  inspectorId: string | null;
  notes: string | null;
  createdAt: string;
  inspector?: { id: string; name: string };
  checklistItems?: QualityChecklistItem[];
  defects?: QualityDefect[];
}

interface QualityChecklistItem {
  id: string;
  inspectionId: string;
  criterion: string;
  expectedResult: string | null;
  actualResult: string | null;
  status: string;
  remarks: string | null;
}

interface QualityDefect {
  id: string;
  inspectionId: string;
  severity: string;
  description: string;
  location: string | null;
  status: string;
  resolvedAt: string | null;
  resolution: string | null;
}

const statusColors: Record<string, string> = {
  'SCHEDULED': 'bg-blue-100 text-blue-700',
  'IN_PROGRESS': 'bg-purple-100 text-purple-700',
  'COMPLETED': 'bg-emerald-100 text-emerald-700',
  'FAILED': 'bg-red-100 text-red-700',
  'CANCELLED': 'bg-slate-100 text-slate-700',
};

const resultColors: Record<string, string> = {
  'PASS': 'text-emerald-600',
  'FAIL': 'text-red-600',
  'CONDITIONAL': 'text-amber-600',
};

const severityColors: Record<string, string> = {
  'CRITICAL': 'bg-red-500',
  'MAJOR': 'bg-amber-500',
  'MINOR': 'bg-yellow-500',
  'OBSERVATION': 'bg-blue-500',
};

export function QualityView() {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    passRate: 0
  });

  useEffect(() => {
    fetchInspections();
  }, [statusFilter]);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      let url = '/api/quality?page=1&limit=50';
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setInspections(data.data || data.inspections || []);
        
        // Calculate stats
        const total = data.data?.length || 0;
        const passed = (data.data || []).filter((i: QualityInspection) => i.result === 'PASS').length;
        const failed = (data.data || []).filter((i: QualityInspection) => i.result === 'FAIL').length;
        setStats({
          total,
          passed,
          failed,
          passRate: total > 0 ? Math.round((passed / total) * 100) : 0
        });
      }
    } catch (error) {
      console.error('Failed to fetch inspections:', error);
      toast.error('Failed to load inspections');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInspection = async (inspection: QualityInspection) => {
    try {
      const response = await fetch(`/api/quality/${inspection.id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedInspection(data.data || data);
        setShowDetailDialog(true);
      }
    } catch (error) {
      console.error('Failed to fetch inspection details:', error);
      toast.error('Failed to load inspection details');
    }
  };

  const handleUpdateChecklistItem = async (itemId: string, status: string, actualResult?: string) => {
    if (!selectedInspection) return;

    try {
      const response = await fetch(`/api/quality/${selectedInspection.id}/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, actualResult })
      });

      if (response.ok) {
        toast.success('Checklist item updated');
        // Refresh inspection data
        handleViewInspection(selectedInspection);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update item');
      }
    } catch (error) {
      console.error('Failed to update item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleCompleteInspection = async (result: string) => {
    if (!selectedInspection) return;

    try {
      const response = await fetch(`/api/quality/${selectedInspection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED', result })
      });

      if (response.ok) {
        toast.success('Inspection completed');
        setShowDetailDialog(false);
        fetchInspections();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to complete inspection');
      }
    } catch (error) {
      console.error('Failed to complete inspection:', error);
      toast.error('Failed to complete inspection');
    }
  };

  const filteredInspections = inspections.filter(i =>
    i.inspectionNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCompletionPercentage = (inspection: QualityInspection): number => {
    if (!inspection.checklistItems || inspection.checklistItems.length === 0) return 0;
    const completed = inspection.checklistItems.filter(c => c.status !== 'PENDING').length;
    return Math.round((completed / inspection.checklistItems.length) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quality Management</h1>
          <p className="text-slate-500 text-sm">Manage quality inspections and defects</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Inspections</p>
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
                <p className="text-2xl font-bold">{stats.passed}</p>
                <p className="text-xs text-slate-500">Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-xs text-slate-500">Failed</p>
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
                <p className="text-2xl font-bold">{stats.passRate}%</p>
                <p className="text-xs text-slate-500">Pass Rate</p>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search inspections..."
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
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inspection List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredInspections.length === 0 ? (
            <div className="text-center py-12">
              <ShieldCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No inspections found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspection #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInspections.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell className="font-medium">{inspection.inspectionNumber}</TableCell>
                    <TableCell>{inspection.inspectionType}</TableCell>
                    <TableCell>
                      {inspection.scheduledDate 
                        ? new Date(inspection.scheduledDate).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[inspection.status] || 'bg-slate-100'}>
                        {inspection.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {inspection.result ? (
                        <span className={`font-medium ${resultColors[inspection.result] || ''}`}>
                          {inspection.result}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewInspection(inspection)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Inspection Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inspection Details</DialogTitle>
          </DialogHeader>

          {selectedInspection && (
            <Tabs defaultValue="checklist" className="py-4">
              <TabsList>
                <TabsTrigger value="checklist">Checklist</TabsTrigger>
                <TabsTrigger value="defects">Defects</TabsTrigger>
              </TabsList>

              <TabsContent value="checklist" className="space-y-4">
                {/* Progress */}
                <div className="flex items-center gap-4">
                  <Progress value={getCompletionPercentage(selectedInspection)} className="flex-1" />
                  <span className="text-sm text-slate-500">{getCompletionPercentage(selectedInspection)}%</span>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Criterion</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Actual</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInspection.checklistItems?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.criterion}</TableCell>
                        <TableCell>{item.expectedResult || '-'}</TableCell>
                        <TableCell>{item.actualResult || '-'}</TableCell>
                        <TableCell>
                          <Badge className={
                            item.status === 'PASS' ? 'bg-emerald-100 text-emerald-700' :
                            item.status === 'FAIL' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {selectedInspection.status === 'IN_PROGRESS' && item.status === 'PENDING' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateChecklistItem(item.id, 'PASS')}
                                className="text-emerald-600"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateChecklistItem(item.id, 'FAIL')}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="defects" className="space-y-4">
                {selectedInspection.defects && selectedInspection.defects.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severity</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInspection.defects.map((defect) => (
                        <TableRow key={defect.id}>
                          <TableCell>
                            <Badge className={severityColors[defect.severity] || 'bg-slate-500'}>
                              {defect.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>{defect.description}</TableCell>
                          <TableCell>{defect.location || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{defect.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No defects recorded
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
            {selectedInspection?.status === 'IN_PROGRESS' && (
              <>
                <Button 
                  onClick={() => handleCompleteInspection('PASS')}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Pass
                </Button>
                <Button 
                  onClick={() => handleCompleteInspection('FAIL')}
                  variant="destructive"
                >
                  Fail
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
