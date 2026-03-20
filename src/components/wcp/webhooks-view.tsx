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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Webhook, 
  Plus, 
  Search, 
  Loader2, 
  Play,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Copy,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface WebhookData {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string;
  isActive: boolean;
  lastTriggeredAt: string | null;
  failureCount: number;
  createdAt: string;
  _count?: { deliveries: number };
}

interface Delivery {
  id: string;
  event: string;
  status: string;
  statusCode: number | null;
  deliveredAt: string | null;
  attempts: number;
  createdAt: string;
}

const WEBHOOK_EVENTS = [
  { value: 'JOB_CARD_CREATED', label: 'Job Card Created' },
  { value: 'JOB_CARD_UPDATED', label: 'Job Card Updated' },
  { value: 'JOB_CARD_COMPLETED', label: 'Job Card Completed' },
  { value: 'JOB_CARD_CLOSED', label: 'Job Card Closed' },
  { value: 'MR_CREATED', label: 'Material Request Created' },
  { value: 'MR_APPROVED', label: 'Material Request Approved' },
  { value: 'MR_REJECTED', label: 'Material Request Rejected' },
  { value: 'GRN_POSTED', label: 'GRN Posted' },
  { value: 'LOW_STOCK_ALERT', label: 'Low Stock Alert' },
  { value: 'PM_COMPLETED', label: 'PM Completed' },
  { value: 'INSPECTION_FAILED', label: 'Inspection Failed' },
  { value: 'ASSET_STATUS_CHANGED', label: 'Asset Status Changed' },
  { value: 'INVENTORY_ADJUSTED', label: 'Inventory Adjusted' },
  { value: '*', label: 'All Events' },
];

export function WebhooksView() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeliveriesDialog, setShowDeliveriesDialog] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookData | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    secret: '',
    events: [] as string[],
    isActive: true,
  });

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/webhooks');
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
      toast.error('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveries = async (webhookId: string) => {
    try {
      setDeliveriesLoading(true);
      const response = await fetch(`/api/webhooks/${webhookId}/deliveries`);
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
    } finally {
      setDeliveriesLoading(false);
    }
  };

  const handleCreateWebhook = async () => {
    if (!formData.name || !formData.url || formData.events.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Webhook created successfully');
        setShowCreateDialog(false);
        resetForm();
        fetchWebhooks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create webhook');
      }
    } catch (error) {
      console.error('Failed to create webhook:', error);
      toast.error('Failed to create webhook');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestWebhook = async (webhook: WebhookData) => {
    try {
      const response = await fetch(`/api/webhooks/${webhook.id}/test`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Test webhook sent successfully');
        fetchWebhooks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send test webhook');
      }
    } catch (error) {
      console.error('Failed to test webhook:', error);
      toast.error('Failed to test webhook');
    }
  };

  const handleDeleteWebhook = async (webhook: WebhookData) => {
    if (!confirm(`Are you sure you want to delete "${webhook.name}"?`)) return;

    try {
      const response = await fetch(`/api/webhooks/${webhook.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Webhook deleted');
        fetchWebhooks();
      } else {
        toast.error('Failed to delete webhook');
      }
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      toast.error('Failed to delete webhook');
    }
  };

  const handleToggleActive = async (webhook: WebhookData) => {
    try {
      const response = await fetch(`/api/webhooks/${webhook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !webhook.isActive }),
      });

      if (response.ok) {
        toast.success(`Webhook ${!webhook.isActive ? 'activated' : 'deactivated'}`);
        fetchWebhooks();
      }
    } catch (error) {
      console.error('Failed to toggle webhook:', error);
      toast.error('Failed to update webhook');
    }
  };

  const handleViewDeliveries = async (webhook: WebhookData) => {
    setSelectedWebhook(webhook);
    setShowDeliveriesDialog(true);
    fetchDeliveries(webhook.id);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      secret: '',
      events: [],
      isActive: true,
    });
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret copied to clipboard');
  };

  const filteredWebhooks = webhooks.filter(wh =>
    wh.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wh.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEventsList = (eventsJson: string): string[] => {
    try {
      return JSON.parse(eventsJson);
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
          <p className="text-muted-foreground text-sm">Manage webhook integrations for external systems</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          New Webhook
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search webhooks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredWebhooks.length === 0 ? (
            <div className="text-center py-12">
              <Webhook className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-muted-foreground">No webhooks configured</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
                Create your first webhook
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWebhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{webhook.name}</span>
                        {webhook.failureCount >= 3 && (
                          <Badge variant="destructive" className="text-xs">
                            {webhook.failureCount} failures
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {webhook.url.length > 40 ? webhook.url.slice(0, 40) + '...' : webhook.url}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getEventsList(webhook.events).slice(0, 2).map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {WEBHOOK_EVENTS.find(e => e.value === event)?.label || event}
                          </Badge>
                        ))}
                        {getEventsList(webhook.events).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{getEventsList(webhook.events).length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={webhook.isActive}
                          onCheckedChange={() => handleToggleActive(webhook)}
                        />
                        <span className={webhook.isActive ? 'text-emerald-600' : 'text-muted-foreground'}>
                          {webhook.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {webhook.lastTriggeredAt ? (
                        <span className="text-sm text-muted-foreground">
                          {new Date(webhook.lastTriggeredAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDeliveries(webhook)}
                          title="View deliveries"
                        >
                          <Activity className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTestWebhook(webhook)}
                          title="Test webhook"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteWebhook(webhook)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete"
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

      {/* Create Webhook Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              Configure a new webhook endpoint for external integrations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Slack Notifications"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Endpoint URL *</label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://api.example.com/webhook"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Secret (optional)</label>
              <Input
                value={formData.secret}
                onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                placeholder="Auto-generated if empty"
              />
              <p className="text-xs text-muted-foreground">
                Used to sign webhook payloads with HMAC-SHA256
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Events *</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {WEBHOOK_EVENTS.map((event) => (
                  <label key={event.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.events.includes(event.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (event.value === '*') {
                            setFormData(prev => ({ ...prev, events: ['*'] }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              events: [...prev.events.filter(e => e !== '*'), event.value],
                            }));
                          }
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            events: prev.events.filter(e => e !== event.value),
                          }));
                        }
                      }}
                      className="rounded"
                    />
                    {event.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <label className="text-sm">Active</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateWebhook} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deliveries Dialog */}
      <Dialog open={showDeliveriesDialog} onOpenChange={setShowDeliveriesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Delivery History - {selectedWebhook?.name}</DialogTitle>
            <DialogDescription>
              Recent webhook deliveries and their status
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {deliveriesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              </div>
            ) : deliveries.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-muted-foreground">No deliveries yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response Code</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Delivered At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <Badge variant="outline">{delivery.event}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          delivery.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                          delivery.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {delivery.status === 'DELIVERED' ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : delivery.status === 'FAILED' ? (
                            <XCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {delivery.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{delivery.statusCode || '-'}</TableCell>
                      <TableCell>{delivery.attempts}</TableCell>
                      <TableCell>
                        {delivery.deliveredAt
                          ? new Date(delivery.deliveredAt).toLocaleString()
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliveriesDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
