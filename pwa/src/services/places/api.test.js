import { buildPlacePayload, everyoneAtHome, shouldNotifyForEvent } from './api';
import { EVENT_TYPE, PLACE_LIMIT_MESSAGE, MAX_PLACES_PER_USER } from './constants';
import { canCreatePlace } from './authz';

jest.mock('../../firebase', () => ({
  auth: { currentUser: { uid: 'mom' } },
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(() => ({ id: 'place-1' })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => 'ts'),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  where: jest.fn(),
}));

jest.mock('../memos', () => ({
  MEMO_TYPE: { PLACE: 'place' },
  createFamilyMemo: jest.fn(),
}));

describe('Places API helpers', () => {
  const members = ['mom', 'dad', 'emma'];

  test('builds a place document without raw extra fields', () => {
    const payload = buildPlacePayload({
      ownerId: 'mom',
      bubbleId: 'b1',
      name: 'Home',
      type: 'home',
      address: '123 Main Street',
      latitude: 37.77,
      longitude: -122.41,
      radiusMeters: 200,
      recipientUserIds: ['dad', 'stranger'],
      memberIds: members,
    });
    expect(payload.ownerId).toBe('mom');
    expect(payload.familyBubbleId).toBe('b1');
    expect(payload.recipientUserIds).toEqual(['dad']);
    expect(payload.arrivalNotificationsEnabled).toBe(true);
  });

  test('rejects a fourth place before writing', () => {
    expect(canCreatePlace({
      authUid: 'mom',
      ownerId: 'mom',
      memberIds: members,
      ownedCount: MAX_PLACES_PER_USER,
    })).toBe(false);
    expect(PLACE_LIMIT_MESSAGE).toMatch(/3 Places/);
  });

  test('honors arrival and departure toggles', () => {
    const place = {
      isActive: true,
      arrivalNotificationsEnabled: true,
      departureNotificationsEnabled: false,
    };
    expect(shouldNotifyForEvent(place, EVENT_TYPE.ARRIVED)).toBe(true);
    expect(shouldNotifyForEvent(place, EVENT_TYPE.LEFT)).toBe(false);
    expect(shouldNotifyForEvent(place, EVENT_TYPE.CHECKED_IN)).toBe(true);
  });

  test('prepares family-level Home intelligence without sending it yet', () => {
    const home = { placeId: 'home', type: 'home' };
    expect(everyoneAtHome({
      place: home,
      presence: [
        { placeId: 'home', userId: 'mom', inside: true },
        { placeId: 'home', userId: 'dad', inside: true },
      ],
      memberIds: ['mom', 'dad'],
    })).toBe(true);
    expect(everyoneAtHome({
      place: home,
      presence: [{ placeId: 'home', userId: 'mom', inside: true }],
      memberIds: ['mom', 'dad'],
    })).toBe(false);
  });
});
