import {
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp from 'amqp-connection-manager';
import {
  Exchange,
  Queue,
  RabbitMQService,
  RoutingKey,
  RpcTimeoutError,
} from '../../src/messaging';
import { LoggerService } from '../../src/tools/logger';
import { FakeBroker, fakeConnection, flush } from './fake-broker';

describe('RabbitMQService RPC (unit, fake broker)', () => {
  let broker: FakeBroker;
  let client: RabbitMQService;
  let server: RabbitMQService;
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as LoggerService;

  const service = () =>
    new RabbitMQService(
      new ConfigService({ RABBITMQ_URL: 'amqp://fake' }),
      logger,
    );

  beforeEach(async () => {
    broker = new FakeBroker();
    jest
      .spyOn(amqp, 'connect')
      .mockImplementation(() => fakeConnection(broker) as never);
    client = service();
    server = service();
    client.onModuleInit();
    server.onModuleInit();
    await flush();
  });
  afterEach(() => jest.restoreAllMocks());

  const call = (type: string, payload: unknown, timeout?: number) =>
    client.request(
      Exchange.GameCommands,
      RoutingKey.GameCommand,
      type,
      payload,
      timeout,
    );

  it('should round-trip a command and return the reply data', async () => {
    await server.serve(Queue.GameCommands, async (type, payload) => ({
      type,
      payload,
    }));
    await expect(call('lobby', { a: 1 })).resolves.toStrictEqual({
      type: 'lobby',
      payload: { a: 1 },
    });
  });

  it('should rebuild HTTP errors with the same status and message', async () => {
    await server.serve(Queue.GameCommands, async () => {
      throw new ConflictException('Not your turn');
    });
    const err = (await call('move', {}).catch(
      (e: HttpException) => e,
    )) as HttpException;
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.message).toBe('Not your turn');
  });

  it('should map NotFound so the WS filter can handle it', async () => {
    await server.serve(Queue.GameCommands, async () => {
      throw new NotFoundException('Game not found');
    });
    await expect(call('join', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should hide unexpected errors behind a 500', async () => {
    await server.serve(Queue.GameCommands, async () => {
      throw new Error('boom');
    });
    const err = (await call('move', {}).catch(
      (e: HttpException) => e,
    )) as HttpException;
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });

  it('should time out when nobody serves the queue', async () => {
    await expect(call('lobby', {}, 50)).rejects.toBeInstanceOf(RpcTimeoutError);
  });

  it('should match concurrent replies by correlation id', async () => {
    await server.serve(Queue.GameCommands, async (_type, payload) => {
      const { n } = payload as { n: number };
      await new Promise((r) => setTimeout(r, (5 - n) * 5));
      return n;
    });
    const results = await Promise.all(
      [1, 2, 3, 4].map((n) => call('x', { n })),
    );
    expect(results).toStrictEqual([1, 2, 3, 4]);
  });

  it('should build the broker URL from separate credentials', () => {
    const svc = new RabbitMQService(
      new ConfigService({
        RABBITMQ_USER: 'chess',
        RABBITMQ_PASSWORD: 'p@ss/w+rd=',
        RABBITMQ_HOST: 'rabbitmq.chess.svc',
      }),
      logger,
    );
    expect(svc['brokerUrl']()).toBe(
      'amqp://chess:p%40ss%2Fw%2Brd%3D@rabbitmq.chess.svc:5672',
    );
  });
});
