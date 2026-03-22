/**
 * PRODUCTION SETUP SCRIPT
 *
 * This script prepares the WCP system for production:
 * 1. Deletes all demo data (records with DEMO- prefix)
 * 2. Deletes demo user accounts
 * 3. Creates the production System Administrator account
 *
 * IMPORTANT: This script cannot be undone. Take a database backup first!
 *
 * Usage: npx ts-node prisma/production-setup.ts
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('WCP PRODUCTION SETUP');
  console.log('='.repeat(60));
  console.log('\n⚠️  WARNING: This will delete ALL demo data!');
  console.log('   - Demo assets (DEMO-CMP-*, DEMO-JC-*)');
  console.log('   - Demo material requests (DEMO-MR-*)');
  console.log('   - Demo job cards');
  console.log('   - Demo GRN entries');
  console.log('   - Demo PO entries');
  console.log('   - Demo inventory items');
  console.log('   - Demo employees');
  console.log('   - Demo users (admin@wcp.com, supervisor@wcp.com, tech1@wcp.com)');
  console.log('\nThis action CANNOT be undone!\n');

  // Confirm before proceeding
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question('Type "PRODUCTION" to confirm: ', (input) => {
      resolve(input);
      rl.close();
    });
  });

  if (answer !== 'PRODUCTION') {
    console.log('\n❌ Setup cancelled.');
    process.exit(0);
  }

  console.log('\n🚀 Starting production setup...\n');

  try {
    // ============================================
    // STEP 1: DELETE DEMO DATA
    // ============================================
    console.log('📋 Step 1: Clearing demo data...');

    // Delete in order of dependencies (child records first)

    // Delete demo job card related records
    const demoJcCards = await prisma.jobCard.findMany({
      where: { jobCardNumber: { startsWith: 'DEMO-' } },
      select: { id: true, jobCardNumber: true }
    });
    console.log(`   - Found ${demoJcCards.length} demo job cards`);

    for (const jc of demoJcCards) {
      await prisma.jcPhoto.deleteMany({ where: { jobCardId: jc.id } });
      await prisma.jcDocument.deleteMany({ where: { jobCardId: jc.id } });
      await prisma.jcStateTransition.deleteMany({ where: { jobCardId: jc.id } });
      await prisma.jcCostLine.deleteMany({ where: { jobCardId: jc.id } });
      await prisma.jcTask.deleteMany({ where: { jobCardId: jc.id } });
      await prisma.jcTechnicianAssignment.deleteMany({ where: { jobCardId: jc.id } });
      await prisma.jobCardApproval.deleteMany({ where: { jobCardId: jc.id } });
    }

    await prisma.jobCard.deleteMany({
      where: { jobCardNumber: { startsWith: 'DEMO-' } }
    });
    console.log('   ✓ Deleted demo job cards');

    // Delete demo material requests
    await prisma.mrStateTransition.deleteMany({
      where: { materialRequest: { mrNumber: { startsWith: 'DEMO-' } } }
    });
    await prisma.mrApprovalHistory.deleteMany({
      where: { materialRequest: { mrNumber: { startsWith: 'DEMO-' } } }
    });
    await prisma.mrLine.deleteMany({
      where: { materialRequest: { mrNumber: { startsWith: 'DEMO-' } } }
    });
    await prisma.materialRequest.deleteMany({
      where: { mrNumber: { startsWith: 'DEMO-' } }
    });
    console.log('   ✓ Deleted demo material requests');

    // Delete demo material issues
    await prisma.miReturnLine.deleteMany({
      where: { miReturn: { materialIssue: { miNumber: { startsWith: 'DEMO-' } } } }
    });
    await prisma.miReturn.deleteMany({
      where: { materialIssue: { miNumber: { startsWith: 'DEMO-' } } }
    });
    await prisma.miLine.deleteMany({
      where: { materialIssue: { miNumber: { startsWith: 'DEMO-' } } }
    });
    await prisma.materialIssue.deleteMany({
      where: { miNumber: { startsWith: 'DEMO-' } }
    });
    console.log('   ✓ Deleted demo material issues');

    // Delete demo GRN entries
    await prisma.grnLine.deleteMany({
      where: { grnHeader: { grnNumber: { startsWith: 'DEMO-' } } }
    });
    await prisma.grnHeader.deleteMany({
      where: { grnNumber: { startsWith: 'DEMO-' } }
    });
    console.log('   ✓ Deleted demo GRN entries');

    // Delete demo PO entries
    await prisma.poLine.deleteMany({
      where: { purchaseOrder: { poNumber: { startsWith: 'DEMO-' } } }
    });
    await prisma.poAmendment.deleteMany({
      where: { purchaseOrder: { poNumber: { startsWith: 'DEMO-' } } }
    });
    await prisma.supplierInvoice.deleteMany({
      where: { purchaseOrder: { poNumber: { startsWith: 'DEMO-' } } }
    });
    await prisma.purchaseOrder.deleteMany({
      where: { poNumber: { startsWith: 'DEMO-' } }
    });
    console.log('   ✓ Deleted demo purchase orders');

    // Delete demo assets
    await prisma.assetQrCode.deleteMany({
      where: { asset: { assetNumber: { startsWith: 'DEMO-' } } }
    });
    await prisma.meterReading.deleteMany({
      where: { meter: { asset: { assetNumber: { startsWith: 'DEMO-' } } } }
    });
    await prisma.assetMeter.deleteMany({
      where: { asset: { assetNumber: { startsWith: 'DEMO-' } } }
    });
    await prisma.downtimeLog.deleteMany({
      where: { asset: { assetNumber: { startsWith: 'DEMO-' } } }
    });
    await prisma.jobCard.deleteMany({
      where: { asset: { assetNumber: { startsWith: 'DEMO-' } } }
    });
    await prisma.asset.deleteMany({
      where: { assetNumber: { startsWith: 'DEMO-' } }
    });
    console.log('   ✓ Deleted demo assets');

    // Delete demo employees
    await prisma.timeLog.deleteMany({
      where: { employee: { employeeNumber: { startsWith: 'DEMO-' } } }
    });
    await prisma.employee.deleteMany({
      where: { employeeNumber: { startsWith: 'DEMO-' } }
    });
    console.log('   ✓ Deleted demo employees');

    // Delete demo inventory items
    await prisma.stockTakeLine.deleteMany({
      where: { item: { itemCode: { startsWith: 'DEMO-' } } }
    });
    await prisma.storeStock.deleteMany({
      where: { item: { itemCode: { startsWith: 'DEMO-' } } }
    });
    await prisma.item.deleteMany({
      where: { itemCode: { startsWith: 'DEMO-' } }
    });
    console.log('   ✓ Deleted demo inventory items');

    // Delete demo suppliers
    await prisma.supplierContact.deleteMany({
      where: { supplier: { supplierCode: { startsWith: 'DEMO-' } } }
    });
    await prisma.supplier.deleteMany({
      where: { supplierCode: { startsWith: 'DEMO-' } }
    });
    console.log('   ✓ Deleted demo suppliers');

    // Delete demo store stock takes
    await prisma.stockTakeLine.deleteMany({
      where: { stockTake: { stockTakeNumber: { startsWith: 'DEMO-' } } }
    });
    await prisma.stockTakeHeader.deleteMany({
      where: { stockTakeNumber: { startsWith: 'DEMO-' } }
    });
    console.log('   ✓ Deleted demo stock takes');

    // ============================================
    // STEP 2: DELETE DEMO USERS
    // ============================================
    console.log('\n📋 Step 2: Deleting demo user accounts...');

    const demoEmails = ['admin@wcp.com', 'supervisor@wcp.com', 'tech1@wcp.com', 'storeman@wcp.com'];

    for (const email of demoEmails) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        // Delete related records first
        await prisma.userRole.deleteMany({ where: { userId: user.id } });
        await prisma.userPrivilegeOverride.deleteMany({ where: { userId: user.id } });
        await prisma.userSession.deleteMany({ where: { userId: user.id } });
        await prisma.deviceRegistry.deleteMany({ where: { userId: user.id } });
        await prisma.notificationPreferences.deleteMany({ where: { userId: user.id } });
        await prisma.auditLog.deleteMany({ where: { actorId: user.id } });

        await prisma.user.delete({ where: { email } });
        console.log(`   ✓ Deleted demo user: ${email}`);
      }
    }

    // ============================================
    // STEP 3: CREATE PRODUCTION ADMIN ACCOUNT
    // ============================================
    console.log('\n📋 Step 3: Creating production System Administrator account...');

    const adminEmail = 'christiegroup@gmail.com';
    const adminPassword = 'Christie@852123';
    const passwordHash = await hash(adminPassword, 10);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      console.log(`   ⚠️  User ${adminEmail} already exists. Updating password...`);
      await prisma.user.update({
        where: { email: adminEmail },
        data: { passwordHash }
      });
    } else {
      const adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'System Administrator',
          department: 'IT',
          passwordHash,
          isActive: true,
          employeeId: 'ADMIN-001',
        }
      });
      console.log(`   ✓ Created user: ${adminEmail}`);

      // Assign ADMIN role with all privileges
      const adminRole = await prisma.role.findUnique({ where: { code: 'ADMIN' } });
      if (adminRole) {
        await prisma.userRole.create({
          data: {
            userId: adminUser.id,
            roleId: adminRole.id,
            isActive: true
          }
        });
        console.log(`   ✓ Assigned ADMIN role`);
      }

      // Create notification preferences
      await prisma.notificationPreferences.create({
        data: {
          userId: adminUser.id,
          emailEnabled: true,
          inAppEnabled: true
        }
      });
    }

    // ============================================
    // STEP 4: RESET AUTO-INCREMENT COUNTERS
    // ============================================
    console.log('\n📋 Step 4: Resetting auto-increment counters...');

    // SQLite doesn't have true auto-increment reset, but we can note that
    // new records will start fresh. For SQLite with Prisma, IDs use cuid()
    // so there are no sequences to reset.
    console.log('   ✓ IDs use cuid() - no sequences to reset');

    console.log('\n' + '='.repeat(60));
    console.log('✅ PRODUCTION SETUP COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📝 Production Account Details:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: System Administrator (full access)`);
    console.log('\n⚠️  IMPORTANT: Please change the password after first login!\n');

  } catch (error) {
    console.error('\n❌ Error during production setup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch(console.error);
