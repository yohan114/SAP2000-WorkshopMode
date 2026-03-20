import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

// GET /api/budget - List all budget lines
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
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    // Calculate available amount for each line
    const budgetWithCalculated = budgetLines.map(line => {
      const originalAmount = Number(line.originalAmount);
      const revisedAmount = line.revisedAmount ? Number(line.revisedAmount) : originalAmount;
      const committedAmount = Number(line.committedAmount);
      const actualAmount = Number(line.actualAmount);
      
      // Available = Revised - Committed - Actual
      const calculatedAvailable = revisedAmount - committedAmount - actualAmount;
      
      // Calculate utilization percentage
      const utilizedAmount = committedAmount + actualAmount;
      const utilizationPercent = revisedAmount > 0 
        ? (utilizedAmount / revisedAmount) * 100 
        : 0;

      return {
        ...line,
        originalAmount,
        revisedAmount,
        committedAmount,
        actualAmount,
        availableAmount: calculatedAvailable,
        utilizationPercent: Math.round(utilizationPercent * 100) / 100,
        transactionCount: line._count.transactions,
      };
    });

    // Calculate totals
    const totals = {
      originalAmount: budgetWithCalculated.reduce((sum, b) => sum + b.originalAmount, 0),
      revisedAmount: budgetWithCalculated.reduce((sum, b) => sum + b.revisedAmount, 0),
      committedAmount: budgetWithCalculated.reduce((sum, b) => sum + b.committedAmount, 0),
      actualAmount: budgetWithCalculated.reduce((sum, b) => sum + b.actualAmount, 0),
      availableAmount: budgetWithCalculated.reduce((sum, b) => sum + b.availableAmount, 0),
    };

    return NextResponse.json({
      success: true,
      data: budgetWithCalculated,
      totals,
      financialYear,
    });
  } catch (error) {
    console.error('Failed to fetch budget lines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget lines' },
      { status: 500 }
    );
  }
}

// POST /api/budget - Create a new budget line
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      code,
      name,
      department,
      financialYear,
      originalAmount,
    } = body;

    // Validate required fields
    if (!code || !name || !financialYear || originalAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name, financialYear, originalAmount' },
        { status: 400 }
      );
    }

    // Check if code already exists for this financial year
    const existing = await db.budgetLine.findFirst({
      where: { code, financialYear },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Budget code already exists for this financial year' },
        { status: 400 }
      );
    }

    const budgetLine = await db.budgetLine.create({
      data: {
        code,
        name,
        department,
        financialYear,
        originalAmount: new Decimal(originalAmount),
        revisedAmount: new Decimal(originalAmount),
        committedAmount: new Decimal(0),
        actualAmount: new Decimal(0),
        availableAmount: new Decimal(originalAmount),
      },
    });

    return NextResponse.json({
      success: true,
      data: budgetLine,
    });
  } catch (error) {
    console.error('Failed to create budget line:', error);
    return NextResponse.json(
      { error: 'Failed to create budget line' },
      { status: 500 }
    );
  }
}
