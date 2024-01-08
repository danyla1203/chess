import { deviceId } from '../utils';

type LoginData = {
  email: string;
  password: string;
};

export const userLogin = async (data: LoginData) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  try {
    return (
      await fetch(`${host}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ ...data, deviceId: deviceId() }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
    ).json();
  } catch (e) {
    console.error(e);
    return e;
  }
};
