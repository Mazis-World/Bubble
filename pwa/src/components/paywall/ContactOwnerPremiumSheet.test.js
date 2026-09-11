import { fireEvent, render, screen } from '@testing-library/react';
import ContactOwnerPremiumSheet from './ContactOwnerPremiumSheet';

describe('ContactOwnerPremiumSheet', () => {
  test('asks non-owners to contact the FamilyBubble owner by name', () => {
    const onClose = jest.fn();
    render(<ContactOwnerPremiumSheet ownerName="Mom" onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: /ask your familybubble owner/i })).toBeTruthy();
    expect(screen.getByText(/only mom can sign up for familybubble premium/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
