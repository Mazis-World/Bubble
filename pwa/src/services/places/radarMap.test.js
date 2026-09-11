import {
  detectionRadiusPixels,
  formatDetectionLength,
  latLngFromMapClick,
  metersPerPixelAt,
  zoomToFitDetectionRadius,
} from './radarMap';

describe('Place detection radar map math', () => {
  test('formats the bubble length in meters', () => {
    expect(formatDetectionLength(200)).toBe('200 m');
    expect(formatDetectionLength(40)).toBe('75 m');
  });

  test('a larger detection radius covers more pixels at the same zoom', () => {
    const small = detectionRadiusPixels({
      latitude: 37.77,
      zoom: 16,
      radiusMeters: 100,
    });
    const large = detectionRadiusPixels({
      latitude: 37.77,
      zoom: 16,
      radiusMeters: 400,
    });
    expect(large).toBeGreaterThan(small);
    expect(large / small).toBeCloseTo(4, 5);
  });

  test('zooms out so a larger bubble still fits on the map', () => {
    const tight = zoomToFitDetectionRadius({
      latitude: 37.77,
      radiusMeters: 75,
      mapSize: 280,
    });
    const wide = zoomToFitDetectionRadius({
      latitude: 37.77,
      radiusMeters: 500,
      mapSize: 280,
    });
    expect(wide).toBeLessThanOrEqual(tight);
    const fitted = detectionRadiusPixels({
      latitude: 37.77,
      zoom: wide,
      radiusMeters: 500,
    });
    expect(fitted * 2).toBeLessThanOrEqual(280);
  });

  test('converts a map tap east of center into a more eastern longitude', () => {
    const origin = { latitude: 37.77, longitude: -122.41 };
    const next = latLngFromMapClick({
      ...origin,
      zoom: 16,
      width: 320,
      height: 280,
      clientX: 260,
      clientY: 140,
      left: 0,
      top: 0,
    });
    expect(next.longitude).toBeGreaterThan(origin.longitude);
    expect(metersPerPixelAt(origin.latitude, 16)).toBeGreaterThan(0);
  });
});
