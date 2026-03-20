/**
 * ============================================
 * WORKSHOP CONTROL PLATFORM - ROLE SEED
 * ============================================
 * Role definitions and privilege assignments for the WCP system.
 * This seed creates roles and assigns privileges based on job functions.
 * 
 * Run with: bun prisma/seed-roles.ts
 */

import { db } from '@/lib/db';

// ============================================
// ROLE DEFINITIONS
// ============================================

interface RoleDefinition {
  code: string;
  name: string;
  description: string;
  level: number;
}

const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    code: 'TECHNICIAN',
    name: 'Technician',
    description: 'Workshop technician who performs repairs and maintenance',
    level: 1,
  },
  {
    code: 'SUPERVISOR',
    name: 'Supervisor',
    description: 'Workshop supervisor who oversees daily operations',
    level: 2,
  },
  {
    code: 'STOREKEEPER',
    name: 'Storekeeper',
    description: 'Store keeper responsible for inventory management',
    level: 2,
  },
  {
    code: 'PROCUREMENT_OFFICER',
    name: 'Procurement Officer',
    description: 'Local procurement officer for workshop purchases',
    level: 3,
  },
  {
    code: 'WORKSHOP_MANAGER',
    name: 'Workshop Manager',
    description: 'Workshop manager with full operational control',
    level: 4,
  },
  {
    code: 'HO_PROCUREMENT',
    name: 'HO Procurement Officer',
    description: 'Head Office procurement officer',
    level: 3,
  },
  {
    code: 'HO_FINANCE',
    name: 'HO Finance',
    description: 'Head Office finance team member',
    level: 4,
  },
  {
    code: 'HO_MANAGER',
    name: 'HO Manager',
    description: 'Head Office manager',
    level: 5,
  },
  {
    code: 'CONTROL_MANAGER',
    name: 'Control Manager',
    description: 'Control manager with system override privileges',
    level: 6,
  },
  {
    code: 'ADMIN',
    name: 'System Administrator',
    description: 'Full system administrator with all privileges',
    level: 10,
  },
];

// ============================================
// PRIVILEGE ASSIGNMENTS BY ROLE
// ============================================

/**
 * All privilege codes by category for reference
 */
const ALL_PRIVILEGES = {
  // JOB_CARD
  JC_CREATE: 'JC_CREATE',
  JC_VIEW: 'JC_VIEW',
  JC_EDIT: 'JC_EDIT',
  JC_DELETE: 'JC_DELETE',
  JC_APPROVE: 'JC_APPROVE',
  JC_REJECT: 'JC_REJECT',
  JC_REOPEN: 'JC_REOPEN',
  JC_MULTI_OPEN: 'JC_MULTI_OPEN',
  JC_CLOSE: 'JC_CLOSE',
  JC_ASSIGN: 'JC_ASSIGN',

  // MATERIAL_REQUEST
  MR_CREATE: 'MR_CREATE',
  MR_VIEW: 'MR_VIEW',
  MR_EDIT: 'MR_EDIT',
  MR_DELETE: 'MR_DELETE',
  MR_APPROVE: 'MR_APPROVE',
  MR_REJECT: 'MR_REJECT',
  MR_EMERGENCY: 'MR_EMERGENCY',

  // MATERIAL_ISSUE
  MI_CREATE: 'MI_CREATE',
  MI_VIEW: 'MI_VIEW',
  MI_VERIFY: 'MI_VERIFY',
  MI_EMERGENCY_ISSUE: 'MI_EMERGENCY_ISSUE',
  MI_RETURN_PROCESS: 'MI_RETURN_PROCESS',

  // INVENTORY
  INV_VIEW: 'INV_VIEW',
  INV_MANAGE: 'INV_MANAGE',
  INV_ADJUST: 'INV_ADJUST',
  INV_TRANSFER: 'INV_TRANSFER',
  INV_STOCK_TAKE: 'INV_STOCK_TAKE',

  // PROCUREMENT
  PR_CREATE: 'PR_CREATE',
  PR_VIEW: 'PR_VIEW',
  PR_APPROVE: 'PR_APPROVE',
  RFQ_CREATE: 'RFQ_CREATE',
  RFQ_MANAGE: 'RFQ_MANAGE',
  PO_CREATE: 'PO_CREATE',
  PO_APPROVE: 'PO_APPROVE',
  PO_DISPATCH: 'PO_DISPATCH',
  GRN_CREATE: 'GRN_CREATE',
  GRN_VERIFY: 'GRN_VERIFY',
  INVOICE_MATCH: 'INVOICE_MATCH',
  PAYMENT_APPROVE: 'PAYMENT_APPROVE',

  // PURCHASE_AUTHORITY
  LP_APPROVE_L1: 'LP_APPROVE_L1',
  LP_APPROVE_L2: 'LP_APPROVE_L2',
  LP_APPROVE_L3: 'LP_APPROVE_L3',
  LP_CHANNEL_OVERRIDE: 'LP_CHANNEL_OVERRIDE',
  HO_PROCUREMENT_ACCESS: 'HO_PROCUREMENT_ACCESS',
  SYS_LPA_OVERRIDE: 'SYS_LPA_OVERRIDE',
  EMERGENCY_PURCHASE: 'EMERGENCY_PURCHASE',
  EMERGENCY_RATIFICATION: 'EMERGENCY_RATIFICATION',

  // ASSET
  ASSET_CREATE: 'ASSET_CREATE',
  ASSET_VIEW: 'ASSET_VIEW',
  ASSET_EDIT: 'ASSET_EDIT',
  ASSET_DELETE: 'ASSET_DELETE',
  ASSET_QR_MANAGE: 'ASSET_QR_MANAGE',

  // FUEL
  FUEL_ISSUE: 'FUEL_ISSUE',
  FUEL_VIEW: 'FUEL_VIEW',
  FUEL_OVERRIDE_METER: 'FUEL_OVERRIDE_METER',

  // EXTERNAL_REPAIR
  EXT_REPAIR_CREATE: 'EXT_REPAIR_CREATE',
  EXT_REPAIR_APPROVE: 'EXT_REPAIR_APPROVE',
  EXT_REPAIR_MANAGE: 'EXT_REPAIR_MANAGE',

  // PM
  PM_CREATE: 'PM_CREATE',
  PM_VIEW: 'PM_VIEW',
  PM_MANAGE: 'PM_MANAGE',
  PM_SCHEDULE_EDIT: 'PM_SCHEDULE_EDIT',

  // LABOUR
  LABOUR_ASSIGN: 'LABOUR_ASSIGN',
  LABOUR_VIEW: 'LABOUR_VIEW',
  TRAINING_MANAGE: 'TRAINING_MANAGE',

  // REPORT
  REPORT_VIEW: 'REPORT_VIEW',
  REPORT_EXPORT: 'REPORT_EXPORT',
  KPI_DASHBOARD: 'KPI_DASHBOARD',

  // ADMIN
  USER_MANAGE: 'USER_MANAGE',
  ROLE_MANAGE: 'ROLE_MANAGE',
  PRIVILEGE_ASSIGN: 'PRIVILEGE_ASSIGN',
  AUDIT_VIEW: 'AUDIT_VIEW',
  AUDIT_EXPORT: 'AUDIT_EXPORT',
  SYSTEM_CONFIG: 'SYSTEM_CONFIG',

  // QUALITY
  QA_INSPECT: 'QA_INSPECT',
  QA_APPROVE: 'QA_APPROVE',
  QA_DEFECT_MANAGE: 'QA_DEFECT_MANAGE',
};

/**
 * Helper function to get all privilege codes as an array
 */
const getAllPrivilegeCodes = (): string[] => Object.values(ALL_PRIVILEGES);

/**
 * TECHNICIAN - Basic create and view privileges
 * Technicians can create and view job cards, material requests, and assets
 */
const TECHNICIAN_PRIVILEGES = [
  // Job Cards - Basic operations
  ALL_PRIVILEGES.JC_CREATE,
  ALL_PRIVILEGES.JC_VIEW,
  ALL_PRIVILEGES.JC_EDIT,

  // Material Requests - Basic operations
  ALL_PRIVILEGES.MR_CREATE,
  ALL_PRIVILEGES.MR_VIEW,

  // Material Issues - View only
  ALL_PRIVILEGES.MI_VIEW,

  // Inventory - View only
  ALL_PRIVILEGES.INV_VIEW,

  // Assets - View and basic operations
  ALL_PRIVILEGES.ASSET_VIEW,

  // Fuel - View only
  ALL_PRIVILEGES.FUEL_VIEW,

  // PM - View only
  ALL_PRIVILEGES.PM_VIEW,

  // Labour - View own assignments
  ALL_PRIVILEGES.LABOUR_VIEW,

  // Reports - Basic view
  ALL_PRIVILEGES.REPORT_VIEW,
];

/**
 * SUPERVISOR - Approval and view privileges
 * Supervisors can approve job cards, material requests, and manage technicians
 */
const SUPERVISOR_PRIVILEGES = [
  // Job Cards - Full operational control
  ALL_PRIVILEGES.JC_CREATE,
  ALL_PRIVILEGES.JC_VIEW,
  ALL_PRIVILEGES.JC_EDIT,
  ALL_PRIVILEGES.JC_DELETE,
  ALL_PRIVILEGES.JC_APPROVE,
  ALL_PRIVILEGES.JC_REJECT,
  ALL_PRIVILEGES.JC_CLOSE,
  ALL_PRIVILEGES.JC_ASSIGN,

  // Material Requests - Approval authority
  ALL_PRIVILEGES.MR_CREATE,
  ALL_PRIVILEGES.MR_VIEW,
  ALL_PRIVILEGES.MR_EDIT,
  ALL_PRIVILEGES.MR_APPROVE,
  ALL_PRIVILEGES.MR_REJECT,
  ALL_PRIVILEGES.MR_EMERGENCY,

  // Material Issues - View and verify
  ALL_PRIVILEGES.MI_VIEW,
  ALL_PRIVILEGES.MI_VERIFY,
  ALL_PRIVILEGES.MI_RETURN_PROCESS,

  // Inventory - View only
  ALL_PRIVILEGES.INV_VIEW,

  // Procurement - View PRs
  ALL_PRIVILEGES.PR_VIEW,

  // Assets - Create, view, edit
  ALL_PRIVILEGES.ASSET_CREATE,
  ALL_PRIVILEGES.ASSET_VIEW,
  ALL_PRIVILEGES.ASSET_EDIT,

  // Fuel - View and issue
  ALL_PRIVILEGES.FUEL_ISSUE,
  ALL_PRIVILEGES.FUEL_VIEW,

  // External Repairs - Create and view
  ALL_PRIVILEGES.EXT_REPAIR_CREATE,
  ALL_PRIVILEGES.EXT_REPAIR_MANAGE,

  // PM - Create and manage
  ALL_PRIVILEGES.PM_CREATE,
  ALL_PRIVILEGES.PM_VIEW,
  ALL_PRIVILEGES.PM_MANAGE,

  // Labour - Assign and view
  ALL_PRIVILEGES.LABOUR_ASSIGN,
  ALL_PRIVILEGES.LABOUR_VIEW,

  // Reports - View and export
  ALL_PRIVILEGES.REPORT_VIEW,
  ALL_PRIVILEGES.REPORT_EXPORT,
  ALL_PRIVILEGES.KPI_DASHBOARD,

  // Quality - Inspect
  ALL_PRIVILEGES.QA_INSPECT,
];

/**
 * STOREKEEPER - Inventory and issue privileges
 * Storekeepers manage inventory, material issues, and GRNs
 */
const STOREKEEPER_PRIVILEGES = [
  // Job Cards - View only
  ALL_PRIVILEGES.JC_VIEW,

  // Material Requests - View and process
  ALL_PRIVILEGES.MR_VIEW,

  // Material Issues - Full control
  ALL_PRIVILEGES.MI_CREATE,
  ALL_PRIVILEGES.MI_VIEW,
  ALL_PRIVILEGES.MI_VERIFY,
  ALL_PRIVILEGES.MI_EMERGENCY_ISSUE,
  ALL_PRIVILEGES.MI_RETURN_PROCESS,

  // Inventory - Full control
  ALL_PRIVILEGES.INV_VIEW,
  ALL_PRIVILEGES.INV_MANAGE,
  ALL_PRIVILEGES.INV_ADJUST,
  ALL_PRIVILEGES.INV_TRANSFER,
  ALL_PRIVILEGES.INV_STOCK_TAKE,

  // Procurement - GRN operations
  ALL_PRIVILEGES.PR_VIEW,
  ALL_PRIVILEGES.GRN_CREATE,
  ALL_PRIVILEGES.GRN_VERIFY,

  // Assets - View only
  ALL_PRIVILEGES.ASSET_VIEW,

  // Fuel - View only
  ALL_PRIVILEGES.FUEL_VIEW,

  // Reports - View and export
  ALL_PRIVILEGES.REPORT_VIEW,
  ALL_PRIVILEGES.REPORT_EXPORT,
];

/**
 * PROCUREMENT_OFFICER - Procurement privileges
 * Local procurement officers manage PRs, POs, and supplier relationships
 */
const PROCUREMENT_OFFICER_PRIVILEGES = [
  // Job Cards - View only
  ALL_PRIVILEGES.JC_VIEW,

  // Material Requests - View only
  ALL_PRIVILEGES.MR_VIEW,

  // Material Issues - View only
  ALL_PRIVILEGES.MI_VIEW,

  // Inventory - View only
  ALL_PRIVILEGES.INV_VIEW,

  // Procurement - Full control except payment
  ALL_PRIVILEGES.PR_CREATE,
  ALL_PRIVILEGES.PR_VIEW,
  ALL_PRIVILEGES.PR_APPROVE,
  ALL_PRIVILEGES.RFQ_CREATE,
  ALL_PRIVILEGES.RFQ_MANAGE,
  ALL_PRIVILEGES.PO_CREATE,
  ALL_PRIVILEGES.PO_APPROVE,
  ALL_PRIVILEGES.PO_DISPATCH,
  ALL_PRIVILEGES.GRN_CREATE,
  ALL_PRIVILEGES.INVOICE_MATCH,

  // Purchase Authority - Level 1 and 2
  ALL_PRIVILEGES.LP_APPROVE_L1,
  ALL_PRIVILEGES.LP_APPROVE_L2,
  ALL_PRIVILEGES.EMERGENCY_PURCHASE,

  // Assets - View only
  ALL_PRIVILEGES.ASSET_VIEW,

  // Reports - View and export
  ALL_PRIVILEGES.REPORT_VIEW,
  ALL_PRIVILEGES.REPORT_EXPORT,
  ALL_PRIVILEGES.KPI_DASHBOARD,
];

/**
 * WORKSHOP_MANAGER - Most privileges except SYSTEM_CONFIG
 * Workshop managers have full operational control
 */
const WORKSHOP_MANAGER_PRIVILEGES = [
  // Job Cards - Full control
  ALL_PRIVILEGES.JC_CREATE,
  ALL_PRIVILEGES.JC_VIEW,
  ALL_PRIVILEGES.JC_EDIT,
  ALL_PRIVILEGES.JC_DELETE,
  ALL_PRIVILEGES.JC_APPROVE,
  ALL_PRIVILEGES.JC_REJECT,
  ALL_PRIVILEGES.JC_REOPEN,
  ALL_PRIVILEGES.JC_MULTI_OPEN,
  ALL_PRIVILEGES.JC_CLOSE,
  ALL_PRIVILEGES.JC_ASSIGN,

  // Material Requests - Full control
  ALL_PRIVILEGES.MR_CREATE,
  ALL_PRIVILEGES.MR_VIEW,
  ALL_PRIVILEGES.MR_EDIT,
  ALL_PRIVILEGES.MR_DELETE,
  ALL_PRIVILEGES.MR_APPROVE,
  ALL_PRIVILEGES.MR_REJECT,
  ALL_PRIVILEGES.MR_EMERGENCY,

  // Material Issues - Full control
  ALL_PRIVILEGES.MI_CREATE,
  ALL_PRIVILEGES.MI_VIEW,
  ALL_PRIVILEGES.MI_VERIFY,
  ALL_PRIVILEGES.MI_EMERGENCY_ISSUE,
  ALL_PRIVILEGES.MI_RETURN_PROCESS,

  // Inventory - Full control
  ALL_PRIVILEGES.INV_VIEW,
  ALL_PRIVILEGES.INV_MANAGE,
  ALL_PRIVILEGES.INV_ADJUST,
  ALL_PRIVILEGES.INV_TRANSFER,
  ALL_PRIVILEGES.INV_STOCK_TAKE,

  // Procurement - Full control except payment
  ALL_PRIVILEGES.PR_CREATE,
  ALL_PRIVILEGES.PR_VIEW,
  ALL_PRIVILEGES.PR_APPROVE,
  ALL_PRIVILEGES.RFQ_CREATE,
  ALL_PRIVILEGES.RFQ_MANAGE,
  ALL_PRIVILEGES.PO_CREATE,
  ALL_PRIVILEGES.PO_APPROVE,
  ALL_PRIVILEGES.PO_DISPATCH,
  ALL_PRIVILEGES.GRN_CREATE,
  ALL_PRIVILEGES.GRN_VERIFY,
  ALL_PRIVILEGES.INVOICE_MATCH,

  // Purchase Authority - All levels
  ALL_PRIVILEGES.LP_APPROVE_L1,
  ALL_PRIVILEGES.LP_APPROVE_L2,
  ALL_PRIVILEGES.LP_APPROVE_L3,
  ALL_PRIVILEGES.LP_CHANNEL_OVERRIDE,
  ALL_PRIVILEGES.EMERGENCY_PURCHASE,
  ALL_PRIVILEGES.EMERGENCY_RATIFICATION,

  // Assets - Full control
  ALL_PRIVILEGES.ASSET_CREATE,
  ALL_PRIVILEGES.ASSET_VIEW,
  ALL_PRIVILEGES.ASSET_EDIT,
  ALL_PRIVILEGES.ASSET_DELETE,
  ALL_PRIVILEGES.ASSET_QR_MANAGE,

  // Fuel - Full control
  ALL_PRIVILEGES.FUEL_ISSUE,
  ALL_PRIVILEGES.FUEL_VIEW,
  ALL_PRIVILEGES.FUEL_OVERRIDE_METER,

  // External Repairs - Full control
  ALL_PRIVILEGES.EXT_REPAIR_CREATE,
  ALL_PRIVILEGES.EXT_REPAIR_APPROVE,
  ALL_PRIVILEGES.EXT_REPAIR_MANAGE,

  // PM - Full control
  ALL_PRIVILEGES.PM_CREATE,
  ALL_PRIVILEGES.PM_VIEW,
  ALL_PRIVILEGES.PM_MANAGE,
  ALL_PRIVILEGES.PM_SCHEDULE_EDIT,

  // Labour - Full control
  ALL_PRIVILEGES.LABOUR_ASSIGN,
  ALL_PRIVILEGES.LABOUR_VIEW,
  ALL_PRIVILEGES.TRAINING_MANAGE,

  // Reports - Full access
  ALL_PRIVILEGES.REPORT_VIEW,
  ALL_PRIVILEGES.REPORT_EXPORT,
  ALL_PRIVILEGES.KPI_DASHBOARD,

  // Admin - User management only
  ALL_PRIVILEGES.USER_MANAGE,
  ALL_PRIVILEGES.AUDIT_VIEW,

  // Quality - Full control
  ALL_PRIVILEGES.QA_INSPECT,
  ALL_PRIVILEGES.QA_APPROVE,
  ALL_PRIVILEGES.QA_DEFECT_MANAGE,
];

/**
 * HO_PROCUREMENT - HO Procurement privileges
 * Head Office procurement officers manage HO channel purchases
 */
const HO_PROCUREMENT_PRIVILEGES = [
  // Job Cards - View only
  ALL_PRIVILEGES.JC_VIEW,

  // Material Requests - View only
  ALL_PRIVILEGES.MR_VIEW,

  // Inventory - View only
  ALL_PRIVILEGES.INV_VIEW,

  // Procurement - Full control
  ALL_PRIVILEGES.PR_CREATE,
  ALL_PRIVILEGES.PR_VIEW,
  ALL_PRIVILEGES.PR_APPROVE,
  ALL_PRIVILEGES.RFQ_CREATE,
  ALL_PRIVILEGES.RFQ_MANAGE,
  ALL_PRIVILEGES.PO_CREATE,
  ALL_PRIVILEGES.PO_APPROVE,
  ALL_PRIVILEGES.PO_DISPATCH,
  ALL_PRIVILEGES.GRN_CREATE,
  ALL_PRIVILEGES.GRN_VERIFY,
  ALL_PRIVILEGES.INVOICE_MATCH,
  ALL_PRIVILEGES.PAYMENT_APPROVE,

  // Purchase Authority - HO access
  ALL_PRIVILEGES.LP_APPROVE_L1,
  ALL_PRIVILEGES.LP_APPROVE_L2,
  ALL_PRIVILEGES.LP_APPROVE_L3,
  ALL_PRIVILEGES.HO_PROCUREMENT_ACCESS,

  // Reports - Full access
  ALL_PRIVILEGES.REPORT_VIEW,
  ALL_PRIVILEGES.REPORT_EXPORT,
  ALL_PRIVILEGES.KPI_DASHBOARD,
];

/**
 * HO_FINANCE - HO Finance privileges
 * Head Office finance team handles payments and financial oversight
 */
const HO_FINANCE_PRIVILEGES = [
  // Inventory - View only
  ALL_PRIVILEGES.INV_VIEW,

  // Procurement - Payment and verification
  ALL_PRIVILEGES.PR_VIEW,
  ALL_PRIVILEGES.PO_APPROVE,
  ALL_PRIVILEGES.GRN_VERIFY,
  ALL_PRIVILEGES.INVOICE_MATCH,
  ALL_PRIVILEGES.PAYMENT_APPROVE,

  // Purchase Authority - HO access
  ALL_PRIVILEGES.HO_PROCUREMENT_ACCESS,

  // Reports - Full access
  ALL_PRIVILEGES.REPORT_VIEW,
  ALL_PRIVILEGES.REPORT_EXPORT,
  ALL_PRIVILEGES.KPI_DASHBOARD,

  // Admin - Audit access
  ALL_PRIVILEGES.AUDIT_VIEW,
  ALL_PRIVILEGES.AUDIT_EXPORT,
];

/**
 * HO_MANAGER - HO Manager privileges
 * Head Office managers have procurement and user management
 */
const HO_MANAGER_PRIVILEGES = [
  // Inventory - View only
  ALL_PRIVILEGES.INV_VIEW,

  // Procurement - Approval authority
  ALL_PRIVILEGES.PR_VIEW,
  ALL_PRIVILEGES.PR_APPROVE,
  ALL_PRIVILEGES.PO_APPROVE,
  ALL_PRIVILEGES.PAYMENT_APPROVE,

  // Purchase Authority - Override
  ALL_PRIVILEGES.LP_APPROVE_L3,
  ALL_PRIVILEGES.HO_PROCUREMENT_ACCESS,
  ALL_PRIVILEGES.EMERGENCY_RATIFICATION,

  // Reports - Full access
  ALL_PRIVILEGES.REPORT_VIEW,
  ALL_PRIVILEGES.REPORT_EXPORT,
  ALL_PRIVILEGES.KPI_DASHBOARD,

  // Admin - User and audit management
  ALL_PRIVILEGES.USER_MANAGE,
  ALL_PRIVILEGES.AUDIT_VIEW,
  ALL_PRIVILEGES.AUDIT_EXPORT,
];

/**
 * CONTROL_MANAGER - Control Manager privileges
 * Control managers have system override and full audit access
 */
const CONTROL_MANAGER_PRIVILEGES = [
  // Reports - Full access
  ALL_PRIVILEGES.REPORT_VIEW,
  ALL_PRIVILEGES.REPORT_EXPORT,
  ALL_PRIVILEGES.KPI_DASHBOARD,

  // Purchase Authority - System override (Control Manager only)
  ALL_PRIVILEGES.SYS_LPA_OVERRIDE,
  ALL_PRIVILEGES.EMERGENCY_RATIFICATION,

  // Admin - Full administrative access
  ALL_PRIVILEGES.USER_MANAGE,
  ALL_PRIVILEGES.ROLE_MANAGE,
  ALL_PRIVILEGES.PRIVILEGE_ASSIGN,
  ALL_PRIVILEGES.AUDIT_VIEW,
  ALL_PRIVILEGES.AUDIT_EXPORT,
  ALL_PRIVILEGES.SYSTEM_CONFIG,
];

/**
 * ADMIN - All privileges
 * System administrators have full access to all features
 */
const ADMIN_PRIVILEGES = getAllPrivilegeCodes();

// Role-privilege mapping
const ROLE_PRIVILEGE_MAP: Record<string, string[]> = {
  TECHNICIAN: TECHNICIAN_PRIVILEGES,
  SUPERVISOR: SUPERVISOR_PRIVILEGES,
  STOREKEEPER: STOREKEEPER_PRIVILEGES,
  PROCUREMENT_OFFICER: PROCUREMENT_OFFICER_PRIVILEGES,
  WORKSHOP_MANAGER: WORKSHOP_MANAGER_PRIVILEGES,
  HO_PROCUREMENT: HO_PROCUREMENT_PRIVILEGES,
  HO_FINANCE: HO_FINANCE_PRIVILEGES,
  HO_MANAGER: HO_MANAGER_PRIVILEGES,
  CONTROL_MANAGER: CONTROL_MANAGER_PRIVILEGES,
  ADMIN: ADMIN_PRIVILEGES,
};

// ============================================
// SEED FUNCTIONS
// ============================================

async function seedRoles() {
  console.log('👥 Seeding roles...\n');

  let createdCount = 0;
  let updatedCount = 0;

  for (const role of ROLE_DEFINITIONS) {
    const existing = await db.role.findUnique({
      where: { code: role.code },
    });

    if (existing) {
      await db.role.update({
        where: { code: role.code },
        data: {
          name: role.name,
          description: role.description,
          level: role.level,
          isActive: true,
        },
      });
      updatedCount++;
    } else {
      await db.role.create({
        data: {
          code: role.code,
          name: role.name,
          description: role.description,
          level: role.level,
          isActive: true,
        },
      });
      createdCount++;
    }
  }

  console.log(`   ✓ Created ${createdCount} new roles`);
  console.log(`   ✓ Updated ${updatedCount} existing roles`);
  console.log(`   ✓ Total roles: ${ROLE_DEFINITIONS.length}\n`);
}

async function assignRolePrivileges() {
  console.log('📋 Assigning privileges to roles...\n');

  const roles = await db.role.findMany();
  const privileges = await db.privilegeDefinition.findMany();

  const privilegeMap = new Map(privileges.map(p => [p.code, p.id]));

  let totalAssigned = 0;
  let totalSkipped = 0;

  for (const role of roles) {
    const privilegeCodes = ROLE_PRIVILEGE_MAP[role.code] || [];

    console.log(`   Processing ${role.name} (${role.code}): ${privilegeCodes.length} privileges`);

    for (const code of privilegeCodes) {
      const privilegeId = privilegeMap.get(code);

      if (!privilegeId) {
        console.log(`      ⚠️  Privilege not found: ${code}`);
        totalSkipped++;
        continue;
      }

      await db.rolePrivilegeSet.upsert({
        where: {
          roleId_privilegeId: {
            roleId: role.id,
            privilegeId: privilegeId,
          },
        },
        update: {
          isGranted: true,
        },
        create: {
          roleId: role.id,
          privilegeId: privilegeId,
          isGranted: true,
        },
      });
      totalAssigned++;
    }
  }

  console.log(`\n   ✓ Total privilege assignments: ${totalAssigned}`);
  if (totalSkipped > 0) {
    console.log(`   ⚠️  Skipped (not found): ${totalSkipped}`);
  }
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('🌱 Starting role seed process...\n');

  try {
    await seedRoles();
    await assignRolePrivileges();
    console.log('\n✨ Role seed completed successfully!');

    // Print summary
    console.log('\n📊 Role Summary:');
    for (const role of ROLE_DEFINITIONS) {
      const privileges = ROLE_PRIVILEGE_MAP[role.code] || [];
      console.log(`   ${role.name} (Level ${role.level}): ${privileges.length} privileges`);
    }
  } catch (error) {
    console.error('❌ Role seed failed:', error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
