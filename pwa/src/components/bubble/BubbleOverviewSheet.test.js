import { render, screen } from '@testing-library/react';
import BubbleOverviewSheet from './BubbleOverviewSheet';

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
});
