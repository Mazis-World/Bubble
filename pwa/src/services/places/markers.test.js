import { createPlaceHtmlMarker, globePlacePoints } from './markers';

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
