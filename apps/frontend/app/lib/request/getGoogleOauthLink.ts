import { req } from './utis';

export const getGooguleOauthLink = () => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  try {
    return req(`${host}/auth/google/oauth/link`, 'GET');
  } catch (e) {
    console.error('Login failed');
  }
};
