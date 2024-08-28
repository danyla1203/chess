import { Injectable } from '@nestjs/common';
import { InitedGameData, PlainBoardState } from '../../dto';
import { DrawGame, FiguresCellState, GameWithWinner } from './game.types';
import { Game } from './game';
import { GameAdapterI } from '../../game.adapter.interface';
import { Player } from '../Player';

@Injectable()
export class GameAdapter implements GameAdapterI {
  public plainBoardState(game: Game): PlainBoardState {
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

  public initedGameDataDto(userId: number, game: Game): InitedGameData {
    const plainObj = this.plainBoardState(game);
    return {
      board: plainObj,
      gameId: game.id,
      side: game.players.find((pl) => pl.userId === userId).side,
      maxTime: game.config.time,
      timeIncrement: game.config.timeIncrement,
    };
  }
  public gameWithWinnerDto(game: Game): GameWithWinner {
    const base = {
      id: game.id,
      moves: game.moves,
      config: game.config,
    };

    const plainWinner = {
      userId: game.winner.userId,
      name: game.winner.name,
      side: game.winner.side,
    };
    const plainLooser = {
      userId: game.looser.userId,
      name: game.looser.name,
      side: game.looser.side,
    };

    return { ...base, winner: plainWinner, looser: plainLooser };
  }
  public gameWithDrawDto(game: Game): DrawGame {
    const [pl1, pl2] = game.players.map((pl: Player) => {
      return {
        userId: pl.userId,
        name: pl.name,
        side: pl.side,
      };
    });

    return { id: game.id, moves: game.moves, config: game.config, pl1, pl2 };
  }
}
