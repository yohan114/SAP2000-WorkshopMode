'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  Loader2,
  File,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'results';

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: Array<{ row: number; error: string }>;
}

const ENTITY_TYPES = [
  { value: 'items', label: 'Items', icon: '📦' },
  { value: 'assets', label: 'Assets', icon: '🚗' },
  { value: 'suppliers', label: 'Suppliers', icon: '🏢' },
  { value: 'jobCards', label: 'Job Cards', icon: '🔧' },
];

export function ImportWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>('upload');
  const [entityType, setEntityType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<{ valid: unknown[]; invalid: Array<{ row: number; errors: string[] }> } | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please upload an Excel or CSV file');
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !entityType) {
      toast.error('Please select an entity type and upload a file');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setParsedData(data.data);
        setStep('mapping');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to parse file');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedData || !entityType) return;

    setStep('importing');
    setImportProgress(0);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          data: parsedData.valid,
        }),
      });

      clearInterval(progressInterval);
      setImportProgress(100);

      if (response.ok) {
        const result = await response.json();
        setImportResult(result);
        setStep('results');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Import failed');
        setStep('preview');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed');
      setStep('preview');
    }
  };

  const handleDownloadTemplate = async () => {
    if (!entityType) {
      toast.error('Please select an entity type first');
      return;
    }

    try {
      const response = await fetch(`/api/import?entityType=${entityType}`);
      if (response.ok) {
        const data = await response.json();
        // Create a simple template based on the fields
        const template = data.template;
        if (template) {
          const csvContent = [
            template.fields.join(','),
            template.fields.map(() => '').join(','), // Empty row for reference
          ].join('\n');
          
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${entityType}-import-template.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Failed to download template:', error);
      toast.error('Failed to download template');
    }
  };

  const resetWizard = () => {
    setStep('upload');
    setEntityType('');
    setFile(null);
    setParsedData(null);
    setImportProgress(0);
    setImportResult(null);
  };

  const handleClose = () => {
    setOpen(false);
    resetWizard();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        <Upload className="h-4 w-4 mr-2" />
        Import Data
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Data Wizard
            </DialogTitle>
            <DialogDescription>
              {step === 'upload' && 'Select entity type and upload your data file'}
              {step === 'mapping' && 'Review your data before import'}
              {step === 'importing' && 'Importing your data...'}
              {step === 'results' && 'Import completed'}
            </DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 py-4">
            {['upload', 'mapping', 'importing', 'results'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s ? 'bg-emerald-600 text-white' :
                  ['upload', 'mapping', 'importing', 'results'].indexOf(step) > i ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-100 text-muted-foreground'
                }`}>
                  {i + 1}
                </div>
                {i < 3 && <div className="w-12 h-1 bg-slate-200" />}
              </div>
            ))}
          </div>

          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Entity Type *</label>
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select what to import" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="mr-2">{type.icon}</span>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {entityType && (
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Upload File *</label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                    {file ? (
                      <div className="flex items-center gap-2">
                        <File className="h-5 w-5 text-emerald-600" />
                        <span className="font-medium">{file.name}</span>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium">Click to upload or drag and drop</p>
                        <p className="text-sm text-muted-foreground">Excel (.xlsx, .xls) or CSV</p>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Mapping/Preview Step */}
          {step === 'mapping' && parsedData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">{parsedData.valid.length}</p>
                    <p className="text-sm text-blue-600">Valid Records</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-red-700">{parsedData.invalid.length}</p>
                    <p className="text-sm text-red-600">Invalid Records</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50 border-slate-200">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{parsedData.valid.length + parsedData.invalid.length}</p>
                    <p className="text-sm text-muted-foreground">Total Records</p>
                  </CardContent>
                </Card>
              </div>

              {parsedData.invalid.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Validation Errors</AlertTitle>
                  <AlertDescription>
                    {parsedData.invalid.length} records have validation errors and will be skipped.
                  </AlertDescription>
                </Alert>
              )}

              {parsedData.valid.length > 0 && (
                <div className="border rounded-lg max-h-60 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(parsedData.valid[0] as Record<string, unknown>).map((key) => (
                          <TableHead key={key}>{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.valid.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row as Record<string, unknown>).map((val, j) => (
                            <TableCell key={j} className="text-sm">{String(val)}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {parsedData.valid.length > 5 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      ...and {parsedData.valid.length - 5} more records
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="py-12 space-y-4">
              <div className="flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
              </div>
              <Progress value={importProgress} className="w-full" />
              <p className="text-center text-muted-foreground">Processing... {importProgress}%</p>
            </div>
          )}

          {/* Results Step */}
          {step === 'results' && importResult && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-emerald-50 border-emerald-200">
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-emerald-700">{importResult.created}</p>
                    <p className="text-sm text-emerald-600">Created</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4 text-center">
                    <ArrowRight className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-700">{importResult.updated}</p>
                    <p className="text-sm text-blue-600">Updated</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4 text-center">
                    <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-red-700">{importResult.errors.length}</p>
                    <p className="text-sm text-red-600">Errors</p>
                  </CardContent>
                </Card>
              </div>

              {importResult.errors.length > 0 && (
                <div className="border rounded-lg max-h-40 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResult.errors.map((err, i) => (
                        <TableRow key={i}>
                          <TableCell>{err.row}</TableCell>
                          <TableCell className="text-red-600">{err.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex items-center justify-between">
            <div>
              {step !== 'upload' && step !== 'importing' && step !== 'results' && (
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                {step === 'results' ? 'Close' : 'Cancel'}
              </Button>
              {step === 'upload' && (
                <Button
                  onClick={handleUpload}
                  disabled={!file || !entityType || loading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Next: Preview
                </Button>
              )}
              {step === 'mapping' && parsedData && parsedData.valid.length > 0 && (
                <Button
                  onClick={handleExecuteImport}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Import {parsedData.valid.length} Records
                </Button>
              )}
              {step === 'results' && (
                <Button onClick={resetWizard} variant="outline">
                  Import More
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Export Button Component
 */
export function ExportButton({ entityTypes }: { entityTypes?: string[] }) {
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(entityTypes || []);
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'json'>('xlsx');

  const handleExport = async () => {
    if (selectedTypes.length === 0) {
      toast.error('Please select at least one entity type');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/export/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityTypes: selectedTypes,
          format,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wcp-export-${new Date().toISOString().split('T')[0]}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        setShowDialog(false);
        toast.success('Export completed');
      } else {
        toast.error('Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setShowDialog(true)}>
        <Download className="h-4 w-4 mr-2" />
        Export Data
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Data</DialogTitle>
            <DialogDescription>Select data to export and format</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data to Export</label>
              <div className="space-y-2">
                {ENTITY_TYPES.map((type) => (
                  <label key={type.value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTypes([...selectedTypes, type.value]);
                        } else {
                          setSelectedTypes(selectedTypes.filter(t => t !== type.value));
                        }
                      }}
                      className="rounded"
                    />
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Format</label>
              <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                  <SelectItem value="json">JSON (.json)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleExport} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
