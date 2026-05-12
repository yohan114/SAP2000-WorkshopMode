/**
 * Report Templates for WCP PDF Generation
 * Defines templates for Job Card, Cost Report, Material Usage, and PM Compliance reports
 */

import { ReportTemplate } from '../pdf-service';

// ============================================
// Job Card Report Template
// ============================================

export const jobCardTemplate: ReportTemplate = {
  id: 'job-card',
  name: 'Job Card Report',
  reportType: 'JOB_CARD',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '16, 185, 129', // Emerald
    fontSize: 10,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'text',
      title: 'Job Card Details',
    },
    {
      type: 'text',
      title: 'Fault Description',
    },
    {
      type: 'text',
      title: 'Work Performed',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'Material Costs',
    },
    {
      type: 'table',
      title: 'Labour Costs',
    },
    {
      type: 'table',
      title: 'External Costs',
    },
    {
      type: 'summary',
      title: 'Cost Summary',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// Cost Report Template
// ============================================

export const costReportTemplate: ReportTemplate = {
  id: 'cost-report',
  name: 'Job Card Cost Report',
  reportType: 'COST_REPORT',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '16, 185, 129', // Emerald
    fontSize: 9,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'summary',
      title: 'Cost Summary',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'Job Card Breakdown',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// Material Usage Template
// ============================================

export const materialUsageTemplate: ReportTemplate = {
  id: 'material-usage',
  name: 'Material Usage Report',
  reportType: 'MATERIAL_USAGE',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '59, 130, 246', // Blue
    fontSize: 9,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'summary',
      title: 'Summary',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'Material Issues',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// PM Compliance Template
// ============================================

export const pmComplianceTemplate: ReportTemplate = {
  id: 'pm-compliance',
  name: 'PM Compliance Report',
  reportType: 'PM_COMPLIANCE',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '16, 185, 129', // Emerald
    fontSize: 9,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'summary',
      title: 'PM Compliance Summary',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'PM Schedules',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// External Costs Template
// ============================================

export const externalCostsTemplate: ReportTemplate = {
  id: 'external-costs',
  name: 'External Costs Report',
  reportType: 'EXTERNAL_COSTS',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '245, 158, 11', // Amber
    fontSize: 9,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'summary',
      title: 'Summary',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'External Repairs',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// Fleet Availability Template
// ============================================

export const fleetAvailabilityTemplate: ReportTemplate = {
  id: 'fleet-availability',
  name: 'Fleet Availability Report',
  reportType: 'FLEET_AVAILABILITY',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '59, 130, 246', // Blue
    fontSize: 9,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'summary',
      title: 'Fleet Overview',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'Asset Details',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// Technician Utilisation Template
// ============================================

export const technicianUtilisationTemplate: ReportTemplate = {
  id: 'technician-utilisation',
  name: 'Technician Utilisation Report',
  reportType: 'TECHNICIAN_UTILISATION',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '139, 92, 246', // Purple
    fontSize: 9,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'summary',
      title: 'Utilisation Summary',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'Technician Details',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// Fuel Consumption Template
// ============================================

export const fuelConsumptionTemplate: ReportTemplate = {
  id: 'fuel-consumption',
  name: 'Fuel Consumption Report',
  reportType: 'FUEL_CONSUMPTION',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '245, 158, 11', // Amber
    fontSize: 9,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'summary',
      title: 'Fuel Summary',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'Fuel Issues',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// Stock Valuation Template
// ============================================

export const stockValuationTemplate: ReportTemplate = {
  id: 'stock-valuation',
  name: 'Stock Valuation Report',
  reportType: 'STOCK_VALUATION',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '59, 130, 246', // Blue
    fontSize: 9,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'summary',
      title: 'Stock Summary',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'Stock Items',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// Procurement Spend Template
// ============================================

export const procurementSpendTemplate: ReportTemplate = {
  id: 'procurement-spend',
  name: 'Procurement Spend Analysis',
  reportType: 'PROCUREMENT_SPEND',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '16, 185, 129', // Emerald
    fontSize: 9,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'summary',
      title: 'Procurement Summary',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'Purchase Orders',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// Monthly Closed Jobs Template
// ============================================

export const monthlyClosedJobsTemplate: ReportTemplate = {
  id: 'monthly-closed-jobs',
  name: 'Monthly Closed Job Cards',
  reportType: 'MONTHLY_CLOSED_JOBS',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '16, 185, 129', // Emerald
    fontSize: 9,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'summary',
      title: 'Monthly Summary',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'Closed Job Cards',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// Total Outside Cost Template
// ============================================

export const totalOutsideCostTemplate: ReportTemplate = {
  id: 'total-outside-cost',
  name: 'Total Outside Cost Report',
  reportType: 'TOTAL_OUTSIDE_COST',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '239, 68, 68', // Red
    fontSize: 9,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'summary',
      title: 'Cost Summary',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'Outside Costs by Subcontractor',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// Monthly Report Template
// ============================================

export const monthlyReportTemplate: ReportTemplate = {
  id: 'monthly-report',
  name: 'Monthly Report',
  reportType: 'MONTHLY_REPORT',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '71, 85, 105', // Slate
    fontSize: 9,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'summary',
      title: 'Monthly KPIs',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'Monthly Metrics',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// Monthly Local Purchasing Template
// ============================================

export const monthlyLocalPurchasingTemplate: ReportTemplate = {
  id: 'monthly-local-purchasing',
  name: 'Monthly Local Purchasing Report',
  reportType: 'MONTHLY_LOCAL_PURCHASING',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '22, 163, 74', // Green
    fontSize: 9,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'summary',
      title: 'Local Purchasing Summary',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'Purchase Orders',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// Monthly Head Office Purchasing Template
// ============================================

export const monthlyHoPurchasingTemplate: ReportTemplate = {
  id: 'monthly-ho-purchasing',
  name: 'Monthly Head Office Purchasing Report',
  reportType: 'MONTHLY_HO_PURCHASING',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '124, 58, 237', // Violet
    fontSize: 9,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'summary',
      title: 'Head Office Purchasing Summary',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'Purchase Orders',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// Price Variation Template
// ============================================

export const priceVariationTemplate: ReportTemplate = {
  id: 'price-variation',
  name: 'Same Item Price Variation Report',
  reportType: 'PRICE_VARIATION',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '202, 138, 4', // Yellow
    fontSize: 9,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'summary',
      title: 'Variation Summary',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'Price Variations',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// Wrong Item Return Delay Template
// ============================================

export const wrongItemReturnDelayTemplate: ReportTemplate = {
  id: 'wrong-item-return-delay',
  name: 'Wrong Item Return Delay Time Report',
  reportType: 'WRONG_ITEM_RETURN_DELAY',
  header: {
    logo: '/images/logo.png',
    company: 'WCP - Workshop Control Platform',
    address: 'Professional Maintenance Management',
  },
  styles: {
    primaryColor: '107, 114, 128', // Gray
    fontSize: 9,
    fontFamily: 'helvetica',
  },
  sections: [
    {
      type: 'summary',
      title: 'Delay Summary',
    },
    {
      type: 'spacer',
      height: 10,
    },
    {
      type: 'table',
      title: 'Wrong Item Returns',
    },
  ],
  footer: {
    pageNumbers: true,
    generatedAt: true,
  },
};

// ============================================
// Template Registry
// ============================================

export const reportTemplates: Record<string, ReportTemplate> = {
  'job-card': jobCardTemplate,
  'job-card-cost': costReportTemplate,
  'cost-report': costReportTemplate,
  'material-usage': materialUsageTemplate,
  'pm-compliance': pmComplianceTemplate,
  'external-costs': externalCostsTemplate,
  'fleet-availability': fleetAvailabilityTemplate,
  'technician-utilisation': technicianUtilisationTemplate,
  'fuel-consumption': fuelConsumptionTemplate,
  'stock-valuation': stockValuationTemplate,
  'procurement-spend': procurementSpendTemplate,
  'monthly-closed-jobs': monthlyClosedJobsTemplate,
  'total-outside-cost': totalOutsideCostTemplate,
  'monthly-report': monthlyReportTemplate,
  'monthly-local-purchasing': monthlyLocalPurchasingTemplate,
  'monthly-ho-purchasing': monthlyHoPurchasingTemplate,
  'price-variation': priceVariationTemplate,
  'wrong-item-return-delay': wrongItemReturnDelayTemplate,
};

/**
 * Get template by report type
 */
export function getTemplate(reportType: string): ReportTemplate | undefined {
  return reportTemplates[reportType];
}

/**
 * Get all available templates
 */
export function getAllTemplates(): ReportTemplate[] {
  return Object.values(reportTemplates);
}

/**
 * Get template names for dropdowns
 */
export function getTemplateNames(): { id: string; name: string; reportType: string }[] {
  return Object.entries(reportTemplates).map(([id, template]) => ({
    id,
    name: template.name,
    reportType: template.reportType,
  }));
}

// Export all templates
export default reportTemplates;
