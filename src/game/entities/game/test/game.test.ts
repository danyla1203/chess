import { Client } from '../../Client';
import { Game } from '../game';
import { GameProcess } from '../process/game.process';
import { GameChat } from '../game.chat';
import { ConflictException } from '@nestjs/common';
import { Config } from '../game.types';
import { generateConfig, generateClient } from '../../../test/generators';
import { Player } from '../../Player';

describe('Game entity (unit)', () => {
  let game: Game;
  let config: Config;
  let fClient: Client;
  beforeEach(() => {
    config = generateConfig();
    fClient = generateClient();
    game = new Game(fClient, config, jest.fn());
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('constructor', () => {
    jest.spyOn(Math, 'random').mockImplementation(() => 0.12345);
    const newGame = new Game(fClient, config, jest.fn());
    expect(newGame.id).toBe(12345);
    expect(newGame.isActive).toBe(false);
    expect(newGame.players).toContainEqual({
      client: fClient,
      side: newGame.players[0].side,
      time: config.time,
      turningPlayer: false,
    });
    expect(newGame.config).toStrictEqual(config);
    expect(newGame.process).toBeInstanceOf(GameProcess);
    expect(newGame.chat).toBeInstanceOf(GameChat);
    expect(newGame.moves).toHaveLength(0);
    expect(newGame.winner).toBe(null);
    expect(newGame.looser).toBe(null);
    expect(newGame.draw).toStrictEqual({
      w: false,
      b: false,
    });
  });
  it('setDrawProposeFrom', () => {
    const { side } = game.players[0];
    game.setDrawProposeFrom(side);
    expect(game.draw[side]).toBeTruthy();
  });
  it('rejectDraw', () => {
    game.rejectDraw();
    expect(game.draw).toStrictEqual({
      w: false,
      b: false,
    });
  });
  it('addTimeTo', () => {
    const prevTime = game.players[0].time;
    game.addTimeTo(game.players[0], 1000);
    expect(game.players[0].time).toEqual(prevTime + 1000);
  });
  describe('addPlayer', () => {
    it('should add new player to game.players array', () => {
      const cl = generateClient();
      const nonPickedSide = game.players[0].side === 'w' ? 'b' : 'w';
      game.addPlayer(cl);
      expect(game.players[1]).toStrictEqual(
        new Player(cl, nonPickedSide, game.config.time),
      );
    });
  });
  describe('start', () => {
    it('should set tick rate for white side', () => {
      const player = generateClient();
      const pickedSide = Object.values(game.players)[0].side;
      const side = pickedSide === 'w' ? 'b' : 'w';
      game.players.push(new Player(player, side, 100000));
      jest.spyOn(game, 'changeTickingSide').mockImplementation();
      const whitePlayer = game.players.find((player) => player.side === 'w');
      const blackPlayer = game.players.find((player) => player.side === 'b');
      game.start();
      expect(game.isActive).toBeTruthy();
      expect(game.changeTickingSide).toHaveBeenCalledWith(
        whitePlayer,
        blackPlayer,
      );
    });
  });
  describe('changeTickingSide', () => {
    it('should change ticking side', () => {
      const player = generateClient();
      const pickedSide = Object.values(game.players)[0].side;
      const side = pickedSide === 'w' ? 'b' : 'w';
      game.players.push(new Player(player, side, 100000));

      jest.useFakeTimers();
      jest.spyOn(global, 'setInterval');
      jest.spyOn(global, 'clearInterval');
      const next = game.players[0];
      const old = game.players[1];
      const oldTime = old.time;
      game.changeTickingSide(next, old);
      expect(clearInterval).toHaveBeenCalled();
      expect(old.time).toEqual(oldTime + game.config.timeIncrement);
      expect(next.intervalLabel).toBeDefined();

      jest.runAllTimers();
    });
  });
  describe('timerTick', () => {
    it('should reduce time and emit time updates', () => {
      const player = generateClient();
      const pickedSide = Object.values(game.players)[0].side;
      const side = pickedSide === 'w' ? 'b' : 'w';
      game.players.push(new Player(player, side, 100000));
      const [pl1, pl2] = game.players;
      const prevPl1Time = pl1.time;
      game.timerTick(pl1, pl2);
      expect(pl1.time).toEqual(prevPl1Time - 1000);
    });
    it('should end game if time is over', () => {
      const player = generateClient();
      const pickedSide = Object.values(game.players)[0].side;
      const side = pickedSide === 'w' ? 'b' : 'w';
      game.players.push(new Player(player, side, 100000));
      const [pl1, pl2] = game.players;
      const endGameMock = jest.spyOn(game, 'endGame');

      pl1.time = 1000;
      game.timerTick(pl1, pl2);
      expect(pl1.time).toEqual(0);
      expect(endGameMock).toBeCalledWith(pl2, pl1);
    });
  });
  describe('endGameByDraw', () => {
    it('should clear interval and save game', () => {
      const player = generateClient();
      const pickedSide = Object.values(game.players)[0].side;
      const side = pickedSide === 'w' ? 'b' : 'w';
      game.players.push(new Player(player, side, 100000));

      jest.useFakeTimers();
      jest.spyOn(global, 'clearInterval');
      const [pl1, pl2] = game.players;
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      pl2.intervalLabel = setInterval(() => {}, 1000);

      game.endGameByDraw();
      expect(clearInterval).toBeCalledWith(pl1.intervalLabel);
      expect(clearInterval).toBeCalledWith(pl2.intervalLabel);
      expect(game.isActive).toBeFalsy();
    });
  });
  describe('endGame (with winner)', () => {
    it('should clear intervals, and save game', () => {
      const player = generateClient();
      const pickedSide = Object.values(game.players)[0].side;
      const side = pickedSide === 'w' ? 'b' : 'w';
      game.players.push(new Player(player, side, 100000));

      jest.useFakeTimers();
      jest.spyOn(global, 'clearInterval');
      const [pl1, pl2] = game.players;
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      pl2.intervalLabel = setInterval(() => {}, 1000);

      game.endGame(pl1, pl2);
      expect(clearInterval).toBeCalledWith(pl1.intervalLabel);
      expect(clearInterval).toBeCalledWith(pl2.intervalLabel);
      expect(game.isActive).toBeFalsy();
      expect(game.winner).toStrictEqual(pl1);
      expect(game.looser).toStrictEqual(pl2);
    });
  });
  describe('makeTurn', () => {
    it('should throw Conflict err if game is not active', () => {
      game.isActive = false;
      expect(() => game.makeTurn(0, 'pawn4', 'd3')).toThrow(
        new ConflictException('Game is not active'),
      );
    });
    it('should throw Conflict err if waiting player make a turn', () => {
      game.isActive = true;
      const player = generateClient();
      const pickedSide = Object.values(game.players)[0].side;
      const side = pickedSide === 'w' ? 'b' : 'w';
      game.players.push(new Player(player, side, 100000));

      const { userId } = side === 'w' ? game.players[0] : game.players[1];
      expect(() => game.makeTurn(userId, 'pawn4', 'd5')).toThrow(
        new ConflictException('Not your turn'),
      );
    });
  });
});
