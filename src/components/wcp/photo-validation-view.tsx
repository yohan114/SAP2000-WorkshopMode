'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Shield, ShieldAlert, ShieldCheck, ShieldX,
  Camera, MapPin, Clock, AlertTriangle, CheckCircle, 
  XCircle, Info, Search, Filter, RefreshCw, Eye,
  Image as ImageIcon, Loader2, FileImage, ChevronLeft,
  ChevronRight, Download, AlertCircle, Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Types
interface ExifWarning {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
}

interface PhotoValidation {
  id: string;
  fileName: string;
  originalName?: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  uploadedAt: string;
  capturedAt?: string;
  jobCard: {
    id: string;
    jobCardNumber: string;
  };
  category?: {
    id: string;
    code: string;
    name: string;
  };
  validation: {
    isValid: boolean | null;
    trustScore: number | null;
    capturedAt?: string;
    device?: string;
    latitude?: number;
    longitude?: number;
    hasWarnings: boolean;
  };
}

interface PhotoStats {
  total: number;
  validated: number;
  valid: number;
  invalid: number;
  averageTrustScore: number | null;
  highTrust: number;
  mediumTrust: number;
  lowTrust: number;
  untrusted: number;
}

interface PhotoDetail extends PhotoValidation {
  exifData?: Record<string, unknown>;
  formattedExif?: Record<string, string>;
  validation: {
    isValid: boolean | null;
    trustScore: number | null;
    capturedAt?: string;
    device?: string;
    latitude?: number;
    longitude?: number;
    warnings: ExifWarning[];
  };
}

// Trust score badge component
function TrustScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <Badge variant="outline" className="gap-1">
        <Info className="h-3 w-3" />
        Not Validated
      </Badge>
    );
  }

  const color = score >= 80 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                score >= 60 ? 'bg-amber-100 text-amber-800 border-amber-200' :
                score >= 40 ? 'bg-orange-100 text-orange-800 border-orange-200' :
                'bg-red-100 text-red-800 border-red-200';

  const Icon = score >= 80 ? ShieldCheck :
               score >= 60 ? Shield :
               score >= 40 ? ShieldAlert : ShieldX;

  return (
    <Badge className={cn('gap-1', color)}>
      <Icon className="h-3 w-3" />
      {score}%
    </Badge>
  );
}

// Warning badge component
function WarningBadge({ warning }: { warning: ExifWarning }) {
  const color = warning.severity === 'HIGH' ? 'bg-red-100 text-red-800 border-red-200' :
                warning.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                'bg-slate-100 text-slate-800 border-slate-200';

  return (
    <Badge variant="outline" className={cn('text-xs', color)}>
      {warning.type.replace(/_/g, ' ')}
    </Badge>
  );
}

// Stats card component
function StatsCard({ title, value, icon: Icon, color, description }: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PhotoValidationView() {
  const { toast } = useToast();
  
  // State
  const [photos, setPhotos] = useState<PhotoValidation[]>([]);
  const [stats, setStats] = useState<PhotoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'validated' | 'unvalidated' | 'high' | 'medium' | 'low' | 'untrusted'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [bulkValidating, setBulkValidating] = useState(false);
  
  // Fetch photos
  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filter !== 'all') {
        if (filter === 'unvalidated') {
          // Photos without validation
        } else if (filter === 'validated') {
          // Photos with validation
        } else if (filter === 'high') {
          params.set('minTrustScore', '80');
        } else if (filter === 'medium') {
          params.set('minTrustScore', '60');
        } else if (filter === 'low') {
          params.set('minTrustScore', '40');
        } else if (filter === 'untrusted') {
          // Photos with low trust
        }
      }
      
      const response = await fetch(`/api/photos/validate?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        // Apply client-side filtering for complex filters
        let filteredPhotos = data.data.photos || [];
        
        if (filter === 'unvalidated') {
          filteredPhotos = filteredPhotos.filter((p: PhotoValidation) => p.validation.trustScore === null);
        } else if (filter === 'validated') {
          filteredPhotos = filteredPhotos.filter((p: PhotoValidation) => p.validation.trustScore !== null);
        } else if (filter === 'untrusted') {
          filteredPhotos = filteredPhotos.filter((p: PhotoValidation) => 
            p.validation.trustScore !== null && p.validation.trustScore < 40
          );
        }
        
        setPhotos(filteredPhotos);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch photos:', error);
      toast({
        title: 'Error',
        description: 'Failed to load photos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Fetch photo detail
  const fetchPhotoDetail = async (photoId: string) => {
    try {
      setDetailLoading(true);
      const response = await fetch(`/api/photos/validate?photoId=${photoId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedPhoto(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch photo detail:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  // Validate single photo
  const validatePhoto = async (photoId: string) => {
    try {
      const formData = new FormData();
      formData.set('photoId', photoId);
      formData.set('revalidate', 'true');
      
      const response = await fetch('/api/photos/validate', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Validation Complete',
          description: `Trust Score: ${data.data.validation.trustScore}%`,
        });
        await fetchPhotos();
        if (selectedPhoto?.id === photoId) {
          await fetchPhotoDetail(photoId);
        }
      } else {
        toast({
          title: 'Validation Failed',
          description: data.error || 'Could not validate photo',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to validate photo',
        variant: 'destructive',
      });
    }
  };

  // Bulk validate
  const bulkValidate = async () => {
    if (selectedPhotos.size === 0) return;
    
    try {
      setBulkValidating(true);
      
      const response = await fetch('/api/photos/validate', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoIds: Array.from(selectedPhotos),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Bulk Validation Complete',
          description: `${data.data.processed} photos processed, ${data.data.errors} errors`,
        });
        setSelectedPhotos(new Set());
        await fetchPhotos();
      }
    } catch (error) {
      console.error('Bulk validation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to bulk validate photos',
        variant: 'destructive',
      });
    } finally {
      setBulkValidating(false);
    }
  };

  // Toggle photo selection
  const toggleSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  // Select all visible photos
  const selectAll = () => {
    const filtered = getFilteredPhotos();
    const newSet = new Set(selectedPhotos);
    filtered.forEach(p => newSet.add(p.id));
    setSelectedPhotos(newSet);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedPhotos(new Set());
  };

  // Get filtered photos by search
  const getFilteredPhotos = () => {
    if (!searchQuery) return photos;
    
    const query = searchQuery.toLowerCase();
    return photos.filter(p => 
      p.fileName.toLowerCase().includes(query) ||
      p.originalName?.toLowerCase().includes(query) ||
      p.jobCard.jobCardNumber.toLowerCase().includes(query) ||
      p.validation.device?.toLowerCase().includes(query)
    );
  };

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleString();
  };

  const filteredPhotos = getFilteredPhotos();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Photo Validation</h2>
          <p className="text-muted-foreground">
            Verify photo authenticity through EXIF metadata analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPhotos()}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <StatsCard
            title="Total Photos"
            value={stats.total}
            icon={Camera}
            color="bg-blue-100 text-blue-600"
          />
          <StatsCard
            title="Validated"
            value={stats.validated}
            icon={ShieldCheck}
            color="bg-emerald-100 text-emerald-600"
            description={`${stats.valid} valid, ${stats.invalid} invalid`}
          />
          <StatsCard
            title="Avg Trust Score"
            value={stats.averageTrustScore !== null ? `${stats.averageTrustScore}%` : '-'}
            icon={Shield}
            color="bg-slate-100 text-slate-600"
          />
          <StatsCard
            title="High Trust (80%+)"
            value={stats.highTrust}
            icon={CheckCircle}
            color="bg-emerald-100 text-emerald-600"
          />
          <StatsCard
            title="Untrusted (<40%)"
            value={stats.untrusted}
            icon={AlertTriangle}
            color="bg-red-100 text-red-600"
          />
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by filename, job card, device..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Photos</SelectItem>
            <SelectItem value="validated">Validated</SelectItem>
            <SelectItem value="unvalidated">Not Validated</SelectItem>
            <SelectItem value="high">High Trust (80%+)</SelectItem>
            <SelectItem value="medium">Medium Trust (60-79%)</SelectItem>
            <SelectItem value="low">Low Trust (40-59%)</SelectItem>
            <SelectItem value="untrusted">Untrusted (&lt;40%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Action Bar */}
      {selectedPhotos.size > 0 && (
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                  {selectedPhotos.size} selected
                </Badge>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
              <Button
                onClick={bulkValidate}
                disabled={bulkValidating}
                size="sm"
              >
                {bulkValidating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Validate Selected
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : filteredPhotos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileImage className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No photos found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredPhotos.map((photo) => {
            const isSelected = selectedPhotos.has(photo.id);
            const score = photo.validation.trustScore;
            
            return (
              <Card
                key={photo.id}
                className={cn(
                  "overflow-hidden cursor-pointer transition-all hover:shadow-md",
                  isSelected && "ring-2 ring-emerald-500"
                )}
              >
                <div 
                  className="relative aspect-square bg-muted"
                  onClick={() => fetchPhotoDetail(photo.id)}
                >
                  <img
                    src={photo.filePath}
                    alt={photo.originalName || photo.fileName}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Selection checkbox */}
                  <div
                    className="absolute top-2 left-2 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelection(photo.id);
                    }}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="bg-white/80"
                    />
                  </div>
                  
                  {/* Trust score overlay */}
                  <div className="absolute top-2 right-2">
                    <TrustScoreBadge score={score} />
                  </div>
                  
                  {/* Valid/Invalid indicator */}
                  {photo.validation.isValid !== null && (
                    <div className="absolute bottom-2 left-2">
                      {photo.validation.isValid ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600 bg-white rounded-full" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 bg-white rounded-full" />
                      )}
                    </div>
                  )}
                </div>
                
                <CardContent className="p-3">
                  <p className="text-sm font-medium truncate">
                    {photo.originalName || photo.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {photo.jobCard.jobCardNumber}
                  </p>
                  {photo.validation.device && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Smartphone className="h-3 w-3" />
                      {photo.validation.device}
                    </p>
                  )}
                  {photo.validation.warnings && photo.validation.warnings.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span className="text-xs text-amber-600">
                        {photo.validation.warnings.length} warning(s)
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Photo Detail Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photo Validation Details
            </DialogTitle>
            <DialogDescription>
              EXIF metadata analysis and authenticity verification
            </DialogDescription>
          </DialogHeader>
          
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          ) : selectedPhoto && (
            <div className="grid md:grid-cols-2 gap-4 overflow-y-auto">
              {/* Image Preview */}
              <div className="space-y-4">
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                  <img
                    src={selectedPhoto.filePath}
                    alt={selectedPhoto.originalName || selectedPhoto.fileName}
                    className="w-full h-full object-contain"
                  />
                </div>
                
                {/* Basic Info */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">File Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Filename:</span>
                      <span className="font-medium truncate ml-2">
                        {selectedPhoto.originalName || selectedPhoto.fileName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size:</span>
                      <span>{formatSize(selectedPhoto.fileSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span>{selectedPhoto.mimeType || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Uploaded:</span>
                      <span>{formatDate(selectedPhoto.uploadedAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Job Card:</span>
                      <span className="text-emerald-600">{selectedPhoto.jobCard.jobCardNumber}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Validation Results */}
              <div className="space-y-4">
                {/* Trust Score Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Trust Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedPhoto.validation.trustScore !== null ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <TrustScoreBadge score={selectedPhoto.validation.trustScore} />
                          <Badge variant={selectedPhoto.validation.isValid ? 'default' : 'destructive'}>
                            {selectedPhoto.validation.isValid ? 'Valid' : 'Invalid'}
                          </Badge>
                        </div>
                        <Progress 
                          value={selectedPhoto.validation.trustScore} 
                          className={cn(
                            "h-2",
                            selectedPhoto.validation.trustScore >= 80 ? "[&>div]:bg-emerald-500" :
                            selectedPhoto.validation.trustScore >= 60 ? "[&>div]:bg-amber-500" :
                            selectedPhoto.validation.trustScore >= 40 ? "[&>div]:bg-orange-500" :
                            "[&>div]:bg-red-500"
                          )}
                        />
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <Info className="h-8 w-8 mx-auto mb-2" />
                        <p>Not yet validated</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => validatePhoto(selectedPhoto.id)}
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Validate Now
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* EXIF Data */}
                {selectedPhoto.formattedExif && Object.keys(selectedPhoto.formattedExif).length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        EXIF Metadata
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2 text-sm">
                          {Object.entries(selectedPhoto.formattedExif).map(([key, value]) => (
                            <div key={key} className="flex justify-between py-1 border-b border-border/50">
                              <span className="text-muted-foreground">{key}</span>
                              <span className="font-medium">{value}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
                
                {/* Warnings */}
                {selectedPhoto.validation.warnings && selectedPhoto.validation.warnings.length > 0 && (
                  <Card className="border-amber-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        Validation Warnings ({selectedPhoto.validation.warnings.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-[200px]">
                        <div className="space-y-2">
                          {selectedPhoto.validation.warnings.map((warning, index) => (
                            <div
                              key={index}
                              className={cn(
                                "p-2 rounded-lg text-sm",
                                warning.severity === 'HIGH' && "bg-red-50 border border-red-200",
                                warning.severity === 'MEDIUM' && "bg-amber-50 border border-amber-200",
                                warning.severity === 'LOW' && "bg-slate-50 border border-slate-200"
                              )}
                            >
                              <div className="flex items-start gap-2">
                                {warning.severity === 'HIGH' ? (
                                  <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                                ) : warning.severity === 'MEDIUM' ? (
                                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                                ) : (
                                  <Info className="h-4 w-4 text-slate-500 mt-0.5" />
                                )}
                                <div>
                                  <WarningBadge warning={warning} />
                                  <p className="mt-1 text-muted-foreground">{warning.message}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
                
                {/* GPS Location */}
                {selectedPhoto.validation.latitude && selectedPhoto.validation.longitude && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Capture Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Latitude:</span>
                        <span>{selectedPhoto.validation.latitude.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Longitude:</span>
                        <span>{selectedPhoto.validation.longitude.toFixed(6)}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => {
                          window.open(
                            `https://www.google.com/maps?q=${selectedPhoto.validation.latitude},${selectedPhoto.validation.longitude}`,
                            '_blank'
                          );
                        }}
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        View on Map
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPhoto(null)}>
              Close
            </Button>
            {selectedPhoto && (
              <Button onClick={() => validatePhoto(selectedPhoto.id)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Revalidate
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
