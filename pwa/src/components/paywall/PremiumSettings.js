import React from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { FREE_MEMBER_LIMIT } from '../../services/billing';

const PremiumSettings = ({
  isSubscribed = false,
  isLapsedSubscriber = false,
  onUpgrade,
  onRestorePurchases,
}) => {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Plan</h4>
      {isSubscribed ? (
        <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-emerald-200 font-semibold mb-1">
            <Crown size={16} />
            FamilyBubble Premium
          </div>
          <p className="text-sm text-gray-300">
            SOS and unlimited family members are unlocked.
          </p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Sparkles size={16} className="text-purple-300" />
            {isLapsedSubscriber ? 'Premium expired' : 'Free plan'}
          </div>
          <p className="text-sm text-gray-300">
            The app is free: radar, map, check-in, status, memos, and up to {FREE_MEMBER_LIMIT} family members.
            Premium unlocks SOS alerts and room for the whole family.
          </p>
          {onUpgrade && (
            <button
              type="button"
              onClick={() => onUpgrade()}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-600/30 transition-all tap-target"
            >
              {isLapsedSubscriber ? 'Renew Premium' : 'Upgrade to Premium'}
            </button>
          )}
          {onRestorePurchases && (
            <button
              type="button"
              onClick={onRestorePurchases}
              className="w-full bg-gray-800 border border-gray-700 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 tap-target"
            >
              Restore purchases
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PremiumSettings;
