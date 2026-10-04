export const APP_TOUR_STORAGE_KEY = 'familyBubble_appTourDone';
export const APP_TOUR_SPOTLIGHT_PAD = 8;

export const APP_TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'This is your family bubble',
    body: 'Everyone you love lives in this circle. These buttons are how you check in, share how you are, and see who’s around — let’s tap through them.',
    target: null,
    placement: 'center',
  },
  {
    id: 'members',
    title: 'How many people are here',
    body: 'This count is your bubble. Tap it to see every face, then we will show you how to find them on the globe.',
    target: 'members',
    placement: 'bottom',
  },
  {
    id: 'globe',
    title: 'See them on the globe',
    body: 'Hit Map to spin the globe and find family in the real world. Bubbles keeps everyone in one cozy cluster.',
    target: 'globe',
    placement: 'bottom',
    viewMode: 'globe',
  },
  {
    id: 'checkin',
    title: 'Check in',
    body: 'Tap Check in when you arrive. Family gets a ping that you made it — no group text required.',
    target: 'checkin',
    placement: 'bottom',
  },
  {
    id: 'memos',
    title: 'Family memos',
    body: 'Statuses, check-ins, voice notes, and photos land here. Open Memos anytime to catch up.',
    target: 'memos',
    placement: 'bottom',
  },
  {
    id: 'places',
    title: 'Places',
    body: 'Save Home, School, or Work. FamilyBubble can let people know when you arrive or leave.',
    target: 'places',
    placement: 'bottom',
  },
  {
    id: 'switcher',
    title: 'Switch families',
    body: 'Swipe these tiny photo bubbles to hop to another family, or tap plus to start one.',
    target: 'switcher',
    placement: 'top',
  },
  {
    id: 'status',
    title: 'Update status',
    body: 'Tell family how you are with an emoji, a note, or a photo. It shows on your bubble and in memos.',
    target: 'status',
    placement: 'top',
  },
  {
    id: 'invite',
    title: 'Invite family',
    body: 'Send a link or a code so someone can join. You are ready — go tap around!',
    target: 'invite',
    placement: 'top',
  },
];

export function readAppTourDone() {
  try {
    return localStorage.getItem(APP_TOUR_STORAGE_KEY) === '1';
  } catch (error) {
    return true;
  }
}

export function markAppTourComplete() {
  try {
    localStorage.setItem(APP_TOUR_STORAGE_KEY, '1');
  } catch (error) {
    // ignore quota / private mode
  }
}

export function resetAppTour() {
  try {
    localStorage.removeItem(APP_TOUR_STORAGE_KEY);
  } catch (error) {
    // ignore
  }
}

export function shouldShowAppTour() {
  return !readAppTourDone();
}

export function tourStepAt(index, steps = APP_TOUR_STEPS) {
  const list = Array.isArray(steps) && steps.length ? steps : APP_TOUR_STEPS;
  const i = Math.max(0, Math.min(list.length - 1, Number(index) || 0));
  return list[i];
}

export function spotlightRect(domRect, pad = APP_TOUR_SPOTLIGHT_PAD) {
  if (!domRect) return null;
  const width = Math.max(24, Number(domRect.width) + pad * 2);
  const height = Math.max(24, Number(domRect.height) + pad * 2);
  return {
    left: Number(domRect.left) - pad,
    top: Number(domRect.top) - pad,
    width,
    height,
    radius: Math.min(18, Math.round(Math.min(width, height) / 2)),
  };
}

export function tooltipPosition({
  hole,
  placement = 'bottom',
  viewport = { width: 390, height: 844 },
  card = { width: 280, height: 168 },
} = {}) {
  const vw = Number(viewport.width) || 390;
  const vh = Number(viewport.height) || 844;
  const cardW = Math.min(card.width, vw - 24);
  const cardH = Number(card.height) || 168;
  const gap = 14;

  if (!hole || placement === 'center') {
    return {
      top: Math.max(12, (vh - cardH) / 2),
      left: Math.max(12, (vw - cardW) / 2),
      width: cardW,
    };
  }

  const preferBottom = placement === 'bottom' || hole.top + hole.height / 2 < vh / 2;
  let top = preferBottom ? hole.top + hole.height + gap : hole.top - cardH - gap;
  let left = hole.left + hole.width / 2 - cardW / 2;
  left = Math.min(Math.max(12, left), vw - cardW - 12);
  top = Math.min(Math.max(12, top), vh - cardH - 12);
  return { top, left, width: cardW, preferBottom };
}
