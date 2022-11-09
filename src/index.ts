import { initGame, ClientGameData } from './initGame';
import { WsHandler } from './game/wsHandlers/WsHandler';
import { DOMController } from './game/DOMController';
import { GameProccess } from './game/GameProccess';
import { GameRender } from './game/GameRender';

const ws = new WebSocket('ws://localhost:3000', 'echo-protocol');

function start(): void {
  const Board = document.querySelector<HTMLDivElement>('.board');
  const Figures = document.querySelector<HTMLDivElement>('.figures');
  const GameInfo: ClientGameData = initGame(Board, Figures);
  
  const render = new GameRender(GameInfo);
  const proccess = new GameProccess(render);
  const wsController = new WsHandler(ws, proccess);
  const domController = new DOMController(Board, wsController.send.bind(wsController), proccess);
  wsController.handle();
  domController.handle();
  wsController.sendInitGameRequst();
}

document.querySelector<HTMLButtonElement>('.game-start-btn').onclick = () => {
  start();
};
