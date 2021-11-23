import { initGame, GameInfo } from './initGame';
import { Game } from './gameProcess';

async function start() {
  const Board = document.querySelector<HTMLDivElement>('.board');
  const ws = new WebSocket('ws://localhost:8082/hello-world', 'echo-protocol');
  const GameInfo: GameInfo = await initGame(Board, ws);
  let gameObj = new Game(GameInfo);
  gameObj.start();
}
start();
