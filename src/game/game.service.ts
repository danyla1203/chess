import {
  ConflictException,
  Inject,
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
  InitedGameData,
} from './dto';
import { GameList } from './game.list';
import { Client, Player } from './entities';
import {
  Game,
  GameData,
  Message,
  GameResult,
  GameWithWinner,
  DrawGame,
  Cell,
} from './entities/game';
import { GameEnd } from './EmitTypes';
import { GameModel } from './model';
import { Game as PrismaGameType } from '@prisma/client';
import { GameAdapterI } from './game.adapter.interface';

@Injectable()
export class GameService {
  constructor(
    private readonly list: GameList,
    private readonly model: GameModel,
    @Inject('GameAdapterI') private readonly adapter: GameAdapterI,
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
  //TODO: Rework on-timeout logic implementation
  private async injectableGameEndCallback(
    game: Game,
    winner: Player,
    looser: Player,
  ): Promise<void> {
    const gameDto = this.adapter.gameWithWinnerDto(game);
    this.list.gameEnd(gameDto.id);
    await this.saveGame(winner, looser, gameDto, true);
    winner.gameEndEvent(true, gameDto, GameEnd.timeout);
    winner.gameEndEvent(false, gameDto, GameEnd.timeout);
  }

  public async createGame(
    player: Client,
    config: CreateGameDto,
  ): Promise<Game> {
    const newGame = new Game(
      player,
      config,
      this.injectableGameEndCallback.bind(this),
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

  public async leaveGame(
    client: Client,
  ): Promise<{ winner: Player; looser: Player; gameDto: GameWithWinner }> {
    const game = this.list.findPendingClientGame(client);
    if (!game) throw new NotFoundException('Game not found');

    const [pl1, pl2] = game.players;
    const winner = pl1.userId !== client.userId ? pl1 : pl2;
    const looser = pl1.userId === client.userId ? pl1 : pl2;
    game.endGame(winner, looser);

    const gameDto = this.adapter.gameWithWinnerDto(game);
    this.list.gameEnd(gameDto.id);
    await this.saveGame(winner, looser, gameDto, true);
    return { winner, looser, gameDto };
  }

  public getLobby(): GameData[] {
    return this.list.getLobby();
  }
  public findGameById(id: number): Game {
    const game = this.list.games.find((game) => game.id === id);
    if (!game) throw new NotFoundException('Game not found');
    return game;
  }

  public pendingGameData(game): PlainBoardState {
    return this.getActualGameState(game);
  }

  public getActualGameState(game: Game): PlainBoardState {
    return this.adapter.plainBoardState(game);
  }

  public pushMessage(gameId: number, message: string, client: Client): Message {
    const game = this.findGameById(gameId);
    return game.chat.addMessage(message, client);
  }

  public async surrender(
    gameId: number,
    client: Client,
  ): Promise<{ winner: Player; looser: Player; gameDto: GameWithWinner }> {
    const game = this.findGameById(gameId);
    const [pl1, pl2] = game.players;
    const winner = pl1.userId !== client.userId ? pl1 : pl2;
    const looser = pl1.userId === client.userId ? pl1 : pl2;
    game.endGame(winner, looser);
    const gameDto = this.adapter.gameWithWinnerDto(game);
    this.list.gameEnd(gameDto.id);
    await this.saveGame(winner, looser, gameDto, true);
    return { winner, looser, gameDto };
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
    game.endGameByDraw();
    const gameDto = this.adapter.gameWithDrawDto(game);
    this.list.gameEnd(gameDto.id);
    await this.saveGame(game.players[0], game.players[1], gameDto);
    return gameDto;
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
      game.endGame(winner, looser);
      const gameDto = this.adapter.gameWithWinnerDto(game);
      this.list.gameEnd(gameDto.id);
      await this.saveGame(winner, looser, gameDto, true);
    }
    return completedMove;
  }
  public getInitedGameData(userId: number, game: Game): InitedGameData {
    return this.adapter.initedGameDataDto(userId, game);
  }
}
