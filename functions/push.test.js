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

  it('builds a check-in payload without an SOS deep link', () => {
    const payload = buildMemoPush(
      { type: 'checkin', userId: 'user-2', message: 'Checked in' },
      'bubble-1'
    );
    assert.equal(payload.data.type, 'checkin');
    assert.equal(payload.body, 'Checked in');
    assert.equal(payload.data.url, '/');
    assert.equal(payload.data.tag, 'checkin-user-2');
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

  it('builds a place arrival payload without coordinates', () => {
    const payload = buildMemoPush(
      {
        type: 'place',
        userId: 'user-2',
        placeId: 'home',
        placeEventType: 'ARRIVED',
        message: '🏠 Dad arrived Home',
      },
      'bubble-1'
    );
    assert.equal(payload.data.type, 'PLACE_ARRIVAL');
    assert.equal(payload.body, '🏠 Dad arrived Home');
    assert.equal(payload.data.url, '/?place=home&bubble=bubble-1');
    assert.equal(JSON.stringify(payload).includes('latitude'), false);
  });

  it('filters place recipients to the allow list', () => {
    const { filterPlaceMemoRecipients } = require('./push');
    assert.deepEqual(
      filterPlaceMemoRecipients({
        memberUserIds: ['mom', 'dad', 'emma', 'grandpa'],
        actorUserId: 'mom',
        placeRecipientUserIds: ['dad', 'emma'],
      }),
      ['dad', 'emma']
    );
  });

  it('detects stale FCM tokens', () => {
    assert.equal(isInvalidTokenError({ code: 'messaging/registration-token-not-registered' }), true);
    assert.equal(isInvalidTokenError({ code: 'messaging/internal-error' }), false);
  });
});
