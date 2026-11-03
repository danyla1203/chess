import type { GoogleOauthRequest, GoogleOauthResponse } from '@chess/contract';
import { req } from './utis';

export const getGoogleProfile = (code: string) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  const body: GoogleOauthRequest = { code };
  return req<GoogleOauthResponse>(`${host}/auth/google/oauth`, 'POST', body);
};
