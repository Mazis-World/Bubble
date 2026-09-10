import React from 'react';
import { Check, Loader2, MapPin } from 'lucide-react';
import { checkInButtonLabel, checkInHint } from '../../services/checkin';
import { formatLastSeen } from '../../utils/timeUtils';

const CheckInIcon = ({ state, onGreen = false }) => {
  const className = `w-4 h-4 flex-shrink-0 ${onGreen ? 'text-white' : 'text-blue-400'}`;
  if (state === 'busy') {
    return <Loader2 className={`${className} animate-spin`} aria-hidden="true" />;
  }
  if (state === 'done') {
    return <Check className={`w-4 h-4 flex-shrink-0 ${onGreen ? 'text-white' : 'text-emerald-400'}`} aria-hidden="true" />;
  }
  return <MapPin className={`${className} ${state === 'error' ? 'text-amber-400' : ''}`} aria-hidden="true" />;
};

const MemberAvatar = ({ member }) => {
  const photo = member?.photoUrl || member?.photoURL;
  const name = member?.name || '?';
  return (
    <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
      {photo ? (
        <img src={photo} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-white font-black text-base">{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
};

/**
 * Check-in fragment over the Map — same overlay as the demo advert.
 * Hidden with opacity/visibility so it never peeks into the SOS dock.
 */
const CheckInPopup = ({
  open = false,
  state = 'idle',
  member,
  memo,
  onConfirm,
  onClose,
}) => {
  const label = checkInButtonLabel(state);
  const hint = checkInHint(state);
  const done = state === 'done';
  const busy = state === 'busy';

  return (
    <>
      <button
        type="button"
        aria-hidden={!open}
        tabIndex={open ? 0 : -1}
        onClick={() => {
          if (!busy) onClose?.();
        }}
        className={`absolute inset-0 z-[12] bg-slate-950/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
        aria-label="Close check in"
      />
      <section
        aria-label="Check in"
        aria-hidden={!open}
        className={`absolute left-3.5 right-3.5 bottom-3 z-[14] rounded-[22px] p-3.5 border border-white/14 shadow-[0_18px_40px_rgba(0,0,0,0.45)] transition-[opacity,transform] duration-300 ease-out ${
          open
            ? 'opacity-100 visible translate-y-0 scale-100'
            : 'opacity-0 invisible pointer-events-none translate-y-4 scale-95'
        }`}
        style={{ background: 'rgba(17,24,39,0.94)' }}
      >
        <p className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-blue-300 mb-1.5">
          Map
        </p>
        <h2 className="text-lg font-extrabold mb-2.5 gradient-text">Check in</h2>
        <p className="text-slate-300 text-[13px] leading-snug mb-3">{hint}</p>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy || done}
          className={`w-full rounded-2xl py-3 px-3 flex items-center justify-center gap-2 text-[15px] font-extrabold text-white border tap-target ${
            done
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 border-transparent'
              : 'bg-slate-900/90 border-white/14 disabled:opacity-90'
          }`}
          aria-label={label}
        >
          <CheckInIcon state={state} onGreen={done} />
          <span>{label}</span>
        </button>
        {done && memo && (
          <div className="flex items-start gap-2.5 mt-2.5 p-2.5 rounded-2xl bg-white/5 border border-white/10">
            <MemberAvatar member={member} />
            <div className="min-w-0">
              <p className="text-white font-bold text-sm">
                📍 Checked in {member?.name || 'Family member'}
              </p>
              <p className="text-gray-300 text-[13px] mt-0.5">
                {memo.message || 'Checked in'}
              </p>
              <p className="text-blue-300 text-[11px] font-bold mt-1">
                {formatLastSeen(memo.createdAt)} · family memo sent
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default CheckInPopup;
