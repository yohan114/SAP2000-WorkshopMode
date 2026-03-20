'use client'

import { useNotifications, NotificationType } from '@/hooks/use-notifications'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  Trash2, 
  Wrench, 
  AlertTriangle, 
  Package, 
  FileCheck,
  Clock,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Get icon and color based on notification type
const getNotificationStyle = (type: NotificationType) => {
  switch (type) {
    case 'EMERGENCY_JOB':
      return {
        icon: AlertTriangle,
        bgColor: 'bg-red-100',
        textColor: 'text-red-600',
        borderColor: 'border-l-red-500'
      }
    case 'JOB_CARD_CREATED':
      return {
        icon: Wrench,
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-600',
        borderColor: 'border-l-blue-500'
      }
    case 'LOW_STOCK':
      return {
        icon: Package,
        bgColor: 'bg-amber-100',
        textColor: 'text-amber-600',
        borderColor: 'border-l-amber-500'
      }
    case 'MR_APPROVED':
      return {
        icon: FileCheck,
        bgColor: 'bg-emerald-100',
        textColor: 'text-emerald-600',
        borderColor: 'border-l-emerald-500'
      }
    default:
      return {
        icon: Bell,
        bgColor: 'bg-slate-100',
        textColor: 'text-muted-foreground',
        borderColor: 'border-l-slate-500'
      }
  }
}

// Format relative time
const formatRelativeTime = (date: Date): string => {
  const now = new Date()
  const notificationDate = new Date(date)
  const diffMs = now.getTime() - notificationDate.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffSeconds < 60) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return notificationDate.toLocaleDateString()
}

export function NotificationBell() {
  const { 
    notifications, 
    unreadCount, 
    isConnected,
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    clearAll 
  } = useNotifications()
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {isConnected ? (
            <Bell className="h-5 w-5 text-muted-foreground" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <DropdownMenuLabel className="p-0">
            <div className="flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>
          </DropdownMenuLabel>
          <div className="flex items-center gap-1">
            {!isConnected && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                Reconnecting...
              </Badge>
            )}
            {notifications.length > 0 && (
              <>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                    onClick={markAllAsRead}
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={clearAll}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>
        
        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isConnected ? 'You&apos;ll be notified when something happens' : 'Connecting to notification service...'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="py-1">
              {notifications.map((notification) => {
                const style = getNotificationStyle(notification.type)
                const Icon = style.icon
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'px-4 py-3 border-l-4 hover:bg-muted/50 transition-colors cursor-pointer group',
                      style.borderColor,
                      !notification.read && 'bg-muted/50/50'
                    )}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={cn('p-2 rounded-full', style.bgColor)}>
                        <Icon className={cn('h-4 w-4', style.textColor)} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            'text-sm font-medium leading-tight',
                            !notification.read && 'text-foreground',
                            notification.read && 'text-muted-foreground'
                          )}>
                            {notification.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
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
                )
              })}
            </div>
          </ScrollArea>
        )}
        
        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </span>
              <Button 
                variant="link" 
                className="h-auto p-0 text-xs text-emerald-600"
                onClick={markAllAsRead}
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all as read
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
