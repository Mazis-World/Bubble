/**
 * Paid features are parked. Creating and using a bubble is free.
 * Flip PAYMENTS_ENABLED to true when subscriptions come back.
 */
export const PAYMENTS_ENABLED = false;

export const canUseAppWithoutPayment = () => PAYMENTS_ENABLED !== true;
