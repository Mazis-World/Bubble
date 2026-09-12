import {
  DEFAULT_RADIUS_METERS,
  EVENT_SOURCE,
  EVENT_TYPE,
  HYSTERESIS_METERS,
  IDEMPOTENCY_BUCKET_MS,
  MAX_ACCURACY_METERS,
  MAX_RADIUS_METERS,
  MIN_DWELL_MS,
  MIN_OPPOSITE_INTERVAL_MS,
  MIN_RADIUS_METERS,
  NEARBY_WARN_METERS,
} from './constants';

const EARTH_RADIUS_METERS = 6371000;

export const clampRadiusMeters = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_RADIUS_METERS;
  return Math.min(MAX_RADIUS_METERS, Math.max(MIN_RADIUS_METERS, Math.round(numeric)));
};

export const haversineMeters = (from, to) => {
  if (!from || !to || from.latitude == null || from.longitude == null || to.latitude == null || to.longitude == null) {
    return null;
  }
  const lat1 = (Number(from.latitude) * Math.PI) / 180;
  const lat2 = (Number(to.latitude) * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((Number(to.longitude) - Number(from.longitude)) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
};

export const isAccurateEnough = (coords, radiusMeters) => {
  if (!coords) return false;
  const accuracy = Number(coords.accuracy);
  if (!Number.isFinite(accuracy)) return true;
  const radius = clampRadiusMeters(radiusMeters);
  return accuracy <= Math.max(radius, MAX_ACCURACY_METERS);
};

export const placesAreVeryClose = (placeA, placeB, warnMeters = NEARBY_WARN_METERS) => {
  if (!placeA || !placeB || placeA.placeId === placeB.placeId) return false;
  const distance = haversineMeters(placeA, placeB);
  if (distance == null) return false;
  const combined = (Number(placeA.radiusMeters) || DEFAULT_RADIUS_METERS)
    + (Number(placeB.radiusMeters) || DEFAULT_RADIUS_METERS);
  return distance < warnMeters || distance < combined * 0.35;
};

export const findNearbyPlaces = (candidate, places = []) =>
  (places || []).filter((place) => placesAreVeryClose(candidate, place));

export const emptyGeofenceState = () => ({
  inside: null,
  lastTransitionAt: 0,
  lastEventType: null,
  pendingInsideSince: 0,
  pendingOutsideSince: 0,
});

export const buildIdempotencyKey = ({ userId, placeId, eventType, timestamp }) => {
  const bucket = Math.floor(Number(timestamp || Date.now()) / IDEMPOTENCY_BUCKET_MS);
  return `${userId}:${placeId}:${eventType}:${bucket}`;
};

const oppositeType = (eventType) => {
  if (eventType === EVENT_TYPE.ARRIVED) return EVENT_TYPE.LEFT;
  if (eventType === EVENT_TYPE.LEFT) return EVENT_TYPE.ARRIVED;
  return null;
};

/**
 * Evaluate one GPS sample against one Place.
 * First observation after restart only bootstraps presence — it does not notify.
 */
export const evaluateGeofenceSample = ({
  place,
  state,
  coords,
  now = Date.now(),
  minDwellMs = MIN_DWELL_MS,
  minOppositeIntervalMs = MIN_OPPOSITE_INTERVAL_MS,
  hysteresisMeters = HYSTERESIS_METERS,
} = {}) => {
  const current = state ? { ...emptyGeofenceState(), ...state } : emptyGeofenceState();
  if (!place || place.isActive === false) {
    return { action: 'ignore', reason: 'inactive', state: current, event: null };
  }
  if (!coords || coords.latitude == null || coords.longitude == null) {
    return { action: 'ignore', reason: 'no_coords', state: current, event: null };
  }
  if (!isAccurateEnough(coords, place.radiusMeters)) {
    return { action: 'ignore', reason: 'accuracy', state: current, event: null };
  }

  const distance = haversineMeters(coords, place);
  if (distance == null) {
    return { action: 'ignore', reason: 'distance', state: current, event: null };
  }

  const radius = clampRadiusMeters(place.radiusMeters);
  const insideRing = distance <= radius;
  const outsideRing = distance >= radius + hysteresisMeters;
  if (current.inside == null) {
    if (insideRing) {
      return bootstrap(current, true, now);
    }
    if (outsideRing) {
      return bootstrap(current, false, now);
    }
    return { action: 'ignore', reason: 'uncertain', state: current, event: null };
  }

  if (current.inside === true) {
    if (!outsideRing) {
      current.pendingOutsideSince = 0;
      return { action: 'stay', reason: 'inside', state: current, event: null };
    }
    if (!current.pendingOutsideSince) current.pendingOutsideSince = now;
    if (now - current.pendingOutsideSince < minDwellMs) {
      return { action: 'pending', reason: 'exit_dwell', state: current, event: null };
    }
    return emitTransition({
      current,
      place,
      eventType: EVENT_TYPE.LEFT,
      now,
      minOppositeIntervalMs,
    });
  }

  if (!insideRing) {
    current.pendingInsideSince = 0;
    return { action: 'stay', reason: 'outside', state: current, event: null };
  }
  if (!current.pendingInsideSince) current.pendingInsideSince = now;
  if (now - current.pendingInsideSince < minDwellMs) {
    return { action: 'pending', reason: 'enter_dwell', state: current, event: null };
  }
  return emitTransition({
    current,
    place,
    eventType: EVENT_TYPE.ARRIVED,
    now,
    minOppositeIntervalMs,
  });
};

const bootstrap = (current, inside, now) => {
  current.inside = inside;
  current.pendingInsideSince = 0;
  current.pendingOutsideSince = 0;
  current.lastTransitionAt = now;
  return { action: 'bootstrap', reason: inside ? 'inside' : 'outside', state: current, event: null };
};

const emitTransition = ({ current, place, eventType, now, minOppositeIntervalMs }) => {
  const lastWasOpposite = current.lastEventType === oppositeType(eventType);
  if (lastWasOpposite && current.lastTransitionAt && now - current.lastTransitionAt < minOppositeIntervalMs) {
    return { action: 'ignore', reason: 'jitter', state: current, event: null };
  }
  if (current.lastEventType === eventType && current.lastTransitionAt && now - current.lastTransitionAt < minOppositeIntervalMs) {
    return { action: 'ignore', reason: 'duplicate', state: current, event: null };
  }

  current.inside = eventType === EVENT_TYPE.ARRIVED;
  current.lastEventType = eventType;
  current.lastTransitionAt = now;
  current.pendingInsideSince = 0;
  current.pendingOutsideSince = 0;

  return {
    action: 'transition',
    reason: eventType === EVENT_TYPE.ARRIVED ? 'arrival' : 'departure',
    state: current,
    event: {
      eventType,
      source: EVENT_SOURCE.GEOFENCE,
      placeId: place.placeId,
      timestamp: now,
    },
  };
};

export const evaluateAllPlaces = ({ places, states, coords, now, userId }) => {
  const nextStates = { ...(states || {}) };
  const events = [];
  (places || []).forEach((place) => {
    if (!place?.placeId || place.isActive === false) return;
    const result = evaluateGeofenceSample({
      place,
      state: nextStates[place.placeId],
      coords,
      now,
    });
    nextStates[place.placeId] = result.state;
    if (result.event) {
      events.push({
        ...result.event,
        userId,
        familyBubbleId: place.familyBubbleId,
        idempotencyKey: buildIdempotencyKey({
          userId,
          placeId: place.placeId,
          eventType: result.event.eventType,
          timestamp: result.event.timestamp,
        }),
      });
    }
  });
  return { states: nextStates, events };
};

/**
 * Status / check-in GPS is an explicit "I am here" — skip dwell and mark
 * presence as soon as the point is inside a Place radius.
 */
export const evaluateConfirmedSample = ({
  place,
  state,
  coords,
  now = Date.now(),
  hysteresisMeters = HYSTERESIS_METERS,
} = {}) => {
  const current = state ? { ...emptyGeofenceState(), ...state } : emptyGeofenceState();
  if (!place || place.isActive === false) {
    return { action: 'ignore', reason: 'inactive', state: current, event: null };
  }
  if (!coords || coords.latitude == null || coords.longitude == null) {
    return { action: 'ignore', reason: 'no_coords', state: current, event: null };
  }

  const distance = haversineMeters(coords, place);
  if (distance == null) {
    return { action: 'ignore', reason: 'distance', state: current, event: null };
  }

  const radius = clampRadiusMeters(place.radiusMeters);
  const insideRing = distance <= radius;
  const outsideRing = distance >= radius + hysteresisMeters;

  if (insideRing) {
    const alreadyThere = current.inside === true && current.lastEventType === EVENT_TYPE.ARRIVED;
    current.inside = true;
    current.pendingInsideSince = 0;
    current.pendingOutsideSince = 0;
    if (alreadyThere) {
      return { action: 'stay', reason: 'inside', state: current, event: null, markInside: true };
    }
    current.lastEventType = EVENT_TYPE.ARRIVED;
    current.lastTransitionAt = now;
    return {
      action: 'transition',
      reason: 'confirmed_arrival',
      state: current,
      event: {
        eventType: EVENT_TYPE.ARRIVED,
        source: EVENT_SOURCE.MANUAL,
        placeId: place.placeId,
        timestamp: now,
      },
      markInside: true,
    };
  }

  if (outsideRing && current.inside === true) {
    current.inside = false;
    current.lastEventType = EVENT_TYPE.LEFT;
    current.lastTransitionAt = now;
    current.pendingInsideSince = 0;
    current.pendingOutsideSince = 0;
    return {
      action: 'transition',
      reason: 'confirmed_departure',
      state: current,
      event: {
        eventType: EVENT_TYPE.LEFT,
        source: EVENT_SOURCE.MANUAL,
        placeId: place.placeId,
        timestamp: now,
      },
      markInside: false,
    };
  }

  if (outsideRing) {
    current.inside = false;
    current.pendingInsideSince = 0;
    current.pendingOutsideSince = 0;
    return { action: 'stay', reason: 'outside', state: current, event: null, markInside: false };
  }

  return { action: 'ignore', reason: 'uncertain', state: current, event: null };
};

export const evaluateConfirmedLocation = ({ places, states, coords, now, userId }) => {
  const nextStates = { ...(states || {}) };
  const events = [];
  const presence = [];
  (places || []).forEach((place) => {
    if (!place?.placeId || place.isActive === false) return;
    const result = evaluateConfirmedSample({
      place,
      state: nextStates[place.placeId],
      coords,
      now,
    });
    nextStates[place.placeId] = result.state;
    if (result.markInside === true) {
      presence.push({ placeId: place.placeId, inside: true });
    } else if (result.markInside === false) {
      presence.push({ placeId: place.placeId, inside: false });
    }
    if (result.event) {
      events.push({
        ...result.event,
        userId,
        familyBubbleId: place.familyBubbleId,
        idempotencyKey: buildIdempotencyKey({
          userId,
          placeId: place.placeId,
          eventType: result.event.eventType,
          timestamp: result.event.timestamp,
        }),
      });
    }
  });
  return { states: nextStates, events, presence };
};

export const shouldWarnOverlapping = (candidate, existingPlaces) =>
  findNearbyPlaces(candidate, existingPlaces).length > 0;

export const overlappingWarning = () =>
  'These Places are very close together. This may make automatic arrival detection less reliable.';
