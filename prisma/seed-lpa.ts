/**
 * ============================================
 * WORKSHOP CONTROL PLATFORM - LPA SEED SCRIPT
 * ============================================
 * Seed script for default LPA (Limited Purchase Authority) configurations.
 * Creates workshop LPA configurations based on master plan limits.
 * 
 * Run with: bun prisma/seed-lpa.ts
 */

import { db } from '@/lib/db';

// ============================================
// DEFAULT LPA CONFIGURATIONS
// ============================================

/**
 * Default LPA limits based on organizational hierarchy
 * These represent standard approval limits for each role level
 */
const DEFAULT_LPA_CONFIGS = [
  {
    workshopId: 'ws-supervisor-001',
    workshopName: 'Workshop Supervisor',
    lpaLimit: 25000,
    emergencyLpaLimit: 37500, // 1.5x standard LPA
    monthlyCap: 150000,
    description: 'Standard LPA limits for Workshop Supervisor level',
  },
  {
    workshopId: 'ws-procurement-001',
    workshopName: 'Procurement Officer',
    lpaLimit: 100000,
    emergencyLpaLimit: 150000, // 1.5x standard LPA
    monthlyCap: 500000,
    description: 'Standard LPA limits for Procurement Officer level',
  },
  {
    workshopId: 'ws-manager-001',
    workshopName: 'Workshop Manager',
    lpaLimit: 250000,
    emergencyLpaLimit: 375000, // 1.5x standard LPA
    monthlyCap: 1000000,
    description: 'Standard LPA limits for Workshop Manager level',
  },
];

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedLpaConfigurations() {
  console.log('💰 Seeding LPA configurations...\n');

  let createdCount = 0;
  let updatedCount = 0;

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

  for (const config of DEFAULT_LPA_CONFIGS) {
    const existing = await db.workshopPurchaseAuthority.findUnique({
      where: { workshopId: config.workshopId },
    });

    if (existing) {
      await db.workshopPurchaseAuthority.update({
        where: { workshopId: config.workshopId },
        data: {
          workshopName: config.workshopName,
          lpaLimit: config.lpaLimit,
          emergencyLpaLimit: config.emergencyLpaLimit,
          monthlyCap: config.monthlyCap,
          currentMonth,
        },
      });
      updatedCount++;
      console.log(`   ✓ Updated: ${config.workshopName} (${config.workshopId})`);
    } else {
      await db.workshopPurchaseAuthority.create({
        data: {
          workshopId: config.workshopId,
          workshopName: config.workshopName,
          lpaLimit: config.lpaLimit,
          emergencyLpaLimit: config.emergencyLpaLimit,
          monthlyCap: config.monthlyCap,
          currentMonthSpend: 0,
          currentMonth,
          isActive: true,
        },
      });
      createdCount++;
      console.log(`   ✓ Created: ${config.workshopName} (${config.workshopId})`);
    }

    // Log the limits
    console.log(`     Standard LPA: ${config.lpaLimit.toLocaleString()}`);
    console.log(`     Emergency LPA: ${config.emergencyLpaLimit.toLocaleString()}`);
    console.log(`     Monthly Cap: ${config.monthlyCap.toLocaleString()}`);
    console.log('');
  }

  console.log(`   📊 Summary: Created ${createdCount}, Updated ${updatedCount}\n`);
}

async function displayCurrentLpaStatus() {
  console.log('📋 Current LPA Status:\n');

  const allConfigs = await db.workshopPurchaseAuthority.findMany({
    orderBy: { lpaLimit: 'asc' },
  });

  console.log('┌──────────────────────────┬────────────────┬────────────────┬────────────────┬─────────────┐');
  console.log('│ Workshop                 │ Standard LPA   │ Emergency LPA  │ Monthly Cap    │ Usage       │');
  console.log('├──────────────────────────┼────────────────┼────────────────┼────────────────┼─────────────┤');

  for (const config of allConfigs) {
    const usagePercent = config.monthlyCap > 0 
      ? ((Number(config.currentMonthSpend) / Number(config.monthlyCap)) * 100).toFixed(1)
      : '0.0';
    const workshopName = config.workshopName.padEnd(24).slice(0, 24);
    const standardLpa = Number(config.lpaLimit).toLocaleString().padStart(14);
    const emergencyLpa = Number(config.emergencyLpaLimit).toLocaleString().padStart(14);
    const monthlyCap = Number(config.monthlyCap).toLocaleString().padStart(14);
    const usage = `${usagePercent}%`.padStart(11);

    console.log(`│ ${workshopName} │ ${standardLpa} │ ${emergencyLpa} │ ${monthlyCap} │ ${usage} │`);
  }

  console.log('└──────────────────────────┴────────────────┴────────────────┴────────────────┴─────────────┘');
  console.log('');
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('🌱 Starting LPA seed process...\n');

  try {
    await seedLpaConfigurations();
    await displayCurrentLpaStatus();
    console.log('✨ LPA seed completed successfully!');
  } catch (error) {
    console.error('❌ LPA seed failed:', error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
