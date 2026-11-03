import type {
  EmailLoginRequest,
  NameLoginRequest,
  Tokens,
} from '@chess/contract';
import { deviceId } from '../utils';
import { req } from './utis';

type LoginData = {
  emailOrName: string;
  password: string;
};

const emailRegExp = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

export const userLogin = (data: LoginData) => {
  const host = process.env.NEXT_PUBLIC_API_HOST as string;
  const isEmail = emailRegExp.test(data.emailOrName);
  const loginMethod = isEmail ? 'email' : 'name';
  const body: EmailLoginRequest | NameLoginRequest = isEmail
    ? {
        password: data.password,
        email: data.emailOrName,
        deviceId: deviceId(),
      }
    : {
        password: data.password,
        name: data.emailOrName,
        deviceId: deviceId(),
      };
  return req<Tokens>(`${host}/auth/login/${loginMethod}`, 'POST', body);
};
