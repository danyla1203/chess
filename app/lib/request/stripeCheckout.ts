import { req } from './utis';

export const stripeCheckout = () => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  const access = localStorage.getItem('accessToken');
  try {
    return req(`${host}/payments/checkout-session`, 'GET', access);
  } catch (e) {
    console.error('Checkout session failed');
  }
};
