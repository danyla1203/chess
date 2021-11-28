import { initGame, ClientGameData } from './initGame';
import { WsHandler } from './game/WsHandler';
import { DOMController } from './game/DOMController';
import { GameProccess } from './game/GameProccess';
import { GameRender } from './game/GameRender';

async function start(link: string) {
  const Board = document.querySelector<HTMLDivElement>('.board');
  const Figures = document.querySelector<HTMLDivElement>('.figures');
  const ws = new WebSocket(`ws://localhost:8081/${link}`, 'echo-protocol');
  const GameInfo: ClientGameData = await initGame(Board, Figures, ws);

  const render = new GameRender(GameInfo);
  const proccess = new GameProccess(render);
  const wsController = new WsHandler(ws, proccess);
  const domController = new DOMController(Board, wsController.send.bind(wsController), proccess);

  wsController.handle();
  domController.handle();
}

document.querySelector<HTMLButtonElement>('.game-start-btn').onclick = (e) => {
  let input = document.querySelector<HTMLInputElement>('.game-input');
  start(input.value);
}
