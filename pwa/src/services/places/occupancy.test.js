import { assignMembersToPlaces, memberIsAtPlace } from './occupancy';

const home = {
  placeId: 'home',
  name: 'Home',
  type: 'home',
  latitude: -26.2,
  longitude: 28.04,
  radiusMeters: 200,
};
const school = {
  placeId: 'school',
  name: 'School',
  type: 'school',
  latitude: -26.21,
  longitude: 28.05,
  radiusMeters: 150,
};

const dad = {
  id: 'dad-node',
  userId: 'dad',
  name: 'Dad',
  lastKnownLocation: { latitude: -26.2, longitude: 28.04 },
};
const me = {
  id: 'me',
  userId: 'me',
  name: 'Me',
  lastKnownLocation: { latitude: -26.25, longitude: 28.1 },
};

describe('place occupancy', () => {
  test('presence inside marks a member at that Place', () => {
    expect(memberIsAtPlace(dad, home, [
      { userId: 'dad', placeId: 'home', inside: true },
    ])).toBe(true);
  });

  test('presence away wins over GPS that still sits in the radius', () => {
    expect(memberIsAtPlace(dad, home, [
      { userId: 'dad', placeId: 'home', inside: false },
    ])).toBe(false);
  });

  test('GPS inside the detection radius counts when presence is unknown', () => {
    expect(memberIsAtPlace(dad, home, [])).toBe(true);
    expect(memberIsAtPlace(me, home, [])).toBe(false);
  });

  test('GPS outside a Place wins over stale presence still marked inside', () => {
    expect(memberIsAtPlace(me, home, [
      { userId: 'me', placeId: 'home', inside: true },
    ])).toBe(false);
  });

  test('assigns each person to at most one Place and prefers presence', () => {
    const overlappingWork = {
      placeId: 'work',
      name: 'Work',
      latitude: home.latitude,
      longitude: home.longitude,
      radiusMeters: 200,
    };
    const { byPlace, memberPlace } = assignMembersToPlaces({
      members: [dad, me],
      places: [home, school, overlappingWork],
      presence: [{ userId: 'dad', placeId: 'home', inside: true }],
    });
    expect(memberPlace['dad-node']).toBe('home');
    expect(memberPlace.me).toBeUndefined();
    expect(byPlace.home.map((member) => member.id)).toEqual(['dad-node']);
    expect(byPlace.work).toEqual([]);
    expect(byPlace.school).toEqual([]);
  });

  test('presence without GPS still puts someone in the Place bubble', () => {
    const kid = { id: 'kid', userId: 'kid', name: 'Kid' };
    const { memberPlace, byPlace } = assignMembersToPlaces({
      members: [kid],
      places: [home],
      presence: [{ userId: 'kid', placeId: 'home', inside: true }],
    });
    expect(memberPlace.kid).toBe('home');
    expect(byPlace.home).toHaveLength(1);
  });

  test('a status location away unassigns a member even when presence is stale', () => {
    const dadAway = { ...dad, lastKnownLocation: me.lastKnownLocation };
    const { memberPlace, byPlace } = assignMembersToPlaces({
      members: [dadAway],
      places: [home],
      presence: [{ userId: 'dad', placeId: 'home', inside: true }],
    });
    expect(memberPlace['dad-node']).toBeUndefined();
    expect(byPlace.home).toEqual([]);
  });
});
