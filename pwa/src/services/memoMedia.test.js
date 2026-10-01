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
  collectStatusPhotoFiles,
  extForMime,
  formatVoiceDuration,
  isDataUrl,
  normalizeMemoPhotoUrls,
  pickFallbackMedia,
  MAX_FALLBACK_COMBINED_CHARS,
  MAX_FALLBACK_PHOTO_CHARS,
  MAX_STATUS_PHOTOS,
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
      photoUrls: [photoDataUrl],
      voiceUrl: voiceDataUrl,
    });
  });

  test('keeps several photos that fit in a Firestore doc', () => {
    const photoA = `data:image/jpeg;base64,${'a'.repeat(100)}`;
    const photoB = `data:image/jpeg;base64,${'b'.repeat(100)}`;
    const photoC = `data:image/jpeg;base64,${'c'.repeat(100)}`;
    expect(pickFallbackMedia({ photoDataUrls: [photoA, photoB, photoC] })).toEqual({
      photoUrl: photoA,
      photoUrls: [photoA, photoB, photoC],
      voiceUrl: null,
    });
  });

  test('collects a capped list of status photo files', () => {
    const files = [{ name: '1' }, { name: '2' }, { name: '3' }, { name: '4' }, { name: '5' }];
    expect(collectStatusPhotoFiles({ photoFiles: files })).toEqual(files.slice(0, MAX_STATUS_PHOTOS));
    expect(normalizeMemoPhotoUrls({
      photoUrl: 'https://example.com/1.jpg',
      photoUrls: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    })).toEqual(['https://example.com/1.jpg', 'https://example.com/2.jpg']);
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
