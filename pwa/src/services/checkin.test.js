import {
  buildCheckInMemo,
  canCheckIn,
  checkInButtonLabel,
  checkInHint,
  lookupPlaceLabel,
  shortPlaceLabel,
  CHECKIN_EMOJI,
  CHECKIN_MESSAGE,
} from './checkin';
import { MEMO_TYPE } from './memos';

describe('check in', () => {
  test('only the signed-in bubble member can check in', () => {
    expect(canCheckIn({ authUid: 'u1', userId: 'u1', isBubbleMember: true })).toBe(true);
    expect(canCheckIn({ authUid: 'u1', userId: 'u2', isBubbleMember: true })).toBe(false);
    expect(canCheckIn({ authUid: 'u1', userId: 'u1', isBubbleMember: false })).toBe(false);
    expect(canCheckIn({ authUid: 'u1', userId: 'u1', isBubbleMember: true, busy: true })).toBe(false);
  });

  test('builds a check-in memo with the location pin and GPS', () => {
    const memo = buildCheckInMemo({
      location: { latitude: -26.2, longitude: 28.04, accuracy: 12 },
    });
    expect(memo.type).toBe(MEMO_TYPE.CHECKIN);
    expect(memo.status).toBe(CHECKIN_EMOJI);
    expect(memo.message).toBe(CHECKIN_MESSAGE);
    expect(memo.location.latitude).toBe(-26.2);
  });

  test('includes an address in the memo when one is known', () => {
    expect(buildCheckInMemo({
      location: { latitude: 1, longitude: 2, address: 'Home' },
    }).message).toBe('Checked in · Home');
  });

  test('uses the site location pin colors on the map button label', () => {
    expect(checkInButtonLabel('idle')).toBe('Check in');
    expect(checkInButtonLabel('busy')).toBe('Checking in…');
    expect(checkInButtonLabel('done')).toBe('Checked in');
    expect(checkInButtonLabel('error')).toBe('Location needed');
  });

  test('popup copy matches the demo overlay', () => {
    expect(checkInHint('idle')).toMatch(/without changing your status/);
    expect(checkInHint('busy')).toBe('Finding your location…');
    expect(checkInHint('done')).toMatch(/family globe/);
  });

  test('shortens a reverse-geocoded address to a place name', () => {
    expect(shortPlaceLabel('Home')).toBe('Home');
    expect(shortPlaceLabel('Brooklyn, New York, USA')).toBe('Brooklyn');
    expect(shortPlaceLabel({ suburb: 'Home', city: 'New York' })).toBe('Home');
  });

  test('looks up a short place label for a check-in pin', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ address: { suburb: 'Home', city: 'New York' } }),
    });
    await expect(lookupPlaceLabel(40.7, -74, fetchImpl)).resolves.toBe('Home');
  });
});
