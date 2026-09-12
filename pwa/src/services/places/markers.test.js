import {
  createMemberHtmlMarker,
  createPlaceHtmlMarker,
  fanOutSharedGlobePoints,
  globeHtmlLayers,
  globeMemberPoints,
  globePlacePoints,
} from './markers';

describe('place markers', () => {
  test('builds a labeled HTML pin for the globe', () => {
    const onClick = jest.fn();
    const el = createPlaceHtmlMarker(
      { placeId: 'home', name: 'Home', icon: '🏠', color: '#60a5fa' },
      { onClick }
    );
    expect(el.getAttribute('aria-label')).toBe('Home place');
    expect(el.textContent).toContain('🏠');
    expect(el.textContent).toContain('Home');
    el.click();
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ placeId: 'home' }));
  });

  test('occupied globe pin shows the people inside the Place', () => {
    const onMemberClick = jest.fn();
    const dad = { id: 'dad', name: 'Dad' };
    const el = createPlaceHtmlMarker(
      { placeId: 'home', name: 'Home', icon: '🏠', color: '#60a5fa' },
      { occupants: [dad], onMemberClick }
    );
    expect(el.getAttribute('aria-label')).toBe('Home place, Dad here');
    expect(el.textContent).toContain('Home');
    expect(el.textContent).toContain('🏠');
    const face = el.querySelector('.place-globe-occupant');
    expect(face).toBeTruthy();
    expect(face.getAttribute('aria-label')).toBe('Dad in Home');
    face.click();
    expect(onMemberClick).toHaveBeenCalledWith(dad, false);
  });

  test('skips inactive or unlocated places on the globe', () => {
    const points = globePlacePoints([
      { placeId: 'home', name: 'Home', icon: '🏠', latitude: 1, longitude: 2 },
      { placeId: 'ghost', name: 'Ghost', icon: '👻', isActive: false, latitude: 3, longitude: 4 },
      { placeId: 'nowhere', name: 'Nowhere', icon: '📍' },
    ]);
    expect(points).toEqual([
      { lat: 1, lng: 2, occupants: [], members: [], place: expect.objectContaining({ placeId: 'home' }) },
    ]);
  });
});

describe('globe member face bubbles', () => {
  const house = { latitude: -26.2, longitude: 28.04 };

  test('builds a named face bubble for a family member', () => {
    const onClick = jest.fn();
    const el = createMemberHtmlMarker(
      { id: 'dad', name: 'Dad', status: '✅', photoUrl: 'https://example/dad.jpg' },
      { onClick }
    );
    expect(el.getAttribute('aria-label')).toBe('Dad');
    expect(el.className).toContain('member-globe-marker');
    expect(el.querySelector('img').getAttribute('src')).toBe('https://example/dad.jpg');
    expect(el.textContent).toContain('Dad');
    el.click();
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'dad' }));
  });

  test('fans out people who share a GPS point', () => {
    const points = fanOutSharedGlobePoints(globeMemberPoints([
      { id: 'me', name: 'Me', lastKnownLocation: house },
      { id: 'dad', name: 'Dad', lastKnownLocation: house },
    ]));
    expect(points).toHaveLength(2);
    const keys = new Set(points.map((point) => `${point.dx},${point.dy}`));
    expect(keys.size).toBe(2);
  });

  test('draws other family face bubbles even when they are at a Place', () => {
    const layers = globeHtmlLayers({
      members: [
        { id: 'me', name: 'Me', lastKnownLocation: { latitude: -26.25, longitude: 28.1 } },
        { id: 'dad', name: 'Dad', lastKnownLocation: house },
      ],
      places: [{
        placeId: 'home',
        name: 'Home',
        icon: '🏠',
        latitude: house.latitude,
        longitude: house.longitude,
      }],
    });
    expect(layers.some((item) => item.member?.id === 'dad')).toBe(true);
    expect(layers.some((item) => item.member?.id === 'me')).toBe(true);
    expect(layers.some((item) => item.place?.placeId === 'home')).toBe(true);
  });
});

describe('member-colored family places', () => {
  const sister = { id: 'n-sis', userId: 'sister', name: 'Sister' };
  const dad = { id: 'n-dad', userId: 'dad', name: 'Dad' };
  const family = [sister, dad];

  test('sister home and work pins share her color, dad’s work does not', () => {
    const home = createPlaceHtmlMarker(
      { placeId: 'sh', ownerId: 'sister', name: 'Home', icon: '🏠', type: 'home' },
      { members: family }
    );
    const work = createPlaceHtmlMarker(
      { placeId: 'sw', ownerId: 'sister', name: 'Work', icon: '💼', type: 'work' },
      { members: family }
    );
    const dadWork = createPlaceHtmlMarker(
      { placeId: 'dw', ownerId: 'dad', name: 'Work', icon: '💼', type: 'work' },
      { members: family }
    );
    expect(home.dataset.ownerColor).toBe(work.dataset.ownerColor);
    expect(dadWork.dataset.ownerColor).not.toBe(home.dataset.ownerColor);
    expect(home.getAttribute('aria-label')).toBe("Sister's Home place");
    expect(work.getAttribute('aria-label')).toBe("Sister's Work place");
    expect(home.textContent).toContain("Sister's Home");
    expect(work.textContent).toContain("Sister's Work");
  });

  test('globe layers include every member’s places', () => {
    const layers = globeHtmlLayers({
      members: [
        { ...sister, lastKnownLocation: { latitude: 1, longitude: 1 } },
        { ...dad, lastKnownLocation: { latitude: 2, longitude: 2 } },
      ],
      places: [
        { placeId: 'sh', ownerId: 'sister', name: 'Home', latitude: 10, longitude: 10 },
        { placeId: 'sw', ownerId: 'sister', name: 'Work', latitude: 11, longitude: 11 },
        { placeId: 'dh', ownerId: 'dad', name: 'Home', latitude: 20, longitude: 20 },
        { placeId: 'dw', ownerId: 'dad', name: 'Work', latitude: 21, longitude: 21 },
      ],
    });
    const placeIds = layers.filter((item) => item.place).map((item) => item.place.placeId).sort();
    expect(placeIds).toEqual(['dh', 'dw', 'sh', 'sw']);
  });
});
