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
  ChevronRight,
  HardDrive,
  Cpu,
  MonitorPlay,
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
      // Auto login guest for seamless zero-auth self-hosted use
      const authRes = await fetch('/api/auth/guest', { method: 'POST' });
      if (authRes.ok) {
        const authData = await authRes.json();
        localStorage.setItem('auth_token', authData.access_token);
      }

      const res = await fetch('/api/projects');
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
      const res = await fetch('/api/health');
      if (res.ok) {
        setSystemHealth(await res.json());
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchProjects();
    fetchHealth();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    let width = 1920;
    let height = 1080;
    if (newAspect === '9:16') {
      width = 1080;
      height = 1920;
    } else if (newAspect === '1:1') {
      width = 1080;
      height = 1080;
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle || 'Untitled Project',
          width,
          height,
          fps: 30,
          duration_seconds: 30.0,
        }),
      });

      if (res.ok) {
        const created: Project = await res.json();
        router.push(`/editor/${created.id}`);
      }
    } catch (e) {
      console.error('Failed to create project:', e);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  const handleDuplicateProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/projects/${id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        fetchProjects();
      }
    } catch (e) {
      console.error('Failed to duplicate:', e);
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b border-surface-border bg-surface px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/30">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-100 tracking-tight">
              Cloud-Native Video Studio
            </h1>
            <p className="text-[11px] text-slate-400">Self-Hosted NLE Platform (FFmpeg 7.1 Core)</p>
          </div>
        </div>

        {/* System Health Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-raised border border-surface-border text-xs text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[11px]">Local Engine: Online</span>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-brand-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-8">
        {/* Create Modal */}
        {isCreating && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateProject}
              className="bg-surface border border-surface-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-500" />
                  Create Video Project
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-slate-400 hover:text-slate-200 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Project Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-surface-raised border border-surface-border rounded-md px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-brand-500"
                  placeholder="e.g. Cinematic Intro, Summer Vlog"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Aspect Ratio</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '16:9', label: '16:9 Landscape', desc: 'YouTube & Desktop' },
                    { id: '9:16', label: '9:16 Vertical', desc: 'TikTok / Shorts' },
                    { id: '1:1', label: '1:1 Square', desc: 'Instagram Feed' },
                  ].map((asp) => (
                    <button
                      key={asp.id}
                      type="button"
                      onClick={() => setNewAspect(asp.id as any)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        newAspect === asp.id
                          ? 'border-brand-500 bg-brand-600/20 text-brand-200'
                          : 'border-surface-border bg-surface-raised hover:bg-surface text-slate-400'
                      }`}
                    >
                      <p className="font-bold text-xs">{asp.id}</p>
                      <p className="text-[10px] mt-1 text-slate-400">{asp.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-md hover:bg-surface text-slate-400 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-md font-semibold text-xs shadow-lg shadow-brand-600/30"
                >
                  Open Editor
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Projects</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select an existing project or launch a new video timeline
            </p>
          </div>
        </div>

        {/* Project Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-56 bg-surface-raised border border-surface-border rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-surface border border-surface-border rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <MonitorPlay className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-100">No Projects Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Create your first project to start editing videos with multi-track timelines, audio mixing, and FFmpeg exporting.
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-semibold text-xs flex items-center gap-2 shadow-lg shadow-brand-600/20"
            >
              <Plus className="w-4 h-4" />
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {/* New Project Card */}
            <div
              onClick={() => setIsCreating(true)}
              className="h-64 border-2 border-dashed border-surface-border hover:border-brand-500 rounded-xl bg-surface/50 hover:bg-surface flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-surface-raised group-hover:bg-brand-600 flex items-center justify-center text-slate-400 group-hover:text-white transition-all mb-3 shadow-md">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-semibold text-slate-200 text-sm">New Project</span>
              <span className="text-[11px] text-slate-500 mt-1">Multi-track timeline</span>
            </div>

            {/* Existing Projects */}
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => router.push(`/editor/${proj.id}`)}
                className="group relative bg-surface border border-surface-border hover:border-brand-500/70 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:-translate-y-0.5 flex flex-col"
              >
                {/* Thumbnail Preview Area */}
                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-surface-border">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                  <Film className="w-10 h-10 text-slate-700 group-hover:text-brand-500 transition-colors" />

                  {/* Resolution & FPS Badge */}
                  <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded bg-black/70 border border-white/10 text-[10px] font-mono text-slate-300">
                    {proj.width}x{proj.height} @ {proj.fps}fps
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 z-20 px-2 py-0.5 rounded bg-black/70 border border-white/10 text-[10px] font-mono text-slate-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {proj.duration_seconds.toFixed(1)}s
                  </div>
                </div>

                {/* Project Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-100 group-hover:text-brand-400 transition-colors truncate">
                      {proj.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                      <Layers className="w-3 h-3" />
                      {proj.timeline_state?.tracks?.length || 5} Tracks | {proj.timeline_state?.clips?.length || 0} Clips
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-surface-border mt-3">
                    <span className="text-[10px] text-slate-500" suppressHydrationWarning>
                      {new Date(proj.updated_at).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDuplicateProject(proj.id, e)}
                        className="p-1.5 hover:bg-surface-raised rounded text-slate-400 hover:text-slate-100"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleDeleteProject(proj.id, e)}
                        className="p-1.5 hover:bg-rose-950/60 rounded text-slate-400 hover:text-rose-400"
                        title="Delete"
                      >
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
    </div>
  );
}
