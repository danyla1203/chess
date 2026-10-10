import { ConfigService } from '@nestjs/config';
import amqp from 'amqp-connection-manager';
import { DELIVERY_LIMIT, Queue, RabbitMQService } from '../../src/messaging';
import { LoggerService } from '../../src/tools/logger';
import { FakeBroker, fakeConnection } from './fake-broker';

describe('RabbitMQService.subscribe retries (unit, fake broker)', () => {
  let broker: FakeBroker;
  let rabbit: RabbitMQService;
  const handler = jest.fn();
  const logger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as LoggerService;

  const deliver = async (headers: Record<string, number>) => {
    const before = broker.nacked.length;
    broker.deliver(
      Queue.GameEndedPersist,
      'game.lifecycle',
      'game.v1.ended',
      Buffer.from('{}'),
      { headers },
    );
    const start = Date.now();
    while (broker.nacked.length === before) {
      if (Date.now() - start > 3000) throw new Error('no nack');
      await new Promise((r) => setTimeout(r, 5));
    }
    return broker.nacked.at(-1);
  };

  beforeEach(async () => {
    broker = new FakeBroker();
    jest
      .spyOn(amqp, 'connect')
      .mockImplementation(() => fakeConnection(broker) as never);
    rabbit = new RabbitMQService(
      new ConfigService({ RABBITMQ_URL: 'amqp://fake' }),
      logger,
    );
    rabbit.onModuleInit();
    handler.mockReset().mockRejectedValue(new Error('db down'));
    await rabbit.subscribe(Queue.GameEndedPersist, handler);
  });
  afterEach(async () => {
    await rabbit.onApplicationShutdown();
    jest.restoreAllMocks();
  });

  it('should requeue a failed message after a short backoff', async () => {
    const start = Date.now();
    expect((await deliver({})).requeue).toBe(true);
    expect(Date.now() - start).toBeGreaterThanOrEqual(90);
  });

  it('should dead-letter on the last attempt counted by RabbitMQ 4 (x-acquired-count)', async () => {
    const { requeue } = await deliver({
      'x-acquired-count': DELIVERY_LIMIT - 1,
    });
    expect(requeue).toBe(false);
  });

  it('should dead-letter on the last attempt counted by RabbitMQ 3 (x-delivery-count)', async () => {
    const { requeue } = await deliver({
      'x-delivery-count': DELIVERY_LIMIT - 1,
    });
    expect(requeue).toBe(false);
  });

  it('should keep retrying before the limit', async () => {
    const { requeue } = await deliver({
      'x-acquired-count': DELIVERY_LIMIT - 2,
    });
    expect(requeue).toBe(true);
  });
});
