import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Final Database Status:\n');

  const userCount = await prisma.user.count();
  const assetCount = await prisma.asset.count();
  const jcCount = await prisma.jobCard.count();

  console.log(`   Users: ${userCount}`);
  console.log(`   Assets: ${assetCount}`);
  console.log(`   Job Cards: ${jcCount}`);

  // Check for admin account
  const adminUser = await prisma.user.findUnique({
    where: { email: 'christiegroup@gmail.com' },
    select: { email: true, name: true }
  });

  if (adminUser) {
    console.log(`\n✅ Admin Account: ${adminUser.email} (${adminUser.name})`);
  } else {
    console.log('\n❌ Admin Account: Not found');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
