import { GameProccessI } from "./GameProccess";
import { ControllerI } from "./sharedTypes";
import { MessageType } from "./WsHandler";

type Send = (type: MessageType, payload: any) => void;

export class DOMController implements ControllerI {
  Board: HTMLDivElement;
  proccess: GameProccessI
  send: Send;
  private selectedFigure?: string;
  
  constructor(board: HTMLDivElement, send: Send, proccess: GameProccessI) {
    this.proccess = proccess;
    this.Board = board;
    this.send = send;
  }

  private checkIsFigure(className: string) {
    console.log(className);
    return /^.+-[w,b]$/.test(className);
  }

  public handle() {
    this.Board.onclick = (e: any) => {
      let figure = e.target.className;
      let isFigure = this.checkIsFigure(figure);
      let cell = this.proccess.findCell(e.clientX, e.clientY);
      if (this.selectedFigure && !isFigure) {
        console.log('move');
        let result = this.proccess.moveFigure(this.selectedFigure, cell);
        if (result != 'err') {
          this.selectedFigure = null;
          this.send('turn', {cell: cell, figure: this.selectedFigure});
        }
      } else if (isFigure && figure != this.selectedFigure) {
        this.proccess.possibleMoves(figure, cell);
        this.selectedFigure = figure;
      }
    }
  }
}