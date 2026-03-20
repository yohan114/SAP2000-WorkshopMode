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
      const variance = revisedAmount - actualAmount;
      const variancePercent = revisedAmount > 0 
        ? (variance / revisedAmount) * 100 
        : 0;
      
      const utilizationPercent = revisedAmount > 0 
        ? ((committedAmount + actualAmount) / revisedAmount) * 100 
        : 0;

      // Status based on utilization
      let status: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EXCEEDED' = 'NORMAL';
      if (utilizationPercent > 100) {
        status = 'EXCEEDED';
      } else if (utilizationPercent >= 90) {
        status = 'CRITICAL';
      } else if (utilizationPercent >= 80) {
        status = 'WARNING';
      }

      return {
        id: line.id,
        code: line.code,
        name: line.name,
        department: line.department || 'Unassigned',
        financialYear: line.financialYear,
        originalAmount,
        revisedAmount,
        committedAmount,
        actualAmount,
        variance,
        variancePercent: Math.round(variancePercent * 100) / 100,
        status,
      };
    });

    // Summary statistics
    const summary = {
      totalBudgetLines: varianceReport.length,
      totalOriginal: varianceReport.reduce((sum, b) => sum + b.originalAmount, 0),
      totalRevised: varianceReport.reduce((sum, b) => sum + b.revisedAmount, 0),
      totalCommitted: varianceReport.reduce((sum, b) => sum + b.committedAmount, 0),
      totalActual: varianceReport.reduce((sum, b) => sum + b.actualAmount, 0),
      totalVariance: varianceReport.reduce((sum, b) => sum + b.variance, 0),
      totalAvailable: varianceReport.reduce((sum, b) => sum + (b.revisedAmount - b.committedAmount - b.actualAmount), 0),
      statusBreakdown: {
        normal: varianceReport.filter(b => b.status === 'NORMAL').length,
        warning: varianceReport.filter(b => b.status === 'WARNING').length,
        critical: varianceReport.filter(b => b.status === 'CRITICAL').length,
        exceeded: varianceReport.filter(b => b.status === 'EXCEEDED').length,
      }
    };

    // Group by department
    const byDepartmentMap = varianceReport.reduce((acc, line) => {
      const dept = line.department;
      if (!acc[dept]) {
        acc[dept] = {
          department: dept,
          budgetLines: [],
          totals: {
            originalAmount: 0,
            revisedAmount: 0,
            committedAmount: 0,
            actualAmount: 0,
            variance: 0,
            variancePercent: 0,
          }
        };
      }
      acc[dept].budgetLines.push(line);
      acc[dept].totals.originalAmount += line.originalAmount;
      acc[dept].totals.revisedAmount += line.revisedAmount;
      acc[dept].totals.committedAmount += line.committedAmount;
      acc[dept].totals.actualAmount += line.actualAmount;
      acc[dept].totals.variance += line.variance;
      return acc;
    }, {} as Record<string, any>);
    
    // Calculate final variance percent for each dept
    Object.values(byDepartmentMap).forEach((dept: any) => {
      if (dept.totals.revisedAmount > 0) {
         dept.totals.variancePercent = Math.round((dept.totals.variance / dept.totals.revisedAmount) * 10000) / 100;
      }
    });

    const byDepartment = Object.values(byDepartmentMap);

    // Chart data
    const chartData = byDepartment.map((dept: any) => ({
      department: dept.department,
      original: dept.totals.originalAmount,
      revised: dept.totals.revisedAmount,
      actual: dept.totals.actualAmount,
      variance: dept.totals.variance,
      count: dept.budgetLines.length,
    }));

    return NextResponse.json({
      varianceData: varianceReport,
      summary,
      byDepartment,
      chartData,
    });
  } catch (error) {
    console.error('Failed to generate variance report:', error);
    return NextResponse.json(
      { error: 'Failed to generate variance report' },
      { status: 500 }
    );
  }
}
