export const BUBBLE_SWIPE_THRESHOLD_PX = 48;
export const MAX_USER_BUBBLES = 2;

export const BUBBLE_HALO_PALETTE = [
  {
    ring: 'rgba(139, 92, 246, 0.7)',
    glow: 'rgba(59, 130, 246, 0.45)',
    accent: '#8b5cf6',
  },
  {
    ring: 'rgba(236, 72, 153, 0.75)',
    glow: 'rgba(251, 146, 60, 0.4)',
    accent: '#ec4899',
  },
];

export function canCreateAnotherBubble(count) {
  return Number(count) < MAX_USER_BUBBLES;
}

export function haloForBubbleIndex(index) {
  const palette = BUBBLE_HALO_PALETTE[Number(index) % BUBBLE_HALO_PALETTE.length];
  return palette || BUBBLE_HALO_PALETTE[0];
}

export function membersToCopy({ sourceMembers = [], targetMembers = [], currentUserId } = {}) {
  const alreadyIn = new Set(
    (targetMembers || []).map((member) => member?.userId).filter(Boolean)
  );
  return (sourceMembers || []).filter((member) => {
    const id = member?.userId;
    if (!id || id === currentUserId) return false;
    return !alreadyIn.has(id);
  });
}

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

export const MINI_CLUSTER_MAX_WIDTH = 40;
export const MINI_PHOTO_MAX = 16;
export const MINI_PHOTO_MIN = 7;

export function miniMemberPhotos(members = []) {
  const seen = new Set();
  const list = [];
  (members || []).forEach((member) => {
    const id = member?.userId || member?.id || member?.nodeId;
    if (!id || seen.has(id)) return;
    seen.add(id);
    list.push({
      id,
      name: String(member?.name || '').trim() || 'Family member',
      photoUrl: member?.photoUrl || member?.photoURL || null,
    });
  });
  return list;
}

export function miniClusterLayout(count) {
  const n = Math.max(1, Number(count) || 1);
  if (n === 1) {
    return { size: MINI_PHOTO_MAX, overlap: 0 };
  }

  for (let size = MINI_PHOTO_MAX; size >= MINI_PHOTO_MIN; size -= 1) {
    const minVisible = 2;
    const minOverlap = Math.round(size * 0.32);
    const maxOverlap = size - minVisible;
    const neededOverlap = size - (MINI_CLUSTER_MAX_WIDTH - size) / (n - 1);
    const overlap = Math.min(maxOverlap, Math.max(minOverlap, neededOverlap));
    const width = size + (n - 1) * (size - overlap);
    if (width <= MINI_CLUSTER_MAX_WIDTH + 0.5) {
      return { size, overlap };
    }
  }

  const size = MINI_PHOTO_MIN;
  const step = Math.max(1, (MINI_CLUSTER_MAX_WIDTH - size) / (n - 1));
  return { size, overlap: Math.min(size - 1, size - step) };
}

export function miniPhotoSize(count) {
  return miniClusterLayout(count).size;
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
      members: miniMemberPhotos(entry?.allMembers || entry?.members),
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

export function peekSwitcherTarget(bubbles, currentId, direction) {
  if (!Array.isArray(bubbles) || bubbles.length === 0) {
    return Number(direction) > 0 ? { kind: 'create' } : null;
  }
  const delta = Number(direction);
  if (!delta) return null;
  const from = bubbleIndex(bubbles, currentId);
  const next = from + delta;
  if (next >= bubbles.length && delta > 0) return { kind: 'create' };
  if (next < 0 || next >= bubbles.length) return null;
  return { kind: 'bubble', id: bubbles[next].id };
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

export function clearPersistedBubble() {
  try {
    localStorage.removeItem(STORED_BUBBLE_ID_KEY);
  } catch (error) {
    // ignore
  }
}
