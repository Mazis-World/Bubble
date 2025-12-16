import React, { useState, useEffect } from 'react';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import MainApp from './components/bubble/MainApp';
import Welcome from './components/auth/Welcome';
import Login from './components/auth/Login';
import JoinBubbleFlow from './components/auth/JoinBubbleFlow';
import CreateBubbleFlow from './components/auth/CreateBubbleFlow';
import { Purchases, LogLevel } from '@revenuecat/purchases-js'


export default function FamilyBubbleApp() {
  const auth = getAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('welcome'); // welcome, login, join, create, main, purchaseSuccess, purchaseError
  const [joinToken, setJoinToken] = useState(null);
  const [bubbleCreationData, setBubbleCreationData] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLapsedSubscriber, setIsLapsedSubscriber] = useState(false);
  const [pendingJoinToken, setPendingJoinToken] = useState(null);
  const [anonymousId, setAnonymousId] = useState(null);
  const [purchaseError, setPurchaseError] = useState(null);
  const onBubbleCreatedCallback = React.useCallback(() => setBubbleCreationData(null), []);
  const onInitiateCreateCallback = React.useCallback(() => setView('create'), []);

  // Handle URL parameters for join links
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinToken = urlParams.get('join');
    
    if (joinToken) {
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // If user is not logged in, go to join flow
      if (!currentUser && !loading) {
        setView('join');
        // Store the token to pre-populate the join flow
        setPendingJoinToken(joinToken);
      }
      // If user is logged in, they shouldn't be joining - they're already in a bubble
      // But we could handle this case if needed
    }
  }, [currentUser, loading]);

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

      await Purchases.configure({
        apiKey: revenueCatApiKey,
        appUserId: user.uid,
      });

      const customerInfo = await Purchases.getSharedInstance().getCustomerInfo();
      const premiumEntitlement = customerInfo.entitlements.active["FamilyBubble Premium"];
      const wasOnceSubscriber = customerInfo.entitlements.all["FamilyBubble Premium"];

      if (typeof premiumEntitlement !== "undefined") {
        setIsSubscribed(true);
      } else if (typeof wasOnceSubscriber !== "undefined") {
        setIsLapsedSubscriber(true);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(async user => {
      setCurrentUser(user);
      setLoading(false);

      if (user && !user.isAnonymous) { // Don't run for the temporary anonymous user
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
      }
    });
    return () => unsubscribe();
  }, [auth]);

  const handleLogout = () => {
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
    try {
      // Ensure Purchases is configured, especially for the anonymous user creation flow.
      if (!Purchases.isConfigured()) {
        if (process.env.NODE_ENV === 'development') {
          console.log("Configuring Purchases for anonymous user...");
        }
        const appUserId = Purchases.generateRevenueCatAnonymousAppUserId();
        setAnonymousId(appUserId); // Store anonymous ID for later
        
        const revenueCatApiKey = process.env.REACT_APP_REVENUECAT_API_KEY;
        if (!revenueCatApiKey) {
          throw new Error("RevenueCat API key is not configured");
        }
        
        await Purchases.configure({
          apiKey: revenueCatApiKey,
          appUserId: appUserId,
        });
      }

      const purchases = Purchases.getSharedInstance();
      const offerings = await purchases.getOfferings();
      const currentOffering = offerings.current;
      if (!currentOffering) {
        alert("No offerings found.");
        return;
      }

      await purchases.presentPaywall({ offering: currentOffering });

      // After paywall, verify entitlement to ensure trial/subscription was started
      const customerInfo = await purchases.getCustomerInfo();
      const premiumEntitlement = customerInfo.entitlements.active["FamilyBubble Premium"];

      if (typeof premiumEntitlement !== "undefined") {
        setIsSubscribed(true);
        setIsLapsedSubscriber(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        alert("Please start your free trial or subscription to continue.");
      }
    } catch (error) {
      console.error("Paywall presentation or purchase error:", error);
      
      // RevenueCat JS SDK throws a CodedError. We can inspect the code.
      const isCancelled = error.code === 2; // PURCHASE_CANCELLED code from SDK

      if (isCancelled) {
          console.log("Purchase was cancelled by the user.");
          // No need to show an error screen for cancellation.
          return;
      }

      // For all other errors, show a dedicated error screen.
      setPurchaseError("Your purchase could not be completed. Please check your payment details and try again.");
      setView('purchaseError');
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
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center" style={{ minHeight: '100dvh', minHeight: '-webkit-fill-available' }}>
        <div className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
      </div>
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
                      const { email, password } = joinData;
                      if (email && password) {
                        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                        // User will be automatically set via onAuthStateChanged
                        // Store join data to process after authentication
                        setJoinToken(joinData);
                        // The auth state change will handle switching to main view
                      } else {
                        // Fallback if no email/password (shouldn't happen in new flow)
                        setJoinToken(joinData);
                      setView('main');
                      }
                      // Clear pending token after use
                      setPendingJoinToken(null);
                    } catch (error) {
                      console.error("Error creating account:", error);
                      alert(`Account creation failed: ${error.message}`);
                    }
                  }} 
                  onBack={() => {
                    setPendingJoinToken(null);
                    setView('welcome');
                  }} 
                />;
      case 'create':
        return <CreateBubbleFlow 
                  onComplete={async (data) => {
                    setBubbleCreationData(data);
                    try {
                      await createUserWithEmailAndPassword(auth, data.email, data.password);
                    } catch (error) {
                      console.error("Firebase user creation failed:", error);
                      alert(`Account creation failed: ${error.message}`);
                    }
                  }}
                  onBack={() => setView('welcome')}
                  handlePurchase={handlePurchase}
                />;
      case 'login':
        return <Login onLoginSuccess={() => setView('main')} onBack={handleLoginBack} />;
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
  if (view === 'main' && isLapsedSubscriber && !isSubscribed) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center" style={{ minHeight: '100dvh', minHeight: '-webkit-fill-available' }}>
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
        onJoinProcessed={() => setJoinToken(null)}
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