import { render, screen } from '@testing-library/react';
import ProfileView from './ProfileView';
import BubbleNode from '../../models/BubbleNode';
import { getMemberStatusText } from '../../utils/timeUtils';

describe('member profile status', () => {
  test('keeps statusText on the bubble node', () => {
    const node = BubbleNode.fromFirestore({
      id: 'node-1',
      data: () => ({
        userId: 'user-2',
        name: 'Ada',
        status: '🏫',
        statusText: 'At school',
      }),
    });
    expect(node.statusText).toBe('At school');
    expect(node.toFirestore().statusText).toBe('At school');
  });

  test('shows the status emoji and message on the profile card', () => {
    render(
      <ProfileView
        member={{
          id: 'node-2',
          name: 'Bo',
          role: 'Dad',
          status: '🏫',
          statusText: 'At school',
        }}
        onClose={() => {}}
      />
    );
    const status = screen.getByTestId('profile-status');
    expect(status.textContent).toContain('🏫');
    expect(status.textContent).toContain('At school');
    expect(screen.getByText('Bo')).toBeTruthy();
  });

  test('trims empty status captions', () => {
    expect(getMemberStatusText({ statusText: '  ' })).toBe('');
    expect(getMemberStatusText({ statusText: ' At school ' })).toBe('At school');
  });
});
