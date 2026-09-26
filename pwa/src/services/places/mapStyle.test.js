import { ownedPlaceLabel, placeAccentColor, groupPlacesByOwner } from './mapStyle';

describe('place map style', () => {
  const sister = { id: 'n-sis', userId: 'sister', name: 'Sister' };
  const dad = { id: 'n-dad', userId: 'dad', name: 'Dad' };
  const family = [sister, dad];
  const sisterHome = { placeId: 'sh', ownerId: 'sister', name: 'Home', type: 'home', color: '#60a5fa' };
  const sisterWork = { placeId: 'sw', ownerId: 'sister', name: 'Work', type: 'work', color: '#a78bfa' };
  const dadWork = { placeId: 'dw', ownerId: 'dad', name: 'Work', type: 'work', color: '#a78bfa' };

  test('home and work for the same person share that person’s color', () => {
    const homeColor = placeAccentColor(sisterHome, family);
    const workColor = placeAccentColor(sisterWork, family);
    expect(homeColor).toBe(workColor);
    expect(placeAccentColor(dadWork, family)).not.toBe(homeColor);
  });

  test('labels places as that person’s Home or Work', () => {
    expect(ownedPlaceLabel(sisterHome, family)).toBe("Sister's Home");
    expect(ownedPlaceLabel(sisterWork, family)).toBe("Sister's Work");
    expect(ownedPlaceLabel(dadWork, family)).toBe("Dad's Work");
  });

  test('groups every family member’s places for the map legend', () => {
    const groups = groupPlacesByOwner([sisterHome, sisterWork, dadWork], family);
    expect(groups).toHaveLength(2);
    const sis = groups.find((group) => group.ownerId === 'sister');
    expect(sis.places.map((place) => place.name)).toEqual(['Home', 'Work']);
    expect(sis.color).toBe(placeAccentColor(sisterHome, family));
  });
});
