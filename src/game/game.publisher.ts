import type { Game, GameDomainEvent } from '../domain/game/entities/game';

export abstract class GamePublisher {
  abstract publish(game: Game, events: GameDomainEvent[]): void;
}
