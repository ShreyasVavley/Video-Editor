'use client';

import React from 'react';
import { useTimelineStore } from '@/store/timelineStore';
import {
  Pointer,
  Scissors,
  Hand,
  Magnet,
  RotateCcw,
  RotateCw,
  Trash2,
  Plus,
  ZoomIn,
  ZoomOut,
  Sliders,
  Type,
  Video,
  Music,
} from 'lucide-react';

export const TimelineToolbar: React.FC = () => {
  const {
    timeline,
    activeTool,
    setActiveTool,
    toggleSnap,
    toggleRippleEdit,
    deleteSelectedClips,
    splitClip,
    undo,
    redo,
    addTrack,
    addClip,
    setZoomLevel,
  } = useTimelineStore();

  const handleSplitAtPlayhead = () => {
    const playhead = timeline.playhead_position;
    // Find active clip under playhead
    const targetClip = timeline.clips.find(
      (c) => playhead > c.start_time + 0.05 && playhead < c.start_time + c.duration - 0.05
    );
    if (targetClip) {
      splitClip(targetClip.id, playhead);
    }
  };

  const handleAddTextTitle = () => {
    const playhead = timeline.playhead_position;
    let textTrack = timeline.tracks.find((t) => t.type === 'text');
    if (!textTrack) {
      addTrack('text', 'Text T1');
      textTrack = timeline.tracks.find((t) => t.type === 'text');
    }
    const trackId = textTrack ? textTrack.id : 'track_t1';

    addClip({
      id: `clip_text_${Date.now()}`,
      track_id: trackId,
      type: 'text',
      name: 'Title Overlay',
      start_time: playhead,
      duration: 4.0,
      trim_in: 0,
      trim_out: 4.0,
      speed: 1.0,
      transform: {
        x: 0,
        y: 0.3, // Lower third
        scale_x: 1,
        scale_y: 1,
        rotation: 0,
        opacity: 1,
        blend_mode: 'normal',
      },
      filters: {
        brightness: 1,
        contrast: 1,
        saturation: 1,
        hue: 0,
        blur: 0,
        vignette: 0,
        sepia: 0,
        grayscale: 0,
        invert: 0,
      },
      text: {
        content: 'Add Title Here',
        font_family: 'Roboto-Bold',
        font_size: 48,
        font_color: '#FFFFFF',
        background_color: 'transparent',
        background_padding: 8,
        alignment: 'center',
        outline_color: '#000000',
        outline_width: 2,
        shadow: true,
      },
      audio: {
        volume: 1,
        muted: false,
        pan: 0,
        fade_in: 0,
        fade_out: 0,
      },
    });
  };

  return (
    <div className="h-10 px-4 bg-surface border-b border-surface-border flex items-center justify-between select-none text-xs text-slate-300">
      {/* Left: Primary Editing Tools */}
      <div className="flex items-center gap-1">
        {/* Select Tool */}
        <button
          onClick={() => setActiveTool('select')}
          className={`p-1.5 rounded transition-colors ${
            activeTool === 'select'
              ? 'bg-brand-600 text-white'
              : 'hover:bg-surface-raised text-slate-400 hover:text-slate-100'
          }`}
          title="Selection Tool (V)"
        >
          <Pointer className="w-4 h-4" />
        </button>

        {/* Razor Split Tool */}
        <button
          onClick={() => setActiveTool('razor')}
          className={`p-1.5 rounded transition-colors ${
            activeTool === 'razor'
              ? 'bg-brand-600 text-white'
              : 'hover:bg-surface-raised text-slate-400 hover:text-slate-100'
          }`}
          title="Razor Split Tool (C / S)"
        >
          <Scissors className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-surface-border mx-1" />

        {/* Split at Playhead */}
        <button
          onClick={handleSplitAtPlayhead}
          className="px-2 py-1 rounded bg-surface-raised hover:bg-surface-border text-slate-300 font-medium flex items-center gap-1"
          title="Split Clip at Current Playhead (S)"
        >
          <Scissors className="w-3.5 h-3.5 text-amber-400" />
          Split
        </button>

        {/* Delete Selected */}
        <button
          onClick={deleteSelectedClips}
          disabled={timeline.selected_clip_ids.length === 0}
          className="p-1.5 rounded hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Delete Selected Clip (Del/Backspace)"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-surface-border mx-1" />

        {/* Undo / Redo */}
        <button
          onClick={undo}
          className="p-1.5 rounded hover:bg-surface-raised text-slate-400 hover:text-slate-100"
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={redo}
          className="p-1.5 rounded hover:bg-surface-raised text-slate-400 hover:text-slate-100"
          title="Redo (Ctrl+Y)"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        <div className="h-4 w-[1px] bg-surface-border mx-1" />

        {/* Snapping Magnet */}
        <button
          onClick={toggleSnap}
          className={`p-1.5 rounded transition-colors ${
            timeline.snap_enabled
              ? 'bg-brand-600/30 text-brand-300 border border-brand-500/50'
              : 'hover:bg-surface-raised text-slate-500'
          }`}
          title={timeline.snap_enabled ? 'Snapping Enabled' : 'Snapping Disabled'}
        >
          <Magnet className="w-4 h-4" />
        </button>
      </div>

      {/* Center: Add Track / Add Text Generator */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleAddTextTitle}
          className="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-medium flex items-center gap-1.5 transition-colors"
        >
          <Type className="w-3.5 h-3.5" />
          + Text Overlay
        </button>

        <button
          onClick={() => addTrack('video')}
          className="px-2 py-1 rounded bg-surface-raised hover:bg-surface-border text-slate-300 flex items-center gap-1"
        >
          <Video className="w-3 h-3 text-blue-400" />
          + Video Track
        </button>

        <button
          onClick={() => addTrack('audio')}
          className="px-2 py-1 rounded bg-surface-raised hover:bg-surface-border text-slate-300 flex items-center gap-1"
        >
          <Music className="w-3 h-3 text-emerald-400" />
          + Audio Track
        </button>
      </div>

      {/* Right: Timeline Zoom Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setZoomLevel(timeline.zoom_level - 15)}
          className="p-1 hover:bg-surface-raised rounded text-slate-400 hover:text-slate-100"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <input
          type="range"
          min="15"
          max="200"
          value={timeline.zoom_level}
          onChange={(e) => setZoomLevel(Number(e.target.value))}
          className="w-24 h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
        />

        <button
          onClick={() => setZoomLevel(timeline.zoom_level + 15)}
          className="p-1 hover:bg-surface-raised rounded text-slate-400 hover:text-slate-100"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
