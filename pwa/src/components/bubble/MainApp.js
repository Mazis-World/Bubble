import React, { useState, useEffect, useRef } from 'react';
import { API } from '../../services/bubble';
import Bubble from './Bubble';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const MainApp = ({ userId, onLogout, joinToken: initialJoinToken, bubbleCreationData, onBubbleCreated, isSubscribed, onUpgrade, onInitiateCreate, onJoinProcessed }) => {
  const [bubbleData, setBubbleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStatus, setShowStatus] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const unsubscribeRef = useRef(null);
  const currentBubbleIdRef = useRef(null);

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
    // Support both authenticated users and anonymous users
    const nodeUserId = userId || localStorage.getItem('familyBubble_nodeUserId');
    const storedBubbleId = localStorage.getItem('familyBubble_bubbleId');
    
    let bubbleId = storedBubbleId;
    let data = null;

    // Try to load bubble data
    if (bubbleId) {
      console.log("Loading bubble from localStorage:", bubbleId);
      data = await API.getBubbleById(bubbleId, nodeUserId || userId);
    } else if (userId) {
      console.log("Loading bubble from user document for userId:", userId);
      data = await API.getUserBubble(userId);
      if (data) {
        bubbleId = data.bubble.id;
        localStorage.setItem('familyBubble_bubbleId', bubbleId);
        console.log("Found bubble from user document:", bubbleId);
      } else {
        console.log("No bubble found in user document - user may not have created/joined a bubble yet");
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
            // Store bubbleId for future reference
            localStorage.setItem('familyBubble_bubbleId', result.bubbleId);
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
      setLoading(true);
      const { inviteToken, firstName, lastName, imageFile, relationshipRole, location } = initialJoinToken;
      const userName = `${firstName} ${lastName}`.trim();
      
      console.log("=== MAINAPP: Processing join bubble ===");
      console.log("userId:", userId);
      console.log("userName:", userName);
      console.log("inviteToken:", inviteToken);
      console.log("location:", location);
      console.log("initialJoinToken:", initialJoinToken);
      
      // FIRST: Ensure user document exists before joining
      const ensureUserDocument = async () => {
        console.log("Ensuring user document exists...");
        try {
          const userRef = doc(db, 'users', userId);
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            console.log("✗ User document does not exist, creating it NOW...");
            console.log("  Collection: users");
            console.log("  Document ID:", userId);
            console.log("  Full path: users/", userId);
            
            await setDoc(userRef, {
              fullName: userName,
              photoURL: null,
              createdAt: serverTimestamp(),
              premium: false,
              bubbles: [],
            });
            
            // Verify it was created
            const verifyDoc = await getDoc(userRef);
            if (verifyDoc.exists()) {
              console.log("✓ User document created and verified in MainApp");
              console.log("✓ Document data:", verifyDoc.data());
            } else {
              console.error("✗ CRITICAL: User document creation failed - document does not exist after creation!");
            }
          } else {
            console.log("✓ User document already exists");
            console.log("  Document data:", userDoc.data());
          }
        } catch (userDocError) {
          console.error("✗ ERROR ensuring user document exists:", userDocError);
          console.error("  Error code:", userDocError.code);
          console.error("  Error message:", userDocError.message);
          // Continue anyway - joinBubble will try to create it
        }
      };
      
      // Call ensureUserDocument, then proceed with joinBubble
      ensureUserDocument().then(() => {
        console.log("Calling API.joinBubble...");
        API.joinBubble(inviteToken, userName, imageFile, relationshipRole, userId, location)
        .then(async (result) => {
          console.log("Join bubble successful, result:", result);
          
          if (onJoinProcessed) {
            onJoinProcessed(); // Clear the join token from App.js
          }
          
          // Store bubbleId for future reference
          if (result && result.bubbleId) {
            localStorage.setItem('familyBubble_bubbleId', result.bubbleId);
            currentBubbleIdRef.current = result.bubbleId;
            
            // Wait a moment for Firestore to propagate the changes
            console.log("Waiting for Firestore propagation...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Load initial bubble data immediately
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
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
              
              retryCount++;
              if (retryCount < maxRetries) {
                console.log(`Retrying in ${retryCount * 500}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryCount * 500));
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
          setLoading(false);
          alert(`Failed to join bubble: ${error.message}`);
          if (onJoinProcessed) {
            onJoinProcessed(); // Clear the join token even on error
          }
        });
      }).catch(error => {
        console.error("Error ensuring user document:", error);
        setLoading(false);
        alert(`Failed to ensure user document: ${error.message}`);
      });
    } else if (userId) {
      // Normal bubble loading if not creating a new one and user is authenticated
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

  // Location tracking: Update location when bubble loads and periodically
  useEffect(() => {
    if (!bubbleData || !bubbleData.bubble || !bubbleData.currentMember) {
      return;
    }

    // Update location immediately when bubble loads
    updateLocation();

    // Update location every 15 minutes
    const locationInterval = setInterval(() => {
      updateLocation();
    }, 15 * 60 * 1000); // 15 minutes

    return () => {
      clearInterval(locationInterval);
    };
  }, [bubbleData?.bubble?.id, bubbleData?.currentMember?.id]);

  const handleStatusChange = async (status, location = null, statusText = null) => {
    if (!bubbleData || !bubbleData.bubble || !bubbleData.currentMember || !bubbleData.currentMember.id) {
      console.error("Cannot update status: missing bubble or member data");
      return;
    }
    await API.updateStatus(bubbleData.bubble.id, bubbleData.currentMember.id, status, statusText);
    
    // Update location if provided, otherwise try to get current location
    if (location) {
      try {
        await API.updateLocation(bubbleData.bubble.id, bubbleData.currentMember.id, location);
        console.log('Location updated with status change');
      } catch (error) {
        console.log('Location update failed:', error.message);
      }
    } else {
      // Try to get current location
      updateLocation();
    }
    
    loadBubble();
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
    try {
      const { token } = await API.generateReferral(bubbleData.bubble.id, bubbleData.currentMember.id);
      setInviteToken(token);
      setShowInvite(true);
    } catch (error) {
      console.error("Error generating invite:", error);
      alert("Failed to generate invite code. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your bubble...</p>
        </div>
      </div>
    );
  }

  if (!bubbleData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No bubble found.</p>
          <button
            onClick={() => loadBubble()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
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
      handlePhotoUpdate={handlePhotoUpdate}
      handleProfileUpdate={handleProfileUpdate}
      onLogout={onLogout}
    />
  );
};

export default MainApp;
