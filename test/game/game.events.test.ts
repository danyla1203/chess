import { gameEndedEvent, gameEndedMessage } from '../../src/game/game.events';
import { GameEnd } from '../../src/game/EmitTypes';
import { Exchange, RoutingKey } from '../../src/messaging';
import { generateConfig, startedGame } from './generators';

describe('game.ended event (unit)', () => {
  it('should describe the result keyed by matchId', () => {
    const game = startedGame(generateConfig('w', 50));
    const [pl1, pl2] = game.players;
    pl2.authorized = false;
    game.endGame(pl1, pl2, GameEnd.surrender);

    expect(gameEndedEvent(game)).toMatchObject({
      matchId: game.matchId,
      gameId: game.id,
      reason: 'surrender',
      isDraw: false,
      config: game.config,
      players: [
        { userId: pl1.userId, authorized: true, isWinner: true },
        { userId: pl2.userId, authorized: false, isWinner: false },
      ],
    });
  });

  it('should mark a draw with no winner', () => {
    const game = startedGame();
    game.endGameByDraw();
    const event = gameEndedEvent(game);
    expect(event.isDraw).toBe(true);
    expect(event.players.every((pl) => !pl.isWinner)).toBe(true);
  });

  it('should wrap the event as an outbox message for game.lifecycle', () => {
    const game = startedGame();
    game.endGameByDraw();
    expect(gameEndedMessage(game)).toMatchObject({
      exchange: Exchange.GameLifecycle,
      routingKey: RoutingKey.GameEnded,
      messageId: game.matchId,
      trace: {},
    });
  });
});
