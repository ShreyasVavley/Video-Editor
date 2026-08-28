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
          className="w-56 shrink-0 bg-surface-raised border-r border-surface-border overflow-hidden flex flex-col z-20"
        >
          {/* Top-left empty corner (matches Ruler height) */}
          <div className="h-8 bg-surface border-b border-surface-border flex items-center px-3 text-[11px] font-semibold text-slate-400">
            TRACKS
          </div>

          {/* Track Headers */}
          <div className="flex-1 overflow-hidden">
            {timeline.tracks.map((track) => (
              <TrackHeader key={track.id} track={track} />
            ))}
          </div>
        </div>

        {/* Right Scrollable Timeline Lanes Area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-timeline-bg"
        >
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
