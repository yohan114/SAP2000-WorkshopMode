import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

// GET /api/budget/[id] - Get a single budget line with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const budgetLine = await db.budgetLine.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!budgetLine) {
      return NextResponse.json(
        { error: 'Budget line not found' },
        { status: 404 }
      );
    }

    // Calculate derived values
    const originalAmount = Number(budgetLine.originalAmount);
    const revisedAmount = budgetLine.revisedAmount ? Number(budgetLine.revisedAmount) : originalAmount;
    const committedAmount = Number(budgetLine.committedAmount);
    const actualAmount = Number(budgetLine.actualAmount);
    const utilizedAmount = committedAmount + actualAmount;
    const availableAmount = revisedAmount - utilizedAmount;
    const utilizationPercent = revisedAmount > 0 
      ? (utilizedAmount / revisedAmount) * 100 
      : 0;

    // Group transactions by type
    const transactionsByType = budgetLine.transactions.reduce((acc, t) => {
      const type = t.transactionType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push({
        ...t,
        amount: Number(t.amount),
      });
      return acc;
    }, {} as Record<string, unknown[]>);

    // Calculate transaction summaries
    const transactionSummary = {
      totalCommitments: budgetLine.transactions
        .filter(t => t.transactionType === 'COMMITMENT')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      totalActuals: budgetLine.transactions
        .filter(t => t.transactionType === 'ACTUAL')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      totalReleases: budgetLine.transactions
        .filter(t => t.transactionType === 'RELEASE')
        .reduce((sum, t) => sum + Number(t.amount), 0),
      transactionCount: budgetLine.transactions.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...budgetLine,
        originalAmount,
        revisedAmount,
        committedAmount,
        actualAmount,
        utilizedAmount,
        availableAmount,
        utilizationPercent: Math.round(utilizationPercent * 100) / 100,
        transactionsByType,
        transactionSummary,
      },
    });
  } catch (error) {
    console.error('Failed to fetch budget line:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget line' },
      { status: 500 }
    );
  }
}

// PUT /api/budget/[id] - Update a budget line
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, department, revisedAmount, isActive } = body;

    const budgetLine = await db.budgetLine.findUnique({
      where: { id },
    });

    if (!budgetLine) {
      return NextResponse.json(
        { error: 'Budget line not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (department !== undefined) updateData.department = department;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (revisedAmount !== undefined) {
      updateData.revisedAmount = new Decimal(revisedAmount);
    }

    const updated = await db.budgetLine.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Failed to update budget line:', error);
    return NextResponse.json(
      { error: 'Failed to update budget line' },
      { status: 500 }
    );
  }
}

// DELETE /api/budget/[id] - Soft delete a budget line
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const budgetLine = await db.budgetLine.findUnique({
      where: { id },
    });

    if (!budgetLine) {
      return NextResponse.json(
        { error: 'Budget line not found' },
        { status: 404 }
      );
    }

    // Check for existing transactions
    const transactionCount = await db.budgetTransaction.count({
      where: { budgetLineId: id },
    });

    if (transactionCount > 0) {
      // Soft delete - just mark as inactive
      await db.budgetLine.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        message: 'Budget line deactivated (has existing transactions)',
      });
    }

    // Hard delete if no transactions
    await db.budgetLine.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Budget line deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete budget line:', error);
    return NextResponse.json(
      { error: 'Failed to delete budget line' },
      { status: 500 }
    );
  }
}
