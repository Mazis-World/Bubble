import { clampRadiusMeters } from './geofence';
import { MAX_RADIUS_METERS } from './constants';

export const OSM_TILE_SIZE = 256;
const EARTH_CIRCUMFERENCE_METERS = 40075016.686;

export const lon2tile = (lon, zoom) => ((lon + 180) / 360) * 2 ** zoom;

export const lat2tile = (lat, zoom) => {
  const rad = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * 2 ** zoom;
};

export const tile2lon = (x, zoom) => (x / 2 ** zoom) * 360 - 180;

export const tile2lat = (y, zoom) => {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** zoom;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

export const metersPerPixelAt = (latitude, zoom) => {
  const latRad = (Number(latitude) * Math.PI) / 180;
  return (Math.cos(latRad) * EARTH_CIRCUMFERENCE_METERS) / (OSM_TILE_SIZE * 2 ** zoom);
};

export const detectionRadiusPixels = ({ latitude, zoom, radiusMeters }) => {
  const metersPerPixel = metersPerPixelAt(latitude, zoom);
  if (!Number.isFinite(metersPerPixel) || metersPerPixel <= 0) return 0;
  return clampRadiusMeters(radiusMeters) / metersPerPixel;
};

export const formatDetectionLength = (radiusMeters) =>
  `${clampRadiusMeters(radiusMeters)} m`;

/**
 * Choose a tile zoom so the detection bubble fits on the map.
 * Larger radii zoom out, so the radar covers more of the neighborhood.
 */
export const zoomToFitDetectionRadius = ({
  latitude,
  radiusMeters,
  mapSize,
  padding = 0.16,
} = {}) => {
  const size = Math.max(120, Number(mapSize) || 320);
  const radius = clampRadiusMeters(radiusMeters || MAX_RADIUS_METERS);
  const targetPx = (size / 2) * (1 - padding);
  for (let zoom = 18; zoom >= 12; zoom -= 1) {
    if (detectionRadiusPixels({ latitude, zoom, radiusMeters: radius }) <= targetPx) {
      return zoom;
    }
  }
  return 12;
};

export const tilesForCenteredMap = ({
  latitude,
  longitude,
  zoom,
  width,
  height,
  tileSize = OSM_TILE_SIZE,
}) => {
  const centerX = lon2tile(longitude, zoom);
  const centerY = lat2tile(latitude, zoom);
  const n = 2 ** zoom;
  const minX = Math.floor(centerX - width / (2 * tileSize) - 1);
  const maxX = Math.floor(centerX + width / (2 * tileSize) + 1);
  const minY = Math.floor(centerY - height / (2 * tileSize) - 1);
  const maxY = Math.floor(centerY + height / (2 * tileSize) + 1);
  const tiles = [];
  for (let y = minY; y <= maxY; y += 1) {
    if (y < 0 || y >= n) continue;
    for (let x = minX; x <= maxX; x += 1) {
      const wrappedX = ((x % n) + n) % n;
      tiles.push({
        key: `${zoom}-${wrappedX}-${y}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
        left: (x - centerX) * tileSize + width / 2,
        top: (y - centerY) * tileSize + height / 2,
      });
    }
  }
  return tiles;
};

export const latLngFromMapClick = ({
  latitude,
  longitude,
  zoom,
  width,
  height,
  clientX,
  clientY,
  left,
  top,
  tileSize = OSM_TILE_SIZE,
}) => {
  const dx = clientX - left - width / 2;
  const dy = clientY - top - height / 2;
  return {
    latitude: tile2lat(lat2tile(latitude, zoom) + dy / tileSize, zoom),
    longitude: tile2lon(lon2tile(longitude, zoom) + dx / tileSize, zoom),
  };
};
