import {
  buildMemoPush,
  clickUrlFromPushData,
  mergeFcmTokens,
  recipientUserIdsFromNodes,
  tokensFromUserData,
} from './pushPayload';

describe('push payload helpers', () => {
  test('merges a new FCM token to the front and drops duplicates', () => {
    expect(mergeFcmTokens(['old', 'keep'], 'new')).toEqual(['new', 'old', 'keep']);
    expect(mergeFcmTokens(['same', 'other'], 'same')).toEqual(['same', 'other']);
  });

  test('collects other bubble members for push, skipping the sender', () => {
    expect(recipientUserIdsFromNodes([
      { userId: 'sender' },
      { userId: 'mom' },
      { userId: 'mom' },
      { name: 'no-uid' },
    ], 'sender')).toEqual(['mom']);
  });

  test('reads tokens stored as strings or objects', () => {
    expect(tokensFromUserData({ fcmTokens: ['abc', { token: 'def' }] })).toEqual(['abc', 'def']);
  });

  test('status memos do not include an SOS deep link', () => {
    const payload = buildMemoPush({
      type: 'status',
      userId: 'user-2',
      message: 'At school',
    }, 'bubble-1');
    expect(payload.data.type).toBe('status');
    expect(payload.data.url).toBe('/');
    expect(payload.data.tag).toBe('status-user-2');
  });

  test('check-in memos use a check-in tag without an SOS deep link', () => {
    const payload = buildMemoPush({
      type: 'checkin',
      userId: 'user-2',
      message: 'Checked in',
    }, 'bubble-1');
    expect(payload.data.type).toBe('checkin');
    expect(payload.body).toBe('Checked in');
    expect(payload.data.url).toBe('/');
    expect(payload.data.tag).toBe('checkin-user-2');
  });

  test('place memos use a Place notification type without coordinates', () => {
    const payload = buildMemoPush({
      type: 'place',
      userId: 'user-2',
      placeId: 'home',
      placeEventType: 'ARRIVED',
      message: '🏠 Dad arrived home',
    }, 'bubble-1');
    expect(payload.data.type).toBe('PLACE_ARRIVAL');
    expect(payload.title).toBe('🏠 Dad arrived home');
    expect(payload.body).toBe("They're okay.");
    expect(payload.data.url).toBe('/?place=home&bubble=bubble-1');
    expect(JSON.stringify(payload)).not.toMatch(/latitude|longitude/);
  });

  test('SOS memos deep-link to the alert', () => {
    const payload = buildMemoPush({
      type: 'sos',
      userId: 'user-2',
      sosId: 'sos-9',
      message: 'SOS – I need help',
    }, 'bubble-1');
    expect(payload.data.url).toBe('/?sos=sos-9&bubble=bubble-1');
    expect(clickUrlFromPushData(payload.data)).toBe('/?sos=sos-9&bubble=bubble-1');
  });
});
