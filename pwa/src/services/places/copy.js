import { EVENT_TYPE, PLACE_NOTIFY_TYPE, PLACE_TYPE, presetForType } from './constants';

export const firstName = (displayName) => {
  const trimmed = String(displayName || '').trim();
  if (!trimmed) return 'A family member';
  return trimmed.split(/\s+/)[0];
};

export const placeLabel = (place) => {
  if (!place) return 'a place';
  const name = String(place.name || '').trim();
  if (name) return name;
  return presetForType(place.type).name;
};

export const placeIcon = (place) => place?.icon || presetForType(place?.type).icon;

export const formatPlaceEventMessage = ({ place, memberName, eventType }) => {
  const who = firstName(memberName);
  const name = placeLabel(place);
  const icon = placeIcon(place);
  if (eventType === EVENT_TYPE.ARRIVED) return `${icon} ${who} arrived ${name}`;
  if (eventType === EVENT_TYPE.LEFT) return `🚗 ${who} left ${name}`;
  if (eventType === EVENT_TYPE.CHECKED_IN) return `📍 ${who} checked in at ${name}`;
  if (eventType === EVENT_TYPE.UPDATED) {
    if (place?.type === PLACE_TYPE.HOME) return `${icon} ${who} updated the Home location.`;
    return `${icon} ${who} updated ${name}`;
  }
  return `${icon} ${who} updated ${name}`;
};

export const notifyTypeForEvent = (eventType) => {
  if (eventType === EVENT_TYPE.ARRIVED) return PLACE_NOTIFY_TYPE.ARRIVAL;
  if (eventType === EVENT_TYPE.LEFT) return PLACE_NOTIFY_TYPE.DEPARTURE;
  if (eventType === EVENT_TYPE.CHECKED_IN) return PLACE_NOTIFY_TYPE.CHECKIN;
  return PLACE_NOTIFY_TYPE.UPDATED;
};

export const activityLine = ({ place, memberName, eventType, source }) => {
  const who = firstName(memberName);
  const name = placeLabel(place);
  const icon = placeIcon(place);
  if (eventType === EVENT_TYPE.ARRIVED) return `${icon} ${who} arrived`;
  if (eventType === EVENT_TYPE.LEFT) return `🚗 ${who} left`;
  if (eventType === EVENT_TYPE.CHECKED_IN) return `📍 ${who} checked in`;
  if (eventType === EVENT_TYPE.UPDATED) return `${icon} ${who} updated ${name}`;
  return `${who} updated ${name}${source === 'MANUAL' ? '' : ''}`;
};

const uniqueNames = (names) => {
  const seen = new Set();
  return names.filter((name) => {
    const key = name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const joinNames = (names) => {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
};

export const isHomePlace = (place) => place?.type === PLACE_TYPE.HOME;

export const formatPlaceStatus = ({
  place,
  presence = [],
  members = [],
  locationAvailable = true,
} = {}) => {
  if (!locationAvailable && (!presence || presence.length === 0)) {
    return 'Location unavailable';
  }
  const memberName = (userId) => {
    const member = (members || []).find((item) => item.userId === userId || item.id === userId);
    return firstName(member?.name || member?.fullName);
  };
  const inside = (presence || []).filter((item) => item.inside === true);
  if (inside.length > 0) {
    const names = uniqueNames(inside.map((item) => memberName(item.userId)));
    const joined = joinNames(names);
    const verb = names.length === 1 ? 'is' : 'are';
    if (isHomePlace(place)) return `${joined} ${verb} home`;
    return `${joined} ${verb} here`;
  }
  const knownAway = (presence || []).filter((item) => item.inside === false);
  if (knownAway.length > 0 && place?.ownerId) {
    const ownerAway = knownAway.some((item) => item.userId === place.ownerId);
    if (ownerAway) {
      return `${memberName(place.ownerId)} is away`;
    }
  }
  if (!locationAvailable) return 'Location unavailable';
  return 'No one here';
};

export const formatPlacesUsed = (count) => `${count} of 3 Places used`;

export const emptyPlacesTitle = 'Your important places';
export const emptyPlacesBody =
  'Add places like Home, School, or Work and FamilyBubble can automatically let your family know when you arrive or leave.';

export const backgroundLocationWhy =
  'FamilyBubble uses your location to automatically let your family know when you arrive at important places like Home, School, or Work.';

export const homeAddressConfirmTitle = 'Update Home Address?';
export const homeAddressConfirmBody =
  'This will change the location FamilyBubble uses to recognize Home.';

export const deletePlaceTitle = (place) => `Delete ${placeLabel(place)}?`;
export const deletePlaceBody =
  'This will stop FamilyBubble from automatically detecting arrivals and departures for this Place.';
