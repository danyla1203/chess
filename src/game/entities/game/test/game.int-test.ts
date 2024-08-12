import { Test } from '@nestjs/testing';
import { AppModule } from '../../../../app.module';
import { GameList } from '../../../game.list';
import { GameService } from '../../../game.service';
import { PrismaService } from '../../../../prisma.service';
import { Game } from '../game';
import { User } from '@prisma/client';
import { generateClient, generateConfig } from '../../../test/generators';
import { Client } from '../../Client';
import { Config } from '../game.types';
import { Game as GameEmits } from '../../../EmitTypes';

describe('Game entity (integration)', () => {
  let service: GameService;
  let lobby: GameList;
  let prisma: PrismaService;
  let game: Game;
  let userInDb1: User;
  let cl1: Client;
  let config: Config;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    service = moduleRef.get<GameService>(GameService);
    lobby = moduleRef.get<GameList>(GameList);
    prisma = moduleRef.get<PrismaService>(PrismaService);
    userInDb1 = await prisma.user.findFirst({
      where: { balance: { gt: 100 } },
    });
    cl1 = generateClient(true, userInDb1.id);
    config = generateConfig('w', 90);
    game = await service.createGame(cl1, config);
    lobby.addGameToLobby(game);
  });

  describe('timer', () => {
    let cl2: Client;
    beforeEach(() => {
      jest.useFakeTimers();
      cl2 = generateClient(true);
      game.addPlayer(cl2);
      lobby.games.push(game);
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should decrease time and trigger socket emit for white side on game.start', async () => {
      const [pl1, pl2] = game.players;
      const white = pl1.side === 'w' ? pl1 : pl2;
      const black = pl1.side === 'b' ? pl1 : pl2;
      game.start();

      expect(white.turningPlayer).toBeTruthy();
      expect(black.turningPlayer).toBeFalsy();

      jest.advanceTimersByTime(1000);
      expect(white.time).toEqual(game.config.time - 1000);
      expect(cl2.emit).toBeCalledWith(GameEmits.timeTick, {
        w: game.config.time - 1000,
        b: game.config.time,
      });
      expect(cl1.emit).toBeCalledWith(GameEmits.timeTick, {
        w: game.config.time - 1000,
        b: game.config.time,
      });
      jest.advanceTimersByTime(1000);
      expect(white.time).toEqual(game.config.time - 2000);
      expect(cl2.emit).toBeCalledWith(GameEmits.timeTick, {
        w: game.config.time - 2000,
        b: game.config.time,
      });
      expect(cl1.emit).toBeCalledWith(GameEmits.timeTick, {
        w: game.config.time - 2000,
        b: game.config.time,
      });
      jest.advanceTimersByTime(1000);
      expect(white.time).toEqual(game.config.time - 3000);
      expect(cl2.emit).toBeCalledWith(GameEmits.timeTick, {
        w: game.config.time - 3000,
        b: game.config.time,
      });
      expect(cl1.emit).toBeCalledWith(GameEmits.timeTick, {
        w: game.config.time - 3000,
        b: game.config.time,
      });
    });

    it('change ticking side', () => {
      const [pl1, pl2] = game.players;
      const white = pl1.side === 'w' ? pl1 : pl2;
      const black = pl1.side === 'b' ? pl1 : pl2;
      game.start();

      jest.advanceTimersByTime(1000);
      expect(white.time).toEqual(game.config.time - 1000);
      expect(cl2.emit).toBeCalledWith(GameEmits.timeTick, {
        w: game.config.time - 1000,
        b: game.config.time,
      });
      expect(cl1.emit).toBeCalledWith(GameEmits.timeTick, {
        w: game.config.time - 1000,
        b: game.config.time,
      });

      game.changeTickingSide(black, white);
      expect(white.turningPlayer).toBeFalsy();
      expect(black.turningPlayer).toBeTruthy();

      jest.advanceTimersByTime(1000);
      expect(black.time).toEqual(game.config.time - 1000);
      expect(cl2.emit).toBeCalledWith(GameEmits.timeTick, {
        w: game.config.time - 1000 + game.config.timeIncrement,
        b: game.config.time - 1000,
      });
      expect(cl1.emit).toBeCalledWith(GameEmits.timeTick, {
        w: game.config.time - 1000 + game.config.timeIncrement,
        b: game.config.time - 1000,
      });
    });

    it('should end game when time is out', () => {
      const [pl1, pl2] = game.players;
      const white = pl1.side === 'w' ? pl1 : pl2;
      const black = pl1.side === 'b' ? pl1 : pl2;
      white.time = 1000;
      jest.spyOn(service as any, 'saveGame').mockResolvedValue({});
      game.start();

      jest.advanceTimersByTime(1000);
      expect(white.time).toEqual(0);
      expect(game.isActive).toBeFalsy();
      expect(game.winner).toStrictEqual(black);
      expect(game.looser).toStrictEqual(white);

      expect(service['saveGame']).toBeCalled();
      const gameInStartedGames = lobby.games.find((g) => g.id === game.id);
      expect(gameInStartedGames).toBeUndefined();
    });
  });
});
