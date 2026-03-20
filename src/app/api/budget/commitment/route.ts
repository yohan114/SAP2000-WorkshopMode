import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

// POST /api/budget/commitment - Create a budget commitment (encumbrance)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      budgetLineId,
      amount,
      referenceType, // PO, GRN, INVOICE, JOB_CARD
      referenceId,
      description,
    } = body;

    // Validate required fields
    if (!budgetLineId || !amount || !referenceType) {
      return NextResponse.json(
        { error: 'Missing required fields: budgetLineId, amount, referenceType' },
        { status: 400 }
      );
    }

    // Validate reference type
    const validRefTypes = ['PO', 'GRN', 'INVOICE', 'JOB_CARD', 'MANUAL'];
    if (!validRefTypes.includes(referenceType)) {
      return NextResponse.json(
        { error: `Invalid reference type. Valid types: ${validRefTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Get the budget line
    const budgetLine = await db.budgetLine.findUnique({
      where: { id: budgetLineId },
    });

    if (!budgetLine) {
      return NextResponse.json(
        { error: 'Budget line not found' },
        { status: 404 }
      );
    }

    const amountDecimal = new Decimal(amount);
    const currentCommitted = Number(budgetLine.committedAmount);
    const currentActual = Number(budgetLine.actualAmount);
    const revisedAmount = budgetLine.revisedAmount ? Number(budgetLine.revisedAmount) : Number(budgetLine.originalAmount);

    // Check if sufficient budget is available
    const available = revisedAmount - currentCommitted - currentActual;
    if (Number(amountDecimal) > available) {
      return NextResponse.json(
        { 
          error: 'Insufficient budget available',
          details: {
            requested: Number(amountDecimal),
            available,
            budgetLine: budgetLine.code,
          }
        },
        { status: 400 }
      );
    }

    // Create the transaction
    const transaction = await db.budgetTransaction.create({
      data: {
        budgetLineId,
        transactionType: 'COMMITMENT',
        amount: amountDecimal,
        referenceType,
        referenceId,
        description: description || `Commitment for ${referenceType}${referenceId ? ` ${referenceId}` : ''}`,
      },
    });

    // Update budget line committed amount
    const newCommittedAmount = new Decimal(currentCommitted + Number(amountDecimal));
    const newAvailableAmount = new Decimal(revisedAmount - currentActual - Number(amountDecimal));
    
    await db.budgetLine.update({
      where: { id: budgetLineId },
      data: {
        committedAmount: newCommittedAmount,
        availableAmount: newAvailableAmount,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        transaction,
        budgetLine: {
          code: budgetLine.code,
          name: budgetLine.name,
          previousCommitted: currentCommitted,
          newCommitted: Number(newCommittedAmount),
          available: Number(newAvailableAmount),
        },
      },
    });
  } catch (error) {
    console.error('Failed to create commitment:', error);
    return NextResponse.json(
      { error: 'Failed to create commitment' },
      { status: 500 }
    );
  }
}

// DELETE /api/budget/commitment - Release a commitment
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const referenceType = searchParams.get('referenceType');
    const referenceId = searchParams.get('referenceId');

    if (!transactionId && (!referenceType || !referenceId)) {
      return NextResponse.json(
        { error: 'Provide either transactionId or referenceType + referenceId' },
        { status: 400 }
      );
    }

    // Find the commitment transaction
    let transaction;
    if (transactionId) {
      transaction = await db.budgetTransaction.findUnique({
        where: { id: transactionId },
        include: { budgetLine: true },
      });
    } else {
      transaction = await db.budgetTransaction.findFirst({
        where: {
          referenceType,
          referenceId,
          transactionType: 'COMMITMENT',
        },
        include: { budgetLine: true },
      });
    }

    if (!transaction) {
      return NextResponse.json(
        { error: 'Commitment transaction not found' },
        { status: 404 }
      );
    }

    // Create a release transaction
    const releaseTransaction = await db.budgetTransaction.create({
      data: {
        budgetLineId: transaction.budgetLineId,
        transactionType: 'RELEASE',
        amount: transaction.amount,
        referenceType: transaction.referenceType,
        referenceId: transaction.referenceId,
        description: `Release of commitment ${transaction.id}`,
      },
    });

    // Update budget line
    const currentCommitted = Number(transaction.budgetLine.committedAmount);
    const releaseAmount = Number(transaction.amount);
    
    await db.budgetLine.update({
      where: { id: transaction.budgetLineId },
      data: {
        committedAmount: new Decimal(currentCommitted - releaseAmount),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        releaseTransaction,
        releasedAmount: releaseAmount,
        budgetLineCode: transaction.budgetLine.code,
      },
    });
  } catch (error) {
    console.error('Failed to release commitment:', error);
    return NextResponse.json(
      { error: 'Failed to release commitment' },
      { status: 500 }
    );
  }
}

// PUT /api/budget/commitment - Convert commitment to actual
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      budgetLineId,
      committedAmount, // Amount from commitment to convert
      actualAmount, // Actual amount (may differ from committed)
      referenceType,
      referenceId,
      description,
    } = body;

    if (!budgetLineId || actualAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: budgetLineId, actualAmount' },
        { status: 400 }
      );
    }

    const budgetLine = await db.budgetLine.findUnique({
      where: { id: budgetLineId },
    });

    if (!budgetLine) {
      return NextResponse.json(
        { error: 'Budget line not found' },
        { status: 404 }
      );
    }

    const currentCommitted = Number(budgetLine.committedAmount);
    const currentActual = Number(budgetLine.actualAmount);
    const revisedAmount = budgetLine.revisedAmount ? Number(budgetLine.revisedAmount) : Number(budgetLine.originalAmount);

    // If we're converting from a commitment, reduce committed amount
    let newCommitted = currentCommitted;
    if (committedAmount) {
      newCommitted = currentCommitted - committedAmount;
    }

    // Create actual transaction
    const transaction = await db.budgetTransaction.create({
      data: {
        budgetLineId,
        transactionType: 'ACTUAL',
        amount: new Decimal(actualAmount),
        referenceType,
        referenceId,
        description: description || `Actual expense for ${referenceType}${referenceId ? ` ${referenceId}` : ''}`,
      },
    });

    // Update budget line
    const newActual = currentActual + Number(actualAmount);
    const newAvailable = revisedAmount - newCommitted - newActual;

    await db.budgetLine.update({
      where: { id: budgetLineId },
      data: {
        committedAmount: new Decimal(newCommitted),
        actualAmount: new Decimal(newActual),
        availableAmount: new Decimal(newAvailable),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        transaction,
        budgetLine: {
          code: budgetLine.code,
          name: budgetLine.name,
          committed: newCommitted,
          actual: newActual,
          available: newAvailable,
        },
      },
    });
  } catch (error) {
    console.error('Failed to record actual expense:', error);
    return NextResponse.json(
      { error: 'Failed to record actual expense' },
      { status: 500 }
    );
  }
}
