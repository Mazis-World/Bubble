import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles, Users, MapPin, MessageCircle, Shield, Zap } from 'lucide-react';
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
      
      // Use "FamilyBubble Offering" if available, otherwise fall back to current offering
      let currentOffering = offerings.all["FamilyBubble Offering"] || offerings.current;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Available offerings:', Object.keys(offerings.all || {}));
        console.log('Using offering:', currentOffering?.identifier || 'current');
      }

      if (!currentOffering) {
        console.error('No current offering found in RevenueCat');
        setError("No subscription packages available. Please ensure your RevenueCat offering is configured and active.");
        setLoading(false);
        return;
      }

      if (!currentOffering.availablePackages || currentOffering.availablePackages.length === 0) {
        console.error('Current offering has no available packages:', currentOffering);
        setError("No subscription packages available in the current offering. Please check your RevenueCat dashboard.");
        setLoading(false);
        return;
      }

      // RevenueCat Products:
      // - FamilyBubble Monthly (familyBubble_Monthly) → MONTHLY package type
      // - FamilyBubble Yearly (familyBubble_Yearly) → ANNUAL package type
      // Entitlement: "FamilyBubble Premium"
      
      // Log all available packages for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('All RevenueCat packages in offering:', currentOffering.availablePackages.map(p => ({
          identifier: p.identifier,
          packageType: p.packageType,
          productId: p.product?.identifier,
          productTitle: p.product?.title,
          price: p.product?.priceString
        })));
      }
      
      // Filter to prioritize our specific products, but allow all packages for testing
      // Expected product identifiers: familyBubble_Monthly, familyBubble_Yearly
      const expectedProductIds = ['familyBubble_Monthly', 'familyBubble_Yearly'];
      const filteredPackages = currentOffering.availablePackages.filter(pkg => {
        const productId = (pkg.product?.identifier || '').toLowerCase();
        const packageIdentifier = (pkg.identifier || '').toLowerCase();
        const productTitle = (pkg.product?.title || '').toLowerCase();
        
        // Check if it matches our expected product identifiers
        const matchesProduct = expectedProductIds.some(id => 
          productId.includes(id.toLowerCase()) || 
          packageIdentifier.includes(id.toLowerCase()) ||
          productTitle.includes('familybubble')
        );
        
        // Include all packages - don't exclude test/default products for testing
        return true;
      });

      // Use all available packages (including test products)
      let packagesToUse = filteredPackages;

      if (packagesToUse.length === 0) {
        setError("No subscription packages available. Please try again later.");
        setLoading(false);
        return;
      }
      
      // Sort packages: monthly first, then annual, then lifetime
      const sortedPackages = [...packagesToUse].sort((a, b) => {
        const aPeriod = a.packageType;
        const bPeriod = b.packageType;
        const order = { MONTHLY: 1, ANNUAL: 2, LIFETIME: 3, SIX_MONTH: 4, THREE_MONTH: 5, TWO_MONTH: 6, WEEKLY: 7, CUSTOM: 8 };
        return (order[aPeriod] || 99) - (order[bPeriod] || 99);
      });

      // Log filtered packages in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Filtered RevenueCat packages (showing in paywall):', sortedPackages.map(p => ({
          identifier: p.identifier,
          packageType: p.packageType,
          productId: p.product?.identifier,
          productTitle: p.product?.title,
          price: p.product?.priceString
        })));
      }

      setPackages(sortedPackages);
      // Select the first package (usually monthly) by default
      if (sortedPackages.length > 0) {
        setSelectedPackage(sortedPackages[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error loading offerings:", err);
      const errorMessage = err?.message || err?.toString() || 'Unknown error';
      setError(`Failed to load subscription options: ${errorMessage}. Please check your RevenueCat API key and configuration.`);
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
    { icon: Users, text: "Unlimited family members" },
    { icon: MapPin, text: "Real-time location sharing" },
    { icon: MessageCircle, text: "Status updates & emojis" },
    { icon: Sparkles, text: "Shareable invite links" },
    { icon: Shield, text: "Private & secure" },
    { icon: Zap, text: "Instant notifications" },
  ];

  if (loading) {
    return (
      <div 
        className="h-screen bg-gradient-to-br from-gray-950 via-black to-blue-950 text-white flex flex-col items-center justify-center p-4 overflow-hidden"
        style={{ 
          height: '100dvh',
          minHeight: '-webkit-fill-available',
          maxHeight: '100vh',
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="w-16 h-16 border-4 border-t-transparent border-purple-500 rounded-full animate-spin mb-4"></div>
        <p className="text-white text-lg">Loading subscription options...</p>
        {process.env.NODE_ENV === 'development' && !process.env.REACT_APP_REVENUECAT_API_KEY && (
          <p className="text-yellow-400 text-sm mt-4 text-center max-w-md">
            ⚠️ REACT_APP_REVENUECAT_API_KEY not found. Check your .env file.
          </p>
        )}
      </div>
    );
  }

  return (
    <div 
      className="h-screen bg-gradient-to-br from-gray-950 via-black to-blue-950 text-white flex flex-col overflow-hidden relative"
      style={{ 
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        maxHeight: '100vh',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Background decorative bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-600/10 rounded-full animate-blob"></div>
        <div className="absolute bottom-0 -right-10 w-80 h-80 bg-blue-600/10 rounded-full animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-teal-600/10 rounded-full animate-blob animation-delay-4000"></div>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 tap-target"
        style={{ 
          minWidth: '44px', 
          minHeight: '44px',
          top: 'calc(env(safe-area-inset-top) + 16px)',
        }}
        aria-label="Close"
      >
        <X size={24} />
      </button>

      {/* Scrollable content */}
      <div 
        className="flex-1 overflow-y-auto relative z-10"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-6 sm:py-8 md:py-10">
          {/* Header - Full width on all screens */}
          <div className="text-center mb-8 sm:mb-10 md:mb-12">
            {/* Logo */}
            <div className="inline-flex items-center justify-center mb-6 sm:mb-8">
              <img 
                src="/familybubble-logo-icon-only.svg" 
                alt="FamilyBubble Logo"
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32"
                onError={(e) => {
                  e.target.src = '/familybubble-logo-icon-only-256x256.png';
                  e.target.onerror = null;
                }}
              />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-5 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent leading-tight px-2">
              Unlock FamilyBubble Premium
            </h1>
            <p className="text-gray-300 text-base sm:text-lg md:text-xl lg:text-2xl px-4 max-w-3xl mx-auto">
              Connect with your family like never before
            </p>
          </div>

          {/* Two-column layout: Features left, Packages right on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-start">
            {/* Left side - Features */}
            <div className="order-2 lg:order-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center lg:text-left">
                Premium Features
              </h2>
              <div className="space-y-4 sm:space-y-5">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-4 sm:gap-5 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 backdrop-blur-sm hover:bg-white/10 transition-colors"
                    >
                      <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Icon size={28} className="sm:w-8 sm:h-8 text-white" />
                      </div>
                      <p className="text-white text-base sm:text-lg md:text-xl leading-relaxed font-medium">{feature.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side - Packages & Purchase */}
            <div className="order-1 lg:order-2 lg:sticky lg:top-6">
              {/* Packages */}
              <div className="space-y-4 sm:space-y-5 mb-6 sm:mb-8">
                {packages.map((packageItem, index) => {
                  const isSelected = selectedPackage?.identifier === packageItem.identifier;
                  const savings = getSavings(packageItem);
                  const isPopular = packageItem.packageType === 'ANNUAL';

                  return (
                    <button
                      key={packageItem.identifier}
                      onClick={() => setSelectedPackage(packageItem)}
                      disabled={purchasing}
                      className={`w-full relative p-5 sm:p-6 md:p-7 rounded-2xl border-2 transition-all text-left tap-target ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/20 shadow-xl shadow-purple-500/40 scale-[1.02]'
                          : 'border-white/20 bg-white/5 active:bg-white/10 active:border-white/30 hover:border-white/30'
                      } ${purchasing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      style={{ minHeight: '80px' }}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg">
                          BEST VALUE
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between gap-4 sm:gap-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 sm:gap-4 mb-2 flex-wrap">
                            <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-purple-400 bg-purple-500 shadow-lg' : 'border-white/40'
                            }`}>
                              {isSelected && <Check size={16} className="sm:w-4 sm:h-4 text-white" />}
                            </div>
                            <h3 className="text-white font-bold text-xl sm:text-2xl md:text-3xl">
                              {getPackageLabel(packageItem.packageType)}
                            </h3>
                            {savings && (
                              <span className="bg-emerald-500/30 text-emerald-200 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-full whitespace-nowrap border border-emerald-400/30">
                                {savings}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm sm:text-base md:text-lg ml-10 sm:ml-11">
                            {packageItem.packageType === 'MONTHLY' && 'Billed monthly'}
                            {packageItem.packageType === 'ANNUAL' && 'Billed annually'}
                            {packageItem.packageType === 'LIFETIME' && 'One-time payment'}
                            {packageItem.packageType === 'SIX_MONTH' && 'Billed every 6 months'}
                            {packageItem.packageType === 'THREE_MONTH' && 'Billed every 3 months'}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-white font-bold text-2xl sm:text-3xl md:text-4xl whitespace-nowrap">
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
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl md:text-2xl flex items-center justify-center gap-3 shadow-xl shadow-purple-600/40 transition-all active:scale-95 hover:shadow-2xl hover:shadow-purple-600/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 tap-target mb-4 sm:mb-5"
                style={{ minHeight: '56px' }}
              >
                {purchasing ? (
                  <>
                    <div className="w-6 h-6 sm:w-7 sm:h-7 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={24} className="sm:w-7 sm:h-7" />
                    <span>Start Premium</span>
                  </>
                )}
              </button>

              {/* Legal text */}
              <p className="text-gray-500 text-[10px] sm:text-xs md:text-sm text-center mb-4 sm:mb-5 px-2 sm:px-4 leading-relaxed">
                Payment will be charged to your account. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
              </p>

              {/* Restore purchases */}
              <button
                onClick={async () => {
                  try {
                    setError(null);
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
                    console.error("Restore error:", err);
                    setError("Failed to restore purchases. Please try again.");
                  }
                }}
                className="w-full text-gray-400 hover:text-white active:text-white text-sm sm:text-base transition-colors tap-target py-2.5"
                style={{ minHeight: '44px' }}
              >
                Restore Purchases
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomPaywall;
