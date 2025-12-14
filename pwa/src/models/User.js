/**
 * USERS Collection
 * The global profile for every human.
 * Path: /users/{userId}
 */
class User {
    /**
     * @param {string} userId - Document Key
     * @param {string} fullName - User's full name.
     * @param {string} photoURL - Link to the user's profile picture.
     * @param {firebase.firestore.Timestamp} createdAt - Time the user profile was created.
     * @param {boolean} premium - RevenueCat subscription status. Global setting.
     * @param {Array<string>} bubbles - List of all bubbleIds this user is a member of. Essential for membership check.
     */
    constructor(userId, fullName, photoURL, createdAt, premium, bubbles = []) {
        this.userId = userId;
        this.fullName = fullName;
        this.photoURL = photoURL;
        this.createdAt = createdAt;
        this.premium = premium;
        this.bubbles = bubbles;
    }

    /**
     * Converts the User instance to a Firestore-compatible object.
     * @returns {object}
     */
    toFirestore() {
        return {
            fullName: this.fullName,
            photoURL: this.photoURL || null,
            createdAt: this.createdAt,
            premium: this.premium,
            bubbles: this.bubbles,
        };
    }

    /**
     * Creates a User instance from a Firestore document.
     * @param {firebase.firestore.DocumentSnapshot} doc - The Firestore document.
     * @returns {User}
     */
    static fromFirestore(doc) {
        const data = doc.data();
        return new User(
            doc.id,
            data.fullName,
            data.photoURL,
            data.createdAt,
            data.premium || false,
            data.bubbles || []
        );
    }
}

export default User;

