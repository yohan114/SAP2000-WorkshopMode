import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import {
  apiSuccess,
  apiError,
  apiNotFound,
  apiValidationError,
  handleApiError,
} from '@/lib/api-utils';
import { auditLog } from '@/lib/audit';

// Password strength regex
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Validation schemas
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(PASSWORD_REGEX, 'Password must contain uppercase, lowercase, number, and special character'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const resetPasswordSchema = z.object({
  adminId: z.string().min(1, 'Admin ID is required'), // The admin performing the reset
  reason: z.string().min(1, 'Reason for password reset is required'),
});

// Generate a random temporary password
function generateTemporaryPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '@$!%*?&';
  
  let password = '';
  
  // Ensure at least one of each required character type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest with random characters
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// PUT /api/users/[id]/password - Change password (requires current password verification)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = changePasswordSchema.parse(body);

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!user) {
      return apiNotFound('User');
    }

    if (!user.isActive) {
      return apiError('Cannot change password for inactive user', 400);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      validatedData.currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      return apiError('Current password is incorrect', 400);
    }

    // Check that new password is different from current
    const isSamePassword = await bcrypt.compare(
      validatedData.newPassword,
      user.passwordHash
    );

    if (isSamePassword) {
      return apiError('New password must be different from current password', 400);
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(validatedData.newPassword, saltRounds);

    // Update password
    await db.user.update({
      where: { id },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    });

    // Invalidate all sessions except current (optional - for security)
    // This would require session management implementation

    await auditLog({
      action: 'UPDATE',
      entityType: 'USER',
      entityId: id,
      newValue: { passwordChanged: true },
    });

    return apiSuccess({ success: true }, 'Password changed successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error);
    }
    return handleApiError(error);
  }
}

// POST /api/users/[id]/password - Reset password (admin only, generates temporary password)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = resetPasswordSchema.parse(body);

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        employeeId: true,
        isActive: true,
      },
    });

    if (!targetUser) {
      return apiNotFound('User');
    }

    // Verify admin exists and has privilege (simplified check - in production, verify actual admin privileges)
    const admin = await db.user.findUnique({
      where: { id: validatedData.adminId },
      select: {
        id: true,
        email: true,
        name: true,
        roles: {
          where: { isActive: true },
          include: {
            role: {
              select: {
                code: true,
                level: true,
              },
            },
          },
        },
      },
    });

    if (!admin) {
      return apiError('Admin user not found', 404);
    }

    // Check if admin has appropriate role (e.g., ADMIN role or level >= 8)
    const isAdmin = admin.roles.some(ur => 
      ur.role.code === 'ADMIN' || ur.role.level >= 8
    );

    if (!isAdmin) {
      return apiError('Only administrators can reset passwords', 403);
    }

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();

    // Hash temporary password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(temporaryPassword, saltRounds);

    // Update user's password
    await db.user.update({
      where: { id },
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
    });

    // Invalidate all existing sessions for this user
    await db.userSession.updateMany({
      where: {
        userId: id,
        isValid: true,
      },
      data: {
        isValid: false,
      },
    });

    await auditLog({
      action: 'UPDATE',
      entityType: 'USER',
      entityId: id,
      newValue: {
        resetBy: validatedData.adminId,
        reason: validatedData.reason,
        temporaryPasswordGenerated: true,
      },
    });

    return apiSuccess({
      success: true,
      temporaryPassword,
      message: 'Password reset successfully. User must change password on next login.',
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        employeeId: targetUser.employeeId,
      },
    }, 'Password reset successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error);
    }
    return handleApiError(error);
  }
}
