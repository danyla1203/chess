import * as React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import useWebSocket from 'react-use-websocket';
import { config } from '../../config';
import { GameData } from '../../store/slices/gamelist';

import './GameList.scss';

export const GameList = () => {
  const [ isConnected, setIsConnected ] = React.useState(false);
  const accessToken = useSelector((state: any) => state.user.accessToken);
  const { sendJsonMessage } = useWebSocket(`ws://${config.apiDomain}`, {
    share: true,
    queryParams: {
      'Authorization': accessToken,
    },
  });
  const games: GameData[] = useSelector((state: any) => state.gameList.games);
  console.log(games);
  const connectToGame = (gameId: string) => {
    sendJsonMessage({ action: '/game/connect/player', body: { gameId } });
    setIsConnected(true);
  };

  if (isConnected) return <Navigate to='/game' />;
  const renderedGameList = games.map((game: GameData) => {
    const beautyMaxTime = Math.floor(game.maxTime / (1000 * 60));
    const beautyTimeIncrement = Math.floor(game.timeIncrement / 1000);

    return (
      <div className='game-list__item' key={game.id} onClick={() => connectToGame(game.id)} >
        <div className='game-list__item__data-block'>
          <h3 className='game-list__item__name'>{game.players[0].name}</h3>
        </div>
        <div className='game-list__item__data-block'>
          <span className={`game-list__item__side-selection-circle ${game.side}-circle`}></span>
        </div>
        <div className='game-list__item__data-block'>
          <h3>{beautyMaxTime}-{beautyTimeIncrement}</h3>
        </div>
      </div>
    );
  });
  return (
    <div className='game-list'>
      <div className="game-list__labels">
        <h3 className='game-list__labels__item'>Player name:</h3>
        <h3 className='game-list__labels__item'>Side:</h3>
        <h3 className='game-list__labels__item'>Time:</h3>
      </div>
      { renderedGameList }
    </div>
  );
};