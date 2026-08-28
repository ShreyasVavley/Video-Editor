/**
 * Web Audio Engine
 * Synchronizes multi-track audio playback with timeline playhead, volume, panning, and track muting/soloing.
 */

import { Clip, Track } from '@/types/timeline';

class WebAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private trackGains: Map<string, GainNode> = new Map();
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private isPlaying: boolean = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
  }

  public async resume() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public syncTracks(tracks: Track[]) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const hasSolo = tracks.some((t) => t.solo);

    for (const track of tracks) {
      let gain = this.trackGains.get(track.id);
      if (!gain) {
        gain = this.ctx.createGain();
        gain.connect(this.masterGain);
        this.trackGains.set(track.id, gain);
      }

      // Calculate effective volume based on Mute & Solo
      if (track.muted || (hasSolo && !track.solo) || track.hidden) {
        gain.gain.value = 0.0;
      } else {
        gain.gain.value = track.volume;
      }
    }
  }

  public setMasterVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(volume, 2));
    }
  }

  public play() {
    this.isPlaying = true;
    this.resume();
  }

  public pause() {
    this.isPlaying = false;
    for (const audio of this.audioElements.values()) {
      audio.pause();
    }
  }

  public dispose() {
    for (const audio of this.audioElements.values()) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    this.audioElements.clear();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const audioEngine = typeof window !== 'undefined' ? new WebAudioEngine() : (null as any);
