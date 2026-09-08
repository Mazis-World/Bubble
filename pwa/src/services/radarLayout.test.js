import {
  RADAR_BUBBLE_GAP,
  RADAR_BUBBLE_SIZE,
  distanceBetween,
  layoutRadarNodes,
  separateOverlappingNodes,
} from './radarLayout';

const sameHouse = { latitude: -26.2, longitude: 28.04 };

describe('radar layout', () => {
  test('keeps the current user at the center', () => {
    const nodes = layoutRadarNodes({
      members: [
        { id: 'me', lastKnownLocation: sameHouse },
        { id: 'mom', lastKnownLocation: { latitude: -26.21, longitude: 28.05 } },
      ],
      currentMemberId: 'me',
      width: 400,
      height: 400,
    });
    const me = nodes.find((node) => node.id === 'me');
    expect(me.x).toBe(200);
    expect(me.y).toBe(200);
  });

  test('spreads members who share the same GPS so bubbles do not overlap', () => {
    const nodes = layoutRadarNodes({
      members: [
        { id: 'me', lastKnownLocation: sameHouse },
        { id: 'a', lastKnownLocation: sameHouse },
        { id: 'b', lastKnownLocation: sameHouse },
        { id: 'c', lastKnownLocation: sameHouse },
      ],
      currentMemberId: 'me',
      width: 400,
      height: 400,
    });
    const others = nodes.filter((node) => node.id !== 'me');
    expect(others).toHaveLength(3);
    for (let i = 0; i < others.length; i += 1) {
      expect(distanceBetween(nodes.find((node) => node.id === 'me'), others[i]))
        .toBeGreaterThanOrEqual(RADAR_BUBBLE_SIZE + RADAR_BUBBLE_GAP - 1);
      for (let j = i + 1; j < others.length; j += 1) {
        expect(distanceBetween(others[i], others[j]))
          .toBeGreaterThanOrEqual(RADAR_BUBBLE_SIZE + RADAR_BUBBLE_GAP - 1);
      }
    }
  });

  test('places members without location evenly instead of stacking them', () => {
    const nodes = layoutRadarNodes({
      members: [
        { id: 'me' },
        { id: 'a' },
        { id: 'b' },
        { id: 'c' },
      ],
      currentMemberId: 'me',
      width: 400,
      height: 400,
    });
    const others = nodes.filter((node) => node.id !== 'me');
    const distances = others.map((node) => distanceBetween(nodes[0], node));
    const unique = new Set(others.map((node) => `${Math.round(node.x)}:${Math.round(node.y)}`));
    expect(unique.size).toBe(3);
    distances.forEach((dist) => {
      expect(dist).toBeGreaterThan(40);
    });
  });

  test('does not move a pinned bubble while separating a pair', () => {
    const separated = separateOverlappingNodes(
      [
        { id: 'me', x: 200, y: 200 },
        { id: 'other', x: 202, y: 200 },
      ],
      { centerX: 200, centerY: 200, maxRadius: 160, pinnedId: 'me' }
    );
    expect(separated[0].x).toBe(200);
    expect(separated[0].y).toBe(200);
    expect(distanceBetween(separated[0], separated[1]))
      .toBeGreaterThanOrEqual(RADAR_BUBBLE_SIZE + RADAR_BUBBLE_GAP - 1);
  });
});
