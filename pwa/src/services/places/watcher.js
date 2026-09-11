import { Capacitor } from '@capacitor/core';
import {
  PLACE_GEOFENCE_STATE_KEY,
  PLACE_WATCH_OPTIONS,
} from './constants';
import { evaluateAllPlaces } from './geofence';
import { enqueuePendingPlaceEvent } from './offline';
import { ensurePlaceLocationPermission } from './permissions';
import { flushPendingPlaceEvents, recordPlaceEvent } from './api';

const browserStorage = () => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch (error) {
    return null;
  }
};

const readPersistedState = (storage = browserStorage()) => {
  try {
    const raw = storage?.getItem?.(PLACE_GEOFENCE_STATE_KEY);
    return raw ? JSON.parse(raw) : { states: {}, registeredPlaceIds: [] };
  } catch (error) {
    return { states: {}, registeredPlaceIds: [] };
  }
};

const writePersistedState = (value, storage = browserStorage()) => {
  try {
    storage?.setItem?.(PLACE_GEOFENCE_STATE_KEY, JSON.stringify(value));
  } catch (error) {
    // ignore quota
  }
};

export const restoreRegisteredPlaceIds = (storage = browserStorage()) =>
  readPersistedState(storage).registeredPlaceIds || [];

const persistRuntime = (runtime, storage = browserStorage()) => {
  writePersistedState({
    states: runtime.states,
    registeredPlaceIds: (runtime.places || []).map((place) => place.placeId),
    bubbleId: runtime.bubbleId,
    userId: runtime.userId,
  }, storage);
};

const publishEvents = async (runtime, events) => {
  const placesById = Object.fromEntries((runtime.places || []).map((place) => [place.placeId, place]));
  for (const event of events) {
    const place = placesById[event.placeId];
    if (!place) continue;
    try {
      await recordPlaceEvent({
        bubbleId: runtime.bubbleId,
        place,
        userId: runtime.userId,
        nodeId: runtime.nodeId,
        displayName: runtime.displayName,
        eventType: event.eventType,
        source: event.source,
        timestamp: event.timestamp,
        idempotencyKey: event.idempotencyKey,
      });
    } catch (error) {
      enqueuePendingPlaceEvent({
        ...event,
        bubbleId: runtime.bubbleId,
        nodeId: runtime.nodeId,
        displayName: runtime.displayName,
      });
    }
  }
};

export const ingestLocationSample = async (runtime, coords, now = Date.now()) => {
  if (!runtime?.userId || !runtime.places?.length) return runtime;
  const result = evaluateAllPlaces({
    places: runtime.places,
    states: runtime.states,
    coords,
    now,
    userId: runtime.userId,
  });
  runtime.states = result.states;
  persistRuntime(runtime);
  if (result.events.length) {
    await publishEvents(runtime, result.events);
  }
  return runtime;
};

const watchViaNavigator = (onSample, onError) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    onError?.(Object.assign(new Error('GPS unavailable'), { code: 'gps_unavailable' }));
    return () => {};
  }
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onSample({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy || null,
        timestamp: position.timestamp || Date.now(),
      });
    },
    (error) => onError?.(error),
    PLACE_WATCH_OPTIONS
  );
  return () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation?.clearWatch) {
      navigator.geolocation.clearWatch(watchId);
    }
  };
};

/**
 * Battery-conscious geofence watcher.
 * Uses the platform location callback (watchPosition) instead of a polling loop.
 * Native Capacitor shells keep the same API; true OS region monitoring can
 * replace ingestLocationSample without changing event processing.
 */
export const createPlaceWatcher = () => {
  const runtime = {
    bubbleId: null,
    userId: null,
    nodeId: null,
    displayName: '',
    places: [],
    states: {},
    stopWatch: null,
    started: false,
    permission: 'prompt',
    lastCoords: null,
  };

  const handleSample = async (coords) => {
    runtime.lastCoords = coords;
    await ingestLocationSample(runtime, coords);
  };

  const startWatch = () => {
    if (runtime.stopWatch) return;
    runtime.stopWatch = watchViaNavigator(handleSample, (error) => {
      if (error?.code === 1) runtime.permission = 'denied';
    });
  };

  const stopWatch = () => {
    runtime.stopWatch?.();
    runtime.stopWatch = null;
  };

  return {
    runtime,
    isNative: () => {
      try {
        return Capacitor.isNativePlatform();
      } catch (error) {
        return false;
      }
    },
    async configure({ bubbleId, userId, nodeId, displayName, places }) {
      runtime.bubbleId = bubbleId;
      runtime.userId = userId;
      runtime.nodeId = nodeId;
      runtime.displayName = displayName;
      runtime.places = (places || []).filter((place) => place.isActive !== false);
      const persisted = readPersistedState();
      if (persisted.userId === userId && persisted.bubbleId === bubbleId) {
        runtime.states = persisted.states || {};
      }
      persistRuntime(runtime);
      const placesById = Object.fromEntries(runtime.places.map((place) => [place.placeId, place]));
      await flushPendingPlaceEvents(placesById);
      if (runtime.lastCoords) {
        await ingestLocationSample(runtime, runtime.lastCoords);
      }
    },
    async start() {
      const result = await ensurePlaceLocationPermission();
      runtime.permission = result.status;
      if (runtime.permission === 'denied' || runtime.permission === 'unavailable') {
        runtime.started = false;
        return runtime.permission;
      }
      startWatch();
      if (!runtime.started) {
        runtime.started = true;
        if (typeof document !== 'undefined') {
          document.addEventListener('visibilitychange', this._onVisibility);
        }
        if (typeof window !== 'undefined') {
          window.addEventListener('online', this._onOnline);
        }
      }
      if (result.coords) {
        await ingestLocationSample(runtime, result.coords);
      }
      return runtime.permission;
    },
    stop() {
      stopWatch();
      runtime.started = false;
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', this._onVisibility);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', this._onOnline);
      }
    },
    _onVisibility: () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible' && runtime.started && !runtime.stopWatch) {
        startWatch();
      }
    },
    _onOnline: () => {
      const placesById = Object.fromEntries((runtime.places || []).map((place) => [place.placeId, place]));
      flushPendingPlaceEvents(placesById);
    },
    ingest: handleSample,
  };
};

let singleton = null;

export const getPlaceWatcher = () => {
  if (!singleton) singleton = createPlaceWatcher();
  return singleton;
};

export const resetPlaceWatcherForTests = () => {
  singleton?.stop();
  singleton = null;
};
