import {
  adjacentBubbleId,
  listBubbleSummaries,
  locationPayload,
  miniClusterLayout,
  miniMemberPhotos,
  miniPhotoSize,
  splitPersonName,
  swipeDirection,
} from './bubbleSwitcher';

describe('bubbleSwitcher helpers', () => {
  test('lists unique bubbles by id and name', () => {
    expect(listBubbleSummaries([
      { bubbleId: 'dad', bubble: { name: "Dad's Family" }, isOwner: true },
      { bubble: { id: 'mom', name: "Mom's Family" }, isOwner: true },
      { bubbleId: 'dad', bubble: { name: 'Duplicate' } },
      { bubble: { name: 'Missing id' } },
    ])).toEqual([
      { id: 'dad', name: "Dad's Family", isOwner: true, members: [] },
      { id: 'mom', name: "Mom's Family", isOwner: true, members: [] },
    ]);
  });

  test('packs member photos into each family summary', () => {
    const members = miniMemberPhotos([
      { id: 'n1', userId: 'u1', name: 'Ada', photoUrl: 'https://example.com/ada.jpg' },
      { userId: 'u1', name: 'Ada duplicate', photoURL: 'https://example.com/skip.jpg' },
      { id: 'n2', name: 'Bob' },
    ]);
    expect(members).toEqual([
      { id: 'u1', name: 'Ada', photoUrl: 'https://example.com/ada.jpg' },
      { id: 'n2', name: 'Bob', photoUrl: null },
    ]);
    expect(miniPhotoSize(2)).toBeGreaterThan(miniPhotoSize(20));
    const crowded = miniClusterLayout(8);
    const pair = miniClusterLayout(2);
    expect(crowded.size + (8 - 1) * (crowded.size - crowded.overlap)).toBeLessThanOrEqual(41);
    expect(pair.size).toBeGreaterThanOrEqual(crowded.size);
    expect(listBubbleSummaries([{
      bubbleId: 'dad',
      bubble: { name: "Dad's Family" },
      allMembers: [{ id: 'n1', userId: 'u1', name: 'Ada', photoUrl: 'https://example.com/ada.jpg' }],
    }])[0].members).toEqual([
      { id: 'u1', name: 'Ada', photoUrl: 'https://example.com/ada.jpg' },
    ]);
  });

  test('swipes wrap to the other family bubble', () => {
    const bubbles = [
      { id: 'dad', name: "Dad's Family" },
      { id: 'mom', name: "Mom's Family" },
    ];
    expect(adjacentBubbleId(bubbles, 'dad', 1)).toBe('mom');
    expect(adjacentBubbleId(bubbles, 'mom', 1)).toBe('dad');
    expect(adjacentBubbleId(bubbles, 'dad', -1)).toBe('mom');
    expect(adjacentBubbleId([{ id: 'only', name: 'Only' }], 'only', 1)).toBe(null);
  });

  test('swiping past the last mini bubble lands on create', () => {
    const { peekSwitcherTarget } = require('./bubbleSwitcher');
    const bubbles = [
      { id: 'dad', name: "Dad's Family" },
      { id: 'mom', name: "Mom's Family" },
    ];
    expect(peekSwitcherTarget(bubbles, 'dad', 1)).toEqual({ kind: 'bubble', id: 'mom' });
    expect(peekSwitcherTarget(bubbles, 'mom', 1)).toEqual({ kind: 'create' });
    expect(peekSwitcherTarget(bubbles, 'dad', -1)).toBeNull();
    expect(peekSwitcherTarget([{ id: 'only' }], 'only', 1)).toEqual({ kind: 'create' });
  });

  test('treats a clear horizontal swipe as next or previous', () => {
    expect(swipeDirection({ startX: 120, startY: 10, endX: 40, endY: 12 })).toBe(1);
    expect(swipeDirection({ startX: 40, startY: 10, endX: 120, endY: 8 })).toBe(-1);
    expect(swipeDirection({ startX: 40, startY: 10, endX: 50, endY: 12 })).toBe(0);
    expect(swipeDirection({ startX: 40, startY: 10, endX: 120, endY: 200 })).toBe(0);
  });

  test('splits a member name and copies a GPS payload', () => {
    expect(splitPersonName('Ada Lovelace')).toEqual({ firstName: 'Ada', lastName: 'Lovelace' });
    expect(splitPersonName('Ada Lovelace', 'Grace', 'Hopper')).toEqual({
      firstName: 'Grace',
      lastName: 'Hopper',
    });
    expect(locationPayload({ latitude: 1, longitude: 2, accuracy: 8, address: 'Home' })).toEqual({
      latitude: 1,
      longitude: 2,
      accuracy: 8,
      address: 'Home',
    });
    expect(locationPayload({ latitude: 1 })).toBeNull();
  });

  test('remembers the last opened bubble', () => {
    const { persistCurrentBubble, readPersistedBubble } = require('./bubbleSwitcher');
    persistCurrentBubble('mom');
    expect(readPersistedBubble()).toBe('mom');
  });

  test('caps every person at two bubbles and skips people already in the other family', () => {
    const {
      MAX_USER_BUBBLES,
      canCreateAnotherBubble,
      membersToCopy,
      haloForBubbleIndex,
    } = require('./bubbleSwitcher');
    expect(MAX_USER_BUBBLES).toBe(2);
    expect(canCreateAnotherBubble(1)).toBe(true);
    expect(canCreateAnotherBubble(2)).toBe(false);
    expect(membersToCopy({
      sourceMembers: [
        { userId: 'me', name: 'Me' },
        { userId: 'sis', name: 'Sis' },
        { userId: 'bro', name: 'Bro' },
      ],
      targetMembers: [{ userId: 'sis', name: 'Sis' }],
      currentUserId: 'me',
    }).map((member) => member.userId)).toEqual(['bro']);
    expect(haloForBubbleIndex(0).accent).toBe('#8b5cf6');
    expect(haloForBubbleIndex(1).accent).toBe('#ec4899');
  });
});
