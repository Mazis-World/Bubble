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
      { lat: 1, lng: 2, occupants: [], place: expect.objectContaining({ placeId: 'home' }) },
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
