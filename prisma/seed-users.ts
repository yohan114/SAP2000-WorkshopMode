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
  console.log('Seeding users...');

  // Create privileges if they don't exist
  const privileges = [
    { code: 'JC_CREATE', name: 'Create Job Cards', category: 'JOB_CARD', description: 'Create new job cards' },
    { code: 'JC_VIEW', name: 'View Job Cards', category: 'JOB_CARD', description: 'View job cards' },
    { code: 'JC_EDIT', name: 'Edit Job Cards', category: 'JOB_CARD', description: 'Edit job cards' },
    { code: 'JC_APPROVE', name: 'Approve Job Cards', category: 'JOB_CARD', description: 'Approve job cards' },
    { code: 'JC_CLOSE', name: 'Close Job Cards', category: 'JOB_CARD', description: 'Close job cards' },
    { code: 'MR_CREATE', name: 'Create Material Requests', category: 'MATERIAL_REQUEST', description: 'Create material requests' },
    { code: 'MR_VIEW', name: 'View Material Requests', category: 'MATERIAL_REQUEST', description: 'View material requests' },
    { code: 'MR_APPROVE', name: 'Approve Material Requests', category: 'MATERIAL_REQUEST', description: 'Approve material requests' },
    { code: 'INV_VIEW', name: 'View Inventory', category: 'INVENTORY', description: 'View inventory' },
    { code: 'INV_MANAGE', name: 'Manage Inventory', category: 'INVENTORY', description: 'Manage inventory' },
    { code: 'ADMIN', name: 'Full Admin Access', category: 'SYSTEM', description: 'Full admin access' },
    { code: 'ASSET_VIEW', name: 'View Assets', category: 'ASSET', description: 'View assets' },
    { code: 'ASSET_CREATE', name: 'Create Assets', category: 'ASSET', description: 'Create new assets' },
    { code: 'ASSET_EDIT', name: 'Edit Assets', category: 'ASSET', description: 'Edit asset details' },
    { code: 'PR_CREATE', name: 'Create Purchase Requisitions', category: 'PROCUREMENT', description: 'Create PRs' },
    { code: 'PO_APPROVE', name: 'Approve Purchase Orders', category: 'PROCUREMENT', description: 'Approve POs' },
    { code: 'INVOICE_APPROVE', name: 'Approve Invoices', category: 'PROCUREMENT', description: 'Approve invoices' },
  ];

  for (const priv of privileges) {
    await prisma.privilegeDefinition.upsert({
      where: { code: priv.code },
      create: priv,
      update: priv,
    });
  }

  // Create roles
  const roles = [
    { code: 'ADMIN', name: 'System Administrator', level: 10, description: 'Full system access' },
    { code: 'SUPERVISOR', name: 'Workshop Supervisor', level: 5, description: 'Supervisor access' },
    { code: 'TECHNICIAN', name: 'Technician', level: 2, description: 'Technician access' },
    { code: 'STOREMAN', name: 'Store Keeper', level: 3, description: 'Store management' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      create: role,
      update: role,
    });
  }

  // Get all privileges
  const allPrivs = await prisma.privilegeDefinition.findMany();

  // Assign all privileges to ADMIN role
  const adminRole = await prisma.role.findUnique({ where: { code: 'ADMIN' } });
  if (adminRole) {
    for (const priv of allPrivs) {
      await prisma.rolePrivilegeSet.upsert({
        where: { roleId_privilegeId: { roleId: adminRole.id, privilegeId: priv.id } },
        create: { roleId: adminRole.id, privilegeId: priv.id, isGranted: true },
        update: { isGranted: true },
      });
    }
  }

  // Generate a secure temporary password for seeding
  const tempPassword = generateTemporaryPassword();
  const passwordHash = await hash(tempPassword, 12); // 12 rounds for better security

  const users = [
    {
      email: 'admin@wcp.com',
      name: 'System Administrator',
      department: 'IT',
      passwordHash,
      mustChangePassword: true, // Force password change on first login
      roles: ['ADMIN'],
    },
    {
      email: 'supervisor@wcp.com',
      name: 'David Wilson',
      department: 'Workshop',
      passwordHash,
      mustChangePassword: true,
      roles: ['SUPERVISOR'],
    },
    {
      email: 'tech1@wcp.com',
      name: 'John Smith',
      department: 'Workshop',
      passwordHash,
      mustChangePassword: true,
      roles: ['TECHNICIAN'],
    },
    {
      email: 'storeman@wcp.com',
      name: 'Mike Johnson',
      department: 'Stores',
      passwordHash,
      mustChangePassword: true,
      roles: ['STOREMAN'],
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      create: {
        email: userData.email,
        name: userData.name,
        department: userData.department,
        passwordHash: userData.passwordHash,
        mustChangePassword: userData.mustChangePassword,
        passwordChangedAt: new Date(), // Set so we know when the temp password was set
        isActive: true,
      },
      update: {
        name: userData.name,
        department: userData.department,
        passwordHash: userData.passwordHash,
        mustChangePassword: userData.mustChangePassword,
        passwordChangedAt: new Date(),
        isActive: true,
      },
    });

    // Assign roles
    for (const roleCode of userData.roles) {
      const role = await prisma.role.findUnique({ where: { code: roleCode } });
      if (role) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: role.id } },
          create: { userId: user.id, roleId: role.id, isActive: true },
          update: { isActive: true },
        });
      }
    }
  }

  console.log('\n========================================');
  console.log('        USERS SEEDED SUCCESSFULLY!');
  console.log('========================================');
  console.log('\n⚠️  IMPORTANT: Save these credentials!');
  console.log('   They will NOT be shown again.\n');
  console.log(`   Temporary Password: ${tempPassword}\n`);
  console.log('   Login credentials:');
  users.forEach(u => console.log(`   - ${u.email} (${u.roles.join(', ')})`));
  console.log('\n   ℹ️  Users will be required to change their password on first login.');
  console.log('========================================\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
