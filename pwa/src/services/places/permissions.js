import { PLACE_PERMISSION_PROMPTED_KEY } from './constants';

export const describeLocationPermission = (state) => {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  if (state === 'prompt' || state === 'default') return 'prompt';
  if (state === 'prompt-with-rationale') return 'prompt';
  return 'unavailable';
};

export const shouldPromptPlacePermission = ({
  permission,
  prompted = false,
  hasPlaces = false,
} = {}) => {
  if (!hasPlaces && permission === 'denied') return true;
  if (permission === 'granted' || permission === 'unavailable') return false;
  if (prompted && permission === 'denied') return false;
  return permission === 'prompt' || permission === 'default';
};

const browserStorage = () => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch (error) {
    return null;
  }
};

export const readPlacePermissionPrompted = (storage = browserStorage()) => {
  try {
    return storage?.getItem?.(PLACE_PERMISSION_PROMPTED_KEY) === '1';
  } catch (error) {
    return false;
  }
};

export const markPlacePermissionPrompted = (storage = browserStorage()) => {
  try {
    storage?.setItem?.(PLACE_PERMISSION_PROMPTED_KEY, '1');
  } catch (error) {
    // ignore
  }
};

export const queryGeolocationPermission = async () => {
  if (typeof navigator === 'undefined') return 'unavailable';
  if (!navigator.geolocation) return 'unavailable';
  try {
    if (navigator.permissions?.query) {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return describeLocationPermission(result?.state);
    }
  } catch (error) {
    // Safari and some webviews reject the geolocation permission name.
  }
  return 'prompt';
};

export const requestPlaceLocation = () =>
  new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(Object.assign(new Error('Location services are off'), { code: 'gps_unavailable' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy || null,
          timestamp: Date.now(),
        });
      },
      (error) => {
        const code = error?.code === 1
          ? 'permission_denied'
          : error?.code === 2
            ? 'gps_unavailable'
            : error?.code === 3
              ? 'gps_timeout'
              : 'location_failed';
        reject(Object.assign(new Error(error?.message || 'Location failed'), { code }));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  });

export const automaticDetectionAvailable = (permission) =>
  permission === 'granted';
