import { req } from './utis';

export const getGoogleProfile = (code: string) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  try {
    return req(`${host}/auth/google/oauth`, 'POST', { code });
  } catch (e) {
    console.error('Login failed');
  }
};
