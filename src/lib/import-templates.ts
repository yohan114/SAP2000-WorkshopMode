/**
 * Import Templates for WCP Data Import Wizard
 * Defines field mappings, validation rules, and example data for each entity type
 */

// Validation Types
export type ValidationType = 'required' | 'email' | 'number' | 'date' | 'unique' | 'custom' | 'min' | 'max' | 'enum';

// Field Definition
export interface ImportField {
  key: string;                    // Database field name
  label: string;                  // Display name for UI
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  required: boolean;
  unique?: boolean;               // Field must be unique in database
  defaultValue?: unknown;
  validations: ValidationRule[];
  description?: string;
  enumValues?: string[];          // For enum types
  transform?: (value: unknown) => unknown;  // Transform function for data
}

// Validation Rule
export interface ValidationRule {
  type: ValidationType;
  message: string;
  params?: Record<string, unknown>;
  validator?: (value: unknown, rowData: Record<string, unknown>) => boolean;
}

// Import Template
export interface ImportTemplate {
  entityType: string;
  entityName: string;
  description: string;
  fields: ImportField[];
  exampleRows: Record<string, unknown>[];
  primaryKey: string;             // Field used for duplicate detection
  createOnlyFields?: string[];    // Fields that cannot be updated
}

// ============================================
// ITEMS TEMPLATE
// ============================================
export const itemsTemplate: ImportTemplate = {
  entityType: 'items',
  entityName: 'Items',
  description: 'Import inventory items including spare parts, consumables, and tools',
  primaryKey: 'itemCode',
  fields: [
    {
      key: 'itemCode',
      label: 'Item Code',
      type: 'string',
      required: true,
      unique: true,
      validations: [
        { type: 'required', message: 'Item code is required' },
        { type: 'unique', message: 'Item code must be unique' },
        { type: 'custom', message: 'Item code must be alphanumeric with optional dashes/underscores', validator: (v) => /^[A-Za-z0-9_-]+$/.test(String(v)) }
      ],
      description: 'Unique identifier for the item (e.g., SP-001)'
    },
    {
      key: 'name',
      label: 'Item Name',
      type: 'string',
      required: true,
      validations: [
        { type: 'required', message: 'Item name is required' }
      ],
      description: 'Descriptive name of the item'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'string',
      required: false,
      validations: [],
      description: 'Detailed description of the item'
    },
    {
      key: 'unitOfMeasure',
      label: 'Unit of Measure',
      type: 'string',
      required: true,
      defaultValue: 'EACH',
      validations: [
        { type: 'required', message: 'Unit of measure is required' }
      ],
      description: 'Unit of measurement (e.g., EACH, LITRE, METER, KG)'
    },
    {
      key: 'itemClass',
      label: 'Item Class',
      type: 'enum',
      required: true,
      defaultValue: 'CONSUMABLE',
      enumValues: ['CONSUMABLE', 'SPARE_PART', 'TOOL', 'SERVICE', 'EQUIPMENT'],
      validations: [
        { type: 'required', message: 'Item class is required' },
        { type: 'enum', message: 'Invalid item class', params: { values: ['CONSUMABLE', 'SPARE_PART', 'TOOL', 'SERVICE', 'EQUIPMENT'] } }
      ],
      description: 'Classification of the item'
    },
    {
      key: 'minimumStock',
      label: 'Minimum Stock',
      type: 'number',
      required: false,
      defaultValue: 0,
      validations: [
        { type: 'number', message: 'Must be a valid number' },
        { type: 'min', message: 'Minimum stock cannot be negative', params: { min: 0 } }
      ],
      transform: (v) => v ? parseFloat(String(v)) : 0,
      description: 'Minimum stock level before reorder alert'
    },
    {
      key: 'maximumStock',
      label: 'Maximum Stock',
      type: 'number',
      required: false,
      validations: [
        { type: 'number', message: 'Must be a valid number' },
        { type: 'min', message: 'Maximum stock cannot be negative', params: { min: 0 } }
      ],
      transform: (v) => v ? parseFloat(String(v)) : null,
      description: 'Maximum stock level allowed'
    },
    {
      key: 'reorderLevel',
      label: 'Reorder Level',
      type: 'number',
      required: false,
      defaultValue: 0,
      validations: [
        { type: 'number', message: 'Must be a valid number' },
        { type: 'min', message: 'Reorder level cannot be negative', params: { min: 0 } }
      ],
      transform: (v) => v ? parseFloat(String(v)) : 0,
      description: 'Stock level at which to generate reorder suggestion'
    },
    {
      key: 'reorderQuantity',
      label: 'Reorder Quantity',
      type: 'number',
      required: false,
      validations: [
        { type: 'number', message: 'Must be a valid number' },
        { type: 'min', message: 'Reorder quantity must be positive', params: { min: 1 } }
      ],
      transform: (v) => v ? parseFloat(String(v)) : null,
      description: 'Suggested quantity to reorder'
    },
    {
      key: 'isTool',
      label: 'Is Tool',
      type: 'boolean',
      required: false,
      defaultValue: false,
      validations: [],
      transform: (v) => {
        if (typeof v === 'boolean') return v;
        const str = String(v).toLowerCase();
        return str === 'yes' || str === 'true' || str === '1' || str === 'y';
      },
      description: 'Whether this item is a tool (Yes/No)'
    },
    {
      key: 'isCritical',
      label: 'Is Critical',
      type: 'boolean',
      required: false,
      defaultValue: false,
      validations: [],
      transform: (v) => {
        if (typeof v === 'boolean') return v;
        const str = String(v).toLowerCase();
        return str === 'yes' || str === 'true' || str === '1' || str === 'y';
      },
      description: 'Whether this is a critical item (Yes/No)'
    }
  ],
  exampleRows: [
    {
      itemCode: 'SP-001',
      name: 'Oil Filter - Heavy Duty',
      description: 'Heavy duty oil filter for diesel engines',
      unitOfMeasure: 'EACH',
      itemClass: 'SPARE_PART',
      minimumStock: 10,
      maximumStock: 100,
      reorderLevel: 15,
      reorderQuantity: 50,
      isTool: 'No',
      isCritical: 'Yes'
    },
    {
      itemCode: 'CONS-002',
      name: 'Brake Fluid DOT4',
      description: 'High performance brake fluid',
      unitOfMeasure: 'LITRE',
      itemClass: 'CONSUMABLE',
      minimumStock: 20,
      maximumStock: 200,
      reorderLevel: 30,
      reorderQuantity: 100,
      isTool: 'No',
      isCritical: 'No'
    }
  ]
};

// ============================================
// ASSETS TEMPLATE
// ============================================
export const assetsTemplate: ImportTemplate = {
  entityType: 'assets',
  entityName: 'Assets',
  description: 'Import equipment and vehicle assets',
  primaryKey: 'assetNumber',
  fields: [
    {
      key: 'assetNumber',
      label: 'Asset Number',
      type: 'string',
      required: true,
      unique: true,
      validations: [
        { type: 'required', message: 'Asset number is required' },
        { type: 'unique', message: 'Asset number must be unique' }
      ],
      description: 'Unique asset identifier (e.g., VEH-001)'
    },
    {
      key: 'name',
      label: 'Asset Name',
      type: 'string',
      required: true,
      validations: [
        { type: 'required', message: 'Asset name is required' }
      ],
      description: 'Descriptive name of the asset'
    },
    {
      key: 'categoryCode',
      label: 'Category Code',
      type: 'string',
      required: true,
      validations: [
        { type: 'required', message: 'Category code is required' }
      ],
      description: 'Asset category code (must exist in system)'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'string',
      required: false,
      validations: [],
      description: 'Detailed description of the asset'
    },
    {
      key: 'make',
      label: 'Make/Manufacturer',
      type: 'string',
      required: false,
      validations: [],
      description: 'Manufacturer or brand name'
    },
    {
      key: 'model',
      label: 'Model',
      type: 'string',
      required: false,
      validations: [],
      description: 'Model number or name'
    },
    {
      key: 'serialNumber',
      label: 'Serial Number',
      type: 'string',
      required: false,
      validations: [],
      description: 'Serial or chassis number'
    },
    {
      key: 'yearOfManufacture',
      label: 'Year of Manufacture',
      type: 'number',
      required: false,
      validations: [
        { type: 'number', message: 'Must be a valid year' },
        { type: 'min', message: 'Year must be 1900 or later', params: { min: 1900 } },
        { type: 'max', message: 'Year cannot be in the future', params: { max: new Date().getFullYear() + 1 } }
      ],
      transform: (v) => v ? parseInt(String(v), 10) : null,
      description: 'Year the asset was manufactured'
    },
    {
      key: 'acquisitionDate',
      label: 'Acquisition Date',
      type: 'date',
      required: false,
      validations: [
        { type: 'date', message: 'Must be a valid date (YYYY-MM-DD)' }
      ],
      transform: (v) => v ? new Date(String(v)) : null,
      description: 'Date the asset was acquired (YYYY-MM-DD)'
    },
    {
      key: 'acquisitionCost',
      label: 'Acquisition Cost',
      type: 'number',
      required: false,
      validations: [
        { type: 'number', message: 'Must be a valid number' },
        { type: 'min', message: 'Cost cannot be negative', params: { min: 0 } }
      ],
      transform: (v) => v ? parseFloat(String(v)) : null,
      description: 'Original purchase cost'
    },
    {
      key: 'currentLocation',
      label: 'Current Location',
      type: 'string',
      required: false,
      validations: [],
      description: 'Current physical location of the asset'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'enum',
      required: false,
      defaultValue: 'OPERATIONAL',
      enumValues: ['OPERATIONAL', 'UNDER_REPAIR', 'STANDBY', 'OUT_OF_SERVICE', 'DISPOSED'],
      validations: [
        { type: 'enum', message: 'Invalid status', params: { values: ['OPERATIONAL', 'UNDER_REPAIR', 'STANDBY', 'OUT_OF_SERVICE', 'DISPOSED'] } }
      ],
      description: 'Current operational status'
    },
    {
      key: 'criticality',
      label: 'Criticality',
      type: 'enum',
      required: false,
      defaultValue: 'MEDIUM',
      enumValues: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      validations: [
        { type: 'enum', message: 'Invalid criticality level', params: { values: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] } }
      ],
      description: 'Business criticality level'
    }
  ],
  exampleRows: [
    {
      assetNumber: 'VEH-001',
      name: 'Toyota Hilux Pickup',
      categoryCode: 'VEHICLE',
      description: 'Double cab pickup truck for site operations',
      make: 'Toyota',
      model: 'Hilux 2.8L',
      serialNumber: 'JTFSS22P500123456',
      yearOfManufacture: 2022,
      acquisitionDate: '2022-06-15',
      acquisitionCost: 45000,
      currentLocation: 'Main Depot',
      status: 'OPERATIONAL',
      criticality: 'HIGH'
    },
    {
      assetNumber: 'EQP-002',
      name: 'Hydraulic Crane 5 Ton',
      categoryCode: 'EQUIPMENT',
      description: 'Mobile hydraulic crane for heavy lifting',
      make: 'Tadano',
      model: 'GR-500N',
      serialNumber: 'TAD-2020-45678',
      yearOfManufacture: 2020,
      acquisitionDate: '2020-03-01',
      acquisitionCost: 125000,
      currentLocation: 'Workshop Bay 2',
      status: 'OPERATIONAL',
      criticality: 'CRITICAL'
    }
  ]
};

// ============================================
// SUPPLIERS TEMPLATE
// ============================================
export const suppliersTemplate: ImportTemplate = {
  entityType: 'suppliers',
  entityName: 'Suppliers',
  description: 'Import supplier/vendor information',
  primaryKey: 'supplierCode',
  fields: [
    {
      key: 'supplierCode',
      label: 'Supplier Code',
      type: 'string',
      required: true,
      unique: true,
      validations: [
        { type: 'required', message: 'Supplier code is required' },
        { type: 'unique', message: 'Supplier code must be unique' }
      ],
      description: 'Unique supplier identifier (e.g., SUP-001)'
    },
    {
      key: 'name',
      label: 'Supplier Name',
      type: 'string',
      required: true,
      validations: [
        { type: 'required', message: 'Supplier name is required' }
      ],
      description: 'Official company name'
    },
    {
      key: 'contactPerson',
      label: 'Contact Person',
      type: 'string',
      required: false,
      validations: [],
      description: 'Primary contact person name'
    },
    {
      key: 'email',
      label: 'Email',
      type: 'string',
      required: false,
      validations: [
        { type: 'email', message: 'Must be a valid email address' }
      ],
      description: 'Contact email address'
    },
    {
      key: 'phone',
      label: 'Phone',
      type: 'string',
      required: false,
      validations: [],
      description: 'Contact phone number'
    },
    {
      key: 'address',
      label: 'Address',
      type: 'string',
      required: false,
      validations: [],
      description: 'Physical address'
    },
    {
      key: 'city',
      label: 'City',
      type: 'string',
      required: false,
      validations: [],
      description: 'City'
    },
    {
      key: 'country',
      label: 'Country',
      type: 'string',
      required: false,
      defaultValue: 'Zambia',
      validations: [],
      description: 'Country'
    },
    {
      key: 'taxNumber',
      label: 'Tax Number',
      type: 'string',
      required: false,
      validations: [],
      description: 'Tax registration number'
    },
    {
      key: 'paymentTerms',
      label: 'Payment Terms',
      type: 'string',
      required: false,
      defaultValue: 'NET 30',
      validations: [],
      description: 'Payment terms (e.g., NET 30, COD)'
    },
    {
      key: 'bankName',
      label: 'Bank Name',
      type: 'string',
      required: false,
      validations: [],
      description: 'Bank name for payments'
    },
    {
      key: 'bankAccount',
      label: 'Bank Account',
      type: 'string',
      required: false,
      validations: [],
      description: 'Bank account number'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'enum',
      required: false,
      defaultValue: 'ACTIVE',
      enumValues: ['ACTIVE', 'INACTIVE', 'BLACKLISTED'],
      validations: [
        { type: 'enum', message: 'Invalid status', params: { values: ['ACTIVE', 'INACTIVE', 'BLACKLISTED'] } }
      ],
      description: 'Supplier status'
    },
    {
      key: 'rating',
      label: 'Rating',
      type: 'number',
      required: false,
      validations: [
        { type: 'number', message: 'Must be a valid number' },
        { type: 'min', message: 'Rating must be between 0 and 5', params: { min: 0 } },
        { type: 'max', message: 'Rating must be between 0 and 5', params: { max: 5 } }
      ],
      transform: (v) => v ? parseFloat(String(v)) : null,
      description: 'Supplier rating (0-5)'
    }
  ],
  exampleRows: [
    {
      supplierCode: 'SUP-001',
      name: 'Auto Parts Zambia Ltd',
      contactPerson: 'John Mutale',
      email: 'sales@autopartszm.com',
      phone: '+260 211 123456',
      address: 'Plot 45, Light Industrial Area',
      city: 'Lusaka',
      country: 'Zambia',
      taxNumber: 'TPIN-1234567890',
      paymentTerms: 'NET 30',
      bankName: 'Standard Chartered Bank',
      bankAccount: '0123456789012',
      status: 'ACTIVE',
      rating: 4.5
    },
    {
      supplierCode: 'SUP-002',
      name: 'Global Tools International',
      contactPerson: 'Sarah Phiri',
      email: 'orders@globaltools.com',
      phone: '+260 211 654321',
      address: 'Kabwe Road Industrial Site',
      city: 'Ndola',
      country: 'Zambia',
      taxNumber: 'TPIN-0987654321',
      paymentTerms: 'NET 45',
      status: 'ACTIVE',
      rating: 4.0
    }
  ]
};

// ============================================
// JOB CARDS TEMPLATE (Historical Import)
// ============================================
export const jobCardsTemplate: ImportTemplate = {
  entityType: 'jobcards',
  entityName: 'Job Cards',
  description: 'Import historical job card records',
  primaryKey: 'jobCardNumber',
  fields: [
    {
      key: 'jobCardNumber',
      label: 'Job Card Number',
      type: 'string',
      required: true,
      unique: true,
      validations: [
        { type: 'required', message: 'Job card number is required' },
        { type: 'unique', message: 'Job card number must be unique' }
      ],
      description: 'Unique job card identifier'
    },
    {
      key: 'assetNumber',
      label: 'Asset Number',
      type: 'string',
      required: true,
      validations: [
        { type: 'required', message: 'Asset number is required' }
      ],
      description: 'Asset this job card is for (must exist)'
    },
    {
      key: 'jobType',
      label: 'Job Type',
      type: 'enum',
      required: true,
      enumValues: ['CORRECTIVE', 'PREVENTIVE', 'INSPECTION', 'OVERHAUL', 'MODIFICATION', 'WARRANTY'],
      validations: [
        { type: 'required', message: 'Job type is required' },
        { type: 'enum', message: 'Invalid job type', params: { values: ['CORRECTIVE', 'PREVENTIVE', 'INSPECTION', 'OVERHAUL', 'MODIFICATION', 'WARRANTY'] } }
      ],
      description: 'Type of work performed'
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'enum',
      required: false,
      defaultValue: 'NORMAL',
      enumValues: ['EMERGENCY', 'HIGH', 'NORMAL', 'LOW'],
      validations: [
        { type: 'enum', message: 'Invalid priority', params: { values: ['EMERGENCY', 'HIGH', 'NORMAL', 'LOW'] } }
      ],
      description: 'Job priority level'
    },
    {
      key: 'faultDescription',
      label: 'Fault Description',
      type: 'string',
      required: true,
      validations: [
        { type: 'required', message: 'Fault description is required' }
      ],
      description: 'Description of the fault or work needed'
    },
    {
      key: 'diagnosisNotes',
      label: 'Diagnosis Notes',
      type: 'string',
      required: false,
      validations: [],
      description: 'Technical diagnosis findings'
    },
    {
      key: 'workPerformed',
      label: 'Work Performed',
      type: 'string',
      required: false,
      validations: [],
      description: 'Description of work completed'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'enum',
      required: false,
      defaultValue: 'CLOSED',
      enumValues: ['DRAFT', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED'],
      validations: [
        { type: 'enum', message: 'Invalid status', params: { values: ['DRAFT', 'APPROVED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED', 'CANCELLED'] } }
      ],
      description: 'Job card status'
    },
    {
      key: 'estimatedCost',
      label: 'Estimated Cost',
      type: 'number',
      required: false,
      validations: [
        { type: 'number', message: 'Must be a valid number' }
      ],
      transform: (v) => v ? parseFloat(String(v)) : null,
      description: 'Estimated repair cost'
    },
    {
      key: 'actualCost',
      label: 'Actual Cost',
      type: 'number',
      required: false,
      validations: [
        { type: 'number', message: 'Must be a valid number' }
      ],
      transform: (v) => v ? parseFloat(String(v)) : 0,
      description: 'Actual repair cost'
    },
    {
      key: 'scheduledStart',
      label: 'Scheduled Start',
      type: 'date',
      required: false,
      validations: [
        { type: 'date', message: 'Must be a valid date' }
      ],
      transform: (v) => v ? new Date(String(v)) : null,
      description: 'Scheduled start date (YYYY-MM-DD)'
    },
    {
      key: 'scheduledEnd',
      label: 'Scheduled End',
      type: 'date',
      required: false,
      validations: [
        { type: 'date', message: 'Must be a valid date' }
      ],
      transform: (v) => v ? new Date(String(v)) : null,
      description: 'Scheduled completion date (YYYY-MM-DD)'
    },
    {
      key: 'actualStart',
      label: 'Actual Start',
      type: 'date',
      required: false,
      validations: [
        { type: 'date', message: 'Must be a valid date' }
      ],
      transform: (v) => v ? new Date(String(v)) : null,
      description: 'Actual start date (YYYY-MM-DD)'
    },
    {
      key: 'actualEnd',
      label: 'Actual End',
      type: 'date',
      required: false,
      validations: [
        { type: 'date', message: 'Must be a valid date' }
      ],
      transform: (v) => v ? new Date(String(v)) : null,
      description: 'Actual completion date (YYYY-MM-DD)'
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      type: 'date',
      required: false,
      validations: [
        { type: 'date', message: 'Must be a valid date' }
      ],
      transform: (v) => v ? new Date(String(v)) : new Date(),
      description: 'Date the job card was created (YYYY-MM-DD)'
    }
  ],
  exampleRows: [
    {
      jobCardNumber: 'JC-2024-0001',
      assetNumber: 'VEH-001',
      jobType: 'CORRECTIVE',
      priority: 'HIGH',
      faultDescription: 'Engine overheating and losing power',
      diagnosisNotes: 'Thermostat faulty, radiator clogged',
      workPerformed: 'Replaced thermostat, flushed radiator system',
      status: 'CLOSED',
      estimatedCost: 500,
      actualCost: 450,
      scheduledStart: '2024-01-15',
      scheduledEnd: '2024-01-16',
      actualStart: '2024-01-15',
      actualEnd: '2024-01-15',
      createdAt: '2024-01-14'
    }
  ]
};

// ============================================
// ALL TEMPLATES
// ============================================
export const importTemplates: Record<string, ImportTemplate> = {
  items: itemsTemplate,
  assets: assetsTemplate,
  suppliers: suppliersTemplate,
  jobcards: jobCardsTemplate
};

/**
 * Get template by entity type
 */
export function getImportTemplate(entityType: string): ImportTemplate | undefined {
  return importTemplates[entityType];
}

/**
 * Get all available templates
 */
export function getAllTemplates(): ImportTemplate[] {
  return Object.values(importTemplates);
}

/**
 * Validate a single row against a template
 */
export function validateRow(
  template: ImportTemplate,
  rowData: Record<string, unknown>,
  rowIndex: number
): { isValid: boolean; errors: Array<{ field: string; message: string }>; warnings: Array<{ field: string; message: string }> } {
  const errors: Array<{ field: string; message: string }> = [];
  const warnings: Array<{ field: string; message: string }> = [];

  for (const field of template.fields) {
    const value = rowData[field.key];

    // Check required
    if (field.required && (value === undefined || value === null || value === '')) {
      // Use default value if available
      if (field.defaultValue !== undefined) {
        continue;
      }
      errors.push({
        field: field.key,
        message: `${field.label} is required`
      });
      continue;
    }

    // Skip validation if value is empty and not required
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Run validations
    for (const rule of field.validations) {
      let isValid = true;

      switch (rule.type) {
        case 'required':
          isValid = value !== undefined && value !== null && value !== '';
          break;
        case 'email':
          isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
          break;
        case 'number':
          isValid = !isNaN(parseFloat(String(value)));
          break;
        case 'date':
          isValid = !isNaN(new Date(String(value)).getTime());
          break;
        case 'min':
          if (rule.params?.min !== undefined) {
            const num = parseFloat(String(value));
            isValid = !isNaN(num) && num >= (rule.params.min as number);
          }
          break;
        case 'max':
          if (rule.params?.max !== undefined) {
            const num = parseFloat(String(value));
            isValid = !isNaN(num) && num <= (rule.params.max as number);
          }
          break;
        case 'enum':
          if (rule.params?.values && Array.isArray(rule.params.values)) {
            isValid = rule.params.values.includes(String(value).toUpperCase()) || 
                      rule.params.values.includes(String(value));
          }
          break;
        case 'custom':
          if (rule.validator) {
            isValid = rule.validator(value, rowData);
          }
          break;
      }

      if (!isValid) {
        errors.push({
          field: field.key,
          message: rule.message
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Transform row data according to template field transformations
 */
export function transformRow(
  template: ImportTemplate,
  rowData: Record<string, unknown>
): Record<string, unknown> {
  const transformed: Record<string, unknown> = {};

  for (const field of template.fields) {
    const value = rowData[field.key];

    // Apply transformation if available
    if (field.transform && value !== undefined && value !== null && value !== '') {
      transformed[field.key] = field.transform(value);
    } else if (value !== undefined && value !== null && value !== '') {
      transformed[field.key] = value;
    } else if (field.defaultValue !== undefined) {
      transformed[field.key] = field.defaultValue;
    }
  }

  return transformed;
}

/**
 * Generate template file content for download
 */
export function generateTemplateFile(entityType: string, format: 'csv' | 'xlsx'): string | Buffer {
  const template = getImportTemplate(entityType);
  if (!template) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }

  const headers = template.fields.map(f => f.key);
  const exampleData = template.exampleRows.map(row => {
    const data: Record<string, unknown> = {};
    headers.forEach(h => {
      data[h] = row[h] ?? '';
    });
    return data;
  });

  if (format === 'csv') {
    // Generate CSV
    const csvRows = [
      headers.join(','),
      ...exampleData.map(row => 
        headers.map(h => {
          const val = row[h];
          // Escape quotes and wrap in quotes if contains comma
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return String(val ?? '');
        }).join(',')
      )
    ];
    return csvRows.join('\n');
  }

  // For xlsx, we'd use xlsx library - but return the data structure
  // The actual xlsx generation will be done in the API
  return '';
}

/**
 * Get template headers for display
 */
export function getTemplateHeaders(entityType: string): { key: string; label: string; required: boolean }[] {
  const template = getImportTemplate(entityType);
  if (!template) {
    return [];
  }

  return template.fields.map(f => ({
    key: f.key,
    label: f.label,
    required: f.required
  }));
}
