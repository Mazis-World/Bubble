import {
  automaticDetectionAvailable,
  shouldPromptPlacePermission,
  describeLocationPermission,
  ensurePlaceLocationPermission,
  resetPlacePermissionRequestForTests,
} from './permissions';

describe('Places location permission', () => {
  test('does not nag after the user already said no', () => {
    expect(shouldPromptPlacePermission({
      permission: 'denied',
      prompted: true,
      hasPlaces: true,
    })).toBe(false);
  });

  test('explains background location before the first request', () => {
    expect(shouldPromptPlacePermission({
      permission: 'prompt',
      prompted: false,
      hasPlaces: false,
    })).toBe(true);
  });

  test('manual check-in stays available when automatic detection is off', () => {
    expect(automaticDetectionAvailable('denied')).toBe(false);
    expect(automaticDetectionAvailable('granted')).toBe(true);
    expect(describeLocationPermission('denied')).toBe('denied');
  });

  describe('ensurePlaceLocationPermission', () => {
    const originalNavigator = global.navigator;

    afterEach(() => {
      resetPlacePermissionRequestForTests();
      Object.defineProperty(global, 'navigator', {
        configurable: true,
        value: originalNavigator,
      });
    });

    test('asks for location instead of only querying when status is prompt', async () => {
      const getCurrentPosition = jest.fn((ok) => {
        ok({ coords: { latitude: 37.77, longitude: -122.41, accuracy: 8 } });
      });
      Object.defineProperty(global, 'navigator', {
        configurable: true,
        value: {
          geolocation: { getCurrentPosition },
          permissions: { query: jest.fn(async () => ({ state: 'prompt' })) },
        },
      });

      const result = await ensurePlaceLocationPermission();

      expect(getCurrentPosition).toHaveBeenCalled();
      expect(result.status).toBe('granted');
      expect(result.coords.latitude).toBe(37.77);
    });

    test('does not re-request when already granted', async () => {
      const getCurrentPosition = jest.fn();
      Object.defineProperty(global, 'navigator', {
        configurable: true,
        value: {
          geolocation: { getCurrentPosition },
          permissions: { query: jest.fn(async () => ({ state: 'granted' })) },
        },
      });

      const result = await ensurePlaceLocationPermission();

      expect(getCurrentPosition).not.toHaveBeenCalled();
      expect(result.status).toBe('granted');
    });

    test('still asks when query already reports denied', async () => {
      const getCurrentPosition = jest.fn((_ok, err) => {
        err({ code: 1, message: 'denied' });
      });
      Object.defineProperty(global, 'navigator', {
        configurable: true,
        value: {
          geolocation: { getCurrentPosition },
          permissions: { query: jest.fn(async () => ({ state: 'denied' })) },
        },
      });

      const result = await ensurePlaceLocationPermission();

      expect(getCurrentPosition).toHaveBeenCalled();
      expect(result.status).toBe('denied');
    });
  });
});
