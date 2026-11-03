export type SignUpRequest = {
  email: string;
  password: string;
  name: string;
  deviceId: string;
};

export type UpdateUserRequest = {
  name: string;
};

export type UserProfileResponse = {
  id: number;
  name: string;
  email: string;
  balance: number;
  winningBalance: number;
  createdAt: string;
};

export type UserGamePlayer = {
  userId: number;
  side: string;
  winner: boolean;
  name: string;
};

export type UserGameResult =
  | { pl1: UserGamePlayer; pl2: UserGamePlayer; winner?: undefined }
  | { winner: UserGamePlayer; looser: UserGamePlayer };

export type UserGameItem = {
  id: number;
  key: number;
  cnf: {
    inc: number;
    time: number;
  };
  date: string;
  result: UserGameResult;
  sidepick: string;
  bet: number;
};

export type UserGamesResponse = {
  games: UserGameItem[];
  wins: number;
  looses: number;
  draws: number;
};

export type PaymentInvoice = {
  id: number;
  userId: number;
  topUpAmount: number;
  date: string;
};

export type PaymentHistoryResponse = {
  total: number;
  invoices: PaymentInvoice[];
};
