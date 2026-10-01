import React from 'react';

const BubblePopup = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="bubble-popup">
      <button
        type="button"
        aria-label="Close popup"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      />
      <div className="relative z-10 w-full max-w-md glass-strong rounded-3xl border border-white/15 shadow-2xl p-5 sm:p-6">
        {title && (
          <h3 className="text-xl font-bold gradient-text mb-4 text-center">{title}</h3>
        )}
        {children}
      </div>
    </div>
  );
};

export default BubblePopup;
