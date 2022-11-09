import { GameProccessI } from '../GameProccess';
import { WsHandlerI } from '../sharedTypes';
import { GameHandler, GameTypes } from './GameHandler';

export enum MessageType {
  Game = 'Game'
}

export type Message = {
  type: MessageType
  payload: any
}
export type Callback = (data: any) => void;
export enum RequestTypes {
  Game = 'Game',
  GameChat = 'GameChat'
}; 

export class WsHandler implements WsHandlerI {
  conn: WebSocket;
  GameHandler: GameHandler;
  constructor(conn: WebSocket, proccess: GameProccessI) {
    this.conn = conn;
    this.GameHandler = new GameHandler(this.send.bind(this), proccess);
  }

  public send(type: RequestTypes, body: any): void {
    this.conn.send(JSON.stringify({ type, body }));
  }

  public sendInitGameRequst(): void {
    this.send(RequestTypes.Game, {
      type: GameTypes.START_NEW,
      body: {}
    });
  }
  public handle(): void {
    this.conn.onmessage = (message: any) => {
      const parsedMessage: Message = JSON.parse(message.data);
      switch (parsedMessage.type) {
      case MessageType.Game:
        this.GameHandler.handle(parsedMessage.payload);
        break;
      }
    };
  }
}
