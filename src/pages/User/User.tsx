import * as React from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { logoutAction, userGameListAction } from '../../store/user';
import { useAppDispatch, useAppSelector } from '../../store';
import './User.scss';
import { GameViewer } from './gamePreview/GameViewer';
import { GameHistoryItem } from './gamelist/GameListItem';

function GameHistory() {
  const gameHistory = useAppSelector((state) => state.user.gameHistory);

  const rendered = gameHistory.slice(0, 5).map((game) => {
    return <GameHistoryItem data={game} key={game.id} />;
  });

  return (
    <div className="user-page__game-history">
      <div className="user-page__game-history__header">
        <Typography variant="h5" component="h3">
          Latest Games
        </Typography>
        <Link to="/user/games">
          <Button>View all</Button>
        </Link>
      </div>
      <TableContainer
        className="user-page__game-history__table"
        component={Paper}
      >
        <Table sx={{ minWidth: 600 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Timings</TableCell>
              <TableCell>Side</TableCell>
              <TableCell>Winner</TableCell>
              <TableCell>Players</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{rendered}</TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

function UserProfile() {
  const userName = useAppSelector((state) => state.user.name);
  const dispatch = useAppDispatch();
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

export function UserPage() {
  const isAuthorized = useAppSelector(({ user }) => user.authorized);
  const accessToken = useAppSelector(({ user }) => user.accessToken);
  const viewingGame = useAppSelector(({ user }) => user.gameViewing);
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    if (isAuthorized) dispatch(userGameListAction(accessToken));
  }, []);
  if (!isAuthorized) return <Navigate to="/" />;

  return viewingGame ? <GameViewer /> : <UserProfile />;
}
