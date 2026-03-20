'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  Plus, 
  Search, 
  Loader2, 
  Users,
  Key,
  Edit,
  Trash2,
  Check,
  X,
  Settings,
  Grid3X3,
  List,
  Filter,
  ChevronDown,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// INTERFACES
// ============================================

interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  level: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  privilegeCount: number;
  grantedPrivilegeCount: number;
  privileges?: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
  }>;
}

interface Privilege {
  id: string;
  privilegeId: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
  isGranted: boolean;
  maxAmount: number | null;
  workshopScope: boolean;
  isAssigned: boolean;
}

interface PrivilegeCategory {
  category: string;
  privileges: Privilege[];
}

interface RolesResponse {
  data: Role[];
  meta: {
    total: number;
    activeCount: number;
    inactiveCount: number;
  };
}

interface RolePrivilegesResponse {
  data: {
    role: { id: string; code: string; name: string };
    privileges: Privilege[];
    byCategory: Record<string, Privilege[]>;
    summary: {
      total: number;
      assigned: number;
      granted: number;
      byCategory: Array<{
        category: string;
        total: number;
        assigned: number;
        granted: number;
      }>;
    };
  };
}

// ============================================
// CONSTANTS
// ============================================

const PRIVILEGE_CATEGORIES: Record<string, string> = {
  'JOB_CARDS': 'Job Cards',
  'ASSETS': 'Assets',
  'INVENTORY': 'Inventory',
  'PROCUREMENT': 'Procurement',
  'QUALITY': 'Quality',
  'REPORTS': 'Reports',
  'USERS': 'User Management',
  'SETTINGS': 'Settings',
  'FUEL': 'Fuel Management',
  'MAINTENANCE': 'Maintenance',
  'EXTERNAL_REPAIRS': 'External Repairs',
  'DASHBOARD': 'Dashboard',
};

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-slate-100 text-foreground',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-cyan-100 text-cyan-700',
  4: 'bg-amber-100 text-amber-700',
  5: 'bg-orange-100 text-orange-700',
  6: 'bg-purple-100 text-purple-700',
  7: 'bg-pink-100 text-pink-700',
  8: 'bg-rose-100 text-rose-700',
  9: 'bg-red-100 text-red-700',
  10: 'bg-emerald-100 text-emerald-700',
};

const LEVEL_LABELS: Record<number, string> = {
  1: 'Basic',
  2: 'Standard',
  3: 'Advanced',
  4: 'Supervisor',
  5: 'Manager',
  6: 'Senior Manager',
  7: 'Director',
  8: 'VP',
  9: 'Executive',
  10: 'Admin',
};

// ============================================
// MAIN COMPONENT
// ============================================

export function RoleManagementView() {
  // State
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Dialogs
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showPrivilegesDialog, setShowPrivilegesDialog] = useState(false);
  const [showMatrixDialog, setShowMatrixDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Selected items
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePrivileges, setRolePrivileges] = useState<Privilege[]>([]);
  const [privilegesByCategory, setPrivilegesByCategory] = useState<PrivilegeCategory[]>([]);
  const [privilegesLoading, setPrivilegesLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [roleForm, setRoleForm] = useState({
    code: '',
    name: '',
    description: '',
    level: 1,
    isActive: true,
  });
  const [isEditing, setIsEditing] = useState(false);

  // Matrix state
  const [matrixRoles, setMatrixRoles] = useState<Role[]>([]);
  const [allPrivileges, setAllPrivileges] = useState<Privilege[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);

  // Fetch roles on mount and filter change
  useEffect(() => {
    fetchRoles();
  }, [statusFilter]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/roles?${params.toString()}`);
      if (response.ok) {
        const data: RolesResponse = await response.json();
        setRoles(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchRolePrivileges = async (roleId: string) => {
    try {
      setPrivilegesLoading(true);
      const response = await fetch(`/api/roles/${roleId}/privileges`);
      if (response.ok) {
        const data: RolePrivilegesResponse = await response.json();
        setRolePrivileges(data.data.privileges);
        
        // Convert byCategory to array format
        const categories: PrivilegeCategory[] = Object.entries(data.data.byCategory)
          .map(([category, privileges]) => ({
            category,
            privileges,
          }))
          .sort((a, b) => {
            const labelA = PRIVILEGE_CATEGORIES[a.category] || a.category;
            const labelB = PRIVILEGE_CATEGORIES[b.category] || b.category;
            return labelA.localeCompare(labelB);
          });
        
        setPrivilegesByCategory(categories);
        // Expand all categories by default
        setExpandedCategories(new Set(categories.map(c => c.category)));
      }
    } catch (error) {
      console.error('Failed to fetch role privileges:', error);
      toast.error('Failed to load privileges');
    } finally {
      setPrivilegesLoading(false);
    }
  };

  const fetchMatrixData = async () => {
    try {
      setMatrixLoading(true);
      
      // Fetch all roles with their privileges
      const [rolesRes, privRes] = await Promise.all([
        fetch('/api/roles'),
        fetch('/api/privileges'),
      ]);

      if (rolesRes.ok && privRes.ok) {
        const rolesData: RolesResponse = await rolesRes.json();
        const privData = await privRes.json();
        
        setMatrixRoles(rolesData.data || []);
        setAllPrivileges(privData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch matrix data:', error);
      toast.error('Failed to load matrix data');
    } finally {
      setMatrixLoading(false);
    }
  };

  // Handlers
  const handleCreateRole = async () => {
    if (!roleForm.code || !roleForm.name) {
      toast.error('Code and name are required');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm),
      });

      if (response.ok) {
        toast.success('Role created successfully');
        setShowRoleDialog(false);
        resetRoleForm();
        fetchRoles();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create role');
      }
    } catch (error) {
      console.error('Failed to create role:', error);
      toast.error('Failed to create role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole || !roleForm.name) {
      toast.error('Name is required');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleForm.name,
          description: roleForm.description || null,
          level: roleForm.level,
          isActive: roleForm.isActive,
        }),
      });

      if (response.ok) {
        toast.success('Role updated successfully');
        setShowRoleDialog(false);
        resetRoleForm();
        fetchRoles();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/roles/${selectedRole.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Role deleted successfully');
        setShowDeleteDialog(false);
        setSelectedRole(null);
        fetchRoles();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Failed to delete role:', error);
      toast.error('Failed to delete role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePrivilege = async (privilege: Privilege, isGranted: boolean) => {
    if (!selectedRole) return;

    try {
      if (privilege.isAssigned) {
        // Update existing privilege
        const response = await fetch(`/api/roles/${selectedRole.id}/privileges`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            privilegeId: privilege.privilegeId,
            isGranted,
          }),
        });

        if (response.ok) {
          updatePrivilegeInState(privilege.privilegeId, { isGranted });
          toast.success(isGranted ? 'Privilege granted' : 'Privilege revoked');
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to update privilege');
        }
      } else {
        // Add new privilege
        const response = await fetch(`/api/roles/${selectedRole.id}/privileges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            privilegeId: privilege.privilegeId,
            isGranted,
          }),
        });

        if (response.ok) {
          fetchRolePrivileges(selectedRole.id);
          toast.success('Privilege added');
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to add privilege');
        }
      }
    } catch (error) {
      console.error('Failed to toggle privilege:', error);
      toast.error('Failed to update privilege');
    }
  };

  const handleUpdatePrivilegeSettings = async (
    privilege: Privilege, 
    updates: { maxAmount?: number | null; workshopScope?: boolean }
  ) => {
    if (!selectedRole || !privilege.isAssigned) return;

    try {
      const response = await fetch(`/api/roles/${selectedRole.id}/privileges`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privilegeId: privilege.privilegeId,
          ...updates,
        }),
      });

      if (response.ok) {
        updatePrivilegeInState(privilege.privilegeId, updates);
        toast.success('Privilege settings updated');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Failed to update privilege settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const updatePrivilegeInState = (privilegeId: string, updates: Partial<Privilege>) => {
    setRolePrivileges(prev => prev.map(p => 
      p.privilegeId === privilegeId ? { ...p, ...updates } : p
    ));
    setPrivilegesByCategory(prev => prev.map(cat => ({
      ...cat,
      privileges: cat.privileges.map(p => 
        p.privilegeId === privilegeId ? { ...p, ...updates } : p
      ),
    })));
  };

  const resetRoleForm = () => {
    setRoleForm({
      code: '',
      name: '',
      description: '',
      level: 1,
      isActive: true,
    });
    setIsEditing(false);
    setSelectedRole(null);
  };

  const openCreateDialog = () => {
    resetRoleForm();
    setIsEditing(false);
    setShowRoleDialog(true);
  };

  const openEditDialog = (role: Role) => {
    setSelectedRole(role);
    setRoleForm({
      code: role.code,
      name: role.name,
      description: role.description || '',
      level: role.level,
      isActive: role.isActive,
    });
    setIsEditing(true);
    setShowRoleDialog(true);
  };

  const openPrivilegesDialog = (role: Role) => {
    setSelectedRole(role);
    setShowPrivilegesDialog(true);
    fetchRolePrivileges(role.id);
  };

  const openMatrixDialog = () => {
    setShowMatrixDialog(true);
    fetchMatrixData();
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const expandAllCategories = () => {
    setExpandedCategories(new Set(privilegesByCategory.map(c => c.category)));
  };

  const collapseAllCategories = () => {
    setExpandedCategories(new Set());
  };

  // Filtered roles
  const filteredRoles = useMemo(() => {
    if (!searchTerm) return roles;
    return roles.filter(role =>
      role.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [roles, searchTerm]);

  // Matrix helpers
  const getRolePrivilegeCodes = (role: Role): Set<string> => {
    return new Set(role.privileges?.map(p => p.code) || []);
  };

  const isPrivilegeGranted = (role: Role, privilegeCode: string): boolean => {
    return role.privileges?.some(p => p.code === privilegeCode) || false;
  };

  // Group all privileges by category for matrix
  const matrixPrivilegesByCategory = useMemo(() => {
    const grouped: Record<string, typeof allPrivileges> = {};
    allPrivileges.forEach(p => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });
    return Object.entries(grouped)
      .map(([category, privileges]) => ({ category, privileges }))
      .sort((a, b) => {
        const labelA = PRIVILEGE_CATEGORIES[a.category] || a.category;
        const labelB = PRIVILEGE_CATEGORIES[b.category] || b.category;
        return labelA.localeCompare(labelB);
      });
  }, [allPrivileges]);

  // Summary stats
  const summaryStats = useMemo(() => ({
    total: roles.length,
    active: roles.filter(r => r.isActive).length,
    inactive: roles.filter(r => !r.isActive).length,
    totalUsers: roles.reduce((sum, r) => sum + r.userCount, 0),
  }), [roles]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Role Management</h1>
          <p className="text-muted-foreground text-sm">Manage roles and their privileges</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openMatrixDialog}>
            <Grid3X3 className="h-4 w-4 mr-2" />
            Privilege Matrix
          </Button>
          <Button onClick={openCreateDialog} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            New Role
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{summaryStats.total}</div>
                <div className="text-sm text-muted-foreground">Total Roles</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{summaryStats.active}</div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <X className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground">{summaryStats.inactive}</div>
                <div className="text-sm text-muted-foreground">Inactive</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{summaryStats.totalUsers}</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchRoles}>
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-muted-foreground">No roles found</p>
              <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                Create your first role
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Code</TableHead>
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Level</TableHead>
                  <TableHead className="font-semibold">Users</TableHead>
                  <TableHead className="font-semibold">Privileges</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => (
                  <TableRow key={role.id} className="hover:bg-muted/50">
                    <TableCell>
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                        {role.code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{role.name}</div>
                        {role.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {role.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={LEVEL_COLORS[role.level] || 'bg-slate-100'}>
                        <Crown className="h-3 w-3 mr-1" />
                        Level {role.level} - {LEVEL_LABELS[role.level]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{role.userCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span>{role.grantedPrivilegeCount} / {role.privilegeCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={role.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-muted-foreground'}>
                        {role.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openPrivilegesDialog(role)}
                          title="Manage privileges"
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(role)}
                          title="Edit role"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedRole(role);
                            setShowDeleteDialog(true);
                          }}
                          className="text-red-500 hover:text-red-700"
                          title="Delete role"
                          disabled={role.userCount > 0}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update role details' : 'Define a new role with specific permissions'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                value={roleForm.code}
                onChange={(e) => setRoleForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="e.g., WORKSHOP_MANAGER"
                disabled={isEditing}
              />
              {isEditing && (
                <p className="text-xs text-muted-foreground">Code cannot be changed after creation</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={roleForm.name}
                onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Workshop Manager"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={roleForm.description}
                onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Access Level (1-10)</Label>
              <Select
                value={String(roleForm.level)}
                onValueChange={(v) => setRoleForm(prev => ({ ...prev, level: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(level => (
                    <SelectItem key={level} value={String(level)}>
                      Level {level} - {LEVEL_LABELS[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={roleForm.isActive}
                onCheckedChange={(checked) => setRoleForm(prev => ({ ...prev, isActive: checked }))}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>Cancel</Button>
            <Button 
              onClick={isEditing ? handleUpdateRole : handleCreateRole} 
              disabled={submitting} 
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Privileges Dialog */}
      <Dialog open={showPrivilegesDialog} onOpenChange={setShowPrivilegesDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-emerald-600" />
                  Manage Privileges
                </DialogTitle>
                <DialogDescription>
                  {selectedRole && (
                    <span>
                      Role: <strong>{selectedRole.name}</strong> ({selectedRole.code})
                    </span>
                  )}
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={expandAllCategories}>
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAllCategories}>
                  Collapse All
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {privilegesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : (
              <ScrollArea className="h-[60vh]">
                <div className="space-y-2 pr-4">
                  {privilegesByCategory.map((category) => {
                    const isExpanded = expandedCategories.has(category.category);
                    const grantedCount = category.privileges.filter(p => p.isGranted).length;
                    const totalCount = category.privileges.length;
                    
                    return (
                      <div key={category.category} className="border rounded-lg">
                        <button
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                          onClick={() => toggleCategory(category.category)}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">
                              {PRIVILEGE_CATEGORIES[category.category] || category.category}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {grantedCount} / {totalCount} granted
                            </Badge>
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="border-t">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50/50">
                                  <TableHead className="w-12">Grant</TableHead>
                                  <TableHead>Privilege</TableHead>
                                  <TableHead className="w-32">Max Amount</TableHead>
                                  <TableHead className="w-32">Workshop Scope</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {category.privileges.map((privilege) => (
                                  <TableRow key={privilege.privilegeId} className="hover:bg-muted/50/50">
                                    <TableCell>
                                      <Checkbox
                                        checked={privilege.isGranted}
                                        onCheckedChange={(checked) => 
                                          handleTogglePrivilege(privilege, checked as boolean)
                                        }
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{privilege.name}</span>
                                          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                                            {privilege.code}
                                          </code>
                                        </div>
                                        {privilege.description && (
                                          <span className="text-xs text-muted-foreground">
                                            {privilege.description}
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        placeholder="No limit"
                                        value={privilege.maxAmount || ''}
                                        onChange={(e) => {
                                          const value = e.target.value ? parseFloat(e.target.value) : null;
                                          handleUpdatePrivilegeSettings(privilege, { maxAmount: value });
                                        }}
                                        disabled={!privilege.isAssigned}
                                        className="h-8"
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Switch
                                        checked={privilege.workshopScope}
                                        onCheckedChange={(checked) => 
                                          handleUpdatePrivilegeSettings(privilege, { workshopScope: checked })
                                        }
                                        disabled={!privilege.isAssigned}
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowPrivilegesDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Privilege Matrix Dialog */}
      <Dialog open={showMatrixDialog} onOpenChange={setShowMatrixDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-emerald-600" />
              Privilege Matrix
            </DialogTitle>
            <DialogDescription>
              Overview of all roles and their granted privileges
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {matrixLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : (
              <ScrollArea className="h-[70vh]">
                <div className="space-y-4">
                  {matrixPrivilegesByCategory.map((category) => (
                    <div key={category.category} className="border rounded-lg overflow-hidden">
                      <div className="bg-slate-100 px-4 py-2 font-medium">
                        {PRIVILEGE_CATEGORIES[category.category] || category.category}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({category.privileges.length} privileges)
                        </span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="sticky left-0 bg-card min-w-48">Privilege</TableHead>
                            {matrixRoles.map(role => (
                              <TableHead key={role.id} className="text-center min-w-24">
                                <div className="flex flex-col items-center">
                                  <Badge 
                                    variant="outline" 
                                    className={role.isActive ? '' : 'opacity-50'}
                                  >
                                    {role.code}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground mt-1">L{role.level}</span>
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {category.privileges.map((privilege) => (
                            <TableRow key={privilege.id} className="hover:bg-muted/50">
                              <TableCell className="sticky left-0 bg-card font-medium">
                                <div className="flex flex-col">
                                  <span>{privilege.name}</span>
                                  <code className="text-xs text-muted-foreground">{privilege.code}</code>
                                </div>
                              </TableCell>
                              {matrixRoles.map(role => {
                                const isGranted = role.privileges?.some(
                                  p => p.code === privilege.code
                                );
                                return (
                                  <TableCell key={role.id} className="text-center">
                                    {isGranted ? (
                                      <div className="flex justify-center">
                                        <div className="p-1 bg-emerald-100 rounded">
                                          <Check className="h-4 w-4 text-emerald-600" />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex justify-center">
                                        <div className="p-1 bg-slate-100 rounded">
                                          <X className="h-4 w-4 text-slate-300" />
                                        </div>
                                      </div>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowMatrixDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this role?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedRole && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Code:</span>
                  <code className="font-mono">{selectedRole.code}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{selectedRole.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Users assigned:</span>
                  <span className={selectedRole.userCount > 0 ? 'text-red-600 font-medium' : ''}>
                    {selectedRole.userCount}
                  </span>
                </div>
              </div>
            )}
            {selectedRole?.userCount && selectedRole.userCount > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">
                  This role has {selectedRole.userCount} user(s) assigned. 
                  Please reassign users before deleting.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteRole} 
              disabled={submitting || (selectedRole?.userCount || 0) > 0}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
