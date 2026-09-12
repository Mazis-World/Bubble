import {
  MEMO_TYPE,
  canCreateMemo,
  canViewMemos,
  formatMemberLocation,
  sortFamilyMemos,
} from './memos';

jest.mock('../firebase', () => ({
  auth: { currentUser: { uid: 'user-1' } },
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  serverTimestamp: jest.fn(),
}));

describe('Family Memos', () => {
  test('only bubble members can view memos', () => {
    expect(canViewMemos({ isBubbleMember: true })).toBe(true);
    expect(canViewMemos({ isBubbleMember: false })).toBe(false);
  });

  test('memo authors must be the signed-in member', () => {
    expect(canCreateMemo({
      authUid: 'user-1',
      userId: 'user-1',
      isBubbleMember: true,
      type: MEMO_TYPE.STATUS,
    })).toBe(true);
    expect(canCreateMemo({
      authUid: 'user-1',
      userId: 'user-2',
      isBubbleMember: true,
      type: MEMO_TYPE.STATUS,
    })).toBe(false);
    expect(canCreateMemo({
      authUid: 'user-1',
      userId: 'user-1',
      isBubbleMember: false,
      type: MEMO_TYPE.STATUS,
    })).toBe(false);
    expect(canCreateMemo({
      authUid: 'user-1',
      userId: 'user-1',
      isBubbleMember: true,
      type: MEMO_TYPE.CHECKIN,
    })).toBe(true);
    expect(canCreateMemo({
      authUid: 'user-1',
      userId: 'user-1',
      isBubbleMember: true,
      type: MEMO_TYPE.PLACE,
    })).toBe(true);
    expect(canCreateMemo({
      authUid: 'user-1',
      userId: 'user-1',
      isBubbleMember: true,
      type: MEMO_TYPE.SOS,
    })).toBe(false);
  });

  test('sorts newest first and hides legacy SOS memos', () => {
    const older = { type: MEMO_TYPE.STATUS, createdAt: { toMillis: () => 100 }, sosId: null };
    const newer = { type: MEMO_TYPE.STATUS, createdAt: { toMillis: () => 200 }, sosId: null };
    const sos = { type: MEMO_TYPE.SOS, createdAt: { toMillis: () => 250 }, sosId: 'sos-1' };
    const sorted = sortFamilyMemos([older, newer, sos]);
    expect(sorted).toEqual([newer, older]);
  });

  test('formats location without hard-coded coordinates', () => {
    expect(formatMemberLocation(null)).toBe('Location unavailable');
    expect(formatMemberLocation({ latitude: 1.23456, longitude: 2.34567 })).toContain('1.235');
    expect(formatMemberLocation({ latitude: 1, longitude: 2, address: 'Home' })).toBe('Home');
  });
});
