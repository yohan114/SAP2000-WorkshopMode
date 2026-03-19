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
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Camera, Upload, X, Trash2, Download, ZoomIn, Image as ImageIcon, 
  Plus, AlertCircle, CheckCircle, Clock, Package, Send, Wrench,
  Shield, Eye, FileImage, ChevronLeft, ChevronRight, Loader2,
  Edit, Move, Tag, Info, CheckSquare, Square, XCircle, Copy,
  RotateCcw, FileUp, Search, FileArchive, Droplet, Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/hooks';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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

// Image compression utility
async function compressImage(file: File, quality: number, maxWidth: number, maxHeight: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Return original if canvas fails
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          file.type,
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// Add watermark to image
async function addWatermark(file: File, watermarkText: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Add watermark
        const fontSize = Math.max(16, Math.min(img.width, img.height) / 20);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;

        // Position watermark at bottom-right
        const padding = 20;
        const textWidth = ctx.measureText(watermarkText).width;
        const x = img.width - textWidth - padding;
        const y = img.height - padding;

        ctx.strokeText(watermarkText, x, y);
        ctx.fillText(watermarkText, x, y);

        // Add timestamp
        const timestamp = new Date().toLocaleString();
        ctx.font = `${fontSize * 0.7}px Arial`;
        const tsWidth = ctx.measureText(timestamp).width;
        ctx.strokeText(timestamp, img.width - tsWidth - padding, y - fontSize - 5);
        ctx.fillText(timestamp, img.width - tsWidth - padding, y - fontSize - 5);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const watermarkedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(watermarkedFile);
          },
          file.type,
          0.92
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// Loading Skeleton Components
function CategoryTabsSkeleton() {
  return (
    <div className="flex flex-wrap gap-2" role="status" aria-label="Loading categories">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="h-10 w-32 rounded-lg"
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
      <span className="sr-only">Loading photo categories...</span>
    </div>
  );
}

function PhotoGridSkeleton() {
  return (
    <div 
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
      role="status" 
      aria-label="Loading photos"
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="aspect-square rounded-lg animate-pulse"
          style={{ animationDelay: `${i * 50}ms` }}
        />
      ))}
      <span className="sr-only">Loading photos...</span>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
  );
}

export function JobCardPhotos({ 
  jobCardId, 
  jobCardNumber, 
  jobCardStatus,
  canUpload = true 
}: JobCardPhotosProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoViewerRef = useRef<HTMLDivElement>(null);
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
  
  // Image processing options
  const [enableCompression, setEnableCompression] = useState(true);
  const [compressionQuality, setCompressionQuality] = useState(0.8);
  const [maxImageWidth, setMaxImageWidth] = useState(1920);
  const [maxImageHeight, setMaxImageHeight] = useState(1080);
  const [enableWatermark, setEnableWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState(jobCardNumber);
  const [processingImages, setProcessingImages] = useState(false);
  
  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPhotos, setFilteredPhotos] = useState<JcPhoto[]>([]);
  
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
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Fetch categories only (fallback)
  const fetchCategoriesOnly = useCallback(async () => {
    try {
      console.log('[JobCardPhotos] Fetching categories from fallback API...');
      const response = await fetch('/api/photo-categories?limit=50&isActive=true');
      if (response.ok) {
        const data = await response.json();
        console.log('[JobCardPhotos] Fallback API response:', data);
        if (data.success) {
          const categoriesArray = Array.isArray(data.data) ? data.data : (data.data?.data || []);
          
          const cats = categoriesArray.map((cat: { id: string; code: string; name: string; description?: string; sequence: number; minPhotos: number; maxPhotos: number; isRequired: boolean; isActive: boolean; categoryType?: string }) => ({
            ...cat,
            photos: [],
            photoCount: 0
          }));
          console.log('[JobCardPhotos] Setting categories from fallback:', cats.length);
          setCategories(cats);
        }
      } else {
        console.error('[JobCardPhotos] Fallback API returned non-OK:', response.status);
      }
    } catch (error) {
      console.error('[JobCardPhotos] Failed to fetch categories:', error);
    }
  }, []);

  // Fetch photos and categories
  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[JobCardPhotos] Fetching photos for job card:', jobCardId);
      const response = await fetch(`/api/job-cards/${jobCardId}/photos`);
      
      console.log('[JobCardPhotos] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[JobCardPhotos] API error response:', errorText);
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
        console.log('[JobCardPhotos] Trying fallback categories API...');
        await fetchCategoriesOnly();
      }
    } catch (error) {
      console.error('[JobCardPhotos] Failed to fetch photos:', error);
      await fetchCategoriesOnly();
    } finally {
      setLoading(false);
    }
  }, [jobCardId, fetchCategoriesOnly]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Filter photos based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPhotos([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const allPhotos = categories.flatMap(c => c.photos);
    const filtered = allPhotos.filter(photo => 
      (photo.originalName || photo.fileName).toLowerCase().includes(query) ||
      (photo.description || '').toLowerCase().includes(query) ||
      (photo.tags || []).some(tag => tag.toLowerCase().includes(query))
    );
    setFilteredPhotos(filtered);
  }, [searchQuery, categories]);

  // Keyboard navigation for photo viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!viewingPhoto) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigatePhoto('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigatePhoto('next');
          break;
        case 'Escape':
          e.preventDefault();
          setViewingPhoto(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingPhoto]);

  // Focus management for photo viewer
  useEffect(() => {
    if (viewingPhoto && photoViewerRef.current) {
      photoViewerRef.current.focus();
    }
  }, [viewingPhoto]);

  // Screen reader announcements for upload progress
  const announceProgress = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  }, []);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  // Process selected files
  const processFiles = (files: File[]) => {
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

  // Process and upload photos
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      setUploading(true);
      setUploadProgress(0);
      setProcessingImages(true);
      
      // Process images (compress and/or watermark)
      let processedFiles = [...selectedFiles];
      
      if (enableCompression) {
        const message = `Compressing ${processedFiles.length} image(s)...`;
        toast({
          title: 'Processing images',
          description: message,
        });
        announceProgress(message);
        
        processedFiles = await Promise.all(
          processedFiles.map(file => 
            compressImage(file, compressionQuality, maxImageWidth, maxImageHeight)
          )
        );
      }
      
      if (enableWatermark && watermarkText) {
        const message = `Adding watermark to ${processedFiles.length} image(s)...`;
        toast({
          title: 'Adding watermarks',
          description: message,
        });
        announceProgress(message);
        
        processedFiles = await Promise.all(
          processedFiles.map(file => addWatermark(file, watermarkText))
        );
      }
      
      setProcessingImages(false);
      setUploadProgress(20);
      announceProgress('Uploading photos, 20% complete');
      
      const formData = new FormData();
      formData.append('categoryCode', uploadCategory);
      formData.append('description', uploadDescription);
      formData.append('uploadedBy', user?.id || '');
      
      processedFiles.forEach((file) => {
        formData.append('files', file);
      });
      
      setUploadProgress(40);
      announceProgress('Uploading photos, 40% complete');
      
      const response = await fetch(`/api/job-cards/${jobCardId}/photos`, {
        method: 'POST',
        body: formData,
      });
      
      setUploadProgress(80);
      announceProgress('Uploading photos, 80% complete');
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setUploadProgress(100);
        const successMessage = `${data.data.uploaded || processedFiles.length} photo(s) uploaded successfully`;
        toast({
          title: 'Upload successful',
          description: successMessage,
        });
        announceProgress(successMessage);
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
        announceProgress(`Upload failed: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Please check your connection and try again.',
        variant: 'destructive'
      });
      announceProgress('Upload failed. Please check your connection and try again.');
    } finally {
      setUploading(false);
      setProcessingImages(false);
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

  // Select all photos in all categories
  const selectAllPhotos = () => {
    const newSet = new Set<string>();
    categories.forEach(cat => cat.photos.forEach(p => newSet.add(p.id)));
    setSelectedPhotos(newSet);
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

  // Download selected photos as ZIP
  const handleDownloadZip = async () => {
    if (selectedPhotos.size === 0) return;
    
    try {
      setDownloadingZip(true);
      
      const zip = new JSZip();
      const photosFolder = zip.folder(`JobCard_${jobCardNumber}_Photos`);
      
      if (!photosFolder) {
        throw new Error('Failed to create ZIP folder');
      }
      
      // Get all selected photos
      const allPhotos = categories.flatMap(c => c.photos);
      const photosToDownload = allPhotos.filter(p => selectedPhotos.has(p.id));
      
      toast({
        title: 'Downloading photos',
        description: `Preparing ${photosToDownload.length} photo(s) for download...`,
      });
      
      // Download each photo
      for (let i = 0; i < photosToDownload.length; i++) {
        const photo = photosToDownload[i];
        try {
          const response = await fetch(photo.filePath);
          const blob = await response.blob();
          const fileName = photo.originalName || photo.fileName;
          photosFolder.file(fileName, blob);
        } catch (error) {
          console.error(`Failed to download photo ${photo.fileName}:`, error);
        }
      }
      
      // Generate and save ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `JobCard_${jobCardNumber}_Photos_${new Date().toISOString().split('T')[0]}.zip`);
      
      toast({
        title: 'Download complete',
        description: `${photosToDownload.length} photo(s) downloaded as ZIP`,
      });
      
      setSelectedPhotos(new Set());
    } catch (error) {
      console.error('ZIP download error:', error);
      toast({
        title: 'Download failed',
        description: 'Failed to create ZIP file',
        variant: 'destructive'
      });
    } finally {
      setDownloadingZip(false);
    }
  };

  // Download all photos as ZIP
  const handleDownloadAllZip = async () => {
    try {
      setDownloadingZip(true);
      
      const zip = new JSZip();
      const photosFolder = zip.folder(`JobCard_${jobCardNumber}_All_Photos`);
      
      if (!photosFolder) {
        throw new Error('Failed to create ZIP folder');
      }
      
      const allPhotos = categories.flatMap(c => c.photos);
      
      if (allPhotos.length === 0) {
        toast({
          title: 'No photos',
          description: 'There are no photos to download',
          variant: 'destructive'
        });
        return;
      }
      
      toast({
        title: 'Downloading photos',
        description: `Preparing ${allPhotos.length} photo(s) for download...`,
      });
      
      for (const photo of allPhotos) {
        try {
          const response = await fetch(photo.filePath);
          const blob = await response.blob();
          const category = photo.category?.name || 'Other';
          const categoryFolder = photosFolder.folder(category);
          if (categoryFolder) {
            categoryFolder.file(photo.originalName || photo.fileName, blob);
          }
        } catch (error) {
          console.error(`Failed to download photo ${photo.fileName}:`, error);
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `JobCard_${jobCardNumber}_All_Photos_${new Date().toISOString().split('T')[0]}.zip`);
      
      toast({
        title: 'Download complete',
        description: `${allPhotos.length} photo(s) downloaded as ZIP`,
      });
    } catch (error) {
      console.error('ZIP download error:', error);
      toast({
        title: 'Download failed',
        description: 'Failed to create ZIP file',
        variant: 'destructive'
      });
    } finally {
      setDownloadingZip(false);
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
      const url = window.location.origin + photo.filePath;
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

  // Calculate total original size vs compressed size
  const calculateSizeReduction = () => {
    if (selectedFiles.length === 0) return null;
    const originalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);
    return formatSize(originalSize);
  };

  // Loading state with skeletons
  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <HeaderSkeleton />
        <CategoryTabsSkeleton />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <PhotoGridSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header with stats and search */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold">Job Card Photos</h3>
          <p className="text-sm text-muted-foreground">
            {jobCardNumber} • {stats.totalPhotos} photos • {formatSize(stats.totalSize)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search photos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-48"
              aria-label="Search photos by name, description, or tags"
            />
          </div>
          
          {/* Download all as ZIP */}
          {stats.totalPhotos > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAllZip}
              disabled={downloadingZip}
              className="gap-2 min-h-[44px]"
              aria-label={downloadingZip ? "Downloading all photos" : "Download all photos as ZIP"}
              aria-busy={downloadingZip}
            >
              {downloadingZip ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <FileArchive className="h-4 w-4" aria-hidden="true" />
              )}
              <span className="hidden sm:inline">Download All</span>
              <span className="sm:hidden">Download</span>
            </Button>
          )}
          
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
                className="gap-2 min-h-[44px]"
                aria-pressed={bulkMode}
                aria-label={bulkMode ? "Exit selection mode" : "Enter selection mode for bulk operations"}
              >
                {bulkMode ? (
                  <>
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Cancel</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Select</span>
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
                  <Button className="gap-2 min-h-[44px]" aria-label="Upload new photos">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Upload Photos</span>
                    <span className="sm:hidden">Upload</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
                  <DialogHeader>
                    <DialogTitle>Upload Job Card Photos</DialogTitle>
                    <DialogDescription>
                      Select images to upload. Maximum 50 images per upload.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Category Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="upload-category">Category {categories.length === 0 && <span className="text-amber-500 text-xs">(Loading categories...)</span>}</Label>
                      <Select value={uploadCategory} onValueChange={setUploadCategory}>
                        <SelectTrigger id="upload-category" aria-describedby="category-help">
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
                    
                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="upload-description">Description (optional)</Label>
                      <Textarea
                        id="upload-description"
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        placeholder="Add a description for these photos..."
                        rows={2}
                      />
                    </div>
                    
                    {/* Image Processing Options */}
                    <Card className="bg-slate-50 dark:bg-slate-900">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Filter className="h-4 w-4" aria-hidden="true" />
                          Image Processing Options
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Compression */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="enable-compression" className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" aria-hidden="true" />
                              Compress Images
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Reduce file size for faster uploads
                            </p>
                          </div>
                          <Switch
                            id="enable-compression"
                            checked={enableCompression}
                            onCheckedChange={setEnableCompression}
                            aria-describedby="compression-help"
                          />
                        </div>
                        
                        {enableCompression && (
                          <div className="space-y-3 pl-4 border-l-2 border-slate-200 animate-in slide-in-from-left-2 duration-200">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <Label htmlFor="compression-quality" className="text-xs">Quality</Label>
                                <span className="text-xs text-muted-foreground" aria-live="polite">{Math.round(compressionQuality * 100)}%</span>
                              </div>
                              <Slider
                                id="compression-quality"
                                value={[compressionQuality * 100]}
                                onValueChange={(v) => setCompressionQuality(v[0] / 100)}
                                min={50}
                                max={100}
                                step={5}
                                aria-label="Image compression quality"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label htmlFor="max-width" className="text-xs">Max Width</Label>
                                <Select value={String(maxImageWidth)} onValueChange={(v) => setMaxImageWidth(Number(v))}>
                                  <SelectTrigger id="max-width" className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1280">1280px</SelectItem>
                                    <SelectItem value="1920">1920px (HD)</SelectItem>
                                    <SelectItem value="2560">2560px (QHD)</SelectItem>
                                    <SelectItem value="3840">3840px (4K)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="max-height" className="text-xs">Max Height</Label>
                                <Select value={String(maxImageHeight)} onValueChange={(v) => setMaxImageHeight(Number(v))}>
                                  <SelectTrigger id="max-height" className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="720">720px</SelectItem>
                                    <SelectItem value="1080">1080px (HD)</SelectItem>
                                    <SelectItem value="1440">1440px (QHD)</SelectItem>
                                    <SelectItem value="2160">2160px (4K)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Watermark */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="enable-watermark" className="flex items-center gap-2">
                              <Droplet className="h-4 w-4" aria-hidden="true" />
                              Add Watermark
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Add text watermark to images
                            </p>
                          </div>
                          <Switch
                            id="enable-watermark"
                            checked={enableWatermark}
                            onCheckedChange={setEnableWatermark}
                          />
                        </div>
                        
                        {enableWatermark && (
                          <div className="space-y-2 pl-4 border-l-2 border-slate-200 animate-in slide-in-from-left-2 duration-200">
                            <Label htmlFor="watermark-text" className="text-xs">Watermark Text</Label>
                            <Input
                              id="watermark-text"
                              value={watermarkText}
                              onChange={(e) => setWatermarkText(e.target.value)}
                              placeholder="Enter watermark text..."
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* File Drop Zone */}
                    <div className="space-y-2">
                      <Label id="dropzone-label">Select Images</Label>
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer min-h-[120px] flex flex-col items-center justify-center",
                          isDragging 
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" 
                            : "border-gray-300 hover:border-gray-400"
                        )}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                        aria-labelledby="dropzone-label"
                        aria-describedby="dropzone-help"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            fileInputRef.current?.click();
                          }
                        }}
                      >
                        <FileUp className="h-10 w-10 mx-auto text-gray-400 mb-2" aria-hidden="true" />
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Drag & drop images here, or <span className="text-emerald-600 font-medium">browse</span>
                        </p>
                        <p id="dropzone-help" className="text-xs text-gray-400 mt-1">
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
                        aria-label="Select image files"
                      />
                    </div>
                    
                    {/* Preview */}
                    {previewUrls.length > 0 && (
                      <div className="space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <Label>{selectedFiles.length} image(s) selected ({calculateSizeReduction()})</Label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setSelectedFiles([]);
                              setPreviewUrls([]);
                            }}
                            aria-label="Clear all selected files"
                            className="min-h-[44px]"
                          >
                            <X className="h-4 w-4 mr-1" aria-hidden="true" />
                            Clear
                          </Button>
                        </div>
                        <ScrollArea className="max-h-48">
                          <div className="grid grid-cols-4 gap-2 pr-4">
                            {previewUrls.map((url, index) => (
                              <div 
                                key={index} 
                                className="aspect-square rounded-lg overflow-hidden border relative group animate-in zoom-in-50 duration-200"
                                style={{ animationDelay: `${index * 30}ms` }}
                              >
                                <img
                                  src={url}
                                  alt={`Preview ${index + 1}: ${selectedFiles[index]?.name || 'image'}`}
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
                        </ScrollArea>
                      </div>
                    )}
                    
                    {/* Progress */}
                    {(uploading || processingImages) && (
                      <div className="space-y-2 animate-in fade-in duration-200" role="status" aria-live="polite">
                        <Progress 
                          value={uploadProgress} 
                          className="h-2 transition-all duration-300"
                          aria-label={`Upload progress: ${uploadProgress}%`}
                        />
                        <p className="text-sm text-center text-muted-foreground">
                          {processingImages ? 'Processing images...' : `Uploading... ${uploadProgress}%`}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowUploadDialog(false)}
                      className="min-h-[44px]"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpload} 
                      disabled={selectedFiles.length === 0 || uploading || processingImages}
                      className="min-h-[44px]"
                      aria-busy={uploading || processingImages}
                    >
                      {uploading || processingImages ? 'Processing...' : `Upload ${selectedFiles.length} Image(s)`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchQuery && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 animate-in slide-in-from-top-2 duration-300">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="h-4 w-4" aria-hidden="true" />
                Search Results for &quot;{searchQuery}&quot;
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="min-h-[44px] min-w-[44px]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredPhotos.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No photos found matching your search</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer animate-in fade-in zoom-in-95 duration-200"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => {
                      setPhotoIndex(index);
                      setViewingPhoto(photo);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`View photo: ${photo.originalName || photo.fileName}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setPhotoIndex(index);
                        setViewingPhoto(photo);
                      }
                    }}
                  >
                    <img
                      src={photo.filePath}
                      alt={photo.originalName || photo.fileName}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/60 to-transparent">
                      <p className="text-xs text-white truncate">
                        {photo.originalName || photo.fileName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bulk operations bar */}
      {bulkMode && selectedPhotos.size > 0 && (
        <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800 animate-in slide-in-from-top-2 duration-300">
          <CardContent className="py-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100">
                  {selectedPhotos.size} selected
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={selectAllPhotos}
                  className="min-h-[44px]"
                  aria-label="Select all photos"
                >
                  Select All
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearSelection}
                  className="min-h-[44px]"
                  aria-label="Clear selection"
                >
                  Clear
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Download as ZIP */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 min-h-[44px]"
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                  aria-busy={downloadingZip}
                  aria-label="Download selected photos as ZIP"
                >
                  {downloadingZip ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <FileArchive className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="hidden sm:inline">Download ZIP</span>
                  <span className="sm:hidden">ZIP</span>
                </Button>
                
                {/* Move */}
                <Dialog open={showBulkMoveDialog} onOpenChange={setShowBulkMoveDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 min-h-[44px]"
                      aria-label="Move selected photos to another category"
                    >
                      <Move className="h-4 w-4" aria-hidden="true" />
                      Move to...
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="animate-in slide-in-from-bottom-4 duration-300">
                    <DialogHeader>
                      <DialogTitle>Move Photos</DialogTitle>
                      <DialogDescription>
                        Select a category to move {selectedPhotos.size} photo(s)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label htmlFor="bulk-move-category">Target Category</Label>
                      <Select value={bulkMoveCategory} onValueChange={setBulkMoveCategory}>
                        <SelectTrigger id="bulk-move-category" className="mt-2">
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
                      <Button 
                        variant="outline" 
                        onClick={() => setShowBulkMoveDialog(false)}
                        className="min-h-[44px]"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleBulkMove}
                        disabled={!bulkMoveCategory || processingBulk}
                        className="min-h-[44px]"
                        aria-busy={processingBulk}
                      >
                        {processingBulk ? 'Moving...' : 'Move Photos'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                {/* Delete */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="gap-2 min-h-[44px]"
                      aria-label="Delete selected photos"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
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
                      <AlertDialogCancel className="min-h-[44px]">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleBulkDelete(false)}
                        className="bg-red-600 hover:bg-red-700 min-h-[44px]"
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
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 animate-in fade-in duration-300">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" aria-hidden="true" />
            <p className="text-lg font-medium text-amber-800 dark:text-amber-200">No categories loaded</p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              There was an issue loading photo categories. Please refresh the page.
            </p>
            <Button 
              variant="outline" 
              className="mt-4 min-h-[44px]"
              onClick={() => fetchCategoriesOnly()}
              aria-label="Retry loading categories"
            >
              Retry Loading Categories
            </Button>
          </CardContent>
        </Card>
      )}
      
      {!searchQuery && (
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList 
            className="flex flex-wrap h-auto gap-1 bg-transparent p-0" 
            role="tablist"
            aria-label="Photo categories"
          >
            {categories.map((category, index) => {
              const Icon = categoryIcons[category.code] || ImageIcon;
              const status = getCategoryStatus(category);
              
              return (
                <TabsTrigger
                  key={category.id}
                  value={category.code}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 min-h-[44px]",
                    "data-[state=active]:bg-emerald-50 data-[state=active]:border-emerald-200",
                    "dark:data-[state=active]:bg-emerald-950 dark:data-[state=active]:border-emerald-800",
                    "hover:bg-slate-50 dark:hover:bg-slate-800",
                    status === 'incomplete' && "border-red-200 bg-red-50/50 dark:bg-red-950/50",
                    status === 'full' && "border-green-200 bg-green-50/50 dark:bg-green-950/50"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                  role="tab"
                  aria-selected={selectedCategory === category.code}
                  aria-controls={`tabpanel-${category.id}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{category.name}</span>
                  <span className="sm:hidden">{category.code.slice(0, 3)}</span>
                  <Badge variant="outline" className="ml-1 text-xs">
                    {category.photoCount}/{category.maxPhotos}
                  </Badge>
                  {category.isRequired && status === 'incomplete' && (
                    <AlertCircle className="h-4 w-4 text-red-500" aria-label="Required photos incomplete" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map(category => (
            <TabsContent 
              key={category.id} 
              value={category.code} 
              className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
              id={`tabpanel-${category.id}`}
              role="tabpanel"
              aria-label={`${category.name} photos`}
            >
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{category.name}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      {bulkMode && category.photos.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={selectAllInCategory}
                          className="min-h-[44px]"
                          aria-label={`Select all photos in ${category.name}`}
                        >
                          Select All
                        </Button>
                      )}
                      <div className="text-right">
                        <p className="text-sm font-medium">{category.photoCount} / {category.maxPhotos} photos</p>
                        <Progress 
                          value={getCategoryProgress(category)} 
                          className="w-24 h-2 mt-1"
                          aria-label={`${category.name} photo progress`}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {category.photos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Camera className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
                      <p className="text-muted-foreground">No photos uploaded</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {category.isRequired 
                          ? `${category.minPhotos} photo(s) required` 
                          : 'Click "Upload Photos" to add images'}
                      </p>
                    </div>
                  ) : (
                    <div 
                      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                      role="list"
                      aria-label={`${category.name} photos`}
                    >
                      {category.photos.map((photo, index) => {
                        const isSelected = selectedPhotos.has(photo.id);
                        
                        return (
                          <div
                            key={photo.id}
                            className={cn(
                              "group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer animate-in fade-in zoom-in-95 duration-200",
                              "transition-all duration-200 hover:shadow-lg",
                              isSelected && "ring-2 ring-emerald-500 ring-offset-2"
                            )}
                            style={{ animationDelay: `${index * 30}ms` }}
                            onClick={() => {
                              if (bulkMode) {
                                togglePhotoSelection(photo.id);
                              } else {
                                setPhotoIndex(index);
                                setViewingPhoto(photo);
                              }
                            }}
                            role="listitem"
                            tabIndex={0}
                            aria-label={
                              bulkMode 
                                ? `${isSelected ? 'Deselect' : 'Select'} photo: ${photo.originalName || photo.fileName}`
                                : `View photo: ${photo.originalName || photo.fileName}`
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                if (bulkMode) {
                                  togglePhotoSelection(photo.id);
                                } else {
                                  setPhotoIndex(index);
                                  setViewingPhoto(photo);
                                }
                              }
                            }}
                          >
                            <img
                              src={photo.filePath}
                              alt={photo.originalName || photo.fileName}
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                            
                            {/* Selection checkbox */}
                            {bulkMode && (
                              <div className="absolute top-2 left-2 z-10" aria-hidden="true">
                                {isSelected ? (
                                  <CheckSquare className="h-6 w-6 text-emerald-600 bg-white rounded" />
                                ) : (
                                  <Square className="h-6 w-6 text-gray-400 bg-white rounded" />
                                )}
                              </div>
                            )}
                            
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200">
                              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <p className="text-xs text-white truncate">
                                  {photo.originalName || photo.fileName}
                                </p>
                                <p className="text-xs text-white/70">
                                  {formatSize(photo.fileSize)}
                                </p>
                              </div>
                              
                              {/* Action buttons */}
                              {!bulkMode && (
                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 min-h-[36px] min-w-[36px]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditDialog(photo);
                                    }}
                                    aria-label={`Edit photo: ${photo.originalName || photo.fileName}`}
                                  >
                                    <Edit className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 min-h-[36px] min-w-[36px]"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(photo.filePath, '_blank');
                                    }}
                                    aria-label={`Download photo: ${photo.originalName || photo.fileName}`}
                                  >
                                    <Download className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                  {canUpload && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="destructive"
                                          size="icon"
                                          className="h-8 w-8 min-h-[36px] min-w-[36px]"
                                          onClick={(e) => e.stopPropagation()}
                                          aria-label={`Delete photo: ${photo.originalName || photo.fileName}`}
                                        >
                                          <Trash2 className="h-4 w-4" aria-hidden="true" />
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
                                          <AlertDialogCancel className="min-h-[44px]">Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeletePhoto(photo.id)}
                                            className="bg-red-600 hover:bg-red-700 min-h-[44px]"
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
      )}

      {/* Photo Viewer Dialog */}
      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent 
          className="sm:max-w-4xl p-0 overflow-hidden bg-black/95 animate-in fade-in zoom-in-95 duration-300"
          aria-label="Photo viewer"
        >
          <div 
            ref={photoViewerRef}
            className="relative"
            tabIndex={-1}
            role="dialog"
            aria-label={`Viewing photo ${photoIndex + 1}`}
          >
            {/* Navigation */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white min-h-[44px] min-w-[44px]"
              onClick={() => navigatePhoto('prev')}
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white min-h-[44px] min-w-[44px]"
              onClick={() => navigatePhoto('next')}
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </Button>
            
            {/* Keyboard navigation hint */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white text-xs px-3 py-1 rounded-full opacity-0 hover:opacity-100 transition-opacity">
              Use arrow keys to navigate, Escape to close
            </div>
            
            {/* Image */}
            {viewingPhoto && (
              <img
                src={viewingPhoto.filePath}
                alt={viewingPhoto.originalName || viewingPhoto.fileName}
                className="w-full max-h-[70vh] object-contain"
              />
            )}
            
            {/* Info bar */}
            {viewingPhoto && (
              <div className="bg-black/80 text-white p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{viewingPhoto.originalName || viewingPhoto.fileName}</p>
                    <p className="text-sm text-gray-400">
                      {formatSize(viewingPhoto.fileSize)} • {new Date(viewingPhoto.uploadedAt).toLocaleString()}
                    </p>
                    {viewingPhoto.description && (
                      <p className="text-sm text-gray-300 mt-1">{viewingPhoto.description}</p>
                    )}
                    {viewingPhoto.tags && viewingPhoto.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {viewingPhoto.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 min-h-[44px]"
                      onClick={() => copyPhotoUrl(viewingPhoto)}
                      aria-label="Copy photo URL to clipboard"
                    >
                      <Copy className="h-4 w-4 mr-1 sm:mr-2" aria-hidden="true" />
                      <span className="hidden sm:inline">Copy URL</span>
                      <span className="sm:hidden">Copy</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 min-h-[44px]"
                      onClick={() => window.open(viewingPhoto.filePath, '_blank')}
                      aria-label="Download photo"
                    >
                      <Download className="h-4 w-4 mr-1 sm:mr-2" aria-hidden="true" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 min-h-[44px]"
                      onClick={() => {
                        setViewingPhoto(null);
                        openEditDialog(viewingPhoto);
                      }}
                      aria-label="Edit photo details"
                    >
                      <Edit className="h-4 w-4 mr-1 sm:mr-2" aria-hidden="true" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Photo Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="animate-in slide-in-from-bottom-4 duration-300">
          <DialogHeader>
            <DialogTitle>Edit Photo Details</DialogTitle>
            <DialogDescription>
              Update the photo&apos;s category, description, and tags.
            </DialogDescription>
          </DialogHeader>
          
          {editingPhoto && (
            <div className="space-y-4 py-4">
              {/* Preview */}
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={editingPhoto.filePath}
                  alt={editingPhoto.originalName || editingPhoto.fileName}
                  className="w-full h-full object-contain"
                />
              </div>
              
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger id="edit-category">
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
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add a description..."
                  rows={3}
                />
              </div>
              
              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="edit-tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-tags"
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
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleAddTag}
                    className="min-h-[44px]"
                    aria-label="Add tag"
                  >
                    Add
                  </Button>
                </div>
                {editTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2" role="list" aria-label="Added tags">
                    {editTags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="gap-1" role="listitem">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveTag(tag)}
                          aria-label={`Remove tag ${tag}`}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleRemoveTag(tag);
                            }
                          }}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowEditDialog(false)}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={saving}
              className="min-h-[44px]"
              aria-busy={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
