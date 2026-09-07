import { db } from '../firebase';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  getDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  collectionGroup,
} from 'firebase/firestore';
import Bubble from '../models/Bubble';
import BubbleNode from '../models/BubbleNode';
import BubbleEdge from '../models/BubbleEdge';
import User from '../models/User';

// ============================================================================
// REAL BACKEND - FIREBASE
// ============================================================================
// 
// 🧠 THE CORE PHILOSOPHY: Graph-Based Family Galaxy System
//
// A Bubble = a family universe created by a bubble owner (the sun)
// A Node = a person inside a bubble (can be owner or participant)
// An Edge = a relationship link that connects two nodes
//
// Every action is either:
// 1. CREATING a bubble (becoming the sun, tier 1, owner)
// 2. JOINING a bubble via edges (becoming a planet, tier 2+, participant)
//
// Multi-Universe: Users can own multiple bubbles and join multiple bubbles
// Each node represents the user's identity in that specific bubble universe
// Tier system: Tier 1 = owner, Tier 2 = immediate family, Tier 3+ = extended
// ============================================================================

// Firebase Storage is not enabled on this project (bucket 404 / CORS preflight
// fails). Keep photos in Firestore as compressed JPEG data URLs instead.
const MAX_PHOTO_DIMENSION = 384;
const MAX_PHOTO_DATA_URL_CHARS = 350000;

const fileToCompressedDataUrl = async (imageFile) => {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
    throw new Error('Photo compression is only available in the browser.');
  }

  const bitmap = await createImageBitmap(imageFile);
  try {
    const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Could not prepare photo.');
    }
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.74;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > MAX_PHOTO_DATA_URL_CHARS && quality > 0.35) {
      quality = Math.max(0.35, quality - 0.1);
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    if (dataUrl.length > MAX_PHOTO_DATA_URL_CHARS) {
      throw new Error('Photo is too large after compression. Try a smaller image.');
    }
    return dataUrl;
  } finally {
    if (typeof bitmap.close === 'function') {
      bitmap.close();
    }
  }
};

const uploadImage = async (imageFile, userId) => {
  if (!imageFile) return null;
  if (!userId) {
    console.warn("No userId provided for image upload, skipping");
    return null;
  }

  try {
    const dataUrl = await fileToCompressedDataUrl(imageFile);
    console.log("Photo prepared for Firestore, length:", dataUrl.length);
    return dataUrl;
  } catch (error) {
    console.error("Error preparing photo:", error);
    console.error("Error code:", error.code, "Error message:", error.message);
    return null;
  }
};

export const API = {
  createBubble: async (
    userId,
    firstName,
    lastName,
    bubbleName,
    imageFile,
    relationshipRole,
    location = null
  ) => {
    console.log("Creating bubble for user:", userId);
    
    // Create/update user document FIRST (before batch to ensure it exists)
    const userRef = doc(db, 'users', userId);
    const existingUserDoc = await getDoc(userRef);
    
    let uploadedPhotoUrl = null;
    
    // Create user document if it doesn't exist
    if (!existingUserDoc.exists()) {
      console.log("Creating new user document for:", userId);
      try {
        const user = new User(
          userId,
          `${firstName} ${lastName}`,
          uploadedPhotoUrl || null,
          serverTimestamp(),
          true, // User has just completed the signup/purchase flow
          []
        );
        await setDoc(userRef, user.toFirestore());
        console.log("User document created successfully");
        
        // Verify it was created
        const verifyDoc = await getDoc(userRef);
        if (!verifyDoc.exists()) {
          throw new Error("Failed to create user document - document does not exist after creation");
        }
        console.log("User document verified:", verifyDoc.id);
      } catch (userError) {
        console.error("Error creating user document:", userError);
        throw new Error(`Failed to create user document: ${userError.message}`);
      }
    } else {
      console.log("User document already exists for:", userId);
      // Update with latest info
      const existingUser = User.fromFirestore(existingUserDoc);
      if (uploadedPhotoUrl && uploadedPhotoUrl !== existingUser.photoURL) {
        existingUser.photoURL = uploadedPhotoUrl;
        existingUser.fullName = `${firstName} ${lastName}`;
        await updateDoc(userRef, {
          photoURL: existingUser.photoURL,
          fullName: existingUser.fullName,
        });
      }
    }

    // Create the bubble, then membership, then the owner node.
    // These cannot share one batch: rules evaluate get()/exists() against
    // the pre-commit state, so the first node would be denied.
    const bubbleRef = doc(collection(db, 'bubbles'));
    const bubble = new Bubble(
      bubbleRef.id,
      userId,
      bubbleName || `${firstName}'s Bubble`,
      serverTimestamp(),
      50, // maxMembers - default
      null, // inviteCode - will be generated later if needed
      'private', // visibility
      [userId] // members - Add owner to members list
    );

    // 2. Create the Node document for the owner in the subcollection
    // Owner is tier 1, center of the universe, root node
    const nodeRef = doc(collection(db, 'bubbles', bubbleRef.id, 'nodes'));
    
    // Prepare location data with timestamp if provided
    let locationData = null;
    if (location) {
      locationData = {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: serverTimestamp(),
        accuracy: location.accuracy || null,
        address: location.address || null, // Store address if provided
      };
    }
    
    const node = new BubbleNode(
      nodeRef.id,
      userId,
      bubbleRef.id,
      relationshipRole || 'Owner',
      'Safe',
      null, // quote
      1, // tier - Owner is always tier 1 - the sun
      'owner',
      serverTimestamp(),
      serverTimestamp(),
      uploadedPhotoUrl,
      `${firstName} ${lastName}`,
      locationData
    );

    console.log("Creating bubble - bubbleId:", bubbleRef.id, "userId:", userId);
    try {
      await setDoc(bubbleRef, bubble.toFirestore());
      console.log("Bubble document created:", bubbleRef.id);

      await setDoc(userRef, {
        bubbles: arrayUnion(bubbleRef.id)
      }, { merge: true });
      console.log("User membership updated for bubble:", bubbleRef.id);

      await setDoc(nodeRef, node.toFirestore());
      console.log("Owner node created:", nodeRef.id);
      
      // Verify bubble was created
      const verifyBubbleDoc = await getDoc(bubbleRef);
      if (!verifyBubbleDoc.exists()) {
        throw new Error("Bubble was not created - document does not exist after commit");
      }
      console.log("Bubble verified:", verifyBubbleDoc.id);
      
      // Verify node was created
      const verifyNodeDoc = await getDoc(nodeRef);
      if (!verifyNodeDoc.exists()) {
        throw new Error("Node was not created - document does not exist after commit");
      }
      console.log("Node verified:", verifyNodeDoc.id);

      if (imageFile) {
        try {
          uploadedPhotoUrl = await uploadImage(imageFile, userId);
          if (uploadedPhotoUrl) {
            await setDoc(userRef, { photoURL: uploadedPhotoUrl }, { merge: true });
            await setDoc(nodeRef, { photoUrl: uploadedPhotoUrl }, { merge: true });
            console.log("Photo attached after bubble create");
          }
        } catch (photoError) {
          console.error("Photo upload after create failed; bubble is already saved:", photoError);
        }
      }
      
      return { bubbleId: bubbleRef.id, nodeId: nodeRef.id };
    } catch (batchError) {
      console.error("Error creating bubble:", batchError);
      throw new Error(`Failed to create bubble: ${batchError.message}`);
    }
  },

  getUserBubble: async (userId) => {
    // Get the user's primary bubble (first one they own or joined)
    // Multi-universe: A user can own multiple bubbles and join multiple bubbles
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log("User document does not exist for:", userId);
      return null; // User doesn't exist yet
    }
    
    const user = User.fromFirestore(userDoc);
    if (!user.bubbles || user.bubbles.length === 0) {
      console.log("User has no bubbles yet:", userId);
      return null; // No bubbles for this user
    }
    
    // For now, return the first bubble (can be enhanced to show bubble selector)
    // In multi-universe mode, user can switch between their bubbles
    const bubbleId = user.bubbles[0];
    console.log("Loading bubble for user:", userId, "bubbleId:", bubbleId);

    return API.getBubbleById(bubbleId, userId);
  },

  getUserBubbles: async (userId) => {
    // Multi-universe support: Get all bubbles a user is part of
    // Returns both owned bubbles (where user is tier 1/owner) and joined bubbles
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      return []; // No user document
    }
    
    const user = User.fromFirestore(userDoc);
    if (!user.bubbles || user.bubbles.length === 0) {
      return []; // No bubbles for this user
    }
    
    const bubbleIds = user.bubbles;
    const bubbles = await Promise.all(
      bubbleIds.map(async (bubbleId) => {
        const bubbleData = await API.getBubbleById(bubbleId, userId);
        if (bubbleData) {
          // Determine if user is owner or participant
          const isOwner = bubbleData.currentMember?.type === 'owner' || bubbleData.currentMember?.tier === 1;
          return {
            ...bubbleData,
            isOwner,
            bubbleId: bubbleId,
          };
        }
        return null;
      })
    );
    
    return bubbles.filter(b => b !== null);
  },

  getBubbleById: async (bubbleId, memberId = null) => {
    if (!bubbleId) {
      console.error("getBubbleById called without bubbleId");
      return null;
    }

    // Get the bubble document
    const bubbleRef = doc(db, 'bubbles', bubbleId);
    const bubbleDoc = await getDoc(bubbleRef);
    
    if (!bubbleDoc.exists()) {
      console.error("Bubble document does not exist:", bubbleId);
      return null;
    }
    
    const bubble = Bubble.fromFirestore(bubbleDoc);
    console.log("Found bubble:", bubble.bubbleId, "name:", bubble.name);

    // Get all nodes for that bubble
    const nodesRef = collection(db, 'bubbles', bubbleId, 'nodes');
    const nodesSnapshot = await getDocs(nodesRef);
    const allMembers = nodesSnapshot.docs.map(d => {
      const node = BubbleNode.fromFirestore(d);
      return { id: node.nodeId, ...node };
    });
    
    console.log("Found", allMembers.length, "members in bubble");

    // Find the current member if memberId provided
    let currentMember = null;
    if (memberId) {
      // First try to match by userId (most reliable)
      currentMember = allMembers.find(m => m.userId === memberId);
      
      // If not found, try matching by node id
      if (!currentMember) {
        currentMember = allMembers.find(m => m.id === memberId);
      }
      
      if (currentMember) {
        console.log("Found current member:", currentMember.name, "userId:", currentMember.userId);
      } else {
        console.warn("Current member not found. Looking for userId:", memberId, "Available members:", allMembers.map(m => ({ id: m.id, userId: m.userId, name: m.name })));
      }
    }

    // Fallback to first member if current member not found
    if (!currentMember && allMembers.length > 0) {
      currentMember = allMembers[0];
      console.log("Using first member as fallback:", currentMember.name);
    }

    return {
      bubble: { id: bubble.bubbleId, ...bubble },
      allMembers,
      currentMember: currentMember || null,
    };
  },
  
  generateReferral: async (bubbleId, fromNodeId) => {
    // Optimize: Generate token first (fast operation)
    const token = `BUB${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    
    // Get the referrer's node to determine their tier (can be done in parallel with edge creation)
    const fromNodeRef = doc(db, 'bubbles', bubbleId, 'nodes', fromNodeId);
    const fromNodeDocPromise = getDoc(fromNodeRef);
    
    // Start edge creation immediately (don't wait for node fetch)
    const edgesRef = collection(db, 'bubbles', bubbleId, 'edges');
    
    // Get node data (we need tier)
    const fromNodeDoc = await fromNodeDocPromise;
    
    if (!fromNodeDoc.exists()) {
      throw new Error('Referrer node not found.');
    }
    
    const fromNode = BubbleNode.fromFirestore(fromNodeDoc);
    const referrerTier = fromNode.tier || 1; // Default to tier 1 if not set
    const newMemberTier = referrerTier + 1; // New member will be one tier deeper
    
    // Create edge with token
    const edge = new BubbleEdge(
      null, // edgeId will be set by Firestore
      fromNodeId,
      null, // toNode - will be set when accepted
      null, // relationship - can be set later
      token,
      false, // accepted
      newMemberTier,
      serverTimestamp(),
      null // acceptedAt
    );
    const edgeRef = await addDoc(edgesRef, edge.toFirestore());
    return { token, edgeId: edgeRef.id, tier: newMemberTier };
  },

  joinBubble: async (token, userName, userPhotoFile, relationshipRole, userId = null, location = null) => {
    if (!userId) {
      throw new Error('User must be authenticated to join a bubble.');
    }

    console.log("=== JOIN BUBBLE START ===");
    console.log("userId:", userId);
    console.log("userName:", userName);
    console.log("token:", token);
    console.log("relationshipRole:", relationshipRole);

    // ============================================================================
    // STEP 1: CREATE USER DOCUMENT IN FIRESTORE FIRST (CRITICAL!)
    // This MUST happen regardless of whether the join succeeds or fails
    // ============================================================================
    const userRef = doc(db, 'users', userId);
    let existingUserDoc = null;
    let uploadedPhotoUrl = null;
    
    try {
      existingUserDoc = await getDoc(userRef);
      console.log("Checked for existing user document:", existingUserDoc.exists());
    } catch (checkError) {
      console.error("Error checking for existing user:", checkError);
      throw new Error(`Failed to check user document: ${checkError.message}`);
    }

    // Do not upload photos before join. Storage CORS/billing failures would
    // block writing the user and bubble membership.
    
    if (!existingUserDoc || !existingUserDoc.exists()) {
      console.log("*** CREATING USER DOCUMENT IN FIRESTORE ***");
      console.log("Collection: users");
      console.log("Document ID:", userId);
      console.log("Full path: users/", userId);
      
      try {
        const user = new User(
          userId,
          userName,
          uploadedPhotoUrl || null,
          serverTimestamp(),
          false, // premium
          [] // bubbles
        );
        console.log("User data to create:", JSON.stringify(user.toFirestore(), null, 2));
        
        await setDoc(userRef, user.toFirestore());
        console.log("✓ setDoc() completed - User document should be created");
        
        // Wait a moment for Firestore to propagate
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify it was created
        const verifyDoc = await getDoc(userRef);
        if (!verifyDoc.exists()) {
          console.error("✗ VERIFICATION FAILED: User document does not exist after creation!");
          console.error("Attempted path: users/", userId);
          throw new Error("Failed to create user document - document does not exist after creation");
        }
        console.log("✓ User document verified in Firestore");
        console.log("✓ Document ID:", verifyDoc.id);
        console.log("✓ Document data:", JSON.stringify(verifyDoc.data(), null, 2));
      } catch (userError) {
        console.error("✗ ERROR creating user document:", userError);
        console.error("Error code:", userError.code);
        console.error("Error message:", userError.message);
        console.error("Error stack:", userError.stack);
        // Don't throw here - we want to continue and see if the rest works
        // But log it prominently
        console.error("⚠️⚠️⚠️ USER DOCUMENT CREATION FAILED - THIS IS A CRITICAL ERROR ⚠️⚠️⚠️");
      }
    } else {
      console.log("User document already exists in Firestore");
      const existingUser = User.fromFirestore(existingUserDoc);
      console.log("Existing user data:", JSON.stringify(existingUser, null, 2));
      
      if (uploadedPhotoUrl && uploadedPhotoUrl !== existingUser.photoURL) {
        try {
          existingUser.photoURL = uploadedPhotoUrl;
          await updateDoc(userRef, { photoURL: existingUser.photoURL });
          console.log("Updated user photo URL");
        } catch (updateError) {
          console.error("Error updating user photo:", updateError);
        }
      } else if (existingUser.photoURL) {
        uploadedPhotoUrl = existingUser.photoURL;
        console.log("Using existing photo URL:", uploadedPhotoUrl);
      }
    }

    // ============================================================================
    // STEP 2: Now proceed with bubble join logic
    // ============================================================================
    console.log("=== STEP 2: Finding edge with token ===");
    
    let q;
    let querySnapshot;
    try {
      q = query(
        collectionGroup(db, 'edges'),
        where('referralToken', '==', token),
        where('accepted', '==', false)
      );
      querySnapshot = await getDocs(q);
      console.log("Query executed, found", querySnapshot.size, "edges");
    } catch (queryError) {
      console.error("Error querying edges:", queryError);
      try {
        q = query(collectionGroup(db, 'edges'), where('referralToken', '==', token));
        querySnapshot = await getDocs(q);
        console.log("Fallback token query found", querySnapshot.size, "edges");
      } catch (fallbackError) {
        if (queryError.message && queryError.message.includes('COLLECTION_GROUP')) {
          throw new Error(
            `Firestore index required. Please create the index by clicking this link:\n` +
            `https://console.firebase.google.com/v1/r/project/familybubble-ecfa6/firestore/indexes?create_exemption=Cltwcm9qZWN0cy9mYW1pbHlidWJibGUtZWNmYTYvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2VkZ2VzL2ZpZWxkcy9yZWZlcnJhbFRva2VuEAIaEQoNcmVmZXJyYWxUb2tlbhAB\n\n` +
            `After creating the index, wait 1-2 minutes for it to build, then try again.`
          );
        }
        throw new Error(`Failed to find invite code: ${fallbackError.message}`);
      }
    }

    if (querySnapshot.empty) {
      console.error("No edge found with token:", token);
      throw new Error('Invalid or expired invite code.');
    }

    const edgeDoc = querySnapshot.docs[0];
    const edge = BubbleEdge.fromFirestore(edgeDoc);
    console.log("Found edge:", edge.edgeId, "Data:", edge);
    
    if (edge.accepted) {
      console.error("Edge already accepted");
      throw new Error('This invite code has already been used.');
    }

    const bubbleId = edgeDoc.ref.parent.parent.id;
    console.log("Extracted bubbleId:", bubbleId);
    
    if (!bubbleId) {
      throw new Error('Could not determine bubble ID from invite code.');
    }

    const fromNodeId = edge.fromNode;
    console.log("From node ID:", fromNodeId);
    
    const fromNodeRef = doc(db, 'bubbles', bubbleId, 'nodes', fromNodeId);
    const fromNodeDoc = await getDoc(fromNodeRef);
    
    if (!fromNodeDoc.exists()) {
      console.error("Referrer node not found:", fromNodeId);
      throw new Error('Referrer node not found. The invite may be invalid.');
    }
    
    const fromNode = BubbleNode.fromFirestore(fromNodeDoc);
    const referrerTier = fromNode.tier || 1;
    const newMemberTier = edge.tier || (referrerTier + 1);
    console.log("Referrer tier:", referrerTier, "New member tier:", newMemberTier);
    
    const bubbleRef = doc(db, 'bubbles', bubbleId);
    const bubbleDoc = await getDoc(bubbleRef);
    
    if (!bubbleDoc.exists()) {
      console.error("Bubble not found:", bubbleId);
      throw new Error('Bubble not found. The invite code may be invalid.');
    }

    console.log("Found bubble:", bubbleId, "for user:", userId);

    // Create a new node for the user in the bubble
    const nodeRef = doc(collection(db, 'bubbles', bubbleId, 'nodes'));
    
    // Prepare location data with timestamp if provided
    let locationData = null;
    if (location) {
      locationData = {
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: serverTimestamp(),
        accuracy: location.accuracy || null,
        address: location.address || null,
      };
    }
    
    const node = new BubbleNode(
      nodeRef.id,
      userId,
      bubbleId,
      relationshipRole || 'Family Member',
      'Safe',
      null, // quote
      newMemberTier,
      'participant',
      serverTimestamp(),
      serverTimestamp(),
      uploadedPhotoUrl,
      userName,
      locationData
    );

    // Record membership first so node create passes member checks.
    try {
      await updateDoc(userRef, {
        bubbles: arrayUnion(bubbleId),
      });
      console.log("User membership updated for join:", bubbleId);
    } catch (membershipError) {
      console.error("Error updating user bubbles before join:", membershipError);
      throw new Error(`Failed to join bubble: ${membershipError.message}`);
    }

    const batch = writeBatch(db);
    batch.set(nodeRef, node.toFirestore());

    // Update the edge to accept the invite and link the nodes
    batch.update(edgeDoc.ref, {
        toNode: nodeRef.id,
        accepted: true,
        acceptedAt: serverTimestamp(),
        tier: newMemberTier,
    });

    // Add the userId to the bubble's members list
    batch.update(bubbleRef, {
        members: arrayUnion(userId),
    });

    console.log("Committing batch for join bubble - bubbleId:", bubbleId, "userId:", userId);
    console.log("Batch operations:");
    console.log("  1. Create node:", nodeRef.id);
    console.log("  2. Update edge:", edgeDoc.id);
    console.log("  3. Update bubble members:", bubbleId);
    
    try {
      await batch.commit();
      console.log("✓ Batch committed successfully");
      
      // Wait a moment for Firestore to propagate
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify user document still exists and has bubble
      const verifyUserDoc = await getDoc(userRef);
      if (!verifyUserDoc.exists()) {
        console.error("✗ ERROR: User document does not exist after batch commit!");
        throw new Error("User document was deleted or not created properly");
      }
      
      const userData = verifyUserDoc.data();
      const userBubbles = userData.bubbles || [];
      const hasBubble = userBubbles.includes(bubbleId);
      
      console.log("✓ User document verified after batch:");
      console.log("  - Document ID:", verifyUserDoc.id);
      console.log("  - Full Name:", userData.fullName);
      console.log("  - Bubbles array:", userBubbles);
      console.log("  - Bubbles array length:", userBubbles.length);
      console.log("  - Target bubbleId:", bubbleId);
      console.log("  - Has bubble in array:", hasBubble);
      
      if (!hasBubble) {
        console.error("✗ CRITICAL: Bubble was NOT added to user's bubbles array!");
        console.error("  Expected bubbleId:", bubbleId);
        console.error("  Actual bubbles array:", userBubbles);
        // FIX: Manually add the bubble to the user's array
        console.log("🔧 FIXING: Manually adding bubble to user's bubbles array...");
        try {
          await updateDoc(userRef, {
            bubbles: arrayUnion(bubbleId)
          });
          console.log("✓ Manually added bubble to user's bubbles array");
          
          // Verify again
          await new Promise(resolve => setTimeout(resolve, 200));
          const verifyAgain = await getDoc(userRef);
          const verifyData = verifyAgain.data();
          const verifyBubbles = verifyData.bubbles || [];
          console.log("✓ Verification - bubbles array now:", verifyBubbles);
          if (verifyBubbles.includes(bubbleId)) {
            console.log("✓ SUCCESS: Bubble is now in user's bubbles array");
          } else {
            console.error("✗ STILL FAILED: Bubble still not in array after manual fix");
          }
        } catch (fixError) {
          console.error("✗ Error manually fixing bubbles array:", fixError);
        }
      } else {
        console.log("✓ Bubble successfully added to user's bubbles array");
      }
      
      // Also verify the node was created
      const verifyNodeDoc = await getDoc(nodeRef);
      if (!verifyNodeDoc.exists()) {
        console.error("✗ ERROR: Node document does not exist after batch commit!");
        throw new Error("Node document was not created properly");
      }
      console.log("✓ Node document verified:", verifyNodeDoc.id);
      
      // Verify bubble has the user in members
      const verifyBubbleDoc = await getDoc(bubbleRef);
      if (verifyBubbleDoc.exists()) {
        const bubbleData = verifyBubbleDoc.data();
        const bubbleMembers = bubbleData.members || [];
        const userInMembers = bubbleMembers.includes(userId);
        console.log("✓ Bubble members array:", bubbleMembers);
        console.log("✓ User in bubble members:", userInMembers);
        if (!userInMembers) {
          console.error("✗ WARNING: User not in bubble's members array!");
        }
      }

      if (userPhotoFile) {
        try {
          uploadedPhotoUrl = await uploadImage(userPhotoFile, userId);
          if (uploadedPhotoUrl) {
            await updateDoc(userRef, { photoURL: uploadedPhotoUrl });
            await updateDoc(nodeRef, { photoUrl: uploadedPhotoUrl });
            console.log("Photo attached after join");
          }
        } catch (photoError) {
          console.error("Photo upload after join failed; membership is already saved:", photoError);
        }
      }
      
      return { bubbleId, nodeId: nodeRef.id, nodeUserId: userId };
    } catch (batchError) {
      console.error("✗ Error committing batch:", batchError);
      console.error("Error code:", batchError.code);
      console.error("Error message:", batchError.message);
      console.error("Error stack:", batchError.stack);
      throw new Error(`Failed to join bubble: ${batchError.message}`);
    }
  },

  updateStatus: async (bubbleId, nodeId, status, statusText = null) => {
    const nodeRef = doc(db, 'bubbles', bubbleId, 'nodes', nodeId);
    const updateData = { status, lastUpdated: serverTimestamp() };
    if (statusText !== null) {
      updateData.statusText = statusText;
    }
    await updateDoc(nodeRef, updateData);
    return { success: true };
  },

  updatePhoto: async (bubbleId, nodeId, userId, imageFile) => {
    if (!imageFile) {
      throw new Error('No image file provided');
    }
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Upload the new photo
    let uploadedPhotoUrl = null;
    try {
      uploadedPhotoUrl = await uploadImage(imageFile, userId);
      if (!uploadedPhotoUrl) {
        throw new Error('Photo upload failed');
      }
      console.log("Photo uploaded successfully, length:", uploadedPhotoUrl.length);
    } catch (uploadError) {
      console.error("Photo upload failed:", uploadError);
      throw new Error(`Failed to upload photo: ${uploadError.message}`);
    }

    // Update both the node and user document
    const batch = writeBatch(db);
    
    // Update the node's photo
    const nodeRef = doc(db, 'bubbles', bubbleId, 'nodes', nodeId);
    batch.update(nodeRef, {
      photoUrl: uploadedPhotoUrl,
      lastUpdated: serverTimestamp(),
    });

    // Update the user's photo (global profile)
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
      photoURL: uploadedPhotoUrl,
    });

    await batch.commit();
    console.log("Photo updated successfully for node and user");
    return { success: true, photoUrl: uploadedPhotoUrl };
  },

  updateProfile: async (bubbleId, nodeId, profileData) => {
    if (!profileData || !profileData.name) {
      throw new Error('Name is required');
    }

    const nodeRef = doc(db, 'bubbles', bubbleId, 'nodes', nodeId);
    const nodeDoc = await getDoc(nodeRef);
    
    if (!nodeDoc.exists()) {
      throw new Error('Node not found');
    }

    const node = BubbleNode.fromFirestore(nodeDoc);
    
    // Update the node with new profile data
    await updateDoc(nodeRef, {
      name: profileData.name,
      role: profileData.role || node.role,
      quote: profileData.quote || null,
      lastUpdated: serverTimestamp(),
    });

    // Also update the user document's fullName if it's the current user's node
    if (node.userId) {
      const userRef = doc(db, 'users', node.userId);
      await updateDoc(userRef, {
        fullName: profileData.name,
      });
    }

    console.log("Profile updated successfully");
    return { success: true };
  },

  updateLocation: async (bubbleId, nodeId, location) => {
    if (!location || !location.latitude || !location.longitude) {
      throw new Error('Valid location data is required');
    }

    const nodeRef = doc(db, 'bubbles', bubbleId, 'nodes', nodeId);
    
    // Update location with timestamp
    const locationData = {
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: serverTimestamp(),
      accuracy: location.accuracy || null,
      address: location.address || null, // Store address if provided
    };

    await updateDoc(nodeRef, {
      lastKnownLocation: locationData,
      lastUpdated: serverTimestamp(),
    });

    console.log("Location updated successfully");
    return { success: true };
  },
  
  leaveBubble: async (bubbleId, nodeId, userId) => {
    const batch = writeBatch(db);

    // Remove the node
    const nodeRef = doc(db, 'bubbles', bubbleId, 'nodes', nodeId);
    batch.delete(nodeRef);

    // Remove the user from the bubble's members list
    const bubbleRef = doc(db, 'bubbles', bubbleId);
    batch.update(bubbleRef, {
        members: arrayRemove(userId),
    });

    // Remove the bubble from the user's bubbles list
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
        bubbles: arrayRemove(bubbleId),
    });
    
    await batch.commit();
    return { success: true };
  },

  // ============================================================================
  // TIER-BASED UTILITIES (For future expansion)
  // ============================================================================
  
  /**
   * Get visibility level based on tier
   * Tier 1: Full access (owner)
   * Tier 2: Full visibility, limited control
   * Tier 3: Limited visibility
   * Tier 4+: Preview only
   */
  getTierVisibility: (tier) => {
    if (tier === 1) return 'full'; // Owner - sees everything
    if (tier === 2) return 'full'; // Immediate family - sees all
    if (tier === 3) return 'limited'; // Extended family - filtered view
    return 'preview'; // Tier 4+ - preview only
  },

  /**
   * Check if a user can perform an action based on their tier
   */
  canPerformAction: (userTier, action) => {
    // Tier 1 (owner) can do everything
    if (userTier === 1) return true;
    
    // Tier 2 can invite and update status
    if (userTier === 2) {
      return ['invite', 'updateStatus', 'view'].includes(action);
    }
    
    // Tier 3+ can only view and update own status
    if (userTier === 3) {
      return ['updateStatus', 'view'].includes(action);
    }
    
    // Tier 4+ can only view
    return action === 'view';
  },
};