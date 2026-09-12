import { firstName, placeIcon } from './copy';

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
} = {}) => {
  const name = String(place?.name || 'Place');
  const color = place?.color || '#818cf8';
  const people = occupants || [];
  const occupied = people.length > 0;
  const who = people.map((member) => firstName(member?.name || member?.fullName)).join(', ');

  const button = document.createElement('div');
  button.className = occupied ? 'place-globe-marker place-globe-cluster' : 'place-globe-marker';
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
    'max-width:88px',
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

export const globePlacePoints = (places = [], occupancy = null) =>
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
      occupants: occupancy?.byPlace?.[place.placeId] || [],
    }));
