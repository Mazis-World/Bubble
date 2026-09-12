import React from 'react';
import MemberBubble from '../ui/MemberBubble';
import { firstName, placeIcon } from '../../services/places/copy';
import { ownedPlaceLabel, placeAccentColor } from '../../services/places/mapStyle';
import { RADAR_PLACE_CLUSTER_SIZE, RADAR_PLACE_SIZE } from '../../services/radarLayout';

const occupantFaceSize = (count) => {
  if (count <= 1) return 48;
  if (count === 2) return 36;
  return 30;
};

const PlaceRadarMarker = ({
  place,
  x,
  y,
  occupants = [],
  currentMemberId,
  members = [],
  onClick,
  onMemberClick,
  onStatusClick,
}) => {
  const icon = placeIcon(place);
  const name = ownedPlaceLabel(place, members);
  const color = placeAccentColor(place, members);
  const people = occupants || [];
  const occupied = people.length > 0;

  const openPlace = () => {
    if (onClick) onClick(place);
  };

  const openMember = (member) => {
    if (!member) return;
    if (member.id === currentMemberId) {
      if (onStatusClick) onStatusClick();
      return;
    }
    if (onMemberClick) onMemberClick(member);
  };

  const positionStyle = {
    left: x,
    top: y,
    transform: 'translate(-50%, -50%)',
  };

  if (!occupied) {
    return (
      <button
        type="button"
        className="place-radar-marker absolute tap-target"
        data-occupied="false"
        aria-label={`${name} place`}
        onClick={openPlace}
        style={{
          ...positionStyle,
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
        <span className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 text-[9px] font-bold text-white whitespace-nowrap max-w-[96px] truncate px-1 rounded bg-slate-950/80">
          {name}
        </span>
      </button>
    );
  }

  const size = RADAR_PLACE_CLUSTER_SIZE;
  const faceSize = occupantFaceSize(people.length);
  const shown = people.slice(0, 3);
  const extra = people.length - shown.length;
  const who = people.map((member) => firstName(member.name || member.fullName)).join(', ');

  return (
    <div
      className="place-radar-marker absolute tap-target"
      data-occupied="true"
      style={{
        ...positionStyle,
        zIndex: 12,
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <button
        type="button"
        aria-label={`${name} place, ${who} here`}
        onClick={openPlace}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '999px',
          background: 'rgba(15, 23, 42, 0.94)',
          border: `2px solid ${color}`,
          boxShadow: `0 0 18px ${color}aa, inset 0 0 12px ${color}33`,
          padding: 0,
          cursor: 'pointer',
        }}
      />
      <span
        aria-hidden="true"
        className="absolute -top-1 -left-1 z-20 flex items-center justify-center rounded-full"
        style={{
          width: 22,
          height: 22,
          background: 'rgba(15, 23, 42, 0.96)',
          border: `2px solid ${color}`,
          fontSize: 12,
          pointerEvents: 'none',
        }}
      >
        {icon}
      </span>
      <div className="relative z-10 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
        {shown.map((member, index) => (
          <button
            key={member.id || member.userId || index}
            type="button"
            className="place-radar-occupant"
            aria-label={`${firstName(member.name || member.fullName)} in ${name}`}
            onClick={(event) => {
              event.stopPropagation();
              openMember(member);
            }}
            style={{
              width: faceSize,
              height: faceSize,
              marginLeft: index === 0 ? 0 : -12,
              padding: 0,
              border: 0,
              background: 'transparent',
              pointerEvents: 'auto',
              zIndex: shown.length - index,
              flexShrink: 0,
            }}
          >
            <MemberBubble
              member={member}
              isCenter={member.id === currentMemberId}
              size={faceSize}
              delay={0}
              familyMembers={members}
            />
          </button>
        ))}
        {extra > 0 && (
          <span
            className="flex items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white border-2 border-white/40"
            style={{ width: 22, height: 22, marginLeft: -8 }}
          >
            +{extra}
          </span>
        )}
      </div>
      <span className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 text-[9px] font-bold text-white whitespace-nowrap max-w-[96px] truncate px-1 rounded bg-slate-950/80 pointer-events-none">
        {name}
      </span>
    </div>
  );
};

export default PlaceRadarMarker;
