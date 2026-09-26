import { EVENT_SOURCE, EVENT_TYPE, MAX_PLACES_PER_USER, PLACE_LIMIT_MESSAGE } from './constants';

export const isBubbleMember = ({ authUid, memberIds = [] }) =>
  Boolean(authUid && Array.isArray(memberIds) && memberIds.includes(authUid));

export const canViewPlaces = ({ authUid, memberIds }) => isBubbleMember({ authUid, memberIds });

export const canCreatePlace = ({
  authUid,
  ownerId,
  memberIds,
  ownedCount = 0,
}) => {
  if (!authUid || authUid !== ownerId) return false;
  if (!isBubbleMember({ authUid, memberIds })) return false;
  return ownedCount < MAX_PLACES_PER_USER;
};

export const placeLimitError = (ownedCount) => {
  if (ownedCount >= MAX_PLACES_PER_USER) return PLACE_LIMIT_MESSAGE;
  return null;
};

export const canEditPlace = ({ authUid, place }) =>
  Boolean(authUid && place && place.ownerId === authUid);

export const canDeletePlace = canEditPlace;

export const canCheckInAtPlace = ({ authUid, place, isMember }) =>
  Boolean(authUid && isMember && place && place.isActive !== false);

export const canViewPlaceHistory = ({ authUid, memberIds, place }) =>
  Boolean(place && isBubbleMember({ authUid, memberIds }));

export const sanitizeRecipientUserIds = ({ recipientUserIds = [], memberIds = [], ownerId }) => {
  const allowed = new Set((memberIds || []).filter(Boolean));
  const unique = [];
  (recipientUserIds || []).forEach((userId) => {
    if (!userId || !allowed.has(userId) || unique.includes(userId)) return;
    unique.push(userId);
  });
  if (ownerId && allowed.has(ownerId) && !unique.includes(ownerId)) {
    // Owner may opt out; do not auto-add.
  }
  return unique;
};

export const canReceivePlaceNotification = ({
  recipientUserId,
  actorUserId,
  recipientUserIds = [],
  memberIds = [],
}) => {
  if (!recipientUserId || recipientUserId === actorUserId) return false;
  if (!memberIds.includes(recipientUserId)) return false;
  return recipientUserIds.includes(recipientUserId);
};

export const filterPlacePushRecipients = ({
  actorUserId,
  recipientUserIds,
  memberIds,
}) =>
  (memberIds || []).filter((userId) =>
    canReceivePlaceNotification({
      recipientUserId: userId,
      actorUserId,
      recipientUserIds,
      memberIds,
    }));

export const canCreatePlaceEvent = ({
  authUid,
  userId,
  memberIds,
  eventType,
  source,
}) => {
  if (!authUid || authUid !== userId) return false;
  if (!isBubbleMember({ authUid, memberIds })) return false;
  const validType = Object.values(EVENT_TYPE).includes(eventType);
  const validSource = Object.values(EVENT_SOURCE).includes(source);
  return validType && validSource;
};

export const canModifyAnotherUsersPlace = ({ authUid, place }) =>
  Boolean(place && authUid && place.ownerId !== authUid);
