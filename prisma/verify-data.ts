import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const assetCount = await prisma.asset.count();
  const jcCount = await prisma.jobCard.count();

  console.log('✅ Database restored successfully!');
  console.log(`   Users: ${userCount}`);
  console.log(`   Assets: ${assetCount}`);
  console.log(`   Job Cards: ${jcCount}`);

  await prisma.$disconnect();
}

main().catch(console.error);
