import { create } from 'zustand';
import { produce } from 'immer';
import { TimelineState, Track, Clip, Project, TrackType, ClipType } from '@/types/timeline';

export type EditorTool = 'select' | 'razor' | 'hand';

interface HistoryState {
  past: TimelineState[];
  future: TimelineState[];
}

interface TimelineStore {
  project: Project | null;
  timeline: TimelineState;
  isPlaying: boolean;
  activeTool: EditorTool;
  history: HistoryState;
  isSaving: boolean;
  lastSavedAt: string | null;

  // Actions
  setProject: (project: Project) => void;
  setTimeline: (timeline: TimelineState, recordHistory?: boolean) => void;
  setPlayhead: (position: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlayPause: () => void;
  setActiveTool: (tool: EditorTool) => void;
  setZoomLevel: (zoom: number) => void;
  toggleSnap: () => void;
  toggleRippleEdit: () => void;
  
  // Selection
  selectClip: (clipId: string, multi?: boolean) => void;
  deselectAllClips: () => void;

  // Tracks
  addTrack: (type: TrackType, name?: string) => void;
  deleteTrack: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackHidden: (trackId: string) => void;
  setTrackVolume: (trackId: string, volume: number) => void;

  // Clips
  addClip: (clip: Clip) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  deleteClip: (clipId: string) => void;
  deleteSelectedClips: () => void;
  splitClip: (clipId: string, splitTime: number) => void;
  moveClip: (clipId: string, newStartTime: number, newTrackId?: string) => void;
  trimClipIn: (clipId: string, deltaSeconds: number) => void;
  trimClipOut: (clipId: string, deltaSeconds: number) => void;

  // Undo / Redo
  commitHistory: () => void;
  undo: () => void;
  redo: () => void;
  saveTimeline: () => Promise<void>;
}

const initialTimeline: TimelineState = {
  version: 1,
  width: 1920,
  height: 1080,
  fps: 30,
  duration_seconds: 30.0,
  playhead_position: 0.0,
  tracks: [
    { id: 'track_t1', name: 'Text T1', type: 'text', order: 0, muted: false, locked: false, hidden: false, volume: 1.0, solo: false },
    { id: 'track_v2', name: 'Overlay V2', type: 'video', order: 1, muted: false, locked: false, hidden: false, volume: 1.0, solo: false },
    { id: 'track_v1', name: 'Main V1', type: 'video', order: 2, muted: false, locked: false, hidden: false, volume: 1.0, solo: false },
    { id: 'track_a1', name: 'Audio A1', type: 'audio', order: 3, muted: false, locked: false, hidden: false, volume: 1.0, solo: false },
    { id: 'track_a2', name: 'Music A2', type: 'audio', order: 4, muted: false, locked: false, hidden: false, volume: 1.0, solo: false },
  ],
  clips: [],
  selected_clip_ids: [],
  zoom_level: 60.0, // 60px per second
  snap_enabled: true,
  ripple_edit: false,
};

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  project: null,
  timeline: initialTimeline,
  isPlaying: false,
  activeTool: 'select',
  history: { past: [], future: [] },
  isSaving: false,
  lastSavedAt: null,

  setProject: (project) => {
    set({
      project,
      timeline: {
        ...project.timeline_state,
        zoom_level: project.timeline_state.zoom_level || 60.0,
        snap_enabled: project.timeline_state.snap_enabled ?? true,
      },
      history: { past: [], future: [] },
    });
  },

  setTimeline: (timeline, recordHistory = true) => {
    set(
      produce((state: TimelineStore) => {
        if (recordHistory) {
          state.history.past.push(JSON.parse(JSON.stringify(state.timeline)));
          state.history.future = [];
          if (state.history.past.length > 30) state.history.past.shift();
        }
        state.timeline = timeline;
      })
    );
  },

  setPlayhead: (position) => {
    set(
      produce((state: TimelineStore) => {
        state.timeline.playhead_position = Math.max(0, Math.min(position, state.timeline.duration_seconds || 3600));
      })
    );
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setActiveTool: (activeTool) => set({ activeTool }),

  setZoomLevel: (zoom) => {
    set(
      produce((state: TimelineStore) => {
        state.timeline.zoom_level = Math.max(10, Math.min(zoom, 300));
      })
    );
  },

  toggleSnap: () => {
    set(
      produce((state: TimelineStore) => {
        state.timeline.snap_enabled = !state.timeline.snap_enabled;
      })
    );
  },

  toggleRippleEdit: () => {
    set(
      produce((state: TimelineStore) => {
        state.timeline.ripple_edit = !state.timeline.ripple_edit;
      })
    );
  },

  selectClip: (clipId, multi = false) => {
    set(
      produce((state: TimelineStore) => {
        if (multi) {
          if (state.timeline.selected_clip_ids.includes(clipId)) {
            state.timeline.selected_clip_ids = state.timeline.selected_clip_ids.filter((id) => id !== clipId);
          } else {
            state.timeline.selected_clip_ids.push(clipId);
          }
        } else {
          state.timeline.selected_clip_ids = [clipId];
        }
      })
    );
  },

  deselectAllClips: () => {
    set(
      produce((state: TimelineStore) => {
        state.timeline.selected_clip_ids = [];
      })
    );
  },

  addTrack: (type, name) => {
    set(
      produce((state: TimelineStore) => {
        state.history.past.push(JSON.parse(JSON.stringify(state.timeline)));
        state.history.future = [];
        const count = state.timeline.tracks.filter((t) => t.type === type).length + 1;
        const newTrack: Track = {
          id: `track_${type}_${Date.now()}`,
          name: name || `${type.toUpperCase()} ${count}`,
          type,
          order: state.timeline.tracks.length,
          muted: false,
          locked: false,
          hidden: false,
          volume: 1.0,
          solo: false,
        };
        state.timeline.tracks.push(newTrack);
      })
    );
  },

  deleteTrack: (trackId) => {
    set(
      produce((state: TimelineStore) => {
        state.history.past.push(JSON.parse(JSON.stringify(state.timeline)));
        state.history.future = [];
        state.timeline.tracks = state.timeline.tracks.filter((t) => t.id !== trackId);
        state.timeline.clips = state.timeline.clips.filter((c) => c.track_id !== trackId);
      })
    );
  },

  toggleTrackMute: (trackId) => {
    set(
      produce((state: TimelineStore) => {
        const track = state.timeline.tracks.find((t) => t.id === trackId);
        if (track) track.muted = !track.muted;
      })
    );
  },

  toggleTrackSolo: (trackId) => {
    set(
      produce((state: TimelineStore) => {
        const track = state.timeline.tracks.find((t) => t.id === trackId);
        if (track) track.solo = !track.solo;
      })
    );
  },

  toggleTrackLock: (trackId) => {
    set(
      produce((state: TimelineStore) => {
        const track = state.timeline.tracks.find((t) => t.id === trackId);
        if (track) track.locked = !track.locked;
      })
    );
  },

  toggleTrackHidden: (trackId) => {
    set(
      produce((state: TimelineStore) => {
        const track = state.timeline.tracks.find((t) => t.id === trackId);
        if (track) track.hidden = !track.hidden;
      })
    );
  },

  setTrackVolume: (trackId, volume) => {
    set(
      produce((state: TimelineStore) => {
        const track = state.timeline.tracks.find((t) => t.id === trackId);
        if (track) track.volume = Math.max(0, Math.min(volume, 2));
      })
    );
  },

  addClip: (clip) => {
    set(
      produce((state: TimelineStore) => {
        state.history.past.push(JSON.parse(JSON.stringify(state.timeline)));
        state.history.future = [];
        state.timeline.clips.push(clip);
        state.timeline.selected_clip_ids = [clip.id];

        // Recalculate duration
        const maxEnd = Math.max(...state.timeline.clips.map((c) => c.start_time + c.duration), 30.0);
        state.timeline.duration_seconds = Math.max(state.timeline.duration_seconds, maxEnd);
      })
    );
  },

  updateClip: (clipId, updates) => {
    set(
      produce((state: TimelineStore) => {
        const clip = state.timeline.clips.find((c) => c.id === clipId);
        if (clip) {
          Object.assign(clip, updates);
        }
      })
    );
  },

  deleteClip: (clipId) => {
    set(
      produce((state: TimelineStore) => {
        state.history.past.push(JSON.parse(JSON.stringify(state.timeline)));
        state.history.future = [];
        state.timeline.clips = state.timeline.clips.filter((c) => c.id !== clipId);
        state.timeline.selected_clip_ids = state.timeline.selected_clip_ids.filter((id) => id !== clipId);
      })
    );
  },

  deleteSelectedClips: () => {
    set(
      produce((state: TimelineStore) => {
        if (state.timeline.selected_clip_ids.length === 0) return;
        state.history.past.push(JSON.parse(JSON.stringify(state.timeline)));
        state.history.future = [];
        const selectedSet = new Set(state.timeline.selected_clip_ids);
        state.timeline.clips = state.timeline.clips.filter((c) => !selectedSet.has(c.id));
        state.timeline.selected_clip_ids = [];
      })
    );
  },

  splitClip: (clipId, splitTime) => {
    set(
      produce((state: TimelineStore) => {
        const clip = state.timeline.clips.find((c) => c.id === clipId);
        if (!clip) return;

        // Verify split time is inside the clip
        if (splitTime <= clip.start_time + 0.1 || splitTime >= clip.start_time + clip.duration - 0.1) {
          return;
        }

        state.history.past.push(JSON.parse(JSON.stringify(state.timeline)));
        state.history.future = [];

        const leftDuration = splitTime - clip.start_time;
        const rightDuration = clip.duration - leftDuration;
        const speed = clip.speed || 1.0;

        // Clip 1 (Left portion)
        const oldTrimIn = clip.trim_in;
        const oldTrimOut = clip.trim_out;
        clip.duration = leftDuration;
        clip.trim_out = oldTrimIn + leftDuration * speed;

        // Clip 2 (Right portion)
        const rightClip: Clip = {
          ...JSON.parse(JSON.stringify(clip)),
          id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: `${clip.name} (Part 2)`,
          start_time: splitTime,
          duration: rightDuration,
          trim_in: clip.trim_out,
          trim_out: oldTrimOut,
        };

        state.timeline.clips.push(rightClip);
        state.timeline.selected_clip_ids = [rightClip.id];
      })
    );
  },

  moveClip: (clipId, newStartTime, newTrackId) => {
    set(
      produce((state: TimelineStore) => {
        const clip = state.timeline.clips.find((c) => c.id === clipId);
        if (!clip) return;

        clip.start_time = Math.max(0, newStartTime);
        if (newTrackId) {
          clip.track_id = newTrackId;
        }

        const maxEnd = Math.max(...state.timeline.clips.map((c) => c.start_time + c.duration), 30.0);
        state.timeline.duration_seconds = Math.max(state.timeline.duration_seconds, maxEnd);
      })
    );
  },

  trimClipIn: (clipId, deltaSeconds) => {
    set(
      produce((state: TimelineStore) => {
        const clip = state.timeline.clips.find((c) => c.id === clipId);
        if (!clip) return;

        const maxDelta = clip.duration - 0.2;
        const actualDelta = Math.min(deltaSeconds, maxDelta);

        clip.start_time += actualDelta;
        clip.duration -= actualDelta;
        clip.trim_in += actualDelta * (clip.speed || 1.0);
      })
    );
  },

  trimClipOut: (clipId, deltaSeconds) => {
    set(
      produce((state: TimelineStore) => {
        const clip = state.timeline.clips.find((c) => c.id === clipId);
        if (!clip) return;

        const newDuration = Math.max(0.2, clip.duration + deltaSeconds);
        clip.duration = newDuration;
        clip.trim_out = clip.trim_in + newDuration * (clip.speed || 1.0);
      })
    );
  },

  commitHistory: () => {
    set(
      produce((state: TimelineStore) => {
        state.history.past.push(JSON.parse(JSON.stringify(state.timeline)));
        state.history.future = [];
        if (state.history.past.length > 50) state.history.past.shift();
      })
    );
  },

  undo: () => {
    set(
      produce((state: TimelineStore) => {
        if (state.history.past.length === 0) return;
        const previous = state.history.past.pop()!;
        state.history.future.push(JSON.parse(JSON.stringify(state.timeline)));
        state.timeline = previous;
      })
    );
  },

  redo: () => {
    set(
      produce((state: TimelineStore) => {
        if (state.history.future.length === 0) return;
        const next = state.history.future.pop()!;
        state.history.past.push(JSON.parse(JSON.stringify(state.timeline)));
        state.timeline = next;
      })
    );
  },

  saveTimeline: async () => {
    const { project, timeline } = get();
    if (!project) return;
    set({ isSaving: true });
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeline_state: timeline,
          duration_seconds: timeline.duration_seconds,
        }),
      });
      if (res.ok) {
        set({ lastSavedAt: new Date().toLocaleTimeString(), isSaving: false });
      }
    } catch (e) {
      console.error('Failed to save project:', e);
      set({ isSaving: false });
    }
  },
}));
