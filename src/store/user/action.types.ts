export interface UserState {
  id: number | null;
  name: string | null;
  email: string | null;
  authorized: boolean;
  isGetTokenLoaded: boolean;
  accessToken: string | null;
  error: { code: number | null; text: string | null };
  gameHistory: any[];
  confirmationEmailSended: boolean | null;
  emailConfirmed: boolean;
  gameViewing: boolean;
}
export interface UserProfile {
  id: number;
  name: string;
  email: string;
}
export interface UserWithTokens extends UserProfile {
  access: string;
  refresh: string;
}
