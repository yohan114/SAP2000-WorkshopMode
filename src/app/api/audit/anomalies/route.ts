import { NextRequest, NextResponse } from 'next/server';

/**
 * @openapi
 * /audit/anomalies:
 *   get:
 *     tags:
 *       - Audit
 *     summary: Get detected anomalies
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of anomalies
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');

    // For now, return mock anomaly data based on audit patterns
    // In a real system, this would query an AnomalyDetection table
    const anomalies = [
      {
        id: '1',
        type: 'UNUSUAL_LOGIN_TIME',
        severity: 'MEDIUM',
        description: 'Login detected outside normal working hours',
        entityId: null,
        entityType: 'USER',
        status: 'OPEN',
        detectedAt: new Date(Date.now() - 3600000).toISOString(),
        resolvedAt: null,
        resolution: null,
      },
      {
        id: '2',
        type: 'BULK_DELETE',
        severity: 'HIGH',
        description: 'Multiple records deleted in short time period',
        entityId: null,
        entityType: 'INVENTORY',
        status: 'OPEN',
        detectedAt: new Date(Date.now() - 7200000).toISOString(),
        resolvedAt: null,
        resolution: null,
      },
      {
        id: '3',
        type: 'FAILED_LOGIN_ATTEMPTS',
        severity: 'CRITICAL',
        description: '5 failed login attempts from same IP',
        entityId: 'user-123',
        entityType: 'USER',
        status: 'INVESTIGATING',
        detectedAt: new Date(Date.now() - 1800000).toISOString(),
        resolvedAt: null,
        resolution: null,
      },
    ];

    let filtered = anomalies;
    if (status) {
      filtered = filtered.filter(a => a.status === status);
    }
    if (severity) {
      filtered = filtered.filter(a => a.severity === severity);
    }

    return NextResponse.json({ data: filtered, anomalies: filtered });
  } catch (error) {
    console.error('Failed to fetch anomalies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anomalies' },
      { status: 500 }
    );
  }
}
