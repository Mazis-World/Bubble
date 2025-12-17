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

      // Log filtered packages in development for debugging - FULL DETAILS
      if (process.env.NODE_ENV === 'development') {
        console.log('=== FULL PACKAGE DETAILS FOR PAYWALL ===');
        sortedPackages.forEach((p, index) => {
          console.log(`Package ${index + 1}:`, {
            packageIdentifier: p.identifier,
            packageType: p.packageType,
            product: p.product,
            productIdentifier: p.product?.identifier,
            productTitle: p.product?.title,
            productDescription: p.product?.description,
            priceString: p.product?.priceString,
            price: p.product?.price,
            currencyCode: p.product?.currencyCode,
            introPrice: p.product?.introPrice,
            subscriptionPeriod: p.product?.subscriptionPeriod,
            allProductKeys: p.product ? Object.keys(p.product) : 'NO PRODUCT',
            fullProductObject: p.product
          });
        });
        console.log('=== END PACKAGE DETAILS ===');
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
      
      // Check if user canceled
      if (err.code === 2) {
        // User canceled - don't show error
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
    // Check webBillingProduct first (has formattedPrice)
    if (packageItem?.webBillingProduct?.currentPrice?.formattedPrice) {
      let price = packageItem.webBillingProduct.currentPrice.formattedPrice;
      // Fix encoding issues and spacing
      price = price.replace(/é/g, '$').replace(/€/g, '$');
      // Fix spacing: remove space between $ and number (e.g., "$ 4.99" -> "$4.99")
      price = price.replace(/\$\s+/g, '$').replace(/\s+\$/g, '$');
      return price;
    }
    if (packageItem?.webBillingProduct?.price?.formattedPrice) {
      let price = packageItem.webBillingProduct.price.formattedPrice;
      price = price.replace(/é/g, '$').replace(/€/g, '$');
      price = price.replace(/\$\s+/g, '$').replace(/\s+\$/g, '$');
      return price;
    }
    
    // Check rcBillingProduct
    if (packageItem?.rcBillingProduct?.currentPrice?.formattedPrice) {
      let price = packageItem.rcBillingProduct.currentPrice.formattedPrice;
      price = price.replace(/é/g, '$').replace(/€/g, '$');
      price = price.replace(/\$\s+/g, '$').replace(/\s+\$/g, '$');
      return price;
    }
    if (packageItem?.rcBillingProduct?.price?.formattedPrice) {
      let price = packageItem.rcBillingProduct.price.formattedPrice;
      price = price.replace(/é/g, '$').replace(/€/g, '$');
      price = price.replace(/\$\s+/g, '$').replace(/\s+\$/g, '$');
      return price;
    }
    
    // Legacy: Check product.priceString (if product exists)
    if (packageItem?.product?.priceString) {
      let price = packageItem.product.priceString;
      price = price.replace(/é/g, '$').replace(/€/g, '$');
      price = price.replace(/\$\s+/g, '$').replace(/\s+\$/g, '$');
      return price;
    }
    
    // Fallback: try to format from price amount and currency
    const priceObj = packageItem?.webBillingProduct?.currentPrice || 
                     packageItem?.webBillingProduct?.price ||
                     packageItem?.rcBillingProduct?.currentPrice ||
                     packageItem?.rcBillingProduct?.price;
    
    if (priceObj?.amount && priceObj?.currency) {
      try {
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: priceObj.currency,
        });
        // Amount is in cents (4790 = $47.90)
        return formatter.format(priceObj.amount / 100);
      } catch (e) {
        console.error('Error formatting price:', e, priceObj);
      }
    }
    
    return "Loading...";
  };

  const getMonthlyPrice = (packageItem) => {
    if (packageItem.packageType === 'ANNUAL') {
      const priceObj = packageItem?.webBillingProduct?.currentPrice || 
                       packageItem?.webBillingProduct?.price ||
                       packageItem?.rcBillingProduct?.currentPrice ||
                       packageItem?.rcBillingProduct?.price;
      
      if (priceObj?.amount && priceObj?.currency) {
        try {
          const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: priceObj.currency,
          });
          // Calculate monthly: annual price / 12
          const monthlyAmount = (priceObj.amount / 100) / 12;
          return formatter.format(monthlyAmount);
        } catch (e) {
          console.error('Error calculating monthly price:', e);
        }
      }
    }
    return null;
  };

  const getPackageLabel = (packageItem) => {
    // Get the identifier from webBillingProduct or rcBillingProduct
    const identifier = packageItem?.webBillingProduct?.identifier || 
                       packageItem?.rcBillingProduct?.identifier ||
                       packageItem?.product?.identifier ||
                       '';
    
    // Format the identifier to a clean label
    if (identifier) {
      const lowerId = identifier.toLowerCase();
      
      // Check for yearly/annual
      if (lowerId.includes('yearly') || lowerId.includes('annual')) {
        return 'Yearly';
      }
      
      // Check for monthly
      if (lowerId.includes('monthly')) {
        return 'Monthly';
      }
      
      // Check for lifetime
      if (lowerId.includes('lifetime')) {
        return 'Lifetime';
      }
      
      // Check for other periods
      if (lowerId.includes('six') || lowerId.includes('6')) {
        return '6 Months';
      }
      if (lowerId.includes('three') || lowerId.includes('3')) {
        return '3 Months';
      }
      if (lowerId.includes('two') || lowerId.includes('2')) {
        return '2 Months';
      }
      if (lowerId.includes('weekly') || lowerId.includes('week')) {
        return 'Weekly';
      }
    }
    
    // Fallback to package type
    const packageType = packageItem?.packageType || '';
    const typeLabels = {
      MONTHLY: "Monthly",
      ANNUAL: "Yearly",
      LIFETIME: "Lifetime",
      SIX_MONTH: "6 Months",
      THREE_MONTH: "3 Months",
      TWO_MONTH: "2 Months",
      WEEKLY: "Weekly",
    };
    
    if (packageType && typeLabels[packageType]) {
      return typeLabels[packageType];
    }
    
    // Last resort: parse from package identifier
    const packageIdentifier = packageItem?.identifier || '';
    if (packageIdentifier.includes('annual') || packageIdentifier.includes('yearly')) {
      return 'Yearly';
    }
    if (packageIdentifier.includes('monthly')) {
      return 'Monthly';
    }
    
    return 'Monthly'; // Default fallback
  };

  const getFreeTrialInfo = (packageItem) => {
    // Different trial periods: Monthly = 3 days, Annual = 7 days
    // ALWAYS use these values regardless of what RevenueCat returns
    const isMonthly = packageItem.packageType === 'MONTHLY';
    const trialDays = isMonthly ? 3 : 7;
    const trialFormatted = isMonthly ? '3 days free' : '7 days free';
    
    // Check if product has trial configured (but always use our days value)
    const webProduct = packageItem?.webBillingProduct;
    const rcProduct = packageItem?.rcBillingProduct;
    
    // If either product exists, return trial info with our hardcoded days
    if (webProduct || rcProduct) {
      return {
        formatted: trialFormatted,
        days: trialDays
      };
    }
    
    return null;
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
    { 
      icon: Users, 
      text: "Unlimited family members",
      visual: "radar",
      description: "See your entire family at a glance on the interactive radar"
    },
    { 
      icon: MapPin, 
      text: "Real-time location sharing",
      visual: "globe",
      description: "Track family locations on a beautiful 3D globe"
    },
    { 
      icon: MessageCircle, 
      text: "Status updates & emojis",
      visual: "status",
      description: "Share moments with custom status updates"
    },
    { 
      icon: Sparkles, 
      text: "Shareable invite links",
      visual: "invite",
      description: "Invite family members instantly with secure links"
    },
    { 
      icon: Shield, 
      text: "Private & secure",
      visual: "security",
      description: "End-to-end encrypted, family-only access"
    },
    { 
      icon: Zap, 
      text: "Instant notifications",
      visual: "notifications",
      description: "Stay connected with real-time alerts"
    },
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
          <div className="text-center mb-8 sm:mb-10 md:mb-12 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.2s' }}>
            {/* Logo */}
            <div className="inline-flex items-center justify-center mb-6 sm:mb-8 animate-scale-in" style={{ opacity: 0, animationDelay: '0.1s' }}>
              <img 
                src="/familybubble-logo-icon-only.svg" 
                alt="FamilyBubble Logo"
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 drop-shadow-2xl"
                onError={(e) => {
                  e.target.src = '/familybubble-logo-icon-only-256x256.png';
                  e.target.onerror = null;
                }}
              />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-5 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent leading-tight px-2 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.3s' }}>
              Where Family Meets Technology
            </h1>
            <p className="text-gray-300 text-base sm:text-lg md:text-xl lg:text-2xl px-4 max-w-3xl mx-auto mb-4 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.4s' }}>
              The most intuitive way to stay connected with your family. Try Premium free for 3 days—experience everything, risk nothing.
            </p>
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 rounded-full px-4 py-2 mt-2 animate-fade-in-up" style={{ opacity: 0, animationDelay: '0.5s' }}>
              <Sparkles size={18} className="text-emerald-300 animate-pulse" />
              <span className="text-emerald-200 font-semibold text-sm sm:text-base">No credit card required • Cancel anytime</span>
            </div>
          </div>

          {/* Two-column layout: Features left, Packages right on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16 items-start">
            {/* Left side - Features with Visuals */}
            <div className="order-2 lg:order-1 animate-slide-in-left" style={{ opacity: 0, animationDelay: '0.6s' }}>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 text-center lg:text-left">
                Everything Your Family Needs
              </h2>
              <div className="space-y-6 sm:space-y-8">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={index}
                      className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl"
                      style={{ 
                        opacity: 0, 
                        animation: `fadeInUp 0.6s ease-out ${0.7 + index * 0.1}s forwards`
                      }}
                    >
                      <div className="flex items-start gap-4 sm:gap-5">
                        <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                          <Icon size={24} className="sm:w-7 sm:h-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-bold text-lg sm:text-xl md:text-2xl mb-2">{feature.text}</h3>
                          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">{feature.description}</p>
                        </div>
                      </div>
                      
                      {/* Visual Preview */}
                      {feature.visual === 'radar' && (
                        <div className="mt-4 relative h-48 sm:h-56 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 rounded-xl overflow-hidden border border-cyan-500/20">
                          <div className="absolute inset-0 flex items-center justify-center">
                            {/* Radar Circle */}
                            <div className="relative w-40 h-40 sm:w-48 sm:h-48">
                              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40"></div>
                              <div className="absolute inset-4 rounded-full border border-cyan-400/30"></div>
                              <div className="absolute inset-8 rounded-full border border-cyan-400/20"></div>
                              {/* Radar Sweep */}
                              <div className="absolute top-1/2 left-1/2 w-1 h-20 bg-gradient-to-b from-cyan-400 to-transparent origin-bottom transform -translate-x-1/2 -translate-y-full"
                                style={{ animation: 'radarSweep 3s linear infinite' }}></div>
                              {/* Family Bubbles */}
                              <div className="absolute top-[15%] left-[25%] w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs">👨</div>
                              <div className="absolute top-[45%] right-[20%] w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs">👩</div>
                              <div className="absolute bottom-[20%] left-[20%] w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-xs">👧</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {feature.visual === 'globe' && (
                        <div className="mt-4 relative h-48 sm:h-56 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-xl overflow-visible border border-blue-500/20 flex items-center justify-center" style={{ perspective: '1200px', perspectiveOrigin: 'center center' }}>
                          <div className="relative w-40 h-40 sm:w-48 sm:h-48" style={{ 
                            transformStyle: 'preserve-3d',
                            animation: 'rotateGlobe3D 20s linear infinite'
                          }}>
                            {/* Outer glow ring for depth */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/30 to-blue-500/20 blur-2xl" style={{ transform: 'scale(1.4) translateZ(-20px)' }}></div>
                            
                            {/* 3D Globe Sphere - Main sphere with proper spherical appearance */}
                            <div className="absolute inset-0 rounded-full" style={{
                              background: 'radial-gradient(ellipse 60% 100% at 30% 30%, rgba(34, 211, 238, 1), rgba(59, 130, 246, 0.85) 20%, rgba(30, 64, 175, 0.75) 40%, rgba(15, 23, 42, 0.9) 65%, rgba(0, 0, 0, 0.95) 100%)',
                              transformStyle: 'preserve-3d',
                              boxShadow: `
                                inset -50px -50px 100px rgba(0, 0, 0, 0.9),
                                inset 50px 50px 100px rgba(59, 130, 246, 0.6),
                                inset -20px 20px 40px rgba(0, 0, 0, 0.5),
                                inset 20px -20px 40px rgba(34, 211, 238, 0.4),
                                0 0 80px rgba(34, 211, 238, 0.5),
                                0 0 150px rgba(59, 130, 246, 0.3)
                              `,
                              border: '3px solid rgba(34, 211, 238, 0.5)',
                              filter: 'drop-shadow(0 0 30px rgba(34, 211, 238, 0.4))'
                            }}>
                              {/* Continents/landmasses with realistic shapes */}
                              <div className="absolute top-[12%] left-[20%] w-14 h-20 bg-gradient-to-b from-emerald-500/90 to-emerald-700/70 rounded-t-full blur-[0.5px]" style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)' }}></div>
                              <div className="absolute top-[32%] right-[15%] w-18 h-24 bg-gradient-to-b from-emerald-500/90 to-emerald-700/70 rounded-t-full blur-[0.5px]" style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 40%, 90% 100%, 10% 100%, 0% 40%)' }}></div>
                              <div className="absolute bottom-[18%] left-[25%] w-16 h-22 bg-gradient-to-b from-emerald-500/90 to-emerald-700/70 rounded-t-full blur-[0.5px]" style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}></div>
                              {/* Latitude/longitude grid lines - curved for sphere effect */}
                              <div className="absolute top-1/4 left-0 right-0 h-px bg-cyan-400/50" style={{ borderRadius: '50%', transform: 'scaleY(0.3)' }}></div>
                              <div className="absolute bottom-1/4 left-0 right-0 h-px bg-cyan-400/50" style={{ borderRadius: '50%', transform: 'scaleY(0.3)' }}></div>
                              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400/50"></div>
                              <div className="absolute top-0 left-1/4 bottom-0 w-px bg-cyan-400/30"></div>
                              <div className="absolute top-0 right-1/4 bottom-0 w-px bg-cyan-400/30"></div>
                            </div>
                            
                            {/* Location markers with 3D positioning and enhanced glow */}
                            <div className="absolute top-[16%] left-[26%] w-5 h-5 rounded-full bg-purple-400 shadow-2xl shadow-purple-400/80 animate-pulse" style={{ animationDelay: '0s', transform: 'translateZ(28px) scale(1.3)', filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 1))' }}></div>
                            <div className="absolute bottom-[20%] right-[20%] w-5 h-5 rounded-full bg-blue-400 shadow-2xl shadow-blue-400/80 animate-pulse" style={{ animationDelay: '0.5s', transform: 'translateZ(28px) scale(1.3)', filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 1))' }}></div>
                            <div className="absolute top-[46%] right-[30%] w-5 h-5 rounded-full bg-pink-400 shadow-2xl shadow-pink-400/80 animate-pulse" style={{ animationDelay: '1s', transform: 'translateZ(28px) scale(1.3)', filter: 'drop-shadow(0 0 12px rgba(236, 72, 153, 1))' }}></div>
                            
                            {/* Highlight for 3D depth - light reflection */}
                            <div className="absolute top-[18%] left-[22%] w-20 h-20 rounded-full bg-white/15 blur-2xl" style={{ transform: 'translateZ(35px)' }}></div>
                            
                            {/* Secondary highlight for more depth */}
                            <div className="absolute top-[25%] left-[30%] w-12 h-12 rounded-full bg-cyan-300/20 blur-xl" style={{ transform: 'translateZ(32px)' }}></div>
                          </div>
                        </div>
                      )}
                      
                      {feature.visual === 'status' && (
                        <div className="mt-4 relative h-48 sm:h-56 bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-xl overflow-hidden border border-purple-500/20 p-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
                              <div className="flex-1">
                                <div className="h-3 bg-white/20 rounded w-3/4 mb-2"></div>
                                <div className="h-2 bg-white/10 rounded w-1/2"></div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-2xl">😊</div>
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-2xl">❤️</div>
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-2xl">⭐</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {feature.visual === 'invite' && (
                        <div className="mt-4 relative h-48 sm:h-56 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 rounded-xl overflow-hidden border border-emerald-500/20 p-4 flex items-center justify-center">
                          <div className="text-center space-y-3">
                            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                              <Sparkles size={32} className="text-white" />
                            </div>
                            <div className="h-3 bg-white/20 rounded w-32 mx-auto"></div>
                            <div className="h-2 bg-white/10 rounded w-24 mx-auto"></div>
                          </div>
                        </div>
                      )}
                      
                      {feature.visual === 'security' && (
                        <div className="mt-4 relative h-48 sm:h-56 bg-gradient-to-br from-gray-900/20 to-slate-900/20 rounded-xl overflow-hidden border border-gray-500/20 p-4 flex items-center justify-center">
                          <div className="text-center space-y-4">
                            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center shadow-lg border-2 border-gray-500/50">
                              <Shield size={40} className="text-white" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-2 bg-white/20 rounded w-40 mx-auto"></div>
                              <div className="h-2 bg-white/10 rounded w-32 mx-auto"></div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {feature.visual === 'notifications' && (
                        <div className="mt-4 relative h-48 sm:h-56 bg-gradient-to-br from-yellow-900/20 to-orange-900/20 rounded-xl overflow-hidden border border-yellow-500/20 p-4">
                          <div className="space-y-3">
                            <div className="bg-white/10 rounded-lg p-3 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                                <Zap size={20} className="text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="h-3 bg-white/20 rounded w-full mb-1"></div>
                                <div className="h-2 bg-white/10 rounded w-2/3"></div>
                              </div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                <MapPin size={20} className="text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="h-3 bg-white/20 rounded w-full mb-1"></div>
                                <div className="h-2 bg-white/10 rounded w-1/2"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side - Packages & Purchase */}
            <div className="order-1 lg:order-2 lg:sticky lg:top-6 animate-slide-in-right" style={{ opacity: 0, animationDelay: '0.6s' }}>
              {/* Packages */}
              <div className="space-y-4 sm:space-y-5 mb-6 sm:mb-8">
                {packages.map((packageItem, index) => {
                  const isSelected = selectedPackage?.identifier === packageItem.identifier;
                  const savings = getSavings(packageItem);
                  const isPopular = packageItem.packageType === 'ANNUAL';
                  const freeTrial = getFreeTrialInfo(packageItem);

                  return (
                    <button
                      key={packageItem.identifier}
                      onClick={() => setSelectedPackage(packageItem)}
                      disabled={purchasing}
                      className={`w-full relative p-5 sm:p-6 md:p-7 rounded-2xl border-2 transition-all duration-300 text-left tap-target ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/20 shadow-xl shadow-purple-500/40 scale-[1.02]'
                          : 'border-white/20 bg-white/5 active:bg-white/10 active:border-white/30 hover:border-white/30 hover:scale-[1.01]'
                      } ${purchasing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      style={{ 
                        minHeight: '80px',
                        opacity: 0,
                        animation: `fadeInUp 0.5s ease-out ${0.8 + index * 0.1}s forwards`
                      }}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-lg z-10">
                          BEST VALUE
                        </div>
                      )}
                      
                      {freeTrial && (
                        <div className="absolute -top-3 sm:-top-4 right-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg z-10 animate-pulse">
                          🎁 {freeTrial.days} Days Free
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
                              {getPackageLabel(packageItem)}
                            </h3>
                            {savings && (
                              <span className="bg-emerald-500/30 text-emerald-200 text-xs sm:text-sm font-bold px-3 py-1.5 rounded-full whitespace-nowrap border border-emerald-400/30">
                                {savings}
                              </span>
                            )}
                          </div>
                          <div className="ml-10 sm:ml-11">
                            {freeTrial ? (
                              <div className="space-y-1">
                                <p className="text-emerald-300 font-semibold text-sm sm:text-base md:text-lg">
                                  {freeTrial.days} days free, then {formatPrice(packageItem)}/{packageItem.packageType === 'MONTHLY' ? 'month' : 'year'}
                                  {packageItem.packageType === 'ANNUAL' && getMonthlyPrice(packageItem) && (
                                    <span className="text-gray-400 font-normal"> ({getMonthlyPrice(packageItem)}/month)</span>
                                  )}
                                </p>
                                <p className="text-gray-400 text-xs sm:text-sm">
                                  Full access during trial • Cancel anytime
                                </p>
                              </div>
                            ) : (
                              <p className="text-gray-400 text-sm sm:text-base md:text-lg">
                                {packageItem.packageType === 'MONTHLY' && 'Billed monthly'}
                                {packageItem.packageType === 'ANNUAL' && `Billed annually${getMonthlyPrice(packageItem) ? ` (${getMonthlyPrice(packageItem)}/month)` : ''}`}
                                {packageItem.packageType === 'LIFETIME' && 'One-time payment'}
                                {packageItem.packageType === 'SIX_MONTH' && 'Billed every 6 months'}
                                {packageItem.packageType === 'THREE_MONTH' && 'Billed every 3 months'}
                              </p>
                            )}
                          </div>
                        </div>
                        {!freeTrial && (
                          <div className="text-right flex-shrink-0">
                            <div className="text-white font-bold text-2xl sm:text-3xl md:text-4xl whitespace-nowrap">
                              {formatPrice(packageItem)}
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Purchase button */}
              <button
                onClick={handlePurchase}
                disabled={!selectedPackage || purchasing}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl md:text-2xl flex items-center justify-center gap-3 shadow-xl shadow-purple-600/40 transition-all duration-300 active:scale-95 hover:shadow-2xl hover:shadow-purple-600/50 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:scale-100 tap-target mb-4 sm:mb-5 animate-fade-in-up"
                style={{ 
                  minHeight: '56px',
                  opacity: 0,
                  animationDelay: `${1.2 + packages.length * 0.1}s`
                }}
              >
                {purchasing ? (
                  <>
                    <div className="w-6 h-6 sm:w-7 sm:h-7 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={24} className="sm:w-7 sm:h-7" />
                    <span>Start Free Trial</span>
                  </>
                )}
              </button>

              {/* Legal text */}
              <p className="text-gray-500 text-[10px] sm:text-xs md:text-sm text-center mb-4 sm:mb-5 px-2 sm:px-4 leading-relaxed">
                Free trial begins immediately upon activation. Monthly subscriptions include 3 days free; annual subscriptions include 7 days free. Cancel anytime during your trial period with no charges. Your subscription will automatically renew after the trial ends unless canceled at least 24 hours before the renewal date.
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
