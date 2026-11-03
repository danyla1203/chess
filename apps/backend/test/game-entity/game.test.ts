import { Config, Game } from '../../src/domain/game/entities/game';
import { ConflictException } from '@nestjs/common';
import {
  generateConfig,
  generateClient,
  startedGame,
} from '../game/generators';
import { Client, Player } from '../../src/domain/game/entities';
import { GameProcess } from '../../src/domain/game/entities/game/process/game.process';
import { GameChat } from '../../src/domain/game/entities/game/game.chat';
import { GameEnd } from '@chess/contract';

describe('Game entity (unit)', () => {
  let game: Game;
  let config: Config;
  let fClient: Client;
  beforeEach(() => {
    config = generateConfig();
    fClient = generateClient();
    game = new Game(fClient, config, 42);
  });

  it('constructor', () => {
    const newGame = new Game(fClient, config, 7);
    expect(newGame.id).toBe(7);
    expect(newGame.matchId).toMatch(/^[0-9a-f-]{36}$/);
    expect(newGame.status).toBe('lobby');
    expect(newGame.isActive).toBe(false);
    expect(newGame.players).toHaveLength(1);
    expect(newGame.players[0]).toMatchObject({
      userId: fClient.userId,
      name: fClient.name,
      authorized: fClient.authorized,
      time: config.time,
    });
    expect(newGame.config).toStrictEqual(config);
    expect(newGame.process).toBeInstanceOf(GameProcess);
    expect(newGame.chat).toBeInstanceOf(GameChat);
    expect(newGame.moves).toHaveLength(0);
    expect(newGame.winner).toBe(null);
    expect(newGame.looser).toBe(null);
    expect(newGame.draw).toStrictEqual({ w: false, b: false });
  });
  it('setDrawProposeFrom', () => {
    const { side } = game.players[0];
    game.setDrawProposeFrom(side);
    expect(game.draw[side]).toBeTruthy();
  });
  it('rejectDraw', () => {
    game.rejectDraw();
    expect(game.draw).toStrictEqual({ w: false, b: false });
  });
  it('addTimeTo', () => {
    const prevTime = game.players[0].time;
    game.addTimeTo(game.players[0], 1000);
    expect(game.players[0].time).toEqual(prevTime + 1000);
  });
  describe('addPlayer', () => {
    it('should add a player on the free side', () => {
      const cl = generateClient();
      const nonPickedSide = game.players[0].side === 'w' ? 'b' : 'w';
      game.addPlayer(cl);
      expect(game.players[1]).toStrictEqual(
        new Player(cl, nonPickedSide, game.config.time),
      );
    });
  });
  describe('start', () => {
    it('should activate the game with white to move', () => {
      game.addPlayer(generateClient());
      game.start(1000);
      expect(game.isActive).toBe(true);
      expect(game.turnStartedAt).toBe(1000);
      expect(game.activePlayer().side).toBe('w');
      expect(game.deadline()).toBe(1000 + config.time);
    });
  });
  describe('clock', () => {
    it('should run only the active player clock', () => {
      const g = startedGame(generateConfig('w', 0), 0);
      expect(g.times(1500)).toStrictEqual({
        w: g.config.time - 1500,
        b: g.config.time,
      });
    });
    it('should charge the mover, add increment and switch the clock', () => {
      const g = startedGame(generateConfig('w', 0), 0);
      const white = g.activePlayer();
      g.makeTurn(white.userId, 'pawn4', 'd4', 2000);
      expect(white.time).toBe(g.config.time - 2000 + g.config.timeIncrement);
      expect(g.activePlayer().side).toBe('b');
      expect(g.turnStartedAt).toBe(2000);
      expect(g.deadline()).toBe(2000 + g.config.time);
    });
    it('should anchor clock state on the running side', () => {
      const g = startedGame(generateConfig('w', 0), 0);
      expect(g.clockState(1500)).toStrictEqual({
        w: g.config.time - 1500,
        b: g.config.time,
        running: 'w',
        serverNow: 1500,
      });
    });
    it('should stop the clock state once the game is over', () => {
      const g = startedGame(generateConfig('w', 0), 0);
      g.endGameByDraw(500);
      expect(g.clockState(900)).toStrictEqual({
        w: g.config.time - 500,
        b: g.config.time,
        running: null,
        serverNow: 900,
      });
    });
    it('should report time over once the active clock reaches zero', () => {
      const g = startedGame(generateConfig('w', 0), 0);
      expect(g.isTimeOver(g.config.time - 1)).toBe(false);
      expect(g.isTimeOver(g.config.time)).toBe(true);
    });
    it('should reject a move after the flag fell', () => {
      const g = startedGame(generateConfig('w', 0), 0);
      expect(() =>
        g.makeTurn(g.activePlayer().userId, 'pawn4', 'd4', g.config.time + 1),
      ).toThrow(new ConflictException('Time is over'));
    });
  });
  describe('endByTimeout', () => {
    it('should make the active player lose', () => {
      const g = startedGame(generateConfig('w', 0), 0);
      const white = g.activePlayer();
      const { winner, looser } = g.endByTimeout(g.config.time + 10);
      expect(looser).toBe(white);
      expect(winner.side).toBe('b');
      expect(white.time).toBe(0);
      expect(g.status).toBe('ended');
      expect(g.endReason).toBe(GameEnd.timeout);
      expect(g.deadline()).toBeNull();
    });
  });
  describe('endGameByDraw', () => {
    it('should freeze clocks and end the game', () => {
      const g = startedGame(generateConfig('w', 0), 0);
      g.endGameByDraw(500);
      expect(g.isActive).toBe(false);
      expect(g.endReason).toBe(GameEnd.draw);
      expect(g.times()).toStrictEqual({
        w: g.config.time - 500,
        b: g.config.time,
      });
    });
  });
  describe('endGame (with winner)', () => {
    it('should set winner, looser and reason', () => {
      const g = startedGame();
      const [pl1, pl2] = g.players;
      g.endGame(pl1, pl2, GameEnd.surrender);
      expect(g.isActive).toBe(false);
      expect(g.status).toBe('ended');
      expect(g.winner).toBe(pl1);
      expect(g.looser).toBe(pl2);
      expect(g.endReason).toBe(GameEnd.surrender);
    });
  });
  describe('makeTurn', () => {
    it('should throw Conflict err if game is not active', () => {
      expect(() => game.makeTurn(0, 'pawn4', 'd3')).toThrow(
        new ConflictException('Game is not active'),
      );
    });
    it('should throw Conflict err if waiting player make a turn', () => {
      const g = startedGame();
      const black = g.players.find((pl) => pl.side === 'b');
      expect(() => g.makeTurn(black.userId, 'pawn4', 'd5')).toThrow(
        new ConflictException('Not your turn'),
      );
    });
    it('should not touch clocks when the move is illegal', () => {
      const g = startedGame(generateConfig('w', 0), 0);
      const white = g.activePlayer();
      expect(() => g.makeTurn(white.userId, 'pawn4', 'd6', 100)).toThrow();
      expect(white.time).toBe(g.config.time);
      expect(g.turnStartedAt).toBe(0);
    });
  });
  describe('snapshot', () => {
    it('should survive a JSON round trip', () => {
      const g = startedGame(generateConfig('w', 50), 0);
      const white = g.activePlayer();
      g.makeTurn(white.userId, 'pawn5', 'e4', 1000);
      g.chat.addMessage('gl hf', white);
      g.setDrawProposeFrom('b');

      const restored = Game.fromSnapshot(
        JSON.parse(JSON.stringify(g.toSnapshot())),
      );

      expect(restored.toSnapshot()).toStrictEqual(g.toSnapshot());
      expect(restored.process.turnSide).toBe('b');
      expect(restored.chat.messages[0].date).toBeInstanceOf(Date);
      const black = restored.activePlayer();
      expect(() =>
        restored.makeTurn(black.userId, 'pawn5', 'e5', 2000),
      ).not.toThrow();
    });
    it('should restore winner and looser as players of the game', () => {
      const g = startedGame();
      const [pl1, pl2] = g.players;
      g.endGame(pl1, pl2, GameEnd.mate);
      const restored = Game.fromSnapshot(g.toSnapshot());
      expect(restored.winner).toBe(restored.players[0]);
      expect(restored.looser).toBe(restored.players[1]);
    });
  });
});
