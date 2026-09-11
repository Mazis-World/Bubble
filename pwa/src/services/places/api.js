import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import Place from '../../models/Place';
import PlaceEvent from '../../models/PlaceEvent';
import { MEMO_TYPE, createFamilyMemo } from '../memos';
import {
  DEFAULT_RADIUS_METERS,
  EVENT_SOURCE,
  EVENT_TYPE,
  MAX_PLACES_PER_USER,
  OWNED_PLACE_IDS_FIELD,
  PLACE_LIMIT_MESSAGE,
  PLACE_TYPE,
  presetForType,
} from './constants';
import {
  canCheckInAtPlace,
  canCreatePlace,
  canCreatePlaceEvent,
  canDeletePlace,
  canEditPlace,
  canViewPlaceHistory,
  placeLimitError,
  sanitizeRecipientUserIds,
} from './authz';
import { clampRadiusMeters } from './geofence';
import { formatPlaceEventMessage } from './copy';
import { enqueuePendingPlaceEvent, peekPendingPlaceEvents, removePendingPlaceEvent } from './offline';

const placesCollection = (bubbleId) => collection(db, 'bubbles', bubbleId, 'places');
const eventsCollection = (bubbleId) => collection(db, 'bubbles', bubbleId, 'placeEvents');
const presenceDoc = (bubbleId, userId, placeId) =>
  doc(db, 'bubbles', bubbleId, 'placePresence', `${userId}_${placeId}`);

const requireAuthUid = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('You must be signed in to use Places.');
  return uid;
};

const memberIdsFromUser = (data) => (Array.isArray(data?.bubbles) ? data.bubbles : []);

const assertBubbleMembership = async (bubbleId, uid) => {
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists() || !memberIdsFromUser(userSnap.data()).includes(bubbleId)) {
    throw new Error('You are not a member of this bubble.');
  }
  return userSnap;
};

const loadMemberIds = async (bubbleId, uid) => {
  const bubbleSnap = await getDoc(doc(db, 'bubbles', bubbleId));
  const members = bubbleSnap.exists() && Array.isArray(bubbleSnap.data()?.members)
    ? bubbleSnap.data().members
    : [];
  const nodesSnap = await getDocs(collection(db, 'bubbles', bubbleId, 'nodes'));
  const fromNodes = nodesSnap.docs.map((item) => item.data()?.userId).filter(Boolean);
  return [...new Set([uid, ...members, ...fromNodes].filter(Boolean))];
};

const ownedPlaceIds = (userData) =>
  Array.isArray(userData?.[OWNED_PLACE_IDS_FIELD]) ? userData[OWNED_PLACE_IDS_FIELD] : [];

export const countOwnedPlaces = (places, ownerId) =>
  (places || []).filter((place) => place.ownerId === ownerId && place.isActive !== undefined).length
  || (places || []).filter((place) => place.ownerId === ownerId).length;

export const buildPlacePayload = ({
  ownerId,
  bubbleId,
  name,
  type,
  address,
  latitude,
  longitude,
  radiusMeters,
  icon,
  color,
  arrivalNotificationsEnabled,
  departureNotificationsEnabled,
  recipientUserIds,
  memberIds,
  isActive = true,
}) => {
  const preset = presetForType(type);
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Choose a location for this Place.');
  }
  const trimmedName = String(name || preset.name).trim() || preset.name;
  return {
    ownerId,
    familyBubbleId: bubbleId,
    name: trimmedName.slice(0, 40),
    type: Object.values(PLACE_TYPE).includes(type) ? type : PLACE_TYPE.CUSTOM,
    address: String(address || '').trim().slice(0, 200),
    latitude: lat,
    longitude: lng,
    radiusMeters: clampRadiusMeters(radiusMeters ?? DEFAULT_RADIUS_METERS),
    icon: icon || preset.icon,
    color: color || preset.color,
    arrivalNotificationsEnabled: arrivalNotificationsEnabled !== false,
    departureNotificationsEnabled: departureNotificationsEnabled !== false,
    recipientUserIds: sanitizeRecipientUserIds({
      recipientUserIds,
      memberIds,
      ownerId,
    }),
    isActive: isActive !== false,
  };
};

export const listPlaces = async (bubbleId) => {
  const uid = requireAuthUid();
  await assertBubbleMembership(bubbleId, uid);
  const snap = await getDocs(placesCollection(bubbleId));
  return snap.docs.map((item) => Place.fromFirestore(item));
};

export const getPlace = async (bubbleId, placeId) => {
  const uid = requireAuthUid();
  await assertBubbleMembership(bubbleId, uid);
  const snap = await getDoc(doc(db, 'bubbles', bubbleId, 'places', placeId));
  if (!snap.exists()) throw new Error('That Place is no longer available.');
  const place = Place.fromFirestore(snap);
  return place;
};

export const createPlace = async ({
  bubbleId,
  name,
  type,
  address,
  latitude,
  longitude,
  radiusMeters,
  icon,
  color,
  arrivalNotificationsEnabled,
  departureNotificationsEnabled,
  recipientUserIds,
}) => {
  const uid = requireAuthUid();
  const userSnap = await assertBubbleMembership(bubbleId, uid);
  const memberIds = await loadMemberIds(bubbleId, uid);
  const currentOwned = ownedPlaceIds(userSnap.data());
  if (!canCreatePlace({
    authUid: uid,
    ownerId: uid,
    memberIds,
    ownedCount: currentOwned.length,
  })) {
    const limit = placeLimitError(currentOwned.length);
    throw new Error(limit || 'You cannot add this Place.');
  }

  const payload = buildPlacePayload({
    ownerId: uid,
    bubbleId,
    name,
    type,
    address,
    latitude,
    longitude,
    radiusMeters,
    icon,
    color,
    arrivalNotificationsEnabled,
    departureNotificationsEnabled,
    recipientUserIds,
    memberIds,
  });

  const placeRef = doc(placesCollection(bubbleId));
  const userRef = doc(db, 'users', uid);

  await runTransaction(db, async (tx) => {
    const latestUser = await tx.get(userRef);
    const ids = ownedPlaceIds(latestUser.data());
    if (ids.length >= MAX_PLACES_PER_USER) {
      throw new Error(PLACE_LIMIT_MESSAGE);
    }
    tx.update(userRef, { [OWNED_PLACE_IDS_FIELD]: [...ids, placeRef.id] });
    tx.set(placeRef, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  return placeRef.id;
};

export const updatePlace = async (bubbleId, placeId, patch = {}) => {
  const uid = requireAuthUid();
  await assertBubbleMembership(bubbleId, uid);
  const placeRef = doc(db, 'bubbles', bubbleId, 'places', placeId);
  const snap = await getDoc(placeRef);
  if (!snap.exists()) throw new Error('That Place is no longer available.');
  const place = Place.fromFirestore(snap);
  if (!canEditPlace({ authUid: uid, place })) {
    throw new Error('You can only edit your own Places.');
  }
  const memberIds = await loadMemberIds(bubbleId, uid);
  const next = buildPlacePayload({
    ownerId: place.ownerId,
    bubbleId,
    name: patch.name ?? place.name,
    type: patch.type ?? place.type,
    address: patch.address ?? place.address,
    latitude: patch.latitude ?? place.latitude,
    longitude: patch.longitude ?? place.longitude,
    radiusMeters: patch.radiusMeters ?? place.radiusMeters,
    icon: patch.icon ?? place.icon,
    color: patch.color ?? place.color,
    arrivalNotificationsEnabled: patch.arrivalNotificationsEnabled ?? place.arrivalNotificationsEnabled,
    departureNotificationsEnabled: patch.departureNotificationsEnabled ?? place.departureNotificationsEnabled,
    recipientUserIds: patch.recipientUserIds ?? place.recipientUserIds,
    memberIds,
    isActive: patch.isActive ?? place.isActive,
  });
  await updateDoc(placeRef, {
    ...next,
    updatedAt: serverTimestamp(),
  });
  return { ...place, ...next, placeId };
};

export const deletePlace = async (bubbleId, placeId) => {
  const uid = requireAuthUid();
  await assertBubbleMembership(bubbleId, uid);
  const placeRef = doc(db, 'bubbles', bubbleId, 'places', placeId);
  const snap = await getDoc(placeRef);
  if (!snap.exists()) return;
  const place = Place.fromFirestore(snap);
  if (!canDeletePlace({ authUid: uid, place })) {
    throw new Error('You can only delete your own Places.');
  }
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (tx) => {
    const latestUser = await tx.get(userRef);
    const ids = ownedPlaceIds(latestUser.data()).filter((id) => id !== placeId);
    tx.update(userRef, { [OWNED_PLACE_IDS_FIELD]: ids });
    tx.delete(placeRef);
  });
};

export const updatePlaceNotifications = async (bubbleId, placeId, {
  recipientUserIds,
  arrivalNotificationsEnabled,
  departureNotificationsEnabled,
} = {}) => {
  return updatePlace(bubbleId, placeId, {
    recipientUserIds,
    arrivalNotificationsEnabled,
    departureNotificationsEnabled,
  });
};

const eventTimestampMs = (value) => {
  if (!value) return Date.now();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

export const shouldNotifyForEvent = (place, eventType) => {
  if (!place || place.isActive === false) return false;
  if (eventType === EVENT_TYPE.ARRIVED) return place.arrivalNotificationsEnabled !== false;
  if (eventType === EVENT_TYPE.LEFT) return place.departureNotificationsEnabled !== false;
  if (eventType === EVENT_TYPE.CHECKED_IN) return true;
  if (eventType === EVENT_TYPE.UPDATED) return true;
  return false;
};

const writePresence = async (bubbleId, userId, placeId, { inside, lastEventType, lastEventId, timestamp }) => {
  await setDoc(presenceDoc(bubbleId, userId, placeId), {
    userId,
    placeId,
    familyBubbleId: bubbleId,
    inside: inside === true,
    lastEventType: lastEventType || null,
    lastEventId: lastEventId || null,
    lastTransitionAt: timestamp || Date.now(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const recordPlaceEvent = async ({
  bubbleId,
  place,
  userId,
  nodeId,
  displayName,
  eventType,
  source,
  timestamp,
  idempotencyKey,
  notify = true,
}) => {
  const uid = requireAuthUid();
  const actorId = userId || uid;
  const memberIds = await loadMemberIds(bubbleId, uid);
  if (!canCreatePlaceEvent({
    authUid: uid,
    userId: actorId,
    memberIds,
    eventType,
    source,
  })) {
    throw new Error('You cannot record that Place event.');
  }
  if (!place || place.familyBubbleId !== bubbleId) {
    throw new Error('That Place is no longer available.');
  }

  const key = idempotencyKey || `${actorId}:${place.placeId}:${eventType}:${Math.floor((timestamp || Date.now()) / 60000)}`;
  const eventRef = doc(db, 'bubbles', bubbleId, 'placeEvents', key);
  const existing = await getDoc(eventRef);
  if (existing.exists()) {
    return { eventId: eventRef.id, duplicate: true };
  }

  const payload = {
    userId: actorId,
    placeId: place.placeId,
    familyBubbleId: bubbleId,
    eventType,
    source,
    idempotencyKey: key,
    timestamp: timestamp || Date.now(),
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(eventRef, payload);
  } catch (error) {
    enqueuePendingPlaceEvent({ ...payload, bubbleId, displayName, nodeId, notify });
    throw error;
  }

  if (eventType === EVENT_TYPE.ARRIVED || eventType === EVENT_TYPE.LEFT) {
    await writePresence(bubbleId, actorId, place.placeId, {
      inside: eventType === EVENT_TYPE.ARRIVED,
      lastEventType: eventType,
      lastEventId: eventRef.id,
      timestamp: payload.timestamp,
    });
  }

  if (notify && shouldNotifyForEvent(place, eventType)) {
    try {
      await createFamilyMemo({
        bubbleId,
        userId: actorId,
        nodeId,
        type: MEMO_TYPE.PLACE,
        status: place.icon || null,
        message: formatPlaceEventMessage({
          place,
          memberName: displayName,
          eventType,
        }),
        location: null,
        placeId: place.placeId,
        placeEventType: eventType,
        recipientUserIds: place.recipientUserIds || [],
      });
    } catch (error) {
      console.warn('Place notification memo failed:', error);
    }
  }

  return { eventId: eventRef.id, duplicate: false };
};

export const checkInAtPlace = async ({ bubbleId, place, nodeId, displayName }) => {
  const uid = requireAuthUid();
  await assertBubbleMembership(bubbleId, uid);
  if (!canCheckInAtPlace({ authUid: uid, place, isMember: true })) {
    throw new Error('You cannot check in at this Place.');
  }
  return recordPlaceEvent({
    bubbleId,
    place,
    userId: uid,
    nodeId,
    displayName,
    eventType: EVENT_TYPE.CHECKED_IN,
    source: EVENT_SOURCE.MANUAL,
    timestamp: Date.now(),
    idempotencyKey: `${uid}:${place.placeId}:${EVENT_TYPE.CHECKED_IN}:${Date.now()}`,
  });
};

export const recordPlaceUpdated = async ({ bubbleId, place, nodeId, displayName }) => {
  const uid = requireAuthUid();
  return recordPlaceEvent({
    bubbleId,
    place,
    userId: uid,
    nodeId,
    displayName,
    eventType: EVENT_TYPE.UPDATED,
    source: EVENT_SOURCE.MANUAL,
    timestamp: Date.now(),
    idempotencyKey: `${uid}:${place.placeId}:${EVENT_TYPE.UPDATED}:${Date.now()}`,
  });
};

export const listPlaceActivity = async (bubbleId, placeId) => {
  const uid = requireAuthUid();
  await assertBubbleMembership(bubbleId, uid);
  const placeSnap = await getDoc(doc(db, 'bubbles', bubbleId, 'places', placeId));
  if (!placeSnap.exists()) return [];
  const place = Place.fromFirestore(placeSnap);
  const memberIds = await loadMemberIds(bubbleId, uid);
  if (!canViewPlaceHistory({ authUid: uid, memberIds, place })) return [];
  const activityQuery = query(
    eventsCollection(bubbleId),
    where('placeId', '==', placeId),
    orderBy('timestamp', 'desc'),
    limit(50)
  );
  const snap = await getDocs(activityQuery);
  return snap.docs
    .map((item) => PlaceEvent.fromFirestore(item))
    .sort((a, b) => eventTimestampMs(b.timestamp) - eventTimestampMs(a.timestamp));
};

export const listenToPlaces = (bubbleId, onChange) => {
  if (!bubbleId) return () => {};
  return onSnapshot(
    placesCollection(bubbleId),
    (snapshot) => {
      onChange(snapshot.docs.map((item) => Place.fromFirestore(item)));
    },
    (error) => {
      console.warn('Places listener failed:', error);
      onChange([]);
    }
  );
};

export const listenToPresence = (bubbleId, onChange) => {
  if (!bubbleId) return () => {};
  return onSnapshot(
    collection(db, 'bubbles', bubbleId, 'placePresence'),
    (snapshot) => {
      onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
    (error) => {
      console.warn('Place presence listener failed:', error);
      onChange([]);
    }
  );
};

export const listenToPlaceActivity = (bubbleId, placeId, onChange) => {
  if (!bubbleId || !placeId) return () => {};
  const activityQuery = query(
    eventsCollection(bubbleId),
    where('placeId', '==', placeId),
    orderBy('timestamp', 'desc'),
    limit(50)
  );
  return onSnapshot(
    activityQuery,
    (snapshot) => {
      onChange(snapshot.docs.map((item) => PlaceEvent.fromFirestore(item)));
    },
    (error) => {
      console.warn('Place activity listener failed:', error);
      onChange([]);
    }
  );
};

export const flushPendingPlaceEvents = async (placesById = {}) => {
  const pending = peekPendingPlaceEvents();
  if (!pending.length) return [];
  const results = [];
  for (const item of pending) {
    const place = placesById[item.placeId];
    if (!place) continue;
    try {
      const result = await recordPlaceEvent({
        bubbleId: item.bubbleId || place.familyBubbleId,
        place,
        userId: item.userId,
        nodeId: item.nodeId,
        displayName: item.displayName,
        eventType: item.eventType,
        source: item.source,
        timestamp: item.timestamp,
        idempotencyKey: item.idempotencyKey,
        notify: item.notify !== false,
      });
      removePendingPlaceEvent(item.idempotencyKey);
      results.push(result);
    } catch (error) {
      if (error?.code === 'permission-denied') {
        removePendingPlaceEvent(item.idempotencyKey);
      }
    }
  }
  return results;
};

export const everyoneAtHome = ({ place, presence = [], memberIds = [] }) => {
  if (!place || place.type !== PLACE_TYPE.HOME) return false;
  if (!memberIds.length) return false;
  const inside = new Set(
    (presence || [])
      .filter((item) => item.placeId === place.placeId && item.inside === true)
      .map((item) => item.userId)
  );
  return memberIds.every((userId) => inside.has(userId));
};
