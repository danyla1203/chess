import type { PaymentInvoice } from '@chess/contract';

export type ResultPlayer = {
  userId: number;
  name: string;
};

export type RestructedGameResult = {
  id: number;
  key: number;
  cnf: {
    inc: number;
    time: number;
  };
  result:
    | { pl1: ResultPlayer; pl2: ResultPlayer }
    | { winner: ResultPlayer; looser: ResultPlayer };
};

export type Invoice = Pick<PaymentInvoice, 'id' | 'topUpAmount' | 'date'> & {
  key: number;
};

export type Profile = {
  userId: number;
  name: string;
  balance: number;
  invoices: Invoice[];
  isAuthorized: boolean;
  games: RestructedGameResult[];
  winningBalance: number;
  wins: number;
  draws: number;
  looses: number;
  createdAt: string;
};
