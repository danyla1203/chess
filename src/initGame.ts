export type GameInfo = {
  letterCoords: {[index: string]: number};
  numberCoords: {[index: string]: number};
  figureCels: {[index: string]: Cell};
  oponentFigures: {[index: string]: Cell};
  playingSide: string;
  boardData: {
    dom: HTMLDivElement,
    coords: {x: number, y: number}
  }
}

export type Cell = string;
export type Figure = string;

const letterXCoords: {[index: string]: number}= {
  'a': 0,
  'b': 0,
  'c': 0,
  'd': 0,
  'e': 0,
  'f': 0,
  'g': 0,
  'h': 0
}
const numberYCoords: {[index: string]: number} = {
  '1': 0,
  '2': 0,
  '3': 0,
  '4': 0,
  '5': 0,
  '6': 0,
  '7': 0,
  '8': 0
}
const whiteFigures: {[index: Figure]: Cell} = {
  'pawn1': 'a2',
  'pawn2': 'b2',
  'pawn3': 'c2',
  'pawn4': 'd2',
  'pawn5': 'e2',
  'pawn6': 'f2',
  'pawn7': 'g2',
  'pawn8': 'h2',
  'R1': 'a1',
  'B1': 'b1',
  'K1': 'c1',
  'Q': 'd1',
  'Kn': 'e1',
  'K2': 'f1',
  'B2': 'g1',
  'R2': 'h1'
}
const blackFigures: {[index: Figure]: Cell} = {
  'pawn1': 'a7',
  'pawn2': 'b7',
  'pawn3': 'c7',
  'pawn4': 'd7',
  'pawn5': 'e7',
  'pawn6': 'f7',
  'pawn7': 'g7',
  'pawn8': 'h7',
  'R1': 'a8',
  'B1': 'b8',
  'K1': 'c8',
  'Q': 'd8',
  'Kn': 'e8',
  'K2': 'f8',
  'B2': 'g8',
  'R2': 'h8'
}

function setFigure(side: string, figureName: string ,x: number, y: number) {
  const figures = document.querySelector<HTMLDivElement>('.figures');
  const figure = document.createElement('div');
  figure.className = `${figureName}-${side}`;
  figure.style.top = y + 'px';
  figure.style.left = x + 'px';
  figure.innerText = figureName;
  figures.appendChild(figure);
}
function setFiguresOnBoard(): void {
  for (let figure in whiteFigures) {
    let [letter, number] = [whiteFigures[figure][0], whiteFigures[figure][1]];
    setFigure('w', figure, letterXCoords[letter], numberYCoords[number]);
  }
  for (let figure in blackFigures) {
    let [letter, number] = [blackFigures[figure][0], blackFigures[figure][1]];
    setFigure('b', figure, letterXCoords[letter], numberYCoords[number]);
  }
}

function fillCellsCoords(): void {
  for (let number in numberYCoords) {
    numberYCoords[number] = 600 - parseInt(number, 10) * 75;
  }
  let keys = Object.keys(letterXCoords);
  for (let i = 0; i < keys.length; i++) {
    letterXCoords[keys[i]] = i * 75;
  }
}

export async function initGame(Board: HTMLDivElement, ws: WebSocket): Promise<GameInfo> {
  return new Promise((res, rej) => {
    ws.onopen = (event: any) => {
      fillCellsCoords();
      setFiguresOnBoard();
      console.log('ok');
      let { left, top } = Board.getBoundingClientRect();
      res({ 
        letterCoords: letterXCoords,
        numberCoords: numberYCoords,
        figureCels: whiteFigures,
        oponentFigures: blackFigures,
        playingSide: 'w',
        boardData: {
          dom: Board,
          coords: {x: left, y: top}
        }
      });
    }
  });
}
