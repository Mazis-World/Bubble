import { render, screen } from '@testing-library/react';
import GlobeView from './GlobeView';

jest.mock('react-globe.gl', () => {
  const React = require('react');
  return React.forwardRef(function MockGlobe(props, _ref) {
    return (
      <div data-testid="mock-globe">
        {(props.pointsData || []).map((point) => (
          <div key={point.member?.id || point.name}>{point.name}</div>
        ))}
        {(props.htmlElementsData || []).map((item) => (
          <div key={item.place.placeId} data-testid={`globe-place-${item.place.placeId}`}>
            {item.place.icon} {item.place.name}
          </div>
        ))}
      </div>
    );
  });
});

describe('Globe map place icons', () => {
  test('renders place icons on the map globe', () => {
    const house = { latitude: -26.2, longitude: 28.04 };
    render(
      <GlobeView
        bubbleData={{
          currentMember: { id: 'me', name: 'Me', lastKnownLocation: house },
          allMembers: [{ id: 'me', name: 'Me', lastKnownLocation: house }],
        }}
        places={[{
          placeId: 'home',
          name: 'Home',
          icon: '🏠',
          color: '#60a5fa',
          latitude: -26.2,
          longitude: 28.04,
        }]}
      />
    );
    expect(screen.getByTestId('globe-place-home').textContent).toContain('🏠');
    expect(screen.getByTestId('globe-place-home').textContent).toContain('Home');
  });
});
