import { Board, Cell, Figure } from './game.types';

export class HighlightedCels {
  private Board: Board;

  private playingSide: 'w' | 'b';

  private Letters: string[];

  public setData(board: Board, playindSide: 'w' | 'b') {
    this.Board = board;
    this.playingSide = playindSide;
  }

  public setUpdatedBoard(board: Board) {
    this.Board = board;
  }

  constructor() {
    this.Letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  }

  private checkIsCellEmpty(cell: string): boolean {
    if (parseInt(cell[1], 10) > 8) return false;
    for (const figure in this.Board.white) {
      if (this.Board.white[figure] === cell) return false;
    }
    for (const figure in this.Board.black) {
      if (this.Board.black[figure] === cell) return false;
    }
    return true;
  }

  private isEnemyInCell(cell: Cell): boolean {
    if (this.playingSide === 'w') {
      for (const figure in this.Board.black) {
        if (this.Board.black[figure] === cell) return true;
      }
    } else {
      for (const figure in this.Board.white) {
        if (this.Board.white[figure] === cell) return true;
      }
    }
    return false;
  }

  private findNextLetter(letter: string): string[] {
    const result = [];
    for (let i = 0; i < this.Letters.length; i++) {
      if (this.Letters[i] === letter) {
        if (this.Letters[i - 1]) {
          result.push(this.Letters[i - 1]);
        } else {
          result.push(null);
        }
        if (this.Letters[i + 1]) {
          result.push(this.Letters[i + 1]);
        } else {
          result.push(null);
        }
      }
    }
    return result;
  }

  private pawnMove(currentCell: Cell): Cell[] {
    const [letter, number] = [currentCell[0], currentCell[1]];
    const num = parseInt(number);
    const possibleMoves: string[] = [];
    let sideToMove = 0;
    if (this.playingSide === 'w') {
      sideToMove = 1;
    } else {
      sideToMove = -1;
    }
    if (this.checkIsCellEmpty(`${letter}${num + sideToMove}`)) {
      possibleMoves.push(`${letter}${num + sideToMove}`);
    }
    const nextLetters = this.findNextLetter(letter);
    nextLetters[0] = `${nextLetters[0]}${num + sideToMove}`;
    nextLetters[1] = `${nextLetters[1]}${num + sideToMove}`;
    if (this.isEnemyInCell(nextLetters[0])) {
      possibleMoves.push(nextLetters[0]);
    }
    if (this.isEnemyInCell(nextLetters[1])) {
      possibleMoves.push(nextLetters[1]);
    }
    if (this.playingSide === 'w' && num === 2) {
      possibleMoves.push(`${letter}${num + 2}`);
    } else if (this.playingSide === 'b' && num === 7) {
      possibleMoves.push(`${letter}${num - 2}`);
    }
    return possibleMoves;
  }

  private knighMove(currentCell: Cell): Cell[] {
    const [letter, number] = [currentCell[0], currentCell[1]];
    const num = parseInt(number, 10);
    const possibleMoves: string[] = [];
    const nextLetters = this.findNextLetter(letter);
    const nextLetterRight = this.findNextLetter(nextLetters[1])[1];
    let nextLetterLeft = this.findNextLetter(nextLetters[0])[0];
    nextLetterLeft = nextLetterLeft === letter ? null : nextLetterLeft;

    const cells: Cell[] = [
      `${nextLetters[1]}${num + 2}`,
      `${nextLetterRight}${num + 1}`,
      `${nextLetterRight}${num - 1}`,
      `${nextLetters[1]}${num - 2}`,
      `${nextLetters[0]}${num - 2}`,
      `${nextLetterLeft}${num - 1}`,
      `${nextLetterLeft}${num + 1}`,
      `${nextLetters[0]}${num + 2}`,
    ];
    for (const cell of cells) {
      if (cell.length !== 2 || cell[1] === '0') return [];
      if (this.isEnemyInCell(cell)) possibleMoves.push(cell);
      else if (this.checkIsCellEmpty(cell)) possibleMoves.push(cell);
    }
    return possibleMoves;
  }

  private rockMove(currentCell: Cell): string[] {
    const [letter, number] = [currentCell[0], currentCell[1]];
    const num = parseInt(number, 10);
    const possibleMoves: string[] = [];

    for (let i = num + 1; i < 9; i++) {
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

    const letterIndex = this.Letters.findIndex((lett) => lett === letter);
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
    const [letter, number] = [currentCell[0], currentCell[1]];
    const num = parseInt(number, 10);
    const letterIndex = this.Letters.findIndex((lett) => lett === letter);
    const possibleMoves: string[] = [];

    for (
      let i = letterIndex + 1, nextNum = num + 1;
      i < this.Letters.length;
      i++, nextNum++
    ) {
      if (nextNum > 8) break;
      const cell = `${this.Letters[i]}${nextNum}`;
      if (this.isEnemyInCell(cell)) {
        possibleMoves.push(cell);
        break;
      } else if (!this.checkIsCellEmpty(cell)) break;
      else possibleMoves.push(cell);
    }
    for (let i = letterIndex - 1, nextNum = num - 1; i >= 0; i--, nextNum--) {
      if (nextNum <= 0) break;
      const cell = `${this.Letters[i]}${nextNum}`;
      if (this.isEnemyInCell(cell)) {
        possibleMoves.push(cell);
        break;
      } else if (!this.checkIsCellEmpty(cell)) break;
      else possibleMoves.push(cell);
    }
    for (
      let i = letterIndex + 1, nextNum = num - 1;
      i < this.Letters.length;
      i++, nextNum--
    ) {
      if (nextNum <= 0) break;
      const cell = `${this.Letters[i]}${nextNum}`;
      if (this.isEnemyInCell(cell)) {
        possibleMoves.push(cell);
        break;
      } else if (!this.checkIsCellEmpty(cell)) break;
      else possibleMoves.push(cell);
    }
    for (let i = letterIndex - 1, nextNum = num + 1; i >= 0; i--, nextNum++) {
      if (nextNum <= 0) break;
      const cell = `${this.Letters[i]}${nextNum}`;
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

  private getCellsAround(cell: Cell): Cell[] {
    const [letter, number] = cell;
    const [leftLetter, rightLetter] = this.findNextLetter(letter);
    const nextNum = parseInt(number, 10) + 1;
    const prevNum = parseInt(number, 10) - 1;
    const result: Cell[] = [
      `${letter}${nextNum}`,
      `${letter}${prevNum}`,
      `${rightLetter}${nextNum}`,
      `${rightLetter}${prevNum}`,
      `${leftLetter}${nextNum}`,
      `${leftLetter}${prevNum}`,
      `${leftLetter}${number}`,
      `${rightLetter}${number}`,
    ];
    for (let i = 0; i < result.length; i++) {
      const num = result[i][1];
      if (parseInt(num) > 8 || parseInt(num) < 1 || result[i].length > 2) {
        result.splice(i, 1);
      }
    }
    return result;
  }

  private knMove(currentCell: Cell): Cell[] {
    const cells = this.getCellsAround(currentCell);
    for (let i = 0; i < cells.length; i++) {
      if (!this.checkIsCellEmpty(cells[i]) && !this.isEnemyInCell(cells[i])) {
        cells.splice(i, 1);
        i--;
      }
    }
    return cells;
  }

  public createPossibleMoves(figure: Figure, currentCell: Cell): Cell[] {
    if (/pawn/.test(figure)) return this.pawnMove(currentCell);
    if (/R/.test(figure)) return this.rockMove(currentCell);
    if (/Kn/.test(figure)) return this.knMove(currentCell);
    if (/K/.test(figure)) return this.knighMove(currentCell);
    if (/B/.test(figure)) return this.bishopMove(currentCell);
    if (/Q/.test(figure)) return this.queenMove(currentCell);

    return [];
  }
}
