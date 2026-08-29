export type TrackType = 'video' | 'audio' | 'text';

export type ClipType = 'video' | 'audio' | 'image' | 'text' | 'color';

export interface TransformConfig {
  x: number;          // Normalized offset (-0.5 to +0.5)
  y: number;
  scale_x: number;    // 1.0 = 100%
  scale_y: number;
  
  // Keyframe Animation (Pan & Zoom / Ken Burns)
  is_animated?: boolean;
  end_x?: number;
  end_y?: number;
  end_scale?: number;
  
  rotation: number;   // Degrees (0-360)
  opacity: number;    // 0.0 to 1.0
  blend_mode: string; // 'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'
  flip_x?: boolean;
  flip_y?: boolean;
  crop_top?: number;    // 0.0 to 1.0
  crop_bottom?: number; // 0.0 to 1.0
  crop_left?: number;   // 0.0 to 1.0
  crop_right?: number;  // 0.0 to 1.0
}

export interface FilterConfig {
  brightness: number; // 0.0 to 2.0 (1.0 default)
  contrast: number;   // 0.0 to 2.0 (1.0 default)
  saturation: number; // 0.0 to 2.0 (1.0 default)
  hue: number;        // -180 to 180
  blur: number;       // Pixels
  vignette: number;   // 0.0 to 1.0
  sepia: number;      // 0.0 to 1.0
  grayscale: number;  // 0.0 to 1.0
  invert: number;     // 0.0 to 1.0
  chroma_key_enabled?: boolean;
  chroma_key_color?: string; // hex
  chroma_key_similarity?: number; // 0.01 to 1.0
  chroma_key_blend?: number; // 0.0 to 1.0
}

export type TransitionType =
  | 'none'
  | 'crossfade'
  | 'fade_black'
  | 'fade_white'
  | 'wipe_left'
  | 'wipe_right'
  | 'slide_up'
  | 'slide_down';

export interface TransitionConfig {
  type: TransitionType;
  duration: number; // Seconds
}

export interface TextConfig {
  content: string;
  font_family: string;
  font_size: number;
  font_color: string;
  background_color: string;
  background_padding: number;
  alignment: 'left' | 'center' | 'right';
  vertical_alignment?: 'top' | 'center' | 'bottom';
  outline_color: string;
  outline_width: number;
  shadow: boolean;
  animation_style?: 'none' | 'typewriter' | 'slide_up' | 'slide_down';
  animation_duration?: number;
}

export interface AudioConfig {
  volume: number; // 0.0 to 2.0 (1.0 default)
  muted: boolean;
  pan: number;    // -1.0 to 1.0
  pitch?: number; // Semitones (-12 to 12)
  bass?: number;  // dB (-20 to 20)
  treble?: number; // dB (-20 to 20)
  fade_in: number;
  fade_out: number;
}

export interface Clip {
  id: string;
  track_id: string;
  asset_id?: string;
  type: ClipType;
  name: string;
  start_time: number; // Position on timeline in seconds
  duration: number;   // Timeline duration in seconds
  trim_in: number;    // Media start point in seconds
  trim_out: number;   // Media end point in seconds
  speed: number;      // 0.25 to 10.0
  reverse?: boolean;  // True to play backwards
  transform: TransformConfig;
  filters: FilterConfig;
  text?: TextConfig;
  audio: AudioConfig;
  transition_in?: TransitionConfig;
  transition_out?: TransitionConfig;
  color?: string;     // Hex color for timeline block
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  order: number;
  muted: boolean;
  locked: boolean;
  hidden: boolean;
  volume: number;
  solo: boolean;
}

export interface TimelineState {
  version: number;
  width: number;
  height: number;
  fps: number;
  duration_seconds: number;
  playhead_position: number;
  tracks: Track[];
  clips: Clip[];
  selected_clip_ids: string[];
  zoom_level: number; // Pixels per second (e.g. 50px = 1s)
  snap_enabled: boolean;
  ripple_edit: boolean;
}

export interface Asset {
  id: string;
  project_id?: string;
  user_id: string;
  file_name: string;
  file_path: string;
  proxy_path?: string;
  mime_type: string;
  file_size_bytes: number;
  duration_seconds: number;
  width?: number;
  height?: number;
  fps?: number;
  audio_waveform?: number[];
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  width: number;
  height: number;
  fps: number;
  duration_seconds: number;
  thumbnail_url?: string;
  timeline_state: TimelineState;
  created_at: string;
  updated_at: string;
}

export interface RenderJob {
  id: string;
  project_id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress_percentage: number;
  output_resolution: string;
  output_file_path?: string;
  error_log?: string;
  created_at: string;
  completed_at?: string;
}
