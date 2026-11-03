import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateGameDto,
  PlainBoardState,
  ClockState,
  DrawAgreement,
  TurnBody,
  CompletedMove,
  InitedGameData,
} from './dto';
import { Client, Player } from '../domain/game/entities';
import {
  Game,
  Message,
  GameWithWinner,
  DrawGame,
  Cell,
} from '../domain/game/entities/game';
import { GameEnd } from '../domain/game/EmitTypes';
import {
  GameRepository,
  Updated,
} from '../infrastructure/game/game.repository';
import { GameMetrics } from '../infrastructure/game/game.metrics';
import { GamePublisher } from './game.publisher';
import type { GameAdapterI } from './game.adapter.interface';

type GameEnded = { winner: Player; looser: Player; gameDto: GameWithWinner };

@Injectable()
export class GameService {
  constructor(
    private readonly repo: GameRepository,
    private readonly metrics: GameMetrics,
    private readonly publisher: GamePublisher,
    @Inject('GameAdapterI') private readonly adapter: GameAdapterI,
  ) {}

  private requireActive(game: Game): void {
    if (!game.isActive) throw new ConflictException('Game is not active');
  }

  private ended(game: Game): void {
    this.metrics.gameEnded(game, game.endReason);
  }

  private async update<T>(
    id: number,
    mutate: (game: Game) => T,
  ): Promise<Updated<T>> {
    const updated = await this.repo.update(id, mutate);
    this.publisher.publish(updated.game, updated.game.pullEvents());
    return updated;
  }

  private async cancelLobbyGameOf(userId: number): Promise<void> {
    const game = await this.repo.findUserGame(userId);
    if (game?.status !== 'lobby') return;
    await this.update(game.id, (g) => {
      if (g.status === 'lobby') g.cancel();
    });
  }

  public async createGame(
    player: Client,
    config: CreateGameDto,
  ): Promise<Game> {
    const current = await this.repo.findUserGame(player.userId);
    if (current?.isActive) {
      throw new ConflictException('You are already in game');
    }
    await this.cancelLobbyGameOf(player.userId);

    const newGame = new Game(player, config, await this.repo.nextId());
    await this.repo.create(newGame);
    this.metrics.gameCreated(newGame);
    this.publisher.publish(newGame, newGame.pullEvents());
    return newGame;
  }

  public async connectToGame(player: Client, gameId: number): Promise<Game> {
    const lobbyGame = await this.repo.get(gameId);
    if (lobbyGame?.status !== 'lobby') {
      throw new NotFoundException('Game not found');
    }
    if (lobbyGame.findPlayer(player.userId)) {
      throw new ConflictException('You are already in game');
    }
    await this.cancelLobbyGameOf(player.userId);

    const { game } = await this.update(gameId, (g) => {
      if (g.status !== 'lobby') throw new NotFoundException('Game not found');
      g.addPlayer(player);
      g.start();
    });
    return game;
  }

  public async removeInitedGamesBy(player: Client): Promise<void> {
    await this.cancelLobbyGameOf(player.userId);
  }

  public async findPendingGame(client: Client): Promise<Game> {
    const game = await this.repo.findUserGame(client.userId);
    if (!game?.isActive) throw new NotFoundException('Game not found');
    return game;
  }

  public async leaveGame(client: Client): Promise<GameEnded> {
    const pending = await this.findPendingGame(client);
    const { game } = await this.update(pending.id, (g) => {
      this.requireActive(g);
      g.endGame(
        g.opponentOf(client.userId),
        g.findPlayer(client.userId),
        GameEnd.playerLeave,
      );
    });
    this.ended(game);
    return {
      winner: game.winner,
      looser: game.looser,
      gameDto: this.adapter.gameWithWinnerDto(game),
    };
  }

  public async findGameById(id: number): Promise<Game> {
    const game = await this.repo.get(id);
    if (!game || game.status === 'cancelled') {
      throw new NotFoundException('Game not found');
    }
    return game;
  }

  public getActualGameState(game: Game): PlainBoardState {
    return this.adapter.plainBoardState(game);
  }

  public async pushMessage(
    gameId: number,
    message: string,
    client: Client,
  ): Promise<Message> {
    const { result } = await this.update(gameId, (g) =>
      g.postMessage(message, client),
    );
    return result;
  }

  public async surrender(gameId: number, client: Client): Promise<GameEnded> {
    const { game } = await this.update(gameId, (g) => {
      this.requireActive(g);
      g.endGame(
        g.opponentOf(client.userId),
        g.findPlayer(client.userId),
        GameEnd.surrender,
      );
    });
    this.ended(game);
    return {
      winner: game.winner,
      looser: game.looser,
      gameDto: this.adapter.gameWithWinnerDto(game),
    };
  }

  public async proposeDraw(
    gameId: number,
    client: Client,
  ): Promise<DrawAgreement> {
    const { game } = await this.update(gameId, (g) => {
      this.requireActive(g);
      const { side } = g.findPlayer(client.userId);
      if (g.draw[side]) throw new ConflictException('Propose already set');
      g.setDrawProposeFrom(side);
    });
    return game.draw;
  }

  public async acceptDraw(gameId: number, client: Client): Promise<DrawGame> {
    const { game } = await this.update(gameId, (g) => {
      this.requireActive(g);
      const { w, b } = g.draw;
      if (!w && !b) throw new ConflictException('Draw propose wasnt set');
      g.acceptDraw(g.findPlayer(client.userId).side);
    });
    this.ended(game);
    return this.adapter.gameWithDrawDto(game);
  }

  public async rejectDraw(gameId: number): Promise<DrawAgreement> {
    await this.update(gameId, (g) => {
      const { w, b } = g.draw;
      if (!w && !b) throw new ConflictException('Draw propose wasnt set');
      g.rejectDraw();
    });
    return { w: false, b: false };
  }

  public async addTimeToAnotherPlayer(
    gameId: number,
    player: Client,
  ): Promise<ClockState> {
    const { game } = await this.update(gameId, (g) => {
      this.requireActive(g);
      g.addTimeTo(g.opponentOf(player.userId), g.config.timeIncrement);
    });
    return game.clockState();
  }

  public async makeTurn(
    gameId: number,
    userId: number,
    { figure, cell }: TurnBody,
  ): Promise<{
    result: CompletedMove;
    prevCell: Cell;
    side: 'w' | 'b';
    clock: ClockState;
  }> {
    const { game, result } = await this.update(gameId, (g) => {
      const completedMove = g.makeTurn(userId, figure, cell);
      if (completedMove.result.mate) {
        g.endGame(g.findPlayer(userId), g.opponentOf(userId), GameEnd.mate);
      }
      return completedMove;
    });
    if (game.status === 'ended') this.ended(game);
    return { ...result, clock: game.clockState() };
  }

  public async endByTimeout(gameId: number, now = Date.now()): Promise<void> {
    const { game, result } = await this.update(gameId, (g) =>
      g.isTimeOver(now) ? g.endByTimeout(now) : null,
    );
    if (result) this.ended(game);
  }

  public getInitedGameData(userId: number, game: Game): InitedGameData {
    return this.adapter.initedGameDataDto(userId, game);
  }
}
