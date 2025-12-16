import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles, Users, MapPin, MessageCircle, Shield, Zap, Star } from 'lucide-react';
import { Purchases } from '@revenuecat/purchases-js';

const CustomPaywall = ({ onClose, onPurchaseSuccess, onPurchaseError }) => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Ensure Purchases is configured
      if (!Purchases.isConfigured()) {
        const revenueCatApiKey = process.env.REACT_APP_REVENUECAT_API_KEY;
        if (!revenueCatApiKey) {
          setError("RevenueCat is not configured. Please contact support.");
          setLoading(false);
          return;
        }

        // Configure with anonymous user if needed
        const appUserId = Purchases.generateRevenueCatAnonymousAppUserId();
        await Purchases.configure({
          apiKey: revenueCatApiKey,
          appUserId: appUserId,
        });
      }

      const purchases = Purchases.getSharedInstance();
      const offerings = await purchases.getOfferings();
      const currentOffering = offerings.current;

      if (!currentOffering || !currentOffering.availablePackages || currentOffering.availablePackages.length === 0) {
        setError("No subscription packages available. Please try again later.");
        setLoading(false);
        return;
      }

      // Sort packages: monthly first, then annual, then lifetime
      const sortedPackages = [...currentOffering.availablePackages].sort((a, b) => {
        const aPeriod = a.packageType;
        const bPeriod = b.packageType;
        const order = { MONTHLY: 1, ANNUAL: 2, LIFETIME: 3, SIX_MONTH: 4, THREE_MONTH: 5, TWO_MONTH: 6, WEEKLY: 7, CUSTOM: 8 };
        return (order[aPeriod] || 99) - (order[bPeriod] || 99);
      });

      setPackages(sortedPackages);
      // Select the first package (usually monthly) by default
      if (sortedPackages.length > 0) {
        setSelectedPackage(sortedPackages[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error loading offerings:", err);
      setError("Failed to load subscription options. Please try again.");
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    try {
      setPurchasing(true);
      setError(null);

      const purchases = Purchases.getSharedInstance();
      const { customerInfo } = await purchases.purchasePackage(selectedPackage);

      // Check if purchase was successful
      const premiumEntitlement = customerInfo.entitlements.active["FamilyBubble Premium"];
      
      if (typeof premiumEntitlement !== "undefined") {
        // Purchase successful!
        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        }
      } else {
        setError("Purchase completed but subscription not activated. Please contact support.");
        setPurchasing(false);
      }
    } catch (err) {
      console.error("Purchase error:", err);
      
      // Check if user cancelled
      if (err.code === 2) {
        // User cancelled - don't show error
        setPurchasing(false);
        return;
      }

      // Check if test failure
      const errorMessage = err.message || err.toString() || '';
      if (errorMessage.includes('Purchase failure simulated') || 
          errorMessage.includes('Test Store') ||
          errorMessage.includes('simulated')) {
        // Test failure - still check customer info
        try {
          const purchases = Purchases.getSharedInstance();
          const customerInfo = await purchases.getCustomerInfo();
          const premiumEntitlement = customerInfo.entitlements.active["FamilyBubble Premium"];
          
          if (typeof premiumEntitlement !== "undefined") {
            if (onPurchaseSuccess) {
              onPurchaseSuccess();
            }
            return;
          }
        } catch (checkErr) {
          console.error("Error checking customer info:", checkErr);
        }
      }

      setError("Purchase failed. Please try again.");
      setPurchasing(false);
      
      if (onPurchaseError) {
        onPurchaseError(err);
      }
    }
  };

  const formatPrice = (packageItem) => {
    if (!packageItem.product || !packageItem.product.priceString) {
      return "Loading...";
    }
    return packageItem.product.priceString;
  };

  const getPackageLabel = (packageType) => {
    const labels = {
      MONTHLY: "Monthly",
      ANNUAL: "Annual",
      LIFETIME: "Lifetime",
      SIX_MONTH: "6 Months",
      THREE_MONTH: "3 Months",
      TWO_MONTH: "2 Months",
      WEEKLY: "Weekly",
    };
    return labels[packageType] || packageType;
  };

  const getSavings = (packageItem) => {
    if (packageItem.packageType === 'ANNUAL' && packages.length > 0) {
      const monthlyPackage = packages.find(p => p.packageType === 'MONTHLY');
      if (monthlyPackage && monthlyPackage.product && packageItem.product) {
        const monthlyPrice = monthlyPackage.product.price;
        const annualPrice = packageItem.product.price;
        if (monthlyPrice && annualPrice) {
          const monthlyTotal = monthlyPrice * 12;
          const savings = monthlyTotal - annualPrice;
          const savingsPercent = Math.round((savings / monthlyTotal) * 100);
          if (savingsPercent > 0) {
            return `Save ${savingsPercent}%`;
          }
        }
      }
    }
    return null;
  };

  const features = [
    { icon: Users, text: "Unlimited family members in your bubble" },
    { icon: MapPin, text: "Real-time location sharing" },
    { icon: MessageCircle, text: "Status updates & emoji reactions" },
    { icon: Sparkles, text: "Invite family with shareable links" },
    { icon: Shield, text: "Private & secure family space" },
    { icon: Zap, text: "Instant notifications" },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-gray-950 via-black to-blue-950 rounded-3xl p-8 text-center">
          <div className="w-16 h-16 border-4 border-t-transparent border-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading subscription options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-gradient-to-br from-gray-950 via-black to-blue-950 rounded-3xl shadow-2xl relative overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        {/* Background decorative bubbles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-600/10 rounded-full animate-blob"></div>
          <div className="absolute bottom-0 -right-10 w-80 h-80 bg-blue-600/10 rounded-full animate-blob animation-delay-2000"></div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        <div className="relative z-10 p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl mb-6 shadow-lg">
              <Star size={48} className="text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Unlock FamilyBubble Premium
            </h1>
            <p className="text-gray-300 text-lg sm:text-xl">
              Connect with your family like never before
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Icon size={20} className="text-white" />
                  </div>
                  <p className="text-white text-sm sm:text-base">{feature.text}</p>
                </div>
              );
            })}
          </div>

          {/* Packages */}
          {error && (
            <div className="mb-6 p-4 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-200 text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-3 mb-6">
            {packages.map((packageItem, index) => {
              const isSelected = selectedPackage?.identifier === packageItem.identifier;
              const savings = getSavings(packageItem);
              const isPopular = packageItem.packageType === 'ANNUAL';

              return (
                <button
                  key={packageItem.identifier}
                  onClick={() => setSelectedPackage(packageItem)}
                  disabled={purchasing}
                  className={`w-full relative p-5 rounded-2xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/30'
                      : 'border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10'
                  } ${purchasing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      BEST VALUE
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-purple-400 bg-purple-500' : 'border-white/40'
                        }`}>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                        <h3 className="text-white font-bold text-lg">
                          {getPackageLabel(packageItem.packageType)}
                        </h3>
                        {savings && (
                          <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2 py-1 rounded-full">
                            {savings}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm ml-8">
                        {packageItem.packageType === 'MONTHLY' && 'Billed monthly'}
                        {packageItem.packageType === 'ANNUAL' && 'Billed annually'}
                        {packageItem.packageType === 'LIFETIME' && 'One-time payment'}
                        {packageItem.packageType === 'SIX_MONTH' && 'Billed every 6 months'}
                        {packageItem.packageType === 'THREE_MONTH' && 'Billed every 3 months'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold text-2xl">
                        {formatPrice(packageItem)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Purchase button */}
          <button
            onClick={handlePurchase}
            disabled={!selectedPackage || purchasing}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-600/30 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {purchasing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Start Premium
              </>
            )}
          </button>

          {/* Legal text */}
          <p className="text-gray-500 text-xs text-center mt-6">
            Payment will be charged to your account. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
          </p>

          {/* Restore purchases */}
          <button
            onClick={async () => {
              try {
                const purchases = Purchases.getSharedInstance();
                await purchases.restorePurchases();
                const customerInfo = await purchases.getCustomerInfo();
                const premiumEntitlement = customerInfo.entitlements.active["FamilyBubble Premium"];
                
                if (typeof premiumEntitlement !== "undefined") {
                  if (onPurchaseSuccess) {
                    onPurchaseSuccess();
                  }
                } else {
                  setError("No active subscriptions found to restore.");
                }
              } catch (err) {
                setError("Failed to restore purchases. Please try again.");
              }
            }}
            className="w-full mt-4 text-gray-400 hover:text-white text-sm transition-colors"
          >
            Restore Purchases
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomPaywall;
