import { Figure } from '../initGame';
import { GameProccessI } from './GameProccess';
import { ControllerI, GameRequestTypes } from './sharedTypes';
import { RequestTypes } from './wsHandlers/WsHandler';

type Send = (type: RequestTypes, payload: any) => void;
type SelectedFigure = {
  side: 'w'|'b'
  figure: Figure
}
export class DOMController implements ControllerI {
  Board: HTMLDivElement;
  proccess: GameProccessI;
  send: Send;
  private selectedFigure?: SelectedFigure;
  
  constructor(board: HTMLDivElement, send: Send, proccess: GameProccessI) {
    this.proccess = proccess;
    this.Board = board;
    this.send = send;
  }

  private checkIsFigure(figure: HTMLDivElement): boolean {
    return /w|b/.test(figure.dataset.side);
  }
  private sendTurnRequest(gameId: string, body: any) {
    this.send(RequestTypes.Game, { type: GameRequestTypes.MAKE_TURN, gameId, body: body });
  } 

  public handle(): void {
    this.Board.onclick = (e: any) => {
      let figure = e.target.classList[2];
      let side = e.target.dataset.side;
      let isFigure = this.checkIsFigure(e.target);
      let cell = this.proccess.findCell(e.clientX, e.clientY);
      if (this.selectedFigure && (!isFigure || side != this.selectedFigure.side)) {
        let result = this.proccess.moveFigure(this.selectedFigure.side, this.selectedFigure.figure, cell);
        if (result != 'err') {
          this.sendTurnRequest(this.proccess.gameId, { cell: cell, figure: this.selectedFigure.figure });
          this.selectedFigure = null;
        }
      }  
      if (isFigure && figure != this.selectedFigure) {
        this.proccess.possibleMoves(side, figure, cell);
        this.selectedFigure = { figure: figure, side: side };
      }
    };
  }
}
