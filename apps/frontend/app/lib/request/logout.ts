import type { OkResponse } from '@chess/contract';
import { req } from './utis';

export const userLogout = () => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  const access = localStorage.getItem('accessToken');
  return req<OkResponse>(`${host}/auth/logout`, 'DELETE', access);
};
