import type { GoogleOauthLinkResponse } from '@chess/contract';
import { req } from './utis';

export const getGooguleOauthLink = () => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  return req<GoogleOauthLinkResponse>(`${host}/auth/google/oauth/link`, 'GET');
};
