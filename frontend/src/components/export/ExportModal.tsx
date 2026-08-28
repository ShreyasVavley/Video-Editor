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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-surface-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-slate-200 text-xs animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-surface-raised border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <h2 className="font-bold text-slate-100 text-sm">Export Video (FFmpeg Core)</h2>
          </div>
          {!isRendering && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-surface rounded text-slate-400 hover:text-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {!isRendering && !downloadUrl && (
            <>
              {/* Preset Selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300">Export Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value as any)}
                  className="w-full bg-surface-raised border border-surface-border rounded-md px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-brand-500"
                >
                  <option value="1080p">1080p Full HD (1920x1080 - 16:9 Standard)</option>
                  <option value="4K">4K Ultra HD (3840x2160 - Master Quality)</option>
                  <option value="720p">720p HD (1280x720 - Fast Preview)</option>
                  <option value="1080x1920">1080x1920 Vertical (Shorts / Reels / TikTok 9:16)</option>
                  <option value="1080x1080">1080x1080 Square (Instagram Post 1:1)</option>
                  <option value="480p">480p SD (854x480 - Lightweight)</option>
                </select>
              </div>

              {/* Framerate & Quality */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300">Framerate</label>
                  <select
                    value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                    className="w-full bg-surface-raised border border-surface-border rounded-md px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-brand-500"
                  >
                    <option value={24}>24 FPS (Cinematic)</option>
                    <option value={30}>30 FPS (Standard)</option>
                    <option value={60}>60 FPS (Smooth Motion)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300">Quality Preset</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as any)}
                    className="w-full bg-surface-raised border border-surface-border rounded-md px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-brand-500"
                  >
                    <option value="fast">Fast (Ultrafast preset, crf 28)</option>
                    <option value="balanced">Balanced (Medium preset, crf 23)</option>
                    <option value="high">High (Slow preset, crf 18)</option>
                  </select>
                </div>
              </div>

              {/* Render Pipeline Summary */}
              <div className="p-3 bg-surface-raised rounded-md border border-surface-border text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Codec:</span>
                  <span className="font-mono text-slate-200">H.264 (libx264) + AAC (192kbps)</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-mono text-slate-200">
                    {timeline.duration_seconds.toFixed(1)} seconds
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Clips in composition:</span>
                  <span className="font-mono text-slate-200">{timeline.clips.length}</span>
                </div>
              </div>
            </>
          )}

          {/* Render Progress Monitor */}
          {(isRendering || downloadUrl || error) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-2">
                  {isRendering && <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />}
                  {downloadUrl && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {error && <AlertCircle className="w-4 h-4 text-rose-400" />}
                  {statusMessage}
                </span>
                <span className="font-mono font-bold text-slate-100">{progress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-surface-border rounded-full h-2.5 overflow-hidden">
                <div
                  style={{ width: `${progress}%` }}
                  className={`h-full transition-all duration-300 ${
                    error
                      ? 'bg-rose-500'
                      : downloadUrl
                      ? 'bg-emerald-500'
                      : 'bg-brand-500'
                  }`}
                />
              </div>

              {/* Live Log Stream Console */}
              <div className="bg-black/60 border border-surface-border rounded-md p-2.5 h-28 overflow-y-auto font-mono text-[10px] text-slate-400 space-y-0.5">
                <div className="text-slate-500 flex items-center gap-1 mb-1">
                  <Terminal className="w-3 h-3" />
                  <span>FFmpeg Live Pipeline Log:</span>
                </div>
                {logs.map((log, idx) => (
                  <p key={idx} className="leading-tight">
                    &gt; {log}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-surface-raised border-t border-surface-border flex items-center justify-end gap-2">
          {!isRendering && !downloadUrl && (
            <>
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-md hover:bg-surface text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={startRender}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-md font-semibold flex items-center gap-1.5 shadow-lg shadow-brand-600/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Start Export
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
