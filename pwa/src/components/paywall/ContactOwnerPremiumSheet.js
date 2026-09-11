import React from 'react';
import { contactOwnerToUpgradeMessage } from '../../services/billing';

const ContactOwnerPremiumSheet = ({
  ownerName = '',
  onClose,
}) => (
  <div
    className="fixed inset-0 z-[80] bg-black/80 flex items-end sm:items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="contact-owner-premium-title"
  >
    <div className="w-full max-w-md glass-strong border border-purple-400/30 rounded-3xl p-6 space-y-4">
      <h2 id="contact-owner-premium-title" className="text-xl font-black text-white">
        Ask your FamilyBubble owner
      </h2>
      <p className="text-gray-300">{contactOwnerToUpgradeMessage(ownerName)}</p>
      <button
        type="button"
        onClick={onClose}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-2xl font-black tap-target"
      >
        Got it
      </button>
    </div>
  </div>
);

export default ContactOwnerPremiumSheet;
