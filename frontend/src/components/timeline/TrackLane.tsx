'use client';

import React from 'react';
import { Track, Clip, Asset } from '@/types/timeline';
import { useTimelineStore } from '@/store/timelineStore';
import { TimelineClip } from '@/components/timeline/TimelineClip';

interface TrackLaneProps {
  track: Track;
  assets?: Asset[];
}

export const TrackLane: React.FC<TrackLaneProps> = ({ track, assets = [] }) => {
  const { timeline, addClip } = useTimelineStore();
  const zoom = timeline.zoom_level;
  const totalWidth = (timeline.duration_seconds || 60) * zoom;

  // Filter clips on this track
  const trackClips = timeline.clips.filter((c) => c.track_id === track.id);

  // Drag and Drop from Media Library onto Track
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const assetJson = e.dataTransfer.getData('application/json');
    if (!assetJson) return;

    try {
      const asset: Asset = JSON.parse(assetJson);
      const rect = e.currentTarget.getBoundingClientRect();
      const dropOffsetX = e.clientX - rect.left;
      const dropTime = Math.max(0, dropOffsetX / zoom);

      const isAudio = asset.mime_type.startsWith('audio');
      const isVideo = asset.mime_type.startsWith('video');
      const isImage = asset.mime_type.startsWith('image');

      const clipType = isAudio ? 'audio' : isVideo ? 'video' : isImage ? 'image' : 'video';
      const duration = asset.duration_seconds > 0 ? asset.duration_seconds : 5.0;

      const newClip: Clip = {
        id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        track_id: track.id,
        asset_id: asset.id,
        type: clipType,
        name: asset.file_name,
        start_time: dropTime,
        duration: duration,
        trim_in: 0.0,
        trim_out: duration,
        speed: 1.0,
        transform: {
          x: 0,
          y: 0,
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
        audio: {
          volume: 1,
          muted: false,
          pan: 0,
          fade_in: 0,
          fade_out: 0,
        },
      };

      addClip(newClip);
    } catch (err) {
      console.error('Failed to parse dropped asset:', err);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ width: `${totalWidth}px` }}
      className={`relative h-16 border-b border-surface-border bg-timeline-track transition-colors ${
        track.locked ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      {/* Grid line background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#2a2f3d15_1px,transparent_1px)] bg-[size:60px_100%] pointer-events-none" />

      {/* Render Clips */}
      {trackClips.map((clip) => {
        const asset = assets.find((a) => a.id === clip.asset_id);
        return <TimelineClip key={clip.id} clip={clip} waveform={asset?.audio_waveform} />;
      })}
    </div>
  );
};
