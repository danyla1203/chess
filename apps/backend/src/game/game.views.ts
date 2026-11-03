import type { LobbyView } from '../game-read/views';
import { Game } from '../domain/game/entities/game';

export function lobbyView(game: Game): LobbyView {
  return {
    id: game.id,
    players: game.players.map(({ userId, name, side }) => ({
      userId,
      name,
      side,
    })),
    config: game.config,
  };
}
