import { globeHtmlLayers, globeMemberPoints } from '../../services/places/markers';
import { assignMembersToPlaces } from '../../services/places/occupancy';

describe('Globe map face bubbles', () => {
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

  test('family members still appear as globe face bubbles when they are at a Place', () => {
    const occupancy = assignMembersToPlaces({
      members: [me, dad],
      places: [home],
    });
    expect(occupancy.memberPlace.dad).toBe('home');
    const members = globeMemberPoints([me, dad]);
    expect(members.map((point) => point.member.id)).toEqual(['me', 'dad']);
    const layers = globeHtmlLayers({ members: [me, dad], places: [home] });
    expect(layers.filter((item) => item.member?.id === 'dad')).toHaveLength(1);
    expect(layers.filter((item) => item.place?.placeId === 'home')).toHaveLength(1);
  });
});
