import { GameInfo, Cell, Figure } from "./initGame";

export class Game {
  GameInfo: GameInfo;
  Letters: string[];
  makeTurn: (figure: Figure, cell: Cell) => any;
  waitForMessages: (callback: any) => void;
  constructor(gameInfo: GameInfo, makeTurn: (figure: Figure, cell: Cell) => any, receiveMessage: any) {
    this.GameInfo = gameInfo;
    this.makeTurn = makeTurn;
    this.waitForMessages = receiveMessage;
    this.Letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  }

  private isEnemyInCell(cell: Cell): boolean {
    for (let figure in this.GameInfo.oponentFigures) {
      if (this.GameInfo.oponentFigures[figure] === cell) return true;
    }
  }

  private checkIsCellEmpty(cell: string): boolean {
    if (parseInt(cell[1], 10) > 8) return false;
    for (let figure in this.GameInfo.figureCels) {
      if (this.GameInfo.figureCels[figure] === cell) return false;
    }
    for (let figure in this.GameInfo.oponentFigures) {
      if (this.GameInfo.oponentFigures[figure] === cell) return false;
    }
    return true;
  }


  private findNextLetter(letter: string): string[] {
    let result = [];
    for (let i = 0; i < this.Letters.length; i++) {
      if (this.Letters[i] == letter) {
        if (this.Letters[i - 1]) {
          result.push(this.Letters[i - 1]);
        } else { result.push(null) }
        if (this.Letters[i + 1]) {
          result.push(this.Letters[i + 1]);
        } else { result.push(null) }
      }
    }
    return result;
  }

  private pawnMove(currentCell: Cell): Cell[] {
    let [ letter, number ] = [currentCell[0], currentCell[1]];
    let num = parseInt(number);
    let possibleMoves: string[] = [];
    if (this.checkIsCellEmpty(`${letter}${num + 1}`)) {
      possibleMoves.push(`${letter}${num + 1}`);
    }
    let nextLetters = this.findNextLetter(letter);
    nextLetters[0] = `${nextLetters[0]}${num + 1}`;
    nextLetters[1] = `${nextLetters[1]}${num + 1}`;
    if (this.isEnemyInCell(nextLetters[0])) {
      possibleMoves.push(nextLetters[0]);
    }
    if (this.isEnemyInCell(nextLetters[1])) {
      possibleMoves.push(nextLetters[1]);
    }
    return possibleMoves;
  }
  private knighMove(currentCell: Cell): Cell[] {
    let [ letter, number ] = [currentCell[0], currentCell[1]];
    let num = parseInt(number, 10);
    let possibleMoves: string[] = [];
    let nextLetters = this.findNextLetter(letter);
    let nextLetterRight = this.findNextLetter(nextLetters[1])[1];
    let nextLetterLeft = this.findNextLetter(nextLetters[0])[0];
    console.log(nextLetters, 'nextLeeter[1]');
    nextLetterLeft = nextLetterLeft == letter ? null : nextLetterLeft;

    let cells: Cell[] = [
      `${nextLetters[1]}${num + 2}`,
      `${nextLetterRight}${num + 1}`,
      `${nextLetterRight}${num - 1}`,
      `${nextLetters[1]}${num - 2}`,
      `${nextLetters[0]}${num - 2}`,
      `${nextLetterLeft}${num - 1}`,
      `${nextLetterLeft}${num + 1}`,
      `${nextLetters[0]}${num + 2}`
    ];
    cells.map((cell: Cell) => {
      if (cell.length != 2 || cell[1] == '0') return;
      if (this.isEnemyInCell(cell)) possibleMoves.push(cell);
      else if (this.checkIsCellEmpty(cell)) possibleMoves.push(cell);
    })
    return possibleMoves;
  }

  private rockMove(currentCell: Cell): string[] {
    let [ letter, number ] = [currentCell[0], currentCell[1]];
    let num = parseInt(number, 10);
    let possibleMoves: string[] = [];

    for (let i = num + 1; i < 9; i++) {
      console.log(letter, i);
      if (this.isEnemyInCell(`${letter}${i}`)) {
        possibleMoves.push(`${letter}${i}`);
        break;
      } else if (!this.checkIsCellEmpty(`${letter}${i}`)) break;
      else possibleMoves.push(`${letter}${i}`);

    }
    for (let i = num - 1; i > 0; i--) {
      if (this.isEnemyInCell(`${letter}${i}`)) {
        possibleMoves.push(`${letter}${i}`);
        break;
      } else if (!this.checkIsCellEmpty(`${letter}${i}`)) break;
      else possibleMoves.push(`${letter}${i}`);
    }

    let letterIndex = this.Letters.findIndex((lett) => lett == letter);
    for (let i = letterIndex + 1; i < this.Letters.length; i++) {
      if (this.isEnemyInCell(`${this.Letters[i]}${num}`)) {
        possibleMoves.push(`${this.Letters[i]}${num}`);
        break;
      } else if (!this.checkIsCellEmpty(`${this.Letters[i]}${num}`)) break;
      else possibleMoves.push(`${this.Letters[i]}${num}`);
    }
    for (let i = letterIndex - 1; i >= 0; i--) {
      if (this.isEnemyInCell(`${this.Letters[i]}${num}`)) {
        possibleMoves.push(`${this.Letters[i]}${num}`);
        break;
      } else if (!this.checkIsCellEmpty(`${this.Letters[i]}${num}`)) break;
      else possibleMoves.push(`${this.Letters[i]}${num}`);
    }
    return possibleMoves;
  }
  private bishopMove(currentCell: Cell): Cell[] {
    let [ letter, number ] = [currentCell[0], currentCell[1]];
    let num = parseInt(number, 10);
    let letterIndex = this.Letters.findIndex((lett) => lett == letter);
    let possibleMoves: string[] = [];

    for (let i = letterIndex + 1, nextNum = num + 1; i < this.Letters.length; i++, nextNum++) {
      if (nextNum > 8) break;
      let cell = `${this.Letters[i]}${nextNum}`;
      if (this.isEnemyInCell(cell)) {
        possibleMoves.push(cell);
        break;
      } else if (!this.checkIsCellEmpty(cell)) break;
      else possibleMoves.push(cell);
    }
    console.log(possibleMoves);
    for (let i = letterIndex - 1, nextNum = num - 1; i >= 0; i--, nextNum--) {
      if (nextNum <= 0) break;
      let cell = `${this.Letters[i]}${nextNum}`;
      if (this.isEnemyInCell(cell)) {
        possibleMoves.push(cell);
        break;
      } else if (!this.checkIsCellEmpty(cell)) break;
      else possibleMoves.push(cell);
    }
    for (let i = letterIndex + 1, nextNum = num - 1; i < this.Letters.length; i++, nextNum--) {
      if (nextNum <= 0) break;
      let cell = `${this.Letters[i]}${nextNum}`;
      if (this.isEnemyInCell(cell)) {
        possibleMoves.push(cell);
        break;
      } else if (!this.checkIsCellEmpty(cell)) break;
      else possibleMoves.push(cell);
    }
    for (let i = letterIndex - 1, nextNum = num + 1; i >= 0; i--, nextNum++) {
      if (nextNum <= 0) break;
      let cell = `${this.Letters[i]}${nextNum}`;
      if (this.isEnemyInCell(cell)) {
        possibleMoves.push(cell);
        break;
      } else if (!this.checkIsCellEmpty(cell)) break;
      else possibleMoves.push(cell);
    }
    return possibleMoves;
  }
  private queenMove(currentCell: Cell): Cell[] {
    return [...this.rockMove(currentCell), ...this.bishopMove(currentCell)];
  }

  private createPossibleMoves(figure: Figure, currentCell: Cell): Cell[] {
    if (/pawn/.test(figure)) return this.pawnMove(currentCell);
    if (/R/.test(figure)) return this.rockMove(currentCell);
    if (/K/.test(figure)) return this.knighMove(currentCell);
    if (/B/.test(figure)) return this.bishopMove(currentCell);
    if (/Q/.test(figure)) return this.queenMove(currentCell);
    return [];
  }

  private renderPossibleMoves(moves: Cell[]) {
    let divs = moves.map((cell) => {
      let [letter, number] = [cell[0], cell[1]];
      let div = document.createElement('div');
      div.style.backgroundColor = 'gray';
      div.style.width = '75px';
      div.style.height = '75px';
      div.style.position = 'absolute';
      div.className = `possible-move-${cell}`
      div.style.left = this.GameInfo.letterCoords[letter] + 'px';
      div.style.top = this.GameInfo.numberCoords[number] + 'px';
      document.querySelector('.board').appendChild(div);
      return div;
    });
    return divs;
  }
  private findCellByCoord(x: number, y: number): string {
    let letter;
    for (let symb in this.GameInfo.letterCoords) {
      let symbCoord = this.GameInfo.letterCoords[symb];
      if (x > symbCoord && x < symbCoord + 75) {
        letter = symb;
      }
    }
    let number;
    for (let num in this.GameInfo.numberCoords) {
      let numCoord = this.GameInfo.numberCoords[num];
      if (y > numCoord && y < numCoord + 75) {
        number = num;
      }
    }
    return `${letter}${number}`;
  }

  private moveFigure(figure: Figure, newCell: Cell, possibleMoves: Cell[]) {
    let figureDom = document.querySelector<HTMLDivElement>(`.${figure}-${this.GameInfo.playingSide}`);
    let [newLet, newNum] = [newCell[0], newCell[1]];
    figureDom.style.top = this.GameInfo.numberCoords[newNum] + 'px';
    figureDom.style.left = this.GameInfo.letterCoords[newLet] + 'px';
  }

  private isPlayingFigure(figure: Figure): boolean {
    let reg = new RegExp(`-${this.GameInfo.playingSide}`);
    return reg.test(figure);
  }

  private strikeFigure(cell: Cell) {
    let oponent = this.GameInfo.playingSide === 'w' ? 'b' : 'w';
    for (let figure in this.GameInfo.oponentFigures) {
      if (this.GameInfo.oponentFigures[figure] == cell) {
        let figures = document.querySelector<HTMLDivElement>('.figures');
        figures.removeChild(document.querySelector(`.${figure}-${oponent}`));
        delete this.GameInfo.oponentFigures[figure];
        return figure;
      }
    }
  }

  private removePossibleMoves(moves: Cell[]): void {
    let board = this.GameInfo.boardData.dom;
    moves.map((cell) => {
      board.removeChild(board.querySelector(`.possible-move-${cell}`));
    });
  }

  start() {
    let isPlayerTurn = true;
    let possibleMoves: Cell[] = [];
    let figureSelected: any = null;
    let deadFigures: Figure[] = []; 

    this.waitForMessages((data: any) => {
      console.log(data);
    })

    this.GameInfo.boardData.dom.onclick = (e: any) => {
      let target = e.target.className;
      let newFigure = target == "board" || /possible-move/.test(target) ? null : target.replace(/-[w,b]/, '');
      if ((isPlayerTurn && !figureSelected) || newFigure && newFigure !== figureSelected.figure) {
        this.removePossibleMoves(possibleMoves);
        let figure: Figure = target;
        if (this.isPlayingFigure(figure)) {
          figure = figure.replace(/-[w,b]/, '');
        } else return;
        let currentCell: Cell = this.GameInfo.figureCels[figure];
        possibleMoves = this.createPossibleMoves(figure, currentCell);
        this.renderPossibleMoves(possibleMoves);
        figureSelected = { cell: currentCell, figure: figure };
      } else if (isPlayerTurn && figureSelected) {
        let clickX: number = e.clientX - this.GameInfo.boardData.coords.x;
        let clickY: number = e.clientY - this.GameInfo.boardData.coords.y;
        let moveTo: Cell = this.findCellByCoord(clickX, clickY);
        if (possibleMoves.find((move) => move === moveTo)) {
          this.moveFigure(figureSelected.figure, moveTo, possibleMoves);
          this.makeTurn(figureSelected.figure, moveTo);
          this.GameInfo.figureCels[figureSelected.figure] = moveTo;
          let striked = this.strikeFigure(moveTo);
          striked ? deadFigures.push(striked) : null;
          figureSelected = null;
          //isPlayerTurn = false;
          this.removePossibleMoves(possibleMoves);
          possibleMoves = [];
        }
      }
    }
  }
}
