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
        toast({
          title: 'Processing images',
          description: `Compressing ${processedFiles.length} image(s)...`,
        });
        
        processedFiles = await Promise.all(
          processedFiles.map(file => 
            compressImage(file, compressionQuality, maxImageWidth, maxImageHeight)
          )
        );
      }
      
      if (enableWatermark && watermarkText) {
        toast({
          title: 'Adding watermarks',
          description: `Adding watermark to ${processedFiles.length} image(s)...`,
        });
        
        processedFiles = await Promise.all(
          processedFiles.map(file => addWatermark(file, watermarkText))
        );
      }
      
      setProcessingImages(false);
      setUploadProgress(20);
      
      const formData = new FormData();
      formData.append('categoryCode', uploadCategory);
      formData.append('description', uploadDescription);
      formData.append('uploadedBy', user?.id || '');
      
      processedFiles.forEach((file) => {
        formData.append('files', file);
      });
      
      setUploadProgress(40);
      
      const response = await fetch(`/api/job-cards/${jobCardId}/photos`, {
        method: 'POST',
        body: formData,
      });
      
      setUploadProgress(80);
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setUploadProgress(100);
        toast({
          title: 'Upload successful',
          description: `${data.data.uploaded || processedFiles.length} photo(s) uploaded successfully`,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search photos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          
          {/* Download all as ZIP */}
          {stats.totalPhotos > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAllZip}
              disabled={downloadingZip}
              className="gap-2"
            >
              {downloadingZip ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileArchive className="h-4 w-4" />
              )}
              Download All
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
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Upload Job Card Photos</DialogTitle>
                    <DialogDescription>
                      Select images to upload. Maximum 50 images per upload.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Category Selection */}
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
                    
                    {/* Description */}
                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Textarea
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
                          <Filter className="h-4 w-4" />
                          Image Processing Options
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Compression */}
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              Compress Images
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Reduce file size for faster uploads
                            </p>
                          </div>
                          <Switch
                            checked={enableCompression}
                            onCheckedChange={setEnableCompression}
                          />
                        </div>
                        
                        {enableCompression && (
                          <div className="space-y-3 pl-4 border-l-2 border-slate-200">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <Label className="text-xs">Quality</Label>
                                <span className="text-xs text-muted-foreground">{Math.round(compressionQuality * 100)}%</span>
                              </div>
                              <Slider
                                value={[compressionQuality * 100]}
                                onValueChange={(v) => setCompressionQuality(v[0] / 100)}
                                min={50}
                                max={100}
                                step={5}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Max Width</Label>
                                <Select value={String(maxImageWidth)} onValueChange={(v) => setMaxImageWidth(Number(v))}>
                                  <SelectTrigger className="h-8">
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
                                <Label className="text-xs">Max Height</Label>
                                <Select value={String(maxImageHeight)} onValueChange={(v) => setMaxImageHeight(Number(v))}>
                                  <SelectTrigger className="h-8">
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
                            <Label className="flex items-center gap-2">
                              <Droplet className="h-4 w-4" />
                              Add Watermark
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Add text watermark to images
                            </p>
                          </div>
                          <Switch
                            checked={enableWatermark}
                            onCheckedChange={setEnableWatermark}
                          />
                        </div>
                        
                        {enableWatermark && (
                          <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                            <Label className="text-xs">Watermark Text</Label>
                            <Input
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
                      <Label>Select Images</Label>
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
                          isDragging 
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" 
                            : "border-gray-300 hover:border-gray-400"
                        )}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FileUp className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-300">
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
                    
                    {/* Preview */}
                    {previewUrls.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>{selectedFiles.length} image(s) selected ({calculateSizeReduction()})</Label>
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
                    
                    {/* Progress */}
                    {(uploading || processingImages) && (
                      <div className="space-y-2">
                        <Progress value={uploadProgress} />
                        <p className="text-sm text-center text-muted-foreground">
                          {processingImages ? 'Processing images...' : `Uploading... ${uploadProgress}%`}
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
                      disabled={selectedFiles.length === 0 || uploading || processingImages}
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
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Results for &quot;{searchQuery}&quot;
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                <X className="h-4 w-4" />
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
                    className="group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer"
                    onClick={() => {
                      setPhotoIndex(index);
                      setViewingPhoto(photo);
                    }}
                  >
                    <img
                      src={photo.filePath}
                      alt={photo.originalName || photo.fileName}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
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
        <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800">
          <CardContent className="py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100">
                  {selectedPhotos.size} selected
                </Badge>
                <Button variant="ghost" size="sm" onClick={selectAllPhotos}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {/* Download as ZIP */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                >
                  {downloadingZip ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileArchive className="h-4 w-4" />
                  )}
                  Download ZIP
                </Button>
                
                {/* Move */}
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
                
                {/* Delete */}
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
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-amber-800 dark:text-amber-200">No categories loaded</p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
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
      
      {!searchQuery && (
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
                    "dark:data-[state=active]:bg-emerald-950 dark:data-[state=active]:border-emerald-800",
                    status === 'incomplete' && "border-red-200 bg-red-50/50 dark:bg-red-950/50",
                    status === 'full' && "border-green-200 bg-green-50/50 dark:bg-green-950/50"
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
                            <img
                              src={photo.filePath}
                              alt={photo.originalName || photo.fileName}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            
                            {/* Selection checkbox */}
                            {bulkMode && (
                              <div className="absolute top-2 left-2 z-10">
                                {isSelected ? (
                                  <CheckSquare className="h-6 w-6 text-emerald-600 bg-white rounded" />
                                ) : (
                                  <Square className="h-6 w-6 text-gray-400 bg-white rounded" />
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
                              
                              {/* Action buttons */}
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
                                      window.open(photo.filePath, '_blank');
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
      )}

      {/* Photo Viewer Dialog */}
      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-black/95">
          <div className="relative">
            {/* Navigation */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => navigatePhoto('prev')}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => navigatePhoto('next')}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
            
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
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{viewingPhoto.originalName || viewingPhoto.fileName}</p>
                    <p className="text-sm text-gray-400">
                      {formatSize(viewingPhoto.fileSize)} • {new Date(viewingPhoto.uploadedAt).toLocaleString()}
                    </p>
                    {viewingPhoto.description && (
                      <p className="text-sm text-gray-300 mt-1">{viewingPhoto.description}</p>
                    )}
                    {viewingPhoto.tags && viewingPhoto.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {viewingPhoto.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      onClick={() => copyPhotoUrl(viewingPhoto)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy URL
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      onClick={() => window.open(viewingPhoto.filePath, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      onClick={() => {
                        setViewingPhoto(null);
                        openEditDialog(viewingPhoto);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
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
        <DialogContent>
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
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                {editTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editTags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
