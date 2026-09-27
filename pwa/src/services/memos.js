import {
  addDoc,
  collection,
  deleteField,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import FamilyMemo from '../models/FamilyMemo';

export const MEMO_TYPE = {
  STATUS: 'status',
  SOS: 'sos',
  CHECKIN: 'checkin',
  PLACE: 'place',
};

/** Classic five-emoji reaction set (thumbs up, heart, laugh, wow, sad). */
export const MEMO_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢'];

export const MEMO_REACTION_LABELS = {
  '👍': 'thumbs up',
  '❤️': 'heart',
  '😂': 'laugh',
  '😮': 'wow',
  '😢': 'sad',
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
  return type === MEMO_TYPE.STATUS
    || type === MEMO_TYPE.SOS
    || type === MEMO_TYPE.CHECKIN
    || type === MEMO_TYPE.PLACE;
};

export const canReactToMemo = ({ authUid, isBubbleMember }) =>
  Boolean(authUid && isBubbleMember);

export const normalizeMemoReactions = (reactions) => {
  if (!reactions || typeof reactions !== 'object' || Array.isArray(reactions)) return {};
  const next = {};
  Object.entries(reactions).forEach(([userId, emoji]) => {
    if (userId && MEMO_REACTION_EMOJIS.includes(emoji)) next[userId] = emoji;
  });
  return next;
};

export const viewerMemoReaction = (reactions, userId) => {
  if (!userId) return null;
  return normalizeMemoReactions(reactions)[userId] || null;
};

export const reactionCountByEmoji = (reactions) => {
  const counts = Object.fromEntries(MEMO_REACTION_EMOJIS.map((emoji) => [emoji, 0]));
  Object.values(normalizeMemoReactions(reactions)).forEach((emoji) => {
    counts[emoji] += 1;
  });
  return counts;
};

/** Same emoji again clears it. A different emoji replaces the previous one. */
export const nextMemoReaction = (currentEmoji, tappedEmoji) => {
  if (!MEMO_REACTION_EMOJIS.includes(tappedEmoji)) return currentEmoji || null;
  return currentEmoji === tappedEmoji ? null : tappedEmoji;
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
  photoUrl = null,
  voiceUrl = null,
  voiceDurationMs = null,
  placeId = null,
  placeEventType = null,
  recipientUserIds = null,
}) => {
  const uid = auth.currentUser?.uid;
  if (!canCreateMemo({ authUid: uid, userId, isBubbleMember: true, type })) {
    throw new Error('You cannot post a memo to this bubble.');
  }

  const payload = {
    bubbleId,
    userId: uid,
    nodeId: nodeId || null,
    type,
    status: status || null,
    message: message || null,
    location: type === MEMO_TYPE.PLACE ? null : compactLocation(location),
    sosId: sosId || null,
    createdAt: serverTimestamp(),
  };
  if (photoUrl) payload.photoUrl = photoUrl;
  if (voiceUrl) payload.voiceUrl = voiceUrl;
  if (voiceDurationMs != null) payload.voiceDurationMs = voiceDurationMs;
  if (type === MEMO_TYPE.PLACE) {
    payload.placeId = placeId || null;
    payload.placeEventType = placeEventType || null;
    payload.recipientUserIds = Array.isArray(recipientUserIds) ? recipientUserIds : [];
  }
  payload.reactions = {};

  const ref = await addDoc(memosCollection(bubbleId), payload);
  return ref.id;
};

export const toggleMemoReaction = async ({
  bubbleId,
  memoId,
  emoji,
  currentEmoji = null,
}) => {
  const uid = auth.currentUser?.uid;
  if (!canReactToMemo({ authUid: uid, isBubbleMember: true })) {
    throw new Error('You cannot react to this memo.');
  }
  if (!bubbleId || !memoId) {
    throw new Error('Missing memo.');
  }
  if (!MEMO_REACTION_EMOJIS.includes(emoji)) {
    throw new Error('Choose one of the five memo reactions.');
  }

  const next = nextMemoReaction(currentEmoji, emoji);
  const ref = doc(db, 'bubbles', bubbleId, 'memos', memoId);
  await updateDoc(ref, {
    [`reactions.${uid}`]: next == null ? deleteField() : next,
  });
  return next;
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
