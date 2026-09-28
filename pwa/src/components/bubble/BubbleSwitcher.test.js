import { fireEvent, render, screen } from '@testing-library/react';
import BubbleSwitcher from './BubbleSwitcher';

describe('BubbleSwitcher', () => {
  const bubbles = [
    { id: 'dad', name: "Dad's Family" },
    { id: 'mom', name: "Mom's Family" },
  ];

  test('shows the current bubble name and lets you swipe to the other one', () => {
    const onSwitch = jest.fn();
    render(
      <BubbleSwitcher
        bubbles={bubbles}
        currentId="dad"
        onSwitch={onSwitch}
        onCreate={() => {}}
      />
    );

    expect(screen.getByText("Dad's Family")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next bubble' }));
    expect(onSwitch).toHaveBeenCalledWith('mom');

    const strip = screen.getByText("Dad's Family").parentElement;
    fireEvent.pointerDown(strip, { clientX: 180, clientY: 12, pointerId: 1, button: 0 });
    fireEvent.pointerUp(strip, { clientX: 40, clientY: 14, pointerId: 1, button: 0 });
    expect(onSwitch).toHaveBeenCalledWith('mom');
  });

  test('dot and plus buttons switch or create', () => {
    const onSwitch = jest.fn();
    const onCreate = jest.fn();
    render(
      <BubbleSwitcher
        bubbles={bubbles}
        currentId="dad"
        onSwitch={onSwitch}
        onCreate={onCreate}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: "Switch to Mom's Family" }));
    expect(onSwitch).toHaveBeenCalledWith('mom');
    fireEvent.click(screen.getByRole('button', { name: 'Create another bubble' }));
    expect(onCreate).toHaveBeenCalled();
  });
});
