import { addDoc, deleteField, doc, updateDoc } from 'firebase/firestore';
import {
  MEMO_REACTION_EMOJIS,
  MEMO_TYPE,
  buildMemoSharePayload,
  canCreateMemo,
  canReactToMemo,
  canViewMemos,
  createFamilyMemo,
  formatMemberLocation,
  nextMemoReaction,
  reactionCountByEmoji,
  shareMemo,
  sortFamilyMemos,
  toggleMemoReaction,
  usedReactionChips,
  parseMemoDeepLink,
  recordMemoShare,
  viewerMemoReaction,
} from './memos';
import { shouldPlaySosSound } from './sosSound';

jest.mock('../firebase', () => ({
  auth: { currentUser: { uid: 'user-1' } },
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  deleteField: jest.fn(() => ({ _delete: true })),
  doc: jest.fn(() => 'memo-ref'),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  serverTimestamp: jest.fn(),
  updateDoc: jest.fn(),
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
  });

  test('sorts newest first and pins active SOS memos', () => {
    const older = { type: MEMO_TYPE.STATUS, createdAt: { toMillis: () => 100 }, sosId: null };
    const newer = { type: MEMO_TYPE.STATUS, createdAt: { toMillis: () => 200 }, sosId: null };
    const sos = { type: MEMO_TYPE.SOS, createdAt: { toMillis: () => 50 }, sosId: 'sos-1' };
    const sorted = sortFamilyMemos([older, newer, sos], ['sos-1']);
    expect(sorted[0]).toBe(sos);
    expect(sorted[1]).toBe(newer);
    expect(sorted[2]).toBe(older);
  });

  test('formats location without hard-coded coordinates', () => {
    expect(formatMemberLocation(null)).toBe('Location unavailable');
    expect(formatMemberLocation({ latitude: 1.23456, longitude: 2.34567 })).toContain('1.235');
    expect(formatMemberLocation({ latitude: 1, longitude: 2, address: 'Home' })).toBe('Home');
  });

  test('stores photo and voice on a status memo', async () => {
    addDoc.mockResolvedValue({ id: 'memo-9' });
    const id = await createFamilyMemo({
      bubbleId: 'b1',
      userId: 'user-1',
      nodeId: 'n1',
      type: MEMO_TYPE.STATUS,
      status: '😊',
      message: 'On my way',
      photoUrl: 'https://example.com/p.jpg',
      voiceUrl: 'https://example.com/v.webm',
      voiceDurationMs: 4200,
    });
    expect(id).toBe('memo-9');
    expect(addDoc).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        type: MEMO_TYPE.STATUS,
        photoUrl: 'https://example.com/p.jpg',
        voiceUrl: 'https://example.com/v.webm',
        voiceDurationMs: 4200,
        reactions: {},
      })
    );
  });
});

describe('Memo reactions', () => {
  beforeEach(() => {
    doc.mockReturnValue('memo-ref');
    deleteField.mockReturnValue({ _delete: true });
    updateDoc.mockReset();
    updateDoc.mockResolvedValue(undefined);
  });

  test('uses the classic five-emoji set', () => {
    expect(MEMO_REACTION_EMOJIS).toEqual(['👍', '❤️', '😂', '😮', '😢']);
  });

  test('only bubble members can react', () => {
    expect(canReactToMemo({ authUid: 'user-1', isBubbleMember: true })).toBe(true);
    expect(canReactToMemo({ authUid: 'user-1', isBubbleMember: false })).toBe(false);
    expect(canReactToMemo({ authUid: null, isBubbleMember: true })).toBe(false);
  });

  test('tapping the same emoji clears it and a new emoji replaces it', () => {
    expect(nextMemoReaction(null, '❤️')).toBe('❤️');
    expect(nextMemoReaction('❤️', '❤️')).toBe(null);
    expect(nextMemoReaction('❤️', '👍')).toBe('👍');
    expect(nextMemoReaction('👍', '🔥')).toBe('👍');
  });

  test('counts reactions per emoji and finds the viewer reaction', () => {
    const reactions = { 'user-1': '❤️', 'user-2': '❤️', 'user-3': '👍' };
    expect(reactionCountByEmoji(reactions)).toEqual({
      '👍': 1,
      '❤️': 2,
      '😂': 0,
      '😮': 0,
      '😢': 0,
    });
    expect(viewerMemoReaction(reactions, 'user-1')).toBe('❤️');
    expect(viewerMemoReaction(reactions, 'user-9')).toBe(null);
    expect(usedReactionChips(reactions)).toEqual([
      { emoji: '👍', count: 1, label: 'thumbs up' },
      { emoji: '❤️', count: 2, label: 'heart' },
    ]);
  });

  test('builds a share payload for that individual memo', () => {
    expect(parseMemoDeepLink('?join=abc&memo=m5')).toBe('m5');
    expect(parseMemoDeepLink('')).toBe(null);
    expect(buildMemoSharePayload({
      memo: {
        memoId: 'm5',
        type: MEMO_TYPE.STATUS,
        status: '😊',
        message: 'Made it home',
        photoUrl: 'https://example.com/home.jpg',
      },
      memberName: 'Ada',
      bubbleName: 'Home',
      originHref: 'https://familybubble.app/',
    })).toEqual({
      title: 'Ada · Home',
      text: '😊 Ada: Made it home',
      url: 'https://familybubble.app/?memo=m5',
    });
    expect(buildMemoSharePayload({
      memo: { memoId: 'm5', type: MEMO_TYPE.STATUS, message: 'Hi', photoUrl: 'data:image/jpeg;base64,abc' },
      memberName: 'Ada',
      originHref: 'https://familybubble.app/',
    }).url).toBe('https://familybubble.app/?memo=m5');
  });

  test('copies memo text when the share sheet is unavailable', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    const originalShare = navigator.share;
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const result = await shareMemo({ title: 'Ada · Home', text: 'Made it home' });
    expect(result).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Ada · Home\nMade it home');
    Object.defineProperty(navigator, 'share', { configurable: true, value: originalShare });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
  });

  test('writes the viewer reaction onto the memo', async () => {
    const next = await toggleMemoReaction({
      bubbleId: 'b1',
      memoId: 'm1',
      emoji: '😂',
      currentEmoji: '👍',
    });
    expect(next).toBe('😂');
    expect(updateDoc).toHaveBeenCalledWith('memo-ref', { 'reactions.user-1': '😂' });
  });

  test('clears the viewer reaction when the same emoji is tapped again', async () => {
    const next = await toggleMemoReaction({
      bubbleId: 'b1',
      memoId: 'm1',
      emoji: '👍',
      currentEmoji: '👍',
    });
    expect(next).toBe(null);
    expect(updateDoc).toHaveBeenCalledWith('memo-ref', { 'reactions.user-1': { _delete: true } });
  });

  test('records a share so the family can be notified', async () => {
    await recordMemoShare({ bubbleId: 'b1', memoId: 'm1' });
    expect(updateDoc).toHaveBeenCalledWith(
      'memo-ref',
      expect.objectContaining({ 'shares.user-1': undefined })
    );
  });
});

describe('SOS sound gating', () => {
  test('does not play for normal status memos, including 🆘 emoji updates', () => {
    expect(shouldPlaySosSound({
      viewerUid: 'user-2',
      sosUserId: 'user-1',
      memoType: MEMO_TYPE.STATUS,
    })).toBe(false);
    expect(shouldPlaySosSound({
      viewerUid: 'user-2',
      sosUserId: 'user-1',
      memoType: MEMO_TYPE.CHECKIN,
    })).toBe(false);
  });

  test('plays only for another member’s ACTIVE SOS', () => {
    expect(shouldPlaySosSound({
      viewerUid: 'user-2',
      sosUserId: 'user-1',
      sosStatus: 'ACTIVE',
      memoType: MEMO_TYPE.SOS,
    })).toBe(true);
    expect(shouldPlaySosSound({
      viewerUid: 'user-1',
      sosUserId: 'user-1',
      sosStatus: 'ACTIVE',
      memoType: MEMO_TYPE.SOS,
    })).toBe(false);
    expect(shouldPlaySosSound({
      viewerUid: 'user-2',
      sosUserId: 'user-1',
      sosStatus: 'RESOLVED',
      memoType: MEMO_TYPE.SOS,
    })).toBe(false);
  });
});
