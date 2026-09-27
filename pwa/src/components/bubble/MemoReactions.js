import React from 'react';
import {
  MEMO_REACTION_EMOJIS,
  MEMO_REACTION_LABELS,
  reactionCountByEmoji,
  viewerMemoReaction,
} from '../../services/memos';

const MemoReactions = ({
  reactions = {},
  currentUserId = null,
  onReact,
}) => {
  const counts = reactionCountByEmoji(reactions);
  const mine = viewerMemoReaction(reactions, currentUserId);

  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label="Memo reactions"
    >
      {MEMO_REACTION_EMOJIS.map((emoji) => {
        const count = counts[emoji];
        const selected = mine === emoji;
        const label = MEMO_REACTION_LABELS[emoji];
        const countSuffix = count > 0 ? `, ${count}` : '';
        return (
          <button
            key={emoji}
            type="button"
            aria-pressed={selected}
            aria-label={`React with ${label}${countSuffix}`}
            onClick={(event) => {
              event.stopPropagation();
              onReact?.(emoji);
            }}
            className={`tap-target inline-flex items-center gap-1 rounded-full border px-2 py-1 text-sm leading-none transition-colors ${
              selected
                ? 'bg-white/20 border-white/40 text-white'
                : 'bg-black/25 border-white/10 text-gray-200 hover:border-white/30'
            }`}
          >
            <span aria-hidden="true">{emoji}</span>
            {count > 0 && (
              <span className="text-[11px] font-semibold tabular-nums">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default MemoReactions;
