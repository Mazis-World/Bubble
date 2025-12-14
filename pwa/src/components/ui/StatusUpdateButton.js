import React from 'react';
import { Check } from 'lucide-react';

const StatusUpdateButton = ({ 
  onClick, 
  disabled = false, 
  loading = false,
  label = 'Update Status'
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        w-full 
        bg-blue-600 
        hover:bg-blue-700 
        active:bg-blue-800
        disabled:bg-gray-700 
        disabled:cursor-not-allowed
        disabled:opacity-50
        text-white 
        py-3 
        rounded-xl 
        font-semibold 
        transition-all 
        tap-target
        flex items-center justify-center gap-2
        ${loading ? 'cursor-wait' : ''}
      `}
    >
      {loading ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Updating...</span>
        </>
      ) : (
        <>
          <Check size={18} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

export default StatusUpdateButton;
