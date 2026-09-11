import React from 'react';
import { Check, Loader2, MapPin } from 'lucide-react';
import { checkInButtonLabel } from '../../services/checkin';

export const MAP_BADGE_CLASS =
  'glass-strong rounded-xl px-4 py-2.5 border border-white/10 shadow-xl tap-target';

const CheckInIcon = ({ state }) => {
  if (state === 'busy') {
    return <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" aria-hidden="true" />;
  }
  if (state === 'done') {
    return <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />;
  }
  return (
    <MapPin
      className={`w-4 h-4 flex-shrink-0 ${state === 'error' ? 'text-amber-400' : 'text-blue-400'}`}
      aria-hidden="true"
    />
  );
};

const MapViewBadges = ({
  memberCount = 0,
  memoCount = 0,
  onMemberCountClick,
  onMemosClick,
  onCheckIn,
  onPlacesClick,
  checkInState = 'idle',
}) => {
  const memberCountLabel = `${memberCount} ${memberCount === 1 ? 'Member' : 'Members'}`;
  const memoCountLabel = `${memoCount} ${memoCount === 1 ? 'Memo' : 'Memos'}`;
  const checkInLabel = checkInButtonLabel(checkInState);

  return (
    <>
      <div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-2">
        {onMemberCountClick && (
          <button
            type="button"
            onClick={onMemberCountClick}
            className={MAP_BADGE_CLASS}
            aria-label={`${memberCountLabel}. Open members`}
          >
            <p className="text-white text-sm font-semibold">🌍 {memberCountLabel}</p>
          </button>
        )}
        {onCheckIn && (
          <button
            type="button"
            onClick={onCheckIn}
            disabled={checkInState === 'busy'}
            className={`${MAP_BADGE_CLASS} flex items-center gap-2 disabled:opacity-70 ${
              checkInState === 'idle' ? 'shadow-[0_0_0_3px_rgba(96,165,250,0.5)]' : ''
            }`}
            aria-label={checkInLabel}
          >
            <CheckInIcon state={checkInState} />
            <p className="text-white text-sm font-semibold">{checkInLabel}</p>
          </button>
        )}
      </div>
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
        {onMemosClick && (
          <button
            type="button"
            onClick={onMemosClick}
            className={MAP_BADGE_CLASS}
            aria-label={`${memoCountLabel}. Open family memos`}
          >
            <p className="text-white text-sm font-semibold">📝 {memoCountLabel}</p>
          </button>
        )}
        {onPlacesClick && (
          <button
            type="button"
            onClick={onPlacesClick}
            className={MAP_BADGE_CLASS}
            aria-label="Open Places"
          >
            <p className="text-white text-sm font-semibold">📍 Places</p>
          </button>
        )}
      </div>
    </>
  );
};

export default MapViewBadges;
