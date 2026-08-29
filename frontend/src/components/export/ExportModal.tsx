'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTimelineStore } from '@/store/timelineStore';
import { RenderJob } from '@/types/timeline';
import {
  Download,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  Settings,
  Terminal,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { project, timeline, saveTimeline } = useTimelineStore();

  const [resolution, setResolution] = useState<'4K' | '1080p' | '720p' | '480p' | '1080x1920' | '1080x1080'>('1080p');
  const [quality, setQuality] = useState<'fast' | 'balanced' | 'high'>('balanced');
  const [fps, setFps] = useState<number>(30);

  const [isRendering, setIsRendering] = useState(false);
  const [renderJob, setRenderJob] = useState<RenderJob | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  if (!isOpen) return null;

  const startRender = async () => {
    if (!project) return;
    setIsRendering(true);
    setProgress(0);
    setLogs([]);
    setError(null);
    setDownloadUrl(null);
    setStatusMessage('Saving timeline state...');

    // 1. First save latest timeline to backend
    await saveTimeline();

    setStatusMessage('Submitting render job to queue...');

    try {
      // 2. Post Render Job
      const res = await fetch('/api/renders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          output_resolution: resolution,
          fps: fps,
          quality: quality,
          format: 'mp4',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create render job');
      }

      const job: RenderJob = await res.json();
      setRenderJob(job);
      setStatusMessage('Queued in worker pipeline...');

      // 3. Connect to WebSocket for live progress
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      let wsHost = window.location.host;
      if (process.env.NEXT_PUBLIC_WS_URL) {
        wsHost = process.env.NEXT_PUBLIC_WS_URL.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
      } else if (window.location.port === '3000') {
        wsHost = `${window.location.hostname}:8000`;
      }
      const wsUrl = `${wsProtocol}//${wsHost}/ws/renders/${job.id}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setLogs((prev) => [...prev, '[WS Connected] Live render monitor active']);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.progress !== undefined) {
            setProgress(data.progress);
          }
          if (data.message) {
            setStatusMessage(data.message);
            setLogs((prev) => [...prev, data.message]);
          }
          if (data.status === 'COMPLETED') {
            setIsRendering(false);
            setProgress(100);
            setDownloadUrl(`/api/renders/${job.id}/download`);
            setStatusMessage('Render completed successfully!');
          } else if (data.status === 'FAILED') {
            setIsRendering(false);
            setError(data.error || 'FFmpeg render job failed');
            setStatusMessage('Render failed.');
          }
        } catch (e) {
          // ignore ping
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
      };
    } catch (err: any) {
      setIsRendering(false);
      setError(err.message || 'Render failed');
      setStatusMessage('Error starting render job');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-2xl flex items-center justify-center p-4 select-none">
      {/* Glow orbs behind modal */}
      <div className="absolute w-96 h-96 rounded-full bg-[#7928ca] opacity-20 blur-[120px] pointer-events-none" />
      <div className="absolute w-64 h-64 rounded-full bg-[#ff007a] opacity-20 blur-[80px] translate-x-48 translate-y-24 pointer-events-none" />
      
      <div className="relative w-full max-w-lg overflow-hidden flex flex-col text-slate-200 text-xs glass-panel animate-in fade-in zoom-in-95 duration-200 border border-white/15 shadow-[0_0_50px_rgba(121,40,202,0.4)]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#ff007a] to-[#7928ca] flex items-center justify-center shadow-[0_0_12px_rgba(255,0,122,0.5)]">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-black text-white text-sm tracking-wide neon-text">RENDER PIPELINE</h2>
              <p className="text-[10px] text-[#ffb6ff] font-mono">FFmpeg Core v6 // H.264 + AAC</p>
            </div>
          </div>
          {!isRendering && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {!isRendering && !downloadUrl && (
            <>
              {/* Preset Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 tracking-wider uppercase">Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-[#ff007a] transition-colors"
                >
                  <option value="1080p">1080p Full HD (1920×1080)</option>
                  <option value="4K">4K Ultra HD (3840×2160)</option>
                  <option value="720p">720p HD (1280×720 – Fast)</option>
                  <option value="1080x1920">Vertical 9:16 (Shorts / Reels)</option>
                  <option value="1080x1080">Square 1:1 (Instagram Post)</option>
                  <option value="480p">480p SD – Lightweight</option>
                </select>
              </div>

              {/* Framerate & Quality */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 tracking-wider uppercase">Framerate</label>
                  <select
                    value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-[#ff007a] transition-colors"
                  >
                    <option value={24}>24 FPS · Cinematic</option>
                    <option value={30}>30 FPS · Standard</option>
                    <option value={60}>60 FPS · Smooth</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 tracking-wider uppercase">Quality</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as any)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-[#ff007a] transition-colors"
                  >
                    <option value="fast">Fast (crf 28)</option>
                    <option value="balanced">Balanced (crf 23)</option>
                    <option value="high">High (crf 18)</option>
                  </select>
                </div>
              </div>

              {/* Render Pipeline Summary */}
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-slate-400 space-y-1.5 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Codec</span>
                  <span className="text-[#00e5ff]">H.264 (libx264) + AAC · 192kbps</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration</span>
                  <span className="text-[#00e5ff]">{timeline.duration_seconds.toFixed(1)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Clips</span>
                  <span className="text-[#00e5ff]">{timeline.clips.length} in composition</span>
                </div>
              </div>
            </>
          )}

          {/* Render Progress Monitor */}
          {(isRendering || downloadUrl || error) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center gap-2 text-xs">
                  {isRendering && <Loader2 className="w-4 h-4 text-[#ff007a] animate-spin" />}
                  {downloadUrl && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {error && <AlertCircle className="w-4 h-4 text-rose-400" />}
                  {statusMessage}
                </span>
                <span className="font-mono font-black text-white text-sm">{progress}%</span>
              </div>

              {/* Neon Progress Bar */}
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                <div
                  style={{ width: `${progress}%` }}
                  className={`h-full transition-all duration-300 rounded-full ${
                    error
                      ? 'bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                      : downloadUrl
                      ? 'bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]'
                      : 'bg-gradient-to-r from-[#ff007a] to-[#7928ca] shadow-[0_0_10px_rgba(255,0,122,0.5)]'
                  }`}
                />
              </div>

              {/* Live Log Stream Console */}
              <div className="bg-black border border-[#00e5ff]/30 rounded-xl p-3 h-32 overflow-y-auto font-mono text-[10px] text-[#00e5ff] space-y-1 shadow-[inset_0_0_20px_rgba(0,229,255,0.1)]">
                <div className="text-[#00e5ff]/50 flex items-center gap-1 mb-2 border-b border-[#00e5ff]/20 pb-1">
                  <Terminal className="w-3.5 h-3.5" />
                  <span className="font-bold tracking-wider">FFMPEG_LIVE_STDOUT //</span>
                </div>
                {logs.map((log, idx) => (
                  <p key={idx} className="leading-tight opacity-90 break-all">
                    <span className="text-[#ff007a] mr-2">[{new Date().toISOString().substring(14, 19)}]</span>
                    {log}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-black/40 border-t border-white/10 flex items-center justify-end gap-3 rounded-b-2xl">
          {!isRendering && !downloadUrl && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={startRender}
                className="px-6 py-2 bg-gradient-to-r from-[#ff007a] to-[#7928ca] text-white rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(255,0,122,0.4)] hover:scale-105 transition-transform text-xs"
              >
                <Sparkles className="w-4 h-4" />
                START EXPORT
              </button>
            </>
          )}

          {downloadUrl && (
            <>
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-md hover:bg-surface text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
              <a
                href={downloadUrl}
                download
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                Download MP4 Video
              </a>
            </>
          )}

          {error && (
            <button
              onClick={startRender}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-md font-semibold"
            >
              Retry Render
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
