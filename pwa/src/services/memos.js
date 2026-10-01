import {
  addDoc,
  collection,
  deleteDoc,
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

export const canDeleteMemo = ({ authUid, memoUserId, isBubbleMember, isBubbleOwner = false }) =>
  Boolean(
    authUid &&
    memoUserId &&
    authUid === memoUserId &&
    (isBubbleMember || isBubbleOwner)
  );

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

export const usedReactionChips = (reactions) => {
  const counts = reactionCountByEmoji(reactions);
  return MEMO_REACTION_EMOJIS
    .filter((emoji) => counts[emoji] > 0)
    .map((emoji) => ({
      emoji,
      count: counts[emoji],
      label: MEMO_REACTION_LABELS[emoji],
    }));
};

export const parseMemoDeepLink = (search = '') => {
  try {
    const params = new URLSearchParams(search.includes('?') ? search.slice(search.indexOf('?')) : search);
    const memoId = params.get('memo');
    return memoId || null;
  } catch (error) {
    return null;
  }
};

export const memoShareUrl = (memoId, originHref) => {
  if (!memoId) return null;
  const href = originHref || (typeof window !== 'undefined' ? window.location.href : '');
  if (!href) return null;
  try {
    const url = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'https://familybubble.app');
    url.search = '';
    url.hash = '';
    url.searchParams.set('memo', memoId);
    return url.toString();
  } catch (error) {
    return null;
  }
};

export const buildMemoSharePayload = ({ memo, memberName, bubbleName, originHref } = {}) => {
  const name = memberName || 'Family member';
  const family = bubbleName || 'FamilyBubble';
  let text = `${name} updated status`;
  if (memo?.type === MEMO_TYPE.SOS) {
    text = memo.message ? `${name} sent an SOS: ${memo.message}` : `${name} sent an SOS`;
  } else if (memo?.type === MEMO_TYPE.CHECKIN) {
    text = memo.message || `${name} checked in`;
  } else if (memo?.type === MEMO_TYPE.PLACE) {
    text = memo.message || `${name} updated a place`;
  } else if (memo?.message) {
    const status = memo.status ? `${memo.status} ` : '';
    text = `${status}${name}: ${memo.message}`;
  } else if (memo?.status) {
    text = `${memo.status} ${name} updated status`;
  }
  if (memo?.voiceUrl && !memo?.message) {
    text = `${name} sent a voice memo`;
  }
  const payload = {
    title: `${name} · ${family}`,
    text,
  };
  const link = memoShareUrl(memo?.memoId, originHref);
  if (link) payload.url = link;
  return payload;
};

export const shareMemo = async (payload) => {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(payload);
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
    }
  }
  const copied = [payload?.title, payload?.text, payload?.url].filter(Boolean).join('\n');
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(copied);
    return 'copied';
  }
  throw new Error('Sharing is not available.');
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

export const memosFromMemberStatuses = (members = [], bubbleId = null) =>
  (members || [])
    .filter((member) => member && (member.status || member.statusText))
    .map((member) => new FamilyMemo({
      memoId: `status-${member.id || member.userId}`,
      bubbleId,
      userId: member.userId || null,
      nodeId: member.id || null,
      type: MEMO_TYPE.STATUS,
      status: member.status || null,
      message: member.statusText || null,
      location: member.lastKnownLocation || null,
      createdAt: member.lastUpdated || member.createdAt || null,
    }));

export const mergeAutoloadedMemos = (firestoreMemos = [], memberMemos = []) => {
  if (Array.isArray(firestoreMemos) && firestoreMemos.length > 0) {
    return firestoreMemos;
  }
  return Array.isArray(memberMemos) ? memberMemos : [];
};

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
  photoUrls = null,
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
  const photos = [];
  const addPhoto = (url) => {
    if (typeof url === 'string' && url && !photos.includes(url)) photos.push(url);
  };
  addPhoto(photoUrl);
  if (Array.isArray(photoUrls)) photoUrls.forEach(addPhoto);
  if (photos.length) {
    payload.photoUrls = photos.slice(0, 4);
    payload.photoUrl = payload.photoUrls[0];
  }
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

export const recordMemoShare = async ({ bubbleId, memoId }) => {
  const uid = auth.currentUser?.uid;
  if (!canReactToMemo({ authUid: uid, isBubbleMember: true })) {
    throw new Error('You cannot share this memo.');
  }
  if (!bubbleId || !memoId) {
    throw new Error('Missing memo.');
  }
  const ref = doc(db, 'bubbles', bubbleId, 'memos', memoId);
  await updateDoc(ref, {
    [`shares.${uid}`]: serverTimestamp(),
  });
};

export const deleteFamilyMemo = async ({ bubbleId, memoId, userId = null }) => {
  const uid = auth.currentUser?.uid;
  if (!canDeleteMemo({
    authUid: uid,
    memoUserId: userId || uid,
    isBubbleMember: true,
  })) {
    throw new Error('You can only delete your own memos.');
  }
  if (!bubbleId || !memoId) {
    throw new Error('Missing memo.');
  }
  await deleteDoc(doc(db, 'bubbles', bubbleId, 'memos', memoId));
};

export const listenToFamilyMemos = (bubbleId, onChange) => {
  if (!bubbleId) return () => {};

  const applySnapshot = (snapshot) => {
    onChange(snapshot.docs.map((item) => FamilyMemo.fromFirestore(item)));
  };

  const col = memosCollection(bubbleId);
  const ordered = query(col, orderBy('createdAt', 'desc'), limit(MEMO_LIMIT));
  let unsubscribe = () => {};

  const attach = (target, onFail) => onSnapshot(target, applySnapshot, onFail);

  unsubscribe = attach(ordered, (error) => {
    console.warn('Family memos ordered listener failed, retrying without order:', error?.code || error.message);
    unsubscribe();
    unsubscribe = attach(col, (fallbackError) => {
      console.warn('Family memos listener failed:', fallbackError);
      onChange([]);
    });
  });

  return () => unsubscribe();
};
