import { deviceId } from '../utils';
import { req } from './utis';

type LoginData = {
  email: string;
  password: string;
};

export const userLogin = (data: LoginData) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  try {
    return req(`${host}/auth/login`, 'POST', { ...data, deviceId: deviceId() });
  } catch (e) {
    console.error(e);
    return e;
  }
};
