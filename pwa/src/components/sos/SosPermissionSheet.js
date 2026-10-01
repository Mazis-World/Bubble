import React from 'react';

const copyFor = (reason) => {
  if (reason === 'denied' || reason === 'permission_denied') {
    return {
      title: 'Location permission is required to send your location with an SOS.',
      detail: 'If you already denied access, enable Location for FamilyBubble in your browser or device settings.',
    };
  }
  if (reason === 'gps_unavailable') {
    return {
      title: 'GPS is unavailable',
      detail: 'Turn on location services, then try again. You can still send an SOS without a pin if GPS stays off.',
    };
  }
  return {
    title: 'Location permission is required to send your location with an SOS.',
    detail: 'FamilyBubble only uses live GPS while an SOS is active.',
  };
};

const SosPermissionSheet = ({ reason, onEnable, onContinueWithout, onClose, enabling = false }) => {
  if (!reason) return null;
  const copy = copyFor(reason);

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/80 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-permission-title"
    >
      <div className="w-full max-w-md glass-strong border border-red-500/40 rounded-3xl p-6 space-y-4">
        <h2 id="sos-permission-title" className="text-xl font-black text-white">
          {copy.title}
        </h2>
        <p className="text-gray-300">{copy.detail}</p>
        <button
          type="button"
          onClick={onEnable}
          disabled={enabling}
          className="w-full bg-red-600 text-white py-4 rounded-2xl font-black tap-target disabled:opacity-60"
        >
          {enabling ? 'Requesting…' : 'Enable location'}
        </button>
        {onContinueWithout && reason === 'gps_unavailable' && (
          <button
            type="button"
            onClick={onContinueWithout}
            className="w-full bg-white/10 text-white py-4 rounded-2xl font-bold tap-target"
          >
            Send SOS without location
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

export default SosPermissionSheet;
