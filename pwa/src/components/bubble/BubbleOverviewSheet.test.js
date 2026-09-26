import { render, screen } from '@testing-library/react';
import BubbleOverviewSheet from './BubbleOverviewSheet';

jest.mock('../../services/memoMedia', () => ({
  formatVoiceDuration: (ms) => {
    const total = Math.max(0, Math.round((Number(ms) || 0) / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  },
}));

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
});
