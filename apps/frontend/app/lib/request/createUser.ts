import type { SignUpRequest, Tokens } from '@chess/contract';
import { deviceId } from '../utils';
import { type Profile } from '../types';
import { getProfile } from './userProfile';
import { req } from './utis';

export const createUser = async (
  email: string,
  userName: string,
  password: string,
): Promise<
  | { error: string }
  | { error?: undefined; profile: Profile; access: string; refresh: string }
> => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  const body: SignUpRequest = {
    email,
    name: userName,
    password,
    deviceId: deviceId(),
  };
  const res = await req<Tokens>(`${host}/user/signup`, 'POST', body);
  if (res.error) return { error: res.error };
  const { access, refresh } = res;
  const profile = await getProfile(access);
  return { profile, access, refresh };
};
