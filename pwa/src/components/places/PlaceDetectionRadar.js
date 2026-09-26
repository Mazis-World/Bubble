import React, { useEffect, useMemo, useRef, useState } from 'react';
import { clampRadiusMeters } from '../../services/places/geofence';
import {
  detectionRadiusPixels,
  formatDetectionLength,
  latLngFromMapClick,
  OSM_TILE_SIZE,
  tilesForCenteredMap,
  zoomToFitDetectionRadius,
} from '../../services/places/radarMap';

const MAP_HEIGHT = 280;

const PlaceDetectionRadar = ({
  latitude,
  longitude,
  radiusMeters,
  onPick,
}) => {
  const frameRef = useRef(null);
  const [width, setWidth] = useState(320);
  const radius = clampRadiusMeters(radiusMeters);
  const lengthLabel = formatDetectionLength(radius);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return undefined;
    const measure = () => setWidth(Math.max(160, Math.round(node.getBoundingClientRect().width)));
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const zoom = zoomToFitDetectionRadius({
    latitude,
    radiusMeters: radius,
    mapSize: Math.min(width, MAP_HEIGHT),
  });
  const radiusPx = detectionRadiusPixels({ latitude, zoom, radiusMeters: radius });
  const diameter = Math.max(28, radiusPx * 2);
  const visualRadius = diameter / 2;
  const tiles = useMemo(() => {
    if (latitude == null || longitude == null) return [];
    return tilesForCenteredMap({
      latitude,
      longitude,
      zoom,
      width,
      height: MAP_HEIGHT,
      tileSize: OSM_TILE_SIZE,
    });
  }, [latitude, longitude, zoom, width]);

  if (latitude == null || longitude == null) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        ref={frameRef}
        className="relative w-full overflow-hidden rounded-2xl border border-cyan-400/30 bg-slate-950"
        style={{ height: MAP_HEIGHT }}
        aria-label={`Detection radar, ${lengthLabel}. Tap the map to move the pin.`}
        onClick={(event) => {
          if (!onPick) return;
          const rect = event.currentTarget.getBoundingClientRect();
          onPick(latLngFromMapClick({
            latitude,
            longitude,
            zoom,
            width: rect.width,
            height: rect.height,
            clientX: event.clientX,
            clientY: event.clientY,
            left: rect.left,
            top: rect.top,
          }));
        }}
      >
        {tiles.map((tile) => (
          <img
            key={tile.key}
            alt=""
            src={tile.url}
            className="absolute max-w-none pointer-events-none"
            style={{
              width: OSM_TILE_SIZE,
              height: OSM_TILE_SIZE,
              left: tile.left,
              top: tile.top,
            }}
          />
        ))}

        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div
            data-testid="place-detection-bubble"
            className="absolute rounded-full overflow-hidden"
            style={{
              width: diameter,
              height: diameter,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(circle, rgba(34,211,238,0.18) 0%, rgba(59,130,246,0.12) 55%, rgba(34,211,238,0.05) 78%, transparent 82%)',
              boxShadow: '0 0 24px rgba(34,211,238,0.35), inset 0 0 30px rgba(34,211,238,0.12)',
              border: '2px solid rgba(34,211,238,0.85)',
            }}
          >
            {[0.33, 0.66, 1].map((fraction) => (
              <div
                key={fraction}
                className="absolute rounded-full radar-ring-pulse"
                style={{
                  width: `${fraction * 100}%`,
                  height: `${fraction * 100}%`,
                  left: `${(1 - fraction) * 50}%`,
                  top: `${(1 - fraction) * 50}%`,
                  border: fraction === 1
                    ? '2px solid rgba(255,255,255,0.9)'
                    : '1px solid rgba(34,211,238,0.45)',
                  animationDelay: `${fraction}s`,
                }}
              />
            ))}
            {[0, 45, 90, 135].map((angle) => (
              <div
                key={angle}
                className="absolute left-1/2 top-0"
                style={{
                  width: angle % 90 === 0 ? 2 : 1,
                  height: '50%',
                  transform: `translateX(-50%) rotate(${angle}deg)`,
                  transformOrigin: '50% 100%',
                  background: 'linear-gradient(to bottom, rgba(34,211,238,0.55), transparent)',
                }}
              />
            ))}
            <div
              className="radar-sweep absolute rounded-full"
              style={{
                left: '50%',
                top: '50%',
                width: '100%',
                height: '100%',
                background: 'conic-gradient(from 0deg, rgba(34,211,238,0.32) 0deg, rgba(59,130,246,0.12) 50deg, transparent 95deg)',
              }}
            />
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                width: visualRadius,
                height: 2,
                transform: 'translate(0, -50%)',
                background: 'linear-gradient(to right, rgba(255,255,255,0.95), rgba(34,211,238,0.9))',
                boxShadow: '0 0 8px rgba(34,211,238,0.7)',
              }}
              data-testid="place-detection-length"
            />
          </div>
          <span
            className="absolute text-2xl"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -90%)' }}
          >
            📍
          </span>
          <span
            className="absolute text-[11px] font-black text-cyan-100 bg-slate-950/80 border border-cyan-400/40 rounded-full px-2 py-0.5"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(${Math.max(18, visualRadius * 0.42)}px, -50%)`,
            }}
          >
            {lengthLabel}
          </span>
        </div>
      </button>
      <p className="text-xs text-gray-500 px-1">© OpenStreetMap contributors</p>
    </div>
  );
};

export default PlaceDetectionRadar;
