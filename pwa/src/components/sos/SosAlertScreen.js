import React from 'react';
import SosMap from './SosMap';
import {
  SOS_STATUS,
  classifyLocationFreshness,
  callMember,
  openExternalMap,
} from '../../services/sos';
import { formatLastSeen } from '../../utils/timeUtils';

const freshnessLabel = {
  live: 'Live / current',
  recent: 'Recently updated',
  stale: 'Stale / unavailable',
  unavailable: 'Stale / unavailable',
};

const SosAlertScreen = ({
  sos,
  member,
  acknowledgedByName,
  onAcknowledge,
  acknowledging = false,
  onClose,
  onMuteSound,
}) => {
  const location = sos?.latestLocation;
  const freshness = classifyLocationFreshness(location?.timestamp);
  const photo = member?.photoUrl || member?.photoURL;
  const name = member?.name || 'A family member';
  const isAcknowledged = sos?.status === SOS_STATUS.ACKNOWLEDGED;
  const isResolved = sos?.status === SOS_STATUS.RESOLVED;
  const responder = acknowledgedByName || 'A family member';

  const handleCall = () => {
    try {
      callMember(member?.phone);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-gray-950 text-white overflow-y-auto safe-area-insets">
      <div className="max-w-md mx-auto min-h-full px-4 py-6 pb-10 space-y-4">
        <p className="text-center text-4xl" aria-hidden="true">🚨</p>
        <h1 className="text-center text-3xl font-black">
          {isResolved ? 'SOS RESOLVED' : isAcknowledged ? 'SOS ACKNOWLEDGED' : 'SOS ALERT'}
        </h1>

        <div className="flex flex-col items-center">
          <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-red-500/70">
            {photo ? (
              <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-red-700 flex items-center justify-center text-4xl font-black">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <p className="mt-3 text-2xl font-black">{name}</p>
          <p className="text-red-200 font-semibold">
            {isResolved ? "I'm safe." : isAcknowledged ? `${responder} is responding.` : 'Needs assistance'}
          </p>
        </div>

        <p className="font-bold">Last known location:</p>
        <SosMap latitude={location?.latitude} longitude={location?.longitude} />
        <p className="text-sm text-gray-300">
          Location updated: {location?.timestamp ? formatLastSeen(location.timestamp) : 'Unavailable'}
        </p>
        <p
          className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${
            freshness === 'live'
              ? 'bg-emerald-600'
              : freshness === 'recent'
                ? 'bg-amber-600'
                : 'bg-gray-700'
          }`}
        >
          {freshnessLabel[freshness]}
        </p>

        <button
          type="button"
          onClick={() => openExternalMap(location?.latitude, location?.longitude)}
          disabled={location?.latitude == null}
          className="w-full bg-white text-gray-950 py-4 rounded-2xl font-black tap-target disabled:opacity-50"
        >
          Open map
        </button>
        <button
          type="button"
          onClick={handleCall}
          disabled={!member?.phone}
          className="w-full bg-blue-600 py-4 rounded-2xl font-black tap-target disabled:opacity-50"
        >
          {member?.phone ? 'Call member' : 'No phone on file'}
        </button>
        {sos?.status === SOS_STATUS.ACTIVE && (
          <button
            type="button"
            onClick={onAcknowledge}
            disabled={acknowledging}
            className="w-full bg-amber-400 text-gray-950 py-4 rounded-2xl font-black tap-target disabled:opacity-60"
          >
            {acknowledging ? 'Acknowledging…' : 'Mark as acknowledged'}
          </button>
        )}
        {onMuteSound && (
          <button
            type="button"
            onClick={onMuteSound}
            className="w-full bg-white/10 text-white py-4 rounded-2xl font-bold tap-target"
          >
            Stop alert sound
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="w-full text-gray-400 py-3 font-semibold tap-target"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default SosAlertScreen;
