import { getProfile } from './userProfile';

export const createUser = async (
  email: string,
  userName: string,
  password: string,
) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const randomString =
    Math.random().toString(20).substring(2, 14) +
    Math.random().toString(20).substring(2, 14);
  const deviceId = `${userAgent}-${platform}-${randomString}`;
  try {
    const res = await (
      await fetch(`${host}/user/signup`, {
        method: 'POST',
        body: JSON.stringify({ email, name: userName, password, deviceId }),
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
