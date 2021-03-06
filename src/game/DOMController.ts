import { Figure } from '../initGame';
import { GameProccessI } from './GameProccess';
import { ControllerI } from './sharedTypes';
import { MessageType } from './WsHandler';

type Send = (type: MessageType, payload: any) => void;
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

  public handle(): void {
    this.Board.onclick = (e: any) => {
      let figure = e.target.classList[2];
      let side = e.target.dataset.side;
      let isFigure = this.checkIsFigure(e.target);
      let cell = this.proccess.findCell(e.clientX, e.clientY);
      if (this.selectedFigure && (!isFigure || side != this.selectedFigure.side)) {
        let result = this.proccess.moveFigure(this.selectedFigure.side, this.selectedFigure.figure, cell);
        if (result != 'err') {
          this.send('turn', {cell: cell, figure: this.selectedFigure.figure});
          this.selectedFigure = null;
        }
      }  
      if (isFigure && figure != this.selectedFigure) {
        this.proccess.possibleMoves(side, figure, cell);
        this.selectedFigure = { figure: figure, side: side };
      }
    }
  }
}
