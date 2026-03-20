import crypto from 'crypto';
import { db } from '@/lib/db';

/**
 * Hash Chain Audit System
 * Implements cryptographic hash chain for audit log tamper detection.
 * Each audit record is linked to the previous one via hash chain,
 * making it computationally infeasible to tamper with audit records
 * without detection.
 */

export interface HashChainResult {
  currentHash: string;
  previousHash: string | null;
  blockNumber: number;
}

export interface VerificationResult {
  isValid: boolean;
  tamperedBlocks: number[];
  totalBlocks: number;
  verifiedBlocks: number;
  unverifiedBlocks: number;
}

export interface HashChainStats {
  totalBlocks: number;
  verifiedBlocks: number;
  unverifiedBlocks: number;
  tamperedBlocks: number;
  lastVerifiedAt: Date | null;
  chainStartAt: Date | null;
  chainEndAt: Date | null;
}

export interface AuditRecordForHash {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  createdAt: Date;
  oldValue?: string | null;
  newValue?: string | null;
}

/**
 * Calculate SHA-256 hash for an audit record
 * The hash includes all record data plus the previous hash in the chain
 */
export function calculateHash(
  record: AuditRecordForHash,
  previousHash: string | null
): string {
  // Build the data string for hashing
  // Format: id|action|entityType|entityId|actorId|timestamp|oldValue|newValue|previousHash
  const data = [
    record.id,
    record.action,
    record.entityType,
    record.entityId,
    record.actorId,
    record.createdAt.toISOString(),
    record.oldValue || '',
    record.newValue || '',
    previousHash || 'GENESIS'
  ].join('|');

  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Get the last block in the hash chain
 * Returns null if no blocks exist yet
 */
export async function getLastBlock(): Promise<{
  blockNumber: number;
  currentHash: string;
} | null> {
  const lastBlock = await db.auditLog.findFirst({
    where: {
      blockNumber: { not: null }
    },
    orderBy: { blockNumber: 'desc' },
    select: {
      blockNumber: true,
      currentHash: true
    }
  });

  return lastBlock ? {
    blockNumber: lastBlock.blockNumber!,
    currentHash: lastBlock.currentHash!
  } : null;
}

/**
 * Initialize hash chain for a new audit record
 * This should be called when creating a new audit log entry
 */
export async function initializeHashChain(record: AuditRecordForHash): Promise<HashChainResult> {
  const lastBlock = await getLastBlock();

  const blockNumber = lastBlock ? lastBlock.blockNumber + 1 : 1;
  const previousHash = lastBlock?.currentHash || null;
  const currentHash = calculateHash(record, previousHash);

  return {
    currentHash,
    previousHash,
    blockNumber
  };
}

/**
 * Update an audit log record with hash chain data
 * This should be called after creating the audit log
 */
export async function updateAuditLogWithHash(
  auditLogId: string,
  hashChainResult: HashChainResult
): Promise<void> {
  await db.auditLog.update({
    where: { id: auditLogId },
    data: {
      currentHash: hashChainResult.currentHash,
      previousHash: hashChainResult.previousHash,
      blockNumber: hashChainResult.blockNumber,
      verificationStatus: 'UNVERIFIED'
    }
  });
}

/**
 * Verify the entire hash chain integrity
 * Optionally verify a specific range of blocks
 */
export async function verifyHashChain(
  startBlock?: number,
  endBlock?: number
): Promise<VerificationResult> {
  // Get all audit logs ordered by block number
  const whereClause: Record<string, unknown> = {
    blockNumber: { not: null }
  };

  if (startBlock !== undefined || endBlock !== undefined) {
    whereClause.blockNumber = {};
    if (startBlock !== undefined) {
      (whereClause.blockNumber as Record<string, unknown>).gte = startBlock;
    }
    if (endBlock !== undefined) {
      (whereClause.blockNumber as Record<string, unknown>).lte = endBlock;
    }
  }

  const auditLogs = await db.auditLog.findMany({
    where: whereClause,
    orderBy: { blockNumber: 'asc' },
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      actorId: true,
      createdAt: true,
      oldValue: true,
      newValue: true,
      currentHash: true,
      previousHash: true,
      blockNumber: true
    }
  });

  const tamperedBlocks: number[] = [];
  let previousHash: string | null = null;
  const now = new Date();

  // Use a transaction for the verification updates
  await db.$transaction(async (tx) => {
    for (const log of auditLogs) {
      const record: AuditRecordForHash = {
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actorId: log.actorId,
        createdAt: log.createdAt,
        oldValue: log.oldValue,
        newValue: log.newValue
      };

      // Calculate expected hash
      const expectedHash = calculateHash(record, previousHash);

      // For the first block, previousHash should be null
      const isGenesisBlock = log.blockNumber === 1;

      if (isGenesisBlock) {
        // Genesis block should have null previousHash
        if (log.previousHash !== null) {
          tamperedBlocks.push(log.blockNumber!);
          await tx.auditLog.update({
            where: { id: log.id },
            data: {
              verificationStatus: 'TAMPERED',
              verifiedAt: now
            }
          });
        } else if (log.currentHash !== expectedHash) {
          tamperedBlocks.push(log.blockNumber!);
          await tx.auditLog.update({
            where: { id: log.id },
            data: {
              verificationStatus: 'TAMPERED',
              verifiedAt: now
            }
          });
        } else {
          await tx.auditLog.update({
            where: { id: log.id },
            data: {
              verificationStatus: 'VERIFIED',
              verifiedAt: now
            }
          });
          previousHash = log.currentHash;
        }
      } else {
        // Non-genesis blocks
        // Check if hash chain is valid
        if (log.previousHash !== previousHash || log.currentHash !== expectedHash) {
          tamperedBlocks.push(log.blockNumber!);
          await tx.auditLog.update({
            where: { id: log.id },
            data: {
              verificationStatus: 'TAMPERED',
              verifiedAt: now
            }
          });
          // Continue with the stored hash for chain continuity check
          previousHash = log.currentHash;
        } else {
          await tx.auditLog.update({
            where: { id: log.id },
            data: {
              verificationStatus: 'VERIFIED',
              verifiedAt: now
            }
          });
          previousHash = expectedHash;
        }
      }
    }
  });

  const totalBlocks = auditLogs.length;
  const verifiedBlocks = totalBlocks - tamperedBlocks.length;

  return {
    isValid: tamperedBlocks.length === 0,
    tamperedBlocks,
    totalBlocks,
    verifiedBlocks,
    unverifiedBlocks: 0 // All blocks are verified after this
  };
}

/**
 * Verify a single audit log record
 * Checks if the record's hash is consistent with its predecessor
 */
export async function verifySingleRecord(auditLogId: string): Promise<boolean> {
  const record = await db.auditLog.findUnique({
    where: { id: auditLogId },
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      actorId: true,
      createdAt: true,
      oldValue: true,
      newValue: true,
      currentHash: true,
      previousHash: true,
      blockNumber: true
    }
  });

  if (!record || !record.blockNumber) {
    return false;
  }

  // Get the previous record
  let previousHash: string | null = null;

  if (record.blockNumber > 1) {
    const previousRecord = await db.auditLog.findFirst({
      where: {
        blockNumber: record.blockNumber - 1
      },
      select: {
        currentHash: true
      }
    });

    if (!previousRecord || !previousRecord.currentHash) {
      return false;
    }

    previousHash = previousRecord.currentHash;
  }

  // Calculate expected hash
  const auditRecord: AuditRecordForHash = {
    id: record.id,
    action: record.action,
    entityType: record.entityType,
    entityId: record.entityId,
    actorId: record.actorId,
    createdAt: record.createdAt,
    oldValue: record.oldValue,
    newValue: record.newValue
  };

  const expectedHash = calculateHash(auditRecord, previousHash);
  const isValid = record.currentHash === expectedHash &&
    record.previousHash === previousHash;

  // Update verification status
  await db.auditLog.update({
    where: { id: auditLogId },
    data: {
      verificationStatus: isValid ? 'VERIFIED' : 'TAMPERED',
      verifiedAt: new Date()
    }
  });

  return isValid;
}

/**
 * Get hash chain statistics
 */
export async function getHashChainStats(): Promise<HashChainStats> {
  const stats = await db.auditLog.aggregate({
    where: {
      blockNumber: { not: null }
    },
    _count: {
      id: true
    },
    _min: {
      createdAt: true,
      blockNumber: true
    },
    _max: {
      createdAt: true,
      blockNumber: true
    }
  });

  const verifiedCount = await db.auditLog.count({
    where: {
      blockNumber: { not: null },
      verificationStatus: 'VERIFIED'
    }
  });

  const unverifiedCount = await db.auditLog.count({
    where: {
      blockNumber: { not: null },
      verificationStatus: 'UNVERIFIED'
    }
  });

  const tamperedCount = await db.auditLog.count({
    where: {
      blockNumber: { not: null },
      verificationStatus: 'TAMPERED'
    }
  });

  const lastVerified = await db.auditLog.findFirst({
    where: {
      verificationStatus: 'VERIFIED',
      verifiedAt: { not: null }
    },
    orderBy: { verifiedAt: 'desc' },
    select: { verifiedAt: true }
  });

  return {
    totalBlocks: stats._count.id,
    verifiedBlocks: verifiedCount,
    unverifiedBlocks: unverifiedCount,
    tamperedBlocks: tamperedCount,
    lastVerifiedAt: lastVerified?.verifiedAt || null,
    chainStartAt: stats._min.createdAt,
    chainEndAt: stats._max.createdAt
  };
}

/**
 * Get tampered records for review
 */
export async function getTamperedRecords(limit: number = 50) {
  return db.auditLog.findMany({
    where: {
      verificationStatus: 'TAMPERED'
    },
    orderBy: { blockNumber: 'asc' },
    take: limit,
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
}

/**
 * Get block by block number
 */
export async function getBlockByNumber(blockNumber: number) {
  return db.auditLog.findFirst({
    where: { blockNumber },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
}

/**
 * Get blocks in a range for block explorer
 */
export async function getBlocksInRange(start: number, end: number) {
  return db.auditLog.findMany({
    where: {
      blockNumber: {
        gte: start,
        lte: end
      }
    },
    orderBy: { blockNumber: 'asc' },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });
}

/**
 * Rebuild hash chain from a specific block
 * Use with caution - this will recalculate all hashes from the specified block
 */
export async function rebuildHashChainFromBlock(
  startBlockNumber: number
): Promise<{ success: boolean; rebuiltCount: number; errors: string[] }> {
  const errors: string[] = [];
  let rebuiltCount = 0;

  try {
    // Get the previous block's hash
    let previousHash: string | null = null;

    if (startBlockNumber > 1) {
      const previousBlock = await db.auditLog.findFirst({
        where: { blockNumber: startBlockNumber - 1 },
        select: { currentHash: true }
      });

      if (!previousBlock || !previousBlock.currentHash) {
        return {
          success: false,
          rebuiltCount: 0,
          errors: [`Cannot rebuild from block ${startBlockNumber}: previous block not found or missing hash`]
        };
      }

      previousHash = previousBlock.currentHash;
    }

    // Get all blocks from startBlockNumber onwards
    const blocks = await db.auditLog.findMany({
      where: {
        blockNumber: { gte: startBlockNumber }
      },
      orderBy: { blockNumber: 'asc' }
    });

    // Rebuild hashes in transaction
    await db.$transaction(async (tx) => {
      for (const block of blocks) {
        const record: AuditRecordForHash = {
          id: block.id,
          action: block.action,
          entityType: block.entityType,
          entityId: block.entityId,
          actorId: block.actorId,
          createdAt: block.createdAt,
          oldValue: block.oldValue,
          newValue: block.newValue
        };

        const currentHash = calculateHash(record, previousHash);

        await tx.auditLog.update({
          where: { id: block.id },
          data: {
            currentHash,
            previousHash,
            verificationStatus: 'UNVERIFIED'
          }
        });

        previousHash = currentHash;
        rebuiltCount++;
      }
    });

    return { success: true, rebuiltCount, errors };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      rebuiltCount,
      errors: [errorMessage]
    };
  }
}

/**
 * Export chain verification report
 */
export async function exportVerificationReport(): Promise<{
  stats: HashChainStats;
  tamperedRecords: Awaited<ReturnType<typeof getTamperedRecords>>;
  verificationDate: Date;
}> {
  const stats = await getHashChainStats();
  const tamperedRecords = await getTamperedRecords(100);

  return {
    stats,
    tamperedRecords,
    verificationDate: new Date()
  };
}
