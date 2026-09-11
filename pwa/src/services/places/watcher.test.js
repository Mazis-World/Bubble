import { ingestLocationSample, resetPlaceWatcherForTests } from './watcher';
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
jest.mock('./api', () => ({
  recordPlaceEvent: (...args) => mockRecordPlaceEvent(...args),
  flushPendingPlaceEvents: jest.fn(() => Promise.resolve([])),
}));

describe('place watcher restart and ingest', () => {
  beforeEach(() => {
    mockRecordPlaceEvent.mockReset();
    resetPlaceWatcherForTests();
    global.localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
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
});
