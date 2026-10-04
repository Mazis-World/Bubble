import { fireEvent, render, screen } from '@testing-library/react';
import AppTour from './AppTour';
import { APP_TOUR_STORAGE_KEY } from '../../services/appTour';

describe('AppTour', () => {
  beforeEach(() => {
    localStorage.clear();
    Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
      if (this.getAttribute?.('data-tour') === 'checkin') {
        return {
          left: 20, top: 120, width: 110, height: 40, right: 130, bottom: 160, x: 20, y: 120, toJSON() {},
        };
      }
      return {
        left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() {},
      };
    };
  });

  test('spotlights check-in then saves when you skip', () => {
    const onClose = jest.fn();
    const onStep = jest.fn();
    render(
      <div>
        <button type="button" data-tour="checkin">Check in</button>
        <AppTour
          open
          onClose={onClose}
          onStep={onStep}
          steps={[
            { id: 'welcome', title: 'Welcome', body: 'Home base.', target: null, placement: 'center' },
            { id: 'checkin', title: 'Check in', body: 'Ping family.', target: 'checkin', placement: 'bottom' },
          ]}
        />
      </div>
    );

    expect(screen.getByTestId('app-tour')).toBeTruthy();
    expect(screen.getByText('Welcome')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Check in' })).toBeTruthy();
    expect(screen.getByTestId('app-tour-spotlight')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(onClose).toHaveBeenCalled();
    expect(localStorage.getItem(APP_TOUR_STORAGE_KEY)).toBe('1');
  });
});
