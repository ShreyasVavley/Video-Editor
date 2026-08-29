'use client';

import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsOverlay: React.FC<ShortcutsOverlayProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause' },
    { key: 'V', desc: 'Select Tool' },
    { key: 'C', desc: 'Razor Tool (Cut)' },
    { key: 'S', desc: 'Save Project' },
    { key: 'Ctrl + Z', desc: 'Undo' },
    { key: 'Ctrl + Y', desc: 'Redo' },
    { key: 'Delete', desc: 'Delete Selected' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md glass-panel p-6 rounded-2xl border border-white/20 shadow-[0_0_50px_rgba(255,0,122,0.3)] animate-in fade-in zoom-in duration-300">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-[#ff007a] rounded-full blur-[50px] opacity-50 pointer-events-none" />
        
        <div className="flex items-center justify-between mb-6 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00e5ff] to-[#7928ca] flex items-center justify-center shadow-lg">
              <Keyboard className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-black text-white tracking-wide neon-text">Pro Shortcuts</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 relative">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
              <span className="text-sm font-medium text-slate-300">{s.desc}</span>
              <kbd className="px-3 py-1 rounded-lg bg-black/50 border border-white/10 text-xs font-bold text-[#00e5ff] shadow-inner font-mono tracking-widest">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
