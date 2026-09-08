import SosEvent from '../models/SosEvent';
import {
  SOS_STATUS,
  SOS_HOLD_MS,
  SOS_CONFIRM_SECONDS,
  SOS_LOCATION_INTERVAL_MS,
  PENDING_SOS_KEY,
  activateSos,
  acknowledgeSos,
  resolveSos,
  cancelSos,
  canAcknowledgeSos,
  canCancelSos,
  canCreateSos,
  canResolveSos,
  canUpdateSosLocation,
  canViewSos,
  classifyLocationFreshness,
  clearPendingSos,
  enqueuePendingSos,
  peekPendingSos,
  parseSosDeepLink,
  buildSosDeepLink,
  buildSosNotification,
  describePermissionState,
  getCurrentPosition,
  shouldNotifySosRecipient,
  shouldWatchLocationForSos,
  startSosLocationWatch,
  osmEmbedUrl,
} from './sos';

jest.mock('../firebase', () => ({
  auth: { currentUser: { uid: 'user-1' } },
  db: {},
}));

jest.mock('./bubble', () => ({
  API: {
    updateStatus: jest.fn().mockResolvedValue(undefined),
    updateLocation: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('./memos', () => ({
  MEMO_TYPE: { STATUS: 'status', SOS: 'sos' },
  createFamilyMemo: jest.fn(() => Promise.resolve('memo-1')),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'sos-collection'),
  doc: jest.fn((...segments) => ({ path: segments.filter(Boolean).join('/'), id: segments[segments.length - 1] })),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  query: jest.fn(() => 'query'),
  where: jest.fn(() => 'where'),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
  onSnapshot: jest.fn(),
}));

const { auth } = require('../firebase');
const { addDoc, getDoc, getDocs, updateDoc } = require('firebase/firestore');
const { API } = require('./bubble');

const mockFirestoreState = {
  createdDoc: null,
  existingSosSnap: { empty: true, docs: [] },
};

const memberSnap = { exists: () => true, data: () => ({ bubbles: ['bubble-1'] }) };

beforeEach(() => {
  mockFirestoreState.createdDoc = null;
  mockFirestoreState.existingSosSnap = { empty: true, docs: [] };
  auth.currentUser = { uid: 'user-1' };
  getDoc.mockImplementation(async (ref) => {
    const path = String(ref?.path || ref?.id || '');
    if (auth.currentUser?.uid === 'outsider') {
      return { exists: () => true, data: () => ({ bubbles: ['other-bubble'] }) };
    }
    if (path.includes('sosEvents') || path.includes('sos-')) {
      return mockFirestoreState.createdDoc || { exists: () => false, data: () => ({}) };
    }
    return memberSnap;
  });
  getDocs.mockImplementation(async () => mockFirestoreState.existingSosSnap);
  addDoc.mockImplementation(async (_col, data) => {
    mockFirestoreState.createdDoc = {
      id: 'sos-new',
      exists: () => true,
      data: () => ({ ...data, delivered: true }),
      ref: { id: 'sos-new' },
    };
    return { id: 'sos-new' };
  });
  updateDoc.mockResolvedValue(undefined);
  API.updateStatus.mockImplementation(() => Promise.resolve());
  API.updateLocation.mockImplementation(() => Promise.resolve());
});

const activeSos = (overrides = {}) =>
  new SosEvent({
    sosId: 'sos-1',
    bubbleId: 'bubble-1',
    userId: 'user-1',
    nodeId: 'node-1',
    status: SOS_STATUS.ACTIVE,
    createdAt: new Date(),
    delivered: true,
    ...overrides,
  });

describe('SOS authorization', () => {
  test('activation requires the signed-in member', () => {
    expect(canCreateSos({ authUid: 'user-1', userId: 'user-1', isBubbleMember: true }).ok).toBe(true);
    expect(canCreateSos({ authUid: 'user-1', userId: 'user-2', isBubbleMember: true }).reason).toBe('unauthorized');
    expect(canCreateSos({ authUid: 'user-1', userId: 'user-1', isBubbleMember: false }).reason).toBe('not_a_member');
  });

  test('duplicate SOS activation is rejected', () => {
    const existing = activeSos();
    expect(canCreateSos({
      authUid: 'user-1',
      userId: 'user-1',
      isBubbleMember: true,
      existingActive: existing,
    })).toMatchObject({ ok: false, reason: 'duplicate' });
  });

  test('bubble members can view SOS, outsiders cannot', () => {
    expect(canViewSos({ isBubbleMember: true })).toBe(true);
    expect(canViewSos({ isBubbleMember: false })).toBe(false);
  });

  test('other members can acknowledge; the activator cannot', () => {
    const sos = activeSos();
    expect(canAcknowledgeSos({ authUid: 'user-2', sos, isBubbleMember: true })).toBe(true);
    expect(canAcknowledgeSos({ authUid: 'user-1', sos, isBubbleMember: true })).toBe(false);
    expect(canAcknowledgeSos({ authUid: 'outsider', sos, isBubbleMember: false })).toBe(false);
  });

  test('only the activator can resolve or cancel an open SOS', () => {
    const sos = activeSos();
    expect(canResolveSos({ authUid: 'user-1', sos })).toBe(true);
    expect(canResolveSos({ authUid: 'user-2', sos })).toBe(false);
    expect(canCancelSos({ authUid: 'user-1', sos })).toBe(true);
    expect(canCancelSos({ authUid: 'user-2', sos })).toBe(false);
  });

  test('location updates are limited to the activator while SOS is open', () => {
    const sos = activeSos();
    expect(canUpdateSosLocation({ authUid: 'user-1', sos })).toBe(true);
    expect(canUpdateSosLocation({ authUid: 'user-2', sos })).toBe(false);
    expect(canUpdateSosLocation({ authUid: 'user-1', sos: { ...sos, status: SOS_STATUS.RESOLVED } })).toBe(false);
  });
});

describe('SOS deep links and notifications', () => {
  test('parses and builds SOS deep links', () => {
    expect(parseSosDeepLink('?sos=sos-1&bubble=bubble-1')).toEqual({ sosId: 'sos-1', bubbleId: 'bubble-1' });
    expect(parseSosDeepLink('https://www.familybubble.online/?sos=sos-1&bubble=bubble-1')).toEqual({
      sosId: 'sos-1',
      bubbleId: 'bubble-1',
    });
    expect(parseSosDeepLink('?join=ABC')).toBeNull();
    expect(buildSosDeepLink('https://www.familybubble.online', 'sos-1', 'bubble-1')).toBe(
      'https://www.familybubble.online/?sos=sos-1&bubble=bubble-1'
    );
  });

  test('does not notify the person who activated SOS', () => {
    expect(shouldNotifySosRecipient({ viewerUid: 'user-1', sosUserId: 'user-1' })).toBe(false);
    expect(shouldNotifySosRecipient({ viewerUid: 'user-2', sosUserId: 'user-1' })).toBe(true);
  });

  test('push copy matches the SOS alert spec', () => {
    expect(buildSosNotification('Alex')).toEqual({
      title: '🚨 SOS ALERT',
      body: 'Alex has activated an SOS alert.\n\nTap to view their location.',
    });
  });
});

describe('SOS location freshness and GPS', () => {
  test('classifies live, recent, stale, and unavailable locations', () => {
    const now = 1_700_000_000_000;
    expect(classifyLocationFreshness({ toMillis: () => now - 1000 }, now)).toBe('live');
    expect(classifyLocationFreshness({ toMillis: () => now - 2 * 60 * 1000 }, now)).toBe('recent');
    expect(classifyLocationFreshness({ toMillis: () => now - 10 * 60 * 1000 }, now)).toBe('stale');
    expect(classifyLocationFreshness(null, now)).toBe('unavailable');
  });

  test('GPS unavailable rejects getCurrentPosition', async () => {
    const original = navigator.geolocation;
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    await expect(getCurrentPosition()).rejects.toMatchObject({ code: 'gps_unavailable' });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: original });
  });

  test('location permission denied is mapped', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_ok, err) => err({ code: 1, message: 'denied' }),
      },
    });
    await expect(getCurrentPosition()).rejects.toMatchObject({ code: 'permission_denied' });
  });

  test('watchPosition is battery-conscious and cleaned up', () => {
    const clearWatch = jest.fn();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: jest.fn(() => 42),
        clearWatch,
      },
    });
    const stop = startSosLocationWatch({ bubbleId: 'bubble-1', sosId: 'sos-1', nodeId: 'node-1' });
    expect(navigator.geolocation.watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({ maximumAge: SOS_LOCATION_INTERVAL_MS })
    );
    stop();
    expect(clearWatch).toHaveBeenCalledWith(42);
    expect(shouldWatchLocationForSos({ authUid: 'user-1', sos: activeSos() })).toBe(true);
    expect(shouldWatchLocationForSos({ authUid: 'user-1', sos: activeSos({ status: SOS_STATUS.RESOLVED }) })).toBe(false);
  });

  test('permission states are described', () => {
    expect(describePermissionState('granted')).toBe('granted');
    expect(describePermissionState('denied')).toBe('denied');
    expect(describePermissionState('prompt')).toBe('prompt');
  });

  test('OSM embed is omitted without coordinates', () => {
    expect(osmEmbedUrl(null, null)).toBeNull();
    expect(osmEmbedUrl(37.7, -122.4)).toContain('marker=37.7%2C-122.4');
  });
});

describe('offline SOS queue', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFirestoreState.createdDoc = null;
    mockFirestoreState.existingSosSnap = { empty: true, docs: [] };
    auth.currentUser = { uid: 'user-1' };
  });

  test('stores a pending SOS when the network is unavailable', async () => {
    addDoc.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'unavailable' }));
    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const result = await activateSos({
      bubbleId: 'bubble-1',
      userId: 'user-1',
      nodeId: 'node-1',
      location: { latitude: 1, longitude: 2, accuracy: 10 },
    });
    expect(result.delivered).toBe(false);
    expect(result.queued).toBe(true);
    expect(peekPendingSos()).toHaveLength(1);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: originalOnLine });
  });

  test('never reports delivery from the local queue alone', () => {
    enqueuePendingSos({ bubbleId: 'bubble-1', userId: 'user-1' });
    expect(JSON.parse(localStorage.getItem(PENDING_SOS_KEY))).toHaveLength(1);
    expect(peekPendingSos()[0].delivered).toBeUndefined();
    clearPendingSos();
    expect(peekPendingSos()).toHaveLength(0);
  });
});

describe('SOS activation against backend', () => {
  beforeEach(() => {
    mockFirestoreState.createdDoc = null;
    mockFirestoreState.existingSosSnap = { empty: true, docs: [] };
    auth.currentUser = { uid: 'user-1' };
    addDoc.mockClear();
    updateDoc.mockClear();
    API.updateStatus.mockClear();
  });

  test('creates an SOS event for the signed-in bubble member', async () => {
    const result = await activateSos({
      bubbleId: 'bubble-1',
      userId: 'user-1',
      nodeId: 'node-1',
      location: { latitude: 10, longitude: 20, accuracy: 5 },
    });
    expect(result.delivered).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(addDoc).toHaveBeenCalled();
    expect(API.updateStatus).toHaveBeenCalledWith('bubble-1', 'node-1', '🆘', 'SOS – I need help', { skipMemo: true });
  });

  test('reuses an existing open SOS instead of creating a second one', async () => {
    mockFirestoreState.existingSosSnap = {
      docs: [
        {
          id: 'sos-open',
          data: () => ({
            bubbleId: 'bubble-1',
            userId: 'user-1',
            status: SOS_STATUS.ACTIVE,
            delivered: true,
          }),
        },
      ],
    };
    const result = await activateSos({
      bubbleId: 'bubble-1',
      userId: 'user-1',
      nodeId: 'node-1',
    });
    expect(result.duplicate).toBe(true);
    expect(result.sos.sosId).toBe('sos-open');
    expect(addDoc).not.toHaveBeenCalled();
  });

  test('rejects SOS when the user is not a member of the bubble', async () => {
    auth.currentUser = { uid: 'outsider' };
    await expect(
      activateSos({ bubbleId: 'bubble-1', userId: 'outsider', nodeId: 'node-x' })
    ).rejects.toThrow('You are not a member of this bubble.');
  });
});

describe('SOS cancellation and resolution', () => {
  beforeEach(() => {
    auth.currentUser = { uid: 'user-1' };
  });

  test('resolve updates status for the activator', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      ref: {},
      id: 'sos-1',
      data: () => ({
        bubbleId: 'bubble-1',
        userId: 'user-1',
        status: SOS_STATUS.ACTIVE,
      }),
    });
    await resolveSos({ bubbleId: 'bubble-1', sosId: 'sos-1', nodeId: 'node-1' });
    expect(updateDoc).toHaveBeenCalledWith({}, expect.objectContaining({ status: SOS_STATUS.RESOLVED }));
  });

  test('cancel updates status for the activator', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      ref: {},
      id: 'sos-1',
      data: () => ({
        bubbleId: 'bubble-1',
        userId: 'user-1',
        status: SOS_STATUS.ACTIVE,
      }),
    });
    await cancelSos({ bubbleId: 'bubble-1', sosId: 'sos-1', nodeId: 'node-1' });
    expect(updateDoc).toHaveBeenCalledWith({}, expect.objectContaining({ status: SOS_STATUS.CANCELLED }));
  });

  test('acknowledge is refused for the activator', async () => {
    getDoc
      .mockResolvedValueOnce(memberSnap)
      .mockResolvedValueOnce({
        exists: () => true,
        ref: {},
        id: 'sos-1',
        data: () => ({
          bubbleId: 'bubble-1',
          userId: 'user-1',
          status: SOS_STATUS.ACTIVE,
        }),
      });
    await expect(acknowledgeSos({ bubbleId: 'bubble-1', sosId: 'sos-1' })).rejects.toThrow(
      'You cannot acknowledge this SOS.'
    );
  });
});

describe('hold / confirm timing', () => {
  test('requires a 3 second hold and a 3 second confirm window', () => {
    expect(SOS_HOLD_MS).toBe(3000);
    expect(SOS_CONFIRM_SECONDS).toBe(3);
  });
});
