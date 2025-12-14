/**
 * Represents an invitation to join a bubble.
 * Note: This model is for reference/documentation. 
 * In the current implementation, invitations are handled via edges with referralToken.
 * Stored in: /bubbles/{bubbleId}/edges/{edgeId}
 */
class Invitation {
    /**
     * @param {string} inviteId - The unique ID for the invitation document.
     * @param {string} bubbleId - The target bubble for this invitation.
     * @param {string} invitedBy - The userId who sent the invite.
     * @param {string} inviteCode - The unique code placed in the join URL for claim lookup.
     * @param {firebase.firestore.Timestamp} expiresAt - Time the invite is no longer valid.
     * @param {boolean} used - true if a user has successfully joined with this code.
     * @param {string|null} referredNode - Optional: The nodeId that serves as the anchor for the new member.
     */
    constructor(inviteId, bubbleId, invitedBy, inviteCode, expiresAt, used = false, referredNode = null) {
        this.inviteId = inviteId;
        this.bubbleId = bubbleId;
        this.invitedBy = invitedBy;
        this.inviteCode = inviteCode;
        this.expiresAt = expiresAt;
        this.used = used;
        this.referredNode = referredNode;
    }

    /**
     * Converts the Invitation instance to a Firestore-compatible object.
     * @returns {object}
     */
    toFirestore() {
        return {
            bubbleId: this.bubbleId,
            invitedBy: this.invitedBy,
            inviteCode: this.inviteCode,
            expiresAt: this.expiresAt,
            used: this.used,
            referredNode: this.referredNode,
        };
    }

    /**
     * Creates an Invitation instance from a Firestore document.
     * @param {firebase.firestore.DocumentSnapshot} doc - The Firestore document.
     * @returns {Invitation}
     */
    static fromFirestore(doc) {
        const data = doc.data();
        return new Invitation(
            doc.id,
            data.bubbleId,
            data.invitedBy,
            data.inviteCode,
            data.expiresAt,
            data.used,
            data.referredNode
        );
    }
}

export default Invitation;

