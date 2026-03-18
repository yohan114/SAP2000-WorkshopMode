import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Notification types
type NotificationType = 'JOB_CARD_CREATED' | 'EMERGENCY_JOB' | 'LOW_STOCK' | 'MR_APPROVED'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, unknown>
  createdAt: Date
  read: boolean
}

// In-memory storage for notifications
const notifications: Notification[] = []
const MAX_NOTIFICATIONS = 100

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9)

// Create a new notification
const createNotification = (
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Notification => ({
  id: generateId(),
  type,
  title,
  message,
  data,
  createdAt: new Date(),
  read: false
})

// Add notification to storage
const addNotification = (notification: Notification): void => {
  notifications.unshift(notification)
  
  // Keep only the last MAX_NOTIFICATIONS
  if (notifications.length > MAX_NOTIFICATIONS) {
    notifications.pop()
  }
}

// Get all notifications
const getNotifications = (): Notification[] => [...notifications]

// Get unread count
const getUnreadCount = (): number => notifications.filter(n => !n.read).length

// Mark notification as read
const markAsRead = (id: string): boolean => {
  const notification = notifications.find(n => n.id === id)
  if (notification) {
    notification.read = true
    return true
  }
  return false
}

// Mark all as read
const markAllAsRead = (): void => {
  notifications.forEach(n => n.read = true)
}

// Clear all notifications
const clearAll = (): void => {
  notifications.length = 0
}

// Delete a notification
const deleteNotification = (id: string): boolean => {
  const index = notifications.findIndex(n => n.id === id)
  if (index !== -1) {
    notifications.splice(index, 1)
    return true
  }
  return false
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // Send existing notifications to newly connected client
  socket.emit('notifications:initial', {
    notifications: getNotifications(),
    unreadCount: getUnreadCount()
  })

  // Handle test event
  socket.on('test', (data) => {
    console.log('Received test message:', data)
    socket.emit('test-response', { 
      message: 'Server received test message', 
      data: data,
      timestamp: new Date().toISOString()
    })
  })

  // Handle create notification event (can be called from backend or frontend)
  socket.on('notification:create', (data: {
    type: NotificationType
    title: string
    message: string
    data?: Record<string, unknown>
  }) => {
    const notification = createNotification(data.type, data.title, data.message, data.data)
    addNotification(notification)
    
    // Broadcast to all clients
    io.emit('notification:new', notification)
    io.emit('notifications:unread-count', getUnreadCount())
    
    console.log(`Notification created: [${data.type}] ${data.title}`)
  })

  // Handle mark as read
  socket.on('notification:mark-read', (data: { id: string }) => {
    const success = markAsRead(data.id)
    if (success) {
      io.emit('notification:updated', { id: data.id, read: true })
      io.emit('notifications:unread-count', getUnreadCount())
    }
  })

  // Handle mark all as read
  socket.on('notification:mark-all-read', () => {
    markAllAsRead()
    io.emit('notifications:all-read')
    io.emit('notifications:unread-count', 0)
  })

  // Handle delete notification
  socket.on('notification:delete', (data: { id: string }) => {
    const success = deleteNotification(data.id)
    if (success) {
      io.emit('notification:deleted', { id: data.id })
      io.emit('notifications:unread-count', getUnreadCount())
    }
  })

  // Handle clear all
  socket.on('notification:clear-all', () => {
    clearAll()
    io.emit('notifications:cleared')
    io.emit('notifications:unread-count', 0)
  })

  // Handle get notifications request
  socket.on('notifications:get', () => {
    socket.emit('notifications:initial', {
      notifications: getNotifications(),
      unreadCount: getUnreadCount()
    })
  })

  // Health check via socket
  socket.on('health:check', () => {
    socket.emit('health:response', { 
      status: 'ok', 
      service: 'notification-service', 
      timestamp: new Date().toISOString(),
      connectedClients: io.sockets.sockets.size
    })
  })

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

const PORT = 3003

httpServer.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`)
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`)
  console.log(`Use Socket.io to connect: io("/?XTransformPort=3003")`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down notification service...')
  httpServer.close(() => {
    console.log('Notification service closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down notification service...')
  httpServer.close(() => {
    console.log('Notification service closed')
    process.exit(0)
  })
})
