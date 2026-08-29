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
import { ShortcutsOverlay } from '@/components/ui/ShortcutsOverlay';
import { VUMeter } from '@/components/ui/VUMeter';
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
  Keyboard,
} from 'lucide-react';

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export default function EditorPage({ params }: EditorPageProps) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { project, setProject, saveTimeline, isSaving, lastSavedAt, isPlaying } = useTimelineStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(288);
  const [isDragging, setIsDragging] = useState(false);
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
      <div className="h-screen w-screen flex items-center justify-center clay-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff6eb0] to-[#9b6dff] flex items-center justify-center clay-btn clay-btn-primary animate-pulse">
            <Film className="w-7 h-7 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-[#ff6eb0]" />
          <p className="text-xs text-slate-400 font-mono">Loading Non-Linear Video Workstation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden text-slate-200 clay-bg select-none font-sans relative z-0">
      <div className="clay-orb-1" />
      <div className="clay-orb-2" />
      <div className="clay-orb-3" />
      {/* Top Header Navigation */}
      <header className="h-16 glass-panel border-b border-white/10 flex items-center justify-between px-6 z-50 shrink-0 mx-4 mt-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-full transition-all hover:scale-110 active:scale-95 group">
            <ChevronLeft className="w-5 h-5 text-slate-300 group-hover:text-white" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff007a] to-[#7928ca] flex items-center justify-center shadow-[0_0_15px_rgba(255,0,122,0.6)] border border-white/20 hover:rotate-12 transition-transform duration-300 cursor-pointer">
              <Film className="w-4 h-4 text-white drop-shadow-md" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="font-bold text-[15px] text-white tracking-wide neon-text">{project?.title || 'Loading...'}</h1>
              <p className="text-[10px] text-[#ffb6ff] font-mono mt-[2px] tracking-wider font-bold opacity-90">
                {aspectRatio} <span className="opacity-50 mx-1">•</span> {project?.fps}fps
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <VUMeter isPlaying={isPlaying} />
          
          <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono bg-black/40 px-4 py-2 rounded-xl border border-white/10 shadow-inner backdrop-blur-md">
            {isSaving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff007a]" /> Saving...</>
            ) : (
              <><CheckCircle2 className="w-3.5 h-3.5 text-[#00e5ff]" /> {lastSavedAt ? `Saved at ${lastSavedAt}` : 'Saved'}</>
            )}
          </div>
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-colors border border-white/5"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="w-4 h-4 text-[#00e5ff]" />
          </button>
          <button
            onClick={() => saveTimeline()}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl aesthetic-button text-white/90"
          >
            <Save className="w-4 h-4 opacity-90" />
            Save
          </button>
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 px-6 py-2 text-xs rounded-xl aesthetic-button-primary text-white"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </header>

      {/* Main Workspace Workspace */}
      <div 
        className="flex flex-col flex-1 overflow-hidden p-4 gap-2 relative"
        onMouseMove={(e) => {
          if (!isDragging) return;
          const newHeight = window.innerHeight - e.clientY - 16; // 16px for padding
          setTimelineHeight(Math.max(100, Math.min(newHeight, window.innerHeight * 0.8)));
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        {/* Top Half: Library & Canvas & Inspector */}
        <div className="flex-1 flex gap-4 min-h-[100px] overflow-hidden">
          
          {/* Left Sidebar: Assets & Captions & Stickers */}
          <div className="w-80 glass-panel rounded-2xl flex flex-col overflow-hidden shadow-2xl relative group">
            {/* Tab Navigation */}
            <div className="flex p-2 gap-2 border-b border-white/5 bg-black/30">
              <button
                onClick={() => setActiveLeftTab('media')}
                className={`flex-1 py-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all duration-300 ${
                  activeLeftTab === 'media'
                    ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-500/50 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Folder className="w-4 h-4" />
                <span>Media</span>
              </button>

              <button
                onClick={() => setActiveLeftTab('captions')}
                className={`flex-1 py-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all duration-300 ${
                  activeLeftTab === 'captions'
                    ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-amber-500/50 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Type className="w-4 h-4" />
                <span>Captions</span>
                <span className="px-1.5 py-[2px] rounded bg-white/20 text-[9px] text-white font-black tracking-wider shadow-[0_0_5px_rgba(255,255,255,0.5)]">AI</span>
              </button>

              <button
                onClick={() => setActiveLeftTab('stickers')}
                className={`flex-1 py-2 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all duration-300 ${
                  activeLeftTab === 'stickers'
                    ? 'bg-gradient-to-r from-pink-500/30 to-rose-500/30 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.4)] border border-pink-500/50 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Smile className="w-4 h-4" />
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
          <div className="w-80 glass-panel rounded-2xl flex flex-col overflow-hidden shadow-2xl shrink-0">
            <ClipInspector />
          </div>
        </div>

        {/* Resizable Horizontal Divider */}
        <div 
          className="h-2 w-full cursor-row-resize flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-50 group"
          onMouseDown={() => setIsDragging(true)}
        >
          <div className={`h-[2px] w-32 rounded-full transition-colors ${isDragging ? 'bg-[#ff007a]' : 'bg-white/50 group-hover:bg-[#ff007a]'}`} />
        </div>

        {/* Bottom Half: Timeline */}
        <div 
          className="glass-panel rounded-2xl overflow-hidden shadow-2xl shrink-0 relative transition-all duration-75"
          style={{ height: timelineHeight }}
        >
           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#ff007a]/50 to-transparent z-50 pointer-events-none" />
           <Timeline assets={assets} />
        </div>
      </div>

      {/* Shortcuts Modal */}
      <ShortcutsOverlay 
        isOpen={isShortcutsOpen} 
        onClose={() => setIsShortcutsOpen(false)} 
      />

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
