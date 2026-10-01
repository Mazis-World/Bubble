import { fireEvent, render, screen } from '@testing-library/react';
import BubbleSwitcher from './BubbleSwitcher';

describe('BubbleSwitcher', () => {
  const bubbles = [
    {
      id: 'dad',
      name: "Dad's Family",
      members: [
        { id: 'u1', name: 'Ada', photoUrl: 'https://example.com/ada.jpg' },
        { id: 'u2', name: 'Bob' },
      ],
    },
    { id: 'mom', name: "Mom's Family", members: [{ id: 'u3', name: 'Cara', photoUrl: 'https://example.com/cara.jpg' }] },
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
    expect(document.querySelector('img[src="https://example.com/ada.jpg"]')).toBeTruthy();
    expect(document.querySelector('img[src="https://example.com/cara.jpg"]')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
    expect(screen.getAllByTestId('mini-member-photo')).toHaveLength(3);
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

  test('renders every family member as a tiny photo bubble', () => {
    const members = [
      { id: 'u1', name: 'Ada', photoUrl: 'https://example.com/ada.jpg' },
      { id: 'u2', name: 'Bob', photoUrl: 'https://example.com/bob.jpg' },
      { id: 'u3', name: 'Cara', photoUrl: 'https://example.com/cara.jpg' },
      { id: 'u4', name: 'Dan' },
      { id: 'u5', name: 'Eve' },
      { id: 'u6', name: 'Fay' },
    ];
    render(
      <BubbleSwitcher
        bubbles={[{ id: 'dad', name: "Dad's Family", members }]}
        currentId="dad"
        onSwitch={() => {}}
        onCreate={() => {}}
      />
    );

    expect(screen.getAllByTestId('mini-member-photo')).toHaveLength(6);
    expect(document.querySelector('img[src="https://example.com/ada.jpg"]')).toBeTruthy();
    expect(document.querySelector('img[src="https://example.com/bob.jpg"]')).toBeTruthy();
    expect(document.querySelector('img[src="https://example.com/cara.jpg"]')).toBeTruthy();
    expect(screen.getByText('D')).toBeTruthy();
    expect(screen.getByText('E')).toBeTruthy();
    expect(screen.getByText('F')).toBeTruthy();
    const face = screen.getAllByTestId('mini-member-photo')[0];
    expect(Number.parseFloat(face.style.width)).toBeLessThanOrEqual(16);
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
