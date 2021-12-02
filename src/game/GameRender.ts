import { ClientGameData } from '../initGame';
import { GameRenderI } from './GameProccess';
import { Cell, Figure, Black, White } from './sharedTypes';

export class GameRender implements GameRenderI {
  renderData: ClientGameData;
  constructor(data: ClientGameData) {
    this.renderData = data;
  }
  public findCellByCoord(side: 'w'|'b', x: number, y: number): Cell {
    if (side == 'w') {
      x -= this.renderData.boardData.coords.x;
      y -= this.renderData.boardData.coords.y;
    } else {
      let board = this.renderData.boardData.dom.getBoundingClientRect();
      y = (board.bottom - y);
      x = (board.right - x);
    }
    let letter;
    for (let symb in this.renderData.letterCoords) {
      let symbCoord = this.renderData.letterCoords[symb];
      if (x > symbCoord && x < symbCoord + this.renderData.cellMetrics.width) {
        letter = symb;
      }
    }
    let number;
    for (let num in this.renderData.numberCoords) {
      let numCoord = this.renderData.numberCoords[num];
      if (y > numCoord && y < numCoord + this.renderData.cellMetrics.height) {
        number = num;
      }
    }
    return `${letter}${number}`;
  }


  private setFigure(side: string, figureName: string, x: number, y: number) {
    const figure = document.createElement('div');
    if (/pawn./.test(figureName)) figure.classList.add('pawn');
    if (/R/.test(figureName)) figure.classList.add('rock');
    if (/K\d/.test(figureName)) figure.classList.add('knight');
    if (/B/.test(figureName)) figure.classList.add('bishop');
    if (/Q/.test(figureName)) figure.classList.add('queen');
    if (/Kn/.test(figureName)) figure.classList.add('king');
    figure.classList.add(side);
    figure.classList.add(figureName);
    figure.dataset.side = side;
    
    figure.style.top = y + 'px';
    figure.style.left = x + 'px';
    this.renderData.figuresDom.appendChild(figure);
  }
  public setFiguresOnBoard(transform: 'w'|'b', white: White, black: Black): void {
    this.renderData.figuresDom.innerHTML = '';
    for (let figure in white) {
      let [letter, number] = [white[figure][0], white[figure][1]];
      this.setFigure('w', figure, this.renderData.letterCoords[letter], this.renderData.numberCoords[number]);
    }
    for (let figure in black) {
      let [letter, number] = [black[figure][0], black[figure][1]];
      this.setFigure('b', figure, this.renderData.letterCoords[letter], this.renderData.numberCoords[number]);
    }
    if (transform == 'b') {
      this.renderData.boardData.dom.style.transform = 'rotate(180deg)';
      document.querySelectorAll<HTMLDivElement>('.figures div').forEach((elem) => {
        elem.style.transform = 'rotate(180deg)';
      })
    }
  }
  public removePossibleMoves(): void {
    document.querySelector<HTMLDivElement>('.moves').innerHTML = '';
  }
  public moveFigure(side: string, figure: Figure, cell: Cell) {
    let figureDom = document.querySelector<HTMLDivElement>(`.${figure}`);
    let [newLet, newNum] = [cell[0], cell[1]];
    figureDom.style.top = this.renderData.numberCoords[newNum] + 'px';
    figureDom.style.left = this.renderData.letterCoords[newLet] + 'px';
  }
  public renderPossibleMoves(moves: Cell[]) {
    let movesContainer = document.querySelector<HTMLDivElement>('.moves');
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
      movesContainer.appendChild(div);
      return div;
    });
    return divs;
  }
  public setStrikedFigure(playindSide: 'w'|'b', color: 'w'|'b', figure: Figure): void {
    const strikedDiv = document.createElement('div');
    strikedDiv.classList.add(figure.replace(/\d/, ''));
    strikedDiv.classList.add('striked');
    strikedDiv.classList.add(color);
    playindSide == 'b' ?
      strikedDiv.style.transform = 'rotate(180deg)': null;
    if (color == 'w') {
      document.querySelector<HTMLDivElement>('.striked .white').appendChild(strikedDiv);;
    } else {
      document.querySelector<HTMLDivElement>('.striked .black').appendChild(strikedDiv);
    }
  }
}
