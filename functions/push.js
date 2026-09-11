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

const buildMemoPush = (memo, bubbleId) => {
  const isSos = memo && memo.type === 'sos';
  const isCheckin = memo && memo.type === 'checkin';
  const isPlace = memo && memo.type === 'place';
  const title = isSos ? '🚨 SOS ALERT' : 'FamilyBubble';
  const body = (memo && memo.message)
    || (isSos
      ? 'A family member needs help'
      : isCheckin
        ? 'A family member checked in'
        : isPlace
          ? 'A family member updated a Place'
          : 'A family member updated their status');
  const sosId = (memo && memo.sosId) || '';
  const placeId = (memo && memo.placeId) || '';
  const notifyType = isSos
    ? 'sos'
    : isPlace
      ? placeNotifyType(memo && memo.placeEventType)
      : isCheckin
        ? 'checkin'
        : 'status';
  const url = isSos && sosId
    ? `/?sos=${encodeURIComponent(sosId)}&bubble=${encodeURIComponent(bubbleId)}`
    : isPlace && placeId
      ? `/?place=${encodeURIComponent(placeId)}&bubble=${encodeURIComponent(bubbleId)}`
      : '/';
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
  buildMemoPush,
  filterPlaceMemoRecipients,
  isInvalidTokenError,
};
