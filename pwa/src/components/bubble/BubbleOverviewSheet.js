import React from 'react';
import { formatLastSeen, getStatusEmoji } from '../../utils/timeUtils';
import { MEMO_TYPE, formatMemberLocation } from '../../services/memos';

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

const MemoRow = ({ memo, member, onClick }) => {
  const isCheckin = memo.type === MEMO_TYPE.CHECKIN;
  const isPlace = memo.type === MEMO_TYPE.PLACE;
  const title = isCheckin
    ? '📍 Checked in'
    : isPlace
      ? (memo.message || 'Place update')
      : getStatusEmoji(memo.status);
  const fallbackMessage = isCheckin ? 'Checked in' : isPlace ? 'Place update' : 'Updated status';
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-3 rounded-2xl border tap-target glass-light border-white/10"
    >
      <div className="flex items-start gap-3">
        <MemberAvatar member={member} size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white">
            {isPlace ? title : (
              <>
                {title}{' '}
                {member?.name || 'Family member'}
              </>
            )}
          </p>
          {!isPlace && (
          <p className="text-sm text-gray-300">
            {memo.message || fallbackMessage}
          </p>
          )}
          <p className="text-xs text-gray-400 mt-1">{formatLastSeen(memo.createdAt)}</p>
        </div>
      </div>
    </button>
  );
};

const BubbleOverviewSheet = ({
  members = [],
  memos = [],
  bubbleName,
  section = 'members',
  onMemberClick,
  onMemoClick,
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
                onClick={() => onMemoClick?.(memo)}
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
