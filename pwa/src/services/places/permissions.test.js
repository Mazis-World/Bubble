import {
  automaticDetectionAvailable,
  shouldPromptPlacePermission,
  describeLocationPermission,
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
});
