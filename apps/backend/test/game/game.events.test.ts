import {
  gameEndedEvent,
  gameEndedMessage,
} from '../../src/infrastructure/game/game.events';
import { GameEnd } from '@chess/contract';
import { EventType } from '../../src/infrastructure/messaging';
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

  it('should wrap the event as a versioned integration event keyed by matchId', () => {
    const game = startedGame();
    game.endGameByDraw();
    expect(gameEndedMessage(game)).toMatchObject({
      type: EventType.GameEnded,
      messageId: game.matchId,
      trace: {},
    });
  });
});
