/**
 * FamilyBubble is free to create and use.
 * RevenueCat entitlement "FamilyBubble Premium" unlocks paid features.
 *
 * Free: radar, map, check-in, emoji/text status, Family Memos (text),
 *       1 Place, and up to 6 members.
 * Premium: SOS, extra Places (up to 3), voice and photo status memos,
 *          and room for the whole family.
 */

export const PREMIUM_ENTITLEMENT_ID = 'FamilyBubble Premium';

export const FREE_MEMBER_LIMIT = 6;
export const PREMIUM_MEMBER_LIMIT = 50;

export const FREE_PLACE_LIMIT = 1;
export const PREMIUM_PLACE_LIMIT = 3;

export const PREMIUM_FEATURE = {
  SOS: 'sos',
  UNLIMITED_MEMBERS: 'unlimited_members',
  EXTRA_PLACES: 'extra_places',
  VOICE_MEMO: 'voice_memo',
  PHOTO_MEMO: 'photo_memo',
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

export function placeLimitForPlan(isPremium) {
  return isPremium ? PREMIUM_PLACE_LIMIT : FREE_PLACE_LIMIT;
}

export function canInviteMoreMembers({ isPremium, memberCount }) {
  const count = Number(memberCount) || 0;
  if (isPremium) return true;
  return count < FREE_MEMBER_LIMIT;
}

export function canCreatePlaceOnPlan({ isPremium, ownedCount = 0 }) {
  return ownedCount < placeLimitForPlan(isPremium);
}

export function canUseRichStatus({ isPremium }) {
  return isPremium === true;
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

export function extraPlaceUpgradeMessage() {
  return `Free includes ${FREE_PLACE_LIMIT} Place. Upgrade to Premium for Home, School, and Work.`;
}

export function richStatusUpgradeMessage() {
  return 'Voice notes and photos on status are Premium. Upgrade to share them with your bubble.';
}
