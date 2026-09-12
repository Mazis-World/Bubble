import React, { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { RotateCcw, Pause, Play, Maximize2, Minimize2 } from 'lucide-react';
import { formatLastSeen, getStatusEmoji } from '../../utils/timeUtils';
import CheckInPopup from './CheckInPopup';
import { createPlaceHtmlMarker, globePlacePoints } from '../../services/places/markers';
import { assignMembersToPlaces, isMemberInPlaceBubble } from '../../services/places/occupancy';

// Create amazing glass-like bubbles that pop off the globe
const createFloatingHead = (member, size) => {
  const group = new THREE.Group();
  
  // Main bubble sphere - larger for better visibility
  const bubbleRadius = size * 0.25;
  const geometry = new THREE.SphereGeometry(bubbleRadius, 32, 32);
  
  // Create amazing glass bubble material
  let material;
  if (member.photoUrl) {
    // Load texture from photo with glass bubble effect
    const loader = new THREE.TextureLoader();
    const texture = loader.load(
      member.photoUrl,
      undefined,
      undefined,
      (err) => {
        console.warn('Failed to load photo texture:', err);
      }
    );
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    material = new THREE.MeshPhysicalMaterial({
      map: texture,
      transparent: true,
      opacity: 0.85,
      roughness: 0.05,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 1.0,
      ior: 1.5, // Glass-like index of refraction
      transmission: 0.9, // Glass transmission
      thickness: bubbleRadius * 0.5,
      emissive: member.tier === 1 ? 0x4a1d96 : 0x1e3a8a,
      emissiveIntensity: 0.3,
    });
  } else {
    // Glass bubble material for members without photos
    const colors = member.tier === 1 
      ? 0xa855f7 // Purple for owner
      : 0x3b82f6; // Blue for participants
    material = new THREE.MeshPhysicalMaterial({
      color: colors,
      transparent: true,
      opacity: 0.7,
      roughness: 0.05,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 1.0,
      ior: 1.5, // Glass-like index of refraction
      transmission: 0.8, // Glass transmission
      thickness: bubbleRadius * 0.5,
      emissive: colors,
      emissiveIntensity: 0.4,
    });
  }
  
  const bubble = new THREE.Mesh(geometry, material);
  
  // Add realistic glass highlight (shiny reflection spot)
  const highlightGeometry = new THREE.SphereGeometry(bubbleRadius * 0.4, 24, 24);
  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    side: THREE.FrontSide,
  });
  const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
  highlight.position.set(bubbleRadius * 0.4, bubbleRadius * 0.6, bubbleRadius * 0.4);
  highlight.scale.set(0.3, 0.3, 0.3);
  bubble.add(highlight);
  
  // Add secondary smaller highlight for more realism
  const highlight2Geometry = new THREE.SphereGeometry(bubbleRadius * 0.2, 16, 16);
  const highlight2Material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
  });
  const highlight2 = new THREE.Mesh(highlight2Geometry, highlight2Material);
  highlight2.position.set(bubbleRadius * 0.5, bubbleRadius * 0.7, bubbleRadius * 0.3);
  highlight2.scale.set(0.2, 0.2, 0.2);
  bubble.add(highlight2);
  
  group.add(bubble);
  
  // Add outer glow ring that pulses (like a bubble's edge)
  const glowGeometry = new THREE.SphereGeometry(bubbleRadius * 1.4, 32, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: member.tier === 1 ? 0xa855f7 : 0x3b82f6,
    transparent: true,
    opacity: 0.3,
    side: THREE.BackSide,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  group.add(glow);
  
  // Add outer rim/edge highlight (bubble edge effect)
  const rimGeometry = new THREE.RingGeometry(bubbleRadius * 0.9, bubbleRadius * 1.1, 32);
  const rimMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  });
  const rim = new THREE.Mesh(rimGeometry, rimMaterial);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = -bubbleRadius * 0.8;
  group.add(rim);
  
  // Add floating animation properties
  const floatSpeed = 0.3 + Math.random() * 0.4;
  const floatAmount = bubbleRadius * 0.4;
  const rotationSpeed = 0.005 + Math.random() * 0.01;
  const bobSpeed = 0.2 + Math.random() * 0.3;
  
  // Store animation properties
  group.userData = {
    floatSpeed,
    floatAmount,
    rotationSpeed,
    bobSpeed,
    initialY: 0,
    time: Math.random() * Math.PI * 2, // Random starting phase
  };
  
  // Create actual bubble with status emoji inside - positioned atop the node
  const statusEmoji = getStatusEmoji(member.status || '⚪');
  const bubbleSize = bubbleRadius * 1.2; // Bubble is larger than the node
  
  // Create canvas texture for emoji
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Draw emoji on canvas
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = '180px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(statusEmoji, canvas.width / 2, canvas.height / 2);
  
  const emojiTexture = new THREE.CanvasTexture(canvas);
  emojiTexture.needsUpdate = true;
  
  // Create realistic soap bubble material
  const bubbleMaterial = new THREE.MeshPhysicalMaterial({
    map: emojiTexture,
    transparent: true,
    opacity: 0.3,
    roughness: 0.0,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.0,
    reflectivity: 1.0,
    ior: 1.33, // Water/soap bubble index of refraction
    transmission: 0.95, // Very transparent like a real bubble
    thickness: bubbleSize * 0.3,
    side: THREE.DoubleSide,
  });
  
  // Create the bubble sphere (double-sided for inside view)
  const statusBubbleGeometry = new THREE.SphereGeometry(bubbleSize, 48, 48);
  const statusBubble = new THREE.Mesh(statusBubbleGeometry, bubbleMaterial);
  statusBubble.position.set(0, bubbleRadius * 2.3, 0); // Position atop the node
  
  // Add bubble highlight (light reflection on bubble)
  const bubbleHighlightGeometry = new THREE.SphereGeometry(bubbleSize * 0.5, 24, 24);
  const bubbleHighlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    side: THREE.FrontSide,
  });
  const bubbleHighlight = new THREE.Mesh(bubbleHighlightGeometry, bubbleHighlightMaterial);
  bubbleHighlight.position.set(bubbleSize * 0.4, bubbleSize * 0.6, bubbleSize * 0.4);
  bubbleHighlight.scale.set(0.4, 0.4, 0.4);
  statusBubble.add(bubbleHighlight);
  
  // Add secondary smaller highlight
  const bubbleHighlight2Geometry = new THREE.SphereGeometry(bubbleSize * 0.3, 16, 16);
  const bubbleHighlight2Material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
  });
  const bubbleHighlight2 = new THREE.Mesh(bubbleHighlight2Geometry, bubbleHighlight2Material);
  bubbleHighlight2.position.set(bubbleSize * 0.5, bubbleSize * 0.7, bubbleSize * 0.3);
  bubbleHighlight2.scale.set(0.25, 0.25, 0.25);
  statusBubble.add(bubbleHighlight2);
  
  // Add outer bubble rim/edge (rainbow effect)
  const bubbleRimGeometry = new THREE.RingGeometry(bubbleSize * 0.95, bubbleSize * 1.05, 64);
  const bubbleRimMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide,
  });
  const bubbleRim = new THREE.Mesh(bubbleRimGeometry, bubbleRimMaterial);
  bubbleRim.rotation.x = -Math.PI / 2;
  bubbleRim.position.y = -bubbleSize * 0.9;
  statusBubble.add(bubbleRim);
  
  // Add subtle outer glow
  const bubbleGlowGeometry = new THREE.SphereGeometry(bubbleSize * 1.1, 32, 32);
  const bubbleGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide,
  });
  const bubbleGlow = new THREE.Mesh(bubbleGlowGeometry, bubbleGlowMaterial);
  statusBubble.add(bubbleGlow);
  
  // Add pulsing animation property for the bubble
  statusBubble.userData.pulse = true;
  statusBubble.userData.bubbleSize = bubbleSize;
  
  group.add(statusBubble);
  
  // Add realistic shadow/base circle below (bubble shadow on globe)
  const shadowGeometry = new THREE.CircleGeometry(bubbleRadius * 1.0, 32);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -bubbleRadius * 1.0;
  group.add(shadow);
  
  // Add inner shadow gradient for depth
  const innerShadowGeometry = new THREE.CircleGeometry(bubbleRadius * 0.6, 24);
  const innerShadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
  const innerShadow = new THREE.Mesh(innerShadowGeometry, innerShadowMaterial);
  innerShadow.rotation.x = -Math.PI / 2;
  innerShadow.position.y = -bubbleRadius * 0.95;
  group.add(innerShadow);
  
  // Add light reflection on bottom (bubble catching light)
  const reflectionGeometry = new THREE.CircleGeometry(bubbleRadius * 0.4, 24);
  const reflectionMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
  });
  const reflection = new THREE.Mesh(reflectionGeometry, reflectionMaterial);
  reflection.rotation.x = -Math.PI / 2;
  reflection.position.y = -bubbleRadius * 0.85;
  group.add(reflection);
  
  return group;
};

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
  return R * c;
};

// Animate floating heads with cartoonish bobbing
const animateFloatingHeads = (globe) => {
  if (!globe) return;
  
  const scene = globe.scene();
  if (!scene) return;
  
  const time = Date.now() * 0.001;
  
  scene.traverse((object) => {
    if (object.userData && object.userData.floatSpeed) {
      const { floatSpeed, floatAmount, rotationSpeed, bobSpeed, initialY } = object.userData;
      
      // Floating animation (up and down)
      object.position.y = initialY + Math.sin(time * floatSpeed) * floatAmount;
      
      // Gentle rotation (spinning)
      object.rotation.y += rotationSpeed;
      
      // Bobbing animation (slight tilt)
      object.rotation.x = Math.sin(time * bobSpeed) * 0.15;
      object.rotation.z = Math.cos(time * bobSpeed * 0.7) * 0.1;
      
      // Slight scale pulsing for extra cartoon effect
      const scale = 1 + Math.sin(time * floatSpeed * 1.5) * 0.05;
      object.scale.set(scale, scale, scale);
    }
    
    // Animate status bubble pulsing (gentle breathing effect)
    if (object.userData && object.userData.pulse && object.userData.bubbleSize) {
      const pulseScale = 1 + Math.sin(time * 1.5) * 0.08; // Gentle pulse like a real bubble
      object.scale.set(pulseScale, pulseScale, pulseScale);
      
      // Slight floating motion for the bubble
      const floatOffset = Math.sin(time * 0.8) * 0.02;
      object.position.y += floatOffset;
    }
  });
};

const GlobeView = ({
  bubbleData,
  onMemberClick,
  onCheckIn,
  checkInState = 'idle',
  checkInOpen = false,
  checkInMember = null,
  checkInMemo = null,
  onCloseCheckIn,
  focusTarget = null,
  overlay = null,
  places = [],
  presence = [],
  onPlaceClick,
}) => {
  const globeEl = useRef();
  const containerRef = useRef();
  const [points, setPoints] = useState([]);
  const [arcs, setArcs] = useState([]);
  const [autoRotate, setAutoRotate] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const animationFrameRef = useRef();

  useEffect(() => {
    if (!bubbleData || !bubbleData.allMembers) return;

    const occupancy = assignMembersToPlaces({
      members: bubbleData.allMembers,
      places,
      presence,
    });

    // Convert members to globe points with cartoonish sizing.
    // People who are inside a Place are drawn on that Place pin instead.
    const memberPoints = bubbleData.allMembers
      .filter(member => member.lastKnownLocation && member.lastKnownLocation.latitude && member.lastKnownLocation.longitude)
      .filter(member => !isMemberInPlaceBubble(occupancy, member.id))
      .map(member => ({
        lat: member.lastKnownLocation.latitude,
        lng: member.lastKnownLocation.longitude,
        size: member.tier === 1 ? 0.6 : 0.4, // Larger for more cartoonish effect
        color: member.tier === 1 ? '#a855f7' : '#3b82f6',
        member: member,
        name: member.name,
      }));

    setPoints(memberPoints);

    // Create arcs between members (optional - show connections)
    if (memberPoints.length > 1) {
      const connections = [];
      const currentMember = bubbleData.currentMember;
      
      if (currentMember && currentMember.lastKnownLocation) {
        memberPoints.forEach(point => {
          if (point.member.id !== currentMember.id) {
            connections.push({
              startLat: currentMember.lastKnownLocation.latitude,
              startLng: currentMember.lastKnownLocation.longitude,
              endLat: point.lat,
              endLng: point.lng,
              color: ['#3b82f6', '#a855f7'],
            });
          }
        });
      }
      setArcs(connections);
    }
  }, [bubbleData, places, presence]);

  // Setup globe lighting and controls
  useEffect(() => {
    if (globeEl.current) {
      const controls = globeEl.current.controls();
      if (controls) {
        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 0.5;
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.minDistance = 100;
        controls.maxDistance = 500;
      }
      
      // Improve lighting
      const scene = globeEl.current.scene();
      if (scene) {
        // Add ambient light for better visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        // Add directional light for depth
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        scene.add(directionalLight);
        
      // Add point lights for better bubble illumination
      const pointLight1 = new THREE.PointLight(0x3b82f6, 0.8, 1000);
      pointLight1.position.set(200, 200, 200);
      scene.add(pointLight1);
      
      const pointLight2 = new THREE.PointLight(0xa855f7, 0.6, 1000);
      pointLight2.position.set(-200, 200, -200);
      scene.add(pointLight2);
      
      // Add hemisphere light for ambient bubble glow
      const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x3b82f6, 0.5);
      scene.add(hemisphereLight);
      }
      
      // Animation loop for floating heads
      const animate = () => {
        animateFloatingHeads(globeEl.current);
        if (controls) {
          controls.update();
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [points, autoRotate]);

  // Focus on current user's location if available
  useEffect(() => {
    if (globeEl.current && bubbleData?.currentMember?.lastKnownLocation) {
      const { latitude, longitude } = bubbleData.currentMember.lastKnownLocation;
      globeEl.current.pointOfView({ lat: latitude, lng: longitude, altitude: 2 }, 1000);
    }
  }, [bubbleData?.currentMember?.lastKnownLocation]);

  // Center on an SOS / memo / check-in target without requiring a page refresh.
  useEffect(() => {
    if (!globeEl.current || focusTarget?.latitude == null || focusTarget?.longitude == null) return;
    setAutoRotate(false);
    globeEl.current.pointOfView(
      { lat: focusTarget.latitude, lng: focusTarget.longitude, altitude: 1.2 },
      1200
    );
  }, [focusTarget]);

  // Handle window resize and container size changes
  useEffect(() => {
    if (!globeEl.current || !containerRef.current) return;

    const handleResize = () => {
      if (globeEl.current) {
        // Force globe to recalculate its size
        const renderer = globeEl.current.renderer();
        if (renderer) {
          const container = containerRef.current;
          if (container) {
            const width = container.clientWidth;
            const height = container.clientHeight;
            renderer.setSize(width, height);
          }
        }
        // Trigger a re-render
        const camera = globeEl.current.camera();
        if (camera) {
          camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
          camera.updateProjectionMatrix();
        }
      }
    };

    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Also listen to window resize as fallback
    window.addEventListener('resize', handleResize);

    // Initial resize
    handleResize();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Run once on mount, ResizeObserver will handle subsequent changes

  if (!bubbleData || !bubbleData.allMembers) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="text-gray-400 text-center">
          <p>Loading globe...</p>
        </div>
      </div>
    );
  }

  const checkInOverlay = (
    <CheckInPopup
      open={checkInOpen}
      state={checkInState}
      member={checkInMember}
      memo={checkInMemo}
      onConfirm={onCheckIn}
      onClose={onCloseCheckIn}
    />
  );

  const checkInRing = focusTarget?.latitude != null && focusTarget?.longitude != null
    ? [{ lat: focusTarget.latitude, lng: focusTarget.longitude }]
    : [];
  const occupancy = assignMembersToPlaces({
    members: bubbleData.allMembers,
    places,
    presence,
  });
  const placePoints = globePlacePoints(places, occupancy);

  // If no members have locations yet, show a message
  if (points.length === 0 && placePoints.length === 0) {
    return (
      <div ref={containerRef} className="w-full h-full relative flex items-center justify-center">
        <Globe
          ref={globeEl}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          showAtmosphere={true}
          atmosphereColor="#3b82f6"
          atmosphereAltitude={0.15}
        />
        {!checkInOpen && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="glass-strong rounded-2xl px-6 py-4 border border-white/10 text-center max-w-md mx-4">
              <p className="text-white text-lg font-semibold mb-2">🌍 Waiting for Locations</p>
              <p className="text-gray-400 text-sm">
                Family members will appear here once they update their status or enable location sharing.
              </p>
            </div>
          </div>
        )}
        {overlay}
        {checkInOverlay}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative bg-gray-950">
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        pointsData={points}
        pointThreeObject={(point) => {
          const head = createFloatingHead(point.member, point.size || 0.4);
          // Store initial Y position for floating animation
          head.userData.initialY = head.position.y;
          return head;
        }}
        pointAltitude={0.05} // Float higher above the globe surface for better pop effect
        pointLabel={(d) => {
          if (!d || !d.member) return '';
          const distance = bubbleData?.currentMember?.lastKnownLocation
            ? calculateDistance(
                bubbleData.currentMember.lastKnownLocation.latitude,
                bubbleData.currentMember.lastKnownLocation.longitude,
                d.lat,
                d.lng
              ).toFixed(0)
            : null;
          return `${d.name}${distance ? ` • ${distance}km away` : ''}`;
        }}
        onPointHover={(point, prevPoint, event) => {
          // Add hover effect - scale up slightly for cartoonish pop
          if (point && event && event.object) {
            event.object.scale.set(1.4, 1.4, 1.4);
            setHoveredPoint(point);
          }
          if (prevPoint && prevPoint.object) {
            prevPoint.object.scale.set(1, 1, 1);
            setHoveredPoint(null);
          }
        }}
        onPointClick={point => {
          if (onMemberClick && point.member) {
            // Smoothly focus on clicked point
            if (globeEl.current) {
              globeEl.current.pointOfView(
                { lat: point.lat, lng: point.lng, altitude: 1.5 },
                1000
              );
            }
            // Small delay before opening profile for better UX
            setTimeout(() => {
              onMemberClick(point.member);
            }, 300);
          }
        }}
        arcsData={arcs}
        arcColor="color"
        arcDashLength={0.5}
        arcDashGap={0.1}
        arcDashAnimateTime={1500}
        arcStroke={0.8}
        ringsData={checkInRing}
        ringColor={() => (t) => `rgba(96,165,250,${1 - t})`}
        ringMaxRadius={2.2}
        ringPropagationSpeed={2.2}
        ringRepeatPeriod={700}
        htmlElementsData={placePoints}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.02}
        htmlTransition={0}
        htmlElement={(point) => createPlaceHtmlMarker(point.place, {
          occupants: point.occupants,
          currentMemberId: bubbleData?.currentMember?.id,
          onMemberClick: (member) => {
            if (onMemberClick) onMemberClick(member);
          },
          onClick: (place) => {
            if (globeEl.current) {
              globeEl.current.pointOfView(
                { lat: place.latitude, lng: place.longitude, altitude: 1.5 },
                800
              );
            }
            if (onPlaceClick) onPlaceClick(place);
          },
        })}
        showAtmosphere={true}
        atmosphereColor="#3b82f6"
        atmosphereAltitude={0.2}
        backgroundColor="rgba(0,0,0,0)"
        enablePointerInteraction={true}
      />
      
      {overlay}
      {checkInOverlay}
      
      {/* Hovered member info */}
      {hoveredPoint && (
        <div className="absolute top-36 right-4 glass-strong rounded-xl px-4 py-3 border border-white/10 z-10 shadow-xl max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{getStatusEmoji(hoveredPoint.member.status || '⚪')}</span>
            <div>
              <p className="text-white font-semibold text-sm">{hoveredPoint.member.name}</p>
              <p className="text-gray-400 text-xs">{hoveredPoint.member.role || 'Family Member'}</p>
            </div>
          </div>
          {bubbleData?.currentMember?.lastKnownLocation && (
            <p className="text-blue-400 text-xs">
              {calculateDistance(
                bubbleData.currentMember.lastKnownLocation.latitude,
                bubbleData.currentMember.lastKnownLocation.longitude,
                hoveredPoint.lat,
                hoveredPoint.lng
              ).toFixed(0)} km away
            </p>
          )}
          {hoveredPoint.member.lastUpdated && (
            <p className="text-gray-500 text-xs mt-1">
              {formatLastSeen(hoveredPoint.member.lastUpdated)}
            </p>
          )}
        </div>
      )}
      
      {/* Controls panel */}
      {showControls && !checkInOpen && (
        <div className="absolute bottom-4 right-4 glass-strong rounded-xl p-2 border border-white/10 z-10 shadow-xl flex flex-col gap-2">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 text-white"
            title={autoRotate ? 'Pause rotation' : 'Resume rotation'}
          >
            {autoRotate ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button
            onClick={() => {
              if (globeEl.current && bubbleData?.currentMember?.lastKnownLocation) {
                const { latitude, longitude } = bubbleData.currentMember.lastKnownLocation;
                globeEl.current.pointOfView({ lat: latitude, lng: longitude, altitude: 2 }, 1000);
              }
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 text-white"
            title="Reset to your location"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      )}
      
      {/* Toggle controls button */}
      {!checkInOpen && (
        <button
          onClick={() => setShowControls(!showControls)}
          className="absolute bottom-4 left-4 glass-strong rounded-xl p-2 border border-white/10 z-10 shadow-xl text-white hover:bg-white/10 transition-all duration-200"
          title={showControls ? 'Hide controls' : 'Show controls'}
        >
          {showControls ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      )}
      
      {/* Instructions overlay */}
      {!checkInOpen && (
        <div className="absolute bottom-20 left-4 glass-strong rounded-xl px-3 py-2 border border-white/10 z-10 shadow-xl max-w-[200px] hidden sm:block">
          <p className="text-gray-300 text-xs">
            Click a point to view profile • Drag to rotate • Scroll to zoom
          </p>
        </div>
      )}
    </div>
  );
};

export default GlobeView;

