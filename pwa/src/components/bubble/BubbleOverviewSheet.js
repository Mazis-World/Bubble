import React from 'react';
import { formatLastSeen, getStatusEmoji } from '../../utils/timeUtils';
import { MEMO_TYPE, formatMemberLocation } from '../../services/memos';
import { formatVoiceDuration } from '../../services/memoMedia';
import MemoReactions from './MemoReactions';

const MemberAvatar = ({ member, size = 44 }) => {
  const photo = member?.photoUrl || member?.photoURL;
  const name = member?.name || '?';
  return (
    <div
      className="relative rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-600 to-purple-600"
      style={{ width: size, height: size }}
    >
      {photo ? (
        <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <span className="flex items-center justify-center w-full h-full text-white font-bold">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
};

const MemberRow = ({ member, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-3 p-3 rounded-2xl glass-light border border-white/10 text-left tap-target"
  >
    <MemberAvatar member={member} />
    <div className="min-w-0 flex-1">
      <p className="text-white font-bold truncate">{member.name || 'Family member'}</p>
      <p className="text-gray-400 text-xs truncate">{formatMemberLocation(member.lastKnownLocation)}</p>
    </div>
    <div className="text-right flex-shrink-0">
      <p className="text-xl" aria-hidden="true">{getStatusEmoji(member.status)}</p>
      {member.statusText && (
        <p className="text-gray-400 text-xs max-w-[7rem] truncate">{member.statusText}</p>
      )}
    </div>
  </button>
);

const MemoRow = ({ memo, member, currentUserId, onClick, onReact }) => {
  const isSos = memo.type === MEMO_TYPE.SOS;
  const isCheckin = memo.type === MEMO_TYPE.CHECKIN;
  const isPlace = memo.type === MEMO_TYPE.PLACE;
  const title = isSos
    ? '🚨 SOS ALERT'
    : isCheckin
      ? '📍 Checked in'
      : isPlace
        ? (memo.message || 'Place update')
        : getStatusEmoji(memo.status);
  const fallbackMessage = isSos ? 'Needs assistance' : isCheckin ? 'Checked in' : isPlace ? 'Place update' : 'Updated status';
  return (
    <div
      className={`w-full text-left p-3 rounded-2xl border ${
        isSos ? 'bg-red-950/70 border-red-500/50' : 'glass-light border-white/10'
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left tap-target"
      >
        <div className="flex items-start gap-3">
          <MemberAvatar member={member} size={40} />
          <div className="min-w-0 flex-1">
            <p className={`font-bold ${isSos ? 'text-red-200' : 'text-white'}`}>
              {isPlace ? title : (
                <>
                  {title}{' '}
                  {member?.name || 'Family member'}
                </>
              )}
            </p>
            {!isPlace && (
              <p className={`text-sm ${isSos ? 'text-red-100' : 'text-gray-300'}`}>
                {memo.message || fallbackMessage}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">{formatLastSeen(memo.createdAt)}</p>
          </div>
        </div>
      </button>
      {memo.photoUrl && (
        <button type="button" onClick={onClick} className="mt-2 block w-full">
          <img
            src={memo.photoUrl}
            alt="Attached to this status update"
            className="w-full max-h-48 object-cover rounded-xl border border-white/10"
          />
        </button>
      )}
      {memo.voiceUrl && (
        <div className="mt-2">
          <audio
            className="w-full"
            controls
            preload="none"
            src={memo.voiceUrl}
            aria-label="Voice memo"
            onClick={(event) => event.stopPropagation()}
          />
          {memo.voiceDurationMs != null && (
            <p className="text-xs text-gray-400 mt-1">
              Voice note · {formatVoiceDuration(memo.voiceDurationMs)}
            </p>
          )}
        </div>
      )}
      <MemoReactions
        reactions={memo.reactions}
        currentUserId={currentUserId}
        onReact={(emoji) => onReact?.(memo, emoji)}
      />
    </div>
  );
};

const BubbleOverviewSheet = ({
  members = [],
  memos = [],
  bubbleName,
  section = 'members',
  currentUserId = null,
  onMemberClick,
  onMemoClick,
  onMemoReact,
}) => {
  const count = members.length;

  if (section === 'memos') {
    return (
      <div className="space-y-3">
        <p className="text-gray-400 text-sm font-medium">
          Status updates from {bubbleName || 'your bubble'}
        </p>
        {memos.length === 0 ? (
          <p className="text-gray-400 text-sm">No memos yet.</p>
        ) : (
          <div className="space-y-2">
            {memos.map((memo) => (
              <MemoRow
                key={memo.memoId}
                memo={memo}
                member={members.find((item) => item.userId === memo.userId || item.id === memo.nodeId)}
                currentUserId={currentUserId}
                onClick={() => onMemoClick?.(memo)}
                onReact={onMemoReact}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-gray-400 text-sm font-medium">
        {count} {count === 1 ? 'Member' : 'Members'}
      </p>
      <div className="space-y-2">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            onClick={() => onMemberClick?.(member)}
          />
        ))}
      </div>
    </div>
  );
};

export default BubbleOverviewSheet;
