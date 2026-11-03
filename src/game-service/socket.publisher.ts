import { Inject, Injectable } from '@nestjs/common';
import type { Emitter } from '@socket.io/redis-emitter';
import {
  Game as GameEvent,
  GameEnd,
  Lobby,
  room,
  userRoom,
} from '../domain/game/EmitTypes';
import type { Game, GameDomainEvent } from '../domain/game/entities/game';
import type { GameAdapterI } from '../game/game.adapter.interface';
import { GamePublisher } from '../game/game.publisher';
import { lobbyView } from '../game/game.views';
import { SOCKET_EMITTER } from './socket.emitter';

@Injectable()
export class SocketEventPublisher extends GamePublisher {
  constructor(
    @Inject(SOCKET_EMITTER) private readonly io: Emitter,
    @Inject('GameAdapterI') private readonly adapter: GameAdapterI,
  ) {
    super();
  }

  public publish(game: Game, events: GameDomainEvent[]): void {
    for (const event of events) this.emit(game, event);
  }

  private emit(game: Game, event: GameDomainEvent): void {
    const gameRoom = room(game.id);
    switch (event.type) {
      case 'created': {
        const creator = userRoom(game.players[0].userId);
        this.io.in(creator).socketsJoin(gameRoom);
        this.io.to(creator).emit(GameEvent.created, { gameId: game.id });
        this.io.emit(Lobby.added, lobbyView(game));
        break;
      }
      case 'cancelled':
        this.io.emit(Lobby.removed, { gameId: game.id });
        break;
      case 'started':
        for (const pl of game.players) {
          this.io.in(userRoom(pl.userId)).socketsJoin(gameRoom);
          this.io
            .to(userRoom(pl.userId))
            .emit(
              GameEvent.init,
              this.adapter.initedGameDataDto(pl.userId, game),
            );
        }
        this.io
          .to(game.players.map((pl) => userRoom(pl.userId)))
          .emit(GameEvent.start);
        this.io.emit(Lobby.removed, { gameId: game.id });
        break;
      case 'moved':
        this.io.to(gameRoom).emit(GameEvent.boardUpdate, {
          effect: event.result,
          update: {
            figure: event.figure,
            cell: event.cell,
            prevCell: event.prevCell,
            side: event.side,
          },
          clock: game.clockState(),
        });
        break;
      case 'chatPosted':
        this.io.to(gameRoom).emit(GameEvent.message, event.message);
        break;
      case 'drawProposed':
        this.io.to(gameRoom).emit(GameEvent.drawPropose, game.draw);
        break;
      case 'drawRejected':
        this.io.to(gameRoom).emit(GameEvent.rejectDraw, game.draw);
        break;
      case 'timeAdded':
        this.io.to(gameRoom).emit(GameEvent.addTime, game.clockState());
        break;
      case 'ended':
        this.ended(game, event.reason);
        break;
    }
  }

  private ended(game: Game, reason: GameEnd): void {
    if (reason === GameEnd.mate) return;
    if (reason === GameEnd.draw) {
      this.io.to(room(game.id)).emit(GameEvent.end, {
        reason,
        game: this.adapter.gameWithDrawDto(game),
      });
      return;
    }
    const dto = this.adapter.gameWithWinnerDto(game);
    this.io
      .to(userRoom(game.winner.userId))
      .emit(GameEvent.end, { winner: true, game: dto, reason });
    this.io
      .to(userRoom(game.looser.userId))
      .emit(GameEvent.end, { winner: false, game: dto, reason });
  }
}
