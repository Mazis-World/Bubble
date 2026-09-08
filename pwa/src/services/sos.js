import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import SosEvent from '../models/SosEvent';
import { API } from './bubble';

export const SOS_STATUS = {
  ACTIVE: 'ACTIVE',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED',
};

export const SOS_HOLD_MS = 3000;
export const SOS_CONFIRM_SECONDS = 3;
/** Battery-conscious interval used only while an SOS is ACTIVE/ACKNOWLEDGED. */
export const SOS_LOCATION_INTERVAL_MS = 20000;
export const PENDING_SOS_KEY = 'familyBubble_pendingSos';
export const PENDING_DEEP_LINK_KEY = 'familyBubble_pendingSosLink';
export const EMERGENCY_NUMBER_KEY = 'familyBubble_emergencyNumber';
export const DEFAULT_EMERGENCY_NUMBER = '911';

export const OPEN_STATUSES = [SOS_STATUS.ACTIVE, SOS_STATUS.ACKNOWLEDGED];

const timestampToMs = (timestamp) => {
  if (!timestamp) return null;
  if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
  if (typeof timestamp.seconds === 'number') return timestamp.seconds * 1000;
  const parsed = new Date(timestamp).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

export const classifyLocationFreshness = (timestamp, now = Date.now()) => {
  const ms = timestampToMs(timestamp);
  if (!ms) return 'unavailable';
  const age = now - ms;
  if (age < 45000) return 'live';
  if (age < 5 * 60 * 1000) return 'recent';
  return 'stale';
};

export const parseSosDeepLink = (search = '') => {
  let params;
  if (!search) return null;
  if (search.startsWith('http')) {
    params = new URL(search).searchParams;
  } else if (search.includes('?')) {
    params = new URLSearchParams(search.slice(search.indexOf('?')));
  } else {
    params = new URLSearchParams(search);
  }
  const sosId = params.get('sos');
  const bubbleId = params.get('bubble');
  if (!sosId || !bubbleId) return null;
  return { sosId, bubbleId };
};

export const buildSosDeepLink = (origin, sosId, bubbleId) =>
  `${origin.replace(/\/$/, '')}/?sos=${encodeURIComponent(sosId)}&bubble=${encodeURIComponent(bubbleId)}`;

export const isOpenSosStatus = (status) => OPEN_STATUSES.includes(status);

export const canCreateSos = ({ authUid, userId, isBubbleMember, existingActive }) => {
  if (!authUid || authUid !== userId) return { ok: false, reason: 'unauthorized' };
  if (!isBubbleMember) return { ok: false, reason: 'not_a_member' };
  if (existingActive) return { ok: false, reason: 'duplicate', existingActive };
  return { ok: true };
};

export const shouldNotifySosRecipient = ({ viewerUid, sosUserId }) =>
  Boolean(viewerUid && sosUserId && viewerUid !== sosUserId);

export const shouldWatchLocationForSos = ({ authUid, sos }) =>
  canUpdateSosLocation({ authUid, sos });

export const osmEmbedUrl = (latitude, longitude) => {
  if (latitude == null || longitude == null) return null;
  const delta = 0.012;
  const minLon = longitude - delta;
  const minLat = latitude - delta;
  const maxLon = longitude + delta;
  const maxLat = latitude + delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${latitude}%2C${longitude}`;
};

export const buildSosNotification = (memberName) => ({
  title: '🚨 SOS ALERT',
  body: `${memberName || 'A family member'} has activated an SOS alert.\n\nTap to view their location.`,
});

export const canViewSos = ({ isBubbleMember }) => isBubbleMember === true;

export const canAcknowledgeSos = ({ authUid, sos, isBubbleMember }) =>
  Boolean(isBubbleMember && authUid && sos?.userId !== authUid && sos?.status === SOS_STATUS.ACTIVE);

export const canResolveSos = ({ authUid, sos }) =>
  Boolean(authUid && sos?.userId === authUid && OPEN_STATUSES.includes(sos?.status));

export const canCancelSos = ({ authUid, sos }) =>
  Boolean(authUid && sos?.userId === authUid && sos?.status === SOS_STATUS.ACTIVE);

export const canUpdateSosLocation = ({ authUid, sos }) =>
  Boolean(authUid && sos?.userId === authUid && OPEN_STATUSES.includes(sos?.status));

export const describePermissionState = (state) => {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  if (state === 'prompt' || state === 'default') return 'prompt';
  return 'unavailable';
};

export const hapticPulse = (pattern = [80, 40, 80]) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (error) {
    // Haptics are optional.
  }
};

export const existingActiveFrom = (existing) => existing || null;

export const getEmergencyNumber = () => {
  try {
    return localStorage.getItem(EMERGENCY_NUMBER_KEY) || DEFAULT_EMERGENCY_NUMBER;
  } catch (error) {
    return DEFAULT_EMERGENCY_NUMBER;
  }
};

export const setEmergencyNumber = (number) => {
  const cleaned = String(number || DEFAULT_EMERGENCY_NUMBER).replace(/[^\d+]/g, '');
  localStorage.setItem(EMERGENCY_NUMBER_KEY, cleaned || DEFAULT_EMERGENCY_NUMBER);
};

export const callEmergencyServices = (number = getEmergencyNumber()) => {
  if (typeof window === 'undefined') return;
  window.location.href = `tel:${number}`;
};

export const callMember = (phoneNumber) => {
  if (!phoneNumber) {
    throw new Error('This member has no phone number on file.');
  }
  window.location.href = `tel:${phoneNumber}`;
};

export const openExternalMap = (latitude, longitude) => {
  if (latitude == null || longitude == null) return;
  const query = `${latitude},${longitude}`;
  window.open(`https://www.google.com/maps?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
};

const readPendingQueue = () => {
  try {
    const raw = localStorage.getItem(PENDING_SOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
};

const writePendingQueue = (queue) => {
  localStorage.setItem(PENDING_SOS_KEY, JSON.stringify(queue));
};

export const enqueuePendingSos = (payload) => {
  const queue = readPendingQueue();
  queue.push({ ...payload, queuedAt: Date.now() });
  writePendingQueue(queue);
};

export const peekPendingSos = () => readPendingQueue();

export const clearPendingSos = () => writePendingQueue([]);

const sosCollection = (bubbleId) => collection(db, 'bubbles', bubbleId, 'sosEvents');

const requireAuthUid = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('You must be signed in to use SOS.');
  return uid;
};

const assertBubbleMembership = async (bubbleId, uid) => {
  const userSnap = await getDoc(doc(db, 'users', uid));
  const bubbles = userSnap.exists() ? userSnap.data()?.bubbles || [] : [];
  if (!bubbles.includes(bubbleId)) {
    throw new Error('You are not a member of this bubble.');
  }
};

export const findOpenSosForUser = async (bubbleId, userId) => {
  const snap = await getDocs(query(sosCollection(bubbleId), where('userId', '==', userId)));
  return snap.docs
    .map((item) => SosEvent.fromFirestore(item))
    .find((event) => OPEN_STATUSES.includes(event.status)) || null;
};

export const getCurrentPosition = (timeoutMs = 12000) =>
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
          accuracy: position.coords.accuracy || null,
          timestamp: Date.now(),
        });
      },
      (error) => {
        const mapped =
          error.code === 1
            ? 'permission_denied'
            : error.code === 2
              ? 'gps_unavailable'
              : error.code === 3
                ? 'gps_timeout'
                : 'location_failed';
        reject(Object.assign(new Error(error.message || 'Location failed'), { code: mapped }));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });

export const queryGeolocationPermission = async () => {
  try {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'prompt';
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return describePermissionState(result.state);
  } catch (error) {
    return 'prompt';
  }
};

const buildLocationPayload = (location) => {
  if (!location || location.latitude == null || location.longitude == null) return null;
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy || null,
    timestamp: serverTimestamp(),
  };
};

export const activateSos = async ({ bubbleId, userId, nodeId, location = null }) => {
  const uid = requireAuthUid();
  await assertBubbleMembership(bubbleId, uid);

  const existing = await findOpenSosForUser(bubbleId, uid);
  const decision = canCreateSos({
    authUid: uid,
    userId,
    isBubbleMember: true,
    existingActive: existing,
  });

  if (decision.reason === 'duplicate' && existing) {
    if (location) {
      await updateSosLocation({ bubbleId, sosId: existing.sosId, location });
    }
    return { sos: existing, duplicate: true, delivered: true };
  }
  if (!decision.ok) {
    throw new Error('You cannot activate SOS for this bubble.');
  }

  const payload = {
    bubbleId,
    userId: uid,
    nodeId: nodeId || null,
    status: SOS_STATUS.ACTIVE,
    createdAt: serverTimestamp(),
    acknowledgedAt: null,
    acknowledgedBy: null,
    resolvedAt: null,
    cancelledAt: null,
    latestLocation: buildLocationPayload(location),
    delivered: false,
  };

  try {
    const ref = await addDoc(sosCollection(bubbleId), payload);
    await updateDoc(ref, { delivered: true });
    await API.updateStatus(bubbleId, nodeId, '🆘', 'SOS – I need help').catch(() => {});
    if (location) {
      await API.updateLocation(bubbleId, nodeId, location).catch(() => {});
    }
    const created = SosEvent.fromFirestore(await getDoc(ref));
    return { sos: created, duplicate: false, delivered: true };
  } catch (error) {
    // Never report delivery unless Firestore confirmed the write.
    if (typeof navigator !== 'undefined' && (!navigator.onLine || error.code === 'unavailable')) {
      enqueuePendingSos({ bubbleId, userId: uid, nodeId, location });
      return { sos: null, duplicate: false, delivered: false, queued: true };
    }
    throw error;
  }
};

export const updateSosLocation = async ({ bubbleId, sosId, location, nodeId = null }) => {
  const uid = requireAuthUid();
  const snap = await getDoc(doc(db, 'bubbles', bubbleId, 'sosEvents', sosId));
  if (!snap.exists()) throw new Error('SOS event not found.');
  const sos = SosEvent.fromFirestore(snap);
  if (!canUpdateSosLocation({ authUid: uid, sos })) {
    throw new Error('You cannot update this SOS location.');
  }
  await updateDoc(snap.ref, { latestLocation: buildLocationPayload(location) });
  if (nodeId) {
    await API.updateLocation(bubbleId, nodeId, location).catch(() => {});
  }
};

export const acknowledgeSos = async ({ bubbleId, sosId }) => {
  const uid = requireAuthUid();
  await assertBubbleMembership(bubbleId, uid);
  const snap = await getDoc(doc(db, 'bubbles', bubbleId, 'sosEvents', sosId));
  if (!snap.exists()) throw new Error('SOS event not found.');
  const sos = SosEvent.fromFirestore(snap);
  if (!canAcknowledgeSos({ authUid: uid, sos, isBubbleMember: true })) {
    throw new Error('You cannot acknowledge this SOS.');
  }
  await updateDoc(snap.ref, {
    status: SOS_STATUS.ACKNOWLEDGED,
    acknowledgedAt: serverTimestamp(),
    acknowledgedBy: uid,
  });
};

export const resolveSos = async ({ bubbleId, sosId, nodeId = null }) => {
  const uid = requireAuthUid();
  const snap = await getDoc(doc(db, 'bubbles', bubbleId, 'sosEvents', sosId));
  if (!snap.exists()) throw new Error('SOS event not found.');
  const sos = SosEvent.fromFirestore(snap);
  if (!canResolveSos({ authUid: uid, sos })) {
    throw new Error('Only the person who activated SOS can mark themselves safe.');
  }
  await updateDoc(snap.ref, {
    status: SOS_STATUS.RESOLVED,
    resolvedAt: serverTimestamp(),
  });
  if (nodeId) {
    await API.updateStatus(bubbleId, nodeId, '✅', "I'm safe").catch(() => {});
  }
};

export const cancelSos = async ({ bubbleId, sosId, nodeId = null }) => {
  const uid = requireAuthUid();
  const snap = await getDoc(doc(db, 'bubbles', bubbleId, 'sosEvents', sosId));
  if (!snap.exists()) throw new Error('SOS event not found.');
  const sos = SosEvent.fromFirestore(snap);
  if (!canCancelSos({ authUid: uid, sos })) {
    throw new Error('You cannot cancel this SOS.');
  }
  await updateDoc(snap.ref, {
    status: SOS_STATUS.CANCELLED,
    cancelledAt: serverTimestamp(),
  });
  if (nodeId) {
    await API.updateStatus(bubbleId, nodeId, '✅', null).catch(() => {});
  }
};

export const getSosEvent = async (bubbleId, sosId) => {
  const uid = requireAuthUid();
  await assertBubbleMembership(bubbleId, uid);
  const snap = await getDoc(doc(db, 'bubbles', bubbleId, 'sosEvents', sosId));
  if (!snap.exists()) return null;
  return SosEvent.fromFirestore(snap);
};

export const listenToSosEvent = (bubbleId, sosId, onChange) => {
  if (!bubbleId || !sosId) return () => {};
  return onSnapshot(
    doc(db, 'bubbles', bubbleId, 'sosEvents', sosId),
    (snap) => {
      onChange(snap.exists() ? SosEvent.fromFirestore(snap) : null);
    },
    (error) => {
      console.warn('SOS event listener failed:', error);
      onChange(null);
    }
  );
};

export const listenToOpenSosEvents = (bubbleId, onChange) => {
  if (!bubbleId) return () => {};
  const sosQuery = query(sosCollection(bubbleId), where('status', 'in', OPEN_STATUSES));
  return onSnapshot(
    sosQuery,
    (snapshot) => {
      onChange(snapshot.docs.map((item) => SosEvent.fromFirestore(item)));
    },
    (error) => {
      console.warn('SOS listener failed:', error);
      onChange([]);
    }
  );
};

export const startSosLocationWatch = ({ bubbleId, sosId, nodeId, onUpdate, onError }) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError?.(Object.assign(new Error('GPS unavailable'), { code: 'gps_unavailable' }));
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy || null,
      };
      try {
        await updateSosLocation({ bubbleId, sosId, location, nodeId });
        onUpdate?.(location);
      } catch (error) {
        onError?.(error);
      }
    },
    (error) => onError?.(error),
    {
      enableHighAccuracy: true,
      maximumAge: SOS_LOCATION_INTERVAL_MS,
      timeout: 15000,
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
};

export const flushPendingSos = async () => {
  const queue = readPendingQueue();
  if (!queue.length) return [];
  const remaining = [];
  const sent = [];
  for (const item of queue) {
    try {
      const result = await activateSos(item);
      if (result.delivered) sent.push(result);
      else remaining.push(item);
    } catch (error) {
      remaining.push(item);
    }
  }
  writePendingQueue(remaining);
  return sent;
};

export const persistPendingDeepLink = (link) => {
  if (!link) return;
  localStorage.setItem(PENDING_DEEP_LINK_KEY, JSON.stringify(link));
};

export const consumePendingDeepLink = () => {
  try {
    const raw = localStorage.getItem(PENDING_DEEP_LINK_KEY);
    localStorage.removeItem(PENDING_DEEP_LINK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
};
