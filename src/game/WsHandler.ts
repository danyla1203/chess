import { GameProccessI } from './GameProccess';
import { WsHandlerI, Board, Striked, ShahData, MateData } from './sharedTypes';

type InitGame = {
  side: 'w'|'b'
  board: Board
}
export type Response = {
  type: string
  payload: any
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

  private onBoardUpdate(board: Board): void {
    this.proccess.updateBoard(board);
    this.proccess.removePossibleMoves();
  }
  private initGame(initState: InitGame): void {
    this.proccess.sideToPlay = initState.side;
    this.proccess.updateBoard(initState.board);
  }
  private strike(striked: Striked): void {
    this.proccess.removeFigure(striked);
    this.proccess.showStriked(striked);
  }
  private shah(shahData: ShahData): void {
    this.proccess.highlightFigure(shahData);
  }
  private mate(mateData: MateData): void {
    this.proccess.setMate(mateData);
  }

  public send(type: MessageType, payload: any): void {
    this.conn.send(JSON.stringify({
      type: type,
      payload: payload
    }))
  }
  public handle(): void {
    this.conn.onmessage = (message: any) => {
      const res: Response = JSON.parse(message.data);
      switch(res.type) {
        case 'INIT_GAME':
          this.initGame(res.payload);
          break;
        case 'UPDATE_STATE':
          this.onBoardUpdate(res.payload);
          break;
        case "STRIKE":
          this.strike(res.payload);
          break;
        case 'SHAH':
          this.shah(res.payload);
          break;
        case 'MATE':
          this.mate(res.payload);
          break;
      } 
    }
  }
}
