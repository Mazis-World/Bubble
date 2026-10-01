import { fireEvent, render, screen } from '@testing-library/react';
import BubblePopup from './BubblePopup';

describe('BubblePopup', () => {
  test('shows a centered popup that can close', () => {
    const onClose = jest.fn();
    render(
      <BubblePopup isOpen title="Join a bubble" onClose={onClose}>
        <p>Paste a code</p>
      </BubblePopup>
    );
    expect(screen.getByTestId('bubble-popup')).toBeTruthy();
    expect(screen.getByText('Join a bubble')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close popup' }));
    expect(onClose).toHaveBeenCalled();
  });
});
