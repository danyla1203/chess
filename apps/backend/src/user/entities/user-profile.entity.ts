export const prismaSelectUserProfile = {
  id: true,
  name: true,
  email: true,
  balance: true,
  winningBalance: true,
  createdAt: true,
};

export class UserProfile {
  id: number;
  name: string;
  email: string;
  balance: number;
  winningBalance: number;
  createdAt: Date;
}
