'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Moon, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Package,
  FileCheck,
  Wrench,
  TrendingUp,
  Calendar,
  Save,
  RotateCcw,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'

// Types
interface NotificationPreferences {
  id?: string
  userId?: string
  
  // Email notification settings
  emailEnabled: boolean
  emailSlaWarning: boolean
  emailSlaBreach: boolean
  emailApprovalPending: boolean
  emailApprovalReminder: boolean
  emailApprovalEscalation: boolean
  emailLowStock: boolean
  emailPmDue: boolean
  emailBudgetThreshold: boolean
  emailScheduledReport: boolean
  emailEmergencyJob: boolean
  emailJobCardCreated: boolean
  emailJobCardCompleted: boolean
  
  // In-app notification settings
  inAppEnabled: boolean
  inAppSlaWarning: boolean
  inAppSlaBreach: boolean
  inAppApprovalPending: boolean
  inAppApprovalReminder: boolean
  inAppApprovalEscalation: boolean
  inAppLowStock: boolean
  inAppPmDue: boolean
  inAppBudgetThreshold: boolean
  inAppScheduledReport: boolean
  inAppEmergencyJob: boolean
  inAppJobCardCreated: boolean
  inAppJobCardCompleted: boolean
  
  // Quiet hours settings
  quietHoursEnabled: boolean
  quietHoursStart: string | null
  quietHoursEnd: string | null
  quietHoursTimezone: string | null
  
  // Digest settings
  digestEnabled: boolean
  digestFrequency: string | null
  digestTime: string | null
  digestDay: string | null
}

// Default preferences
const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailEnabled: true,
  emailSlaWarning: true,
  emailSlaBreach: true,
  emailApprovalPending: true,
  emailApprovalReminder: true,
  emailApprovalEscalation: true,
  emailLowStock: true,
  emailPmDue: true,
  emailBudgetThreshold: true,
  emailScheduledReport: true,
  emailEmergencyJob: true,
  emailJobCardCreated: true,
  emailJobCardCompleted: false,
  
  inAppEnabled: true,
  inAppSlaWarning: true,
  inAppSlaBreach: true,
  inAppApprovalPending: true,
  inAppApprovalReminder: true,
  inAppApprovalEscalation: true,
  inAppLowStock: true,
  inAppPmDue: true,
  inAppBudgetThreshold: true,
  inAppScheduledReport: true,
  inAppEmergencyJob: true,
  inAppJobCardCreated: true,
  inAppJobCardCompleted: true,
  
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  quietHoursTimezone: 'UTC',
  
  digestEnabled: true,
  digestFrequency: 'DAILY',
  digestTime: '09:00',
  digestDay: null,
}

// Event categories
const SLA_EVENTS = [
  { key: 'SlaWarning', label: 'SLA Warning (80%)', description: 'When SLA reaches 80% of allocated time', icon: AlertTriangle },
  { key: 'SlaBreach', label: 'SLA Breach', description: 'When SLA deadline is exceeded', icon: AlertTriangle },
]

const APPROVAL_EVENTS = [
  { key: 'ApprovalPending', label: 'Approval Pending', description: 'New approval requests assigned to you', icon: FileCheck },
  { key: 'ApprovalReminder', label: 'Approval Reminder', description: 'Daily digest of pending approvals', icon: Clock },
  { key: 'ApprovalEscalation', label: 'Approval Escalation', description: 'When approvals are escalated', icon: TrendingUp },
]

const OPERATIONAL_EVENTS = [
  { key: 'LowStock', label: 'Low Stock Alert', description: 'When items fall below reorder level', icon: Package },
  { key: 'PmDue', label: 'PM Due Reminder', description: 'Preventive maintenance reminders', icon: Calendar },
  { key: 'BudgetThreshold', label: 'Budget Threshold', description: 'When budget utilization reaches thresholds', icon: TrendingUp },
  { key: 'ScheduledReport', label: 'Scheduled Reports', description: 'Automated report deliveries', icon: FileCheck },
]

const JOB_CARD_EVENTS = [
  { key: 'EmergencyJob', label: 'Emergency Job', description: 'Emergency priority job cards', icon: Zap },
  { key: 'JobCardCreated', label: 'Job Card Created', description: 'New job cards assigned', icon: Wrench },
  { key: 'JobCardCompleted', label: 'Job Card Completed', description: 'Job cards marked as completed', icon: CheckCircle },
]

interface NotificationPreferencesProps {
  userId?: string
  onSave?: (preferences: NotificationPreferences) => void
}

export function NotificationPreferences({ userId, onSave }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalPreferences, setOriginalPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)

  // Fetch preferences on mount
  useEffect(() => {
    fetchPreferences()
  }, [userId])

  const fetchPreferences = async () => {
    setLoading(true)
    try {
      const url = userId 
        ? `/api/notifications/preferences?userId=${userId}`
        : '/api/notifications/preferences'
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.data) {
        setPreferences(data.data)
        setOriginalPreferences(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error)
      toast.error('Failed to load notification preferences')
    } finally {
      setLoading(false)
    }
  }

  // Check for changes
  useEffect(() => {
    const hasChangesDetected = JSON.stringify(preferences) !== JSON.stringify(originalPreferences)
    setHasChanges(hasChangesDetected)
  }, [preferences, originalPreferences])

  const updatePreference = (key: keyof NotificationPreferences, value: boolean | string | null) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || 'default-user',
          ...preferences
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Notification preferences saved')
        setOriginalPreferences(preferences)
        onSave?.(preferences)
      } else {
        toast.error(data.error || 'Failed to save preferences')
      }
    } catch (error) {
      console.error('Failed to save preferences:', error)
      toast.error('Failed to save notification preferences')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setPreferences(DEFAULT_PREFERENCES)
    toast.info('Preferences reset to defaults')
  }

  const handleCancel = () => {
    setPreferences(originalPreferences)
    toast.info('Changes discarded')
  }

  const renderEventToggle = (
    event: { key: string; label: string; description: string; icon: React.ComponentType<{ className?: string }> },
    type: 'email' | 'inApp'
  ) => {
    const emailKey = `email${event.key}` as keyof NotificationPreferences
    const inAppKey = `inApp${event.key}` as keyof NotificationPreferences
    const key = type === 'email' ? emailKey : inAppKey
    const Icon = event.icon
    const isDisabled = type === 'email' ? !preferences.emailEnabled : !preferences.inAppEnabled

    return (
      <div key={`${type}-${event.key}`} className={`flex items-center justify-between py-3 ${isDisabled ? 'opacity-50' : ''}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${type === 'email' ? 'bg-blue-100' : 'bg-emerald-100'}`}>
            <Icon className={`h-4 w-4 ${type === 'email' ? 'text-blue-600' : 'text-emerald-600'}`} />
          </div>
          <div>
            <p className="font-medium text-sm">{event.label}</p>
            <p className="text-xs text-muted-foreground">{event.description}</p>
          </div>
        </div>
        <Switch
          checked={Boolean(preferences[key])}
          onCheckedChange={(checked) => updatePreference(key, checked)}
          disabled={isDisabled}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notification Preferences</h2>
          <p className="text-muted-foreground">Manage how and when you receive notifications</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="text-amber-600">
              Unsaved changes
            </Badge>
          )}
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </div>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="in-app" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            In-App
          </TabsTrigger>
          <TabsTrigger value="quiet-hours" className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Quiet Hours
          </TabsTrigger>
          <TabsTrigger value="digest" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Digest
          </TabsTrigger>
        </TabsList>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-lg">Email Notifications</CardTitle>
                </div>
                <Switch
                  checked={preferences.emailEnabled}
                  onCheckedChange={(checked) => updatePreference('emailEnabled', checked)}
                />
              </div>
              <CardDescription>
                Receive notifications via email
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`space-y-1 ${!preferences.emailEnabled ? 'opacity-50' : ''}`}>
                {/* SLA Events */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    SLA Events
                  </h4>
                  {SLA_EVENTS.map(event => renderEventToggle(event, 'email'))}
                </div>

                <Separator />

                {/* Approval Events */}
                <div className="my-4">
                  <h4 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Approval Events
                  </h4>
                  {APPROVAL_EVENTS.map(event => renderEventToggle(event, 'email'))}
                </div>

                <Separator />

                {/* Operational Events */}
                <div className="my-4">
                  <h4 className="text-sm font-semibold text-amber-600 mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Operational Events
                  </h4>
                  {OPERATIONAL_EVENTS.map(event => renderEventToggle(event, 'email'))}
                </div>

                <Separator />

                {/* Job Card Events */}
                <div className="my-4">
                  <h4 className="text-sm font-semibold text-emerald-600 mb-2 flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Job Card Events
                  </h4>
                  {JOB_CARD_EVENTS.map(event => renderEventToggle(event, 'email'))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* In-App Tab */}
        <TabsContent value="in-app" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-emerald-500" />
                  <CardTitle className="text-lg">In-App Notifications</CardTitle>
                </div>
                <Switch
                  checked={preferences.inAppEnabled}
                  onCheckedChange={(checked) => updatePreference('inAppEnabled', checked)}
                />
              </div>
              <CardDescription>
                Receive notifications in the application
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`space-y-1 ${!preferences.inAppEnabled ? 'opacity-50' : ''}`}>
                {/* SLA Events */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    SLA Events
                  </h4>
                  {SLA_EVENTS.map(event => renderEventToggle(event, 'inApp'))}
                </div>

                <Separator />

                {/* Approval Events */}
                <div className="my-4">
                  <h4 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Approval Events
                  </h4>
                  {APPROVAL_EVENTS.map(event => renderEventToggle(event, 'inApp'))}
                </div>

                <Separator />

                {/* Operational Events */}
                <div className="my-4">
                  <h4 className="text-sm font-semibold text-amber-600 mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Operational Events
                  </h4>
                  {OPERATIONAL_EVENTS.map(event => renderEventToggle(event, 'inApp'))}
                </div>

                <Separator />

                {/* Job Card Events */}
                <div className="my-4">
                  <h4 className="text-sm font-semibold text-emerald-600 mb-2 flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Job Card Events
                  </h4>
                  {JOB_CARD_EVENTS.map(event => renderEventToggle(event, 'inApp'))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiet Hours Tab */}
        <TabsContent value="quiet-hours" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="h-5 w-5 text-indigo-500" />
                  <CardTitle className="text-lg">Quiet Hours</CardTitle>
                </div>
                <Switch
                  checked={preferences.quietHoursEnabled}
                  onCheckedChange={(checked) => updatePreference('quietHoursEnabled', checked)}
                />
              </div>
              <CardDescription>
                Pause notifications during specific hours
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`space-y-4 ${!preferences.quietHoursEnabled ? 'opacity-50' : ''}`}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quietStart">Start Time</Label>
                    <Input
                      id="quietStart"
                      type="time"
                      value={preferences.quietHoursStart || '22:00'}
                      onChange={(e) => updatePreference('quietHoursStart', e.target.value)}
                      disabled={!preferences.quietHoursEnabled}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quietEnd">End Time</Label>
                    <Input
                      id="quietEnd"
                      type="time"
                      value={preferences.quietHoursEnd || '07:00'}
                      onChange={(e) => updatePreference('quietHoursEnd', e.target.value)}
                      disabled={!preferences.quietHoursEnabled}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={preferences.quietHoursTimezone || 'UTC'}
                    onValueChange={(value) => updatePreference('quietHoursTimezone', value)}
                    disabled={!preferences.quietHoursEnabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
                      <SelectItem value="Australia/Sydney">Sydney</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  During quiet hours, non-critical notifications will be held and delivered when quiet hours end.
                  Emergency notifications will still be delivered immediately.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Digest Tab */}
        <TabsContent value="digest" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-500" />
                  <CardTitle className="text-lg">Notification Digest</CardTitle>
                </div>
                <Switch
                  checked={preferences.digestEnabled}
                  onCheckedChange={(checked) => updatePreference('digestEnabled', checked)}
                />
              </div>
              <CardDescription>
                Receive a summary of notifications instead of individual alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`space-y-4 ${!preferences.digestEnabled ? 'opacity-50' : ''}`}>
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={preferences.digestFrequency || 'DAILY'}
                    onValueChange={(value) => updatePreference('digestFrequency', value)}
                    disabled={!preferences.digestEnabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="digestTime">Delivery Time</Label>
                  <Input
                    id="digestTime"
                    type="time"
                    value={preferences.digestTime || '09:00'}
                    onChange={(e) => updatePreference('digestTime', e.target.value)}
                    disabled={!preferences.digestEnabled}
                  />
                </div>

                {preferences.digestFrequency === 'WEEKLY' && (
                  <div className="space-y-2">
                    <Label htmlFor="digestDay">Day of Week</Label>
                    <Select
                      value={preferences.digestDay || 'MONDAY'}
                      onValueChange={(value) => updatePreference('digestDay', value)}
                      disabled={!preferences.digestEnabled}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONDAY">Monday</SelectItem>
                        <SelectItem value="TUESDAY">Tuesday</SelectItem>
                        <SelectItem value="WEDNESDAY">Wednesday</SelectItem>
                        <SelectItem value="THURSDAY">Thursday</SelectItem>
                        <SelectItem value="FRIDAY">Friday</SelectItem>
                        <SelectItem value="SATURDAY">Saturday</SelectItem>
                        <SelectItem value="SUNDAY">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  The digest will include a summary of pending approvals, SLA alerts, 
                  low stock notifications, and other important updates.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      {hasChanges && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

export default NotificationPreferences
