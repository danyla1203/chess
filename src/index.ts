import { initGame, GameInfo, Figure, Cell } from './initGame';
import { Game } from './gameProcess';

async function start(link: string) {
  const Board = document.querySelector<HTMLDivElement>('.board');
  const ws = new WebSocket(`ws://localhost:8081/${link}`, 'echo-protocol');
  const GameInfo: GameInfo = await initGame(Board, ws);
  function makeTurn(figure: Figure, cell: Cell) {
    const payload = { type: 'turn', figure: figure, cell: cell };
    ws.send(JSON.stringify(payload));
  }
  let gameObj = new Game(GameInfo, makeTurn);
  gameObj.start();
}

document.querySelector<HTMLButtonElement>('.game-start-btn').onclick = (e) => {
  let input = document.querySelector<HTMLInputElement>('.game-input');
  start(input.value);
}
