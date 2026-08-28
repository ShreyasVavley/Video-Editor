'use client';

import React from 'react';
import { Track } from '@/types/timeline';
import { useTimelineStore } from '@/store/timelineStore';
import {
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Trash2,
  Video,
  Music,
  Type,
} from 'lucide-react';

interface TrackHeaderProps {
  track: Track;
}

export const TrackHeader: React.FC<TrackHeaderProps> = ({ track }) => {
  const {
    toggleTrackMute,
    toggleTrackSolo,
    toggleTrackLock,
    toggleTrackHidden,
    setTrackVolume,
    deleteTrack,
  } = useTimelineStore();

  const getTrackIcon = () => {
    switch (track.type) {
      case 'video':
        return <Video className="w-3.5 h-3.5 text-blue-400" />;
      case 'audio':
        return <Music className="w-3.5 h-3.5 text-emerald-400" />;
      case 'text':
        return <Type className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="h-16 px-3 py-2 bg-surface-raised border-b border-r border-surface-border flex items-center justify-between select-none">
      {/* Left info: Icon & Name */}
      <div className="flex items-center gap-2 overflow-hidden">
        {getTrackIcon()}
        <span className="text-xs font-semibold text-slate-200 truncate">{track.name}</span>
      </div>

      {/* Right controls: Mute, Solo, Lock, Delete */}
      <div className="flex items-center gap-1 text-slate-400">
        {/* Hide / Mute Visual */}
        {track.type !== 'audio' && (
          <button
            onClick={() => toggleTrackHidden(track.id)}
            className={`p-1 rounded hover:bg-surface ${
              track.hidden ? 'text-rose-400' : 'text-slate-400 hover:text-slate-100'
            }`}
            title={track.hidden ? 'Show Track' : 'Hide Track'}
          >
            {track.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Audio Mute */}
        {track.type === 'audio' && (
          <button
            onClick={() => toggleTrackMute(track.id)}
            className={`p-1 rounded hover:bg-surface ${
              track.muted ? 'text-rose-400' : 'text-slate-400 hover:text-slate-100'
            }`}
            title={track.muted ? 'Unmute Track' : 'Mute Track'}
          >
            {track.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Solo Button */}
        {track.type === 'audio' && (
          <button
            onClick={() => toggleTrackSolo(track.id)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
              track.solo ? 'bg-amber-500 text-slate-950' : 'bg-surface hover:bg-surface-border text-slate-400'
            }`}
            title="Solo Track"
          >
            S
          </button>
        )}

        {/* Lock Track */}
        <button
          onClick={() => toggleTrackLock(track.id)}
          className={`p-1 rounded hover:bg-surface ${
            track.locked ? 'text-amber-400' : 'text-slate-400 hover:text-slate-100'
          }`}
          title={track.locked ? 'Unlock Track' : 'Lock Track'}
        >
          {track.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>

        {/* Delete Track */}
        <button
          onClick={() => deleteTrack(track.id)}
          className="p-1 rounded hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 transition-colors"
          title="Delete Track"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
