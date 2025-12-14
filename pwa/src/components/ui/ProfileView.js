import React from 'react';
import { X, Crown, Users, Clock, MapPin } from 'lucide-react';
import { formatLastSeen, getStatusDisplay } from '../../utils/timeUtils';

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

const ProfileView = ({ member, isCurrentUser, onClose, onEdit, currentUserLocation }) => {
  if (!member) return null;

  const memberTier = member?.tier || (member?.type === 'owner' ? 1 : 2);
  const isOwner = memberTier === 1 || member?.type === 'owner';

  const StatusIcon = ({ status }) => {
    // Default styling for emoji statuses
    const defaultStyle = { bg: 'bg-gray-500/10', border: 'border-gray-500/20' };
    
    // Check if it's a legacy text status
    const legacyStatuses = {
      Safe: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
      Busy: { bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
      Offline: { bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
      Help: { bg: 'bg-rose-500/10', border: 'border-rose-500/20' }
    };

    const { bg, border } = legacyStatuses[status] || defaultStyle;

    return (
      <div className={`flex items-center justify-center gap-3 px-4 py-4 rounded-xl border ${bg} ${border}`}>
        <span className="text-4xl">{getStatusDisplay(status)}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-strong border border-white/10 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 glass-strong border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold gradient-text">Profile</h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-all duration-300 p-2 glass-light hover:bg-white/10 rounded-xl active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Photo and Basic Info */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full overflow-hidden shadow-2xl ${
                isOwner ? 'ring-4 ring-purple-500/50' : 'ring-2 ring-blue-500/30'
              }`}>
                {member.photoUrl ? (
                  <img 
                    src={member.photoUrl} 
                    alt={member.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center">
                    <span className="text-4xl text-white font-bold opacity-80">
                      {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                )}
              </div>
              {isOwner && (
                <div className="absolute -top-2 -right-2 bg-purple-600 rounded-full p-1.5 shadow-lg">
                  <Crown size={16} className="text-white" />
                </div>
              )}
              {isCurrentUser && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-600 rounded-full px-3 py-1 shadow-lg">
                  <span className="text-white text-xs font-bold">YOU</span>
                </div>
              )}
            </div>
            
            <h3 className="text-3xl font-bold gradient-text mt-6">{member.name || 'Unknown'}</h3>
            <p className="text-gray-300 capitalize mt-1 font-medium">{member.role || 'Family Member'}</p>
            
            {isOwner && (
              <div className="mt-2 flex items-center gap-2 text-purple-300 font-bold">
                <Crown size={16} />
                <span className="text-sm">Bubble Owner</span>
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <h4 className="text-sm font-bold text-gray-200 mb-3 uppercase tracking-wide">Status</h4>
            <div className="glass-light rounded-2xl p-4">
              <StatusIcon status={member.status || '⚪'} />
            </div>
            
            {/* Last Update */}
            {member.lastUpdated && (
              <div className="mt-3 flex items-center gap-2 text-gray-400 text-sm font-medium">
                <Clock size={14} />
                <span>Last updated {formatLastSeen(member.lastUpdated)}</span>
              </div>
            )}
          </div>

          {/* Quote */}
          {member.quote && (
            <div>
              <h4 className="text-sm font-bold text-gray-200 mb-3 uppercase tracking-wide">Quote</h4>
              <div className="glass-light border border-white/10 rounded-2xl p-4">
                <p className="text-gray-200 italic font-medium">"{member.quote}"</p>
              </div>
            </div>
          )}

          {/* Distance (if location data available) */}
          {!isCurrentUser && currentUserLocation && member.lastKnownLocation && 
           currentUserLocation.latitude && currentUserLocation.longitude &&
           member.lastKnownLocation.latitude && member.lastKnownLocation.longitude && (
            <div>
              <h4 className="text-sm font-bold text-gray-200 mb-3 uppercase tracking-wide">Distance</h4>
              <div className="glass-light border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-semibold">
                      {(() => {
                        const distance = calculateDistance(
                          currentUserLocation.latitude,
                          currentUserLocation.longitude,
                          member.lastKnownLocation.latitude,
                          member.lastKnownLocation.longitude
                        );
                        return distance < 1 
                          ? `${Math.round(distance * 1000)}m away`
                          : distance < 1000
                          ? `${distance.toFixed(1)}km away`
                          : `${(distance / 1000).toFixed(1)}k km away`;
                      })()}
                    </p>
                    {member.lastKnownLocation.address && (
                      <p className="text-gray-400 text-sm mt-1">{member.lastKnownLocation.address}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tier Info */}
          <div>
            <h4 className="text-sm font-bold text-gray-200 mb-3 uppercase tracking-wide">Connection Level</h4>
            <div className="glass-light border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-blue-400" />
                  <span className="text-white font-semibold">Tier {memberTier}</span>
                </div>
                <span className="text-gray-400 text-sm">
                  {memberTier === 1 ? 'Owner' : memberTier === 2 ? 'Direct Family' : 'Extended Family'}
                </span>
              </div>
            </div>
          </div>

          {/* Edit Button (only for current user) */}
          {isCurrentUser && onEdit && (
            <button
              onClick={onEdit}
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-3.5 rounded-2xl font-bold hover:shadow-xl glow-purple hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden group"
            >
              <span className="relative z-10">Edit Profile</span>
              <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;

