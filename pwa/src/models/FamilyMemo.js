/**
 * Family memo stored at /bubbles/{bubbleId}/memos/{memoId}
 * Status updates, SOS events, and check-ins are written here for the bubble board.
 */
class FamilyMemo {
  constructor({
    memoId,
    bubbleId,
    userId,
    nodeId,
    type,
    status,
    message = null,
    location = null,
    sosId = null,
    photoUrl = null,
    voiceUrl = null,
    voiceDurationMs = null,
    placeId = null,
    placeEventType = null,
    recipientUserIds = null,
    reactions = null,
    createdAt = null,
  }) {
    this.memoId = memoId;
    this.bubbleId = bubbleId;
    this.userId = userId;
    this.nodeId = nodeId;
    this.type = type;
    this.status = status;
    this.message = message;
    this.location = location;
    this.sosId = sosId;
    this.photoUrl = photoUrl;
    this.voiceUrl = voiceUrl;
    this.voiceDurationMs = voiceDurationMs;
    this.placeId = placeId;
    this.placeEventType = placeEventType;
    this.recipientUserIds = recipientUserIds;
    this.reactions = reactions && typeof reactions === 'object' ? reactions : {};
    this.createdAt = createdAt;
  }

  static fromFirestore(docSnap) {
    const data = docSnap.data() || {};
    return new FamilyMemo({
      memoId: docSnap.id,
      bubbleId: data.bubbleId,
      userId: data.userId,
      nodeId: data.nodeId,
      type: data.type,
      status: data.status,
      message: data.message || null,
      location: data.location || null,
      sosId: data.sosId || null,
      photoUrl: data.photoUrl || null,
      voiceUrl: data.voiceUrl || null,
      voiceDurationMs: data.voiceDurationMs ?? null,
      placeId: data.placeId || null,
      placeEventType: data.placeEventType || null,
      recipientUserIds: Array.isArray(data.recipientUserIds) ? data.recipientUserIds : null,
      reactions: data.reactions && typeof data.reactions === 'object' ? data.reactions : {},
      createdAt: data.createdAt || null,
    });
  }
}

export default FamilyMemo;
