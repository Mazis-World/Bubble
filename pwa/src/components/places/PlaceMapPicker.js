import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, MapPin, Search } from 'lucide-react';
import PlaceMapPreview from './PlaceMapPreview';

const lon2tile = (lon, zoom) => ((lon + 180) / 360) * 2 ** zoom;
const lat2tile = (lat, zoom) => {
  const rad = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * 2 ** zoom;
};
const tile2lon = (x, zoom) => (x / 2 ** zoom) * 360 - 180;
const tile2lat = (y, zoom) => {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** zoom;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
};

const TilePicker = ({ latitude, longitude, onPick }) => {
  const zoom = 16;
  const size = 88;
  const centerX = lon2tile(longitude, zoom);
  const centerY = lat2tile(latitude, zoom);
  const tiles = useMemo(() => {
    const cx = Math.floor(centerX);
    const cy = Math.floor(centerY);
    const cells = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        cells.push({ x: cx + dx, y: cy + dy, dx, dy });
      }
    }
    return cells;
  }, [centerX, centerY]);

  return (
    <button
      type="button"
      className="relative mx-auto block overflow-hidden rounded-2xl border border-white/10"
      style={{ width: size * 3, height: size * 3 }}
      aria-label="Tap the map to move the pin"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        const cx = Math.floor(centerX);
        const cy = Math.floor(centerY);
        const x = (cx - 1) + px / size;
        const y = (cy - 1) + py / size;
        onPick({
          latitude: tile2lat(y, zoom),
          longitude: tile2lon(x, zoom),
        });
      }}
    >
      {tiles.map((tile) => (
        <img
          key={`${tile.x}-${tile.y}`}
          alt=""
          src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
          className="absolute"
          style={{
            width: size,
            height: size,
            left: (tile.dx + 1) * size,
            top: (tile.dy + 1) * size,
          }}
        />
      ))}
      <span
        className="absolute text-2xl pointer-events-none"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -90%)' }}
      >
        📍
      </span>
    </button>
  );
};

const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { 'User-Agent': 'FamilyBubble/1.0' } }
    );
    if (!response.ok) throw new Error('reverse failed');
    const data = await response.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

const PlaceMapPicker = ({
  location,
  onLocationSet,
  radiusMeters,
  onRadiusChange,
}) => {
  const [queryText, setQueryText] = useState(location?.address || '');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [error, setError] = useState(null);
  const [mapMode, setMapMode] = useState(false);

  useEffect(() => {
    if (location?.address && location.address !== queryText) {
      setQueryText(location.address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.address]);

  useEffect(() => {
    if (!queryText || queryText.trim().length < 3 || location?.address === queryText) {
      setResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryText)}&limit=5&addressdetails=1`,
          { headers: { 'User-Agent': 'FamilyBubble/1.0' } }
        );
        const data = await response.json();
        setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Could not search that address. Try again.');
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [queryText, location?.address]);

  const applyLocation = async (next, skipReverse = false) => {
    const address = skipReverse && next.address
      ? next.address
      : await reverseGeocode(next.latitude, next.longitude);
    const loc = {
      latitude: next.latitude,
      longitude: next.longitude,
      accuracy: next.accuracy || null,
      address,
    };
    setQueryText(address);
    setResults([]);
    setError(null);
    onLocationSet?.(loc);
  };

  const useCurrent = () => {
    if (!navigator.geolocation) {
      setError('Location is not available on this device. Search for an address instead.');
      return;
    }
    setLoadingGps(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await applyLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLoadingGps(false);
      },
      () => {
        setError('FamilyBubble could not use your current location. Search for an address instead.');
        setLoadingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={useCurrent}
          disabled={loadingGps}
          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-2xl font-bold tap-target disabled:opacity-60"
        >
          {loadingGps ? 'Finding you…' : 'Use current location'}
        </button>
        <button
          type="button"
          onClick={() => setMapMode((value) => !value)}
          className="flex-1 bg-white/10 text-white py-3 rounded-2xl font-bold tap-target"
        >
          {mapMode ? 'Hide map picker' : 'Select on map'}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={queryText}
          onChange={(event) => setQueryText(event.target.value)}
          placeholder="Search for an address"
          autoComplete="street-address"
          className="w-full pl-10 pr-4 py-3.5 glass-light border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 tap-target"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 animate-spin" />
        )}
      </div>

      {results.length > 0 && (
        <div className="glass-strong border border-white/10 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
          {results.map((result) => (
            <button
              key={`${result.lat}-${result.lon}-${result.place_id}`}
              type="button"
              onClick={() => applyLocation({
                latitude: parseFloat(result.lat),
                longitude: parseFloat(result.lon),
                address: result.display_name,
              }, true)}
              className="w-full text-left px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 tap-target"
            >
              <p className="text-white text-sm font-semibold truncate">{result.display_name.split(',')[0]}</p>
              <p className="text-gray-400 text-xs line-clamp-2">{result.display_name}</p>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-amber-900/20 border border-amber-800/30 rounded-xl p-3 flex gap-2">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-amber-200 text-sm">{error}</p>
        </div>
      )}

      {location?.latitude != null && (
        <>
          {mapMode ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-300 text-center">Tap the map to move the pin</p>
              <TilePicker
                latitude={location.latitude}
                longitude={location.longitude}
                onPick={(next) => applyLocation(next)}
              />
            </div>
          ) : (
            <PlaceMapPreview
              latitude={location.latitude}
              longitude={location.longitude}
              radiusMeters={radiusMeters}
              title="Place preview"
            />
          )}
          <p className="text-sm text-gray-300">{location.address}</p>
        </>
      )}

      {typeof onRadiusChange === 'function' && location?.latitude != null && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Detection area</span>
            <span className="text-white font-semibold">{Math.round(radiusMeters)} meters</span>
          </div>
          <input
            type="range"
            min={75}
            max={500}
            step={25}
            value={radiusMeters}
            onChange={(event) => onRadiusChange(Number(event.target.value))}
            className="w-full accent-purple-500"
            aria-label="Geofence radius"
          />
          <p className="text-xs text-gray-500">A smaller circle is more precise. A larger circle is more forgiving.</p>
        </div>
      )}

      {!location && (
        <div className="flex items-center justify-center gap-2 text-gray-400 py-6">
          <MapPin size={18} />
          <span>Search, use your location, or pick a spot on the map</span>
        </div>
      )}
    </div>
  );
};

export default PlaceMapPicker;
