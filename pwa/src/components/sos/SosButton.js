import React, { useEffect, useRef, useState } from 'react';
import { SOS_HOLD_MS, hapticPulse } from '../../services/sos';

/**
 * Large emergency SOS control. Requires a 3-second press-and-hold
 * so a casual tap cannot send an alert.
 */
const SosButton = ({ onHoldComplete, disabled = false, locked = false, onLockedPress }) => {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const holdStartedAt = useRef(null);
  const frameRef = useRef(null);
  const completedRef = useRef(false);

  const stopHold = (completed = false) => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    holdStartedAt.current = null;
    setHolding(false);
    setProgress(0);
    if (!completed) completedRef.current = false;
  };

  const tick = () => {
    if (!holdStartedAt.current) return;
    const elapsed = Date.now() - holdStartedAt.current;
    const next = Math.min(1, elapsed / SOS_HOLD_MS);
    setProgress(next);
    if (elapsed >= SOS_HOLD_MS) {
      if (!completedRef.current) {
        completedRef.current = true;
        hapticPulse([200, 60, 200]);
        stopHold(true);
        onHoldComplete?.();
      }
      return;
    }
    frameRef.current = requestAnimationFrame(tick);
  };

  const startHold = (event) => {
    if (disabled) return;
    event.preventDefault();
    if (locked) {
      onLockedPress?.();
      return;
    }
    completedRef.current = false;
    holdStartedAt.current = Date.now();
    setHolding(true);
    setProgress(0);
    hapticPulse([40]);
    frameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => stopHold(), []);

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={startHold}
      onPointerUp={() => stopHold()}
      onPointerLeave={() => stopHold()}
      onPointerCancel={() => stopHold()}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={locked
        ? 'SOS is a Premium feature. Opens upgrade'
        : 'SOS. Hold for 3 seconds to start an emergency alert'}
      aria-pressed={holding}
      className={`w-full rounded-2xl font-black text-white tap-target relative overflow-hidden select-none ${
        holding ? 'scale-[0.98]' : 'sos-pulse'
      } disabled:opacity-60`}
      style={{
        minHeight: 72,
        background: 'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)',
        boxShadow: holding ? '0 0 0 4px rgba(248,113,113,0.6)' : undefined,
        touchAction: 'none',
      }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 origin-left"
        style={{
          background: 'rgba(255,255,255,0.18)',
          transform: `scaleX(${progress})`,
          transformOrigin: 'left center',
        }}
      />
      <span className="relative z-10 flex flex-col items-center leading-tight py-2">
        <span className="text-2xl" aria-hidden="true">🚨</span>
        <span className="text-xl tracking-wide">SOS</span>
        <span className="text-xs font-semibold text-red-100">
          {locked ? 'Premium' : holding ? 'Keep holding…' : 'Hold for 3 seconds'}
        </span>
      </span>
    </button>
  );
};

export default SosButton;
