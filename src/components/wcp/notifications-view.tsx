'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  BellRing,
  BellOff,
  Search, 
  Loader2, 
  CheckCircle,
  Trash2,
  Settings,
  Wrench,
  AlertTriangle,
  Package,
  FileCheck,
  Clock,
  CheckCheck,
  X,
  Volume2,
  VolumeX,
  Mail,
  Smartphone
} from 'lucide-react';
import { toast } from 'sonner';
import { useNotifications, NotificationType } from '@/hooks/use-notifications';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: Date;
  read: boolean;
}

interface NotificationPreference {
  id: string;
  notificationType: string;
  inApp: boolean;
  email: boolean;
  sms: boolean;
  sound: boolean;
}

const typeIcons: Record<string, any> = {
  'JOB_CARD_CREATED': Wrench,
  'EMERGENCY_JOB': AlertTriangle,
  'LOW_STOCK': Package,
  'MR_APPROVED': FileCheck,
};

const typeColors: Record<string, string> = {
  'JOB_CARD_CREATED': 'bg-blue-100 text-blue-700',
  'EMERGENCY_JOB': 'bg-red-100 text-red-700',
  'LOW_STOCK': 'bg-amber-100 text-amber-700',
  'MR_APPROVED': 'bg-emerald-100 text-emerald-700',
};

export function NotificationsView() {
  const { 
    notifications, 
    unreadCount, 
    isConnected,
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    clearAll 
  } = useNotifications();
  
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.data || data.preferences || []);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreference = async (prefId: string, field: string, value: boolean) => {
    try {
      const response = await fetch(`/api/notifications/preferences/${prefId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });

      if (response.ok) {
        toast.success('Preference updated');
        fetchPreferences();
      } else {
        toast.error('Failed to update preference');
      }
    } catch (error) {
      console.error('Failed to update preference:', error);
      toast.error('Failed to update preference');
    }
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffMs = now.getTime() - notificationDate.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notificationDate.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(n => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    if (searchTerm) {
      return n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             n.message.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm">Manage your notifications and preferences</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-2">
            {isConnected ? (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                Reconnecting...
              </span>
            )}
          </div>
          <Button variant="outline" onClick={() => setShowPreferencesDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifications.length}</p>
                <p className="text-xs text-slate-500">Total Notifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <BellRing className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-xs text-slate-500">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifications.filter(n => n.read).length}</p>
                <p className="text-xs text-slate-500">Read</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearAll}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="JOB_CARD_CREATED">Job Cards</SelectItem>
                  <SelectItem value="EMERGENCY_JOB">Emergency Jobs</SelectItem>
                  <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                  <SelectItem value="MR_APPROVED">MR Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="all">
          <NotificationList 
            notifications={filteredNotifications}
            markAsRead={markAsRead}
            deleteNotification={deleteNotification}
            formatRelativeTime={formatRelativeTime}
          />
        </TabsContent>

        <TabsContent value="unread">
          <NotificationList 
            notifications={filteredNotifications.filter(n => !n.read)}
            markAsRead={markAsRead}
            deleteNotification={deleteNotification}
            formatRelativeTime={formatRelativeTime}
          />
        </TabsContent>
      </Tabs>

      {/* Preferences Dialog */}
      <Dialog open={showPreferencesDialog} onOpenChange={setShowPreferencesDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
            <DialogDescription>
              Configure how you receive notifications
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {preferences.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Notification Type</TableHead>
                    <TableHead className="text-center">In-App</TableHead>
                    <TableHead className="text-center">Email</TableHead>
                    <TableHead className="text-center">SMS</TableHead>
                    <TableHead className="text-center">Sound</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preferences.map((pref) => (
                    <TableRow key={pref.id}>
                      <TableCell className="font-medium">
                        {pref.notificationType}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={pref.inApp}
                          onCheckedChange={(v) => handleUpdatePreference(pref.id, 'inApp', v)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={pref.email}
                          onCheckedChange={(v) => handleUpdatePreference(pref.id, 'email', v)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={pref.sms}
                          onCheckedChange={(v) => handleUpdatePreference(pref.id, 'sms', v)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={pref.sound}
                          onCheckedChange={(v) => handleUpdatePreference(pref.id, 'sound', v)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No preferences configured
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreferencesDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Separate component for notification list
function NotificationList({ 
  notifications, 
  markAsRead, 
  deleteNotification,
  formatRelativeTime 
}: { 
  notifications: Notification[];
  markAsRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  formatRelativeTime: (date: Date) => string;
}) {
  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <BellOff className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No notifications</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="divide-y">
            {notifications.map((notification) => {
              const Icon = typeIcons[notification.type] || Bell;
              const colorClass = typeColors[notification.type] || 'bg-slate-100 text-slate-700';
              
              return (
                <div 
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50 transition-colors ${!notification.read ? 'bg-slate-50/50' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${colorClass.split(' ')[0]}`}>
                      <Icon className={`h-5 w-5 ${colorClass.split(' ')[1]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium ${!notification.read ? 'text-slate-900' : 'text-slate-600'}`}>
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <X className="h-3 w-3 text-slate-400" />
                        </Button>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{notification.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span className="text-xs text-slate-400">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                        {!notification.read && (
                          <Badge className="text-[10px] h-4 px-1 bg-emerald-100 text-emerald-700 border-0">
                            New
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
