import React, { useEffect, useRef, useState } from 'react';
import { SOS_CONFIRM_SECONDS, hapticPulse } from '../../services/sos';

/**
 * Short cancelable countdown shown after the SOS hold completes.
 * Canceling here never creates an SOS event.
 */
const SosConfirmOverlay = ({ open, onConfirm, onCancel }) => {
  const [secondsLeft, setSecondsLeft] = useState(SOS_CONFIRM_SECONDS);
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  useEffect(() => {
    if (!open) {
      setSecondsLeft(SOS_CONFIRM_SECONDS);
      return undefined;
    }

    setSecondsLeft(SOS_CONFIRM_SECONDS);
    hapticPulse([80]);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onConfirmRef.current?.();
          return 0;
        }
        hapticPulse([40]);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-6"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="sos-confirm-title"
    >
      <div className="w-full max-w-sm glass-strong border border-red-500/40 rounded-3xl p-6 text-center">
        <p className="text-5xl mb-3" aria-hidden="true">🚨</p>
        <h2 id="sos-confirm-title" className="text-2xl font-black text-white mb-2">
          Sending SOS
        </h2>
        <p className="text-red-200 text-lg font-bold mb-6" aria-live="assertive">
          {secondsLeft}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="w-full bg-white text-gray-950 py-4 rounded-2xl font-black text-lg tap-target"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default SosConfirmOverlay;
