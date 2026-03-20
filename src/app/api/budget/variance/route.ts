import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/budget/variance - Get budget variance report
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const financialYear = searchParams.get('financialYear') || String(new Date().getFullYear());
    const department = searchParams.get('department');

    const where: Record<string, unknown> = { financialYear, isActive: true };
    if (department) where.department = department;

    const budgetLines = await db.budgetLine.findMany({
      where,
      include: {
        transactions: true,
      },
      orderBy: { code: 'asc' },
    });

    // Calculate variance for each budget line
    const varianceReport = budgetLines.map(line => {
      const originalAmount = Number(line.originalAmount);
      const revisedAmount = line.revisedAmount ? Number(line.revisedAmount) : originalAmount;
      const committedAmount = Number(line.committedAmount);
      const actualAmount = Number(line.actualAmount);
      
      // Variance = Budget - Actual
      const budgetVariance = revisedAmount - actualAmount;
      const variancePercent = revisedAmount > 0 
        ? (budgetVariance / revisedAmount) * 100 
        : 0;
      
      // Status based on variance
      let status: 'OVER_BUDGET' | 'ON_TRACK' | 'UNDER_BUDGET' = 'ON_TRACK';
      if (variancePercent < -10) {
        status = 'OVER_BUDGET';
      } else if (variancePercent > 10) {
        status = 'UNDER_BUDGET';
      }

      // Calculate commitment rate (committed / revised)
      const commitmentRate = revisedAmount > 0 
        ? (committedAmount / revisedAmount) * 100 
        : 0;

      return {
        id: line.id,
        code: line.code,
        name: line.name,
        department: line.department,
        originalAmount,
        revisedAmount,
        committedAmount,
        actualAmount,
        budgetVariance,
        variancePercent: Math.round(variancePercent * 100) / 100,
        commitmentRate: Math.round(commitmentRate * 100) / 100,
        status,
        transactionCount: line.transactions.length,
      };
    });

    // Summary statistics
    const summary = {
      totalBudget: varianceReport.reduce((sum, b) => sum + b.revisedAmount, 0),
      totalCommitted: varianceReport.reduce((sum, b) => sum + b.committedAmount, 0),
      totalActual: varianceReport.reduce((sum, b) => sum + b.actualAmount, 0),
      totalVariance: varianceReport.reduce((sum, b) => sum + b.budgetVariance, 0),
      overBudgetCount: varianceReport.filter(b => b.status === 'OVER_BUDGET').length,
      onTrackCount: varianceReport.filter(b => b.status === 'ON_TRACK').length,
      underBudgetCount: varianceReport.filter(b => b.status === 'UNDER_BUDGET').length,
    };

    // Group by department
    const byDepartment = varianceReport.reduce((acc, line) => {
      const dept = line.department || 'Unassigned';
      if (!acc[dept]) {
        acc[dept] = {
          count: 0,
          totalBudget: 0,
          totalActual: 0,
          totalVariance: 0,
        };
      }
      acc[dept].count++;
      acc[dept].totalBudget += line.revisedAmount;
      acc[dept].totalActual += line.actualAmount;
      acc[dept].totalVariance += line.budgetVariance;
      return acc;
    }, {} as Record<string, { count: number; totalBudget: number; totalActual: number; totalVariance: number }>);

    return NextResponse.json({
      success: true,
      data: varianceReport,
      summary,
      byDepartment,
      financialYear,
    });
  } catch (error) {
    console.error('Failed to generate variance report:', error);
    return NextResponse.json(
      { error: 'Failed to generate variance report' },
      { status: 500 }
    );
  }
}
