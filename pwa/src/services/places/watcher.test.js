import { getPlaceWatcher, ingestConfirmedLocation, ingestLocationSample, resetPlaceWatcherForTests } from './watcher';
import { resetPlacePermissionRequestForTests } from './permissions';
import { EVENT_TYPE } from './constants';

jest.mock('../../firebase', () => ({
  auth: { currentUser: { uid: 'mom' } },
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  where: jest.fn(),
}));

jest.mock('../memos', () => ({
  MEMO_TYPE: { PLACE: 'place' },
  createFamilyMemo: jest.fn(),
}));

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}));

const mockRecordPlaceEvent = jest.fn();
const mockUpsertPlacePresence = jest.fn();
jest.mock('./api', () => ({
  recordPlaceEvent: (...args) => mockRecordPlaceEvent(...args),
  upsertPlacePresence: (...args) => mockUpsertPlacePresence(...args),
  flushPendingPlaceEvents: jest.fn(() => Promise.resolve([])),
}));

describe('place watcher restart and ingest', () => {
  const originalNavigator = global.navigator;

  beforeEach(() => {
    mockRecordPlaceEvent.mockReset();
    mockUpsertPlacePresence.mockReset();
    mockRecordPlaceEvent.mockResolvedValue({ eventId: 'e1', duplicate: false });
    mockUpsertPlacePresence.mockResolvedValue(undefined);
    resetPlaceWatcherForTests();
    global.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  });

  afterEach(() => {
    resetPlaceWatcherForTests();
    resetPlacePermissionRequestForTests();
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  });

  test('asks for location when starting instead of only querying permission', async () => {
    const getCurrentPosition = jest.fn((ok) => {
      ok({ coords: { latitude: 37.77, longitude: -122.41, accuracy: 10 } });
    });
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: {
        geolocation: {
          getCurrentPosition,
          watchPosition: jest.fn(() => 1),
          clearWatch: jest.fn(),
        },
        permissions: { query: jest.fn(async () => ({ state: 'prompt' })) },
      },
    });

    const permission = await getPlaceWatcher().start();

    expect(getCurrentPosition).toHaveBeenCalled();
    expect(permission).toBe('granted');
  });

  test('restores state after restart without re-notifying while still inside', async () => {
    const runtime = {
      bubbleId: 'b1',
      userId: 'mom',
      nodeId: 'n1',
      displayName: 'Mom',
      places: [{
        placeId: 'home',
        familyBubbleId: 'b1',
        latitude: 37.77,
        longitude: -122.41,
        radiusMeters: 200,
        isActive: true,
      }],
      states: {
        home: {
          inside: true,
          lastEventType: EVENT_TYPE.ARRIVED,
          lastTransitionAt: 1,
          pendingInsideSince: 0,
          pendingOutsideSince: 0,
        },
      },
    };
    await ingestLocationSample(runtime, { latitude: 37.77, longitude: -122.41, accuracy: 10 }, 50_000);
    expect(mockRecordPlaceEvent).not.toHaveBeenCalled();
  });

  test('status or check-in GPS inside a Place records arrival immediately', async () => {
    const runtime = {
      bubbleId: 'b1',
      userId: 'mom',
      nodeId: 'n1',
      displayName: 'Mom',
      places: [{
        placeId: 'home',
        familyBubbleId: 'b1',
        latitude: 37.77,
        longitude: -122.41,
        radiusMeters: 200,
        isActive: true,
      }],
      states: {},
    };
    await ingestConfirmedLocation(runtime, { latitude: 37.77, longitude: -122.41, accuracy: 10 }, 1_000);
    expect(mockRecordPlaceEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: EVENT_TYPE.ARRIVED,
      place: expect.objectContaining({ placeId: 'home' }),
    }));
    expect(runtime.states.home.inside).toBe(true);
  });
});
