import { EventType, integrationEvent } from '../messaging';
import type { GameEndedEvent, IntegrationEvent } from '../messaging';
import { GameEnd } from '../../domain/game/EmitTypes';
import { Game } from '../../domain/game/entities/game';

export function gameEndedEvent(game: Game): GameEndedEvent {
  return {
    matchId: game.matchId,
    gameId: game.id,
    reason: game.endReason,
    isDraw: game.endReason === GameEnd.draw,
    endedAt: new Date().toISOString(),
    config: game.config,
    moves: game.moves,
    players: game.players.map((pl) => ({
      userId: pl.userId,
      name: pl.name,
      side: pl.side,
      authorized: pl.authorized,
      isWinner: game.winner?.userId === pl.userId,
    })),
  };
}

export function gameEndedMessage(game: Game): IntegrationEvent<GameEndedEvent> {
  return integrationEvent(
    EventType.GameEnded,
    game.matchId,
    gameEndedEvent(game),
  );
}
