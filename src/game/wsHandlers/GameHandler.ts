import { GameProccessI } from '../GameProccess';
import { Board, Striked, ShahData, MateData } from '../sharedTypes';

type InitGame = {
  side: 'w'|'b'
  board: Board,
  gameId: string
}
export type Response = {
  type: string
  payload: any
}
export type Callback = (data: any) => void;
export enum RequestTypes {
  Game = 'Game',
  GameChat = 'GameChat'
}; 

export enum GameTypes {
  START_NEW = 'START_NEW',
  CONNECT_TO_EXISTING_GAME = 'CONNECT_TO_EXISTING_GAME',
  MAKE_TURN = 'MAKE_TURN'
}

export class GameHandler {
  proccess: GameProccessI;
  send: (type: RequestTypes, payload: any) => void;
  conn: WebSocket;
  constructor(send: (type: RequestTypes, payload: any) => void, proccess: GameProccessI) {
    this.proccess = proccess;
    this.send = send;
  }

  private onBoardUpdate(board: Board): void {
    this.proccess.updateBoard(board);
    this.proccess.removePossibleMoves();
  }
  private initGame(initState: InitGame): void {
    this.proccess.sideToPlay = initState.side;
    this.proccess.gameId = initState.gameId;
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

  public sendInitGameRequst(): void {
    
  }
  public handle(message: any): void {
    console.log(message);
    switch (message.type) {
    case 'INIT_GAME':
      this.initGame(message.payload);
      break;
    case 'UPDATE_STATE':
      this.onBoardUpdate(message.payload);
      break;
    case 'STRIKE':
      this.strike(message.payload);
      break;
    case 'SHAH':
      this.shah(message.payload);
      break;
    case 'MATE':
      this.mate(message.payload);
      break;
    } 
  }
}
