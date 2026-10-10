jest.mock('googleapis', () => {
  function OAuth2() {
    this.a = 10;
  }
  return {
    google: {
      auth: {
        OAuth2,
      },
    },
  };
});
jest.mock('axios', () => null);
import { JwtModule } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from '../../src/auth/auth.service';
import { PrismaService } from '../../src/prisma.service';
import { AuthModel } from '../../src/auth/auth.model';
import { Confirmation, User } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { LoggerModule } from '../../src/tools/logger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { TokenService } from '../../src/auth';

describe('Auth module (integration)', () => {
  let service: AuthService;
  let tokenService: TokenService;
  let prisma: PrismaService;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'mockSecret',
          signOptions: { expiresIn: '60s' },
        }),
        LoggerModule,
        ConfigModule,
      ],
      providers: [AuthService, PrismaService, AuthModel, TokenService],
    })
      .overrideProvider(CACHE_MANAGER)
      .useValue({
        provide: CACHE_MANAGER,
        useValue: {
          get: () => null,
          set: () => jest.fn(),
        },
      })
      .compile();
    tokenService = moduleRef.get(TokenService);
    service = moduleRef.get(AuthService);
    prisma = moduleRef.get(PrismaService);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendVerificationMail', () => {
    it('should throw Conflict err if user email confirmed already', async () => {
      const existingUser = (await prisma.user.findFirst()) as User;
      expect(service.sendVerificationMail(existingUser.email)).rejects.toThrow(
        new ConflictException('User already exists'),
      );
    });
    it('should throw err if confirmation already confirmed', async () => {
      const { email } = (await prisma.confirmation.findFirst({
        include: {
          user: true,
        },
        where: {
          user: null,
          isConfirmed: true,
        },
      })) as Confirmation;
      expect(service.sendVerificationMail(email)).rejects.toThrow(
        new ConflictException('Email already confirmed'),
      );
    });
    it('should update code if confirmation exist and non-confirmed', async () => {
      const { email } = (await prisma.confirmation.findFirst({
        where: {
          isConfirmed: false,
        },
      })) as Confirmation;
      jest.spyOn(global.Math, 'random').mockReturnValue(0.123456);
      await expect(service.sendVerificationMail(email)).resolves.toEqual({
        message: 'ok',
        email,
        code: 123456,
      });
      const { code } = (await prisma.confirmation.findUnique({
        where: {
          isConfirmed: false,
          email,
        },
      })) as Confirmation;
      expect(code).toEqual('123456');
    });
    it('should create confirmation', async () => {
      const newEmail = faker.internet.email();
      jest.spyOn(global.Math, 'random').mockReturnValue(0.123456);

      await expect(service.sendVerificationMail(newEmail)).resolves.toEqual({
        code: 123456,
        email: newEmail,
        message: 'ok',
      });
      const conf = await prisma.confirmation.findUnique({
        where: { email: newEmail },
      });
      expect(conf.email).toEqual(newEmail);
      expect(conf.code).toEqual('123456');
      expect(conf.isConfirmed).toEqual(false);
    });
  });
  describe('verifyEmail', () => {
    it('should throw err if pending confirmation doesnt exist', async () => {
      expect(service.verifyEmail('somecode', '404@gmail.com')).rejects.toThrow(
        new BadRequestException('Invalid email'),
      );
    });
    it('should throw err if provided code doesnt match code in db', async () => {
      const { email } = await prisma.confirmation.findFirst({
        where: {
          isConfirmed: false,
        },
      });
      expect(service.verifyEmail('incorrectcode', email)).rejects.toThrow(
        new BadRequestException('Invalid code'),
      );
    });
    it('should update confirmation status', async () => {
      const { email, code } = await prisma.confirmation.findFirst({
        where: {
          isConfirmed: false,
        },
      });
      await expect(service.verifyEmail(code, email)).resolves.toEqual({
        message: 'ok',
      });
      const { isConfirmed } = await prisma.confirmation.findFirst({
        where: {
          email,
        },
      });
      expect(isConfirmed).toBe(true);
    });
  });
  describe('login', () => {
    it('should throw Unauthorized err if user doesnt exist', async () => {
      expect(
        service.login({
          email: 'no@gmail.com',
          deviceId: 'devId',
          password: 'pass',
        }),
      ).rejects.toThrow(new UnauthorizedException());
    });
    it('should throw Unauthorized err if password is incorrect', async () => {
      const { email } = await prisma.user.findFirst();
      await expect(
        service.login({ email, password: 'incorrect', deviceId: 'devId' }),
      ).rejects.toThrow(new UnauthorizedException());
    });
    it('should create session. Try on a user with some sessions', async () => {
      const { id, email, password } = await prisma.user.findFirst({
        include: {
          auth: true,
        },
        where: {
          auth: {
            some: {},
          },
        },
      });
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => true);
      const res = await service.login({
        email,
        password,
        deviceId: 'someSessionDevId',
      });
      expect(res).toHaveProperty('refresh');
      expect(res).toHaveProperty('access');
      const session = await prisma.auth.findFirst({
        where: { deviceId: 'someSessionDevId', userId: id },
      });
      expect(session).toHaveProperty('refreshToken', res.refresh);
    });
    it('should create session. Try on a user with no sessions', async () => {
      const { id, email, password } = await prisma.user.findFirst({
        include: {
          auth: true,
        },
        where: {
          auth: {
            none: {},
          },
        },
      });
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => true);
      const res = await service.login({
        email,
        password,
        deviceId: 'emailDevId',
      });
      expect(res).toHaveProperty('refresh');
      expect(res).toHaveProperty('access');
      const session = await prisma.auth.findFirst({
        where: { deviceId: 'emailDevId', userId: id },
      });
      expect(session).toHaveProperty('refreshToken', res.refresh);
    });
    it('should create session. Try on login with name', async () => {
      const { id, name, password } = await prisma.user.findFirst({
        include: {
          auth: true,
        },
      });
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => true);
      const res = await service.login({
        name,
        password,
        deviceId: 'nameDevId',
      });
      expect(res).toHaveProperty('access');
      expect(res).toHaveProperty('refresh');
      const session = await prisma.auth.findFirst({
        where: { deviceId: 'nameDevId', userId: id },
      });
      expect(session).toHaveProperty('refreshToken', res.refresh);
    });
  });
  describe('checkoutUserSession', () => {
    it('should throw Unauthorized err if session doesnt exist', async () => {
      await expect(service.checkoutUserSession(-1, 'devId')).rejects.toThrow(
        new UnauthorizedException(),
      );
      await expect(service.checkoutUserSession(1, 'fakeDevId')).rejects.toThrow(
        new UnauthorizedException(),
      );
    });
    it('should delete session and throw Unauthorized err if session is expired', async () => {
      const { id, userId, deviceId } = await prisma.auth.findFirst({
        where: {
          expiresIn: {
            lt: new Date(),
          },
        },
      });
      await expect(
        service.checkoutUserSession(userId, deviceId),
      ).rejects.toThrow(new BadRequestException('Session expired'));
      const deletedAuth = await prisma.auth.findUnique({
        where: { id },
      });
      expect(deletedAuth).toBe(null);
    });
    it('should return user if session is exist', async () => {
      const { user, deviceId } = await prisma.auth.findFirst({
        include: {
          user: true,
        },
        where: {
          expiresIn: {
            gt: new Date(),
          },
        },
      });
      const expected = { id: user.id, name: user.name, deviceId };
      expect(
        service.checkoutUserSession(user.id, deviceId),
      ).resolves.toStrictEqual(expected);
    });
  });
  describe('createSession', () => {
    it('should create session and return tokens', async () => {
      const { id } = await prisma.user.findFirst();
      jest.spyOn(tokenService, 'getPair').mockImplementation(async () => {
        return {
          refresh: 'refresh',
          access: 'access',
        };
      });
      await expect(
        service.createSession(id, 'testDevice'),
      ).resolves.toStrictEqual({
        refresh: 'refresh',
        access: 'access',
      });
      const session = await prisma.auth.findFirst({
        where: {
          userId: id,
          deviceId: 'testDevice',
        },
      });
      expect(session).toBeDefined();
    });
  });
  describe('useRefresh', () => {
    it('should throw Unauthorized err if session doesnt exist', () => {
      expect(service.useRefresh('stubToken')).rejects.toThrow(
        new UnauthorizedException(),
      );
    });
    it('should delete session and throw Unauthorized err if session is expired', async () => {
      const { id, refreshToken } = await prisma.auth.findFirst({
        where: {
          expiresIn: {
            lt: new Date(),
          },
        },
      });
      await expect(service.useRefresh(refreshToken)).rejects.toThrow(
        new BadRequestException('Session expired'),
      );
      const deletedAuth = await prisma.auth.findUnique({
        where: { id },
      });
      expect(deletedAuth).toBe(null);
    });
    it('should delete and then create new session if refresh token is used', async () => {
      const session = await prisma.auth.findFirst({
        include: {
          user: true,
        },
        where: {
          expiresIn: {
            gt: new Date(),
          },
        },
      });
      jest.spyOn(tokenService, 'getPair').mockImplementation(async () => {
        return {
          refresh: 'refresh',
          access: 'access',
        };
      });
      await expect(
        service.useRefresh(session.refreshToken),
      ).resolves.toStrictEqual({
        refresh: 'refresh',
        access: 'access',
      });
      const oldSession = await prisma.auth.findUnique({
        where: {
          id: session.id,
        },
      });
      expect(oldSession).toBe(null);
      const newSession = await prisma.auth.findFirst({
        where: {
          refreshToken: 'refresh',
          userId: session.userId,
        },
      });
      expect(newSession).toBeDefined();
    });
  });
  describe('logout', () => {
    it('should delete session on logout', async () => {
      const { id, userId, deviceId } = await prisma.auth.findFirst();
      await service.logout(userId, deviceId);
      const deletedSession = await prisma.auth.findFirst({
        where: { id },
      });
      expect(deletedSession).toBe(null);
    });
  });
});
