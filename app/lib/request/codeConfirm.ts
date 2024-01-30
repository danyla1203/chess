import { req } from './utis';

export const codeConfirm = (code: string, email: string) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  try {
    return req(`${host}/auth/verify-email`, 'PATCH', { code, email });
  } catch (e) {
    console.error('Verification failed');
  }
};
