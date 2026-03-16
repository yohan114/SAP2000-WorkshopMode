'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'

// Notification types
export type NotificationType = 'JOB_CARD_CREATED' | 'EMERGENCY_JOB' | 'LOW_STOCK' | 'MR_APPROVED'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, unknown>
  createdAt: Date
  read: boolean
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  isConnected: boolean
}

interface UseNotificationsReturn extends NotificationState {
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  clearAll: () => void
  createNotification: (type: NotificationType, title: string, message: string, data?: Record<string, unknown>) => void
}

// Global socket instance to prevent multiple connections
let globalSocket: Socket | null = null
let connectionCount = 0

export function useNotifications(): UseNotificationsReturn {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    isConnected: false
  })
  
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    // Only create socket connection on client side
    if (typeof window === 'undefined') return
    
    connectionCount++
    
    // Reuse existing socket if available
    if (globalSocket && globalSocket.connected) {
      socketRef.current = globalSocket
      setState(prev => ({ ...prev, isConnected: true }))
      
      // Request current notifications
      globalSocket.emit('notifications:get')
    } else {
      // Create new socket connection
      // Use XTransformPort to route through Caddy gateway
      const socket = io('/?XTransformPort=3003', {
        transports: ['websocket', 'polling'],
        forceNew: false,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 10000
      })
      
      socketRef.current = socket
      globalSocket = socket
      
      // Connection events
      socket.on('connect', () => {
        console.log('Notification service connected')
        setState(prev => ({ ...prev, isConnected: true }))
      })
      
      socket.on('disconnect', () => {
        console.log('Notification service disconnected')
        setState(prev => ({ ...prev, isConnected: false }))
      })
      
      socket.on('connect_error', (error) => {
        console.error('Notification service connection error:', error.message)
      })
    }
    
    const socket = socketRef.current
    if (!socket) return
    
    // Initial notifications
    socket.on('notifications:initial', (data: { notifications: Notification[], unreadCount: number }) => {
      setState(prev => ({
        ...prev,
        notifications: data.notifications,
        unreadCount: data.unreadCount
      }))
    })
    
    // New notification
    socket.on('notification:new', (notification: Notification) => {
      setState(prev => ({
        ...prev,
        notifications: [notification, ...prev.notifications],
        unreadCount: prev.unreadCount + 1
      }))
      
      // Show toast for new notification
      showToastForNotification(notification)
    })
    
    // Unread count update
    socket.on('notifications:unread-count', (count: number) => {
      setState(prev => ({ ...prev, unreadCount: count }))
    })
    
    // Notification updated (marked as read)
    socket.on('notification:updated', (data: { id: string, read: boolean }) => {
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => 
          n.id === data.id ? { ...n, read: data.read } : n
        )
      }))
    })
    
    // All notifications marked as read
    socket.on('notifications:all-read', () => {
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, read: true }))
      }))
    })
    
    // Notification deleted
    socket.on('notification:deleted', (data: { id: string }) => {
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== data.id)
      }))
    })
    
    // All notifications cleared
    socket.on('notifications:cleared', () => {
      setState(prev => ({
        ...prev,
        notifications: [],
        unreadCount: 0
      }))
    })
    
    // Cleanup on unmount
    return () => {
      connectionCount--
      
      // Only disconnect if no more consumers
      if (connectionCount === 0 && globalSocket) {
        socket.off('notifications:initial')
        socket.off('notification:new')
        socket.off('notifications:unread-count')
        socket.off('notification:updated')
        socket.off('notifications:all-read')
        socket.off('notification:deleted')
        socket.off('notifications:cleared')
        socket.off('connect')
        socket.off('disconnect')
        socket.off('connect_error')
        
        // Don't disconnect, let it reconnect for other consumers
        globalSocket = null
      }
    }
  }, [])
  
  // Show appropriate toast based on notification type
  const showToastForNotification = useCallback((notification: Notification) => {
    switch (notification.type) {
      case 'EMERGENCY_JOB':
        toast.error(notification.title, {
          description: notification.message,
          duration: 10000
        })
        break
      case 'LOW_STOCK':
        toast.warning(notification.title, {
          description: notification.message,
          duration: 6000
        })
        break
      case 'JOB_CARD_CREATED':
        toast.info(notification.title, {
          description: notification.message,
          duration: 4000
        })
        break
      case 'MR_APPROVED':
        toast.success(notification.title, {
          description: notification.message,
          duration: 4000
        })
        break
      default:
        toast.info(notification.title, {
          description: notification.message
        })
    }
  }, [])
  
  // Mark a notification as read
  const markAsRead = useCallback((id: string) => {
    if (socketRef.current) {
      socketRef.current.emit('notification:mark-read', { id })
    }
  }, [])
  
  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('notification:mark-all-read')
    }
  }, [])
  
  // Delete a notification
  const deleteNotification = useCallback((id: string) => {
    if (socketRef.current) {
      socketRef.current.emit('notification:delete', { id })
    }
  }, [])
  
  // Clear all notifications
  const clearAll = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('notification:clear-all')
    }
  }, [])
  
  // Create a new notification (useful for testing or from backend)
  const createNotification = useCallback((
    type: NotificationType, 
    title: string, 
    message: string, 
    data?: Record<string, unknown>
  ) => {
    if (socketRef.current) {
      socketRef.current.emit('notification:create', { type, title, message, data })
    }
  }, [])
  
  return {
    ...state,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    createNotification
  }
}
