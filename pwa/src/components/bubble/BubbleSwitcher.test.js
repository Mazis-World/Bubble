import { fireEvent, render, screen } from '@testing-library/react';
import BubbleSwitcher from './BubbleSwitcher';

describe('BubbleSwitcher', () => {
  const bubbles = [
    { id: 'dad', name: "Dad's Family" },
    { id: 'mom', name: "Mom's Family" },
  ];

  test('hides names until you swipe through mini bubbles', () => {
    const onSwitch = jest.fn();
    render(
      <BubbleSwitcher
        bubbles={bubbles}
        currentId="dad"
        onSwitch={onSwitch}
        onCreate={() => {}}
      />
    );

    expect(screen.queryByText("Dad's Family")).toBeNull();
    const strip = screen.getByTestId('bubble-switcher-track');
    fireEvent.mouseDown(strip, { clientX: 180, clientY: 12, button: 0 });
    fireEvent.mouseUp(strip, { clientX: 40, clientY: 14, button: 0 });
    expect(onSwitch).toHaveBeenCalledWith('mom');
    expect(screen.getByText("Mom's Family")).toBeTruthy();
  });

  test('keeps plus on the right and opens create from the last mini bubble', () => {
    const onSwitch = jest.fn();
    const onCreate = jest.fn();
    render(
      <BubbleSwitcher
        bubbles={bubbles}
        currentId="mom"
        onSwitch={onSwitch}
        onCreate={onCreate}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: "Switch to Mom's Family" }));
    expect(onSwitch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Create another bubble' }));
    expect(onCreate).toHaveBeenCalled();

    const strip = screen.getByTestId('bubble-switcher-track');
    fireEvent.mouseDown(strip, { clientX: 180, clientY: 12, button: 0 });
    fireEvent.mouseUp(strip, { clientX: 40, clientY: 14, button: 0 });
    expect(onCreate).toHaveBeenCalledTimes(2);
  });

  test('shows create even when the user already has one bubble', () => {
    const onCreate = jest.fn();
    render(
      <BubbleSwitcher
        bubbles={[{ id: 'dad', name: "Dad's Family" }]}
        currentId="dad"
        onSwitch={() => {}}
        onCreate={onCreate}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create another bubble' }));
    expect(onCreate).toHaveBeenCalled();
  });
});
