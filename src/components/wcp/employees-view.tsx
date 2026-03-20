'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Users, 
  Search, 
  Eye,
  Edit,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Award,
  Clock,
  DollarSign,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  department?: string;
  designation?: string;
  skillLevel?: string;
  hourlyRate?: number | null;
  overtimeRate?: number | null;
  hireDate?: string;
  status: string;
  createdAt: string;
  _count?: {
    timeLogs: number;
    technicianSkills: number;
  };
}

interface PaginatedResponse {
  data: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const statusColors: Record<string, string> = {
  'ACTIVE': 'bg-emerald-100 text-emerald-700',
  'INACTIVE': 'bg-slate-100 text-muted-foreground',
  'ON_LEAVE': 'bg-amber-100 text-amber-700',
};

const skillLevelColors: Record<string, string> = {
  'TRAINEE': 'bg-slate-100 text-muted-foreground',
  'JUNIOR': 'bg-blue-100 text-blue-700',
  'INTERMEDIATE': 'bg-cyan-100 text-cyan-700',
  'SENIOR': 'bg-amber-100 text-amber-700',
  'EXPERT': 'bg-purple-100 text-purple-700',
  'MASTER': 'bg-emerald-100 text-emerald-700',
};

export function EmployeesView() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  
  const [formData, setFormData] = useState({
    employeeNumber: '',
    name: '',
    department: '',
    designation: '',
    skillLevel: '',
    hourlyRate: '',
    overtimeRate: '',
    hireDate: '',
    status: 'ACTIVE' as const,
  });

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  useEffect(() => {
    fetchEmployees();
  }, [searchTerm, statusFilter, departmentFilter, pagination.page]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (departmentFilter !== 'all') params.append('department', departmentFilter);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await fetch(`/api/employees?${params.toString()}`);
      if (response.ok) {
        const data: PaginatedResponse = await response.json();
        setEmployees(data.data || []);
        setPagination(prev => ({ ...prev, ...data.meta }));
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast({ title: 'Error', description: 'Failed to load employees', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async () => {
    if (!formData.employeeNumber || !formData.name) {
      toast({ title: 'Validation Error', description: 'Employee number and name are required', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeNumber: formData.employeeNumber,
          name: formData.name,
          department: formData.department || undefined,
          designation: formData.designation || undefined,
          skillLevel: formData.skillLevel || undefined,
          hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
          overtimeRate: formData.overtimeRate ? parseFloat(formData.overtimeRate) : undefined,
          hireDate: formData.hireDate || undefined,
          status: formData.status,
        }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Employee created successfully' });
        setCreateDialogOpen(false);
        resetForm();
        fetchEmployees();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.message || 'Failed to create employee', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Create employee error:', error);
      toast({ title: 'Error', description: 'Failed to create employee', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee || !formData.name) {
      toast({ title: 'Validation Error', description: 'Name is required', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          department: formData.department || undefined,
          designation: formData.designation || undefined,
          skillLevel: formData.skillLevel || undefined,
          hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
          overtimeRate: formData.overtimeRate ? parseFloat(formData.overtimeRate) : undefined,
          hireDate: formData.hireDate || undefined,
          status: formData.status,
        }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Employee updated successfully' });
        setEditDialogOpen(false);
        setSelectedEmployee(null);
        resetForm();
        fetchEmployees();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.message || 'Failed to update employee', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Update employee error:', error);
      toast({ title: 'Error', description: 'Failed to update employee', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employeeNumber: '',
      name: '',
      department: '',
      designation: '',
      skillLevel: '',
      hourlyRate: '',
      overtimeRate: '',
      hireDate: '',
      status: 'ACTIVE',
    });
  };

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      employeeNumber: employee.employeeNumber,
      name: employee.name,
      department: employee.department || '',
      designation: employee.designation || '',
      skillLevel: employee.skillLevel || '',
      hourlyRate: employee.hourlyRate?.toString() || '',
      overtimeRate: employee.overtimeRate?.toString() || '',
      hireDate: employee.hireDate ? employee.hireDate.split('T')[0] : '',
      status: employee.status as typeof formData.status,
    });
    setEditDialogOpen(true);
  };

  const openDetailDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDetailDialogOpen(true);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Employee Management</h2>
          <p className="text-muted-foreground">Manage workshop technicians and staff</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>Register a new employee in the workshop</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="employeeNumber">Employee Number *</Label>
                <Input
                  id="employeeNumber"
                  placeholder="e.g., EMP-001"
                  value={formData.employeeNumber}
                  onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="e.g., Mechanical"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  placeholder="e.g., Senior Technician"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skillLevel">Skill Level</Label>
                <Select value={formData.skillLevel} onValueChange={(v) => setFormData({ ...formData, skillLevel: v })}>
                  <SelectTrigger><SelectValue placeholder="Select skill level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRAINEE">Trainee</SelectItem>
                    <SelectItem value="JUNIOR">Junior</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="SENIOR">Senior</SelectItem>
                    <SelectItem value="EXPERT">Expert</SelectItem>
                    <SelectItem value="MASTER">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as typeof formData.status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate (LKR)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overtimeRate">Overtime Rate (LKR)</Label>
                <Input
                  id="overtimeRate"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.overtimeRate}
                  onChange={(e) => setFormData({ ...formData, overtimeRate: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="hireDate">Hire Date</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateEmployee} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Employee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee number or name..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPagination(prev => ({ ...prev, page: 1 })); }}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="ON_LEAVE">On Leave</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setPagination(prev => ({ ...prev, page: 1 })); }}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept as string}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Employee #</TableHead>
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Department</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Designation</TableHead>
                  <TableHead className="font-semibold">Skill Level</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7} className="h-16"><div className="animate-pulse bg-slate-200 h-4 rounded w-full"></div></TableCell>
                    </TableRow>
                  ))
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-slate-300" />
                        <p>No employees found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-slate-100 rounded"><Users className="h-4 w-4 text-muted-foreground" /></div>
                          {employee.employeeNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          {employee.designation && <div className="text-xs text-muted-foreground">{employee.designation}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{employee.department || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{employee.designation || 'N/A'}</TableCell>
                      <TableCell>
                        {employee.skillLevel ? (
                          <Badge className={skillLevelColors[employee.skillLevel] || 'bg-slate-100'}>{employee.skillLevel}</Badge>
                        ) : <span className="text-muted-foreground">N/A</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[employee.status] || 'bg-slate-100'}>{employee.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openDetailDialog(employee)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(employee)}><Edit className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} employees
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-sm">Page {pagination.page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={pagination.page >= totalPages} onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-foreground">{pagination.total}</div><div className="text-sm text-muted-foreground">Total Employees</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-emerald-600">{employees.filter(e => e.status === 'ACTIVE').length}</div><div className="text-sm text-muted-foreground">Active</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-amber-600">{employees.filter(e => e.status === 'ON_LEAVE').length}</div><div className="text-sm text-muted-foreground">On Leave</div></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-purple-600">{employees.filter(e => e.skillLevel === 'SENIOR' || e.skillLevel === 'EXPERT' || e.skillLevel === 'MASTER').length}</div><div className="text-sm text-muted-foreground">Senior+ Level</div></CardContent></Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>{selectedEmployee && <span>Editing: <strong>{selectedEmployee.employeeNumber}</strong></span>}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              <Input id="edit-department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-designation">Designation</Label>
              <Input id="edit-designation" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-skillLevel">Skill Level</Label>
              <Select value={formData.skillLevel} onValueChange={(v) => setFormData({ ...formData, skillLevel: v })}>
                <SelectTrigger><SelectValue placeholder="Select skill level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRAINEE">Trainee</SelectItem>
                  <SelectItem value="JUNIOR">Junior</SelectItem>
                  <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                  <SelectItem value="SENIOR">Senior</SelectItem>
                  <SelectItem value="EXPERT">Expert</SelectItem>
                  <SelectItem value="MASTER">Master</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as typeof formData.status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-hourlyRate">Hourly Rate (LKR)</Label>
              <Input id="edit-hourlyRate" type="number" step="0.01" value={formData.hourlyRate} onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-overtimeRate">Overtime Rate (LKR)</Label>
              <Input id="edit-overtimeRate" type="number" step="0.01" value={formData.overtimeRate} onChange={(e) => setFormData({ ...formData, overtimeRate: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-hireDate">Hire Date</Label>
              <Input id="edit-hireDate" type="date" value={formData.hireDate} onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleUpdateEmployee} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg"><Users className="h-5 w-5 text-muted-foreground" /></div>
              {selectedEmployee?.name}
            </DialogTitle>
            <DialogDescription>{selectedEmployee?.employeeNumber}</DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Basic Information</h4>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between"><span className="text-muted-foreground">Department</span><span className="font-medium">{selectedEmployee.department || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Designation</span><span className="font-medium">{selectedEmployee.designation || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Hire Date</span><span className="font-medium">{selectedEmployee.hireDate ? new Date(selectedEmployee.hireDate).toLocaleDateString() : 'N/A'}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Status</h4>
                  <div className="flex gap-3">
                    <Badge className={statusColors[selectedEmployee.status] || 'bg-slate-100'}>{selectedEmployee.status}</Badge>
                    {selectedEmployee.skillLevel && <Badge className={skillLevelColors[selectedEmployee.skillLevel] || 'bg-slate-100'}><Award className="h-3 w-3 mr-1" />{selectedEmployee.skillLevel}</Badge>}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Rates</h4>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-muted-foreground"><DollarSign className="h-4 w-4" />Hourly Rate</div><span className="font-semibold text-lg">LKR {selectedEmployee.hourlyRate?.toFixed(2) || '0.00'}</span></div>
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-muted-foreground"><DollarSign className="h-4 w-4" />Overtime Rate</div><span className="font-semibold text-lg">LKR {selectedEmployee.overtimeRate?.toFixed(2) || '0.00'}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Activity</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-center"><Clock className="h-5 w-5 text-muted-foreground mx-auto mb-1" /><div className="font-semibold">{selectedEmployee._count?.timeLogs || 0}</div><div className="text-xs text-muted-foreground">Time Logs</div></div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center"><Award className="h-5 w-5 text-muted-foreground mx-auto mb-1" /><div className="font-semibold">{selectedEmployee._count?.technicianSkills || 0}</div><div className="text-xs text-muted-foreground">Skills</div></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="mt-4 text-xs text-muted-foreground">Created: {selectedEmployee?.createdAt ? new Date(selectedEmployee.createdAt).toLocaleString() : 'N/A'}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
