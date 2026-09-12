import { fireEvent, render, screen } from '@testing-library/react';
import PlaceMapPicker from './PlaceMapPicker';

describe('Place detection radar', () => {
  const location = {
    latitude: 37.77,
    longitude: -122.41,
    address: '123 Main Street',
  };

  test('shows a radar bubble and length while adjusting detection', () => {
    const onRadiusChange = jest.fn();
    render(
      <PlaceMapPicker
        location={location}
        radiusMeters={200}
        onRadiusChange={onRadiusChange}
      />
    );

    expect(screen.getByLabelText(/detection radar, 200 m/i)).toBeTruthy();
    expect(screen.getByTestId('place-detection-bubble')).toBeTruthy();
    expect(screen.getByTestId('place-detection-length')).toBeTruthy();
    expect(screen.getAllByText('200 m').length).toBeGreaterThan(0);
    expect(screen.getByText(/this radar is the arrival bubble/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /select on map/i })).toBeNull();
    expect(screen.queryByLabelText(/tap the map/i)).toBeNull();

    fireEvent.change(screen.getByLabelText('Geofence radius'), { target: { value: '350' } });
    expect(onRadiusChange).toHaveBeenCalledWith(350);
  });

  test('does not show the detection radar before a location is chosen', () => {
    render(<PlaceMapPicker location={null} />);
    expect(screen.queryByLabelText(/detection radar/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /select on map/i })).toBeNull();
    expect(screen.getByText(/search or use your current location/i)).toBeTruthy();
  });
});
