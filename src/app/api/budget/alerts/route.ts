import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/budget/alerts - Get budget threshold alerts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const financialYear = searchParams.get('financialYear') || String(new Date().getFullYear());
    const threshold = parseFloat(searchParams.get('threshold') || '80'); // Default 80%

    const budgetLines = await db.budgetLine.findMany({
      where: { financialYear, isActive: true },
      orderBy: { code: 'asc' },
    });

    const alerts: Array<{
      id: string;
      code: string;
      name: string;
      department: string | null;
      revisedAmount: number;
      committedAmount: number;
      actualAmount: number;
      utilizedAmount: number;
      availableAmount: number;
      utilizationPercent: number;
      threshold: number;
      severity: 'WARNING' | 'CRITICAL' | 'EXCEEDED';
      message: string;
    }> = [];

    for (const line of budgetLines) {
      const revisedAmount = line.revisedAmount ? Number(line.revisedAmount) : Number(line.originalAmount);
      const committedAmount = Number(line.committedAmount);
      const actualAmount = Number(line.actualAmount);
      
      // Utilized = Committed + Actual
      const utilizedAmount = committedAmount + actualAmount;
      const availableAmount = revisedAmount - utilizedAmount;
      
      // Calculate utilization percentage
      const utilizationPercent = revisedAmount > 0 
        ? (utilizedAmount / revisedAmount) * 100 
        : 0;

      // Check if over threshold
      if (utilizationPercent >= threshold) {
        let severity: 'WARNING' | 'CRITICAL' | 'EXCEEDED';
        let message: string;

        if (utilizationPercent >= 100) {
          severity = 'EXCEEDED';
          message = `Budget exceeded by ${(utilizationPercent - 100).toFixed(1)}%`;
        } else if (utilizationPercent >= 90) {
          severity = 'CRITICAL';
          message = `Budget utilization at ${utilizationPercent.toFixed(1)}% - Immediate attention required`;
        } else {
          severity = 'WARNING';
          message = `Budget utilization at ${utilizationPercent.toFixed(1)}% - Approaching limit`;
        }

        alerts.push({
          id: line.id,
          code: line.code,
          name: line.name,
          department: line.department,
          revisedAmount,
          committedAmount,
          actualAmount,
          utilizedAmount,
          availableAmount,
          utilizationPercent: Math.round(utilizationPercent * 100) / 100,
          threshold,
          severity,
          message,
        });
      }
    }

    // Sort by severity then utilization percent
    alerts.sort((a, b) => {
      const severityOrder = { EXCEEDED: 0, CRITICAL: 1, WARNING: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.utilizationPercent - a.utilizationPercent;
    });

    // Summary
    const summary = {
      totalBudgetLines: budgetLines.length,
      alertCount: alerts.length,
      exceededCount: alerts.filter(a => a.severity === 'EXCEEDED').length,
      criticalCount: alerts.filter(a => a.severity === 'CRITICAL').length,
      warningCount: alerts.filter(a => a.severity === 'WARNING').length,
      totalAtRisk: alerts.reduce((sum, a) => sum + a.utilizedAmount, 0),
      totalOverBudget: alerts
        .filter(a => a.severity === 'EXCEEDED')
        .reduce((sum, a) => sum + Math.abs(a.availableAmount), 0),
    };

    return NextResponse.json({
      success: true,
      alerts,
      summary,
      financialYear,
      threshold,
    });
  } catch (error) {
    console.error('Failed to fetch budget alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget alerts' },
      { status: 500 }
    );
  }
}
