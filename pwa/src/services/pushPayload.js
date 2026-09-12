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
  if (data.placeId && data.bubbleId) {
    return `/?place=${encodeURIComponent(data.placeId)}&bubble=${encodeURIComponent(data.bubbleId)}`;
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
  const isCheckin = memo?.type === 'checkin';
  const isPlace = memo?.type === 'place';
  const isArrival = isPlace && memo?.placeEventType === 'ARRIVED';
  const title = isArrival && memo?.message
    ? memo.message
    : 'FamilyBubble';
  const body = isArrival
    ? "They're okay."
    : memo?.message
      || (isCheckin
        ? 'A family member checked in'
        : isPlace
          ? 'A family member updated a Place'
          : 'A family member updated their status');
  const placeId = memo?.placeId || '';
  const notifyType = isPlace
    ? placeNotifyType(memo?.placeEventType)
    : isCheckin
      ? 'checkin'
      : 'status';
  const url = isPlace && placeId
    ? `/?place=${encodeURIComponent(placeId)}&bubble=${encodeURIComponent(bubbleId)}`
    : '/';
  const tag = isPlace
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
      placeId: String(placeId),
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
