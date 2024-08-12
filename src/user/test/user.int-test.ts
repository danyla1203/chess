import { Test } from '@nestjs/testing';
import { UserService } from '../user.service';
import { PrismaService } from '../../prisma.service';
import { TokenService } from '../../auth';
import { faker } from '@faker-js/faker';
import { ConflictException } from '@nestjs/common';
import { AppModule } from '../../app.module';

jest.mock('axios', () => null);

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;
  let tokenService: TokenService;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    tokenService = module.get(TokenService);
    service = module.get(UserService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should throw Conflict err if confirmation is absent for email', async () => {
      const dto = {
        email: 'no@gmail.com',
        password: faker.internet.password(),
        name: faker.internet.userName(),
        deviceId: faker.string.nanoid(8),
      };
      expect(service.create(dto)).rejects.toThrow(
        new ConflictException('Confirm email first'),
      );
    });
    it('should throw Conflict err if confirmation exist and user is missing', async () => {
      const { email } = await prisma.user.findFirst({
        include: { confirmation: true },
      });
      const dto = {
        email,
        password: faker.internet.password(),
        name: faker.internet.userName(),
        deviceId: faker.string.nanoid(8),
      };
      expect(service.create(dto)).rejects.toThrow(
        new ConflictException('User already exists'),
      );
    });
    it('should create user and return tokens', async () => {
      const email = faker.internet.email();
      await prisma.confirmation.create({
        data: {
          email,
          code: '12345',
          isConfirmed: true,
        },
      });
      const newUser = {
        email,
        name: faker.internet.userName(),
        password: faker.internet.password(),
        deviceId: faker.string.nanoid(5),
      };
      jest.spyOn(tokenService, 'getPair').mockImplementation(async () => {
        return {
          refresh: 'refresh',
          access: 'access',
        };
      });
      await expect(service.create(newUser)).resolves.toStrictEqual({
        access: 'access',
        refresh: 'refresh',
      });
      const userItem = await prisma.user.findUnique({
        where: { email },
      });
      expect(userItem).toBeDefined();
    });
  });
  describe('profile', () => {
    it('should return user profile', async () => {
      const { id, name, email, balance, winningBalance } =
        await prisma.user.findFirst();
      expect(service.profile(id)).resolves.toStrictEqual({
        id,
        name,
        email,
        balance,
        winningBalance,
      });
    });
  });
  describe('update', () => {
    it('should update and return user', async () => {
      const user = await prisma.user.findFirst();
      const newData = {
        name: faker.internet.userName(),
      };
      const expected = {
        name: newData.name,
        email: user.email,
        id: user.id,
        balance: user.balance,
        winningBalance: user.winningBalance,
      };
      expect(service.update(user.id, newData)).resolves.toStrictEqual(expected);
    });
  });
  describe('get user invoices', () => {
    it('should return invoices', async () => {
      const user = await prisma.user.findFirst({
        include: {
          payment: {
            orderBy: { date: 'desc' },
          },
        },
      });
      expect(service.getUserInvoices(user.id)).resolves.toStrictEqual({
        total: user.payment.length,
        invoices: user.payment,
      });
    });
  });
  it('should update user balance and add invoice', async () => {
    const user = await prisma.user.findFirst({
      include: {
        payment: {
          orderBy: { date: 'desc' },
        },
      },
    });
    await service.topUpBalance(user.id, 666);
    const newUserBalance = (
      await prisma.user.findFirst({
        where: { id: user.id },
      })
    ).balance;
    expect(newUserBalance).toEqual(user.balance + 666);

    const invoice = await prisma.payment.findFirst({
      where: { userId: user.id, topUpAmount: 666 },
    });
    expect(invoice).not.toBeNull();
  });
});
