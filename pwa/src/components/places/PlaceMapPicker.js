import React, { useEffect, useState } from 'react';
import { AlertCircle, Loader2, MapPin, Search } from 'lucide-react';
import PlaceDetectionRadar from './PlaceDetectionRadar';
import { MIN_RADIUS_METERS, MAX_RADIUS_METERS } from '../../services/places/constants';

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
      <button
        type="button"
        onClick={useCurrent}
        disabled={loadingGps}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-2xl font-bold tap-target disabled:opacity-60"
      >
        {loadingGps ? 'Finding you…' : 'Use current location'}
      </button>

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
          {typeof onRadiusChange === 'function' && (
            <PlaceDetectionRadar
              latitude={location.latitude}
              longitude={location.longitude}
              radiusMeters={radiusMeters}
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
            min={MIN_RADIUS_METERS}
            max={MAX_RADIUS_METERS}
            step={25}
            value={radiusMeters}
            onChange={(event) => onRadiusChange(Number(event.target.value))}
            className="w-full accent-cyan-400"
            aria-label="Geofence radius"
          />
          <p className="text-xs text-gray-500">
            This radar is the arrival bubble. Drag to make it tighter or more forgiving.
          </p>
        </div>
      )}

      {!location && (
        <div className="flex items-center justify-center gap-2 text-gray-400 py-6">
          <MapPin size={18} />
          <span>Search or use your current location</span>
        </div>
      )}
    </div>
  );
};

export default PlaceMapPicker;
