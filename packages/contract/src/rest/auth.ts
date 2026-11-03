export type Tokens = {
  access: string;
  refresh: string;
};

export type EmailLoginRequest = {
  email: string;
  password: string;
  deviceId: string;
};

export type NameLoginRequest = {
  name: string;
  password: string;
  deviceId: string;
};

export type UseRefreshRequest = {
  refreshToken: string;
};

export type SendVerificationMailRequest = {
  email: string;
};

export type SendVerificationMailResponse = {
  message: 'ok';
  email: string;
  code: number;
};

export type VerifyEmailRequest = {
  email: string;
  code: string;
};

export type OkResponse = {
  message: 'ok';
};

export type GoogleOauthLinkResponse = {
  link: string;
};

export type GoogleOauthRequest = {
  code: string;
};

export type GoogleOauthCreatedResponse = {
  message: 'ok';
  email: string;
  action: 'user:created';
};

export type GoogleOauthAuthorizedResponse = Tokens & {
  action: 'user:authorized';
};

export type GoogleOauthResponse =
  | GoogleOauthCreatedResponse
  | GoogleOauthAuthorizedResponse;
