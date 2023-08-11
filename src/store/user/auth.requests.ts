import { config } from '../../config';
import { DeleteRequest, PostRequest, PutRequest } from '../tools';
import { responseCheck } from '../tools/responseCheck';

export interface Login {
  email: string;
  password: string;
  deviceId: string;
}
export interface Signup {
  email: string;
  name: string;
  password: string;
  deviceId: string;
}
export interface Verify {
  email: string;
  code: string;
}
interface Email {
  email: string;
}

export interface Tokens {
  access: string;
  refresh: string;
}
export interface OkMessage {
  message: 'ok';
}
export interface EmailOk extends OkMessage {
  email: string;
}

export const useRefresh = async (token: string) => {
  const req = await fetch(
    `${config.apiHost}/auth/use-refresh`,
    PutRequest({ refreshToken: token }),
  );
  return responseCheck<Tokens>(req);
};

export const loginRequest = async (loginData: Login) => {
  const req = await fetch(
    `${config.apiHost}/auth/login`,
    PostRequest(loginData),
  );
  return responseCheck<Tokens>(req);
};

export const signupRequest = async (signupData: Signup) => {
  const req = await fetch(
    `${config.apiHost}/user/signup`,
    PostRequest(signupData),
  );
  return responseCheck<Tokens>(req);
};

export const logoutRequest = async (token: string) => {
  const req = await fetch(
    `${config.apiHost}/auth/logout`,
    DeleteRequest(token),
  );
  return responseCheck(req);
};

export const sendVerificationMail = async (data: Email) => {
  const req = await fetch(
    `${config.apiHost}/auth/send-verification-email`,
    PostRequest(data),
  );
  return responseCheck<EmailOk>(req);
};

export const confirmEmailRequest = async (data: Verify) => {
  const req = await fetch(
    `${config.apiHost}/auth/verify-email`,
    PostRequest(data),
  );
  return responseCheck(req);
};

export const googleAuthRequest = async (code: string) => {
  const req = await fetch(
    `${config.apiHost}/auth/google/oauth`,
    PostRequest({ code }),
  );
  return responseCheck(req);
};
