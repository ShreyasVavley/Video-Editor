'use client';

import React, { useState } from 'react';
import { useTimelineStore } from '@/store/timelineStore';
import { Search, Image, Download, Loader2, Sparkles, Smile } from 'lucide-react';

export const StickersLibrary: React.FC = () => {
  const { timeline, addClip, addTrack } = useTimelineStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  // Hardcoded curated stickers for fast access without API
  const curatedStickers = [
    { id: 'curated_1', title: 'Loading Spinner', preview: 'https://i.gifer.com/ZKZg.gif', url: 'https://i.gifer.com/ZKZg.gif' },
    { id: 'curated_2', title: 'Heart Pop', preview: 'https://i.gifer.com/7S70.gif', url: 'https://i.gifer.com/7S70.gif' },
    { id: 'curated_3', title: 'Confetti', preview: 'https://i.gifer.com/1amw.gif', url: 'https://i.gifer.com/1amw.gif' },
    { id: 'curated_4', title: 'Fire', preview: 'https://i.gifer.com/Fw3p.gif', url: 'https://i.gifer.com/Fw3p.gif' },
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      // Tenor public API (testing key)
      const res = await fetch(`https://g.tenor.com/v1/search?q=${encodeURIComponent(searchQuery + ' sticker')}&key=LIVDSRZULELA&limit=16`);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.results.map((r: any) => ({
          id: r.id,
          title: r.content_description,
          preview: r.media[0].tinygif.url,
          url: r.media[0].gif.url,
        }));
        setResults(formatted);
      }
    } catch (e) {
      console.error('Sticker search error', e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSticker = async (sticker: any) => {
    setDownloadingUrl(sticker.url);
    try {
      // Send to backend to download and transcode to WebM with Alpha
      const res = await fetch('/api/assets/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: sticker.url,
          name: sticker.title || 'Sticker',
          project_id: useTimelineStore.getState().project?.id
        })
      });

      if (res.ok) {
        const asset = await res.json();
        
        // Ensure overlay track exists
        let overlayTrack = timeline.tracks.find(t => t.type === 'video' && t.name === 'Stickers & Overlays');
        if (!overlayTrack) {
          addTrack('video', 'Stickers & Overlays');
          overlayTrack = useTimelineStore.getState().timeline.tracks.find(t => t.type === 'video' && t.name === 'Stickers & Overlays');
        }
        
        const trackId = overlayTrack ? overlayTrack.id : timeline.tracks[0].id;
        const playhead = timeline.playhead_position;

        addClip({
          id: `clip_sticker_${Date.now()}`,
          track_id: trackId,
          asset_id: asset.id,
          type: 'video', // WebM is treated as video
          name: asset.file_name,
          start_time: playhead,
          duration: asset.duration_seconds > 0 ? asset.duration_seconds : 3.0,
          trim_in: 0,
          trim_out: asset.duration_seconds > 0 ? asset.duration_seconds : 3.0,
          speed: 1.0,
          transform: { x: 0, y: 0, scale_x: 0.5, scale_y: 0.5, rotation: 0, opacity: 1, blend_mode: 'normal' },
          filters: { brightness: 1, contrast: 1, saturation: 1, hue: 0, blur: 0, vignette: 0, sepia: 0, grayscale: 0, invert: 0 },
          audio: { volume: 0, muted: true, pan: 0, fade_in: 0, fade_out: 0 } // Mute stickers
        });
      }
    } catch (e) {
      console.error('Failed to import sticker', e);
    } finally {
      setDownloadingUrl(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface border-r border-surface-border text-xs">
      <div className="px-4 py-2.5 bg-surface-raised border-b border-surface-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smile className="w-4 h-4 text-pink-400" />
          <h3 className="font-bold text-slate-100">Stickers & GIFs</h3>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Search animated stickers..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-pink-500 transition-colors"
          />
          <button 
            onClick={handleSearch}
            disabled={isSearching}
            className="p-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-white transition-colors"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        <div className="space-y-2">
          <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            {results.length > 0 ? 'Search Results' : 'Trending Stickers'}
          </h4>
          
          <div className="grid grid-cols-2 gap-2">
            {(results.length > 0 ? results : curatedStickers).map((sticker) => (
              <div 
                key={sticker.id}
                onClick={() => handleAddSticker(sticker)}
                className="relative group bg-surface-raised border border-surface-border rounded-xl overflow-hidden aspect-square cursor-pointer hover:border-pink-500 transition-all"
              >
                <img 
                  src={sticker.preview} 
                  alt={sticker.title} 
                  className="w-full h-full object-contain p-2 opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all"
                />
                
                {/* Overlay loading state */}
                {downloadingUrl === sticker.url && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                    <Loader2 className="w-5 h-5 text-pink-400 animate-spin mb-1" />
                    <span className="text-[9px] font-bold text-pink-400 uppercase tracking-widest">Importing</span>
                  </div>
                )}
                
                {/* Overlay hover state */}
                {downloadingUrl !== sticker.url && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="bg-pink-600 text-white p-2 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
                      <Download className="w-3.5 h-3.5" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
