import { render } from '@testing-library/react';
import BubbleCluster from '../components/bubble/BubbleCluster';
import { RADAR_BUBBLE_SIZE } from './radarLayout';

describe('BubbleCluster radar avatars', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 400 });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 400 });
  });

  test('renders equal-size bubbles at distinct positions when members share a location', () => {
    const house = { latitude: -26.2, longitude: 28.04 };
    const bubbleData = {
      currentMember: { id: 'me', name: 'Me', lastKnownLocation: house },
      allMembers: [
        { id: 'me', name: 'Me', lastKnownLocation: house },
        { id: 'a', name: 'Ada', lastKnownLocation: house },
        { id: 'b', name: 'Bo', lastKnownLocation: house },
      ],
    };

    const { container } = render(
      <BubbleCluster bubbleData={bubbleData} onStatusClick={() => {}} onMemberClick={() => {}} />
    );

    const wrappers = container.querySelectorAll('.member-bubble-wrapper');
    expect(wrappers.length).toBe(3);
    const positions = [...wrappers].map((el) => ({
      left: el.style.left,
      top: el.style.top,
      width: el.style.width,
      height: el.style.height,
    }));
    positions.forEach((pos) => {
      expect(pos.width).toBe(`${RADAR_BUBBLE_SIZE}px`);
      expect(pos.height).toBe(`${RADAR_BUBBLE_SIZE}px`);
    });
    const keys = new Set(positions.map((pos) => `${pos.left},${pos.top}`));
    expect(keys.size).toBe(3);
  });
});
