import React, { useState } from 'react';
import SosMap from './SosMap';
import { SOS_STATUS, callEmergencyServices, getEmergencyNumber } from '../../services/sos';
import { formatLastSeen } from '../../utils/timeUtils';

const deliveryCopy = {
  sending: 'Sending alert…',
  queued: 'Waiting for connection. Alert not yet delivered.',
  delivered: 'Alert reached your bubble.',
  failed: 'Could not send. Try again when you have a signal.',
};

const SosActiveScreen = ({
  sos,
  deliveryState,
  locationError,
  onResolve,
  onCancel,
  resolving = false,
}) => {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const location = sos?.latestLocation;
  const emergencyNumber = getEmergencyNumber();
  const isAcknowledged = sos?.status === SOS_STATUS.ACKNOWLEDGED;
  const isResolved = sos?.status === SOS_STATUS.RESOLVED;
  const isCancelled = sos?.status === SOS_STATUS.CANCELLED;

  return (
    <div className="fixed inset-0 z-[70] bg-gray-950 text-white overflow-y-auto safe-area-insets">
      <div className="max-w-md mx-auto min-h-full px-4 py-6 pb-10 space-y-4">
        <p className="text-center text-4xl" aria-hidden="true">🚨</p>
        <h1 className="text-center text-3xl font-black">
          {isResolved ? 'SOS RESOLVED' : isCancelled ? 'SOS CANCELLED' : isAcknowledged ? 'SOS ACKNOWLEDGED' : 'SOS ACTIVE'}
        </h1>
        <p className="text-center text-lg font-semibold text-red-200" aria-live="polite">
          {isResolved
            ? "I'm safe."
            : isAcknowledged
              ? 'A family member is responding.'
              : 'Help is being requested.'}
        </p>

        <div
          className={`rounded-2xl px-4 py-3 text-center font-bold ${
            deliveryState === 'delivered'
              ? 'bg-emerald-900/60 text-emerald-200'
              : deliveryState === 'queued'
                ? 'bg-amber-900/60 text-amber-100'
                : deliveryState === 'failed'
                  ? 'bg-red-900/70 text-red-100'
                  : 'bg-white/10 text-white'
          }`}
          aria-live="polite"
        >
          {deliveryCopy[deliveryState] || deliveryCopy.sending}
        </div>

        {locationError && (
          <p className="text-center text-amber-200 font-semibold">{locationError}</p>
        )}

        <SosMap latitude={location?.latitude} longitude={location?.longitude} />
        {location?.timestamp && (
          <p className="text-center text-sm text-gray-400">
            Location updated: {formatLastSeen(location.timestamp)}
          </p>
        )}

        <button
          type="button"
          onClick={() => callEmergencyServices()}
          className="w-full bg-white text-red-700 py-4 rounded-2xl font-black text-lg tap-target"
        >
          Call {emergencyNumber}
        </button>
        <p className="text-center text-xs text-gray-400">
          FamilyBubble never dials emergency services unless you tap this button.
        </p>

        {!isResolved && !isCancelled && (
          confirmEnd ? (
            <div className="space-y-3 rounded-2xl border border-white/10 p-4">
              <p className="text-center font-bold">Are you sure you want to end the SOS?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmEnd(false)}
                  className="bg-white/10 py-4 rounded-2xl font-bold tap-target"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onResolve}
                  disabled={resolving}
                  className="bg-emerald-500 text-gray-950 py-4 rounded-2xl font-black tap-target disabled:opacity-60"
                >
                  {resolving ? 'Ending…' : "I'm safe"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmEnd(true)}
              className="w-full bg-emerald-500 text-gray-950 py-4 rounded-2xl font-black text-lg tap-target"
            >
              I'm safe
            </button>
          )
        )}

        {sos?.status === SOS_STATUS.ACTIVE && deliveryState !== 'queued' && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-gray-400 py-3 font-semibold tap-target"
          >
            Cancel alert
          </button>
        )}
      </div>
    </div>
  );
};

export default SosActiveScreen;
