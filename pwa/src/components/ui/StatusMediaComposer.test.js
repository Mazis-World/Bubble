import { render, screen } from '@testing-library/react';
import StatusMediaComposer from './StatusMediaComposer';

jest.mock('../../firebase', () => ({
  app: {},
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

describe('StatusMediaComposer', () => {
  beforeAll(() => {
    global.MediaRecorder = class MediaRecorder {
      static isTypeSupported() {
        return true;
      }
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: jest.fn() },
    });
  });

  test('lets a status update add photos and a voice memo', () => {
    render(<StatusMediaComposer onChange={() => {}} />);
    expect(screen.getByText('Add photos (optional):')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add photos' })).toBeTruthy();
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeTruthy();
    expect(input.multiple).toBe(true);
    expect(screen.getByText('Voice memo (optional):')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Record voice memo' })).toBeTruthy();
  });
});
