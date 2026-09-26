import { MEMO_TYPE } from './memos';

export const CHECKIN_EMOJI = '📍';
export const CHECKIN_MESSAGE = 'Checked in';

export const canCheckIn = ({ authUid, userId, isBubbleMember, busy = false }) =>
  Boolean(authUid && userId && authUid === userId && isBubbleMember && !busy);

export const buildCheckInMemo = ({ location } = {}) => {
  const address = location?.address && String(location.address).trim();
  return {
    type: MEMO_TYPE.CHECKIN,
    status: CHECKIN_EMOJI,
    message: address ? `${CHECKIN_MESSAGE} · ${address}` : CHECKIN_MESSAGE,
    location: location && location.latitude != null && location.longitude != null
      ? {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || null,
        address: location.address || null,
      }
      : null,
  };
};

export const checkInButtonLabel = (state) => {
  if (state === 'busy') return 'Checking in…';
  if (state === 'done') return 'Checked in';
  if (state === 'error') return 'Location needed';
  return 'Check in';
};

export const checkInHint = (state) => {
  if (state === 'busy') return 'Finding your location…';
  if (state === 'done') return 'You’re on the family globe.';
  if (state === 'error') return 'Location is needed to drop your pin.';
  return 'Drop your live pin on the family globe — without changing your status.';
};

export const shortPlaceLabel = (address) => {
  if (!address) return null;
  if (typeof address === 'string') {
    const trimmed = address.trim();
    return trimmed ? trimmed.split(',')[0].trim() : null;
  }
  return (
    address.neighbourhood
    || address.suburb
    || address.village
    || address.town
    || address.city
    || address.hamlet
    || null
  );
};

export const lookupPlaceLabel = async (lat, lng, fetchImpl = fetch) => {
  if (lat == null || lng == null || typeof fetchImpl !== 'function') return null;
  try {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 2500) : null;
    const response = await fetchImpl(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: { 'User-Agent': 'FamilyBubble/1.0' },
        signal: controller?.signal,
      }
    );
    if (timer) clearTimeout(timer);
    if (!response?.ok) return null;
    const data = await response.json();
    return shortPlaceLabel(data?.address) || shortPlaceLabel(data?.display_name);
  } catch (error) {
    return null;
  }
};

export const readCurrentPosition = () =>
  new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(Object.assign(new Error('GPS unavailable'), { code: 'gps_unavailable' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        const mapped = error?.code === 1 ? 'permission_denied' : 'location_failed';
        reject(Object.assign(new Error(error?.message || 'Location failed'), { code: mapped }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
