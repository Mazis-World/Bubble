const admin = require('firebase-admin');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const {
  recipientUserIdsFromNodes,
  tokensFromUserData,
  buildMemoPush,
  isInvalidTokenError,
} = require('./push');

admin.initializeApp();

const firestore = admin.firestore();
const messaging = admin.messaging();

async function tokensForBubbleExcept(bubbleId, exceptUserId) {
  const nodesSnap = await firestore.collection('bubbles').doc(bubbleId).collection('nodes').get();
  const nodes = nodesSnap.docs.map((snap) => snap.data());
  const userIds = recipientUserIdsFromNodes(nodes, exceptUserId);
  const tokens = [];
  const tokenOwners = new Map();

  await Promise.all(userIds.map(async (uid) => {
    const userSnap = await firestore.collection('users').doc(uid).get();
    const userTokens = tokensFromUserData(userSnap.data());
    userTokens.forEach((token) => {
      tokens.push(token);
      tokenOwners.set(token, uid);
    });
  }));

  return { tokens, tokenOwners };
}

async function removeInvalidTokens(tokenOwners, failedTokens) {
  const byUser = new Map();
  failedTokens.forEach((token) => {
    const uid = tokenOwners.get(token);
    if (!uid) return;
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid).push(token);
  });

  await Promise.all([...byUser.entries()].map(async ([uid, stale]) => {
    const userRef = firestore.collection('users').doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) return;
    const next = tokensFromUserData(snap.data()).filter((token) => !stale.includes(token));
    await userRef.update({ fcmTokens: next });
  }));
}

async function sendPushToTokens(tokens, tokenOwners, payload) {
  if (!tokens.length) return;
  const response = await messaging.sendEachForMulticast({
    tokens,
    data: payload.data,
    webpush: {
      fcmOptions: { link: payload.data.url || '/' },
      headers: { Urgency: payload.data.type === 'sos' ? 'high' : 'normal' },
    },
  });

  const failed = [];
  response.responses.forEach((result, index) => {
    if (result.success) return;
    if (isInvalidTokenError(result.error)) {
      failed.push(tokens[index]);
    } else {
      logger.warn('Push send failed', result.error && result.error.code);
    }
  });

  if (failed.length) {
    await removeInvalidTokens(tokenOwners, failed);
  }
}

exports.onFamilyMemoCreated = onDocumentCreated(
  'bubbles/{bubbleId}/memos/{memoId}',
  async (event) => {
    const memo = event.data && event.data.data();
    const bubbleId = event.params.bubbleId;
    if (!memo || !memo.userId) return;

    const { tokens, tokenOwners } = await tokensForBubbleExcept(bubbleId, memo.userId);
    if (!tokens.length) {
      logger.info('No FCM tokens for bubble members', { bubbleId });
      return;
    }

    const payload = buildMemoPush(memo, bubbleId);
    await sendPushToTokens(tokens, tokenOwners, payload);
  }
);
