import type { Emitter } from '@socket.io/redis-emitter';
import { socketEmitterProvider } from '../../src/game-service/socket.emitter';
import { LoggerService } from '../../src/infrastructure/logger';

describe('socket emitter provider (unit)', () => {
  it('should log instead of rejecting when Redis refuses the publish', async () => {
    const redis = {
      publish: jest.fn().mockRejectedValue(new Error('connection lost')),
    };
    const logger = { warn: jest.fn() } as unknown as LoggerService;
    const emitter = (
      socketEmitterProvider as { useFactory: (...args: unknown[]) => Emitter }
    ).useFactory(redis, logger);

    emitter.to('user:1').emit('game:end', { reason: 'timeout' });
    await new Promise((r) => setImmediate(r));

    expect(redis.publish).toHaveBeenCalledWith(
      'socket.io#/game#user:1#',
      expect.any(Buffer),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'Socket emit not published: connection lost',
      'SocketEmitter',
    );
  });
});
