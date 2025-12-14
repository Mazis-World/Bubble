import React, { useState, useEffect } from 'react';
import { getStatusEmoji, formatLastSeen } from '../../utils/timeUtils';

const MemberBubble = ({ member, onClick, isCenter = false, delay = 0, position = null }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Optimized face-sized bubbles - mobile friendly touch targets
  const memberTier = member?.tier || (member?.type === 'owner' ? 1 : 2);
  const isOwner = memberTier === 1 || member?.type === 'owner';
  // Mobile: larger for touch, Desktop: optimized sizes
  // Mobile: owner 72px, tier 2: 64px, tier 3+: 56px
  // Desktop: owner 64px, tier 2: 56px, tier 3+: 48px
  const size = isOwner 
    ? 'w-18 h-18 sm:w-16 sm:h-16' 
    : memberTier === 2 
    ? 'w-16 h-16 sm:w-14 sm:h-14' 
    : 'w-14 h-14 sm:w-12 sm:h-12';
  const statusIconSize = isOwner ? 'w-7 h-7 sm:w-6 sm:h-6' : memberTier === 2 ? 'w-6 h-6 sm:w-5 sm:h-5' : 'w-5 h-5 sm:w-4 sm:h-4';
  const iconSize = isOwner ? 16 : memberTier === 2 ? 14 : 12;
  const borderWidth = isOwner ? 'border-2' : memberTier === 2 ? 'border-2' : 'border-2';

  const StatusIcon = ({ status }) => {
    // Default styling
    const defaultStyle = { color: 'bg-gray-500', ring: 'ring-gray-500/50' };
    
    // Check if it's a legacy text status
    const legacyStatuses = {
      Safe: { color: 'bg-emerald-500', ring: 'ring-emerald-500/50' },
      Busy: { color: 'bg-amber-500', ring: 'ring-amber-500/50' },
      Offline: { color: 'bg-gray-500', ring: 'ring-gray-500/50' },
      Help: { color: 'bg-rose-500', ring: 'ring-rose-500/50' }
    };

    const { color, ring } = legacyStatuses[status] || defaultStyle;
    const emoji = getStatusEmoji(status);

    return (
      <div className={`absolute -bottom-0.5 -right-0.5 ${statusIconSize} ${color} rounded-full flex items-center justify-center ${borderWidth} border-gray-950 shadow-xl ${ring} ring-1 transition-all duration-300`}>
        <span className="text-xs sm:text-sm">{emoji}</span>
      </div>
    );
  };

  if (!member) return null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`${size} cursor-pointer transition-all duration-500 ease-out ${
        isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
      } relative z-10`}
      style={{ 
        transitionDelay: `${delay}ms`,
        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
      }}
    >
      {/* Apple Watch style face container */}
      <div className={`w-full h-full rounded-full shadow-2xl flex items-center justify-center relative overflow-hidden group transition-all duration-300 ${
        isHovered ? 'shadow-blue-500/50 ring-2 ring-blue-500/30' : 'shadow-gray-900/50'
      } ${member.lastUpdated && Date.now() - new Date(member.lastUpdated.seconds * 1000).getTime() < 300000 ? 'animate-pulse-subtle' : ''}`}>
        {/* Main photo/avatar */}
        {member.photoUrl ? (
          <img 
            src={member.photoUrl} 
            alt={member.name} 
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center">
            <span className="text-lg sm:text-xl text-white font-bold opacity-80">
              {member.name ? member.name.charAt(0).toUpperCase() : '?'}
            </span>
          </div>
        )}
        
        {/* Apple Watch style glossy overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent rounded-full opacity-60"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent rounded-full"></div>
        
        {/* Outer ring glow effect */}
        <div className={`absolute inset-0 rounded-full ${borderWidth} ${
          isCenter ? 'border-white/60' : 'border-white/40'
        } transition-all duration-300 ${isHovered ? 'border-white/80' : ''}`}></div>
        
        {/* Inner highlight ring */}
        <div className="absolute inset-2 rounded-full border border-white/20"></div>

        {/* Name label on hover/touch (for non-center bubbles) */}
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

      {/* Status indicator */}
      <StatusIcon status={member.status || '⚪'} />

      {/* Center indicator for current user - mobile optimized */}
      {isCenter && (
        <div className="absolute -top-0.5 sm:-top-1 left-1/2 transform -translate-x-1/2 w-6 h-6 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center border border-white shadow-lg z-20">
          <span className="text-white text-[9px] sm:text-[8px] font-bold leading-none">YOU</span>
        </div>
      )}
    </div>
  );
};

export default MemberBubble;
