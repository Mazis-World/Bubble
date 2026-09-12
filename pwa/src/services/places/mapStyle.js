import { firstName, placeIcon, placeLabel } from './copy';
import {
  colorForMember,
  findMember,
  possessiveName,
} from '../../utils/memberColor';

export const placeOwner = (place, members = []) => findMember(members, place?.ownerId);

export const placeAccentColor = (place, members = []) => {
  if (place?.ownerId) return colorForMember(place.ownerId, members);
  return place?.color || '#818cf8';
};

export const ownedPlaceLabel = (place, members = []) => {
  const owner = placeOwner(place, members);
  const who = firstName(owner?.name || owner?.fullName);
  const name = placeLabel(place);
  if (!owner) return name;
  return `${possessiveName(who)} ${name}`;
};

export const groupPlacesByOwner = (places = [], members = []) => {
  const groups = new Map();
  (places || [])
    .filter((place) => place && place.isActive !== false)
    .forEach((place) => {
      const key = place.ownerId || 'family';
      if (!groups.has(key)) {
        const owner = findMember(members, key);
        groups.set(key, {
          ownerId: key,
          owner,
          color: colorForMember(owner || key, members),
          name: firstName(owner?.name || owner?.fullName),
          places: [],
        });
      }
      groups.get(key).places.push(place);
    });
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
};

export const placeMapMeta = (place, members = []) => ({
  color: placeAccentColor(place, members),
  label: ownedPlaceLabel(place, members),
  icon: placeIcon(place),
  owner: placeOwner(place, members),
});
