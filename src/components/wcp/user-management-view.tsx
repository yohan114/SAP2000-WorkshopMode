'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  Search,
  Eye,
  Edit,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Key,
  Shield,
  Clock,
  Mail,
  Phone,
  Building,
  Copy,
  Check,
  AlertCircle,
  UserCheck,
  UserX,
  MoreHorizontal,
  RefreshCw,
  X,
  Plus,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

// Types
interface Role {
  id: string;
  code: string;
  name: string;
  level: number;
  description?: string | null;
}

interface UserRole extends Role {
  validFrom?: string;
  validTo?: string | null;
  isActive: boolean;
  privilegeCount?: number;
  privileges?: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
  }>;
}

interface User {
  id: string;
  employeeId?: string | null;
  email: string;
  name: string;
  phone?: string | null;
  department?: string | null;
  costCentre?: string | null;
  contractType?: string | null;
  riskLevel: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  roles: Role[];
  roleCount: number;
}

interface UserDetail extends User {
  effectivePrivileges: string[];
  privilegeCount: number;
  roleCount: number;
  roles: UserRole[];
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Status and level colors
const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-muted-foreground border-slate-200',
};

const riskLevelColors: Record<string, string> = {
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-red-50 text-red-700 border-red-200',
};

const roleLevelColors: Record<number, string> = {
  1: 'bg-slate-100 text-muted-foreground',
  2: 'bg-blue-50 text-blue-700',
  3: 'bg-cyan-50 text-cyan-700',
  4: 'bg-amber-50 text-amber-700',
  5: 'bg-purple-50 text-purple-700',
  8: 'bg-rose-50 text-rose-700',
  10: 'bg-red-50 text-red-700',
};

const privilegeCategoryColors: Record<string, string> = {
  JOB_CARDS: 'bg-blue-50 text-blue-700',
  ASSETS: 'bg-emerald-50 text-emerald-700',
  INVENTORY: 'bg-amber-50 text-amber-700',
  PROCUREMENT: 'bg-purple-50 text-purple-700',
  QUALITY: 'bg-cyan-50 text-cyan-700',
  REPORTS: 'bg-muted/50 text-foreground',
  USERS: 'bg-rose-50 text-rose-700',
  SETTINGS: 'bg-red-50 text-red-700',
};

export function UserManagementView() {
  const { toast } = useToast();
  
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [roleAssignmentDialogOpen, setRoleAssignmentDialogOpen] = useState(false);
  
  // Selected user for operations
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [selectedUserBasic, setSelectedUserBasic] = useState<User | null>(null);
  
  // Loading states
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Departments for filter
  const [departments, setDepartments] = useState<string[]>([]);
  
  // Available roles for assignment
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  
  // Temporary password state
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    password: '',
    confirmPassword: '',
    roleIds: [] as string[],
    isActive: true,
  });
  
  const [resetReason, setResetReason] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (departmentFilter !== 'all') params.append('department', departmentFilter);
      if (roleFilter !== 'all') params.append('roleId', roleFilter);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await fetch(`/api/users?${params.toString()}`);
      if (response.ok) {
        const data: PaginatedResponse<User> = await response.json();
        setUsers(data.data || []);
        setPagination(prev => ({ ...prev, ...data.meta }));
        
        // Extract unique departments if not already loaded
        if (departments.length === 0) {
          const depts = [...new Set(data.data.map(u => u.department).filter(Boolean))] as string[];
          setDepartments(depts);
        }
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load users', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, departmentFilter, roleFilter, pagination.page, pagination.limit, departments.length, toast]);

  // Fetch available roles
  const fetchAvailableRoles = useCallback(async () => {
    try {
      const response = await fetch('/api/roles');
      if (response.ok) {
        const data = await response.json();
        setAvailableRoles(data.data || data.roles || []);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUsers();
    fetchAvailableRoles();
  }, [fetchUsers, fetchAvailableRoles]);

  // Fetch user details
  const fetchUserDetails = async (userId: string) => {
    try {
      setDetailLoading(true);
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const data: UserDetail = await response.json();
        setSelectedUser(data);
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load user details', 
        variant: 'destructive' 
      });
    } finally {
      setDetailLoading(false);
    }
  };

  // Create user
  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast({ 
        title: 'Validation Error', 
        description: 'Name, email, and password are required', 
        variant: 'destructive' 
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ 
        title: 'Validation Error', 
        description: 'Passwords do not match', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          employeeId: formData.employeeId || undefined,
          phone: formData.phone || undefined,
          department: formData.department || undefined,
          roleIds: formData.roleIds,
        }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'User created successfully' });
        setCreateDialogOpen(false);
        resetForm();
        fetchUsers();
      } else {
        const error = await response.json();
        toast({ 
          title: 'Error', 
          description: error.error || 'Failed to create user', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Create user error:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to create user', 
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Update user
  const handleUpdateUser = async () => {
    if (!selectedUserBasic || !formData.name || !formData.email) {
      toast({ 
        title: 'Validation Error', 
        description: 'Name and email are required', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/users/${selectedUserBasic.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          department: formData.department || null,
          isActive: formData.isActive,
        }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'User updated successfully' });
        setEditDialogOpen(false);
        resetForm();
        fetchUsers();
      } else {
        const error = await response.json();
        toast({ 
          title: 'Error', 
          description: error.error || 'Failed to update user', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Update user error:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to update user', 
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!selectedUserBasic || !resetReason) {
      toast({ 
        title: 'Validation Error', 
        description: 'Reason for password reset is required', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/users/${selectedUserBasic.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: 'system', // In production, use actual admin ID
          reason: resetReason,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTemporaryPassword(data.temporaryPassword);
        toast({ title: 'Success', description: 'Password reset successfully' });
      } else {
        const error = await response.json();
        toast({ 
          title: 'Error', 
          description: error.error || 'Failed to reset password', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to reset password', 
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Update user roles
  const handleUpdateRoles = async () => {
    if (!selectedUserBasic || selectedRoleIds.length === 0) {
      toast({ 
        title: 'Validation Error', 
        description: 'At least one role must be selected', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/users/${selectedUserBasic.id}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds: selectedRoleIds }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Roles updated successfully' });
        setRoleAssignmentDialogOpen(false);
        fetchUsers();
        if (selectedUser?.id === selectedUserBasic.id) {
          fetchUserDetails(selectedUserBasic.id);
        }
      } else {
        const error = await response.json();
        toast({ 
          title: 'Error', 
          description: error.error || 'Failed to update roles', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Update roles error:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to update roles', 
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle user status
  const handleToggleStatus = async (user: User) => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (response.ok) {
        toast({ 
          title: 'Success', 
          description: `User ${user.isActive ? 'deactivated' : 'activated'} successfully` 
        });
        fetchUsers();
      } else {
        const error = await response.json();
        toast({ 
          title: 'Error', 
          description: error.error || 'Failed to update user status', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Toggle status error:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to update user status', 
        variant: 'destructive' 
      });
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      employeeId: '',
      name: '',
      email: '',
      phone: '',
      department: '',
      password: '',
      confirmPassword: '',
      roleIds: [],
      isActive: true,
    });
    setResetReason('');
    setTemporaryPassword(null);
    setCopied(false);
    setSelectedRoleIds([]);
  };

  // Open dialogs
  const openEditDialog = (user: User) => {
    setSelectedUserBasic(user);
    setFormData({
      employeeId: user.employeeId || '',
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      department: user.department || '',
      password: '',
      confirmPassword: '',
      roleIds: user.roles.map(r => r.id),
      isActive: user.isActive,
    });
    setEditDialogOpen(true);
  };

  const openDetailDialog = (user: User) => {
    setSelectedUserBasic(user);
    setDetailDialogOpen(true);
    fetchUserDetails(user.id);
  };

  const openResetPasswordDialog = (user: User) => {
    setSelectedUserBasic(user);
    setResetReason('');
    setTemporaryPassword(null);
    setResetPasswordDialogOpen(true);
  };

  const openRoleAssignmentDialog = (user: User) => {
    setSelectedUserBasic(user);
    setSelectedRoleIds(user.roles.map(r => r.id));
    setRoleAssignmentDialogOpen(true);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Group privileges by category
  const groupPrivilegesByCategory = (privileges: string[]) => {
    const grouped: Record<string, string[]> = {};
    privileges.forEach(priv => {
      // Extract category from privilege code (e.g., "JOB_CARDS_CREATE" -> "JOB_CARDS")
      const parts = priv.split('_');
      const category = parts.length > 1 ? parts.slice(0, -1).join('_') : priv;
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(priv);
    });
    return grouped;
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground">Manage system users, roles, and permissions</p>
        </div>
        <Button 
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => { resetForm(); setCreateDialogOpen(true); }}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or employee ID..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="pl-10"
              />
            </div>
            <Select 
              value={statusFilter} 
              onValueChange={(v) => { setStatusFilter(v); setPagination(prev => ({ ...prev, page: 1 })); }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={departmentFilter} 
              onValueChange={(v) => { setDepartmentFilter(v); setPagination(prev => ({ ...prev, page: 1 })); }}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={roleFilter} 
              onValueChange={(v) => { setRoleFilter(v); setPagination(prev => ({ ...prev, page: 1 })); }}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {availableRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Department</TableHead>
                  <TableHead className="font-semibold">Roles</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6} className="h-16">
                        <div className="animate-pulse bg-slate-200 h-4 rounded w-full"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-slate-300" />
                        <p>No users found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-muted-foreground">
                              {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            {user.employeeId && (
                              <div className="text-xs text-muted-foreground">{user.employeeId}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          {user.department || <span className="text-muted-foreground">N/A</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? (
                            user.roles.slice(0, 2).map((role) => (
                              <Badge 
                                key={role.id} 
                                variant="outline" 
                                className={roleLevelColors[role.level] || 'bg-muted/50'}
                              >
                                {role.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">No roles</span>
                          )}
                          {user.roles.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.roles.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[user.isActive ? 'active' : 'inactive']}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openDetailDialog(user)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditDialog(user)}
                            title="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openRoleAssignmentDialog(user)}>
                                <Shield className="h-4 w-4 mr-2" />
                                Manage Roles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openResetPasswordDialog(user)}>
                                <Key className="h-4 w-4 mr-2" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleToggleStatus(user)}
                                className={user.isActive ? 'text-amber-600' : 'text-emerald-600'}
                              >
                                {user.isActive ? (
                                  <>
                                    <UserX className="h-4 w-4 mr-2" />
                                    Deactivate User
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Activate User
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
          </p>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={pagination.page <= 1} 
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-sm">Page {pagination.page} of {totalPages}</span>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={pagination.page >= totalPages} 
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{pagination.total}</div>
            <div className="text-sm text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {users.filter(u => u.isActive).length}
            </div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {users.filter(u => u.roles.length > 0).length}
            </div>
            <div className="text-sm text-muted-foreground">With Roles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-muted-foreground">
              {availableRoles.length}
            </div>
            <div className="text-sm text-muted-foreground">Available Roles</div>
          </CardContent>
        </Card>
      </div>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user to the system</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
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
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g., john.smith@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                placeholder="e.g., EMP-001"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="e.g., +1 234 567 8900"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                placeholder="e.g., Engineering"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 chars, uppercase, lowercase, number, special char"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Assign Roles</Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                {availableRoles.filter(r => r.level !== 10).map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={formData.roleIds.includes(role.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({ ...prev, roleIds: [...prev.roleIds, role.id] }));
                        } else {
                          setFormData(prev => ({ ...prev, roleIds: prev.roleIds.filter(id => id !== role.id) }));
                        }
                      }}
                    />
                    <span>{role.name}</span>
                    <Badge variant="outline" className="text-xs ml-auto">Level {role.level}</Badge>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700" 
              onClick={handleCreateUser} 
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              {selectedUserBasic && <span>Editing: <strong>{selectedUserBasic.email}</strong></span>}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              <Input
                id="edit-department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-status">Active Status</Label>
                <Switch
                  id="edit-status"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Inactive users cannot log in to the system
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700" 
              onClick={handleUpdateUser} 
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              {selectedUser?.name || selectedUserBasic?.name}
            </DialogTitle>
            <DialogDescription>{selectedUser?.email || selectedUserBasic?.email}</DialogDescription>
          </DialogHeader>
          
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : selectedUser ? (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">User Info</TabsTrigger>
                <TabsTrigger value="roles">Roles</TabsTrigger>
                <TabsTrigger value="privileges">Privileges</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">Basic Information</h4>
                      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <Users className="h-4 w-4" /> Employee ID
                          </span>
                          <span className="font-medium">{selectedUser.employeeId || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <Mail className="h-4 w-4" /> Email
                          </span>
                          <span className="font-medium">{selectedUser.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <Phone className="h-4 w-4" /> Phone
                          </span>
                          <span className="font-medium">{selectedUser.phone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <Building className="h-4 w-4" /> Department
                          </span>
                          <span className="font-medium">{selectedUser.department || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">Status</h4>
                      <div className="flex gap-3">
                        <Badge className={statusColors[selectedUser.isActive ? 'active' : 'inactive']}>
                          {selectedUser.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge className={riskLevelColors[selectedUser.riskLevel] || 'bg-slate-100'}>
                          Risk: {selectedUser.riskLevel}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">Activity</h4>
                      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4" /> Last Login
                          </span>
                          <span className="font-medium">
                            {selectedUser.lastLoginAt 
                              ? new Date(selectedUser.lastLoginAt).toLocaleString() 
                              : 'Never'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created</span>
                          <span className="font-medium">
                            {new Date(selectedUser.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Updated</span>
                          <span className="font-medium">
                            {new Date(selectedUser.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-2">Summary</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <Shield className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                          <div className="font-semibold">{selectedUser.roleCount}</div>
                          <div className="text-xs text-muted-foreground">Roles</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3 text-center">
                          <Key className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                          <div className="font-semibold">{selectedUser.privilegeCount}</div>
                          <div className="text-xs text-muted-foreground">Privileges</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="roles" className="mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-muted-foreground">
                      Assigned Roles ({selectedUser.roles.length})
                    </h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setDetailDialogOpen(false);
                        openRoleAssignmentDialog(selectedUserBasic!);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" /> Edit Roles
                    </Button>
                  </div>
                  <ScrollArea className="h-64">
                    <div className="space-y-2 pr-4">
                      {selectedUser.roles.map((role) => (
                        <Card key={role.id}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{role.name}</div>
                                <code className="text-xs text-muted-foreground">{role.code}</code>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={roleLevelColors[role.level] || 'bg-muted/50'}
                                >
                                  Level {role.level}
                                </Badge>
                                <Badge className={role.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-muted-foreground'}>
                                  {role.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {selectedUser.roles.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                          No roles assigned
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
              
              <TabsContent value="privileges" className="mt-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground">
                    Effective Privileges ({selectedUser.effectivePrivileges.length})
                  </h4>
                  <ScrollArea className="h-64">
                    <div className="space-y-4 pr-4">
                      {Object.entries(groupPrivilegesByCategory(selectedUser.effectivePrivileges)).map(([category, privs]) => (
                        <div key={category}>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={privilegeCategoryColors[category] || 'bg-muted/50'}>
                              {category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">({privs.length})</span>
                          </div>
                          <div className="flex flex-wrap gap-1 ml-2">
                            {privs.map((priv) => (
                              <Badge key={priv} variant="outline" className="text-xs">
                                {priv}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                      {selectedUser.effectivePrivileges.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                          No privileges assigned
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={(open) => {
        setResetPasswordDialogOpen(open);
        if (!open) setTemporaryPassword(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              {selectedUserBasic && (
                <span>Reset password for <strong>{selectedUserBasic.email}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {!temporaryPassword ? (
            <>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <div className="text-sm text-amber-700">
                    This will invalidate all existing sessions for this user.
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resetReason">Reason for Reset *</Label>
                  <Textarea
                    id="resetReason"
                    placeholder="e.g., User forgot password, Security concern..."
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-amber-600 hover:bg-amber-700" 
                  onClick={handleResetPassword} 
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Reset Password
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <Check className="h-5 w-5 text-emerald-600" />
                <div className="text-sm text-emerald-700">
                  Password has been reset successfully!
                </div>
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <div className="flex gap-2">
                  <Input 
                    value={temporaryPassword} 
                    readOnly 
                    className="font-mono text-lg"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(temporaryPassword)}
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Please provide this temporary password to the user. They will need to change it on their next login.
                </p>
              </div>
              <DialogFooter>
                <Button 
                  onClick={() => {
                    setResetPasswordDialogOpen(false);
                    setTemporaryPassword(null);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Assignment Dialog */}
      <Dialog open={roleAssignmentDialogOpen} onOpenChange={setRoleAssignmentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage User Roles</DialogTitle>
            <DialogDescription>
              {selectedUserBasic && (
                <span>Assign roles to <strong>{selectedUserBasic.name}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Available Roles</Label>
              <ScrollArea className="h-64 border rounded-lg p-3">
                <div className="space-y-2 pr-4">
                  {availableRoles.map((role) => (
                    <label 
                      key={role.id} 
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedRoleIds.includes(role.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRoleIds([...selectedRoleIds, role.id]);
                          } else {
                            setSelectedRoleIds(selectedRoleIds.filter(id => id !== role.id));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{role.name}</div>
                        {role.description && (
                          <div className="text-xs text-muted-foreground">{role.description}</div>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={roleLevelColors[role.level] || 'bg-muted/50'}
                      >
                        L{role.level}
                      </Badge>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{selectedRoleIds.length} role(s) selected</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleAssignmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700" 
              onClick={handleUpdateRoles} 
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
