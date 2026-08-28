/**
 * Video Element Pool & Decoder Recycler
 * Manages a constrained pool of HTMLVideoElements (max 6-8) to prevent exceeding
 * browser hardware decoder limits while maintaining smooth timeline playback and scrubbing.
 */

interface PooledVideo {
  id: string; // assetId or clipId
  element: HTMLVideoElement;
  lastUsed: number;
  src: string;
  isReady: boolean;
}

class VideoElementPool {
  private pool: Map<string, PooledVideo> = new Map();
  private maxElements: number = 8;

  /**
   * Retrieves or creates a pooled HTMLVideoElement for the given asset URL
   */
  public acquire(assetId: string, src: string): HTMLVideoElement {
    const now = Date.now();

    // Check if already in pool
    if (this.pool.has(assetId)) {
      const item = this.pool.get(assetId)!;
      item.lastUsed = now;
      if (item.src !== src) {
        item.src = src;
        item.element.src = src;
        item.isReady = false;
        item.element.load();
      }
      return item.element;
    }

    // Evict oldest if pool is full
    if (this.pool.size >= this.maxElements) {
      this.evictOldest();
    }

    // Create new HTMLVideoElement
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.preload = 'auto';
    video.muted = true; // Muted in DOM compositor; audio is mixed via WebAudioEngine
    video.src = src;

    const pooledItem: PooledVideo = {
      id: assetId,
      element: video,
      lastUsed: now,
      src: src,
      isReady: false,
    };

    video.oncanplay = () => {
      pooledItem.isReady = true;
    };

    this.pool.set(assetId, pooledItem);
    return video;
  }

  /**
   * Syncs playback time for a specific clip
   */
  public seek(assetId: string, targetTime: number) {
    const item = this.pool.get(assetId);
    if (!item) return;

    // Avoid redundant seeks if already within 0.03s (1 frame)
    if (Math.abs(item.element.currentTime - targetTime) > 0.03) {
      item.element.currentTime = targetTime;
    }
  }

  /**
   * Removes oldest unused video element from memory
   */
  private evictOldest() {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, item] of this.pool.entries()) {
      if (item.lastUsed < oldestTime) {
        oldestTime = item.lastUsed;
        oldestId = id;
      }
    }

    if (oldestId) {
      const item = this.pool.get(oldestId)!;
      item.element.pause();
      item.element.removeAttribute('src');
      item.element.load();
      this.pool.delete(oldestId);
    }
  }

  /**
   * Releases all video decoders (e.g. on project close)
   */
  public releaseAll() {
    for (const item of this.pool.values()) {
      item.element.pause();
      item.element.removeAttribute('src');
      item.element.load();
    }
    this.pool.clear();
  }
}

export const videoPool = typeof window !== 'undefined' ? new VideoElementPool() : (null as any);
