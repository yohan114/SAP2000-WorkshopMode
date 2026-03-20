import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * @openapi
 * /notifications/preferences:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: Get notification preferences for current user
 *     responses:
 *       200:
 *         description: Notification preferences
 *   post:
 *     tags:
 *       - Notifications
 *     summary: Update notification preferences
 */

// Default notification preferences
const DEFAULT_PREFERENCES = {
  // Email notification settings
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
  
  // In-app notification settings
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
  
  // Quiet hours settings
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  quietHoursTimezone: 'UTC',
  
  // Digest settings
  digestEnabled: true,
  digestFrequency: 'DAILY',
  digestTime: '09:00',
  digestDay: null,
};

// GET /api/notifications/preferences
export async function GET(request: NextRequest) {
  try {
    // Get userId from query params or use a default for development
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      // Return default preferences if no user specified
      return NextResponse.json({ 
        data: DEFAULT_PREFERENCES,
        preferences: DEFAULT_PREFERENCES,
        isDefault: true 
      });
    }
    
    // Fetch user's notification preferences from database
    const preferences = await db.notificationPreferences.findUnique({
      where: { userId },
    });
    
    if (!preferences) {
      // Create default preferences for user
      const newPreferences = await db.notificationPreferences.create({
        data: {
          userId,
          ...DEFAULT_PREFERENCES,
        },
      });
      
      return NextResponse.json({ 
        data: newPreferences, 
        preferences: newPreferences,
        isDefault: true 
      });
    }
    
    return NextResponse.json({ 
      data: preferences, 
      preferences,
      isDefault: false 
    });
  } catch (error) {
    console.error('Failed to fetch notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

// POST /api/notifications/preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...updates } = body;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }
    
    // Validate that user exists
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Upsert notification preferences
    const preferences = await db.notificationPreferences.upsert({
      where: { userId },
      update: {
        // Email settings
        emailEnabled: updates.emailEnabled,
        emailSlaWarning: updates.emailSlaWarning,
        emailSlaBreach: updates.emailSlaBreach,
        emailApprovalPending: updates.emailApprovalPending,
        emailApprovalReminder: updates.emailApprovalReminder,
        emailApprovalEscalation: updates.emailApprovalEscalation,
        emailLowStock: updates.emailLowStock,
        emailPmDue: updates.emailPmDue,
        emailBudgetThreshold: updates.emailBudgetThreshold,
        emailScheduledReport: updates.emailScheduledReport,
        emailEmergencyJob: updates.emailEmergencyJob,
        emailJobCardCreated: updates.emailJobCardCreated,
        emailJobCardCompleted: updates.emailJobCardCompleted,
        
        // In-app settings
        inAppEnabled: updates.inAppEnabled,
        inAppSlaWarning: updates.inAppSlaWarning,
        inAppSlaBreach: updates.inAppSlaBreach,
        inAppApprovalPending: updates.inAppApprovalPending,
        inAppApprovalReminder: updates.inAppApprovalReminder,
        inAppApprovalEscalation: updates.inAppApprovalEscalation,
        inAppLowStock: updates.inAppLowStock,
        inAppPmDue: updates.inAppPmDue,
        inAppBudgetThreshold: updates.inAppBudgetThreshold,
        inAppScheduledReport: updates.inAppScheduledReport,
        inAppEmergencyJob: updates.inAppEmergencyJob,
        inAppJobCardCreated: updates.inAppJobCardCreated,
        inAppJobCardCompleted: updates.inAppJobCardCompleted,
        
        // Quiet hours
        quietHoursEnabled: updates.quietHoursEnabled,
        quietHoursStart: updates.quietHoursStart,
        quietHoursEnd: updates.quietHoursEnd,
        quietHoursTimezone: updates.quietHoursTimezone,
        
        // Digest settings
        digestEnabled: updates.digestEnabled,
        digestFrequency: updates.digestFrequency,
        digestTime: updates.digestTime,
        digestDay: updates.digestDay,
        
        updatedAt: new Date(),
      },
      create: {
        userId,
        // Email settings
        emailEnabled: updates.emailEnabled ?? true,
        emailSlaWarning: updates.emailSlaWarning ?? true,
        emailSlaBreach: updates.emailSlaBreach ?? true,
        emailApprovalPending: updates.emailApprovalPending ?? true,
        emailApprovalReminder: updates.emailApprovalReminder ?? true,
        emailApprovalEscalation: updates.emailApprovalEscalation ?? true,
        emailLowStock: updates.emailLowStock ?? true,
        emailPmDue: updates.emailPmDue ?? true,
        emailBudgetThreshold: updates.emailBudgetThreshold ?? true,
        emailScheduledReport: updates.emailScheduledReport ?? true,
        emailEmergencyJob: updates.emailEmergencyJob ?? true,
        emailJobCardCreated: updates.emailJobCardCreated ?? true,
        emailJobCardCompleted: updates.emailJobCardCompleted ?? false,
        
        // In-app settings
        inAppEnabled: updates.inAppEnabled ?? true,
        inAppSlaWarning: updates.inAppSlaWarning ?? true,
        inAppSlaBreach: updates.inAppSlaBreach ?? true,
        inAppApprovalPending: updates.inAppApprovalPending ?? true,
        inAppApprovalReminder: updates.inAppApprovalReminder ?? true,
        inAppApprovalEscalation: updates.inAppApprovalEscalation ?? true,
        inAppLowStock: updates.inAppLowStock ?? true,
        inAppPmDue: updates.inAppPmDue ?? true,
        inAppBudgetThreshold: updates.inAppBudgetThreshold ?? true,
        inAppScheduledReport: updates.inAppScheduledReport ?? true,
        inAppEmergencyJob: updates.inAppEmergencyJob ?? true,
        inAppJobCardCreated: updates.inAppJobCardCreated ?? true,
        inAppJobCardCompleted: updates.inAppJobCardCompleted ?? true,
        
        // Quiet hours
        quietHoursEnabled: updates.quietHoursEnabled ?? false,
        quietHoursStart: updates.quietHoursStart,
        quietHoursEnd: updates.quietHoursEnd,
        quietHoursTimezone: updates.quietHoursTimezone,
        
        // Digest settings
        digestEnabled: updates.digestEnabled ?? true,
        digestFrequency: updates.digestFrequency ?? 'DAILY',
        digestTime: updates.digestTime ?? '09:00',
        digestDay: updates.digestDay,
      },
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Notification preferences updated',
      data: preferences 
    });
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/preferences (alias for POST)
export async function PUT(request: NextRequest) {
  return POST(request);
}
