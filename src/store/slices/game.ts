import { createSlice } from '@reduxjs/toolkit';

export type Figure = string;
export type Cell = string;
type White = {[index: Figure]: Cell}
type Black = White;

export type Board = {
  white: White
  black: Black
}

class HighlightedCels {
  private Board: Board;
  private playingSide: 'w'|'b';
  private Letters: string[];

  public setData(board: Board, playindSide: 'w'|'b') {
    this.Board = board;
    this.playingSide = playindSide;
  }
  public setUpdatedBoard(board: Board) {
    this.Board = board;
  }
  constructor() {
    this.Letters = [ 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h' ];
  }
  private checkIsCellEmpty(cell: string): boolean {
    if (parseInt(cell[1], 10) > 8) return false;
    for (let figure in this.Board.white) {
      if (this.Board.white[figure] === cell) return false;
    }
    for (let figure in this.Board.black) {
      if (this.Board.black[figure] === cell) return false;
    }
    return true;
  }
  private isEnemyInCell(cell: Cell): boolean {
    if (this.playingSide == 'w') {
      for (let figure in this.Board.black) {
        if (this.Board.black[figure] === cell) return true;
      }
    } else {
      for (let figure in this.Board.white) {
        if (this.Board.white[figure] === cell) return true;
      }
    }
  }
  private findNextLetter(letter: string): string[] {
    let result = [];
    for (let i = 0; i < this.Letters.length; i++) {
      if (this.Letters[i] == letter) {
        if (this.Letters[i - 1]) {
          result.push(this.Letters[i - 1]);
        } else { result.push(null); }
        if (this.Letters[i + 1]) {
          result.push(this.Letters[i + 1]);
        } else { result.push(null); }
      }
    }
    return result;
  }
  private pawnMove(currentCell: Cell): Cell[] {
    let [ letter, number ] = [ currentCell[0], currentCell[1] ];
    let num = parseInt(number);
    let possibleMoves: string[] = [];
    let sideToMove = 0;
    if (this.playingSide == 'w') {
      sideToMove = 1;
    } else {
      sideToMove = -1;
    }
    if (this.checkIsCellEmpty(`${letter}${num + sideToMove}`)) {
      possibleMoves.push(`${letter}${num + sideToMove}`);
    } 
    let nextLetters = this.findNextLetter(letter);
    nextLetters[0] = `${nextLetters[0]}${num + sideToMove}`;
    nextLetters[1] = `${nextLetters[1]}${num + sideToMove}`;
    if (this.isEnemyInCell(nextLetters[0])) {
      possibleMoves.push(nextLetters[0]);
    }
    if (this.isEnemyInCell(nextLetters[1])) {
      possibleMoves.push(nextLetters[1]);
    }
    if (this.playingSide == 'w' && num == 2) {
      possibleMoves.push(`${letter}${num + 2}`);
    } else if (this.playingSide == 'b' && num == 7) {
      possibleMoves.push(`${letter}${num - 2}`);
    }
    return possibleMoves;
  }
  private knighMove(currentCell: Cell): Cell[] {
    let [ letter, number ] = [ currentCell[0], currentCell[1] ];
    let num = parseInt(number, 10);
    let possibleMoves: string[] = [];
    let nextLetters = this.findNextLetter(letter);
    let nextLetterRight = this.findNextLetter(nextLetters[1])[1];
    let nextLetterLeft = this.findNextLetter(nextLetters[0])[0];
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
    });
    return possibleMoves;
  }
  private rockMove(currentCell: Cell): string[] {
    let [ letter, number ] = [ currentCell[0], currentCell[1] ];
    let num = parseInt(number, 10);
    let possibleMoves: string[] = [];

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
    let [ letter, number ] = [ currentCell[0], currentCell[1] ];
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
    return [ ...this.rockMove(currentCell), ...this.bishopMove(currentCell) ];
  }
  private getCellsAround(cell: Cell): Cell[] {
    let [ letter, number ] = cell;
    let [ leftLetter, rightLetter ] = this.findNextLetter(letter);
    let nextNum = parseInt(number, 10) + 1;
    let prevNum = parseInt(number, 10) - 1;
    let result: Cell[] = [
      `${letter}${nextNum}`,
      `${letter}${prevNum}`,
      `${rightLetter}${nextNum}`,
      `${rightLetter}${prevNum}`,
      `${leftLetter}${nextNum}`,
      `${leftLetter}${prevNum}`,
      `${leftLetter}${number}`,
      `${rightLetter}${number}`
    ];
    for (let i = 0; i < result.length; i++) {
      let num = result[i][1];
      if (parseInt(num) > 8 || parseInt(num) < 1 || result[i].length > 2) {
        result.splice(i, 1);
      }
    }
    return result;
  }
  private knMove(currentCell: Cell): Cell[] {
    let cells = this.getCellsAround(currentCell);
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


const possibleMovesLogic = new HighlightedCels();
export const gameSlice = createSlice({
  name: 'game',
  initialState: {
    id: null,
    isWaiting: true,
    side: null,
    board: null,
    highlightedCels: [],
    selectedFigure: { figure: null, cell: null },
    strikedFigures: { black: [], white: [] },
    shahData: { shachedSide: null, figure: null, }
  },
  reducers: {
    initGameData: (state, { payload }) => {
      state.side = payload.payload.side;

      possibleMovesLogic.setData(payload.payload.board, payload.payload.side);
      const board = payload.payload.board;
      const boardState: any = {
        white: {},
        black: {},
      };
      for (const side in board) {
        for (const figure in board[side]) {
          boardState[side][board[side][figure]] = figure;
        }
      }
      state.board = boardState;
      state.id = payload.payload.gameId;
    },
    startGame: (state) => {
      state.isWaiting = false;
    },
    selectFigure: (state, { payload }) => {
      let figure;
      if (state.side === 'w') {
        figure = state.board.white[payload];
      } else {
        figure = state.board.black[payload];
      }

      if (!figure) return;

      const possibleMoves = possibleMovesLogic.createPossibleMoves(figure, payload);
      state.highlightedCels = possibleMoves;
      if (possibleMoves.length >= 1) {
        state.selectedFigure = { figure, cell: payload };
      }
    },
    updateBoard: (state, { payload }) => {
      possibleMovesLogic.setUpdatedBoard(payload.payload.board);
      const board = payload.payload.board;
      const boardState: any = {
        white: {},
        black: {},
      };
      for (const side in board) {
        for (const figure in board[side]) {
          boardState[side][board[side][figure]] = figure;
        }
      }
      state.board = boardState;
      state.highlightedCels = [];
      state.selectedFigure = { figure: null, cell: null };
      state.shahData = { shachedSide: null, figure: null };
    },
    addStrikedFigure: (state, { payload: { strikedSide, figure } }) => {
      if (strikedSide === 'w') state.strikedFigures.white.push(figure);
      else if (strikedSide === 'b') state.strikedFigures.black.push(figure);
    },
    setShah: (state, { payload: { shachedSide, byFigure } }) => {
      state.shahData.figure = byFigure;
      state.shahData.shachedSide = shachedSide;
    }
  },
});

export const { initGameData, startGame, selectFigure, updateBoard, addStrikedFigure, setShah } = gameSlice.actions;

export default gameSlice.reducer;