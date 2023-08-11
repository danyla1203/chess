import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Typography } from '@mui/material';
import { logoutAction, userGameListAction } from '../../store/user';
import { useAppDispatch, useAppSelector } from '../../store';
import './User.scss';

function GameHistoryItem({
  data: { maxTime, timeIncrement, sideSelecting, players, id },
}: any) {
  const beautyMaxTime = Math.floor(maxTime / (1000 * 60));
  const beautyTimeIncrement = Math.floor(timeIncrement / 1000);
  let winner;
  let looser;
  for (const player of players) {
    if (player.isWinner) winner = player;
    else looser = player;
  }
  return (
    <div className="user-page__game-history__item" key={id}>
      <h3 className="user-page__game-history__item__timings">
        {beautyMaxTime}-{beautyTimeIncrement}
      </h3>
      <span
        className={`user-page__game-history__item__side-selecting ${sideSelecting}-circle`}
      />
      <div className="user-page__game-history__item__players">
        <h3 className="user-page__game-history__item__players__item">
          {winner.user.name}-win
        </h3>
        <h3 className="user-page__game-history__item__players__item">
          {looser.user.name}
        </h3>
      </div>
    </div>
  );
}

function GameHistory() {
  const gameHistory = useAppSelector((state) => state.user.gameHistory);
  return (
    <div className="user-page__game-history">
      <Typography variant="h5" component="h3">
        Games history
      </Typography>
      <div className="user-page__game-history__labels">
        <Typography variant="h6" component="h4">
          Timings
        </Typography>
        <Typography variant="h6" component="h4">
          Side
        </Typography>
        <Typography variant="h6" component="h4">
          Players
        </Typography>
      </div>
      {gameHistory.map((game: any) => (
        <GameHistoryItem data={game} key={game.id} />
      ))}
    </div>
  );
}

export function UserPage() {
  const isAuthorized = useAppSelector((state) => state.user.authorized);
  const accessToken = useAppSelector((state) => state.user.accessToken);
  const userName = useAppSelector((state) => state.user.name);
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    if (isAuthorized) dispatch(userGameListAction(accessToken));
  }, []);
  if (!isAuthorized) return <Navigate to="/" />;
  return (
    <div className="user-page">
      <div className="user-page__personal">
        <Typography variant="h4" component="h3">
          {userName}
        </Typography>
        <Button
          onClick={() => dispatch(logoutAction())}
          variant="contained"
          color="primary"
        >
          Logout
        </Button>
      </div>
      <GameHistory />
    </div>
  );
}
