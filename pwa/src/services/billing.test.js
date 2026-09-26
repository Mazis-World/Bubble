import {
  FREE_MEMBER_LIMIT,
  PREMIUM_MEMBER_LIMIT,
  canInviteMoreMembers,
  canJoinAtMemberCap,
  hadPremiumEntitlement,
  hasPremiumEntitlement,
  memberLimitForPlan,
} from './billing';

describe('billing', () => {
  test('detects an active FamilyBubble Premium entitlement', () => {
    expect(hasPremiumEntitlement({
      entitlements: { active: { 'FamilyBubble Premium': { identifier: 'FamilyBubble Premium' } } },
    })).toBe(true);
    expect(hasPremiumEntitlement({ entitlements: { active: {} } })).toBe(false);
    expect(hasPremiumEntitlement(null)).toBe(false);
  });

  test('detects a lapsed entitlement without treating it as paid', () => {
    const lapsed = {
      entitlements: {
        active: {},
        all: { 'FamilyBubble Premium': { identifier: 'FamilyBubble Premium' } },
      },
    };
    expect(hasPremiumEntitlement(lapsed)).toBe(false);
    expect(hadPremiumEntitlement(lapsed)).toBe(true);
  });

  test('free plan caps invites at six members', () => {
    expect(memberLimitForPlan(false)).toBe(FREE_MEMBER_LIMIT);
    expect(memberLimitForPlan(true)).toBe(PREMIUM_MEMBER_LIMIT);
    expect(canInviteMoreMembers({ isPremium: false, memberCount: 5 })).toBe(true);
    expect(canInviteMoreMembers({ isPremium: false, memberCount: 6 })).toBe(false);
    expect(canInviteMoreMembers({ isPremium: true, memberCount: 6 })).toBe(true);
  });

  test('join respects the bubble member cap stored on the bubble', () => {
    expect(canJoinAtMemberCap({ memberCount: 6, maxMembers: 6 })).toBe(false);
    expect(canJoinAtMemberCap({ memberCount: 6, maxMembers: 50 })).toBe(true);
    expect(canJoinAtMemberCap({ memberCount: 0, maxMembers: undefined })).toBe(true);
  });
});
