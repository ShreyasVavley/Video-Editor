'use client';

import React, { useEffect, useState } from 'react';

interface VUMeterProps {
  isPlaying: boolean;
}

export const VUMeter: React.FC<VUMeterProps> = ({ isPlaying }) => {
  const [levels, setLevels] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    let animationFrame: number;

    const animate = () => {
      if (isPlaying) {
        // Simulate audio levels bouncing
        setLevels(prev => prev.map(() => Math.random() * 100));
      } else {
        // Smoothly drop to 0
        setLevels(prev => prev.map(val => Math.max(0, val - 10)));
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying]);

  return (
    <div className="flex items-end gap-[2px] h-6 px-3 bg-black/40 rounded-lg border border-white/10 overflow-hidden backdrop-blur-md">
      {levels.map((level, i) => {
        // Color mapping: green -> yellow -> red
        let colorClass = 'bg-emerald-400';
        if (level > 60) colorClass = 'bg-amber-400';
        if (level > 85) colorClass = 'bg-[#ff007a]';
        if (!isPlaying && level === 0) colorClass = 'bg-slate-700';

        return (
          <div 
            key={i} 
            className="w-1.5 flex flex-col justify-end h-full opacity-90"
          >
            <div 
              className={`w-full transition-all duration-75 ${colorClass} rounded-t-sm shadow-[0_0_8px_currentColor]`}
              style={{ height: `${Math.max(5, level)}%` }}
            />
          </div>
        );
      })}
    </div>
  );
};
