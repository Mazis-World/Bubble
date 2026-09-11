import { placeIcon } from './copy';

/**
 * DOM pin used on the globe/map layer. Kept out of React so react-globe.gl
 * can position it on a lat/lng.
 */
export const createPlaceHtmlMarker = (place, { onClick } = {}) => {
  const name = String(place?.name || 'Place');
  const color = place?.color || '#818cf8';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'place-globe-marker';
  button.setAttribute('aria-label', `${name} place`);
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
    'width:36px',
    'height:36px',
    'border-radius:999px',
    'font-size:20px',
    'line-height:1',
    'background:rgba(15,23,42,0.94)',
    `border:2px solid ${color}`,
    `box-shadow:0 0 12px ${color}99`,
  ].join(';');
  badge.textContent = placeIcon(place);

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
      event.stopPropagation();
      onClick(place);
    });
  }
  return button;
};

export const globePlacePoints = (places = []) =>
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
    }));
