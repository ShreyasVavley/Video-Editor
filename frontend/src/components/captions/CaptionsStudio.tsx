'use client';

import React, { useState } from 'react';
import { useTimelineStore } from '@/store/timelineStore';
import { Asset, Clip } from '@/types/timeline';
import { formatTimeDisplay } from '@/utils/timecode';
import {
  Type,
  Sparkles,
  Upload,
  Download,
  Plus,
  Trash2,
  Play,
  Scissors,
  Loader2,
  FileText,
  Palette,
  Check,
} from 'lucide-react';

interface CaptionSegment {
  id: string;
  start_time: number;
  end_time: number;
  duration: number;
  text: string;
}

interface CaptionsStudioProps {
  assets: Asset[];
  onSeekPlayhead?: (seconds: number) => void;
}

export const CaptionsStudio: React.FC<CaptionsStudioProps> = ({ assets, onSeekPlayhead }) => {
  const { timeline, setPlayhead, addClip, addTrack } = useTimelineStore();

  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id || '');
  const [modelSize, setModelSize] = useState<'tiny' | 'base'>('tiny');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [captions, setCaptions] = useState<CaptionSegment[]>([
    {
      id: 'cap_1',
      start_time: 0.5,
      end_time: 2.8,
      duration: 2.3,
      text: 'Create stunning viral captions',
    },
    {
      id: 'cap_2',
      start_time: 3.0,
      end_time: 5.5,
      duration: 2.5,
      text: 'Completely offline with local Whisper AI',
    },
  ]);

  // Style Presets
  const [selectedPreset, setSelectedPreset] = useState<'tiktok' | 'clean' | 'neon' | 'box' | 'red'>('tiktok');
  const [fontSize, setFontSize] = useState<number>(46);
  const [yOffset, setYOffset] = useState<number>(0.32); // Lower third placement

  const stylePresets = {
    tiktok: {
      name: 'Viral TikTok',
      fontColor: '#FFE600',
      outlineColor: '#000000',
      outlineWidth: 3,
      bgColor: 'transparent',
      shadow: true,
      desc: 'Bold yellow pop with heavy black outline',
    },
    clean: {
      name: 'Clean Minimalist',
      fontColor: '#FFFFFF',
      outlineColor: '#000000',
      outlineWidth: 1,
      bgColor: 'transparent',
      shadow: true,
      desc: 'Sleek white typography with subtle shadow',
    },
    neon: {
      name: 'Cyber Neon',
      fontColor: '#00FF66',
      outlineColor: '#000000',
      outlineWidth: 2.5,
      bgColor: 'transparent',
      shadow: true,
      desc: 'Vibrant neon green outline',
    },
    box: {
      name: 'Cinematic Box',
      fontColor: '#FFFFFF',
      outlineColor: '#000000',
      outlineWidth: 1,
      bgColor: 'rgba(0,0,0,0.7)',
      shadow: true,
      desc: 'Black background box with crisp white text',
    },
    red: {
      name: 'Punchy Red',
      fontColor: '#FFFFFF',
      outlineColor: '#B91C1C',
      outlineWidth: 2,
      bgColor: 'transparent',
      shadow: true,
      desc: 'High energy white text with red stroke',
    },
  };

  // --- Auto-Transcribe with Local Whisper ---
  const handleAutoTranscribe = async () => {
    if (!selectedAssetId) return;
    setIsTranscribing(true);

    try {
      const res = await fetch('/api/captions/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_id: selectedAssetId,
          model_size: modelSize,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setCaptions(data);
        }
      }
    } catch (e) {
      console.error('Transcription error:', e);
    } finally {
      setIsTranscribing(false);
    }
  };

  // --- Import SRT File ---
  const handleImportSRT = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/captions/parse-file', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setCaptions(data);
        }
      }
    } catch (e) {
      console.error('SRT Parse error:', e);
    }
  };

  // --- Export SRT File ---
  const handleExportSRT = async () => {
    try {
      const res = await fetch('/api/captions/export-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments: captions }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'captions.srt';
        a.click();
      }
    } catch (e) {
      console.error('SRT Export error:', e);
    }
  };

  // --- AI Text-to-Speech (TTS) ---
  const [ttsText, setTtsText] = useState('');
  const [ttsLang, setTtsLang] = useState('en');
  const [ttsAccent, setTtsAccent] = useState('com');
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);

  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) return;
    setIsGeneratingTTS(true);
    try {
      const res = await fetch('/api/assets/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ttsText,
          language: ttsLang,
          accent: ttsAccent,
          project_id: useTimelineStore.getState().project?.id
        })
      });
      if (res.ok) {
        const asset = await res.json();
        const playhead = timeline.playhead_position;
        let audioTrack = useTimelineStore.getState().timeline.tracks.find((t) => t.type === 'audio');
        if (!audioTrack) {
          addTrack('audio', 'Voiceovers');
          audioTrack = useTimelineStore.getState().timeline.tracks.find((t) => t.type === 'audio');
        }
        const trackId = audioTrack ? audioTrack.id : 'track_a1';

        addClip({
          id: `clip_tts_${Date.now()}`,
          track_id: trackId,
          asset_id: asset.id,
          type: 'audio',
          name: asset.file_name,
          start_time: playhead,
          duration: asset.duration_seconds || 5.0,
          trim_in: 0,
          trim_out: asset.duration_seconds || 5.0,
          speed: 1.0,
          transform: { x: 0, y: 0, scale_x: 1, scale_y: 1, rotation: 0, opacity: 1, blend_mode: 'normal' },
          filters: { brightness: 1, contrast: 1, saturation: 1, hue: 0, blur: 0, vignette: 0, sepia: 0, grayscale: 0, invert: 0 },
          audio: { volume: 1, muted: false, pan: 0, fade_in: 0, fade_out: 0 },
        });
        setTtsText('');
      }
    } catch (e) {
      console.error("TTS error:", e);
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  // --- Apply Captions onto Timeline ---
  const handleApplyToTimeline = () => {
    // Ensure Text track exists
    let textTrack = timeline.tracks.find((t) => t.type === 'text');
    if (!textTrack) {
      addTrack('text', 'Captions T1');
      textTrack = timeline.tracks.find((t) => t.type === 'text');
    }
    const trackId = textTrack ? textTrack.id : 'track_t1';

    const preset = stylePresets[selectedPreset];

    for (const cap of captions) {
      const newClip: Clip = {
        id: `clip_cap_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        track_id: trackId,
        type: 'text',
        name: `Caption: ${cap.text.slice(0, 15)}...`,
        start_time: cap.start_time,
        duration: Math.max(0.5, cap.end_time - cap.start_time),
        trim_in: 0.0,
        trim_out: Math.max(0.5, cap.end_time - cap.start_time),
        speed: 1.0,
        transform: {
          x: 0.0,
          y: yOffset,
          scale_x: 1.0,
          scale_y: 1.0,
          rotation: 0.0,
          opacity: 1.0,
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
          content: cap.text,
          font_family: 'Roboto-Bold',
          font_size: fontSize,
          font_color: preset.fontColor,
          background_color: preset.bgColor,
          background_padding: 6,
          alignment: 'center',
          outline_color: preset.outlineColor,
          outline_width: preset.outlineWidth,
          shadow: preset.shadow,
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
    }
  };

  const handleUpdateCaption = (id: string, updates: Partial<CaptionSegment>) => {
    setCaptions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, duration: (updates.end_time ?? c.end_time) - (updates.start_time ?? c.start_time) } : c))
    );
  };

  const handleAddCaption = () => {
    const lastCap = captions[captions.length - 1];
    const newStart = lastCap ? lastCap.end_time + 0.2 : timeline.playhead_position;
    const newCap: CaptionSegment = {
      id: `cap_${Date.now()}`,
      start_time: Math.round(newStart * 10) / 10,
      end_time: Math.round((newStart + 2.0) * 10) / 10,
      duration: 2.0,
      text: 'New subtitle phrase',
    };
    setCaptions((prev) => [...prev, newCap]);
  };

  const handleDeleteCaption = (id: string) => {
    setCaptions((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-surface border-r border-surface-border select-none text-xs">
      {/* Header */}
      <div className="px-4 py-2.5 bg-surface-raised border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-slate-100">Captions Maker</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Export SRT */}
          <button
            onClick={handleExportSRT}
            className="p-1 hover:bg-surface rounded text-slate-400 hover:text-slate-100 flex items-center gap-1 text-[11px]"
            title="Download SRT"
          >
            <Download className="w-3.5 h-3.5" />
            <span>SRT</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 1. AI Auto-Transcribe Box */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              AI Speech-to-Text (Whisper Core)
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-slate-400 uppercase font-mono">Audio / Video Source</label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full bg-surface border border-surface-border rounded-md px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.file_name} ({a.duration_seconds.toFixed(1)}s)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoTranscribe}
              disabled={isTranscribing || !selectedAssetId}
              className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Transcribing Offline...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-Generate Subtitles
                </>
              )}
            </button>

            {/* Import SRT */}
            <label className="px-3 py-2 bg-surface hover:bg-surface-border border border-surface-border rounded-lg text-slate-300 font-medium cursor-pointer flex items-center gap-1">
              <Upload className="w-3.5 h-3.5" />
              <input
                type="file"
                accept=".srt,.vtt"
                onChange={(e) => e.target.files?.[0] && handleImportSRT(e.target.files[0])}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* 2. AI Text-to-Speech (TTS) */}
        <div className="bg-surface-raised border border-surface-border rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              AI Voiceover (Text-to-Speech)
            </span>
          </div>

          <textarea
            rows={2}
            value={ttsText}
            onChange={(e) => setTtsText(e.target.value)}
            placeholder="Type your script here..."
            className="w-full bg-surface border border-surface-border rounded-md px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-mono">Language</label>
              <select
                value={ttsLang}
                onChange={(e) => setTtsLang(e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-md px-2.5 py-1.5 text-slate-200 text-[11px] focus:outline-none focus:border-blue-500"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-mono">Accent</label>
              <select
                value={ttsAccent}
                onChange={(e) => setTtsAccent(e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-md px-2.5 py-1.5 text-slate-200 text-[11px] focus:outline-none focus:border-blue-500"
              >
                <option value="com">United States</option>
                <option value="co.uk">United Kingdom</option>
                <option value="com.au">Australia</option>
                <option value="co.in">India</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerateTTS}
            disabled={isGeneratingTTS || !ttsText.trim()}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
          >
            {isGeneratingTTS ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating Voice...
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5" />
                Generate Voiceover
              </>
            )}
          </button>
        </div>

        {/* 3. Caption Styling Presets */}
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-brand-400" />
            Caption Style Presets
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(stylePresets).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => setSelectedPreset(key as any)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  selectedPreset === key
                    ? 'border-amber-500 bg-amber-500/10 text-amber-200 shadow-md'
                    : 'border-surface-border bg-surface-raised hover:bg-surface text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{preset.name}</span>
                  {selectedPreset === key && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{preset.desc}</p>
              </button>
            ))}
          </div>

          {/* Size & Position Adjusters */}
          <div className="pt-2 grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-slate-400">Font Size ({fontSize}px)</span>
              <input
                type="range"
                min="24"
                max="80"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full h-1 bg-surface-border rounded appearance-none cursor-pointer accent-amber-500 mt-1"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400">Position Placement</span>
              <select
                value={yOffset === 0.32 ? 'bottom' : yOffset === 0 ? 'middle' : 'top'}
                onChange={(e) => {
                  const val = e.target.value;
                  setYOffset(val === 'bottom' ? 0.32 : val === 'middle' ? 0.0 : -0.32);
                }}
                className="w-full mt-1 bg-surface-raised border border-surface-border rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
              >
                <option value="bottom">Lower Third (Bottom)</option>
                <option value="middle">Center (Middle)</option>
                <option value="top">Top Header</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Subtitle Segment List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300">
              Subtitle Segments ({captions.length})
            </span>
            <button
              onClick={handleAddCaption}
              className="px-2 py-0.5 rounded bg-surface-raised hover:bg-surface-border text-slate-300 font-medium flex items-center gap-1 text-[10px]"
            >
              <Plus className="w-3 h-3" />
              Add Segment
            </button>
          </div>

          <div className="space-y-2">
            {captions.map((cap) => (
              <div
                key={cap.id}
                onClick={() => setPlayhead(cap.start_time)}
                className="group bg-surface-raised border border-surface-border hover:border-amber-500/50 rounded-lg p-2.5 space-y-2 cursor-pointer transition-all"
              >
                {/* Time Range Controls */}
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-surface text-amber-300 font-semibold">
                      {formatTimeDisplay(cap.start_time)}
                    </span>
                    <span>→</span>
                    <span className="px-1.5 py-0.5 rounded bg-surface text-slate-300">
                      {formatTimeDisplay(cap.end_time)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCaption(cap.id);
                      }}
                      className="p-1 hover:bg-rose-950/60 rounded text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Subtitle Text Input */}
                <textarea
                  rows={2}
                  value={cap.text}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleUpdateCaption(cap.id, { text: e.target.value })}
                  className="w-full bg-surface border border-surface-border focus:border-amber-500 rounded p-1.5 text-xs text-slate-100 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer: 1-Click Apply to Timeline */}
      <div className="p-3 bg-surface-raised border-t border-surface-border">
        <button
          onClick={handleApplyToTimeline}
          disabled={captions.length === 0}
          className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
        >
          <Type className="w-4 h-4" />
          Apply {captions.length} Captions to Timeline
        </button>
      </div>
    </div>
  );
};
