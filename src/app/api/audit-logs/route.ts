/**
 * Audit Logs API Route
 * 
 * Handles retrieval of audit logs for the photo management system.
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError, apiPaginated, getSkip } from '@/lib/api-utils';

// GET /api/audit-logs - Get audit logs with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = getSkip(page, limit);

    // Filter parameters
    const jobCardId = searchParams.get('jobCardId');
    const photoId = searchParams.get('photoId');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    // Build where clause
    const where: Record<string, unknown> = {};

    if (jobCardId) {
      where.jobCardId = jobCardId;
    }

    if (photoId) {
      where.photoId = photoId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(fromDate);
      }
      if (toDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(toDate);
      }
    }

    // Get total count
    const total = await db.photoAuditLog.count({ where });

    // Get audit logs
    const logs = await db.photoAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Parse JSON fields
    const parsedLogs = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
      oldValue: log.oldValue ? JSON.parse(log.oldValue) : null,
      newValue: log.newValue ? JSON.parse(log.newValue) : null,
    }));

    return apiPaginated(parsedLogs, total, page, limit);
  } catch (error) {
    console.error('Get audit logs error:', error);
    return apiError('Failed to fetch audit logs', 500);
  }
}
