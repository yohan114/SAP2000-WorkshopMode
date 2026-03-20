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
import { Separator } from '@/components/ui/separator';
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
  Calendar,
  Printer,
  Eye,
  Trash2,
  Edit,
  Copy,
  FileText,
  Wrench
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
  mandatory: boolean;
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
  correctiveActionId: string | null;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  entityType: string;
  inspectionType: string;
  items: { criterion: string; expectedResult: string; mandatory: boolean }[];
}

interface Stats {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  pending: number;
  criticalDefects: number;
}

const statusColors: Record<string, string> = {
  'SCHEDULED': 'bg-blue-100 text-blue-700',
  'IN_PROGRESS': 'bg-purple-100 text-purple-700',
  'COMPLETED': 'bg-emerald-100 text-emerald-700',
  'FAILED': 'bg-red-100 text-red-700',
  'CANCELLED': 'bg-slate-100 text-foreground',
};

const resultColors: Record<string, string> = {
  'PASS': 'text-emerald-600',
  'FAIL': 'text-red-600',
  'CONDITIONAL': 'text-amber-600',
};

const severityColors: Record<string, string> = {
  'CRITICAL': 'bg-red-500 text-white',
  'MAJOR': 'bg-amber-500 text-white',
  'MINOR': 'bg-yellow-500 text-white',
  'OBSERVATION': 'bg-blue-500 text-white',
};

const inspectionTypes = [
  'Pre-use Inspection',
  'Post-repair Inspection',
  'Incoming Inspection',
  'Routine Inspection',
  'Safety Inspection',
  'Quality Audit'
];

const entityTypes = [
  { value: 'JOB_CARD', label: 'Job Card' },
  { value: 'GRN', label: 'Goods Received Note' },
  { value: 'ASSET', label: 'Asset' },
  { value: 'STORE', label: 'Store' },
  { value: 'WORK_AREA', label: 'Work Area' }
];

// Default checklist templates
const defaultTemplates: ChecklistTemplate[] = [
  {
    id: '1',
    name: 'Post-Repair Vehicle Inspection',
    entityType: 'JOB_CARD',
    inspectionType: 'Post-repair Inspection',
    items: [
      { criterion: 'Engine oil level checked', expectedResult: 'Normal level', mandatory: true },
      { criterion: 'Coolant level checked', expectedResult: 'Normal level', mandatory: true },
      { criterion: 'Brake system tested', expectedResult: 'No issues', mandatory: true },
      { criterion: 'Tire condition inspected', expectedResult: 'Good condition', mandatory: true },
      { criterion: 'Lights and signals working', expectedResult: 'All functional', mandatory: true },
      { criterion: 'Fluid leaks checked', expectedResult: 'No leaks', mandatory: true },
      { criterion: 'Test drive completed', expectedResult: 'No issues', mandatory: true },
      { criterion: 'Work area cleaned', expectedResult: 'Clean', mandatory: false }
    ]
  },
  {
    id: '2',
    name: 'Incoming Parts Inspection',
    entityType: 'GRN',
    inspectionType: 'Incoming Inspection',
    items: [
      { criterion: 'Quantity matches GRN', expectedResult: 'Match', mandatory: true },
      { criterion: 'Packaging condition', expectedResult: 'Good condition', mandatory: true },
      { criterion: 'Part numbers verified', expectedResult: 'Correct', mandatory: true },
      { criterion: 'Visual defects check', expectedResult: 'No defects', mandatory: true },
      { criterion: 'Documentation complete', expectedResult: 'Complete', mandatory: true }
    ]
  },
  {
    id: '3',
    name: 'Safety Inspection',
    entityType: 'ASSET',
    inspectionType: 'Safety Inspection',
    items: [
      { criterion: 'Fire extinguisher present', expectedResult: 'Present and valid', mandatory: true },
      { criterion: 'Emergency exits clear', expectedResult: 'Clear', mandatory: true },
      { criterion: 'Safety guards in place', expectedResult: 'All in place', mandatory: true },
      { criterion: 'Warning labels visible', expectedResult: 'Visible', mandatory: true },
      { criterion: 'First aid kit accessible', expectedResult: 'Accessible and complete', mandatory: true }
    ]
  }
];

export function QualityView() {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>(defaultTemplates);
  const [stats, setStats] = useState<Stats>({ total: 0, passed: 0, failed: 0, passRate: 0, pending: 0, criticalDefects: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showDefectDialog, setShowDefectDialog] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('inspections');

  const [formData, setFormData] = useState({
    entityType: '',
    entityId: '',
    inspectionType: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    notes: '',
    templateId: ''
  });

  const [newDefect, setNewDefect] = useState({
    severity: 'MAJOR',
    description: '',
    location: ''
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
        const all = data.data || [];
        const passed = all.filter((i: QualityInspection) => i.result === 'PASS').length;
        const failed = all.filter((i: QualityInspection) => i.result === 'FAIL').length;
        const pending = all.filter((i: QualityInspection) => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS').length;
        setStats({
          total: all.length,
          passed,
          failed,
          passRate: all.length > 0 ? Math.round((passed / all.length) * 100) : 0,
          pending,
          criticalDefects: 0 // Would calculate from defects
        });
      }
    } catch (error) {
      console.error('Failed to fetch inspections:', error);
      toast.error('Failed to load inspections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInspection = async () => {
    if (!formData.entityType || !formData.inspectionType) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      // Get template items if selected
      const template = templates.find(t => t.id === formData.templateId);
      const checklistItems = template?.items.map(item => ({
        criterion: item.criterion,
        expectedResult: item.expectedResult,
        status: 'PENDING',
        mandatory: item.mandatory
      })) || [];

      const response = await fetch('/api/quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          checklistItems
        })
      });

      if (response.ok) {
        toast.success('Inspection created successfully');
        setShowCreateDialog(false);
        resetForm();
        fetchInspections();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create inspection');
      }
    } catch (error) {
      console.error('Failed to create inspection:', error);
      toast.error('Failed to create inspection');
    } finally {
      setSubmitting(false);
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

  const handleAddDefect = async () => {
    if (!selectedInspection || !newDefect.description) {
      toast.error('Please enter defect description');
      return;
    }

    try {
      const response = await fetch(`/api/quality/${selectedInspection.id}/defects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDefect)
      });

      if (response.ok) {
        toast.success('Defect added');
        setNewDefect({ severity: 'MAJOR', description: '', location: '' });
        handleViewInspection(selectedInspection);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add defect');
      }
    } catch (error) {
      console.error('Failed to add defect:', error);
      toast.error('Failed to add defect');
    }
  };

  const handlePrintReport = () => {
    if (!selectedInspection) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inspection Report - ${selectedInspection.inspectionNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .info-item label { font-size: 12px; color: #666; display: block; }
          .info-item p { margin: 4px 0 0; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f5f5f5; }
          .pass { color: #059669; }
          .fail { color: #dc2626; }
          .signature { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; }
          .signature-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 10px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>QUALITY INSPECTION REPORT</h1>
          <p>WCP - Workshop Control Platform</p>
        </div>
        <div class="info-grid">
          <div class="info-item"><label>Inspection Number</label><p>LKR {selectedInspection.inspectionNumber}</p></div>
          <div class="info-item"><label>Type</label><p>LKR {selectedInspection.inspectionType}</p></div>
          <div class="info-item"><label>Date</label><p>LKR {selectedInspection.scheduledDate ? new Date(selectedInspection.scheduledDate).toLocaleDateString() : '-'}</p></div>
          <div class="info-item"><label>Status</label><p>LKR {selectedInspection.status}</p></div>
          <div class="info-item"><label>Result</label><p class="${selectedInspection.result === 'PASS' ? 'pass' : 'fail'}">LKR {selectedInspection.result || '-'}</p></div>
          <div class="info-item"><label>Inspector</label><p>LKR {selectedInspection.inspector?.name || '-'}</p></div>
        </div>
        <h3>Checklist</h3>
        <table>
          <thead><tr><th>Criterion</th><th>Expected</th><th>Actual</th><th>Status</th></tr></thead>
          <tbody>
            ${(selectedInspection.checklistItems || []).map(item => `
              <tr>
                <td>LKR {item.criterion}</td>
                <td>LKR {item.expectedResult || '-'}</td>
                <td>LKR {item.actualResult || '-'}</td>
                <td class="${item.status === 'PASS' ? 'pass' : item.status === 'FAIL' ? 'fail' : ''}">LKR {item.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${(selectedInspection.defects || []).length > 0 ? `
          <h3>Defects</h3>
          <table>
            <thead><tr><th>Severity</th><th>Description</th><th>Location</th><th>Status</th></tr></thead>
            <tbody>
              ${selectedInspection.defects.map(d => `
                <tr>
                  <td>LKR {d.severity}</td>
                  <td>LKR {d.description}</td>
                  <td>LKR {d.location || '-'}</td>
                  <td>LKR {d.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
        ${selectedInspection.notes ? `<p><strong>Notes:</strong> ${selectedInspection.notes}</p>` : ''}
        <div class="signature">
          <div><div class="signature-line">Inspector</div></div>
          <div><div class="signature-line">Approved By</div></div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const resetForm = () => {
    setFormData({
      entityType: '',
      entityId: '',
      inspectionType: '',
      scheduledDate: new Date().toISOString().split('T')[0],
      notes: '',
      templateId: ''
    });
  };

  const getCompletionPercentage = (inspection: QualityInspection): number => {
    if (!inspection.checklistItems || inspection.checklistItems.length === 0) return 0;
    const completed = inspection.checklistItems.filter(c => c.status !== 'PENDING').length;
    return Math.round((completed / inspection.checklistItems.length) * 100);
  };

  const filteredInspections = inspections.filter(i =>
    i.inspectionNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quality Management</h1>
          <p className="text-muted-foreground text-sm">Manage quality inspections and defects</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplateDialog(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            New Inspection
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Inspections</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.passed}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.passRate}%</p>
                <p className="text-xs text-muted-foreground">Pass Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search inspections..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
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

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredInspections.length === 0 ? (
            <div className="text-center py-12">
              <ShieldCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-muted-foreground">No inspections found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspection #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInspections.map((inspection) => (
                  <TableRow key={inspection.id}>
                    <TableCell className="font-medium">{inspection.inspectionNumber}</TableCell>
                    <TableCell>{inspection.inspectionType}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{inspection.entityType}</Badge>
                    </TableCell>
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
                    <TableCell>
                      <div className="flex items-center gap-2 w-24">
                        <Progress value={getCompletionPercentage(inspection)} className="h-2" />
                        <span className="text-xs text-muted-foreground">{getCompletionPercentage(inspection)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleViewInspection(inspection)}>
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

      {/* Create Inspection Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Inspection</DialogTitle>
            <DialogDescription>Schedule a new quality inspection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Entity Type *</label>
                <Select value={formData.entityType} onValueChange={(v) => setFormData(prev => ({ ...prev, entityType: v, templateId: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {entityTypes.map((et) => (<SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Inspection Type *</label>
                <Select value={formData.inspectionType} onValueChange={(v) => setFormData(prev => ({ ...prev, inspectionType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {inspectionTypes.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Entity Reference</label>
              <Input value={formData.entityId} onChange={(e) => setFormData(prev => ({ ...prev, entityId: e.target.value }))} placeholder="Enter reference number (optional)" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Scheduled Date</label>
              <Input type="date" value={formData.scheduledDate} onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Checklist Template</label>
              <Select value={formData.templateId} onValueChange={(v) => setFormData(prev => ({ ...prev, templateId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select template (optional)" /></SelectTrigger>
                <SelectContent>
                  {templates
                    .filter(t => !formData.entityType || t.entityType === formData.entityType)
                    .map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Enter any notes..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateInspection} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Inspection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inspection Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Inspection: {selectedInspection?.inspectionNumber}
              <Badge className={statusColors[selectedInspection?.status || '']}>{selectedInspection?.status}</Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedInspection && (
            <Tabs defaultValue="checklist" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="checklist">Checklist</TabsTrigger>
                <TabsTrigger value="defects">Defects</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="checklist" className="flex-1 overflow-auto mt-4">
                {/* Progress */}
                <div className="flex items-center gap-4 mb-4">
                  <Progress value={getCompletionPercentage(selectedInspection)} className="flex-1" />
                  <span className="text-sm text-muted-foreground">{getCompletionPercentage(selectedInspection)}%</span>
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
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.criterion}
                            {item.mandatory && <Badge variant="outline" className="text-xs">Required</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>{item.expectedResult || '-'}</TableCell>
                        <TableCell>{item.actualResult || '-'}</TableCell>
                        <TableCell>
                          <Badge className={
                            item.status === 'PASS' ? 'bg-emerald-100 text-emerald-700' :
                            item.status === 'FAIL' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-foreground'
                          }>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {selectedInspection.status === 'IN_PROGRESS' && item.status === 'PENDING' && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleUpdateChecklistItem(item.id, 'PASS')} className="text-emerald-600">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleUpdateChecklistItem(item.id, 'FAIL')} className="text-red-600">
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

              <TabsContent value="defects" className="flex-1 overflow-auto mt-4 space-y-4">
                {selectedInspection.defects && selectedInspection.defects.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Severity</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInspection.defects.map((defect) => (
                        <TableRow key={defect.id}>
                          <TableCell>
                            <Badge className={severityColors[defect.severity] || 'bg-muted/500'}>
                              {defect.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>{defect.description}</TableCell>
                          <TableCell>{defect.location || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{defect.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {defect.correctiveActionId ? (
                              <Button variant="ghost" size="sm">View JC</Button>
                            ) : (
                              <Button variant="ghost" size="sm" className="text-amber-600">
                                <Wrench className="h-4 w-4 mr-1" />Create JC
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">No defects recorded</div>
                )}

                {selectedInspection.status === 'IN_PROGRESS' && (
                  <Card className="bg-muted/50">
                    <CardHeader><CardTitle className="text-sm">Add Defect</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Select value={newDefect.severity} onValueChange={(v) => setNewDefect(prev => ({ ...prev, severity: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CRITICAL">Critical</SelectItem>
                            <SelectItem value="MAJOR">Major</SelectItem>
                            <SelectItem value="MINOR">Minor</SelectItem>
                            <SelectItem value="OBSERVATION">Observation</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input placeholder="Location" value={newDefect.location} onChange={(e) => setNewDefect(prev => ({ ...prev, location: e.target.value }))} />
                      </div>
                      <Textarea placeholder="Describe the defect..." value={newDefect.description} onChange={(e) => setNewDefect(prev => ({ ...prev, description: e.target.value }))} rows={2} />
                      <Button onClick={handleAddDefect} size="sm" className="bg-amber-600 hover:bg-amber-700">
                        <Plus className="h-4 w-4 mr-2" />Add Defect
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="details" className="flex-1 overflow-auto mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm text-muted-foreground">Inspection Number</p><p className="font-medium">{selectedInspection.inspectionNumber}</p></div>
                  <div><p className="text-sm text-muted-foreground">Type</p><p className="font-medium">{selectedInspection.inspectionType}</p></div>
                  <div><p className="text-sm text-muted-foreground">Entity</p><p className="font-medium">{selectedInspection.entityType} - {selectedInspection.entityId || '-'}</p></div>
                  <div><p className="text-sm text-muted-foreground">Inspector</p><p className="font-medium">{selectedInspection.inspector?.name || '-'}</p></div>
                  <div><p className="text-sm text-muted-foreground">Scheduled Date</p><p className="font-medium">{selectedInspection.scheduledDate ? new Date(selectedInspection.scheduledDate).toLocaleDateString() : '-'}</p></div>
                  <div><p className="text-sm text-muted-foreground">Result</p><p className={`font-medium ${resultColors[selectedInspection.result || '']}`}>{selectedInspection.result || '-'}</p></div>
                </div>
                {selectedInspection.notes && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{selectedInspection.notes}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="flex items-center justify-between border-t pt-4">
            <Button variant="outline" onClick={handlePrintReport}>
              <Printer className="h-4 w-4 mr-2" />Print Report
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Close</Button>
              {selectedInspection?.status === 'IN_PROGRESS' && (
                <>
                  <Button onClick={() => handleCompleteInspection('PASS')} className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle className="h-4 w-4 mr-2" />Pass
                  </Button>
                  <Button onClick={() => handleCompleteInspection('FAIL')} variant="destructive">
                    <XCircle className="h-4 w-4 mr-2" />Fail
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Checklist Templates</DialogTitle>
            <DialogDescription>Manage inspection checklist templates</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription>
                        {entityTypes.find(e => e.value === template.entityType)?.label} - {template.inspectionType}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon"><Copy className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Criterion</TableHead>
                        <TableHead>Expected Result</TableHead>
                        <TableHead>Required</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {template.items.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.criterion}</TableCell>
                          <TableCell>{item.expectedResult}</TableCell>
                          <TableCell>{item.mandatory ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Close</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />New Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
