'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Award, 
  GraduationCap, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus, 
  Search,
  Shield,
  TrendingUp,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

// Types
interface Skill {
  id: string;
  code: string;
  name: string;
  category: string;
  level: number;
  description?: string;
  expires: boolean;
  validityDays?: number;
  certifyingBody?: string;
  isActive: boolean;
  _count?: { technicianSkills: number };
}

interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  designation?: string;
  department?: string;
}

interface TechnicianSkill {
  id: string;
  employeeId: string;
  skillId: string;
  status: string;
  awardedDate: string;
  expiryDate?: string;
  certificateUrl?: string;
  notes?: string;
  employee: Employee;
  skill: Skill;
}

interface Training {
  id: string;
  code: string;
  name: string;
  category?: string;
  validityPeriod?: number;
  isRequired: boolean;
  isActive: boolean;
  _count?: { completions: number };
}

interface TrainingCompletion {
  id: string;
  employeeId: string;
  trainingId: string;
  completedAt: string;
  expiresAt?: string;
  score?: number;
  certificateRef?: string;
  employee: Employee;
  training: Training;
}

export function LabourTrainingView() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Data states
  const [skills, setSkills] = useState<Skill[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [technicianSkills, setTechnicianSkills] = useState<TechnicianSkill[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [completions, setCompletions] = useState<TrainingCompletion[]>([]);
  
  // Dialog states
  const [isSkillDialogOpen, setIsSkillDialogOpen] = useState(false);
  const [isTechnicianSkillDialogOpen, setIsTechnicianSkillDialogOpen] = useState(false);
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  
  // Form states
  const [skillForm, setSkillForm] = useState({
    code: '',
    name: '',
    category: 'GENERAL',
    level: 1,
    description: '',
    expires: false,
    validityDays: 365,
    certifyingBody: '',
  });
  
  const [technicianSkillForm, setTechnicianSkillForm] = useState({
    employeeId: '',
    skillId: '',
    awardedDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    notes: '',
  });
  
  const [trainingForm, setTrainingForm] = useState({
    code: '',
    name: '',
    category: '',
    description: '',
    validityPeriod: 365,
    isRequired: false,
  });
  
  const [completionForm, setCompletionForm] = useState({
    employeeId: '',
    trainingId: '',
    completedAt: new Date().toISOString().split('T')[0],
    score: '',
    certificateRef: '',
    notes: '',
  });

  // Fetch data
  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/labour/skills');
      const data = await res.json();
      setSkills(data.data || []);
    } catch (error) {
      console.error('Error fetching skills:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(data.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchTechnicianSkills = async () => {
    try {
      const res = await fetch('/api/labour/technician-skills');
      const data = await res.json();
      setTechnicianSkills(data.data || []);
    } catch (error) {
      console.error('Error fetching technician skills:', error);
    }
  };

  const fetchTrainings = async () => {
    try {
      const res = await fetch('/api/labour/trainings');
      const data = await res.json();
      setTrainings(data.data || []);
    } catch (error) {
      console.error('Error fetching trainings:', error);
    }
  };

  const fetchCompletions = async () => {
    try {
      const res = await fetch('/api/labour/completions');
      const data = await res.json();
      setCompletions(data.data || []);
    } catch (error) {
      console.error('Error fetching completions:', error);
    }
  };

  useEffect(() => {
    fetchSkills();
    fetchEmployees();
    fetchTechnicianSkills();
    fetchTrainings();
    fetchCompletions();
  }, []);

  // Create handlers
  const handleCreateSkill = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/labour/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...skillForm,
          level: Number(skillForm.level),
          validityDays: Number(skillForm.validityDays),
        }),
      });
      if (res.ok) {
        setIsSkillDialogOpen(false);
        setSkillForm({
          code: '',
          name: '',
          category: 'GENERAL',
          level: 1,
          description: '',
          expires: false,
          validityDays: 365,
          certifyingBody: '',
        });
        fetchSkills();
      }
    } catch (error) {
      console.error('Error creating skill:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignSkill = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/labour/technician-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(technicianSkillForm),
      });
      if (res.ok) {
        setIsTechnicianSkillDialogOpen(false);
        setTechnicianSkillForm({
          employeeId: '',
          skillId: '',
          awardedDate: new Date().toISOString().split('T')[0],
          expiryDate: '',
          notes: '',
        });
        fetchTechnicianSkills();
      }
    } catch (error) {
      console.error('Error assigning skill:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTraining = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/labour/trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...trainingForm,
          validityPeriod: Number(trainingForm.validityPeriod),
        }),
      });
      if (res.ok) {
        setIsTrainingDialogOpen(false);
        setTrainingForm({
          code: '',
          name: '',
          category: '',
          description: '',
          validityPeriod: 365,
          isRequired: false,
        });
        fetchTrainings();
      }
    } catch (error) {
      console.error('Error creating training:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCompletion = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/labour/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...completionForm,
          score: completionForm.score ? Number(completionForm.score) : undefined,
        }),
      });
      if (res.ok) {
        setIsCompletionDialogOpen(false);
        setCompletionForm({
          employeeId: '',
          trainingId: '',
          completedAt: new Date().toISOString().split('T')[0],
          score: '',
          certificateRef: '',
          notes: '',
        });
        fetchCompletions();
      }
    } catch (error) {
      console.error('Error creating completion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const expiringSkills = technicianSkills.filter(
    ts => ts.expiryDate && new Date(ts.expiryDate) > now && new Date(ts.expiryDate) <= thirtyDaysFromNow
  );
  
  const expiredSkills = technicianSkills.filter(
    ts => ts.status === 'EXPIRED' || (ts.expiryDate && new Date(ts.expiryDate) <= now)
  );

  const expiringCompletions = completions.filter(
    c => c.expiresAt && new Date(c.expiresAt) > now && new Date(c.expiresAt) <= thirtyDaysFromNow
  );

  // Level badge color
  const getLevelBadge = (level: number) => {
    const colors = {
      1: 'bg-gray-100 text-gray-700',
      2: 'bg-blue-100 text-blue-700',
      3: 'bg-purple-100 text-purple-700',
      4: 'bg-amber-100 text-amber-700',
    };
    const labels = { 1: 'Basic', 2: 'Intermediate', 3: 'Advanced', 4: 'Expert' };
    return <Badge className={colors[level as keyof typeof colors]}>{labels[level as keyof typeof labels]}</Badge>;
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-emerald-100 text-emerald-700',
      EXPIRED: 'bg-red-100 text-red-700',
      SUSPENDED: 'bg-yellow-100 text-yellow-700',
    };
    return <Badge className={styles[status] || 'bg-gray-100 text-gray-700'}>{status}</Badge>;
  };

  // Category badge
  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      MECHANICAL: 'bg-orange-100 text-orange-700',
      ELECTRICAL: 'bg-yellow-100 text-yellow-700',
      HYDRAULIC: 'bg-blue-100 text-blue-700',
      WELDING: 'bg-red-100 text-red-700',
      BODY: 'bg-purple-100 text-purple-700',
      GENERAL: 'bg-gray-100 text-gray-700',
    };
    return <Badge variant="outline" className={colors[category] || 'bg-gray-100 text-gray-700'}>{category}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Tab */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 h-12">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Skills
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Training
          </TabsTrigger>
          <TabsTrigger value="completions" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Completions
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Content */}
        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
                <Award className="h-5 w-5 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{skills.length}</div>
                <p className="text-xs text-muted-foreground">
                  {skills.filter(s => s.isActive).length} active
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Skill Assignments</CardTitle>
                <Users className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{technicianSkills.length}</div>
                <p className="text-xs text-muted-foreground">
                  {technicianSkills.filter(ts => ts.status === 'ACTIVE').length} active
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Training Courses</CardTitle>
                <GraduationCap className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{trainings.length}</div>
                <p className="text-xs text-muted-foreground">
                  {trainings.filter(t => t.isRequired).length} required
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Completions</CardTitle>
                <CheckCircle className="h-5 w-5 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completions.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total training completions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Expiring Skills Alert */}
            <Card className={expiringSkills.length > 0 ? 'border-yellow-300' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <AlertTriangle className="h-5 w-5" />
                  Expiring Soon ({expiringSkills.length})
                </CardTitle>
                <CardDescription>Skills expiring within 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                {expiringSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No skills expiring soon</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {expiringSkills.slice(0, 5).map(ts => (
                      <div key={ts.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{ts.employee.name}</p>
                          <p className="text-xs text-muted-foreground">{ts.skill.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-yellow-600">
                            {ts.expiryDate ? new Date(ts.expiryDate).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expired Skills Alert */}
            <Card className={expiredSkills.length > 0 ? 'border-red-300' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Expired Skills ({expiredSkills.length})
                </CardTitle>
                <CardDescription>Skills that have expired</CardDescription>
              </CardHeader>
              <CardContent>
                {expiredSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No expired skills</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {expiredSkills.slice(0, 5).map(ts => (
                      <div key={ts.id} className="flex items-center justify-between p-2 bg-red-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{ts.employee.name}</p>
                          <p className="text-xs text-muted-foreground">{ts.skill.name}</p>
                        </div>
                        <Badge className="bg-red-100 text-red-700">Expired</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Skills by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Skills by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {['MECHANICAL', 'ELECTRICAL', 'HYDRAULIC', 'WELDING', 'BODY', 'GENERAL'].map(cat => {
                  const count = skills.filter(s => s.category === cat).length;
                  return (
                    <div key={cat} className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-foreground">{count}</p>
                      <p className="text-xs text-muted-foreground">{cat}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <Dialog open={isSkillDialogOpen} onOpenChange={setIsSkillDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Skill
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Skill</DialogTitle>
                  <DialogDescription>Add a new skill definition to the system</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Code</Label>
                      <Input 
                        value={skillForm.code}
                        onChange={(e) => setSkillForm({...skillForm, code: e.target.value})}
                        placeholder="e.g., HVAC-L2"
                      />
                    </div>
                    <div>
                      <Label>Name</Label>
                      <Input 
                        value={skillForm.name}
                        onChange={(e) => setSkillForm({...skillForm, name: e.target.value})}
                        placeholder="e.g., HVAC Technician Level 2"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select value={skillForm.category} onValueChange={(v) => setSkillForm({...skillForm, category: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MECHANICAL">Mechanical</SelectItem>
                          <SelectItem value="ELECTRICAL">Electrical</SelectItem>
                          <SelectItem value="HYDRAULIC">Hydraulic</SelectItem>
                          <SelectItem value="WELDING">Welding</SelectItem>
                          <SelectItem value="BODY">Body</SelectItem>
                          <SelectItem value="GENERAL">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Level</Label>
                      <Select value={skillForm.level.toString()} onValueChange={(v) => setSkillForm({...skillForm, level: Number(v)})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Basic</SelectItem>
                          <SelectItem value="2">2 - Intermediate</SelectItem>
                          <SelectItem value="3">3 - Advanced</SelectItem>
                          <SelectItem value="4">4 - Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea 
                      value={skillForm.description}
                      onChange={(e) => setSkillForm({...skillForm, description: e.target.value})}
                      placeholder="Skill description..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="expires"
                      checked={skillForm.expires}
                      onChange={(e) => setSkillForm({...skillForm, expires: e.target.checked})}
                    />
                    <Label htmlFor="expires">This skill expires</Label>
                  </div>
                  {skillForm.expires && (
                    <div>
                      <Label>Validity Period (days)</Label>
                      <Input 
                        type="number"
                        value={skillForm.validityDays}
                        onChange={(e) => setSkillForm({...skillForm, validityDays: Number(e.target.value)})}
                      />
                    </div>
                  )}
                  <div>
                    <Label>Certifying Body</Label>
                    <Input 
                      value={skillForm.certifyingBody}
                      onChange={(e) => setSkillForm({...skillForm, certifyingBody: e.target.value})}
                      placeholder="e.g., OEM Training Centre"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsSkillDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateSkill} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Skill
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skills
                    .filter(s => 
                      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      s.name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(skill => (
                      <TableRow key={skill.id}>
                        <TableCell className="font-mono font-medium">{skill.code}</TableCell>
                        <TableCell>{skill.name}</TableCell>
                        <TableCell>{getCategoryBadge(skill.category)}</TableCell>
                        <TableCell>{getLevelBadge(skill.level)}</TableCell>
                        <TableCell>
                          {skill.expires ? (
                            <span className="text-sm text-muted-foreground">{skill.validityDays} days</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">No</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{skill._count?.technicianSkills || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={skill.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                            {skill.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select defaultValue="all">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isTechnicianSkillDialogOpen} onOpenChange={setIsTechnicianSkillDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Skill
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Skill to Technician</DialogTitle>
                  <DialogDescription>Assign a skill to an employee</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Employee</Label>
                    <Select value={technicianSkillForm.employeeId} onValueChange={(v) => setTechnicianSkillForm({...technicianSkillForm, employeeId: v})}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.employeeNumber} - {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Skill</Label>
                    <Select value={technicianSkillForm.skillId} onValueChange={(v) => setTechnicianSkillForm({...technicianSkillForm, skillId: v})}>
                      <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
                      <SelectContent>
                        {skills.filter(s => s.isActive).map(skill => (
                          <SelectItem key={skill.id} value={skill.id}>
                            {skill.code} - {skill.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Awarded Date</Label>
                      <Input 
                        type="date"
                        value={technicianSkillForm.awardedDate}
                        onChange={(e) => setTechnicianSkillForm({...technicianSkillForm, awardedDate: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Expiry Date (Optional)</Label>
                      <Input 
                        type="date"
                        value={technicianSkillForm.expiryDate}
                        onChange={(e) => setTechnicianSkillForm({...technicianSkillForm, expiryDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea 
                      value={technicianSkillForm.notes}
                      onChange={(e) => setTechnicianSkillForm({...technicianSkillForm, notes: e.target.value})}
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTechnicianSkillDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAssignSkill} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Assign Skill
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Skill</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Awarded Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {technicianSkills.map(ts => {
                    const isExpiring = ts.expiryDate && new Date(ts.expiryDate) <= thirtyDaysFromNow && new Date(ts.expiryDate) > now;
                    const isExpired = ts.expiryDate && new Date(ts.expiryDate) <= now;
                    
                    return (
                      <TableRow key={ts.id} className={isExpired ? 'bg-red-50' : isExpiring ? 'bg-yellow-50' : ''}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ts.employee.name}</p>
                            <p className="text-xs text-muted-foreground">{ts.employee.employeeNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ts.skill.name}</p>
                            <p className="text-xs text-muted-foreground">{ts.skill.code}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getCategoryBadge(ts.skill.category)}</TableCell>
                        <TableCell>{new Date(ts.awardedDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {ts.expiryDate ? (
                            <span className={isExpired ? 'text-red-600 font-medium' : isExpiring ? 'text-yellow-600 font-medium' : ''}>
                              {new Date(ts.expiryDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isExpired && ts.status === 'ACTIVE' ? (
                            <Badge className="bg-red-100 text-red-700">Expired</Badge>
                          ) : isExpiring ? (
                            <Badge className="bg-yellow-100 text-yellow-700">Expiring Soon</Badge>
                          ) : (
                            getStatusBadge(ts.status)
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search training..."
                className="w-64"
              />
            </div>
            <Dialog open={isTrainingDialogOpen} onOpenChange={setIsTrainingDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Training
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Training Course</DialogTitle>
                  <DialogDescription>Add a new training course to the system</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Code</Label>
                      <Input 
                        value={trainingForm.code}
                        onChange={(e) => setTrainingForm({...trainingForm, code: e.target.value})}
                        placeholder="e.g., SAFETY-01"
                      />
                    </div>
                    <div>
                      <Label>Name</Label>
                      <Input 
                        value={trainingForm.name}
                        onChange={(e) => setTrainingForm({...trainingForm, name: e.target.value})}
                        placeholder="e.g., Workplace Safety Training"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Input 
                        value={trainingForm.category}
                        onChange={(e) => setTrainingForm({...trainingForm, category: e.target.value})}
                        placeholder="e.g., Safety, Technical, etc."
                      />
                    </div>
                    <div>
                      <Label>Validity Period (days)</Label>
                      <Input 
                        type="number"
                        value={trainingForm.validityPeriod}
                        onChange={(e) => setTrainingForm({...trainingForm, validityPeriod: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea 
                      value={trainingForm.description}
                      onChange={(e) => setTrainingForm({...trainingForm, description: e.target.value})}
                      placeholder="Training description..."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="required"
                      checked={trainingForm.isRequired}
                      onChange={(e) => setTrainingForm({...trainingForm, isRequired: e.target.checked})}
                    />
                    <Label htmlFor="required">Required training for all employees</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTrainingDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateTraining} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Training
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Completions</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainings.map(training => (
                    <TableRow key={training.id}>
                      <TableCell className="font-mono font-medium">{training.code}</TableCell>
                      <TableCell>{training.name}</TableCell>
                      <TableCell>
                        {training.category && <Badge variant="outline">{training.category}</Badge>}
                      </TableCell>
                      <TableCell>
                        {training.validityPeriod ? `${training.validityPeriod} days` : 'No expiry'}
                      </TableCell>
                      <TableCell>
                        {training.isRequired ? (
                          <Badge className="bg-red-100 text-red-700">Required</Badge>
                        ) : (
                          <Badge variant="outline">Optional</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{training._count?.completions || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={training.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                          {training.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completions Tab */}
        <TabsContent value="completions" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select defaultValue="all">
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by training" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Training</SelectItem>
                  {trainings.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isCompletionDialogOpen} onOpenChange={setIsCompletionDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Completion
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Training Completion</DialogTitle>
                  <DialogDescription>Record a training completion for an employee</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Employee</Label>
                    <Select value={completionForm.employeeId} onValueChange={(v) => setCompletionForm({...completionForm, employeeId: v})}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.employeeNumber} - {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Training</Label>
                    <Select value={completionForm.trainingId} onValueChange={(v) => setCompletionForm({...completionForm, trainingId: v})}>
                      <SelectTrigger><SelectValue placeholder="Select training" /></SelectTrigger>
                      <SelectContent>
                        {trainings.filter(t => t.isActive).map(training => (
                          <SelectItem key={training.id} value={training.id}>
                            {training.code} - {training.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Completion Date</Label>
                      <Input 
                        type="date"
                        value={completionForm.completedAt}
                        onChange={(e) => setCompletionForm({...completionForm, completedAt: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Score (Optional)</Label>
                      <Input 
                        type="number"
                        value={completionForm.score}
                        onChange={(e) => setCompletionForm({...completionForm, score: e.target.value})}
                        placeholder="e.g., 85"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Certificate Reference</Label>
                    <Input 
                      value={completionForm.certificateRef}
                      onChange={(e) => setCompletionForm({...completionForm, certificateRef: e.target.value})}
                      placeholder="e.g., CERT-2024-001"
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea 
                      value={completionForm.notes}
                      onChange={(e) => setCompletionForm({...completionForm, notes: e.target.value})}
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCompletionDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateCompletion} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Record Completion
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Training</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Certificate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completions.map(c => {
                    const isExpiring = c.expiresAt && new Date(c.expiresAt) <= thirtyDaysFromNow && new Date(c.expiresAt) > now;
                    const isExpired = c.expiresAt && new Date(c.expiresAt) <= now;
                    
                    return (
                      <TableRow key={c.id} className={isExpired ? 'bg-red-50' : isExpiring ? 'bg-yellow-50' : ''}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{c.employee.name}</p>
                            <p className="text-xs text-muted-foreground">{c.employee.employeeNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{c.training.name}</p>
                            <p className="text-xs text-muted-foreground">{c.training.code}</p>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(c.completedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {c.score !== null && c.score !== undefined ? (
                            <Badge variant="outline">{c.score}%</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.expiresAt ? (
                            <span className={isExpired ? 'text-red-600 font-medium' : isExpiring ? 'text-yellow-600 font-medium' : ''}>
                              {new Date(c.expiresAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.certificateRef ? (
                            <Badge variant="outline" className="font-mono">{c.certificateRef}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
