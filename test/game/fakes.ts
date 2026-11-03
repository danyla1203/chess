import { ConflictException, NotFoundException } from '@nestjs/common';
import type {
  GameRepository,
  Updated,
} from '../../src/infrastructure/game/game.repository';
import { gameEndedMessage } from '../../src/infrastructure/game/game.events';
import type { IntegrationEvent } from '../../src/infrastructure/messaging';
import {
  Game,
  GameDomainEvent,
  GameSnapshot,
} from '../../src/domain/game/entities/game';

export class InMemoryGameRepository implements Omit<
  GameRepository,
  'load' | 'redis'
> {
  games = new Map<number, string>();
  userGames = new Map<number, number>();
  outbox: IntegrationEvent[] = [];
  private seq = 0;

  private store(game: Game): void {
    this.games.set(game.id, JSON.stringify(game.toSnapshot()));
    for (const pl of game.players) {
      if (game.isFinished) {
        if (this.userGames.get(pl.userId) === game.id) {
          this.userGames.delete(pl.userId);
        }
      } else {
        this.userGames.set(pl.userId, game.id);
      }
    }
  }

  private all(): Game[] {
    return [...this.games.values()].map((data) =>
      Game.fromSnapshot(JSON.parse(data) as GameSnapshot),
    );
  }

  async nextId(): Promise<number> {
    return ++this.seq;
  }

  async get(id: number): Promise<Game | null> {
    const data = this.games.get(id);
    return data ? Game.fromSnapshot(JSON.parse(data) as GameSnapshot) : null;
  }

  async create(game: Game): Promise<void> {
    if (this.games.has(game.id)) throw new ConflictException('exists');
    this.store(game);
  }

  async update<T>(id: number, mutate: (game: Game) => T): Promise<Updated<T>> {
    const game = await this.get(id);
    if (!game) throw new NotFoundException('Game not found');
    const previousStatus = game.status;
    const result = mutate(game);
    if (previousStatus === 'active' && game.status === 'ended') {
      this.outbox.push(gameEndedMessage(game));
    }
    this.store(game);
    return { game, result, previousStatus };
  }

  async findUserGame(userId: number): Promise<Game | null> {
    const id = this.userGames.get(userId);
    return id ? this.get(id) : null;
  }

  async lobbyIds(): Promise<string[]> {
    return this.all()
      .filter((g) => g.status === 'lobby')
      .map((g) => String(g.id));
  }

  async reproject(id: number): Promise<boolean> {
    const game = await this.get(id);
    if (!game || game.isFinished) return false;
    this.store(game);
    return true;
  }

  async activeIds(): Promise<string[]> {
    return this.all()
      .filter((g) => g.isActive)
      .map((g) => String(g.id));
  }

  async dueDeadlines(now: number): Promise<number[]> {
    return this.all()
      .filter((g) => g.isActive && g.deadline() <= now)
      .map((g) => g.id);
  }

  async loadMany(ids: (string | number)[]): Promise<Game[]> {
    const games = await Promise.all(ids.map((id) => this.get(Number(id))));
    return games.filter(Boolean);
  }

  async counts(): Promise<{ active: number; lobby: number }> {
    const games = this.all();
    return {
      active: games.filter((g) => g.isActive).length,
      lobby: games.filter((g) => g.status === 'lobby').length,
    };
  }
}

export const fakeNotifier = () => ({
  bind: jest.fn(),
  toGame: jest.fn(),
  opponentDisconnected: jest.fn(),
});

export const fakePublisher = () => {
  const published: { gameId: number; event: GameDomainEvent }[] = [];
  return {
    published,
    types: () => published.map(({ event }) => event.type),
    publish: jest.fn((game: Game, events: GameDomainEvent[]) => {
      for (const event of events) published.push({ gameId: game.id, event });
    }),
  };
};

export const fakeMetrics = () => ({
  connectionOpened: jest.fn(),
  connectionClosed: jest.fn(),
  gameCreated: jest.fn(),
  gameEnded: jest.fn(),
  clockLeadership: jest.fn(),
  trackMove: jest.fn(<T>(fn: () => Promise<T>) => fn()),
});
