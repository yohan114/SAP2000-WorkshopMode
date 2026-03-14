import { db } from '@/lib/db';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-utils';

// GET /api/users/me - Get current user profile
export async function GET(request: Request) {
  try {
    // In a real implementation, this would use getServerSession
    // For now, we'll use a header-based simulation
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return apiUnauthorized();
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                privileges: {
                  where: { isGranted: true },
                  include: {
                    privilege: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return apiUnauthorized();
    }

    // Transform roles and privileges
    const roles = user.roles.map(ur => ({
      code: ur.role.code,
      name: ur.role.name,
      level: ur.role.level,
    }));

    const privileges = user.roles.flatMap(ur =>
      ur.role.privileges.map(p => p.privilege.code)
    );

    return apiSuccess({
      id: user.id,
      employeeId: user.employeeId,
      email: user.email,
      name: user.name,
      phone: user.phone,
      department: user.department,
      costCentre: user.costCentre,
      contractType: user.contractType,
      riskLevel: user.riskLevel,
      lastLoginAt: user.lastLoginAt,
      roles,
      privileges,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return apiError('Failed to fetch user profile', 500);
  }
}
