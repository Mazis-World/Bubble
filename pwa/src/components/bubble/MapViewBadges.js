import React from 'react';
import { checkInButtonLabel } from '../../services/checkin';

export const MAP_BADGE_CLASS =
  'bg-gray-900/95 backdrop-blur-xl rounded-xl px-4 py-2.5 border border-gray-800/50 shadow-xl tap-target';

const MapViewBadges = ({
  memberCount = 0,
  memoCount = 0,
  onMemberCountClick,
  onMemosClick,
  onCheckIn,
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
            className={`${MAP_BADGE_CLASS} disabled:opacity-70`}
            aria-label={checkInLabel}
          >
            <p className="text-white text-sm font-semibold">{checkInLabel}</p>
          </button>
        )}
      </div>
      {onMemosClick && (
        <button
          type="button"
          onClick={onMemosClick}
          className={`absolute top-4 right-4 z-10 ${MAP_BADGE_CLASS}`}
          aria-label={`${memoCountLabel}. Open family memos`}
        >
          <p className="text-white text-sm font-semibold">📝 {memoCountLabel}</p>
        </button>
      )}
    </>
  );
};

export default MapViewBadges;
