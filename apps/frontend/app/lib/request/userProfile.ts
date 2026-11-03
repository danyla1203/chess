import type {
  PaymentHistoryResponse,
  Tokens,
  UseRefreshRequest,
  UserGamesResponse,
  UserProfileResponse,
} from '@chess/contract';
import { type Profile } from '../types';
import { req } from './utis';

export const getProfile = async (
  accessToken: string | null,
): Promise<Profile> => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  if (!accessToken) throw new Error('No token');
  let user = await req<UserProfileResponse>(`${host}/user`, 'GET', accessToken);
  if (user.error) {
    const refreshStored = localStorage.getItem('refreshToken');
    const refreshBody = { refreshToken: refreshStored } as UseRefreshRequest;
    const tokens = await req<Tokens>(
      `${host}/auth/use-refresh`,
      'PUT',
      refreshBody,
    );
    if (!tokens.access) throw Error('Get profile failed');

    const { access, refresh } = tokens;
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    user = await req<UserProfileResponse>(`${host}/user`, 'GET', access);
    const games = await req<UserGamesResponse>(
      `${host}/user/games`,
      'GET',
      access,
    );
    return { ...user, ...games, isAuthorized: true } as unknown as Profile;
  }
  const games = await req<UserGamesResponse>(
    `${host}/user/games`,
    'GET',
    accessToken,
  );
  const invoices = await req<PaymentHistoryResponse>(
    `${host}/user/payment/history`,
    'GET',
    accessToken,
  );
  const parsedInvoices = invoices.invoices.map((inv) => {
    return {
      id: inv.id,
      key: inv.id,
      date: inv.date,
      topUpAmount: inv.topUpAmount,
    };
  });
  return {
    ...user,
    ...games,
    invoices: parsedInvoices,
    isAuthorized: true,
  } as unknown as Profile;
};
