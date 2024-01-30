import { req } from './utis';

export const getProfile = async (accessToken: string | null) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  if (!accessToken) throw new Error('No token');
  let user = await req(`${host}/user`, 'GET', accessToken);
  if (user.error) {
    const refreshStored = localStorage.getItem('refreshToken');
    const tokens = await req(`${host}/auth/use-refresh`, 'PUT', {
      refreshToken: refreshStored,
    });
    if (!tokens.access) throw Error('Get profile failed');

    const { access, refresh } = tokens;
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    user = await req(`${host}/user`, 'GET', access);
    const games = await req(`${host}/user/games`, 'GET', access);
    return { ...user, ...games, isAuthorized: true };
  }
  const games = await req(`${host}/user/games`, 'GET', accessToken);
  return { ...user, ...games, isAuthorized: true };
};
