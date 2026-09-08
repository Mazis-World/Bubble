import React, { useState, useEffect, useRef } from 'react';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import MainApp from './components/bubble/MainApp';
import Welcome from './components/auth/Welcome';
import Login from './components/auth/Login';
import JoinBubbleFlow from './components/auth/JoinBubbleFlow';
import CreateBubbleFlow from './components/auth/CreateBubbleFlow';
import WelcomeWalkthrough from './components/auth/WelcomeWalkthrough';
import CustomPaywall from './components/paywall/CustomPaywall';
import { Purchases, LogLevel } from '@revenuecat/purchases-js';
import { analyticsService } from './services/analytics';
import { sessionBubble } from './services/bubble';

const PENDING_JOIN_KEY = 'familyBubble_pendingJoin';

export default function FamilyBubbleApp() {
  const auth = getAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('welcome'); // welcome, login, join, create, main, purchaseSuccess, purchaseError, walkthrough
  const [joinToken, setJoinToken] = useState(null);
  const [bubbleCreationData, setBubbleCreationData] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLapsedSubscriber, setIsLapsedSubscriber] = useState(false);
  const [pendingJoinToken, setPendingJoinToken] = useState(null);
  const [pendingSosLink, setPendingSosLink] = useState(null);
  const [purchaseError, setPurchaseError] = useState(null);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [pendingPurchaseSuccess, setPendingPurchaseSuccess] = useState(null);
  const [showCustomPaywall, setShowCustomPaywall] = useState(false);
  const customerInfoListenerRef = useRef(null);
  const onBubbleCreatedCallback = React.useCallback(() => setBubbleCreationData(null), []);
  const onInitiateCreateCallback = React.useCallback(() => setView('create'), []);
  const onInitiateJoinCallback = React.useCallback(() => setView('join'), []);

  const persistPendingJoin = React.useCallback((token) => {
    if (!token) return;
    localStorage.setItem(PENDING_JOIN_KEY, token);
    setPendingJoinToken(token);
  }, []);

  const persistPendingSos = React.useCallback((link) => {
    if (!link) return;
    localStorage.setItem('familyBubble_pendingSosLink', JSON.stringify(link));
    setPendingSosLink(link);
  }, []);

  const clearPendingJoin = React.useCallback(() => {
    localStorage.removeItem(PENDING_JOIN_KEY);
    setPendingJoinToken(null);
    setJoinToken(null);
  }, []);

  // Handle URL parameters for join links and SOS deep links
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get('join');
    const fromStore = localStorage.getItem(PENDING_JOIN_KEY);
    const token = fromUrl || fromStore;

    if (token) {
      persistPendingJoin(token);
    }

    const sosId = urlParams.get('sos');
    const sosBubble = urlParams.get('bubble');
    if (sosId && sosBubble) {
      persistPendingSos({ sosId, bubbleId: sosBubble });
    } else {
      try {
        const storedSos = localStorage.getItem('familyBubble_pendingSosLink');
        if (storedSos) setPendingSosLink(JSON.parse(storedSos));
      } catch (error) {
        // Ignore malformed stored SOS links.
      }
    }

    if (fromUrl || sosId) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [persistPendingJoin, persistPendingSos]);
  
  // Logged-out users go through the join wizard. Logged-in users with an
  // invite code skip the wizard so join still runs in MainApp.
  useEffect(() => {
    if (!pendingJoinToken || loading) return;

    if (!currentUser) {
      if (view !== 'join') setView('join');
      return;
    }

    setJoinToken(prev => {
      if (prev?.inviteToken === pendingJoinToken) return prev;
      return {
        inviteToken: pendingJoinToken,
        firstName: prev?.firstName || '',
        lastName: prev?.lastName || '',
        imageFile: prev?.imageFile || null,
        relationshipRole: prev?.relationshipRole || 'Family Member',
        location: prev?.location || null,
      };
    });
    if (view !== 'main') setView('main');
  }, [pendingJoinToken, currentUser, loading, view]);

  useEffect(() => {
    const initializePurchases = async (user) => {
      // Only enable debug logging in development
      if (process.env.NODE_ENV === 'development') {
        Purchases.setLogLevel(LogLevel.DEBUG);
      } else {
        Purchases.setLogLevel(LogLevel.ERROR);
      }

      const revenueCatApiKey = process.env.REACT_APP_REVENUECAT_API_KEY;
      if (!revenueCatApiKey) {
        console.error("RevenueCat API key is not configured");
        return;
      }

      if (!Purchases.isConfigured()) {
        await Purchases.configure({
          apiKey: revenueCatApiKey,
          appUserId: user.uid,
        });
      } else {
        // Keep the existing RevenueCat identity (often anonymous from checkout)
        // and alias it to the Firebase user so the purchase is not orphaned.
        await Purchases.getSharedInstance().logIn(user.uid);
      }

      // Get initial customer info
      const purchases = Purchases.getSharedInstance();
      const customerInfo = await purchases.getCustomerInfo();
      const premiumEntitlement = customerInfo.entitlements.active["FamilyBubble Premium"];
      const wasOnceSubscriber = customerInfo.entitlements.all["FamilyBubble Premium"];

      if (typeof premiumEntitlement !== "undefined") {
        setIsSubscribed(true);
      } else if (typeof wasOnceSubscriber !== "undefined") {
        setIsLapsedSubscriber(true);
      }
      
      // Set up periodic check for customer info updates (for purchase state changes)
      // Note: RevenueCat JS SDK doesn't have listeners, so we poll periodically
      // Clear any existing interval first
      if (customerInfoListenerRef.current) {
        clearInterval(customerInfoListenerRef.current);
      }
      
      const checkInterval = setInterval(async () => {
        try {
          const updatedCustomerInfo = await purchases.getCustomerInfo();
          const updatedPremiumEntitlement = updatedCustomerInfo.entitlements.active["FamilyBubble Premium"];
          const updatedWasOnceSubscriber = updatedCustomerInfo.entitlements.all["FamilyBubble Premium"];

          setIsSubscribed(prevSubscribed => {
            const hasSubscription = typeof updatedPremiumEntitlement !== "undefined";

            if (hasSubscription && !prevSubscribed) {
              setIsLapsedSubscriber(false);
              return true;
            } else if (hasSubscription) {
              setIsLapsedSubscriber(false);
              return true;
            } else if (typeof updatedWasOnceSubscriber !== "undefined") {
              setIsLapsedSubscriber(true);
              return false;
            }
            return prevSubscribed;
          });
        } catch (error) {
          console.error("Error checking customer info:", error);
        }
      }, 2000); // Check every 2 seconds
      
      customerInfoListenerRef.current = checkInterval;
    };

    const unsubscribe = auth.onAuthStateChanged(async user => {
      const previousUser = currentUser;
      setCurrentUser(user);
      setLoading(false);

      if (user && !user.isAnonymous) { // Don't run for the temporary anonymous user
        // Track login if this is a new user session
        if (!previousUser || previousUser.uid !== user.uid) {
          analyticsService.setUserId(user.uid);
          analyticsService.trackLogin('email');
          analyticsService.setUserProperties({
            user_id: user.uid,
            email: user.email || 'unknown'
          });
        }
        
        try {
        await initializePurchases(user);
        } catch (error) {
          console.error("Error initializing Purchases:", error);
        }
        // If we have a join token, we're in the join flow - stay on main to process it
        // Otherwise, go to main view
        if (joinToken || view === 'join') {
          setView('main');
        } else {
        setView('main');
        }
      } else if (user && user.isAnonymous) {
        // This case is handled by the login logic after account creation
      } else if (!user && previousUser) {
        // User logged out
        analyticsService.trackLogout();
      }
    });
    
    return () => {
      unsubscribe();
      // Clean up customer info check interval
      if (customerInfoListenerRef.current) {
        clearInterval(customerInfoListenerRef.current);
        customerInfoListenerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]); // currentUser, joinToken, view intentionally excluded - handled separately

  const handleLogout = () => {
    analyticsService.trackLogout();
    sessionBubble.clear();
    auth.signOut().then(async () => {
      if (Purchases.isConfigured()) {
        try {
      await Purchases.getSharedInstance().logOut();
        } catch (error) {
          console.error("Error logging out from Purchases:", error);
        }
      }
      setIsSubscribed(false);
      setIsLapsedSubscriber(false);
      setView('welcome');
      setJoinToken(null);
      setBubbleCreationData(null);
    });
  };
  
  const handlePurchase = async (onSuccess) => {
    if (isSubscribed && onSuccess) {
      onSuccess();
      return;
    }

    // Store the success callback to execute after purchase
    if (onSuccess) {
      setPendingPurchaseSuccess(() => onSuccess);
    }

    // Show custom paywall immediately
    setShowCustomPaywall(true);

    // Configure RevenueCat in background if needed (paywall will handle this too, but we can pre-configure)
    try {
      if (!Purchases.isConfigured()) {
        if (process.env.NODE_ENV === 'development') {
          console.log("Pre-configuring Purchases...");
        }
        const appUserId = currentUser?.uid || Purchases.generateRevenueCatAnonymousAppUserId();
        
        const revenueCatApiKey = process.env.REACT_APP_REVENUECAT_API_KEY;
        if (revenueCatApiKey) {
          await Purchases.configure({
            apiKey: revenueCatApiKey,
            appUserId: appUserId,
          });
        }
      }
    } catch (error) {
      console.error("Error pre-configuring RevenueCat (paywall will handle):", error);
      // Paywall will handle configuration and show errors if needed
    }
  };

  const handleRestorePurchases = async () => {
    try {
      if (!Purchases.isConfigured()) {
        alert("Purchases not configured. Please try again.");
        return;
      }
      const customerInfo = await Purchases.getSharedInstance().restorePurchases();
      const premiumEntitlement = customerInfo.entitlements.active["FamilyBubble Premium"];

      if (typeof premiumEntitlement !== "undefined") {
        setIsSubscribed(true);
        setIsLapsedSubscriber(false);
        alert("Your purchases have been restored.");
      } else {
        alert("No active subscriptions found to restore.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to restore purchases. Please try again.");
    }
  };

  const handleLoginBack = () => {
    if (joinToken) {
      setView('join');
    } else if (bubbleCreationData) {
      setView('create');
    } else {
      setView('welcome');
    }
  };

  const resetAuthFlow = () => {
    setView('login');
    setJoinToken(null);
    setBubbleCreationData(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center" style={{ minHeight: '100dvh' }}>
        <div className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show custom paywall (check before user auth check so it works on welcome screen)
  if (showCustomPaywall) {
    console.log("Rendering CustomPaywall component");
    return (
      <CustomPaywall
        onClose={() => {
          setShowCustomPaywall(false);
          // Only clear pending callback if user closes without purchasing
          // Don't proceed to create flow if they close the paywall
          setPendingPurchaseSuccess(null);
        }}
        onPurchaseSuccess={() => {
          setShowCustomPaywall(false);
          setIsSubscribed(true);
          setIsLapsedSubscriber(false);
          
          // Execute pending callback if exists (e.g., to proceed to create flow)
          if (pendingPurchaseSuccess) {
            const callback = pendingPurchaseSuccess;
            setPendingPurchaseSuccess(null);
            callback();
          } else {
            // Show walkthrough if no callback (e.g., upgrade from main app)
            setShowWalkthrough(true);
            setView('walkthrough');
          }
        }}
        onPurchaseError={(error) => {
          const errorMessage = error?.message || error?.toString() || '';
          const isCancelled = error?.code === 2;
          
          setShowCustomPaywall(false);
          if (!isCancelled && !errorMessage.includes('Purchase failure simulated')) {
            setPurchaseError("Your purchase could not be completed. Please try again.");
            setView('purchaseError');
          }
        }}
      />
    );
  }

  if (!currentUser) {
    switch (view) {
      case 'join':
        return <JoinBubbleFlow 
                  initialInviteToken={pendingJoinToken || ''}
                  onComplete={async (joinData) => {
                    try {
                      // Create user account first
                      persistPendingJoin(joinData.inviteToken);
                      const { email, password } = joinData;
                      if (email && password) {
                        await createUserWithEmailAndPassword(auth, email, password);
                        analyticsService.trackSignUp('email');
                        setJoinToken(joinData);
                      } else {
                        setJoinToken(joinData);
                        setView('main');
                      }
                    } catch (error) {
                      console.error("Error creating account:", error);
                      analyticsService.trackError('signup_error', error.message);
                      alert(`Account creation failed: ${error.message}`);
                    }
                  }} 
                  onBack={() => {
                    clearPendingJoin();
                    setView('welcome');
                  }} 
                />;
      case 'create':
        return <CreateBubbleFlow 
                  isSubscribed={isSubscribed}
                  onComplete={async (data) => {
                    setBubbleCreationData(data);
                    try {
                      const credential = await createUserWithEmailAndPassword(auth, data.email, data.password);
                      if (Purchases.isConfigured() && credential?.user?.uid) {
                        try {
                          await Purchases.getSharedInstance().logIn(credential.user.uid);
                        } catch (rcError) {
                          console.error("RevenueCat login after signup failed:", rcError);
                        }
                      }
                    } catch (error) {
                      console.error("Firebase user creation failed:", error);
                      setBubbleCreationData(null);
                      alert(`Account creation failed: ${error.message}`);
                    }
                  }}
                  onBack={() => setView('welcome')}
                  handlePurchase={handlePurchase}
                />;
      case 'login':
        return <Login onLoginSuccess={() => setView('main')} onBack={handleLoginBack} />;
      case 'purchaseError':
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-rose-900 text-white flex flex-col items-center justify-center p-4 text-center" style={{ minHeight: '100dvh' }}>
            <div className="max-w-md w-full z-10">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-lg">
                <h1 className="text-4xl font-bold mb-2">Purchase Failed</h1>
                <p className="text-gray-400 mb-8">
                  {purchaseError || "An unexpected error occurred. Please try again."}
                </p>
                <button
                  onClick={() => {
                    setPurchaseError(null);
                    setView('create');
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        );
      case 'welcome':
      default:
        return <Welcome 
                  onLogin={resetAuthFlow} 
                  onCreate={() => setView('create')}
                  onJoin={() => setView('join')} 
                />;
    }
  }

  // If we are here, currentUser exists.
  
  // Show walkthrough after successful purchase, but never delay bubble creation.
  if ((view === 'walkthrough' || showWalkthrough) && !bubbleCreationData) {
    return (
      <WelcomeWalkthrough 
        onComplete={() => {
          analyticsService.trackWalkthroughComplete();
          setShowWalkthrough(false);
          setView('main');
          // The bubble creation will continue in MainApp when bubbleCreationData is set
        }}
      />
    );
  }

  // Show purchase error view
  if (view === 'purchaseError') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-rose-900 text-white flex flex-col items-center justify-center p-4 text-center" style={{ minHeight: '100dvh' }}>
        <div className="max-w-md w-full z-10">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-lg">
            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold mb-2">Purchase Failed</h1>
            <p className="text-gray-400 mb-8">
              {purchaseError || "An unexpected error occurred. Please try again."}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setPurchaseError(null);
                  setView('main');
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-600/30 transition-all transform hover:scale-105"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  setPurchaseError(null);
                  handlePurchase();
                }}
                className="w-full bg-white/10 border border-white/20 text-white py-3 rounded-xl font-semibold hover:bg-white/20 transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'main' && isLapsedSubscriber && !isSubscribed) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center" style={{ minHeight: '100dvh' }}>
          <h1 className="text-3xl font-bold text-white mb-4">Your Subscription has Expired</h1>
          <p className="text-gray-400 mb-8">Please renew your subscription to continue using premium features.</p>
          <button
            onClick={() => handlePurchase()}
            className="w-full max-w-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-600/30 transition-all"
          >
            Renew Subscription
          </button>
           <button
            onClick={handleLogout}
            className="mt-8 text-gray-400 text-sm hover:text-white transition-colors"
          >
            Sign Out
          </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 overflow-hidden" style={{ height: '100dvh', minHeight: '-webkit-fill-available' }}>
      <MainApp 
        userId={currentUser.uid} 
        onLogout={handleLogout} 
        joinToken={joinToken} 
        bubbleCreationData={bubbleCreationData}
        onBubbleCreated={onBubbleCreatedCallback}
        isSubscribed={isSubscribed}
        onUpgrade={handlePurchase}
        onRestorePurchases={handleRestorePurchases}
        onInitiateCreate={onInitiateCreateCallback}
        onInitiateJoin={onInitiateJoinCallback}
        onJoinProcessed={clearPendingJoin}
        sosLink={pendingSosLink}
      />
    </div>
  );
}

/* const PurchaseSuccessView = ({ auth, bubbleCreationData, anonymousId, setAnonymousId, setPurchaseError, setView }) => {
  const onContinue = async () => {
    try {
      const data = bubbleCreationData;
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const newUser = userCredential.user;

      // Link anonymous RevenueCat user to the new Firebase user
      if (anonymousId) {
        console.log(`Logging into RevenueCat to link anonymous user ${anonymousId} to ${newUser.uid}`);
        await Purchases.getSharedInstance().logIn(newUser.uid);
        setAnonymousId(null);
      }
      // The onAuthStateChanged listener will now pick up the new user and switch to the main app view.
    } catch (error) {
      console.error("Firebase user creation failed:", error);
      setPurchaseError(`Account creation failed: ${error.message}`);
      setView('purchaseError');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-blue-950 text-white flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md w-full z-10">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-lg">
          <CheckCircle2 size={64} className="mx-auto text-emerald-400 mb-6" />
          <h1 className="text-4xl font-bold mb-2">Purchase Successful!</h1>
          <p className="text-gray-400 mb-8">
            Welcome to FamilyBubble Premium. Let's finish creating your bubble.
          </p>
          <button
            onClick={onContinue}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-600/30 transition-all transform hover:scale-105"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

const PurchaseErrorView = ({ message, onRetry }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-rose-900 text-white flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md w-full z-10">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-lg">
          <XCircle size={64} className="mx-auto text-rose-500 mb-6" />
          <h1 className="text-4xl font-bold mb-2">Purchase Failed</h1>
          <p className="text-gray-400 mb-8">
            {message || "An unexpected error occurred. Please try again."}
          </p>
          <button
            onClick={onRetry}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-600/30 transition-all transform hover:scale-105"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}; */
