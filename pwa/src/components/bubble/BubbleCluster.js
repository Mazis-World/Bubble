import React, { useEffect, useRef, useState } from 'react';
import MemberBubble from '../ui/MemberBubble';
import { Compass } from 'lucide-react';

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

const BubbleCluster = ({ bubbleData, onStatusClick, onMemberClick }) => {
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
    // Ensure id exists (either from nodeId or id property)
    const memberId = member.id || member.nodeId;
    if (!memberId) return false;
    // Add id if it's missing but nodeId exists
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
    const maxRadius = Math.min(width, height) * 0.4; // Use 80% of radius for bubbles

    // Get current user's location (center of radar)
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

    // Calculate distances and bearings for all members
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

    // Find max distance for scaling
    const distances = membersWithLocation.map(m => m.distance);
    const calculatedMaxDistance = Math.max(...distances, 10); // At least 10km
    setMaxDistance(calculatedMaxDistance);

    // Build radar nodes
    const radarNodes = validMembers.map((member) => {
      const isCurrentUser = member.id === currentMember.id;
      
      if (isCurrentUser) {
        // Current user at center
        return {
          id: member.id,
          ...member,
          x: centerX,
          y: centerY,
          distance: 0,
          bearing: 0,
        };
      }

      // Find location data for this member
      const locationData = membersWithLocation.find(m => m.member.id === member.id);
      
      if (locationData) {
        // Position based on bearing and distance
        const normalizedDistance = Math.min(locationData.distance / calculatedMaxDistance, 1);
        const radius = normalizedDistance * maxRadius;
        
        // Convert bearing to radians (0° = North, clockwise)
        // In radar, 0° is typically at top (North), so we adjust
        const angleRad = ((locationData.bearing - 90) * Math.PI / 180); // -90 to make 0° point up
        
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
        // No location data - position randomly in outer ring
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
    
    // Initialize positions
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
      setSweepAngle(prev => (prev + 2) % 360);
    }, 50); // Smooth sweep animation
    
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

  return (
    <div className="flex items-center justify-center w-full h-full relative">
      {/* Modern outer rings with solid white glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[min(600px,90vw)] h-[min(600px,90vw)] rounded-full border-2 border-white shadow-[0_0_40px_rgba(255,255,255,0.6),0_0_80px_rgba(255,255,255,0.3)]"></div>
        <div className="absolute w-[min(550px,82.5vw)] h-[min(550px,82.5vw)] rounded-full border border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.2)]"></div>
        <div className="absolute w-[min(520px,78vw)] h-[min(520px,78vw)] rounded-full border border-blue-500/15"></div>
      </div>

      {/* Main cluster container - radar view */}
      <div
        className="relative w-[min(500px,75vw)] h-[min(500px,75vw)] rounded-full overflow-hidden"
        ref={clusterRef}
      >
        {/* Radar distance rings */}
        {[1, 2, 3].map((ring) => (
          <div
            key={ring}
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              width: `${(ring / 3) * 80}%`,
              height: `${(ring / 3) * 80}%`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              border: `1px solid rgba(59, 130, 246, ${0.2 - ring * 0.05})`,
              borderRadius: '50%',
            }}
          />
        ))}
        
        {/* Compass directions - positioned at edges */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 pointer-events-none">
          <div className="text-white/70 text-xs font-bold glass-light px-2 py-1 rounded-lg border border-white/10">N</div>
        </div>
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <div className="text-white/70 text-xs font-bold glass-light px-2 py-1 rounded-lg border border-white/10">E</div>
        </div>
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 pointer-events-none">
          <div className="text-white/70 text-xs font-bold glass-light px-2 py-1 rounded-lg border border-white/10">S</div>
        </div>
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <div className="text-white/70 text-xs font-bold glass-light px-2 py-1 rounded-lg border border-white/10">W</div>
        </div>
        
        {/* Radar sweep line */}
        <div
          className="absolute top-1/2 left-1/2 pointer-events-none"
          style={{
            transform: `translate(-50%, -50%) rotate(${sweepAngle}deg)`,
            width: '2px',
            height: '50%',
            background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.8) 0%, rgba(59, 130, 246, 0.3) 50%, rgba(59, 130, 246, 0) 100%)',
            transformOrigin: 'center bottom',
            boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)',
          }}
        />
        
        {/* Center crosshair */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-8 h-0.5 bg-blue-500/50"></div>
          <div className="h-8 w-0.5 bg-blue-500/50 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-blue-500/70 bg-blue-500/20"></div>
        </div>
        {/* 2D Map Background - subtle geographic visualization */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
          style={{
            background: `
              radial-gradient(ellipse at 25% 35%, rgba(34, 197, 94, 0.12) 0%, transparent 30%),
              radial-gradient(ellipse at 75% 65%, rgba(59, 130, 246, 0.12) 0%, transparent 30%),
              radial-gradient(ellipse at 50% 20%, rgba(168, 85, 247, 0.1) 0%, transparent 25%),
              radial-gradient(ellipse at 20% 80%, rgba(34, 197, 94, 0.1) 0%, transparent 25%),
              radial-gradient(ellipse at 80% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 25%),
              linear-gradient(135deg, rgba(30, 58, 138, 0.2) 0%, rgba(79, 70, 229, 0.15) 50%, rgba(30, 58, 138, 0.2) 100%),
              radial-gradient(ellipse at center, rgba(59, 130, 246, 0.15) 0%, transparent 70%)
            `,
            opacity: 0.35,
            filter: 'blur(2px)',
          }}
        />
        
        {/* Map coordinate grid for geographic feel */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '25px 25px',
            opacity: 0.4,
            maskImage: 'radial-gradient(circle, black 75%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(circle, black 75%, transparent 100%)',
            filter: 'blur(0.5px)',
          }}
        />
        
        {/* Subtle map texture overlay */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(59, 130, 246, 0.02) 10px,
                rgba(59, 130, 246, 0.02) 11px
              )
            `,
            opacity: 0.5,
            maskImage: 'radial-gradient(circle, black 80%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(circle, black 80%, transparent 100%)',
          }}
        />
        
        {/* Modern glassmorphic background */}
        <div className="absolute inset-0 rounded-full glass-light"></div>
        
        {/* Enhanced glass overlay effect */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%)',
            mixBlendMode: 'overlay',
            filter: 'blur(2px)',
          }}
        ></div>
        
        {/* Modern gradient reflection */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(168,85,247,0.1) 50%, rgba(236,72,153,0.1) 100%)',
            mixBlendMode: 'soft-light',
          }}
        ></div>
        
        {/* Shimmer effect overlay */}
        <div 
          className="absolute inset-0 rounded-full pointer-events-none shimmer"
          style={{
            opacity: 0.3,
          }}
        ></div>
        
        {/* Member bubbles positioned by location */}
        {nodes.map((node, index) => {
          const pos = positions[node.id] || { x: node.x, y: node.y };
          const isCurrentUser = node.id === currentMember.id;
          
          // Calculate percentage-based positioning for responsive design
          const container = clusterRef.current;
          const containerWidth = container?.offsetWidth || 500;
          const containerHeight = container?.offsetHeight || 500;
          const centerX = containerWidth / 2;
          const centerY = containerHeight / 2;
          
          // Convert absolute coordinates to percentage
          const leftPercent = ((pos?.x ?? node.x ?? centerX) / containerWidth) * 100;
          const topPercent = ((pos?.y ?? node.y ?? centerY) / containerHeight) * 100;
          
          return (
            <div
              key={node.id}
              className="member-bubble-wrapper absolute"
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                transform: `translate(-50%, -50%)`,
                transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1), top 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: isCurrentUser ? 20 : 10,
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

        {/* Radar center glow effect */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-gradient-to-r from-blue-500/30 via-purple-500/20 to-blue-500/30 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>
        
      </div>
      
      {/* Radar info overlay - positioned outside bubble, bottom left */}
      <div className="absolute bottom-4 left-4 glass-light rounded-xl px-3 py-2 border border-white/10 shadow-lg">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-blue-400" />
          <div>
            <p className="text-xs text-gray-300 font-semibold">Radar View</p>
            <p className="text-xs text-blue-400/80">
              {maxDistance < 1 
                ? `${(maxDistance * 1000).toFixed(0)}m range` 
                : maxDistance < 1000
                ? `${maxDistance.toFixed(1)}km range`
                : `${(maxDistance / 1000).toFixed(1)}k km range`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BubbleCluster;
