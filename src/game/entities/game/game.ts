import { ConflictException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ClockState, CompletedMove } from '../../dto';
import { GameEnd } from '../../EmitTypes';
import { GameProcess } from './process/game.process';
import { Client } from '../Client';
import { Player } from '../Player';
import {
  Cell,
  Config,
  Figure,
  GameSnapshot,
  GameStatus,
  Move,
} from './game.types';
import { GameChat } from './game.chat';

export class Game {
  id: number;
  matchId: string = randomUUID();
  status: GameStatus = 'lobby';
  endReason: GameEnd | null = null;
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
  turnStartedAt: number | null = null;
  createdAt: number = Date.now();

  constructor(creator: Client, config: Config, id = 0) {
    this.id = id;

    const side: 'w' | 'b' =
      config.side === 'rand' ? (Math.random() > 0.5 ? 'w' : 'b') : config.side;

    this.players = [new Player(creator, side, config.time)];
    this.config = config;
  }

  get isActive(): boolean {
    return this.status === 'active';
  }

  get isFinished(): boolean {
    return this.status === 'ended' || this.status === 'cancelled';
  }

  public findPlayer(userId: number): Player | undefined {
    return this.players.find((pl) => pl.userId === userId);
  }

  public opponentOf(userId: number): Player | undefined {
    return this.players.find((pl) => pl.userId !== userId);
  }

  public addPlayer(client: Client): Player {
    const pickedSide = this.players[0].side;
    const side = pickedSide === 'w' ? 'b' : 'w';
    const player: Player = new Player(client, side, this.config.time);
    this.players.push(player);
    return player;
  }

  public start(now = Date.now()): void {
    this.status = 'active';
    this.turnStartedAt = now;
  }

  public cancel(): void {
    this.status = 'cancelled';
  }

  public activePlayer(): Player | undefined {
    return this.players.find((pl) => pl.side === this.process.turnSide);
  }

  public remainingTime(player: Player, now = Date.now()): number {
    if (!this.isActive || player !== this.activePlayer()) return player.time;
    return player.time - (now - this.turnStartedAt);
  }

  public times(now = Date.now()): { w: number; b: number } {
    const result = { w: 0, b: 0 };
    for (const pl of this.players) {
      result[pl.side] = Math.max(0, this.remainingTime(pl, now));
    }
    return result;
  }

  public clockState(now = Date.now()): ClockState {
    return {
      ...this.times(now),
      running: this.isActive ? (this.activePlayer()?.side ?? null) : null,
      serverNow: now,
    };
  }

  public deadline(): number | null {
    if (!this.isActive) return null;
    return this.turnStartedAt + this.activePlayer().time;
  }

  public isTimeOver(now = Date.now()): boolean {
    const active = this.activePlayer();
    return this.isActive && !!active && this.remainingTime(active, now) <= 0;
  }

  private freezeClock(now: number): void {
    const active = this.activePlayer();
    if (this.isActive && active) {
      active.time = Math.max(0, this.remainingTime(active, now));
    }
    this.turnStartedAt = null;
  }

  public endGame(
    winner: Player,
    looser: Player,
    reason: GameEnd,
    now = Date.now(),
  ): void {
    this.freezeClock(now);
    this.status = 'ended';
    this.endReason = reason;
    this.winner = winner;
    this.looser = looser;
  }

  public endGameByDraw(now = Date.now()): void {
    this.freezeClock(now);
    this.status = 'ended';
    this.endReason = GameEnd.draw;
  }

  public endByTimeout(now = Date.now()): { winner: Player; looser: Player } {
    const looser = this.activePlayer();
    const winner = this.opponentOf(looser.userId);
    this.endGame(winner, looser, GameEnd.timeout, now);
    looser.time = 0;
    return { winner, looser };
  }

  public setDrawProposeFrom(side: 'w' | 'b'): void {
    this.draw[side] = true;
  }
  public rejectDraw(): void {
    this.draw = { w: false, b: false };
  }

  public addTimeTo(target: Player, inc: number): void {
    const pl = this.players.find((player) => player.userId === target.userId);
    pl.time += inc;
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
    now = Date.now(),
  ): { result: CompletedMove; prevCell: Cell; side: 'w' | 'b' } {
    if (!this.isActive) throw new ConflictException('Game is not active');

    const player = this.findPlayer(playerId);
    if (player.side !== this.process.turnSide) {
      throw new ConflictException('Not your turn');
    }
    if (this.isTimeOver(now)) throw new ConflictException('Time is over');

    const from: Cell = this.process.getBoard().board.get(figure);
    const result = this.process.makeTurn(figure, cell);

    player.time = this.remainingTime(player, now) + this.config.timeIncrement;
    this.turnStartedAt = now;

    this.saveMove(figure, cell, from, result);
    this.process.store.setNextTurnSide();
    return { result, prevCell: from, side: player.side };
  }

  public toSnapshot(): GameSnapshot {
    return {
      id: this.id,
      matchId: this.matchId,
      status: this.status,
      endReason: this.endReason,
      config: this.config,
      players: this.players.map((pl) => pl.toSnapshot()),
      turnStartedAt: this.turnStartedAt,
      createdAt: this.createdAt,
      state: this.process.store.toSnapshot(),
      moves: this.moves,
      chat: this.chat.toSnapshot(),
      draw: this.draw,
      winnerId: this.winner?.userId ?? null,
      looserId: this.looser?.userId ?? null,
    };
  }

  public static fromSnapshot(snapshot: GameSnapshot): Game {
    const game = Object.create(Game.prototype) as Game;
    game.id = snapshot.id;
    game.matchId = snapshot.matchId;
    game.status = snapshot.status;
    game.endReason = snapshot.endReason as GameEnd | null;
    game.config = snapshot.config;
    game.players = snapshot.players.map((pl) => Player.fromSnapshot(pl));
    game.turnStartedAt = snapshot.turnStartedAt;
    game.createdAt = snapshot.createdAt;
    game.process = GameProcess.fromSnapshot(snapshot.state);
    game.moves = snapshot.moves;
    game.chat = GameChat.fromSnapshot(snapshot.chat);
    game.draw = snapshot.draw;
    game.winner = game.findPlayer(snapshot.winnerId) ?? null;
    game.looser = game.findPlayer(snapshot.looserId) ?? null;
    return game;
  }
}
