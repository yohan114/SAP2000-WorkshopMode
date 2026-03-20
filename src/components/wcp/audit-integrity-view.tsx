'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  Link2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Search,
  Loader2,
  RefreshCw,
  Download,
  Eye,
  Blocks,
  Hash,
  Clock,
  FileWarning,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

interface HashChainStats {
  totalBlocks: number;
  verifiedBlocks: number;
  unverifiedBlocks: number;
  tamperedBlocks: number;
  lastVerifiedAt: string | null;
  chainStartAt: string | null;
  chainEndAt: string | null;
}

interface AuditBlock {
  id: string;
  blockNumber: number;
  action: string;
  entityType: string;
  entityId: string;
  currentHash: string | null;
  previousHash: string | null;
  verificationStatus: string | null;
  verifiedAt: string | null;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    email: string;
  };
}

interface TamperedRecord {
  id: string;
  blockNumber: number;
  action: string;
  entityType: string;
  entityId: string;
  currentHash: string | null;
  previousHash: string | null;
  verificationStatus: string;
  createdAt: string;
  actor?: {
    id: string;
    name: string;
    email: string;
  };
}

interface VerificationResult {
  isValid: boolean;
  tamperedBlocks: number[];
  totalBlocks: number;
  verifiedBlocks: number;
}

const actionColors: Record<string, string> = {
  'CREATE': 'bg-emerald-100 text-emerald-700',
  'UPDATE': 'bg-blue-100 text-blue-700',
  'DELETE': 'bg-red-100 text-red-700',
  'LOGIN': 'bg-purple-100 text-purple-700',
  'LOGOUT': 'bg-slate-100 text-foreground',
  'APPROVE': 'bg-amber-100 text-amber-700',
  'STATUS_CHANGE': 'bg-cyan-100 text-cyan-700',
};

const statusColors: Record<string, string> = {
  'UNVERIFIED': 'bg-slate-100 text-foreground',
  'VERIFIED': 'bg-emerald-100 text-emerald-700',
  'TAMPERED': 'bg-red-100 text-red-700',
};

export function AuditIntegrityView() {
  const [stats, setStats] = useState<HashChainStats | null>(null);
  const [blocks, setBlocks] = useState<AuditBlock[]>([]);
  const [tamperedRecords, setTamperedRecords] = useState<TamperedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  
  // Block explorer state
  const [blockStart, setBlockStart] = useState(1);
  const [blockEnd, setBlockEnd] = useState(20);
  const [searchBlock, setSearchBlock] = useState('');
  
  // Dialogs
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<AuditBlock | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsResponse = await fetch('/api/audit/verify');
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setStats(data.stats);
      }
      
      // Fetch blocks
      const blocksResponse = await fetch(`/api/audit/verify?action=blocks&start=${blockStart}&end=${blockEnd}`);
      if (blocksResponse.ok) {
        const data = await blocksResponse.json();
        setBlocks(data.data || []);
      }
      
      // Fetch tampered records
      const tamperedResponse = await fetch('/api/audit/verify?action=tampered');
      if (tamperedResponse.ok) {
        const data = await tamperedResponse.json();
        setTamperedRecords(data.data || []);
      }
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load integrity data');
    } finally {
      setLoading(false);
    }
  }, [blockStart, blockEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Run verification
  const handleVerify = async (startBlock?: number, endBlock?: number) => {
    try {
      setVerifying(true);
      
      const response = await fetch('/api/audit/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startBlock,
          endBlock
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        setVerificationResult(result);
        setShowResultDialog(true);
        await fetchData(); // Refresh data
      } else {
        toast.error('Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  // Export report
  const handleExport = async () => {
    try {
      const response = await fetch('/api/audit/verify?action=export');
      if (response.ok) {
        const report = await response.json();
        
        // Create downloadable JSON
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-integrity-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        toast.success('Report exported successfully');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    }
  };

  // Copy hash to clipboard
  const handleCopyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
    toast.success('Hash copied to clipboard');
  };

  // Navigate blocks
  const handlePrevBlocks = () => {
    const newStart = Math.max(1, blockStart - 20);
    setBlockStart(newStart);
    setBlockEnd(newStart + 19);
  };

  const handleNextBlocks = () => {
    if (stats && blockEnd < stats.totalBlocks) {
      setBlockStart(blockStart + 20);
      setBlockEnd(Math.min(blockEnd + 20, stats.totalBlocks));
    }
  };

  const handleSearchBlock = () => {
    const blockNum = parseInt(searchBlock, 10);
    if (blockNum > 0) {
      setBlockStart(blockNum);
      setBlockEnd(blockNum + 19);
    }
  };

  const handleViewBlock = (block: AuditBlock) => {
    setSelectedBlock(block);
    setShowBlockDialog(true);
  };

  const truncateHash = (hash: string | null) => {
    if (!hash) return '-';
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  // Calculate verification progress
  const verificationProgress = stats && stats.totalBlocks > 0
    ? Math.round((stats.verifiedBlocks / stats.totalBlocks) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Integrity Dashboard</h1>
          <p className="text-muted-foreground text-sm">Cryptographic hash chain verification for tamper detection</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={() => handleVerify()} disabled={verifying}>
            {verifying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 mr-2" />
            )}
            Verify Chain
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Blocks className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalBlocks || 0}</p>
                <p className="text-xs text-muted-foreground">Total Blocks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.verifiedBlocks || 0}</p>
                <p className="text-xs text-muted-foreground">Verified Blocks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.unverifiedBlocks || 0}</p>
                <p className="text-xs text-muted-foreground">Unverified Blocks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.tamperedBlocks || 0}</p>
                <p className="text-xs text-muted-foreground">Tampered Blocks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chain Integrity Alert */}
      {stats && stats.tamperedBlocks > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Chain Integrity Compromised</AlertTitle>
          <AlertDescription>
            {stats.tamperedBlocks} block(s) have been detected as tampered. 
            The audit trail integrity cannot be guaranteed for affected records.
            Please review the tampered blocks below.
          </AlertDescription>
        </Alert>
      )}

      {/* Verification Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Verification Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{verificationProgress}%</span>
            </div>
            <Progress value={verificationProgress} className="h-2" />
            {stats?.lastVerifiedAt && (
              <p className="text-xs text-muted-foreground">
                Last verified: {formatDate(stats.lastVerifiedAt)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="explorer">
        <TabsList>
          <TabsTrigger value="explorer">
            <Blocks className="h-4 w-4 mr-2" />
            Block Explorer
          </TabsTrigger>
          <TabsTrigger value="tampered">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Tampered Records
          </TabsTrigger>
        </TabsList>

        {/* Block Explorer Tab */}
        <TabsContent value="explorer" className="space-y-4">
          {/* Navigation */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePrevBlocks}
                    disabled={blockStart <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Blocks {blockStart} - {Math.min(blockEnd, stats?.totalBlocks || 0)} of {stats?.totalBlocks || 0}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleNextBlocks}
                    disabled={!stats || blockEnd >= stats.totalBlocks}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Go to block..."
                    value={searchBlock}
                    onChange={(e) => setSearchBlock(e.target.value)}
                    className="w-32"
                  />
                  <Button variant="outline" size="sm" onClick={handleSearchBlock}>
                    Go
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blocks Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : blocks.length === 0 ? (
                <div className="text-center py-12">
                  <Blocks className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-muted-foreground">No blocks found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Block #</TableHead>
                      <TableHead>Hash</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blocks.map((block) => (
                      <TableRow key={block.id}>
                        <TableCell className="font-mono text-sm">
                          {block.blockNumber}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <span>{truncateHash(block.currentHash)}</span>
                            {block.currentHash && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0"
                                onClick={() => handleCopyHash(block.currentHash!)}
                              >
                                {copiedHash === block.currentHash ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={actionColors[block.action] || 'bg-slate-100'}>
                            {block.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{block.entityType}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[block.verificationStatus || 'UNVERIFIED']}>
                            {block.verificationStatus || 'UNVERIFIED'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(block.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewBlock(block)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tampered Records Tab */}
        <TabsContent value="tampered" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {tamperedRecords.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-emerald-300 mx-auto mb-4" />
                  <p className="text-muted-foreground">No tampered records detected</p>
                  <p className="text-xs text-muted-foreground mt-1">All audit records maintain their integrity</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Block #</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Expected Hash</TableHead>
                      <TableHead>Actual Hash</TableHead>
                      <TableHead>Detected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tamperedRecords.map((record) => (
                      <TableRow key={record.id} className="bg-red-50">
                        <TableCell className="font-mono text-sm">
                          {record.blockNumber}
                        </TableCell>
                        <TableCell>
                          <Badge className={actionColors[record.action] || 'bg-slate-100'}>
                            {record.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{record.entityType}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-red-600">
                          {truncateHash(record.previousHash)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-red-600">
                          {truncateHash(record.currentHash)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(record.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Block Detail Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Block #{selectedBlock?.blockNumber}
            </DialogTitle>
          </DialogHeader>

          {selectedBlock && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Action</p>
                  <Badge className={actionColors[selectedBlock.action] || 'bg-slate-100'}>
                    {selectedBlock.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entity Type</p>
                  <p className="font-medium">{selectedBlock.entityType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entity ID</p>
                  <p className="font-mono text-sm">{selectedBlock.entityId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actor</p>
                  <p className="font-medium">{selectedBlock.actor?.name || 'System'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Verification Status</p>
                  <Badge className={statusColors[selectedBlock.verificationStatus || 'UNVERIFIED']}>
                    {selectedBlock.verificationStatus || 'UNVERIFIED'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium">{formatDate(selectedBlock.createdAt)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Current Hash</p>
                  {selectedBlock.currentHash && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyHash(selectedBlock.currentHash!)}
                    >
                      {copiedHash === selectedBlock.currentHash ? (
                        <Check className="h-4 w-4 text-emerald-500 mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      Copy
                    </Button>
                  )}
                </div>
                <pre className="text-xs bg-slate-100 p-3 rounded-lg overflow-x-auto font-mono">
                  {selectedBlock.currentHash || 'Not calculated'}
                </pre>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Previous Hash</p>
                  {selectedBlock.previousHash && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyHash(selectedBlock.previousHash!)}
                    >
                      {copiedHash === selectedBlock.previousHash ? (
                        <Check className="h-4 w-4 text-emerald-500 mr-2" />
                      ) : (
                        <Copy className="h-4 w-4 mr-2" />
                      )}
                      Copy
                    </Button>
                  )}
                </div>
                <pre className="text-xs bg-slate-100 p-3 rounded-lg overflow-x-auto font-mono">
                  {selectedBlock.previousHash || 'GENESIS (null)'}
                </pre>
              </div>

              {selectedBlock.verifiedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Verified At</p>
                  <p className="font-medium">{formatDate(selectedBlock.verifiedAt)}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verification Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {verificationResult?.isValid ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Verification Complete
            </DialogTitle>
          </DialogHeader>

          {verificationResult && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                {verificationResult.isValid ? (
                  <div className="text-emerald-600">
                    <Shield className="h-16 w-16 mx-auto mb-2" />
                    <p className="font-medium">Chain Integrity Valid</p>
                    <p className="text-sm text-muted-foreground">All blocks verified successfully</p>
                  </div>
                ) : (
                  <div className="text-red-600">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-2" />
                    <p className="font-medium">Chain Integrity Compromised</p>
                    <p className="text-sm text-muted-foreground">
                      {verificationResult.tamperedBlocks.length} block(s) tampered
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{verificationResult.totalBlocks}</p>
                  <p className="text-xs text-muted-foreground">Total Blocks</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{verificationResult.verifiedBlocks}</p>
                  <p className="text-xs text-muted-foreground">Verified</p>
                </div>
              </div>

              {verificationResult.tamperedBlocks.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Tampered Block Numbers:</p>
                  <div className="flex flex-wrap gap-1">
                    {verificationResult.tamperedBlocks.slice(0, 20).map((num) => (
                      <Badge key={num} variant="destructive" className="text-xs">
                        #{num}
                      </Badge>
                    ))}
                    {verificationResult.tamperedBlocks.length > 20 && (
                      <span className="text-xs text-muted-foreground">
                        +{verificationResult.tamperedBlocks.length - 20} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResultDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
