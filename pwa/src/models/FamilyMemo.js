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
    placeId = null,
    placeEventType = null,
    recipientUserIds = null,
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
    this.placeId = placeId;
    this.placeEventType = placeEventType;
    this.recipientUserIds = recipientUserIds;
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
      placeId: data.placeId || null,
      placeEventType: data.placeEventType || null,
      recipientUserIds: Array.isArray(data.recipientUserIds) ? data.recipientUserIds : null,
      createdAt: data.createdAt || null,
    });
  }
}

export default FamilyMemo;
