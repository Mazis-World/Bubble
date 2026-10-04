import {
  APP_TOUR_STEPS,
  markAppTourComplete,
  readAppTourDone,
  resetAppTour,
  shouldShowAppTour,
  spotlightRect,
  tooltipPosition,
  tourStepAt,
} from './appTour';

describe('app tour helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('starts for new users and remembers skip or finish', () => {
    expect(shouldShowAppTour()).toBe(true);
    markAppTourComplete();
    expect(readAppTourDone()).toBe(true);
    expect(shouldShowAppTour()).toBe(false);
    resetAppTour();
    expect(shouldShowAppTour()).toBe(true);
  });

  test('walks the real home buttons in order', () => {
    expect(APP_TOUR_STEPS.map((step) => step.id)).toEqual([
      'welcome',
      'members',
      'globe',
      'checkin',
      'memos',
      'places',
      'switcher',
      'status',
      'invite',
    ]);
    expect(tourStepAt(2).target).toBe('globe');
    expect(tourStepAt(2).viewMode).toBe('globe');
    expect(tourStepAt(3).target).toBe('checkin');
    expect(tourStepAt(7).target).toBe('status');
  });

  test('pads a spotlight hole and parks the speech bubble below a top chip', () => {
    const hole = spotlightRect({ left: 16, top: 80, width: 120, height: 40 }, 8);
    expect(hole).toEqual({
      left: 8,
      top: 72,
      width: 136,
      height: 56,
      radius: 18,
    });
    const tip = tooltipPosition({
      hole,
      placement: 'bottom',
      viewport: { width: 390, height: 844 },
      card: { width: 280, height: 160 },
    });
    expect(tip.top).toBeGreaterThan(hole.top + hole.height);
    expect(tip.left).toBeGreaterThanOrEqual(12);
    expect(tip.left + tip.width).toBeLessThanOrEqual(390 - 12);
  });
});
