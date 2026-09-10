import { fireEvent, render, screen } from '@testing-library/react';
import CheckInPopup from './CheckInPopup';

describe('Check in popup', () => {
  test('stays hidden until opened so it cannot peek over the SOS dock', () => {
    const { container } = render(
      <div className="relative">
        <CheckInPopup open={false} state="idle" onConfirm={() => {}} onClose={() => {}} />
      </div>
    );
    const popup = container.querySelector('section[aria-label="Check in"]');
    expect(popup.getAttribute('aria-hidden')).toBe('true');
    expect(popup.className).toContain('invisible');
  });

  test('idle overlay matches the demo fragment', () => {
    render(
      <CheckInPopup open state="idle" onConfirm={() => {}} onClose={() => {}} />
    );
    expect(screen.getByText('Map')).toBeTruthy();
    expect(screen.getAllByText('Check in').length).toBeGreaterThan(0);
    expect(screen.getByText(/without changing your status/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Check in' })).toBeTruthy();
  });

  test('busy state shows finding your location', () => {
    render(
      <CheckInPopup open state="busy" onConfirm={() => {}} onClose={() => {}} />
    );
    expect(screen.getByText('Finding your location…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Checking in…' }).disabled).toBe(true);
  });

  test('done state shows the checked-in memo row', () => {
    render(
      <CheckInPopup
        open
        state="done"
        member={{ name: 'Ada' }}
        memo={{ message: 'Checked in · Home', createdAt: Date.now() }}
        onConfirm={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('You’re on the family globe.')).toBeTruthy();
    expect(screen.getByText('📍 Checked in Ada')).toBeTruthy();
    expect(screen.getByText('Checked in · Home')).toBeTruthy();
    expect(screen.getByText(/family memo sent/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Checked in' }).disabled).toBe(true);
  });

  test('scrim does not close while check-in is in progress', () => {
    const onClose = jest.fn();
    render(
      <CheckInPopup open state="busy" onConfirm={() => {}} onClose={onClose} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close check in' }));
    expect(onClose).not.toHaveBeenCalled();
  });
});
