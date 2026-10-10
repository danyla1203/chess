import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Queue, RabbitMQService } from '../messaging';
import { LoggerService } from '../tools/logger';
import type { GameNotification } from '../game/game.contract';
import { SocketNotifier } from './socket.notifier';

@Injectable()
export class NotificationConsumer implements OnApplicationBootstrap {
  constructor(
    private readonly rabbit: RabbitMQService,
    private readonly notifier: SocketNotifier,
    private readonly logger: LoggerService,
  ) {}

  onApplicationBootstrap(): void {
    this.rabbit
      .subscribe<GameNotification>(Queue.WsNotifications, async (n) =>
        this.deliver(n),
      )
      .catch((err: Error) =>
        this.logger.error(
          `Cannot subscribe to ${Queue.WsNotifications}: ${err.message}`,
          err.stack,
          NotificationConsumer.name,
        ),
      );
  }

  public deliver(notification: GameNotification): void {
    switch (notification.kind) {
      case 'timeTick':
        this.notifier.timeTick(notification.gameId, notification.times);
        break;
      case 'gameEnd':
        this.notifier.gameEnd(
          notification.userId,
          notification.winner,
          notification.game,
          notification.reason,
        );
        break;
    }
  }
}
