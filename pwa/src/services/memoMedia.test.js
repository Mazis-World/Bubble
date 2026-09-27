jest.mock('../firebase', () => ({
  app: {},
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

import {
  chooseRecorderMimeType,
  extForMime,
  formatVoiceDuration,
  isDataUrl,
  pickFallbackMedia,
  MAX_FALLBACK_COMBINED_CHARS,
  MAX_FALLBACK_PHOTO_CHARS,
} from './memoMedia';

describe('memo media helpers', () => {
  test('formats voice duration as m:ss', () => {
    expect(formatVoiceDuration(0)).toBe('0:00');
    expect(formatVoiceDuration(4200)).toBe('0:04');
    expect(formatVoiceDuration(30000)).toBe('0:30');
    expect(formatVoiceDuration(90000)).toBe('1:30');
  });

  test('picks a supported recorder mime type', () => {
    expect(chooseRecorderMimeType(() => false)).toBe('');
    expect(chooseRecorderMimeType((type) => type === 'audio/mp4')).toBe('audio/mp4');
    expect(chooseRecorderMimeType((type) => type.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus');
  });

  test('maps mime types to file extensions', () => {
    expect(extForMime('image/jpeg')).toBe('jpg');
    expect(extForMime('audio/webm;codecs=opus')).toBe('webm');
    expect(extForMime('audio/mp4')).toBe('m4a');
  });

  test('keeps both data URLs when they fit in a Firestore doc', () => {
    const photoDataUrl = `data:image/jpeg;base64,${'a'.repeat(100)}`;
    const voiceDataUrl = `data:audio/webm;base64,${'b'.repeat(100)}`;
    expect(pickFallbackMedia({ photoDataUrl, voiceDataUrl })).toEqual({
      photoUrl: photoDataUrl,
      voiceUrl: voiceDataUrl,
    });
  });

  test('drops voice when combined data URLs would overflow Firestore', () => {
    const photoDataUrl = `data:image/jpeg;base64,${'p'.repeat(240000)}`;
    const voiceDataUrl = `data:audio/webm;base64,${'v'.repeat(280000)}`;
    expect(photoDataUrl.length).toBeLessThanOrEqual(MAX_FALLBACK_PHOTO_CHARS);
    expect(voiceDataUrl.length).toBeGreaterThan(MAX_FALLBACK_COMBINED_CHARS - photoDataUrl.length);
    const picked = pickFallbackMedia({ photoDataUrl, voiceDataUrl });
    expect(picked.photoUrl).toBe(photoDataUrl);
    expect(picked.voiceUrl).toBeNull();
    expect(isDataUrl(picked.photoUrl)).toBe(true);
  });
});
