import React, { useEffect, useRef, useState } from 'react';
import MemberBubble from '../ui/MemberBubble';
import { Radio } from 'lucide-react';

// Theme system - ready for future additions like snowflakes
// eslint-disable-next-line no-unused-vars
const RADAR_THEMES = {
  default: {
    name: 'Default',
    particles: null, // Can add snowflakes, stars, etc. here
  },
  snowglobe: {
    name: 'Snowglobe',
    particles: 'snowflakes', // Future: snowflakes falling
  },
};

// Geographic calculation utilities for radar positioning
const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x);
  bearing = bearing * 180 / Math.PI;
  bearing = (bearing + 360) % 360;
  
  return bearing;
};

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

const BubbleCluster = ({ bubbleData, onStatusClick, onMemberClick, theme = 'default' }) => {
  const clusterRef = useRef(null);

  const [nodes, setNodes] = useState([]);
  const [positions, setPositions] = useState({});
  const [maxDistance, setMaxDistance] = useState(100); // km
  const [sweepAngle, setSweepAngle] = useState(0);

  // Ensure currentMember and allMembers are safely accessed
  const currentMember = bubbleData?.currentMember;
  const allMembers = bubbleData?.allMembers || [];
  
  // Filter and prepare members - ensure they have required properties
  const validMembers = allMembers.filter(member => {
    if (!member || typeof member !== 'object') return false;
    const memberId = member.id || member.nodeId;
    if (!memberId) return false;
    if (!member.id && member.nodeId) {
      member.id = member.nodeId;
    }
    return true;
  });
  
  const memberIdString = validMembers.map(m => m.id).join(',');

  /** ----------------------------
   * RADAR POSITIONING BASED ON LOCATION
   * ---------------------------- */
  useEffect(() => {
    if (!currentMember || !validMembers.length) {
      return;
    }

    const container = clusterRef.current;
    if (!container) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) * 0.4;

    const centerLocation = currentMember.lastKnownLocation;
    if (!centerLocation || !centerLocation.latitude || !centerLocation.longitude) {
      // Fallback to tier-based if no location
      const ownerNode = validMembers.find(m => m.type === 'owner' || m.tier === 1);
      const tierGroups = {};
      validMembers.forEach(member => {
        const tier = member.tier || (member.type === 'owner' ? 1 : 2);
        if (!tierGroups[tier]) tierGroups[tier] = [];
        tierGroups[tier].push(member);
      });
      
      const fallbackNodes = validMembers.map((member) => {
        const isOwner = member.type === 'owner' || member.tier === 1;
        const tier = member.tier || (isOwner ? 1 : 2);
        
        let x, y;
        if (isOwner || (ownerNode && member.id === ownerNode.id)) {
          x = centerX;
          y = centerY;
        } else {
          const tierRadius = {
            1: 0,
            2: maxRadius * 0.5,
            3: maxRadius * 0.7,
            4: maxRadius * 0.9,
          };
          const radius = tierRadius[tier] || tierRadius[4];
          const membersInTier = tierGroups[tier] || [];
          const tierIndex = membersInTier.findIndex(m => m.id === member.id);
          const angle = (tierIndex / Math.max(membersInTier.length, 1)) * Math.PI * 2;
          x = centerX + Math.cos(angle) * radius;
          y = centerY + Math.sin(angle) * radius;
        }
        
        return {
          id: member.id,
          ...member,
          x,
          y,
          distance: 0,
          bearing: 0,
        };
      });
      
      setNodes(fallbackNodes);
      const initialPositions = {};
      fallbackNodes.forEach(n => {
        initialPositions[n.id] = { x: n.x, y: n.y };
      });
      setPositions(initialPositions);
      return;
    }

    // Calculate positions based on geographic location
    const centerLat = centerLocation.latitude;
    const centerLon = centerLocation.longitude;

    const membersWithLocation = validMembers
      .map(member => {
        const loc = member.lastKnownLocation;
        if (!loc || !loc.latitude || !loc.longitude) return null;
        
        const distance = calculateDistance(centerLat, centerLon, loc.latitude, loc.longitude);
        const bearing = calculateBearing(centerLat, centerLon, loc.latitude, loc.longitude);
        
        return {
          member,
          distance,
          bearing,
        };
      })
      .filter(Boolean);

    const distances = membersWithLocation.map(m => m.distance);
    const calculatedMaxDistance = Math.max(...distances, 10);
    setMaxDistance(calculatedMaxDistance);

    const radarNodes = validMembers.map((member) => {
      const isCurrentUser = member.id === currentMember.id;
      
      if (isCurrentUser) {
        return {
          id: member.id,
          ...member,
          x: centerX,
          y: centerY,
          distance: 0,
          bearing: 0,
        };
      }

      const locationData = membersWithLocation.find(m => m.member.id === member.id);
      
      if (locationData) {
        const normalizedDistance = Math.min(locationData.distance / calculatedMaxDistance, 1);
        const radius = normalizedDistance * maxRadius;
        const angleRad = ((locationData.bearing - 90) * Math.PI / 180);
        
        const x = centerX + Math.cos(angleRad) * radius;
        const y = centerY + Math.sin(angleRad) * radius;
        
        return {
          id: member.id,
          ...member,
          x,
          y,
          distance: locationData.distance,
          bearing: locationData.bearing,
        };
      } else {
        const angle = Math.random() * Math.PI * 2;
        const radius = maxRadius * 0.9;
        return {
          id: member.id,
          ...member,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
          distance: null,
          bearing: null,
        };
      }
    });

    setNodes(radarNodes);
    
    const initialPositions = {};
    radarNodes.forEach(n => {
      initialPositions[n.id] = { x: n.x, y: n.y };
    });
    setPositions(initialPositions);
  }, [memberIdString, currentMember, validMembers.length, validMembers]);

  /** ----------------------------
   * ANIMATED RADAR SWEEP
   * ---------------------------- */
  useEffect(() => {
    const sweepInterval = setInterval(() => {
      setSweepAngle(prev => (prev + 1.5) % 360);
    }, 30);
    
    return () => clearInterval(sweepInterval);
  }, []);

  if (!currentMember) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-t-transparent border-purple-500 rounded-full animate-spin mx-auto glow-purple"></div>
          <p className="text-gray-300 font-semibold">Loading your bubble...</p>
        </div>
      </div>
    );
  }

  // Get container dimensions for accurate centering
  const container = clusterRef.current;
  const containerWidth = container?.offsetWidth || 500;
  const containerHeight = container?.offsetHeight || 500;
  // Use exact center - these should match the visual center of the radar
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  return (
    <div className="flex items-center justify-center w-full h-full relative px-2 sm:px-4" style={{ width: '100%', height: '100%' }}>
      {/* Outer radar frame with glow - mobile optimized - PERFECTLY CENTERED */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div 
          className="rounded-full border-2 border-cyan-400/40 shadow-[0_0_40px_rgba(34,211,238,0.3),0_0_80px_rgba(34,211,238,0.15),inset_0_0_30px_rgba(34,211,238,0.08)] sm:shadow-[0_0_60px_rgba(34,211,238,0.4),0_0_120px_rgba(34,211,238,0.2),inset_0_0_40px_rgba(34,211,238,0.1)] radar-glow"
          style={{
            width: 'min(600px, 95vw)',
            height: 'min(600px, 95vw)',
          }}
        ></div>
        <div 
          className="absolute rounded-full border border-blue-400/30"
          style={{
            width: 'min(580px, 92vw)',
            height: 'min(580px, 92vw)',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        ></div>
      </div>

      {/* Main radar container - mobile responsive - CENTERED WITH FLEX */}
      <div
        className="relative rounded-full"
        ref={clusterRef}
        style={{
          width: 'min(500px, 85vw)',
          height: 'min(500px, 85vw)',
          minWidth: '280px',
          minHeight: '280px',
          background: 'radial-gradient(circle, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.98) 100%)',
          overflow: 'visible',
        }}
      >
        {/* Background texture layer - z-index 1 */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            zIndex: 1,
            background: `
              radial-gradient(circle at 30% 30%, rgba(34, 211, 238, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 70% 70%, rgba(59, 130, 246, 0.06) 0%, transparent 40%),
              repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(34, 211, 238, 0.02) 1deg, transparent 2deg)
            `,
            opacity: 0.6,
            overflow: 'visible',
          }}
        />

        {/* Grid overlay - z-index 2 */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            zIndex: 2,
            backgroundImage: `
              linear-gradient(rgba(34, 211, 238, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34, 211, 238, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '16px 16px',
            opacity: 0.25,
            maskImage: 'radial-gradient(circle, black 85%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(circle, black 85%, transparent 100%)',
            overflow: 'visible',
          }}
        />

        {/* Radar grid - radial lines (N, E, S, W and diagonals) - z-index 3 - PERFECTLY CENTERED */}
        <div className="absolute inset-0 rounded-full pointer-events-none" style={{ zIndex: 3, overflow: 'visible' }}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const isCardinal = angle % 90 === 0;
            return (
              <div
                key={angle}
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  width: isCardinal ? '3px' : '2px',
                  height: '50%',
                  transformOrigin: '50% 100%',
                  transform: `translate(-50%, -100%) rotate(${angle}deg)`,
                  background: isCardinal
                    ? 'linear-gradient(to bottom, rgba(34, 211, 238, 0.9) 0%, rgba(34, 211, 238, 0.6) 30%, rgba(34, 211, 238, 0.3) 60%, rgba(34, 211, 238, 0.1) 90%, transparent 100%)'
                    : 'linear-gradient(to bottom, rgba(59, 130, 246, 0.7) 0%, rgba(59, 130, 246, 0.4) 30%, rgba(59, 130, 246, 0.2) 60%, rgba(59, 130, 246, 0.05) 90%, transparent 100%)',
                  boxShadow: isCardinal
                    ? '0 0 8px rgba(34, 211, 238, 0.6), 0 0 4px rgba(34, 211, 238, 0.4)'
                    : '0 0 4px rgba(59, 130, 246, 0.4), 0 0 2px rgba(59, 130, 246, 0.2)',
                }}
              />
            );
          })}
        </div>

        {/* Enhanced concentric radar rings - app-specific gradient colors - z-index 4 - PERFECTLY CENTERED */}
        {[1, 2, 3, 4, 5].map((ring) => {
          const ringSize = (ring / 5) * 90;
          const isOuterRing = ring >= 4; // Outermost rings (4 and 5)
          const isInnerRing = ring <= 2;

          let borderWidth, glowIntensity;
          // Clean white rings with subtle app color tint
          const ringOpacity = isOuterRing ? 0.9 : isInnerRing ? (0.85 - (ring * 0.1)) : 0.5;
          const primaryColor = `rgba(255, 255, 255, ${ringOpacity})`;
          const glowColor = `rgba(255, 255, 255, ${ringOpacity * 0.4})`;

          if (isOuterRing) {
            borderWidth = ring === 5 ? '3px' : '2.5px';
            glowIntensity = 2.0;
          } else if (isInnerRing) {
            borderWidth = '1.5px';
            glowIntensity = 1.2;
          } else {
            borderWidth = '1px';
            glowIntensity = 0.8;
          }
          
          return (
            <div
              key={ring}
              className="absolute rounded-full pointer-events-none radar-ring-pulse"
              style={{
                zIndex: 4,
                width: `${ringSize}%`,
                height: `${ringSize}%`,
                left: `${(100 - ringSize) / 2}%`,
                top: `${(100 - ringSize) / 2}%`,
                border: `${borderWidth} solid ${primaryColor}`,
                borderRadius: '50%',
                boxShadow: isOuterRing
                  ? `0 0 20px ${glowColor}, 0 0 40px ${glowColor}, inset 0 0 10px ${glowColor}`
                  : `0 0 ${(8 + ring * 2) * glowIntensity}px ${glowColor}, inset 0 0 ${(4 + ring)}px ${glowColor}`,
                animationDelay: `${ring * 0.25}s`,
              }}
            />
          );
        })}
        
        {/* Additional inner highlight rings for depth - z-index 4 - PERFECTLY CENTERED */}
        {[1, 2].map((ring) => {
          const ringSize = (ring / 5) * 90;
          return (
            <div
              key={`highlight-${ring}`}
              className="absolute rounded-full pointer-events-none"
              style={{
                zIndex: 4,
                width: `${ringSize}%`,
                height: `${ringSize}%`,
                left: `${(100 - ringSize) / 2}%`,
                top: `${(100 - ringSize) / 2}%`,
                border: `0.5px solid rgba(255, 255, 255, ${0.2 - ring * 0.05})`,
                borderRadius: '50%',
                boxShadow: `inset 0 0 ${3 + ring}px rgba(255, 255, 255, ${0.1 - ring * 0.02})`,
              }}
            />
          );
        })}

        {/* Distance markers on rings (North position) - mobile optimized - z-index 5 */}
        {[1, 2, 3, 4, 5].map((ring) => {
          const ringSize = (ring / 5) * 90;
          const isInnerRing = ring <= 2;
          
          return (
            <div
              key={`marker-${ring}`}
              className="absolute pointer-events-none"
              style={{
                zIndex: 5,
                left: '50%',
                top: `${50 - (ringSize / 2)}%`,
                transform: 'translate(-50%, -50%)',
                width: '3px',
                height: isInnerRing ? '6px' : '5px',
                background: `linear-gradient(to bottom, rgba(34, 211, 238, ${isInnerRing ? 0.9 : 0.6}), rgba(34, 211, 238, ${isInnerRing ? 0.5 : 0.3}))`,
                borderRadius: '1.5px',
                boxShadow: `0 0 ${isInnerRing ? 4 : 3}px rgba(34, 211, 238, ${isInnerRing ? 0.7 : 0.4})`,
              }}
            />
          );
        })}

        {/* Compass directions - mobile optimized - z-index 6 - PERFECTLY POSITIONED */}
        {[
          { dir: 'N', angle: 0, offset: { top: '-2px', left: '50%' } },
          { dir: 'NE', angle: 45, offset: { top: '2px', right: '2px' } },
          { dir: 'E', angle: 90, offset: { top: '50%', right: '-2px' } },
          { dir: 'SE', angle: 135, offset: { bottom: '2px', right: '2px' } },
          { dir: 'S', angle: 180, offset: { bottom: '-2px', left: '50%' } },
          { dir: 'SW', angle: 225, offset: { bottom: '2px', left: '2px' } },
          { dir: 'W', angle: 270, offset: { top: '50%', left: '-2px' } },
          { dir: 'NW', angle: 315, offset: { top: '2px', left: '2px' } },
        ].map(({ dir, offset }) => (
          <div 
            key={dir} 
            className="absolute pointer-events-none" 
            style={{ 
              zIndex: 6,
              ...offset,
              transform: offset.left === '50%' || offset.top === '50%' 
                ? 'translate(-50%, -50%)' 
                : 'none'
            }}
          >
            <div className="text-cyan-400/80 text-[9px] sm:text-[10px] font-bold glass-light px-1 sm:px-1.5 py-0.5 rounded border border-cyan-400/20 shadow-[0_0_6px_rgba(34,211,238,0.25)] sm:shadow-[0_0_8px_rgba(34,211,238,0.3)]">
              {dir}
            </div>
          </div>
        ))}

        {/* Enhanced radar sweep line with trailing effect - z-index 7 - PERFECTLY CENTERED */}
        <div className="absolute pointer-events-none" style={{ zIndex: 7, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', transformOrigin: 'center center' }}>
          {/* Main sweep line */}
          <div
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
              width: '2.5px',
              height: '50%',
              transformOrigin: '50% 100%',
              transform: `translate(-50%, -100%) rotate(${sweepAngle}deg)`,
              background: 'linear-gradient(to bottom, rgba(34, 211, 238, 1) 0%, rgba(59, 130, 246, 0.8) 30%, rgba(59, 130, 246, 0.4) 60%, transparent 100%)',
              boxShadow: '0 0 8px rgba(34, 211, 238, 0.6), 0 0 16px rgba(34, 211, 238, 0.3)',
              borderRadius: '2px',
            }}
          />
          {/* Trailing sweep effect - hidden on mobile */}
          <div
            className="absolute hidden sm:block"
            style={{
              left: '50%',
              top: '50%',
              width: '2px',
              height: '50%',
              transformOrigin: '50% 100%',
              transform: `translate(-50%, -100%) rotate(${sweepAngle - 15}deg)`,
              background: 'linear-gradient(to bottom, rgba(34, 211, 238, 0.4) 0%, rgba(59, 130, 246, 0.2) 30%, transparent 100%)',
              boxShadow: '0 0 8px rgba(34, 211, 238, 0.3)',
              borderRadius: '1px',
            }}
          />
        </div>

        {/* Center dot only - crosshair removed - z-index 8 - PERFECTLY CENTERED */}
        <div className="absolute pointer-events-none" style={{ zIndex: 8, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
          {/* Center dot - clean white with subtle glow */}
          <div className="absolute w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-white/80 shadow-[0_0_4px_rgba(255,255,255,0.6)]" style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}></div>
        </div>

        {/* Glassmorphic overlay - z-index 9 (above rings, below bubbles) - reduced opacity so lines show through */}
        <div className="absolute inset-0 rounded-full glass-light pointer-events-none" style={{ zIndex: 9, opacity: 0.3 }}></div>


        {/* Member bubbles positioned by location - z-index 10+ (on top of everything) */}
        {nodes.map((node, index) => {
          const pos = positions[node.id] || { x: node.x, y: node.y };
          const isCurrentUser = node.id === currentMember.id;
          
          const leftPercent = ((pos?.x ?? node.x ?? centerX) / containerWidth) * 100;
          const topPercent = ((pos?.y ?? node.y ?? centerY) / containerHeight) * 100;
          
          return (
            <div
              key={node.id}
              className="member-bubble-wrapper absolute tap-target"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                transform: `translate(-50%, -50%)`,
                transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1), top 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: isCurrentUser ? 12 : 11,
                minWidth: '48px',
                minHeight: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MemberBubble
                member={node}
                isCenter={isCurrentUser}
                onClick={isCurrentUser ? onStatusClick : () => onMemberClick && onMemberClick(node)}
                delay={index * 50}
                position={pos}
              />
            </div>
          );
        })}
      </div>
      
      {/* Radar info overlay - mobile optimized */}
      <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 glass-light rounded-lg sm:rounded-xl px-2 py-1.5 sm:px-3 sm:py-2 border border-cyan-400/20 shadow-lg backdrop-blur-md max-w-[140px] sm:max-w-none">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-gray-200 font-semibold leading-tight">Radar Active</p>
            <p className="text-[9px] sm:text-xs text-cyan-400/90 font-mono leading-tight">
              {maxDistance < 1 
                ? `${(maxDistance * 1000).toFixed(0)}m` 
                : maxDistance < 1000
                ? `${maxDistance.toFixed(1)}km`
                : `${(maxDistance / 1000).toFixed(1)}k km`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BubbleCluster;
