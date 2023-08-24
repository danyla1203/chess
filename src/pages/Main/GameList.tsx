import * as React from 'react';
import { GameData } from '../../store/slices/gamelist';
import { sendMessage } from '../../store/ws';
import { useAppDispatch, useAppSelector } from '../../store';
import './GameList.scss';

interface GameItemProps {
  game: any;
  connectToGame: (gameId: string) => void;
}

function GameItem({ game, connectToGame }: GameItemProps) {
  const beautyMaxTime = Math.floor(game.config.time / (1000 * 60));
  const beautyTimeIncrement = Math.floor(game.config.timeIncrement / 1000);

  const creator: any = Object.values(game.players)[0];

  return (
    <div
      className="game-list__item"
      key={game.id}
      onClick={() => connectToGame(game.id)}
    >
      <div className="game-list__item__data-block">
        <h3 className="game-list__item__name">{creator.name}</h3>
      </div>
      <div className="game-list__item__data-block">
        <span
          className={`game-list__item__side-selection-circle ${game.config.side}-circle`}
        />
      </div>
      <div className="game-list__item__data-block">
        <h3>
          {beautyMaxTime}-{beautyTimeIncrement}
        </h3>
      </div>
    </div>
  );
}

export function GameList() {
  const games: GameData[] = useAppSelector((state) => state.gameList.games);
  const socketId = useAppSelector(({ ws }) => ws.socketId);
  const dispatch = useAppDispatch();

  const connect = (gameId: string) => {
    dispatch(sendMessage({ event: 'join', body: { gameId } }));
  };

  const createdGame = games.find((game) => game.players[socketId]);
  const filtered = games.filter((game) => !game.players[socketId]);
  const rendered = filtered.map((game) => (
    <GameItem game={game} connectToGame={connect} />
  ));
  if (createdGame) {
    rendered.unshift(<GameItem game={createdGame} connectToGame={connect} />);
  }

  return (
    <div className="game-list">
      <div className="game-list__labels">
        <h3 className="game-list__labels__item">Player name:</h3>
        <h3 className="game-list__labels__item">Side:</h3>
        <h3 className="game-list__labels__item">Time:</h3>
      </div>
      {rendered}
    </div>
  );
}
