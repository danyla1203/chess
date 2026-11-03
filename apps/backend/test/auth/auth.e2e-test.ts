import {
  BadRequestException,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import req from 'supertest';
import bcrypt from 'bcrypt';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/prisma/prisma.service';
import { faker } from '@faker-js/faker';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

jest.mock('axios', () => null);
jest.mock('bcrypt');

describe('Auth e2e', () => {
  let app: INestApplication;
  let server: any;
  let prisma: PrismaService;
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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
    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();
    prisma = moduleFixture.get(PrismaService);
  });
  afterAll(async () => {
    await app.close();
    server.close();
  });
  describe('login', () => {
    it('should throw Unuathorized err if user doesnt exist', (done) => {
      req(server)
        .post('/auth/login/email')
        .send({
          email: faker.internet.email(),
          password: faker.internet.password(),
          deviceId: 'test1',
        })
        .expect(401, new UnauthorizedException().getResponse())
        .end(done);
    });
    it('should throw Unuathorized err if password invalid', async () => {
      const { email } = await prisma.user.findFirst();
      await req(server)
        .post('/auth/login/email')
        .send({
          email,
          password: 'fakePassword',
          deviceId: 'test1',
        })
        .expect(401, new UnauthorizedException().getResponse());
    });
    it('should return tokens', async () => {
      const { email } = await prisma.user.findFirst();
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const { body } = await req(server).post('/auth/login/email').send({
        email,
        password: 'correctPassword',
        deviceId: 'test1',
      });

      expect(body).toHaveProperty('access');
      expect(body).toHaveProperty('refresh');
    });
    it('login with name', async () => {
      const { name } = await prisma.user.findFirst();
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const { body } = await req(server).post('/auth/login/name').send({
        name,
        password: 'correctPassword',
        deviceId: 'test1',
      });
      expect(body).toHaveProperty('access');
      expect(body).toHaveProperty('refresh');
    });
  });
  describe('use refresh token', () => {
    it('should throw Unauthorized err if session doesnt exist', (done) => {
      req(server)
        .put('/auth/use-refresh')
        .send({
          refreshToken: 'fake',
        })
        .expect(401, new UnauthorizedException().getResponse())
        .end(done);
    });
    it('should throw BadRequest err if session expires', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2030-01-01'));
      const { id, refreshToken } = await prisma.auth.findFirst();
      await req(server)
        .put('/auth/use-refresh')
        .send({ refreshToken })
        .expect(400, new BadRequestException('Session expired').getResponse());
      jest.useRealTimers();
      const auth = await prisma.auth.findUnique({ where: { id } });
      expect(auth).toBeNull();
    });
    it('should update session', async () => {
      const { id, refreshToken } = await prisma.auth.findFirst({
        where: {
          expiresIn: {
            gt: new Date(),
          },
        },
      });
      const { body } = await req(server)
        .put('/auth/use-refresh')
        .send({ refreshToken });
      expect(body).toHaveProperty('access');
      expect(body).toHaveProperty('refresh');

      const auth = await prisma.auth.findUnique({ where: { id } });
      return expect(auth).toBeNull();
    });
  });
  describe('logout', () => {
    it('should delete session', async () => {
      const auth = await prisma.auth.findFirst({
        where: {
          expiresIn: {
            gt: new Date(),
          },
        },
      });
      const { body } = await req(server).put('/auth/use-refresh').send({
        refreshToken: auth.refreshToken,
      });

      await req(server)
        .delete('/auth/logout')
        .set('Authorization', `Bearer ${body.access}`)
        .expect(200, { message: 'ok' });
      const deleted = await prisma.auth.findMany({
        where: { userId: auth.userId, deviceId: auth.deviceId },
      });
      expect(deleted).toHaveLength(0);
    });
  });
  describe('verify email', () => {
    it('should throw BadRequest err if confirmation not found', (done) => {
      req(server)
        .patch('/auth/verify-email')
        .send({
          code: 'code',
          email: 'no@gmail.com',
        })
        .expect(400, new BadRequestException('Invalid email').getResponse())
        .end(done);
    });
    it('should throw BadRequest if provided code dont match', async () => {
      const conf = await prisma.confirmation.findFirst({
        where: { isConfirmed: false },
      });
      await req(server)
        .patch('/auth/verify-email')
        .send({
          code: 'incorrect code',
          email: conf.email,
        })
        .expect(400, new BadRequestException('Invalid code').getResponse());
    });
    it('should approve confirmation', async () => {
      const { id, code, email } = await prisma.confirmation.findFirst({
        where: { isConfirmed: false },
      });
      await req(server)
        .patch('/auth/verify-email')
        .send({ code, email })
        .expect(200, { message: 'ok' });
      const confirmed = await prisma.confirmation.findUnique({ where: { id } });
      expect(confirmed.isConfirmed).toBeTruthy();
    });
  });
});
