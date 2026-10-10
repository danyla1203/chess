import { Exchange, RoutingKey, outboxMessage } from '../messaging';
import type { GameEndedEvent, OutboxMessage } from '../messaging';
import { GameEnd } from './EmitTypes';
import { Game } from './entities/game';

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

export function gameEndedMessage(game: Game): OutboxMessage {
  return outboxMessage(
    Exchange.GameLifecycle,
    RoutingKey.GameEnded,
    game.matchId,
    gameEndedEvent(game),
  );
}
