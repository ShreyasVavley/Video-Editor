import { getApiUrl } from "@/utils/config";
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Project } from '@/types/timeline';
import {
  Film,
  Plus,
  Clock,
  Sparkles,
  Layers,
  Trash2,
  Copy,
  Cpu,
  MonitorPlay,
  Zap,
  X,
  ChevronRight,
  Star,
  Download,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('My Cinematic Video');
  const [newAspect, setNewAspect] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [systemHealth, setSystemHealth] = useState<any>(null);

  const fetchProjects = async () => {
    try {
      const authRes = await fetch(getApiUrl('/api/auth/guest')), { method: 'POST' });
      if (authRes.ok) {
        const authData = await authRes.json();
        localStorage.setItem('auth_token', authData.access_token);
      }
      const res = await fetch(getApiUrl('/api/projects')));
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch(getApiUrl('/api/health')));
      if (res.ok) setSystemHealth(await res.json());
    } catch (e) {}
  };

  useEffect(() => {
    fetchProjects();
    fetchHealth();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    let width = 1920, height = 1080;
    if (newAspect === '9:16') { width = 1080; height = 1920; }
    else if (newAspect === '1:1') { width = 1080; height = 1080; }
    try {
      const res = await fetch(getApiUrl('/api/projects')), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle || 'Untitled Project', width, height, fps: 30, duration_seconds: 30.0 }),
      });
      if (res.ok) {
        const created: Project = await res.json();
        router.push(`/editor/${created.id}`);
      }
    } catch (e) { console.error('Failed to create project:', e); }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    try {
      await fetch(getApiUrl(`/api/projects/${id}`)), { method: 'DELETE' });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (e) { console.error('Failed to delete:', e); }
  };

  const handleDuplicateProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(getApiUrl(`/api/projects/${id}/duplicate`)), { method: 'POST' });
      if (res.ok) fetchProjects();
    } catch (e) { console.error('Failed to duplicate:', e); }
  };

  return (
    <div className="min-h-screen clay-bg text-slate-100">
      {/* Clay orbs — fixed so they don't scroll with content */}
      <div className="clay-orb-1" />
      <div className="clay-orb-2" />
      <div className="clay-orb-3" />

      {/* Top Navbar */}
      <header className="relative z-10 clay-card mx-4 mt-4 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff6eb0] to-[#9b6dff] flex items-center justify-center clay-btn-primary clay-btn">
            <Film className="w-5 h-5 text-white drop-shadow" />
          </div>
          <div>
            <h1 className="font-black text-base text-white tracking-wide neon-text">
              Cloud-Native Video Studio
            </h1>
            <p className="text-[11px] text-[#c8a8ff] font-mono font-bold">Self-Hosted NLE · FFmpeg 7.1 Core</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="clay-pill flex items-center gap-2 px-4 py-2 bg-black/30 text-xs text-slate-300 font-mono backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-[#4dffc3] pulse-dot shadow-[0_0_8px_rgba(77,255,195,0.8)]" />
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span>Engine Online</span>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="clay-btn clay-btn-primary px-5 py-2 rounded-2xl text-white font-black text-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </header>

      {/* Main Content — block layout so it grows with content and page scrolls */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-6 py-8 space-y-8 pb-16">

        {/* Hero Banner */}
        <div className="clay-card p-8 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#9b6dff] opacity-20 blur-[60px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full bg-[#ff6eb0] opacity-15 blur-[50px] pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-[#ff6eb0]" />
                <span className="text-xs font-black text-[#c8a8ff] uppercase tracking-widest font-mono">Pro Video Editor</span>
              </div>
              <h2 className="text-3xl font-black text-white leading-tight neon-text">
                Create Something<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6eb0] to-[#9b6dff]">Extraordinary</span>
              </h2>
              <p className="text-sm text-slate-400 mt-3 max-w-md leading-relaxed mb-5">
                Multi-track NLE with FFmpeg rendering, AI captions, audio waveforms, keyframe animation, and real-time export.
              </p>
              <div className="flex items-center gap-4">
                <a 
                  href="https://github.com/ShreyasVavley/Video-Editor/releases/latest"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-black rounded-2xl clay-btn clay-btn-primary text-white"
                >
                  <Download className="w-5 h-5" />
                  Download for Windows
                </a>
                <span className="text-xs text-slate-500 font-mono">v1.0.0 • Offline App</span>
              </div>
            </div>
            <div className="hidden lg:flex gap-4">
              {[
                { icon: Sparkles, label: 'AI Captions', color: 'from-[#ffb347] to-[#ff6eb0]' },
                { icon: Layers, label: 'Multi-Track', color: 'from-[#5de8ff] to-[#9b6dff]' },
                { icon: Zap, label: 'FFmpeg Core', color: 'from-[#ff6eb0] to-[#9b6dff]' },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex flex-col items-center gap-2 p-4 rounded-2xl clay-card w-24">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center clay-btn`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-black text-slate-300 text-center">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#ff6eb0] to-[#9b6dff]" />
            <div>
              <h2 className="text-lg font-black text-white">Your Projects</h2>
              <p className="text-xs text-slate-400 font-mono">{projects.length} project{projects.length !== 1 ? 's' : ''} in workspace</p>
            </div>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="text-xs text-[#ff6eb0] hover:text-white font-bold flex items-center gap-1 transition-colors"
          >
            View all <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Project Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 clay-card rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="clay-card rounded-3xl p-16 text-center flex flex-col items-center justify-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#ff6eb0]/20 to-[#9b6dff]/20 border border-white/10 flex items-center justify-center clay-btn">
              <MonitorPlay className="w-10 h-10 text-[#ff6eb0]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white">No Projects Yet</h3>
              <p className="text-sm text-slate-400 max-w-sm">
                Create your first project to start editing with multi-track timelines, AI tools, and FFmpeg rendering.
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="clay-btn clay-btn-primary px-8 py-3 rounded-2xl text-white font-black flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {/* New Project Card */}
            <div
              onClick={() => setIsCreating(true)}
              className="h-64 border-2 border-dashed border-white/10 hover:border-[#ff6eb0]/50 rounded-2xl hover:bg-[#ff6eb0]/5 flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/5 group-hover:bg-gradient-to-br group-hover:from-[#ff6eb0] group-hover:to-[#9b6dff] flex items-center justify-center text-slate-500 group-hover:text-white transition-all mb-3 clay-btn group-hover:clay-btn-primary">
                <Plus className="w-7 h-7" />
              </div>
              <span className="font-black text-slate-300 group-hover:text-white text-sm transition-colors">New Project</span>
              <span className="text-[11px] text-slate-500 mt-1">Multi-track timeline</span>
            </div>

            {/* Existing Projects */}
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => router.push(`/editor/${proj.id}`)}
                className="group relative clay-card rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(155,109,255,0.3)] flex flex-col"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#2d1b69]/80 to-black" />
                  <Film className="w-10 h-10 text-white/20 group-hover:text-[#ff6eb0]/70 transition-colors relative z-10" />
                  <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-xl clay-pill bg-black/60 text-[10px] font-mono text-slate-300 backdrop-blur-sm">
                    {proj.width}×{proj.height} @ {proj.fps}fps
                  </div>
                  <div className="absolute bottom-2 right-2 z-20 px-2 py-0.5 rounded-xl clay-pill bg-black/60 text-[10px] font-mono text-slate-300 flex items-center gap-1 backdrop-blur-sm">
                    <Clock className="w-3 h-3 text-[#ff6eb0]" />
                    {proj.duration_seconds.toFixed(1)}s
                  </div>
                </div>
                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-black text-sm text-white group-hover:text-[#ff6eb0] transition-colors truncate">
                      {proj.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                      <Layers className="w-3 h-3" />
                      {proj.timeline_state?.tracks?.length || 5} Tracks · {proj.timeline_state?.clips?.length || 0} Clips
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-3">
                    <span className="text-[10px] text-slate-600 font-mono" suppressHydrationWarning>
                      {new Date(proj.updated_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => handleDuplicateProject(proj.id, e)} className="p-1.5 clay-btn-ghost clay-btn rounded-xl text-slate-500 hover:text-white" title="Duplicate">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => handleDeleteProject(proj.id, e)} className="p-1.5 hover:bg-[#ff6eb0]/20 rounded-xl text-slate-500 hover:text-[#ff6eb0] transition-colors clay-btn" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="absolute w-96 h-96 rounded-full bg-[#9b6dff] opacity-20 blur-[100px] pointer-events-none" />
          <form
            onSubmit={handleCreateProject}
            className="relative clay-card w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff6eb0] to-[#9b6dff] flex items-center justify-center clay-btn clay-btn-primary">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm neon-text">New Project</h3>
                  <p className="text-[10px] text-[#c8a8ff] font-mono font-bold">Setup your timeline</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsCreating(false)} className="p-2 clay-btn-ghost clay-btn rounded-xl text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider">Project Title</label>
              <input
                type="text" required value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#ff6eb0] transition-colors placeholder:text-slate-600 font-medium"
                placeholder="Cinematic Intro, Summer Vlog…"
                style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)' }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider">Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: '16:9', label: '16:9', desc: 'YouTube · Desktop' },
                  { id: '9:16', label: '9:16', desc: 'TikTok · Shorts' },
                  { id: '1:1', label: '1:1', desc: 'Instagram Feed' },
                ].map((asp) => (
                  <button
                    key={asp.id} type="button"
                    onClick={() => setNewAspect(asp.id as any)}
                    className={`p-3 rounded-2xl clay-btn text-left transition-all ${
                      newAspect === asp.id
                        ? 'clay-btn-primary bg-gradient-to-br from-[#ff6eb0]/20 to-[#9b6dff]/20'
                        : 'clay-btn-ghost'
                    }`}
                  >
                    <p className="font-black text-sm text-white">{asp.id}</p>
                    <p className="text-[10px] mt-1 text-slate-400">{asp.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 clay-btn clay-btn-ghost rounded-2xl text-slate-400 hover:text-white text-xs font-black">
                Cancel
              </button>
              <button type="submit" className="clay-btn clay-btn-primary px-6 py-2 rounded-2xl text-white font-black text-xs flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Launch Editor
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
