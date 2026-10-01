import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  adjacentBubbleId,
  bubbleIndex,
  canCreateAnotherBubble,
  haloForBubbleIndex,
  swipeDirection,
} from '../../services/bubbleSwitcher';

export const useBubbleSwipe = ({
  bubbles,
  currentId,
  onSwitch,
  enabled = true,
} = {}) => {
  const startRef = useRef(null);

  const onPointerDown = (event) => {
    if (!enabled || event.button) return;
    startRef.current = {
      x: event.clientX,
      y: event.clientY,
      id: event.pointerId,
    };
  };

  const finish = (event) => {
    if (!startRef.current || startRef.current.id !== event.pointerId) return;
    const direction = swipeDirection({
      startX: startRef.current.x,
      startY: startRef.current.y,
      endX: event.clientX,
      endY: event.clientY,
    });
    startRef.current = null;
    if (!direction || typeof onSwitch !== 'function') return;
    const nextId = adjacentBubbleId(bubbles, currentId, direction);
    if (nextId) onSwitch(nextId);
  };

  const onPointerCancel = () => {
    startRef.current = null;
  };

  return {
    onPointerDown,
    onPointerUp: finish,
    onPointerCancel,
  };
};

const BubbleSwitcher = ({
  bubbles = [],
  currentId,
  onSwitch,
  onCreate,
}) => {
  const current = bubbles.find((bubble) => bubble.id === currentId) || bubbles[0];
  const index = bubbleIndex(bubbles, current?.id);
  const canSwipe = bubbles.length > 1;
  const canCreate = Boolean(onCreate) && canCreateAnotherBubble(bubbles.length);
  const halo = haloForBubbleIndex(index);
  const swipe = useBubbleSwipe({
    bubbles,
    currentId: current?.id,
    onSwitch,
    enabled: canSwipe,
  });

  const go = (direction) => {
    const nextId = adjacentBubbleId(bubbles, current?.id, direction);
    if (nextId) onSwitch(nextId);
  };

  return (
    <div className="relative mx-auto max-w-md px-6" data-testid="bubble-switcher">
      <div
        className="bubble-fab-halo pointer-events-none absolute inset-x-8 -top-3 -bottom-3 rounded-full"
        style={{
          boxShadow: `0 0 0 2px ${halo.ring}, 0 0 28px ${halo.glow}, 0 0 48px ${halo.glow}`,
        }}
        aria-hidden="true"
      />
      <div
        className="relative z-10 flex items-center justify-center gap-2 select-none glass-strong rounded-full px-3 py-2.5 border border-white/15"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={swipe.onPointerDown}
        onPointerUp={swipe.onPointerUp}
        onPointerCancel={swipe.onPointerCancel}
      >
        {canSwipe && (
          <button
            type="button"
            aria-label="Previous bubble"
            onClick={() => go(-1)}
            className="p-1.5 text-gray-200 hover:text-white rounded-full hover:bg-white/10 tap-target"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <p
          className="font-bold text-sm sm:text-base text-white truncate max-w-[10rem] sm:max-w-[14rem] text-center"
          aria-live="polite"
        >
          {current?.name || 'FamilyBubble'}
        </p>
        {canSwipe && (
          <button
            type="button"
            aria-label="Next bubble"
            onClick={() => go(1)}
            className="p-1.5 text-gray-200 hover:text-white rounded-full hover:bg-white/10 tap-target"
          >
            <ChevronRight size={18} />
          </button>
        )}
        {canCreate && (
          <button
            type="button"
            aria-label="Create another bubble"
            onClick={onCreate}
            className="p-1.5 text-white rounded-full hover:bg-white/10 tap-target"
            style={{ boxShadow: `0 0 12px ${halo.glow}` }}
          >
            <Plus size={16} />
          </button>
        )}
      </div>
      <div className="relative z-10 flex items-center justify-center gap-1.5 mt-2 min-h-[10px]">
        {bubbles.map((bubble, dotIndex) => (
          <button
            key={bubble.id}
            type="button"
            aria-label={`Switch to ${bubble.name}`}
            aria-current={dotIndex === index ? 'true' : undefined}
            onClick={() => bubble.id !== current?.id && onSwitch(bubble.id)}
            className={`rounded-full transition-all ${
              dotIndex === index
                ? 'w-2 h-2 bg-white'
                : 'w-1.5 h-1.5 bg-white/35 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default BubbleSwitcher;
