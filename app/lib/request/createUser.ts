import { deviceId } from '../utils';
import { getProfile } from './userProfile';
import { req } from './utis';

export const createUser = async (
  email: string,
  userName: string,
  password: string,
) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  try {
    const res = await req(`${host}/user/signup`, 'POST', {
      email,
      name: userName,
      password,
      deviceId: deviceId(),
    });
    if (res.error) return res;
    const { access, refresh } = res;
    const profile = await getProfile(access);
    return { profile, access, refresh };
  } catch (e) {
    console.error('Signup failed');
  }
};
