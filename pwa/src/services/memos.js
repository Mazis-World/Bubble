import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import FamilyMemo from '../models/FamilyMemo';

export const MEMO_TYPE = {
  STATUS: 'status',
  SOS: 'sos',
};

const MEMO_LIMIT = 50;

const timestampToMs = (timestamp) => {
  if (!timestamp) return 0;
  if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
  if (typeof timestamp.seconds === 'number') return timestamp.seconds * 1000;
  const parsed = new Date(timestamp).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const canViewMemos = ({ isBubbleMember }) => isBubbleMember === true;

export const canCreateMemo = ({ authUid, userId, isBubbleMember, type }) => {
  if (!authUid || authUid !== userId) return false;
  if (!isBubbleMember) return false;
  return type === MEMO_TYPE.STATUS || type === MEMO_TYPE.SOS;
};

export const formatMemberLocation = (location) => {
  if (!location || location.latitude == null || location.longitude == null) {
    return 'Location unavailable';
  }
  if (location.address) return location.address;
  return `${Number(location.latitude).toFixed(3)}, ${Number(location.longitude).toFixed(3)}`;
};

const compactLocation = (location) => {
  if (!location || location.latitude == null || location.longitude == null) return null;
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy || null,
    address: location.address || null,
  };
};

/**
 * Active SOS memos stay pinned above newer status memos.
 * Everything else is newest-first.
 */
export const sortFamilyMemos = (memos, openSosIds = []) =>
  [...memos].sort((a, b) => {
    const aPin = a.type === MEMO_TYPE.SOS && (!a.sosId || openSosIds.includes(a.sosId));
    const bPin = b.type === MEMO_TYPE.SOS && (!b.sosId || openSosIds.includes(b.sosId));
    if (aPin !== bPin) return aPin ? -1 : 1;
    return timestampToMs(b.createdAt) - timestampToMs(a.createdAt);
  });

const memosCollection = (bubbleId) => collection(db, 'bubbles', bubbleId, 'memos');

export const createFamilyMemo = async ({
  bubbleId,
  userId,
  nodeId,
  type,
  status,
  message = null,
  location = null,
  sosId = null,
}) => {
  const uid = auth.currentUser?.uid;
  if (!canCreateMemo({ authUid: uid, userId, isBubbleMember: true, type })) {
    throw new Error('You cannot post a memo to this bubble.');
  }

  const ref = await addDoc(memosCollection(bubbleId), {
    bubbleId,
    userId: uid,
    nodeId: nodeId || null,
    type,
    status: status || null,
    message: message || null,
    location: compactLocation(location),
    sosId: sosId || null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const listenToFamilyMemos = (bubbleId, onChange) => {
  if (!bubbleId) return () => {};
  const memosQuery = query(memosCollection(bubbleId), orderBy('createdAt', 'desc'), limit(MEMO_LIMIT));
  return onSnapshot(
    memosQuery,
    (snapshot) => {
      onChange(snapshot.docs.map((item) => FamilyMemo.fromFirestore(item)));
    },
    (error) => {
      console.warn('Family memos listener failed:', error);
      onChange([]);
    }
  );
};
