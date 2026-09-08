/**
 * SOS event stored at /bubbles/{bubbleId}/sosEvents/{sosId}
 * Nested under the bubble so membership rules apply from the path.
 */
class SosEvent {
  constructor({
    sosId,
    bubbleId,
    userId,
    nodeId,
    status,
    createdAt,
    acknowledgedAt = null,
    acknowledgedBy = null,
    resolvedAt = null,
    cancelledAt = null,
    latestLocation = null,
    delivered = false,
  }) {
    this.sosId = sosId;
    this.bubbleId = bubbleId;
    this.userId = userId;
    this.nodeId = nodeId;
    this.status = status;
    this.createdAt = createdAt;
    this.acknowledgedAt = acknowledgedAt;
    this.acknowledgedBy = acknowledgedBy;
    this.resolvedAt = resolvedAt;
    this.cancelledAt = cancelledAt;
    this.latestLocation = latestLocation;
    this.delivered = delivered;
  }

  toFirestore() {
    return {
      bubbleId: this.bubbleId,
      userId: this.userId,
      nodeId: this.nodeId,
      status: this.status,
      createdAt: this.createdAt,
      acknowledgedAt: this.acknowledgedAt,
      acknowledgedBy: this.acknowledgedBy,
      resolvedAt: this.resolvedAt,
      cancelledAt: this.cancelledAt,
      latestLocation: this.latestLocation,
      delivered: this.delivered === true,
    };
  }

  static fromFirestore(docSnap) {
    const data = docSnap.data() || {};
    return new SosEvent({
      sosId: docSnap.id,
      bubbleId: data.bubbleId,
      userId: data.userId,
      nodeId: data.nodeId,
      status: data.status,
      createdAt: data.createdAt,
      acknowledgedAt: data.acknowledgedAt || null,
      acknowledgedBy: data.acknowledgedBy || null,
      resolvedAt: data.resolvedAt || null,
      cancelledAt: data.cancelledAt || null,
      latestLocation: data.latestLocation || null,
      delivered: data.delivered === true,
    });
  }
}

export default SosEvent;
