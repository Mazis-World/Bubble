import { render, screen } from '@testing-library/react';
import PremiumSettings from './PremiumSettings';
import { FREE_MEMBER_LIMIT } from '../../services/billing';

describe('PremiumSettings', () => {
  test('shows the free plan and upgrade CTA', () => {
    const onUpgrade = jest.fn();
    render(<PremiumSettings isSubscribed={false} onUpgrade={onUpgrade} />);
    expect(screen.getByText('Free plan')).toBeTruthy();
    expect(screen.getByText(new RegExp(`${FREE_MEMBER_LIMIT}`))).toBeTruthy();
    screen.getByRole('button', { name: /upgrade to premium/i }).click();
    expect(onUpgrade).toHaveBeenCalled();
  });

  test('shows premium as unlocked', () => {
    render(<PremiumSettings isSubscribed />);
    expect(screen.getByText('FamilyBubble Premium')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /upgrade/i })).toBeNull();
  });
});
