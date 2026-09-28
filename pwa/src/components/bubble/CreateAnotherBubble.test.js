import { fireEvent, render, screen } from '@testing-library/react';
import CreateAnotherBubble from './CreateAnotherBubble';

describe('CreateAnotherBubble', () => {
  test('creates a second family bubble from a name and role', () => {
    const onSubmit = jest.fn();
    render(<CreateAnotherBubble onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Bubble name'), {
      target: { value: "Mom's Family" },
    });
    fireEvent.click(screen.getByText('Select your role'));
    fireEvent.click(screen.getByText('Mom'));
    fireEvent.click(screen.getByRole('button', { name: 'Create bubble' }));

    expect(onSubmit).toHaveBeenCalledWith({
      bubbleName: "Mom's Family",
      relationshipRole: 'Mom',
      firstName: '',
      lastName: '',
    });
  });

  test('asks for a name when the user has no profile yet', () => {
    const onSubmit = jest.fn();
    render(<CreateAnotherBubble needProfileNames onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Bubble name'), {
      target: { value: "Mom's Family" },
    });
    fireEvent.click(screen.getByText('Select your role'));
    fireEvent.click(screen.getByText('Daughter'));
    expect(screen.getByRole('button', { name: 'Create bubble' }).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'Lovelace' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create bubble' }));

    expect(onSubmit).toHaveBeenCalledWith({
      bubbleName: "Mom's Family",
      relationshipRole: 'Daughter',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
  });
});
