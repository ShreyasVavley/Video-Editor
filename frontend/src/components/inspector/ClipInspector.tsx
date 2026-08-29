'use client';

import React, { useState } from 'react';
import { useTimelineStore } from '@/store/timelineStore';
import { Clip } from '@/types/timeline';
import {
  Sliders,
  Move,
  Maximize2,
  RotateCw,
  Sun,
  Volume2,
  Type,
  Sparkles,
  Palette,
  Clock,
  Video,
} from 'lucide-react';

export const ClipInspector: React.FC = () => {
  const { timeline, updateClip, commitHistory } = useTimelineStore();
  const [activeTab, setActiveTab] = useState<'transform' | 'filters' | 'audio' | 'text' | 'transitions'>('transform');

  const selectedClip = timeline.clips.find((c) => timeline.selected_clip_ids.includes(c.id));

  if (!selectedClip) {
    return (
      <div className="flex flex-col h-full p-4 select-none text-xs text-slate-400">
        <div className="flex items-center gap-2 text-white font-black mb-4 pb-3 border-b border-white/5">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#ff007a] to-[#7928ca] flex items-center justify-center">
            <Sliders className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm">Inspector</span>
        </div>
        <div className="space-y-3 bg-black/30 p-3 rounded-xl border border-white/5">
          {[
            { label: 'Resolution', value: `${timeline.width} × ${timeline.height}` },
            { label: 'Framerate', value: `${timeline.fps} FPS` },
            { label: 'Duration', value: `${timeline.duration_seconds.toFixed(1)}s` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-mono">{label}</span>
              <span className="text-white font-bold font-mono text-[11px]">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center mt-6">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
            <Video className="w-6 h-6 text-slate-600" />
          </div>
          <p className="text-[11px] text-slate-500 max-w-[160px] leading-relaxed">
            Select a clip on the timeline to edit its properties
          </p>
        </div>
      </div>
    );
  }

  const isText = selectedClip.type === 'text';

  return (
    <div className="flex flex-col h-full select-none text-xs overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-md ${
          selectedClip.type === 'video' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
          selectedClip.type === 'audio' ? 'bg-gradient-to-br from-emerald-500 to-teal-500' :
          selectedClip.type === 'text'  ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
          'bg-gradient-to-br from-[#ff007a] to-[#7928ca]'
        }`}>
          <Sliders className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="overflow-hidden">
          <span className="text-[9px] uppercase font-black font-mono text-[#ffb6ff] tracking-widest">
            {selectedClip.type} Clip
          </span>
          <h3 className="font-bold text-white truncate text-[13px] leading-tight">{selectedClip.name}</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 text-slate-400 overflow-x-auto bg-black/20">
        <button
          onClick={() => setActiveTab('transform')}
          className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1 font-bold transition-all text-[10px] uppercase tracking-wider ${
            activeTab === 'transform'
              ? 'text-white bg-white/5 border-b-2 border-[#ff007a]'
              : 'hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Move className="w-3 h-3 shrink-0" />
          Transform
        </button>

        {isText && (
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1 font-bold transition-all text-[10px] uppercase tracking-wider ${
              activeTab === 'text'
                ? 'text-white bg-white/5 border-b-2 border-[#ff007a]'
                : 'hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Type className="w-3 h-3 shrink-0" />
            Text
          </button>
        )}

        <button
          onClick={() => setActiveTab('filters')}
          className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1 font-bold transition-all text-[10px] uppercase tracking-wider ${
            activeTab === 'filters'
              ? 'text-white bg-white/5 border-b-2 border-[#ff007a]'
              : 'hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Palette className="w-3 h-3 shrink-0" />
          Filters
        </button>

        <button
          onClick={() => setActiveTab('transitions')}
          className={`flex-1 py-2.5 px-2 flex items-center justify-center gap-1 font-bold transition-all text-[10px] uppercase tracking-wider ${
            activeTab === 'transitions'
              ? 'text-white bg-white/5 border-b-2 border-[#ff007a]'
              : 'hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-3 h-3 shrink-0" />
          FX
        </button>

        {selectedClip.type !== 'text' && (
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex-1 py-2 px-2 flex items-center justify-center gap-1 font-medium transition-colors ${
              activeTab === 'audio'
                ? 'text-brand-400 border-b-2 border-brand-500 bg-surface-raised'
                : 'hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 shrink-0" />
            Audio
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onPointerDownCapture={() => commitHistory()}
      >
        {/* --- TRANSFORM TAB --- */}
        {activeTab === 'transform' && (
          <div className="space-y-4">
            {/* Position X / Y */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-300">Position</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">X Offset</span>
                  <input
                    type="range"
                    min="-0.8"
                    max="0.8"
                    step="0.01"
                    value={selectedClip.transform.x}
                    onChange={(e) =>
                      updateClip(selectedClip.id, {
                        transform: { ...selectedClip.transform, x: Number(e.target.value) },
                      })
                    }
                    className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500 mt-1"
                  />
                  <span className="text-[10px] font-mono text-slate-400">
                    {(selectedClip.transform.x * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">Y Offset</span>
                  <input
                    type="range"
                    min="-0.8"
                    max="0.8"
                    step="0.01"
                    value={selectedClip.transform.y}
                    onChange={(e) =>
                      updateClip(selectedClip.id, {
                        transform: { ...selectedClip.transform, y: Number(e.target.value) },
                      })
                    }
                    className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500 mt-1"
                  />
                  <span className="text-[10px] font-mono text-slate-400">
                    {(selectedClip.transform.y * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Scale */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[11px] font-semibold text-slate-300">Scale</label>
                <span className="font-mono text-slate-400">
                  {(selectedClip.transform.scale_x * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.05"
                value={selectedClip.transform.scale_x}
                onChange={(e) => {
                  const s = Number(e.target.value);
                  updateClip(selectedClip.id, {
                    transform: { ...selectedClip.transform, scale_x: s, scale_y: s },
                  })
                }}
                className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Rotation */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[11px] font-semibold text-slate-300">Rotation</label>
                <span className="font-mono text-slate-400">
                  {selectedClip.transform.rotation.toFixed(0)}°
                </span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={selectedClip.transform.rotation}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    transform: { ...selectedClip.transform, rotation: Number(e.target.value) },
                  })
                }
                className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Keyframe Animation (Pan & Zoom) */}
            <div className="pt-2 border-t border-surface-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-blue-400" />
                  Pan & Zoom (Ken Burns)
                </label>
                <input
                  type="checkbox"
                  checked={selectedClip.transform.is_animated || false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    updateClip(selectedClip.id, {
                      transform: { 
                        ...selectedClip.transform, 
                        is_animated: checked,
                        end_x: checked ? selectedClip.transform.x : undefined,
                        end_y: checked ? selectedClip.transform.y : undefined,
                        end_scale: checked ? selectedClip.transform.scale_x : undefined,
                      },
                    });
                  }}
                  className="accent-brand-500 cursor-pointer"
                />
              </div>

              {selectedClip.transform.is_animated && (
                <div className="space-y-3 p-2 bg-surface-raised border border-surface-border rounded-md">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 uppercase font-mono">End Position</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-slate-500 font-mono">X Offset</span>
                        <input
                          type="range" min="-0.8" max="0.8" step="0.01"
                          value={selectedClip.transform.end_x ?? selectedClip.transform.x}
                          onChange={(e) => updateClip(selectedClip.id, { transform: { ...selectedClip.transform, end_x: Number(e.target.value) } })}
                          className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-blue-500 mt-1"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 font-mono">Y Offset</span>
                        <input
                          type="range" min="-0.8" max="0.8" step="0.01"
                          value={selectedClip.transform.end_y ?? selectedClip.transform.y}
                          onChange={(e) => updateClip(selectedClip.id, { transform: { ...selectedClip.transform, end_y: Number(e.target.value) } })}
                          className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-blue-500 mt-1"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-mono">End Scale</span>
                      <span className="font-mono text-slate-400 text-[10px]">
                        {((selectedClip.transform.end_scale ?? selectedClip.transform.scale_x) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range" min="0.2" max="3.0" step="0.05"
                      value={selectedClip.transform.end_scale ?? selectedClip.transform.scale_x}
                      onChange={(e) => updateClip(selectedClip.id, { transform: { ...selectedClip.transform, end_scale: Number(e.target.value) } })}
                      className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Opacity */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[11px] font-semibold text-slate-300">Opacity</label>
                <span className="font-mono text-slate-400">
                  {(selectedClip.transform.opacity * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={selectedClip.transform.opacity}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    transform: { ...selectedClip.transform, opacity: Number(e.target.value) },
                  })
                }
                className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Flip Controls */}
            <div className="pt-2 border-t border-surface-border space-y-2">
              <label className="text-[11px] font-semibold text-slate-300">Flip / Mirror</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateClip(selectedClip.id, { transform: { ...selectedClip.transform, flip_x: !selectedClip.transform.flip_x } })}
                  className={`flex-1 py-1 rounded text-center text-[10px] font-medium transition-colors ${
                    selectedClip.transform.flip_x ? 'bg-brand-600 text-white' : 'bg-surface-raised hover:bg-surface-border text-slate-300'
                  }`}
                >
                  Flip Horizontal
                </button>
                <button
                  onClick={() => updateClip(selectedClip.id, { transform: { ...selectedClip.transform, flip_y: !selectedClip.transform.flip_y } })}
                  className={`flex-1 py-1 rounded text-center text-[10px] font-medium transition-colors ${
                    selectedClip.transform.flip_y ? 'bg-brand-600 text-white' : 'bg-surface-raised hover:bg-surface-border text-slate-300'
                  }`}
                >
                  Flip Vertical
                </button>
              </div>
            </div>

            {/* Video Cropping */}
            <div className="pt-2 border-t border-surface-border space-y-2">
              <label className="text-[11px] font-semibold text-slate-300">Cropping (Edge mask)</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400">Left/Right</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {(((selectedClip.transform.crop_left || 0) + (selectedClip.transform.crop_right || 0)) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={selectedClip.transform.crop_left || 0}
                    onChange={(e) =>
                      updateClip(selectedClip.id, {
                        transform: { ...selectedClip.transform, crop_left: Number(e.target.value), crop_right: Number(e.target.value) },
                      })
                    }
                    className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400">Top/Bottom</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {(((selectedClip.transform.crop_top || 0) + (selectedClip.transform.crop_bottom || 0)) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={selectedClip.transform.crop_top || 0}
                    onChange={(e) =>
                      updateClip(selectedClip.id, {
                        transform: { ...selectedClip.transform, crop_top: Number(e.target.value), crop_bottom: Number(e.target.value) },
                      })
                    }
                    className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Speed Controls */}
            {selectedClip.type !== 'text' && (
              <div className="pt-2 border-t border-surface-border space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Advanced Speed Ramping
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedClip.reverse || false}
                      onChange={(e) => updateClip(selectedClip.id, { reverse: e.target.checked })}
                      className="accent-brand-500"
                    />
                    <span className="text-[10px] text-slate-400 font-semibold">Reverse</span>
                  </label>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400">Playback Speed</span>
                    <span className="font-mono text-amber-400 font-bold text-[11px]">
                      {selectedClip.speed.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10.0"
                    step="0.1"
                    value={selectedClip.speed}
                    onChange={(e) => {
                      const newSpeed = Number(e.target.value);
                      // Adjust duration mathematically so the timeline clip resizes
                      const newDuration = selectedClip.duration / (newSpeed / selectedClip.speed);
                      updateClip(selectedClip.id, { speed: newSpeed, duration: newDuration });
                    }}
                    className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
                
                <div className="grid grid-cols-5 gap-1">
                  {[0.25, 0.5, 1.0, 2.0, 4.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => {
                        const newDuration = selectedClip.duration / (spd / selectedClip.speed);
                        updateClip(selectedClip.id, { speed: spd, duration: newDuration });
                      }}
                      className={`py-1 rounded text-center font-mono text-[10px] font-medium transition-colors ${
                        selectedClip.speed === spd
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-surface-raised hover:bg-surface-border text-slate-300'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TEXT TAB --- */}
        {activeTab === 'text' && selectedClip.text && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-300">Text Content</label>
              <textarea
                rows={3}
                value={selectedClip.text.content}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    text: { ...selectedClip.text!, content: e.target.value },
                  })
                }
                className="w-full mt-1 bg-surface-raised border border-surface-border rounded p-2 text-slate-100 focus:outline-none focus:border-brand-500 text-xs"
              />
            </div>

            <div>
              <div className="flex justify-between">
                <label className="text-[11px] font-semibold text-slate-300">Font Size</label>
                <span className="font-mono text-slate-400">{selectedClip.text.font_size}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="120"
                value={selectedClip.text.font_size}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    text: { ...selectedClip.text!, font_size: Number(e.target.value) },
                  })
                }
                className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500 mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-300">Text Color</label>
                <input
                  type="color"
                  value={selectedClip.text.font_color}
                  onChange={(e) =>
                    updateClip(selectedClip.id, {
                      text: { ...selectedClip.text!, font_color: e.target.value },
                    })
                  }
                  className="w-full h-8 bg-transparent cursor-pointer rounded mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300">Outline Color</label>
                <input
                  type="color"
                  value={selectedClip.text.outline_color}
                  onChange={(e) =>
                    updateClip(selectedClip.id, {
                      text: { ...selectedClip.text!, outline_color: e.target.value },
                    })
                  }
                  className="w-full h-8 bg-transparent cursor-pointer rounded mt-1"
                />
              </div>
            </div>

            {/* Animations */}
            <div className="pt-4 border-t border-surface-border space-y-3">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                Text Animation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">Style</span>
                  <select
                    value={selectedClip.text.animation_style || 'none'}
                    onChange={(e) =>
                      updateClip(selectedClip.id, {
                        text: { 
                          ...selectedClip.text!, 
                          animation_style: e.target.value as any,
                          animation_duration: selectedClip.text?.animation_duration || 1.0
                        },
                      })
                    }
                    className="w-full mt-1 bg-surface-raised border border-surface-border rounded p-1.5 text-slate-200 text-[11px] focus:outline-none focus:border-brand-500"
                  >
                    <option value="none">None</option>
                    <option value="typewriter">Typewriter</option>
                    <option value="slide_up">Slide Up</option>
                    <option value="slide_down">Slide Down</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">Duration (s)</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={selectedClip.text.animation_duration || 1.0}
                    onChange={(e) =>
                      updateClip(selectedClip.id, {
                        text: { 
                          ...selectedClip.text!, 
                          animation_style: selectedClip.text?.animation_style || 'typewriter',
                          animation_duration: parseFloat(e.target.value) || 1.0 
                        },
                      })
                    }
                    disabled={!selectedClip.text.animation_style || selectedClip.text.animation_style === 'none'}
                    className="w-full mt-1 bg-surface-raised border border-surface-border rounded p-1.5 text-slate-200 text-[11px] focus:outline-none focus:border-brand-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- FILTERS TAB --- */}
        {activeTab === 'filters' && (
          <div className="space-y-3">
            {/* Quick Filter Presets */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300">Presets</label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {[
                  { name: 'Normal', b: 1, c: 1, s: 1, h: 0, sep: 0, gray: 0 },
                  { name: 'Vibrant', b: 1.05, c: 1.2, s: 1.5, h: 0, sep: 0, gray: 0 },
                  { name: 'Noir B&W', b: 1, c: 1.3, s: 0, h: 0, sep: 0, gray: 1 },
                  { name: 'Vintage', b: 1.05, c: 0.9, s: 0.8, h: 10, sep: 0.5, gray: 0 },
                  { name: 'Cyber', b: 1.1, c: 1.4, s: 1.6, h: 120, sep: 0, gray: 0 },
                  { name: 'Warm', b: 1.02, c: 1.1, s: 1.2, h: 15, sep: 0.2, gray: 0 },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() =>
                      updateClip(selectedClip.id, {
                        filters: {
                          ...selectedClip.filters,
                          brightness: preset.b,
                          contrast: preset.c,
                          saturation: preset.s,
                          hue: preset.h,
                          sepia: preset.sep,
                          grayscale: preset.gray,
                        },
                      })
                    }
                    className="py-1 px-2 rounded bg-surface-raised hover:bg-surface-border text-slate-300 text-[10px] font-medium transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Brightness */}
            <div className="space-y-1 pt-2 border-t border-surface-border">
              <div className="flex justify-between">
                <label className="text-[10px] text-slate-400">Brightness</label>
                <span className="font-mono text-slate-400">
                  {(selectedClip.filters.brightness * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.0"
                step="0.05"
                value={selectedClip.filters.brightness}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    filters: { ...selectedClip.filters, brightness: Number(e.target.value) },
                  })
                }
                className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] text-slate-400">Contrast</label>
                <span className="font-mono text-slate-400">
                  {(selectedClip.filters.contrast * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.0"
                step="0.05"
                value={selectedClip.filters.contrast}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    filters: { ...selectedClip.filters, contrast: Number(e.target.value) },
                  })
                }
                className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Saturation */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] text-slate-400">Saturation</label>
                <span className="font-mono text-slate-400">
                  {(selectedClip.filters.saturation * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                value={selectedClip.filters.saturation}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    filters: { ...selectedClip.filters, saturation: Number(e.target.value) },
                  })
                }
                className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Chroma Key / Green Screen */}
            <div className="pt-4 border-t border-surface-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-green-500" />
                  Chroma Key
                </label>
                <input
                  type="checkbox"
                  checked={selectedClip.filters.chroma_key_enabled || false}
                  onChange={(e) =>
                    updateClip(selectedClip.id, {
                      filters: { ...selectedClip.filters, chroma_key_enabled: e.target.checked },
                    })
                  }
                  className="accent-brand-500 cursor-pointer"
                />
              </div>

              {selectedClip.filters.chroma_key_enabled && (
                <div className="space-y-3 p-2 bg-surface-raised border border-surface-border rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Key Color</span>
                    <input
                      type="color"
                      value={selectedClip.filters.chroma_key_color || '#00ff00'}
                      onChange={(e) =>
                        updateClip(selectedClip.id, {
                          filters: { ...selectedClip.filters, chroma_key_color: e.target.value },
                        })
                      }
                      className="w-16 h-6 bg-transparent cursor-pointer rounded"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Similarity</span>
                      <span className="font-mono text-slate-400">
                        {((selectedClip.filters.chroma_key_similarity || 0.3) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.01"
                      max="1.0"
                      step="0.01"
                      value={selectedClip.filters.chroma_key_similarity || 0.3}
                      onChange={(e) =>
                        updateClip(selectedClip.id, {
                          filters: { ...selectedClip.filters, chroma_key_similarity: Number(e.target.value) },
                        })
                      }
                      className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400">Blend (Edge Smoothness)</span>
                      <span className="font-mono text-slate-400">
                        {((selectedClip.filters.chroma_key_blend || 0.1) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.01"
                      value={selectedClip.filters.chroma_key_blend || 0.1}
                      onChange={(e) =>
                        updateClip(selectedClip.id, {
                          filters: { ...selectedClip.filters, chroma_key_blend: Number(e.target.value) },
                        })
                      }
                      className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- AUDIO TAB --- */}
        {activeTab === 'audio' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[11px] font-semibold text-slate-300">Clip Volume</label>
                <span className="font-mono text-slate-400">
                  {(selectedClip.audio.volume * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={selectedClip.audio.volume}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    audio: { ...selectedClip.audio, volume: Number(e.target.value) },
                  })
                }
                className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
            {/* Pan */}
            <div className="space-y-1 pt-2 border-t border-surface-border">
              <div className="flex justify-between">
                <label className="text-[10px] text-slate-400">Pan (L/R)</label>
                <span className="font-mono text-slate-400">
                  {selectedClip.audio.pan > 0 ? `R ${(selectedClip.audio.pan * 100).toFixed(0)}` : selectedClip.audio.pan < 0 ? `L ${(Math.abs(selectedClip.audio.pan) * 100).toFixed(0)}` : 'Center'}
                </span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={selectedClip.audio.pan || 0}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    audio: { ...selectedClip.audio, pan: Number(e.target.value) },
                  })
                }
                className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Pitch */}
            <div className="space-y-1 pt-2 border-t border-surface-border">
              <div className="flex justify-between">
                <label className="text-[10px] text-slate-400">Pitch Shift (Semitones)</label>
                <span className="font-mono text-slate-400">
                  {(selectedClip.audio.pitch || 0) > 0 ? `+${selectedClip.audio.pitch}` : (selectedClip.audio.pitch || 0)}
                </span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={selectedClip.audio.pitch || 0}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    audio: { ...selectedClip.audio, pitch: Number(e.target.value) },
                  })
                }
                className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Bass */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] text-slate-400">Bass (Low Shelf)</label>
                <span className="font-mono text-slate-400">
                  {(selectedClip.audio.bass || 0) > 0 ? `+${selectedClip.audio.bass} dB` : `${(selectedClip.audio.bass || 0)} dB`}
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                step="1"
                value={selectedClip.audio.bass || 0}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    audio: { ...selectedClip.audio, bass: Number(e.target.value) },
                  })
                }
                className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Treble */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] text-slate-400">Treble (High Shelf)</label>
                <span className="font-mono text-slate-400">
                  {(selectedClip.audio.treble || 0) > 0 ? `+${selectedClip.audio.treble} dB` : `${(selectedClip.audio.treble || 0)} dB`}
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                step="1"
                value={selectedClip.audio.treble || 0}
                onChange={(e) =>
                  updateClip(selectedClip.id, {
                    audio: { ...selectedClip.audio, treble: Number(e.target.value) },
                  })
                }
                className="w-full h-1 bg-surface-border rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        )}

        {/* --- TRANSITIONS TAB --- */}
        {activeTab === 'transitions' && (
          <div className="space-y-6">
            {/* Transition IN */}
            <div className="space-y-3">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Transition In (Start)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">Type</span>
                  <select
                    value={selectedClip.transition_in?.type || 'none'}
                    onChange={(e) =>
                      updateClip(selectedClip.id, {
                        transition_in: {
                          type: e.target.value as any,
                          duration: selectedClip.transition_in?.duration || 1.0,
                        },
                      })
                    }
                    className="w-full mt-1 bg-surface-raised border border-surface-border rounded p-1.5 text-slate-200 text-[11px] focus:outline-none focus:border-brand-500"
                  >
                    <option value="none">None</option>
                    <option value="fade_black">Fade In</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">Duration (s)</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={selectedClip.transition_in?.duration || 1.0}
                    onChange={(e) =>
                      updateClip(selectedClip.id, {
                        transition_in: {
                          type: selectedClip.transition_in?.type || 'fade_black',
                          duration: parseFloat(e.target.value) || 1.0,
                        },
                      })
                    }
                    disabled={!selectedClip.transition_in || selectedClip.transition_in.type === 'none'}
                    className="w-full mt-1 bg-surface-raised border border-surface-border rounded p-1.5 text-slate-200 text-[11px] focus:outline-none focus:border-brand-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* Transition OUT */}
            <div className="space-y-3 pt-4 border-t border-surface-border">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Transition Out (End)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">Type</span>
                  <select
                    value={selectedClip.transition_out?.type || 'none'}
                    onChange={(e) =>
                      updateClip(selectedClip.id, {
                        transition_out: {
                          type: e.target.value as any,
                          duration: selectedClip.transition_out?.duration || 1.0,
                        },
                      })
                    }
                    className="w-full mt-1 bg-surface-raised border border-surface-border rounded p-1.5 text-slate-200 text-[11px] focus:outline-none focus:border-brand-500"
                  >
                    <option value="none">None</option>
                    <option value="fade_black">Fade Out</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">Duration (s)</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={selectedClip.transition_out?.duration || 1.0}
                    onChange={(e) =>
                      updateClip(selectedClip.id, {
                        transition_out: {
                          type: selectedClip.transition_out?.type || 'fade_black',
                          duration: parseFloat(e.target.value) || 1.0,
                        },
                      })
                    }
                    disabled={!selectedClip.transition_out || selectedClip.transition_out.type === 'none'}
                    className="w-full mt-1 bg-surface-raised border border-surface-border rounded p-1.5 text-slate-200 text-[11px] focus:outline-none focus:border-brand-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
