// ============================================
// EMAIL TEMPLATES INDEX
// Workshop Control Platform
// ============================================

import { 
  getEmailTemplates as getCoreTemplates,
  EmailTemplate,
  NotificationEvent
} from '../email-service';

// ============================================
// TEMPLATE CATEGORIES
// ============================================

export type TemplateCategory = 'sla' | 'approval' | 'operational' | 'jobcard' | 'system';

export interface TemplateGroup {
  category: TemplateCategory;
  name: string;
  description: string;
  templates: EmailTemplate[];
  events: NotificationEvent[];
}

// ============================================
// EVENT DEFINITIONS
// ============================================

export const NOTIFICATION_EVENTS: Record<TemplateCategory, NotificationEvent[]> = {
  sla: [
    'JC_SLA_WARNING',
    'JC_SLA_BREACH',
    'MR_SLA_WARNING',
    'MR_SLA_BREACH',
  ],
  approval: [
    'JC_PENDING_APPROVAL',
    'MR_PENDING_APPROVAL',
    'PR_PENDING_APPROVAL',
    'APPROVAL_REMINDER',
    'APPROVAL_ESCALATION',
  ],
  operational: [
    'LOW_STOCK_ALERT',
    'PM_DUE_REMINDER',
    'BUDGET_THRESHOLD_80',
    'BUDGET_THRESHOLD_90',
    'BUDGET_THRESHOLD_100',
    'SCHEDULED_REPORT',
  ],
  jobcard: [
    'JOB_CARD_CREATED',
    'JOB_CARD_COMPLETED',
    'EMERGENCY_JOB',
  ],
  system: [],
};

export const EVENT_LABELS: Record<NotificationEvent, string> = {
  JC_SLA_WARNING: 'Job Card SLA Warning (80%)',
  JC_SLA_BREACH: 'Job Card SLA Breach',
  MR_SLA_WARNING: 'Material Request SLA Warning (80%)',
  MR_SLA_BREACH: 'Material Request SLA Breach',
  JC_PENDING_APPROVAL: 'Job Card Pending Approval',
  MR_PENDING_APPROVAL: 'Material Request Pending Approval',
  PR_PENDING_APPROVAL: 'Purchase Request Pending Approval',
  APPROVAL_REMINDER: 'Daily Approval Reminder',
  APPROVAL_ESCALATION: 'Approval Escalation',
  LOW_STOCK_ALERT: 'Low Stock Alert',
  PM_DUE_REMINDER: 'PM Due Reminder',
  BUDGET_THRESHOLD_80: 'Budget at 80%',
  BUDGET_THRESHOLD_90: 'Budget at 90%',
  BUDGET_THRESHOLD_100: 'Budget at 100%',
  SCHEDULED_REPORT: 'Scheduled Report',
  JOB_CARD_CREATED: 'Job Card Created',
  JOB_CARD_COMPLETED: 'Job Card Completed',
  EMERGENCY_JOB: 'Emergency Job Card',
};

export const EVENT_DESCRIPTIONS: Record<NotificationEvent, string> = {
  JC_SLA_WARNING: 'Triggered when a job card reaches 80% of its SLA time without completion.',
  JC_SLA_BREACH: 'Triggered when a job card exceeds its SLA deadline.',
  MR_SLA_WARNING: 'Triggered when a material request reaches 80% of its SLA time without processing.',
  MR_SLA_BREACH: 'Triggered when a material request exceeds its SLA deadline.',
  JC_PENDING_APPROVAL: 'Triggered when a job card requires approval.',
  MR_PENDING_APPROVAL: 'Triggered when a material request requires approval.',
  PR_PENDING_APPROVAL: 'Triggered when a purchase request requires approval.',
  APPROVAL_REMINDER: 'Daily digest of all pending approvals.',
  APPROVAL_ESCALATION: 'Triggered when an approval is overdue and escalates.',
  LOW_STOCK_ALERT: 'Triggered when an item falls below its reorder level.',
  PM_DUE_REMINDER: 'Triggered when preventive maintenance is due for an asset.',
  BUDGET_THRESHOLD_80: 'Triggered when budget utilization reaches 80%.',
  BUDGET_THRESHOLD_90: 'Triggered when budget utilization reaches 90%.',
  BUDGET_THRESHOLD_100: 'Triggered when budget is fully utilized.',
  SCHEDULED_REPORT: 'Triggered when a scheduled report is generated.',
  JOB_CARD_CREATED: 'Triggered when a new job card is created.',
  JOB_CARD_COMPLETED: 'Triggered when a job card is completed.',
  EMERGENCY_JOB: 'Triggered when an emergency priority job card is created.',
};

// ============================================
// TEMPLATE HELPERS
// ============================================

/**
 * Get all email templates grouped by category
 */
export function getTemplateGroups(): TemplateGroup[] {
  const templates = getCoreTemplates();
  
  const categories: TemplateCategory[] = ['sla', 'approval', 'operational', 'jobcard'];
  
  return categories.map(category => ({
    category,
    name: getCategoryName(category),
    description: getCategoryDescription(category),
    templates: templates.filter(t => t.category === category),
    events: NOTIFICATION_EVENTS[category],
  }));
}

/**
 * Get category display name
 */
function getCategoryName(category: TemplateCategory): string {
  const names: Record<TemplateCategory, string> = {
    sla: 'SLA Monitoring',
    approval: 'Approvals',
    operational: 'Operational',
    jobcard: 'Job Cards',
    system: 'System',
  };
  return names[category];
}

/**
 * Get category description
 */
function getCategoryDescription(category: TemplateCategory): string {
  const descriptions: Record<TemplateCategory, string> = {
    sla: 'Service Level Agreement monitoring and breach notifications',
    approval: 'Workflow approval requests and escalations',
    operational: 'Inventory, maintenance, and budget alerts',
    jobcard: 'Job card lifecycle notifications',
    system: 'System-level notifications',
  };
  return descriptions[category];
}

/**
 * Get template for a specific event
 */
export function getTemplateForEvent(event: NotificationEvent): EmailTemplate | undefined {
  const templates = getCoreTemplates();
  const eventTemplateMap: Partial<Record<NotificationEvent, string>> = {
    JC_SLA_WARNING: 'sla-warning',
    JC_SLA_BREACH: 'sla-breach',
    MR_SLA_WARNING: 'sla-warning',
    MR_SLA_BREACH: 'sla-breach',
    JC_PENDING_APPROVAL: 'approval-pending',
    MR_PENDING_APPROVAL: 'approval-pending',
    PR_PENDING_APPROVAL: 'approval-pending',
    APPROVAL_REMINDER: 'approval-reminder',
    APPROVAL_ESCALATION: 'approval-escalation',
    LOW_STOCK_ALERT: 'low-stock',
    PM_DUE_REMINDER: 'pm-due',
    BUDGET_THRESHOLD_80: 'budget-threshold',
    BUDGET_THRESHOLD_90: 'budget-threshold',
    BUDGET_THRESHOLD_100: 'budget-threshold',
    SCHEDULED_REPORT: 'scheduled-report',
    JOB_CARD_CREATED: 'approval-pending',
    JOB_CARD_COMPLETED: 'approval-pending',
    EMERGENCY_JOB: 'emergency-job',
  };
  
  const templateId = eventTemplateMap[event];
  return templates.find(t => t.id === templateId);
}

/**
 * Get all notification events
 */
export function getAllNotificationEvents(): { event: NotificationEvent; label: string; description: string; category: TemplateCategory }[] {
  const result: { event: NotificationEvent; label: string; description: string; category: TemplateCategory }[] = [];
  
  for (const [category, events] of Object.entries(NOTIFICATION_EVENTS)) {
    for (const event of events) {
      result.push({
        event,
        label: EVENT_LABELS[event],
        description: EVENT_DESCRIPTIONS[event],
        category: category as TemplateCategory,
      });
    }
  }
  
  return result;
}

// ============================================
// RE-EXPORTS
// ============================================

export { getEmailTemplates, type EmailTemplate } from '../email-service';
