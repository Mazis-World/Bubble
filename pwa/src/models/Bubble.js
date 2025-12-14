/**
 * BUBBLES Collection
 * The container for a group.
 * Path: /bubbles/{bubbleId}
 */
class Bubble {
    /**
     * @param {string} bubbleId - Document Key
     * @param {string} ownerId - The userId of the bubble creator.
     * @param {string} name - Name of the bubble (e.g., "Smith Family").
     * @param {firebase.firestore.Timestamp} createdAt - Time the bubble was created.
     * @param {number} maxMembers - Max member count, tied to subscription tier.
     * @param {string} inviteCode - Short, unique code for joining via URL.
     * @param {string} visibility - "private" or "public-preview". Controls external visibility.
     * @param {Array<string>} members - Array of userIds who are members of this bubble.
     */
    constructor(bubbleId, ownerId, name, createdAt, maxMembers, inviteCode, visibility, members = []) {
        this.bubbleId = bubbleId;
        this.ownerId = ownerId;
        this.name = name;
        this.createdAt = createdAt;
        this.maxMembers = maxMembers;
        this.inviteCode = inviteCode;
        this.visibility = visibility;
        this.members = members;
    }

    /**
     * Converts the Bubble instance to a Firestore-compatible object.
     * @returns {object}
     */
    toFirestore() {
        return {
            ownerId: this.ownerId,
            name: this.name,
            createdAt: this.createdAt,
            maxMembers: this.maxMembers,
            inviteCode: this.inviteCode,
            visibility: this.visibility,
            members: this.members,
        };
    }

    /**
     * Creates a Bubble instance from a Firestore document.
     * @param {firebase.firestore.DocumentSnapshot} doc - The Firestore document.
     * @returns {Bubble}
     */
    static fromFirestore(doc) {
        const data = doc.data();
        return new Bubble(
            doc.id,
            data.ownerId,
            data.name,
            data.createdAt,
            data.maxMembers,
            data.inviteCode,
            data.visibility,
            data.members || []
        );
    }
}

export default Bubble;

