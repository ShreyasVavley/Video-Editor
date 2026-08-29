'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTimelineStore } from '@/store/timelineStore';
import { videoPool } from '@/utils/videoPool';
import { audioEngine } from '@/components/audio/WebAudioEngine';
import { secondsToTimecode } from '@/utils/timecode';
import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
  VolumeX,
  Layers,
  Sparkles,
} from 'lucide-react';

interface CompositorProps {
  aspectRatio?: '16:9' | '9:16' | '1:1' | '21:9';
  onAspectChange?: (aspect: '16:9' | '9:16' | '1:1' | '21:9') => void;
}

export const CompositorCanvas: React.FC<CompositorProps> = ({
  aspectRatio = '16:9',
  onAspectChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const {
    timeline,
    isPlaying,
    setPlayhead,
    setIsPlaying,
    togglePlayPause,
    selectClip,
    updateClip,
  } = useTimelineStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSafeAreas, setShowSafeAreas] = useState(false);
  const [previewQuality, setPreviewQuality] = useState<'full' | 'half' | 'quarter'>('full');
  const [isDraggingCanvasClip, setIsDraggingCanvasClip] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number; clipX: number; clipY: number } | null>(null);

  // Resolution calculation
  const targetWidth = timeline.width || 1920;
  const targetHeight = timeline.height || 1080;

  // Selected clip for canvas transform overlay
  const selectedClip = timeline.clips.find((c) => timeline.selected_clip_ids.includes(c.id));

  // --- Animation Playback Loop ---
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      if (isPlaying) {
        const nextPos = timeline.playhead_position + deltaTime;
        if (nextPos >= timeline.duration_seconds) {
          setPlayhead(0);
          setIsPlaying(false);
        } else {
          setPlayhead(nextPos);
        }
      }

      drawFrame();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, timeline.playhead_position, timeline.duration_seconds, timeline.clips, timeline.tracks]);

  // Sync audio engine
  useEffect(() => {
    if (audioEngine) {
      audioEngine.syncTracks(timeline.tracks);
    }
  }, [timeline.tracks]);

  // --- Frame Compositor Function ---
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const playhead = timeline.playhead_position;

    // Clear canvas
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Filter active tracks and sort by track order (bottom-to-top rendering)
    const sortedTracks = [...timeline.tracks].sort((a, b) => b.order - a.order);

    for (const track of sortedTracks) {
      if (track.hidden) continue;

      // Find clips on this track that are active at the current playhead time
      const activeClips = timeline.clips.filter(
        (c) => c.track_id === track.id && playhead >= c.start_time && playhead < c.start_time + c.duration
      );

      for (const clip of activeClips) {
        const clipOffset = playhead - clip.start_time;
        const sourceTime = clip.trim_in + clipOffset * (clip.speed || 1.0);

        ctx.save();

        // 1. Transform Matrix (Position, Scale, Rotation, Opacity)
        const centerX = targetWidth / 2 + clip.transform.x * targetWidth;
        const centerY = targetHeight / 2 + clip.transform.y * targetHeight;

        let extraY = 0;
        let displayContent = clip.text?.content || '';

        if (clip.type === 'text' && clip.text && clip.text.animation_style && clip.text.animation_style !== 'none') {
          const animDur = clip.text.animation_duration || 1.0;
          const animProgress = Math.min(1, Math.max(0, clipOffset / animDur));
          
          if (clip.text.animation_style === 'typewriter') {
            const charCount = Math.floor(animProgress * displayContent.length);
            displayContent = displayContent.substring(0, charCount);
          } else if (clip.text.animation_style === 'slide_up') {
            extraY = (1 - animProgress) * (targetHeight * 0.2);
          } else if (clip.text.animation_style === 'slide_down') {
            extraY = -(1 - animProgress) * (targetHeight * 0.2);
          }
        }

        ctx.translate(centerX, centerY + extraY);
        if (clip.transform.rotation !== 0) {
          ctx.rotate((clip.transform.rotation * Math.PI) / 180);
        }
        ctx.scale(clip.transform.scale_x, clip.transform.scale_y);
        
        let computedOpacity = clip.transform.opacity;
        
        // Transition IN
        if (clip.transition_in && clip.transition_in.type === 'fade_black') {
          const inDur = clip.transition_in.duration;
          if (clipOffset < inDur) {
            computedOpacity *= (clipOffset / inDur);
          }
        }
        
        // Transition OUT
        if (clip.transition_out && clip.transition_out.type === 'fade_black') {
          const outDur = clip.transition_out.duration;
          const timeRemaining = clip.duration - clipOffset;
          if (timeRemaining < outDur && timeRemaining > 0) {
            computedOpacity *= (timeRemaining / outDur);
          }
        }
        
        ctx.globalAlpha = Math.max(0, Math.min(1, computedOpacity));

        // 2. CSS Color Filters
        const f = clip.filters;
        const filterParts: string[] = [];
        if (f.brightness !== 1) filterParts.push(`brightness(${f.brightness * 100}%)`);
        if (f.contrast !== 1) filterParts.push(`contrast(${f.contrast * 100}%)`);
        if (f.saturation !== 1) filterParts.push(`saturate(${f.saturation * 100}%)`);
        if (f.hue !== 0) filterParts.push(`hue-rotate(${f.hue}deg)`);
        if (f.blur > 0) filterParts.push(`blur(${f.blur}px)`);
        if (f.sepia > 0) filterParts.push(`sepia(${f.sepia * 100}%)`);
        if (f.grayscale > 0) filterParts.push(`grayscale(${f.grayscale * 100}%)`);
        if (f.invert > 0) filterParts.push(`invert(${f.invert * 100}%)`);
        if (filterParts.length > 0) {
          ctx.filter = filterParts.join(' ');
        }

        // 3. Render Visual Media / Text
        if (clip.type === 'video' && clip.asset_id && videoPool) {
          const videoSrc = `/api/assets/${clip.asset_id}/proxy`;
          const videoEl = videoPool.acquire(clip.asset_id, videoSrc);

          if (isPlaying) {
            if (videoEl.paused) videoEl.play().catch(() => {});
            videoPool.seek(clip.asset_id, sourceTime);
          } else {
            if (!videoEl.paused) videoEl.pause();
            videoPool.seek(clip.asset_id, sourceTime);
          }

          if (videoEl.readyState >= 2) {
            // Aspect fit into canvas
            const vw = videoEl.videoWidth || targetWidth;
            const vh = videoEl.videoHeight || targetHeight;
            const aspect = vw / vh;
            const targetAspect = targetWidth / targetHeight;

            let dw = targetWidth;
            let dh = targetHeight;
            if (aspect > targetAspect) {
              dh = targetWidth / aspect;
            } else {
              dw = targetHeight * aspect;
            }

            ctx.drawImage(videoEl, -dw / 2, -dh / 2, dw, dh);
          } else {
            // Placeholder while loading
            ctx.fillStyle = '#1e222b';
            ctx.fillRect(-targetWidth / 4, -targetHeight / 4, targetWidth / 2, targetHeight / 2);
            ctx.fillStyle = '#64748b';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Loading: ${clip.name}`, 0, 0);
          }
        } else if (clip.type === 'text' && clip.text) {
          const txt = clip.text;
          ctx.font = `bold ${txt.font_size}px ${txt.font_family || 'sans-serif'}`;
          ctx.textAlign = txt.alignment || 'center';
          ctx.textBaseline = 'middle';

          // Text Background Box / Pill
          if (txt.background_color && txt.background_color !== 'transparent' && displayContent.length > 0) {
            const metrics = ctx.measureText(displayContent);
            const padX = (txt.background_padding || 12) + 8;
            const padY = (txt.background_padding || 8) + 4;
            const textWidth = metrics.width;
            const textHeight = txt.font_size;
            
            ctx.fillStyle = txt.background_color;
            ctx.beginPath();
            ctx.roundRect(-textWidth / 2 - padX, -textHeight / 2 - padY, textWidth + padX * 2, textHeight + padY * 2, 8);
            ctx.fill();
          }

          // Text Shadow
          if (txt.shadow) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
          }

          // Text Outline
          if (txt.outline_width > 0 && displayContent.length > 0) {
            ctx.strokeStyle = txt.outline_color || '#000000';
            ctx.lineWidth = txt.outline_width * 2;
            ctx.strokeText(displayContent, 0, 0);
          }

          // Text Fill
          if (displayContent.length > 0) {
            ctx.fillStyle = txt.font_color || '#FFFFFF';
            ctx.fillText(displayContent, 0, 0);
          }
        }

        ctx.restore();
      }
    }

    // --- Safe Areas Overlay ---
    if (showSafeAreas) {
      ctx.save();
      // Action Safe (90%)
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(targetWidth * 0.05, targetHeight * 0.05, targetWidth * 0.9, targetHeight * 0.9);

      // Title Safe (80%)
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(targetWidth * 0.1, targetHeight * 0.1, targetWidth * 0.8, targetHeight * 0.8);

      // Center crosshair
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(targetWidth / 2 - 20, targetHeight / 2);
      ctx.lineTo(targetWidth / 2 + 20, targetHeight / 2);
      ctx.moveTo(targetWidth / 2, targetHeight / 2 - 20);
      ctx.lineTo(targetWidth / 2, targetHeight / 2 + 20);
      ctx.stroke();

      ctx.restore();
    }

    // --- Selected Clip Transform Bounding Box ---
    if (selectedClip && selectedClip.start_time <= playhead && playhead <= selectedClip.start_time + selectedClip.duration) {
      ctx.save();
      const cx = targetWidth / 2 + selectedClip.transform.x * targetWidth;
      const cy = targetHeight / 2 + selectedClip.transform.y * targetHeight;
      ctx.translate(cx, cy);
      if (selectedClip.transform.rotation !== 0) {
        ctx.rotate((selectedClip.transform.rotation * Math.PI) / 180);
      }
      ctx.scale(selectedClip.transform.scale_x, selectedClip.transform.scale_y);

      const boxW = selectedClip.type === 'text' ? (selectedClip.text?.content.length || 10) * 30 : targetWidth;
      const boxH = selectedClip.type === 'text' ? (selectedClip.text?.font_size || 48) * 1.5 : targetHeight;

      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

      // Handle corner dots
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(-boxW / 2 - 4, -boxH / 2 - 4, 8, 8);
      ctx.fillRect(boxW / 2 - 4, -boxH / 2 - 4, 8, 8);
      ctx.fillRect(-boxW / 2 - 4, boxH / 2 - 4, 8, 8);
      ctx.fillRect(boxW / 2 - 4, boxH / 2 - 4, 8, 8);
      ctx.restore();
    }

    ctx.restore();
  }, [
    timeline.playhead_position,
    timeline.clips,
    timeline.tracks,
    isPlaying,
    targetWidth,
    targetHeight,
    showSafeAreas,
    selectedClip,
  ]);

  // --- Canvas Mouse Drag for direct on-screen repositioning ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedClip || !canvasRef.current) return;
    
    // Check if we are selecting a new clip on canvas click? Actually canvas drag only moves currently selected clip right now.
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Commit history before drag starts
    useTimelineStore.getState().commitHistory();

    setIsDraggingCanvasClip(true);
    dragStartPos.current = {
      x,
      y,
      clipX: selectedClip.transform.x,
      clipY: selectedClip.transform.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingCanvasClip || !dragStartPos.current || !selectedClip || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const deltaX = (currentX - dragStartPos.current.x) / rect.width;
    const deltaY = (currentY - dragStartPos.current.y) / rect.height;

    updateClip(selectedClip.id, {
      transform: {
        ...selectedClip.transform,
        x: Math.max(-1, Math.min(1, dragStartPos.current.clipX + deltaX)),
        y: Math.max(-1, Math.min(1, dragStartPos.current.clipY + deltaY)),
      },
    });
  };

  const handleMouseUp = () => {
    setIsDraggingCanvasClip(false);
    dragStartPos.current = null;
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col bg-background border-b border-surface-border select-none ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-full flex-1'
      }`}
    >
      {/* Top Viewport Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-surface-border text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-100 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            Compositor Preview
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 font-mono">
            {targetWidth}x{targetHeight} @ {timeline.fps}fps
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Aspect Ratio Selector */}
          <select
            value={aspectRatio}
            onChange={(e) => onAspectChange?.(e.target.value as any)}
            className="bg-surface-raised border border-surface-border rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-brand-500"
          >
            <option value="16:9">16:9 Landscape (YouTube/TV)</option>
            <option value="9:16">9:16 Vertical (Shorts/Reels)</option>
            <option value="1:1">1:1 Square (Instagram)</option>
            <option value="21:9">21:9 Ultrawide Cinema</option>
          </select>

          {/* Safe Areas Toggle */}
          <button
            onClick={() => setShowSafeAreas(!showSafeAreas)}
            className={`px-2 py-1 rounded border text-xs font-medium transition-colors ${
              showSafeAreas
                ? 'bg-brand-600/30 border-brand-500 text-brand-100'
                : 'bg-surface-raised border-surface-border text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Safe Area Guides"
          >
            Safe Margins
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 hover:bg-surface-raised rounded text-slate-400 hover:text-slate-100"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport Area */}
      <div className="flex-1 relative flex items-center justify-center p-4 bg-black overflow-hidden">
        <canvas
          ref={canvasRef}
          width={targetWidth}
          height={targetHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="max-h-full max-w-full aspect-video object-contain shadow-2xl rounded cursor-crosshair border border-surface-border/50"
        />
      </div>

      {/* Playback Control Bar */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-surface border-t border-surface-border">
        {/* Left: Timecode Display */}
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="text-slate-100 font-semibold">
            {secondsToTimecode(timeline.playhead_position, timeline.fps)}
          </span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">
            {secondsToTimecode(timeline.duration_seconds, timeline.fps)}
          </span>
        </div>

        {/* Center: Play / Pause / Shuttle Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPlayhead(0)}
            className="p-2 hover:bg-surface-raised text-slate-400 hover:text-slate-100 rounded-full transition-colors"
            title="Go to Start (Home)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setPlayhead(Math.max(0, timeline.playhead_position - 1))}
            className="p-2 hover:bg-surface-raised text-slate-400 hover:text-slate-100 rounded-full transition-colors"
            title="Step Back 1s (J)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlayPause}
            className={`p-3 rounded-full font-bold shadow-lg transition-transform active:scale-95 ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                : 'bg-brand-600 hover:bg-brand-500 text-white'
            }`}
            title="Play / Pause (Space)"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => setPlayhead(Math.min(timeline.duration_seconds, timeline.playhead_position + 1))}
            className="p-2 hover:bg-surface-raised text-slate-400 hover:text-slate-100 rounded-full transition-colors"
            title="Step Forward 1s (L)"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Quick Zoom / Mode Badges */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="px-2 py-0.5 rounded bg-surface-raised border border-surface-border text-slate-300 font-mono">
            {timeline.clips.length} Clips
          </span>
          <span className="px-2 py-0.5 rounded bg-surface-raised border border-surface-border text-slate-300 font-mono">
            {timeline.tracks.length} Tracks
          </span>
        </div>
      </div>
    </div>
  );
};
