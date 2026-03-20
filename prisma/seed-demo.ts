import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

// ============================================
// DEMO DATA SEED FOR WCP
// ============================================

export async function seedDemoData() {
  console.log('🎭 Starting demo data seed...\n');

  await seedDemoUsers();
  await seedDemoAssets();
  await seedDemoJobCards();
  await seedDemoMaterialRequests();
  await seedDemoMaterialIssues();
  await seedDemoTimeLogs();
  await seedDemoExternalJobs();
  await seedDemoPmSchedules();
  await seedDemoProcurementFlow();
  await seedDemoPhotoCategories();
  await seedDemoJcTasks();

  console.log('\n✨ Demo data seed completed!');
}

// ============================================
// DEMO USERS
// ============================================
async function seedDemoUsers() {
  console.log('👥 Seeding demo users...');
  
  const passwordHash = await hash('demo123', 10);
  
  const users = [
    { employeeId: 'DEMO-ADMIN', email: 'admin@demo.wcp', name: 'Demo Administrator', passwordHash, department: 'IT', contractType: 'PERMANENT' },
    { employeeId: 'DEMO-MGR', email: 'manager@demo.wcp', name: 'Demo Workshop Manager', passwordHash, department: 'Workshop', contractType: 'PERMANENT' },
    { employeeId: 'DEMO-SUP', email: 'supervisor@demo.wcp', name: 'Demo Supervisor', passwordHash, department: 'Workshop', contractType: 'PERMANENT' },
    { employeeId: 'DEMO-TECH', email: 'technician@demo.wcp', name: 'Demo Technician', passwordHash, department: 'Workshop', contractType: 'PERMANENT' },
    { employeeId: 'DEMO-STORE', email: 'storekeeper@demo.wcp', name: 'Demo Storekeeper', passwordHash, department: 'Stores', contractType: 'PERMANENT' },
  ];

  let count = 0;
  for (const user of users) {
    const existing = await db.user.findUnique({ where: { email: user.email } });
    if (!existing) {
      await db.user.create({ data: user });
      count++;
    }
  }
  console.log(`   ✓ Created ${count} new demo users`);
}

// ============================================
// DEMO ASSETS
// ============================================
async function seedDemoAssets() {
  console.log('🚗 Seeding demo assets...');
  
  const categories = await db.assetCategory.findMany();
  const catMap = Object.fromEntries(categories.map(c => [c.code, c.id]));
  
  const assets = [
    // Vehicles
    { assetNumber: 'DEMO-VEH-001', categoryId: catMap['VEHICLE'], name: 'Toyota Land Cruiser', make: 'Toyota', model: 'Land Cruiser V8', yearOfManufacture: 2022, status: 'OPERATIONAL', criticality: 'HIGH', currentLocation: 'Main Workshop' },
    { assetNumber: 'DEMO-VEH-002', categoryId: catMap['VEHICLE'], name: 'Mitsubishi Pajero', make: 'Mitsubishi', model: 'Pajero Sport', yearOfManufacture: 2021, status: 'OPERATIONAL', criticality: 'MEDIUM', currentLocation: 'Site A' },
    { assetNumber: 'DEMO-VEH-003', categoryId: catMap['VEHICLE'], name: 'Ford Ranger Pickup', make: 'Ford', model: 'Ranger 3.2L', yearOfManufacture: 2023, status: 'UNDER_REPAIR', criticality: 'HIGH', currentLocation: 'Main Workshop' },
    { assetNumber: 'DEMO-VEH-004', categoryId: catMap['VEHICLE'], name: 'Isuzu D-Max', make: 'Isuzu', model: 'D-Max 4x4', yearOfManufacture: 2020, status: 'OPERATIONAL', criticality: 'MEDIUM', currentLocation: 'Site B' },
    
    // Generators
    { assetNumber: 'DEMO-GEN-001', categoryId: catMap['GENERATOR'], name: 'Caterpillar 500kVA Generator', make: 'Caterpillar', model: 'C18', yearOfManufacture: 2019, status: 'OPERATIONAL', criticality: 'CRITICAL', currentLocation: 'Power House' },
    { assetNumber: 'DEMO-GEN-002', categoryId: catMap['GENERATOR'], name: 'Perkins 250kVA Generator', make: 'Perkins', model: '2806C', yearOfManufacture: 2020, status: 'STANDBY', criticality: 'HIGH', currentLocation: 'Backup Power' },
    { assetNumber: 'DEMO-GEN-003', categoryId: catMap['GENERATOR'], name: 'Cummins 100kVA Generator', make: 'Cummins', model: '6BTAA', yearOfManufacture: 2018, status: 'UNDER_REPAIR', criticality: 'MEDIUM', currentLocation: 'Workshop Bay 2' },
    
    // Plant Equipment
    { assetNumber: 'DEMO-PLT-001', categoryId: catMap['PLANT'], name: 'JCB Backhoe Loader', make: 'JCB', model: '3CX', yearOfManufacture: 2021, status: 'OPERATIONAL', criticality: 'HIGH', currentLocation: 'Site A' },
    { assetNumber: 'DEMO-PLT-002', categoryId: catMap['PLANT'], name: 'CAT Excavator', make: 'Caterpillar', model: '320D', yearOfManufacture: 2020, status: 'OPERATIONAL', criticality: 'CRITICAL', currentLocation: 'Site B' },
    { assetNumber: 'DEMO-PLT-003', categoryId: catMap['PLANT'], name: 'Bobcat Skid Steer', make: 'Bobcat', model: 'S650', yearOfManufacture: 2022, status: 'OPERATIONAL', criticality: 'MEDIUM', currentLocation: 'Site A' },
    
    // Compressors
    { assetNumber: 'DEMO-CMP-001', categoryId: catMap['COMPRESSOR'], name: 'Atlas Copco Air Compressor', make: 'Atlas Copco', model: 'GA37', yearOfManufacture: 2021, status: 'OPERATIONAL', criticality: 'HIGH', currentLocation: 'Compressor Room' },
    { assetNumber: 'DEMO-CMP-002', categoryId: catMap['COMPRESSOR'], name: 'Ingersoll Rand Compressor', make: 'Ingersoll Rand', model: 'R90n', yearOfManufacture: 2019, status: 'OPERATIONAL', criticality: 'MEDIUM', currentLocation: 'Workshop' },
  ];

  let count = 0;
  for (const asset of assets) {
    if (!asset.categoryId) continue;
    
    const existing = await db.asset.findUnique({ where: { assetNumber: asset.assetNumber } });
    if (!existing) {
      await db.asset.create({ data: asset });
      count++;
    }
  }
  console.log(`   ✓ Created ${count} new demo assets`);
}

// ============================================
// DEMO JOB CARDS
// ============================================
async function seedDemoJobCards() {
  console.log('🔧 Seeding demo job cards...');
  
  const assets = await db.asset.findMany({ where: { assetNumber: { startsWith: 'DEMO-' } } });
  const users = await db.user.findMany({ where: { email: { endsWith: '@demo.wcp' } } });
  
  const assetMap = Object.fromEntries(assets.map(a => [a.assetNumber, a.id]));
  const userMap = Object.fromEntries(users.map(u => [u.email, u.id]));
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  const jobCards = [
    // Completed/Closed Job Cards (for cost report testing)
    {
      jobCardNumber: 'DEMO-JC-001',
      assetId: assetMap['DEMO-VEH-001'],
      jobType: 'CORRECTIVE',
      priority: 'HIGH',
      status: 'CLOSED',
      faultDescription: 'Engine overheating due to radiator leak. Coolant level dropping rapidly.',
      diagnosisNotes: 'Radiator core damaged, requires replacement. Water pump showing wear.',
      workPerformed: 'Replaced radiator, water pump, and thermostat. Flushed cooling system and refilled with new coolant.',
      estimatedCost: 850,
      actualCost: 920,
      estimatedDuration: 6,
      actualDuration: 7,
      scheduledStart: new Date(now - 30 * dayMs),
      scheduledEnd: new Date(now - 29 * dayMs),
      actualStart: new Date(now - 30 * dayMs),
      actualEnd: new Date(now - 29 * dayMs),
      createdBy: userMap['technician@demo.wcp'],
      closedBy: userMap['supervisor@demo.wcp'],
      closedAt: new Date(now - 28 * dayMs),
    },
    {
      jobCardNumber: 'DEMO-JC-002',
      assetId: assetMap['DEMO-GEN-001'],
      jobType: 'PREVENTIVE',
      priority: 'NORMAL',
      status: 'CLOSED',
      faultDescription: 'Scheduled 500-hour maintenance service',
      diagnosisNotes: 'Regular preventive maintenance as per manufacturer guidelines',
      workPerformed: 'Oil change, filter replacements, belt inspection, fuel system check, coolant level adjustment',
      estimatedCost: 450,
      actualCost: 420,
      estimatedDuration: 4,
      actualDuration: 3,
      scheduledStart: new Date(now - 25 * dayMs),
      scheduledEnd: new Date(now - 25 * dayMs),
      actualStart: new Date(now - 25 * dayMs),
      actualEnd: new Date(now - 25 * dayMs),
      createdBy: userMap['supervisor@demo.wcp'],
      closedBy: userMap['manager@demo.wcp'],
      closedAt: new Date(now - 24 * dayMs),
    },
    {
      jobCardNumber: 'DEMO-JC-003',
      assetId: assetMap['DEMO-VEH-003'],
      jobType: 'CORRECTIVE',
      priority: 'EMERGENCY',
      status: 'CLOSED',
      faultDescription: 'Complete brake failure - vehicle unsafe to operate',
      diagnosisNotes: 'Master cylinder failed, front brake pads worn to metal, brake lines corroded',
      workPerformed: 'Replaced master cylinder, all brake pads, brake fluid flush, replaced corroded lines',
      estimatedCost: 1200,
      actualCost: 1450,
      estimatedDuration: 8,
      actualDuration: 10,
      scheduledStart: new Date(now - 20 * dayMs),
      scheduledEnd: new Date(now - 19 * dayMs),
      actualStart: new Date(now - 20 * dayMs),
      actualEnd: new Date(now - 18 * dayMs),
      createdBy: userMap['technician@demo.wcp'],
      closedBy: userMap['supervisor@demo.wcp'],
      closedAt: new Date(now - 17 * dayMs),
    },
    {
      jobCardNumber: 'DEMO-JC-004',
      assetId: assetMap['DEMO-PLT-001'],
      jobType: 'CORRECTIVE',
      priority: 'HIGH',
      status: 'CLOSED',
      faultDescription: 'Hydraulic system leak, slow bucket operation',
      diagnosisNotes: 'Hydraulic hose burst at boom cylinder connection',
      workPerformed: 'Replaced hydraulic hose, topped up hydraulic fluid, tested all hydraulic functions',
      estimatedCost: 380,
      actualCost: 350,
      estimatedDuration: 3,
      actualDuration: 2,
      scheduledStart: new Date(now - 15 * dayMs),
      scheduledEnd: new Date(now - 15 * dayMs),
      actualStart: new Date(now - 15 * dayMs),
      actualEnd: new Date(now - 15 * dayMs),
      createdBy: userMap['technician@demo.wcp'],
      closedBy: userMap['supervisor@demo.wcp'],
      closedAt: new Date(now - 14 * dayMs),
    },
    {
      jobCardNumber: 'DEMO-JC-005',
      assetId: assetMap['DEMO-CMP-001'],
      jobType: 'PREVENTIVE',
      priority: 'NORMAL',
      status: 'CLOSED',
      faultDescription: 'Quarterly air filter and oil service',
      diagnosisNotes: 'Routine maintenance check',
      workPerformed: 'Replaced air filter, oil filter, compressor oil. Checked belt tension and cleaned intake.',
      estimatedCost: 280,
      actualCost: 295,
      estimatedDuration: 2,
      actualDuration: 2,
      scheduledStart: new Date(now - 10 * dayMs),
      scheduledEnd: new Date(now - 10 * dayMs),
      actualStart: new Date(now - 10 * dayMs),
      actualEnd: new Date(now - 10 * dayMs),
      createdBy: userMap['supervisor@demo.wcp'],
      closedBy: userMap['manager@demo.wcp'],
      closedAt: new Date(now - 9 * dayMs),
    },
    {
      jobCardNumber: 'DEMO-JC-006',
      assetId: assetMap['DEMO-VEH-002'],
      jobType: 'CORRECTIVE',
      priority: 'MEDIUM',
      status: 'CLOSED',
      faultDescription: 'AC system not cooling properly',
      diagnosisNotes: 'Refrigerant leak at condenser connection',
      workPerformed: 'Repaired leak, recharged AC system with refrigerant, replaced cabin filter',
      estimatedCost: 200,
      actualCost: 180,
      estimatedDuration: 2,
      actualDuration: 2,
      scheduledStart: new Date(now - 8 * dayMs),
      scheduledEnd: new Date(now - 8 * dayMs),
      actualStart: new Date(now - 8 * dayMs),
      actualEnd: new Date(now - 8 * dayMs),
      createdBy: userMap['technician@demo.wcp'],
      closedBy: userMap['supervisor@demo.wcp'],
      closedAt: new Date(now - 7 * dayMs),
    },
    {
      jobCardNumber: 'DEMO-JC-007',
      assetId: assetMap['DEMO-GEN-002'],
      jobType: 'PREVENTIVE',
      priority: 'LOW',
      status: 'CLOSED',
      faultDescription: 'Annual inspection and load test',
      diagnosisNotes: 'Routine annual certification',
      workPerformed: 'Full inspection, load test completed, certification documentation prepared',
      estimatedCost: 500,
      actualCost: 500,
      estimatedDuration: 4,
      actualDuration: 4,
      scheduledStart: new Date(now - 5 * dayMs),
      scheduledEnd: new Date(now - 5 * dayMs),
      actualStart: new Date(now - 5 * dayMs),
      actualEnd: new Date(now - 5 * dayMs),
      createdBy: userMap['manager@demo.wcp'],
      closedBy: userMap['admin@demo.wcp'],
      closedAt: new Date(now - 4 * dayMs),
    },
    {
      jobCardNumber: 'DEMO-JC-008',
      assetId: assetMap['DEMO-PLT-002'],
      jobType: 'CORRECTIVE',
      priority: 'HIGH',
      status: 'CLOSED',
      faultDescription: 'Track tension issue, track slipping off',
      diagnosisNotes: 'Track adjuster seal failed, hydraulic fluid leak',
      workPerformed: 'Replaced track adjuster seal, refilled hydraulic fluid, adjusted track tension',
      estimatedCost: 600,
      actualCost: 720,
      estimatedDuration: 5,
      actualDuration: 6,
      scheduledStart: new Date(now - 3 * dayMs),
      scheduledEnd: new Date(now - 2 * dayMs),
      actualStart: new Date(now - 3 * dayMs),
      actualEnd: new Date(now - 2 * dayMs),
      createdBy: userMap['technician@demo.wcp'],
      closedBy: userMap['supervisor@demo.wcp'],
      closedAt: new Date(now - 1 * dayMs),
    },
    
    // Active Job Cards (various states)
    {
      jobCardNumber: 'DEMO-JC-009',
      assetId: assetMap['DEMO-VEH-004'],
      jobType: 'PREVENTIVE',
      priority: 'NORMAL',
      status: 'IN_PROGRESS',
      faultDescription: 'Scheduled 20,000 km service',
      diagnosisNotes: 'Regular service as per maintenance schedule',
      estimatedCost: 350,
      estimatedDuration: 4,
      scheduledStart: new Date(now - 1 * dayMs),
      scheduledEnd: new Date(now + 1 * dayMs),
      actualStart: new Date(now - 1 * dayMs),
      createdBy: userMap['supervisor@demo.wcp'],
    },
    {
      jobCardNumber: 'DEMO-JC-010',
      assetId: assetMap['DEMO-GEN-003'],
      jobType: 'CORRECTIVE',
      priority: 'HIGH',
      status: 'APPROVED',
      faultDescription: 'Generator not starting, battery and starter issues',
      diagnosisNotes: 'Starter motor failed, battery below threshold',
      estimatedCost: 800,
      estimatedDuration: 4,
      scheduledStart: new Date(now + 1 * dayMs),
      scheduledEnd: new Date(now + 2 * dayMs),
      createdBy: userMap['technician@demo.wcp'],
    },
    {
      jobCardNumber: 'DEMO-JC-011',
      assetId: assetMap['DEMO-CMP-002'],
      jobType: 'CORRECTIVE',
      priority: 'MEDIUM',
      status: 'DRAFT',
      faultDescription: 'Unusual noise during operation',
      diagnosisNotes: null,
      estimatedCost: 200,
      estimatedDuration: 2,
      createdBy: userMap['technician@demo.wcp'],
    },
    {
      jobCardNumber: 'DEMO-JC-012',
      assetId: assetMap['DEMO-PLT-003'],
      jobType: 'INSPECTION',
      priority: 'NORMAL',
      status: 'APPROVED',
      faultDescription: 'Annual safety inspection',
      diagnosisNotes: 'Mandatory yearly safety certification',
      estimatedCost: 150,
      estimatedDuration: 2,
      scheduledStart: new Date(now + 3 * dayMs),
      scheduledEnd: new Date(now + 3 * dayMs),
      createdBy: userMap['manager@demo.wcp'],
    },
  ];

  let count = 0;
  for (const jc of jobCards) {
    if (!jc.assetId || !jc.createdBy) continue;
    
    const existing = await db.jobCard.findUnique({ where: { jobCardNumber: jc.jobCardNumber } });
    if (!existing) {
      await db.jobCard.create({ data: jc });
      count++;
    }
  }
  console.log(`   ✓ Created ${count} new demo job cards`);
}

// ============================================
// DEMO MATERIAL REQUESTS
// ============================================
async function seedDemoMaterialRequests() {
  console.log('📝 Seeding demo material requests...');
  
  const users = await db.user.findMany({ where: { email: { endsWith: '@demo.wcp' } } });
  const jobCards = await db.jobCard.findMany({ where: { jobCardNumber: { startsWith: 'DEMO-' } } });
  const items = await db.item.findMany();
  
  const userMap = Object.fromEntries(users.map(u => [u.email, u.id]));
  const jcMap = Object.fromEntries(jobCards.map(jc => [jc.jobCardNumber, jc.id]));
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  const requests = [
    {
      mrNumber: 'DEMO-MR-001',
      jobCardId: jcMap['DEMO-JC-001'],
      requestorId: userMap['technician@demo.wcp'] || userMap['supervisor@demo.wcp'],
      requestType: 'JC_LINKED',
      priority: 'HIGH',
      status: 'FULFILLED',
      approvedAt: new Date(now - 29 * dayMs),
      fulfilledAt: new Date(now - 28 * dayMs),
      lines: {
        create: [
          { lineNumber: 1, itemId: items.find(i => i.itemCode === 'FLT-001')?.id, requestedQty: 2, approvedQty: 2, issuedQty: 2, status: 'FULFILLED' },
          { lineNumber: 2, itemId: items.find(i => i.itemCode === 'OIL-001')?.id, requestedQty: 10, approvedQty: 10, issuedQty: 10, status: 'FULFILLED' },
        ]
      }
    },
    {
      mrNumber: 'DEMO-MR-002',
      jobCardId: jcMap['DEMO-JC-002'],
      requestorId: userMap['supervisor@demo.wcp'] || userMap['manager@demo.wcp'],
      requestType: 'JC_LINKED',
      priority: 'NORMAL',
      status: 'FULFILLED',
      approvedAt: new Date(now - 24 * dayMs),
      fulfilledAt: new Date(now - 24 * dayMs),
      lines: {
        create: [
          { lineNumber: 1, itemId: items.find(i => i.itemCode === 'OIL-001')?.id, requestedQty: 20, approvedQty: 20, issuedQty: 20, status: 'FULFILLED' },
          { lineNumber: 2, itemId: items.find(i => i.itemCode === 'FLT-002')?.id, requestedQty: 2, approvedQty: 2, issuedQty: 2, status: 'FULFILLED' },
        ]
      }
    },
    {
      mrNumber: 'DEMO-MR-003',
      jobCardId: jcMap['DEMO-JC-009'],
      requestorId: userMap['technician@demo.wcp'] || userMap['supervisor@demo.wcp'],
      requestType: 'JC_LINKED',
      priority: 'NORMAL',
      status: 'APPROVED',
      approvedAt: new Date(now - 1 * dayMs),
      lines: {
        create: [
          { lineNumber: 1, itemId: items.find(i => i.itemCode === 'OIL-001')?.id, requestedQty: 15, approvedQty: 15, status: 'APPROVED' },
          { lineNumber: 2, itemId: items.find(i => i.itemCode === 'FLT-001')?.id, requestedQty: 1, approvedQty: 1, status: 'APPROVED' },
          { lineNumber: 3, itemId: items.find(i => i.itemCode === 'FLT-002')?.id, requestedQty: 1, approvedQty: 1, status: 'APPROVED' },
        ]
      }
    },
  ];

  let count = 0;
  for (const mr of requests) {
    if (!mr.requestorId) continue;
    
    const existing = await db.materialRequest.findUnique({ where: { mrNumber: mr.mrNumber } });
    if (!existing) {
      // Filter out lines with null itemId
      const validLines = mr.lines.create.filter((l: any) => l.itemId);
      if (validLines.length === 0) continue;
      
      await db.materialRequest.create({
        data: {
          mrNumber: mr.mrNumber,
          jobCardId: mr.jobCardId,
          requestorId: mr.requestorId,
          requestType: mr.requestType,
          priority: mr.priority,
          status: mr.status,
          approvedAt: mr.approvedAt,
          fulfilledAt: mr.fulfilledAt,
          lines: { create: validLines }
        }
      });
      count++;
    }
  }
  console.log(`   ✓ Created ${count} new demo material requests`);
}

// ============================================
// DEMO MATERIAL ISSUES
// ============================================
async function seedDemoMaterialIssues() {
  console.log('📦 Seeding demo material issues...');
  
  const users = await db.user.findMany({ where: { email: { endsWith: '@demo.wcp' } } });
  const jobCards = await db.jobCard.findMany({ 
    where: { 
      jobCardNumber: { startsWith: 'DEMO-' },
      status: 'CLOSED'
    } 
  });
  const items = await db.item.findMany();
  const stores = await db.store.findMany();
  
  const userMap = Object.fromEntries(users.map(u => [u.email, u.id]));
  const mainStore = stores.find(s => s.code === 'MAIN');
  
  if (!mainStore) {
    console.log('   ⚠ Main store not found, skipping material issues');
    return;
  }
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  const issues = [
    {
      miNumber: 'DEMO-MI-001',
      storeId: mainStore.id,
      issuedToId: userMap['technician@demo.wcp'] || Object.values(userMap)[0],
      issuedBy: userMap['storekeeper@demo.wcp'] || Object.values(userMap)[0],
      jobCardId: jobCards[0]?.id,
      status: 'ISSUED',
      issuedAt: new Date(now - 28 * dayMs),
      lines: {
        create: [
          { itemId: items.find(i => i.itemCode === 'FLT-001')?.id, issuedQty: 2, unitCost: 25, totalCost: 50 },
          { itemId: items.find(i => i.itemCode === 'OIL-001')?.id, issuedQty: 10, unitCost: 8, totalCost: 80 },
        ].filter(l => l.itemId)
      }
    },
    {
      miNumber: 'DEMO-MI-002',
      storeId: mainStore.id,
      issuedToId: userMap['technician@demo.wcp'] || Object.values(userMap)[0],
      issuedBy: userMap['storekeeper@demo.wcp'] || Object.values(userMap)[0],
      jobCardId: jobCards[1]?.id,
      status: 'ISSUED',
      issuedAt: new Date(now - 24 * dayMs),
      lines: {
        create: [
          { itemId: items.find(i => i.itemCode === 'OIL-001')?.id, issuedQty: 20, unitCost: 8, totalCost: 160 },
          { itemId: items.find(i => i.itemCode === 'FLT-002')?.id, issuedQty: 2, unitCost: 30, totalCost: 60 },
        ].filter(l => l.itemId)
      }
    },
    {
      miNumber: 'DEMO-MI-003',
      storeId: mainStore.id,
      issuedToId: userMap['technician@demo.wcp'] || Object.values(userMap)[0],
      issuedBy: userMap['storekeeper@demo.wcp'] || Object.values(userMap)[0],
      jobCardId: jobCards[2]?.id,
      status: 'ISSUED',
      issuedAt: new Date(now - 18 * dayMs),
      lines: {
        create: [
          { itemId: items.find(i => i.itemCode === 'ELC-002')?.id, issuedQty: 1, unitCost: 150, totalCost: 150 },
          { itemId: items.find(i => i.itemCode === 'OIL-003')?.id, issuedQty: 3, unitCost: 12, totalCost: 36 },
        ].filter(l => l.itemId)
      }
    },
  ];

  let count = 0;
  for (const mi of issues) {
    if (!mi.issuedToId || !mi.issuedBy) continue;
    
    const existing = await db.materialIssue.findUnique({ where: { miNumber: mi.miNumber } });
    if (!existing) {
      if (mi.lines.create.length === 0) continue;
      
      await db.materialIssue.create({
        data: {
          miNumber: mi.miNumber,
          storeId: mi.storeId,
          issuedToId: mi.issuedToId,
          issuedBy: mi.issuedBy,
          jobCardId: mi.jobCardId,
          status: mi.status,
          issuedAt: mi.issuedAt,
          lines: mi.lines
        }
      });
      count++;
    }
  }
  console.log(`   ✓ Created ${count} new demo material issues`);
}

// ============================================
// DEMO TIME LOGS
// ============================================
async function seedDemoTimeLogs() {
  console.log('⏱️ Seeding demo time logs...');
  
  const users = await db.user.findMany({ where: { email: { endsWith: '@demo.wcp' } } });
  const jobCards = await db.jobCard.findMany({ 
    where: { 
      jobCardNumber: { startsWith: 'DEMO-' },
      status: 'CLOSED'
    } 
  });
  const employees = await db.employee.findMany();
  
  const userMap = Object.fromEntries(users.map(u => [u.email, u.id]));
  const employeeMap = Object.fromEntries(employees.map(e => [e.employeeNumber, e.id]));
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  const timeLogs = [
    // JC-001 time logs
    { employeeId: employeeMap['EMP002'] || employees[0]?.id, jobCardId: jobCards[0]?.id, logDate: new Date(now - 30 * dayMs), startTime: new Date(now - 30 * dayMs + 8 * 3600000), endTime: new Date(now - 30 * dayMs + 12 * 3600000), totalMinutes: 240, hourlyRate: 25, totalCost: 100 },
    { employeeId: employeeMap['EMP002'] || employees[0]?.id, jobCardId: jobCards[0]?.id, logDate: new Date(now - 29 * dayMs), startTime: new Date(now - 29 * dayMs + 8 * 3600000), endTime: new Date(now - 29 * dayMs + 11 * 3600000), totalMinutes: 180, hourlyRate: 25, totalCost: 75 },
    
    // JC-002 time logs
    { employeeId: employeeMap['EMP003'] || employees[1]?.id, jobCardId: jobCards[1]?.id, logDate: new Date(now - 25 * dayMs), startTime: new Date(now - 25 * dayMs + 8 * 3600000), endTime: new Date(now - 25 * dayMs + 11 * 3600000), totalMinutes: 180, hourlyRate: 18, totalCost: 54 },
    
    // JC-003 time logs
    { employeeId: employeeMap['EMP002'] || employees[0]?.id, jobCardId: jobCards[2]?.id, logDate: new Date(now - 20 * dayMs), startTime: new Date(now - 20 * dayMs + 8 * 3600000), endTime: new Date(now - 20 * dayMs + 14 * 3600000), totalMinutes: 360, hourlyRate: 25, totalCost: 150 },
    { employeeId: employeeMap['EMP003'] || employees[1]?.id, jobCardId: jobCards[2]?.id, logDate: new Date(now - 19 * dayMs), startTime: new Date(now - 19 * dayMs + 8 * 3600000), endTime: new Date(now - 19 * dayMs + 12 * 3600000), totalMinutes: 240, hourlyRate: 18, totalCost: 72 },
    
    // JC-004 time logs
    { employeeId: employeeMap['EMP002'] || employees[0]?.id, jobCardId: jobCards[3]?.id, logDate: new Date(now - 15 * dayMs), startTime: new Date(now - 15 * dayMs + 8 * 3600000), endTime: new Date(now - 15 * dayMs + 10 * 3600000), totalMinutes: 120, hourlyRate: 25, totalCost: 50 },
    
    // JC-005 time logs
    { employeeId: employeeMap['EMP003'] || employees[1]?.id, jobCardId: jobCards[4]?.id, logDate: new Date(now - 10 * dayMs), startTime: new Date(now - 10 * dayMs + 8 * 3600000), endTime: new Date(now - 10 * dayMs + 10 * 3600000), totalMinutes: 120, hourlyRate: 18, totalCost: 36 },
    
    // JC-006 time logs
    { employeeId: employeeMap['EMP002'] || employees[0]?.id, jobCardId: jobCards[5]?.id, logDate: new Date(now - 8 * dayMs), startTime: new Date(now - 8 * dayMs + 8 * 3600000), endTime: new Date(now - 8 * dayMs + 10 * 3600000), totalMinutes: 120, hourlyRate: 25, totalCost: 50 },
    
    // JC-007 time logs
    { employeeId: employeeMap['EMP004'] || employees[2]?.id, jobCardId: jobCards[6]?.id, logDate: new Date(now - 5 * dayMs), startTime: new Date(now - 5 * dayMs + 8 * 3600000), endTime: new Date(now - 5 * dayMs + 12 * 3600000), totalMinutes: 240, hourlyRate: 35, totalCost: 140 },
    
    // JC-008 time logs
    { employeeId: employeeMap['EMP002'] || employees[0]?.id, jobCardId: jobCards[7]?.id, logDate: new Date(now - 3 * dayMs), startTime: new Date(now - 3 * dayMs + 8 * 3600000), endTime: new Date(now - 3 * dayMs + 13 * 3600000), totalMinutes: 300, hourlyRate: 25, totalCost: 125 },
    { employeeId: employeeMap['EMP003'] || employees[1]?.id, jobCardId: jobCards[7]?.id, logDate: new Date(now - 2 * dayMs), startTime: new Date(now - 2 * dayMs + 8 * 3600000), endTime: new Date(now - 2 * dayMs + 9 * 3600000), totalMinutes: 60, hourlyRate: 18, totalCost: 18 },
  ];

  let count = 0;
  for (const tl of timeLogs) {
    if (!tl.employeeId || !tl.jobCardId) continue;
    
    const existing = await db.timeLog.findFirst({
      where: {
        employeeId: tl.employeeId,
        jobCardId: tl.jobCardId,
        logDate: tl.logDate
      }
    });
    
    if (!existing) {
      await db.timeLog.create({ data: tl });
      count++;
    }
  }
  console.log(`   ✓ Created ${count} new demo time logs`);
}

// ============================================
// DEMO EXTERNAL JOBS
// ============================================
async function seedDemoExternalJobs() {
  console.log('🔧 Seeding demo external jobs...');
  
  const jobCards = await db.jobCard.findMany({ 
    where: { 
      jobCardNumber: { startsWith: 'DEMO-' },
      status: 'CLOSED'
    } 
  });
  const subcontractors = await db.subcontractor.findMany();
  
  const jcMap = Object.fromEntries(jobCards.map(jc => [jc.jobCardNumber, jc.id]));
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  const externalJobs = [
    {
      jobNumber: 'DEMO-EJ-001',
      jobCardId: jcMap['DEMO-JC-001'],
      subcontractorId: subcontractors[0]?.id,
      jobType: 'REPAIR',
      status: 'COMPLETED',
      estimatedCost: 200,
      actualCost: 220,
      completedAt: new Date(now - 28 * dayMs),
    },
    {
      jobNumber: 'DEMO-EJ-002',
      jobCardId: jcMap['DEMO-JC-003'],
      subcontractorId: subcontractors[1]?.id,
      jobType: 'OVERHAUL',
      status: 'COMPLETED',
      estimatedCost: 400,
      actualCost: 450,
      completedAt: new Date(now - 17 * dayMs),
    },
    {
      jobNumber: 'DEMO-EJ-003',
      jobCardId: jcMap['DEMO-JC-008'],
      subcontractorId: subcontractors[2]?.id,
      jobType: 'REPAIR',
      status: 'COMPLETED',
      estimatedCost: 300,
      actualCost: 280,
      completedAt: new Date(now - 1 * dayMs),
    },
  ];

  let count = 0;
  for (const ej of externalJobs) {
    if (!ej.subcontractorId) continue;
    
    const existing = await db.externalJob.findUnique({ where: { jobNumber: ej.jobNumber } });
    if (!existing) {
      await db.externalJob.create({ data: ej });
      count++;
    }
  }
  console.log(`   ✓ Created ${count} new demo external jobs`);
}

// ============================================
// DEMO PM SCHEDULES
// ============================================
async function seedDemoPmSchedules() {
  console.log('📅 Seeding demo PM schedules...');
  
  const assets = await db.asset.findMany({ where: { assetNumber: { startsWith: 'DEMO-' } } });
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  const pmSchedules = [
    { scheduleNumber: 'DEMO-PM-001', assetId: assets.find(a => a.assetNumber === 'DEMO-VEH-001')?.id, pmType: '5000KM_SERVICE', calendarInterval: 30, nextExecutionAt: new Date(now + 15 * dayMs), status: 'ACTIVE' },
    { scheduleNumber: 'DEMO-PM-002', assetId: assets.find(a => a.assetNumber === 'DEMO-VEH-002')?.id, pmType: '10000KM_SERVICE', calendarInterval: 90, nextExecutionAt: new Date(now + 45 * dayMs), status: 'ACTIVE' },
    { scheduleNumber: 'DEMO-PM-003', assetId: assets.find(a => a.assetNumber === 'DEMO-VEH-003')?.id, pmType: '5000KM_SERVICE', calendarInterval: 30, nextExecutionAt: new Date(now + 10 * dayMs), status: 'ACTIVE' },
    { scheduleNumber: 'DEMO-PM-004', assetId: assets.find(a => a.assetNumber === 'DEMO-GEN-001')?.id, pmType: '500H_SERVICE', calendarInterval: 30, nextExecutionAt: new Date(now + 20 * dayMs), status: 'ACTIVE' },
    { scheduleNumber: 'DEMO-PM-005', assetId: assets.find(a => a.assetNumber === 'DEMO-GEN-002')?.id, pmType: '250H_SERVICE', calendarInterval: 90, nextExecutionAt: new Date(now + 60 * dayMs), status: 'ACTIVE' },
    { scheduleNumber: 'DEMO-PM-006', assetId: assets.find(a => a.assetNumber === 'DEMO-CMP-001')?.id, pmType: 'QUARTERLY_FILTER', calendarInterval: 90, nextExecutionAt: new Date(now + 30 * dayMs), status: 'ACTIVE' },
    { scheduleNumber: 'DEMO-PM-007', assetId: assets.find(a => a.assetNumber === 'DEMO-PLT-001')?.id, pmType: 'MONTHLY_CHECK', calendarInterval: 30, nextExecutionAt: new Date(now - 5 * dayMs), status: 'ACTIVE' },
    { scheduleNumber: 'DEMO-PM-008', assetId: assets.find(a => a.assetNumber === 'DEMO-PLT-002')?.id, pmType: 'MONTHLY_CHECK', calendarInterval: 30, nextExecutionAt: new Date(now + 25 * dayMs), status: 'ACTIVE' },
  ];

  let count = 0;
  for (const pm of pmSchedules) {
    if (!pm.assetId) continue;
    
    const existing = await db.pmSchedule.findFirst({
      where: { assetId: pm.assetId, pmType: pm.pmType }
    });
    
    if (!existing) {
      await db.pmSchedule.create({ data: pm });
      count++;
    }
  }
  console.log(`   ✓ Created ${count} new demo PM schedules`);
}

// ============================================
// DEMO PROCUREMENT FLOW (PR → RFQ → PO → GRN)
// ============================================
async function seedDemoProcurementFlow() {
  console.log('🛒 Seeding demo procurement flow...');
  
  const users = await db.user.findMany({ where: { email: { endsWith: '@demo.wcp' } } });
  const suppliers = await db.supplier.findMany();
  const items = await db.item.findMany();
  const stores = await db.store.findMany();
  
  const userMap = Object.fromEntries(users.map(u => [u.email, u.id]));
  const mainStore = stores.find(s => s.code === 'MAIN');
  
  if (!mainStore) {
    console.log('   ⚠ Main store not found, skipping procurement flow');
    return;
  }
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  // Create Purchase Request
  const existingPR = await db.purchaseRequest.findUnique({ where: { prNumber: 'DEMO-PR-001' } });
  if (!existingPR) {
    const pr = await db.purchaseRequest.create({
      data: {
        prNumber: 'DEMO-PR-001',
        requestorId: userMap['supervisor@demo.wcp'] || userMap['manager@demo.wcp'] || users[0]?.id,
        department: 'Workshop',
        requestType: 'STANDARD',
        priority: 'HIGH',
        status: 'APPROVED',
        procurementChannel: 'LOCAL',
        estimatedValue: 450,
        approvedValue: 450,
        approvedAt: new Date(now - 10 * dayMs),
        lines: {
          create: [
            { lineNumber: 1, itemId: items.find(i => i.itemCode === 'FLT-001')?.id, description: 'Oil Filter - Toyota Hilux', quantity: 10, unitOfMeasure: 'PCS', estimatedCost: 25, totalEstCost: 250 },
            { lineNumber: 2, itemId: items.find(i => i.itemCode === 'OIL-001')?.id, description: 'Engine Oil 15W-40 (20L)', quantity: 25, unitOfMeasure: 'LTR', estimatedCost: 8, totalEstCost: 200 },
          ].filter(l => l.itemId)
        }
      }
    });
    console.log(`   ✓ Created demo purchase request`);
    
    // Create RFQ
    const rfq = await db.rfqHeader.create({
      data: {
        rfqNumber: 'DEMO-RFQ-001',
        prId: pr.id,
        status: 'CLOSED',
        issueDate: new Date(now - 9 * dayMs),
        closingDate: new Date(now - 7 * dayMs),
        lines: {
          create: [
            { itemId: items.find(i => i.itemCode === 'FLT-001')?.id, description: 'Oil Filter - Toyota Hilux', quantity: 10, unitOfMeasure: 'PCS' },
            { itemId: items.find(i => i.itemCode === 'OIL-001')?.id, description: 'Engine Oil 15W-40 (20L)', quantity: 25, unitOfMeasure: 'LTR' },
          ].filter(l => l.itemId)
        },
        suppliers: {
          create: suppliers.slice(0, 3).map((s, idx) => ({
            supplierId: s.id,
            sentAt: new Date(now - 9 * dayMs),
            respondedAt: new Date(now - 7 * dayMs + idx * 3600000),
            status: 'RESPONDED'
          }))
        }
      }
    });
    console.log(`   ✓ Created demo RFQ`);
    
    // Create Quotations
    if (suppliers.length >= 2) {
      const quotation1 = await db.quotation.create({
        data: {
          quotationNumber: 'DEMO-QT-001',
          rfqId: rfq.id,
          supplierId: suppliers[0].id,
          quotationDate: new Date(now - 7 * dayMs),
          validUntil: new Date(now + 30 * dayMs),
          currency: 'LKR',
          totalValue: 420,
          status: 'ACCEPTED',
          lines: {
            create: [
              { itemId: items.find(i => i.itemCode === 'FLT-001')?.id, description: 'Oil Filter - Toyota Hilux', quantity: 10, unitPrice: 24, totalPrice: 240 },
              { itemId: items.find(i => i.itemCode === 'OIL-001')?.id, description: 'Engine Oil 15W-40 (20L)', quantity: 25, unitPrice: 7.2, totalPrice: 180 },
            ].filter(l => l.itemId)
          }
        }
      });
      console.log(`   ✓ Created demo quotation 1`);
      
      const quotation2 = await db.quotation.create({
        data: {
          quotationNumber: 'DEMO-QT-002',
          rfqId: rfq.id,
          supplierId: suppliers[1].id,
          quotationDate: new Date(now - 7 * dayMs),
          validUntil: new Date(now + 30 * dayMs),
          currency: 'LKR',
          totalValue: 475,
          status: 'REJECTED',
          lines: {
            create: [
              { itemId: items.find(i => i.itemCode === 'FLT-001')?.id, description: 'Oil Filter - Toyota Hilux', quantity: 10, unitPrice: 27, totalPrice: 270 },
              { itemId: items.find(i => i.itemCode === 'OIL-001')?.id, description: 'Engine Oil 15W-40 (20L)', quantity: 25, unitPrice: 8.2, totalPrice: 205 },
            ].filter(l => l.itemId)
          }
        }
      });
      console.log(`   ✓ Created demo quotation 2`);
      
      // Create Purchase Order
      const po = await db.purchaseOrder.create({
        data: {
          poNumber: 'DEMO-PO-001',
          prId: pr.id,
          quotationId: quotation1.id,
          supplierId: suppliers[0].id,
          procurementChannel: 'LOCAL',
          status: 'ISSUED',
          orderDate: new Date(now - 5 * dayMs),
          expectedDeliveryDate: new Date(now + 5 * dayMs),
          currency: 'LKR',
          totalValue: 420,
          issuedAt: new Date(now - 5 * dayMs),
          lines: {
            create: [
              { lineNumber: 1, itemId: items.find(i => i.itemCode === 'FLT-001')?.id, description: 'Oil Filter - Toyota Hilux', orderedQty: 10, quantity: 10, unitPrice: 24, totalPrice: 240, status: 'PENDING' },
              { lineNumber: 2, itemId: items.find(i => i.itemCode === 'OIL-001')?.id, description: 'Engine Oil 15W-40 (20L)', orderedQty: 25, quantity: 25, unitPrice: 7.2, totalPrice: 180, status: 'PENDING' },
            ].filter(l => l.itemId)
          }
        }
      });
      console.log(`   ✓ Created demo purchase order`);
      
      // Create GRN
      await db.grnHeader.create({
        data: {
          grnNumber: 'DEMO-GRN-001',
          poId: po.id,
          supplierId: suppliers[0].id,
          storeId: mainStore.id,
          deliveryNoteNo: 'DN-2024-001',
          deliveryDate: new Date(now - 2 * dayMs),
          status: 'POSTED',
          inspectionStatus: 'PASSED',
          createdBy: userMap['storekeeper@demo.wcp'] || users[0]?.id,
          postedAt: new Date(now - 1 * dayMs),
          postedBy: userMap['manager@demo.wcp'] || users[0]?.id,
          totalValue: 420,
          lines: {
            create: [
              { itemId: items.find(i => i.itemCode === 'FLT-001')?.id, receivedQty: 10, orderedQty: 10, acceptedQty: 10, rejectedQty: 0, unitCost: 24, totalCost: 240 },
              { itemId: items.find(i => i.itemCode === 'OIL-001')?.id, receivedQty: 25, orderedQty: 25, acceptedQty: 25, rejectedQty: 0, unitCost: 7.2, totalCost: 180 },
            ].filter(l => l.itemId)
          }
        }
      });
      console.log(`   ✓ Created demo GRN`);
    }
  }
}

// ============================================
// DEMO PHOTO CATEGORIES
// ============================================
async function seedDemoPhotoCategories() {
  console.log('📷 Seeding demo photo categories...');
  
  const categories = [
    { code: 'BEFORE_WORK', name: 'Before Work', description: 'Photos taken before work begins', sequence: 1, minPhotos: 1, maxPhotos: 5, isRequired: true, categoryType: 'JOB_CARD' },
    { code: 'DURING_WORK', name: 'During Work', description: 'Photos taken during work in progress', sequence: 2, minPhotos: 2, maxPhotos: 10, isRequired: true, categoryType: 'JOB_CARD' },
    { code: 'AFTER_WORK', name: 'After Work', description: 'Photos taken after work completion', sequence: 3, minPhotos: 1, maxPhotos: 5, isRequired: true, categoryType: 'JOB_CARD' },
    { code: 'PARTS_REMOVED', name: 'Parts Removed', description: 'Photos of parts that were removed', sequence: 4, minPhotos: 0, maxPhotos: 5, isRequired: false, categoryType: 'JOB_CARD' },
    { code: 'PARTS_INSTALLED', name: 'Parts Installed', description: 'Photos of new parts installed', sequence: 5, minPhotos: 0, maxPhotos: 5, isRequired: false, categoryType: 'JOB_CARD' },
    { code: 'FAULT_EVIDENCE', name: 'Fault Evidence', description: 'Photos showing the fault or damage', sequence: 6, minPhotos: 0, maxPhotos: 10, isRequired: false, categoryType: 'JOB_CARD' },
    { code: 'GRN_DELIVERY', name: 'GRN Delivery', description: 'Photos of delivered items', sequence: 1, minPhotos: 1, maxPhotos: 10, isRequired: true, categoryType: 'GRN' },
    { code: 'GRN_INSPECTION', name: 'GRN Inspection', description: 'Photos during quality inspection', sequence: 2, minPhotos: 0, maxPhotos: 5, isRequired: false, categoryType: 'GRN' },
    { code: 'STOCK_TAKE', name: 'Stock Take', description: 'Photos during stock take process', sequence: 1, minPhotos: 0, maxPhotos: 10, isRequired: false, categoryType: 'STOCK_TAKE' },
  ];

  let count = 0;
  for (const cat of categories) {
    const existing = await db.jcPhotoCategory.findUnique({ where: { code: cat.code } });
    if (!existing) {
      await db.jcPhotoCategory.create({ data: cat });
      count++;
    }
  }
  console.log(`   ✓ Created ${count} new photo categories`);
}

// ============================================
// DEMO JC TASKS
// ============================================
async function seedDemoJcTasks() {
  console.log('📋 Seeding demo JC tasks...');
  
  const jobCards = await db.jobCard.findMany({ where: { jobCardNumber: { startsWith: 'DEMO-' } } });
  const jcMap = Object.fromEntries(jobCards.map(jc => [jc.jobCardNumber, jc.id]));
  
  const tasks = [
    // JC-001 tasks
    { jobCardId: jcMap['DEMO-JC-001'], taskNumber: 1, description: 'Drain coolant and inspect system', isMandatory: true, isComplete: true, sequence: 1 },
    { jobCardId: jcMap['DEMO-JC-001'], taskNumber: 2, description: 'Remove damaged radiator', isMandatory: true, isComplete: true, sequence: 2 },
    { jobCardId: jcMap['DEMO-JC-001'], taskNumber: 3, description: 'Install new radiator', isMandatory: true, isComplete: true, sequence: 3 },
    { jobCardId: jcMap['DEMO-JC-001'], taskNumber: 4, description: 'Replace water pump', isMandatory: true, isComplete: true, sequence: 4 },
    { jobCardId: jcMap['DEMO-JC-001'], taskNumber: 5, description: 'Refill coolant and test system', isMandatory: true, isComplete: true, sequence: 5 },
    
    // JC-002 tasks
    { jobCardId: jcMap['DEMO-JC-002'], taskNumber: 1, description: 'Change engine oil', isMandatory: true, isComplete: true, sequence: 1 },
    { jobCardId: jcMap['DEMO-JC-002'], taskNumber: 2, description: 'Replace oil filter', isMandatory: true, isComplete: true, sequence: 2 },
    { jobCardId: jcMap['DEMO-JC-002'], taskNumber: 3, description: 'Replace air filter', isMandatory: true, isComplete: true, sequence: 3 },
    { jobCardId: jcMap['DEMO-JC-002'], taskNumber: 4, description: 'Inspect belts and hoses', isMandatory: true, isComplete: true, sequence: 4 },
    
    // JC-003 tasks
    { jobCardId: jcMap['DEMO-JC-003'], taskNumber: 1, description: 'Replace master cylinder', isMandatory: true, isComplete: true, sequence: 1 },
    { jobCardId: jcMap['DEMO-JC-003'], taskNumber: 2, description: 'Replace front brake pads', isMandatory: true, isComplete: true, sequence: 2 },
    { jobCardId: jcMap['DEMO-JC-003'], taskNumber: 3, description: 'Replace corroded brake lines', isMandatory: true, isComplete: true, sequence: 3 },
    { jobCardId: jcMap['DEMO-JC-003'], taskNumber: 4, description: 'Flush and refill brake fluid', isMandatory: true, isComplete: true, sequence: 4 },
    { jobCardId: jcMap['DEMO-JC-003'], taskNumber: 5, description: 'Test brake system', isMandatory: true, isComplete: true, sequence: 5 },
    
    // JC-009 tasks (in progress)
    { jobCardId: jcMap['DEMO-JC-009'], taskNumber: 1, description: 'Change engine oil', isMandatory: true, isComplete: true, sequence: 1 },
    { jobCardId: jcMap['DEMO-JC-009'], taskNumber: 2, description: 'Replace oil filter', isMandatory: true, isComplete: false, sequence: 2 },
    { jobCardId: jcMap['DEMO-JC-009'], taskNumber: 3, description: 'Replace air filter', isMandatory: true, isComplete: false, sequence: 3 },
    { jobCardId: jcMap['DEMO-JC-009'], taskNumber: 4, description: 'Check tire pressure and condition', isMandatory: false, isComplete: false, sequence: 4 },
    
    // JC-011 tasks (draft)
    { jobCardId: jcMap['DEMO-JC-011'], taskNumber: 1, description: 'Diagnose noise source', isMandatory: true, isComplete: false, sequence: 1 },
    { jobCardId: jcMap['DEMO-JC-011'], taskNumber: 2, description: 'Inspect internal components', isMandatory: true, isComplete: false, sequence: 2 },
  ];

  let count = 0;
  for (const task of tasks) {
    if (!task.jobCardId) continue;
    
    const existing = await db.jcTask.findUnique({
      where: { jobCardId_taskNumber: { jobCardId: task.jobCardId, taskNumber: task.taskNumber } }
    });
    
    if (!existing) {
      await db.jcTask.create({ data: task });
      count++;
    }
  }
  console.log(`   ✓ Created ${count} new JC tasks`);
}
