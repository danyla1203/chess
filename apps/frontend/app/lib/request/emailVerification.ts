import type {
  SendVerificationMailRequest,
  SendVerificationMailResponse,
} from '@chess/contract';
import { req } from './utis';

export const emailVerification = (email: string) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  const body: SendVerificationMailRequest = { email };
  return req<SendVerificationMailResponse>(
    `${host}/auth/send-verification-mail`,
    'POST',
    body,
  );
};
