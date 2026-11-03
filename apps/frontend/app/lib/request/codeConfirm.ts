import type { OkResponse, VerifyEmailRequest } from '@chess/contract';
import { req } from './utis';

export const codeConfirm = (code: string, email: string) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  const body: VerifyEmailRequest = { code, email };
  return req<OkResponse>(`${host}/auth/verify-email`, 'PATCH', body);
};
