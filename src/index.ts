import { initGame, GameInfo, Figure, Cell } from './initGame';
import { Game } from './gameProcess';

export type Response = {
  type: string;
  payload: any;
}

export type Callback = (data: any) => void;
export type ReceiveMessageHandlers = {
  initGame: Callback;
  onBoardUpdate: Callback;
}

async function start(link: string) {
  const Board = document.querySelector<HTMLDivElement>('.board');
  const ws = new WebSocket(`ws://localhost:8081/${link}`, 'echo-protocol');
  const GameInfo: GameInfo = await initGame(Board, ws);
  function makeTurn(figure: Figure, cell: Cell) {
    const payload = { type: 'turn', figure: figure, cell: cell };
    ws.send(JSON.stringify(payload));
  }
  function receiveMessage(callbacks: ReceiveMessageHandlers) {
    ws.onmessage = (message: any) => {
      const res: Response = JSON.parse(message.data);
      switch(res.type) {
        case 'INIT_GAME':
          callbacks.initGame(res.payload);
        case 'UPDATE_STATE':
          callbacks.onBoardUpdate(res.payload)
      } 
    }
  }
  let gameObj = new Game(GameInfo, makeTurn, receiveMessage);
  gameObj.start();
}

document.querySelector<HTMLButtonElement>('.game-start-btn').onclick = (e) => {
  let input = document.querySelector<HTMLInputElement>('.game-input');
  start(input.value);
}
