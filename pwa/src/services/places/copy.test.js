import {
  activityLine,
  emptyPlacesBody,
  formatPlaceEventMessage,
  formatPlaceStatus,
  formatPlacesUsed,
  notifyTypeForEvent,
  PLACE_ARRIVAL_REASSURANCE,
} from './copy';
import { EVENT_TYPE, PLACE_NOTIFY_TYPE } from './constants';

const home = { name: 'Home', type: 'home', icon: '🏠' };
const school = { name: 'School', type: 'school', icon: '🏫' };

describe('Places copy', () => {
  test('uses warm family language for events', () => {
    expect(formatPlaceEventMessage({
      place: home,
      memberName: 'Sarah Bell',
      eventType: EVENT_TYPE.ARRIVED,
    })).toBe('🏠 Sarah arrived home');
    expect(formatPlaceEventMessage({
      place: { name: 'Band Practice', type: 'custom', icon: '🎺' },
      memberName: 'Liam',
      eventType: EVENT_TYPE.ARRIVED,
    })).toBe('🎺 Liam arrived at Band Practice');
    expect(formatPlaceEventMessage({
      place: home,
      memberName: 'Mom',
      eventType: EVENT_TYPE.LEFT,
    })).toBe('🚗 Mom left Home');
    expect(formatPlaceEventMessage({
      place: school,
      memberName: 'Emma',
      eventType: EVENT_TYPE.CHECKED_IN,
    })).toBe('📍 Emma checked in at School');
    expect(formatPlaceEventMessage({
      place: home,
      memberName: 'Dad',
      eventType: EVENT_TYPE.UPDATED,
    })).toBe('🏠 Dad updated the Home location.');
  });

  test('maps event types to existing push categories', () => {
    expect(notifyTypeForEvent(EVENT_TYPE.ARRIVED)).toBe(PLACE_NOTIFY_TYPE.ARRIVAL);
    expect(notifyTypeForEvent(EVENT_TYPE.LEFT)).toBe(PLACE_NOTIFY_TYPE.DEPARTURE);
    expect(notifyTypeForEvent(EVENT_TYPE.CHECKED_IN)).toBe(PLACE_NOTIFY_TYPE.CHECKIN);
  });

  test('activity lines distinguish check-ins from arrivals', () => {
    expect(activityLine({ place: home, memberName: 'Dad', eventType: EVENT_TYPE.ARRIVED })).toBe('🏠 Dad arrived home');
    expect(activityLine({ place: school, memberName: 'Emma', eventType: EVENT_TYPE.CHECKED_IN })).toBe('📍 Emma checked in at School');
  });

  test('status never guesses a location', () => {
    expect(formatPlaceStatus({
      place: home,
      presence: [{ userId: 'dad', inside: true }],
      members: [{ userId: 'dad', name: 'Dad' }],
    })).toBe('Dad is home');
    expect(formatPlaceStatus({
      place: school,
      presence: [{ userId: 'emma', inside: true }],
      members: [{ userId: 'emma', name: 'Emma' }],
    })).toBe('Emma is here');
    expect(formatPlaceStatus({
      place: { ...home, ownerId: 'mom' },
      presence: [{ userId: 'mom', inside: false }],
      members: [{ userId: 'mom', name: 'Mom' }],
    })).toBe('Mom is away');
    expect(formatPlaceStatus({ place: home, presence: [], locationAvailable: true })).toBe('No one here');
    expect(formatPlaceStatus({ place: home, presence: [], locationAvailable: false })).toBe('Location unavailable');
  });

  test('shows how many of 3 places are used', () => {
    expect(formatPlacesUsed(2)).toBe('2 of 3 Places used');
    expect(formatPlacesUsed(3)).toBe('3 of 3 Places used');
    expect(emptyPlacesBody).toMatch(/Home, School, or Work/);
    expect(emptyPlacesBody).toMatch(/they're okay, you're okay/);
    expect(PLACE_ARRIVAL_REASSURANCE).toBe("They're okay.");
  });
});
