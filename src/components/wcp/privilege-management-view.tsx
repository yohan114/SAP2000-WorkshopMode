'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  DialogTitle,
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
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Shield,
  Search,
  Loader2,
  Users,
  Key,
  ChevronDown,
  ChevronRight,
  Crown,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Edit,
  CalendarIcon,
  UserCog,
  Check,
  X,
  AlertCircle,
  Clock,
  Filter,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { usePrivileges } from '@/hooks/use-privileges';

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
  userCount: number;
  privilegeCount: number;
  grantedPrivilegeCount: number;
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

interface User {
  id: string;
  email: string;
  name: string;
  employeeId: string | null;
  department: string | null;
  isActive: boolean;
  roles: Array<{
    id: string;
    code: string;
    name: string;
  }>;
}

interface UserOverride {
  id: string;
  privilegeId: string;
  privilegeCode: string;
  privilegeName: string;
  category: string;
  isGranted: boolean;
  reason: string | null;
  validFrom: string;
  validTo: string | null;
  grantedBy: string;
  grantedByName?: string;
}

interface UserPrivilegeData {
  user: {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
  };
  privileges: {
    all: Array<{
      id: string;
      code: string;
      name: string;
      category: string;
      source: 'role' | 'override';
      sourceDetails?: string;
      isGranted: boolean;
      overrideId?: string;
      overrideReason?: string;
      validTo?: string | null;
    }>;
    effective: Array<{
      id: string;
      code: string;
      name: string;
      category: string;
      source: 'role' | 'override';
      isGranted: boolean;
    }>;
    revoked: Array<{
      id: string;
      code: string;
      name: string;
      category: string;
      source: 'role' | 'override';
      isGranted: boolean;
    }>;
    byCategory: Record<string, Array<{
      id: string;
      code: string;
      name: string;
      category: string;
      source: 'role' | 'override';
      isGranted: boolean;
    }>>;
  };
  overrides: UserOverride[];
  summary: {
    totalPrivileges: number;
    effectiveCount: number;
    revokedCount: number;
    overrideCount: number;
  };
  availablePrivileges: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
  }>;
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
  'PRIVILEGES': 'Privileges',
  'SYSTEM': 'System',
};

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-slate-100 text-slate-700',
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

export function PrivilegeManagementView() {
  // Privilege check - only allow users with PRIVILEGE_ASSIGN or ADMIN
  const { can, canAny } = usePrivileges();
  const hasAccess = canAny(['PRIVILEGE_ASSIGN', 'SYSTEM_ADMIN', 'ADMIN']);

  // State
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePrivileges, setRolePrivileges] = useState<Privilege[]>([]);
  const [privilegesByCategory, setPrivilegesByCategory] = useState<PrivilegeCategory[]>([]);
  const [privilegesLoading, setPrivilegesLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [privilegeSearch, setPrivilegeSearch] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<Privilege>>>(new Map());
  const [saving, setSaving] = useState(false);

  // User Overrides State
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserPrivilegeData | null>(null);
  const [userDataLoading, setUserDataLoading] = useState(false);

  // Dialogs
  const [showAddOverrideDialog, setShowAddOverrideDialog] = useState(false);
  const [showEditOverrideDialog, setShowEditOverrideDialog] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<UserOverride | null>(null);

  // Add Override Form
  const [overrideForm, setOverrideForm] = useState({
    privilegeId: '',
    isGranted: true,
    reason: '',
    validTo: null as Date | null,
  });

  // Fetch roles on mount
  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const response = await fetch('/api/roles');
      if (response.ok) {
        const data = await response.json();
        setRoles(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchRolePrivileges = async (roleId: string) => {
    try {
      setPrivilegesLoading(true);
      const response = await fetch(`/api/roles/${roleId}/privileges`);
      if (response.ok) {
        const data = await response.json();
        setRolePrivileges(data.data.privileges);

        // Convert byCategory to array format
        const categories: PrivilegeCategory[] = Object.entries(data.data.byCategory)
          .map(([category, privileges]) => ({
            category,
            privileges: privileges as Privilege[],
          }))
          .sort((a, b) => {
            const labelA = PRIVILEGE_CATEGORIES[a.category] || a.category;
            const labelB = PRIVILEGE_CATEGORIES[b.category] || b.category;
            return labelA.localeCompare(labelB);
          });

        setPrivilegesByCategory(categories);
        setExpandedCategories(new Set(categories.map(c => c.category)));
        setHasChanges(false);
        setPendingChanges(new Map());
      }
    } catch (error) {
      console.error('Failed to fetch role privileges:', error);
      toast.error('Failed to load privileges');
    } finally {
      setPrivilegesLoading(false);
    }
  };

  const searchUsers = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setUserSearchResults([]);
      return;
    }

    try {
      setUserSearchLoading(true);
      const response = await fetch(`/api/users?search=${encodeURIComponent(searchTerm)}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setUserSearchResults(data.data || []);
      }
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setUserSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(userSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, searchUsers]);

  const fetchUserData = async (userId: string) => {
    try {
      setUserDataLoading(true);
      const response = await fetch(`/api/users/${userId}/privileges`);
      if (response.ok) {
        const data = await response.json();
        setUserData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      toast.error('Failed to load user privileges');
    } finally {
      setUserDataLoading(false);
    }
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    fetchRolePrivileges(role.id);
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

  const handlePrivilegeChange = (privilege: Privilege, field: keyof Privilege, value: unknown) => {
    const newPending = new Map(pendingChanges);
    const existing = newPending.get(privilege.privilegeId) || {};
    newPending.set(privilege.privilegeId, {
      ...existing,
      [field]: value,
    });
    setPendingChanges(newPending);
    setHasChanges(true);
  };

  const getEffectivePrivilege = (privilege: Privilege): Privilege => {
    const pending = pendingChanges.get(privilege.privilegeId);
    return pending ? { ...privilege, ...pending } : privilege;
  };

  const handleSaveRolePrivileges = async () => {
    if (!selectedRole || pendingChanges.size === 0) return;

    try {
      setSaving(true);
      let successCount = 0;
      let errorCount = 0;

      for (const [privilegeId, changes] of pendingChanges) {
        const privilege = rolePrivileges.find(p => p.privilegeId === privilegeId);
        if (!privilege) continue;

        if (!privilege.isAssigned && changes.isGranted) {
          // Add new privilege
          const response = await fetch(`/api/roles/${selectedRole.id}/privileges`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              privilegeId,
              isGranted: changes.isGranted,
            }),
          });
          if (response.ok) successCount++;
          else errorCount++;
        } else if (privilege.isAssigned) {
          // Update existing privilege
          const response = await fetch(`/api/roles/${selectedRole.id}/privileges`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              privilegeId,
              ...changes,
            }),
          });
          if (response.ok) successCount++;
          else errorCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(`Updated ${successCount} privilege(s)`);
        setHasChanges(false);
        setPendingChanges(new Map());
        fetchRolePrivileges(selectedRole.id);
        fetchRoles(); // Refresh role list to update counts
      } else {
        toast.error(`Failed to update ${errorCount} privilege(s)`);
      }
    } catch (error) {
      console.error('Failed to save privileges:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleRevertChanges = () => {
    setPendingChanges(new Map());
    setHasChanges(false);
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setUserSearch(user.name);
    setUserSearchResults([]);
    fetchUserData(user.id);
  };

  const handleAddOverride = async () => {
    if (!selectedUser || !overrideForm.privilegeId || !overrideForm.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/privileges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privilegeId: overrideForm.privilegeId,
          isGranted: overrideForm.isGranted,
          reason: overrideForm.reason,
          validTo: overrideForm.validTo?.toISOString(),
          grantedBy: 'system', // In real app, use current user ID
        }),
      });

      if (response.ok) {
        toast.success('Privilege override added');
        setShowAddOverrideDialog(false);
        setOverrideForm({
          privilegeId: '',
          isGranted: true,
          reason: '',
          validTo: null,
        });
        fetchUserData(selectedUser.id);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add override');
      }
    } catch (error) {
      console.error('Failed to add override:', error);
      toast.error('Failed to add override');
    }
  };

  const handleEditOverride = async () => {
    if (!selectedUser || !selectedOverride || !overrideForm.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/privileges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privilegeId: selectedOverride.privilegeId,
          isGranted: overrideForm.isGranted,
          reason: overrideForm.reason,
          validTo: overrideForm.validTo?.toISOString(),
          grantedBy: 'system',
        }),
      });

      if (response.ok) {
        toast.success('Privilege override updated');
        setShowEditOverrideDialog(false);
        setSelectedOverride(null);
        setOverrideForm({
          privilegeId: '',
          isGranted: true,
          reason: '',
          validTo: null,
        });
        fetchUserData(selectedUser.id);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update override');
      }
    } catch (error) {
      console.error('Failed to update override:', error);
      toast.error('Failed to update override');
    }
  };

  const handleDeleteOverride = async (override: UserOverride) => {
    if (!selectedUser) return;

    try {
      const response = await fetch(
        `/api/users/${selectedUser.id}/privileges?privilegeId=${override.privilegeId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        toast.success('Privilege override removed');
        fetchUserData(selectedUser.id);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove override');
      }
    } catch (error) {
      console.error('Failed to delete override:', error);
      toast.error('Failed to remove override');
    }
  };

  const openEditOverrideDialog = (override: UserOverride) => {
    setSelectedOverride(override);
    setOverrideForm({
      privilegeId: override.privilegeId,
      isGranted: override.isGranted,
      reason: override.reason || '',
      validTo: override.validTo ? new Date(override.validTo) : null,
    });
    setShowEditOverrideDialog(true);
  };

  // Filter privileges by search
  const filteredCategories = useMemo(() => {
    if (!privilegeSearch) return privilegesByCategory;

    return privilegesByCategory.map(cat => ({
      ...cat,
      privileges: cat.privileges.filter(
        p =>
          p.name.toLowerCase().includes(privilegeSearch.toLowerCase()) ||
          p.code.toLowerCase().includes(privilegeSearch.toLowerCase())
      ),
    })).filter(cat => cat.privileges.length > 0);
  }, [privilegesByCategory, privilegeSearch]);

  // Summary stats
  const roleStats = useMemo(() => ({
    total: roles.length,
    active: roles.filter(r => r.isActive).length,
    totalPrivileges: roles.reduce((sum, r) => sum + r.grantedPrivilegeCount, 0),
  }), [roles]);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900">Access Restricted</h2>
        <p className="text-slate-500 mt-2">You do not have permission to manage privileges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Privilege Management</h1>
          <p className="text-slate-500 text-sm">Manage role privileges and user-specific overrides</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Role Privileges
          </TabsTrigger>
          <TabsTrigger value="overrides" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            User Overrides
          </TabsTrigger>
        </TabsList>

        {/* Role Privileges Tab */}
        <TabsContent value="roles" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Shield className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">{roleStats.total}</div>
                    <div className="text-sm text-slate-500">Total Roles</div>
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
                    <div className="text-2xl font-bold text-emerald-600">{roleStats.active}</div>
                    <div className="text-sm text-slate-500">Active Roles</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Key className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{roleStats.totalPrivileges}</div>
                    <div className="text-sm text-slate-500">Granted Privileges</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Role List */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Roles</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search roles..."
                    className="pl-9"
                    value={privilegeSearch}
                    onChange={(e) => setPrivilegeSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  {rolesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                    </div>
                  ) : (
                    <div className="divide-y">
                      {roles.map((role) => (
                        <button
                          key={role.id}
                          onClick={() => handleSelectRole(role)}
                          className={cn(
                            'w-full p-3 text-left hover:bg-slate-50 transition-colors',
                            selectedRole?.id === role.id && 'bg-emerald-50 border-l-2 border-emerald-500'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-900">{role.name}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                <code className="bg-slate-100 px-1.5 py-0.5 rounded">{role.code}</code>
                                <Badge className={LEVEL_COLORS[role.level] || 'bg-slate-100'}>
                                  L{role.level}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-slate-700">
                                {role.grantedPrivilegeCount}/{role.privilegeCount}
                              </div>
                              <div className="text-xs text-slate-500">privileges</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Privilege Management */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {selectedRole ? `Privileges: ${selectedRole.name}` : 'Select a Role'}
                    </CardTitle>
                    <CardDescription>
                      {selectedRole && (
                        <span>
                          {selectedRole.code} - Level {selectedRole.level}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {selectedRole && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={expandAllCategories}>
                        Expand All
                      </Button>
                      <Button variant="outline" size="sm" onClick={collapseAllCategories}>
                        Collapse All
                      </Button>
                    </div>
                  )}
                </div>
                {selectedRole && (
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Filter privileges..."
                      className="pl-9"
                      value={privilegeSearch}
                      onChange={(e) => setPrivilegeSearch(e.target.value)}
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {privilegesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                  </div>
                ) : !selectedRole ? (
                  <div className="text-center py-12">
                    <Key className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Select a role to manage privileges</p>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="h-[450px]">
                      <div className="divide-y">
                        {filteredCategories.map((category) => {
                          const isExpanded = expandedCategories.has(category.category);
                          const grantedCount = category.privileges.filter(p => {
                            const effective = getEffectivePrivilege(p);
                            return effective.isGranted;
                          }).length;

                          return (
                            <div key={category.category} className="border-b">
                              <button
                                className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                                onClick={() => toggleCategory(category.category)}
                              >
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-slate-400" />
                                  )}
                                  <span className="font-medium">
                                    {PRIVILEGE_CATEGORIES[category.category] || category.category}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {grantedCount} / {category.privileges.length}
                                  </Badge>
                                </div>
                              </button>

                              {isExpanded && (
                                <div className="border-t bg-slate-50/50">
                                  {category.privileges.map((privilege) => {
                                    const effective = getEffectivePrivilege(privilege);
                                    const isPending = pendingChanges.has(privilege.privilegeId);

                                    return (
                                      <div
                                        key={privilege.privilegeId}
                                        className={cn(
                                          'flex items-center justify-between px-4 py-2.5 border-b last:border-b-0',
                                          isPending && 'bg-amber-50'
                                        )}
                                      >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <Checkbox
                                            checked={effective.isGranted}
                                            onCheckedChange={(checked) =>
                                              handlePrivilegeChange(privilege, 'isGranted', checked)
                                            }
                                          />
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium text-sm">{privilege.name}</span>
                                              <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                                                {privilege.code}
                                              </code>
                                              {isPending && (
                                                <Badge className="bg-amber-100 text-amber-700 text-xs">
                                                  Modified
                                                </Badge>
                                              )}
                                              {!privilege.isAssigned && effective.isGranted && (
                                                <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                                                  New
                                                </Badge>
                                              )}
                                            </div>
                                            {privilege.description && (
                                              <p className="text-xs text-slate-500 truncate">
                                                {privilege.description}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <div className="flex items-center gap-2">
                                            <Label className="text-xs text-slate-500">Max Amount</Label>
                                            <Input
                                              type="number"
                                              placeholder="No limit"
                                              value={effective.maxAmount || ''}
                                              onChange={(e) =>
                                                handlePrivilegeChange(
                                                  privilege,
                                                  'maxAmount',
                                                  e.target.value ? parseFloat(e.target.value) : null
                                                )
                                              }
                                              disabled={!effective.isGranted || !privilege.isAssigned}
                                              className="w-24 h-8"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>

                    {/* Action Bar */}
                    {hasChanges && (
                      <div className="sticky bottom-0 bg-white border-t p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-600">
                            {pendingChanges.size} unsaved change(s)
                          </p>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={handleRevertChanges}>
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Revert
                            </Button>
                            <Button
                              onClick={handleSaveRolePrivileges}
                              disabled={saving}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Overrides Tab */}
        <TabsContent value="overrides" className="space-y-4">
          {/* User Search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Select User</CardTitle>
              <CardDescription>Search by name, email, or employee ID</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search users..."
                  className="pl-9"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    if (selectedUser && e.target.value !== selectedUser.name) {
                      setSelectedUser(null);
                      setUserData(null);
                    }
                  }}
                />
                {userSearchLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
                )}
              </div>

              {/* Search Results */}
              {userSearchResults.length > 0 && !selectedUser && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                  {userSearchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-slate-500">
                          {user.email} {user.employeeId && `• ${user.employeeId}`}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {user.roles.slice(0, 2).map((role) => (
                          <Badge key={role.id} variant="outline" className="text-xs">
                            {role.code}
                          </Badge>
                        ))}
                        {user.roles.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.roles.length - 2}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Privilege Details */}
          {selectedUser && userData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Current Privileges */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-emerald-600" />
                    Current Privileges
                  </CardTitle>
                  <CardDescription>
                    Privileges inherited from roles and active overrides
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 bg-emerald-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-emerald-600">
                          {userData.summary.effectiveCount}
                        </div>
                        <div className="text-xs text-slate-600">Effective</div>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {userData.summary.revokedCount}
                        </div>
                        <div className="text-xs text-slate-600">Revoked</div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {userData.summary.overrideCount}
                        </div>
                        <div className="text-xs text-slate-600">Overrides</div>
                      </div>
                    </div>

                    {/* Roles */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Assigned Roles</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedUser.roles.map((role) => (
                          <Badge key={role.id} className="bg-slate-100 text-slate-700">
                            {role.name}
                          </Badge>
                        ))}
                        {selectedUser.roles.length === 0 && (
                          <span className="text-sm text-slate-500">No roles assigned</span>
                        )}
                      </div>
                    </div>

                    {/* Privileges by Category */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-2">
                        Effective Privileges by Category
                      </h4>
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-2">
                          {Object.entries(userData.privileges.byCategory)
                            .sort((a, b) => {
                              const labelA = PRIVILEGE_CATEGORIES[a[0]] || a[0];
                              const labelB = PRIVILEGE_CATEGORIES[b[0]] || b[0];
                              return labelA.localeCompare(labelB);
                            })
                            .map(([category, privileges]) => (
                              <div key={category} className="border rounded-lg p-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium">
                                    {PRIVILEGE_CATEGORIES[category] || category}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {privileges.filter(p => p.isGranted).length}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {privileges
                                    .filter(p => p.isGranted)
                                    .slice(0, 5)
                                    .map((p) => (
                                      <Badge
                                        key={p.code}
                                        className={cn(
                                          'text-xs',
                                          p.source === 'override'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-slate-100 text-slate-600'
                                        )}
                                      >
                                        {p.code}
                                      </Badge>
                                    ))}
                                  {privileges.filter(p => p.isGranted).length > 5 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{privileges.filter(p => p.isGranted).length - 5}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Overrides */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Privilege Overrides</CardTitle>
                      <CardDescription>Manage user-specific privilege grants/revokes</CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setShowAddOverrideDialog(true)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Override
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {userDataLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                    </div>
                  ) : userData.overrides.length === 0 ? (
                    <div className="text-center py-8">
                      <UserCog className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500">No privilege overrides</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Add overrides to grant or revoke specific privileges
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Privilege</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Valid To</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userData.overrides.map((override) => (
                          <TableRow key={override.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium text-sm">{override.privilegeName}</div>
                                <code className="text-xs text-slate-500">{override.privilegeCode}</code>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  override.isGranted
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-red-100 text-red-700'
                                }
                              >
                                {override.isGranted ? 'Grant' : 'Revoke'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {override.validTo ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  {format(new Date(override.validTo), 'PP')}
                                </div>
                              ) : (
                                <span className="text-sm text-slate-500">No expiry</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-slate-600 line-clamp-1">
                                {override.reason || '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditOverrideDialog(override)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteOverride(override)}
                                  className="text-red-500 hover:text-red-700"
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
            </div>
          )}

          {/* Empty State */}
          {!selectedUser && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <UserCog className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Search for a user to manage their privilege overrides</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Override Dialog */}
      <Dialog open={showAddOverrideDialog} onOpenChange={setShowAddOverrideDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Privilege Override</DialogTitle>
            <DialogDescription>
              Grant or revoke a specific privilege for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Privilege *</Label>
              <Select
                value={overrideForm.privilegeId}
                onValueChange={(v) => setOverrideForm(prev => ({ ...prev, privilegeId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a privilege" />
                </SelectTrigger>
                <SelectContent>
                  {userData?.availablePrivileges
                    .sort((a, b) => {
                      const catA = PRIVILEGE_CATEGORIES[a.category] || a.category;
                      const catB = PRIVILEGE_CATEGORIES[b.category] || b.category;
                      return catA.localeCompare(catB);
                    })
                    .map((priv) => (
                      <SelectItem key={priv.id} value={priv.id}>
                        <div className="flex items-center gap-2">
                          <span>{priv.name}</span>
                          <code className="text-xs text-slate-500">{priv.code}</code>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={overrideForm.isGranted === true}
                    onChange={() => setOverrideForm(prev => ({ ...prev, isGranted: true }))}
                    className="text-emerald-600"
                  />
                  <span className="text-sm">Grant</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={overrideForm.isGranted === false}
                    onChange={() => setOverrideForm(prev => ({ ...prev, isGranted: false }))}
                    className="text-red-600"
                  />
                  <span className="text-sm">Revoke</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valid To (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {overrideForm.validTo ? format(overrideForm.validTo, 'PP') : 'No expiry'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={overrideForm.validTo || undefined}
                    onSelect={(date) => setOverrideForm(prev => ({ ...prev, validTo: date || null }))}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter reason for this override..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddOverrideDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddOverride} className="bg-emerald-600 hover:bg-emerald-700">
              Add Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Override Dialog */}
      <Dialog open={showEditOverrideDialog} onOpenChange={setShowEditOverrideDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Privilege Override</DialogTitle>
            <DialogDescription>
              Modify the override for {selectedOverride?.privilegeName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={overrideForm.isGranted === true}
                    onChange={() => setOverrideForm(prev => ({ ...prev, isGranted: true }))}
                    className="text-emerald-600"
                  />
                  <span className="text-sm">Grant</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={overrideForm.isGranted === false}
                    onChange={() => setOverrideForm(prev => ({ ...prev, isGranted: false }))}
                    className="text-red-600"
                  />
                  <span className="text-sm">Revoke</span>
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valid To (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {overrideForm.validTo ? format(overrideForm.validTo, 'PP') : 'No expiry'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={overrideForm.validTo || undefined}
                    onSelect={(date) => setOverrideForm(prev => ({ ...prev, validTo: date || null }))}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Enter reason for this override..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditOverrideDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditOverride} className="bg-emerald-600 hover:bg-emerald-700">
              Update Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
