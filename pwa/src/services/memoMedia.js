import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../firebase';

export const MAX_VOICE_DURATION_MS = 30000;
export const MAX_STATUS_PHOTOS = 4;
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

export const collectStatusPhotoFiles = ({ photoFile = null, photoFiles = null } = {}) => {
  const list = Array.isArray(photoFiles) ? photoFiles.filter(Boolean) : [];
  if (photoFile && !list.includes(photoFile)) list.unshift(photoFile);
  return list.slice(0, MAX_STATUS_PHOTOS);
};

export const normalizeMemoPhotoUrls = ({ photoUrl = null, photoUrls = null } = {}) => {
  const list = [];
  const add = (url) => {
    if (typeof url === 'string' && url && !list.includes(url) && list.length < MAX_STATUS_PHOTOS) {
      list.push(url);
    }
  };
  if (Array.isArray(photoUrls)) photoUrls.forEach(add);
  if (photoUrl && !list.includes(photoUrl)) list.unshift(photoUrl);
  return list.slice(0, MAX_STATUS_PHOTOS);
};

export const pickFallbackMedia = ({ photoDataUrl = null, photoDataUrls = null, voiceDataUrl = null } = {}) => {
  const photos = [];
  const addPhoto = (url) => {
    if (isDataUrl(url) && !photos.includes(url) && photos.length < MAX_STATUS_PHOTOS) photos.push(url);
  };
  if (Array.isArray(photoDataUrls)) photoDataUrls.forEach(addPhoto);
  if (photoDataUrl && !photos.includes(photoDataUrl)) photos.unshift(photoDataUrl);
  const sized = photos.filter((url) => isDataUrl(url) && url.length <= MAX_FALLBACK_PHOTO_CHARS);
  const voiceUrl = isDataUrl(voiceDataUrl) && voiceDataUrl.length <= MAX_FALLBACK_VOICE_CHARS
    ? voiceDataUrl
    : null;
  const voiceChars = voiceUrl ? voiceUrl.length : 0;

  const kept = [];
  let used = 0;
  sized.forEach((url) => {
    if (used + url.length + voiceChars <= MAX_FALLBACK_COMBINED_CHARS) {
      kept.push(url);
      used += url.length;
    }
  });

  if (!kept.length && sized.length) {
    return { photoUrl: sized[0], photoUrls: [sized[0]], voiceUrl: null };
  }
  return {
    photoUrl: kept[0] || null,
    photoUrls: kept,
    voiceUrl,
  };
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

const prepareOneMemoPhoto = async (photoFile, userId, index) => {
  let photoBlob = photoFile;
  let photoDataUrl = null;
  try {
    const compressed = await compressMemoPhotoFile(photoFile);
    photoBlob = compressed.blob;
    photoDataUrl = compressed.dataUrl;
  } catch (error) {
    console.warn('Memo photo compression skipped:', error.message);
  }
  try {
    return await uploadMemoBlob(photoBlob, userId, `photo${index}`);
  } catch (error) {
    console.warn('Memo photo storage upload failed:', error?.errors?.[0]?.message || error.message);
    if (!photoDataUrl) {
      try {
        photoDataUrl = await blobToDataUrl(photoBlob);
      } catch (readError) {
        console.warn('Memo photo fallback failed:', readError.message);
      }
    }
    return photoDataUrl || null;
  }
};

export const prepareStatusMemoMedia = async ({
  photoFile = null,
  photoFiles = null,
  voiceBlob = null,
  userId,
} = {}) => {
  const files = collectStatusPhotoFiles({ photoFile, photoFiles });
  let photoUrls = [];
  let voiceUrl = null;
  let voiceDataUrl = null;

  for (let index = 0; index < files.length; index += 1) {
    const url = await prepareOneMemoPhoto(files[index], userId, index);
    if (url) photoUrls.push(url);
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

  if (!voiceUrl && voiceDataUrl) voiceUrl = voiceDataUrl;

  if (photoUrls.some(isDataUrl) || isDataUrl(voiceUrl)) {
    const picked = pickFallbackMedia({
      photoDataUrls: photoUrls.filter(isDataUrl),
      voiceDataUrl: isDataUrl(voiceUrl) ? voiceUrl : null,
    });
    const remainingData = [...(picked.photoUrls || [])];
    photoUrls = photoUrls
      .map((url) => {
        if (!isDataUrl(url)) return url;
        const match = remainingData.indexOf(url);
        if (match === -1) return null;
        remainingData.splice(match, 1);
        return url;
      })
      .filter(Boolean);
    if (isDataUrl(voiceUrl)) voiceUrl = picked.voiceUrl;
  }

  return {
    photoUrl: photoUrls[0] || null,
    photoUrls,
    voiceUrl: voiceUrl || null,
  };
};
