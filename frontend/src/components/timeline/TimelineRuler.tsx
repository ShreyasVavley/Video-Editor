'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useTimelineStore } from '@/store/timelineStore';
import { secondsToTimecode, formatTimeDisplay } from '@/utils/timecode';

interface RulerProps {
  scrollLeft: number;
  containerWidth: number;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
}

export const TimelineRuler: React.FC<RulerProps> = ({
  scrollLeft,
  containerWidth,
  onScrubStart,
  onScrubEnd,
}) => {
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const { timeline, setPlayhead } = useTimelineStore();
  const [isScrubbing, setIsScrubbing] = useState(false);

  const zoom = timeline.zoom_level; // Pixels per second
  const totalSeconds = timeline.duration_seconds || 60;
  const totalWidth = totalSeconds * zoom;

  // Calculate dynamic step interval for ruler ticks based on zoom level
  let majorInterval = 1; // 1 second
  if (zoom < 20) majorInterval = 10;
  else if (zoom < 40) majorInterval = 5;
  else if (zoom < 80) majorInterval = 2;
  else if (zoom > 150) majorInterval = 0.5;

  const tickCount = Math.ceil(totalSeconds / majorInterval);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsScrubbing(true);
    onScrubStart?.();
    updatePlayheadFromEvent(e);
  };

  const updatePlayheadFromEvent = useCallback(
    (e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const targetTime = Math.max(0, Math.min(totalSeconds, offsetX / zoom));
      setPlayhead(targetTime);
    },
    [zoom, totalSeconds, setPlayhead]
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isScrubbing) {
        updatePlayheadFromEvent(e);
      }
    };

    const handlePointerUp = () => {
      if (isScrubbing) {
        setIsScrubbing(false);
        onScrubEnd?.();
      }
    };

    if (isScrubbing) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isScrubbing, updatePlayheadFromEvent, onScrubEnd]);

  return (
    <div
      ref={rulerRef}
      onPointerDown={handlePointerDown}
      style={{ width: `${totalWidth}px` }}
      className="relative h-8 bg-surface-raised border-b border-surface-border select-none cursor-pointer overflow-hidden"
    >
      {/* Ticks and Time Labels */}
      {Array.from({ length: tickCount + 1 }).map((_, i) => {
        const time = i * majorInterval;
        const left = time * zoom;

        return (
          <div
            key={i}
            style={{ left: `${left}px` }}
            className="absolute top-0 bottom-0 flex flex-col justify-between pointer-events-none"
          >
            {/* Timecode Label */}
            <span className="text-[10px] font-mono text-slate-400 pl-1 leading-none pt-1">
              {formatTimeDisplay(time)}
            </span>

            {/* Major Tick */}
            <div className="w-[1px] h-3 bg-surface-border self-start" />
          </div>
        );
      })}

      {/* Minor Sub-ticks (5 sub-ticks per interval) */}
      {zoom > 40 &&
        Array.from({ length: tickCount * 4 }).map((_, i) => {
          const subTime = (i + 1) * (majorInterval / 5);
          const left = subTime * zoom;
          return (
            <div
              key={`sub_${i}`}
              style={{ left: `${left}px` }}
              className="absolute bottom-0 w-[1px] h-1.5 bg-surface-border/50 pointer-events-none"
            />
          );
        })}
    </div>
  );
};
