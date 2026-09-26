import { fireEvent, render, screen } from '@testing-library/react';
import AddPlaceFlow from './AddPlaceFlow';

jest.mock('./PlaceMapPicker', () => ({
  __esModule: true,
  default: ({ onLocationSet }) => (
    <button
      type="button"
      onClick={() => onLocationSet({
        latitude: 37.77,
        longitude: -122.41,
        address: '123 Main Street',
      })}
    >
      Use test location
    </button>
  ),
}));

describe('Add Place flow', () => {
  const members = [
    { userId: 'mom', name: 'Mom' },
    { userId: 'dad', name: 'Dad' },
    { userId: 'emma', name: 'Emma' },
  ];

  test('walks through name, location, and save', () => {
    const onSave = jest.fn();
    render(
      <AddPlaceFlow
        members={members}
        currentUserId="mom"
        existingPlaces={[]}
        onCancel={() => {}}
        onSave={onSave}
      />
    );
    fireEvent.click(screen.getByText('Home'));
    expect(screen.getByRole('button', { name: /places/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^back$/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('button', { name: /^back$/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /places/i })).toBeNull();
    fireEvent.click(screen.getByText('Use test location'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Place' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Home',
      type: 'home',
      latitude: 37.77,
      arrivalNotificationsEnabled: true,
      departureNotificationsEnabled: true,
    }));
  });
});
