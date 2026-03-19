import { NextRequest, NextResponse } from 'next/server';

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
export async function GET(request: NextRequest) {
  try {
    // Return default notification preferences
    // In a real app, these would be stored per user
    const preferences = {
      email: {
        jobCardCreated: true,
        jobCardCompleted: true,
        mrApproved: true,
        lowStock: true,
        emergencyJob: true,
      },
      inApp: {
        jobCardCreated: true,
        jobCardCompleted: true,
        mrApproved: true,
        lowStock: true,
        emergencyJob: true,
      },
      push: {
        jobCardCreated: false,
        jobCardCompleted: false,
        mrApproved: true,
        lowStock: true,
        emergencyJob: true,
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00',
      },
    };

    return NextResponse.json({ data: preferences, preferences });
  } catch (error) {
    console.error('Failed to fetch notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // In a real app, save to database
    // For now, just return success
    return NextResponse.json({ 
      success: true,
      message: 'Preferences updated',
      data: body 
    });
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
