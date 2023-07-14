import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { logoutRequest, userGameList } from '../../store/slices/user';

import './User.scss';
import { Button, Typography } from '@mui/material';

const GameHistoryItem = ({ data: { maxTime, timeIncrement, sideSelecting, players, id } }: any) => {
  const beautyMaxTime = Math.floor(maxTime / (1000 * 60));
  const beautyTimeIncrement = Math.floor(timeIncrement / 1000);
  let winner, looser;
  for (let player of players) {
    if (player.isWinner) winner = player;
    else looser = player;
  }
  return (
    <div className='user-page__game-history__item' key={id}>
      <h3 className='user-page__game-history__item__timings'>{beautyMaxTime}-{beautyTimeIncrement}</h3>
      <span className={`user-page__game-history__item__side-selecting ${sideSelecting}-circle`}></span>
      <div className='user-page__game-history__item__players'>
        <h3 className='user-page__game-history__item__players__item'>{winner.user.name}-win</h3>
        <h3 className='user-page__game-history__item__players__item'>{looser.user.name}</h3>
      </div>
    </div>
  );
};

const GameHistory = () => {
  const gameHistory = useSelector((state: any) => state.user.gameHistory);
  return (
    <div className='user-page__game-history'>
      <Typography variant="h5" component='h3'>Games history</Typography>
      <div className="user-page__game-history__labels">
        <Typography variant="h6" component='h4'>Timings</Typography>
        <Typography variant="h6" component='h4'>Side</Typography>
        <Typography variant="h6" component='h4'>Players</Typography>
      </div>
      { gameHistory.map((game: any) => <GameHistoryItem data={game} key={game.id}/>) }
    </div>
  );
};

export const UserPage = () => {
  const isAuthorized = useSelector((state: any) => state.user.authorized);
  const accessToken = useSelector((state: any) => state.user.accessToken);
  const userName = useSelector((state: any) => state.user.name);
  const dispatch = useDispatch<any>();
  
  React.useEffect(() => {
    dispatch(userGameList(accessToken));
  }, []);

  if (!isAuthorized) return <Navigate to={'/'} />;
  return (
    <div className="user-page">
      <div className="user-page__personal">
        <Typography variant="h4" component='h3'>{userName}</Typography>
        <Button 
          onClick={() => dispatch(logoutRequest())} 
          variant="contained" 
          color="primary"
        >Logout
        </Button>
      </div>
      <GameHistory />
    </div>
  );
};