export type ClientGameData = {
  letterCoords: {[index: string]: number};
  numberCoords: {[index: string]: number};
  figuresDom: HTMLDivElement;
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

function fillCellsCoords(): void {
  for (let number in numberYCoords) {
    numberYCoords[number] = 600 - parseInt(number, 10) * 75;
  }
  let keys = Object.keys(letterXCoords);
  for (let i = 0; i < keys.length; i++) {
    letterXCoords[keys[i]] = i * 75;
  }
}

export async function initGame(Board: HTMLDivElement, FiguresDom: HTMLDivElement, ws: WebSocket): Promise<ClientGameData> {
  return new Promise((res, rej) => {
    ws.onopen = (event: any) => {
      fillCellsCoords();
      console.log('ok');
      let { left, top } = Board.getBoundingClientRect();
      res({ 
        letterCoords: letterXCoords,
        numberCoords: numberYCoords,
        figuresDom: FiguresDom,
        boardData: {
          dom: Board,
          coords: {x: left, y: top}
        }
      });
    }
  });
}
