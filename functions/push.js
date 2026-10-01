const mergeFcmTokens = (existing, token, max = 10) => {
  if (!token) return Array.isArray(existing) ? existing.filter(Boolean) : [];
  const list = Array.isArray(existing) ? existing.filter(Boolean) : [];
  return [token, ...list.filter((item) => item !== token)].slice(0, max);
};

const recipientUserIdsFromNodes = (nodes, exceptUserId) => {
  const ids = new Set();
  (nodes || []).forEach((node) => {
    const uid = node.userId;
    if (uid && uid !== exceptUserId) ids.add(uid);
  });
  return [...ids];
};

const tokensFromUserData = (data) => {
  const raw = data && data.fcmTokens;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item : item && item.token))
    .filter(Boolean);
};

const placeNotifyType = (eventType) => {
  if (eventType === 'ARRIVED') return 'PLACE_ARRIVAL';
  if (eventType === 'LEFT') return 'PLACE_DEPARTURE';
  if (eventType === 'CHECKED_IN') return 'PLACE_CHECKIN';
  if (eventType === 'UPDATED') return 'PLACE_UPDATED';
  return 'PLACE_UPDATED';
};

const asMap = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

const mapKeyDelta = (before, after) => {
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

const displayNameFromNodes = (nodes, userId) => {
  const node = (nodes || []).find((item) => item && item.userId === userId);
  return (node && (node.name || node.fullName)) || 'A family member';
};

const memoClickUrl = (memo, bubbleId, memoId) => {
  const sosId = (memo && memo.sosId) || '';
  const placeId = (memo && memo.placeId) || '';
  const id = memoId || (memo && memo.memoId) || '';
  if (memo && memo.type === 'sos' && sosId) {
    return `/?sos=${encodeURIComponent(sosId)}&bubble=${encodeURIComponent(bubbleId)}`;
  }
  if (memo && memo.type === 'place' && placeId) {
    return `/?place=${encodeURIComponent(placeId)}&bubble=${encodeURIComponent(bubbleId)}`;
  }
  if (id) {
    return `/?memo=${encodeURIComponent(id)}&bubble=${encodeURIComponent(bubbleId || '')}`;
  }
  return '/';
};

const buildMemoPush = (memo, bubbleId) => {
  const isSos = memo && memo.type === 'sos';
  const isCheckin = memo && memo.type === 'checkin';
  const isPlace = memo && memo.type === 'place';
  const isArrival = isPlace && memo && memo.placeEventType === 'ARRIVED';
  const title = isSos
    ? '🚨 SOS ALERT'
    : isArrival && memo && memo.message
      ? memo.message
      : 'FamilyBubble';
  const body = isArrival
    ? "They're okay."
    : (memo && memo.message)
      || (isSos
        ? 'A family member needs help'
        : isCheckin
          ? 'A family member checked in'
          : isPlace
            ? 'A family member updated a Place'
            : 'A family member updated their status');
  const sosId = (memo && memo.sosId) || '';
  const placeId = (memo && memo.placeId) || '';
  const memoId = (memo && memo.memoId) || '';
  const notifyType = isSos
    ? 'sos'
    : isPlace
      ? placeNotifyType(memo && memo.placeEventType)
      : isCheckin
        ? 'checkin'
        : 'status';
  const url = memoClickUrl(memo, bubbleId, memoId);
  const tag = isSos
    ? `sos-${sosId || 'alert'}`
    : isPlace
      ? `place-${placeId || 'update'}-${(memo && memo.placeEventType) || 'event'}`
      : isCheckin
        ? `checkin-${(memo && memo.userId) || 'update'}`
        : `status-${(memo && memo.userId) || 'update'}`;
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
      actorUserId: String((memo && memo.userId) || ''),
      url,
      tag,
    },
  };
};

const buildMemoReactionPush = ({ bubbleId, memoId, actorUserId, actorName, emoji } = {}) => {
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

const buildMemoSharePush = ({ bubbleId, memoId, actorUserId, actorName } = {}) => {
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

const filterPlaceMemoRecipients = ({ memberUserIds, actorUserId, placeRecipientUserIds }) => {
  const members = (memberUserIds || []).filter((userId) => userId && userId !== actorUserId);
  if (!Array.isArray(placeRecipientUserIds)) return [];
  const allowed = new Set(placeRecipientUserIds);
  return members.filter((userId) => allowed.has(userId));
};

const isInvalidTokenError = (error) => {
  const code = (error && error.code) || '';
  return code === 'messaging/registration-token-not-registered'
    || code === 'messaging/invalid-registration-token'
    || code === 'messaging/invalid-argument';
};

module.exports = {
  mergeFcmTokens,
  recipientUserIdsFromNodes,
  tokensFromUserData,
  mapKeyDelta,
  displayNameFromNodes,
  buildMemoPush,
  buildMemoReactionPush,
  buildMemoSharePush,
  filterPlaceMemoRecipients,
  isInvalidTokenError,
};
