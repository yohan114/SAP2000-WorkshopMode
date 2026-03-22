'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Camera, Upload, X, Trash2, Download, ZoomIn, Image as ImageIcon, 
  Plus, AlertCircle, CheckCircle, Clock, Package, Send, Wrench,
  Shield, Eye, FileImage, ChevronLeft, ChevronRight, Loader2,
  Edit, Move, Tag, Info, CheckSquare, Square, XCircle, Copy,
  RotateCcw, FileUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/hooks';
import { useToast } from '@/hooks/use-toast';

interface PhotoCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  sequence: number;
  minPhotos: number;
  maxPhotos: number;
  isRequired: boolean;
  isActive: boolean;
  photoCount: number;
  photos: JcPhoto[];
}

interface JcPhoto {
  id: string;
  filePath: string;
  fileName: string;
  originalName?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  description?: string;
  uploadedAt: string;
  uploadedBy?: string;
  tags?: string[];
  category?: { id: string; code: string; name: string };
  uploader?: { id: string; name: string; email: string };
}

interface JobCardPhotosProps {
  jobCardId: string;
  jobCardNumber: string;
  jobCardStatus: string;
  canUpload?: boolean;
}

// Category icons mapping
const categoryIcons: Record<string, React.ElementType> = {
  'BEFORE_START': Clock,
  'DURING_JOB': Wrench,
  'AFTER_JOB': CheckCircle,
  'SPARE_PARTS_REQUEST': Package,
  'SAMPLE_SENDING': Send,
  'RECEIVED_ITEMS': Package,
  'DEFECT_FOUND': AlertCircle,
  'REPAIR_WORK': Wrench,
  'SAFETY_HAZARD': Shield,
  'FINAL_INSPECTION': Eye,
  'OTHER': ImageIcon,
};

export function JobCardPhotos({ 
  jobCardId, 
  jobCardNumber, 
  jobCardStatus,
  canUpload = true 
}: JobCardPhotosProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<PhotoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('BEFORE_START');
  const [viewingPhoto, setViewingPhoto] = useState<JcPhoto | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>('BEFORE_START');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [stats, setStats] = useState({ totalPhotos: 0, totalSize: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Edit photo state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<JcPhoto | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Bulk operations state
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [showBulkMoveDialog, setShowBulkMoveDialog] = useState(false);
  const [bulkMoveCategory, setBulkMoveCategory] = useState('');
  const [processingBulk, setProcessingBulk] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  // Fetch photos and categories
  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[JobCardPhotos] Fetching photos for job card:', jobCardId);
      const response = await fetch(`/api/job-cards/${jobCardId}/photos?t=${Date.now()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[JobCardPhotos] API response:', { 
        success: data.success, 
        hasData: !!data.data,
        categoriesCount: data.data?.categories?.length 
      });
      
      if (data.success && data.data) {
        const fetchedCategories = data.data.categories || [];
        console.log('[JobCardPhotos] Setting categories:', fetchedCategories.length, fetchedCategories.map(c => c.name));
        setCategories(fetchedCategories);
        setStats(data.data.stats || { totalPhotos: 0, totalSize: 0 });
      } else {
        console.error('[JobCardPhotos] API returned error:', data.error || data.message);
      }
    } catch (error) {
      console.error('[JobCardPhotos] Failed to fetch photos:', error);
    } finally {
      setLoading(false);
    }
  }, [jobCardId]);

  // Fetch categories only (fallback)
  const fetchCategoriesOnly = useCallback(async () => {
    try {
      console.log('Fetching categories from fallback API...');
      const response = await fetch('/api/photo-categories?limit=50&isActive=true');
      if (response.ok) {
        const data = await response.json();
        console.log('Fallback API response:', data);
        if (data.success) {
          // Handle both paginated response (data.data is array) and direct array response
          const categoriesArray = Array.isArray(data.data) ? data.data : (data.data?.data || []);
          
          // Transform to match expected format with empty photos array
          const cats = categoriesArray.map((cat: { id: string; code: string; name: string; description?: string; sequence: number; minPhotos: number; maxPhotos: number; isRequired: boolean; isActive: boolean; categoryType?: string }) => ({
            ...cat,
            photos: [],
            photoCount: 0
          }));
          console.log('Setting categories from fallback:', cats.length);
          setCategories(cats);
        }
      } else {
        console.error('Fallback API returned non-OK:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  // Process selected files
  const processFiles = (files: File[]) => {
    // Filter only image files
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length < files.length) {
      toast({
        title: 'Some files skipped',
        description: 'Only image files are allowed',
        variant: 'destructive'
      });
    }
    
    if (imageFiles.length > 50) {
      toast({
        title: 'Too many files',
        description: 'Maximum 50 images allowed per upload',
        variant: 'destructive'
      });
      imageFiles.splice(50);
    }
    
    setSelectedFiles(imageFiles);
    
    // Create preview URLs
    const urls = imageFiles.map(f => URL.createObjectURL(f));
    setPreviewUrls(urls);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  // Upload photos
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      setUploading(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append('categoryCode', uploadCategory);
      formData.append('description', uploadDescription);
      formData.append('uploadedBy', user?.id || '');
      
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
      
      const response = await fetch(`/api/job-cards/${jobCardId}/photos`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: 'Upload successful',
          description: `${data.data.uploaded || selectedFiles.length} photo(s) uploaded successfully`,
        });
        setShowUploadDialog(false);
        setSelectedFiles([]);
        setPreviewUrls([]);
        setUploadDescription('');
        await fetchPhotos();
      } else {
        const errorMsg = data.error || data.message || 'Failed to upload photos';
        toast({
          title: 'Upload failed',
          description: errorMsg,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Please check your connection and try again.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      setUploadProgress(100);
    }
  };

  // Delete photo
  const handleDeletePhoto = async (photoId: string, permanent = false) => {
    try {
      const url = `/api/job-cards/${jobCardId}/photos/${photoId}${permanent ? '?permanent=true' : ''}`;
      const response = await fetch(url, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Photo deleted',
          description: permanent ? 'Photo permanently deleted' : 'Photo moved to trash',
        });
        await fetchPhotos();
        setViewingPhoto(null);
        setSelectedPhotos(prev => {
          const newSet = new Set(prev);
          newSet.delete(photoId);
          return newSet;
        });
      } else {
        toast({
          title: 'Delete failed',
          description: data.error || 'Failed to delete photo',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: 'An error occurred while deleting the photo',
        variant: 'destructive'
      });
    }
  };

  // Open edit dialog
  const openEditDialog = (photo: JcPhoto) => {
    setEditingPhoto(photo);
    setEditDescription(photo.description || '');
    setEditCategory(photo.category?.code || 'OTHER');
    setEditTags(photo.tags || []);
    setShowEditDialog(true);
  };

  // Save photo edits
  const handleSaveEdit = async () => {
    if (!editingPhoto) return;
    
    try {
      setSaving(true);
      
      const response = await fetch(`/api/job-cards/${jobCardId}/photos/${editingPhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editDescription,
          categoryCode: editCategory,
          tags: editTags
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Photo updated',
          description: 'Photo details have been saved',
        });
        setShowEditDialog(false);
        setEditingPhoto(null);
        await fetchPhotos();
      } else {
        toast({
          title: 'Update failed',
          description: data.error || 'Failed to update photo',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: 'Update failed',
        description: 'An error occurred while updating the photo',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Add tag
  const handleAddTag = () => {
    if (newTag.trim() && !editTags.includes(newTag.trim())) {
      setEditTags([...editTags, newTag.trim()]);
      setNewTag('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(tag => tag !== tagToRemove));
  };

  // Toggle photo selection
  const togglePhotoSelection = (photoId: string) => {
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

  // Select all photos in current category
  const selectAllInCategory = () => {
    const currentCategory = categories.find(c => c.code === selectedCategory);
    if (currentCategory) {
      const newSet = new Set(selectedPhotos);
      currentCategory.photos.forEach(p => newSet.add(p.id));
      setSelectedPhotos(newSet);
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedPhotos(new Set());
  };

  // Bulk move photos
  const handleBulkMove = async () => {
    if (selectedPhotos.size === 0 || !bulkMoveCategory) return;
    
    try {
      setProcessingBulk(true);
      
      const promises = Array.from(selectedPhotos).map(photoId => 
        fetch(`/api/job-cards/${jobCardId}/photos/${photoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryCode: bulkMoveCategory })
        })
      );
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      toast({
        title: 'Photos moved',
        description: `${successful} photo(s) moved to ${categories.find(c => c.code === bulkMoveCategory)?.name || 'new category'}`,
      });
      
      setShowBulkMoveDialog(false);
      setSelectedPhotos(new Set());
      setBulkMoveCategory('');
      await fetchPhotos();
    } catch (error) {
      console.error('Bulk move error:', error);
      toast({
        title: 'Move failed',
        description: 'An error occurred while moving photos',
        variant: 'destructive'
      });
    } finally {
      setProcessingBulk(false);
    }
  };

  // Bulk delete photos
  const handleBulkDelete = async (permanent = false) => {
    if (selectedPhotos.size === 0) return;
    
    try {
      setProcessingBulk(true);
      
      const promises = Array.from(selectedPhotos).map(photoId => 
        fetch(`/api/job-cards/${jobCardId}/photos/${photoId}${permanent ? '?permanent=true' : ''}`, {
          method: 'DELETE'
        })
      );
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      toast({
        title: 'Photos deleted',
        description: `${successful} photo(s) ${permanent ? 'permanently ' : ''}deleted`,
      });
      
      setSelectedPhotos(new Set());
      await fetchPhotos();
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: 'Delete failed',
        description: 'An error occurred while deleting photos',
        variant: 'destructive'
      });
    } finally {
      setProcessingBulk(false);
    }
  };

  // Navigate photos in viewer
  const navigatePhoto = (direction: 'prev' | 'next') => {
    const currentCategory = categories.find(c => c.code === selectedCategory);
    if (!currentCategory || currentCategory.photos.length === 0) return;
    
    let newIndex = photoIndex;
    if (direction === 'prev') {
      newIndex = photoIndex > 0 ? photoIndex - 1 : currentCategory.photos.length - 1;
    } else {
      newIndex = photoIndex < currentCategory.photos.length - 1 ? photoIndex + 1 : 0;
    }
    
    setPhotoIndex(newIndex);
    setViewingPhoto(currentCategory.photos[newIndex]);
  };

  // Copy photo URL to clipboard
  const copyPhotoUrl = async (photo: JcPhoto) => {
    try {
      const processedPath = photo.filePath.startsWith('/uploads/') ? `/api${photo.filePath}` : photo.filePath;
      const url = window.location.origin + processedPath;
      await navigator.clipboard.writeText(url);
      toast({
        title: 'URL copied',
        description: 'Photo URL copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Could not copy URL to clipboard',
        variant: 'destructive'
      });
    }
  };

  // Handle broken image
  const handleImageError = (photoId: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    setBrokenImages(prev => new Set(prev).add(photoId));
    e.currentTarget.style.display = 'none';
  };

  // Get image URL from file path
  const getImageUrl = (filePath: string) => {
    return filePath?.startsWith('/uploads/') ? `/api${filePath}` : filePath;
  };

  // Broken image placeholder component
  const BrokenImagePlaceholder = ({ className = '' }: { className?: string }) => (
    <div className={cn('flex flex-col items-center justify-center bg-muted/80 text-muted-foreground', className)}>
      <ImageIcon className="h-8 w-8 mb-1 opacity-50" />
      <span className="text-xs opacity-60">Image unavailable</span>
    </div>
  );

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Get category progress
  const getCategoryProgress = (category: PhotoCategory) => {
    const count = category.photoCount;
    const max = category.maxPhotos;
    
    if (count >= max) return 100;
    return Math.round((count / max) * 100);
  };

  // Get category status
  const getCategoryStatus = (category: PhotoCategory) => {
    const count = category.photoCount;
    const min = category.minPhotos;
    
    if (category.isRequired && count < min) {
      return 'incomplete';
    }
    if (count >= category.maxPhotos) {
      return 'full';
    }
    if (count >= min) {
      return 'sufficient';
    }
    return 'empty';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold">Job Card Photos</h3>
          <p className="text-sm text-muted-foreground">
            {jobCardNumber} • {stats.totalPhotos} photos • {formatSize(stats.totalSize)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canUpload && (
            <>
              <Button
                variant={bulkMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setBulkMode(!bulkMode);
                  if (bulkMode) {
                    setSelectedPhotos(new Set());
                  }
                }}
                className="gap-2"
              >
                {bulkMode ? (
                  <>
                    <XCircle className="h-4 w-4" />
                    Cancel
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    Select
                  </>
                )}
              </Button>
              <Dialog open={showUploadDialog} onOpenChange={(open) => {
                setShowUploadDialog(open);
                if (open && categories.length === 0) {
                  console.log('Opening upload dialog with empty categories, fetching...');
                  fetchCategoriesOnly();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    Upload Photos
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Upload Job Card Photos</DialogTitle>
                    <DialogDescription>
                      Select images to upload. Maximum 50 images per upload.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Category {categories.length === 0 && <span className="text-amber-500 text-xs">(Loading categories...)</span>}</Label>
                      <Select value={uploadCategory} onValueChange={setUploadCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder={categories.length === 0 ? "Loading categories..." : "Select category"} />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.length === 0 ? (
                            <div className="px-2 py-4 text-center text-muted-foreground">
                              Loading categories...
                            </div>
                          ) : (
                            categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.code}>
                                <div className="flex items-center gap-2">
                                  <span>{cat.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({cat.photoCount}/{cat.maxPhotos})
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Textarea
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        placeholder="Add a description for these photos..."
                        rows={2}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Select Images</Label>
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                          isDragging 
                            ? "border-emerald-500 bg-emerald-50" 
                            : "border-gray-300 hover:border-gray-400"
                        )}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FileUp className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Drag & drop images here, or <span className="text-emerald-600 font-medium">browse</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Supported: JPG, PNG, GIF, WebP (max 10MB each, 50 images max)
                        </p>
                      </div>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                    
                    {previewUrls.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>{selectedFiles.length} image(s) selected</Label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setSelectedFiles([]);
                              setPreviewUrls([]);
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Clear
                          </Button>
                        </div>
                        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                          {previewUrls.map((url, index) => (
                            <div key={index} className="aspect-square rounded-lg overflow-hidden border relative group">
                              <img
                                src={url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-xs text-center px-1 truncate">
                                  {selectedFiles[index]?.name}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {uploading && (
                      <div className="space-y-2">
                        <Progress value={uploadProgress} />
                        <p className="text-sm text-center text-muted-foreground">
                          Uploading... {uploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpload} 
                      disabled={selectedFiles.length === 0 || uploading}
                    >
                      {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Image(s)`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Bulk operations bar */}
      {bulkMode && selectedPhotos.size > 0 && (
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
              <div className="flex items-center gap-2">
                <Dialog open={showBulkMoveDialog} onOpenChange={setShowBulkMoveDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Move className="h-4 w-4" />
                      Move to...
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Move Photos</DialogTitle>
                      <DialogDescription>
                        Select a category to move {selectedPhotos.size} photo(s)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label>Target Category</Label>
                      <Select value={bulkMoveCategory} onValueChange={setBulkMoveCategory}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.code}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowBulkMoveDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleBulkMove}
                        disabled={!bulkMoveCategory || processingBulk}
                      >
                        {processingBulk ? 'Moving...' : 'Move Photos'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Selected Photos</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedPhotos.size} photo(s)? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleBulkDelete(false)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category tabs */}
      {categories.length === 0 && !loading && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-amber-800">No categories loaded</p>
            <p className="text-sm text-amber-600 mt-2">
              There was an issue loading photo categories. Please refresh the page.
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => fetchCategoriesOnly()}
            >
              Retry Loading Categories
            </Button>
          </CardContent>
        </Card>
      )}
      
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
          {categories.map(category => {
            const Icon = categoryIcons[category.code] || ImageIcon;
            const status = getCategoryStatus(category);
            
            return (
              <TabsTrigger
                key={category.id}
                value={category.code}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border",
                  "data-[state=active]:bg-emerald-50 data-[state=active]:border-emerald-200",
                  status === 'incomplete' && "border-red-200 bg-red-50/50",
                  status === 'full' && "border-green-200 bg-green-50/50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{category.name}</span>
                <Badge variant="outline" className="ml-1 text-xs">
                  {category.photoCount}/{category.maxPhotos}
                </Badge>
                {category.isRequired && status === 'incomplete' && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category.id} value={category.code} className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    {bulkMode && category.photos.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={selectAllInCategory}>
                        Select All
                      </Button>
                    )}
                    <div className="text-right">
                      <p className="text-sm font-medium">{category.photoCount} / {category.maxPhotos} photos</p>
                      <Progress 
                        value={getCategoryProgress(category)} 
                        className="w-24 h-2 mt-1"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {category.photos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No photos uploaded</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {category.isRequired 
                        ? `${category.minPhotos} photo(s) required` 
                        : 'Click "Upload Photos" to add images'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {category.photos.map((photo, index) => {
                      const isSelected = selectedPhotos.has(photo.id);
                      
                      return (
                        <div
                          key={photo.id}
                          className={cn(
                            "group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer",
                            isSelected && "ring-2 ring-emerald-500 ring-offset-2"
                          )}
                          onClick={() => {
                            if (bulkMode) {
                              togglePhotoSelection(photo.id);
                            } else {
                              setPhotoIndex(index);
                              setViewingPhoto(photo);
                            }
                          }}
                        >
                          {brokenImages.has(photo.id) ? (
                            <BrokenImagePlaceholder className="w-full h-full" />
                          ) : (
                            <img
                              src={getImageUrl(photo.filePath)}
                              alt={photo.originalName || photo.fileName}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              onError={(e) => handleImageError(photo.id, e)}
                            />
                          )}
                          
                          {/* Selection checkbox */}
                          {bulkMode && (
                            <div className="absolute top-2 left-2 z-10">
                              {isSelected ? (
                                <CheckSquare className="h-6 w-6 text-emerald-600 bg-card rounded" />
                              ) : (
                                <Square className="h-6 w-6 text-gray-400 bg-card rounded" />
                              )}
                            </div>
                          )}
                          
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-xs text-white truncate">
                                {photo.originalName || photo.fileName}
                              </p>
                              <p className="text-xs text-white/70">
                                {formatSize(photo.fileSize)}
                              </p>
                            </div>
                            
                            {/* Action buttons - only show when not in bulk mode */}
                            {!bulkMode && (
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDialog(photo);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(getImageUrl(photo.filePath), '_blank');
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                {canUpload && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="destructive"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this photo? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeletePhoto(photo.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Photo viewer dialog */}
      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          {viewingPhoto && (
            <>
              <div className="relative">
                {brokenImages.has(viewingPhoto.id) ? (
                  <div className="w-full h-[50vh] flex items-center justify-center bg-black">
                    <div className="flex flex-col items-center gap-3 text-white/60">
                      <ImageIcon className="h-16 w-16" />
                      <p className="text-lg">Image unavailable</p>
                      <p className="text-sm text-white/40">{viewingPhoto.originalName || viewingPhoto.fileName}</p>
                    </div>
                  </div>
                ) : (
                  <img
                    src={getImageUrl(viewingPhoto.filePath)}
                    alt={viewingPhoto.originalName || viewingPhoto.fileName}
                    className="w-full max-h-[70vh] object-contain bg-black"
                    onError={(e) => handleImageError(viewingPhoto.id, e)}
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => navigatePhoto('prev')}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => navigatePhoto('next')}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
              <div className="p-4 border-t">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{viewingPhoto.originalName || viewingPhoto.fileName}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                      <span>{formatSize(viewingPhoto.fileSize)}</span>
                      <span>•</span>
                      <span>Uploaded: {new Date(viewingPhoto.uploadedAt).toLocaleString()}</span>
                      {viewingPhoto.uploader && (
                        <>
                          <span>•</span>
                          <span>By: {viewingPhoto.uploader.name}</span>
                        </>
                      )}
                      {viewingPhoto.category && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 font-medium">{viewingPhoto.category.name}</span>
                        </>
                      )}
                    </div>
                    {viewingPhoto.description && (
                      <p className="text-sm mt-2">{viewingPhoto.description}</p>
                    )}
                    {viewingPhoto.tags && viewingPhoto.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {viewingPhoto.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyPhotoUrl(viewingPhoto)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy URL
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setViewingPhoto(null);
                        openEditDialog(viewingPhoto);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getImageUrl(viewingPhoto.filePath), '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    {canUpload && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this photo? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeletePhoto(viewingPhoto.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit photo dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Photo</DialogTitle>
            <DialogDescription>
              Update photo details, category, and tags.
            </DialogDescription>
          </DialogHeader>
          
          {editingPhoto && (
            <div className="space-y-4 py-4">
              {/* Preview */}
              <div className="aspect-video rounded-lg overflow-hidden border bg-muted">
                {brokenImages.has(editingPhoto.id) ? (
                  <BrokenImagePlaceholder className="w-full h-full" />
                ) : (
                  <img
                    src={getImageUrl(editingPhoto.filePath)}
                    alt={editingPhoto.originalName || editingPhoto.fileName}
                    className="w-full h-full object-contain"
                    onError={(e) => handleImageError(editingPhoto.id, e)}
                  />
                )}
              </div>
              
              {/* Category */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.code}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Description */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={3}
                />
              </div>
              
              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button variant="outline" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                {editTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editTags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        <Tag className="h-3 w-3" />
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer ml-1"
                          onClick={() => handleRemoveTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              {/* File info */}
              <div className="text-sm text-muted-foreground bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Info className="h-4 w-4" />
                  <span className="font-medium">File Information</span>
                </div>
                <p>Name: {editingPhoto.originalName || editingPhoto.fileName}</p>
                <p>Size: {formatSize(editingPhoto.fileSize)}</p>
                <p>Uploaded: {new Date(editingPhoto.uploadedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload requirements summary */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Required (incomplete)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Complete</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Sufficient</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <span>Optional</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
