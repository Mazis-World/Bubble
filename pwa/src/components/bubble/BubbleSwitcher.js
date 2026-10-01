import React, { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  haloForBubbleIndex,
  peekSwitcherTarget,
  swipeDirection,
} from '../../services/bubbleSwitcher';

const NAME_REVEAL_MS = 1400;

const pointFromEvent = (event) => {
  const touch = event.changedTouches?.[0] || event.touches?.[0];
  if (touch) {
    return { x: touch.clientX, y: touch.clientY, id: touch.identifier };
  }
  return {
    x: event.clientX,
    y: event.clientY,
    id: event.pointerId ?? 1,
  };
};

export const useBubbleSwipe = ({
  bubbles,
  currentId,
  onSwitch,
  onCreate,
  enabled = true,
} = {}) => {
  const startRef = useRef(null);

  const begin = (event) => {
    if (!enabled || event.button) return;
    const point = pointFromEvent(event);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
    startRef.current = point;
  };

  const finish = (event) => {
    if (!startRef.current) return;
    const point = pointFromEvent(event);
    if (startRef.current.id !== point.id) return;
    const direction = swipeDirection({
      startX: startRef.current.x,
      startY: startRef.current.y,
      endX: point.x,
      endY: point.y,
    });
    startRef.current = null;
    if (!direction) return;
    const target = peekSwitcherTarget(bubbles, currentId, direction);
    if (target?.kind === 'create') {
      if (typeof onCreate === 'function') onCreate();
      return;
    }
    if (target?.kind === 'bubble' && typeof onSwitch === 'function') {
      onSwitch(target.id);
    }
  };

  const cancel = () => {
    startRef.current = null;
  };

  return {
    onPointerDown: begin,
    onPointerUp: finish,
    onPointerCancel: cancel,
    onMouseDown: begin,
    onMouseUp: finish,
    onTouchStart: begin,
    onTouchEnd: finish,
    onTouchCancel: cancel,
  };
};

const MiniBubble = ({
  name,
  active,
  halo,
  onSelect,
}) => (
  <button
    type="button"
    aria-label={`Switch to ${name}`}
    aria-current={active ? 'true' : undefined}
    onClick={onSelect}
    className={`relative flex-shrink-0 rounded-full transition-all duration-200 ${
      active ? 'w-11 h-11' : 'w-8 h-8 opacity-70 hover:opacity-100'
    }`}
    style={{
      background: active
        ? `radial-gradient(circle at 35% 30%, #fff 0%, ${halo.accent} 42%, #1e1b4b 100%)`
        : 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.85) 0%, rgba(148,163,184,0.9) 40%, rgba(30,41,59,0.95) 100%)',
    }}
  >
    {active && (
      <span
        className="bubble-mini-halo pointer-events-none absolute -inset-1 rounded-full"
        style={{
          boxShadow: `0 0 0 2px ${halo.ring}, 0 0 12px ${halo.glow}`,
        }}
        aria-hidden="true"
      />
    )}
  </button>
);

const BubbleSwitcher = ({
  bubbles = [],
  currentId,
  onSwitch,
  onCreate,
}) => {
  const current = bubbles.find((bubble) => bubble.id === currentId) || bubbles[0];
  const [revealedName, setRevealedName] = useState('');
  const hideNameRef = useRef(null);

  const revealName = (name) => {
    if (!name) return;
    setRevealedName(name);
    if (hideNameRef.current) clearTimeout(hideNameRef.current);
    hideNameRef.current = setTimeout(() => setRevealedName(''), NAME_REVEAL_MS);
  };

  useEffect(() => () => {
    if (hideNameRef.current) clearTimeout(hideNameRef.current);
  }, []);

  const handleSwitch = (id) => {
    const bubble = bubbles.find((item) => item.id === id);
    revealName(bubble?.name);
    if (id !== current?.id && typeof onSwitch === 'function') onSwitch(id);
  };

  const handleCreate = () => {
    revealName('Create a bubble');
    if (typeof onCreate === 'function') onCreate();
  };

  const swipe = useBubbleSwipe({
    bubbles,
    currentId: current?.id,
    onSwitch: handleSwitch,
    onCreate: handleCreate,
    enabled: true,
  });

  return (
    <div className="relative mx-auto max-w-md px-4" data-testid="bubble-switcher">
      <p
        className={`h-5 text-center text-xs font-semibold text-white/90 truncate transition-opacity duration-200 ${
          revealedName ? 'opacity-100' : 'opacity-0'
        }`}
        aria-live="polite"
      >
        {revealedName || '\u00a0'}
      </p>
      <div
        className="flex items-center justify-center gap-3 select-none py-1"
        data-testid="bubble-switcher-track"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={swipe.onPointerDown}
        onPointerUp={swipe.onPointerUp}
        onPointerCancel={swipe.onPointerCancel}
        onMouseDown={swipe.onMouseDown}
        onMouseUp={swipe.onMouseUp}
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
        onTouchCancel={swipe.onTouchCancel}
      >
        {bubbles.map((bubble, bubbleIndex) => (
          <MiniBubble
            key={bubble.id}
            name={bubble.name}
            active={bubble.id === current?.id}
            halo={haloForBubbleIndex(bubbleIndex)}
            onSelect={() => handleSwitch(bubble.id)}
          />
        ))}
        <button
          type="button"
          aria-label="Create another bubble"
          onClick={handleCreate}
          className="flex-shrink-0 w-8 h-8 rounded-full border border-dashed border-white/50 text-white/90 flex items-center justify-center hover:bg-white/10 tap-target"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

export default BubbleSwitcher;
