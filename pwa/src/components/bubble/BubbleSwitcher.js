import React, { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  haloForBubbleIndex,
  miniClusterLayout,
  miniMemberPhotos,
  peekSwitcherTarget,
  swipeDirection,
} from '../../services/bubbleSwitcher';
import { colorForMember } from '../../utils/memberColor';

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

const MiniFamilyCluster = ({
  name,
  active,
  halo,
  members = [],
  onSelect,
}) => {
  const photos = miniMemberPhotos(members);
  const faces = photos.length ? photos : [{ id: 'empty', name, photoUrl: null }];
  const { size, overlap } = miniClusterLayout(faces.length);
  const initialSize = Math.max(5, Math.round(size * 0.48));

  return (
    <button
      type="button"
      aria-label={`Switch to ${name}`}
      aria-current={active ? 'true' : undefined}
      onClick={onSelect}
      className={`relative flex-shrink-0 overflow-visible rounded-full transition-opacity duration-200 ${
        active ? '' : 'opacity-50 hover:opacity-90'
      }`}
    >
      {active && (
        <span
          className="bubble-mini-halo pointer-events-none absolute -inset-[3px] rounded-full"
          style={{
            boxShadow: `0 0 0 1px ${halo.ring}, 0 0 8px ${halo.glow}`,
          }}
          aria-hidden="true"
        />
      )}
      <span className="relative flex items-center">
        {faces.map((member, index) => (
          <span
            key={member.id}
            data-testid="mini-member-photo"
            className="relative rounded-full overflow-hidden border border-slate-950/70"
            style={{
              width: size,
              height: size,
              marginLeft: index === 0 ? 0 : -overlap,
              zIndex: faces.length - index,
              background: photos.length
                ? colorForMember(member, photos)
                : `radial-gradient(circle at 32% 28%, #fff 0%, ${halo.accent} 46%, #0f172a 100%)`,
            }}
          >
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <span
                className="flex items-center justify-center w-full h-full font-bold text-white leading-none"
                style={{ fontSize: initialSize }}
              >
                {String(member.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </span>
        ))}
      </span>
    </button>
  );
};

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
    <div className="relative mx-auto flex justify-center px-4" data-testid="bubble-switcher" data-tour="switcher">
      <p
        className={`pointer-events-none absolute -top-4 h-4 w-full text-center text-[10px] font-semibold tracking-wide text-white/80 truncate transition-opacity duration-200 ${
          revealedName ? 'opacity-100' : 'opacity-0'
        }`}
        aria-live="polite"
      >
        {revealedName || '\u00a0'}
      </p>
      <div
        className="bubble-switcher-dock flex items-center justify-center gap-1.5 select-none px-2.5 py-[5px]"
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
          <MiniFamilyCluster
            key={bubble.id}
            name={bubble.name}
            active={bubble.id === current?.id}
            halo={haloForBubbleIndex(bubbleIndex)}
            members={bubble.members}
            onSelect={() => handleSwitch(bubble.id)}
          />
        ))}
        <button
          type="button"
          aria-label="Create another bubble"
          onClick={handleCreate}
          className="flex-shrink-0 w-[14px] h-[14px] rounded-full border border-dashed border-white/40 text-white/80 flex items-center justify-center hover:bg-white/10 hover:border-white/70"
        >
          <Plus size={9} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
};

export default BubbleSwitcher;
