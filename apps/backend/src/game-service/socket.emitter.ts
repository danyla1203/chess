import type { Provider } from '@nestjs/common';
import { Emitter } from '@socket.io/redis-emitter';
import type Redis from 'ioredis';
import type { ServerToClientEvents } from '@chess/contract';
import { REDIS } from '../infrastructure/redis';
import { LoggerService } from '../infrastructure/logger';

export const SOCKET_EMITTER = Symbol('SOCKET_EMITTER');

export const GAME_NAMESPACE = '/game';

export const socketEmitterProvider: Provider = {
  provide: SOCKET_EMITTER,
  inject: [REDIS, LoggerService],
  useFactory: (redis: Redis, logger: LoggerService) =>
    new Emitter<ServerToClientEvents>({
      publish: (channel: string, message: Buffer) =>
        redis
          .publish(channel, message)
          .catch((err: Error) =>
            logger.warn(
              `Socket emit not published: ${err.message}`,
              'SocketEmitter',
            ),
          ),
    }).of(GAME_NAMESPACE),
};
