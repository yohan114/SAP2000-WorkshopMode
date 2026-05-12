// @ts-nocheck
/**
 * Seed Script for Cost Analysis Test Data
 * 
 * Creates comprehensive test data for the cost analysis module.
 * All costs are in LKR (Sri Lankan Rupees)
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Helper to generate random decimal
function randomDecimal(min: number, max: number): Decimal {
  const value = Math.random() * (max - min) + min;
  return new Decimal(value.toFixed(2));
}

// Helper to generate random integer
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Test data constants
const ASSET_NAMES = [
  'Toyota Hilux - WD-1234',
  'Mitsubishi Montero - WD-5678',
  'Isuzu D-Max - WD-9012',
  'JCB Backhoe - WD-3456',
  'Caterpillar Excavator - WD-7890',
  'Hyundai Generator - WD-2345',
  'Komatsu Bulldozer - WD-6789',
  'Volvo Truck - WD-0123',
];

const MATERIAL_ITEMS = [
  { code: 'OIL-001', name: 'Engine Oil 15W-40', unit: 'Liter', unitCost: 2500 },
  { code: 'OIL-002', name: 'Hydraulic Oil ISO 46', unit: 'Liter', unitCost: 3200 },
  { code: 'FLT-001', name: 'Oil Filter', unit: 'Piece', unitCost: 3500 },
  { code: 'FLT-002', name: 'Air Filter', unit: 'Piece', unitCost: 4500 },
  { code: 'FLT-003', name: 'Fuel Filter', unit: 'Piece', unitCost: 2800 },
  { code: 'BRG-001', name: 'Bearing SKF 6205', unit: 'Piece', unitCost: 8500 },
  { code: 'BLT-001', name: 'V-Belt A-68', unit: 'Piece', unitCost: 1200 },
  { code: 'GSK-001', name: 'Gasket Set', unit: 'Set', unitCost: 15000 },
  { code: 'BRK-001', name: 'Brake Pads', unit: 'Set', unitCost: 12000 },
  { code: 'TYR-001', name: 'Tire 265/70R16', unit: 'Piece', unitCost: 45000 },
];

const SUBCONTRACTORS = [
  { code: 'SC-001', name: 'Lanka Auto Works', specialization: 'Engine Overhaul' },
  { code: 'SC-002', name: 'Ceylon Hydraulics', specialization: 'Hydraulic Systems' },
  { code: 'SC-003', name: 'Prime Electricals', specialization: 'Electrical Systems' },
  { code: 'SC-004', name: 'Tech-Weld Services', specialization: 'Welding & Fabrication' },
];

const EMPLOYEES = [
  { name: 'Kamal Perera', department: 'Workshop', hourlyRate: 500 },
  { name: 'Nimal Silva', department: 'Workshop', hourlyRate: 450 },
  { name: 'Sunil Fernando', department: 'Workshop', hourlyRate: 550 },
  { name: 'Ruwan Jayawardena', department: 'Workshop', hourlyRate: 600 },
];

async function main() {
  console.log('🌱 Starting seed for cost analysis test data...');

  // Get or create store
  let store = await prisma.store.findFirst();
  if (!store) {
    store = await prisma.store.create({
      data: {
        code: 'MAIN-01',
        name: 'Main Workshop Store',
        storeType: 'MAIN',
      },
    });
  }

  // Get or create employees
  let employees = await prisma.employee.findMany({ take: 4 });
  if (employees.length < 4) {
    for (const empData of EMPLOYEES) {
      const existing = await prisma.employee.findFirst({ where: { name: empData.name } });
      if (!existing) {
        await prisma.employee.create({
          data: {
            employeeNumber: `EMP-${String(randomInt(1000, 9999))}`,
            name: empData.name,
            department: empData.department,
            hourlyRate: new Decimal(empData.hourlyRate),
            status: 'ACTIVE',
          },
        });
      }
    }
    employees = await prisma.employee.findMany({ take: 4 });
  }

  // Get existing users (for createdBy reference)
  const users = await prisma.user.findMany({ take: 1 });
  const testUserId = users.length > 0 ? users[0].id : null;

  const testEmployeeId = employees[0].id;
  
  if (!testUserId) {
    console.log('⚠️ No users found - createdBy will be null');
  }
  
  // Create asset category if not exists
  let category = await prisma.assetCategory.findFirst();
  if (!category) {
    category = await prisma.assetCategory.create({
      data: {
        code: 'VEH-001',
        name: 'Vehicles & Heavy Equipment',
      },
    });
  }

  // Get or create assets
  let assets = await prisma.asset.findMany({ take: 8 });
  if (assets.length < 8) {
    for (let i = assets.length; i < 8; i++) {
      await prisma.asset.create({
        data: {
          assetNumber: `WD-${String(1000 + i).padStart(4, '0')}`,
          name: ASSET_NAMES[i],
          categoryId: category.id,
          status: 'OPERATIONAL',
          criticality: i % 3 === 0 ? 'HIGH' : 'MEDIUM',
        },
      });
    }
    assets = await prisma.asset.findMany({ take: 8 });
  }

  // Get or create items
  let items = await prisma.item.findMany();
  if (items.length < MATERIAL_ITEMS.length) {
    for (const itemData of MATERIAL_ITEMS) {
      const existing = await prisma.item.findUnique({ where: { itemCode: itemData.code } });
      if (!existing) {
        await prisma.item.create({
          data: {
            itemCode: itemData.code,
            name: itemData.name,
            unitOfMeasure: itemData.unit,
            itemClass: 'CONSUMABLE',
          },
        });
      }
    }
    items = await prisma.item.findMany();
  }

  // Get or create subcontractors
  for (const subData of SUBCONTRACTORS) {
    const existing = await prisma.subcontractor.findUnique({ where: { code: subData.code } });
    if (!existing) {
      await prisma.subcontractor.create({
        data: {
          code: subData.code,
          name: subData.name,
          specialization: subData.specialization,
          status: 'ACTIVE',
        },
      });
    }
  }
  const subcontractors = await prisma.subcontractor.findMany();

  // Create job cards with various dates (last 6 months)
  const jobCards = [];
  const now = new Date();
  
  for (let month = 0; month < 6; month++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - month, 1);
    const numJobCards = randomInt(3, 6);
    
    for (let j = 0; j < numJobCards; j++) {
      const asset = assets[randomInt(0, assets.length - 1)];
      const dayOffset = randomInt(1, 28);
      const createdAt = new Date(monthDate.getFullYear(), monthDate.getMonth(), dayOffset);
      
      const status = month < 2 ? 'COMPLETED' : month < 4 ? 'IN_PROGRESS' : 'DRAFT';
      
      const jobCardNumber = `JC-TST-${Date.now()}-${randomInt(1000, 9999)}`;
      
      const jobCard = await prisma.jobCard.create({
        data: {
          jobCardNumber,
          assetId: asset.id,
          jobType: ['PREVENTIVE', 'CORRECTIVE', 'BREAKDOWN'][randomInt(0, 2)],
          priority: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'][randomInt(0, 3)],
          status,
          faultDescription: `Test fault description for ${asset.name}`,
          diagnosisNotes: 'Test diagnosis notes',
          workPerformed: status === 'COMPLETED' ? 'Repair completed successfully' : null,
          estimatedCost: randomDecimal(50000, 500000),
          createdAt,
          actualStart: status !== 'DRAFT' ? createdAt : null,
          actualEnd: status === 'COMPLETED' ? new Date(createdAt.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000) : null,
          isActive: true,
          ...(testUserId ? { createdBy: testUserId } : {}),
        },
      });
      
      jobCards.push(jobCard);
    }
  }

  console.log(`✅ Created ${jobCards.length} job cards`);

  // Create material issues for each job card
  let miCount = 0;
  for (const jc of jobCards) {
    if (jc.status === 'DRAFT') continue;
    
    const numIssues = randomInt(1, 3);
    for (let i = 0; i < numIssues; i++) {
      const numLines = randomInt(2, 5);
      const lines = [];
      let totalValue = new Decimal(0);
      
      for (let l = 0; l < numLines; l++) {
        const item = items[randomInt(0, items.length - 1)];
        const qty = randomDecimal(1, 10);
        const unitCost = randomDecimal(1000, 50000);
        const lineTotal = qty.mul(unitCost);
        totalValue = totalValue.add(lineTotal);
        
        lines.push({
          itemId: item.id,
          issuedQty: qty,
          unitCost,
          totalCost: lineTotal,
        });
      }
      
      const miNumber = `MI-${jc.jobCardNumber.slice(3)}-${String(i + 1).padStart(2, '0')}`;
      
      await prisma.materialIssue.create({
        data: {
          miNumber,
          storeId: store.id,
          jobCardId: jc.id,
          issueType: 'STANDARD',
          status: 'COMPLETED',
          issuedToId: testUserId,
          issuedBy: testUserId,
          issuedAt: jc.createdAt,
          totalValue,
          lines: {
            create: lines,
          },
        },
      });
      miCount++;
    }
  }
  console.log(`✅ Created ${miCount} material issues`);

  // Create time logs for each job card
  let tlCount = 0;
  for (const jc of jobCards) {
    if (jc.status === 'DRAFT') continue;
    
    const numLogs = randomInt(1, 4);
    for (let i = 0; i < numLogs; i++) {
      const user = users[randomInt(0, users.length - 1)];
      const minutes = randomInt(60, 480);
      const hourlyRate = randomDecimal(400, 700);
      const totalCost = new Decimal(minutes / 60).mul(hourlyRate);
      
      await prisma.timeLog.create({
        data: {
          jobCardId: jc.id,
          employeeId: user.id,
          logDate: jc.createdAt,
          startTime: jc.createdAt,
          endTime: new Date(jc.createdAt.getTime() + minutes * 60 * 1000),
          totalMinutes: minutes,
          hourlyRate,
          totalCost,
        },
      });
      tlCount++;
    }
  }
  console.log(`✅ Created ${tlCount} time logs`);

  // Create external jobs for some job cards
  let ejCount = 0;
  for (const jc of jobCards.slice(0, Math.floor(jobCards.length / 2))) {
    if (jc.status === 'DRAFT') continue;
    
    const hasExternal = Math.random() > 0.5;
    if (!hasExternal) continue;
    
    const subcontractor = subcontractors[randomInt(0, subcontractors.length - 1)];
    const estimatedCost = randomDecimal(50000, 300000);
    const actualCost = jc.status === 'COMPLETED' ? estimatedCost.mul(randomDecimal(0.8, 1.3)) : null;
    
    await prisma.externalJob.create({
      data: {
        jobCardId: jc.id,
        subcontractorId: subcontractor.id,
        jobNumber: `EXT-${jc.jobCardNumber.slice(3)}`,
        description: `External work for ${jc.jobCardNumber}`,
        status: jc.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
        estimatedCost,
        actualCost,
        startDate: jc.createdAt,
        endDate: jc.status === 'COMPLETED' ? jc.actualEnd : null,
      },
    });
    ejCount++;
  }
  console.log(`✅ Created ${ejCount} external jobs`);

  // Create other cost lines for some job cards
  let clCount = 0;
  for (const jc of jobCards) {
    if (jc.status !== 'COMPLETED') continue;
    
    const hasOtherCosts = Math.random() > 0.6;
    if (!hasOtherCosts) continue;
    
    const numLines = randomInt(1, 3);
    for (let i = 0; i < numLines; i++) {
      const costTypes = ['TRANSPORT', 'TOLL', 'PARKING', 'MISC'];
      const costType = costTypes[randomInt(0, costTypes.length - 1)];
      const quantity = randomDecimal(1, 5);
      const unitCost = randomDecimal(500, 10000);
      const totalCost = quantity.mul(unitCost);
      
      await prisma.jcCostLine.create({
        data: {
          jobCardId: jc.id,
          costType,
          description: `${costType} charges`,
          quantity,
          unitCost,
          totalCost,
        },
      });
      clCount++;
    }
  }
  console.log(`✅ Created ${clCount} cost lines`);

  // Verification summary
  console.log('\n📊 Test Data Summary:');
  console.log(`   - Job Cards: ${jobCards.length}`);
  console.log(`   - Material Issues: ${miCount}`);
  console.log(`   - Time Logs: ${tlCount}`);
  console.log(`   - External Jobs: ${ejCount}`);
  console.log(`   - Cost Lines: ${clCount}`);
  console.log('\n✅ Seed completed successfully!');
  
  // Calculate expected costs for verification
  console.log('\n💰 Sample Cost Calculation Verification:');
  
  const sampleJC = jobCards[0];
  const sampleMaterials = await prisma.miLine.aggregate({
    where: { materialIssue: { jobCardId: sampleJC.id } },
    _sum: { totalCost: true },
  });
  const sampleLabour = await prisma.timeLog.aggregate({
    where: { jobCardId: sampleJC.id },
    _sum: { totalCost: true },
  });
  const sampleExternal = await prisma.externalJob.aggregate({
    where: { jobCardId: sampleJC.id },
    _sum: { actualCost: true, estimatedCost: true },
  });
  const sampleOther = await prisma.jcCostLine.aggregate({
    where: { jobCardId: sampleJC.id },
    _sum: { totalCost: true },
  });
  
  const materialCost = Number(sampleMaterials._sum.totalCost || 0);
  const labourCost = Number(sampleLabour._sum.totalCost || 0);
  const externalCost = Number(sampleExternal._sum.actualCost || sampleExternal._sum.estimatedCost || 0);
  const otherCost = Number(sampleOther._sum.totalCost || 0);
  
  const subtotal = materialCost + labourCost + externalCost + otherCost;
  const vat = subtotal * 0.10;
  const malvinas = subtotal * 0.05;
  const grandTotal = subtotal + vat + malvinas;
  
  console.log(`   Job Card: ${sampleJC.jobCardNumber}`);
  console.log(`   - Material Cost: LKR ${materialCost.toLocaleString()}`);
  console.log(`   - Labour Cost: LKR ${labourCost.toLocaleString()}`);
  console.log(`   - External Cost: LKR ${externalCost.toLocaleString()}`);
  console.log(`   - Other Cost: LKR ${otherCost.toLocaleString()}`);
  console.log(`   - Subtotal: LKR ${subtotal.toLocaleString()}`);
  console.log(`   - VAT (10%): LKR ${vat.toLocaleString()}`);
  console.log(`   - Malvinas (5%): LKR ${malvinas.toLocaleString()}`);
  console.log(`   - Grand Total: LKR ${grandTotal.toLocaleString()}`);
  
  console.log('\n📐 Formula Verification:');
  console.log(`   Subtotal = Material + Labour + External + Other`);
  console.log(`   ${subtotal} = ${materialCost} + ${labourCost} + ${externalCost} + ${otherCost}`);
  console.log(`   VAT = Subtotal × 0.10 = ${subtotal} × 0.10 = ${vat}`);
  console.log(`   Malvinas = Subtotal × 0.05 = ${subtotal} × 0.05 = ${malvinas}`);
  console.log(`   Grand Total = Subtotal + VAT + Malvinas = ${grandTotal}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
