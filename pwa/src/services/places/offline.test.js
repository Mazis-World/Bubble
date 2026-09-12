import {
  clearPendingPlaceEvents,
  enqueuePendingPlaceEvent,
  peekPendingPlaceEvents,
  removePendingPlaceEvent,
} from './offline';
import { PENDING_PLACE_EVENTS_KEY } from './constants';

describe('offline place event queue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('queues an event and dedupes by idempotency key', () => {
    enqueuePendingPlaceEvent({ idempotencyKey: 'a', eventType: 'ARRIVED' });
    enqueuePendingPlaceEvent({ idempotencyKey: 'a', eventType: 'ARRIVED' });
    expect(peekPendingPlaceEvents()).toHaveLength(1);
  });

  test('preserves the original timestamp for later sync', () => {
    enqueuePendingPlaceEvent({ idempotencyKey: 'b', timestamp: 123, eventType: 'LEFT' });
    expect(peekPendingPlaceEvents()[0].timestamp).toBe(123);
    expect(JSON.parse(localStorage.getItem(PENDING_PLACE_EVENTS_KEY))[0].timestamp).toBe(123);
  });

  test('removes events after a successful sync', () => {
    enqueuePendingPlaceEvent({ idempotencyKey: 'c' });
    removePendingPlaceEvent('c');
    expect(peekPendingPlaceEvents()).toHaveLength(0);
    clearPendingPlaceEvents();
  });
});
