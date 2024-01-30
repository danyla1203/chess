import { req } from './utis';

export const userLogout = () => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  const access = localStorage.getItem('accessToken');
  try {
    return req(`${host}/auth/logout`, 'DELETE', access);
  } catch (e) {
    console.error('Logout failed');
  }
};
