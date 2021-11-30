import { GameProccessI } from './GameProccess';
import { WsHandlerI, Board } from './sharedTypes';

type InitGame = {
  side: 'w'|'b';
  board: Board;
}

export type Response = {
  type: string;
  payload: any;
}
export type Callback = (data: any) => void;
export type MessageType = 'turn';  

export class WsHandler implements WsHandlerI {
  proccess: GameProccessI;
  conn: WebSocket;
  constructor(conn: WebSocket, proccess: GameProccessI) {
    this.proccess = proccess;
    this.conn = conn;
  }

  private onBoardUpdate(board: Board) {
    this.proccess.updateBoard(board);
    this.proccess.removePossibleMoves();
  }
  private initGame(initState: InitGame) {
    this.proccess.updateBoard(initState.board);
    this.proccess.sideToPlay = initState.side;
  }

  public send(type: MessageType, payload: any) {
    this.conn.send(JSON.stringify({
      type: type,
      payload: payload
    }))
  }
  public handle() {
    this.conn.onmessage = (message: any) => {
      const res: Response = JSON.parse(message.data);
      switch(res.type) {
        case 'INIT_GAME':
          this.initGame(res.payload);
          break;
        case 'UPDATE_STATE':
          this.onBoardUpdate(res.payload);
          break;
      } 
    }
  }
}
