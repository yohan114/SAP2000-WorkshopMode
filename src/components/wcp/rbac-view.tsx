'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { 
  Shield, 
  Plus, 
  Search, 
  Loader2, 
  Users,
  Key,
  Settings,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  level: number;
  isActive: boolean;
  createdAt: string;
  _count?: { users: number };
}

interface Privilege {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
}

interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  roles: Array<{ role: { id: string; code: string; name: string } }>;
}

const PRIVILEGE_CATEGORIES = [
  { value: 'JOB_CARDS', label: 'Job Cards' },
  { value: 'ASSETS', label: 'Assets' },
  { value: 'INVENTORY', label: 'Inventory' },
  { value: 'PROCUREMENT', label: 'Procurement' },
  { value: 'QUALITY', label: 'Quality' },
  { value: 'REPORTS', label: 'Reports' },
  { value: 'USERS', label: 'User Management' },
  { value: 'SETTINGS', label: 'Settings' },
];

export function RbacView() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('roles');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [roleForm, setRoleForm] = useState({
    code: '',
    name: '',
    description: '',
    level: 1,
    isActive: true,
  });

  const [userRoleForm, setUserRoleForm] = useState({
    userId: '',
    roleIds: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, usersRes, privRes] = await Promise.all([
        fetch('/api/roles'),
        fetch('/api/users?limit=100'),
        fetch('/api/privileges'),
      ]);

      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setRoles(data.data || data.roles || []);
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.data || data.users || []);
      }
      if (privRes.ok) {
        const data = await privRes.json();
        setPrivileges(data.data || data.privileges || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

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
        fetchData();
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

  const handleAssignRoles = async () => {
    if (!userRoleForm.userId || userRoleForm.roleIds.length === 0) {
      toast.error('Please select a user and at least one role');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/users/${userRoleForm.userId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds: userRoleForm.roleIds }),
      });

      if (response.ok) {
        toast.success('Roles assigned successfully');
        setShowUserDialog(false);
        resetUserRoleForm();
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to assign roles');
      }
    } catch (error) {
      console.error('Failed to assign roles:', error);
      toast.error('Failed to assign roles');
    } finally {
      setSubmitting(false);
    }
  };

  const resetRoleForm = () => {
    setRoleForm({
      code: '',
      name: '',
      description: '',
      level: 1,
      isActive: true,
    });
  };

  const resetUserRoleForm = () => {
    setUserRoleForm({
      userId: '',
      roleIds: [],
    });
  };

  const filteredRoles = roles.filter(role =>
    role.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPrivilegesByCategory = () => {
    const grouped: Record<string, Privilege[]> = {};
    privileges.forEach(p => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });
    return grouped;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Role-Based Access Control</h1>
          <p className="text-muted-foreground text-sm">Manage roles, permissions, and user access</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetUserRoleForm(); setShowUserDialog(true); }}>
            <Users className="h-4 w-4 mr-2" />
            Assign Roles
          </Button>
          <Button onClick={() => { resetRoleForm(); setShowRoleDialog(true); }} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            New Role
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search roles or users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="users">User Access</TabsTrigger>
          <TabsTrigger value="privileges">Privileges</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                            {role.code}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">Level {role.level}</Badge>
                        </TableCell>
                        <TableCell>{role._count?.users || 0}</TableCell>
                        <TableCell>
                          <Badge className={role.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-foreground'}>
                            {role.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" title="Edit permissions">
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Edit role">
                              <Edit className="h-4 w-4" />
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
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles?.map((r: any) => (
                              <Badge key={r.role?.id} variant="outline" className="text-xs">
                                {r.role?.name}
                              </Badge>
                            )) || <span className="text-muted-foreground text-sm">No roles assigned</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUserRoleForm({
                                userId: user.id,
                                roleIds: user.roles?.map((r: any) => r.role?.id) || [],
                              });
                              setShowUserDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit Roles
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

        <TabsContent value="privileges" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(getPrivilegesByCategory()).map(([category, privs]) => (
              <Card key={category}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-600" />
                    {PRIVILEGE_CATEGORIES.find(c => c.value === category)?.label || category}
                  </CardTitle>
                  <CardDescription>{privs.length} privileges</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {privs.map((priv) => (
                      <div key={priv.id} className="flex items-center justify-between text-sm">
                        <span>{priv.name}</span>
                        <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                          {priv.code}
                        </code>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>Define a new role with specific permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Code *</label>
              <Input
                value={roleForm.code}
                onChange={(e) => setRoleForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="e.g., WORKSHOP_MANAGER"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={roleForm.name}
                onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Workshop Manager"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={roleForm.description}
                onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Access Level</label>
              <Select
                value={String(roleForm.level)}
                onValueChange={(v) => setRoleForm(prev => ({ ...prev, level: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1 - Basic</SelectItem>
                  <SelectItem value="2">Level 2 - Standard</SelectItem>
                  <SelectItem value="3">Level 3 - Advanced</SelectItem>
                  <SelectItem value="4">Level 4 - Manager</SelectItem>
                  <SelectItem value="5">Level 5 - Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateRole} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Roles Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign User Roles</DialogTitle>
            <DialogDescription>Select roles for this user</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Select
                value={userRoleForm.userId}
                onValueChange={(v) => setUserRoleForm(prev => ({ ...prev, userId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Roles</label>
              <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                {roles.filter(r => r.isActive).map((role) => (
                  <label key={role.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={userRoleForm.roleIds.includes(role.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setUserRoleForm(prev => ({
                            ...prev,
                            roleIds: [...prev.roleIds, role.id],
                          }));
                        } else {
                          setUserRoleForm(prev => ({
                            ...prev,
                            roleIds: prev.roleIds.filter(id => id !== role.id),
                          }));
                        }
                      }}
                    />
                    <span>{role.name}</span>
                    <code className="text-xs text-muted-foreground ml-auto">{role.code}</code>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>Cancel</Button>
            <Button onClick={handleAssignRoles} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
