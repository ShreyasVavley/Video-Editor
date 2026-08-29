'use client';

import React, { useRef, useEffect } from 'react';
import { useTimelineStore } from '@/store/timelineStore';
import { TimelineToolbar } from '@/components/timeline/TimelineToolbar';
import { TimelineRuler } from '@/components/timeline/TimelineRuler';
import { TrackHeader } from '@/components/timeline/TrackHeader';
import { TrackLane } from '@/components/timeline/TrackLane';
import { Asset } from '@/types/timeline';

interface TimelineProps {
  assets?: Asset[];
}

export const Timeline: React.FC<TimelineProps> = ({ assets = [] }) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const headerContainerRef = useRef<HTMLDivElement | null>(null);

  const {
    timeline,
    isPlaying,
    togglePlayPause,
    setPlayhead,
    deleteSelectedClips,
    splitClip,
    undo,
    redo,
    setActiveTool,
    saveTimeline,
  } = useTimelineStore();

  const zoom = timeline.zoom_level;
  const playheadPx = timeline.playhead_position * zoom;
  const totalWidth = (timeline.duration_seconds || 60) * zoom;

  // Sync horizontal scrolling between Ruler and Track Lanes
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerContainerRef.current) {
      headerContainerRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // --- Global Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input / textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'c' || e.key === 'C') {
        setActiveTool('razor');
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        const playhead = timeline.playhead_position;
        const targetClip = timeline.clips.find(
          (c) => playhead > c.start_time + 0.05 && playhead < c.start_time + c.duration - 0.05
        );
        if (targetClip) splitClip(targetClip.id, playhead);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelectedClips();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPlayhead(Math.max(0, timeline.playhead_position - (e.shiftKey ? 1.0 : 1 / timeline.fps)));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPlayhead(Math.min(timeline.duration_seconds, timeline.playhead_position + (e.shiftKey ? 1.0 : 1 / timeline.fps)));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setPlayhead(0);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveTimeline();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlayPause,
    setActiveTool,
    timeline.playhead_position,
    timeline.clips,
    timeline.duration_seconds,
    timeline.fps,
    splitClip,
    deleteSelectedClips,
    setPlayhead,
    undo,
    redo,
    saveTimeline,
  ]);

  return (
    <div className="flex flex-col h-full bg-timeline-bg select-none border-t border-surface-border">
      {/* Top Toolbar */}
      <TimelineToolbar />

      {/* Main Track Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Fixed Header Column (Track Names and Mute/Solo/Lock) */}
        <div
          ref={headerContainerRef}
          className="w-56 bg-black/60 border-r border-white/5 flex flex-col shrink-0 backdrop-blur-xl relative z-40 shadow-[5px_0_15px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          {/* Top-left empty corner (matches Ruler height) */}
          <div className="h-8 bg-black/40 border-b border-white/5 flex items-center px-3 text-[11px] font-semibold text-slate-400">
            TRACKS
          </div>

          {/* Track Headers (Left) */}
          {timeline.tracks.map((track) => (
            <div
              key={track.id}
              className={`h-24 border-b border-white/5 flex items-center justify-between px-3 hover:bg-white/5 transition-colors group ${
                timeline.selected_track_id === track.id ? 'bg-gradient-to-r from-brand-500/20 to-transparent border-l-2 border-l-brand-400' : 'border-l-2 border-l-transparent'
              }`}
              onClick={() => selectTrack(track.id)}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center shadow-lg ${
                  track.type === 'video' ? 'bg-blue-500/20 text-blue-400' :
                  track.type === 'audio' ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {track.type === 'video' && <Video className="w-3.5 h-3.5" />}
                  {track.type === 'audio' && <Music className="w-3.5 h-3.5" />}
                  {track.type === 'text' && <Type className="w-3.5 h-3.5" />}
                </div>
                <div className="flex flex-col truncate">
                   <span className="text-xs font-bold text-slate-200 truncate tracking-wide">{track.name}</span>
                   <span className="text-[9px] font-mono text-slate-500 uppercase">{track.type} Track</span>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTrackVisibility(track.id);
                  }}
                  className="p-1 hover:bg-white/10 rounded-md text-slate-400 hover:text-slate-100 transition-all"
                >
                  {track.hidden ? <EyeOff className="w-3.5 h-3.5 text-rose-400" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Tracks Area (Right) */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-x-auto overflow-y-auto relative timeline-bg"
        >
          {/* Timeline Ruler Gradient Overlay */}
          <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />
          
          {/* Sticky Ruler at Top */}
          <div className="sticky top-0 z-30">
            <TimelineRuler scrollLeft={0} containerWidth={1000} />
          </div>

          {/* Track Lanes */}
          <div className="relative flex flex-col" style={{ minWidth: `${totalWidth}px` }}>
            {timeline.tracks.map((track) => (
              <TrackLane key={track.id} track={track} assets={assets} />
            ))}

            {/* Global Red Playhead Needle */}
            <div
              style={{
                transform: `translateX(${playheadPx}px)`,
              }}
              className="absolute top-0 bottom-0 pointer-events-none z-40 flex flex-col items-center"
            >
              {/* Playhead Scrubber Handle (Triangle) */}
              <div className="w-3.5 h-3.5 -mt-8 bg-red-500 clip-triangle shadow-md" />
              {/* Vertical Laser Needle Line */}
              <div className="w-[1.5px] flex-1 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
