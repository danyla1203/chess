import { deviceId } from '../utils';
import { getProfile } from './userProfile';

export const createUser = async (
  email: string,
  userName: string,
  password: string,
) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  try {
    const res = await (
      await fetch(`${host}/user/signup`, {
        method: 'POST',
        body: JSON.stringify({
          email,
          name: userName,
          password,
          deviceId: deviceId(),
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
    ).json();
    if (res.error) return res;
    const { access, refresh } = res;
    const profile = await getProfile(access);
    return { profile, access, refresh };
  } catch (e) {
    console.error('Signup failed');
  }
};
