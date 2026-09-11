import { render, screen } from '@testing-library/react';
import MapViewBadges from './MapViewBadges';

describe('Map view badges', () => {
  test('puts a location-pin check-in chip under members on the left', () => {
    render(
      <div className="relative">
        <MapViewBadges
          memberCount={3}
          memoCount={2}
          onMemberCountClick={() => {}}
          onMemosClick={() => {}}
          onCheckIn={() => {}}
          onPlacesClick={() => {}}
        />
      </div>
    );

    const checkIn = screen.getByRole('button', { name: 'Check in' });
    const members = screen.getByRole('button', { name: /3 Members/ });
    expect(checkIn.textContent).toContain('Check in');
    expect(checkIn.querySelector('svg')).toBeTruthy();
    expect(checkIn.querySelector('svg').getAttribute('class')).toContain('text-blue-400');
    expect(checkIn.querySelector('svg').getAttribute('class')).toContain('text-blue-400');
    expect(members.compareDocumentPosition(checkIn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const memos = screen.getByRole('button', { name: /2 Memos/ });
    const places = screen.getByRole('button', { name: /Open Places/ });
    expect(places.textContent).toContain('Places');
    expect(memos.compareDocumentPosition(places) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('disables check-in while a location read is in progress', () => {
    render(
      <MapViewBadges
        memberCount={1}
        onCheckIn={() => {}}
        checkInState="busy"
      />
    );
    expect(screen.getByRole('button', { name: 'Checking in…' }).disabled).toBe(true);
  });
});
