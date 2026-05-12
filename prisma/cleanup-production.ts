// @ts-nocheck
/**
 * SQLITE PRODUCTION CLEANUP SCRIPT
 * Clears all demo data and creates production admin account
 */

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('WCP DATABASE CLEANUP - PRODUCTION');
  console.log('='.repeat(60));

  try {
    // Step 1: Get all table names
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master
      WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `;

    console.log(`\n📋 Found ${tables.length} tables`);

    // Step 2: Disable foreign key constraints and delete all data
    console.log('\n🗑️  Clearing all data...');

    await prisma.$executeRaw`PRAGMA foreign_keys = OFF`;

    for (const table of tables) {
      const tableName = table.name;
      try {
        const result = await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}"`);
        console.log(`   ✓ Cleared: ${tableName}`);
      } catch (err: any) {
        console.log(`   - Skipped: ${tableName} (${err.message?.substring(0, 50)})`);
      }
    }

    // Step 3: Reset SQLite sequences
    console.log('\n🔄 Resetting ID sequences...');
    const sequences = await prisma.$queryRaw`SELECT name FROM sqlite_sequence`;
    for (const seq of sequences) {
      await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name = '${seq.name}'`);
    }
    console.log(`   ✓ Reset ${sequences.length} sequences`);

    await prisma.$executeRaw`PRAGMA foreign_keys = ON`;

    // Step 4: Create production admin account
    console.log('\n👤 Creating production System Administrator...');

    const adminEmail = 'christiegroup@gmail.com';
    const adminPassword = 'Christie@852123';
    const passwordHash = await hash(adminPassword, 10);

    // Create ADMIN role first
    const adminRole = await prisma.role.upsert({
      where: { code: 'ADMIN' },
      create: {
        code: 'ADMIN',
        name: 'System Administrator',
        level: 10,
        description: 'Full system access',
        isActive: true
      },
      update: {}
    });

    // Create privileges
    const privileges = [
      { code: 'JC_CREATE', name: 'Create Job Cards', category: 'JOB_CARD' },
      { code: 'JC_VIEW', name: 'View Job Cards', category: 'JOB_CARD' },
      { code: 'JC_EDIT', name: 'Edit Job Cards', category: 'JOB_CARD' },
      { code: 'JC_APPROVE', name: 'Approve Job Cards', category: 'JOB_CARD' },
      { code: 'JC_CLOSE', name: 'Close Job Cards', category: 'JOB_CARD' },
      { code: 'MR_CREATE', name: 'Create Material Requests', category: 'MATERIAL_REQUEST' },
      { code: 'MR_VIEW', name: 'View Material Requests', category: 'MATERIAL_REQUEST' },
      { code: 'MR_APPROVE', name: 'Approve Material Requests', category: 'MATERIAL_REQUEST' },
      { code: 'INV_VIEW', name: 'View Inventory', category: 'INVENTORY' },
      { code: 'INV_MANAGE', name: 'Manage Inventory', category: 'INVENTORY' },
      { code: 'ADMIN', name: 'Full Admin Access', category: 'SYSTEM' },
    ];

    const allPrivs = [];
    for (const priv of privileges) {
      const p = await prisma.privilegeDefinition.upsert({
        where: { code: priv.code },
        create: priv,
        update: priv
      });
      allPrivs.push(p);
    }

    // Assign all privileges to ADMIN role
    for (const priv of allPrivs) {
      await prisma.rolePrivilegeSet.upsert({
        where: { roleId_privilegeId: { roleId: adminRole.id, privilegeId: priv.id } },
        create: { roleId: adminRole.id, privilegeId: priv.id, isGranted: true },
        update: { isGranted: true }
      });
    }

    // Create admin user
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

    // Assign ADMIN role
    await prisma.userRole.create({
      data: {
        userId: adminUser.id,
        roleId: adminRole.id,
        isActive: true
      }
    });

    // Create notification preferences
    await prisma.notificationPreferences.create({
      data: {
        userId: adminUser.id,
        emailEnabled: true,
        inAppEnabled: true
      }
    });

    console.log('   ✓ Created admin user');
    console.log(`   ✓ Email: ${adminEmail}`);
    console.log(`   ✓ Password: ${adminPassword}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ PRODUCTION SETUP COMPLETED!');
    console.log('='.repeat(60));
    console.log('\n📝 Login Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n⚠️  IMPORTANT: Change password after first login!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch(console.error);
