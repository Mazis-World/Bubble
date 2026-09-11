/** Shared radar layout: geographic placement, even fallbacks, and overlap separation. */

export const RADAR_BUBBLE_SIZE = 56;
export const RADAR_BUBBLE_GAP = 10;

export const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad)
    - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
};

export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180)
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const hasLocation = (member) => {
  const loc = member?.lastKnownLocation;
  return loc != null && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude);
};

const clampToRadar = (node, centerX, centerY, maxRadius) => {
  const dx = node.x - centerX;
  const dy = node.y - centerY;
  const dist = Math.hypot(dx, dy);
  if (dist <= maxRadius || dist === 0) return node;
  const scale = maxRadius / dist;
  return { ...node, x: centerX + dx * scale, y: centerY + dy * scale };
};

/**
 * Push overlapping bubbles apart. The pinned member (usually "you") stays put.
 */
export const separateOverlappingNodes = (
  nodes,
  {
    centerX,
    centerY,
    maxRadius,
    bubbleSize = RADAR_BUBBLE_SIZE,
    gap = RADAR_BUBBLE_GAP,
    pinnedId = null,
  }
) => {
  const next = nodes.map((node) => ({ ...node }));
  const minDist = bubbleSize + gap;

  for (let iter = 0; iter < 40; iter += 1) {
    let moved = false;
    for (let i = 0; i < next.length; i += 1) {
      for (let j = i + 1; j < next.length; j += 1) {
        const a = next[i];
        const b = next[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        if (dist >= minDist) continue;

        if (dist < 0.001) {
          const angle = ((i + j * 3) / Math.max(next.length, 1)) * Math.PI * 2;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          dist = 0.001;
        }

        const overlap = (minDist - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        const aPinned = a.id === pinnedId;
        const bPinned = b.id === pinnedId;

        if (aPinned && !bPinned) {
          next[j] = { ...b, x: b.x + nx * overlap * 2, y: b.y + ny * overlap * 2 };
        } else if (bPinned && !aPinned) {
          next[i] = { ...a, x: a.x - nx * overlap * 2, y: a.y - ny * overlap * 2 };
        } else if (!aPinned && !bPinned) {
          next[i] = { ...a, x: a.x - nx * overlap, y: a.y - ny * overlap };
          next[j] = { ...b, x: b.x + nx * overlap, y: b.y + ny * overlap };
        }
        moved = true;
      }
    }

    for (let i = 0; i < next.length; i += 1) {
      if (next[i].id === pinnedId) continue;
      next[i] = clampToRadar(next[i], centerX, centerY, maxRadius);
    }

    if (!moved) break;
  }

  return next;
};

const placeOnRing = ({ members, centerX, centerY, radius, startAngle = -Math.PI / 2 }) =>
  members.map((member, index) => {
    const count = Math.max(members.length, 1);
    const angle = startAngle + (index / count) * Math.PI * 2;
    return {
      id: member.id,
      ...member,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      distance: null,
      bearing: null,
    };
  });

/**
 * Place members on the radar. Same-size bubbles; overlapping GPS points fan out.
 */
export const layoutRadarNodes = ({
  members,
  currentMemberId,
  width,
  height,
  bubbleSize = RADAR_BUBBLE_SIZE,
}) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.max(Math.min(width, height) / 2 - bubbleSize / 2 - 4, bubbleSize);

  const currentMember = members.find((member) => member.id === currentMemberId) || members[0];
  if (!currentMember) return [];

  const centerLocation = hasLocation(currentMember) ? currentMember.lastKnownLocation : null;
  let placed;

  if (!centerLocation) {
    const others = members.filter((member) => member.id !== currentMember.id);
    placed = [
      {
        id: currentMember.id,
        ...currentMember,
        x: centerX,
        y: centerY,
        distance: 0,
        bearing: 0,
      },
      ...placeOnRing({
        members: others,
        centerX,
        centerY,
        radius: maxRadius * 0.62,
      }),
    ];
  } else {
    const withLocation = [];
    const withoutLocation = [];

    members.forEach((member) => {
      if (member.id === currentMember.id) return;
      if (hasLocation(member)) withLocation.push(member);
      else withoutLocation.push(member);
    });

    const distances = withLocation.map((member) =>
      calculateDistanceKm(
        centerLocation.latitude,
        centerLocation.longitude,
        member.lastKnownLocation.latitude,
        member.lastKnownLocation.longitude
      )
    );
    const maxDistance = Math.max(10, ...distances);

    placed = [
      {
        id: currentMember.id,
        ...currentMember,
        x: centerX,
        y: centerY,
        distance: 0,
        bearing: 0,
      },
      ...withLocation.map((member) => {
        const distance = calculateDistanceKm(
          centerLocation.latitude,
          centerLocation.longitude,
          member.lastKnownLocation.latitude,
          member.lastKnownLocation.longitude
        );
        const bearing = calculateBearing(
          centerLocation.latitude,
          centerLocation.longitude,
          member.lastKnownLocation.latitude,
          member.lastKnownLocation.longitude
        );
        const radius = Math.min(distance / maxDistance, 1) * maxRadius;
        const angleRad = ((bearing - 90) * Math.PI) / 180;
        return {
          id: member.id,
          ...member,
          x: centerX + Math.cos(angleRad) * radius,
          y: centerY + Math.sin(angleRad) * radius,
          distance,
          bearing,
        };
      }),
      ...placeOnRing({
        members: withoutLocation,
        centerX,
        centerY,
        radius: maxRadius * 0.82,
      }),
    ];
  }

  return separateOverlappingNodes(placed, {
    centerX,
    centerY,
    maxRadius,
    bubbleSize,
    gap: RADAR_BUBBLE_GAP,
    pinnedId: currentMember.id,
  });
};

/**
 * Overlay live member fields (status, photo, name) onto laid-out radar nodes
 * without changing positions. Layout is keyed only on ids + GPS so status
 * updates must be merged at render time.
 */
export const hydrateRadarNodes = (nodes, members) => {
  const byId = new Map((members || []).map((member) => [member.id, member]));
  return (nodes || []).map((node) => {
    const live = byId.get(node.id);
    if (!live) return node;
    return {
      ...node,
      ...live,
      id: node.id,
      x: node.x,
      y: node.y,
      distance: node.distance,
      bearing: node.bearing,
    };
  });
};

export const distanceBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
