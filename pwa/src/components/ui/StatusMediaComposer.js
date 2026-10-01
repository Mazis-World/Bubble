import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Mic, Square, Trash2 } from 'lucide-react';
import {
  chooseRecorderMimeType,
  formatVoiceDuration,
  MAX_STATUS_PHOTOS,
  MAX_VOICE_DURATION_MS,
} from '../../services/memoMedia';
import MemoPhotoGrid from './MemoPhotoGrid';

const canUseMicrophone = () =>
  typeof window !== 'undefined' &&
  typeof MediaRecorder !== 'undefined' &&
  Boolean(navigator.mediaDevices?.getUserMedia);

const StatusMediaComposer = ({ disabled = false, onChange }) => {
  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const tickRef = useRef(null);
  const startedAtRef = useRef(0);
  const photoPreviewUrlsRef = useRef([]);
  const voicePreviewRef = useRef(null);

  const [photos, setPhotos] = useState([]);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState(null);
  const [voiceDurationMs, setVoiceDurationMs] = useState(null);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState(null);

  const revokePhotoPreviews = (urls = photoPreviewUrlsRef.current) => {
    urls.forEach((url) => {
      if (url) URL.revokeObjectURL(url);
    });
  };

  const revokeVoicePreview = () => {
    if (voicePreviewRef.current) {
      URL.revokeObjectURL(voicePreviewRef.current);
      voicePreviewRef.current = null;
    }
  };

  const stopTicker = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const finishRecorder = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch (stopError) {
        console.warn('Could not stop voice recorder:', stopError.message);
      }
    }
  };

  useEffect(() => {
    const photoFiles = photos.map((item) => item.file);
    onChange?.({
      photoFile: photoFiles[0] || null,
      photoFiles,
      voiceBlob,
      voiceDurationMs,
      recording,
    });
  }, [photos, voiceBlob, voiceDurationMs, recording, onChange]);

  useEffect(() => () => {
    stopTicker();
    finishRecorder();
    stopStream();
    revokePhotoPreviews();
    revokeVoicePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearPhotos = () => {
    revokePhotoPreviews();
    photoPreviewUrlsRef.current = [];
    setPhotos([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removePhotoAt = (index) => {
    setPhotos((current) => {
      const removed = current[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      photoPreviewUrlsRef.current = next.map((item) => item.preview);
      return next;
    });
  };

  const clearVoice = () => {
    revokeVoicePreview();
    setVoiceBlob(null);
    setVoicePreviewUrl(null);
    setVoiceDurationMs(null);
    setElapsedMs(0);
  };

  const handlePhotoPicked = (event) => {
    const picked = Array.from(event.target.files || []).filter((file) => (
      !file.type || file.type.startsWith('image/')
    ));
    if (!picked.length) return;
    const room = Math.max(0, MAX_STATUS_PHOTOS - photos.length);
    if (!room) {
      setError(`You can add up to ${MAX_STATUS_PHOTOS} photos.`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    const accepted = picked.slice(0, room).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setError(picked.length > room ? `You can add up to ${MAX_STATUS_PHOTOS} photos.` : null);
    setPhotos((current) => {
      const next = [...current, ...accepted];
      photoPreviewUrlsRef.current = next.map((item) => item.preview);
      return next;
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const startRecording = async () => {
    if (disabled || recording || !canUseMicrophone()) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = chooseRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopTicker();
        stopStream();
        recorderRef.current = null;
        setRecording(false);
        const duration = Math.min(
          MAX_VOICE_DURATION_MS,
          Date.now() - startedAtRef.current
        );
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || 'audio/webm',
        });
        chunksRef.current = [];
        if (blob.size < 1) {
          setError('Voice note was empty. Try recording again.');
          return;
        }
        revokeVoicePreview();
        const preview = URL.createObjectURL(blob);
        voicePreviewRef.current = preview;
        setVoiceBlob(blob);
        setVoicePreviewUrl(preview);
        setVoiceDurationMs(duration);
        setElapsedMs(duration);
      };

      clearVoice();
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setRecording(true);
      recorder.start();
      tickRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        setElapsedMs(Math.min(MAX_VOICE_DURATION_MS, elapsed));
        if (elapsed >= MAX_VOICE_DURATION_MS) {
          finishRecorder();
        }
      }, 200);
    } catch (recordError) {
      stopStream();
      setRecording(false);
      setError('Microphone permission is needed to send a voice memo.');
    }
  };

  const stopRecording = () => {
    finishRecorder();
  };

  const remainingSlots = MAX_STATUS_PHOTOS - photos.length;

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={handlePhotoPicked}
        disabled={disabled}
        tabIndex={-1}
      />

      <div>
        <p className="text-gray-300 text-sm mb-2 font-semibold">Add photos (optional):</p>
        {photos.length ? (
          <div className="space-y-2">
            <MemoPhotoGrid
              urls={photos.map((item) => item.preview)}
              preview
              disabled={disabled}
              onRemove={removePhotoAt}
            />
            <div className="flex items-center justify-between gap-2">
              {remainingSlots > 0 ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={disabled}
                  className="flex items-center gap-1 text-sm text-gray-300 tap-target disabled:opacity-50"
                >
                  <ImagePlus size={14} />
                  Add more
                </button>
              ) : (
                <span className="text-xs text-gray-500">{MAX_STATUS_PHOTOS} photos</span>
              )}
              <button
                type="button"
                onClick={clearPhotos}
                disabled={disabled}
                className="flex items-center gap-1 text-sm text-gray-300 tap-target disabled:opacity-50"
              >
                <Trash2 size={14} />
                Remove photos
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white font-semibold tap-target disabled:opacity-50"
          >
            <ImagePlus size={18} />
            Add photos
          </button>
        )}
      </div>

      <div>
        <p className="text-gray-300 text-sm mb-2 font-semibold">Voice memo (optional):</p>
        {!canUseMicrophone() ? (
          <p className="text-gray-500 text-sm">Voice notes aren't supported in this browser.</p>
        ) : recording ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={stopRecording}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white font-semibold tap-target"
            >
              <Square size={16} />
              Stop
            </button>
            <p className="text-red-300 text-sm font-semibold tabular-nums" aria-live="polite">
              {formatVoiceDuration(elapsedMs)} / {formatVoiceDuration(MAX_VOICE_DURATION_MS)}
            </p>
          </div>
        ) : voicePreviewUrl ? (
          <div className="space-y-2">
            <audio
              className="w-full"
              controls
              preload="metadata"
              src={voicePreviewUrl}
              aria-label="Voice memo preview"
            />
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-xs">{formatVoiceDuration(voiceDurationMs)} voice note</p>
              <button
                type="button"
                onClick={clearVoice}
                disabled={disabled}
                className="flex items-center gap-1 text-sm text-gray-300 tap-target disabled:opacity-50"
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white font-semibold tap-target disabled:opacity-50"
          >
            <Mic size={18} />
            Record voice memo
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
};

export default StatusMediaComposer;
