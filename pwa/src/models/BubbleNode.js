/**
 * BUBBLE NODES Subcollection
 * Path: /bubbles/{bubbleId}/nodes/{nodeId}
 * A person inside a bubble (can be owner or participant).
 */
class BubbleNode {
    /**
     * @param {string} nodeId - Document Key
     * @param {string} userId - The userId of the person this node represents.
     * @param {string} bubbleId - Reference to parent bubble (multi-universe support).
     * @param {string} role - The person's role in the bubble (e.g., "Parent", "Child", "Sibling").
     * @param {string} status - Current status (e.g., "Safe", "At Risk", "Emergency").
     * @param {string} quote - Optional personal quote or message.
     * @param {number} tier - Tier level (1 = owner/sun, 2+ = participant/planet).
     * @param {string} type - "owner" or "participant".
     * @param {firebase.firestore.Timestamp} createdAt - Time the node was created.
     * @param {firebase.firestore.Timestamp} lastUpdated - Time the node was last updated.
     * @param {string} photoUrl - URL to the person's photo.
     * @param {string} name - The person's name.
     * @param {object} lastKnownLocation - Last known location {latitude, longitude, timestamp, accuracy}.
     * @param {string} statusText - Optional status message shown on the member profile card.
     */
    constructor(nodeId, userId, bubbleId, role, status, quote, tier, type, createdAt, lastUpdated, photoUrl, name, lastKnownLocation, statusText = null) {
        this.nodeId = nodeId;
        this.userId = userId;
        this.bubbleId = bubbleId;
        this.role = role;
        this.status = status;
        this.quote = quote;
        this.tier = tier;
        this.type = type;
        this.createdAt = createdAt;
        this.lastUpdated = lastUpdated;
        this.photoUrl = photoUrl;
        this.name = name;
        this.lastKnownLocation = lastKnownLocation || null;
        this.statusText = statusText || null;
    }

    /**
     * Converts the BubbleNode instance to a Firestore-compatible object.
     * @returns {object}
     */
    toFirestore() {
        return {
            userId: this.userId,
            bubbleId: this.bubbleId,
            role: this.role,
            status: this.status,
            quote: this.quote || null,
            tier: this.tier,
            type: this.type,
            createdAt: this.createdAt,
            lastUpdated: this.lastUpdated,
            photoUrl: this.photoUrl || null,
            name: this.name,
            // Older security rules required `fullName` on nodes.
            fullName: this.name,
            lastKnownLocation: this.lastKnownLocation || null,
            statusText: this.statusText || null,
        };
    }

    /**
     * Creates a BubbleNode instance from a Firestore document.
     * @param {firebase.firestore.DocumentSnapshot} doc - The Firestore document.
     * @returns {BubbleNode}
     */
    static fromFirestore(doc) {
        const data = doc.data();
        return new BubbleNode(
            doc.id,
            data.userId,
            data.bubbleId,
            data.role,
            data.status,
            data.quote,
            data.tier,
            data.type,
            data.createdAt,
            data.lastUpdated,
            data.photoUrl,
            data.name,
            data.lastKnownLocation || null,
            data.statusText || null
        );
    }
}

export default BubbleNode;

