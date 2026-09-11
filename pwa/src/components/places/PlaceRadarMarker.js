import React from 'react';
import { placeIcon } from '../../services/places/copy';
import { RADAR_PLACE_SIZE } from '../../services/radarLayout';

const PlaceRadarMarker = ({ place, x, y, onClick }) => {
  const icon = placeIcon(place);
  const name = place?.name || 'Place';
  const color = place?.color || '#818cf8';

  return (
    <button
      type="button"
      className="place-radar-marker absolute tap-target"
      aria-label={`${name} place`}
      onClick={() => onClick && onClick(place)}
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
        width: RADAR_PLACE_SIZE,
        height: RADAR_PLACE_SIZE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 0,
        padding: 0,
      }}
    >
      <span
        aria-hidden="true"
        className="flex items-center justify-center rounded-full text-lg"
        style={{
          width: RADAR_PLACE_SIZE - 4,
          height: RADAR_PLACE_SIZE - 4,
          background: 'rgba(15, 23, 42, 0.94)',
          border: `2px solid ${color}`,
          boxShadow: `0 0 12px ${color}99`,
        }}
      >
        {icon}
      </span>
      <span
        className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 text-[9px] font-bold text-white whitespace-nowrap max-w-[72px] truncate px-1 rounded bg-slate-950/80"
      >
        {name}
      </span>
    </button>
  );
};

export default PlaceRadarMarker;
