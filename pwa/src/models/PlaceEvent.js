/**
 * A Place arrival, departure, check-in, or update.
 * Path: /bubbles/{bubbleId}/placeEvents/{eventId}
 */
class PlaceEvent {
  constructor({
    eventId,
    userId,
    placeId,
    familyBubbleId,
    eventType,
    source,
    idempotencyKey = null,
    timestamp = null,
    createdAt = null,
  }) {
    this.eventId = eventId;
    this.userId = userId;
    this.placeId = placeId;
    this.familyBubbleId = familyBubbleId;
    this.eventType = eventType;
    this.source = source;
    this.idempotencyKey = idempotencyKey;
    this.timestamp = timestamp;
    this.createdAt = createdAt;
  }

  static fromFirestore(docSnap) {
    const data = docSnap.data() || {};
    return new PlaceEvent({
      eventId: docSnap.id,
      userId: data.userId,
      placeId: data.placeId,
      familyBubbleId: data.familyBubbleId,
      eventType: data.eventType,
      source: data.source,
      idempotencyKey: data.idempotencyKey || docSnap.id,
      timestamp: data.timestamp || data.createdAt || null,
      createdAt: data.createdAt || null,
    });
  }
}

export default PlaceEvent;
