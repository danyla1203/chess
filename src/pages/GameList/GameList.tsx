import * as React from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import useWebSocket from 'react-use-websocket';
import { GameTypes } from '../..';
import { GameData } from '../../store/slices/gamelist';
import { ServerMessageTypes } from '../../WsHandler';

import './GameList.scss';

export const GameList = () => {
  const accessToken = useSelector((state: any) => state.user.accessToken);
  const { sendJsonMessage } = useWebSocket('ws://localhost:3000', {
    share: true,
    queryParams: {
      'Authorization': accessToken,
    },
  });
  const games: GameData[] = useSelector((state: any) => state.gameList.games);
  
  const connectToGame = (gameId: string) => {
    sendJsonMessage({ type: ServerMessageTypes.Game, body: { type: GameTypes.CONNECT_TO_EXISTING_GAME, body: { gameId } } });
  };

  const renderedGameList = games.map((game: GameData) => {
    console.log(game);
    const beautyMaxTime = Math.floor(game.maxTime / (1000 * 60));
    const beautyTimeIncrement = Math.floor(game.timeIncrement / 1000);
    return (
      <div className='game-list__item' key={game.id} onClick={() => connectToGame(game.id)} >
        <div className='game-list__item__data-block'>
          <h3 className='game-list__item__'>{game.players[0].name}</h3>
        </div>
        <div className='game-list__item__data-block'>
          <h3 className='game-list__item__side-selection__value'>{game.side}</h3>
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