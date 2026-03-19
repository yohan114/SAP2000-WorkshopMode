'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  Loader2,
  RefreshCw,
  FileText,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { getImportTemplate, ImportTemplate, ImportField } from '@/lib/import-templates';

// Types
interface ParsedRow {
  _rowNumber: number;
  _isValid: boolean;
  data: Record<string, unknown>;
}

interface ParseResult {
  entityType: string;
  totalRows: number;
  headers: string[];
  rows: ParsedRow[];
  template: ImportTemplate | null;
  parseErrors: string[];
  fieldMapping: Record<string, string>;
}

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
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ValidationRowResult[];
  summary: {
    toCreate: number;
    toUpdate: number;
    toSkip: number;
    errors: number;
    warnings: number;
  };
}

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportResult {
  success: boolean;
  total: number;
  created: number;
  updated: number;
  errors: ImportError[];
  duration: number;
}

type WizardStep = 'select' | 'upload' | 'mapping' | 'preview' | 'execute' | 'results';

const entityTypes = [
  { value: 'items', label: 'Items', description: 'Inventory items (spare parts, consumables, tools)' },
  { value: 'assets', label: 'Assets', description: 'Equipment and vehicles' },
  { value: 'suppliers', label: 'Suppliers', description: 'Vendor information' },
  { value: 'jobcards', label: 'Job Cards', description: 'Historical job card records' }
];

export function ImportWizard() {
  const [step, setStep] = useState<WizardStep>('select');
  const [entityType, setEntityType] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Select entity type
  const handleEntityTypeSelect = (value: string) => {
    setEntityType(value);
    setFile(null);
    setParseResult(null);
    setValidationResult(null);
    setImportResult(null);
    setFieldMapping({});
  };

  // Step 2: Handle file upload
  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    if (!entityType) {
      toast.error('Please select an entity type first');
      return;
    }

    setFile(uploadedFile);
    setIsLoading(true);
    setProgress(20);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('entityType', entityType);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to parse file');
      }

      const result: ParseResult = await response.json();
      setParseResult(result);
      setFieldMapping(result.fieldMapping || {});
      setProgress(50);
      setStep('mapping');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  }, [entityType]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileUpload(droppedFile);
    }
  }, [handleFileUpload]);

  // Step 3: Column mapping
  const handleMappingChange = (fileColumn: string, templateField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [fileColumn]: templateField
    }));
  };

  const handleMappingContinue = () => {
    if (parseResult) {
      setParseResult(prev => prev ? { ...prev, fieldMapping } : null);
      setStep('preview');
      handleValidate(fieldMapping);
    }
  };

  // Step 4: Validate data
  const handleValidate = async (mapping: Record<string, string>) => {
    if (!parseResult) return;

    setIsLoading(true);
    setProgress(60);

    try {
      const response = await fetch('/api/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          rows: parseResult.rows,
          fieldMapping: mapping
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Validation failed');
      }

      const result: ValidationResult = await response.json();
      setValidationResult(result);
      setProgress(80);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Validation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 5: Execute import
  const handleExecuteImport = async () => {
    if (!validationResult) return;

    setIsLoading(true);
    setProgress(90);

    try {
      const rowsToImport = validationResult.rows
        .filter(r => r.isValid && r.action !== 'skip')
        .map(r => ({
          rowNumber: r.rowNumber,
          data: r.data,
          action: r.action
        }));

      const response = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          rows: rowsToImport,
          updateExisting: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
      setProgress(100);
      setStep('results');
      toast.success(`Import completed: ${result.created} created, ${result.updated} updated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Download template
  const handleDownloadTemplate = async () => {
    if (!entityType) return;

    try {
      const response = await fetch(`/api/import?entityType=${entityType}&format=xlsx`);
      if (!response.ok) throw new Error('Failed to download template');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${entityType}-import-template.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download template');
    }
  };

  // Download error log
  const handleDownloadErrorLog = () => {
    if (!importResult || importResult.errors.length === 0) return;

    const csvContent = [
      'Row,Field,Message',
      ...importResult.errors.map(e => `${e.row},"${e.field}","${e.message}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Reset wizard
  const handleReset = () => {
    setStep('select');
    setEntityType('');
    setFile(null);
    setParseResult(null);
    setValidationResult(null);
    setImportResult(null);
    setProgress(0);
    setFieldMapping({});
  };

  const template = entityType ? getImportTemplate(entityType) : null;

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      // Step 1: Select entity type
      case 'select':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">Select Entity Type</h3>
              <p className="text-muted-foreground">Choose what type of data you want to import</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {entityTypes.map(type => (
                <Card 
                  key={type.value}
                  className={`cursor-pointer transition-all hover:border-emerald-500 ${
                    entityType === type.value ? 'border-emerald-500 bg-emerald-50' : ''
                  }`}
                  onClick={() => handleEntityTypeSelect(type.value)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {type.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {entityType && template && (
              <div className="mt-6 space-y-4">
                <Card className="bg-slate-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Template Fields</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      {template.fields.slice(0, 12).map(field => (
                        <div key={field.key} className="flex items-center gap-1">
                          {field.required ? (
                            <span className="text-red-500">*</span>
                          ) : (
                            <span className="text-slate-400">○</span>
                          )}
                          <span>{field.label}</span>
                        </div>
                      ))}
                      {template.fields.length > 12 && (
                        <div className="text-muted-foreground">
                          +{template.fields.length - 12} more fields
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-center">
                  <Button onClick={() => setStep('upload')}>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      // Step 2: Upload file
      case 'upload':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={() => setStep('select')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">Upload Import File</h3>
              <p className="text-muted-foreground">
                Upload a CSV or Excel file with your {entityTypes.find(t => t.value === entityType)?.label} data
              </p>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isLoading ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:border-emerald-500'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) handleFileUpload(selectedFile);
                }}
              />

              {isLoading ? (
                <div className="space-y-4">
                  <Loader2 className="h-12 w-12 mx-auto animate-spin text-emerald-500" />
                  <p className="text-muted-foreground">Parsing file...</p>
                </div>
              ) : file ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-emerald-500" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-slate-400" />
                  <p className="font-medium">Drop your file here or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    Supports CSV, XLSX, XLS files
                  </p>
                </div>
              )}
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Tips for successful import:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-600">
                      <li>Download the template for the correct column structure</li>
                      <li>First row must contain column headers</li>
                      <li>Required fields cannot be empty</li>
                      <li>Dates should be in YYYY-MM-DD format</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      // Step 3: Column mapping
      case 'mapping':
        return parseResult ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={() => setStep('upload')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Badge variant="outline">{parseResult.totalRows} rows found</Badge>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">Map Columns</h3>
              <p className="text-muted-foreground">
                Match your file columns to the system fields
              </p>
            </div>

            {parseResult.parseErrors.length > 0 && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-700">Parsing Issues</p>
                      <ul className="text-sm text-red-600 list-disc list-inside">
                        {parseResult.parseErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-1/3">File Column</TableHead>
                    <TableHead className="w-1/3">System Field</TableHead>
                    <TableHead className="w-1/3">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parseResult.headers.map(header => {
                    const mappedField = fieldMapping[header];
                    const templateField = template?.fields.find(f => f.key === mappedField);
                    const isRequired = template?.fields.find(f => f.required && f.key === mappedField);

                    return (
                      <TableRow key={header}>
                        <TableCell className="font-medium">{header}</TableCell>
                        <TableCell>
                          <Select
                            value={mappedField || ''}
                            onValueChange={(value) => handleMappingChange(header, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select field..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">-- Not Mapped --</SelectItem>
                              {template?.fields.map(field => (
                                <SelectItem key={field.key} value={field.key}>
                                  {field.label}
                                  {field.required && ' *'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {mappedField ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Mapped
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-500">
                              Not Mapped
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-center">
              <Button onClick={handleMappingContinue} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    Continue to Preview
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null;

      // Step 4: Preview and validate
      case 'preview':
        return validationResult ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={() => setStep('mapping')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex gap-2">
                <Badge variant={validationResult.validRows === validationResult.totalRows ? 'default' : 'secondary'}>
                  {validationResult.validRows} valid
                </Badge>
                {validationResult.invalidRows > 0 && (
                  <Badge variant="destructive">{validationResult.invalidRows} invalid</Badge>
                )}
              </div>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-2">Preview Data</h3>
              <p className="text-muted-foreground">Review and validate before importing</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-slate-900">{validationResult.totalRows}</div>
                  <div className="text-xs text-muted-foreground">Total Rows</div>
                </CardContent>
              </Card>
              <Card className="bg-emerald-50">
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{validationResult.summary.toCreate}</div>
                  <div className="text-xs text-muted-foreground">To Create</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50">
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{validationResult.summary.toUpdate}</div>
                  <div className="text-xs text-muted-foreground">To Update</div>
                </CardContent>
              </Card>
              <Card className="bg-amber-50">
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{validationResult.summary.toSkip}</div>
                  <div className="text-xs text-muted-foreground">To Skip</div>
                </CardContent>
              </Card>
              <Card className="bg-red-50">
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{validationResult.summary.errors}</div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </CardContent>
              </Card>
            </div>

            {/* Data Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 sticky top-0">
                      <TableHead className="w-16">#</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-24">Action</TableHead>
                      {template?.fields.slice(0, 5).map(field => (
                        <TableHead key={field.key}>{field.label}</TableHead>
                      ))}
                      <TableHead>Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationResult.rows.slice(0, 100).map(row => (
                      <TableRow 
                        key={row.rowNumber}
                        className={!row.isValid ? 'bg-red-50' : row.isDuplicate ? 'bg-amber-50' : ''}
                      >
                        <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            row.action === 'create' ? 'text-emerald-600' :
                            row.action === 'update' ? 'text-blue-600' :
                            'text-slate-400'
                          }>
                            {row.action}
                          </Badge>
                        </TableCell>
                        {template?.fields.slice(0, 5).map(field => (
                          <TableCell key={field.key} className="max-w-32 truncate">
                            {String(row.data[field.key] ?? '-')}
                          </TableCell>
                        ))}
                        <TableCell>
                          {row.errors.length > 0 ? (
                            <div className="text-xs text-red-600">
                              {row.errors.slice(0, 2).map((e, i) => (
                                <div key={i}>{e.field}: {e.message}</div>
                              ))}
                              {row.errors.length > 2 && <div>+{row.errors.length - 2} more</div>}
                            </div>
                          ) : row.warnings.length > 0 ? (
                            <div className="text-xs text-amber-600">
                              {row.warnings[0].message}
                            </div>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {validationResult.rows.length > 100 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          ... and {validationResult.rows.length - 100} more rows
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={handleReset}>
                Cancel
              </Button>
              <Button 
                onClick={handleExecuteImport} 
                disabled={isLoading || validationResult.validRows === 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import {validationResult.validRows} Records
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null;

      // Step 5: Results
      case 'results':
        return importResult ? (
          <div className="space-y-6">
            <div className="text-center mb-6">
              {importResult.success ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Import Complete</h3>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Import Completed with Errors</h3>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold">{importResult.total}</div>
                  <div className="text-sm text-muted-foreground">Processed</div>
                </CardContent>
              </Card>
              <Card className="bg-emerald-50">
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold text-emerald-600">{importResult.created}</div>
                  <div className="text-sm text-muted-foreground">Created</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-50">
                <CardContent className="pt-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{importResult.updated}</div>
                  <div className="text-sm text-muted-foreground">Updated</div>
                </CardContent>
              </Card>
              <Card className={importResult.errors.length > 0 ? 'bg-red-50' : ''}>
                <CardContent className="pt-4 text-center">
                  <div className={`text-3xl font-bold ${importResult.errors.length > 0 ? 'text-red-600' : ''}`}>
                    {importResult.errors.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Completed in {(importResult.duration / 1000).toFixed(2)} seconds
            </div>

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <Card className="border-red-200">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm text-red-700">Import Errors</CardTitle>
                    <Button variant="outline" size="sm" onClick={handleDownloadErrorLog}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Log
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Row</TableHead>
                          <TableHead className="w-32">Field</TableHead>
                          <TableHead>Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.errors.slice(0, 50).map((error, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{error.row}</TableCell>
                            <TableCell className="text-xs">{error.field}</TableCell>
                            <TableCell className="text-xs text-red-600">{error.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="mr-2 h-4 w-4" />
                New Import
              </Button>
            </div>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Data Import Wizard
        </CardTitle>
        <CardDescription>
          Import data from CSV or Excel files
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Select</span>
            <span>Upload</span>
            <span>Map</span>
            <span>Preview</span>
            <span>Results</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        {renderStepContent()}
      </CardContent>
    </Card>
  );
}
