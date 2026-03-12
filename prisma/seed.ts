import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

async function main() {
  console.log('🌱 Starting seed process...\n');

  // Seed in dependency order with upsert to handle existing data
  await seedSystemConfig();
  await seedPrivileges();
  await seedRoles();
  await seedUsers();
  await seedItemCategories();
  await seedStores();
  await seedAssetCategories();
//   await seedAssets();
//   await seedItems();
//   await seedSuppliers();
//   await seedPurchaseAuthority();
//   await seedSlaConfigs();
//   await seedApprovalWorkflows();
//   await seedFuelTanks();
//   await seedTrainings();
//   await seedEmployees();
//   await seedBudgetLines();
//   await seedJobCards();
//   await seedMaterialRequests();
//   await seedMaterialIssues();
//   await seedTimeLogs();

  console.log('\n✨ Seed completed successfully!');
}

// ============================================
// SYSTEM CONFIGURATION
// ============================================
async function seedSystemConfig() {
  console.log('⚙️  Seeding system configuration...');
  
  const configs = [
    { key: 'APP_NAME', value: 'Workshop Control Platform', category: 'GENERAL' },
    { key: 'APP_VERSION', value: '2.0.0', category: 'GENERAL' },
    { key: 'DEFAULT_CURRENCY', value: 'USD', category: 'FINANCE' },
    { key: 'HIGH_VALUE_THRESHOLD', value: '1000', category: 'INVENTORY' },
    { key: 'RESERVATION_EXPIRY_DAYS', value: '14', category: 'INVENTORY' },
    { key: 'COUNTER_LOCK_TTL_MINUTES', value: '15', category: 'INVENTORY' },
    { key: 'MAX_LOGIN_ATTEMPTS', value: '5', category: 'SECURITY' },
    { key: 'PASSWORD_MIN_LENGTH', value: '8', category: 'SECURITY' },
    { key: 'SESSION_TIMEOUT_HOURS', value: '24', category: 'SECURITY' },
    { key: 'AUDIT_RETENTION_YEARS', value: '7', category: 'COMPLIANCE' },
  ];

  let count = 0;
  for (const config of configs) {
    await db.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, category: config.category },
      create: config,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} system configurations`);
}

// ============================================
// PRIVILEGES
// ============================================
async function seedPrivileges() {
  console.log('🔐 Seeding privileges...');
  
  const privileges = [
    { code: 'JC_CREATE', name: 'Create Job Cards', category: 'JOB_CARD' },
    { code: 'JC_VIEW', name: 'View Job Cards', category: 'JOB_CARD' },
    { code: 'JC_EDIT', name: 'Edit Job Cards', category: 'JOB_CARD' },
    { code: 'JC_APPROVE', name: 'Approve Job Cards', category: 'JOB_CARD' },
    { code: 'JC_CLOSE', name: 'Close Job Cards', category: 'JOB_CARD' },
    { code: 'JC_CANCEL', name: 'Cancel Job Cards', category: 'JOB_CARD' },
    { code: 'JC_MULTI_OPEN', name: 'Allow Multiple Open Job Cards per Asset', category: 'JOB_CARD' },
    { code: 'MR_CREATE', name: 'Create Material Requests', category: 'MATERIAL' },
    { code: 'MR_VIEW', name: 'View Material Requests', category: 'MATERIAL' },
    { code: 'MR_APPROVE', name: 'Approve Material Requests', category: 'MATERIAL' },
    { code: 'MI_CREATE', name: 'Create Material Issues', category: 'MATERIAL' },
    { code: 'MI_VIEW', name: 'View Material Issues', category: 'MATERIAL' },
    { code: 'MI_VERIFY', name: 'Verify Material Issues (2-Person)', category: 'MATERIAL' },
    { code: 'INV_VIEW', name: 'View Inventory', category: 'INVENTORY' },
    { code: 'INV_MANAGE', name: 'Manage Inventory', category: 'INVENTORY' },
    { code: 'PR_CREATE', name: 'Create Purchase Requests', category: 'PROCUREMENT' },
    { code: 'PR_APPROVE_L1', name: 'Approve PR - Level 1', category: 'PROCUREMENT' },
    { code: 'PR_APPROVE_L2', name: 'Approve PR - Level 2', category: 'PROCUREMENT' },
    { code: 'PO_CREATE', name: 'Create Purchase Orders', category: 'PROCUREMENT' },
    { code: 'PO_APPROVE', name: 'Approve Purchase Orders', category: 'PROCUREMENT' },
    { code: 'GRN_CREATE', name: 'Create GRN', category: 'PROCUREMENT' },
    { code: 'GRN_VERIFY', name: 'Verify GRN (2-Person)', category: 'PROCUREMENT' },
    { code: 'LP_CHANNEL_OVERRIDE', name: 'Override Procurement Channel to Local', category: 'PURCHASE_AUTHORITY' },
    { code: 'SYS_LPA_OVERRIDE', name: 'Override LPA Limits', category: 'PURCHASE_AUTHORITY' },
    { code: 'ASSET_CREATE', name: 'Create Assets', category: 'ASSET' },
    { code: 'ASSET_VIEW', name: 'View Assets', category: 'ASSET' },
    { code: 'ASSET_EDIT', name: 'Edit Assets', category: 'ASSET' },
    { code: 'ASSET_DELETE', name: 'Delete Assets', category: 'ASSET' },
    { code: 'USER_MANAGE', name: 'Manage Users', category: 'SYSTEM' },
    { code: 'ROLE_MANAGE', name: 'Manage Roles', category: 'SYSTEM' },
    { code: 'AUDIT_VIEW', name: 'View Audit Logs', category: 'SYSTEM' },
    { code: 'REPORT_VIEW', name: 'View Reports', category: 'SYSTEM' },
  ];

  let count = 0;
  for (const priv of privileges) {
    await db.privilegeDefinition.upsert({
      where: { code: priv.code },
      update: { name: priv.name, category: priv.category },
      create: priv,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} privileges`);
}

// ============================================
// ROLES
// ============================================
async function seedRoles() {
  console.log('👥 Seeding roles...');
  
  const roles = [
    { code: 'TECHNICIAN', name: 'Technician', level: 1 },
    { code: 'SUPERVISOR', name: 'Supervisor', level: 2 },
    { code: 'STOREKEEPER', name: 'Storekeeper', level: 2 },
    { code: 'LPO', name: 'Local Procurement Officer', level: 3 },
    { code: 'WM', name: 'Workshop Manager', level: 4 },
    { code: 'HO_PO', name: 'HO Procurement Officer', level: 3 },
    { code: 'HO_FIN', name: 'HO Finance', level: 4 },
    { code: 'HO_MGR', name: 'HO Manager', level: 5 },
    { code: 'CTRL_MGR', name: 'Control Manager', level: 6 },
    { code: 'ADMIN', name: 'System Administrator', level: 10 },
  ];

  let count = 0;
  for (const role of roles) {
    await db.role.upsert({
      where: { code: role.code },
      update: { name: role.name, level: role.level },
      create: role,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} roles`);

  await assignRolePrivileges();
}

async function assignRolePrivileges() {
  console.log('   📋 Assigning privileges to roles...');
  
  const roles = await db.role.findMany();
  const privileges = await db.privilegeDefinition.findMany();
  
  const rolePrivilegeMap: Record<string, string[]> = {
    'TECHNICIAN': ['JC_CREATE', 'JC_VIEW', 'MR_CREATE', 'MR_VIEW', 'ASSET_VIEW'],
    'SUPERVISOR': ['JC_CREATE', 'JC_VIEW', 'JC_EDIT', 'JC_APPROVE', 'JC_CLOSE', 'MR_CREATE', 'MR_VIEW', 'MR_APPROVE', 'MI_VIEW', 'INV_VIEW', 'ASSET_VIEW', 'ASSET_CREATE', 'ASSET_EDIT', 'REPORT_VIEW'],
    'STOREKEEPER': ['MI_CREATE', 'MI_VIEW', 'MI_VERIFY', 'INV_VIEW', 'INV_MANAGE', 'GRN_CREATE', 'GRN_VERIFY', 'MR_VIEW'],
    'LPO': ['PR_CREATE', 'PR_APPROVE_L1', 'PR_APPROVE_L2', 'PO_CREATE', 'GRN_CREATE', 'INV_VIEW', 'MR_VIEW', 'REPORT_VIEW'],
    'WM': ['JC_CREATE', 'JC_VIEW', 'JC_EDIT', 'JC_APPROVE', 'JC_CLOSE', 'JC_CANCEL', 'MR_CREATE', 'MR_VIEW', 'MR_APPROVE', 'MI_CREATE', 'MI_VIEW', 'INV_VIEW', 'INV_MANAGE', 'PR_CREATE', 'PR_APPROVE_L1', 'PR_APPROVE_L2', 'PO_CREATE', 'PO_APPROVE', 'GRN_CREATE', 'LP_CHANNEL_OVERRIDE', 'ASSET_CREATE', 'ASSET_VIEW', 'ASSET_EDIT', 'ASSET_DELETE', 'REPORT_VIEW'],
    'HO_PO': ['PR_CREATE', 'PR_APPROVE_L1', 'PR_APPROVE_L2', 'PO_CREATE', 'PO_APPROVE', 'GRN_CREATE', 'INV_VIEW', 'REPORT_VIEW'],
    'HO_FIN': ['PO_APPROVE', 'GRN_CREATE', 'GRN_VERIFY', 'INV_VIEW', 'REPORT_VIEW'],
    'HO_MGR': ['PR_APPROVE_L1', 'PR_APPROVE_L2', 'PO_APPROVE', 'SYS_LPA_OVERRIDE', 'USER_MANAGE', 'AUDIT_VIEW', 'REPORT_VIEW'],
    'CTRL_MGR': ['SYS_LPA_OVERRIDE', 'AUDIT_VIEW', 'USER_MANAGE', 'ROLE_MANAGE', 'REPORT_VIEW'],
    'ADMIN': ['JC_CREATE', 'JC_VIEW', 'JC_EDIT', 'JC_APPROVE', 'JC_CLOSE', 'JC_CANCEL', 'JC_MULTI_OPEN', 'MR_CREATE', 'MR_VIEW', 'MR_APPROVE', 'MI_CREATE', 'MI_VIEW', 'MI_VERIFY', 'INV_VIEW', 'INV_MANAGE', 'PR_CREATE', 'PR_APPROVE_L1', 'PR_APPROVE_L2', 'PO_CREATE', 'PO_APPROVE', 'GRN_CREATE', 'GRN_VERIFY', 'LP_CHANNEL_OVERRIDE', 'SYS_LPA_OVERRIDE', 'ASSET_CREATE', 'ASSET_VIEW', 'ASSET_EDIT', 'ASSET_DELETE', 'USER_MANAGE', 'ROLE_MANAGE', 'AUDIT_VIEW', 'REPORT_VIEW'],
  };

  let count = 0;
  for (const role of roles) {
    const privilegeCodes = rolePrivilegeMap[role.code] || [];
    for (const code of privilegeCodes) {
      const privilege = privileges.find(p => p.code === code);
      if (privilege) {
        await db.rolePrivilegeSet.upsert({
          where: { roleId_privilegeId: { roleId: role.id, privilegeId: privilege.id } },
          update: { isGranted: true },
          create: { roleId: role.id, privilegeId: privilege.id, isGranted: true },
        });
        count++;
      }
    }
  }
  console.log(`   ✓ Assigned ${count} role-privilege mappings`);
}

// ============================================
// USERS
// ============================================
async function seedUsers() {
  console.log('👤 Seeding users...');
  
  const passwordHash = await hash('password123', 10);
  
  const users = [
    { employeeId: 'EMP001', email: 'admin@wcp.com', name: 'System Administrator', passwordHash, department: 'IT', contractType: 'PERMANENT' },
    { employeeId: 'EMP002', email: 'tech1@wcp.com', name: 'John Smith', passwordHash, department: 'Workshop', contractType: 'PERMANENT' },
    { employeeId: 'EMP003', email: 'tech2@wcp.com', name: 'Mike Johnson', passwordHash, department: 'Workshop', contractType: 'PERMANENT' },
    { employeeId: 'EMP004', email: 'supervisor@wcp.com', name: 'David Wilson', passwordHash, department: 'Workshop', contractType: 'PERMANENT' },
    { employeeId: 'EMP005', email: 'storekeeper@wcp.com', name: 'Sarah Brown', passwordHash, department: 'Stores', contractType: 'PERMANENT' },
    { employeeId: 'EMP006', email: 'lpo@wcp.com', name: 'James Taylor', passwordHash, department: 'Procurement', contractType: 'PERMANENT' },
    { employeeId: 'EMP007', email: 'wm@wcp.com', name: 'Robert Anderson', passwordHash, department: 'Workshop', contractType: 'PERMANENT' },
    { employeeId: 'EMP008', email: 'hopo@wcp.com', name: 'Emily Davis', passwordHash, department: 'HO Procurement', contractType: 'PERMANENT' },
    { employeeId: 'EMP009', email: 'hofin@wcp.com', name: 'Lisa Martinez', passwordHash, department: 'HO Finance', contractType: 'PERMANENT' },
    { employeeId: 'EMP010', email: 'homanager@wcp.com', name: 'Michael Chen', passwordHash, department: 'HO Management', contractType: 'PERMANENT' },
    { employeeId: 'EMP011', email: 'control@wcp.com', name: 'Amanda White', passwordHash, department: 'Control', contractType: 'PERMANENT' },
  ];

  let count = 0;
  for (const user of users) {
    await db.user.upsert({
      where: { email: user.email },
      update: { name: user.name, department: user.department },
      create: user,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} users`);

  await assignUserRoles();
}

async function assignUserRoles() {
  console.log('   📋 Assigning roles to users...');
  
  const users = await db.user.findMany();
  const roles = await db.role.findMany();
  
  const userRoleMap: Record<string, string[]> = {
    'admin@wcp.com': ['ADMIN'],
    'tech1@wcp.com': ['TECHNICIAN'],
    'tech2@wcp.com': ['TECHNICIAN'],
    'supervisor@wcp.com': ['SUPERVISOR'],
    'storekeeper@wcp.com': ['STOREKEEPER'],
    'lpo@wcp.com': ['LPO'],
    'wm@wcp.com': ['WM', 'SUPERVISOR'],
    'hopo@wcp.com': ['HO_PO'],
    'hofin@wcp.com': ['HO_FIN'],
    'homanager@wcp.com': ['HO_MGR'],
    'control@wcp.com': ['CTRL_MGR'],
  };

  let count = 0;
  for (const user of users) {
    const roleCodes = userRoleMap[user.email] || [];
    for (const code of roleCodes) {
      const role = roles.find(r => r.code === code);
      if (role) {
        // Check if the user-role already exists
        const existing = await db.userRole.findFirst({
          where: { userId: user.id, roleId: role.id }
        });
        if (!existing) {
          await db.userRole.create({
            data: { userId: user.id, roleId: role.id, isActive: true }
          });
          count++;
        }
      }
    }
  }
  console.log(`   ✓ Assigned ${count} new user-role mappings`);
}

// ============================================
// ASSET CATEGORIES
// ============================================
async function seedAssetCategories() {
  console.log('🏢 Seeding asset categories...');
  
  const categories = [
    { code: 'VEHICLE', name: 'Vehicles' },
    { code: 'PLANT', name: 'Plant Equipment' },
    { code: 'GENERATOR', name: 'Generators' },
    { code: 'COMPRESSOR', name: 'Compressors' },
    { code: 'PUMP', name: 'Pumps' },
    { code: 'TOOL', name: 'Power Tools' },
    { code: 'WELDING', name: 'Welding Equipment' },
    { code: 'LIFTING', name: 'Lifting Equipment' },
  ];

  let count = 0;
  for (const cat of categories) {
    await db.assetCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name },
      create: cat,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} asset categories`);
}

// ============================================
// ASSETS
// ============================================
async function seedAssets() {
  console.log('🚗 Seeding assets...');
  
  const categories = await db.assetCategory.findMany();
  const catMap = Object.fromEntries(categories.map(c => [c.code, c.id]));
  
  const assets = [
    { assetNumber: 'VEH-001', categoryId: catMap['VEHICLE'], name: 'Toyota Hilux Pickup', make: 'Toyota', model: 'Hilux 2.8L', yearOfManufacture: 2021, status: 'OPERATIONAL', criticality: 'HIGH', currentLocation: 'Main Workshop' },
    { assetNumber: 'VEH-002', categoryId: catMap['VEHICLE'], name: 'Isuzu Truck', make: 'Isuzu', model: 'NPR 4x2', yearOfManufacture: 2020, status: 'OPERATIONAL', criticality: 'HIGH', currentLocation: 'Main Workshop' },
    { assetNumber: 'VEH-003', categoryId: catMap['VEHICLE'], name: 'Ford Transit Van', make: 'Ford', model: 'Transit 350', yearOfManufacture: 2022, status: 'OPERATIONAL', criticality: 'MEDIUM', currentLocation: 'Site Office' },
    { assetNumber: 'GEN-001', categoryId: catMap['GENERATOR'], name: 'Caterpillar Generator 500kVA', make: 'Caterpillar', model: 'C15', yearOfManufacture: 2019, status: 'OPERATIONAL', criticality: 'CRITICAL', currentLocation: 'Power House' },
    { assetNumber: 'GEN-002', categoryId: catMap['GENERATOR'], name: 'Perkins Generator 250kVA', make: 'Perkins', model: '1106C', yearOfManufacture: 2020, status: 'OPERATIONAL', criticality: 'HIGH', currentLocation: 'Backup Power' },
    { assetNumber: 'CMP-001', categoryId: catMap['COMPRESSOR'], name: 'Atlas Copco Air Compressor', make: 'Atlas Copco', model: 'GA37', yearOfManufacture: 2021, status: 'OPERATIONAL', criticality: 'HIGH', currentLocation: 'Compressor Room' },
    { assetNumber: 'PMP-001', categoryId: catMap['PUMP'], name: 'Grundfos Water Pump', make: 'Grundfos', model: 'CR 45', yearOfManufacture: 2020, status: 'OPERATIONAL', criticality: 'MEDIUM', currentLocation: 'Pump Station' },
    { assetNumber: 'WLD-001', categoryId: catMap['WELDING'], name: 'Lincoln Welding Machine', make: 'Lincoln', model: 'Power Wave S500', yearOfManufacture: 2021, status: 'OPERATIONAL', criticality: 'MEDIUM', currentLocation: 'Welding Bay' },
    { assetNumber: 'LFT-001', categoryId: catMap['LIFTING'], name: 'Overhead Crane', make: 'Konecranes', model: 'CXT 5t', yearOfManufacture: 2018, status: 'OPERATIONAL', criticality: 'CRITICAL', currentLocation: 'Main Bay' },
  ];

  let count = 0;
  for (const asset of assets) {
    await db.asset.upsert({
      where: { assetNumber: asset.assetNumber },
      update: { name: asset.name, make: asset.make, model: asset.model },
      create: asset,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} assets`);

  // Create QR codes and meters
  const createdAssets = await db.asset.findMany();
  for (const asset of createdAssets) {
    const qrCode = `WCP-${asset.assetNumber}`;
    const qrHash = Buffer.from(qrCode).toString('base64');
    
    await db.assetQrCode.upsert({
      where: { qrCode },
      update: { isActive: true },
      create: { assetId: asset.id, qrCode, qrHash, isActive: true }
    });

    if (asset.assetNumber.startsWith('VEH-')) {
      const existing = await db.assetMeter.findFirst({ where: { assetId: asset.id, meterType: 'ODOMETER' } });
      if (!existing) {
        await db.assetMeter.create({
          data: { assetId: asset.id, meterType: 'ODOMETER', unit: 'KM', currentValue: Math.floor(Math.random() * 100000) }
        });
      }
    } else if (['GEN-001', 'GEN-002', 'CMP-001'].includes(asset.assetNumber)) {
      const existing = await db.assetMeter.findFirst({ where: { assetId: asset.id, meterType: 'HOUR_METER' } });
      if (!existing) {
        await db.assetMeter.create({
          data: { assetId: asset.id, meterType: 'HOUR_METER', unit: 'HOURS', currentValue: Math.floor(Math.random() * 5000) }
        });
      }
    }
  }
  console.log(`   ✓ Created QR codes and meters for ${createdAssets.length} assets`);
}

// ============================================
// ITEM CATEGORIES
// ============================================
async function seedItemCategories() {
  console.log('📦 Seeding item categories...');
  
  const categories = [
    { code: 'ENGINE', name: 'Engine Parts' },
    { code: 'FILTERS', name: 'Filters' },
    { code: 'LUBRICANTS', name: 'Lubricants' },
    { code: 'ELECTRICAL', name: 'Electrical' },
    { code: 'HYDRAULICS', name: 'Hydraulics' },
    { code: 'FASTENERS', name: 'Fasteners' },
    { code: 'SAFETY', name: 'Safety Equipment' },
    { code: 'CONSUMABLES', name: 'Consumables' },
    { code: 'TOOLS', name: 'Tools' },
  ];

  let count = 0;
  for (const cat of categories) {
    await db.itemCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name },
      create: cat,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} item categories`);
}

// ============================================
// STORES
// ============================================
async function seedStores() {
  console.log('🏪 Seeding stores...');
  
  const stores = [
    { code: 'MAIN', name: 'Main Store', storeType: 'MAIN', location: 'Main Workshop Building' },
    { code: 'SITE', name: 'Site Store', storeType: 'SITE', location: 'Site Office' },
    { code: 'CONS', name: 'Consumables Store', storeType: 'CONSUMABLE', location: 'Adjacent to Main Store' },
  ];

  let count = 0;
  for (const store of stores) {
    await db.store.upsert({
      where: { code: store.code },
      update: { name: store.name, location: store.location },
      create: store,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} stores`);
}

// ============================================
// ITEMS
// ============================================
async function seedItems() {
  console.log('📋 Seeding items...');
  
  const categories = await db.itemCategory.findMany();
  const catMap = Object.fromEntries(categories.map(c => [c.code, c.id]));
  
  const items = [
    { itemCode: 'FLT-001', name: 'Oil Filter - Toyota Hilux', categoryId: catMap['FILTERS'], unitOfMeasure: 'PCS', itemClass: 'SPARE_PART', minimumStock: 10, reorderLevel: 5 },
    { itemCode: 'FLT-002', name: 'Air Filter - Toyota Hilux', categoryId: catMap['FILTERS'], unitOfMeasure: 'PCS', itemClass: 'SPARE_PART', minimumStock: 5, reorderLevel: 3 },
    { itemCode: 'FLT-003', name: 'Fuel Filter - Isuzu NPR', categoryId: catMap['FILTERS'], unitOfMeasure: 'PCS', itemClass: 'SPARE_PART', minimumStock: 5, reorderLevel: 2 },
    { itemCode: 'OIL-001', name: 'Engine Oil 15W-40 (20L)', categoryId: catMap['LUBRICANTS'], unitOfMeasure: 'LTR', itemClass: 'LUBRICANT', minimumStock: 200, reorderLevel: 50 },
    { itemCode: 'OIL-002', name: 'Hydraulic Oil ISO 46 (20L)', categoryId: catMap['LUBRICANTS'], unitOfMeasure: 'LTR', itemClass: 'LUBRICANT', minimumStock: 100, reorderLevel: 30 },
    { itemCode: 'OIL-003', name: 'Grease Cartridge 400g', categoryId: catMap['LUBRICANTS'], unitOfMeasure: 'PCS', itemClass: 'LUBRICANT', minimumStock: 50, reorderLevel: 20 },
    { itemCode: 'ENG-001', name: 'Spark Plug NGK BKR5E', categoryId: catMap['ENGINE'], unitOfMeasure: 'PCS', itemClass: 'SPARE_PART', minimumStock: 20, reorderLevel: 10 },
    { itemCode: 'ELC-001', name: 'Alternator - Toyota Hilux', categoryId: catMap['ELECTRICAL'], unitOfMeasure: 'PCS', itemClass: 'SPARE_PART', minimumStock: 2, reorderLevel: 1, isCritical: true },
    { itemCode: 'ELC-002', name: 'Battery 12V 100Ah', categoryId: catMap['ELECTRICAL'], unitOfMeasure: 'PCS', itemClass: 'SPARE_PART', minimumStock: 5, reorderLevel: 2 },
    { itemCode: 'HYD-001', name: 'Hydraulic Hose 1/2" (per meter)', categoryId: catMap['HYDRAULICS'], unitOfMeasure: 'MTR', itemClass: 'SPARE_PART', minimumStock: 20, reorderLevel: 10 },
    { itemCode: 'FST-001', name: 'Bolt M10x30 (Box 100)', categoryId: catMap['FASTENERS'], unitOfMeasure: 'BOX', itemClass: 'CONSUMABLE', minimumStock: 10, reorderLevel: 5 },
    { itemCode: 'SAF-001', name: 'Safety Helmet', categoryId: catMap['SAFETY'], unitOfMeasure: 'PCS', itemClass: 'CONSUMABLE', minimumStock: 20, reorderLevel: 10 },
    { itemCode: 'SAF-002', name: 'Safety Gloves (Pair)', categoryId: catMap['SAFETY'], unitOfMeasure: 'PAIR', itemClass: 'CONSUMABLE', minimumStock: 50, reorderLevel: 20 },
    { itemCode: 'CON-001', name: 'Cleaning Cloth (Roll)', categoryId: catMap['CONSUMABLES'], unitOfMeasure: 'ROLL', itemClass: 'CONSUMABLE', minimumStock: 20, reorderLevel: 10 },
    { itemCode: 'TOL-001', name: 'Socket Set 1/2" Drive', categoryId: catMap['TOOLS'], unitOfMeasure: 'SET', itemClass: 'TOOL', minimumStock: 2, reorderLevel: 1, isTool: true },
  ];

  let count = 0;
  for (const item of items) {
    await db.item.upsert({
      where: { itemCode: item.itemCode },
      update: { name: item.name, minimumStock: item.minimumStock, reorderLevel: item.reorderLevel },
      create: item,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} items`);

  // Create stock for main store
  const mainStore = await db.store.findFirst({ where: { code: 'MAIN' } });
  const createdItems = await db.item.findMany();
  
  if (mainStore) {
    let stockCount = 0;
    for (const item of createdItems) {
      const existing = await db.storeStock.findUnique({
        where: { storeId_itemId: { storeId: mainStore.id, itemId: item.id } }
      });
      if (!existing) {
        await db.storeStock.create({
          data: {
            storeId: mainStore.id,
            itemId: item.id,
            availableQty: Math.floor(Math.random() * 50) + 10,
            reservedQty: 0,
            quarantineQty: 0,
            wac: Math.random() * 100 + 10,
          }
        });
        stockCount++;
      }
    }
    console.log(`   ✓ Created stock for ${stockCount} items in main store`);
  }
}

// ============================================
// SUPPLIERS
// ============================================
async function seedSuppliers() {
  console.log('🏭 Seeding suppliers...');
  
  const suppliers = [
    { supplierCode: 'SUP001', name: 'Auto Parts Direct', contactPerson: 'John Dealer', email: 'sales@autopartsdirect.com', status: 'ACTIVE', isHoApproved: true },
    { supplierCode: 'SUP002', name: 'Global Filters Inc', contactPerson: 'Mary Filter', email: 'orders@globalfilters.com', status: 'ACTIVE', isHoApproved: true },
    { supplierCode: 'SUP003', name: 'Lubricants World', contactPerson: 'Bob Oil', email: 'sales@lubricantsworld.com', status: 'ACTIVE', isHoApproved: true },
    { supplierCode: 'SUP004', name: 'Safety First PPE', contactPerson: 'Jane Safe', email: 'orders@safetyfirst.com', status: 'ACTIVE', isHoApproved: false },
    { supplierCode: 'SUP005', name: 'Tools & Equipment Co', contactPerson: 'Tom Tool', email: 'sales@toolsnmore.com', status: 'ACTIVE', isHoApproved: true },
    { supplierCode: 'SUP006', name: 'Hydraulic Solutions', contactPerson: 'Pete Pressure', email: 'info@hydraulicsolutions.com', status: 'ACTIVE', isHoApproved: true },
    { supplierCode: 'SUP007', name: 'Electrical Components Ltd', contactPerson: 'Sara Spark', email: 'orders@eleccomponents.com', status: 'ACTIVE', isHoApproved: true },
  ];

  let count = 0;
  for (const supplier of suppliers) {
    await db.supplier.upsert({
      where: { supplierCode: supplier.supplierCode },
      update: { name: supplier.name, contactPerson: supplier.contactPerson, email: supplier.email },
      create: supplier,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} suppliers`);
}

// ============================================
// PURCHASE AUTHORITY
// ============================================
async function seedPurchaseAuthority() {
  console.log('💰 Seeding purchase authority...');
  
  await db.workshopPurchaseAuthority.upsert({
    where: { workshopId: 'WS001' },
    update: { workshopName: 'Main Workshop', lpaLimit: 250000, emergencyLpaLimit: 375000, monthlyCap: 1000000 },
    create: {
      workshopId: 'WS001',
      workshopName: 'Main Workshop',
      lpaLimit: 250000,
      emergencyLpaLimit: 375000,
      monthlyCap: 1000000,
      currentMonth: new Date().toISOString().slice(0, 7),
    }
  });
  console.log(`   ✓ Created/updated purchase authority configuration`);
}

// ============================================
// SLA CONFIGURATIONS
// ============================================
async function seedSlaConfigs() {
  console.log('⏱️  Seeding SLA configurations...');
  
  const slas = [
    { slaType: 'JC_EMERGENCY', name: 'Job Card - Emergency', responseHours: 0.5, completionHours: 4, escalationLevels: 3 },
    { slaType: 'JC_CRITICAL', name: 'Job Card - Critical', responseHours: 2, completionHours: 8, escalationLevels: 3 },
    { slaType: 'JC_HIGH', name: 'Job Card - High', responseHours: 4, completionHours: 24, escalationLevels: 2 },
    { slaType: 'JC_NORMAL', name: 'Job Card - Normal', responseHours: 8, completionHours: 120, escalationLevels: 2 },
    { slaType: 'MR_APPROVAL', name: 'Material Request Approval', responseHours: 4, completionHours: 8, escalationLevels: 2 },
    { slaType: 'PR_APPROVAL', name: 'Purchase Request Approval', responseHours: 24, completionHours: 72, escalationLevels: 3 },
  ];

  let count = 0;
  for (const sla of slas) {
    await db.slaConfig.upsert({
      where: { slaType: sla.slaType },
      update: { name: sla.name, responseHours: sla.responseHours, completionHours: sla.completionHours, escalationLevels: sla.escalationLevels },
      create: sla,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} SLA configurations`);
}

// ============================================
// APPROVAL WORKFLOWS
// ============================================
async function seedApprovalWorkflows() {
  console.log('✅ Seeding approval workflows...');
  
  const workflows = [
    { code: 'WF_JC_STD', name: 'Job Card Standard Approval', workflowType: 'JOB_CARD' },
    { code: 'WF_MR_STD', name: 'Material Request Standard', workflowType: 'MATERIAL_REQUEST' },
    { code: 'WF_PR_LOCAL', name: 'PR Local Approval', workflowType: 'PURCHASE_REQUEST' },
    { code: 'WF_PO_STD', name: 'PO Standard Approval', workflowType: 'PURCHASE_ORDER' },
  ];

  let count = 0;
  for (const workflow of workflows) {
    await db.approvalWorkflow.upsert({
      where: { code: workflow.code },
      update: { name: workflow.name, workflowType: workflow.workflowType },
      create: workflow,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} approval workflows`);

  const createdWorkflows = await db.approvalWorkflow.findMany();
  
  const steps = [
    { workflowCode: 'WF_JC_STD', steps: [{ stepNumber: 1, stepName: 'Supervisor Review', approverRole: 'SUPERVISOR' }] },
    { workflowCode: 'WF_MR_STD', steps: [{ stepNumber: 1, stepName: 'Supervisor Approval', approverRole: 'SUPERVISOR' }] },
    { workflowCode: 'WF_PR_LOCAL', steps: [
      { stepNumber: 1, stepName: 'LPO Review', approverRole: 'LPO' },
      { stepNumber: 2, stepName: 'Workshop Manager Approval', approverRole: 'WM' },
    ]},
    { workflowCode: 'WF_PO_STD', steps: [
      { stepNumber: 1, stepName: 'Procurement Review', approverRole: 'LPO' },
      { stepNumber: 2, stepName: 'Manager Approval', approverRole: 'WM' },
    ]},
  ];

  let stepCount = 0;
  for (const workflow of createdWorkflows) {
    const workflowSteps = steps.find(s => s.workflowCode === workflow.code)?.steps || [];
    for (const step of workflowSteps) {
      const existing = await db.approvalStepConfig.findUnique({
        where: { workflowId_stepNumber: { workflowId: workflow.id, stepNumber: step.stepNumber } }
      });
      if (!existing) {
        await db.approvalStepConfig.create({
          data: {
            workflowId: workflow.id,
            stepNumber: step.stepNumber,
            stepName: step.stepName,
            approverRole: step.approverRole,
            isRequired: true,
            slaHours: 24,
          }
        });
        stepCount++;
      }
    }
  }
  console.log(`   ✓ Created ${stepCount} new workflow steps`);
}

// ============================================
// FUEL TANKS
// ============================================
async function seedFuelTanks() {
  console.log('⛽ Seeding fuel tanks...');
  
  const tanks = [
    { tankNumber: 'FT-001', name: 'Diesel Tank 1', fuelType: 'DIESEL', capacity: 10000, currentLevel: 7500, location: 'Fuel Depot - North' },
    { tankNumber: 'FT-002', name: 'Diesel Tank 2', fuelType: 'DIESEL', capacity: 10000, currentLevel: 5000, location: 'Fuel Depot - South' },
    { tankNumber: 'FT-003', name: 'Petrol Tank', fuelType: 'PETROL', capacity: 5000, currentLevel: 3000, location: 'Fuel Depot - East' },
  ];

  let count = 0;
  for (const tank of tanks) {
    await db.fuelTank.upsert({
      where: { tankNumber: tank.tankNumber },
      update: { name: tank.name, currentLevel: tank.currentLevel },
      create: tank,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} fuel tanks`);
}

// ============================================
// TRAININGS
// ============================================
async function seedTrainings() {
  console.log('📚 Seeding trainings...');
  
  const trainings = [
    { code: 'TRN-001', name: 'Workshop Safety Induction', category: 'SAFETY', validityPeriod: 12, isRequired: true },
    { code: 'TRN-002', name: 'Forklift Operation', category: 'EQUIPMENT', validityPeriod: 24, isRequired: false },
    { code: 'TRN-003', name: 'Crane Operation', category: 'EQUIPMENT', validityPeriod: 24, isRequired: false },
    { code: 'TRN-004', name: 'Hydraulic Systems', category: 'TECHNICAL', validityPeriod: 36, isRequired: false },
    { code: 'TRN-005', name: 'Welding Certification', category: 'TECHNICAL', validityPeriod: 24, isRequired: false },
    { code: 'TRN-006', name: 'First Aid', category: 'SAFETY', validityPeriod: 12, isRequired: true },
  ];

  let count = 0;
  for (const training of trainings) {
    await db.training.upsert({
      where: { code: training.code },
      update: { name: training.name, category: training.category, validityPeriod: training.validityPeriod },
      create: training,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} trainings`);
}

// ============================================
// EMPLOYEES
// ============================================
async function seedEmployees() {
  console.log('👷 Seeding employees...');
  
  const employees = [
    { employeeNumber: 'EMP002', name: 'John Smith', department: 'Workshop', designation: 'Senior Technician', skillLevel: 'SENIOR', hourlyRate: 25 },
    { employeeNumber: 'EMP003', name: 'Mike Johnson', department: 'Workshop', designation: 'Technician', skillLevel: 'JUNIOR', hourlyRate: 18 },
    { employeeNumber: 'EMP004', name: 'David Wilson', department: 'Workshop', designation: 'Workshop Supervisor', skillLevel: 'SUPERVISOR', hourlyRate: 35 },
    { employeeNumber: 'EMP005', name: 'Sarah Brown', department: 'Stores', designation: 'Storekeeper', skillLevel: 'SENIOR', hourlyRate: 22 },
  ];

  let count = 0;
  for (const employee of employees) {
    await db.employee.upsert({
      where: { employeeNumber: employee.employeeNumber },
      update: { name: employee.name, department: employee.department, designation: employee.designation },
      create: employee,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} employees`);
}

// ============================================
// BUDGET LINES
// ============================================
async function seedBudgetLines() {
  console.log('💵 Seeding budget lines...');
  
  const fiscalYear = new Date().getFullYear();
  
  const budgets = [
    { code: 'BUD-MAINT', name: 'Maintenance Budget', department: 'Workshop', fiscalYear, allocatedAmount: 500000, availableAmount: 500000 },
    { code: 'BUD-PARTS', name: 'Spare Parts Budget', department: 'Workshop', fiscalYear, allocatedAmount: 300000, availableAmount: 300000 },
    { code: 'BUD-PROC', name: 'Procurement Budget', department: 'Procurement', fiscalYear, allocatedAmount: 1000000, availableAmount: 1000000 },
    { code: 'BUD-FUEL', name: 'Fuel Budget', department: 'Workshop', fiscalYear, allocatedAmount: 200000, availableAmount: 200000 },
    { code: 'BUD-TRAIN', name: 'Training Budget', department: 'HR', fiscalYear, allocatedAmount: 50000, availableAmount: 50000 },
  ];

  let count = 0;
  for (const budget of budgets) {
    const existing = await db.budgetLine.findFirst({
      where: { code: budget.code, fiscalYear }
    });
    if (!existing) {
      await db.budgetLine.create({ data: budget });
      count++;
    }
  }
  console.log(`   ✓ Created ${count} new budget lines`);
}

// ============================================
// JOB CARDS (SAMPLE TRANSACTIONS)
// ============================================
async function seedJobCards() {
  console.log('🔧 Seeding job cards...');
  
  const assets = await db.asset.findMany();
  const users = await db.user.findMany();
  const assetMap = Object.fromEntries(assets.map(a => [a.assetNumber, a.id]));
  const userMap = Object.fromEntries(users.map(u => [u.email, u.id]));
  
  const jobCards = [
    {
      jobCardNumber: 'JC-2024-001',
      assetId: assetMap['VEH-001'],
      jobType: 'CORRECTIVE',
      priority: 'HIGH',
      status: 'COMPLETED',
      faultDescription: 'Engine overheating, coolant leak detected from radiator hose',
      diagnosisNotes: 'Radiator hose cracked at connection point. Requires replacement.',
      workPerformed: 'Replaced upper radiator hose, refilled coolant, pressure tested system',
      estimatedCost: 150,
      estimatedDuration: 3,
      actualCost: 135,
      actualDuration: 2,
      scheduledStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      scheduledEnd: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      actualStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      actualEnd: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      meterReadingStart: 45230,
      meterReadingEnd: 45230,
      createdBy: userMap['tech1@wcp.com'],
      closedBy: userMap['supervisor@wcp.com'],
      closedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
    },
    {
      jobCardNumber: 'JC-2024-002',
      assetId: assetMap['GEN-001'],
      jobType: 'PREVENTIVE',
      priority: 'NORMAL',
      status: 'IN_PROGRESS',
      faultDescription: 'Scheduled 500-hour maintenance service',
      diagnosisNotes: 'Regular preventive maintenance per schedule',
      estimatedCost: 500,
      estimatedDuration: 4,
      scheduledStart: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      scheduledEnd: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      actualStart: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      meterReadingStart: 4875,
      createdBy: userMap['supervisor@wcp.com'],
    },
    {
      jobCardNumber: 'JC-2024-003',
      assetId: assetMap['VEH-002'],
      jobType: 'CORRECTIVE',
      priority: 'CRITICAL',
      status: 'APPROVED',
      faultDescription: 'Brake system failure - vehicle unsafe to operate',
      diagnosisNotes: 'Front brake pads worn to metal, brake fluid leak from caliper',
      estimatedCost: 450,
      estimatedDuration: 4,
      scheduledStart: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      scheduledEnd: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
      createdBy: userMap['tech2@wcp.com'],
    },
    {
      jobCardNumber: 'JC-2024-004',
      assetId: assetMap['CMP-001'],
      jobType: 'CORRECTIVE',
      priority: 'HIGH',
      status: 'APPROVED',
      faultDescription: 'Air pressure dropping below threshold, unusual noise from compressor',
      diagnosisNotes: 'Suspected valve plate wear, requires inspection',
      estimatedCost: 800,
      estimatedDuration: 6,
      scheduledStart: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      scheduledEnd: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
      createdBy: userMap['tech1@wcp.com'],
    },
    {
      jobCardNumber: 'JC-2024-005',
      assetId: assetMap['WLD-001'],
      jobType: 'CORRECTIVE',
      priority: 'NORMAL',
      status: 'DRAFT',
      faultDescription: 'Wire feed mechanism jamming intermittently',
      diagnosisNotes: null,
      estimatedCost: 200,
      estimatedDuration: 2,
      createdBy: userMap['tech1@wcp.com'],
    },
    {
      jobCardNumber: 'JC-2024-006',
      assetId: assetMap['LFT-001'],
      jobType: 'INSPECTION',
      priority: 'HIGH',
      status: 'APPROVED',
      faultDescription: 'Annual safety inspection and load test certification',
      diagnosisNotes: 'Mandatory annual certification per safety regulations',
      estimatedCost: 1500,
      estimatedDuration: 8,
      scheduledStart: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      scheduledEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
      createdBy: userMap['supervisor@wcp.com'],
    },
    {
      jobCardNumber: 'JC-2024-007',
      assetId: assetMap['VEH-003'],
      jobType: 'PREVENTIVE',
      priority: 'NORMAL',
      status: 'DRAFT',
      faultDescription: 'Scheduled 10,000 km service',
      diagnosisNotes: null,
      estimatedCost: 350,
      estimatedDuration: 3,
      createdBy: userMap['tech2@wcp.com'],
    },
    {
      jobCardNumber: 'JC-2024-008',
      assetId: assetMap['PMP-001'],
      jobType: 'CORRECTIVE',
      priority: 'LOW',
      status: 'CLOSED',
      faultDescription: 'Minor seal leak at pump shaft',
      diagnosisNotes: 'Mechanical seal showing signs of wear but still functional',
      workPerformed: 'Replaced mechanical seal, realigned coupling',
      estimatedCost: 250,
      estimatedDuration: 3,
      actualCost: 220,
      actualDuration: 2,
      scheduledStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      scheduledEnd: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      actualStart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      actualEnd: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      meterReadingStart: 12450,
      meterReadingEnd: 12450,
      createdBy: userMap['tech1@wcp.com'],
      closedBy: userMap['supervisor@wcp.com'],
      closedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
    },
  ];

  let count = 0;
  for (const jc of jobCards) {
    if (!jc.assetId || !jc.createdBy) continue;
    
    await db.jobCard.upsert({
      where: { jobCardNumber: jc.jobCardNumber },
      update: { 
        status: jc.status,
        diagnosisNotes: jc.diagnosisNotes,
        workPerformed: jc.workPerformed,
        actualCost: jc.actualCost,
        actualDuration: jc.actualDuration,
      },
      create: jc,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} job cards`);

  // Create tasks for each job card
  const createdJobCards = await db.jobCard.findMany();
  let taskCount = 0;
  
  for (const jc of createdJobCards) {
    const tasks = getTasksForJobType(jc.jobType, jc.id);
    for (const task of tasks) {
      const existing = await db.jcTask.findUnique({
        where: { jobCardId_taskNumber: { jobCardId: jc.id, taskNumber: task.taskNumber } }
      });
      if (!existing) {
        await db.jcTask.create({
          data: { ...task, jobCardId: jc.id }
        });
        taskCount++;
      }
    }
  }
  console.log(`   ✓ Created ${taskCount} new job card tasks`);

  // Create state transitions
  await seedJobCardTransitions(createdJobCards, userMap);
  
  // Create technician assignments
  await seedTechnicianAssignments(createdJobCards, userMap);
}

function getTasksForJobType(jobType: string, _jobCardId: string): Array<{ taskNumber: number; description: string; isMandatory: boolean; sequence: number }> {
  const taskTemplates: Record<string, Array<{ taskNumber: number; description: string; isMandatory: boolean; sequence: number }>> = {
    'CORRECTIVE': [
      { taskNumber: 1, description: 'Receive and review fault report', isMandatory: true, sequence: 1 },
      { taskNumber: 2, description: 'Perform initial diagnosis', isMandatory: true, sequence: 2 },
      { taskNumber: 3, description: 'Document findings and required parts', isMandatory: true, sequence: 3 },
      { taskNumber: 4, description: 'Perform repair work', isMandatory: true, sequence: 4 },
      { taskNumber: 5, description: 'Test and verify repair', isMandatory: true, sequence: 5 },
      { taskNumber: 6, description: 'Update job card documentation', isMandatory: true, sequence: 6 },
    ],
    'PREVENTIVE': [
      { taskNumber: 1, description: 'Review maintenance checklist', isMandatory: true, sequence: 1 },
      { taskNumber: 2, description: 'Perform visual inspection', isMandatory: true, sequence: 2 },
      { taskNumber: 3, description: 'Change fluids and filters', isMandatory: true, sequence: 3 },
      { taskNumber: 4, description: 'Inspect wear items', isMandatory: true, sequence: 4 },
      { taskNumber: 5, description: 'Lubricate moving parts', isMandatory: true, sequence: 5 },
      { taskNumber: 6, description: 'Record meter readings', isMandatory: true, sequence: 6 },
      { taskNumber: 7, description: 'Test equipment operation', isMandatory: true, sequence: 7 },
    ],
    'INSPECTION': [
      { taskNumber: 1, description: 'Review inspection requirements', isMandatory: true, sequence: 1 },
      { taskNumber: 2, description: 'Perform visual inspection', isMandatory: true, sequence: 2 },
      { taskNumber: 3, description: 'Conduct functional tests', isMandatory: true, sequence: 3 },
      { taskNumber: 4, description: 'Document findings', isMandatory: true, sequence: 4 },
      { taskNumber: 5, description: 'Complete certification paperwork', isMandatory: true, sequence: 5 },
    ],
  };
  
  return taskTemplates[jobType] || taskTemplates['CORRECTIVE'];
}

async function seedJobCardTransitions(jobCards: Array<{ id: string; status: string; createdBy: string | null; closedBy: string | null }>, userMap: Record<string, string>) {
  let count = 0;
  
  for (const jc of jobCards) {
    // Check if transitions already exist
    const existing = await db.jcStateTransition.findFirst({ where: { jobCardId: jc.id } });
    if (existing) continue;
    
    const transitions = getStateTransitions(jc.status, userMap, jc.createdBy, jc.closedBy);
    for (const transition of transitions) {
      await db.jcStateTransition.create({
        data: {
          jobCardId: jc.id,
          fromState: transition.fromState,
          toState: transition.toState,
          transitionType: transition.transitionType,
          actorId: transition.actorId,
          reason: transition.reason,
          comments: transition.comments,
          createdAt: transition.createdAt,
        }
      });
      count++;
    }
  }
  console.log(`   ✓ Created ${count} state transitions`);
}

function getStateTransitions(
  status: string, 
  userMap: Record<string, string>, 
  creatorId: string | null,
  _closedById: string | null
): Array<{ fromState: string; toState: string; transitionType: string; actorId: string; reason?: string; comments?: string; createdAt: Date }> {
  const supervisor = userMap['supervisor@wcp.com'] || creatorId || '';
  const baseTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  const statusFlows: Record<string, Array<{ fromState: string; toState: string; transitionType: string; actorId: string; reason?: string; comments?: string; createdAt: Date }>> = {
    'DRAFT': [
      { fromState: 'DRAFT', toState: 'DRAFT', transitionType: 'CREATE', actorId: creatorId || supervisor, comments: 'Job card created', createdAt: new Date(baseTime) },
    ],
    'APPROVED': [
      { fromState: 'DRAFT', toState: 'DRAFT', transitionType: 'CREATE', actorId: creatorId || supervisor, comments: 'Job card created', createdAt: new Date(baseTime) },
      { fromState: 'DRAFT', toState: 'APPROVED', transitionType: 'APPROVE', actorId: supervisor, comments: 'Approved for scheduling', createdAt: new Date(baseTime + 1000) },
    ],
    'IN_PROGRESS': [
      { fromState: 'DRAFT', toState: 'DRAFT', transitionType: 'CREATE', actorId: creatorId || supervisor, comments: 'Job card created', createdAt: new Date(baseTime) },
      { fromState: 'DRAFT', toState: 'APPROVED', transitionType: 'APPROVE', actorId: supervisor, comments: 'Approved for work', createdAt: new Date(baseTime + 1000) },
      { fromState: 'APPROVED', toState: 'IN_PROGRESS', transitionType: 'START', actorId: creatorId || supervisor, comments: 'Work commenced', createdAt: new Date(baseTime + 2000) },
    ],
    'COMPLETED': [
      { fromState: 'DRAFT', toState: 'DRAFT', transitionType: 'CREATE', actorId: creatorId || supervisor, comments: 'Job card created', createdAt: new Date(baseTime) },
      { fromState: 'DRAFT', toState: 'APPROVED', transitionType: 'APPROVE', actorId: supervisor, comments: 'Approved', createdAt: new Date(baseTime + 1000) },
      { fromState: 'APPROVED', toState: 'IN_PROGRESS', transitionType: 'START', actorId: creatorId || supervisor, comments: 'Work started', createdAt: new Date(baseTime + 2000) },
      { fromState: 'IN_PROGRESS', toState: 'COMPLETED', transitionType: 'COMPLETE', actorId: creatorId || supervisor, comments: 'Work completed successfully', createdAt: new Date(baseTime + 3000) },
    ],
    'CLOSED': [
      { fromState: 'DRAFT', toState: 'DRAFT', transitionType: 'CREATE', actorId: creatorId || supervisor, comments: 'Job card created', createdAt: new Date(baseTime - 7 * 24 * 60 * 60 * 1000) },
      { fromState: 'DRAFT', toState: 'APPROVED', transitionType: 'APPROVE', actorId: supervisor, comments: 'Approved', createdAt: new Date(baseTime - 7 * 24 * 60 * 60 * 1000 + 1000) },
      { fromState: 'APPROVED', toState: 'IN_PROGRESS', transitionType: 'START', actorId: creatorId || supervisor, comments: 'Work started', createdAt: new Date(baseTime - 7 * 24 * 60 * 60 * 1000 + 2000) },
      { fromState: 'IN_PROGRESS', toState: 'COMPLETED', transitionType: 'COMPLETE', actorId: creatorId || supervisor, comments: 'Repair completed', createdAt: new Date(baseTime - 7 * 24 * 60 * 60 * 1000 + 3000) },
      { fromState: 'COMPLETED', toState: 'CLOSED', transitionType: 'CLOSE', actorId: supervisor, comments: 'Verified and closed', createdAt: new Date(baseTime - 7 * 24 * 60 * 60 * 1000 + 4000) },
    ],
  };
  
  return statusFlows[status] || statusFlows['DRAFT'];
}

async function seedTechnicianAssignments(jobCards: Array<{ id: string; jobCardNumber: string; status: string; createdAt: Date }>, userMap: Record<string, string>) {
  const tech1 = userMap['tech1@wcp.com'];
  const tech2 = userMap['tech2@wcp.com'];
  
  if (!tech1 || !tech2) return;
  
  let count = 0;
  for (const jc of jobCards) {
    if (jc.status === 'DRAFT') continue;
    
    const existing = await db.jcTechnicianAssignment.findFirst({ where: { jobCardId: jc.id } });
    if (existing) continue;
    
    const techId = jc.jobCardNumber.includes('002') || jc.jobCardNumber.includes('004') ? tech2 : tech1;
    
    await db.jcTechnicianAssignment.create({
      data: {
        jobCardId: jc.id,
        technicianId: techId,
        role: 'TECHNICIAN',
        assignedAt: jc.createdAt,
        assignedBy: userMap['supervisor@wcp.com'] || techId,
        isActive: true,
      }
    });
    count++;
  }
  console.log(`   ✓ Created ${count} technician assignments`);
}

// ============================================
// MATERIAL REQUESTS (SAMPLE TRANSACTIONS)
// ============================================
async function seedMaterialRequests() {
  console.log('📦 Seeding material requests...');
  
  const jobCards = await db.jobCard.findMany();
  const users = await db.user.findMany();
  const items = await db.item.findMany();
  
  const jcMap = Object.fromEntries(jobCards.map(jc => [jc.jobCardNumber, jc]));
  const userMap = Object.fromEntries(users.map(u => [u.email, u.id]));
  const itemMap = Object.fromEntries(items.map(i => [i.itemCode, i.id]));
  
  const tech1 = userMap['tech1@wcp.com'];
  const supervisor = userMap['supervisor@wcp.com'];
  
  if (!tech1 || !supervisor) return;
  
  const materialRequests = [
    {
      mrNumber: 'MR-2024-001',
      jobCardId: jcMap['JC-2024-001']?.id,
      requestorId: tech1,
      requestType: 'JC_LINKED',
      priority: 'HIGH',
      status: 'FULFILLED',
      requiredBy: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      approvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      approvedBy: supervisor,
      fulfilledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
    },
    {
      mrNumber: 'MR-2024-002',
      jobCardId: jcMap['JC-2024-002']?.id,
      requestorId: tech1,
      requestType: 'JC_LINKED',
      priority: 'NORMAL',
      status: 'APPROVED',
      requiredBy: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      approvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      approvedBy: supervisor,
    },
    {
      mrNumber: 'MR-2024-003',
      jobCardId: jcMap['JC-2024-003']?.id,
      requestorId: userMap['tech2@wcp.com'] || tech1,
      requestType: 'JC_LINKED',
      priority: 'CRITICAL',
      status: 'APPROVED',
      requiredBy: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      approvedAt: new Date(Date.now()),
      approvedBy: supervisor,
    },
    {
      mrNumber: 'MR-2024-004',
      jobCardId: jcMap['JC-2024-004']?.id,
      requestorId: tech1,
      requestType: 'JC_LINKED',
      priority: 'HIGH',
      status: 'PENDING',
      requiredBy: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      mrNumber: 'MR-2024-005',
      jobCardId: null,
      requestorId: tech1,
      requestType: 'GENERAL',
      priority: 'NORMAL',
      status: 'APPROVED',
      requiredBy: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      approvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      approvedBy: supervisor,
    },
    {
      mrNumber: 'MR-2024-006',
      jobCardId: null,
      requestorId: userMap['tech2@wcp.com'] || tech1,
      requestType: 'GENERAL',
      priority: 'LOW',
      status: 'DRAFT',
      requiredBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  ];

  let count = 0;
  for (const mr of materialRequests) {
    await db.materialRequest.upsert({
      where: { mrNumber: mr.mrNumber },
      update: { status: mr.status },
      create: mr,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} material requests`);

  // Create MR lines
  const createdMRs = await db.materialRequest.findMany();
  let lineCount = 0;
  
  const mrLineData: Record<string, Array<{ itemCode: string; qty: number }>> = {
    'MR-2024-001': [
      { itemCode: 'OIL-001', qty: 20 },
      { itemCode: 'FLT-001', qty: 2 },
    ],
    'MR-2024-002': [
      { itemCode: 'OIL-001', qty: 40 },
      { itemCode: 'FLT-002', qty: 4 },
      { itemCode: 'OIL-003', qty: 3 },
    ],
    'MR-2024-003': [
      { itemCode: 'FLT-003', qty: 1 },
      { itemCode: 'OIL-001', qty: 10 },
    ],
    'MR-2024-004': [
      { itemCode: 'HYD-001', qty: 5 },
      { itemCode: 'OIL-002', qty: 20 },
    ],
    'MR-2024-005': [
      { itemCode: 'SAF-001', qty: 5 },
      { itemCode: 'SAF-002', qty: 10 },
      { itemCode: 'CON-001', qty: 5 },
    ],
    'MR-2024-006': [
      { itemCode: 'FST-001', qty: 2 },
    ],
  };
  
  for (const mr of createdMRs) {
    const lines = mrLineData[mr.mrNumber] || [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const itemId = itemMap[line.itemCode];
      if (!itemId) continue;
      
      const existing = await db.mrLine.findUnique({
        where: { mrId_lineNumber: { mrId: mr.id, lineNumber: i + 1 } }
      });
      if (!existing) {
        const status = mr.status === 'FULFILLED' ? 'FULFILLED' : mr.status === 'APPROVED' ? 'APPROVED' : 'PENDING';
        await db.mrLine.create({
          data: {
            mrId: mr.id,
            lineNumber: i + 1,
            itemId,
            requestedQty: line.qty,
            approvedQty: mr.status !== 'DRAFT' && mr.status !== 'PENDING' ? line.qty : null,
            issuedQty: mr.status === 'FULFILLED' ? line.qty : 0,
            status,
          }
        });
        lineCount++;
      }
    }
  }
  console.log(`   ✓ Created ${lineCount} MR lines`);

  // Create MR approvals
  let approvalCount = 0;
  for (const mr of createdMRs) {
    if (mr.status === 'DRAFT' || mr.status === 'PENDING') continue;
    
    const existing = await db.mrApprovalHistory.findFirst({ where: { mrId: mr.id } });
    if (existing) continue;
    
    await db.mrApprovalHistory.create({
      data: {
        mrId: mr.id,
        approverId: supervisor,
        approvalLevel: 1,
        status: 'APPROVED',
        comments: 'Approved',
        approvedAt: mr.approvedAt,
      }
    });
    approvalCount++;
  }
  console.log(`   ✓ Created ${approvalCount} MR approval records`);
}

// ============================================
// MATERIAL ISSUES (SAMPLE TRANSACTIONS)
// ============================================
async function seedMaterialIssues() {
  console.log('📋 Seeding material issues...');
  
  const jobCards = await db.jobCard.findMany();
  const users = await db.user.findMany();
  const items = await db.item.findMany();
  const stores = await db.store.findMany();
  const mrs = await db.materialRequest.findMany();
  const stock = await db.storeStock.findMany();
  
  const jcMap = Object.fromEntries(jobCards.map(jc => [jc.jobCardNumber, jc]));
  const userMap = Object.fromEntries(users.map(u => [u.email, u.id]));
  const itemMap = Object.fromEntries(items.map(i => [i.itemCode, i.id]));
  const storeMap = Object.fromEntries(stores.map(s => [s.code, s.id]));
  const mrMap = Object.fromEntries(mrs.map(mr => [mr.mrNumber, mr]));
  
  const storekeeper = userMap['storekeeper@wcp.com'];
  const tech1 = userMap['tech1@wcp.com'];
  const mainStore = storeMap['MAIN'];
  
  if (!storekeeper || !tech1 || !mainStore) return;
  
  const materialIssues = [
    {
      miNumber: 'MI-2024-001',
      mrId: mrMap['MR-2024-001']?.id,
      storeId: mainStore,
      issueType: 'STANDARD',
      status: 'VERIFIED',
      issuedToId: tech1,
      jobCardId: jcMap['JC-2024-001']?.id,
      issuedBy: storekeeper,
      issuedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      verifiedById: userMap['supervisor@wcp.com'],
      verifiedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000),
      verificationStatus: 'CONFIRMED',
      totalValue: 85.50,
    },
    {
      miNumber: 'MI-2024-002',
      mrId: null,
      storeId: mainStore,
      issueType: 'EMERGENCY',
      status: 'ISSUED',
      issuedToId: userMap['tech2@wcp.com'] || tech1,
      jobCardId: jcMap['JC-2024-002']?.id,
      issuedBy: storekeeper,
      issuedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      totalValue: 150.00,
    },
    {
      miNumber: 'MI-2024-003',
      mrId: mrMap['MR-2024-005']?.id,
      storeId: mainStore,
      issueType: 'STANDARD',
      status: 'DRAFT',
      issuedToId: tech1,
      jobCardId: null,
      issuedBy: storekeeper,
      totalValue: 125.00,
    },
  ];

  let count = 0;
  for (const mi of materialIssues) {
    await db.materialIssue.upsert({
      where: { miNumber: mi.miNumber },
      update: { status: mi.status },
      create: mi,
    });
    count++;
  }
  console.log(`   ✓ Created/updated ${count} material issues`);

  // Create MI lines
  const createdMIs = await db.materialIssue.findMany();
  let lineCount = 0;
  
  const miLineData: Record<string, Array<{ itemCode: string; qty: number; unitCost: number }>> = {
    'MI-2024-001': [
      { itemCode: 'OIL-001', qty: 20, unitCost: 3.50 },
      { itemCode: 'FLT-001', qty: 2, unitCost: 15.50 },
    ],
    'MI-2024-002': [
      { itemCode: 'OIL-001', qty: 40, unitCost: 3.50 },
      { itemCode: 'OIL-003', qty: 3, unitCost: 3.33 },
    ],
    'MI-2024-003': [
      { itemCode: 'SAF-001', qty: 5, unitCost: 15.00 },
      { itemCode: 'SAF-002', qty: 10, unitCost: 5.00 },
    ],
  };
  
  for (const mi of createdMIs) {
    const lines = miLineData[mi.miNumber] || [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const itemId = itemMap[line.itemCode];
      if (!itemId) continue;
      
      const existing = await db.miLine.findFirst({
        where: { miId: mi.id, itemId }
      });
      if (!existing) {
        await db.miLine.create({
          data: {
            miId: mi.id,
            itemId,
            issuedQty: line.qty,
            unitCost: line.unitCost,
            totalCost: line.qty * line.unitCost,
          }
        });
        lineCount++;
        
        // Create stock transaction for verified/issued MIs
        if (mi.status === 'VERIFIED' || mi.status === 'ISSUED') {
          const stockRecord = stock.find(s => s.storeId === mi.storeId && s.itemId === itemId);
          if (stockRecord) {
            await db.stockTransaction.create({
              data: {
                storeId: mi.storeId,
                itemId,
                transactionType: 'ISSUE',
                quantity: -line.qty,
                unitCost: line.unitCost,
                totalValue: -(line.qty * line.unitCost),
                referenceType: 'MATERIAL_ISSUE',
                referenceId: mi.id,
                miId: mi.id,
                performedBy: storekeeper,
                notes: `Issue ${mi.miNumber}`,
              }
            });
          }
        }
      }
    }
  }
  console.log(`   ✓ Created ${lineCount} MI lines`);
}

// ============================================
// TIME LOGS (SAMPLE TRANSACTIONS)
// ============================================
async function seedTimeLogs() {
  console.log('⏱️ Seeding time logs...');
  
  const jobCards = await db.jobCard.findMany();
  const employees = await db.employee.findMany();
  
  const jcMap = Object.fromEntries(jobCards.map(jc => [jc.jobCardNumber, jc]));
  const empMap = Object.fromEntries(employees.map(e => [e.employeeNumber, e.id]));
  
  const emp002 = empMap['EMP002']; // John Smith
  const emp003 = empMap['EMP003']; // Mike Johnson
  
  if (!emp002 || !emp003) {
    console.log('   ⚠️  Skipping time logs - employees not found');
    return;
  }
  
  const timeLogs = [
    {
      employeeId: emp002,
      jobCardId: jcMap['JC-2024-001']?.id,
      logDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      totalMinutes: 120,
      hourlyRate: 25,
      totalCost: 50,
      notes: 'Radiator hose replacement and system test',
    },
    {
      employeeId: emp003,
      jobCardId: jcMap['JC-2024-002']?.id,
      logDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      totalMinutes: 240,
      hourlyRate: 18,
      totalCost: 72,
      notes: '500-hour PM service in progress',
    },
    {
      employeeId: emp002,
      jobCardId: jcMap['JC-2024-008']?.id,
      logDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      startTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      totalMinutes: 120,
      hourlyRate: 25,
      totalCost: 50,
      notes: 'Mechanical seal replacement',
    },
  ];

  let count = 0;
  for (const log of timeLogs) {
    if (!log.jobCardId) continue;
    
    const existing = await db.timeLog.findFirst({
      where: { 
        jobCardId: log.jobCardId, 
        employeeId: log.employeeId,
        logDate: log.logDate
      }
    });
    if (existing) continue;
    
    await db.timeLog.create({ data: log });
    count++;
  }
  console.log(`   ✓ Created ${count} time logs`);
}

// Run the seed
main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
