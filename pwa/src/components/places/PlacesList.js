import React from 'react';
import { Plus } from 'lucide-react';
import {
  MAX_PLACES_PER_USER,
  PLACE_LIMIT_MESSAGE,
} from '../../services/places/constants';
import {
  emptyPlacesBody,
  emptyPlacesTitle,
  formatPlaceStatus,
  formatPlacesUsed,
} from '../../services/places/copy';
import { formatLastSeen } from '../../utils/timeUtils';

const lastActivityAt = (place, eventsByPlace = {}) => {
  const events = eventsByPlace[place.placeId] || [];
  if (events[0]?.timestamp) return events[0].timestamp;
  return place.updatedAt || place.createdAt;
};

const PlaceCard = ({ place, status, lastActivity, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-left p-4 rounded-2xl glass-light border border-white/10 tap-target hover:bg-white/5"
  >
    <div className="flex items-start gap-3">
      <span className="text-2xl" aria-hidden="true">{place.icon || '📍'}</span>
      <div className="min-w-0 flex-1">
        <p className="text-white font-bold truncate">{place.name}</p>
        <p className="text-gray-300 text-sm">{status}</p>
        <p className="text-gray-500 text-xs mt-1">Last activity: {formatLastSeen(lastActivity)}</p>
      </div>
    </div>
  </button>
);

const PlacesList = ({
  places = [],
  presence = [],
  members = [],
  currentUserId,
  locationAvailable = true,
  eventsByPlace = {},
  onAdd,
  onSelect,
  addingDisabledReason = null,
}) => {
  const mine = places.filter((place) => place.ownerId === currentUserId);
  const used = mine.length;
  const atLimit = used >= MAX_PLACES_PER_USER;

  if (mine.length === 0) {
    return (
      <div className="space-y-5 text-center py-4">
        <div className="text-5xl" aria-hidden="true">🏠</div>
        <div>
          <h4 className="text-xl font-black text-white">{emptyPlacesTitle}</h4>
          <p className="text-gray-400 text-sm mt-2">{emptyPlacesBody}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3.5 rounded-2xl font-bold tap-target flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add Place
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Places</p>
        <p className="text-gray-500 text-xs mt-1">{formatPlacesUsed(used)}</p>
      </div>
      <div className="space-y-2">
        {mine.map((place) => (
          <PlaceCard
            key={place.placeId}
            place={place}
            status={formatPlaceStatus({
              place,
              presence: presence.filter((item) => item.placeId === place.placeId),
              members,
              locationAvailable,
            })}
            lastActivity={lastActivityAt(place, eventsByPlace)}
            onClick={() => onSelect?.(place)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          if (atLimit) return;
          onAdd?.();
        }}
        disabled={atLimit}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3.5 rounded-2xl font-bold tap-target flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Plus size={18} />
        Add Place
      </button>
      {atLimit && (
        <p className="text-amber-200 text-sm text-center">{addingDisabledReason || PLACE_LIMIT_MESSAGE}</p>
      )}
    </div>
  );
};

export default PlacesList;
