import React, { useMemo, useState } from 'react';
import { EVENT_SOURCE, EVENT_TYPE } from '../../services/places/constants';
import {
  activityLine,
  deletePlaceBody,
  deletePlaceTitle,
  formatPlaceStatus,
  homeAddressConfirmBody,
  homeAddressConfirmTitle,
  isHomePlace,
} from '../../services/places/copy';
import { formatLastSeen } from '../../utils/timeUtils';
import PlaceMapPreview from './PlaceMapPreview';
import { usePlaceActivity } from '../../hooks/usePlaces';

const timestampToDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.toMillis === 'function') return new Date(value.toMillis());
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatClock = (value) => {
  const date = timestampToDate(value);
  if (!date) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

const isSameDay = (a, b) => (
  a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate()
);

const dayLabel = (date) => {
  const now = new Date();
  if (isSameDay(date, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const ConfirmDialog = ({ title, body, confirmLabel, danger, onCancel, onConfirm, busy }) => (
  <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
    <p className="text-white font-bold">{title}</p>
    <p className="text-gray-300 text-sm">{body}</p>
    <div className="flex gap-2">
      <button type="button" onClick={onCancel} className="flex-1 bg-white/10 text-white py-3 rounded-xl font-semibold tap-target">
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className={`flex-1 py-3 rounded-xl font-bold tap-target ${danger ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}
      >
        {busy ? 'Working…' : confirmLabel}
      </button>
    </div>
  </div>
);

const PlaceDetail = ({
  place,
  bubbleId,
  members = [],
  presence = [],
  currentUserId,
  locationAvailable = true,
  checkingIn = false,
  onCheckIn,
  onEdit,
  onDelete,
  onUpdateHome,
}) => {
  const events = usePlaceActivity(bubbleId, place?.placeId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmHome, setConfirmHome] = useState(false);
  const isOwner = place?.ownerId === currentUserId;
  const grouped = useMemo(() => {
    const groups = [];
    events.forEach((event) => {
      const date = timestampToDate(event.timestamp || event.createdAt);
      if (!date) return;
      const label = dayLabel(date);
      const last = groups[groups.length - 1];
      if (!last || last.label !== label) groups.push({ label, items: [event] });
      else last.items.push(event);
    });
    return groups;
  }, [events]);

  if (!place) return null;
  const status = formatPlaceStatus({
    place,
    presence: presence.filter((item) => item.placeId === place.placeId),
    members,
    locationAvailable,
  });
  const memberName = (userId) => members.find((item) => item.userId === userId || item.id === userId)?.name;

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <div className="text-4xl">{place.icon}</div>
        <h4 className="text-2xl font-black text-white">{place.name}</h4>
        <p className="text-gray-400 text-sm">{place.address || 'Address saved privately for your family'}</p>
      </div>

      <PlaceMapPreview
        latitude={place.latitude}
        longitude={place.longitude}
        radiusMeters={place.radiusMeters}
        title={`${place.name} map`}
      />

      <div className="rounded-2xl glass-light border border-white/10 p-4 space-y-1">
        <p className="text-xs uppercase tracking-wide text-gray-400">Status</p>
        <p className="text-white font-bold">{status}</p>
      </div>

      <div className="rounded-2xl glass-light border border-white/10 p-4 space-y-2">
        <p className="text-xs uppercase tracking-wide text-gray-400">Notifications</p>
        <p className="text-gray-200 text-sm">Arrival {place.arrivalNotificationsEnabled !== false ? 'ON' : 'OFF'}</p>
        <p className="text-gray-200 text-sm">Departure {place.departureNotificationsEnabled !== false ? 'ON' : 'OFF'}</p>
        <p className="text-xs uppercase tracking-wide text-gray-400 pt-2">Notify</p>
        {(place.recipientUserIds || []).length === 0 && (
          <p className="text-gray-400 text-sm">Nobody selected yet</p>
        )}
        {(place.recipientUserIds || []).map((userId) => (
          <p key={userId} className="text-gray-200 text-sm">{memberName(userId) || 'Family member'} ✓</p>
        ))}
      </div>

      <button
        type="button"
        onClick={onCheckIn}
        disabled={checkingIn}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3.5 rounded-2xl font-bold tap-target disabled:opacity-60"
      >
        {checkingIn ? 'Checking in…' : 'Check In'}
      </button>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wide text-gray-400">Activity</p>
        {grouped.length === 0 && (
          <p className="text-gray-400 text-sm">No arrivals, departures, or check-ins yet.</p>
        )}
        {grouped.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-gray-500 text-xs font-semibold">{group.label}</p>
            {group.items.map((event) => (
              <div key={event.eventId} className="flex items-start justify-between gap-3 text-sm">
                <p className="text-gray-200">
                  {activityLine({
                    place,
                    memberName: memberName(event.userId),
                    eventType: event.eventType,
                    source: event.source,
                  })}
                  {event.source === EVENT_SOURCE.MANUAL && event.eventType === EVENT_TYPE.CHECKED_IN ? '' : ''}
                </p>
                <p className="text-gray-500 flex-shrink-0">{formatClock(event.timestamp) || formatLastSeen(event.timestamp)}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {isOwner && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-gray-400">Actions</p>
          <button
            type="button"
            onClick={() => onEdit?.()}
            className="w-full bg-white/10 text-white py-3 rounded-xl font-semibold tap-target"
          >
            Edit Place
          </button>
          {isHomePlace(place) && (
            <button
              type="button"
              onClick={() => setConfirmHome(true)}
              className="w-full bg-white/10 text-white py-3 rounded-xl font-semibold tap-target"
            >
              Update Home address
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full bg-red-950/60 border border-red-500/40 text-red-200 py-3 rounded-xl font-semibold tap-target"
          >
            Delete Place
          </button>
        </div>
      )}

      {confirmHome && (
        <ConfirmDialog
          title={homeAddressConfirmTitle}
          body={homeAddressConfirmBody}
          confirmLabel="Update Home"
          onCancel={() => setConfirmHome(false)}
          onConfirm={() => {
            setConfirmHome(false);
            if (onUpdateHome) onUpdateHome();
            else onEdit?.();
          }}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={deletePlaceTitle(place)}
          body={deletePlaceBody}
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => onDelete?.(place)}
        />
      )}
    </div>
  );
};

export default PlaceDetail;
