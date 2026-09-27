import React, { useEffect, useRef, useState } from 'react';
import { Plus, Share2 } from 'lucide-react';
import {
  MEMO_REACTION_EMOJIS,
  MEMO_REACTION_LABELS,
  buildMemoSharePayload,
  shareMemo,
  usedReactionChips,
  viewerMemoReaction,
  recordMemoShare,
} from '../../services/memos';

const chipClass = (selected) =>
  `tap-target inline-flex items-center gap-1 rounded-full border px-2 py-1 text-sm leading-none transition-colors ${
    selected
      ? 'bg-white/20 border-white/40 text-white'
      : 'bg-black/30 border-white/15 text-gray-100 hover:border-white/30'
  }`;

const iconButtonClass = (active) =>
  `tap-target inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
    active
      ? 'bg-white/20 border-white/40 text-white'
      : 'bg-black/25 border-white/10 text-gray-200 hover:border-white/30'
  }`;

const MemoReactionChips = ({ chips, mine, onReact }) => {
  if (!chips.length) return null;
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      aria-label="Reactions on this memo"
    >
      {chips.map(({ emoji, count, label }) => {
        const selected = mine === emoji;
        return (
          <button
            key={emoji}
            type="button"
            aria-pressed={selected}
            aria-label={`React with ${label}, ${count}`}
            onClick={(event) => {
              event.stopPropagation();
              onReact?.(emoji);
            }}
            className={chipClass(selected)}
          >
            <span aria-hidden="true">{emoji}</span>
            <span className="text-[11px] font-semibold tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
};

const MemoReactions = ({
  reactions = {},
  currentUserId = null,
  memo = null,
  memberName = null,
  bubbleName = null,
  onReact,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState(null);
  const pickerRef = useRef(null);
  const shareTimerRef = useRef(null);
  const chips = usedReactionChips(reactions);
  const mine = viewerMemoReaction(reactions, currentUserId);

  useEffect(() => () => {
    if (shareTimerRef.current) window.clearTimeout(shareTimerRef.current);
  }, []);

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const onPointerDown = (event) => {
      if (!pickerRef.current?.contains(event.target)) setPickerOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setPickerOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [pickerOpen]);

  const pickEmoji = (emoji) => {
    setPickerOpen(false);
    onReact?.(emoji);
  };

  const handleShare = async (event) => {
    event.stopPropagation();
    try {
      const result = await shareMemo(buildMemoSharePayload({
        memo,
        memberName,
        bubbleName,
      }));
      if (result === 'cancelled') return;
      setShareStatus(result === 'shared' ? 'Shared' : 'Copied');
      if (shareTimerRef.current) window.clearTimeout(shareTimerRef.current);
      shareTimerRef.current = window.setTimeout(() => setShareStatus(null), 2000);
      if (memo?.bubbleId && memo?.memoId) {
        recordMemoShare({ bubbleId: memo.bubbleId, memoId: memo.memoId }).catch((error) => {
          console.warn('Memo share notify failed:', error);
        });
      }
    } catch (error) {
      console.warn('Memo share failed:', error);
      setShareStatus('Retry');
      if (shareTimerRef.current) window.clearTimeout(shareTimerRef.current);
      shareTimerRef.current = window.setTimeout(() => setShareStatus(null), 2000);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      <MemoReactionChips chips={chips} mine={mine} onReact={onReact} />
      <div className="flex items-center gap-2">
        <div className="relative" ref={pickerRef}>
          {pickerOpen && (
            <div
              className="absolute bottom-full left-0 mb-2 flex items-center gap-1 rounded-full border border-white/15 bg-gray-950/95 px-1.5 py-1 shadow-xl"
              role="listbox"
              aria-label="Choose a reaction"
            >
              {MEMO_REACTION_EMOJIS.map((emoji) => {
                const selected = mine === emoji;
                const label = MEMO_REACTION_LABELS[emoji];
                return (
                  <button
                    key={emoji}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    aria-label={`React with ${label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      pickEmoji(emoji);
                    }}
                    className={`tap-target inline-flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none ${
                      selected ? 'bg-white/20' : 'hover:bg-white/10'
                    }`}
                  >
                    <span aria-hidden="true">{emoji}</span>
                  </button>
                );
              })}
            </div>
          )}
          <button
            type="button"
            aria-label="Add reaction"
            aria-expanded={pickerOpen}
            aria-haspopup="listbox"
            onClick={(event) => {
              event.stopPropagation();
              setPickerOpen((open) => !open);
            }}
            className={iconButtonClass(pickerOpen)}
          >
            <Plus size={16} strokeWidth={2.4} />
          </button>
        </div>
        <button
          type="button"
          aria-label="Share this memo"
          onClick={handleShare}
          className={`tap-target inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors ${
            shareStatus
              ? 'bg-white/20 border-white/40 text-white'
              : 'bg-black/25 border-white/10 text-white hover:border-white/30'
          }`}
        >
          <Share2 size={15} strokeWidth={2.2} />
          <span>{shareStatus || 'Share'}</span>
        </button>
      </div>
    </div>
  );
};

export default MemoReactions;
