import { clampRadiusMeters, haversineMeters } from './geofence';

export const memberUserId = (member) => member?.userId || member?.id || member?.nodeId;

export const memberMatchesPresence = (member, record) => {
  if (!member || !record) return false;
  const userId = record.userId;
  if (!userId) return false;
  return member.userId === userId || member.id === userId || member.nodeId === userId;
};

export const presenceForMemberPlace = (member, place, presence = []) =>
  (presence || []).find((item) => (
    item
    && item.placeId === place?.placeId
    && memberMatchesPresence(member, item)
  ));

/**
 * True when a family member should be drawn inside a Place bubble.
 * Live presence wins; otherwise GPS inside the detection radius counts.
 */
export const memberIsAtPlace = (member, place, presence = []) => {
  if (!member || !place) return false;
  const record = presenceForMemberPlace(member, place, presence);
  if (record?.inside === true) return true;
  if (record?.inside === false) return false;
  const location = member.lastKnownLocation;
  if (!location) return false;
  const distance = haversineMeters(location, place);
  if (distance == null) return false;
  return distance <= clampRadiusMeters(place.radiusMeters);
};

const occupancyScore = (member, place, presence = []) => {
  const record = presenceForMemberPlace(member, place, presence);
  if (record?.inside === true) return -1;
  const distance = haversineMeters(member?.lastKnownLocation, place);
  return distance == null ? Number.POSITIVE_INFINITY : distance;
};

/**
 * Each member belongs to at most one Place. Presence `inside` wins;
 * otherwise the nearest Place whose radius covers their GPS.
 */
export const assignMembersToPlaces = ({
  members = [],
  places = [],
  presence = [],
} = {}) => {
  const activePlaces = (places || []).filter((place) => (
    place
    && place.placeId
    && place.isActive !== false
    && Number.isFinite(Number(place.latitude))
    && Number.isFinite(Number(place.longitude))
  ));
  const byPlace = {};
  const memberPlace = {};
  activePlaces.forEach((place) => {
    byPlace[place.placeId] = [];
  });

  (members || []).forEach((member) => {
    if (!member || typeof member !== 'object') return;
    const memberId = member.id || member.nodeId;
    if (!memberId) return;

    let best = null;
    activePlaces.forEach((place) => {
      if (!memberIsAtPlace(member, place, presence)) return;
      const score = occupancyScore(member, place, presence);
      if (!best || score < best.score) {
        best = { place, score };
      }
    });
    if (!best) return;
    memberPlace[memberId] = best.place.placeId;
    byPlace[best.place.placeId].push(member);
  });

  return { byPlace, memberPlace };
};

export const occupantsForPlace = (occupancy, placeId) =>
  (occupancy?.byPlace && occupancy.byPlace[placeId]) || [];

export const isMemberInPlaceBubble = (occupancy, memberId) =>
  Boolean(memberId && occupancy?.memberPlace?.[memberId]);
