import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../firebase';

export const MAX_VOICE_DURATION_MS = 30000;
export const MEMO_PHOTO_MAX_DIM = 480;
export const MAX_FALLBACK_PHOTO_CHARS = 250000;
export const MAX_FALLBACK_VOICE_CHARS = 400000;
export const MAX_FALLBACK_COMBINED_CHARS = 500000;

const STORAGE_BUCKETS = [
  'familybubble-ecfa6.appspot.com',
  'familybubble-ecfa6.firebasestorage.app',
];

const RECORDER_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

export const isDataUrl = (value) => typeof value === 'string' && value.startsWith('data:');

export const formatVoiceDuration = (ms) => {
  const total = Math.max(0, Math.round((Number(ms) || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const chooseRecorderMimeType = (
  isTypeSupported = (type) => {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
      return false;
    }
    return MediaRecorder.isTypeSupported(type);
  }
) => RECORDER_MIME_CANDIDATES.find((type) => {
  try {
    return isTypeSupported(type);
  } catch (error) {
    return false;
  }
}) || '';

export const extForMime = (mime) => {
  const value = (mime || '').toLowerCase();
  if (value.includes('jpeg') || value.includes('jpg')) return 'jpg';
  if (value.includes('png')) return 'png';
  if (value.includes('webp')) return 'webp';
  if (value.includes('webm')) return 'webm';
  if (value.includes('mp4') || value.includes('m4a') || value.includes('aac')) return 'm4a';
  if (value.includes('ogg')) return 'ogg';
  if (value.includes('mpeg') || value.includes('mp3')) return 'mp3';
  return 'bin';
};

export const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    if (!blob) {
      reject(new Error('No media to read.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read media.'));
    reader.readAsDataURL(blob);
  });

export const pickFallbackMedia = ({ photoDataUrl = null, voiceDataUrl = null } = {}) => {
  const photoUrl = isDataUrl(photoDataUrl) ? photoDataUrl : null;
  const voiceUrl = isDataUrl(voiceDataUrl) ? voiceDataUrl : null;
  const photoChars = photoUrl ? photoUrl.length : 0;
  const voiceChars = voiceUrl ? voiceUrl.length : 0;

  if (photoChars && photoChars > MAX_FALLBACK_PHOTO_CHARS) {
    return pickFallbackMedia({ photoDataUrl: null, voiceDataUrl: voiceUrl });
  }
  if (voiceChars && voiceChars > MAX_FALLBACK_VOICE_CHARS) {
    return pickFallbackMedia({ photoDataUrl: photoUrl, voiceDataUrl: null });
  }
  if (photoChars + voiceChars <= MAX_FALLBACK_COMBINED_CHARS) {
    return { photoUrl, voiceUrl };
  }
  if (photoChars) return { photoUrl, voiceUrl: null };
  if (voiceChars) return { photoUrl: null, voiceUrl };
  return { photoUrl: null, voiceUrl: null };
};

const canvasToJpegBlob = (canvas, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error('Could not compress photo.'));
      else resolve(blob);
    }, 'image/jpeg', quality);
  });

export const compressMemoPhotoFile = async (imageFile, {
  maxDim = MEMO_PHOTO_MAX_DIM,
  maxBytes = Math.floor(MAX_FALLBACK_PHOTO_CHARS * 0.72),
} = {}) => {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
    throw new Error('Photo compression is only available in the browser.');
  }

  const fileWithType =
    imageFile.type && imageFile.type.startsWith('image/')
      ? imageFile
      : new File([imageFile], imageFile.name || 'photo.jpg', { type: 'image/jpeg' });

  const bitmap = await createImageBitmap(fileWithType);
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not prepare photo.');
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.72;
    let blob = await canvasToJpegBlob(canvas, quality);
    while (blob.size > maxBytes && quality > 0.35) {
      quality = Math.max(0.35, quality - 0.1);
      blob = await canvasToJpegBlob(canvas, quality);
    }
    if (blob.size > maxBytes) {
      throw new Error('Photo is too large after compression. Try a smaller image.');
    }
    const dataUrl = await blobToDataUrl(blob);
    return { blob, dataUrl };
  } finally {
    if (typeof bitmap.close === 'function') bitmap.close();
  }
};

const uploadBlobToBucket = async (blob, userId, kind, bucket, timeoutMs) => {
  const mime = blob.type || (kind === 'photo' ? 'image/jpeg' : 'audio/webm');
  const path = `memo_media/${userId}/${Date.now()}-${kind}.${extForMime(mime)}`;
  const bucketStorage = getStorage(app, `gs://${bucket}`);
  const fileRef = ref(bucketStorage, path);
  const uploadPromise = (async () => {
    const snapshot = await uploadBytes(fileRef, blob, { contentType: mime });
    return getDownloadURL(snapshot.ref);
  })();
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Memo media upload timed out')), timeoutMs);
  });
  return Promise.race([uploadPromise, timeoutPromise]);
};

export const uploadMemoBlob = async (blob, userId, kind, timeoutMs = 12000) => {
  if (!blob) throw new Error('No media to upload.');
  if (!userId) throw new Error('A signed-in user is required to upload memo media.');
  return Promise.any(
    STORAGE_BUCKETS.map((bucket) => uploadBlobToBucket(blob, userId, kind, bucket, timeoutMs))
  );
};

export const prepareStatusMemoMedia = async ({ photoFile = null, voiceBlob = null, userId } = {}) => {
  let photoUrl = null;
  let voiceUrl = null;
  let photoDataUrl = null;
  let voiceDataUrl = null;

  if (photoFile) {
    let photoBlob = photoFile;
    try {
      const compressed = await compressMemoPhotoFile(photoFile);
      photoBlob = compressed.blob;
      photoDataUrl = compressed.dataUrl;
    } catch (error) {
      console.warn('Memo photo compression skipped:', error.message);
    }
    try {
      photoUrl = await uploadMemoBlob(photoBlob, userId, 'photo');
    } catch (error) {
      console.warn('Memo photo storage upload failed:', error?.errors?.[0]?.message || error.message);
      if (!photoDataUrl) {
        try {
          photoDataUrl = await blobToDataUrl(photoBlob);
        } catch (readError) {
          console.warn('Memo photo fallback failed:', readError.message);
        }
      }
    }
  }

  if (voiceBlob && voiceBlob.size > 0) {
    try {
      voiceUrl = await uploadMemoBlob(voiceBlob, userId, 'voice');
    } catch (error) {
      console.warn('Memo voice storage upload failed:', error?.errors?.[0]?.message || error.message);
      try {
        voiceDataUrl = await blobToDataUrl(voiceBlob);
      } catch (readError) {
        console.warn('Memo voice fallback failed:', readError.message);
      }
    }
  }

  if (!photoUrl && photoDataUrl) photoUrl = photoDataUrl;
  if (!voiceUrl && voiceDataUrl) voiceUrl = voiceDataUrl;

  if (isDataUrl(photoUrl) || isDataUrl(voiceUrl)) {
    const picked = pickFallbackMedia({
      photoDataUrl: isDataUrl(photoUrl) ? photoUrl : null,
      voiceDataUrl: isDataUrl(voiceUrl) ? voiceUrl : null,
    });
    if (isDataUrl(photoUrl)) photoUrl = picked.photoUrl;
    if (isDataUrl(voiceUrl)) voiceUrl = picked.voiceUrl;
  }

  return {
    photoUrl: photoUrl || null,
    voiceUrl: voiceUrl || null,
  };
};
