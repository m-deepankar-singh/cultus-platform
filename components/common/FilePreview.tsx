"use client";

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Eye, 
  Download, 
  Trash2, 
  Edit, 
  ExternalLink, 
  FileText, 
  File, 
  Play, 
  Volume2,
  ZoomIn,
  X 
} from 'lucide-react';
import { type UploadFile } from '@/hooks/useR2Upload';

interface FilePreviewProps {
  file: UploadFile;
  publicUrl?: string;
  showActions?: boolean;
  onDelete?: (file: UploadFile) => void;
  onReplace?: (file: UploadFile) => void;
  onDownload?: (file: UploadFile) => void;
  className?: string;
  variant?: 'card' | 'compact' | 'gallery';
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileType = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';
  return 'document';
};

const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toUpperCase() || '';
};

// Image Preview Component
function ImagePreview({ 
  publicUrl, 
  file, 
  onZoom 
}: { 
  publicUrl?: string; 
  file: UploadFile; 
  onZoom?: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  if (imageError || !publicUrl) {
    return (
      <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Image preview unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className={cn(
        "relative w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden",
        imageLoading && "animate-pulse"
      )}>
        <Image
          src={publicUrl}
          alt={file.file.name}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          onError={handleImageError}
          onLoad={handleImageLoad}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        
        {/* Zoom overlay */}
        {onZoom && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button
              variant="secondary"
              size="sm"
              onClick={onZoom}
              className="backdrop-blur-sm"
            >
              <ZoomIn className="w-4 h-4 mr-2" />
              Zoom
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Video Preview Component
function VideoPreview({ 
  publicUrl, 
  file 
}: { 
  publicUrl?: string; 
  file: UploadFile;
}) {
  if (!publicUrl) {
    return (
      <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Play className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Video preview unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-48 bg-gray-900 rounded-lg overflow-hidden">
      <video
        src={publicUrl}
        controls
        className="w-full h-full object-contain"
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

// Audio Preview Component
function AudioPreview({ 
  publicUrl, 
  file 
}: { 
  publicUrl?: string; 
  file: UploadFile;
}) {
  if (!publicUrl) {
    return (
      <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Volume2 className="w-6 h-6 text-gray-400 mx-auto mb-1" />
          <p className="text-xs text-gray-500">Audio preview unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center space-x-3 mb-3">
        <Volume2 className="w-5 h-5 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {file.file.name}
        </span>
      </div>
      <audio
        src={publicUrl}
        controls
        className="w-full"
        preload="metadata"
      >
        Your browser does not support the audio tag.
      </audio>
    </div>
  );
}

// Document Preview Component
function DocumentPreview({ 
  file,
  publicUrl 
}: { 
  file: UploadFile;
  publicUrl?: string;
}) {
  const fileType = getFileType(file.file.type);
  const extension = getFileExtension(file.file.name);

  return (
    <div className="w-full h-48 bg-gray-50 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600">
      <FileText className="w-12 h-12 text-gray-400 mb-3" />
      <Badge variant="outline" className="mb-2">
        {extension}
      </Badge>
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center truncate max-w-full">
        {file.file.name}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        {formatFileSize(file.file.size)}
      </p>
      
      {publicUrl && fileType === 'pdf' && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => window.open(publicUrl, '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View PDF
        </Button>
      )}
    </div>
  );
}

export function FilePreview({
  file,
  publicUrl,
  showActions = true,
  onDelete,
  onReplace,
  onDownload,
  className,
  variant = 'card',
}: FilePreviewProps) {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const fileType = getFileType(file.file.type);

  const handleZoom = useCallback(() => {
    setIsZoomOpen(true);
  }, []);

  const handleDownload = useCallback(() => {
    if (publicUrl) {
      // Create a temporary link element to trigger download
      const link = document.createElement('a');
      link.href = publicUrl;
      link.download = file.file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    onDownload?.(file);
  }, [publicUrl, file, onDownload]);

  // Render preview based on file type
  const renderPreview = () => {
    switch (fileType) {
      case 'image':
        return <ImagePreview publicUrl={publicUrl} file={file} onZoom={handleZoom} />;
      case 'video':
        return <VideoPreview publicUrl={publicUrl} file={file} />;
      case 'audio':
        return <AudioPreview publicUrl={publicUrl} file={file} />;
      default:
        return <DocumentPreview file={file} publicUrl={publicUrl} />;
    }
  };

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center space-x-3 p-2 border rounded-lg', className)}>
        <div className="w-12 h-12 flex-shrink-0">
          {fileType === 'image' && publicUrl ? (
            <Image
              src={publicUrl}
              alt={file.file.name}
              width={48}
              height={48}
              className="w-12 h-12 object-cover rounded"
            />
          ) : (
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
              <File className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {file.file.name}
          </p>
          <p className="text-xs text-gray-500">
            {formatFileSize(file.file.size)} • {getFileExtension(file.file.name)}
          </p>
        </div>
        
        {showActions && (
          <div className="flex items-center space-x-1">
            {publicUrl && (
              <Button variant="ghost" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4" />
              </Button>
            )}
            {onReplace && (
              <Button variant="ghost" size="sm" onClick={() => onReplace(file)}>
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={() => onDelete(file)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'gallery') {
    return (
      <div className={cn('group relative', className)}>
        <div className="aspect-square w-full">
          {renderPreview()}
        </div>
        
        {showActions && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex space-x-1">
              {fileType === 'image' && (
                <Button variant="secondary" size="sm" onClick={handleZoom}>
                  <Eye className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button variant="destructive" size="sm" onClick={() => onDelete(file)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-2">
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            {file.file.name}
          </p>
        </div>
      </div>
    );
  }

  // Default card variant
  return (
    <div className={cn('bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden', className)}>
      {renderPreview()}
      
      <div className="p-4 space-y-3">
        {/* File Info */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {file.file.name}
          </h3>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {getFileExtension(file.file.name)}
            </Badge>
            <span className="text-xs text-gray-500">
              {formatFileSize(file.file.size)}
            </span>
          </div>
        </div>
        
        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {publicUrl && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              )}
              {fileType === 'image' && publicUrl && (
                <Button variant="outline" size="sm" onClick={handleZoom}>
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              {onReplace && (
                <Button variant="ghost" size="sm" onClick={() => onReplace(file)}>
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="sm" onClick={() => onDelete(file)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Image Zoom Modal */}
      {fileType === 'image' && publicUrl && (
        <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="truncate">{file.file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsZoomOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="relative w-full h-[70vh]">
              <Image
                src={publicUrl}
                alt={file.file.name}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 80vw"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 