import { render, screen } from '@testing-library/react';
import BubbleCluster from '../components/bubble/BubbleCluster';
import MapViewBadges from '../components/bubble/MapViewBadges';
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

  test('shows members, check-in, memos, and Places on the radar view', () => {
    const house = { latitude: -26.2, longitude: 28.04 };
    const bubbleData = {
      currentMember: { id: 'me', name: 'Me', lastKnownLocation: house },
      allMembers: [{ id: 'me', name: 'Me', lastKnownLocation: house }],
    };
    render(
      <BubbleCluster
        bubbleData={bubbleData}
        onStatusClick={() => {}}
        onMemberClick={() => {}}
        overlay={(
          <MapViewBadges
            memberCount={4}
            memoCount={2}
            onMemberCountClick={() => {}}
            onMemosClick={() => {}}
            onCheckIn={() => {}}
            onPlacesClick={() => {}}
          />
        )}
      />
    );
    expect(screen.getByRole('button', { name: /4 Members/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Check in' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /2 Memos/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Open Places/ })).toBeTruthy();
  });

  test('updates the status emoji on the radar when member status changes', () => {
    const house = { latitude: -26.2, longitude: 28.04 };
    const bubbleData = {
      currentMember: { id: 'me', name: 'Me', status: '✅', lastKnownLocation: house },
      allMembers: [{ id: 'me', name: 'Me', status: '✅', lastKnownLocation: house }],
    };

    const { rerender } = render(
      <BubbleCluster bubbleData={bubbleData} onStatusClick={() => {}} onMemberClick={() => {}} />
    );
    expect(screen.getByText('✅')).toBeTruthy();

    rerender(
      <BubbleCluster
        bubbleData={{
          currentMember: { id: 'me', name: 'Me', status: '🏠', lastKnownLocation: house },
          allMembers: [{ id: 'me', name: 'Me', status: '🏠', lastKnownLocation: house }],
        }}
        onStatusClick={() => {}}
        onMemberClick={() => {}}
      />
    );
    expect(screen.getByText('🏠')).toBeTruthy();
    expect(screen.queryByText('✅')).toBeNull();
  });

  test('shows place icons on the radar and opens a place on tap', () => {
    const house = { latitude: -26.2, longitude: 28.04 };
    const bubbleData = {
      currentMember: { id: 'me', name: 'Me', lastKnownLocation: house },
      allMembers: [{ id: 'me', name: 'Me', lastKnownLocation: house }],
    };
    const onPlaceClick = jest.fn();
    render(
      <BubbleCluster
        bubbleData={bubbleData}
        onStatusClick={() => {}}
        onMemberClick={() => {}}
        onPlaceClick={onPlaceClick}
        places={[{
          placeId: 'school',
          name: 'School',
          icon: '🏫',
          color: '#34d399',
          latitude: -26.21,
          longitude: 28.05,
        }]}
      />
    );
    const marker = screen.getByRole('button', { name: 'School place' });
    expect(marker.textContent).toContain('🏫');
    expect(marker.textContent).toContain('School');
    marker.click();
    expect(onPlaceClick).toHaveBeenCalledWith(expect.objectContaining({ placeId: 'school' }));
  });
});
