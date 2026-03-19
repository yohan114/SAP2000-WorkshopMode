/**
 * ============================================
 * WORKSHOP CONTROL PLATFORM - PRIVILEGE SEED
 * ============================================
 * Comprehensive privilege definitions for the WCP system.
 * This seed creates all privileges required for role-based access control.
 * 
 * Run with: bun prisma/seed-privileges.ts
 */

import { db } from '@/lib/db';

// ============================================
// PRIVILEGE DEFINITIONS BY CATEGORY
// ============================================

/**
 * JOB_CARD Category - Job Card management privileges
 * Controls access to job card lifecycle operations
 */
const JOB_CARD_PRIVILEGES = [
  {
    code: 'JC_CREATE',
    name: 'Create Job Cards',
    category: 'JOB_CARD',
    description: 'Create new job cards for assets',
  },
  {
    code: 'JC_VIEW',
    name: 'View Job Cards',
    category: 'JOB_CARD',
    description: 'View job card details and history',
  },
  {
    code: 'JC_EDIT',
    name: 'Edit Job Cards',
    category: 'JOB_CARD',
    description: 'Modify job card details and work performed',
  },
  {
    code: 'JC_DELETE',
    name: 'Delete Job Cards',
    category: 'JOB_CARD',
    description: 'Delete/cancel draft job cards',
  },
  {
    code: 'JC_APPROVE',
    name: 'Approve Job Cards',
    category: 'JOB_CARD',
    description: 'Approve job cards for work to begin',
  },
  {
    code: 'JC_REJECT',
    name: 'Reject Job Cards',
    category: 'JOB_CARD',
    description: 'Reject job cards with reasons',
  },
  {
    code: 'JC_REOPEN',
    name: 'Reopen Job Cards',
    category: 'JOB_CARD',
    description: 'Reopen closed or completed job cards',
  },
  {
    code: 'JC_MULTI_OPEN',
    name: 'Allow Multiple Open Job Cards',
    category: 'JOB_CARD',
    description: 'Override restriction on multiple open job cards per asset',
  },
  {
    code: 'JC_CLOSE',
    name: 'Close Job Cards',
    category: 'JOB_CARD',
    description: 'Close and finalize job cards',
  },
  {
    code: 'JC_ASSIGN',
    name: 'Assign Job Cards',
    category: 'JOB_CARD',
    description: 'Assign technicians to job cards',
  },
];

/**
 * MATERIAL_REQUEST Category - Material Request privileges
 * Controls access to material request workflow
 */
const MATERIAL_REQUEST_PRIVILEGES = [
  {
    code: 'MR_CREATE',
    name: 'Create Material Requests',
    category: 'MATERIAL_REQUEST',
    description: 'Create new material requests',
  },
  {
    code: 'MR_VIEW',
    name: 'View Material Requests',
    category: 'MATERIAL_REQUEST',
    description: 'View material request details',
  },
  {
    code: 'MR_EDIT',
    name: 'Edit Material Requests',
    category: 'MATERIAL_REQUEST',
    description: 'Modify material request details',
  },
  {
    code: 'MR_DELETE',
    name: 'Delete Material Requests',
    category: 'MATERIAL_REQUEST',
    description: 'Delete draft material requests',
  },
  {
    code: 'MR_APPROVE',
    name: 'Approve Material Requests',
    category: 'MATERIAL_REQUEST',
    description: 'Approve material requests for fulfillment',
  },
  {
    code: 'MR_REJECT',
    name: 'Reject Material Requests',
    category: 'MATERIAL_REQUEST',
    description: 'Reject material requests with reasons',
  },
  {
    code: 'MR_EMERGENCY',
    name: 'Create Emergency Material Requests',
    category: 'MATERIAL_REQUEST',
    description: 'Create emergency material requests with priority handling',
  },
];

/**
 * MATERIAL_ISSUE Category - Material Issue privileges
 * Controls access to material issue and return operations
 */
const MATERIAL_ISSUE_PRIVILEGES = [
  {
    code: 'MI_CREATE',
    name: 'Create Material Issues',
    category: 'MATERIAL_ISSUE',
    description: 'Create material issues from store',
  },
  {
    code: 'MI_VIEW',
    name: 'View Material Issues',
    category: 'MATERIAL_ISSUE',
    description: 'View material issue details',
  },
  {
    code: 'MI_VERIFY',
    name: 'Verify Material Issues',
    category: 'MATERIAL_ISSUE',
    description: 'Verify material issues (2-person verification process)',
  },
  {
    code: 'MI_EMERGENCY_ISSUE',
    name: 'Emergency Material Issue',
    category: 'MATERIAL_ISSUE',
    description: 'Perform emergency direct issue without MR approval',
  },
  {
    code: 'MI_RETURN_PROCESS',
    name: 'Process Material Returns',
    category: 'MATERIAL_ISSUE',
    description: 'Process material returns to store',
  },
];

/**
 * INVENTORY Category - Inventory management privileges
 * Controls access to inventory operations
 */
const INVENTORY_PRIVILEGES = [
  {
    code: 'INV_VIEW',
    name: 'View Inventory',
    category: 'INVENTORY',
    description: 'View inventory levels and stock details',
  },
  {
    code: 'INV_MANAGE',
    name: 'Manage Inventory',
    category: 'INVENTORY',
    description: 'Manage inventory items and stock',
  },
  {
    code: 'INV_ADJUST',
    name: 'Adjust Inventory',
    category: 'INVENTORY',
    description: 'Make inventory adjustments (positive and negative)',
  },
  {
    code: 'INV_TRANSFER',
    name: 'Transfer Inventory',
    category: 'INVENTORY',
    description: 'Transfer stock between stores',
  },
  {
    code: 'INV_STOCK_TAKE',
    name: 'Conduct Stock Take',
    category: 'INVENTORY',
    description: 'Create and process stock take counts',
  },
];

/**
 * PROCUREMENT Category - Procurement privileges
 * Controls access to procurement workflow
 */
const PROCUREMENT_PRIVILEGES = [
  {
    code: 'PR_CREATE',
    name: 'Create Purchase Requests',
    category: 'PROCUREMENT',
    description: 'Create new purchase requests',
  },
  {
    code: 'PR_VIEW',
    name: 'View Purchase Requests',
    category: 'PROCUREMENT',
    description: 'View purchase request details',
  },
  {
    code: 'PR_APPROVE',
    name: 'Approve Purchase Requests',
    category: 'PROCUREMENT',
    description: 'Approve purchase requests',
  },
  {
    code: 'RFQ_CREATE',
    name: 'Create RFQ',
    category: 'PROCUREMENT',
    description: 'Create Request for Quotation',
  },
  {
    code: 'RFQ_MANAGE',
    name: 'Manage RFQ',
    category: 'PROCUREMENT',
    description: 'Manage RFQ process and supplier responses',
  },
  {
    code: 'PO_CREATE',
    name: 'Create Purchase Orders',
    category: 'PROCUREMENT',
    description: 'Create purchase orders from approved PRs',
  },
  {
    code: 'PO_APPROVE',
    name: 'Approve Purchase Orders',
    category: 'PROCUREMENT',
    description: 'Approve purchase orders for dispatch',
  },
  {
    code: 'PO_DISPATCH',
    name: 'Dispatch Purchase Orders',
    category: 'PROCUREMENT',
    description: 'Dispatch approved purchase orders to suppliers',
  },
  {
    code: 'GRN_CREATE',
    name: 'Create GRN',
    category: 'PROCUREMENT',
    description: 'Create Goods Received Notes',
  },
  {
    code: 'GRN_VERIFY',
    name: 'Verify GRN',
    category: 'PROCUREMENT',
    description: 'Verify GRN (2-person verification)',
  },
  {
    code: 'INVOICE_MATCH',
    name: 'Match Invoices',
    category: 'PROCUREMENT',
    description: 'Match supplier invoices with POs and GRNs',
  },
  {
    code: 'PAYMENT_APPROVE',
    name: 'Approve Payments',
    category: 'PROCUREMENT',
    description: 'Approve supplier payments',
  },
];

/**
 * PURCHASE_AUTHORITY Category - LPA and channel control
 * Controls access to purchase authority operations
 */
const PURCHASE_AUTHORITY_PRIVILEGES = [
  {
    code: 'LP_APPROVE_L1',
    name: 'LPA Approve Level 1',
    category: 'PURCHASE_AUTHORITY',
    description: 'Approve purchases within LPA Level 1 limit',
  },
  {
    code: 'LP_APPROVE_L2',
    name: 'LPA Approve Level 2',
    category: 'PURCHASE_AUTHORITY',
    description: 'Approve purchases within LPA Level 2 limit',
  },
  {
    code: 'LP_APPROVE_L3',
    name: 'LPA Approve Level 3',
    category: 'PURCHASE_AUTHORITY',
    description: 'Approve purchases within LPA Level 3 limit',
  },
  {
    code: 'LP_CHANNEL_OVERRIDE',
    name: 'Override Procurement Channel',
    category: 'PURCHASE_AUTHORITY',
    description: 'Override procurement channel to local when HO is required',
  },
  {
    code: 'HO_PROCUREMENT_ACCESS',
    name: 'HO Procurement Access',
    category: 'PURCHASE_AUTHORITY',
    description: 'Access to HO procurement channel functions',
  },
  {
    code: 'SYS_LPA_OVERRIDE',
    name: 'System LPA Override',
    category: 'PURCHASE_AUTHORITY',
    description: 'Override LPA limits (Control Manager only)',
  },
  {
    code: 'EMERGENCY_PURCHASE',
    name: 'Emergency Purchase',
    category: 'PURCHASE_AUTHORITY',
    description: 'Authorize emergency purchases beyond normal limits',
  },
  {
    code: 'EMERGENCY_RATIFICATION',
    name: 'Emergency Ratification',
    category: 'PURCHASE_AUTHORITY',
    description: 'Ratify emergency purchases after the fact',
  },
];

/**
 * ASSET Category - Asset management privileges
 * Controls access to asset lifecycle operations
 */
const ASSET_PRIVILEGES = [
  {
    code: 'ASSET_CREATE',
    name: 'Create Assets',
    category: 'ASSET',
    description: 'Register new assets in the system',
  },
  {
    code: 'ASSET_VIEW',
    name: 'View Assets',
    category: 'ASSET',
    description: 'View asset details and history',
  },
  {
    code: 'ASSET_EDIT',
    name: 'Edit Assets',
    category: 'ASSET',
    description: 'Modify asset details',
  },
  {
    code: 'ASSET_DELETE',
    name: 'Delete Assets',
    category: 'ASSET',
    description: 'Delete or decommission assets',
  },
  {
    code: 'ASSET_QR_MANAGE',
    name: 'Manage Asset QR Codes',
    category: 'ASSET',
    description: 'Generate and manage asset QR codes',
  },
];

/**
 * FUEL Category - Fuel management privileges
 * Controls access to fuel issue and tracking
 */
const FUEL_PRIVILEGES = [
  {
    code: 'FUEL_ISSUE',
    name: 'Issue Fuel',
    category: 'FUEL',
    description: 'Record fuel issues to assets',
  },
  {
    code: 'FUEL_VIEW',
    name: 'View Fuel Records',
    category: 'FUEL',
    description: 'View fuel issue history and reports',
  },
  {
    code: 'FUEL_OVERRIDE_METER',
    name: 'Override Fuel Meter',
    category: 'FUEL',
    description: 'Override meter readings for fuel issues',
  },
];

/**
 * EXTERNAL_REPAIR Category - External repair privileges
 * Controls access to external repair management
 */
const EXTERNAL_REPAIR_PRIVILEGES = [
  {
    code: 'EXT_REPAIR_CREATE',
    name: 'Create External Repairs',
    category: 'EXTERNAL_REPAIR',
    description: 'Create external repair job requests',
  },
  {
    code: 'EXT_REPAIR_APPROVE',
    name: 'Approve External Repairs',
    category: 'EXTERNAL_REPAIR',
    description: 'Approve external repair jobs and costs',
  },
  {
    code: 'EXT_REPAIR_MANAGE',
    name: 'Manage External Repairs',
    category: 'EXTERNAL_REPAIR',
    description: 'Full management of external repair process',
  },
];

/**
 * PM Category - Preventive Maintenance privileges
 * Controls access to PM scheduling and execution
 */
const PM_PRIVILEGES = [
  {
    code: 'PM_CREATE',
    name: 'Create PM Schedules',
    category: 'PM',
    description: 'Create preventive maintenance schedules',
  },
  {
    code: 'PM_VIEW',
    name: 'View PM Schedules',
    category: 'PM',
    description: 'View preventive maintenance schedules',
  },
  {
    code: 'PM_MANAGE',
    name: 'Manage PM Execution',
    category: 'PM',
    description: 'Execute and close preventive maintenance jobs',
  },
  {
    code: 'PM_SCHEDULE_EDIT',
    name: 'Edit PM Schedules',
    category: 'PM',
    description: 'Modify PM schedule configurations',
  },
];

/**
 * LABOUR Category - Labour management privileges
 * Controls access to labour and training management
 */
const LABOUR_PRIVILEGES = [
  {
    code: 'LABOUR_ASSIGN',
    name: 'Assign Labour',
    category: 'LABOUR',
    description: 'Assign technicians to jobs',
  },
  {
    code: 'LABOUR_VIEW',
    name: 'View Labour Records',
    category: 'LABOUR',
    description: 'View labour allocation and time logs',
  },
  {
    code: 'TRAINING_MANAGE',
    name: 'Manage Training',
    category: 'LABOUR',
    description: 'Manage training records and certifications',
  },
];

/**
 * REPORT Category - Reporting privileges
 * Controls access to reports and dashboards
 */
const REPORT_PRIVILEGES = [
  {
    code: 'REPORT_VIEW',
    name: 'View Reports',
    category: 'REPORT',
    description: 'View standard reports',
  },
  {
    code: 'REPORT_EXPORT',
    name: 'Export Reports',
    category: 'REPORT',
    description: 'Export reports to PDF, Excel, etc.',
  },
  {
    code: 'KPI_DASHBOARD',
    name: 'Access KPI Dashboard',
    category: 'REPORT',
    description: 'Access KPI and analytics dashboard',
  },
];

/**
 * ADMIN Category - System administration privileges
 * Controls access to administrative functions
 */
const ADMIN_PRIVILEGES = [
  {
    code: 'USER_MANAGE',
    name: 'Manage Users',
    category: 'ADMIN',
    description: 'Create, edit, and deactivate users',
  },
  {
    code: 'ROLE_MANAGE',
    name: 'Manage Roles',
    category: 'ADMIN',
    description: 'Create and configure roles',
  },
  {
    code: 'PRIVILEGE_ASSIGN',
    name: 'Assign Privileges',
    category: 'ADMIN',
    description: 'Assign privileges to roles and users',
  },
  {
    code: 'AUDIT_VIEW',
    name: 'View Audit Logs',
    category: 'ADMIN',
    description: 'View system audit trail',
  },
  {
    code: 'AUDIT_EXPORT',
    name: 'Export Audit Logs',
    category: 'ADMIN',
    description: 'Export audit logs for compliance',
  },
  {
    code: 'SYSTEM_CONFIG',
    name: 'System Configuration',
    category: 'ADMIN',
    description: 'Configure system settings',
  },
];

/**
 * QUALITY Category - Quality management privileges
 * Controls access to quality inspection and defects
 */
const QUALITY_PRIVILEGES = [
  {
    code: 'QA_INSPECT',
    name: 'Perform QA Inspection',
    category: 'QUALITY',
    description: 'Perform quality inspections',
  },
  {
    code: 'QA_APPROVE',
    name: 'Approve QA Results',
    category: 'QUALITY',
    description: 'Approve quality inspection results',
  },
  {
    code: 'QA_DEFECT_MANAGE',
    name: 'Manage Defects',
    category: 'QUALITY',
    description: 'Manage quality defects and corrective actions',
  },
];

// Combine all privileges
const ALL_PRIVILEGES = [
  ...JOB_CARD_PRIVILEGES,
  ...MATERIAL_REQUEST_PRIVILEGES,
  ...MATERIAL_ISSUE_PRIVILEGES,
  ...INVENTORY_PRIVILEGES,
  ...PROCUREMENT_PRIVILEGES,
  ...PURCHASE_AUTHORITY_PRIVILEGES,
  ...ASSET_PRIVILEGES,
  ...FUEL_PRIVILEGES,
  ...EXTERNAL_REPAIR_PRIVILEGES,
  ...PM_PRIVILEGES,
  ...LABOUR_PRIVILEGES,
  ...REPORT_PRIVILEGES,
  ...ADMIN_PRIVILEGES,
  ...QUALITY_PRIVILEGES,
];

// ============================================
// SEED FUNCTION
// ============================================

async function seedPrivileges() {
  console.log('🔐 Seeding comprehensive privileges...\n');

  let createdCount = 0;
  let updatedCount = 0;

  // Sort privileges by category and code for consistent ordering
  const sortedPrivileges = [...ALL_PRIVILEGES].sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.code.localeCompare(b.code);
  });

  for (const priv of sortedPrivileges) {
    const existing = await db.privilegeDefinition.findUnique({
      where: { code: priv.code },
    });

    if (existing) {
      await db.privilegeDefinition.update({
        where: { code: priv.code },
        data: {
          name: priv.name,
          category: priv.category,
          description: priv.description,
          isActive: true,
        },
      });
      updatedCount++;
    } else {
      await db.privilegeDefinition.create({
        data: {
          code: priv.code,
          name: priv.name,
          category: priv.category,
          description: priv.description,
          isActive: true,
        },
      });
      createdCount++;
    }
  }

  console.log(`   ✓ Created ${createdCount} new privileges`);
  console.log(`   ✓ Updated ${updatedCount} existing privileges`);
  console.log(`   ✓ Total privileges: ${ALL_PRIVILEGES.length}\n`);

  // Print summary by category
  console.log('📊 Privileges by category:');
  const categories = [...new Set(ALL_PRIVILEGES.map(p => p.category))].sort();
  for (const category of categories) {
    const count = ALL_PRIVILEGES.filter(p => p.category === category).length;
    console.log(`   ${category}: ${count} privileges`);
  }
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('🌱 Starting privilege seed process...\n');

  try {
    await seedPrivileges();
    console.log('\n✨ Privilege seed completed successfully!');
  } catch (error) {
    console.error('❌ Privilege seed failed:', error);
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
