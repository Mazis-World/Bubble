import {
  buildIdempotencyKey,
  clampRadiusMeters,
  emptyGeofenceState,
  evaluateAllPlaces,
  evaluateGeofenceSample,
  findNearbyPlaces,
  haversineMeters,
  isAccurateEnough,
  overlappingWarning,
  shouldWarnOverlapping,
} from './geofence';
import { EVENT_TYPE, DEFAULT_RADIUS_METERS } from './constants';

const home = {
  placeId: 'home',
  familyBubbleId: 'b1',
  latitude: 37.7749,
  longitude: -122.4194,
  radiusMeters: 200,
  isActive: true,
};

const inside = { latitude: 37.7749, longitude: -122.4194, accuracy: 12 };
const justInside = { latitude: 37.7757, longitude: -122.4194, accuracy: 12 };
const outside = { latitude: 37.7800, longitude: -122.4194, accuracy: 12 };
const jitterEdge = { latitude: 37.7765, longitude: -122.4194, accuracy: 12 };

describe('geofence engine', () => {
  test('clamps radius to a family-friendly range', () => {
    expect(clampRadiusMeters(10)).toBe(75);
    expect(clampRadiusMeters(9000)).toBe(500);
    expect(clampRadiusMeters(DEFAULT_RADIUS_METERS)).toBe(200);
  });

  test('measures distance in meters', () => {
    const meters = haversineMeters(home, outside);
    expect(meters).toBeGreaterThan(400);
  });

  test('rejects poor GPS accuracy', () => {
    expect(isAccurateEnough({ accuracy: 400 }, 200)).toBe(false);
    expect(isAccurateEnough({ accuracy: 20 }, 200)).toBe(true);
    expect(isAccurateEnough({}, 200)).toBe(true);
  });

  test('bootstraps inside without an arrival notification', () => {
    const result = evaluateGeofenceSample({ place: home, state: emptyGeofenceState(), coords: inside, now: 1_000, minDwellMs: 0 });
    expect(result.action).toBe('bootstrap');
    expect(result.event).toBeNull();
    expect(result.state.inside).toBe(true);
  });

  test('does not emit repeated arrivals while remaining inside', () => {
    let state = emptyGeofenceState();
    state = evaluateGeofenceSample({ place: home, state, coords: inside, now: 1_000, minDwellMs: 0 }).state;
    for (let i = 0; i < 100; i += 1) {
      const result = evaluateGeofenceSample({
        place: home,
        state,
        coords: inside,
        now: 2_000 + i * 1000,
        minDwellMs: 0,
      });
      expect(result.event).toBeNull();
      state = result.state;
    }
  });

  test('emits arrival after dwelling inside from outside', () => {
    let state = evaluateGeofenceSample({ place: home, state: emptyGeofenceState(), coords: outside, now: 1_000, minDwellMs: 1_000 }).state;
    const pending = evaluateGeofenceSample({ place: home, state, coords: inside, now: 2_000, minDwellMs: 45_000 });
    expect(pending.action).toBe('pending');
    const arrived = evaluateGeofenceSample({ place: home, state: pending.state, coords: inside, now: 50_000, minDwellMs: 45_000 });
    expect(arrived.event.eventType).toBe(EVENT_TYPE.ARRIVED);
    expect(arrived.event.source).toBe('GEOFENCE');
  });

  test('emits departure after dwelling outside', () => {
    let state = evaluateGeofenceSample({ place: home, state: emptyGeofenceState(), coords: inside, now: 1_000, minDwellMs: 0 }).state;
    state = { ...state, inside: true, lastEventType: EVENT_TYPE.ARRIVED, lastTransitionAt: 1_000 };
    const pendingExit = evaluateGeofenceSample({
      place: home,
      state,
      coords: outside,
      now: 1_000 + 3 * 60 * 1000,
      minDwellMs: 1_000,
      minOppositeIntervalMs: 1_000,
    });
    const left = evaluateGeofenceSample({
      place: home,
      state: pendingExit.state,
      coords: outside,
      now: 1_000 + 3 * 60 * 1000 + 2_000,
      minDwellMs: 1_000,
      minOppositeIntervalMs: 1_000,
    });
    expect(left.event.eventType).toBe(EVENT_TYPE.LEFT);
  });

  test('duplicate callbacks in the same minute share an idempotency key', () => {
    const a = buildIdempotencyKey({ userId: 'u1', placeId: 'home', eventType: 'ARRIVED', timestamp: 60_000 });
    const b = buildIdempotencyKey({ userId: 'u1', placeId: 'home', eventType: 'ARRIVED', timestamp: 90_000 });
    expect(a).toBe(b);
  });

  test('GPS jitter around the boundary does not flip arrived/left/arrived', () => {
    let state = { ...emptyGeofenceState(), inside: true, lastEventType: EVENT_TYPE.ARRIVED, lastTransitionAt: 1_000 };
    const times = [1_500, 2_000, 2_500, 3_000, 3_500];
    const events = [];
    times.forEach((now) => {
      const result = evaluateGeofenceSample({
        place: home,
        state,
        coords: jitterEdge,
        now,
        minDwellMs: 45_000,
        minOppositeIntervalMs: 120_000,
      });
      state = result.state;
      if (result.event) events.push(result.event);
    });
    expect(events).toHaveLength(0);
  });

  test('quick enter and leave does not notify without dwell', () => {
    let state = evaluateGeofenceSample({ place: home, state: emptyGeofenceState(), coords: outside, now: 1_000, minDwellMs: 45_000 }).state;
    const enter = evaluateGeofenceSample({ place: home, state, coords: inside, now: 2_000, minDwellMs: 45_000 });
    const leave = evaluateGeofenceSample({ place: home, state: enter.state, coords: outside, now: 3_000, minDwellMs: 45_000 });
    expect(enter.event).toBeNull();
    expect(leave.event).toBeNull();
  });

  test('inactive places never fire', () => {
    const result = evaluateGeofenceSample({
      place: { ...home, isActive: false },
      state: emptyGeofenceState(),
      coords: inside,
      now: 1_000,
    });
    expect(result.reason).toBe('inactive');
  });

  test('warns when two places are very close', () => {
    const school = { placeId: 'school', latitude: 37.7750, longitude: -122.4194, radiusMeters: 200 };
    expect(shouldWarnOverlapping(school, [home])).toBe(true);
    expect(findNearbyPlaces(school, [home])).toHaveLength(1);
    expect(overlappingWarning()).toMatch(/very close/i);
  });

  test('evaluates overlapping places independently', () => {
    const school = { ...home, placeId: 'school', latitude: 37.7750, longitude: -122.4195 };
    const { events, states } = evaluateAllPlaces({
      places: [home, school],
      states: {
        home: { ...emptyGeofenceState(), inside: false, lastTransitionAt: 1 },
        school: { ...emptyGeofenceState(), inside: false, lastTransitionAt: 1 },
      },
      coords: inside,
      now: 90_000,
      userId: 'u1',
    });
    expect(states.home).toBeTruthy();
    expect(states.school).toBeTruthy();
    expect(Array.isArray(events)).toBe(true);
  });

  test('just-inside coordinates can still be inside the radius', () => {
    const distance = haversineMeters(home, justInside);
    expect(distance).toBeLessThan(200);
  });
});
