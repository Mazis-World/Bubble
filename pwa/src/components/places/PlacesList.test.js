import { fireEvent, render, screen } from '@testing-library/react';
import PlacesList from './PlacesList';
import { PLACE_LIMIT_MESSAGE } from '../../services/places/constants';

const members = [
  { userId: 'dad', name: 'Dad' },
  { userId: 'emma', name: 'Emma' },
  { userId: 'mom', name: 'Mom' },
];

describe('Places list', () => {
  test('empty state invites the family to add a place', () => {
    const onAdd = jest.fn();
    render(
      <PlacesList
        places={[]}
        members={members}
        currentUserId="mom"
        onAdd={onAdd}
      />
    );
    expect(screen.getByText('Your important places')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /add place/i }));
    expect(onAdd).toHaveBeenCalled();
  });

  test('shows status, last activity, and used count', () => {
    render(
      <PlacesList
        currentUserId="mom"
        members={members}
        presence={[{ placeId: 'home', userId: 'dad', inside: true }]}
        places={[{
          placeId: 'home',
          ownerId: 'mom',
          name: 'Home',
          icon: '🏠',
          type: 'home',
          createdAt: Date.now(),
        }]}
      />
    );
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Dad is home')).toBeTruthy();
    expect(screen.getByText('1 of 3 Places used')).toBeTruthy();
  });

  test('blocks a fourth place with a friendly message', () => {
    const onAdd = jest.fn();
    const places = ['Home', 'School', 'Work'].map((name, index) => ({
      placeId: String(index),
      ownerId: 'mom',
      name,
      icon: '📍',
      type: 'custom',
    }));
    render(
      <PlacesList
        currentUserId="mom"
        members={members}
        places={places}
        onAdd={onAdd}
      />
    );
    expect(screen.getByText('3 of 3 Places used')).toBeTruthy();
    expect(screen.getByRole('button', { name: /add place/i }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /add place/i }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText(PLACE_LIMIT_MESSAGE)).toBeTruthy();
  });
});
