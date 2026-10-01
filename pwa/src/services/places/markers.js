import { firstName, placeIcon } from './copy';
import { placeMapMeta } from './mapStyle';
import { colorForMember } from '../../utils/memberColor';
import { getStatusEmoji } from '../../utils/timeUtils';

export const memberPhotoUrl = (member) => member?.photoUrl || member?.photoURL;

export const hasMemberGeoPoint = (member) => {
  const loc = member?.lastKnownLocation;
  return loc != null
    && Number.isFinite(Number(loc.latitude))
    && Number.isFinite(Number(loc.longitude));
};

const occupantInitial = (member) => {
  const name = String(member?.name || member?.fullName || '').trim();
  return name ? name.charAt(0).toUpperCase() : '?';
};

const appendOccupantFace = (parent, member, { onMemberClick, currentMemberId, placeName } = {}) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'place-globe-occupant';
  const label = firstName(member?.name || member?.fullName);
  button.setAttribute('aria-label', `${label} in ${placeName || 'place'}`);
  button.style.cssText = [
    'width:28px',
    'height:28px',
    'border-radius:999px',
    'padding:0',
    'border:2px solid rgba(255,255,255,0.7)',
    'overflow:hidden',
    'background:#1e293b',
    'color:#fff',
    'font-size:12px',
    'font-weight:700',
    'cursor:pointer',
    'flex-shrink:0',
    'margin-left:-6px',
  ].join(';');
  if (button.firstChild == null && parent.childElementCount === 0) {
    button.style.marginLeft = '0';
  }

  const photo = member?.photoUrl || member?.photoURL;
  if (photo) {
    const img = document.createElement('img');
    img.src = photo;
    img.alt = member?.name || label;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    button.append(img);
  } else {
    button.textContent = occupantInitial(member);
  }

  if (typeof onMemberClick === 'function') {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onMemberClick(member, member?.id === currentMemberId);
    });
  }
  parent.append(button);
};

/**
 * DOM pin used on the globe/map layer. Kept out of React so react-globe.gl
 * can position it on a lat/lng. Occupied Places become a bubble of people.
 */
export const createPlaceHtmlMarker = (place, {
  onClick,
  occupants = [],
  onMemberClick,
  currentMemberId,
  members = [],
} = {}) => {
  const meta = placeMapMeta(place, members);
  const name = meta.label;
  const color = meta.color;
  const people = occupants || [];
  const occupied = people.length > 0;
  const who = people.map((member) => firstName(member?.name || member?.fullName)).join(', ');

  const button = document.createElement('div');
  button.className = occupied ? 'place-globe-marker place-globe-cluster' : 'place-globe-marker';
  button.dataset.ownerColor = color;
  button.setAttribute('role', occupied ? 'group' : 'button');
  button.setAttribute('aria-label', occupied ? `${name} place, ${who} here` : `${name} place`);
  if (!occupied) button.tabIndex = 0;
  button.style.cssText = [
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'gap:2px',
    'background:transparent',
    'border:0',
    'padding:0',
    'cursor:pointer',
    'transform:translate(-50%,-100%)',
    'pointer-events:auto',
  ].join(';');

  const badge = document.createElement('span');
  badge.setAttribute('aria-hidden', 'true');
  badge.style.cssText = [
    'display:flex',
    'align-items:center',
    'justify-content:center',
    occupied ? 'width:64px' : 'width:36px',
    occupied ? 'height:64px' : 'height:36px',
    'border-radius:999px',
    occupied ? 'font-size:16px' : 'font-size:20px',
    'line-height:1',
    'background:rgba(15,23,42,0.94)',
    `border:2px solid ${color}`,
    occupied ? `box-shadow:0 0 16px ${color}aa` : `box-shadow:0 0 12px ${color}99`,
    'position:relative',
  ].join(';');

  if (occupied) {
    const faces = document.createElement('span');
    faces.className = 'place-globe-occupants';
    faces.style.cssText = 'display:flex;align-items:center;justify-content:center;';
    people.slice(0, 3).forEach((member, index) => {
      appendOccupantFace(faces, member, { onMemberClick, currentMemberId, placeName: name });
      if (index === 0 && faces.firstChild) {
        faces.firstChild.style.marginLeft = '0';
      }
    });
    if (people.length > 3) {
      const extra = document.createElement('span');
      extra.textContent = `+${people.length - 3}`;
      extra.style.cssText = 'margin-left:-6px;font-size:10px;font-weight:700;color:#fff;';
      faces.append(extra);
    }
    const emoji = document.createElement('span');
    emoji.textContent = placeIcon(place);
    emoji.style.cssText = [
      'position:absolute',
      'top:-4px',
      'left:-4px',
      'width:20px',
      'height:20px',
      'border-radius:999px',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'font-size:12px',
      'background:rgba(15,23,42,0.96)',
      `border:2px solid ${color}`,
    ].join(';');
    badge.append(faces, emoji);
  } else {
    badge.textContent = placeIcon(place);
  }

  const label = document.createElement('span');
  label.style.cssText = [
    'max-width:120px',
    'overflow:hidden',
    'text-overflow:ellipsis',
    'white-space:nowrap',
    'font-size:10px',
    'font-weight:700',
    'color:#fff',
    'background:rgba(2,6,23,0.82)',
    'border:1px solid rgba(255,255,255,0.12)',
    'border-radius:999px',
    'padding:1px 6px',
  ].join(';');
  label.textContent = name;

  button.append(badge, label);
  if (typeof onClick === 'function') {
    button.addEventListener('click', (event) => {
      if (event.target.closest('.place-globe-occupant')) return;
      event.stopPropagation();
      onClick(place);
    });
  }
  return button;
};

export const globePlacePoints = (places = [], occupancy = null, members = []) =>
  (places || [])
    .filter((place) => (
      place
      && place.isActive !== false
      && Number.isFinite(place.latitude)
      && Number.isFinite(place.longitude)
    ))
    .map((place) => ({
      lat: place.latitude,
      lng: place.longitude,
      place,
      members,
      occupants: occupancy?.byPlace?.[place.placeId] || occupancy?.byPlace?.[place.id] || [],
    }));

const memberInitial = (member) => {
  const name = String(member?.name || member?.fullName || '').trim();
  return name ? name.charAt(0).toUpperCase() : '?';
};

/**
 * Face bubble for a family member on the globe. DOM photos show even when
 * the 3D texture cannot load.
 */
export const createMemberHtmlMarker = (member, { onClick, isCurrent = false, members = [] } = {}) => {
  const name = String(member?.name || member?.fullName || 'Family member').trim() || 'Family member';
  const accent = colorForMember(member, members);
  const root = document.createElement('button');
  root.type = 'button';
  root.className = 'member-globe-marker';
  root.setAttribute('aria-label', name);
  root.style.cssText = [
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'gap:2px',
    'background:transparent',
    'border:0',
    'padding:0',
    'cursor:pointer',
    'transform:translate(-50%,-100%)',
    'pointer-events:auto',
  ].join(';');

  const wrap = document.createElement('span');
  wrap.style.cssText = 'position:relative;width:52px;height:52px;display:block;';

  const face = document.createElement('span');
  face.setAttribute('aria-hidden', 'true');
  face.style.cssText = [
    'width:52px',
    'height:52px',
    'border-radius:999px',
    'overflow:hidden',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'background:linear-gradient(135deg,#2563eb,#7c3aed)',
    `border:3px solid ${accent}`,
    `box-shadow:0 0 16px ${accent}99`,
    'color:#fff',
    'font-size:18px',
    'font-weight:800',
  ].join(';');

  const photo = memberPhotoUrl(member);
  if (photo) {
    const img = document.createElement('img');
    img.src = photo;
    img.alt = name;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
    face.append(img);
  } else {
    face.textContent = memberInitial(member);
  }

  const status = document.createElement('span');
  status.textContent = getStatusEmoji(member?.status || '⚪');
  status.style.cssText = [
    'position:absolute',
    'right:-2px',
    'bottom:-2px',
    'width:18px',
    'height:18px',
    'border-radius:999px',
    'background:#0f172a',
    'border:2px solid rgba(255,255,255,0.7)',
    'font-size:11px',
    'line-height:14px',
    'text-align:center',
  ].join(';');
  wrap.append(face, status);
  if (isCurrent) {
    const you = document.createElement('span');
    you.textContent = 'YOU';
    you.style.cssText = [
      'position:absolute',
      'top:-6px',
      'left:50%',
      'transform:translateX(-50%)',
      `background:${accent}`,
      'color:#fff',
      'font-size:8px',
      'font-weight:800',
      'line-height:1',
      'padding:2px 5px',
      'border-radius:999px',
      'border:1px solid rgba(255,255,255,0.8)',
    ].join(';');
    wrap.append(you);
  }

  const label = document.createElement('span');
  label.textContent = firstName(name);
  label.style.cssText = [
    'max-width:72px',
    'overflow:hidden',
    'text-overflow:ellipsis',
    'white-space:nowrap',
    'font-size:10px',
    'font-weight:700',
    'color:#fff',
    'background:rgba(2,6,23,0.82)',
    'border:1px solid rgba(255,255,255,0.12)',
    'border-radius:999px',
    'padding:1px 6px',
  ].join(';');

  root.append(wrap, label);
  if (typeof onClick === 'function') {
    root.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick(member);
    });
  }
  return root;
};

export const globeMemberPoints = (members = []) =>
  (members || [])
    .filter(hasMemberGeoPoint)
    .map((member) => ({
      lat: Number(member.lastKnownLocation.latitude),
      lng: Number(member.lastKnownLocation.longitude),
      size: member.tier === 1 ? 0.6 : 0.4,
      color: colorForMember(member, members),
      member,
      name: member.name,
    }));

/**
 * Spread people who share a GPS point so each face bubble is visible.
 */
export const fanOutSharedGlobePoints = (points = [], { radiusPx = 46 } = {}) => {
  const groups = new Map();
  (points || []).forEach((point) => {
    const key = `${Number(point.lat).toFixed(3)},${Number(point.lng).toFixed(3)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(point);
  });
  const next = [];
  groups.forEach((group) => {
    if (group.length === 1) {
      next.push({ ...group[0], dx: 0, dy: 0 });
      return;
    }
    group.forEach((point, index) => {
      const angle = -Math.PI / 2 + (index / group.length) * Math.PI * 2;
      next.push({
        ...point,
        dx: Math.round(Math.cos(angle) * radiusPx),
        dy: Math.round(Math.sin(angle) * radiusPx),
      });
    });
  });
  return next;
};

export const globeHtmlLayers = ({ members = [], places = [], occupancy = null } = {}) => [
  ...fanOutSharedGlobePoints(globeMemberPoints(members)),
  ...fanOutSharedGlobePoints(globePlacePoints(places, occupancy, members), { radiusPx: 62 }),
];
