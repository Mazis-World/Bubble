import React from 'react';
import { backgroundLocationWhy } from '../../services/places/copy';

const copyFor = (reason) => {
  if (reason === 'denied' || reason === 'permission_denied') {
    return {
      title: 'Location is turned off for Places',
      detail: 'You can still check in by hand. To let family know automatically when you arrive or leave, enable Location for FamilyBubble in your device settings.',
    };
  }
  if (reason === 'gps_unavailable') {
    return {
      title: 'Location services are off',
      detail: 'Turn on location services to automatically share arrivals. Manual check-in still works.',
    };
  }
  if (reason === 'background') {
    return {
      title: 'Keep FamilyBubble updated in the background',
      detail: backgroundLocationWhy,
    };
  }
  return {
    title: 'Help your family know when you arrive',
    detail: backgroundLocationWhy,
  };
};

const PlacePermissionSheet = ({
  reason = 'prompt',
  onEnable,
  onContinueManual,
  onClose,
  enabling = false,
}) => {
  const copy = copyFor(reason);

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/80 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="place-permission-title"
    >
      <div className="w-full max-w-md glass-strong border border-white/10 rounded-3xl p-6 space-y-4">
        <h2 id="place-permission-title" className="text-xl font-black text-white">
          {copy.title}
        </h2>
        <p className="text-gray-300">{copy.detail}</p>
        {onEnable && reason !== 'denied' && reason !== 'permission_denied' && (
          <button
            type="button"
            onClick={onEnable}
            disabled={enabling}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-4 rounded-2xl font-black tap-target disabled:opacity-60"
          >
            {enabling ? 'Requesting…' : 'Enable location'}
          </button>
        )}
        {onContinueManual && (
          <button
            type="button"
            onClick={onContinueManual}
            className="w-full bg-white/10 text-white py-4 rounded-2xl font-bold tap-target"
          >
            Use manual check-in only
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="w-full text-gray-300 py-3 font-semibold tap-target"
        >
          Not now
        </button>
      </div>
    </div>
  );
};

export default PlacePermissionSheet;
