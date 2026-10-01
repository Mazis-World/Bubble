import { render, screen } from '@testing-library/react';
import MemoPhotoGrid, { memoPhotoLayout } from './MemoPhotoGrid';

describe('MemoPhotoGrid', () => {
  test('picks a layout from how many photos were selected', () => {
    expect(memoPhotoLayout(1)).toBe('single');
    expect(memoPhotoLayout(2)).toBe('pair');
    expect(memoPhotoLayout(3)).toBe('triple');
    expect(memoPhotoLayout(4)).toBe('quad');
  });

  test('shows a pair layout for two photos', () => {
    const { container } = render(
      <MemoPhotoGrid urls={['https://example.com/a.jpg', 'https://example.com/b.jpg']} />
    );
    expect(container.querySelector('[data-photo-layout="pair"]')).toBeTruthy();
    expect(screen.getByAltText('Attached to this status update')).toBeTruthy();
    expect(screen.getByAltText('Attached photo 2')).toBeTruthy();
  });

  test('shows a triple collage for three photos', () => {
    const { container } = render(
      <MemoPhotoGrid
        urls={[
          'https://example.com/a.jpg',
          'https://example.com/b.jpg',
          'https://example.com/c.jpg',
        ]}
      />
    );
    expect(container.querySelector('[data-photo-layout="triple"]')).toBeTruthy();
    expect(screen.getByAltText('Attached photo 3')).toBeTruthy();
  });
});
