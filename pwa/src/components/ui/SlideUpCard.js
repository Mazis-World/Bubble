import React from 'react';

const SlideUpCard = ({ isOpen, onClose, children, title }) => {
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 transition-opacity duration-200"
          onClick={onClose}
          style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        />
      )}
      <div 
        className={`fixed bottom-0 left-0 right-0 glass-strong rounded-t-3xl shadow-2xl z-50 transition-transform duration-200 ease-out safe-area-bottom border-t border-white/10 ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '90vh', maxHeight: 'calc(100vh - 2rem)', top: 'auto', willChange: 'transform' }}
      >
        <div 
          className="w-14 h-1.5 bg-gradient-to-r from-gray-500 to-gray-400 rounded-full mx-auto mt-3 mb-4 cursor-pointer hover:from-gray-400 hover:to-gray-300 active:scale-95 transition-all duration-200"
          onClick={onClose}
        />
        {title && (
          <div className="px-4 sm:px-6 pb-4 border-b border-white/10">
            <h3 className="text-xl font-bold gradient-text">{title}</h3>
          </div>
        )}
        <div className="p-4 sm:p-6 overflow-y-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
          {children}
        </div>
      </div>
    </>
  );
};

export default SlideUpCard;
