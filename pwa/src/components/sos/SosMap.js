import React from 'react';
import { osmEmbedUrl } from '../../services/sos';

/**
 * Large high-contrast map of an SOS location.
 * Uses OpenStreetMap embed so we do not add a map SDK.
 */
const SosMap = ({ latitude, longitude, title = 'Last known location' }) => {
  const src = osmEmbedUrl(latitude, longitude);

  if (!src) {
    return (
      <div
        className="w-full rounded-2xl bg-gray-900 border border-red-500/30 flex items-center justify-center text-center px-4"
        style={{ minHeight: 220 }}
        role="img"
        aria-label="Location unavailable"
      >
        <p className="text-gray-300 font-semibold">Location unavailable</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-red-500/40" style={{ minHeight: 220 }}>
      <iframe
        title={title}
        src={src}
        className="w-full"
        style={{ height: 240, border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
};

export default SosMap;
