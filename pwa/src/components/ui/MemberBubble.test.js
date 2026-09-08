import { render, screen } from '@testing-library/react';
import MemberBubble, { MEMBER_BUBBLE_SIZE_CLASS } from './MemberBubble';

const portraitPhoto = 'https://example.com/tall-portrait.jpg';

describe('MemberBubble', () => {
  it('constrains owner photos to a square circle instead of the image intrinsic size', () => {
    render(
      <MemberBubble
        member={{
          id: 'owner-1',
          name: 'Buddy',
          type: 'owner',
          tier: 1,
          photoUrl: portraitPhoto,
          status: '😊',
        }}
      />
    );

    const bubble = screen.getByTestId('member-bubble');
    expect(bubble).toHaveClass('member-bubble');
    expect(bubble).toHaveClass('aspect-square');
    expect(bubble.className).toContain('w-[72px]');
    expect(bubble.className).toContain('h-[72px]');
    expect(bubble.className).not.toMatch(/(^|\s)w-18(\s|$)/);
    expect(bubble.className).not.toMatch(/(^|\s)h-18(\s|$)/);
    expect(bubble.className).toContain(MEMBER_BUBBLE_SIZE_CLASS.owner);

    const img = screen.getByAltText('Buddy');
    expect(img).toHaveClass('object-cover');
    expect(img).toHaveClass('absolute');
    expect(screen.getByTestId('member-bubble-face')).toHaveClass('overflow-hidden');
  });

  it('keeps non-owner photos circular with a fixed size class', () => {
    render(
      <MemberBubble
        member={{
          id: 'member-2',
          name: 'Alex',
          tier: 2,
          photoUrl: portraitPhoto,
          status: '⚪',
        }}
      />
    );

    const bubble = screen.getByTestId('member-bubble');
    expect(bubble.className).toContain(MEMBER_BUBBLE_SIZE_CLASS.tier2);
    expect(screen.getByAltText('Alex')).toHaveClass('object-cover');
  });

  it('renders the YOU badge for the current user without changing photo cropping', () => {
    render(
      <MemberBubble
        isCenter
        member={{
          id: 'you',
          name: 'You',
          tier: 2,
          photoUrl: portraitPhoto,
        }}
      />
    );

    expect(screen.getByText('YOU')).toBeInTheDocument();
    expect(screen.getByAltText('You')).toHaveClass('object-cover');
  });
});
