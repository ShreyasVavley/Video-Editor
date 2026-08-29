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
    <div className="flex flex-col h-screen overflow-hidden text-slate-200 aesthetic-bg select-none font-light">
      {/* Top Header Navigation */}
      <header className="h-14 glass-panel border-b border-white/5 flex items-center justify-between px-4 z-50 shrink-0 mx-3 mt-3 shadow-sm rounded-2xl">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors group">
            <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-white" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center shadow-inner border border-white/5">
              <Film className="w-3.5 h-3.5 text-white/80" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-medium text-sm text-white/90 tracking-wide">{project?.title || 'Loading...'}</h1>
              <p className="text-[10px] text-slate-400 font-mono mt-[1px]">
                {aspectRatio} <span className="opacity-50 mx-1">•</span> {project?.fps}fps
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] text-slate-400 mr-2 font-mono">
            {isSaving ? (
              <><Loader2 className="w-3 h-3 animate-spin text-slate-300" /> Saving...</>
            ) : (
              <><CheckCircle2 className="w-3 h-3 text-slate-500" /> {lastSavedAt ? `Saved at ${lastSavedAt}` : 'Saved'}</>
            )}
          </div>
          <button
            onClick={() => saveTimeline()}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full aesthetic-button text-white/90"
          >
            <Save className="w-3.5 h-3.5 opacity-70" />
            Save
          </button>
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1.5 px-5 py-1.5 text-xs font-medium rounded-full aesthetic-button-primary text-black"
          >
            <Download className="w-3.5 h-3.5 opacity-80" />
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
            <div className="flex p-1.5 gap-1 border-b border-white/5">
              <button
                onClick={() => setActiveLeftTab('media')}
                className={`flex-1 py-1.5 rounded-xl font-medium text-[11px] flex items-center justify-center gap-1.5 transition-all duration-300 ${
                  activeLeftTab === 'media'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>Media</span>
              </button>

              <button
                onClick={() => setActiveLeftTab('captions')}
                className={`flex-1 py-1.5 rounded-xl font-medium text-[11px] flex items-center justify-center gap-1.5 transition-all duration-300 ${
                  activeLeftTab === 'captions'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Captions</span>
                <span className="px-1 py-[1px] rounded bg-white/10 text-[8px] text-white/60 font-medium tracking-wider">AI</span>
              </button>

              <button
                onClick={() => setActiveLeftTab('stickers')}
                className={`flex-1 py-1.5 rounded-xl font-medium text-[11px] flex items-center justify-center gap-1.5 transition-all duration-300 ${
                  activeLeftTab === 'stickers'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Smile className="w-3.5 h-3.5" />
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
