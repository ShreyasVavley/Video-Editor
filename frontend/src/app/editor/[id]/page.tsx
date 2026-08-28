'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useTimelineStore } from '@/store/timelineStore';
import { Project, Asset } from '@/types/timeline';
import { CompositorCanvas } from '@/components/compositor/CompositorCanvas';
import { Timeline } from '@/components/timeline/Timeline';
import { MediaLibrary } from '@/components/media/MediaLibrary';
import { ClipInspector } from '@/components/inspector/ClipInspector';
import { ExportModal } from '@/components/export/ExportModal';
import {
  ChevronLeft,
  Save,
  Download,
  Film,
  Sparkles,
  CheckCircle2,
  Loader2,
  HardDrive,
} from 'lucide-react';

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export default function EditorPage({ params }: EditorPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { project, setProject, saveTimeline, isSaving, lastSavedAt } = useTimelineStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '21:9'>('16:9');

  const fetchProjectAndAssets = async () => {
    try {
      // 1. Fetch Project
      const pRes = await fetch(`/api/projects/${projectId}`);
      if (pRes.ok) {
        const pData: Project = await pRes.json();
        setProject(pData);
        if (pData.width === 1080 && pData.height === 1920) {
          setAspectRatio('9:16');
        } else if (pData.width === 1080 && pData.height === 1080) {
          setAspectRatio('1:1');
        }
      }

      // 2. Fetch Assets
      const aRes = await fetch(`/api/assets?project_id=${projectId}`);
      if (aRes.ok) {
        const aData = await aRes.json();
        setAssets(aData.assets || []);
      }
    } catch (e) {
      console.error('Failed to load editor:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectAndAssets();
  }, [projectId]);

  const handleDeleteAsset = async (assetId: string) => {
    try {
      await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (e) {
      console.error('Failed to delete asset:', e);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-background flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-xs text-slate-400 font-mono">Loading Non-Linear Video Workstation...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-background text-slate-100 flex flex-col overflow-hidden select-none">
      {/* Top Navbar */}
      <header className="h-12 bg-surface border-b border-surface-border px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 hover:bg-surface-raised rounded-md text-slate-400 hover:text-slate-100 transition-colors flex items-center gap-1 text-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          <div className="h-4 w-[1px] bg-surface-border mx-1" />

          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-brand-500" />
            <input
              type="text"
              value={project?.title || 'Untitled Project'}
              onChange={(e) => {
                if (project) setProject({ ...project, title: e.target.value });
              }}
              onBlur={() => saveTimeline()}
              className="bg-transparent hover:bg-surface-raised focus:bg-surface-raised border border-transparent hover:border-surface-border focus:border-brand-500 rounded px-2 py-0.5 font-bold text-xs text-slate-100 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Center Autosave Indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {isSaving ? (
            <span className="flex items-center gap-1.5 text-amber-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]" suppressHydrationWarning>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              {lastSavedAt ? `Saved at ${lastSavedAt}` : 'All changes saved'}
            </span>
          )}
        </div>

        {/* Right Actions: Save & Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => saveTimeline()}
            className="px-3 py-1.5 bg-surface-raised hover:bg-surface-border text-slate-200 rounded-md font-medium text-xs flex items-center gap-1.5 border border-surface-border transition-colors"
            title="Save Project (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5 text-slate-400" />
            Save
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-md font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            Export MP4
          </button>
        </div>
      </header>

      {/* Main Workspace (Split Upper & Lower) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Upper Half: Media Library (Left) + Compositor Viewport (Center) + Inspector (Right) */}
        <div className="flex-1 flex overflow-hidden min-h-[300px]">
          {/* Left Panel: Media Assets */}
          <div className="w-72 shrink-0 h-full">
            <MediaLibrary
              projectId={projectId}
              assets={assets}
              onUploadSuccess={fetchProjectAndAssets}
              onDeleteAsset={handleDeleteAsset}
            />
          </div>

          {/* Center Viewport: Canvas Compositor */}
          <div className="flex-1 h-full min-w-[300px]">
            <CompositorCanvas
              aspectRatio={aspectRatio}
              onAspectChange={(asp) => setAspectRatio(asp)}
            />
          </div>

          {/* Right Panel: Selected Clip Inspector */}
          <div className="w-80 shrink-0 h-full">
            <ClipInspector />
          </div>
        </div>

        {/* Lower Half: Multi-Track Timeline Dock */}
        <div className="h-72 shrink-0 border-t border-surface-border">
          <Timeline assets={assets} />
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}
