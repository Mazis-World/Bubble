import React from 'react';
import { clampRadiusMeters } from '../../services/places/geofence';
import { DEFAULT_RADIUS_METERS } from '../../services/places/constants';

export const placeMapEmbedUrl = (latitude, longitude, radiusMeters = DEFAULT_RADIUS_METERS) => {
  if (latitude == null || longitude == null) return null;
  const radius = clampRadiusMeters(radiusMeters);
  const delta = Math.max(0.0035, (radius / 111320) * 2.4);
  const minLon = longitude - delta;
  const minLat = latitude - delta;
  const maxLon = longitude + delta;
  const maxLat = latitude + delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${latitude}%2C${longitude}`;
};

const PlaceMapPreview = ({
  latitude,
  longitude,
  radiusMeters = DEFAULT_RADIUS_METERS,
  title = 'Place map',
}) => {
  const src = placeMapEmbedUrl(latitude, longitude, radiusMeters);
  const radius = clampRadiusMeters(radiusMeters);

  if (!src) {
    return (
      <div
        className="w-full rounded-2xl bg-gray-900 border border-white/10 flex items-center justify-center text-center px-4"
        style={{ minHeight: 180 }}
        role="img"
        aria-label="Location unavailable"
      >
        <p className="text-gray-300 font-semibold">Location unavailable</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="w-full overflow-hidden rounded-2xl border border-white/10" style={{ minHeight: 180 }}>
        <iframe
          title={title}
          src={src}
          className="w-full"
          style={{ height: 200, border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="flex items-center gap-3 px-1">
        <div
          className="rounded-full border-2 border-blue-400/70 bg-blue-500/20 flex-shrink-0"
          style={{ width: 22, height: 22 }}
          aria-hidden="true"
        />
        <p className="text-xs text-gray-400">
          FamilyBubble looks for arrivals and departures within about {radius} meters.
        </p>
      </div>
    </div>
  );
};

export default PlaceMapPreview;
