import { deviceId } from '../utils';
import { req } from './utis';

type LoginData = {
  emailOrName: string;
  password: string;
};

const emailRegExp = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

export const userLogin = (data: LoginData) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  const loginMethod = emailRegExp.test(data.emailOrName) ? 'email' : 'name';
  const body = {
    password: data.password,
    [loginMethod]: data.emailOrName,
    deviceId: deviceId(),
  };
  return req(`${host}/auth/login/${loginMethod}`, 'POST', body);
};
