const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  mergeFcmTokens,
  recipientUserIdsFromNodes,
  tokensFromUserData,
  buildMemoPush,
  isInvalidTokenError,
} = require('./push');

describe('push helpers', () => {
  it('dedupes and caps FCM tokens', () => {
    assert.deepEqual(mergeFcmTokens(['a', 'b'], 'c'), ['c', 'a', 'b']);
    assert.deepEqual(mergeFcmTokens(['a', 'b'], 'a'), ['a', 'b']);
  });

  it('skips the sender when collecting bubble recipients', () => {
    assert.deepEqual(
      recipientUserIdsFromNodes(
        [{ userId: 'me' }, { userId: 'you' }, { userId: 'you' }, {}],
        'me'
      ),
      ['you']
    );
  });

  it('reads string and object token records', () => {
    assert.deepEqual(
      tokensFromUserData({ fcmTokens: ['t1', { token: 't2' }, null] }),
      ['t1', 't2']
    );
  });

  it('builds a data-only SOS payload with a deep link', () => {
    const payload = buildMemoPush(
      { type: 'sos', userId: 'user-2', sosId: 'sos-1', message: 'SOS – I need help' },
      'bubble-1'
    );
    assert.equal(payload.data.type, 'sos');
    assert.equal(payload.data.url, '/?sos=sos-1&bubble=bubble-1');
    assert.equal(payload.data.tag, 'sos-sos-1');
  });

  it('detects stale FCM tokens', () => {
    assert.equal(isInvalidTokenError({ code: 'messaging/registration-token-not-registered' }), true);
    assert.equal(isInvalidTokenError({ code: 'messaging/internal-error' }), false);
  });
});
