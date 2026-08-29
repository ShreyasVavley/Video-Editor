'use client';

import React, { useEffect, useState } from 'react';
import { Scissors, Copy, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useTimelineStore } from '@/store/timelineStore';

interface ContextMenuProps {
  x: number;
  y: number;
  clipId: string | null;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, clipId, onClose }) => {
  const { timeline, splitClip, deleteSelectedClips } = useTimelineStore();

  useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  if (!clipId) return null;

  return (
    <div 
      className="fixed z-[100] w-48 glass-panel rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/20 animate-in fade-in zoom-in duration-200"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="py-1">
        <button 
          onClick={() => {
            splitClip(clipId, timeline.playhead_position);
            onClose();
          }}
          className="w-full px-4 py-2 flex items-center gap-3 hover:bg-[#ff007a]/20 text-slate-300 hover:text-white transition-colors text-xs font-bold"
        >
          <Scissors className="w-3.5 h-3.5 text-[#ff007a]" />
          Split at Playhead
        </button>

        <div className="h-[1px] w-full bg-white/10 my-1" />

        <button 
          onClick={() => {
            deleteSelectedClips();
            onClose();
          }}
          className="w-full px-4 py-2 flex items-center gap-3 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors text-xs font-bold"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          Delete Clip
        </button>
      </div>
    </div>
  );
};
