'use client';

import React, { useState, useRef } from 'react';
import { Asset } from '@/types/timeline';
import {
  UploadCloud,
  Film,
  Music,
  Image as ImageIcon,
  Trash2,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';

interface MediaLibraryProps {
  projectId?: string;
  assets: Asset[];
  onUploadSuccess?: () => void;
  onDeleteAsset?: (assetId: string) => void;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  projectId,
  assets,
  onUploadSuccess,
  onDeleteAsset,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingAssetId, setProcessingAssetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Poll for the new asset when processing background removal
  React.useEffect(() => {
    if (!processingAssetId) return;
    
    let interval = setInterval(async () => {
      // Just trigger a soft refresh of the library
      onUploadSuccess?.();
      
      // Stop polling if we see a _nobg_ asset in the current library list
      // But we don't have the new asset ID. Just poll for 15 seconds or rely on manual refresh
      // A simple fix is just to poll 10 times then stop
    }, 5000);
    
    // Stop after 60 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setProcessingAssetId(null);
    }, 60000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [processingAssetId, onUploadSuccess]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadProgress(10);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      if (projectId) {
        formData.append('project_id', projectId);
      }

      try {
        const res = await fetch('/api/assets/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          setUploadProgress(Math.round(((i + 1) / files.length) * 100));
        }
      } catch (err) {
        console.error('Asset upload error:', err);
      }
    }

    setIsUploading(false);
    setUploadProgress(0);
    onUploadSuccess?.();
  };

  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex flex-col h-full bg-surface border-r border-surface-border select-none text-xs">
      {/* Top Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-surface-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-brand-500" />
          <span className="font-semibold text-slate-100">Media Assets</span>
          <span className="text-[10px] bg-surface px-1.5 py-0.5 rounded text-slate-400 font-mono">
            {assets.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onUploadSuccess?.()}
            className="p-1 hover:bg-surface rounded text-slate-400 hover:text-slate-100 transition-colors"
            title="Refresh Library"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded font-medium flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Import
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
      />

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="p-2 bg-brand-950/40 border-b border-brand-500/30">
          <div className="flex items-center justify-between text-[11px] text-brand-300 mb-1">
            <span>Uploading media...</span>
            <span className="font-mono">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-surface-border rounded-full h-1.5 overflow-hidden">
            <div
              style={{ width: `${uploadProgress}%` }}
              className="bg-brand-500 h-full transition-all duration-200"
            />
          </div>
        </div>
      )}

      {/* Asset Grid & Dropzone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFileUpload(e.dataTransfer.files);
        }}
        className="flex-1 overflow-y-auto p-3 space-y-2.5"
      >
        {assets.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="h-44 border-2 border-dashed border-surface-border hover:border-brand-500/60 rounded-lg flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors group"
          >
            <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-brand-400 mb-2 transition-colors" />
            <span className="text-slate-300 font-medium">Click or Drag media here</span>
            <span className="text-[10px] text-slate-500 mt-1">MP4, WEBM, MOV, MP3, WAV, PNG, JPG</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset) => {
              const isVideo = asset.mime_type.startsWith('video');
              const isAudio = asset.mime_type.startsWith('audio');
              const isImage = asset.mime_type.startsWith('image');

              return (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, asset)}
                  className="group relative bg-surface-raised border border-surface-border hover:border-brand-500/70 rounded-md overflow-hidden cursor-grab active:cursor-grabbing transition-all hover:shadow-lg"
                >
                  {/* Thumbnail / Visual Scrub Area */}
                  <div className="relative aspect-video bg-black/50 flex items-center justify-center overflow-hidden">
                    {isVideo ? (
                      <img
                        src={`/api/assets/${asset.id}/thumbnail`}
                        alt={asset.file_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : isAudio ? (
                      <div className="flex flex-col items-center justify-center text-emerald-400">
                        <Music className="w-6 h-6 mb-1" />
                        <span className="text-[9px] font-mono text-emerald-300">AUDIO</span>
                      </div>
                    ) : (
                      <img
                        src={`/api/assets/${asset.id}/thumbnail`}
                        alt={asset.file_name}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Duration Badge */}
                    {asset.duration_seconds > 0 && (
                      <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/70 text-[9px] font-mono text-slate-200 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {asset.duration_seconds.toFixed(1)}s
                      </div>
                    )}
                  </div>

                  {/* Asset Info Card */}
                  <div className="p-1.5 flex items-center justify-between">
                    <div className="overflow-hidden pr-1">
                      <p className="text-slate-200 font-medium truncate text-[11px]">{asset.file_name}</p>
                      <p className="text-[9px] text-slate-500 font-mono">
                        {(asset.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex opacity-0 group-hover:opacity-100 transition-all bg-surface-raised rounded">
                      {(isVideo || isImage) && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (processingAssetId) return;
                            try {
                              setProcessingAssetId(asset.id);
                              await fetch(`/api/assets/${asset.id}/remove-background`, { method: 'POST' });
                            } catch (err) {}
                          }}
                          className={`p-1 rounded transition-all ${
                            processingAssetId === asset.id
                              ? 'bg-amber-500/20 text-amber-400 animate-pulse'
                              : 'hover:bg-brand-900/60 text-slate-400 hover:text-brand-400'
                          }`}
                          title="✨ Magic Remove Background"
                        >
                          <Sparkles className={`w-3 h-3 ${processingAssetId === asset.id ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAsset?.(asset.id);
                        }}
                        className="p-1 hover:bg-rose-950/60 rounded text-slate-400 hover:text-rose-400 transition-all"
                        title="Delete Asset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
