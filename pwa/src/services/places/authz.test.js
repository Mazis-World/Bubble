import {
  canCheckInAtPlace,
  canCreatePlace,
  canCreatePlaceEvent,
  canDeletePlace,
  canEditPlace,
  canModifyAnotherUsersPlace,
  canReceivePlaceNotification,
  canViewPlaceHistory,
  canViewPlaces,
  filterPlacePushRecipients,
  placeLimitError,
  sanitizeRecipientUserIds,
} from './authz';
import { EVENT_SOURCE, EVENT_TYPE, PLACE_LIMIT_MESSAGE } from './constants';

describe('Places authorization', () => {
  const place = { placeId: 'p1', ownerId: 'mom', isActive: true };

  test('only the owner can create up to 3 places', () => {
    expect(canCreatePlace({
      authUid: 'mom',
      ownerId: 'mom',
      memberIds: ['mom', 'dad'],
      ownedCount: 2,
    })).toBe(true);
    expect(canCreatePlace({
      authUid: 'mom',
      ownerId: 'mom',
      memberIds: ['mom', 'dad'],
      ownedCount: 3,
    })).toBe(false);
    expect(canCreatePlace({
      authUid: 'dad',
      ownerId: 'mom',
      memberIds: ['mom', 'dad'],
      ownedCount: 0,
    })).toBe(false);
    expect(placeLimitError(3)).toBe(PLACE_LIMIT_MESSAGE);
  });

  test('owners can edit and delete their own place only', () => {
    expect(canEditPlace({ authUid: 'mom', place })).toBe(true);
    expect(canDeletePlace({ authUid: 'dad', place })).toBe(false);
    expect(canModifyAnotherUsersPlace({ authUid: 'dad', place })).toBe(true);
  });

  test('bubble members can view places and history', () => {
    expect(canViewPlaces({ authUid: 'dad', memberIds: ['mom', 'dad'] })).toBe(true);
    expect(canViewPlaceHistory({ authUid: 'stranger', memberIds: ['mom', 'dad'], place })).toBe(false);
  });

  test('recipients must be bubble members and not the actor', () => {
    expect(canReceivePlaceNotification({
      recipientUserId: 'dad',
      actorUserId: 'mom',
      recipientUserIds: ['dad', 'emma'],
      memberIds: ['mom', 'dad', 'emma', 'grandpa'],
    })).toBe(true);
    expect(canReceivePlaceNotification({
      recipientUserId: 'grandpa',
      actorUserId: 'mom',
      recipientUserIds: ['dad', 'emma'],
      memberIds: ['mom', 'dad', 'emma', 'grandpa'],
    })).toBe(false);
    expect(canReceivePlaceNotification({
      recipientUserId: 'mom',
      actorUserId: 'mom',
      recipientUserIds: ['mom', 'dad'],
      memberIds: ['mom', 'dad'],
    })).toBe(false);
  });

  test('drops unauthorized recipient ids', () => {
    expect(sanitizeRecipientUserIds({
      recipientUserIds: ['dad', 'hacker', 'dad'],
      memberIds: ['mom', 'dad', 'emma'],
      ownerId: 'mom',
    })).toEqual(['dad']);
  });

  test('push recipients exclude the person who arrived', () => {
    expect(filterPlacePushRecipients({
      actorUserId: 'mom',
      recipientUserIds: ['dad', 'emma', 'mom'],
      memberIds: ['mom', 'dad', 'emma', 'grandpa'],
    })).toEqual(['dad', 'emma']);
  });

  test('place events must be created by the signed-in member', () => {
    expect(canCreatePlaceEvent({
      authUid: 'mom',
      userId: 'mom',
      memberIds: ['mom'],
      eventType: EVENT_TYPE.ARRIVED,
      source: EVENT_SOURCE.GEOFENCE,
    })).toBe(true);
    expect(canCreatePlaceEvent({
      authUid: 'mom',
      userId: 'dad',
      memberIds: ['mom', 'dad'],
      eventType: EVENT_TYPE.ARRIVED,
      source: EVENT_SOURCE.GEOFENCE,
    })).toBe(false);
  });

  test('manual check-in stays available to bubble members', () => {
    expect(canCheckInAtPlace({ authUid: 'dad', place, isMember: true })).toBe(true);
    expect(canCheckInAtPlace({ authUid: 'dad', place, isMember: false })).toBe(false);
  });
});
