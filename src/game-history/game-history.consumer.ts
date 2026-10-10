import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Queue, RabbitMQService } from '../messaging';
import type { GameEndedEvent } from '../messaging';
import { LoggerService } from '../tools/logger';
import { annotateActiveSpan } from '../tools/telemetry';
import { GameHistoryModel } from './game-history.model';

@Injectable()
export class GameHistoryConsumer implements OnApplicationBootstrap {
  constructor(
    private readonly rabbit: RabbitMQService,
    private readonly model: GameHistoryModel,
    private readonly logger: LoggerService,
  ) {}

  onApplicationBootstrap(): void {
    this.rabbit
      .subscribe<GameEndedEvent>(Queue.GameEndedPersist, (event) =>
        this.handleGameEnded(event),
      )
      .catch((err: Error) =>
        this.logger.error(
          `Cannot subscribe to ${Queue.GameEndedPersist}: ${err.message}`,
          err.stack,
          GameHistoryConsumer.name,
        ),
      );
  }

  public async handleGameEnded(event: GameEndedEvent): Promise<void> {
    annotateActiveSpan({
      'chess.match.id': event.matchId,
      'chess.game.end_reason': event.reason,
    });
    if (!event.players.every((pl) => pl.authorized)) return;

    const result = await this.model.save(event);
    if (result === 'duplicate') {
      this.logger.warn(
        `Match ${event.matchId} already saved, skipping redelivery`,
        GameHistoryConsumer.name,
      );
    }
  }
}
