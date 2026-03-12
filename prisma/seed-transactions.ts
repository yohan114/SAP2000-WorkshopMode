import { db } from '@/lib/db';

/**
 * Seed sample transactions for WCP platform
 * Run with: bun prisma/seed-transactions.ts
 */
async function main() {
  console.log('🌱 Seeding sample transactions...\n');

  // Get existing data
  const users = await db.user.findMany();
  const assets = await db.asset.findMany({ include: { meters: true } });
  const items = await db.item.findMany();
  const stores = await db.store.findMany();
  const employees = await db.employee.findMany();
  
  const technicians = users.filter(u => 
    u.email.includes('tech') || u.email.includes('supervisor')
  );
  const supervisors = users.filter(u => u.email.includes('supervisor'));
  const storekeepers = users.filter(u => u.email.includes('storekeeper'));

  if (assets.length === 0 || items.length === 0 || stores.length === 0) {
    console.log('❌ Please run the main seed first: bun run db:seed');
    process.exit(1);
  }

  const mainStore = stores.find(s => s.code === 'MAIN') || stores[0];
  const tech1 = technicians.find(t => t.email.includes('tech1')) || technicians[0];
  const tech2 = technicians.find(t => t.email.includes('tech2')) || technicians[1];
  const supervisor = supervisors[0] || users[0];
  const storekeeper = storekeepers[0] || users[0];
  const adminUser = users.find(u => u.email.includes('admin')) || users[0];

  // ============================================
  // 1. CREATE SAMPLE JOB CARDS
  // ============================================
  console.log('📋 Creating sample job cards...');

  const jobCardsData = [
    {
      assetId: assets.find(a => a.assetNumber === 'VEH-001')?.id || assets[0].id,
      jobType: 'CORRECTIVE',
      priority: 'HIGH',
      status: 'CLOSED',
      faultDescription: 'Engine overheating and loss of power during operation',
      diagnosisNotes: 'Thermostat stuck closed, causing coolant circulation issues. Radiator fins clogged with debris.',
      workPerformed: 'Replaced thermostat, flushed cooling system, cleaned radiator fins. Pressure tested system - no leaks.',
      estimatedCost: 450,
      estimatedDuration: 4,
      actualCost: 425,
      actualDuration: 3,
      createdBy: tech1?.id,
      closedBy: supervisor?.id,
    },
    {
      assetId: assets.find(a => a.assetNumber === 'GEN-001')?.id || assets[1].id,
      jobType: 'PREVENTIVE',
      priority: 'NORMAL',
      status: 'CLOSED',
      faultDescription: 'Scheduled 500-hour preventive maintenance service',
      diagnosisNotes: 'All parameters within normal range. Routine maintenance required.',
      workPerformed: 'Changed oil and filters, checked all fluid levels, inspected belts and hoses, tested battery, cleaned air filter housing.',
      estimatedCost: 350,
      estimatedDuration: 3,
      actualCost: 320,
      actualDuration: 2,
      createdBy: tech1?.id,
      closedBy: supervisor?.id,
    },
    {
      assetId: assets.find(a => a.assetNumber === 'VEH-002')?.id || assets[2].id,
      jobType: 'CORRECTIVE',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      faultDescription: 'Brake system failure - loss of brake pressure',
      diagnosisNotes: 'Brake master cylinder leaking. Front brake pads severely worn. Brake fluid contaminated.',
      estimatedCost: 850,
      estimatedDuration: 6,
      createdBy: tech2?.id,
    },
    {
      assetId: assets.find(a => a.assetNumber === 'CMP-001')?.id || assets[3].id,
      jobType: 'CORRECTIVE',
      priority: 'HIGH',
      status: 'APPROVED',
      faultDescription: 'Compressor not building pressure, unusual noise from pump',
      diagnosisNotes: 'Air filter clogged. Intake valve suspected damage. Oil level low.',
      estimatedCost: 600,
      estimatedDuration: 4,
      createdBy: tech1?.id,
    },
    {
      assetId: assets.find(a => a.assetNumber === 'VEH-003')?.id || assets[4].id,
      jobType: 'PREVENTIVE',
      priority: 'NORMAL',
      status: 'DRAFT',
      faultDescription: 'Scheduled 50,000 km service',
      estimatedCost: 500,
      estimatedDuration: 5,
      createdBy: tech2?.id,
    },
  ];

  const jobCards = [];
  let jcCount = 0;

  for (let i = 0; i < jobCardsData.length; i++) {
    const data = jobCardsData[i];
    const currentMonth = new Date().toISOString().slice(0, 7);
    const count = await db.jobCard.count({
      where: { createdAt: { gte: new Date(`${currentMonth}-01`) } },
    });
    const jobCardNumber = `JC-${currentMonth.slice(2)}${currentMonth.slice(5)}-${String(count + 1).padStart(4, '0')}`;

    const jc = await db.jobCard.create({
      data: {
        jobCardNumber,
        ...data,
        actualCost: data.actualCost || 0,
      },
    });

    // Create state transition
    await db.jcStateTransition.create({
      data: {
        jobCardId: jc.id,
        fromState: 'NEW',
        toState: data.status,
        transitionType: 'CREATE',
        actorId: data.createdBy || adminUser.id,
        reason: 'Job card created',
      },
    });

    // Create tasks for job cards
    const tasks = getTasksForJobType(data.jobType);
    for (let j = 0; j < tasks.length; j++) {
      await db.jcTask.create({
        data: {
          jobCardId: jc.id,
          taskNumber: j + 1,
          description: tasks[j],
          isMandatory: j < 3,
          isComplete: data.status === 'CLOSED',
          sequence: j + 1,
        },
      });
    }

    // Assign technicians
    if (tech1) {
      await db.jcTechnicianAssignment.create({
        data: {
          jobCardId: jc.id,
          technicianId: tech1.id,
          role: i % 2 === 0 ? 'LEAD' : 'TECHNICIAN',
        },
      });
    }

    jobCards.push(jc);
    jcCount++;
  }

  console.log(`   ✓ Created ${jcCount} job cards with tasks and transitions`);

  // ============================================
  // 2. CREATE MATERIAL REQUESTS
  // ============================================
  console.log('📦 Creating sample material requests...');

  const mrData = [
    {
      jobCardId: jobCards.find(jc => jc.status === 'CLOSED')?.id,
      requestType: 'JC_LINKED',
      priority: 'HIGH',
      status: 'APPROVED',
      requestorId: tech1?.id,
      lines: [
        { itemId: items.find(i => i.itemCode === 'FLT-001')?.id, requestedQty: 2, approvedQty: 2 },
        { itemId: items.find(i => i.itemCode === 'OIL-001')?.id, requestedQty: 15, approvedQty: 15 },
      ],
    },
    {
      jobCardId: jobCards.find(jc => jc.status === 'IN_PROGRESS')?.id,
      requestType: 'JC_LINKED',
      priority: 'CRITICAL',
      status: 'PENDING_APPROVAL',
      requestorId: tech2?.id,
      lines: [
        { itemId: items.find(i => i.itemCode === 'ELC-001')?.id, requestedQty: 1 },
        { itemId: items.find(i => i.itemCode === 'OIL-001')?.id, requestedQty: 2 },
      ],
    },
    {
      jobCardId: jobCards.find(jc => jc.status === 'APPROVED')?.id,
      requestType: 'JC_LINKED',
      priority: 'HIGH',
      status: 'DRAFT',
      requestorId: tech1?.id,
      lines: [
        { itemId: items.find(i => i.itemCode === 'FLT-002')?.id, requestedQty: 2 },
        { itemId: items.find(i => i.itemCode === 'OIL-002')?.id, requestedQty: 5 },
      ],
    },
    {
      jobCardId: null,
      requestType: 'STOCK_REQUEST',
      priority: 'NORMAL',
      status: 'APPROVED',
      requestorId: supervisor?.id,
      lines: [
        { itemId: items.find(i => i.itemCode === 'SAF-001')?.id, requestedQty: 5, approvedQty: 5 },
        { itemId: items.find(i => i.itemCode === 'SAF-002')?.id, requestedQty: 10, approvedQty: 10 },
      ],
    },
  ];

  const materialRequests = [];
  let mrCount = 0;

  for (let i = 0; i < mrData.length; i++) {
    const data = mrData[i];
    const currentMonth = new Date().toISOString().slice(0, 7);
    const count = await db.materialRequest.count({
      where: { createdAt: { gte: new Date(`${currentMonth}-01`) } },
    });
    const mrNumber = `MR-${currentMonth.slice(2)}${currentMonth.slice(5)}-${String(count + 1).padStart(4, '0')}`;

    const mr = await db.materialRequest.create({
      data: {
        mrNumber,
        jobCardId: data.jobCardId,
        requestType: data.requestType,
        priority: data.priority,
        status: data.status,
        requestorId: data.requestorId || adminUser.id,
        approvedAt: ['APPROVED'].includes(data.status) ? new Date() : undefined,
        approvedBy: ['APPROVED'].includes(data.status) ? supervisor?.id : undefined,
        lines: {
          create: data.lines.map((line, idx) => ({
            lineNumber: idx + 1,
            itemId: line.itemId || items[0].id,
            requestedQty: line.requestedQty,
            approvedQty: line.approvedQty || null,
            issuedQty: 0,
            status: line.approvedQty ? 'APPROVED' : 'PENDING',
          })),
        },
      },
      include: { lines: true },
    });

    // Create state transition
    await db.mrStateTransition.create({
      data: {
        mrId: mr.id,
        fromState: 'NEW',
        toState: data.status,
        transitionType: 'CREATE',
        actorId: data.requestorId || adminUser.id,
      },
    });

    materialRequests.push(mr);
    mrCount++;
  }

  console.log(`   ✓ Created ${mrCount} material requests with lines`);

  // ============================================
  // 3. CREATE MATERIAL ISSUES
  // ============================================
  console.log('📤 Creating sample material issues...');

  const approvedMRs = materialRequests.filter(mr => mr.status === 'APPROVED');
  let miCount = 0;

  for (const mr of approvedMRs) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const count = await db.materialIssue.count({
      where: { createdAt: { gte: new Date(`${currentMonth}-01`) } },
    });
    const miNumber = `MI-${currentMonth.slice(2)}${currentMonth.slice(5)}-${String(count + 1).padStart(4, '0')}`;

    const totalValue = mr.lines.reduce((sum, line) => {
      const qty = Number(line.approvedQty || line.requestedQty || 0);
      return sum + qty * 25;
    }, 0);

    const mi = await db.materialIssue.create({
      data: {
        miNumber,
        mrId: mr.id,
        storeId: mainStore.id,
        issueType: 'STANDARD',
        status: 'DRAFT',
        issuedToId: mr.requestorId,
        jobCardId: mr.jobCardId,
        issuedBy: storekeeper?.id || adminUser.id,
        totalValue,
      },
    });

    // Create MI lines
    for (const line of mr.lines) {
      if (line.approvedQty) {
        await db.miLine.create({
          data: {
            miId: mi.id,
            mrLineId: line.id,
            itemId: line.itemId,
            issuedQty: line.approvedQty,
            unitCost: 25,
            totalCost: Number(line.approvedQty) * 25,
          },
        });
      }
    }

    miCount++;
  }

  console.log(`   ✓ Created ${miCount} material issues`);

  // ============================================
  // 4. CREATE STOCK TRANSACTIONS
  // ============================================
  console.log('📥 Creating sample stock transactions...');

  const receiptItems = [
    { itemId: items.find(i => i.itemCode === 'FLT-001')?.id, qty: 20, cost: 15 },
    { itemId: items.find(i => i.itemCode === 'FLT-002')?.id, qty: 15, cost: 12 },
    { itemId: items.find(i => i.itemCode === 'OIL-001')?.id, qty: 100, cost: 8 },
    { itemId: items.find(i => i.itemCode === 'OIL-002')?.id, qty: 50, cost: 12 },
    { itemId: items.find(i => i.itemCode === 'SAF-001')?.id, qty: 30, cost: 25 },
    { itemId: items.find(i => i.itemCode === 'SAF-002')?.id, qty: 50, cost: 8 },
    { itemId: items.find(i => i.itemCode === 'ENG-001')?.id, qty: 20, cost: 5 },
  ];

  let receiptCount = 0;
  for (const item of receiptItems) {
    if (item.itemId) {
      await db.stockTransaction.create({
        data: {
          storeId: mainStore.id,
          itemId: item.itemId,
          transactionType: 'RECEIVE',
          quantity: item.qty,
          unitCost: item.cost,
          totalValue: item.qty * item.cost,
          performedBy: storekeeper?.id || adminUser.id,
          notes: 'Initial stock receipt',
        },
      });

      // Update stock
      const stock = await db.storeStock.findUnique({
        where: { storeId_itemId: { storeId: mainStore.id, itemId: item.itemId } },
      });
      if (stock) {
        await db.storeStock.update({
          where: { id: stock.id },
          data: {
            availableQty: Number(stock.availableQty) + item.qty,
            wac: item.cost,
            lastMovementAt: new Date(),
          },
        });
      }

      receiptCount++;
    }
  }

  console.log(`   ✓ Created ${receiptCount} stock transactions`);

  // ============================================
  // 5. CREATE TIME LOGS
  // ============================================
  console.log('⏱️  Creating sample time logs...');

  const completedJCs = jobCards.filter(jc => jc.status === 'CLOSED');
  let timeLogCount = 0;

  for (const jc of completedJCs.slice(0, 2)) {
    const employee = employees[0];
    if (employee) {
      const hours = Math.floor(Math.random() * 4) + 2;
      await db.timeLog.create({
        data: {
          employeeId: employee.id,
          jobCardId: jc.id,
          logDate: jc.createdAt || new Date(),
          startTime: jc.createdAt || new Date(),
          endTime: jc.closedAt || new Date(),
          totalMinutes: hours * 60,
          hourlyRate: employee.hourlyRate || 25,
          totalCost: hours * Number(employee.hourlyRate || 25),
        },
      });
      timeLogCount++;
    }
  }

  console.log(`   ✓ Created ${timeLogCount} time logs`);

  // ============================================
  // 6. CREATE PM SCHEDULES
  // ============================================
  console.log('📅 Creating sample PM schedules...');

  const pmSchedules = [
    {
      assetId: assets.find(a => a.assetNumber === 'GEN-001')?.id || assets[1].id,
      pmType: 'WEEKLY',
      frequency: 1,
      frequencyUnit: 'WEEKS',
      nextExecutionAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      assetId: assets.find(a => a.assetNumber === 'VEH-001')?.id || assets[0].id,
      pmType: 'MONTHLY',
      frequency: 1,
      frequencyUnit: 'MONTHS',
      nextExecutionAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      assetId: assets.find(a => a.assetNumber === 'CMP-001')?.id || assets[3].id,
      pmType: 'QUARTERLY',
      frequency: 3,
      frequencyUnit: 'MONTHS',
      nextExecutionAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  ];

  let pmCount = 0;
  for (const pm of pmSchedules) {
    const count = await db.pmSchedule.count();
    const scheduleNumber = `PM-${String(count + 1).padStart(4, '0')}`;

    await db.pmSchedule.create({
      data: {
        scheduleNumber,
        ...pm,
      },
    });
    pmCount++;
  }

  console.log(`   ✓ Created ${pmCount} PM schedules`);

  console.log('\n✨ Transaction seeding completed!');
  console.log('\n📊 Summary:');
  console.log(`   Job Cards: ${jcCount}`);
  console.log(`   Material Requests: ${mrCount}`);
  console.log(`   Material Issues: ${miCount}`);
  console.log(`   Stock Transactions: ${receiptCount}`);
  console.log(`   Time Logs: ${timeLogCount}`);
  console.log(`   PM Schedules: ${pmCount}`);
}

function getTasksForJobType(jobType: string): string[] {
  const taskTemplates: Record<string, string[]> = {
    CORRECTIVE: [
      'Receive and review fault report',
      'Initial diagnosis and inspection',
      'Document findings and root cause',
      'Obtain necessary parts/materials',
      'Perform repairs',
      'Test and verify repair',
      'Complete documentation',
      'Return unused materials',
    ],
    PREVENTIVE: [
      'Review maintenance checklist',
      'Safety isolation if required',
      'Fluid level checks',
      'Filter replacements',
      'Belt and hose inspection',
      'Battery and electrical check',
      'Cleaning and lubrication',
      'Test run and verify',
      'Update maintenance records',
    ],
  };

  return taskTemplates[jobType] || taskTemplates.CORRECTIVE;
}

main()
  .catch((e) => {
    console.error('❌ Transaction seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
