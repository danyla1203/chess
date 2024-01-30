import { req } from './utis';

export const emailVerification = (email: string) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  try {
    return req(`${host}/auth/send-verification-mail`, 'POST', { email });
  } catch (e) {
    console.error('Login failed');
  }
};
