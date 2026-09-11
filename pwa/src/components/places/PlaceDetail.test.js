import { fireEvent, render, screen } from '@testing-library/react';
import PlaceDetail from './PlaceDetail';

jest.mock('../../hooks/usePlaces', () => ({
  usePlaceActivity: () => ([
    {
      eventId: 'e1',
      userId: 'dad',
      eventType: 'ARRIVED',
      source: 'GEOFENCE',
      timestamp: Date.now(),
    },
    {
      eventId: 'e2',
      userId: 'emma',
      eventType: 'CHECKED_IN',
      source: 'MANUAL',
      timestamp: Date.now() - 1000,
    },
  ]),
}));

jest.mock('./PlaceMapPreview', () => ({
  __esModule: true,
  default: () => <div>map-preview</div>,
}));

describe('Place detail', () => {
  const place = {
    placeId: 'home',
    ownerId: 'mom',
    name: 'Home',
    type: 'home',
    icon: '🏠',
    address: '123 Main Street',
    latitude: 37.77,
    longitude: -122.41,
    radiusMeters: 200,
    arrivalNotificationsEnabled: true,
    departureNotificationsEnabled: true,
    recipientUserIds: ['dad', 'emma'],
  };
  const members = [
    { userId: 'mom', name: 'Mom' },
    { userId: 'dad', name: 'Dad' },
    { userId: 'emma', name: 'Emma' },
  ];

  test('shows status, recipients, check-in, and activity', () => {
    const onCheckIn = jest.fn();
    render(
      <PlaceDetail
        place={place}
        bubbleId="b1"
        members={members}
        presence={[{ placeId: 'home', userId: 'dad', inside: true }]}
        currentUserId="mom"
        onCheckIn={onCheckIn}
      />
    );
    expect(screen.getByText('123 Main Street')).toBeTruthy();
    expect(screen.getByText('Dad is home')).toBeTruthy();
    expect(screen.getByText('Arrival ON')).toBeTruthy();
    expect(screen.getByText('Dad ✓')).toBeTruthy();
    expect(screen.getByText(/Dad arrived/)).toBeTruthy();
    expect(screen.getByText(/Emma checked in/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Check In' }));
    expect(onCheckIn).toHaveBeenCalled();
  });

  test('confirms delete and home address updates', () => {
    const onDelete = jest.fn();
    render(
      <PlaceDetail
        place={place}
        bubbleId="b1"
        members={members}
        currentUserId="mom"
        onDelete={onDelete}
        onEdit={() => {}}
        onUpdateHome={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Delete Place' }));
    expect(screen.getByText('Delete Home?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalled();
  });
});
