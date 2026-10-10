import { ConflictException } from '@nestjs/common';
import { CompletedMove } from '../../dto';
import { GameProcess } from './process/game.process';
import { Client } from '../Client';
import { Player } from '../Player';
import { Cell, Config, Figure, Move } from './game.types';
import { GameChat } from './game.chat';

export class Game {
  id: number;
  isActive = false;
  players: Player[];
  config: Config;
  process: GameProcess = new GameProcess();
  chat: GameChat = new GameChat();
  moves: Move[] = [];
  winner: null | Player = null;
  looser: null | Player = null;
  draw: {
    w: boolean;
    b: boolean;
  } = { w: false, b: false };
  endGameByTimeoutCb: (
    game: Game,
    winer: Player,
    looser: Player,
  ) => Promise<void>;

  constructor(creator: Client, config: Config, gameEndCallback) {
    this.endGameByTimeoutCb = gameEndCallback;
    this.id = Math.floor(Math.random() * 100000);

    const side: 'w' | 'b' =
      config.side === 'rand' ? (Math.random() > 0.5 ? 'w' : 'b') : config.side;

    const player = new Player(creator, side, config.time);
    this.players = [player];
    this.config = config;
  }

  public addPlayer(client: Client): Player {
    const pickedSide = Object.values(this.players)[0].side;
    const side = pickedSide === 'w' ? 'b' : 'w';
    const player: Player = new Player(client, side, this.config.time);
    this.players.push(player);
    return player;
  }

  public endGame(winner: Player, looser: Player): void {
    clearInterval(winner.intervalLabel);
    clearInterval(looser.intervalLabel);
    this.isActive = false;
    this.winner = winner;
    this.looser = looser;
  }
  public endGameByDraw(): void {
    const [pl1, pl2] = Object.values(this.players);
    clearInterval(pl1.intervalLabel);
    clearInterval(pl2.intervalLabel);
    this.isActive = false;
  }
  public setDrawProposeFrom(side: 'w' | 'b'): void {
    this.draw[side] = true;
  }
  public rejectDraw(): void {
    this.draw = { w: false, b: false };
  }

  public addTimeTo(target: Player, inc): void {
    const pl = this.players.find((player) => player.userId === target.userId);
    pl.time += inc;
  }

  public async timerTick(active: Player, waiter: Player): Promise<void> {
    const white = active.side === 'w' ? active : waiter;
    const black = active.side === 'b' ? active : waiter;
    active.time -= 1000;
    if (active.time <= 0) {
      this.endGame(waiter, active);
      await this.endGameByTimeoutCb(this, waiter, active);
    }
    for (const pl of this.players) {
      pl.timeTickEvent({ w: white.time, b: black.time });
    }
  }
  public changeTickingSide(next: Player, old: Player): void {
    clearInterval(old.intervalLabel);
    old.turningPlayer = false;
    old.time += this.config.timeIncrement;

    next.turningPlayer = true;
    next.intervalLabel = setInterval(() => {
      this.timerTick.call(this, next, old);
    }, 1000);
  }
  public resetTicking(): void {
    const [pl1, pl2] = this.players;
    clearInterval(pl1.intervalLabel);
    clearInterval(pl2.intervalLabel);
    const { active, waiter } = pl1.turningPlayer
      ? { active: pl1, waiter: pl2 }
      : { active: pl2, waiter: pl1 };
    active.intervalLabel = setInterval(() => {
      this.timerTick.call(this, active, waiter);
    }, 1000);
  }

  private saveMove(
    figure: Figure,
    to: Cell,
    from: Cell,
    completedMove: CompletedMove,
  ): void {
    this.moves.push({
      side: this.process.turnSide,
      figure,
      from,
      to,
      ...completedMove,
    });
  }

  public makeTurn(
    playerId: number,
    figure: Figure,
    cell: Cell,
  ): { result: CompletedMove; prevCell: Cell; side: 'w' | 'b' } {
    if (!this.isActive) throw new ConflictException('Game is not active');

    const player = this.players.find(({ userId }) => playerId === userId);
    if (player.side !== this.process.turnSide) {
      throw new ConflictException('Not your turn');
    }

    const from: Cell = this.process.getBoard().board.get(figure);
    const result = this.process.makeTurn(figure, cell);

    const nextPlayer = this.players.find(
      (player) => player.userId !== playerId,
    );
    this.changeTickingSide(nextPlayer, player);

    this.saveMove(figure, cell, from, result);
    this.process.store.setNextTurnSide();
    return { result, prevCell: from, side: player.side };
  }

  public start(): void {
    this.isActive = true;
    const whitePlayer = this.players.find((player) => player.side === 'w');
    const blackPlayer = this.players.find((player) => player.side === 'b');
    blackPlayer.time -= this.config.timeIncrement;
    this.changeTickingSide(whitePlayer, blackPlayer);
  }
}
