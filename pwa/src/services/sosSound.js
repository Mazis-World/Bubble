/**
 * SOS emergency sound.
 * Foreground: looping Web Audio siren (no extra packages).
 * Background / locked: OS notification sound via Notification (silent: false).
 * Custom notification sounds are not available on most browsers/PWAs without FCM.
 * Status memos must never call startSosAlertSound.
 */

let audioCtx = null;
let intervalId = null;
let playing = false;

export const shouldPlaySosSound = ({ viewerUid, sosUserId, sosStatus, memoType }) => {
  if (memoType && memoType !== 'sos') return false;
  if (sosStatus && sosStatus !== 'ACTIVE') return false;
  if (!viewerUid || !sosUserId || viewerUid === sosUserId) return false;
  return true;
};

const playChirp = () => {
  if (!playing || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(420, audioCtx.currentTime + 0.32);
    gain.gain.setValueAtTime(0.16, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.38);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (error) {
    // Audio may be blocked until a user gesture.
  }
};

export const startSosAlertSound = () => {
  if (typeof window === 'undefined' || playing) return;
  playing = true;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      playChirp();
      intervalId = setInterval(playChirp, 700);
    }
  } catch (error) {
    // Keep going — notification sound still covers background.
  }
  try {
    if (navigator.vibrate) navigator.vibrate([400, 120, 400, 120, 400]);
  } catch (error) {
    // Vibration is optional.
  }
};

export const stopSosAlertSound = () => {
  playing = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
  try {
    if (navigator.vibrate) navigator.vibrate(0);
  } catch (error) {
    // Ignore.
  }
};

export const isSosAlertPlaying = () => playing;
