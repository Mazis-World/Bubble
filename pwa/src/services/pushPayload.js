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
  return '/';
};

export const buildMemoPush = (memo, bubbleId) => {
  const isSos = memo?.type === 'sos';
  const isCheckin = memo?.type === 'checkin';
  const title = isSos ? '🚨 SOS ALERT' : 'FamilyBubble';
  const body = memo?.message
    || (isSos ? 'A family member needs help' : isCheckin ? 'A family member checked in' : 'A family member updated their status');
  const sosId = memo?.sosId || '';
  const url = isSos && sosId
    ? `/?sos=${encodeURIComponent(sosId)}&bubble=${encodeURIComponent(bubbleId)}`
    : '/';
  const tag = isSos
    ? `sos-${sosId || 'alert'}`
    : isCheckin
      ? `checkin-${memo?.userId || 'update'}`
      : `status-${memo?.userId || 'update'}`;
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
