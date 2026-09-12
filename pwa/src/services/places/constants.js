export const MAX_PLACES_PER_USER = 3;
export const DEFAULT_RADIUS_METERS = 200;
export const MIN_RADIUS_METERS = 75;
export const MAX_RADIUS_METERS = 500;
export const HYSTERESIS_METERS = 40;
export const MIN_DWELL_MS = 45 * 1000;
export const MIN_OPPOSITE_INTERVAL_MS = 2 * 60 * 1000;
export const IDEMPOTENCY_BUCKET_MS = 60 * 1000;
export const NEARBY_WARN_METERS = 120;
export const MAX_ACCURACY_METERS = 150;

export const PLACE_LIMIT_MESSAGE =
  'You can save 3 Places. Delete one to add somewhere new — like Home, School, or Work.';

export const PLACE_TYPE = {
  HOME: 'home',
  SCHOOL: 'school',
  WORK: 'work',
  FAMILY: 'family',
  CUSTOM: 'custom',
};

export const PLACE_PRESETS = [
  { type: PLACE_TYPE.HOME, name: 'Home', icon: '🏠', color: '#60a5fa' },
  { type: PLACE_TYPE.SCHOOL, name: 'School', icon: '🏫', color: '#34d399' },
  { type: PLACE_TYPE.WORK, name: 'Work', icon: '💼', color: '#a78bfa' },
  { type: PLACE_TYPE.FAMILY, name: 'Family', icon: '👵', color: '#f472b6' },
  { type: PLACE_TYPE.CUSTOM, name: 'Custom', icon: '📍', color: '#818cf8' },
];

export const EVENT_TYPE = {
  ARRIVED: 'ARRIVED',
  LEFT: 'LEFT',
  CHECKED_IN: 'CHECKED_IN',
  UPDATED: 'UPDATED',
};

export const EVENT_SOURCE = {
  GEOFENCE: 'GEOFENCE',
  MANUAL: 'MANUAL',
};

export const PLACE_NOTIFY_TYPE = {
  ARRIVAL: 'PLACE_ARRIVAL',
  DEPARTURE: 'PLACE_DEPARTURE',
  CHECKIN: 'PLACE_CHECKIN',
  UPDATED: 'PLACE_UPDATED',
};

export const OWNED_PLACE_IDS_FIELD = 'ownedPlaceIds';
export const PENDING_PLACE_EVENTS_KEY = 'familyBubble_pendingPlaceEvents';
export const PLACE_GEOFENCE_STATE_KEY = 'familyBubble_placeGeofenceState';
export const PLACE_PERMISSION_PROMPTED_KEY = 'familyBubble_placePermissionPrompted';
export const PLACE_WATCH_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 60 * 1000,
  timeout: 20 * 1000,
};

export const presetForType = (type) =>
  PLACE_PRESETS.find((item) => item.type === type) || PLACE_PRESETS[PLACE_PRESETS.length - 1];
