
import { Board, Figure, Cell, Player, White, Black } from './sharedTypes';
export interface GameRenderI {
  setFiguresOnBoard(white: White, black: Black): void;
  renderPossibleMoves(moves: Cell[]): void;
  removePossibleMoves(): void
  moveFigure(playingSide: string, figure: Figure, newCell: Cell): void;
  findCellByCoord(x: number, y: number): Cell;
}
export interface GameProccessI {
  updateBoard(newBoard: Board): void;
  moveFigure(figureSide: 'w'|'b', figure: Figure, cell: Cell): string;
  possibleMoves(figureSide: 'w'|'b', figure: Figure, cell: Cell): void;
  findCell(x: number, y: number): Cell;
  removePossibleMoves(): void;
  set sideToPlay(side: Player)
}

export class GameProccess implements GameProccessI{
  private Render: GameRenderI;
  private Letters: string[]
  
  private Board: Board;
  private playingSide: Player;
  private moves: Cell[];

  set sideToPlay(side: Player) {
    this.playingSide = side;
  }

  constructor(render: GameRenderI) {
    this.Render = render;
    this.moves = [];
    this.Letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
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
    return possibleMoves;
  }
  private knighMove(currentCell: Cell): Cell[] {
    let [ letter, number ] = [currentCell[0], currentCell[1]];
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
    })
    return possibleMoves;
  }

  private rockMove(currentCell: Cell): string[] {
    let [ letter, number ] = [currentCell[0], currentCell[1]];
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

  private checkIsCellEmpty(cell: string): boolean {
    if (parseInt(cell[1], 10) > 8) return false;
    for (let figure in this.Board.white) {
      console.log(this.Board.white[figure], figure, cell);
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

  private canMove(moves: Cell[], cell: Cell) {
    for (let i = 0; i < moves.length; i++) {
      if (moves[i] == cell) return true;
    }
    return false;
  }
  private verifyUserSelect(figureSide: 'w'|'b', figure: Figure, cell: Cell): boolean {
    if (!figure || !cell) return false;
    if (cell.length !== 2) return false;
    if (figure.length == 0) return false;
    console.log(figureSide, this.playingSide);
    if (figureSide != this.playingSide) return false;
    return true;
  }
  public updateBoard(newBoard: Board) {
    this.Board = newBoard;
    this.Render.setFiguresOnBoard(newBoard.white, newBoard.black);
  }


  public moveFigure(figureSide: 'w'|'b', figure: Figure, cell: Cell): string {
    if (this.verifyUserSelect(figureSide, figure, cell) && this.canMove(this.moves, cell)) {
      this.Render.moveFigure(this.playingSide, figure, cell);
      this.Board.white[figure] = cell;
      this.Render.removePossibleMoves();
      this.moves = [];
      return 'ok';
    } else {
      return 'err';
    }
  }
  public possibleMoves(figureSide: 'w'|'b', figure: Figure, cell: Cell): void {
    if (this.verifyUserSelect(figureSide, figure, cell)) {
      this.Render.removePossibleMoves();
      this.moves = this.createPossibleMoves(figure, cell)
      this.Render.renderPossibleMoves(this.moves);
    }
  }
  public findCell(x: number, y: number) {
    return this.Render.findCellByCoord(x, y);
  }
  public removePossibleMoves() {
    this.Render.removePossibleMoves();
  }
}
