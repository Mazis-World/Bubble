/**
 * Shared push payload helpers used by the PWA and mirrored in Cloud Functions.
 * FCM data values must be strings.
 */

export const mergeFcmTokens = (existing, token, max = 10) => {
  if (!token) return Array.isArray(existing) ? existing.filter(Boolean) : [];
  const list = Array.isArray(existing) ? existing.filter(Boolean) : [];
  return [token, ...list.filter((item) => item !== token)].slice(0, max);
};

export const recipientUserIdsFromNodes = (nodes, exceptUserId) => {
  const ids = new Set();
  (nodes || []).forEach((node) => {
    const uid = node?.userId;
    if (uid && uid !== exceptUserId) ids.add(uid);
  });
  return [...ids];
};

export const tokensFromUserData = (data) => {
  const raw = data?.fcmTokens;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item : item?.token))
    .filter(Boolean);
};

export const clickUrlFromPushData = (data = {}) => {
  if (data.url) return data.url;
  if (data.sosId && data.bubbleId) {
    return `/?sos=${encodeURIComponent(data.sosId)}&bubble=${encodeURIComponent(data.bubbleId)}`;
  }
  if (data.placeId && data.bubbleId) {
    return `/?place=${encodeURIComponent(data.placeId)}&bubble=${encodeURIComponent(data.bubbleId)}`;
  }
  if (data.memoId) {
    const bubble = data.bubbleId ? `&bubble=${encodeURIComponent(data.bubbleId)}` : '';
    return `/?memo=${encodeURIComponent(data.memoId)}${bubble}`;
  }
  return '/';
};

const asMap = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

export const mapKeyDelta = (before, after) => {
  const prev = asMap(before);
  const next = asMap(after);
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    if (prev[key] === next[key]) continue;
    if (next[key] == null || next[key] === '') {
      return { userId: key, value: prev[key], action: 'remove' };
    }
    return { userId: key, value: next[key], action: prev[key] ? 'change' : 'add' };
  }
  return null;
};

export const displayNameFromNodes = (nodes, userId) => {
  const node = (nodes || []).find((item) => item && item.userId === userId);
  return node?.name || node?.fullName || 'A family member';
};

const memoClickUrl = (memo, bubbleId, memoId) => {
  const sosId = memo?.sosId || '';
  const placeId = memo?.placeId || '';
  const id = memoId || memo?.memoId || '';
  if (memo?.type === 'sos' && sosId) {
    return `/?sos=${encodeURIComponent(sosId)}&bubble=${encodeURIComponent(bubbleId)}`;
  }
  if (memo?.type === 'place' && placeId) {
    return `/?place=${encodeURIComponent(placeId)}&bubble=${encodeURIComponent(bubbleId)}`;
  }
  if (id) {
    return `/?memo=${encodeURIComponent(id)}&bubble=${encodeURIComponent(bubbleId || '')}`;
  }
  return '/';
};

const placeNotifyType = (eventType) => {
  if (eventType === 'ARRIVED') return 'PLACE_ARRIVAL';
  if (eventType === 'LEFT') return 'PLACE_DEPARTURE';
  if (eventType === 'CHECKED_IN') return 'PLACE_CHECKIN';
  if (eventType === 'UPDATED') return 'PLACE_UPDATED';
  return 'PLACE_UPDATED';
};

export const buildMemoPush = (memo, bubbleId) => {
  const isSos = memo?.type === 'sos';
  const isCheckin = memo?.type === 'checkin';
  const isPlace = memo?.type === 'place';
  const isArrival = isPlace && memo?.placeEventType === 'ARRIVED';
  const title = isSos
    ? '🚨 SOS ALERT'
    : isArrival && memo?.message
      ? memo.message
      : 'FamilyBubble';
  const body = isArrival
    ? "They're okay."
    : memo?.message
      || (isSos
        ? 'A family member needs help'
        : isCheckin
          ? 'A family member checked in'
          : isPlace
            ? 'A family member updated a Place'
            : 'A family member updated their status');
  const sosId = memo?.sosId || '';
  const placeId = memo?.placeId || '';
  const memoId = memo?.memoId || '';
  const notifyType = isSos
    ? 'sos'
    : isPlace
      ? placeNotifyType(memo?.placeEventType)
      : isCheckin
        ? 'checkin'
        : 'status';
  const url = memoClickUrl(memo, bubbleId, memoId);
  const tag = isSos
    ? `sos-${sosId || 'alert'}`
    : isPlace
      ? `place-${placeId || 'update'}-${memo?.placeEventType || 'event'}`
      : isCheckin
        ? `checkin-${memo?.userId || 'update'}`
        : `status-${memo?.userId || 'update'}`;
  return {
    title,
    body,
    data: {
      title,
      body,
      type: notifyType,
      bubbleId: String(bubbleId || ''),
      sosId: String(sosId),
      placeId: String(placeId),
      memoId: String(memoId),
      actorUserId: String(memo?.userId || ''),
      url,
      tag,
    },
  };
};

export const buildMemoReactionPush = ({
  bubbleId,
  memoId,
  actorUserId,
  actorName,
  emoji,
} = {}) => {
  const name = actorName || 'A family member';
  const title = 'FamilyBubble';
  const body = `${name} reacted ${emoji || ''}`.trim();
  const url = memoId
    ? `/?memo=${encodeURIComponent(memoId)}&bubble=${encodeURIComponent(bubbleId || '')}`
    : '/';
  const tag = `memo-react-${memoId || 'update'}`;
  return {
    title,
    body,
    data: {
      title,
      body,
      type: 'memo_react',
      bubbleId: String(bubbleId || ''),
      memoId: String(memoId || ''),
      actorUserId: String(actorUserId || ''),
      url,
      tag,
    },
  };
};

export const buildMemoSharePush = ({
  bubbleId,
  memoId,
  actorUserId,
  actorName,
} = {}) => {
  const name = actorName || 'A family member';
  const title = 'FamilyBubble';
  const body = `${name} shared a memo`;
  const url = memoId
    ? `/?memo=${encodeURIComponent(memoId)}&bubble=${encodeURIComponent(bubbleId || '')}`
    : '/';
  const tag = `memo-share-${memoId || 'update'}-${actorUserId || 'member'}`;
  return {
    title,
    body,
    data: {
      title,
      body,
      type: 'memo_share',
      bubbleId: String(bubbleId || ''),
      memoId: String(memoId || ''),
      actorUserId: String(actorUserId || ''),
      url,
      tag,
    },
  };
};

export const filterPlaceMemoRecipients = ({
  memberUserIds = [],
  actorUserId,
  placeRecipientUserIds,
}) => {
  const members = (memberUserIds || []).filter((userId) => userId && userId !== actorUserId);
  if (!Array.isArray(placeRecipientUserIds)) return [];
  const allowed = new Set(placeRecipientUserIds);
  return members.filter((userId) => allowed.has(userId));
};
