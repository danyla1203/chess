import { ClientGameData } from "../initGame";
import { GameRenderI } from "./GameProccess";
import { Board, Cell, Figure, Black, White } from "./sharedTypes";

export class GameRender implements GameRenderI {
  renderData: ClientGameData;
  constructor(data: ClientGameData) {
    this.renderData = data;
  }
  public findCellByCoord(x: number, y: number): Cell {
    x -= this.renderData.boardData.coords.x;
    y -= this.renderData.boardData.coords.y;
    let letter;
    for (let symb in this.renderData.letterCoords) {
      let symbCoord = this.renderData.letterCoords[symb];
      if (x > symbCoord && x < symbCoord + 75) {
        letter = symb;
      }
    }
    let number;
    for (let num in this.renderData.numberCoords) {
      let numCoord = this.renderData.numberCoords[num];
      if (y > numCoord && y < numCoord + 75) {
        number = num;
      }
    }
    return `${letter}${number}`;
  }


  private setFigure(side: string, figureName: string, x: number, y: number) {
    const figure = document.createElement('div');
    figure.className = `${figureName}-${side}`;
    figure.style.top = y + 'px';
    figure.style.left = x + 'px';
    figure.innerText = figureName;
    this.renderData.figuresDom.appendChild(figure);
  }
  public setFiguresOnBoard(white: White, black: Black): void {
    this.renderData.figuresDom.innerHTML = '';
    for (let figure in white) {
      let [letter, number] = [white[figure][0], white[figure][1]];
      this.setFigure('w', figure, this.renderData.letterCoords[letter], this.renderData.numberCoords[number]);
    }
    for (let figure in black) {
      let [letter, number] = [black[figure][0], black[figure][1]];
      this.setFigure('b', figure, this.renderData.letterCoords[letter], this.renderData.numberCoords[number]);
    }
  }
  public removePossibleMoves(moves: Cell[]): void {
    let board = this.renderData.boardData.dom;
    moves.map((cell) => {
      board.removeChild(board.querySelector(`.possible-move-${cell}`));
    });
  }
  public moveFigure(side: string, figure: Figure, cell: Cell) {
    let figureDom = document.querySelector<HTMLDivElement>(`.${figure}`);
    let [newLet, newNum] = [cell[0], cell[1]];
    figureDom.style.top = this.renderData.numberCoords[newNum] + 'px';
    figureDom.style.left = this.renderData.letterCoords[newLet] + 'px';
  }
  public renderPossibleMoves(moves: Cell[]) {
    let divs = moves.map((cell) => {
      let [letter, number] = [cell[0], cell[1]];
      let div = document.createElement('div');
      div.style.backgroundColor = 'gray';
      div.style.width = '75px';
      div.style.height = '75px';
      div.style.position = 'absolute';
      div.className = `possible-move-${cell}`
      div.style.left = this.renderData.letterCoords[letter] + 'px';
      div.style.top = this.renderData.numberCoords[number] + 'px';
      this.renderData.boardData.dom.appendChild(div);
      return div;
    });
    return divs;
  }
}