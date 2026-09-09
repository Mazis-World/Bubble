import { PAYMENTS_ENABLED, canUseAppWithoutPayment } from './billing';

describe('billing', () => {
  test('payments are off so creating a bubble is free', () => {
    expect(PAYMENTS_ENABLED).toBe(false);
    expect(canUseAppWithoutPayment()).toBe(true);
  });
});
