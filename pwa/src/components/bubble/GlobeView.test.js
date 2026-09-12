import { globePlacePoints } from '../../services/places/markers';
import {
  assignMembersToPlaces,
  isMemberInPlaceBubble,
} from '../../services/places/occupancy';

describe('Globe map place occupancy', () => {
  const house = { latitude: -26.2, longitude: 28.04 };
  const away = { latitude: -26.25, longitude: 28.1 };
  const home = {
    placeId: 'home',
    name: 'Home',
    icon: '🏠',
    color: '#60a5fa',
    latitude: house.latitude,
    longitude: house.longitude,
    radiusMeters: 200,
  };
  const me = { id: 'me', name: 'Me', lastKnownLocation: away };
  const dad = { id: 'dad', name: 'Dad', lastKnownLocation: house };

  test('place pins include people who are at that Place', () => {
    const occupancy = assignMembersToPlaces({
      members: [me, dad],
      places: [home],
    });
    const points = globePlacePoints([home], occupancy);
    expect(points).toHaveLength(1);
    expect(points[0].place.icon).toBe('🏠');
    expect(points[0].occupants.map((member) => member.id)).toEqual(['dad']);
  });

  test('people at a Place are omitted from standalone globe bubbles', () => {
    const occupancy = assignMembersToPlaces({
      members: [me, dad],
      places: [home],
    });
    const visible = [me, dad].filter((member) => !isMemberInPlaceBubble(occupancy, member.id));
    expect(visible.map((member) => member.id)).toEqual(['me']);
  });
});
