export const BUBBLE_SWIPE_THRESHOLD_PX = 48;

export function splitPersonName(fullName, firstName = '', lastName = '') {
  const first = String(firstName || '').trim();
  const last = String(lastName || '').trim();
  if (first && last) return { firstName: first, lastName: last };

  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (first) return { firstName: first, lastName: last || parts.slice(1).join(' ') };
  if (!parts.length) return { firstName: 'Family', lastName: last || 'Member' };
  return {
    firstName: parts[0],
    lastName: last || parts.slice(1).join(' '),
  };
}

export function listBubbleSummaries(bubbles = []) {
  const seen = new Set();
  const list = [];
  (bubbles || []).forEach((entry) => {
    const id = entry?.bubbleId || entry?.bubble?.id;
    if (!id || seen.has(id)) return;
    seen.add(id);
    list.push({
      id,
      name: String(entry?.bubble?.name || '').trim() || 'Family bubble',
      isOwner: Boolean(entry?.isOwner),
    });
  });
  return list;
}

export function bubbleIndex(bubbles, currentId) {
  if (!Array.isArray(bubbles) || bubbles.length === 0) return 0;
  const index = bubbles.findIndex((bubble) => bubble.id === currentId);
  return index < 0 ? 0 : index;
}

export function adjacentBubbleId(bubbles, currentId, direction) {
  if (!Array.isArray(bubbles) || bubbles.length < 2) return null;
  const delta = Number(direction);
  if (!delta) return null;
  const from = bubbleIndex(bubbles, currentId);
  const next = (from + delta + bubbles.length) % bubbles.length;
  return bubbles[next]?.id || null;
}

export function swipeDirection({
  startX,
  startY,
  endX,
  endY,
  threshold = BUBBLE_SWIPE_THRESHOLD_PX,
} = {}) {
  const dx = Number(endX) - Number(startX);
  const dy = Number(endY) - Number(startY);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  if (Math.abs(dx) < threshold) return 0;
  if (Math.abs(dx) <= Math.abs(dy) * 1.15) return 0;
  return dx < 0 ? 1 : -1;
}

export function locationPayload(location) {
  if (location == null || location.latitude == null || location.longitude == null) {
    return null;
  }
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy || null,
    address: location.address || null,
  };
}

const STORED_BUBBLE_ID_KEY = 'familyBubble_bubbleId';

export function persistCurrentBubble(bubbleId) {
  try {
    if (!bubbleId) return;
    localStorage.setItem(STORED_BUBBLE_ID_KEY, bubbleId);
  } catch (error) {
    // ignore quota / private mode
  }
}

export function readPersistedBubble() {
  try {
    return localStorage.getItem(STORED_BUBBLE_ID_KEY);
  } catch (error) {
    return null;
  }
}
