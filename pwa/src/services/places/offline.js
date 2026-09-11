import { PENDING_PLACE_EVENTS_KEY } from './constants';

const readQueue = (storage = globalThis.localStorage) => {
  try {
    const raw = storage?.getItem?.(PENDING_PLACE_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
};

const writeQueue = (queue, storage = globalThis.localStorage) => {
  try {
    storage?.setItem?.(PENDING_PLACE_EVENTS_KEY, JSON.stringify(queue));
  } catch (error) {
    // Quota / private mode — events stay in memory only.
  }
};

export const enqueuePendingPlaceEvent = (event, storage = globalThis.localStorage) => {
  const queue = readQueue(storage);
  const key = event?.idempotencyKey;
  if (key && queue.some((item) => item.idempotencyKey === key)) {
    return queue;
  }
  queue.push({ ...event, queuedAt: Date.now() });
  writeQueue(queue, storage);
  return queue;
};

export const peekPendingPlaceEvents = (storage = globalThis.localStorage) => readQueue(storage);

export const removePendingPlaceEvent = (idempotencyKey, storage = globalThis.localStorage) => {
  const next = readQueue(storage).filter((item) => item.idempotencyKey !== idempotencyKey);
  writeQueue(next, storage);
  return next;
};

export const clearPendingPlaceEvents = (storage = globalThis.localStorage) => {
  writeQueue([], storage);
};
