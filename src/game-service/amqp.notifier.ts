import { Injectable } from '@nestjs/common';
import {
  Exchange,
  NOTIFICATION_TTL_MS,
  RabbitMQService,
  RoutingKey,
} from '../messaging';
import { LoggerService } from '../tools/logger';
import { GameNotifier } from '../game/game.notifier';
import type { GameNotification } from '../game/game.contract';
import type { GameEnd } from '../game/EmitTypes';
import type { TimeUpdate } from '../game/dto';

const TICK_TTL_MS = 2000;

@Injectable()
export class AmqpGameNotifier extends GameNotifier {
  constructor(
    private readonly rabbit: RabbitMQService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  private send(
    notification: GameNotification,
    persistent: boolean,
    ttl: number,
  ): void {
    this.rabbit
      .publish(
        Exchange.GameNotifications,
        RoutingKey.GameNotification,
        notification,
        { persistent, expiration: ttl },
      )
      .catch((err: Error) =>
        this.logger.warn(
          `Notification ${notification.kind} not delivered: ${err.message}`,
          AmqpGameNotifier.name,
        ),
      );
  }

  timeTick(gameId: number, times: TimeUpdate): void {
    this.send({ kind: 'timeTick', gameId, times }, false, TICK_TTL_MS);
  }

  gameEnd(
    userId: number,
    winner: boolean,
    game: unknown,
    reason: GameEnd,
  ): void {
    this.send(
      { kind: 'gameEnd', userId, winner, game, reason },
      true,
      NOTIFICATION_TTL_MS,
    );
  }
}
