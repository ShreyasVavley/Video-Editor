'use client';

import React, { useRef, useState } from 'react';
import { Clip } from '@/types/timeline';
import { useTimelineStore } from '@/store/timelineStore';
import { formatTimeDisplay } from '@/utils/timecode';
import { Sparkles, Scissors, Zap } from 'lucide-react';

interface ClipProps {
  clip: Clip;
  waveform?: number[];
}

export const TimelineClip: React.FC<ClipProps> = ({ clip, waveform }) => {
  const clipRef = useRef<HTMLDivElement | null>(null);
  const {
    timeline,
    activeTool,
    selectClip,
    moveClip,
    trimClipIn,
    trimClipOut,
    splitClip,
    commitHistory,
  } = useTimelineStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isTrimmingIn, setIsTrimmingIn] = useState(false);
  const [isTrimmingOut, setIsTrimmingOut] = useState(false);

  const zoom = timeline.zoom_level;
  const isSelected = timeline.selected_clip_ids.includes(clip.id);

  const leftPx = clip.start_time * zoom;
  const widthPx = Math.max(12, clip.duration * zoom);

  // Background style based on clip type
  const getClipColor = () => {
    switch (clip.type) {
      case 'video':
        return 'bg-blue-600/80 hover:bg-blue-600 border-blue-400/60';
      case 'audio':
        return 'bg-emerald-600/80 hover:bg-emerald-600 border-emerald-400/60';
      case 'text':
        return 'bg-amber-600/80 hover:bg-amber-600 border-amber-400/60';
      case 'image':
        return 'bg-purple-600/80 hover:bg-purple-600 border-purple-400/60';
      default:
        return 'bg-slate-700 hover:bg-slate-600 border-slate-500';
    }
  };

  // Click handler (Select or Razor Cut)
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTool === 'razor') {
      const rect = clipRef.current?.getBoundingClientRect();
      if (rect) {
        const clickOffsetSec = (e.clientX - rect.left) / zoom;
        const splitTime = clip.start_time + clickOffsetSec;
        splitClip(clip.id, splitTime);
      }
    } else {
      selectClip(clip.id, e.shiftKey || e.metaKey || e.ctrlKey);
    }
  };

  // --- Horizontal Drag Moving ---
  const handlePointerDownMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool === 'razor' || isTrimmingIn || isTrimmingOut) return;
    e.stopPropagation();
    commitHistory();
    setIsDragging(true);

    const startClientX = e.clientX;
    const initialStartTime = clip.start_time;

    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaSec = (moveEv.clientX - startClientX) / zoom;
      let targetStartTime = Math.max(0, initialStartTime + deltaSec);

      // Snapping to playhead or 0
      if (timeline.snap_enabled) {
        if (Math.abs(targetStartTime - timeline.playhead_position) < 0.1) {
          targetStartTime = timeline.playhead_position;
        } else if (Math.abs(targetStartTime) < 0.1) {
          targetStartTime = 0;
        }
      }

      moveClip(clip.id, targetStartTime);
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // --- Trim In Handle Drag ---
  const handlePointerDownTrimIn = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    commitHistory();
    setIsTrimmingIn(true);
    const startClientX = e.clientX;

    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaSec = (moveEv.clientX - startClientX) / zoom;
      trimClipIn(clip.id, deltaSec);
    };

    const onPointerUp = () => {
      setIsTrimmingIn(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // --- Trim Out Handle Drag ---
  const handlePointerDownTrimOut = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    commitHistory();
    setIsTrimmingOut(true);
    const startClientX = e.clientX;

    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaSec = (moveEv.clientX - startClientX) / zoom;
      trimClipOut(clip.id, deltaSec);
    };

    const onPointerUp = () => {
      setIsTrimmingOut(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div
      ref={clipRef}
      onClick={handleClick}
      onPointerDown={handlePointerDownMove}
      style={{
        left: `${leftPx}px`,
        width: `${widthPx}px`,
      }}
      className={`absolute top-1 bottom-1 rounded-md border shadow-md flex items-center justify-between select-none cursor-grab active:cursor-grabbing overflow-hidden transition-shadow ${getClipColor()} ${
        isSelected ? 'ring-2 ring-white border-white z-20 brightness-110' : 'z-10'
      }`}
    >
      {/* Transition In Marker */}
      {clip.transition_in && clip.transition_in.type !== 'none' && (
        <div 
          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500/60 to-transparent pointer-events-none z-20 border-l-2 border-emerald-400"
          style={{ width: `${clip.transition_in.duration * zoom}px` }}
        />
      )}

      {/* Transition Out Marker */}
      {clip.transition_out && clip.transition_out.type !== 'none' && (
        <div 
          className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-rose-500/60 to-transparent pointer-events-none z-20 border-r-2 border-rose-400"
          style={{ width: `${clip.transition_out.duration * zoom}px` }}
        />
      )}

      {/* Left Trim Handle */}
      <div
        onPointerDown={handlePointerDownTrimIn}
        className="absolute left-0 top-0 bottom-0 w-2.5 hover:w-3.5 bg-black/30 hover:bg-white/60 cursor-ew-resize flex items-center justify-center z-30 transition-all"
        title="Trim Start"
      >
        <div className="w-[1.5px] h-3 bg-white/70 rounded-full" />
      </div>

      {/* Clip Body Content & Waveform */}
      <div 
        className="flex-1 px-3.5 flex flex-col justify-center h-full overflow-hidden pointer-events-none relative"
        style={{
          backgroundImage: (clip.type === 'audio' || (clip.type === 'video' && !clip.audio?.muted && clip.asset_id)) 
            ? `url(/api/assets/${clip.asset_id}/waveform)` 
            : undefined,
          backgroundSize: '100% 60%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'bottom',
          backgroundBlendMode: 'screen'
        }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden z-10">
          {activeTool === 'razor' && <Scissors className="w-3 h-3 text-red-300 animate-pulse" />}
          <span className="text-xs font-bold text-white truncate drop-shadow">{clip.name}</span>
          {clip.speed !== 1 && (
            <span className="text-[10px] bg-black/40 px-1 rounded text-amber-200 font-mono">
              {clip.speed}x
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-white/80 font-mono z-10">
          <span>{clip.duration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Right Trim Handle */}
      <div
        onPointerDown={handlePointerDownTrimOut}
        className="absolute right-0 top-0 bottom-0 w-2.5 hover:w-3.5 bg-black/30 hover:bg-white/60 cursor-ew-resize flex items-center justify-center z-30 transition-all"
        title="Trim End"
      >
        <div className="w-[1.5px] h-3 bg-white/70 rounded-full" />
      </div>
    </div>
  );
};
