import { INVITE_ALREADY_USED, inviteFromRecords, inviteIsUsed } from './invites';

describe('invite codes', () => {
  test('are unused until accepted or marked used', () => {
    expect(inviteIsUsed({})).toBe(false);
    expect(inviteIsUsed({ accepted: false, used: false, edgeAccepted: false })).toBe(false);
  });

  test('can only be used once after the invitation is accepted', () => {
    expect(inviteIsUsed({ accepted: true })).toBe(true);
    expect(inviteIsUsed({ used: true })).toBe(true);
    expect(inviteFromRecords({ accepted: false, used: false }, { accepted: true })).toBe(true);
  });

  test('already-used copy is explicit', () => {
    expect(INVITE_ALREADY_USED).toMatch(/already been used/);
  });
});
