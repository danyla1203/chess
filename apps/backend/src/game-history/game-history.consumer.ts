import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EventStream, EventType } from '../infrastructure/messaging';
import type { GameEndedEvent } from '../infrastructure/messaging';
import { LoggerService } from '../infrastructure/logger';
import { annotateActiveSpan } from '../infrastructure/telemetry';
import { GameHistoryModel } from './game-history.model';

export const HISTORY_GROUP = 'history';

@Injectable()
export class GameHistoryConsumer implements OnApplicationBootstrap {
  constructor(
    private readonly events: EventStream,
    private readonly model: GameHistoryModel,
    private readonly logger: LoggerService,
  ) {}

  onApplicationBootstrap(): void {
    this.events.subscribe<GameEndedEvent>(
      HISTORY_GROUP,
      EventType.GameEnded,
      (event) => this.handleGameEnded(event),
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
