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
} from 'lucide-react';

export const ClipInspector: React.FC = () => {
  const { timeline, updateClip, commitHistory } = useTimelineStore();
  const [activeTab, setActiveTab] = useState<'transform' | 'filters' | 'audio' | 'text' | 'transitions'>('transform');

  const selectedClip = timeline.clips.find((c) => timeline.selected_clip_ids.includes(c.id));

  if (!selectedClip) {
    return (
      <div className="flex flex-col h-full bg-surface border-l border-surface-border p-4 select-none text-xs text-slate-400">
        <div className="flex items-center gap-2 text-slate-200 font-semibold mb-4">
          <Sliders className="w-4 h-4 text-brand-500" />
          Project Properties
        </div>
        <div className="space-y-3 bg-surface-raised p-3 rounded-md border border-surface-border">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono">Canvas Resolution</span>
            <p className="text-slate-200 font-semibold mt-0.5">
              {timeline.width} x {timeline.height}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono">Framerate</span>
            <p className="text-slate-200 font-semibold mt-0.5">{timeline.fps} FPS</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono">Total Duration</span>
            <p className="text-slate-200 font-semibold mt-0.5">{timeline.duration_seconds.toFixed(1)}s</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mt-6 text-center">
          Select a clip on the timeline to edit its transforms, filters, and audio properties.
        </p>
      </div>
    );
  }

  const isText = selectedClip.type === 'text';

  return (
    <div className="flex flex-col h-full bg-surface border-l border-surface-border select-none text-xs">
      {/* Header */}
      <div className="px-4 py-3 bg-surface-raised border-b border-surface-border flex items-center justify-between">
        <div className="overflow-hidden pr-2">
          <span className="text-[10px] uppercase font-mono text-brand-400">
            {selectedClip.type} Clip
          </span>
          <h3 className="font-semibold text-slate-100 truncate">{selectedClip.name}</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border bg-surface text-slate-400 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('transform')}
          className={`flex-1 py-2 px-2 flex items-center justify-center gap-1 font-medium transition-colors ${
            activeTab === 'transform'
              ? 'text-brand-400 border-b-2 border-brand-500 bg-surface-raised'
              : 'hover:text-slate-200'
          }`}
        >
          <Move className="w-3.5 h-3.5 shrink-0" />
          Transform
        </button>

        {isText && (
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2 px-2 flex items-center justify-center gap-1 font-medium transition-colors ${
              activeTab === 'text'
                ? 'text-brand-400 border-b-2 border-brand-500 bg-surface-raised'
                : 'hover:text-slate-200'
            }`}
          >
            <Type className="w-3.5 h-3.5 shrink-0" />
            Text
          </button>
        )}

        <button
          onClick={() => setActiveTab('filters')}
          className={`flex-1 py-2 px-2 flex items-center justify-center gap-1 font-medium transition-colors ${
            activeTab === 'filters'
              ? 'text-brand-400 border-b-2 border-brand-500 bg-surface-raised'
              : 'hover:text-slate-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5 shrink-0" />
          Filters
        </button>

        <button
          onClick={() => setActiveTab('transitions')}
          className={`flex-1 py-2 px-2 flex items-center justify-center gap-1 font-medium transition-colors ${
            activeTab === 'transitions'
              ? 'text-brand-400 border-b-2 border-brand-500 bg-surface-raised'
              : 'hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          Transitions
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

            {/* Speed Controls */}
            <div className="pt-2 border-t border-surface-border space-y-2">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Playback Speed
              </label>
              <div className="grid grid-cols-5 gap-1">
                {[0.5, 0.75, 1.0, 1.5, 2.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => updateClip(selectedClip.id, { speed: spd })}
                    className={`py-1 rounded text-center font-mono text-[11px] font-medium transition-colors ${
                      selectedClip.speed === spd
                        ? 'bg-brand-600 text-white font-bold'
                        : 'bg-surface-raised hover:bg-surface-border text-slate-300'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
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
