import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateGameDto,
  PlainBoardState,
  TimeUpdate,
  DrawAgreement,
  TurnBody,
  CompletedMove,
} from './dto';
import { GameList } from './game.list';
import { Client, Player } from './entities';
import {
  Game,
  GameData,
  FiguresCellState,
  Message,
  GameResult,
} from './entities/game';
import { Game as GameEmits, GameEnd } from './EmitTypes';
import { GameModel } from './model';
import { GameWithWinner, DrawGame, Cell } from './entities/game/game.types';
import { Game as PrismaGameType } from '@prisma/client';

@Injectable()
export class GameService {
  constructor(
    private readonly list: GameList,
    private readonly model: GameModel,
  ) {}

  /**
   * If game ends with winner call function with: pl1 is winner, pl2 is looser, winner = true
   */
  private async saveGame(
    pl1: Player,
    pl2: Player,
    result: GameResult,
    winner = false,
  ): Promise<PrismaGameType> {
    if (!pl1.authorized || !pl2.authorized) return null;
    return winner
      ? await this.model.saveGameWithWinner({
          ...result,
          winner: pl1,
          looser: pl2,
        })
      : await this.model.saveDraw({ ...result, pl1, pl2 });
  }
  private injectableTimerTick(
    players: Player[],
    time: { w: number; b: number },
  ) {
    for (const pl of players) {
      pl.emit(GameEmits.timeTick, { w: time.w, b: time.b });
    }
  }
  private async injectableGameEndCallback(
    game,
    winner: Player,
    looser: Player,
  ) {
    this.list.gameEnd(game.id);
    await this.saveGame(winner, looser, game, true);
    winner.emit(GameEmits.end, {
      reason: GameEnd.timeout,
      winner: true,
      game,
    });
    looser.emit(GameEmits.end, {
      reason: GameEnd.timeout,
      winner: false,
      game,
    });
  }

  private async checkPlayerBalanceForGame(player: Client, bet: number) {
    if (bet > 0) {
      if (!player.authorized) throw new ConflictException('Invalid config');
      const playerBalance = await this.model.getUserBalance(player.userId);
      if (playerBalance < bet) throw new ConflictException('Invalid config');
    }
  }

  public async createGame(
    player: Client,
    config: CreateGameDto,
  ): Promise<Game> {
    await this.checkPlayerBalanceForGame(player, config.bet);
    const newGame = new Game(
      player,
      config,
      this.injectableGameEndCallback.bind(this),
      this.injectableTimerTick,
    );
    this.list.addGameToLobby(newGame);
    return newGame;
  }

  public async connectToGame(player: Client, gameId: number): Promise<Game> {
    const game = this.list.findInLobby(gameId);
    if (!game) throw new NotFoundException('Game not found');
    const pl1 = game.players[0];
    if (player.userId && pl1.userId === player.userId) {
      throw new ConflictException('You are already in game');
    }
    await this.checkPlayerBalanceForGame(player, game.config.bet);

    game.addPlayer(player);
    this.list.pushToStartedGames(gameId);

    return game;
  }

  public removeInitedGamesBy(player: Client): void {
    this.list.removeInitedGames(player);
  }
  public findCurrentOpponent(player: Client): Player {
    const game = this.list.findPendingClientGame(player);
    if (!game) return;

    return game.players.find((pl) => pl.userId !== player.userId);
  }

  public findPendingGame(client: Client): never | Game {
    const game = this.list.findPendingClientGame(client);
    if (!game) throw new NotFoundException('Game not found');
    return game;
  }

  public async leaveGame(client: Client): Promise<GameWithWinner> {
    const game = this.list.findPendingClientGame(client);
    if (!game) throw new NotFoundException('Game not found');

    const [pl1, pl2] = game.players;
    const winner = pl1.userId !== client.userId ? pl1 : pl2;
    const looser = pl1.userId === client.userId ? pl1 : pl2;
    const result = game.endGame(winner, looser);
    this.list.gameEnd(result.id);
    await this.saveGame(winner, looser, result, true);
    return result;
  }
  public updateSocket(socket, game: Game): Player {
    const adaptedSocket = {
      id: socket.id,
      authorized: socket.authorized,
      name: socket.name,
      userId: socket.userId,
      join: socket.join.bind(socket),
      emit: socket.emit.bind(socket),
      toRoom: (room: string, event: string, data: any) => {
        socket.to(room).emit(event, data);
      },
    };
    const newPlayer = game.resetPlayer(adaptedSocket);
    game.resetTicking();
    return newPlayer;
  }

  public getLobby(): GameData[] {
    return this.list.lobby.map((game) => game.data);
  }
  public findGameById(id: number): Game {
    const game = this.list.games.find((game) => game.id === id);
    if (!game) throw new NotFoundException('Game not found');
    return game;
  }

  public pendingGameData(game) {
    return this.getActualGameState(game);
  }

  public getActualGameState(game: Game): PlainBoardState {
    const boards: FiguresCellState = game.process.state;

    const plainObj = {
      w: {},
      b: {},
    };

    const [white, black] = Object.values(boards);
    for (const [figure, cell] of white.entries()) {
      plainObj.w[cell] = figure;
    }
    for (const [figure, cell] of black.entries()) {
      plainObj.b[cell] = figure;
    }

    return plainObj;
  }

  public pushMessage(gameId: number, message: string, player: Client): Message {
    const game = this.findGameById(gameId);
    return game.chat.addMessage(message, player);
  }

  public async surrender(
    gameId: number,
    client: Client,
  ): Promise<GameWithWinner> {
    const game = this.findGameById(gameId);
    const [pl1, pl2] = game.players;
    const winner = pl1.userId !== client.userId ? pl1 : pl2;
    const looser = pl1.userId === client.userId ? pl1 : pl2;
    const result = game.endGame(winner, looser);
    this.list.gameEnd(result.id);
    await this.saveGame(winner, looser, result, true);
    return result;
  }

  public proposeDraw(gameId: number, client: Client): DrawAgreement {
    const game = this.findGameById(gameId);
    const { side } = game.players.find((pl) => pl.userId === client.userId);
    if (game.draw[side]) throw new ConflictException('Propose already set');
    game.setDrawProposeFrom(side);
    return game.draw;
  }

  public async acceptDraw(gameId: number, client: Client): Promise<DrawGame> {
    const game = this.findGameById(gameId);
    const { w, b } = game.draw;
    const { side } = game.players.find((pl) => pl.userId === client.userId);

    if (!w && !b) throw new ConflictException('Draw propose wasnt set');
    game.setDrawProposeFrom(side);
    const result = game.endGameByDraw();
    this.list.gameEnd(result.id);
    await this.saveGame(result.pl1, result.pl2, result);
    return result;
  }

  public rejectDraw(gameId: number): DrawAgreement {
    const game = this.findGameById(gameId);
    const { w, b } = game.draw;

    if (!w && !b) throw new ConflictException('Draw propose wasnt set');

    game.rejectDraw();
    return { w: false, b: false };
  }

  public addTimeToAnotherPlayer(gameId: number, player: Client): TimeUpdate {
    const game = this.findGameById(gameId);
    const players = game.players;
    const toPlayer = players.find((pl) => pl.userId !== player.userId);
    game.addTimeTo(toPlayer, game.config.timeIncrement);

    return {
      [players[0].side]: players[0].time,
      [players[1].side]: players[1].time,
    };
  }

  public async makeTurn(
    gameId: number,
    userId: number,
    { figure, cell }: TurnBody,
  ): Promise<{
    result: CompletedMove;
    prevCell: Cell;
    side: 'w' | 'b';
  }> {
    const game = this.findGameById(gameId);
    const completedMove = game.makeTurn(userId, figure, cell);
    if (completedMove.result.mate) {
      const [pl1, pl2] = game.players;
      const winner = pl1.userId === userId ? pl1 : pl2;
      const looser = pl1.userId !== userId ? pl1 : pl2;
      const gameResult = game.endGame(winner, looser);
      this.list.gameEnd(gameResult.id);
      await this.saveGame(winner, looser, gameResult, true);
    }
    return completedMove;
  }
}
