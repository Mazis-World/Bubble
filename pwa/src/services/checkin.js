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
