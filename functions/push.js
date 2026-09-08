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

const buildMemoPush = (memo, bubbleId) => {
  const isSos = memo && memo.type === 'sos';
  const isCheckin = memo && memo.type === 'checkin';
  const title = isSos ? '🚨 SOS ALERT' : 'FamilyBubble';
  const body = (memo && memo.message)
    || (isSos ? 'A family member needs help' : isCheckin ? 'A family member checked in' : 'A family member updated their status');
  const sosId = (memo && memo.sosId) || '';
  const url = isSos && sosId
    ? `/?sos=${encodeURIComponent(sosId)}&bubble=${encodeURIComponent(bubbleId)}`
    : '/';
  const tag = isSos
    ? `sos-${sosId || 'alert'}`
    : isCheckin
      ? `checkin-${(memo && memo.userId) || 'update'}`
      : `status-${(memo && memo.userId) || 'update'}`;
  return {
    title,
    body,
    data: {
      title,
      body,
      type: isSos ? 'sos' : isCheckin ? 'checkin' : 'status',
      bubbleId: String(bubbleId || ''),
      sosId: String(sosId),
      url,
      tag,
    },
  };
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
  isInvalidTokenError,
};
