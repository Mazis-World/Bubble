/**
 * FamilyBubble is free to create and use.
 * RevenueCat entitlement "FamilyBubble Premium" unlocks paid features.
 */

export const PREMIUM_ENTITLEMENT_ID = 'FamilyBubble Premium';

export const FREE_MEMBER_LIMIT = 6;
export const PREMIUM_MEMBER_LIMIT = 50;

export const PREMIUM_FEATURE = {
  SOS: 'sos',
  UNLIMITED_MEMBERS: 'unlimited_members',
};

export function hasPremiumEntitlement(customerInfo) {
  return typeof customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID] !== 'undefined';
}

export function hadPremiumEntitlement(customerInfo) {
  return typeof customerInfo?.entitlements?.all?.[PREMIUM_ENTITLEMENT_ID] !== 'undefined';
}

export function memberLimitForPlan(isPremium) {
  return isPremium ? PREMIUM_MEMBER_LIMIT : FREE_MEMBER_LIMIT;
}

export function canInviteMoreMembers({ isPremium, memberCount }) {
  const count = Number(memberCount) || 0;
  if (isPremium) return true;
  return count < FREE_MEMBER_LIMIT;
}

export function canJoinAtMemberCap({ memberCount, maxMembers }) {
  const count = Number(memberCount) || 0;
  const cap = Number(maxMembers);
  const limit = Number.isFinite(cap) && cap > 0 ? cap : PREMIUM_MEMBER_LIMIT;
  return count < limit;
}

export function inviteLimitMessage() {
  return `Free bubbles include ${FREE_MEMBER_LIMIT} family members. Upgrade to Premium to invite more.`;
}

export function joinLimitMessage() {
  return 'This bubble is full. Ask the owner to upgrade to Premium for more family members.';
}

export function isBubbleOwner({ userId, member, bubble } = {}) {
  const uid = userId || member?.userId;
  if (!uid) return false;
  if (bubble?.ownerId && String(bubble.ownerId) === String(uid)) return true;
  if (member?.type === 'owner') return true;
  if (Number(member?.tier) === 1) return true;
  return false;
}

export function bubbleOwnerDisplayName({ members = [], bubble } = {}) {
  const owner = (members || []).find((item) => (
    item?.type === 'owner'
    || Number(item?.tier) === 1
    || (bubble?.ownerId && item?.userId === bubble.ownerId)
  ));
  const full = String(owner?.name || owner?.fullName || '').trim();
  if (!full) return '';
  return full.split(/\s+/)[0];
}

export function contactOwnerToUpgradeMessage(ownerName) {
  const who = String(ownerName || '').trim();
  if (who) {
    return `Only ${who} can sign up for FamilyBubble Premium. Ask them to upgrade so everyone in this bubble can use SOS and invite more family.`;
  }
  return 'Only the FamilyBubble owner can sign up for Premium. Ask the person who created this bubble to upgrade so everyone can use SOS and invite more family.';
}
