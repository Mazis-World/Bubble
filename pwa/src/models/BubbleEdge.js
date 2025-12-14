/**
 * BUBBLE EDGES Subcollection
 * Path: /bubbles/{bubbleId}/edges/{edgeId}
 * The relationship and referral engine (the lines connecting the nodes).
 */
class BubbleEdge {
    /**
     * @param {string} edgeId - Document Key
     * @param {string} fromNode - The nodeId originating the connection (e.g., referrer).
     * @param {string} toNode - The nodeId being connected (e.g., referee).
     * @param {string} relationship - The nature of the link (e.g., "Parent," "ReferredBy").
     * @param {string} referralToken - Short, one-time token used for the invite link.
     * @param {boolean} accepted - true if the invite/link is active; false if pending.
     * @param {number} tier - Used in pathfinding calculation (e.g., 1 for direct link).
     * @param {firebase.firestore.Timestamp} createdAt - Time the edge was created.
     * @param {firebase.firestore.Timestamp} acceptedAt - Time the edge was accepted (if accepted).
     */
    constructor(edgeId, fromNode, toNode, relationship, referralToken, accepted, tier, createdAt, acceptedAt = null) {
        this.edgeId = edgeId;
        this.fromNode = fromNode;
        this.toNode = toNode;
        this.relationship = relationship;
        this.referralToken = referralToken;
        this.accepted = accepted;
        this.tier = tier;
        this.createdAt = createdAt;
        this.acceptedAt = acceptedAt;
    }

    /**
     * Converts the BubbleEdge instance to a Firestore-compatible object.
     * @returns {object}
     */
    toFirestore() {
        return {
            fromNode: this.fromNode,
            toNode: this.toNode || null,
            relationship: this.relationship,
            referralToken: this.referralToken,
            accepted: this.accepted,
            tier: this.tier,
            createdAt: this.createdAt,
            acceptedAt: this.acceptedAt || null,
        };
    }

    /**
     * Creates a BubbleEdge instance from a Firestore document.
     * @param {firebase.firestore.DocumentSnapshot} doc - The Firestore document.
     * @returns {BubbleEdge}
     */
    static fromFirestore(doc) {
        const data = doc.data();
        return new BubbleEdge(
            doc.id,
            data.fromNode,
            data.toNode,
            data.relationship,
            data.referralToken,
            data.accepted || false,
            data.tier,
            data.createdAt,
            data.acceptedAt
        );
    }
}

export default BubbleEdge;

