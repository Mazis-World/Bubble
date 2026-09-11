import { render, screen } from '@testing-library/react';
import PremiumSettings from './PremiumSettings';
import { FREE_MEMBER_LIMIT } from '../../services/billing';

describe('PremiumSettings', () => {
  test('shows the free plan and upgrade CTA for the FamilyBubble owner', () => {
    const onUpgrade = jest.fn();
    render(<PremiumSettings isSubscribed={false} isOwner onUpgrade={onUpgrade} />);
    expect(screen.getByText('Free plan')).toBeTruthy();
    expect(screen.getByText(new RegExp(`${FREE_MEMBER_LIMIT}`))).toBeTruthy();
    screen.getByRole('button', { name: /upgrade to premium/i }).click();
    expect(onUpgrade).toHaveBeenCalled();
  });

  test('tells members to contact the owner instead of signing up', () => {
    const onUpgrade = jest.fn();
    render(
      <PremiumSettings
        isSubscribed={false}
        isOwner={false}
        ownerName="Mom"
        onUpgrade={onUpgrade}
        onRestorePurchases={() => {}}
      />
    );
    expect(screen.getByText(/only mom can sign up/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /upgrade to premium/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /restore purchases/i })).toBeNull();
    screen.getByRole('button', { name: /contact the owner/i }).click();
    expect(onUpgrade).toHaveBeenCalled();
  });

  test('shows premium as unlocked', () => {
    render(<PremiumSettings isSubscribed />);
    expect(screen.getByText('FamilyBubble Premium')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /upgrade/i })).toBeNull();
  });
});
