// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Generate a secure random temporary password
 */
function generateTemporaryPassword(): string {
  const length = 16;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomBuffer = new Uint8Array(1);
    crypto.getRandomValues(randomBuffer);
    password += charset[randomBuffer[0] % charset.length];
  }

  return password;
}

async function main() {
  console.log('Creating production admin account...');

  // Generate secure temporary password
  const adminEmail = 'christiegroup@gmail.com';
  const adminPassword = generateTemporaryPassword();
  const passwordHash = await hash(adminPassword, 12); // 12 rounds for security

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

  // Create ADMIN role
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

  // Assign all privileges to ADMIN role
  for (const priv of allPrivs) {
    await prisma.rolePrivilegeSet.upsert({
      where: { roleId_privilegeId: { roleId: adminRole.id, privilegeId: priv.id } },
      create: { roleId: adminRole.id, privilegeId: priv.id, isGranted: true },
      update: { isGranted: true }
    });
  }

  // Check if admin user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existingUser) {
    console.log('⚠️  Admin user already exists. Updating password...');
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        passwordHash,
        mustChangePassword: true,
        passwordChangedAt: new Date(),
      }
    });
  } else {
    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'System Administrator',
        department: 'IT',
        passwordHash,
        mustChangePassword: true,
        passwordChangedAt: new Date(),
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
  }

  console.log('\n========================================');
  console.log('      ✅ ADMIN ACCOUNT CREATED/UPDATED!');
  console.log('========================================');
  console.log('\n⚠️  IMPORTANT: Save these credentials!');
  console.log('   They will NOT be shown again.\n');
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('\n   ℹ️  You will be required to change your');
  console.log('      password on first login.');
  console.log('========================================\n');

  await prisma.$disconnect();
}

main().catch(console.error);
