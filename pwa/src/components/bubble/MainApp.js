import React, { useState, useEffect, useRef } from 'react';
import { API, sessionBubble } from '../../services/bubble';
import Bubble from './Bubble';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { notificationService } from '../../services/notifications';
import { analyticsService } from '../../services/analytics';
import useSos from '../../hooks/useSos';

const MainApp = ({ userId, onLogout, joinToken: initialJoinToken, bubbleCreationData, onBubbleCreated, isSubscribed, onUpgrade, onInitiateCreate, onInitiateJoin, onJoinProcessed, sosLink = null }) => {
  const [bubbleData, setBubbleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStatus, setShowStatus] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [manualInviteCode, setManualInviteCode] = useState('');
  const [joiningManual, setJoiningManual] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const unsubscribeRef = useRef(null);
  const currentBubbleIdRef = useRef(null);
  const previousMembersRef = useRef(new Map()); // Track previous member states for notifications
  const joinAttemptedRef = useRef(null);
  const sos = useSos({ userId, bubbleData, initialSosLink: sosLink });

  const setupRealtimeListener = React.useCallback((bubbleId, memberId) => {
    // Clean up previous listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Listen to nodes in real-time
    const nodesRef = collection(db, 'bubbles', bubbleId, 'nodes');
    unsubscribeRef.current = onSnapshot(nodesRef, async (snapshot) => {
      const allMembers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Get bubble info
      const bubbleRef = doc(db, 'bubbles', bubbleId);
      const bubbleDoc = await getDoc(bubbleRef);
      const bubble = bubbleDoc.exists() ? { id: bubbleDoc.id, ...bubbleDoc.data() } : null;

      if (!bubble) {
        console.error("Bubble not found:", bubbleId);
        return;
      }

      // Find current member - check both userId and id
      // memberId should be the authenticated userId
      const currentMember = allMembers.find(m => {
        // Match by userId (should be the authenticated user's ID)
        if (m.userId === memberId || m.userId === userId) {
          return true;
        }
        // Fallback: match by node id if somehow userId doesn't match
        if (m.id === memberId) {
          return true;
        }
        return false;
      });

      if (!currentMember && allMembers.length > 0) {
        console.warn("Current member not found, using first member. Looking for userId:", memberId, "Available members:", allMembers.map(m => ({ id: m.id, userId: m.userId, name: m.name })));
      }

      // Handle notifications for status updates and new members
      if (previousMembersRef.current.size > 0) {
        // Check for status updates from other members
        allMembers.forEach(member => {
          // Skip current user's own updates
          if (member.userId === memberId || member.userId === userId || member.id === currentMember?.id) {
            return;
          }

          const previousMember = previousMembersRef.current.get(member.id);
          
          if (previousMember) {
            // Member exists - check for status changes
            if (previousMember.status !== member.status || previousMember.statusText !== member.statusText) {
              // Status changed - show notification
              const previousStatus = previousMember.status;
              notificationService.notifyStatusUpdate(member, previousStatus);
            }
          } else {
            // New member joined
            notificationService.notifyNewMember(member);
          }
        });
      }

      // Update previous members map
      const newPreviousMembers = new Map();
      allMembers.forEach(member => {
        newPreviousMembers.set(member.id, {
          status: member.status,
          statusText: member.statusText,
          name: member.name,
          photoURL: member.photoURL
        });
      });
      previousMembersRef.current = newPreviousMembers;

      const bubbleDataToSet = {
        bubble,
        allMembers,
        currentMember: currentMember || allMembers[0], // Fallback to first member
      };

      setBubbleData(bubbleDataToSet);
      setLoading(false);
    }, { includeMetadataChanges: true });
  }, [userId]);

  const loadBubble = React.useCallback(async () => {
    const nodeUserId = userId || localStorage.getItem('familyBubble_nodeUserId');
    let data = null;
    let bubbleId = null;

    if (userId) {
      console.log("Loading bubble from user memberships for userId:", userId);
      data = await API.getUserBubble(userId);
      if (data?.bubble) {
        bubbleId = data.bubble.id;
        sessionBubble.set(userId, bubbleId);
        console.log("Found bubble from user document:", bubbleId);
      } else {
        sessionBubble.clear();
        console.log("No readable bubble in user document");
      }
    } else {
      const storedBubbleId = sessionBubble.get(null);
      if (storedBubbleId) {
        console.log("Loading bubble from localStorage:", storedBubbleId);
        data = await API.getBubbleById(storedBubbleId, nodeUserId);
        bubbleId = data?.bubble?.id || null;
      }
    }

    if (data && data.bubble) {
      setBubbleData(data);
      setLoading(false);
      currentBubbleIdRef.current = data.bubble.id;
      setupRealtimeListener(data.bubble.id, nodeUserId || userId);
    } else {
      setLoading(false);
      console.log("No bubble data available");
    }
  }, [userId, setupRealtimeListener]);

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  useEffect(() => {
    // If bubbleCreationData exists, it means the user just completed the create bubble flow
    if (bubbleCreationData && userId) {
      setLoading(true);
      const { bubbleName, firstName, lastName, imageFile, relationshipRole, location } = bubbleCreationData;
      console.log("Creating bubble for user:", userId, "with data:", { bubbleName, firstName, lastName, location });
      
      API.createBubble(userId, firstName, lastName, bubbleName, imageFile, relationshipRole, location)
        .then(async (result) => {
          console.log("Bubble created successfully:", result);
          onBubbleCreated(); // Clear the creation data from App.js
          
          if (result && result.bubbleId) {
            // Track bubble creation
            analyticsService.trackBubbleCreate(result.bubbleId, 1);
            // Store bubbleId for future reference
            sessionBubble.set(userId, result.bubbleId);
            currentBubbleIdRef.current = result.bubbleId;
            
            // Wait a moment for Firestore to propagate
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Load initial bubble data immediately
            try {
              const bubbleData = await API.getBubbleById(result.bubbleId, userId);
              console.log("Loaded bubble data:", bubbleData);
              
              if (bubbleData && bubbleData.bubble) {
                setBubbleData(bubbleData);
                setLoading(false);
                
                // Setup real-time listener
                setupRealtimeListener(result.bubbleId, userId);
              } else {
                console.error("Bubble data is invalid:", bubbleData);
                setLoading(false);
                // Retry loading after a delay
                setTimeout(() => loadBubble(), 1000);
              }
            } catch (loadError) {
              console.error("Error loading bubble after creation:", loadError);
              setLoading(false);
              // Retry loading
              setTimeout(() => loadBubble(), 1000);
            }
          } else {
            console.error("No bubbleId in result:", result);
            setLoading(false);
            loadBubble(); // Fallback to load bubble
          }
        })
        .catch(error => {
          console.error("Error creating bubble:", error);
          setLoading(false);
          alert(`Failed to create bubble: ${error.message}`);
          onBubbleCreated(); // Clear the creation data even on error
        });
    } else if (initialJoinToken && userId) {
      // Handle join bubble flow - user is now authenticated
      const inviteCode = typeof initialJoinToken === 'string'
        ? initialJoinToken
        : initialJoinToken.inviteToken;
      if (!inviteCode) {
        setLoading(true);
        loadBubble();
        return;
      }
      if (joinAttemptedRef.current === `${userId}:${inviteCode}`) {
        return;
      }
      joinAttemptedRef.current = `${userId}:${inviteCode}`;

      setLoading(true);
      const { firstName, lastName, imageFile, relationshipRole, location } = typeof initialJoinToken === 'string'
        ? {}
        : initialJoinToken;
      
      console.log("=== MAINAPP: Processing join bubble ===");
      console.log("userId:", userId);
      console.log("inviteCode:", inviteCode);
      console.log("location:", location);
      
      // FIRST: Ensure user document exists before joining
      const ensureUserDocument = async () => {
        console.log("Ensuring user document exists...");
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        let resolvedName = `${firstName || ''} ${lastName || ''}`.trim();

        if (!userDoc.exists()) {
          resolvedName = resolvedName || 'Family Member';
          await setDoc(userRef, {
            fullName: resolvedName,
            photoURL: null,
            createdAt: serverTimestamp(),
            premium: false,
            bubbles: [],
          });
        } else {
          const existingName = userDoc.data()?.fullName;
          if (!resolvedName && existingName) {
            resolvedName = existingName;
          }
        }

        return resolvedName || 'Family Member';
      };
      
      ensureUserDocument().then((userName) => {
        console.log("Calling API.joinBubble...");
        API.joinBubble(inviteCode, userName, imageFile, relationshipRole, userId, location)
        .then(async (result) => {
          console.log("Join bubble successful, result:", result);
          
          if (onJoinProcessed) {
            onJoinProcessed(); // Clear the join token from App.js
          }
          
          // Store bubbleId for future reference
          if (result && result.bubbleId) {
            // Track bubble join
            analyticsService.trackBubbleJoin(result.bubbleId, 'invite');
            sessionBubble.set(userId, result.bubbleId);
            currentBubbleIdRef.current = result.bubbleId;
            
            // Wait a moment for Firestore to propagate the changes
            console.log("Waiting for Firestore propagation...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Load initial bubble data immediately
            const maxRetries = 3;
            
            for (let retryCount = 0; retryCount < maxRetries; retryCount++) {
              try {
                console.log(`Loading bubble (attempt ${retryCount + 1}/${maxRetries})...`);
                const bubbleData = await API.getBubbleById(result.bubbleId, userId);
                console.log("Loaded bubble data:", bubbleData);
                
                if (bubbleData && bubbleData.bubble) {
                  // Verify the current member is in the bubble
                  if (bubbleData.currentMember) {
                    console.log("✓ Current member found in bubble:", bubbleData.currentMember.name);
                    setBubbleData(bubbleData);
                    setLoading(false);
                    
                    // Setup real-time listener for the joined bubble
                    setupRealtimeListener(result.bubbleId, userId);
                    return; // Success, exit retry loop
                  } else {
                    console.warn("Bubble loaded but current member not found. Retrying...");
                  }
                } else {
                  console.warn("Bubble data is invalid. Retrying...");
                }
              } catch (loadError) {
                console.error(`Error loading bubble (attempt ${retryCount + 1}):`, loadError);
              }
              
              if (retryCount < maxRetries - 1) {
                const delay = (retryCount + 1) * 500;
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
            
            // If all retries failed, try loading from user document
            console.log("All retries failed, trying to load from user document...");
            try {
              const userBubbleData = await API.getUserBubble(userId);
              if (userBubbleData && userBubbleData.bubble) {
                console.log("✓ Loaded bubble from user document:", userBubbleData.bubble.id);
                setBubbleData(userBubbleData);
                setLoading(false);
                setupRealtimeListener(userBubbleData.bubble.id, userId);
              } else {
                console.error("✗ Could not load bubble from user document either");
                setLoading(false);
                alert("Bubble joined successfully, but there was an issue loading it. Please refresh the page.");
              }
            } catch (userBubbleError) {
              console.error("Error loading from user document:", userBubbleError);
              setLoading(false);
              alert("Bubble joined successfully, but there was an issue loading it. Please refresh the page.");
            }
          } else {
            console.error("No bubbleId in result:", result);
            setLoading(false);
            loadBubble(); // Fallback to load bubble
          }
        })
        .catch(error => {
          console.error("Error joining bubble:", error);
          console.error("Error stack:", error.stack);
          joinAttemptedRef.current = null;
          setLoading(false);
          alert(`Failed to join bubble: ${error.message}`);
        });
      }).catch(error => {
        console.error("Error ensuring user document:", error);
        setLoading(false);
        alert(`Failed to ensure user document: ${error.message}`);
      });
    } else if (userId) {
      const pendingJoin = localStorage.getItem('familyBubble_pendingJoin');
      if (pendingJoin && !initialJoinToken) {
        setLoading(true);
        return;
      }
      setLoading(true);
      loadBubble();
    } else {
      setLoading(false);
    }
  }, [userId, bubbleCreationData, initialJoinToken, onBubbleCreated, onJoinProcessed, loadBubble, setupRealtimeListener]);

  // Get current location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.warn('Location access denied or failed:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  // Update location in Firestore
  const updateLocation = async () => {
    if (!bubbleData || !bubbleData.bubble || !bubbleData.currentMember || !bubbleData.currentMember.id) {
      return;
    }

    try {
      const location = await getCurrentLocation();
      await API.updateLocation(
        bubbleData.bubble.id,
        bubbleData.currentMember.id,
        location
      );
      console.log('Location updated successfully');
    } catch (error) {
      // Silently fail - location is optional
      console.log('Location update skipped:', error.message);
    }
  };

  // Location tracking: Update location when bubble loads and periodically.
  // Live GPS watch for SOS is owned by useSos and only runs while SOS is open.
  useEffect(() => {
    if (!bubbleData || !bubbleData.bubble || !bubbleData.currentMember) {
      return;
    }
    if (sos.sosActive) {
      return;
    }

    updateLocation();

    const locationInterval = setInterval(() => {
      updateLocation();
    }, 15 * 60 * 1000);

    return () => {
      clearInterval(locationInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bubbleData?.bubble?.id, bubbleData?.currentMember?.id, sos.sosActive]);

  const joinWithInviteCode = async (rawCode) => {
    const inviteCode = (rawCode || '').trim().toUpperCase();
    if (!inviteCode || !userId) return;

    setJoiningManual(true);
    setLoading(true);
    try {
      localStorage.setItem('familyBubble_pendingJoin', inviteCode);
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const userName = userDoc.exists() ? (userDoc.data()?.fullName || 'Family Member') : 'Family Member';
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          fullName: userName,
          photoURL: null,
          createdAt: serverTimestamp(),
          premium: false,
          bubbles: [],
        });
      }
      const result = await API.joinBubble(inviteCode, userName, null, 'Family Member', userId);
      if (result?.bubbleId) {
        analyticsService.trackBubbleJoin(result.bubbleId, 'invite');
        sessionBubble.set(userId, result.bubbleId);
        localStorage.removeItem('familyBubble_pendingJoin');
        currentBubbleIdRef.current = result.bubbleId;
        if (onJoinProcessed) onJoinProcessed();
        const data = await API.getBubbleById(result.bubbleId, userId);
        if (data?.bubble) {
          setBubbleData(data);
          setupRealtimeListener(result.bubbleId, userId);
        }
      }
    } catch (error) {
      console.error("Error joining bubble:", error);
      alert(`Failed to join bubble: ${error.message}`);
    } finally {
      setJoiningManual(false);
      setLoading(false);
    }
  };

  const handleStatusChange = async (status, location = null, statusText = null) => {
    if (!bubbleData || !bubbleData.bubble || !bubbleData.currentMember || !bubbleData.currentMember.id) {
      console.error("Cannot update status: missing bubble or member data");
      return;
    }
    
    // Update status immediately (don't wait for location)
    const statusPromise = API.updateStatus(bubbleData.bubble.id, bubbleData.currentMember.id, status, statusText);
    
    // Update location in parallel if provided
    const locationPromise = location 
      ? API.updateLocation(bubbleData.bubble.id, bubbleData.currentMember.id, location).catch(err => {
          console.log('Location update failed:', err.message);
        })
      : Promise.resolve();
    
    // Wait for both, but don't block on location
    await Promise.all([statusPromise, locationPromise]);
    
    // Track status update
    analyticsService.trackStatusUpdate(
      bubbleData.bubble.id,
      status,
      location !== null,
      statusText !== null && statusText !== ''
    );
    
    // Track location update if provided
    if (location) {
      analyticsService.trackLocationUpdate(bubbleData.bubble.id);
    }
    
    // Don't reload entire bubble - the realtime listener will update automatically
    // loadBubble(); // Removed - causes unnecessary delay
  };

  const handlePhotoUpdate = async (imageFile) => {
    if (!bubbleData || !bubbleData.bubble || !bubbleData.currentMember || !bubbleData.currentMember.id) {
      console.error("Cannot update photo: missing bubble or member data");
      return;
    }
    if (!imageFile) {
      console.error("No image file provided");
      return;
    }
    try {
      await API.updatePhoto(
        bubbleData.bubble.id,
        bubbleData.currentMember.id,
        userId,
        imageFile
      );
      // Track photo update
      analyticsService.trackPhotoUpdate(bubbleData.bubble.id);
      // Reload bubble data to reflect the new photo
      loadBubble();
      return { success: true };
    } catch (error) {
      console.error("Error updating photo:", error);
      throw error;
    }
  };

  const handleProfileUpdate = async (profileData) => {
    if (!bubbleData || !bubbleData.bubble || !bubbleData.currentMember || !bubbleData.currentMember.id) {
      console.error("Cannot update profile: missing bubble or member data");
      return;
    }
    try {
      await API.updateProfile(
        bubbleData.bubble.id,
        bubbleData.currentMember.id,
        profileData
      );
      // Track profile update
      const fieldsUpdated = Object.keys(profileData);
      analyticsService.trackProfileUpdate(bubbleData.bubble.id, fieldsUpdated);
      // Reload bubble data to reflect the changes
      loadBubble();
      return { success: true };
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const handleGenerateInvite = async () => {
    if (!bubbleData || !bubbleData.bubble || !bubbleData.bubble.id) {
      console.error("Cannot generate invite: bubbleData or bubbleId is missing.", { bubbleData });
      return;
    }
    if (!bubbleData.currentMember || !bubbleData.currentMember.id) {
      console.error("Cannot generate invite: currentMember or nodeId is missing.", { bubbleData });
      return;
    }
    
    // Prevent multiple clicks
    if (isGeneratingInvite) return;
    
    setIsGeneratingInvite(true);
    
    // Optimistic UI: Open modal immediately with loading state
    setShowInvite(true);
    setInviteToken('Generating...');
    
    // Generate token in background
    try {
      const { token } = await API.generateReferral(bubbleData.bubble.id, bubbleData.currentMember.id);
      setInviteToken(token);
      // Track invite generation
      analyticsService.trackInviteGenerate(bubbleData.bubble.id);
    } catch (error) {
      console.error("Error generating invite:", error);
      setShowInvite(false);
      setInviteToken('');
      alert("Failed to generate invite code. Please try again.");
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center" style={{ minHeight: '100dvh' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your bubble...</p>
        </div>
      </div>
    );
  }

  if (!bubbleData) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center overflow-hidden p-4" style={{ height: '100dvh', minHeight: '-webkit-fill-available' }}>
        <div className="text-center max-w-sm w-full">
          <p className="text-gray-400 mb-4">No bubble found. Paste an invite code to join one.</p>
          <input
            type="text"
            placeholder="BUBXXXXXXXX"
            value={manualInviteCode}
            onChange={(e) => setManualInviteCode(e.target.value.toUpperCase())}
            autoCapitalize="characters"
            className="w-full text-center font-mono tracking-widest px-4 py-3 mb-3 bg-gray-900 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500"
          />
          <button
            onClick={() => joinWithInviteCode(manualInviteCode)}
            disabled={joiningManual || manualInviteCode.trim().length < 3}
            className="w-full px-4 py-3 mb-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 tap-target"
          >
            {joiningManual ? 'Joining…' : 'Join bubble'}
          </button>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => onInitiateCreate ? onInitiateCreate() : loadBubble()}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 tap-target"
            >
              Create a bubble
            </button>
            <button
              onClick={() => loadBubble()}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 tap-target"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Bubble
      bubbleData={bubbleData}
      showStatus={showStatus}
      setShowStatus={setShowStatus}
      showInvite={showInvite}
      setShowInvite={setShowInvite}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      inviteToken={inviteToken}
      handleStatusChange={handleStatusChange}
      handleGenerateInvite={handleGenerateInvite}
      isGeneratingInvite={isGeneratingInvite}
      handlePhotoUpdate={handlePhotoUpdate}
      handleProfileUpdate={handleProfileUpdate}
      onLogout={onLogout}
      sos={sos}
    />
  );
};

export default MainApp;
