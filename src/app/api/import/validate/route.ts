import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getImportTemplate, validateRow, transformRow, ImportTemplate } from '@/lib/import-templates';

export const dynamic = 'force-dynamic';

interface ValidationRowResult {
  rowNumber: number;
  isValid: boolean;
  data: Record<string, unknown>;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
  isDuplicate: boolean;
  action: 'create' | 'update' | 'skip';
}

interface ValidationResult {
  entityType: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  rows: ValidationRowResult[];
  summary: {
    toCreate: number;
    toUpdate: number;
    toSkip: number;
    errors: number;
    warnings: number;
  };
}

/**
 * POST /api/import/validate
 * Validate import data row by row
 * Returns validation results with duplicate detection
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType, rows, fieldMapping } = body as {
      entityType: string;
      rows: Array<{ _rowNumber: number; data: Record<string, unknown> }>;
      fieldMapping?: Record<string, string>;
    };

    if (!entityType || !rows || !Array.isArray(rows)) {
      return NextResponse.json(
        { error: 'Missing required fields: entityType, rows' },
        { status: 400 }
      );
    }

    const template = getImportTemplate(entityType);
    if (!template) {
      return NextResponse.json(
        { error: `Unknown entity type: ${entityType}` },
        { status: 400 }
      );
    }

    // Get existing records for duplicate detection
    const existingRecords = await fetchExistingRecords(template);
    
    const results: ValidationRowResult[] = [];
    let validRows = 0;
    let invalidRows = 0;
    let duplicateRows = 0;
    let toCreate = 0;
    let toUpdate = 0;
    let toSkip = 0;
    let totalErrors = 0;
    let totalWarnings = 0;

    // Track seen values for intra-file duplicate detection
    const seenPrimaryKeys = new Map<string, number>();

    for (const row of rows) {
      const { _rowNumber, data } = row;
      
      // Apply field mapping if provided
      let mappedData = data;
      if (fieldMapping) {
        mappedData = {};
        Object.entries(data).forEach(([key, value]) => {
          const mappedKey = fieldMapping[key] || key;
          mappedData[mappedKey] = value;
        });
      }

      // Validate row
      const validation = validateRow(template, mappedData, _rowNumber);
      
      // Check for duplicates
      const primaryKeyValue = mappedData[template.primaryKey];
      const primaryKeyStr = String(primaryKeyValue || '').toLowerCase();
      let isDuplicate = false;
      let duplicateInfo = '';
      let action: 'create' | 'update' | 'skip' = 'create';

      if (primaryKeyValue) {
        // Check against existing records
        if (existingRecords.has(primaryKeyStr)) {
          isDuplicate = true;
          duplicateInfo = `Record with ${template.primaryKey}='${primaryKeyValue}' already exists`;
          action = 'update';
          duplicateRows++;
          toUpdate++;
        }
        
        // Check against other rows in the same file
        if (seenPrimaryKeys.has(primaryKeyStr)) {
          isDuplicate = true;
          duplicateInfo = `Duplicate ${template.primaryKey}='${primaryKeyValue}' found in row ${seenPrimaryKeys.get(primaryKeyStr)}`;
          action = 'skip';
        } else {
          seenPrimaryKeys.set(primaryKeyStr, _rowNumber);
        }
      }

      if (!isDuplicate && action === 'create') {
        toCreate++;
      }

      if (action === 'skip') {
        toSkip++;
      }

      // Determine overall validity
      const isValid = validation.isValid && action !== 'skip';
      
      if (isValid) {
        validRows++;
      } else {
        invalidRows++;
      }

      totalErrors += validation.errors.length;
      totalWarnings += validation.warnings.length;

      // Transform data for storage
      const transformedData = transformRow(template, mappedData);

      results.push({
        rowNumber: _rowNumber,
        isValid,
        data: transformedData,
        errors: validation.errors,
        warnings: isDuplicate && action !== 'skip' 
          ? [...validation.warnings, { field: template.primaryKey, message: duplicateInfo }]
          : validation.warnings,
        isDuplicate,
        action
      });
    }

    const result: ValidationResult = {
      entityType,
      totalRows: rows.length,
      validRows,
      invalidRows,
      duplicateRows,
      rows: results,
      summary: {
        toCreate,
        toUpdate,
        toSkip,
        errors: totalErrors,
        warnings: totalWarnings
      }
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Import validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate import data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Fetch existing records from database for duplicate detection
 */
async function fetchExistingRecords(template: ImportTemplate): Promise<Set<string>> {
  const existingRecords = new Set<string>();

  try {
    switch (template.entityType) {
      case 'items': {
        const items = await db.item.findMany({
          select: { itemCode: true }
        });
        items.forEach(item => existingRecords.add(item.itemCode.toLowerCase()));
        break;
      }
      case 'assets': {
        const assets = await db.asset.findMany({
          select: { assetNumber: true }
        });
        assets.forEach(asset => existingRecords.add(asset.assetNumber.toLowerCase()));
        break;
      }
      case 'suppliers': {
        const suppliers = await db.supplier.findMany({
          select: { supplierCode: true }
        });
        suppliers.forEach(supplier => existingRecords.add(supplier.supplierCode.toLowerCase()));
        break;
      }
      case 'jobcards': {
        const jobCards = await db.jobCard.findMany({
          select: { jobCardNumber: true }
        });
        jobCards.forEach(jc => existingRecords.add(jc.jobCardNumber.toLowerCase()));
        break;
      }
    }
  } catch (error) {
    console.error('Error fetching existing records:', error);
  }

  return existingRecords;
}
