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

  test('skips inactive or unlocated places on the globe', () => {
    const points = globePlacePoints([
      { placeId: 'home', name: 'Home', icon: '🏠', latitude: 1, longitude: 2 },
      { placeId: 'ghost', name: 'Ghost', icon: '👻', isActive: false, latitude: 3, longitude: 4 },
      { placeId: 'nowhere', name: 'Nowhere', icon: '📍' },
    ]);
    expect(points).toEqual([
      { lat: 1, lng: 2, place: expect.objectContaining({ placeId: 'home' }) },
    ]);
  });
});
