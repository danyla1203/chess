import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Typography } from '@mui/material';
import { logoutAction, userGameListAction } from '../../store/user';
import { useAppDispatch, useAppSelector } from '../../store';
import './User.scss';

function GameHistoryItem({
  data: { maxTime, timeIncrement, isDraw, sideSelecting, players, id },
}: any) {
  const beautyMaxTime = Math.floor(maxTime / (1000 * 60));
  const beautyTimeIncrement = Math.floor(timeIncrement / 1000);
  const pl1 = players[0];
  const pl2 = players[1];
  let winner: any | 'draw';
  if (pl1.isWinner) winner = pl1.user.name;
  if (pl2.isWinner) winner = pl2.user.name;
  if (isDraw) winner = 'Draw';
  return (
    <div className="user-page__game-history__item" key={id}>
      <div className="user-page__game-history__item__item">
        <h3 className="user-page__game-history__item__timings">
          {beautyMaxTime}-{beautyTimeIncrement}
        </h3>
      </div>
      <div className="user-page__game-history__item__item">
        <span
          className={`user-page__game-history__item__side-selecting ${sideSelecting}-circle`}
        />
      </div>
      <div className="user-page__game-history__item__item">
        <h3 className="user-page__game-history__item__winner">{winner}</h3>
      </div>
      <div className="user-page__game-history__item__item">
        <div className="user-page__game-history__item__players">
          <h3 className="user-page__game-history__item__players__item">
            {pl1.user.name} - {pl2.user.name}
          </h3>
        </div>
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
        <div className="user-page__game-history__labels__item">
          <Typography variant="h6" component="h4">
            Timings
          </Typography>
        </div>
        <div className="user-page__game-history__labels__item">
          <Typography variant="h6" component="h4">
            Side
          </Typography>
        </div>
        <div className="user-page__game-history__labels__item">
          <Typography variant="h6" component="h4">
            Winner
          </Typography>
        </div>
        <div className="user-page__game-history__labels__item">
          <Typography variant="h6" component="h4">
            Players
          </Typography>
        </div>
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
