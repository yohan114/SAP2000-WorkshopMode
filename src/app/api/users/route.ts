import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import {
  apiSuccess,
  apiPaginated,
  apiError,
  apiValidationError,
  parsePagination,
  getSkip,
  handleApiError,
} from '@/lib/api-utils';
import { auditLog, AuditAction } from '@/lib/audit';

// Password strength regex
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Validation schema for user creation
const createUserSchema = z.object({
  employeeId: z.string().optional().nullable(),
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(PASSWORD_REGEX, 'Password must contain uppercase, lowercase, number, and special character'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  costCentre: z.string().optional().nullable(),
  contractType: z.string().optional().nullable(),
  riskLevel: z.string().default('LOW'),
  roleIds: z.array(z.string()).optional().default([]),
});

// GET /api/users - List users with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const { page, limit, search, sortBy, sortOrder } = parsePagination(url);
    const skip = getSkip(page, limit);

    // Additional filters
    const department = url.searchParams.get('department');
    const status = url.searchParams.get('status'); // 'active', 'inactive', 'all'
    const roleId = url.searchParams.get('roleId');

    // Build where clause
    const where: Record<string, unknown> = {};

    // Status filter
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }
    // If status is 'all' or not specified, don't filter by isActive

    // Department filter
    if (department) {
      where.department = department;
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { employeeId: { contains: search } },
        { department: { contains: search } },
      ];
    }

    // Role filter (using relation)
    if (roleId) {
      where.roles = {
        some: {
          roleId,
          isActive: true,
        },
      };
    }

    // Build orderBy
    const orderBy: Record<string, unknown>[] = [];
    if (sortBy) {
      orderBy.push({ [sortBy]: sortOrder });
    }
    orderBy.push({ name: 'asc' });

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          employeeId: true,
          name: true,
          email: true,
          phone: true,
          department: true,
          costCentre: true,
          contractType: true,
          riskLevel: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            where: { isActive: true },
            select: {
              id: true,
              role: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  level: true,
                },
              },
            },
          },
          _count: {
            select: {
              roles: {
                where: { isActive: true },
              },
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    // Get unique departments for filter dropdown
    const departments = await db.user.findMany({
      where: { department: { not: null } },
      select: { department: true },
      distinct: ['department'],
    });

    // Format response
    const formattedUsers = users.map(user => ({
      ...user,
      roles: user.roles.map(r => ({
        id: r.role.id,
        code: r.role.code,
        name: r.role.name,
        level: r.role.level,
      })),
      roleCount: user._count.roles,
      _count: undefined,
    }));

    return apiPaginated(formattedUsers, total, page, limit);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // Check if email already exists
    const existingEmail = await db.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingEmail) {
      return apiError('Email already in use', 400);
    }

    // Check if employeeId already exists (if provided)
    if (validatedData.employeeId) {
      const existingEmployee = await db.user.findUnique({
        where: { employeeId: validatedData.employeeId },
      });

      if (existingEmployee) {
        return apiError('Employee ID already in use', 400);
      }
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(validatedData.password, saltRounds);

    // Create user with roles in transaction
    const user = await db.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          employeeId: validatedData.employeeId,
          email: validatedData.email,
          passwordHash,
          name: validatedData.name,
          phone: validatedData.phone,
          department: validatedData.department,
          costCentre: validatedData.costCentre,
          contractType: validatedData.contractType,
          riskLevel: validatedData.riskLevel || 'LOW',
          isActive: true,
        },
        select: {
          id: true,
          employeeId: true,
          email: true,
          name: true,
          phone: true,
          department: true,
          costCentre: true,
          contractType: true,
          riskLevel: true,
          isActive: true,
          createdAt: true,
        },
      });

      // Assign roles if provided
      if (validatedData.roleIds && validatedData.roleIds.length > 0) {
        // Verify all roles exist
        const roles = await tx.role.findMany({
          where: {
            id: { in: validatedData.roleIds },
            isActive: true,
          },
          select: { id: true },
        });

        if (roles.length !== validatedData.roleIds.length) {
          throw new Error('Invalid role IDs provided');
        }

        // Create role assignments
        await tx.userRole.createMany({
          data: validatedData.roleIds.map(roleId => ({
            userId: newUser.id,
            roleId,
            isActive: true,
          })),
        });
      }

      return newUser;
    });

    // Fetch user with roles for response
    const userWithRoles = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        employeeId: true,
        email: true,
        name: true,
        phone: true,
        department: true,
        costCentre: true,
        contractType: true,
        riskLevel: true,
        isActive: true,
        createdAt: true,
        roles: {
          where: { isActive: true },
          select: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                level: true,
              },
            },
          },
        },
      },
    });

    await auditLog({
      action: AuditAction.CREATE,
      entityType: 'User',
      entityId: user.id,
      newData: {
        email: user.email,
        name: user.name,
        department: user.department,
        roleIds: validatedData.roleIds,
      },
    });

    return apiSuccess(userWithRoles, 'User created successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error);
    }
    if (error instanceof Error && error.message === 'Invalid role IDs provided') {
      return apiError(error.message, 400);
    }
    return handleApiError(error);
  }
}
