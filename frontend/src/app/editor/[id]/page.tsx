'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useTimelineStore } from '@/store/timelineStore';
import { Project, Asset } from '@/types/timeline';
import { CompositorCanvas } from '@/components/compositor/CompositorCanvas';
import { Timeline } from '@/components/timeline/Timeline';
import { MediaLibrary } from '@/components/media/MediaLibrary';
import { CaptionsStudio } from '@/components/captions/CaptionsStudio';
import { StickersLibrary } from '@/components/stickers/StickersLibrary';
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
  Type,
  Folder,
  Smile,
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
  const [activeLeftTab, setActiveLeftTab] = useState<'media' | 'captions' | 'stickers'>('media');

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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-500 to-pink-500 flex items-center justify-center neon-glow shadow-lg">
              <Film className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white tracking-wide">{project?.title || 'Loading...'}</h1>
              <p className="text-[10px] text-brand-300 font-mono">
                {aspectRatio} • {project?.fps}fps
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] text-slate-400 mr-2 font-mono bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
            {isSaving ? (
              <><Loader2 className="w-3 h-3 animate-spin text-brand-400" /> Saving...</>
            ) : (
              <><CheckCircle2 className="w-3 h-3 text-emerald-400" /> {lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : 'Saved'}</>
            )}
          </div>
          <button
            onClick={() => saveTimeline()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-white"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-brand-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 text-white shadow-lg neon-glow transition-all hover:scale-105 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </header>

      {/* Main Workspace Workspace */}
      <div className="flex flex-1 overflow-hidden p-3 gap-3">
        {/* Top Half: Library & Canvas & Inspector */}
        <div className="flex-1 flex gap-3 min-h-[50%]">
          
          {/* Left Sidebar: Assets & Captions & Stickers */}
          <div className="w-80 glass-panel rounded-2xl flex flex-col overflow-hidden shadow-2xl relative group">
            {/* Tab Navigation */}
            <div className="flex p-1.5 gap-1 bg-black/40 border-b border-white/10 backdrop-blur-md">
              <button
                onClick={() => setActiveLeftTab('media')}
                className={`flex-1 py-1.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all duration-300 ${
                  activeLeftTab === 'media'
                    ? 'bg-white/15 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>Media</span>
              </button>

              <button
                onClick={() => setActiveLeftTab('captions')}
                className={`flex-1 py-1.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all duration-300 ${
                  activeLeftTab === 'captions'
                    ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Type className="w-3.5 h-3.5 text-amber-400" />
                <span>Captions</span>
                <span className="px-1 py-[1px] rounded bg-amber-500/30 text-[8px] text-amber-200 font-black tracking-wider border border-amber-500/50">AI</span>
              </button>

              <button
                onClick={() => setActiveLeftTab('stickers')}
                className={`flex-1 py-1.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all duration-300 ${
                  activeLeftTab === 'stickers'
                    ? 'bg-gradient-to-br from-pink-500/20 to-rose-500/20 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.2)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Smile className="w-3.5 h-3.5 text-pink-400" />
                <span>Stickers</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden relative">
              {activeLeftTab === 'media' && (
                <MediaLibrary
                  projectId={projectId}
                  assets={assets}
                  onUploadSuccess={fetchProjectAndAssets}
                  onDeleteAsset={handleDeleteAsset}
                />
              )}
              {activeLeftTab === 'captions' && (
                <CaptionsStudio assets={assets} />
              )}
              {activeLeftTab === 'stickers' && (
                <StickersLibrary />
              )}
            </div>
          </div>

          {/* Center Viewport: Canvas Compositor */}
          <div className="flex-1 h-full min-w-[300px] glass-panel rounded-2xl overflow-hidden shadow-2xl relative flex flex-col">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 pointer-events-none z-10" />
            <CompositorCanvas
              aspectRatio={aspectRatio}
              onAspectChange={(asp) => setAspectRatio(asp)}
            />
          </div>

          {/* Right Sidebar: Clip Inspector */}
          <div className="w-80 glass-panel rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <ClipInspector />
          </div>
        </div>

        {/* Bottom Half: Timeline */}
        <div className="h-72 glass-panel rounded-2xl overflow-hidden shadow-2xl border-t border-white/10 shrink-0 relative mt-2">
           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-500/50 to-transparent" />
           <Timeline assets={assets} />
        </div>
      </div>

      {/* Export Modal */}
      {isExportOpen && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </div>
  );
}
