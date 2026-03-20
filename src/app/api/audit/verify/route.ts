import { NextRequest, NextResponse } from 'next/server';
import {
  verifyHashChain,
  verifySingleRecord,
  getHashChainStats,
  getTamperedRecords,
  getBlocksInRange,
  exportVerificationReport,
  rebuildHashChainFromBlock
} from '@/lib/audit-hash-chain';

/**
 * GET /api/audit/verify
 * Get verification status and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Get tampered records
    if (action === 'tampered') {
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const records = await getTamperedRecords(limit);
      return NextResponse.json({ data: records });
    }

    // Get blocks for block explorer
    if (action === 'blocks') {
      const start = parseInt(searchParams.get('start') || '1', 10);
      const end = parseInt(searchParams.get('end') || '20', 10);
      const blocks = await getBlocksInRange(start, end);
      return NextResponse.json({ data: blocks });
    }

    // Export verification report
    if (action === 'export') {
      const report = await exportVerificationReport();
      return NextResponse.json(report);
    }

    // Default: return stats
    const stats = await getHashChainStats();
    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Error in audit verify GET:', error);
    return NextResponse.json(
      { error: 'Failed to get verification data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/audit/verify
 * Run verification on entire chain or specific records
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, auditLogId, startBlock, endBlock, rebuildFromBlock } = body;

    // Verify single record
    if (action === 'verify_single' && auditLogId) {
      const isValid = await verifySingleRecord(auditLogId);
      return NextResponse.json({
        success: true,
        auditLogId,
        isValid
      });
    }

    // Rebuild hash chain from a block
    if (action === 'rebuild' && rebuildFromBlock) {
      const result = await rebuildHashChainFromBlock(rebuildFromBlock);
      return NextResponse.json(result);
    }

    // Verify chain (full or range)
    const start = startBlock ? parseInt(startBlock, 10) : undefined;
    const end = endBlock ? parseInt(endBlock, 10) : undefined;

    const result = await verifyHashChain(start, end);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error in audit verify POST:', error);
    return NextResponse.json(
      { error: 'Failed to run verification' },
      { status: 500 }
    );
  }
}
