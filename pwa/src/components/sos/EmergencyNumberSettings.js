import React, { useState } from 'react';
import { getEmergencyNumber, setEmergencyNumber } from '../../services/sos';

const EmergencyNumberSettings = () => {
  const [number, setNumber] = useState(getEmergencyNumber());
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Emergency call</h4>
      <p className="text-xs text-gray-400">
        SOS never dials this number automatically. You choose when to call.
      </p>
      <input
        type="tel"
        value={number}
        onChange={(e) => {
          setNumber(e.target.value);
          setSaved(false);
        }}
        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white"
        aria-label="Emergency phone number"
      />
      <button
        type="button"
        onClick={() => {
          setEmergencyNumber(number);
          setNumber(getEmergencyNumber());
          setSaved(true);
        }}
        className="w-full bg-gray-800 border border-gray-700 text-white py-3 rounded-xl font-semibold tap-target"
      >
        {saved ? 'Saved' : 'Save emergency number'}
      </button>
    </div>
  );
};

export default EmergencyNumberSettings;
