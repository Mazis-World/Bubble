import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, AlertCircle, Search } from 'lucide-react';

const LocationStep = ({ onLocationSet, initialLocation = null }) => {
  const [location, setLocation] = useState(initialLocation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addressMode, setAddressMode] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);

  // Try to get location automatically on mount
  useEffect(() => {
    if (!initialLocation) {
      requestLocation();
    } else if (initialLocation.address) {
      // If we have an initial location with address, set it
      setLocation(initialLocation);
      setSelectedAddress(initialLocation.address);
      setAddressQuery(initialLocation.address);
    }
  }, []);

  // Reverse geocode coordinates to get address
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'FamilyBubble/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const requestLocation = async () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      setAddressMode(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Reverse geocode to get address
        const address = await reverseGeocode(lat, lng);
        
        const loc = {
          latitude: lat,
          longitude: lng,
          accuracy: position.coords.accuracy,
          address: address, // Always include address
        };
        setLocation(loc);
        setSelectedAddress(address);
        setAddressQuery(address);
        setLoading(false);
        if (onLocationSet) {
          onLocationSet(loc);
        }
      },
      (error) => {
        console.warn('Location access denied or failed:', error);
        setError('Location access denied. You can search for your location by address below.');
        setLoading(false);
        setAddressMode(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Geocode address using OpenStreetMap Nominatim (free, no API key needed)
  const geocodeAddress = async (query) => {
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      // Use Nominatim geocoding API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'FamilyBubble/1.0', // Required by Nominatim
          },
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Failed to search location. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Handle address search with debounce
  useEffect(() => {
    if (!addressQuery || addressQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      geocodeAddress(addressQuery);
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [addressQuery]);

  const handleAddressSelect = (result) => {
    const loc = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      accuracy: null,
      address: result.display_name, // Store the address for display
    };
    setLocation(loc);
    setSelectedAddress(result.display_name);
    setAddressQuery(result.display_name);
    setSearchResults([]);
    setError(null);
    if (onLocationSet) {
      onLocationSet(loc);
    }
  };

  return (
    <div className="space-y-4">
      {!location && !addressMode && (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            {loading ? (
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            ) : (
              <MapPin className="w-12 h-12 text-blue-500" />
            )}
          </div>
          <p className="text-gray-300">
            {loading ? 'Getting your location...' : 'We need your location to show you on the globe'}
          </p>
          {!loading && (
            <button
              onClick={requestLocation}
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-400 hover:via-purple-400 hover:to-pink-400 text-white py-3.5 rounded-2xl font-bold transition-all duration-300 shadow-lg glow-blue hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] tap-target relative overflow-hidden group"
            >
              <span className="relative z-10">Get My Location</span>
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="bg-amber-900/20 border border-amber-800/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-200 text-sm">{error}</p>
          </div>
        </div>
      )}

      {location && (
        <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            <p className="text-emerald-200 font-bold">Location Set!</p>
          </div>
          <p className="text-emerald-100 text-sm font-medium">
            {location.address || 'Address not available'}
          </p>
          {location.accuracy && (
            <p className="text-emerald-300 text-xs mt-1 font-medium">
              Accuracy: ±{Math.round(location.accuracy)}m
            </p>
          )}
          <button
            onClick={() => {
              setLocation(null);
              setAddressMode(false);
              setAddressQuery('');
              setSelectedAddress(null);
              requestLocation();
            }}
            className="mt-3 text-emerald-300 hover:text-emerald-200 text-sm font-semibold underline transition-colors"
          >
            Update Location
          </button>
        </div>
      )}

      {(addressMode || (!location && !loading)) && (
        <div className="space-y-4 border-t border-gray-800 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-200 text-sm font-bold">Or search by address:</p>
            {!addressMode && (
              <button
                onClick={() => setAddressMode(true)}
                className="text-blue-400 hover:text-blue-300 text-sm font-semibold underline transition-colors"
              >
                Search Address
              </button>
            )}
          </div>

          {addressMode && (
            <div className="space-y-3">
              <div className="relative">
                <label className="block text-sm font-bold text-gray-200 mb-2">
                  Search for your city, state/province, or address
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={addressQuery}
                    onChange={(e) => {
                      setAddressQuery(e.target.value);
                      setSelectedAddress(null);
                    }}
                    placeholder="e.g., New York, NY or Toronto, ON or London, UK"
                    className="w-full pl-10 pr-4 py-3.5 glass-light border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-400 animate-spin" />
                  )}
                </div>
                
                {/* Search Results */}
                {searchResults.length > 0 && !selectedAddress && (
                  <div className="mt-2 glass-strong border border-white/10 rounded-2xl overflow-hidden max-h-60 overflow-y-auto scrollbar-hide shadow-xl">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => handleAddressSelect(result)}
                        className="w-full text-left px-4 py-3 hover:bg-white/5 active:bg-white/10 transition-all duration-300 border-b border-white/5 last:border-b-0 hover:scale-[1.01]"
                      >
                        <div className="flex items-start gap-3">
                          <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold truncate">
                              {result.display_name.split(',')[0]}
                            </p>
                            <p className="text-gray-400 text-xs mt-0.5 line-clamp-2 font-medium">
                              {result.display_name}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {addressQuery && searchResults.length === 0 && !searching && addressQuery.length >= 3 && (
                <p className="text-gray-400 text-sm text-center py-2">
                  No results found. Try a different search term.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationStep;
