import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

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

  // Create users with passwordHash field
  const passwordHash = await hash('password123', 10);

  const users = [
    {
      email: 'admin@wcp.com',
      name: 'System Administrator',
      department: 'IT',
      passwordHash,
      roles: ['ADMIN'],
    },
    {
      email: 'supervisor@wcp.com',
      name: 'David Wilson',
      department: 'Workshop',
      passwordHash,
      roles: ['SUPERVISOR'],
    },
    {
      email: 'tech1@wcp.com',
      name: 'John Smith',
      department: 'Workshop',
      passwordHash,
      roles: ['TECHNICIAN'],
    },
    {
      email: 'storeman@wcp.com',
      name: 'Mike Johnson',
      department: 'Stores',
      passwordHash,
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
        isActive: true,
      },
      update: {
        name: userData.name,
        department: userData.department,
        passwordHash: userData.passwordHash,
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

  console.log('Users seeded successfully!');
  console.log('\nDemo accounts (password: password123):');
  users.forEach(u => console.log(`  - ${u.email} (${u.roles.join(', ')})`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
