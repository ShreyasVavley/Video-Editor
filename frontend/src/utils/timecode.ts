/**
 * Timecode Math Utility: Seconds <-> Frames <-> HH:MM:SS:FF
 */

export function secondsToFrames(seconds: number, fps: number = 30): number {
  return Math.max(0, Math.floor(seconds * fps));
}

export function framesToSeconds(frames: number, fps: number = 30): number {
  return Math.max(0, frames / fps);
}

export function secondsToTimecode(seconds: number, fps: number = 30): string {
  const totalFrames = secondsToFrames(seconds, fps);
  const ff = totalFrames % fps;
  const totalSeconds = Math.floor(seconds);
  const ss = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const mm = totalMinutes % 60;
  const hh = Math.floor(totalMinutes / 60);

  const pad = (n: number, len: number = 2) => String(n).padStart(len, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

export function timecodeToSeconds(timecode: string, fps: number = 30): number {
  const parts = timecode.split(':').map((p) => parseInt(p, 10) || 0);
  if (parts.length === 4) {
    const [hh, mm, ss, ff] = parts;
    return hh * 3600 + mm * 60 + ss + ff / fps;
  }
  if (parts.length === 3) {
    const [hh, mm, ss] = parts;
    return hh * 3600 + mm * 60 + ss;
  }
  if (parts.length === 2) {
    const [mm, ss] = parts;
    return mm * 60 + ss;
  }
  return 0;
}

export function formatTimeDisplay(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  const ms = Math.floor((seconds % 1) * 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(mm)}:${pad(ss)}.${ms}`;
}
