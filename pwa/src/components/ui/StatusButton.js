import React from 'react';
import { getStatusDisplay } from '../../utils/timeUtils';

const StatusButton = ({ status, active, onClick }) => {
  const colors = {
    Safe: active ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-gray-800 text-gray-400',
    Busy: active ? 'bg-amber-500 shadow-amber-500/50' : 'bg-gray-800 text-gray-400',
    Offline: active ? 'bg-gray-600 shadow-gray-600/50' : 'bg-gray-800 text-gray-400',
    Help: active ? 'bg-rose-500 shadow-rose-500/50' : 'bg-gray-800 text-gray-400'
  };
  
  return (
    <button
      onClick={onClick}
      className={`px-6 py-4 rounded-xl font-semibold transition-all text-3xl ${
        colors[status]
      } ${active ? 'text-white shadow-lg scale-105' : ''}`}
      title={status}
    >
      {getStatusDisplay(status)}
    </button>
  );
};

export default StatusButton;
