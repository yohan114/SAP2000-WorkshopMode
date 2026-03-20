'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Clock, Plus, Search, Loader2, User, Wrench, Calendar, DollarSign, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TimeLog {
  id: string;
  employee: {
    id: string;
    employeeNumber: string;
    name: string;
    designation: string | null;
  };
  jobCard: {
    id: string;
    jobCardNumber: string;
    status: string;
    asset: { id: string; name: string; assetNumber: string } | null;
  } | null;
  logDate: string;
  startTime: string;
  endTime: string | null;
  breakMinutes: number;
  totalMinutes: number | null;
  hourlyRate: number | null;
  totalCost: number | null;
  notes: string | null;
  createdAt: string;
}

interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  designation: string | null;
  status: string;
}

interface JobCard {
  id: string;
  jobCardNumber: string;
  status: string;
  asset: { name: string } | null;
}

export function TimeLogsView() {
  const { toast } = useToast();
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<TimeLog | null>(null);
  const [editFormData, setEditFormData] = useState({
    employeeId: '',
    jobCardId: 'none',
    logDate: '',
    startTime: '',
    endTime: '',
    breakMinutes: 0,
    hourlyRate: '',
    notes: '',
  });
  
  // Form state
  const [formData, setFormData] = useState({
    employeeId: '',
    jobCardId: 'none',
    logDate: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    breakMinutes: 0,
    hourlyRate: '',
    notes: '',
  });

  const limit = 10;

  useEffect(() => {
    fetchTimeLogs();
    fetchEmployees();
    fetchJobCards();
  }, [page, search]);

  const fetchTimeLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/time-logs?${params}`);
      const data = await res.json();
      
      if (data.success) {
        setTimeLogs(data.data);
        setTotal(data.meta.total);
      }
    } catch (error) {
      console.error('Failed to fetch time logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees?limit=100');
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data.filter((e: Employee) => e.status === 'ACTIVE'));
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchJobCards = async () => {
    try {
      const res = await fetch('/api/job-cards?limit=100');
      const data = await res.json();
      if (data.success) {
        setJobCards(data.data.filter((jc: JobCard) => 
          ['DRAFT', 'APPROVED', 'IN_PROGRESS'].includes(jc.status)
        ));
      }
    } catch (error) {
      console.error('Failed to fetch job cards:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.employeeId) {
      toast({ title: 'Validation Error', description: 'Please select an employee', variant: 'destructive' });
      return;
    }
    if (!formData.startTime) {
      toast({ title: 'Validation Error', description: 'Please enter start time', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/time-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          jobCardId: formData.jobCardId === 'none' ? undefined : formData.jobCardId,
          logDate: formData.logDate,
          startTime: formData.startTime ? `${formData.logDate}T${formData.startTime}:00` : undefined,
          endTime: formData.endTime ? `${formData.logDate}T${formData.endTime}:00` : undefined,
          breakMinutes: formData.breakMinutes,
          hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
          notes: formData.notes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Time log created successfully' });
        setIsCreateOpen(false);
        setFormData({
          employeeId: '',
          jobCardId: 'none',
          logDate: new Date().toISOString().split('T')[0],
          startTime: '',
          endTime: '',
          breakMinutes: 0,
          hourlyRate: '',
          notes: '',
        });
        fetchTimeLogs();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create time log', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to create time log:', error);
      toast({ title: 'Error', description: 'Failed to create time log', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const openEditDialog = (log: TimeLog) => {
    setSelectedLog(log);
    setEditFormData({
      employeeId: log.employee.id,
      jobCardId: log.jobCard?.id || 'none',
      logDate: new Date(log.logDate).toISOString().split('T')[0],
      startTime: log.startTime ? new Date(log.startTime).toTimeString().slice(0, 5) : '',
      endTime: log.endTime ? new Date(log.endTime).toTimeString().slice(0, 5) : '',
      breakMinutes: log.breakMinutes,
      hourlyRate: log.hourlyRate ? log.hourlyRate.toString() : '',
      notes: log.notes || '',
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedLog) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/time-logs/${selectedLog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: editFormData.employeeId,
          jobCardId: editFormData.jobCardId === 'none' ? null : editFormData.jobCardId,
          logDate: editFormData.logDate,
          startTime: editFormData.startTime ? `${editFormData.logDate}T${editFormData.startTime}:00` : undefined,
          endTime: editFormData.endTime ? `${editFormData.logDate}T${editFormData.endTime}:00` : null,
          breakMinutes: editFormData.breakMinutes,
          hourlyRate: editFormData.hourlyRate ? parseFloat(editFormData.hourlyRate) : null,
          notes: editFormData.notes || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Time log updated successfully' });
        setEditOpen(false);
        fetchTimeLogs();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update time log', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to update time log:', error);
      toast({ title: 'Error', description: 'Failed to update time log', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLog) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/time-logs/${selectedLog.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Time log deleted successfully' });
        setDeleteOpen(false);
        setSelectedLog(null);
        fetchTimeLogs();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete time log', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to delete time log:', error);
      toast({ title: 'Error', description: 'Failed to delete time log', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Time Logs</h2>
          <p className="text-muted-foreground">Track employee work hours and labor costs</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Log Time
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Log Time Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Employee *</label>
                <Select value={formData.employeeId || undefined} onValueChange={(v) => setFormData({ ...formData, employeeId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Card (Optional)</label>
                <Select value={formData.jobCardId} onValueChange={(v) => setFormData({ ...formData, jobCardId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select job card" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {jobCards.map((jc) => (
                      <SelectItem key={jc.id} value={jc.id}>
                        {jc.jobCardNumber} - {jc.asset?.name || 'Unknown Asset'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input 
                    type="date" 
                    value={formData.logDate}
                    onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start</label>
                  <Input 
                    type="time" 
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End</label>
                  <Input 
                    type="time" 
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Break (mins)</label>
                  <Input 
                    type="number"
                    value={formData.breakMinutes}
                    onChange={(e) => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hourly Rate (LKR)</label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    placeholder="Default rate"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Input 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
              <Button onClick={handleCreate} className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Time Log
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-xl font-bold">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Employees</p>
                <p className="text-xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Wrench className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Job Cards</p>
                <p className="text-xl font-bold">{jobCards.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Labor Cost</p>
                <p className="text-xl font-bold">
                  LKR {timeLogs.reduce((sum, tl) => sum + (tl.totalCost || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search time logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : timeLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No time logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Job Card</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.employee.name}</div>
                          <div className="text-xs text-muted-foreground">{log.employee.employeeNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.jobCard ? (
                          <div>
                            <div className="font-medium">{log.jobCard.jobCardNumber}</div>
                            <div className="text-xs text-muted-foreground">{log.jobCard.asset?.name || 'Unknown'}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(log.logDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatTime(log.startTime)} - {formatTime(log.endTime)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatDuration(log.totalMinutes)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.totalCost ? `LKR ${log.totalCost.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.notes || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedLog(log); setDetailOpen(true); }}>
                              <Eye className="h-4 w-4 mr-2" />View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(log)}>
                              <Edit className="h-4 w-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setSelectedLog(log); setDeleteOpen(true); }} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />Delete
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Time Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Employee</p>
                  <p className="font-medium">{selectedLog.employee.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.employee.employeeNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date(selectedLog.logDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">{formatTime(selectedLog.startTime)} - {formatTime(selectedLog.endTime)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{formatDuration(selectedLog.totalMinutes)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Break</p>
                  <p className="font-medium">{selectedLog.breakMinutes} minutes</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cost</p>
                  <p className="font-medium">{selectedLog.totalCost ? `LKR ${selectedLog.totalCost.toFixed(2)}` : '-'}</p>
                </div>
              </div>
              {selectedLog.jobCard && (
                <div>
                  <p className="text-sm text-muted-foreground">Job Card</p>
                  <p className="font-medium">{selectedLog.jobCard.jobCardNumber}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.jobCard.asset?.name || 'Unknown'}</p>
                </div>
              )}
              {selectedLog.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{selectedLog.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Time Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee *</label>
              <Select value={editFormData.employeeId || undefined} onValueChange={(v) => setEditFormData({ ...editFormData, employeeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Job Card (Optional)</label>
              <Select value={editFormData.jobCardId} onValueChange={(v) => setEditFormData({ ...editFormData, jobCardId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job card" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {jobCards.map((jc) => (
                    <SelectItem key={jc.id} value={jc.id}>
                      {jc.jobCardNumber} - {jc.asset?.name || 'Unknown Asset'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input 
                  type="date" 
                  value={editFormData.logDate}
                  onChange={(e) => setEditFormData({ ...editFormData, logDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Start</label>
                <Input 
                  type="time" 
                  value={editFormData.startTime}
                  onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End</label>
                <Input 
                  type="time" 
                  value={editFormData.endTime}
                  onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Break (mins)</label>
                <Input 
                  type="number"
                  value={editFormData.breakMinutes}
                  onChange={(e) => setEditFormData({ ...editFormData, breakMinutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hourly Rate (LKR)</label>
                <Input 
                  type="number"
                  step="0.01"
                  value={editFormData.hourlyRate}
                  onChange={(e) => setEditFormData({ ...editFormData, hourlyRate: e.target.value })}
                  placeholder="Default rate"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input 
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdate} className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Time Log
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Time Log</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this time log? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="py-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedLog.employee.name}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedLog.logDate).toLocaleDateString()} • {formatDuration(selectedLog.totalMinutes)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
