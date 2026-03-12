'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Progress } from '@/components/ui/progress';
import { 
  Fuel, Plus, Search, Loader2, AlertTriangle, Droplet, Gauge, 
  TrendingUp, TrendingDown, MoreHorizontal, Eye, Edit, Trash2,
  AlertCircle, CheckCircle, Clock, Truck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Types
interface FuelTank {
  id: string;
  tankNumber: string;
  name: string;
  fuelType: string;
  capacity: number;
  currentLevel: number;
  location: string | null;
  isActive: boolean;
  readings?: FuelReading[];
  issues?: FuelIssue[];
  avgDailyConsumption?: number;
  daysUntilEmpty?: number;
}

interface FuelIssue {
  id: string;
  issueNumber: string;
  tankId: string;
  tank?: FuelTank;
  assetId: string | null;
  asset?: { id: string; assetNumber: string; name: string };
  jobCardId: string | null;
  jobCard?: { id: string; jobCardNumber: string };
  issuedToId: string;
  issuedTo?: { id: string; name: string; employeeNumber: string };
  quantity: number;
  previousMeterReading: number | null;
  currentMeterReading: number | null;
  consumptionNorm: number | null;
  isAbnormal: boolean;
  abnormalReason: string | null;
  issuedAt: string;
  notes: string | null;
  createdAt: string;
}

interface FuelReading {
  id: string;
  tankId: string;
  readingValue: number;
  readingAt: string;
  readingBy: string | null;
  notes: string | null;
  consumption?: number;
  consumptionPerDay?: number;
}

interface AbnormalDetection {
  id: string;
  detectionType: string;
  referenceType: string;
  referenceId: string;
  severity: string;
  description: string;
  detectedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  status: string;
  fuelIssue?: FuelIssue;
}

interface Asset {
  id: string;
  assetNumber: string;
  name: string;
}

interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
}

const FUEL_TYPES = ['DIESEL', 'PETROL', 'OIL', 'KEROSENE', 'LUBRICANT'];
const FUEL_TYPE_COLORS: Record<string, string> = {
  DIESEL: 'bg-amber-100 text-amber-700',
  PETROL: 'bg-red-100 text-red-700',
  OIL: 'bg-yellow-100 text-yellow-700',
  KEROSENE: 'bg-blue-100 text-blue-700',
  LUBRICANT: 'bg-purple-100 text-purple-700',
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export function FuelControlView() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data states
  const [tanks, setTanks] = useState<FuelTank[]>([]);
  const [issues, setIssues] = useState<FuelIssue[]>([]);
  const [readings, setReadings] = useState<FuelReading[]>([]);
  const [abnormals, setAbnormals] = useState<AbnormalDetection[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Search and filter
  const [search, setSearch] = useState('');
  const [tankFilter, setTankFilter] = useState('');
  
  // Dialog states
  const [isTankDialogOpen, setIsTankDialogOpen] = useState(false);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [isReadingDialogOpen, setIsReadingDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedTank, setSelectedTank] = useState<FuelTank | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<FuelIssue | null>(null);
  const [selectedAbnormal, setSelectedAbnormal] = useState<AbnormalDetection | null>(null);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  
  // Form states
  const [tankForm, setTankForm] = useState({
    tankNumber: '',
    name: '',
    fuelType: 'DIESEL',
    capacity: '',
    currentLevel: '',
    location: '',
  });
  
  const [issueForm, setIssueForm] = useState({
    tankId: '',
    assetId: '',
    jobCardId: '',
    issuedToId: '',
    quantity: '',
    previousMeterReading: '',
    currentMeterReading: '',
    consumptionNorm: '',
    notes: '',
  });
  
  const [readingForm, setReadingForm] = useState({
    tankId: '',
    readingValue: '',
    notes: '',
  });
  
  const [resolveForm, setResolveForm] = useState({
    resolutionNotes: '',
  });

  useEffect(() => {
    fetchTanks();
    fetchIssues();
    fetchAbnormals();
    fetchAssets();
    fetchEmployees();
  }, []);

  const fetchTanks = async () => {
    try {
      const res = await fetch('/api/fuel/tanks?limit=50');
      const data = await res.json();
      if (data.success) {
        setTanks(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch tanks:', error);
    }
  };

  const fetchIssues = async () => {
    try {
      const res = await fetch('/api/fuel/issues?limit=50');
      const data = await res.json();
      if (data.success) {
        setIssues(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAbnormals = async () => {
    try {
      const res = await fetch('/api/fuel/abnormal?limit=50');
      const data = await res.json();
      if (data.success) {
        setAbnormals(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch abnormals:', error);
    }
  };

  const fetchReadings = async (tankId: string) => {
    try {
      const res = await fetch(`/api/fuel/readings?tankId=${tankId}&limit=20`);
      const data = await res.json();
      if (data.success) {
        setReadings(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch readings:', error);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets?limit=100');
      const data = await res.json();
      if (data.success) {
        setAssets(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
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

  // Tank CRUD
  const handleCreateTank = async () => {
    if (!tankForm.tankNumber || !tankForm.name || !tankForm.capacity) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/fuel/tanks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tankNumber: tankForm.tankNumber,
          name: tankForm.name,
          fuelType: tankForm.fuelType,
          capacity: parseFloat(tankForm.capacity),
          currentLevel: parseFloat(tankForm.currentLevel) || 0,
          location: tankForm.location || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Fuel tank created successfully' });
        setIsTankDialogOpen(false);
        setTankForm({ tankNumber: '', name: '', fuelType: 'DIESEL', capacity: '', currentLevel: '', location: '' });
        fetchTanks();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create tank', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Create tank error:', error);
      toast({ title: 'Error', description: 'Failed to create tank', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTank = async (tankId: string) => {
    if (!confirm('Are you sure you want to delete this tank?')) return;

    try {
      const res = await fetch(`/api/fuel/tanks/${tankId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Tank deleted successfully' });
        fetchTanks();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete tank', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Delete tank error:', error);
      toast({ title: 'Error', description: 'Failed to delete tank', variant: 'destructive' });
    }
  };

  // Issue CRUD
  const handleCreateIssue = async () => {
    if (!issueForm.tankId || !issueForm.issuedToId || !issueForm.quantity) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/fuel/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tankId: issueForm.tankId,
          assetId: issueForm.assetId || undefined,
          jobCardId: issueForm.jobCardId || undefined,
          issuedToId: issueForm.issuedToId,
          quantity: parseFloat(issueForm.quantity),
          previousMeterReading: issueForm.previousMeterReading ? parseFloat(issueForm.previousMeterReading) : undefined,
          currentMeterReading: issueForm.currentMeterReading ? parseFloat(issueForm.currentMeterReading) : undefined,
          consumptionNorm: issueForm.consumptionNorm ? parseFloat(issueForm.consumptionNorm) : undefined,
          notes: issueForm.notes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ 
          title: data.data.isAbnormal ? 'Warning: Abnormal Consumption Detected' : 'Success', 
          description: data.data.isAbnormal 
            ? `Issue created but flagged as abnormal: ${data.data.abnormalReason}` 
            : 'Fuel issue created successfully',
          variant: data.data.isAbnormal ? 'destructive' : 'default'
        });
        setIsIssueDialogOpen(false);
        setIssueForm({ tankId: '', assetId: '', jobCardId: '', issuedToId: '', quantity: '', previousMeterReading: '', currentMeterReading: '', consumptionNorm: '', notes: '' });
        fetchIssues();
        fetchTanks();
        fetchAbnormals();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to create issue', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Create issue error:', error);
      toast({ title: 'Error', description: 'Failed to create issue', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Reading CRUD
  const handleCreateReading = async () => {
    if (!readingForm.tankId || !readingForm.readingValue) {
      toast({ title: 'Validation Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/fuel/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tankId: readingForm.tankId,
          readingValue: parseFloat(readingForm.readingValue),
          notes: readingForm.notes || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Reading recorded successfully' });
        setIsReadingDialogOpen(false);
        setReadingForm({ tankId: '', readingValue: '', notes: '' });
        fetchTanks();
        if (selectedTank) {
          fetchReadings(selectedTank.id);
        }
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to record reading', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Create reading error:', error);
      toast({ title: 'Error', description: 'Failed to record reading', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Resolve abnormal
  const handleResolveAbnormal = async () => {
    if (!selectedAbnormal) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/fuel/abnormal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAbnormal.id,
          action: 'resolve',
          resolutionNotes: resolveForm.resolutionNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast({ title: 'Success', description: 'Abnormal detection resolved' });
        setIsResolveDialogOpen(false);
        setSelectedAbnormal(null);
        setResolveForm({ resolutionNotes: '' });
        fetchAbnormals();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to resolve', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Resolve abnormal error:', error);
      toast({ title: 'Error', description: 'Failed to resolve abnormal detection', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Stats calculations
  const totalCapacity = tanks.reduce((sum, t) => sum + (t.capacity || 0), 0);
  const totalCurrentLevel = tanks.reduce((sum, t) => sum + (t.currentLevel || 0), 0);
  const overallFillPercent = totalCapacity > 0 ? (totalCurrentLevel / totalCapacity) * 100 : 0;
  const openAbnormalsCount = abnormals.filter(a => a.status === 'OPEN').length;
  const todayIssuesCount = issues.filter(i => {
    const issueDate = new Date(i.issuedAt);
    const today = new Date();
    return issueDate.toDateString() === today.toDateString();
  }).length;
  const abnormalIssuesCount = issues.filter(i => i.isAbnormal).length;

  const getFillPercent = (tank: FuelTank) => {
    return tank.capacity > 0 ? (tank.currentLevel / tank.capacity) * 100 : 0;
  };

  const getFillStatus = (percent: number) => {
    if (percent < 20) return { color: 'text-red-500', bg: 'bg-red-500', label: 'Critical' };
    if (percent < 40) return { color: 'text-amber-500', bg: 'bg-amber-500', label: 'Low' };
    return { color: 'text-emerald-500', bg: 'bg-emerald-500', label: 'Good' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Fuel Control</h2>
          <p className="text-slate-500">Manage fuel tanks, issues, and consumption tracking</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isReadingDialogOpen} onOpenChange={setIsReadingDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                <Gauge className="h-4 w-4 mr-2" />
                Record Reading
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Record Tank Reading</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Tank *</Label>
                  <Select value={readingForm.tankId} onValueChange={(v) => setReadingForm({ ...readingForm, tankId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select tank" /></SelectTrigger>
                    <SelectContent>
                      {tanks.filter(t => t.isActive).map((tank) => (
                        <SelectItem key={tank.id} value={tank.id}>
                          {tank.tankNumber} - {tank.name} ({tank.currentLevel?.toFixed(0) || 0}/{tank.capacity?.toFixed(0) || 0} L)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Current Level (Liters) *</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={readingForm.readingValue}
                    onChange={(e) => setReadingForm({ ...readingForm, readingValue: e.target.value })}
                    placeholder="Enter current level"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea 
                    value={readingForm.notes}
                    onChange={(e) => setReadingForm({ ...readingForm, notes: e.target.value })}
                    placeholder="Optional notes"
                    rows={2}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsReadingDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateReading} className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Record Reading
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Droplet className="h-4 w-4 mr-2" />
                Issue Fuel
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Issue Fuel</DialogTitle>
                <DialogDescription>Record fuel issue with automatic abnormal detection</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tank *</Label>
                    <Select value={issueForm.tankId} onValueChange={(v) => setIssueForm({ ...issueForm, tankId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select tank" /></SelectTrigger>
                      <SelectContent>
                        {tanks.filter(t => t.isActive).map((tank) => (
                          <SelectItem key={tank.id} value={tank.id}>
                            {tank.tankNumber} - {tank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity (Liters) *</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={issueForm.quantity}
                      onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })}
                      placeholder="Enter quantity"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Asset (Vehicle/Equipment)</Label>
                    <Select value={issueForm.assetId} onValueChange={(v) => setIssueForm({ ...issueForm, assetId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {assets.map((asset) => (
                          <SelectItem key={asset.id} value={asset.id}>
                            {asset.assetNumber} - {asset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Issued To *</Label>
                    <Select value={issueForm.issuedToId} onValueChange={(v) => setIssueForm({ ...issueForm, issuedToId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} ({emp.employeeNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <Label className="text-sm text-slate-500">Meter Readings (for consumption tracking)</Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Previous</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={issueForm.previousMeterReading}
                        onChange={(e) => setIssueForm({ ...issueForm, previousMeterReading: e.target.value })}
                        placeholder="Previous"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Current</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={issueForm.currentMeterReading}
                        onChange={(e) => setIssueForm({ ...issueForm, currentMeterReading: e.target.value })}
                        placeholder="Current"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Norm (L/100km)</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={issueForm.consumptionNorm}
                        onChange={(e) => setIssueForm({ ...issueForm, consumptionNorm: e.target.value })}
                        placeholder="Norm"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea 
                    value={issueForm.notes}
                    onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
                    placeholder="Optional notes"
                    rows={2}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsIssueDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateIssue} className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Issue Fuel
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isTankDialogOpen} onOpenChange={setIsTankDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Tank
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Fuel Tank</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tank Number *</Label>
                    <Input 
                      value={tankForm.tankNumber}
                      onChange={(e) => setTankForm({ ...tankForm, tankNumber: e.target.value })}
                      placeholder="FT-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fuel Type *</Label>
                    <Select value={tankForm.fuelType} onValueChange={(v) => setTankForm({ ...tankForm, fuelType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FUEL_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input 
                    value={tankForm.name}
                    onChange={(e) => setTankForm({ ...tankForm, name: e.target.value })}
                    placeholder="Main Storage Tank"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Capacity (Liters) *</Label>
                    <Input 
                      type="number"
                      value={tankForm.capacity}
                      onChange={(e) => setTankForm({ ...tankForm, capacity: e.target.value })}
                      placeholder="10000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Level (L)</Label>
                    <Input 
                      type="number"
                      value={tankForm.currentLevel}
                      onChange={(e) => setTankForm({ ...tankForm, currentLevel: e.target.value })}
                      placeholder="5000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input 
                    value={tankForm.location}
                    onChange={(e) => setTankForm({ ...tankForm, location: e.target.value })}
                    placeholder="Workshop Bay 1"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTankDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateTank} className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Tank
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Fuel className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Tanks</p>
                <p className="text-xl font-bold">{tanks.filter(t => t.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Droplet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Fuel</p>
                <p className="text-xl font-bold">{totalCurrentLevel.toFixed(0)} L</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Gauge className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Fill Level</p>
                <p className="text-xl font-bold">{overallFillPercent.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Truck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Today Issues</p>
                <p className="text-xl font-bold">{todayIssuesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${openAbnormalsCount > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
                <AlertTriangle className={`h-5 w-5 ${openAbnormalsCount > 0 ? 'text-red-600' : 'text-slate-600'}`} />
              </div>
              <div>
                <p className="text-sm text-slate-500">Open Alerts</p>
                <p className="text-xl font-bold">{openAbnormalsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Fuel className="h-4 w-4" />Tanks Overview
          </TabsTrigger>
          <TabsTrigger value="issues" className="flex items-center gap-2">
            <Droplet className="h-4 w-4" />Fuel Issues
          </TabsTrigger>
          <TabsTrigger value="readings" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />Readings
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Abnormal Alerts
            {openAbnormalsCount > 0 && (
              <Badge variant="destructive" className="ml-1">{openAbnormalsCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Dashboard / Tanks Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : tanks.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Fuel className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No fuel tanks found. Add your first tank to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {tanks.filter(t => t.isActive).map((tank) => {
                    const fillPercent = getFillPercent(tank);
                    const status = getFillStatus(fillPercent);
                    return (
                      <Card key={tank.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{tank.name}</CardTitle>
                              <p className="text-sm text-slate-500">{tank.tankNumber}</p>
                            </div>
                            <Badge className={FUEL_TYPE_COLORS[tank.fuelType] || ''}>
                              {tank.fuelType}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-slate-500">Level</span>
                                <span className={status.color}>
                                  {tank.currentLevel?.toFixed(0) || 0} / {tank.capacity?.toFixed(0) || 0} L
                                </span>
                              </div>
                              <Progress value={fillPercent} className="h-2" />
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Fill</span>
                              <span className={status.color}>{fillPercent.toFixed(1)}%</span>
                            </div>
                            {tank.location && (
                              <p className="text-xs text-slate-500">📍 {tank.location}</p>
                            )}
                            <div className="flex justify-end gap-2 pt-2 border-t">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedTank(tank);
                                  fetchReadings(tank.id);
                                  setActiveTab('readings');
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />View
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteTank(tank.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Fuel Issues</CardTitle>
                <div className="flex gap-2">
                  <Select value={tankFilter} onValueChange={setTankFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Tanks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Tanks</SelectItem>
                      {tanks.map((tank) => (
                        <SelectItem key={tank.id} value={tank.id}>{tank.tankNumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : issues.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Droplet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No fuel issues recorded</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Issue #</TableHead>
                        <TableHead>Tank</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Issued To</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {issues
                        .filter(i => !tankFilter || i.tankId === tankFilter)
                        .map((issue) => (
                          <TableRow key={issue.id}>
                            <TableCell className="font-medium">{issue.issueNumber}</TableCell>
                            <TableCell>
                              <Badge className={FUEL_TYPE_COLORS[issue.tank?.fuelType || ''] || ''}>
                                {issue.tank?.tankNumber}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {issue.asset ? (
                                <div>
                                  <div className="font-medium">{issue.asset.assetNumber}</div>
                                  <div className="text-xs text-slate-500">{issue.asset.name}</div>
                                </div>
                              ) : <span className="text-slate-400">-</span>}
                            </TableCell>
                            <TableCell>{issue.quantity} L</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{issue.issuedTo?.name}</div>
                                <div className="text-xs text-slate-500">{issue.issuedTo?.employeeNumber}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(issue.issuedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {issue.isAbnormal ? (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />Abnormal
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Normal</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setSelectedIssue(issue); setIsDetailDialogOpen(true); }}>
                                    <Eye className="h-4 w-4 mr-2" />View Details
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
        </TabsContent>

        {/* Readings Tab */}
        <TabsContent value="readings" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">
                  Tank Readings {selectedTank && `- ${selectedTank.name}`}
                </CardTitle>
                <Select 
                  value={selectedTank?.id || ''} 
                  onValueChange={(v) => {
                    const tank = tanks.find(t => t.id === v);
                    setSelectedTank(tank || null);
                    if (v) fetchReadings(v);
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select Tank" />
                  </SelectTrigger>
                  <SelectContent>
                    {tanks.filter(t => t.isActive).map((tank) => (
                      <SelectItem key={tank.id} value={tank.id}>
                        {tank.tankNumber} - {tank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!selectedTank ? (
                <div className="text-center py-12 text-slate-500">
                  <Gauge className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a tank to view readings</p>
                </div>
              ) : readings.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Gauge className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No readings recorded for this tank</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Reading (L)</TableHead>
                        <TableHead>Change</TableHead>
                        <TableHead>Daily Rate</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {readings.map((reading, index) => (
                        <TableRow key={reading.id}>
                          <TableCell>
                            {new Date(reading.readingAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-medium">{reading.readingValue.toFixed(2)}</TableCell>
                          <TableCell>
                            {reading.consumption !== undefined && reading.consumption !== null ? (
                              <span className={reading.consumption > 0 ? 'text-red-600' : 'text-emerald-600'}>
                                {reading.consumption > 0 ? '-' : '+'}{Math.abs(reading.consumption).toFixed(2)} L
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {reading.consumptionPerDay ? `${reading.consumptionPerDay.toFixed(2)} L/day` : '-'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {reading.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Abnormal Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {abnormals.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                  <p>No abnormal detections - All consumption is within normal range</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Detected At</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {abnormals.map((abnormal) => (
                        <TableRow key={abnormal.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <AlertCircle className={`h-4 w-4 ${abnormal.status === 'OPEN' ? 'text-red-500' : 'text-slate-400'}`} />
                              {abnormal.detectionType.replace(/_/g, ' ')}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px]">{abnormal.description}</TableCell>
                          <TableCell>
                            <Badge className={SEVERITY_COLORS[abnormal.severity] || ''}>
                              {abnormal.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(abnormal.detectedAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {abnormal.status === 'OPEN' ? (
                              <Badge variant="destructive">Open</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Resolved</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {abnormal.status === 'OPEN' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedAbnormal(abnormal);
                                  setIsResolveDialogOpen(true);
                                }}
                              >
                                Resolve
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Issue Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Fuel Issue Details
              {selectedIssue?.isAbnormal && (
                <Badge variant="destructive">Abnormal</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedIssue && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Issue Number</p>
                  <p className="font-medium">{selectedIssue.issueNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Tank</p>
                  <p className="font-medium">{selectedIssue.tank?.name} ({selectedIssue.tank?.tankNumber})</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Quantity</p>
                  <p className="font-medium">{selectedIssue.quantity} Liters</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Issued To</p>
                  <p className="font-medium">{selectedIssue.issuedTo?.name}</p>
                </div>
                {selectedIssue.asset && (
                  <div>
                    <p className="text-sm text-slate-500">Asset</p>
                    <p className="font-medium">{selectedIssue.asset.assetNumber} - {selectedIssue.asset.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium">{new Date(selectedIssue.issuedAt).toLocaleString()}</p>
                </div>
              </div>
              {selectedIssue.isAbnormal && selectedIssue.abnormalReason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-700">Abnormal Reason:</p>
                  <p className="text-sm text-red-600">{selectedIssue.abnormalReason}</p>
                </div>
              )}
              {(selectedIssue.previousMeterReading !== null || selectedIssue.currentMeterReading !== null) && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Meter Readings</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Previous</p>
                      <p className="font-medium">{selectedIssue.previousMeterReading?.toLocaleString() || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Current</p>
                      <p className="font-medium">{selectedIssue.currentMeterReading?.toLocaleString() || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Norm</p>
                      <p className="font-medium">{selectedIssue.consumptionNorm || '-'}</p>
                    </div>
                  </div>
                </div>
              )}
              {selectedIssue.notes && (
                <div>
                  <p className="text-sm text-slate-500">Notes</p>
                  <p className="font-medium">{selectedIssue.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Abnormal Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Abnormal Detection</DialogTitle>
            <DialogDescription>
              Provide resolution notes for this abnormal fuel consumption detection.
            </DialogDescription>
          </DialogHeader>
          {selectedAbnormal && (
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium">{selectedAbnormal.detectionType.replace(/_/g, ' ')}</p>
                <p className="text-sm text-slate-600">{selectedAbnormal.description}</p>
              </div>
              <div className="space-y-2">
                <Label>Resolution Notes *</Label>
                <Textarea 
                  value={resolveForm.resolutionNotes}
                  onChange={(e) => setResolveForm({ resolutionNotes: e.target.value })}
                  placeholder="Explain the resolution or reason for this abnormal consumption..."
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleResolveAbnormal} className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Resolve
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
