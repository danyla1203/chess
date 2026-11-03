import type { CheckoutSessionResponse } from '@chess/contract';
import { req } from './utis';

export const stripeCheckout = () => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  const access = localStorage.getItem('accessToken');
  return req<CheckoutSessionResponse>(
    `${host}/payments/checkout-session`,
    'GET',
    access,
  );
};
