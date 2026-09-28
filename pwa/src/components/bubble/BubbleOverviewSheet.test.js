import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BubbleOverviewSheet from './BubbleOverviewSheet';

jest.mock('../../services/memoMedia', () => {
  const actual = jest.requireActual('../../services/memoMedia');
  return {
    ...actual,
    formatVoiceDuration: (ms) => {
      const total = Math.max(0, Math.round((Number(ms) || 0) / 1000));
      const minutes = Math.floor(total / 60);
      const seconds = total % 60;
      return `${minutes}:${String(seconds).padStart(2, '0')}`;
    },
  };
});

describe('Bubble overview sheets', () => {
  const members = [
    { id: 'n1', userId: 'u1', name: 'Ada', status: '🏫', statusText: 'At school' },
  ];
  const memos = [
    { memoId: 'm1', userId: 'u1', nodeId: 'n1', type: 'status', status: '🏫', message: 'At school' },
  ];

  test('members sheet does not include family memos', () => {
    render(
      <BubbleOverviewSheet
        section="members"
        members={members}
        memos={memos}
        onMemberClick={() => {}}
      />
    );
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.queryByText('Family Memos')).toBeNull();
    expect(screen.queryByText('At school')).toBeTruthy();
  });

  test('memos sheet does not list the member roster', () => {
    render(
      <BubbleOverviewSheet
        section="memos"
        members={members}
        memos={memos}
        bubbleName="Home"
        onMemoClick={() => {}}
      />
    );
    expect(screen.getByText(/Status updates from Home/)).toBeTruthy();
    expect(screen.getByText('At school')).toBeTruthy();
    expect(screen.queryByText('1 Member')).toBeNull();
  });

  test('check-in memos use the location pin instead of a status emoji', () => {
    render(
      <BubbleOverviewSheet
        section="memos"
        members={members}
        memos={[
          { memoId: 'm2', userId: 'u1', nodeId: 'n1', type: 'checkin', status: '📍', message: 'Checked in' },
        ]}
        bubbleName="Home"
        onMemoClick={() => {}}
      />
    );
    expect(screen.getByText(/📍 Checked in/)).toBeTruthy();
    expect(screen.getByText('Checked in')).toBeTruthy();
  });

  test('status memos can show a photo and a voice note', () => {
    render(
      <BubbleOverviewSheet
        section="memos"
        members={members}
        memos={[
          {
            memoId: 'm3',
            userId: 'u1',
            nodeId: 'n1',
            type: 'status',
            status: '😊',
            message: 'Made it home',
            photoUrl: 'https://example.com/home.jpg',
            voiceUrl: 'https://example.com/home.webm',
            voiceDurationMs: 4200,
          },
        ]}
        bubbleName="Home"
        onMemoClick={() => {}}
      />
    );
    expect(screen.getByAltText('Attached to this status update')).toBeTruthy();
    expect(screen.getByLabelText('Voice memo')).toBeTruthy();
    expect(screen.getByText('Voice note · 0:04')).toBeTruthy();
  });

  test('status memos adjust the photo layout for several images', () => {
    const { container } = render(
      <BubbleOverviewSheet
        section="memos"
        members={members}
        memos={[
          {
            memoId: 'm3b',
            userId: 'u1',
            nodeId: 'n1',
            type: 'status',
            status: '😊',
            message: 'Kitchen pics',
            photoUrls: [
              'https://example.com/one.jpg',
              'https://example.com/two.jpg',
              'https://example.com/three.jpg',
            ],
          },
        ]}
        bubbleName="Home"
        onMemoClick={() => {}}
      />
    );
    expect(container.querySelector('[data-photo-layout="triple"]')).toBeTruthy();
    expect(screen.getByAltText('Attached to this status update')).toBeTruthy();
    expect(screen.getByAltText('Attached photo 2')).toBeTruthy();
    expect(screen.getByAltText('Attached photo 3')).toBeTruthy();
  });

  test('place memos show the family-friendly message', () => {
    render(
      <BubbleOverviewSheet
        section="memos"
        members={members}
        memos={[
          { memoId: 'm4', userId: 'u1', nodeId: 'n1', type: 'place', message: '🏠 Ada arrived home' },
        ]}
        bubbleName="Home"
        onMemoClick={() => {}}
      />
    );
    expect(screen.getByText('🏠 Ada arrived home')).toBeTruthy();
  });

  test('status memos hide the emoji tray until plus is tapped and can share', async () => {
    const onMemoReact = jest.fn();
    const onMemoClick = jest.fn();
    const writeText = jest.fn().mockResolvedValue(undefined);
    const originalShare = navigator.share;
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

    render(
      <BubbleOverviewSheet
        section="memos"
        members={members}
        memos={[
          {
            memoId: 'm5',
            userId: 'u1',
            nodeId: 'n1',
            type: 'status',
            status: '😊',
            message: 'Made it home',
            reactions: { u2: '❤️', u1: '👍' },
          },
        ]}
        bubbleName="Home"
        currentUserId="u1"
        onMemoClick={onMemoClick}
        onMemoReact={onMemoReact}
      />
    );

    expect(screen.getByLabelText('Reactions on this memo')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'React with thumbs up, 1' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'React with heart, 1' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByRole('button', { name: 'React with laugh' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'React with wow' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'React with sad' })).toBeNull();

    expect(screen.getByRole('button', { name: 'Share this memo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Share this memo' }).textContent).toContain('Share');

    fireEvent.click(screen.getByRole('button', { name: 'Add reaction' }));
    expect(screen.getByRole('listbox', { name: 'Choose a reaction' })).toBeTruthy();
    fireEvent.click(screen.getByRole('option', { name: 'React with laugh' }));
    expect(onMemoReact).toHaveBeenCalledWith(expect.objectContaining({ memoId: 'm5' }), '😂');
    expect(onMemoClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Share this memo' }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toContain('Made it home');
    expect(writeText.mock.calls[0][0]).toContain('memo=m5');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Share this memo' }).textContent).toContain('Copied'));
    expect(onMemoClick).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'share', { configurable: true, value: originalShare });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
  });

  test('asks once more before deleting a memo', () => {
    const onMemoDelete = jest.fn();
    const onMemoClick = jest.fn();
    render(
      <BubbleOverviewSheet
        section="memos"
        members={members}
        memos={memos}
        bubbleName="Home"
        currentUserId="u1"
        onMemoClick={onMemoClick}
        onMemoDelete={onMemoDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete this memo' }));
    expect(onMemoDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete memo' }));
    expect(onMemoDelete).toHaveBeenCalledWith(expect.objectContaining({ memoId: 'm1' }));
    expect(onMemoClick).not.toHaveBeenCalled();
  });

  test('does not show delete on someone else’s memo', () => {
    render(
      <BubbleOverviewSheet
        section="memos"
        members={members}
        memos={memos}
        bubbleName="Home"
        currentUserId="u2"
        onMemoDelete={() => {}}
      />
    );
    expect(screen.queryByRole('button', { name: 'Delete this memo' })).toBeNull();
  });
});
