import React, { useState, useEffect } from 'react';
import { getStatusEmoji, formatLastSeen } from '../../utils/timeUtils';
import { RADAR_BUBBLE_SIZE } from '../../services/radarLayout';

const MemberBubble = ({ member, onClick, isCenter = false, delay = 0, size = RADAR_BUBBLE_SIZE }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const sizePx = size;
  const photoSrc = member.photoUrl || member.photoURL;

  const StatusIcon = ({ status }) => {
    const defaultStyle = { color: 'bg-gray-500', ring: 'ring-gray-500/50' };
    const legacyStatuses = {
      Safe: { color: 'bg-emerald-500', ring: 'ring-emerald-500/50' },
      Busy: { color: 'bg-amber-500', ring: 'ring-amber-500/50' },
      Offline: { color: 'bg-gray-500', ring: 'ring-gray-500/50' },
      Help: { color: 'bg-rose-500', ring: 'ring-rose-500/50' }
    };
    const { color, ring } = legacyStatuses[status] || defaultStyle;
    const emoji = getStatusEmoji(status);

    return (
      <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 ${color} rounded-full flex items-center justify-center border-2 border-gray-950 shadow-xl ${ring} ring-1 transition-all duration-300`}>
        <span className="text-[11px] leading-none">{emoji}</span>
      </div>
    );
  };

  if (!member) return null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`cursor-pointer transition-opacity duration-500 ease-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } relative z-10 flex-shrink-0`}
      style={{
        width: sizePx,
        height: sizePx,
        minWidth: sizePx,
        minHeight: sizePx,
        maxWidth: sizePx,
        maxHeight: sizePx,
        aspectRatio: '1 / 1',
        transitionDelay: `${delay}ms`,
        transform: isVisible ? (isHovered ? 'scale(1.06)' : 'scale(1)') : 'scale(0)',
        transformOrigin: 'center center',
      }}
    >
      <div
        className={`rounded-full shadow-2xl relative overflow-hidden group transition-all duration-300 ${
          isHovered ? 'shadow-blue-500/50 ring-2 ring-blue-500/30' : 'shadow-gray-900/50'
        } ${member.lastUpdated && Date.now() - new Date(member.lastUpdated.seconds * 1000).getTime() < 300000 ? 'animate-pulse-subtle' : ''}`}
        style={{
          width: sizePx,
          height: sizePx,
          minWidth: sizePx,
          minHeight: sizePx,
          maxWidth: sizePx,
          maxHeight: sizePx,
          aspectRatio: '1 / 1',
          borderRadius: '50%',
          overflow: 'hidden',
        }}
      >
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={member.name}
            className="absolute inset-0 object-cover"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              borderRadius: '50%',
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center">
            <span className="text-lg text-white font-bold opacity-80">
              {member.name ? member.name.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent rounded-full opacity-60 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent rounded-full pointer-events-none"></div>

        <div className={`absolute inset-0 rounded-full border-2 ${
          isCenter ? 'border-white/60' : 'border-white/40'
        } transition-all duration-300 ${isHovered ? 'border-white/80' : ''} pointer-events-none`}></div>
      </div>

      <StatusIcon status={member.status || '⚪'} />

      {isCenter && (
        <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-6 h-5 bg-blue-500 rounded-full flex items-center justify-center border border-white shadow-lg z-20">
          <span className="text-white text-[8px] font-bold leading-none">YOU</span>
        </div>
      )}

      {!isCenter && isHovered && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-30">
          <div className="bg-gray-900/95 text-white text-xs font-semibold px-2 py-1 rounded-full border border-white/20 shadow-xl backdrop-blur-sm">
            <div className="font-bold text-[10px]">{member.name}</div>
            {member.lastUpdated && (
              <div className="text-[8px] text-gray-400 mt-0.5">
                {formatLastSeen(member.lastUpdated)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberBubble;
