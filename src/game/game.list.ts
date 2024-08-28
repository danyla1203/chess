import { Injectable } from '@nestjs/common';
import { Game, GameData } from './entities/game';
import { Client } from './entities';

@Injectable()
export class GameList {
  lobby: Game[];
  games: Game[];

  constructor() {
    this.lobby = [];
    this.games = [];
  }

  public addGameToLobby(game: Game): void {
    this.lobby.push(game);
  }
  public findInLobby(id: number): Game | null {
    return this.lobby.find((game) => game.id === id) || null;
  }
  public gameEnd(id: number) {
    this.games = this.games.filter((g) => g.id !== id);
  }

  public pushToStartedGames(gameId: number): void {
    const index: number = this.lobby.findIndex(
      (game: Game) => game.id === gameId,
    );
    this.games.push(this.lobby[index]);
    this.lobby.splice(index, 1);
  }
  public removeInitedGames({ userId }: Client): void {
    this.lobby = this.lobby.filter((game) => {
      return game.players.find((pl) => pl.userId !== userId);
    });
  }
  public findPendingClientGame({ userId }: Client): Game | null {
    const game = this.games.find((g) => {
      return g.players.find((pl) => pl.userId === userId);
    });
    return game?.isActive ? game : null;
  }
  public getLobby(): GameData[] {
    return this.lobby.map((game) => {
      return {
        id: game.id,
        players: game.players.map(({ userId, name, side }) => {
          return { userId, name, side };
        }),
        config: game.config,
      };
    });
  }
}
